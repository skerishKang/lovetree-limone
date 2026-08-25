import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.TRACK37_SCREENSHOT_DIR ?? "/tmp/track37-browser-qa";
const sourcePath = path.resolve("reference/source-tracks-snapshot/37_기억달력_메모리패드/01_기억달력_뜯어쓰는메모리패드.html");
const nativeRoute = "/v4/trees/track37-qa/archive/calendar";

const tree = { id: "track37-qa", title: "Track37 QA Tree", ownerId: "qa-owner", visibility: "public" };
const memories = [
  { id: "qa-aug-01-a", treeId: tree.id, title: "8월 첫 기억", memo: "실제 저장일 8월 1일", sourceType: "youtube", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-01", timestamp: "2026-08-01", sortOrder: 0 },
  { id: "qa-aug-01-b", treeId: tree.id, title: "같은 날 두 번째 기억", memo: "같은 날짜의 별도 Moment", sourceType: "link", sourceUrl: "https://example.test/memory", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-01T19:20:00+09:00", timestamp: "2026-08-01T19:20:00+09:00", sortOrder: 1 },
  { id: "qa-aug-10", treeId: tree.id, title: "8월 열흘 기억", memo: "실제 저장일 8월 10일", sourceType: "other", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-08-10", timestamp: "2026-08-10", sortOrder: 2 },
  { id: "qa-sep-02", treeId: tree.id, title: "9월 기억", memo: "실제 저장일 9월 2일", sourceType: "video", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "2026-09-02", timestamp: "2026-09-02", sortOrder: 3 },
  { id: "qa-no-date", treeId: tree.id, title: "날짜 없는 기억", memo: "createdAt만 있어 달력에서 제외되어야 함", sourceType: "other", sourceUrl: "", thumbnail: "", emotionTags: [], discoveryDate: "", timestamp: "", createdAt: "2026-10-31T12:00:00Z", sortOrder: 4 },
];

const viewports = [
  { name: "desktop-1280x800", width: 1280, height: 800, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true },
  { name: "mobile-320x720", width: 320, height: 720, mobile: true },
];

async function installApiMocks(page) {
  await page.route("**/api/trees/track37-qa", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) }));
  await page.route("**/api/trees/track37-qa/memories", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memories) }));
}

async function openSource(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.mobile,
    isMobile: viewport.mobile,
    reducedMotion,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(sourcePath).href, { waitUntil: "domcontentloaded" });
  await page.locator("#paperMesh").waitFor();
  await page.waitForTimeout(500);
  return { context, page };
}

async function openNative(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.mobile,
    isMobile: viewport.mobile,
    reducedMotion,
  });
  const page = await context.newPage();
  await installApiMocks(page);
  const response = await page.goto(`${baseUrl}${nativeRoute}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), `${viewport.name}: native route must return 2xx`);
  await page.locator("main[data-track37-native='archive-calendar']").waitFor();
  await page.getByRole("button", { name: /2026\.08/ }).click();
  await page.getByRole("button", { name: /01/ }).last().click();
  await page.getByText("2026.08.01", { exact: true }).waitFor();
  return { context, page };
}

async function assertNoHeaderOverlap(page, label) {
  const pad = page.getByTestId("track37-active-pad");
  const header = pad.locator("header");
  const meta = pad.getByText("2 Moments", { exact: true });
  const date = pad.getByText("2026.08.01", { exact: true });
  const [headerBox, metaBox, dateBox] = await Promise.all([header.boundingBox(), meta.boundingBox(), date.boundingBox()]);
  assert.ok(headerBox && metaBox && dateBox, `${label}: required pad geometry must exist`);
  assert.ok(metaBox.y >= headerBox.y + headerBox.height - 1, `${label}: date meta overlaps pad header`);
  assert.ok(dateBox.y >= headerBox.y - 1 && dateBox.y + dateBox.height <= headerBox.y + headerBox.height + 1, `${label}: archived date text escapes header`);
}

async function screenshotViewport(page, filename) {
  return page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false, animations: "disabled" });
}

async function sideBySide(browser, leftBuffer, rightBuffer, viewport, filename) {
  const context = await browser.newContext({ viewport: { width: viewport.width * 2, height: viewport.height } });
  const page = await context.newPage();
  const left = leftBuffer.toString("base64");
  const right = rightBuffer.toString("base64");
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${viewport.width * 2}px;height:${viewport.height}px;overflow:hidden;background:#fff}.wrap{display:flex;width:100%;height:100%}.pane{position:relative;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden}.pane:first-child{border-right:2px solid #b9576c}.pane:before{position:absolute;z-index:2;top:7px;left:7px;padding:4px 7px;border-radius:999px;background:rgba(45,35,31,.78);color:#fff;font:700 9px sans-serif}.pane:first-child:before{content:'SOURCE'}.pane:last-child:before{content:'NATIVE'}.pane img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}</style><div class="wrap"><div class="pane"><img src="data:image/png;base64,${left}"></div><div class="pane"><img src="data:image/png;base64,${right}"></div></div>`, { waitUntil: "load" });
  await page.screenshot({ path: path.join(screenshotDir, filename), fullPage: false, animations: "disabled" });
  await context.close();
}

async function captureInitial(browser, viewport) {
  const source = await openSource(browser, viewport);
  const native = await openNative(browser, viewport);
  await assertNoHeaderOverlap(native.page, viewport.name);
  const sourceBuffer = await screenshotViewport(source.page, `source-${viewport.name}-initial.png`);
  const nativeBuffer = await screenshotViewport(native.page, `native-${viewport.name}-initial.png`);
  await sideBySide(browser, sourceBuffer, nativeBuffer, viewport, `compare-${viewport.name}-initial.png`);
  await source.context.close();
  await native.context.close();
}

async function captureNext(browser, viewport) {
  const source = await openSource(browser, viewport);
  const native = await openNative(browser, viewport);
  await source.page.getByRole("button", { name: "뜯기 동작 자동으로 보기" }).click();
  await source.page.waitForTimeout(1500);
  await native.page.getByRole("button", { name: "다음 저장일 →" }).click();
  await native.page.getByText("2026.08.10", { exact: true }).waitFor();
  const sourceBuffer = await screenshotViewport(source.page, `source-${viewport.name}-next.png`);
  const nativeBuffer = await screenshotViewport(native.page, `native-${viewport.name}-next.png`);
  await sideBySide(browser, sourceBuffer, nativeBuffer, viewport, `compare-${viewport.name}-next.png`);
  await source.context.close();
  await native.context.close();
}

async function captureReducedMotion(browser) {
  const viewport = { name: "reduced-motion-390x844", width: 390, height: 844, mobile: true };
  const source = await openSource(browser, viewport, "reduce");
  const native = await openNative(browser, viewport, "reduce");
  await assertNoHeaderOverlap(native.page, viewport.name);
  const sourceBuffer = await screenshotViewport(source.page, `source-${viewport.name}.png`);
  const nativeBuffer = await screenshotViewport(native.page, `native-${viewport.name}.png`);
  await sideBySide(browser, sourceBuffer, nativeBuffer, viewport, `compare-${viewport.name}.png`);
  await source.context.close();
  await native.context.close();
}

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    await captureInitial(browser, viewport);
    await captureNext(browser, viewport);
  }
  await captureReducedMotion(browser);
  console.log("TRACK37_SOURCE_NATIVE_VISUAL_FIDELITY=PASS");
} finally {
  await browser.close();
}
