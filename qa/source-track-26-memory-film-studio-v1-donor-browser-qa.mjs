import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const baseUrl = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const route = "/design-lab/source-tracks/26/v1/donor?treeId=qa-tree";
const artifactDir = "qa/artifacts/track26-memory-film-studio";
const sourcePath = "reference/source-tracks-snapshot/26_메모리필름스튜디오/01_메모리필름스튜디오_v1.html";

const tree = { id: "qa-tree", ownerId: "qa-owner", title: "QA Memory Film" };
const moments = [
  { id: "m1", treeId: "qa-tree", title: "첫 장면", memo: "첫 번째 기억", sourceType: "image", sourceUrl: "", thumbnail: "", emotionTags: ["설렘"], timestamp: "2026-01-01", discoveryDate: "2026-01-01", sortOrder: 1 },
  { id: "m2", treeId: "qa-tree", title: "두 번째 장면", memo: "두 번째 기억", sourceType: "video", sourceUrl: "https://example.com/media.mp4", thumbnail: "", emotionTags: ["기쁨"], timestamp: "2026-01-02", discoveryDate: "2026-01-02", sortOrder: 2 },
  { id: "m3", treeId: "qa-tree", title: "마지막 장면", memo: "세 번째 기억", sourceType: "audio", sourceUrl: "", thumbnail: "", emotionTags: ["그리움"], timestamp: "2026-01-03", discoveryDate: "2026-01-03", sortOrder: 3 },
];

async function installCanonicalFixtures(page) {
  await page.route("**/api/trees/qa-tree", async (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) }));
  await page.route("**/api/trees/qa-tree/memories", async (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) }));
}

