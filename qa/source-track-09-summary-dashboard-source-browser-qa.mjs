import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SOURCE_BASE = process.env.TRACK09_SOURCE_QA_URL || "http://127.0.0.1:4173";
const NATIVE_BASE = process.env.TRACK09_NATIVE_QA_URL || "http://127.0.0.1:3000";
const SOURCE_PATH = "/reference/source-tracks-snapshot/09_전체기억_요약대시보드/01_전체기억_요약대시보드.html";
const TREE_ID = "track09-qa-tree";
const NATIVE_PATH = `/trees/${TREE_ID}/overview`;
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track09-summary-dashboard");
const COMPARE_OUT = path.join(OUT, "source-vs-native");
const TRANSPARENT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/6W9qWQAAAABJRU5ErkJggg==", "base64");
fs.mkdirSync(COMPARE_OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
  { name: "phone-390x844", width: 390, height: 844, touch: true },
  { name: "mobile-320x720", width: 320, height: 720, touch: true },
];
const STATES = ["initial-whole-memory", "stand", "changed", "future", "next"];
const VIEWS = ["stand", "changed", "future", "next"];

const TREE_FIXTURE = {
  id: TREE_ID,
  ownerId: "track09-qa-owner",
  title: "나의 기억 나무",
  visibility: "private",
  createdAt: "2026-02-02T10:00:00.000Z",
  updatedAt: "2026-08-04T10:00:00.000Z",
};

const MOMENT_FIXTURES = [
  { id: "track09-m1", treeId: TREE_ID, title: "처음 마음을 멈춘 장면", memo: "처음 저장한 순간", sourceType: "video", sourceUrl: "https://example.test/media/first.mp4", timestamp: "2026-02-02T10:00:00.000Z", createdAt: "2026-02-02T10:00:00.000Z", emotionTags: ["설렘"], parentId: null, connectionReason: "" },
  { id: "track09-m2", treeId: TREE_ID, title: "다시 보고 싶던 순간", memo: "한 번 더 저장한 기억", sourceType: "note", sourceUrl: "", timestamp: "2026-03-10T10:00:00.000Z", createdAt: "2026-03-10T10:00:00.000Z", emotionTags: ["설렘", "몰입"], parentId: "track09-m1", connectionReason: "처음 장면에서 이어짐" },
  { id: "track09-m3", treeId: TREE_ID, title: "오래 남은 인터뷰", memo: "말투가 편안했던 날", sourceType: "video", sourceUrl: "https://example.test/media/interview.mp4", timestamp: "2026-04-19T10:00:00.000Z", createdAt: "2026-04-19T10:00:00.000Z", emotionTags: ["편안함"], parentId: "track09-m2", connectionReason: "감정이 달라진 순간" },
  { id: "track09-m4", treeId: TREE_ID, title: "조용히 웃던 장면", memo: "편안함이 커진 기억", sourceType: "note", sourceUrl: "", timestamp: "2026-05-06T10:00:00.000Z", createdAt: "2026-05-06T10:00:00.000Z", emotionTags: ["편안함"], parentId: null, connectionReason: "" },
  { id: "track09-m5", treeId: TREE_ID, title: "함께 이어 본 무대", memo: "관계가 생긴 기억", sourceType: "video", sourceUrl: "https://example.test/media/stage.mp4", timestamp: "2026-06-01T10:00:00.000Z", createdAt: "2026-06-01T10:00:00.000Z", emotionTags: ["몰입"], parentId: "track09-m3", connectionReason: "비슷한 장면" },
  { id: "track09-m6", treeId: TREE_ID, title: "비 오는 날의 기록", memo: "다른 결의 감정을 남김", sourceType: "note", sourceUrl: "", timestamp: "2026-06-28T10:00:00.000Z", createdAt: "2026-06-28T10:00:00.000Z", emotionTags: ["편안함"], parentId: "track09-m4", connectionReason: "같은 감정" },
  { id: "track09-m7", treeId: TREE_ID, title: "최근 다시 찾은 영상", memo: "오래 보고 싶은 장면", sourceType: "video", sourceUrl: "https://example.test/media/recent.mp4", timestamp: "2026-07-21T10:00:00.000Z", createdAt: "2026-07-21T10:00:00.000Z", emotionTags: ["설렘"], parentId: null, connectionReason: "" },
  { id: "track09-m8", treeId: TREE_ID, title: "오늘 남긴 마지막 순간", memo: "지금의 마음을 기록", sourceType: "note", sourceUrl: "", timestamp: "2026-08-04T10:00:00.000Z", createdAt: "2026-08-04T10:00:00.000Z", emotionTags: ["편안함", "몰입"], parentId: "track09-m7", connectionReason: "최근 흐름" },
];

