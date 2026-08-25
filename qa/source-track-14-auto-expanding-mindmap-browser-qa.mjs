import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const evidenceDir = process.env.TRACK14_EVIDENCE_DIR ?? "/tmp/track14-visual-qa";
const sourcePath = path.resolve("reference/source-tracks-snapshot/14_자동전개마인드맵_템플릿컴포저/01_자동전개마인드맵_현재채택_템플릿컴포저_v2-4.html");
const nativeRoute = "/trees/track14-qa/graph/mindmap";

const tree = {
  id: "track14-qa",
  title: "Track14 QA Tree",
  memo: "canonical PATH fixture",
  ownerId: "qa-owner",
  visibility: "public",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-25T00:00:00Z",
};

const moments = [
  { id: "root", treeId: tree.id, title: "트리 제목", memo: "이 폼에 기억을 채워보세요", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-01", timestamp: "2026-08-01", sortOrder: 0, parentId: null, connectionReason: "", createdAt: "2026-08-01T00:00:00Z" },
  { id: "m1", treeId: tree.id, title: "+ Moment 추가", memo: "영상·사진·링크·메시지", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-02", timestamp: "2026-08-02", sortOrder: 1, parentId: "root", connectionReason: "첫 순간에서", createdAt: "2026-08-02T00:00:00Z" },
  { id: "e1", treeId: tree.id, title: "감정 이름", memo: "before → after", sourceType: "link", sourceUrl: "", thumbnail: "", emotionTags: ["before → after"], discoveryDate: "2026-08-03", timestamp: "2026-08-03", sortOrder: 2, parentId: "m1", connectionReason: "처음 느낀 감정", createdAt: "2026-08-03T00:00:00Z" },
  { id: "m2", treeId: tree.id, title: "+ Moment 추가", memo: "영상·사진·링크·메시지", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-04", timestamp: "2026-08-04", sortOrder: 3, parentId: "m1", connectionReason: "더 궁금해져서", createdAt: "2026-08-04T00:00:00Z" },
  { id: "m3", treeId: tree.id, title: "+ Moment 추가", memo: "영상·사진·링크·메시지", sourceType: "video", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-05", timestamp: "2026-08-05", sortOrder: 4, parentId: "m1", connectionReason: "다시 돌아와서", createdAt: "2026-08-05T00:00:00Z" },
  { id: "e2", treeId: tree.id, title: "감정 이름", memo: "before → after", sourceType: "link", sourceUrl: "", thumbnail: "", emotionTags: ["before → after"], discoveryDate: "2026-08-06", timestamp: "2026-08-06", sortOrder: 5, parentId: "m2", connectionReason: "감정이 깊어짐", createdAt: "2026-08-06T00:00:00Z" },
  { id: "m4", treeId: tree.id, title: "+ Moment 추가", memo: "영상·사진·링크·메시지", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-07", timestamp: "2026-08-07", sortOrder: 6, parentId: "m2", connectionReason: "다음 순간을 찾음", createdAt: "2026-08-07T00:00:00Z" },
  { id: "e3", treeId: tree.id, title: "감정 이름", memo: "before → after", sourceType: "link", sourceUrl: "", thumbnail: "", emotionTags: ["before → after"], discoveryDate: "2026-08-08", timestamp: "2026-08-08", sortOrder: 7, parentId: "m3", connectionReason: "돌아온 뒤", createdAt: "2026-08-08T00:00:00Z" },
  { id: "n1", treeId: tree.id, title: "+ 메모", memo: "나만 보는 기록", sourceType: "book", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-09", timestamp: "2026-08-09", sortOrder: 8, parentId: "m4", connectionReason: "남겨둔 말", createdAt: "2026-08-09T00:00:00Z" },
];

const viewports = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844, mobile: true },
  compact: { width: 320, height: 720, mobile: true },
};

async function installApiMocks(page) {
  await page.route("**/api/trees/track14-qa", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) });
  });
  await page.route("**/api/trees/track14-qa/memories", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) });
  });
}

function attachErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  return { pageErrors, consoleErrors };
}

async function assertNoOverflow(page, label) {
  const size = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.innerWidth, `${label}: horizontal overflow ${size.scrollWidth} > ${size.innerWidth}`);
}

