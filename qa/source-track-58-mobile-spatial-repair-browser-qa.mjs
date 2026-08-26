import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.SOURCE58_SCREENSHOT_DIR ?? "/tmp/source58-living-memory-pinboard-browser-qa";
const route = "/design-lab/source-tracks/58/v1-2-native";
const treeId = "source58-mobile-spatial-repair-tree";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: treeId,
  ownerId: "qa-owner-not-authenticated",
  title: "Source58 Spatial Repair QA Tree",
  visibility: "private",
};

const qaMoments = [
  {
    id: "m-root",
    treeId,
    parentId: null,
    connectionReason: null,
    title: "First light",
    memo: "Canonical root Moment",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: pixel,
    discoveryDate: "2026-01-01",
    timestamp: "2026-01-01",
    sortOrder: 1,
    emotionTags: ["warm"],
  },
  {
    id: "m-child-a",
    treeId,
    parentId: "m-root",
    connectionReason: "그날의 빛이 다음 기억을 불렀다",
    title: "Window song",
    memo: "Canonical child A",
    sourceType: "video",
    sourceUrl: "https://example.test/window.mp4",
    thumbnail: pixel,
    discoveryDate: "2026-01-02",
    timestamp: "2026-01-02",
    sortOrder: 2,
    emotionTags: ["soft"],
  },
  {
    id: "m-child-b",
    treeId,
    parentId: "m-root",
    connectionReason: "같은 순간에서 다른 길이 열렸다",
    title: "Second path",
    memo: "Canonical child B detail for the mobile foreground inspector",
    sourceType: "other",
    sourceUrl: "https://example.test/second",
    thumbnail: pixel,
    discoveryDate: "2026-01-03",
    timestamp: "2026-01-03",
    sortOrder: 3,
    emotionTags: [],
  },
  {
    id: "m-grandchild",
    treeId,
    parentId: "m-child-a",
    connectionReason: "노래가 오래 남아 이어졌다",
    title: "Long echo",
    memo: "Canonical grandchild",
    sourceType: "song",
    sourceUrl: "https://example.test/song",
    thumbnail: pixel,
    discoveryDate: "2026-01-04",
    timestamp: "2026-01-04",
    sortOrder: 4,
    emotionTags: ["echo"],
  },
  {
    id: "m-last",
    treeId,
    parentId: "m-child-b",
    connectionReason: "다른 길의 마지막 장면",
    title: "Quiet return",
    memo: "Canonical final Moment",
    sourceType: "travel",
    sourceUrl: "https://example.test/travel",
    thumbnail: pixel,
    discoveryDate: "2026-01-05",
    timestamp: "2026-01-05",
    sortOrder: 5,
    emotionTags: [],
  },
];

const browser = await chromium.launch({ headless: true });

function captureBrowserErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function installFixtures(page) {
  await page.route(`**/api/trees/${treeId}/memories`, async (requestRoute) => {
    await requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) });
  });
  await page.route(`**/api/trees/${treeId}`, async (requestRoute) => {
    await requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
  });
}

async function openBoard(page, name) {
  await installFixtures(page);
  const response = await page.goto(`${baseUrl}${route}?treeId=${treeId}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: Source58 route must return 2xx`);
  await page.getByRole("heading", { name: "Living Memory Pinboard" }).waitFor();
  await page.getByText("Source58 Spatial Repair QA Tree").waitFor();
  const cards = page.locator("button[data-source58-card]");
  await cards.nth(qaMoments.length - 1).waitFor();
  assert.equal(await cards.count(), qaMoments.length, `${name}: canonical Moment count mismatch`);
  return cards;
}

async function assertNoOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    rootWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.bodyWidth <= dimensions.innerWidth, `${name}: body overflow ${dimensions.bodyWidth} > ${dimensions.innerWidth}`);
  assert.ok(dimensions.rootWidth <= dimensions.innerWidth, `${name}: root overflow ${dimensions.rootWidth} > ${dimensions.innerWidth}`);
}

