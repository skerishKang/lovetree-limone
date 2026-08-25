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

function collectBrowserSignals(page) {
  const errors = [];
  const writes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`); });
  return { errors, writes };
}

async function installCanonicalFixtures(page) {
  await page.route("**/api/trees/qa-tree", async (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) }));
  await page.route("**/api/trees/qa-tree/memories", async (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) }));
}

async function openProof({ width, height, hasTouch = false, isMobile = false, reducedMotion = "no-preference" }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height }, hasTouch, isMobile, reducedMotion });
  const page = await context.newPage();
  const signals = collectBrowserSignals(page);
  await installCanonicalFixtures(page);
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.ok(response?.ok(), `route HTTP ${response?.status()}`);
  await page.getByText("SESSION ONLY · 저장되지 않음").waitFor();
  return { browser, context, page, ...signals };
}

async function measureHorizontalGeometry(page, label) {
  const diagnostic = await page.evaluate((phase) => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.querySelector("[data-track26-donor=film-session]");
    const studio = root?.querySelector("section[class*='studio']") ?? null;
    const asides = root ? [...root.querySelectorAll("aside")] : [];
    const inspector = asides.find((node) => node.textContent?.includes("SCENE INSPECTOR")) ?? null;
    const storyboard = asides.find((node) => node.textContent?.includes("STORYBOARD")) ?? null;
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
        boxSizing: style.boxSizing, widthCss: style.width, minWidth: style.minWidth,
        paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
        borderLeft: style.borderLeftWidth, borderRight: style.borderRightWidth,
        overflowX: style.overflowX, display: style.display, gap: style.gap,
        gridTemplateColumns: style.gridTemplateColumns, transform: style.transform,
      };
    };
    const viewportWidth = html.clientWidth;
    const rightOffenders = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const r = element.getBoundingClientRect();
        if (r.right <= viewportWidth + 0.01) return false;
        const scroller = element.closest("ol");
        return !(scroller && getComputedStyle(scroller).overflowX === "auto");
      })
      .slice(0, 12)
      .map((element) => ({ ...rect(element), text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) }));
    return {
      phase,
      viewport: { innerWidth: window.innerWidth, outerWidth: window.outerWidth, visualViewportWidth: window.visualViewport?.width ?? null, devicePixelRatio: window.devicePixelRatio },
      html: rect(html), body: rect(body), root: rect(root), studio: rect(studio), storyboard: rect(storyboard), inspector: rect(inspector), rightOffenders,
    };
  }, label);
  console.log(`[track26-horizontal-geometry] ${JSON.stringify(diagnostic)}`);
  return diagnostic;
}

async function assertNoHorizontalOverflow(page, label) {
  const diagnostic = await measureHorizontalGeometry(page, label);
  const htmlOverflow = diagnostic.html.scrollWidth - diagnostic.html.clientWidth;
  const bodyOverflow = diagnostic.body.scrollWidth - diagnostic.body.clientWidth;
  const rootOverflow = diagnostic.root.scrollWidth - diagnostic.root.clientWidth;
  assert.equal(htmlOverflow, 0, `${label}: documentElement overflow must be zero, got ${htmlOverflow}px`);
  assert.equal(bodyOverflow, 0, `${label}: body overflow must be zero, got ${bodyOverflow}px`);
  assert.equal(rootOverflow, 0, `${label}: Track26 root overflow must be zero, got ${rootOverflow}px`);
  return diagnostic;
}

async function openSourceStudio(browser, width, height) {
  const sourceHtml = await readFile(sourcePath, "utf8");
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  const page = await context.newPage();
  const signals = collectBrowserSignals(page);
  await page.setContent(sourceHtml, { waitUntil: "load" });
  await page.evaluate(() => {
    window.FilmStudioAPI.enterStudio();
    window.FilmStudioAPI.selectStudio(1);
    window.FilmStudioAPI.renderCapture();
  });
  await page.locator("#studioShell:not(.hidden)").waitFor({ timeout: 5_000 });
  await page.locator("#storyRail .scene-item").first().waitFor({ timeout: 5_000 });
  if (width <= 760) {
    assert.equal(await page.locator("#inspectToggle").isVisible(), false, "source mobile inspector toggle must remain unavailable exactly as authored");
  } else {
    assert.equal(await page.locator("#inspector").isVisible(), true, "source desktop inspector must remain visibly reviewable");
  }
  return { context, page, ...signals };
}

async function shot(locator) {
  return locator.screenshot({ animations: "disabled", timeout: 5_000 });
}

async function captureAnchorBuffers(sourcePage, nativePage, width) {
  const sourceRail = await shot(sourcePage.locator("#storyRail"));
  const sourceTimeline = await shot(sourcePage.locator(".timeline"));
  const sourceInspector = width > 760 ? await shot(sourcePage.locator("#inspector")) : null;
  const sourceInspectorNote = width > 760 ? "SOURCE DESKTOP INSPECTOR" : "SOURCE MOBILE INSPECTOR UNAVAILABLE IN ORIGINAL CSS";

  const nativeRail = await shot(nativePage.locator("aside").filter({ hasText: "STORYBOARD" }).first());
  const nativeTimeline = await shot(nativePage.getByLabel("필름 장면 위치").locator(".."));
  const nativeInspector = await shot(nativePage.locator("aside").filter({ hasText: "SCENE INSPECTOR" }).first());
  return { sourceRail, sourceTimeline, sourceInspector, sourceInspectorNote, nativeRail, nativeTimeline, nativeInspector };
}

function imageData(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function evidenceFigure(label, buffer, note = "") {
  if (buffer) return `<figure><figcaption>${label}</figcaption><img src="${imageData(buffer)}"></figure>`;
  return `<figure><figcaption>${label}</figcaption><div class="unavailable">${note}</div></figure>`;
}

async function buildComparisonBoard(browser, name, width, height, sourceViewport, nativeViewport, anchors) {
  const board = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const rowsHtml = [
    `<section><h2>SCENE RAIL</h2><div class="pair">${evidenceFigure("SOURCE", anchors.sourceRail)}${evidenceFigure("NATIVE", anchors.nativeRail)}</div></section>`,
    `<section><h2>TIMELINE</h2><div class="pair">${evidenceFigure("SOURCE", anchors.sourceTimeline)}${evidenceFigure("NATIVE", anchors.nativeTimeline)}</div></section>`,
    `<section><h2>INSPECTOR / EDITOR STATE</h2><div class="pair">${evidenceFigure("SOURCE", anchors.sourceInspector, anchors.sourceInspectorNote)}${evidenceFigure("NATIVE", anchors.nativeInspector)}</div></section>`,
  ].join("");
  await board.setContent(`<!doctype html><style>html{background:#080808;color:#eee;font-family:Arial,sans-serif}body{margin:0;padding:28px}h1{margin:0 0 8px;font-size:26px}p{margin:0 0 24px;color:#aaa}h2{font-size:13px;letter-spacing:.16em;color:#d9ad80;margin:26px 0 10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}figure{margin:0;background:#111;border:1px solid #333;padding:10px;min-width:0}figcaption{font-size:10px;letter-spacing:.16em;color:#aaa;margin-bottom:8px}img{display:block;width:100%;height:auto;object-fit:contain;background:#000}.viewport img{max-height:520px;object-fit:contain}.unavailable{min-height:150px;display:grid;place-items:center;padding:24px;border:1px dashed #5a5048;background:#171411;color:#c7aa91;text-align:center;font-size:12px;letter-spacing:.08em;line-height:1.6}</style><body><h1>Track26 Source ↔ Native Visual Fidelity</h1><p>${name} · ${width}×${height} · scene rail / timeline / inspector-editor anchors</p><section><h2>FULL VIEWPORT</h2><div class="pair viewport">${evidenceFigure("SOURCE", sourceViewport)}${evidenceFigure("NATIVE", nativeViewport)}</div></section>${rowsHtml}</body>`);
  await board.screenshot({ path: `${artifactDir}/${name}-side-by-side.png`, fullPage: true, animations: "disabled" });
  await board.close();
}

async function captureVisualEvidence(width, height, name) {
  const browser = await chromium.launch({ headless: true });
  const source = await openSourceStudio(browser, width, height);
  const nativeContext = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 390, isMobile: width <= 390 });
  const nativePage = await nativeContext.newPage();
  const nativeSignals = collectBrowserSignals(nativePage);
  await installCanonicalFixtures(nativePage);
  const response = await nativePage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.ok(response?.ok());
  await nativePage.getByText("SESSION ONLY · 저장되지 않음").waitFor();
  await nativePage.getByRole("button", { name: /두 번째 장면/ }).click();
  await nativePage.getByLabel("HEADLINE").fill("세션 편집 상태");
  const geometry = await assertNoHorizontalOverflow(nativePage, `visual-${name}`);
  if (width === 320) assert.equal(geometry.inspector.scrollWidth, geometry.inspector.clientWidth, "visual 320 inspector must remain intrinsically contained");

  await mkdir(artifactDir, { recursive: true });
  const sourceViewport = await source.page.screenshot({ path: `${artifactDir}/${name}-source.png`, animations: "disabled" });
  const nativeViewport = await nativePage.screenshot({ path: `${artifactDir}/${name}-native.png`, animations: "disabled" });
  const anchors = await captureAnchorBuffers(source.page, nativePage, width);
  await buildComparisonBoard(browser, name, width, height, sourceViewport, nativeViewport, anchors);

  assert.deepEqual(source.errors, [], `${name} source console/page errors`);
  assert.deepEqual(nativeSignals.errors, [], `${name} native console/page errors`);
  assert.deepEqual(nativeSignals.writes, [], `${name} native durable writes`);
  await source.context.close();
  await nativeContext.close();
  await browser.close();
}

