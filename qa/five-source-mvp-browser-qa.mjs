import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
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
  {
    id: "m-no-media",
    treeId,
    parentId: "m-root",
    connectionReason: "첫 빛이 다음 기억으로 이어졌다",
    title: "No media moment",
    memo: "Canonical selected Moment with no thumbnail or media placeholder.",
    sourceType: "other",
    sourceUrl: "",
    thumbnail: null,
    discoveryDate: "2026-01-05",
    timestamp: "2026-01-05",
    createdAt: "2026-01-05T00:00:00.000Z",
    sortOrder: 5,
    emotionTags: [],
  },
];

await mkdir(screenshotDir, { recursive: true });
const canonicalCaptureManifest = [];
const browser = await chromium.launch({ headless: true });

async function captureCanonicalSource58(page, name, state, selectedId) {
  const viewport = page.viewportSize();
  const url = new URL(page.url());
  assert.equal(url.pathname, `/trees/${treeId}/board`, `${name}-${state}: canonical Source58 pathname drifted`);
  assert.equal(url.searchParams.get("moment"), selectedId, `${name}-${state}: canonical selected Moment drifted`);
  canonicalCaptureManifest.push({
    file: `${name}-58-${state}.png`,
    url: page.url(),
    pathname: url.pathname,
    treeId,
    moment: url.searchParams.get("moment"),
    viewport,
    selectedId,
  });
  await page.screenshot({ path: `${screenshotDir}/${name}-58-${state}.png`, fullPage: false });
}

