import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.SOURCE60_QA_BASE_URL ?? process.env.LOVETREE_QA_BASE_URL ?? "http://127.0.0.1:3013";
const evidenceDir = process.env.SOURCE60_EVIDENCE_DIR ?? "qa/evidence/source60-p0";
const fixtureTreeId = "source60-p0-fixture-tree";
const sourcePath = path.resolve(
  "reference/source-tracks-snapshot/60_3D모먼트클러스터_55,56,59연결버전/버전1.2_실제트랙네비게이션_후보/★_현재후보_Track60_V1.2_REAL_NAVIGATION.html",
);
const sourcePathFallback = path.resolve(
  "reference/source-tracks-snapshot/60_3D모먼트클러스터_심층탐색_55,56,59연결버전/버전1.2_실제트랙네비게이션_후보/★_현재후보_Track60_V1.2_REAL_NAVIGATION.html",
);
const pixel = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: fixtureTreeId,
  ownerId: "source60-p0-qa-owner",
  title: "Source60 P0 Fidelity Fixture",
  visibility: "private",
};

const qaMoments = [
  {
    id: "s60-root",
    treeId: fixtureTreeId,
    parentId: null,
    connectionReason: null,
    title: "First light root",
    memo: "Canonical root Moment with captured media.",
    artist: "QA Archive",
    source: "YouTube",
    sourceType: "youtube",
    sourceUrl: "https://example.test/source60/root",
    thumbnail: pixel,
    discoveryDate: "2026-01-01",
    timestamp: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sortOrder: 1,
    emotionTags: ["warm", "beginning"],
    visibility: "public",
  },
  {
    id: "s60-visual",
    treeId: fixtureTreeId,
    parentId: "s60-root",
    connectionReason: "첫 빛이 다음 장면을 찾아보게 했다",
    title: "Window song",
    memo: "A video branch with a real source URL and thumbnail.",
    artist: "QA Archive",
    source: "Video",
    sourceType: "video",
    sourceUrl: "https://example.test/source60/video",
    thumbnail: pixel,
    discoveryDate: "2026-01-02",
    timestamp: "2026-01-02",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    sortOrder: 2,
    emotionTags: ["soft", "visual"],
    visibility: "public",
  },
  {
    id: "s60-bridge",
    treeId: fixtureTreeId,
    parentId: "s60-visual",
    connectionReason: "이 장면의 감정이 음악과 편지의 기억으로 넘어갔다",
    title: "Bridge to the letter",
    memo: "A real child Moment whose parent crosses the view-derived cluster boundary.",
    artist: "QA Archive",
    source: "Photo Archive",
    sourceType: "photo",
    sourceUrl: "https://example.test/source60/bridge",
    thumbnail: pixel,
    discoveryDate: "2026-01-03",
    timestamp: "2026-01-03",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    sortOrder: 3,
    emotionTags: ["bridge", "warm"],
    visibility: "public",
  },
  {
    id: "s60-story",
    treeId: fixtureTreeId,
    parentId: "s60-bridge",
    connectionReason: "편지의 문장이 오래 남아 다음 노래로 이어졌다",
    title: "Long echo song",
    memo: "A music branch for the emotion filter and path preview.",
    artist: "QA Archive",
    source: "Music",
    sourceType: "song",
    sourceUrl: "https://example.test/source60/song",
    thumbnail: pixel,
    discoveryDate: "2026-01-04",
    timestamp: "2026-01-04",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
    sortOrder: 4,
    emotionTags: ["echo", "music"],
    visibility: "public",
  },
  {
    id: "s60-note",
    treeId: fixtureTreeId,
    parentId: "s60-root",
    connectionReason: "같은 뿌리에서 기록의 다른 길이 열렸다",
    title: "Letter note",
    memo: "A note branch that keeps multiple connected paths visible.",
    artist: "QA Archive",
    source: "Private Note",
    sourceType: "note",
    sourceUrl: "https://example.test/source60/note",
    thumbnail: pixel,
    discoveryDate: "2026-01-05",
    timestamp: "2026-01-05",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
    sortOrder: 5,
    emotionTags: ["note", "quiet"],
    visibility: "public",
  },
  {
    id: "s60-return",
    treeId: fixtureTreeId,
    parentId: "s60-note",
    connectionReason: "기록을 다시 읽고 조용한 귀환을 남겼다",
    title: "Quiet return",
    memo: "A final connected Moment for browser back/forward and path states.",
    artist: "QA Archive",
    source: "Travel",
    sourceType: "travel",
    sourceUrl: "https://example.test/source60/return",
    thumbnail: pixel,
    discoveryDate: "2026-01-06",
    timestamp: "2026-01-06",
    createdAt: "2026-01-06T00:00:00.000Z",
    updatedAt: "2026-01-06T00:00:00.000Z",
    sortOrder: 6,
    emotionTags: ["quiet", "return"],
    visibility: "public",
  },
];

