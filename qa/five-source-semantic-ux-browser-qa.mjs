import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SEMANTIC_UX_QA_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.SEMANTIC_UX_SCREENSHOT_DIR ?? "/tmp/five-source-semantic-ux-browser-qa";
const treeId = "five-source-semantic-ux-qa-tree";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: treeId,
  ownerId: "qa-owner-not-authenticated",
  title: "Semantic UX QA Tree",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    sortOrder: 1,
    emotionTags: ["warm"],
  },
  {
    id: "m-child",
    treeId,
    parentId: "m-root",
    connectionReason: "첫 빛이 다음 기억으로 이어졌다",
    title: "Second path",
    memo: "Canonical child Moment",
    sourceType: "video",
    sourceUrl: "https://example.test/second.mp4",
    thumbnail: pixel,
    discoveryDate: "2026-01-02",
    timestamp: "2026-01-02",
    createdAt: "2026-01-02T00:00:00.000Z",
    sortOrder: 2,
    emotionTags: ["soft"],
  },
  {
    id: "m-grandchild",
    treeId,
    parentId: "m-child",
    connectionReason: "두 번째 길에서 다시 이어졌다",
    title: "Long echo",
    memo: "Canonical grandchild Moment",
    sourceType: "song",
    sourceUrl: "https://example.test/song",
    thumbnail: pixel,
    discoveryDate: "2026-01-03",
    timestamp: "2026-01-03",
    createdAt: "2026-01-03T00:00:00.000Z",
    sortOrder: 3,
    emotionTags: ["echo"],
  },
];

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function installFixtures(page) {
  await page.route(`**/api/trees/${treeId}/memories*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) });
  });
  await page.route(`**/api/trees/${treeId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
  });
}

function captureErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function waitForSource(page, source) {
  await page.locator(`[data-mvp-source="${source}"]`).first().waitFor({ state: "visible" });
}

async function assertMoment(page, expected, label) {
  const url = new URL(page.url());
  assert.equal(url.searchParams.get("moment"), expected, `${label}: Moment continuity mismatch`);
  assert.match(url.pathname, new RegExp(`^/trees/${treeId}(?:/|$)`), `${label}: Tree continuity mismatch`);
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  assert.ok(metrics.body <= metrics.width, `${label}: body horizontal overflow ${metrics.body} > ${metrics.width}`);
  assert.ok(metrics.root <= metrics.width, `${label}: root horizontal overflow ${metrics.root} > ${metrics.width}`);
}

