import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.SOURCE58_SCREENSHOT_DIR ?? "/tmp/source58-living-memory-pinboard-browser-qa";
const route = "/design-lab/source-tracks/58/v1-2-native";
const treeId = "source58-mobile-spatial-repair-tree";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = { id: treeId, ownerId: "qa-owner-not-authenticated", title: "Source58 Spatial Repair QA Tree", visibility: "private" };
const qaMoments = [
  { id: "m-root", treeId, parentId: null, connectionReason: null, title: "First light", memo: "Canonical root Moment", sourceType: "youtube", sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnail: pixel, discoveryDate: "2026-01-01", timestamp: "2026-01-01", sortOrder: 1, emotionTags: ["warm"] },
  { id: "m-child-a", treeId, parentId: "m-root", connectionReason: "그날의 빛이 다음 기억을 불렀다", title: "Window song", memo: "Canonical child A", sourceType: "video", sourceUrl: "https://example.test/window.mp4", thumbnail: pixel, discoveryDate: "2026-01-02", timestamp: "2026-01-02", sortOrder: 2, emotionTags: ["soft"] },
  { id: "m-child-b", treeId, parentId: "m-root", connectionReason: "같은 순간에서 다른 길이 열렸다", title: "Second path", memo: "Canonical child B detail for the mobile foreground inspector", sourceType: "other", sourceUrl: "https://example.test/second", thumbnail: pixel, discoveryDate: "2026-01-03", timestamp: "2026-01-03", sortOrder: 3, emotionTags: [] },
  { id: "m-grandchild", treeId, parentId: "m-child-a", connectionReason: "노래가 오래 남아 이어졌다", title: "Long echo", memo: "Canonical grandchild", sourceType: "song", sourceUrl: "https://example.test/song", thumbnail: pixel, discoveryDate: "2026-01-04", timestamp: "2026-01-04", sortOrder: 4, emotionTags: ["echo"] },
  { id: "m-last", treeId, parentId: "m-child-b", connectionReason: "다른 길의 마지막 장면", title: "Quiet return", memo: "Canonical final Moment", sourceType: "travel", sourceUrl: "https://example.test/travel", thumbnail: pixel, discoveryDate: "2026-01-05", timestamp: "2026-01-05", sortOrder: 5, emotionTags: [] },
];

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function captureErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function installFixtures(page) {
  await page.route(`**/api/trees/${treeId}/memories`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) }));
  await page.route(`**/api/trees/${treeId}`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) }));
}

async function openBoard(page, name) {
  await installFixtures(page);
  const response = await page.goto(`${baseUrl}${route}?treeId=${treeId}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: route must return 2xx`);
  await page.getByRole("heading", { name: "Living Memory Pinboard" }).waitFor();
  await page.getByText("Source58 Spatial Repair QA Tree").waitFor();
  const cards = page.locator("button[data-source58-card]");
  await cards.nth(qaMoments.length - 1).waitFor();
  assert.equal(await cards.count(), qaMoments.length, `${name}: canonical Moment count mismatch`);
  return cards;
}

async function assertNoOverflow(page, name) {
  const d = await page.evaluate(() => ({ innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  assert.ok(d.body <= d.innerWidth, `${name}: body overflow ${d.body} > ${d.innerWidth}`);
  assert.ok(d.root <= d.innerWidth, `${name}: root overflow ${d.root} > ${d.innerWidth}`);
}

async function spatialMetrics(page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="source58-board"]');
    const cards = [...document.querySelectorAll("button[data-source58-card]")];
    const thread = document.querySelector('svg[aria-label="Canonical Connection living thread"]');
    if (!board || !thread || cards.length < 2) return null;
    const boardRect = board.getBoundingClientRect();
    const rects = cards.map((card) => {
      const r = card.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2, transform: getComputedStyle(card).transform };
    });
    let overlapPairs = 0;
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      if (Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left) > 1 && Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top) > 1) overlapPairs += 1;
    }
    const xs = rects.map((r) => r.cx);
    const ys = rects.map((r) => r.cy);
    const paths = [...thread.querySelectorAll("path")].map((path) => {
      const b = path.getBBox();
      return { display: getComputedStyle(path).display, width: b.width, height: b.height, d: path.getAttribute("d") ?? "" };
    });
    return {
      boardWidth: boardRect.width,
      boardHeight: boardRect.height,
      visible: rects.filter((r) => r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight).length,
      distinctX: new Set(xs.map((v) => Math.round(v / 8))).size,
      distinctY: new Set(ys.map((v) => Math.round(v / 8))).size,
      xSpread: Math.max(...xs) - Math.min(...xs),
      ySpread: Math.max(...ys) - Math.min(...ys),
      rotated: rects.filter((r) => r.transform !== "none" && r.transform !== "matrix(1, 0, 0, 1, 0, 0)").length,
      overlapPairs,
      threadPosition: getComputedStyle(thread).position,
      threadZ: Number.parseInt(getComputedStyle(thread).zIndex || "0", 10),
      cardZ: Number.parseInt(getComputedStyle(cards[1]).zIndex || "0", 10),
      paths,
    };
  });
}