async function openProof({ width, height, hasTouch = false, isMobile = false, reducedMotion = "no-preference" }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height }, hasTouch, isMobile, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`); });
  await installCanonicalFixtures(page);
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.ok(response?.ok(), `route HTTP ${response?.status()}`);
  await page.getByText("SESSION ONLY · 저장되지 않음").waitFor();
  return { browser, context, page, errors, writes };
}

async function measureHorizontalGeometry(page, label) {
  const diagnostic = await page.evaluate(async (phase) => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.querySelector("[data-track26-donor=film-session]");
    const round = (value) => Math.round(value * 100) / 100;
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === "string" ? element.className : "",
        left: round(r.left), right: round(r.right), width: round(r.width),
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, offsetWidth: element.offsetWidth,
        boxSizing: style.boxSizing, widthCss: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
        borderLeft: style.borderLeftWidth, borderRight: style.borderRightWidth,
        marginLeft: style.marginLeft, marginRight: style.marginRight,
        overflowX: style.overflowX, display: style.display, position: style.position,
        gap: style.gap, columnGap: style.columnGap, gridTemplateColumns: style.gridTemplateColumns,
        transform: style.transform,
      };
    };
    const viewportWidth = document.documentElement.clientWidth;
    const regularRightOffenders = [...document.querySelectorAll("body *")]
      .map((element) => ({ element, data: rect(element) }))
      .filter(({ element, data }) => {
        if (!data || data.right <= viewportWidth + 0.01) return false;
        const scroller = element.closest("ol");
        return !(scroller && getComputedStyle(scroller).overflowX === "auto");
      })
      .sort((a, b) => b.data.right - a.data.right)
      .slice(0, 12)
      .map(({ element, data }) => ({ ...data, text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) }));
    const pseudo = [];
    for (const element of document.querySelectorAll("body *")) {
      for (const which of ["::before", "::after"]) {
        const style = getComputedStyle(element, which);
        if (style.content && style.content !== "none" && style.content !== "normal") {
          pseudo.push({ host: element.tagName.toLowerCase(), hostClass: typeof element.className === "string" ? element.className : "", which, content: style.content, position: style.position, left: style.left, right: style.right, width: style.width, marginLeft: style.marginLeft, marginRight: style.marginRight, transform: style.transform, boxSizing: style.boxSizing });
        }
      }
    }
    const layoutContainers = [...document.querySelectorAll("body *")]
      .map((element) => ({ element, data: rect(element) }))
      .filter(({ data }) => data && (data.display.includes("grid") || data.display.includes("flex") || data.scrollWidth > data.clientWidth))
      .map(({ element, data }) => ({ ...data, text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 55) }))
      .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
      .slice(0, 16);
    const widthWithOverride = async (cssText) => {
      const style = document.createElement("style");
      style.textContent = cssText;
      document.head.appendChild(style);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const result = { htmlScroll: html.scrollWidth, htmlClient: html.clientWidth, bodyScroll: body.scrollWidth, bodyClient: body.clientWidth, rootScroll: root?.scrollWidth ?? null, rootClient: root?.clientWidth ?? null };
      style.remove();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return result;
    };
    const variants = {
      noPseudo: await widthWithOverride("[data-track26-donor=film-session] *,[data-track26-donor=film-session] *::before,[data-track26-donor=film-session] *::after{content:none!important}"),
      noTransform: await widthWithOverride("[data-track26-donor=film-session] *{transform:none!important}"),
      noOutline: await widthWithOverride("[data-track26-donor=film-session] *{outline:none!important;outline-offset:0!important}"),
      minWidthZero: await widthWithOverride("[data-track26-donor=film-session] *{min-width:0!important}"),
      noHorizontalBorder: await widthWithOverride("[data-track26-donor=film-session] *{border-left-width:0!important;border-right-width:0!important}"),
      noGap: await widthWithOverride("[data-track26-donor=film-session] *{column-gap:0!important}"),
    };
    return {
      phase,
      viewport: { innerWidth: window.innerWidth, outerWidth: window.outerWidth, visualViewportWidth: window.visualViewport?.width ?? null, devicePixelRatio: window.devicePixelRatio, scrollX: window.scrollX },
      html: rect(html), body: rect(body), root: rect(root), active: rect(document.activeElement), regularRightOffenders, pseudo, layoutContainers, variants,
    };
  }, label);
  console.log(`[track26-horizontal-geometry] ${JSON.stringify(diagnostic)}`);
  return diagnostic;
}

async function assertNoHorizontalOverflow(page, label) {
  const diagnostic = await measureHorizontalGeometry(page, label);
  const overflow = diagnostic.html.scrollWidth - diagnostic.html.clientWidth;
  assert.equal(overflow, 0, `${label}: horizontal overflow must be zero, got ${overflow}px; offenders=${JSON.stringify(diagnostic.regularRightOffenders)}`);
}

async function openSourceStudio(browser, width, height) {
  const sourceHtml = await readFile(sourcePath, "utf8");
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.setContent(sourceHtml, { waitUntil: "load" });
  await page.evaluate(() => window.FilmStudioAPI.enterStudio());
  await page.locator("#studioShell:not(.hidden)").waitFor();
  await page.locator("#storyRail .scene-item").first().waitFor();
  await page.evaluate(() => window.FilmStudioAPI.selectStudio(1));
  return { context, page };
}

async function captureAnchorBuffers(sourcePage, nativePage, width) {
  const sourceRail = await sourcePage.locator("#storyRail").screenshot();
  const sourceTimeline = await sourcePage.locator(".timeline").screenshot();
  if (width <= 760) await sourcePage.locator("#inspectToggle").click();
  const sourceInspector = await sourcePage.locator("#inspector").screenshot();
  if (width <= 760) await sourcePage.locator("#inspectToggle").click();

  const nativeRail = await nativePage.locator("aside").filter({ hasText: "STORYBOARD" }).first().screenshot();
  const nativeTimeline = await nativePage.getByLabel("필름 장면 위치").locator("..").screenshot();
  const nativeInspector = await nativePage.locator("aside").filter({ hasText: "SCENE INSPECTOR" }).first().screenshot();
  return { sourceRail, sourceTimeline, sourceInspector, nativeRail, nativeTimeline, nativeInspector };
}

function imageData(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function buildComparisonBoard(browser, name, width, height, sourceViewport, nativeViewport, anchors) {
  const board = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const rows = [
    ["SCENE RAIL", anchors.sourceRail, anchors.nativeRail],
    ["TIMELINE", anchors.sourceTimeline, anchors.nativeTimeline],
    ["INSPECTOR / EDITOR STATE", anchors.sourceInspector, anchors.nativeInspector],
  ];
  const rowsHtml = rows.map(([label, source, native]) => `<section><h2>${label}</h2><div class="pair"><figure><figcaption>SOURCE</figcaption><img src="${imageData(source)}"></figure><figure><figcaption>NATIVE</figcaption><img src="${imageData(native)}"></figure></div></section>`).join("");
  await board.setContent(`<!doctype html><style>html{background:#080808;color:#eee;font-family:Arial,sans-serif}body{margin:0;padding:28px}h1{margin:0 0 8px;font-size:26px}p{margin:0 0 24px;color:#aaa}h2{font-size:13px;letter-spacing:.16em;color:#d9ad80;margin:26px 0 10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}figure{margin:0;background:#111;border:1px solid #333;padding:10px;min-width:0}figcaption{font-size:10px;letter-spacing:.16em;color:#aaa;margin-bottom:8px}img{display:block;width:100%;height:auto;object-fit:contain;background:#000}.viewport img{max-height:520px;object-fit:contain}</style><body><h1>Track26 Source ↔ Native Visual Fidelity</h1><p>${name} · ${width}×${height} · scene rail / timeline / inspector-editor anchors</p><section><h2>FULL VIEWPORT</h2><div class="pair viewport"><figure><figcaption>SOURCE</figcaption><img src="${imageData(sourceViewport)}"></figure><figure><figcaption>NATIVE</figcaption><img src="${imageData(nativeViewport)}"></figure></div></section>${rowsHtml}</body>`);
  await board.screenshot({ path: `${artifactDir}/${name}-side-by-side.png`, fullPage: true });
  await board.close();
}