async function spatialMetrics(page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="source58-board"]');
    const cards = [...document.querySelectorAll("button[data-source58-card]")];
    const thread = document.querySelector('svg[aria-label="Canonical Connection living thread"]');
    if (!board || !thread) return null;

    const boardRect = board.getBoundingClientRect();
    const rects = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const style = getComputedStyle(card);
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        transform: style.transform,
      };
    });

    const visible = rects.filter((rect) => (
      rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight
    )).length;
    const centersX = rects.map((rect) => rect.centerX);
    const centersY = rects.map((rect) => rect.centerY);
    let overlapPairs = 0;
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const overlapX = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
        const overlapY = Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top);
        if (overlapX > 1 && overlapY > 1) overlapPairs += 1;
      }
    }

    const pathMetrics = [...thread.querySelectorAll("path")].map((path) => {
      const box = path.getBBox();
      return {
        display: getComputedStyle(path).display,
        width: box.width,
        height: box.height,
        d: path.getAttribute("d") ?? "",
      };
    });

    return {
      board: { top: boardRect.top, bottom: boardRect.bottom, width: boardRect.width, height: boardRect.height },
      visible,
      xSpread: Math.max(...centersX) - Math.min(...centersX),
      ySpread: Math.max(...centersY) - Math.min(...centersY),
      distinctX: new Set(centersX.map((value) => Math.round(value / 8))).size,
      distinctY: new Set(centersY.map((value) => Math.round(value / 8))).size,
      rotatedCards: rects.filter((rect) => rect.transform !== "none" && rect.transform !== "matrix(1, 0, 0, 1, 0, 0)").length,
      overlapPairs,
      threadPosition: getComputedStyle(thread).position,
      threadZ: Number.parseInt(getComputedStyle(thread).zIndex || "0", 10),
      cardZ: Number.parseInt(getComputedStyle(cards[1]).zIndex || "0", 10),
      pathMetrics,
    };
  });
}

function assertSpatialIntent(metrics, name) {
  assert.ok(metrics, `${name}: spatial metrics unavailable`);
  assert.ok(metrics.visible >= 4, `${name}: multiple Moments must share first viewport, visible=${metrics.visible}`);
  assert.ok(metrics.distinctX >= 3, `${name}: card centers collapse to a column, distinctX=${metrics.distinctX}`);
  assert.ok(metrics.distinctY >= 3, `${name}: board lacks y distribution, distinctY=${metrics.distinctY}`);
  assert.ok(metrics.xSpread >= metrics.board.width * 0.42, `${name}: x spread too small (${metrics.xSpread.toFixed(1)}px)`);
  assert.ok(metrics.ySpread >= metrics.board.height * 0.32, `${name}: y spread too small (${metrics.ySpread.toFixed(1)}px)`);
  assert.ok(metrics.rotatedCards >= 2, `${name}: spatial card rotation is missing`);
  assert.ok(metrics.overlapPairs >= 1, `${name}: controlled spatial overlap is missing`);
  assert.equal(metrics.threadPosition, "absolute", `${name}: Living Thread must cover the board canvas`);
  assert.ok(metrics.cardZ > metrics.threadZ, `${name}: Living Thread must remain behind cards`);
  assert.ok(metrics.pathMetrics.length >= 3, `${name}: layered connection paths missing`);
  assert.ok(metrics.pathMetrics.every((path) => path.display !== "none"), `${name}: mobile must not hide Living Thread paths`);
  assert.ok(
    metrics.pathMetrics.some((path) => path.width >= 20 && path.height >= 18 && path.d.includes(" C ")),
    `${name}: Connection must span meaningful curved x/y distance`,
  );
}

