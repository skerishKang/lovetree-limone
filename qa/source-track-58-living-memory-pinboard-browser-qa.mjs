import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.SOURCE58_SCREENSHOT_DIR ?? "/tmp/source58-living-memory-pinboard-browser-qa";
const route = "/design-lab/source-tracks/58/v1-2-native";
const treeId = "source58-qa-tree";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: treeId,
  ownerId: "qa-owner-not-authenticated",
  title: "Canonical QA Tree",
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
    memo: "Canonical child B",
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

const qaLargeMoments = [...qaMoments];
for (let index = 5; index < 14; index += 1) {
  const previousId = index === 5 ? "m-last" : `m-large-${index - 1}`;
  qaLargeMoments.push({
    id: `m-large-${index}`,
    treeId,
    parentId: previousId,
    connectionReason: `Large-tree canonical connection ${index}`,
    title: `Large Moment ${index}`,
    memo: `Canonical large-tree Moment ${index}`,
    sourceType: index % 2 === 0 ? "video" : "other",
    sourceUrl: `https://example.test/large-${index}`,
    thumbnail: pixel,
    discoveryDate: `2026-02-${String(index + 1).padStart(2, "0")}`,
    timestamp: `2026-02-${String(index + 1).padStart(2, "0")}`,
    sortOrder: index + 1,
    emotionTags: [],
  });
}

await mkdir(screenshotDir, { recursive: true });
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

async function installCanonicalFixtures(page, moments = qaMoments) {
  await page.route(`**/api/trees/${treeId}/memories`, async (requestRoute) => {
    await requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) });
  });
  await page.route(`**/api/trees/${treeId}`, async (requestRoute) => {
    await requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
  });
  await page.route("https://www.youtube-nocookie.com/embed/**", async (requestRoute) => {
    await requestRoute.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>QA iframe wiring stub</title><body>Playback intentionally not verified</body>",
    });
  });
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

async function openCanonicalBoard(page, name, moments = qaMoments) {
  await installCanonicalFixtures(page, moments);
  const response = await page.goto(`${baseUrl}${route}?treeId=${treeId}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: native staging route must return 2xx`);
  await page.getByRole("heading", { name: "Living Memory Pinboard" }).waitFor();
  await page.getByText("Canonical QA Tree").waitFor();
  const cards = page.locator('button[aria-label$="선택"]');
  await cards.nth(moments.length - 1).waitFor();
  assert.equal(await cards.count(), moments.length, `${name}: all canonical QA Moments must be pinned`);
  const connectionCount = moments.filter((moment) => moment.parentId).length;
  assert.equal(
    await page.locator("svg[aria-label='Canonical Connection living thread'] path").count(),
    connectionCount * 3,
    `${name}: each canonical connection requires glow + color + core paths`,
  );
  return cards;
}