async function captureVisualEvidence(width, height, name) {
  const browser = await chromium.launch({ headless: true });
  const source = await openSourceStudio(browser, width, height);
  const nativeContext = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 390, isMobile: width <= 390 });
  const nativePage = await nativeContext.newPage();
  await installCanonicalFixtures(nativePage);
  const response = await nativePage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.ok(response?.ok());
  await nativePage.getByText("SESSION ONLY · 저장되지 않음").waitFor();
  await nativePage.getByRole("button", { name: /두 번째 장면/ }).click();
  await nativePage.getByLabel("HEADLINE").fill("세션 편집 상태");
  await assertNoHorizontalOverflow(nativePage, `visual-${name}`);

  await mkdir(artifactDir, { recursive: true });
  const sourceViewport = await source.page.screenshot({ path: `${artifactDir}/${name}-source.png` });
  const nativeViewport = await nativePage.screenshot({ path: `${artifactDir}/${name}-native.png` });
  const anchors = await captureAnchorBuffers(source.page, nativePage, width);
  await buildComparisonBoard(browser, name, width, height, sourceViewport, nativeViewport, anchors);

  await source.context.close();
  await nativeContext.close();
  await browser.close();
}

test("Track26 desktop proves film assembly controls, reorder/scrub sync, and no durable writes", async () => {
  const run = await openProof({ width: 1280, height: 800 });
  const { browser, context, page, errors, writes } = run;
  try {
    assert.equal(await page.locator("[data-track26-donor=film-session]").count(), 1);
    assert.equal(await page.getByRole("button", { name: /첫 장면/ }).count(), 1);
    await page.getByRole("button", { name: /두 번째 장면/ }).click();
    await page.getByLabel("HEADLINE").fill("세션용 새 헤드라인");
    await page.getByLabel(/DURATION/).fill("9");
    assert.equal(await page.getByText("TIMELINE · 21s").count(), 1, "duration edit must update session timeline duration");
    await page.getByRole("button", { name: "9:16", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "9:16", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "SLOW PUSH", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "SLOW PUSH", exact: true }).getAttribute("aria-pressed"), "true");
    const scrubber = page.getByLabel("필름 장면 위치");
    assert.equal(await scrubber.inputValue(), "1");
    await page.getByRole("button", { name: "장면 앞당기기" }).click();
    assert.equal(await page.getByRole("heading", { name: "세션용 새 헤드라인" }).count(), 1);
    assert.equal(await scrubber.inputValue(), "0", "reorder must keep timeline playhead aligned with selected scene");
    await scrubber.fill("2");
    assert.equal(await page.getByRole("heading", { name: "마지막 장면" }).count(), 1, "timeline scrub must select the matching reordered scene");
    await assertNoHorizontalOverflow(page, "desktop-1280");
    assert.deepEqual(writes, []);
    assert.equal(await page.evaluate(() => localStorage.getItem("lovetree-memory-film-studio-v1")), null);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 390x844 mobile touch and overflow contract remains operable", async () => {
  const run = await openProof({ width: 390, height: 844, hasTouch: true, isMobile: true });
  const { browser, context, page, errors, writes } = run;
  try {
    await page.getByRole("button", { name: /두 번째 장면/ }).tap();
    await page.getByRole("button", { name: "PLAY" }).tap();
    await page.getByRole("button", { name: "4:5", exact: true }).tap();
    assert.equal(await page.getByRole("button", { name: "4:5", exact: true }).getAttribute("aria-pressed"), "true");
    await assertNoHorizontalOverflow(page, "mobile-390x844");
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 320x720 mobile remains touch-operable with exact zero overflow", async () => {
  const run = await openProof({ width: 320, height: 720, hasTouch: true, isMobile: true });
  const { browser, context, page, errors, writes } = run;
  try {
    const initial = await measureHorizontalGeometry(page, "mobile-320x720-initial");
    assert.equal(initial.html.scrollWidth - initial.html.clientWidth, 0, "320px initial render must have zero root overflow");
    await page.getByRole("button", { name: /마지막 장면/ }).tap();
    const selected = await measureHorizontalGeometry(page, "mobile-320x720-after-select");
    assert.equal(selected.html.scrollWidth - selected.html.clientWidth, 0, "320px selection must preserve zero root overflow");
    assert.equal(await page.getByRole("heading", { name: "마지막 장면" }).count(), 1);
    await page.getByRole("button", { name: "장면 앞당기기" }).tap();
    const reordered = await measureHorizontalGeometry(page, "mobile-320x720-after-reorder");
    assert.equal(reordered.html.scrollWidth - reordered.html.clientWidth, 0, "320px reorder must preserve zero root overflow");
    assert.equal(await page.getByLabel("필름 장면 위치").inputValue(), "1", "320px touch reorder must keep playhead synchronized");
    await assertNoHorizontalOverflow(page, "mobile-320x720");
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 keyboard, native button activation, and reduced-motion contracts survive together", async () => {
  const run = await openProof({ width: 1280, height: 800, reducedMotion: "reduce" });
  const { browser, context, page, errors, writes } = run;
  try {
    const studio = page.locator("[data-track26-donor=film-session]");
    const scrubber = page.getByLabel("필름 장면 위치");
    await studio.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("heading", { name: "두 번째 장면" }).count(), 1);
    await page.keyboard.press("Shift+ArrowLeft");
    assert.equal(await scrubber.inputValue(), "0", "keyboard reorder must keep playhead synchronized");
    const moveBack = page.getByRole("button", { name: "장면 뒤로" });
    await moveBack.focus();
    await page.keyboard.press("Space");
    assert.equal(await scrubber.inputValue(), "1", "Space on a focused reorder button must preserve native button activation");
    assert.equal(await page.getByRole("button", { name: "PLAY" }).count(), 1, "native button Space must not be hijacked by the global transport shortcut");
    await studio.focus();
    await page.keyboard.press("Space");
    assert.equal(await page.getByRole("button", { name: "PAUSE" }).count(), 1);
    const animation = await page.locator("[data-playing=true] div").first().evaluate((node) => getComputedStyle(node).animationName);
    assert.ok(animation === "none" || animation === "", `reduced-motion animation=${animation}`);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 source-native donor anchors remain visually reviewable at 1280, 390, and 320", async () => {
  await captureVisualEvidence(1280, 800, "desktop-1280");
  await captureVisualEvidence(390, 844, "mobile-390");
  await captureVisualEvidence(320, 720, "native-320");
});

test("Track26 no-tree state fails closed without demo scenes", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    const response = await page.goto(`${baseUrl}/design-lab/source-tracks/26/v1/donor`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert.ok(response?.ok());
    await page.getByText("이 route는 demo Moment를 만들지 않습니다.").waitFor();
    assert.equal(await page.getByText("tree-felix").count(), 0);
  } finally { await browser.close(); }
});
