import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const evidenceDir = process.env.TRACK14_EVIDENCE_DIR ?? "/tmp/track14-visual-qa";
const sourcePath = path.resolve("reference/source-tracks-snapshot/14_자동전개마인드맵_템플릿컴포저/01_자동전개마인드맵_현재채택_템플릿컴포저_v2-4.html");
const nativeRoute = "/trees/track14-qa/graph/mindmap";
const viewport = { width: 320, height: 720 };

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
  ["root", null, "", "트리 제목", "이 폼에 기억을 채워보세요", "youtube"],
  ["m1", "root", "첫 순간에서", "+ Moment 추가", "영상·사진·링크·메시지", "youtube"],
  ["e1", "m1", "처음 느낀 감정", "감정 이름", "before → after", "link"],
  ["m2", "m1", "더 궁금해져서", "+ Moment 추가", "영상·사진·링크·메시지", "youtube"],
  ["m3", "m1", "다시 돌아와서", "+ Moment 추가", "영상·사진·링크·메시지", "video"],
  ["e2", "m2", "감정이 깊어짐", "감정 이름", "before → after", "link"],
  ["m4", "m2", "다음 순간을 찾음", "+ Moment 추가", "영상·사진·링크·메시지", "youtube"],
  ["e3", "m3", "돌아온 뒤", "감정 이름", "before → after", "link"],
  ["n1", "m4", "남겨둔 말", "+ 메모", "나만 보는 기록", "book"],
].map(([id, parentId, connectionReason, title, memo, sourceType], index) => ({
  id,
  treeId: tree.id,
  title,
  memo,
  sourceType,
  sourceUrl: "",
  thumbnail: "",
  emotionTags: title === "감정 이름" ? ["before → after"] : [],
  discoveryDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
  timestamp: `2026-08-${String(index + 1).padStart(2, "0")}`,
  sortOrder: index,
  parentId,
  connectionReason,
  createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
}));

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function attachErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function installApiMocks(page) {
  await page.route("**/api/trees/track14-qa", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(tree),
  }));
  await page.route("**/api/trees/track14-qa/memories", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(moments),
  }));
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${label}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
}

async function assertToolbarFits(page) {
  const result = await page.getByLabel("마인드맵 조작").evaluate((toolbar) => {
    const viewportWidth = window.innerWidth;
    const rect = toolbar.getBoundingClientRect();
    const buttons = [...toolbar.querySelectorAll("button")]
      .filter((button) => getComputedStyle(button).display !== "none")
      .map((button) => {
        const box = button.getBoundingClientRect();
        return {
          name: button.getAttribute("aria-label") || button.textContent || "button",
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          clientWidth: button.clientWidth,
          scrollWidth: button.scrollWidth,
          clientHeight: button.clientHeight,
          scrollHeight: button.scrollHeight,
        };
      });
    return { viewportWidth, left: rect.left, right: rect.right, buttons };
  });
  assert.ok(result.left >= -0.5 && result.right <= result.viewportWidth + 0.5, `320 toolbar must stay inside viewport: ${JSON.stringify(result)}`);
  for (const button of result.buttons) {
    assert.ok(button.left >= -0.5 && button.right <= result.viewportWidth + 0.5, `${button.name}: control clipped horizontally`);
    assert.ok(button.scrollWidth <= button.clientWidth + 1, `${button.name}: control text clipped horizontally`);
    assert.ok(button.scrollHeight <= button.clientHeight + 1, `${button.name}: control text wrapped/clipped vertically`);
  }
}