async function blockExternalDemoMedia(context) {
  await context.route(/^https:\/\//, async (route) => {
    const url = route.request().url();
    if (url.startsWith("https://fonts.googleapis.com/")) return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    if (url.startsWith("https://fonts.gstatic.com/")) return route.fulfill({ status: 204, body: "" });
    if (url.startsWith("https://i.ytimg.com/")) return route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG });
    if (url.startsWith("https://www.youtube") || url.startsWith("https://youtube")) return route.fulfill({ status: 204, body: "" });
    return route.continue();
  });
}

async function mockNativeCanonicalData(context) {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() !== "GET") return route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "QA_READ_ONLY" }) });
    if (pathname === `/api/trees/${TREE_ID}`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TREE_FIXTURE) });
    if (pathname === `/api/trees/${TREE_ID}/memories`) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOMENT_FIXTURES) });
    return route.continue();
  });
}

function attachErrorCapture(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  return { pageErrors, consoleErrors };
}

async function waitForSourceView(page, view) {
  await page.waitForFunction((expectedView) => document.querySelector(`.card-screen[data-screen="${expectedView}"]`)?.classList.contains("active") === true, view, { timeout: 3000 });
  await page.waitForFunction(() => !document.getElementById("progressPill")?.classList.contains("show"), undefined, { timeout: 3000 });
}

async function waitForNativeView(page, index) {
  await page.waitForFunction((expectedIndex) => {
    const questions = [...document.querySelectorAll(".v4-overview-question")];
    return questions.length === 4 && questions[expectedIndex]?.classList.contains("is-active") === true;
  }, index, { timeout: 3000 });
}

async function activateSource(page, index, touch) {
  const question = page.locator(".question").nth(index);
  if (touch) await question.tap(); else await question.click();
  await waitForSourceView(page, VIEWS[index]);
}

async function activateNative(page, index, touch) {
  const question = page.locator(".v4-overview-question").nth(index);
  if (touch) await question.tap(); else await question.click();
  await waitForNativeView(page, index);
}