async function assertWithinViewport(locator, page, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label}: expected visible bounding box`);
  const width = await page.evaluate(() => window.innerWidth);
  assert.ok(box.x >= -1, `${label}: escapes left viewport (${box.x})`);
  assert.ok(box.x + box.width <= width + 1, `${label}: escapes right viewport (${box.x + box.width} > ${width})`);
}

async function assertSemanticNav(page, label) {
  const nav = page.getByRole("navigation", { name: "보기 전환" });
  const primary = nav.locator('[data-view-tier="primary"]');
  assert.deepEqual(await primary.allTextContents(), ["기억", "보드", "관계", "탐색"], `${label}: primary IA drift`);
  assert.equal(await nav.locator('[data-view-tier="return"]').allTextContents().then((items) => items.join("")), "포털", `${label}: Portal return tier missing`);
  assert.equal(await nav.getByRole("link", { name: "앨범", exact: true }).count(), 0, `${label}: Album leaked into primary nav`);
  assert.equal(await nav.getByRole("link", { name: "그래프", exact: true }).count(), 0, `${label}: Graph leaked into primary nav`);
  assert.equal(await nav.getByRole("link", { name: "리플레이", exact: true }).count(), 0, `${label}: Replay leaked into primary nav`);
  const more = page.locator('details[data-view-tier="secondary"] > summary');
  await more.click();
  const group = page.getByRole("group", { name: "보조 보기" });
  await group.waitFor({ state: "visible" });
  assert.ok(await group.getByRole("link", { name: "한눈에", exact: true }).count(), `${label}: Overview secondary link missing`);
  assert.ok(await group.getByRole("link", { name: "타임라인", exact: true }).count(), `${label}: Timeline secondary link missing`);
  assert.ok(await group.getByRole("link", { name: "공개 스토리", exact: true }).count(), `${label}: Story secondary link missing`);
  await assertWithinViewport(group, page, `${label}-secondary-menu`);
  await more.click();
}

async function desktopJourney() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = captureErrors(page);
  await installFixtures(page);

  const response = await page.goto(`${baseUrl}/trees/${treeId}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), "desktop: Tree route must return 2xx");
  await waitForSource(page, "57");
  await assertSemanticNav(page, "desktop");
  await assertNoOverflow(page, "desktop-tree");
  await page.screenshot({ path: `${screenshotDir}/desktop-1280-tree-primary-nav.png`, fullPage: false });

  await page.getByRole("button", { name: "First light 상세 보기" }).click();
  const dialog = page.getByRole("dialog", { name: "First light" });
  await dialog.waitFor({ state: "visible" });
  assert.equal(await dialog.getAttribute("aria-modal"), "true", "desktop: canonical modal lost aria-modal");
  const modalActions = dialog.getByRole("navigation", { name: "이 Moment를 다른 방식으로 보기" });
  for (const [name, path] of [
    ["보드에서 보기", "/board"],
    ["왜 이어졌는지 보기", "/relationships"],
    ["기억 세계에서 탐색", "/explore"],
  ]) {
    const link = modalActions.getByRole("link", { name, exact: true });
    const href = await link.getAttribute("href");
    assert.ok(href?.includes(`/trees/${treeId}${path}?moment=m-root`), `desktop: ${name} lost Tree/Moment context`);
  }
  await page.screenshot({ path: `${screenshotDir}/desktop-1280-source57-modal-ctas.png`, fullPage: false });

  await modalActions.getByRole("link", { name: "보드에서 보기", exact: true }).click();
  await waitForSource(page, "58");
  await assertMoment(page, "m-root", "desktop-board-root");
  const boardActions = page.getByRole("complementary", { name: "현재 Moment로 다른 보기 열기" });
  await boardActions.waitFor({ state: "visible" });
  await page.screenshot({ path: `${screenshotDir}/desktop-1280-source58-context-actions.png`, fullPage: false });

  await page.getByRole("button", { name: "Second path 선택" }).click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-child");
  await assertMoment(page, "m-child", "desktop-board-child");

  await boardActions.getByRole("link", { name: "관계 보기", exact: true }).click();
  await waitForSource(page, "56");
  await assertMoment(page, "m-child", "desktop-relationships-child");
  await page.getByRole("button", { name: "Long echo 선택" }).click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-grandchild");
  await assertMoment(page, "m-grandchild", "desktop-relationships-grandchild");
  const relationshipActions = page.getByRole("complementary", { name: "현재 Moment로 다른 보기 열기" });
  await page.screenshot({ path: `${screenshotDir}/desktop-1280-source56-context-actions.png`, fullPage: false });

  await relationshipActions.getByRole("link", { name: "공간에서 탐색", exact: true }).click();
  await waitForSource(page, "60");
  await assertMoment(page, "m-grandchild", "desktop-explore-grandchild");
  assert.ok(await page.locator("canvas").count(), "desktop: Source60 canvas missing");
  await page.screenshot({ path: `${screenshotDir}/desktop-1280-source60-context-actions.png`, fullPage: false });

  // View changes push; in-view Moment selections replace. Two Backs must therefore
  // return Explore -> Relationships(final selected Moment) -> Board(final selected Moment)
  // without an intermediate Board m-root entry.
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "56");
  await assertMoment(page, "m-grandchild", "desktop-back-relationships");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "58");
  await assertMoment(page, "m-child", "desktop-back-board");

  for (const legacy of ["album", "graph", "replay"]) {
    const legacyResponse = await page.goto(`${baseUrl}/trees/${treeId}/${legacy}`, { waitUntil: "domcontentloaded" });
    assert.ok(legacyResponse?.ok(), `desktop: legacy compatibility route /${legacy} must stay addressable`);
  }

  assert.deepEqual(errors.consoleErrors, [], `desktop console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `desktop page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

async function mobileAudit({ name, width, height, reducedMotion = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = captureErrors(page);
  await installFixtures(page);

  const response = await page.goto(`${baseUrl}/trees/${treeId}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: Tree route must return 2xx`);
  await waitForSource(page, "57");
  await assertSemanticNav(page, name);
  await assertNoOverflow(page, `${name}-tree`);
  await page.screenshot({ path: `${screenshotDir}/${name}-primary-nav.png`, fullPage: false });

  await page.getByRole("navigation", { name: "보기 전환" }).getByRole("link", { name: "보드", exact: true }).click();
  await waitForSource(page, "58");
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-root");
  const actions = page.getByRole("complementary", { name: "현재 Moment로 다른 보기 열기" });
  await actions.waitFor({ state: "visible" });
  await assertWithinViewport(actions, page, `${name}-context-actions`);
  await assertNoOverflow(page, `${name}-board`);
  await page.screenshot({ path: `${screenshotDir}/${name}-context-actions.png`, fullPage: false });

  assert.deepEqual(errors.consoleErrors, [], `${name} console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name} page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await desktopJourney();
  await mobileAudit({ name: "phone-390x844", width: 390, height: 844 });
  await mobileAudit({ name: "narrow-320x720-reduced", width: 320, height: 720, reducedMotion: true });
  console.log("FIVE_SOURCE_SEMANTIC_UX_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