async function openNative(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
    reducedMotion,
  });
  const page = await context.newPage();
  const errors = attachErrors(page);
  await installApiMocks(page);
  const response = await page.goto(`${baseUrl}${nativeRoute}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `native ${viewport.width}x${viewport.height}: route must return 2xx`);
  await page.locator("main[data-track14-mindmap='canonical-path-donor']").waitFor();
  await assertNoOverflow(page, `native-${viewport.width}x${viewport.height}`);
  return { context, page, ...errors };
}

async function openSource(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
  });
  const page = await context.newPage();
  const errors = attachErrors(page);
  const url = `${pathToFileURL(sourcePath).href}?capture=1`;
  const response = await page.goto(url, { waitUntil: "load" });
  assert.ok(response === null || response.ok(), "source file route must load");
  await page.waitForFunction(() => Boolean(window.LoveTreeComposer?.place && window.LoveTreeUnfold?.setProgress));
  await page.evaluate(() => window.LoveTreeComposer.place("basic"));
  await page.waitForTimeout(170);
  await page.evaluate(() => window.LoveTreeUnfold.setProgress(0));
  await assertNoOverflow(page, `source-${viewport.width}x${viewport.height}`);
  return { context, page, ...errors };
}

async function screenshot(page, filename) {
  const target = path.join(evidenceDir, filename);
  const buffer = await page.screenshot({ path: target, fullPage: true, animations: "disabled" });
  return { target, buffer };
}

async function composite(browser, leftBuffer, rightBuffer, width, height, filename, overlay = false) {
  const context = await browser.newContext({ viewport: { width: overlay ? width : width * 2, height } });
  const page = await context.newPage();
  const left = leftBuffer.toString("base64");
  const right = rightBuffer.toString("base64");
  const html = overlay
    ? `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:white}.a,.b{position:absolute;inset:0;width:${width}px;height:${height}px;object-fit:fill}.a{opacity:.5}.b{opacity:.5;mix-blend-mode:multiply}</style><img class="a" src="data:image/png;base64,${left}"><img class="b" src="data:image/png;base64,${right}">`
    : `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${width * 2}px;height:${height}px;overflow:hidden;background:#fff}.wrap{display:flex;width:100%;height:100%}.pane{position:relative;width:${width}px;height:${height}px;overflow:hidden}.pane:first-child{border-right:2px solid #98505e}.pane:before{position:absolute;z-index:2;top:8px;left:8px;padding:5px 8px;border-radius:999px;background:rgba(45,35,31,.78);color:white;font:700 10px sans-serif;letter-spacing:.08em}.pane:first-child:before{content:'SOURCE'}.pane:last-child:before{content:'NATIVE'}.pane img{width:100%;height:100%;object-fit:fill;display:block}</style><div class="wrap"><div class="pane"><img src="data:image/png;base64,${left}"></div><div class="pane"><img src="data:image/png;base64,${right}"></div></div>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(evidenceDir, filename), animations: "disabled" });
  await context.close();
}

async function captureSourceState(browser, viewport, label, state) {
  const opened = await openSource(browser, viewport);
  const { page, context, pageErrors, consoleErrors } = opened;
  if (state !== "initial") await page.evaluate(() => window.LoveTreeUnfold.setProgress(1));
  if (state === "selected") await page.evaluate(() => window.LoveTreeUnfold.select("m1"));
  const shot = await screenshot(page, `source-${label}-${state}.png`);
  assert.deepEqual(pageErrors, [], `source-${label}-${state}: page errors ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `source-${label}-${state}: console errors ${consoleErrors.join(" | ")}`);
  await context.close();
  return shot.buffer;
}

async function captureNativeState(browser, viewport, label, state) {
  const opened = await openNative(browser, viewport);
  const { page, context, pageErrors, consoleErrors } = opened;
  if (state !== "initial") {
    await page.getByRole("button", { name: "다시 펼치기" }).click();
    await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));
  }
  if (state === "selected") {
    await page.locator("[data-track14-node-id='m1']").click();
    await page.waitForFunction(() => document.querySelector("[data-track14-node-id='m1']")?.getAttribute("aria-selected") === "true");
    const dimmedOpacity = await page.locator("[data-track14-node-id='root']").evaluate((node) => Number(getComputedStyle(node).opacity));
    const relatedOpacity = await page.locator("[data-track14-node-id='m2']").evaluate((node) => Number(getComputedStyle(node).opacity));
    assert.ok(dimmedOpacity < 0.4, "selected branch must dim unrelated ancestors/context");
    assert.ok(relatedOpacity > 0.8, "selected branch descendants must stay emphasized");
  }
  const shot = await screenshot(page, `native-${label}-${state}.png`);
  assert.deepEqual(pageErrors, [], `native-${label}-${state}: page errors ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `native-${label}-${state}: console errors ${consoleErrors.join(" | ")}`);
  await context.close();
  return shot.buffer;
}

async function captureVisualMatrix(browser, viewport, label) {
  for (const state of ["initial", "expanded", "selected"]) {
    const source = await captureSourceState(browser, viewport, label, state);
    const native = await captureNativeState(browser, viewport, label, state);
    await composite(browser, source, native, viewport.width, viewport.height, `compare-${label}-${state}.png`);
    if (label === "desktop" && state === "expanded") {
      await composite(browser, source, native, viewport.width, viewport.height, "overlay-desktop-expanded.png", true);
    }
  }
}