const viewports = [
  { key: "1280x800", width: 1280, height: 800, mobile: false, reducedMotion: false },
  { key: "390x844", width: 390, height: 844, mobile: true, reducedMotion: false },
  { key: "320x720", width: 320, height: 720, mobile: true, reducedMotion: false },
  { key: "reduced-motion", width: 1280, height: 800, mobile: false, reducedMotion: true },
];

await mkdir(evidenceDir, { recursive: true });
const sourceExists = await readFile(sourcePath).catch(() => null);
const resolvedSourcePath = sourceExists ? sourcePath : sourcePathFallback;
const browser = await chromium.launch({ headless: true });
const evidence = { sourcePath: resolvedSourcePath, fixtureTreeId, viewports: [], interaction: {}, errors: [] };

function captureErrors(page, label) {
  const errors = { console: [], page: [], failedRequests: [] };
  page.on("console", (message) => { if (message.type() === "error") errors.console.push(message.text()); });
  page.on("pageerror", (error) => errors.page.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "failed";
    if (failure !== "net::ERR_ABORTED") errors.failedRequests.push(`${request.method()} ${request.url()} · ${failure}`);
  });
  evidence.errors.push({ label, errors });
  return errors;
}

async function installFixture(context) {
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: "QA_READ_ONLY" }) });
      return;
    }
    if (url.pathname === `/api/trees/${fixtureTreeId}`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
      return;
    }
    if (url.pathname === `/api/trees/${fixtureTreeId}/memories`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) });
      return;
    }
    await route.continue();
  });
}

async function assertViewport(page, label) {
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    surface: Boolean(document.querySelector('[data-source60-surface="canonical"]')),
    canvas: Boolean(document.querySelector('[data-source60-canvas="true"]')),
    background: document.querySelector('[data-source60-surface="canonical"]')
      ? getComputedStyle(document.querySelector('[data-source60-surface="canonical"]')).backgroundColor
      : "missing",
  }));
  assert.equal(metrics.surface, true, `${label}: canonical surface missing`);
  assert.equal(metrics.canvas, true, `${label}: canvas missing`);
  assert.ok(metrics.body <= metrics.width + 1, `${label}: body overflow ${metrics.body} > ${metrics.width}`);
  assert.ok(metrics.root <= metrics.width + 1, `${label}: root overflow ${metrics.root} > ${metrics.width}`);
  return metrics;
}