async function assertCanonicalNoMediaGeometry(page, name) {
  const viewport = page.viewportSize();
  await page.waitForTimeout(420);
  const metrics = await page.locator("aside[aria-label='선택한 Moment 상세']").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      mediaCount: node.querySelectorAll("[data-source58-inspector-media]").length,
      bodyWidth: document.body.scrollWidth,
      rootWidth: document.documentElement.scrollWidth,
    };
  });
  assert.equal(metrics.mediaCount, 0, `${name}-58-no-media: canonical inspector invented media`);
  if (viewport.width <= 760) {
    const expectedHeight = viewport.height * 0.62;
    const expectedTop = viewport.height - 64 - expectedHeight;
    assert.ok(Math.abs(metrics.left - 8) <= 4, `${name}-58-no-media: inspector left ${metrics.left} != 8`);
    assert.ok(Math.abs(metrics.width - (viewport.width - 16)) <= 6, `${name}-58-no-media: inspector width ${metrics.width} != ${viewport.width - 16}`);
    assert.ok(Math.abs(metrics.height - expectedHeight) <= 18, `${name}-58-no-media: inspector height ${metrics.height} != ${expectedHeight}`);
    assert.ok(Math.abs(metrics.top - expectedTop) <= 12, `${name}-58-no-media: inspector top ${metrics.top} != ${expectedTop}`);
    assert.ok(Math.abs(metrics.bottom - (viewport.height - 64)) <= 12, `${name}-58-no-media: inspector bottom ${metrics.bottom} != ${viewport.height - 64}`);
  }
  assert.ok(metrics.bodyWidth <= viewport.width, `${name}-58-no-media: body overflow ${metrics.bodyWidth} > ${viewport.width}`);
  assert.ok(metrics.rootWidth <= viewport.width, `${name}-58-no-media: root overflow ${metrics.rootWidth} > ${viewport.width}`);
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
  assert.ok(href?.includes(`moment=${encodeURIComponent(momentId)}`), `${screenshotPrefix}: view link lost Moment identity`);
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
  // Validate the shared presentation language before selection so the background
  // ViewSwitcher remains legitimately user-interactable.
  const initial = `${baseUrl}/trees/${treeId}`;
  const response = await page.goto(initial, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: canonical Tree route must return 2xx`);
  await waitForSource(page, "57");
  await page.getByText("Five Source Canonical QA Tree").first().waitFor();
  await assertMomentQuery(page, null, `${name}-source57`);
  await assertNoDocumentOverflow(page, `${name}-source57`);
  await page.screenshot({ path: `${screenshotDir}/${name}-57.png`, fullPage: false });

  // Board is entered without an invented Moment. Source58 keeps the inspector
  // hidden until the user explicitly selects a canonical Moment.
  const boardSwitcher = page.getByRole("navigation", { name: "보기 전환" });
  const boardLink = boardSwitcher.getByRole("link", { name: "보드", exact: true });
  const boardHref = await boardLink.getAttribute("href");
  assert.ok(boardHref?.includes(`/trees/${treeId}/board`), `${name}-58: board link lost Tree identity`);
  assert.ok(!boardHref?.includes("moment="), `${name}-58: board link invented Moment identity`);
  await boardLink.click();
  await waitForSource(page, "58");
  await page.locator('main[data-source-track="58"]').waitFor({ state: "visible" });
  await page.locator("aside[aria-label='Selected Moment inspector'], aside[aria-label='선택한 Moment 상세']").waitFor({ state: "attached" });
  await page.waitForURL((url) => url.searchParams.get("moment") === null);
  await assertMomentQuery(page, null, `${name}-58-initial`);
  const initialInspector = page.locator("aside[aria-label='Selected Moment inspector'], aside[aria-label='선택한 Moment 상세']");
  assert.equal(await initialInspector.count(), 1, `${name}-58-initial: inspector surface must remain mounted for accessibility`);
  assert.equal(
    await initialInspector.getAttribute("data-has-selection"),
    "false",
    `${name}-58-initial: inspector must remain hidden before explicit selection`,
  );
  await assertNoDocumentOverflow(page, `${name}-58-initial`);
  await captureCanonicalSource58(page, name, "initial", null);

  // True canonical no-media evidence must come from /trees/:id/board.
  const noMediaCard = page.getByRole("button", { name: "No media moment 선택" });
  await noMediaCard.click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-no-media");
  const productInspector = page.locator("aside[aria-label='선택한 Moment 상세']");
  await productInspector.waitFor();
  await assertCanonicalNoMediaGeometry(page, name);
  await captureCanonicalSource58(page, name, "no-media-selected", "m-no-media");

  // Explicit user selection establishes the canonical Moment identity and uses
  // router.replace so the invoking Tree detail remains the Back destination.
  const rootCard = page.getByRole("button", { name: "First light 선택" });
  await rootCard.click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-root");
  await assertMomentQuery(page, "m-root", `${name}-58-explicit-root`);
  await captureCanonicalSource58(page, name, "selected", "m-root");

  const childCard = page.getByRole("button", { name: "Second path 선택" });
  await childCard.waitFor();
  await childCard.click();
  await page.waitForURL((url) => url.searchParams.get("moment") === "m-child");
  await assertMomentQuery(page, "m-child", `${name}-58-explicit-child`);

  // Back returns to the invoking canonical Tree detail. Forward restores the board
  // with the final selected Moment because Source58 selection used router.replace.
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "57");
  await assertMomentQuery(page, null, `${name}-57-back-from-board`);
  await page.goForward({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "58");
  await assertMomentQuery(page, "m-child", `${name}-58-forward`);

  await clickView(page, "관계", "56", "m-child", `${name}-56`);
  assert.equal(
    await page.locator('[data-network-moment-id="m-child"]').getAttribute("aria-pressed"),
    "true",
    `${name}: Source56 selected-Moment relationship continuity missing`,
  );

  await clickView(page, "탐색", "60", "m-child", `${name}-60`);
  assert.ok(await page.locator("canvas").count(), `${name}: Source60 3D projection canvas missing`);

  await clickView(page, "포털", "64", "m-child", `${name}-64`);
  assert.ok(await page.locator('[data-rendering="css3d-dom"]').count(), `${name}: Source64 CSS3D portal rendering missing`);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForSource(page, "60");
  await assertMomentQuery(page, "m-child", `${name}-60-back-from-portal`);
  await assertNoDocumentOverflow(page, `${name}-60-back-from-portal`);

  assert.deepEqual(errors.consoleErrors, [], `${name}: console errors: ${errors.consoleErrors.join(" | ")}`);
  assert.deepEqual(errors.pageErrors, [], `${name}: page errors: ${errors.pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditViewport({ name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport({ name: "phone-390x844", width: 390, height: 844 });
  await auditViewport({ name: "narrow-320x720", width: 320, height: 720 });
  await auditViewport({ name: "narrow-320x720-reduced", width: 320, height: 720, reducedMotion: true });
  await writeFile(`${screenshotDir}/CANONICAL_SOURCE58_CAPTURE_MANIFEST.json`, JSON.stringify({
    route: `/trees/${treeId}/board`,
    treeId,
    captures: canonicalCaptureManifest,
  }, null, 2));
  console.log("FIVE_SOURCE_MVP_BROWSER_QA_PASS");
} finally {
  await browser.close();
}
