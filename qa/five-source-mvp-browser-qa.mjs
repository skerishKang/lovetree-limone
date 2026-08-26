import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.FIVE_SOURCE_MVP_QA_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.FIVE_SOURCE_MVP_SCREENSHOT_DIR ?? "/tmp/five-source-mvp-browser-qa";
const treeId = "five-source-mvp-qa-tree";
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: treeId,
  ownerId: "qa-owner-not-authenticated",
  title: "Five Source Canonical QA Tree",
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
  {
    id: "m-branch",
    treeId,
    parentId: "m-root",
    connectionReason: "같은 뿌리에서 다른 기억이 열렸다",
    title: "Branch memory",
    memo: "Canonical branch Moment",
    sourceType: "book",
    sourceUrl: "https://example.test/book",
    thumbnail: pixel,
    discoveryDate: "2026-01-04",
    timestamp: "2026-01-04",
    createdAt: "2026-01-04T00:00:00.000Z",
    sortOrder: 4,
    emotionTags: ["branch"],
  },
];

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

function captureErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function installCanonicalFixtures(page) {
  await page.route(`**/api/trees/${treeId}/memories*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) });
  });
  await page.route(`**/api/trees/${treeId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
  });
}

async function assertNoDocumentOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    navClient: document.querySelector('nav[aria-label="보기 전환"]')?.clientWidth ?? 0,
    navScroll: document.querySelector('nav[aria-label="보기 전환"]')?.scrollWidth ?? 0,
  }));
  assert.ok(result.body <= result.viewport, `${label}: body overflow ${result.body} > ${result.viewport}`);
  assert.ok(result.root <= result.viewport, `${label}: root overflow ${result.root} > ${result.viewport}`);
  assert.ok(result.navClient <= result.viewport, `${label}: ViewSwitcher client width escapes viewport`);
  assert.ok(result.navScroll >= result.navClient, `${label}: ViewSwitcher scroll metrics invalid`);
}

async function waitForSource(page, source) {
  await page.locator(`[data-mvp-source="${source}"]`).first().waitFor({ state: "visible" });
}

async function assertMomentQuery(page, momentId, label) {
  const current = new URL(page.url());
  assert.equal(current.searchParams.get("moment"), momentId, `${label}: selected Moment query changed`);
  assert.match(current.pathname, new RegExp(`^/trees/${treeId}(?:/|$)`), `${label}: Tree identity changed`);
}

async function clickView(page, name, source, momentId, screenshotPrefix) {
  const switcher = page.getByRole("navigation", { name: "보기 전환" });
  const link = switcher.getByRole("link", { name, exact: true });
  const href = await link.getAttribute("href");
  assert.ok(href?.includes(`/trees/${treeId}`), `${screenshotPrefix}: view link lost Tree identity`);
  if (momentId) {
    assert.ok(href?.includes(`moment=${encodeURIComponent(momentId)}`), `${screenshotPrefix}: view link lost Moment identity`);
  } else {
    assert.ok(!href?.includes("moment="), `${screenshotPrefix}: view link invented Moment identity`);
  }
  await link.click();
  await waitForSource(page, source);
  await assertMomentQuery(page, momentId, screenshotPrefix);
  await assertNoDocumentOverflow(page, screenshotPrefix);
  await page.screenshot({ path: `${screenshotDir}/${screenshotPrefix}.png`, fullPage: false });
}

async function auditViewport({ name, width, height, reducedMotion = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 390, isMobile: width <= 390 });
  const page = await context.newPage();
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = captureErrors(page);
  await installCanonicalFixtures(page);

  // Source57 uses a real aria-modal Moment inspector when ?moment= is present.
  // Validate the shared presentation language before selection, then enter Board
  // through an actual user-clickable ViewSwitcher path. Moment continuity begins
  // after the Board selection writes canonical presentation state to the URL.
  const initial = `${baseUrl}/trees/${treeId}`;
  const response = await page.goto(initial, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: canonical Tree route must return 2xx`);
  await waitForSource(page, "57");
  await page.getByText("Five Source Canonical QA Tree").first().waitFor();
  await assertMomentQuery(page, null, `${name}-source57`);
  await assertNoDocumentOverflow(page, `${name}-source57`);
  await page.screenshot({ path: `${screenshotDir}/${name}-57.png`, fullPage: false });

  await clickView(page, "보드", "58", null, `${name}-58`);

  // Source58 selection is presentation state written back with router.replace.
  const rootCard = page.getByRole("button", { name: "First light 선택" });
  await rootCard.waitFor();
  await rootCard.click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-root");
  await assertMomentQuery(page, "m-root", `${name}-58-replaced`);

  // Because board selection uses replace, Back returns to the invoking canonical
  // Tree detail without manufacturing a hidden selection-history entry.
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "57");
  await assertMomentQuery(page, null, `${name}-57-back-from-board`);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "58");
  await assertMomentQuery(page, "m-root", `${name}-58-forward`);

  await clickView(page, "관계", "56", "m-root", `${name}-56`);
  assert.ok(await page.getByText(/WHY NEXT ·/).count(), `${name}: Source56 relationship semantics missing`);

  await clickView(page, "탐색", "60", "m-root", `${name}-60`);
  assert.ok(await page.locator("canvas").count(), `${name}: Source60 3D projection canvas missing`);

  await clickView(page, "포털", "64", "m-root", `${name}-64`);
  assert.ok(await page.getByText("Tree already resolved", { exact: true }).count(), `${name}: Source64 post-resolution boundary missing`);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "60");
  await assertMomentQuery(page, "m-root", `${name}-60-back-from-portal`);
  await assertNoDocumentOverflow(page, `${name}-60-back-from-portal`);

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditViewport({ name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport({ name: "phone-390x844", width: 390, height: 844 });
  await auditViewport({ name: "narrow-320x720-reduced", width: 320, height: 720, reducedMotion: true });
  console.log("FIVE_SOURCE_MVP_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