async function auditDesktopThemeEvidence() {
  const name = "repair-desktop-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  await openBoard(page, name);
  const themes = [
    ["Pearl", "pearl", "pearl"],
    ["Warm Cork", "cork", "warm-cork"],
    ["Letter", "letter", "letter"],
    ["Blossom", "blossom", "blossom"],
    ["Night", "night", "night"],
    ["Mint", "mint", "mint"],
  ];

  for (const [label, id, fileSlug] of themes) {
    await page.getByRole("button", { name: label }).click();
    assert.equal(await page.locator("main[data-source-track='58']").getAttribute("data-theme"), id);
    await page.screenshot({ path: `${screenshotDir}/repair-theme-${fileSlug}-1280x800.png`, fullPage: false });
  }

  await assertNoOverflow(page, name);
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function auditMobileSpatial({ name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  const cards = await openBoard(page, name);
  const board = page.getByTestId("source58-board");
  const inspector = page.locator("aside[aria-label='Selected Moment inspector']");

  await assertNoOverflow(page, `${name}-initial`);
  assert.equal(await board.getAttribute("data-mobile-spatial-board"), "true");
  assert.equal(await inspector.getAttribute("data-mobile-open"), "false", `${name}: initial board should remain unobstructed`);
  const initialMetrics = await spatialMetrics(page);
  assertSpatialIntent(initialMetrics, `${name}-initial`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-initial-spatial.png`, fullPage: false });

  await cards.nth(2).tap();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"), "true", `${name}: touch must retain selected identity`);
  assert.equal(await inspector.getAttribute("data-mobile-open"), "true", `${name}: selected detail sheet must open`);
  await page.getByRole("heading", { name: "Second path" }).waitFor();
  await page.getByText("Canonical child B detail for the mobile foreground inspector").waitFor();
  await page.getByText("WHY NEXT").waitFor();
  await page.getByText("같은 순간에서 다른 길이 열렸다").waitFor();
  const selectedGeometry = await page.evaluate(() => {
    const boardNode = document.querySelector('[data-testid="source58-board"]');
    const inspectorNode = document.querySelector('aside[aria-label="Selected Moment inspector"]');
    const media = inspectorNode?.querySelector("[data-source58-inspector-media]");
    if (!boardNode || !inspectorNode || !media) return null;
    const boardRect = boardNode.getBoundingClientRect();
    const inspectorRect = inspectorNode.getBoundingClientRect();
    return {
      boardTop: boardRect.top,
      boardBottom: boardRect.bottom,
      inspectorTop: inspectorRect.top,
      inspectorBottom: inspectorRect.bottom,
      mediaVisible: media.getBoundingClientRect().height > 40,
      inspectorPosition: getComputedStyle(inspectorNode).position,
    };
  });
  assert.ok(selectedGeometry, `${name}: selected geometry unavailable`);
  assert.equal(selectedGeometry.inspectorPosition, "fixed", `${name}: selected detail must be foreground sheet`);
  assert.equal(selectedGeometry.mediaVisible, true, `${name}: selected media must remain visible`);
  assert.ok(
    selectedGeometry.inspectorTop - selectedGeometry.boardTop >= 90,
    `${name}: spatial board context must remain visible behind/above detail sheet`,
  );
  await assertNoOverflow(page, `${name}-selected`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-selected-inspector.png`, fullPage: false });

  await inspector.getByRole("button", { name: "REPLAY IN CINEMA" }).tap();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("data-cinema-active-id"), "m-child-b", `${name}: Cinema must start on selected Moment`);
  assert.equal(await dialog.locator("[data-cinema-board-context]").count(), 1, `${name}: Cinema board context regressed`);
  await assertNoOverflow(page, `${name}-cinema`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-cinema.png`, fullPage: false });

  await page.getByRole("button", { name: "EXIT TO BOARD" }).tap();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"), "true", `${name}: Cinema exit lost selected Moment`);
  assert.equal(await inspector.getAttribute("data-mobile-open"), "true", `${name}: Cinema exit must restore detail-over-board state`);
  const returnMetrics = await spatialMetrics(page);
  assertSpatialIntent(returnMetrics, `${name}-return`);
  await assertNoOverflow(page, `${name}-return`);
  await page.screenshot({ path: `${screenshotDir}/repair-${name}-cinema-return-spatial.png`, fullPage: false });

  await page.getByRole("button", { name: "Close selected Moment inspector" }).tap();
  assert.equal(await inspector.getAttribute("data-mobile-open"), "false", `${name}: BOARD control must expose the whole spatial canvas`);

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditDesktopThemeEvidence();
  await auditMobileSpatial({ name: "mobile-390x844", width: 390, height: 844 });
  await auditMobileSpatial({ name: "mobile-320x720", width: 320, height: 720 });
  console.log("SOURCE58_MOBILE_SPATIAL_REPAIR_BROWSER_QA=PASS");
  console.log("SOURCE58_MOBILE_SPATIAL_BOARD=GRAPH_NOT_LIST");
  console.log("SOURCE58_SIX_THEME_EVIDENCE=COMPLETE");
} finally {
  await browser.close();
}