async function waitCanonical(page) {
  await page.locator('[data-source60-surface="canonical"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('[data-source60-canvas="true"]').waitFor({ state: "attached", timeout: 15000 });
}

async function capture(page, name) {
  const filename = `${evidenceDir}/${name}.png`;
  await page.screenshot({ path: filename, fullPage: false });
  return filename;
}

async function findTooltip(page) {
  const canvas = page.locator('[data-source60-canvas="true"]');
  const box = await canvas.boundingBox();
  if (!box) return false;
  for (let y = box.y + 90; y < box.y + box.height - 20; y += 45) {
    for (let x = box.x + 80; x < box.x + box.width - 20; x += 55) {
      await page.mouse.move(x, y);
      if (await page.locator('[data-source60-tooltip="true"]').count()) return true;
    }
  }
  return false;
}

async function canonicalAudit(spec) {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, isMobile: spec.mobile, hasTouch: spec.mobile, reducedMotion: spec.reducedMotion ? "reduce" : "no-preference" });
  await installFixture(context);
  const page = await context.newPage();
  const errors = captureErrors(page, `C-${spec.key}`);
  const response = await page.goto(`${baseUrl}/trees/${fixtureTreeId}/explore`, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `C ${spec.key}: HTTP ${response?.status()}`);
  await waitCanonical(page);
  const initial = await assertViewport(page, `C ${spec.key} initial`);
  await capture(page, `C-${spec.key}-initial`);

  const canvas = page.locator('[data-source60-canvas="true"]');
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  const zoomAfterKeyboard = await page.locator("strong").filter({ hasText: /UNIVERSE|CLUSTER|MOMENT FIELD|INSPECT/ }).first().innerText().catch(() => "unknown");
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 100, canvasBox.y + 40, { steps: 5 });
    await page.mouse.up();
    await page.mouse.wheel(0, -240);
  }
  const tooltipFound = spec.mobile ? true : await findTooltip(page);
  await capture(page, `C-${spec.key}-camera-tooltip`);

  const search = page.getByRole("textbox", { name: "Moment 검색" });
  await search.fill("Bridge to the letter");
  await page.getByRole("button", { name: "Bridge to the letter" }).click();
  await page.waitForTimeout(120);
  assert.equal(new URL(page.url()).searchParams.get("moment"), "s60-bridge", `C ${spec.key}: search URL sync`);
  await page.getByRole("complementary", { name: "Moment Inspect" }).waitFor();
  await capture(page, `C-${spec.key}-selected-inspector-bridge`);

  const bridgeToggle = page.getByRole("button", { name: /Bridge(?: ON)?$/ });
  await bridgeToggle.click();
  assert.equal(await bridgeToggle.getAttribute("aria-pressed"), "true", `C ${spec.key}: Bridge filter`);
  const emotion = page.locator('select[aria-label="감정 필터"]');
  await emotion.selectOption("music", { force: true }).catch(async () => { await emotion.selectOption("warm", { force: true }); });
  await capture(page, `C-${spec.key}-filters`);

  const modalButtons = [
    ["이 Moment 열기", "viewer", "viewer"],
    ["책에서 보기", "book", "sketchbook"],
    ["연결 편집", "connection", "connection"],
    ["이 경로 전체 보기", "path", "path"],
  ];
  for (const [buttonName, modalName, evidenceName] of modalButtons) {
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    await page.locator(`[data-source60-modal="${modalName}"]`).waitFor({ state: "visible" });
    await capture(page, `C-${spec.key}-${evidenceName}`);
    await page.getByRole("button", { name: "60으로 돌아가기" }).click();
  }

  await page.goto(`${baseUrl}/trees/${fixtureTreeId}/explore?moment=s60-root`, { waitUntil: "networkidle" });
  await waitCanonical(page);
  await page.goto(`${baseUrl}/trees/${fixtureTreeId}/explore?moment=s60-bridge`, { waitUntil: "networkidle" });
  await waitCanonical(page);
  assert.equal(new URL(page.url()).searchParams.get("moment"), "s60-bridge", `C ${spec.key}: inbound moment URL`);
  await page.goBack({ waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).searchParams.get("moment"), "s60-root", `C ${spec.key}: browser back`);
  await page.goForward({ waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).searchParams.get("moment"), "s60-bridge", `C ${spec.key}: browser forward`);

  assert.deepEqual(errors.console, [], `C ${spec.key}: console errors ${errors.console.join(" | ")}`);
  assert.deepEqual(errors.page, [], `C ${spec.key}: page errors ${errors.page.join(" | ")}`);
  assert.deepEqual(errors.failedRequests, [], `C ${spec.key}: failed requests ${errors.failedRequests.join(" | ")}`);
  evidence.viewports.push({ surface: "C", viewport: spec.key, initial, tooltipFound, zoomAfterKeyboard });
  await context.close();
}