test("Track26 desktop proves film assembly controls, reorder/scrub sync, and no durable writes", async () => {
  const run = await openProof({ width: 1280, height: 800 });
  const { browser, context, page, errors, writes } = run;
  try {
    assert.equal(await page.locator("[data-track26-donor=film-session]").count(), 1);
    await page.getByRole("button", { name: /두 번째 장면/ }).click();
    await page.getByLabel("HEADLINE").fill("세션용 새 헤드라인");
    await page.getByLabel(/DURATION/).fill("9");
    assert.equal(await page.getByText("TIMELINE · 21s").count(), 1);
    await page.getByRole("button", { name: "9:16", exact: true }).click();
    await page.getByRole("button", { name: "SLOW PUSH", exact: true }).click();
    const scrubber = page.getByLabel("필름 장면 위치");
    assert.equal(await scrubber.inputValue(), "1");
    await page.getByRole("button", { name: "장면 앞당기기" }).click();
    assert.equal(await scrubber.inputValue(), "0", "reorder must keep timeline playhead aligned with selected scene");
    await scrubber.fill("2");
    assert.equal(await page.getByRole("heading", { name: "마지막 장면" }).count(), 1);
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
    await assertNoHorizontalOverflow(page, "mobile-390x844");
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 320x720 mobile remains touch-operable with exact zero overflow", async () => {
  const run = await openProof({ width: 320, height: 720, hasTouch: true, isMobile: true });
  const { browser, context, page, errors, writes } = run;
  try {
    const initial = await assertNoHorizontalOverflow(page, "mobile-320x720-initial");
    assert.equal(initial.inspector.scrollWidth, initial.inspector.clientWidth, "320px inspector grid must not exceed its content box");
    await page.getByRole("button", { name: /마지막 장면/ }).tap();
    await assertNoHorizontalOverflow(page, "mobile-320x720-after-select");
    await page.getByRole("button", { name: "장면 앞당기기" }).tap();
    await assertNoHorizontalOverflow(page, "mobile-320x720-after-reorder");
    assert.equal(await page.getByLabel("필름 장면 위치").inputValue(), "1");
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
    await page.keyboard.press("Shift+ArrowLeft");
    assert.equal(await scrubber.inputValue(), "0");
    const moveBack = page.getByRole("button", { name: "장면 뒤로" });
    await moveBack.focus();
    await page.keyboard.press("Space");
    assert.equal(await scrubber.inputValue(), "1", "focused button Space must preserve native activation");
    assert.equal(await page.getByRole("button", { name: "PLAY" }).count(), 1);
    await studio.focus();
    await page.keyboard.press("Space");
    assert.equal(await page.getByRole("button", { name: "PAUSE" }).count(), 1);
    const animation = await page.locator("[data-playing=true] div").first().evaluate((node) => getComputedStyle(node).animationName);
    assert.ok(animation === "none" || animation === "");
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test("Track26 source-native donor anchors remain truthfully reviewable at 1280, 390, and 320", async () => {
  await captureVisualEvidence(1280, 800, "desktop-1280");
  await captureVisualEvidence(390, 844, "mobile-390");
  await captureVisualEvidence(320, 720, "mobile-320");
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