async function makeComparisonSheet(comparePage, viewport, state, sourceFile, nativeFile) {
  const source = fs.readFileSync(sourceFile).toString("base64");
  const native = fs.readFileSync(nativeFile).toString("base64");
  await comparePage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#141714;color:#f5f7f3;font-family:Arial,sans-serif}
    body{padding:16px}.title{font-size:18px;font-weight:700;margin:0 0 12px}.meta{font-size:12px;color:#b9c1b9;margin-bottom:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}.panel{background:#202520;border:1px solid #343a34;border-radius:10px;overflow:hidden}
    .label{padding:9px 12px;font-size:12px;font-weight:700;letter-spacing:.06em}.panel img{display:block;width:100%;height:auto;background:white}
  </style></head><body><div class="title">Track09 Source ↔ Native visual comparison</div><div class="meta">${viewport.name} · ${state}</div><div class="grid"><div class="panel"><div class="label">AUTHORITATIVE SOURCE</div><img src="data:image/png;base64,${source}"></div><div class="panel"><div class="label">CANONICAL NATIVE /trees/:treeId/overview</div><img src="data:image/png;base64,${native}"></div></div></body></html>`, { waitUntil: "load" });
  await comparePage.screenshot({ path: path.join(COMPARE_OUT, `${viewport.name}-${state}-source-vs-native.png`), fullPage: true });
}

async function capturePair(viewport, sourcePage, nativePage, comparePage, state) {
  const sourceFile = path.join(COMPARE_OUT, `${viewport.name}-${state}-source.png`);
  const nativeFile = path.join(COMPARE_OUT, `${viewport.name}-${state}-native.png`);
  await sourcePage.screenshot({ path: sourceFile, fullPage: true });
  await nativePage.screenshot({ path: nativeFile, fullPage: true });
  await makeComparisonSheet(comparePage, viewport, state, sourceFile, nativeFile);
}

async function main() {
  const browser = await chromium.launch();
  const checks = [];
  const evidence = [];
  const record = (viewport, check, pass, detail = "") => checks.push({ viewport, check, pass, detail });

  for (const viewport of VIEWPORTS) {
    const sourceContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
    const nativeContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
    const compareContext = await browser.newContext({ viewport: { width: viewport.width * 2 + 64, height: Math.max(800, viewport.height) } });
    await blockExternalDemoMedia(sourceContext);
    await mockNativeCanonicalData(nativeContext);

    const sourcePage = await sourceContext.newPage();
    const nativePage = await nativeContext.newPage();
    const comparePage = await compareContext.newPage();
    const sourceErrors = attachErrorCapture(sourcePage);
    const nativeErrors = attachErrorCapture(nativePage);

    await sourcePage.goto(`${SOURCE_BASE}${encodeURI(SOURCE_PATH)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sourcePage.locator(".workspace").waitFor({ state: "visible", timeout: 10000 });
    await waitForSourceView(sourcePage, "stand");
    await nativePage.goto(`${NATIVE_BASE}${NATIVE_PATH}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await nativePage.locator(".v4-overview-workspace").waitFor({ state: "visible", timeout: 10000 });
    await waitForNativeView(nativePage, 0);

    const sourceQuestions = sourcePage.locator(".question");
    const nativeQuestions = nativePage.locator(".v4-overview-question");
    record(viewport.name, "source four-question rail", await sourceQuestions.count() === 4, `count:${await sourceQuestions.count()}`);
    record(viewport.name, "native four-question rail", await nativeQuestions.count() === 4, `count:${await nativeQuestions.count()}`);
    record(viewport.name, "source result card exists", await sourcePage.locator(".result-card").count() === 1);
    record(viewport.name, "native result card exists", await nativePage.locator(".v4-overview-card").count() === 1);
    record(viewport.name, "source whole-memory hierarchy exists", await sourcePage.locator(".intro h1").count() === 1 && await sourcePage.locator(".workspace").count() === 1);
    record(viewport.name, "native whole-memory hierarchy exists", await nativePage.locator("#v4-overview-title").count() === 1 && await nativePage.locator(".v4-overview-workspace").count() === 1);

    const initialNativeCopy = await nativePage.locator("body").innerText();
    record(viewport.name, "native canonical Moment count rendered", initialNativeCopy.includes("8개의 순간") && initialNativeCopy.includes("Moments") && initialNativeCopy.includes("8"));

    await capturePair(viewport, sourcePage, nativePage, comparePage, "initial-whole-memory");
    evidence.push(`${viewport.name}-initial-whole-memory-source-vs-native.png`);

    for (let index = 0; index < VIEWS.length; index += 1) {
      await activateSource(sourcePage, index, viewport.touch);
      await activateNative(nativePage, index, viewport.touch);
      record(viewport.name, `source ${VIEWS[index]} transition`, await sourceQuestions.nth(index).getAttribute("aria-expanded") === "true");
      record(viewport.name, `native ${VIEWS[index]} transition`, await nativeQuestions.nth(index).evaluate((element) => element.classList.contains("is-active")));
      await capturePair(viewport, sourcePage, nativePage, comparePage, VIEWS[index]);
      evidence.push(`${viewport.name}-${VIEWS[index]}-source-vs-native.png`);
    }

    await sourceQuestions.first().focus();
    record(viewport.name, "source keyboard focusable", await sourceQuestions.first().evaluate((element) => document.activeElement === element));
    await sourcePage.keyboard.press("Enter");
    await waitForSourceView(sourcePage, "stand");
    record(viewport.name, "source Enter activation", await sourceQuestions.first().getAttribute("aria-expanded") === "true");
    await nativeQuestions.first().focus();
    record(viewport.name, "native keyboard focusable", await nativeQuestions.first().evaluate((element) => document.activeElement === element));
    await nativePage.keyboard.press("Enter");
    await waitForNativeView(nativePage, 0);
    record(viewport.name, "native Enter activation", await nativeQuestions.first().evaluate((element) => element.classList.contains("is-active")));

    await sourceQuestions.nth(1).focus();
    await sourcePage.keyboard.press("Space");
    await waitForSourceView(sourcePage, "changed");
    record(viewport.name, "source Space activation", await sourceQuestions.nth(1).getAttribute("aria-expanded") === "true");
    await nativeQuestions.nth(1).focus();
    await nativePage.keyboard.press("Space");
    await waitForNativeView(nativePage, 1);
    record(viewport.name, "native Space activation", await nativeQuestions.nth(1).evaluate((element) => element.classList.contains("is-active")));

    const sourceOverflow = await sourcePage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    const nativeOverflow = await nativePage.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    record(viewport.name, "source horizontal overflow zero", sourceOverflow <= 1, `overflow:${sourceOverflow}`);
    record(viewport.name, "native horizontal overflow zero", nativeOverflow <= 1, `overflow:${nativeOverflow}`);

    const sourceCopy = await sourcePage.locator("body").innerText();
    const nativeCopy = await nativePage.locator("body").innerText();
    record(viewport.name, "source demo fixture evidence remains source-only", sourceCopy.includes("93") && sourceCopy.includes("184일") && sourceCopy.includes("시즌 완성까지 7개"));
    const blockedNativeClaims = ["93", "184일", "42%", "+ 8개", "시즌 완성까지 7개", "꽃망울", "300개", "91%"];
    const leaked = blockedNativeClaims.filter((claim) => nativeCopy.includes(claim));
    record(viewport.name, "native source-fixture leak zero", leaked.length === 0, leaked.join(", "));
    record(viewport.name, "source page errors zero", sourceErrors.pageErrors.length === 0, sourceErrors.pageErrors.slice(0, 3).join(" | "));
    record(viewport.name, "source console errors zero", sourceErrors.consoleErrors.length === 0, sourceErrors.consoleErrors.slice(0, 3).join(" | "));
    record(viewport.name, "native page errors zero", nativeErrors.pageErrors.length === 0, nativeErrors.pageErrors.slice(0, 3).join(" | "));
    record(viewport.name, "native console errors zero", nativeErrors.consoleErrors.length === 0, nativeErrors.consoleErrors.slice(0, 3).join(" | "));

    await sourceContext.close();
    await nativeContext.close();
    await compareContext.close();
  }

  {
    const sourceContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const nativeContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await blockExternalDemoMedia(sourceContext);
    await mockNativeCanonicalData(nativeContext);
    const sourcePage = await sourceContext.newPage();
    const nativePage = await nativeContext.newPage();
    const sourceErrors = attachErrorCapture(sourcePage);
    const nativeErrors = attachErrorCapture(nativePage);

    await sourcePage.goto(`${SOURCE_BASE}${encodeURI(SOURCE_PATH)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sourcePage.locator(".question").first().waitFor({ state: "visible", timeout: 10000 });
    const sourceDuration = await sourcePage.locator(".question").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    const sourceSeconds = sourceDuration.split(",").map((value) => value.trim()).map((value) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
    record("reduced-motion", "source transition duration collapses", sourceSeconds.every((value) => Number.isFinite(value) && value <= 0.001), sourceDuration);

    await nativePage.goto(`${NATIVE_BASE}${NATIVE_PATH}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await nativePage.locator(".v4-overview-question").first().waitFor({ state: "visible", timeout: 10000 });
    const nativeDuration = await nativePage.locator(".v4-overview-question").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    const nativeSeconds = nativeDuration.split(",").map((value) => value.trim()).map((value) => value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
    record("reduced-motion", "native transition duration collapses", nativeSeconds.every((value) => Number.isFinite(value) && value <= 0.001), nativeDuration);
    record("reduced-motion", "source page errors zero", sourceErrors.pageErrors.length === 0, sourceErrors.pageErrors.slice(0, 3).join(" | "));
    record("reduced-motion", "source console errors zero", sourceErrors.consoleErrors.length === 0, sourceErrors.consoleErrors.slice(0, 3).join(" | "));
    record("reduced-motion", "native page errors zero", nativeErrors.pageErrors.length === 0, nativeErrors.pageErrors.slice(0, 3).join(" | "));
    record("reduced-motion", "native console errors zero", nativeErrors.consoleErrors.length === 0, nativeErrors.consoleErrors.slice(0, 3).join(" | "));
    await sourcePage.screenshot({ path: path.join(COMPARE_OUT, "desktop-1280x800-reduced-motion-source.png"), fullPage: true });
    await nativePage.screenshot({ path: path.join(COMPARE_OUT, "desktop-1280x800-reduced-motion-native.png"), fullPage: true });
    await sourceContext.close();
    await nativeContext.close();
  }

  await browser.close();
  const failures = checks.filter((check) => !check.pass);
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({
    summary: { checks: checks.length, failures: failures.length, comparisonSheets: evidence.length },
    source: `${SOURCE_BASE}${SOURCE_PATH}`,
    native: `${NATIVE_BASE}${NATIVE_PATH}`,
    states: STATES,
    viewports: VIEWPORTS,
    comparisonEvidence: evidence,
    results: checks,
  }, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail ? `  [${check.detail}]` : ""}`);
  console.log(`Track09 source/native comparison sheets: ${evidence.length}`);
  if (failures.length) {
    console.error(`Track09 source/native browser QA had ${failures.length} failure(s)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