function assertSpatial(m, name) {
  assert.ok(m, `${name}: metrics unavailable`);
  assert.ok(m.visible >= 4, `${name}: visible Moments=${m.visible}`);
  assert.ok(m.distinctX >= 3 && m.distinctY >= 3, `${name}: spatial x/y collapsed`);
  assert.ok(m.xSpread >= m.boardWidth * 0.42, `${name}: x spread too small`);
  assert.ok(m.ySpread >= m.boardHeight * 0.32, `${name}: y spread too small`);
  assert.ok(m.rotated >= 2, `${name}: rotation missing`);
  assert.ok(m.overlapPairs >= 1, `${name}: controlled overlap missing`);
  assert.equal(m.threadPosition, "absolute", `${name}: thread must cover board`);
  assert.ok(m.cardZ > m.threadZ, `${name}: thread must stay behind cards`);
  assert.ok(m.paths.length >= 3 && m.paths.every((p) => p.display !== "none"), `${name}: layered thread hidden`);
  assert.ok(m.paths.some((p) => p.width >= 20 && p.height >= 18 && p.d.includes(" C ")), `${name}: curved spatial path missing`);
}

async function auditThemes() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureErrors(page);
  await openBoard(page, "themes");
  for (const [label, id, slug] of [["Pearl","pearl","pearl"],["Warm Cork","cork","warm-cork"],["Letter","letter","letter"],["Blossom","blossom","blossom"],["Night","night","night"],["Mint","mint","mint"]]) {
    await page.getByRole("button", { name: label }).click();
    assert.equal(await page.locator("main[data-source-track='58']").getAttribute("data-theme"), id);
    await page.screenshot({ path: `${screenshotDir}/repair-theme-${slug}-1280x800.png`, fullPage: false });
  }
  await assertNoOverflow(page, "themes");
  assert.deepEqual(errors.consoleErrors, []);
  assert.deepEqual(errors.pageErrors, []);
  await context.close();
}

async function auditMobile(name, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const cards = await openBoard(page, name);
  const board = page.getByTestId("source58-board");
  const inspector = page.locator("aside[aria-label='Selected Moment inspector']");

  assert.equal(await board.getAttribute("data-mobile-spatial-board"), "true");
  assert.equal(await inspector.getAttribute("data-mobile-open"), "false");
  assertSpatial(await spatialMetrics(page), `${name}-initial`);
  await assertNoOverflow(page, `${name}-initial`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-initial-spatial.png`, fullPage: false });

  await cards.nth(2).tap();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"), "true");
  assert.equal(await inspector.getAttribute("data-mobile-open"), "true");
  await inspector.getByRole("heading", { name: "Second path" }).waitFor();
  await inspector.getByText("Canonical child B detail for the mobile foreground inspector", { exact: true }).waitFor();
  await inspector.getByText("WHY NEXT", { exact: true }).waitFor();
  await inspector.getByText("같은 순간에서 다른 길이 열렸다", { exact: true }).waitFor();
  const detail = await page.evaluate(() => {
    const boardNode = document.querySelector('[data-testid="source58-board"]');
    const inspectorNode = document.querySelector('aside[aria-label="Selected Moment inspector"]');
    const media = inspectorNode?.querySelector("[data-source58-inspector-media]");
    if (!boardNode || !inspectorNode || !media) return null;
    const b = boardNode.getBoundingClientRect();
    const i = inspectorNode.getBoundingClientRect();
    return { boardTop: b.top, inspectorTop: i.top, mediaHeight: media.getBoundingClientRect().height, position: getComputedStyle(inspectorNode).position };
  });
  assert.ok(detail && detail.position === "fixed" && detail.mediaHeight > 40, `${name}: foreground inspector hierarchy missing`);
  assert.ok(detail.inspectorTop - detail.boardTop >= 90, `${name}: board context not visible behind inspector`);
  await assertNoOverflow(page, `${name}-selected`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-selected-inspector.png`, fullPage: false });

  await inspector.getByRole("button", { name: "REPLAY IN CINEMA" }).tap();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("data-cinema-active-id"), "m-child-b");
  assert.equal(await dialog.locator("[data-cinema-board-context]").count(), 1);
  await assertNoOverflow(page, `${name}-cinema`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-cinema.png`, fullPage: false });

  await page.getByRole("button", { name: "EXIT TO BOARD" }).tap();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"), "true", `${name}: selected Moment lost on Cinema exit`);
  assert.equal(await inspector.getAttribute("data-mobile-open"), "true", `${name}: inspector not restored on Cinema exit`);
  assertSpatial(await spatialMetrics(page), `${name}-return`);
  await assertNoOverflow(page, `${name}-return`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-cinema-return-spatial.png`, fullPage: false });

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditThemes();
  await auditMobile("mobile-390x844", 390, 844);
  await auditMobile("mobile-320x720", 320, 720);
  console.log("SOURCE58_MOBILE_SPATIAL_REPAIR_BROWSER_QA=PASS");
  console.log("SOURCE58_MOBILE_SPATIAL_BOARD=GRAPH_NOT_LIST");
  console.log("SOURCE58_SIX_THEME_EVIDENCE=COMPLETE");
} finally {
  await browser.close();
}