async function auditGate() {
  const name = "source-gate-no-tree-id";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: gate route must return 2xx`);
  await page.getByRole("heading", { name: "Living Memory Pinboard" }).waitFor();
  assert.match(await page.getByText(/실제 Tree의 canonical Moment/).innerText(), /canonical Moment/);
  assert.equal(await page.locator('button[aria-label$="선택"]').count(), 0, `${name}: no runtime demo Moments allowed`);
  await assertNoOverflow(page, name);
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: false });
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function auditDesktop() {
  const name = "desktop-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  const cards = await openCanonicalBoard(page, name);
  await assertNoOverflow(page, name);
  await page.screenshot({ path: `${screenshotDir}/${name}-initial.png`, fullPage: false });

  await cards.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(30);
  assert.equal(
    await cards.nth(1).getAttribute("aria-pressed"),
    "true",
    `${name}: ArrowRight must select next canonical Moment`,
  );
  assert.equal(
    await cards.nth(1).evaluate((node) => node === document.activeElement),
    true,
    `${name}: keyboard selection must move visible focus`,
  );

  await cards.nth(0).click();
  await page.getByText("NEXT MOMENT · 2 CHOICES").waitFor();
  assert.equal(
    await page.locator("aside[aria-label='Selected Moment inspector'] button").filter({ hasText: "Window song" }).count(),
    1,
    `${name}: first Connection choice missing`,
  );
  assert.equal(
    await page.locator("aside[aria-label='Selected Moment inspector'] button").filter({ hasText: "Second path" }).count(),
    1,
    `${name}: second Connection choice missing`,
  );
  assert.equal(
    await page.locator("svg[aria-label='Canonical Connection living thread'] g[data-active='true']").count(),
    2,
    `${name}: root selection must visually emphasize both canonical child paths`,
  );
  await page.screenshot({ path: `${screenshotDir}/${name}-selected.png`, fullPage: false });

  const ownerEdit = page.getByRole("button", { name: "READ ONLY · OWNER EDIT" });
  assert.equal(await ownerEdit.isDisabled(), true, `${name}: unauthenticated QA must not mutate canonical Moment`);

  await page.getByRole("button", { name: "Warm Cork" }).click();
  assert.equal(
    await page.locator("main[data-source-track='58']").getAttribute("data-theme"),
    "cork",
    `${name}: board theme must stay local presentation state`,
  );
  await page.screenshot({ path: `${screenshotDir}/${name}-warm-cork.png`, fullPage: false });

  await page.getByRole("button", { name: "CINEMA REPLAY" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.getByRole("heading", { name: "Cinema Replay — Moments" }).waitFor();
  await page.getByRole("link", { name: "YouTube에서 재생 ↗" }).waitFor();
  assert.equal(await dialog.locator("[data-cinema-board-context]").count(), 1, `${name}: Cinema keeps board context`);
  assert.equal(await dialog.locator("[data-cinema-memory][data-active='true']").count(), 1, `${name}: Cinema has one active Moment spotlight`);
  await page.screenshot({ path: `${screenshotDir}/${name}-cinema.png`, fullPage: false });

  const pause = page.getByRole("button", { name: "PAUSE" });
  await pause.click();
  const resume = page.getByRole("button", { name: "RESUME" });
  await resume.waitFor();
  await resume.click();
  await page.getByRole("button", { name: "PAUSE" }).waitFor();

  await page.getByRole("button", { name: "PLAY CANONICAL YOUTUBE" }).click();
  const iframe = page.locator("iframe");
  await iframe.waitFor();
  assert.match(await iframe.getAttribute("src"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  await page.getByText(/Embed playback은 실행 환경 정책에 따라 차단될 수 있습니다/).waitFor();
  await page.getByRole("button", { name: "RESUME" }).waitFor();

  const scrubber = page.getByLabel("Cinema Moment scrubber");
  await scrubber.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.getByRole("heading", { name: "Second path" }).waitFor();

  await page.getByRole("button", { name: "EXIT TO BOARD" }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(
    await cards.nth(2).getAttribute("aria-pressed"),
    "true",
    `${name}: Cinema exit must re-enter board on active Moment`,
  );
  await page.screenshot({ path: `${screenshotDir}/${name}-return.png`, fullPage: false });

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function auditLargeTree() {
  const name = "large-tree-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  const cards = await openCanonicalBoard(page, name, qaLargeMoments);
  await assertNoOverflow(page, name);
  const boardHeight = await page.getByTestId("source58-board").evaluate((node) => node.getBoundingClientRect().height);
  assert.ok(boardHeight >= 900, `${name}: >9 Moment field must expand, height=${boardHeight}`);
  const centers = await cards.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }));
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = i + 1; j < centers.length; j += 1) {
      minimumDistance = Math.min(minimumDistance, Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y));
    }
  }
  assert.ok(minimumDistance >= 55, `${name}: deterministic card centers collapse at ${minimumDistance.toFixed(1)}px`);
  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: false });
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function auditMobile({ name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  const cards = await openCanonicalBoard(page, name);
  await assertNoOverflow(page, name);
  await page.screenshot({ path: `${screenshotDir}/${name}-initial.png`, fullPage: false });

  await cards.nth(2).tap();
  assert.equal(await cards.nth(2).getAttribute("aria-pressed"), "true", `${name}: touch must select canonical Moment`);
  await page.screenshot({ path: `${screenshotDir}/${name}-selected.png`, fullPage: false });
  await page.getByRole("button", { name: "Mint" }).tap();
  assert.equal(
    await page.locator("main[data-source-track='58']").getAttribute("data-theme"),
    "mint",
    `${name}: touch theme parity failed`,
  );
  await page.getByRole("button", { name: "CINEMA REPLAY" }).tap();
  await page.getByRole("dialog").waitFor();
  assert.equal(await page.locator("[data-cinema-board-context]").count(), 1, `${name}: mobile Cinema keeps spatial board context`);
  await assertNoOverflow(page, `${name}-cinema`);
  await page.screenshot({ path: `${screenshotDir}/${name}-cinema.png`, fullPage: false });
  await page.getByRole("button", { name: "EXIT TO BOARD" }).tap();
  await page.screenshot({ path: `${screenshotDir}/${name}-return.png`, fullPage: false });

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function auditReducedMotion() {
  const name = "reduced-motion-390x844";
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = captureBrowserErrors(page);
  await openCanonicalBoard(page, name);
  const root = page.locator("main[data-source-track='58']");
  await root.waitFor();
  assert.equal(await root.getAttribute("data-reduced-motion"), "true", `${name}: JS reduced-motion state missing`);
  await page.waitForTimeout(50);
  const running = await page.evaluate(
    () => document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
  assert.equal(running, 0, `${name}: reduced-motion must leave no running ambient animations`);
  await page.screenshot({ path: `${screenshotDir}/${name}-initial.png`, fullPage: false });
  await page.getByRole("button", { name: "CINEMA REPLAY" }).tap();
  const reducedButton = page.getByRole("button", { name: "REDUCED MOTION" });
  await reducedButton.waitFor();
  assert.equal(await reducedButton.isDisabled(), true, `${name}: Cinema autoplay must stay disabled under reduced motion`);
  await assertNoOverflow(page, name);
  await page.screenshot({ path: `${screenshotDir}/${name}-cinema.png`, fullPage: false });
  await page.getByRole("button", { name: "NEXT" }).tap();
  await page.screenshot({ path: `${screenshotDir}/${name}-manual.png`, fullPage: false });
  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditGate();
  await auditDesktop();
  await auditLargeTree();
  await auditMobile({ name: "mobile-390x844", width: 390, height: 844 });
  await auditMobile({ name: "mobile-320x720", width: 320, height: 720 });
  await auditReducedMotion();
  console.log("SOURCE58_LIVING_MEMORY_PINBOARD_BROWSER_QA=PASS");
  console.log("SOURCE58_YOUTUBE_LIVE_PLAYBACK=NOT_CLAIMED");
  console.log("SOURCE58_YOUTUBE_EMBED_WIRING=STUB_VERIFIED_WITH_FALLBACK");
  console.log("SOURCE58_VISUAL_REPAIR_VIEWPORT_EVIDENCE=TRUE");
} finally {
  await browser.close();
}