async function assertNativeNodesFitStage(page) {
  const result = await page.evaluate(() => {
    const stage = document.querySelector("section[aria-label='canonical Moment Connection mindmap']")?.getBoundingClientRect();
    const nodes = [...document.querySelectorAll("[data-track14-node='true']")]
      .filter((node) => Number(getComputedStyle(node).opacity) > 0.8)
      .map((node) => {
        const box = node.getBoundingClientRect();
        return { id: node.getAttribute("data-track14-node-id"), left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      });
    return stage ? { stage: { left: stage.left, right: stage.right, top: stage.top, bottom: stage.bottom }, nodes } : null;
  });
  assert.ok(result, "320 native stage must exist");
  for (const node of result.nodes) {
    assert.ok(node.left >= result.stage.left - 2 && node.right <= result.stage.right + 2, `${node.id}: node clipped horizontally at 320`);
    assert.ok(node.top >= result.stage.top - 2 && node.bottom <= result.stage.bottom + 2, `${node.id}: node clipped vertically at 320`);
  }
}

async function openSource() {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = attachErrors(page);
  const response = await page.goto(`${pathToFileURL(sourcePath).href}?capture=1`, { waitUntil: "load" });
  assert.ok(response === null || response.ok(), "320 source executable must load");
  await page.waitForFunction(() => Boolean(window.LoveTreeComposer?.place && window.LoveTreeUnfold?.setProgress));
  await page.evaluate(() => window.LoveTreeComposer.place("basic"));
  await page.waitForTimeout(170);
  await page.evaluate(() => window.LoveTreeUnfold.setProgress(0));
  await assertNoOverflow(page, "source-320x720");
  return { context, page, ...errors };
}

async function openNative() {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = attachErrors(page);
  await installApiMocks(page);
  const response = await page.goto(`${baseUrl}${nativeRoute}`, { waitUntil: "networkidle" });
  assert.ok(response?.ok(), "320 native route must return 2xx");
  await page.locator("main[data-track14-mindmap='canonical-path-donor']").waitFor();
  await assertNoOverflow(page, "native-320x720");
  await assertToolbarFits(page);
  return { context, page, ...errors };
}

async function capture(page, filename) {
  const target = path.join(evidenceDir, filename);
  const buffer = await page.screenshot({ path: target, fullPage: true, animations: "disabled" });
  return buffer;
}

async function compare(leftBuffer, rightBuffer, filename, overlay = false) {
  const context = await browser.newContext({ viewport: { width: overlay ? viewport.width : viewport.width * 2, height: viewport.height } });
  const page = await context.newPage();
  const left = leftBuffer.toString("base64");
  const right = rightBuffer.toString("base64");
  const html = overlay
    ? `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden;background:white}.a,.b{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}.a{opacity:.5}.b{opacity:.5;mix-blend-mode:multiply}</style><img class="a" src="data:image/png;base64,${left}"><img class="b" src="data:image/png;base64,${right}">`
    : `<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:${viewport.width * 2}px;height:${viewport.height}px;overflow:hidden;background:white}.wrap{display:flex;width:100%;height:100%}.pane{position:relative;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden}.pane:first-child{border-right:2px solid #98505e}.pane:before{position:absolute;z-index:2;top:7px;left:7px;padding:4px 7px;border-radius:999px;background:rgba(45,35,31,.78);color:#fff;font:700 9px sans-serif}.pane:first-child:before{content:'SOURCE'}.pane:last-child:before{content:'NATIVE'}.pane img{display:block;width:100%;height:100%;object-fit:fill}</style><div class="wrap"><div class="pane"><img src="data:image/png;base64,${left}"></div><div class="pane"><img src="data:image/png;base64,${right}"></div></div>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(evidenceDir, filename), animations: "disabled" });
  await context.close();
}

async function sourceState(state) {
  const { context, page, pageErrors, consoleErrors } = await openSource();
  if (state !== "initial") await page.evaluate(() => window.LoveTreeUnfold.setProgress(1));
  if (state === "selected") await page.evaluate(() => window.LoveTreeUnfold.select("m1"));
  const buffer = await capture(page, `source-320x720-${state}.png`);
  assert.deepEqual(pageErrors, [], `source-320-${state}: page errors ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `source-320-${state}: console errors ${consoleErrors.join(" | ")}`);
  await context.close();
  return buffer;
}

async function nativeState(state) {
  const { context, page, pageErrors, consoleErrors } = await openNative();
  if (state !== "initial") {
    await page.getByRole("button", { name: "다시 펼치기" }).click();
    await page.waitForFunction(() => document.querySelector("[data-track14-progress='1']"));
    await assertNativeNodesFitStage(page);
  }
  let buffer;
  if (state === "selected") {
    const selected = page.locator("[data-track14-node-id='m1']");
    await selected.tap();
    assert.equal(await selected.getAttribute("aria-selected"), "true", "320 touch tap must select canonical Moment");
    buffer = await capture(page, `native-320x720-${state}.png`);
    const before = await page.locator("svg[role='tree'] > g").last().getAttribute("transform");
    await page.getByRole("button", { name: "확대" }).tap();
    const after = await page.locator("svg[role='tree'] > g").last().getAttribute("transform");
    assert.notEqual(after, before, "320 touch zoom control must update presentation camera only");
  } else {
    buffer = await capture(page, `native-320x720-${state}.png`);
  }
  assert.deepEqual(pageErrors, [], `native-320-${state}: page errors ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `native-320-${state}: console errors ${consoleErrors.join(" | ")}`);
  await context.close();
  return buffer;
}

try {
  for (const state of ["initial", "expanded", "selected"]) {
    const source = await sourceState(state);
    const native = await nativeState(state);
    await compare(source, native, `compare-320x720-${state}.png`);
    if (state === "expanded") await compare(source, native, "overlay-320x720-expanded.png", true);
  }

  await writeFile(path.join(evidenceDir, "compact-visual-fidelity-summary.json"), JSON.stringify({
    viewport: "320x720",
    states: ["initial", "expanded", "selected"],
    sourceExecutable: path.basename(sourcePath),
    sourceNativeSideBySide: true,
    selectedScreenshotBeforeTouchZoomAssertion: true,
    overlayExpanded: true,
    toolbarClippingGuard: true,
    nativeNodeClippingGuard: true,
    touchSelection: true,
    touchZoomControl: true,
    horizontalOverflowZero: true,
    consoleErrorsZero: true,
    pageErrorsZero: true,
    manualVisualReviewRequired: true,
  }, null, 2));
  console.log("TRACK14_COMPACT_SOURCE_NATIVE_VISUAL_FIDELITY=PASS");
} finally {
  await browser.close();
}