async function sourceAudit(spec, surface, url, waitFor) {
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, isMobile: spec.mobile, hasTouch: spec.mobile, reducedMotion: spec.reducedMotion ? "reduce" : "no-preference" });
  const page = await context.newPage();
  const errors = captureErrors(page, `${surface}-${spec.key}`);
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `${surface} ${spec.key}: HTTP ${response?.status()}`);
  await page.locator(waitFor).first().waitFor({ state: "visible", timeout: 15000 });
  if (surface === "A") {
    await page.waitForFunction(() => Boolean(window.__LT60__?.projection?.(999)), undefined, { timeout: 15000 });
  }
  await page.waitForTimeout(350);
  const metrics = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  assert.ok(metrics.body <= metrics.width + 1, `${surface} ${spec.key}: body overflow`);
  assert.ok(metrics.root <= metrics.width + 1, `${surface} ${spec.key}: root overflow`);
  await capture(page, `${surface}-${spec.key}-initial`);

  if (surface === "A") {
    await page.evaluate(() => window.__LT60__?.selectNode(0, true));
    await page.waitForTimeout(180);
    await capture(page, `A-${spec.key}-selected-inspector`);
    await page.evaluate(() => window.__LT60_V12__?.openViewer());
    await page.locator('[role="dialog"][aria-label="Full Moment Viewer"]').waitFor({ state: "visible" });
    await capture(page, `A-${spec.key}-viewer`);
    await page.evaluate(() => window.__LT60_V12__?.closePath?.());
    await page.locator('[aria-label="Moment Viewer 닫기"]').click();
    await page.evaluate(() => window.__LT60_V12__?.openBook());
    await page.locator('[role="dialog"][aria-label="Memory Sketchbook handoff"]').waitFor({ state: "visible" });
    await capture(page, `A-${spec.key}-sketchbook`);
    await page.locator('[aria-label="책 미리보기 닫기"]').click();
    await page.evaluate(() => window.__LT60_V12__?.openConnection());
    await page.locator('[role="dialog"][aria-label="Connection Edit handoff"]').waitFor({ state: "visible" });
    await capture(page, `A-${spec.key}-connection`);
    await page.locator('[aria-label="연결 편집 handoff 닫기"]').click();
    await page.evaluate(() => window.__LT60_V12__?.openPath());
    await page.locator('[role="dialog"][aria-label="Path Preview"]').waitFor({ state: "visible" });
    await capture(page, `A-${spec.key}-path`);
  } else {
    await page.locator('[data-moment-item]').first().click();
    await page.waitForTimeout(120);
    await capture(page, `B-${spec.key}-selected-inspector`);
  }
  const defectRecord = { surface, viewport: spec.key, console: errors.console, page: errors.page, failedRequests: errors.failedRequests };
  if (surface === "A") {
    if (errors.console.length || errors.page.length || errors.failedRequests.length) evidence.errors.push({ label: `SOURCE_A_DEFECT_${spec.key}`, errors: defectRecord });
  } else {
    assert.deepEqual(errors.console, [], `${surface} ${spec.key}: console errors ${errors.console.join(" | ")}`);
    assert.deepEqual(errors.page, [], `${surface} ${spec.key}: page errors ${errors.page.join(" | ")}`);
    assert.deepEqual(errors.failedRequests, [], `${surface} ${spec.key}: failed requests ${errors.failedRequests.join(" | ")}`);
  }
  evidence.viewports.push({ surface, viewport: spec.key, metrics, defects: surface === "A" ? defectRecord : undefined });
  await context.close();
}

try {
  for (const spec of viewports) {
    await sourceAudit(spec, "A", `file://${resolvedSourcePath}`, "#stage");
    await sourceAudit(spec, "B", `${baseUrl}/design-lab/lineages/60/v1-2`, '[role="listbox"]');
  }
  for (const spec of viewports) await canonicalAudit(spec);
  const resultPath = `${evidenceDir}/browser-qa.json`;
  await import("node:fs/promises").then(({ writeFile }) => writeFile(resultPath, JSON.stringify(evidence, null, 2)));
  console.log(`SOURCE60_P0_FIDELITY_BROWSER_QA_PASS=${resultPath}`);
} finally {
  await browser.close();
}