async function auditKeyboardAndComposer(browser) {
  const { context, page, pageErrors, consoleErrors } = await openNative(browser, viewports.desktop);
  await page.getByRole("button", { name: "다시 펼치기" }).click();
  await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));

  const m2 = page.locator("[data-track14-node-id='m2']");
  await m2.focus();
  assert.equal(await m2.evaluate((node) => document.activeElement === node), true, "Moment node must accept keyboard focus");
  await page.keyboard.press("Enter");
  assert.equal(await m2.getAttribute("aria-selected"), "true", "Enter must select focused canonical Moment");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("[data-track14-node-id='m3']").getAttribute("aria-selected"), "true", "ArrowRight must move canonical selection");

  await page.getByRole("button", { name: "템플릿" }).click();
  await page.getByRole("button", { name: /Orbit Path/ }).click();
  assert.equal(await page.locator("main[data-track14-mindmap]").getAttribute("data-track14-layout"), "orbit", "layout composer must change presentation layout only");
  const edgeCount = await page.locator("svg path").evaluateAll((nodes) => nodes.filter((node) => node.getAttribute("d")?.startsWith("M ")).length);
  assert.ok(edgeCount >= moments.filter((moment) => moment.parentId).length, "presentation layout must retain canonical Connection paths");

  assert.deepEqual(pageErrors, [], `keyboard/composer page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `keyboard/composer console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditTouch(browser) {
  const { context, page, pageErrors, consoleErrors } = await openNative(browser, viewports.mobile);
  await page.getByRole("button", { name: "다시 펼치기" }).click();
  await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));
  const svg = page.locator("svg[role='tree']");
  const before = await svg.locator(":scope > g").last().getAttribute("transform");
  const box = await svg.boundingBox();
  assert.ok(box, "mobile mindmap must have interactive stage bounds");
  const x = box.x + box.width * 0.82;
  const y = box.y + box.height * 0.74;
  await svg.dispatchEvent("pointerdown", { pointerId: 14, pointerType: "touch", clientX: x, clientY: y, button: 0 });
  await svg.dispatchEvent("pointermove", { pointerId: 14, pointerType: "touch", clientX: x - 72, clientY: y - 24, button: 0 });
  await svg.dispatchEvent("pointerup", { pointerId: 14, pointerType: "touch", clientX: x - 72, clientY: y - 24, button: 0 });
  await page.waitForTimeout(40);
  const after = await svg.locator(":scope > g").last().getAttribute("transform");
  assert.notEqual(after, before, "touch drag must pan presentation camera");
  await assertNoOverflow(page, "touch-mobile");
  assert.deepEqual(pageErrors, [], `touch page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `touch console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

async function auditReducedMotion(browser) {
  const { context, page, pageErrors, consoleErrors } = await openNative(browser, viewports.mobile, "reduce");
  await page.getByRole("button", { name: "다시 펼치기" }).click();
  await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));
  const aura = page.locator("svg ellipse").filter({ has: undefined }).nth(6);
  const animation = await page.locator("[class*='rootAura']").first().evaluate((node) => getComputedStyle(node).animationName);
  assert.ok(animation === "none" || animation === "", `reduced motion must disable ambient aura animation, got ${animation}`);
  await screenshot(page, "native-mobile-reduced-motion.png");
  await assertNoOverflow(page, "reduced-motion-mobile");
  assert.deepEqual(pageErrors, [], `reduced-motion page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `reduced-motion console errors: ${consoleErrors.join(" | ")}`);
  void aura;
  await context.close();
}

async function auditCompact(browser) {
  const { context, page, pageErrors, consoleErrors } = await openNative(browser, viewports.compact);
  await page.getByRole("button", { name: "다시 펼치기" }).click();
  await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));
  await assertNoOverflow(page, "native-320x720");
  await screenshot(page, "native-320x720-expanded.png");
  assert.deepEqual(pageErrors, [], `compact page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `compact console errors: ${consoleErrors.join(" | ")}`);
  await context.close();
}

await mkdir(evidenceDir, { recursive: true });
await readFile(sourcePath);
const browser = await chromium.launch({ headless: true });
try {
  await captureVisualMatrix(browser, viewports.desktop, "desktop");
  await captureVisualMatrix(browser, viewports.mobile, "mobile");
  await auditKeyboardAndComposer(browser);
  await auditTouch(browser);
  await auditReducedMotion(browser);
  await auditCompact(browser);
  await writeFile(path.join(evidenceDir, "visual-fidelity-summary.json"), JSON.stringify({
    source: "01_자동전개마인드맵_현재채택_템플릿컴포저_v2-4.html",
    sourceSha256: "c30d6e1ce861bffbeccbeaeab515a8d51fd4bf00704f7093f3b1aab505cc3d4c",
    nativeRoute,
    viewports: ["1280x800", "390x844", "320x720"],
    statesCompared: ["initial", "expanded", "selected"],
    automatedFunctionalGate: "PASS",
    visualClassification: {
      matchTargets: ["paper stage", "rounded glass shell", "branch geometry", "curved lines", "connection labels", "node-card hierarchy", "staged unfold", "selected-branch dimming", "progress rail"],
      authorizedNativeDeltas: ["canonical Moment content", "presentation-only layout composer", "mobile reflow", "keyboard/focus", "reduced motion", "canonical graph back-navigation"],
      humanVisualReviewRequired: true
    }
  }, null, 2));
  console.log("TRACK14_AUTO_EXPANDING_MINDMAP_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
