import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const base = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const sourcePath = path.join(
  root,
  "reference/source-tracks-snapshot/64_부유모먼트_웰컴오빗_입장포털O/현재후보.html",
);
const evidence = path.join(root, "test-results/design-fidelity/lineage-64-v1-2-1/abc");
const treeId = "source64-abc-fidelity-tree";
const pixel =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";
const moments = Array.from({ length: 40 }, (_, index) => {
  const id = `moment-${String(index + 1).padStart(2, "0")}`;
  const parentId = index === 0 ? null : `moment-${String(Math.floor((index - 1) / 2) + 1).padStart(2, "0")}`;
  const sourceType = index < 18 ? "photo" : index < 28 ? "video" : index < 35 ? "memo" : "link";
  const date = `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`;
  return {
    id,
    treeId,
    parentId,
    connectionReason: parentId ? "이전 Moment에서 이어진 canonical 연결" : null,
    title: `Moment ${String(index + 1).padStart(2, "0")} · ${sourceType.toUpperCase()}`,
    memo: sourceType === "memo" ? "Canonical memo Moment" : `Canonical ${sourceType} Moment`,
    sourceType,
    sourceUrl: "",
    thumbnail: pixel,
    discoveryDate: date,
    timestamp: date,
    createdAt: `2026-01-01T00:00:${String(index).padStart(2, "0")}.000Z`,
    sortOrder: index + 1,
    emotionTags: [index % 2 ? "soft" : "warm"],
  };
});
const tree = {
  id: treeId,
  ownerId: "source64-abc-fidelity-owner",
  title: "Source64 A/B/C Fidelity Tree",
  visibility: "private",
};
const viewports = [
  [1280, 800],
  [390, 844],
  [320, 720],
];
const checkedOutHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const workflowSha = process.env.GITHUB_SHA ?? null;
const pullRequestHead = process.env.GITHUB_EVENT_PATH
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")).pull_request?.head?.sha ?? null
  : null;
const results = { source: {}, native: {}, canonical: {}, errors: {} };

await mkdir(evidence, { recursive: true });

function attachErrors(page) {
  const value = { console: [], page: [] };
  page.on("console", (message) => {
    if (message.type() === "error") value.console.push(message.text());
  });
  page.on("pageerror", (error) => value.page.push(error.message));
  return value;
}

async function save(page, area, viewport, state) {
  const file = path.join(evidence, `${area}-${viewport}-${state}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file);
}

function viewportLabel(width, height) {
  return `${width}x${height}`;
}

async function assertSourceGeometry(page, label) {
  const geometry = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#world .card")];
    const center = document.querySelector("#center");
    const centerRect = center?.getBoundingClientRect();
    const rings = window.__TRACK64__?.getCards?.().map((card) => card.ring) ?? [];
    const centerArea = centerRect ? centerRect.width * centerRect.height : 0;
    const overlaps = centerRect
      ? cards.map((card) => {
          const rect = card.getBoundingClientRect();
          const width = Math.max(0, Math.min(rect.right, centerRect.right) - Math.max(rect.left, centerRect.left));
          const height = Math.max(0, Math.min(rect.bottom, centerRect.bottom) - Math.max(rect.top, centerRect.top));
          return (width * height) / Math.max(centerArea, 1);
        })
      : [];
    return {
      cardCount: cards.length,
      ringCount: new Set(rings).size,
      centerVisible: Boolean(centerRect && centerRect.width > 0 && centerRect.height > 0),
      maxCenterOverlap: Math.max(0, ...overlaps),
    };
  });
  assert.equal(geometry.cardCount, 40, `${label}: source must render 40 Moments`);
  assert.equal(geometry.ringCount, 5, `${label}: source must preserve five orbital families`);
  assert.equal(geometry.centerVisible, true, `${label}: source Welcome center must remain visible`);
  assert.ok(geometry.maxCenterOverlap < 0.45, `${label}: source cards over-occlude Welcome center`);
}

async function assertProductGeometry(page, label, width) {
  const geometry = await page.evaluate(() => {
    const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
    const welcome = document.querySelector('[data-source64-welcome="true"]');
    const cards = [...document.querySelectorAll("[data-moment-id]")];
    const welcomeRect = welcome?.getBoundingClientRect();
    const welcomeArea = welcomeRect ? welcomeRect.width * welcomeRect.height : 0;
    const overlaps = welcomeRect
      ? cards.map((card) => {
          const rect = card.getBoundingClientRect();
          const cardArea = rect.width * rect.height;
          const overlapWidth = Math.max(0, Math.min(rect.right, welcomeRect.right) - Math.max(rect.left, welcomeRect.left));
          const overlapHeight = Math.max(0, Math.min(rect.bottom, welcomeRect.bottom) - Math.max(rect.top, welcomeRect.top));
          return (overlapWidth * overlapHeight) / Math.max(Math.min(welcomeArea, cardArea), 1);
        })
      : [];
    const depths = Object.fromEntries(["foreground", "mid", "far"].map((tier) => [tier, cards.filter((card) => card.dataset.depthTier === tier).length]));
    const finiteCardGeometry = cards.every((card) => {
      const rect = card.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
    });
    return {
      revision: stage?.getAttribute("data-source64-revision"),
      momentCount: stage?.getAttribute("data-source64-moment-count"),
      familyCount: stage?.getAttribute("data-source64-family-count"),
      cardCount: cards.length,
      depthCount: depths,
      centerVisible: Boolean(welcomeRect && welcomeRect.width > 0 && welcomeRect.height > 0),
      finiteCardGeometry,
      maxWelcomeOverlap: Math.max(0, ...overlaps),
    };
  });
  assert.equal(geometry.revision, "64-v1-2-1", `${label}: stale or foreign Source64 surface detected`);
  assert.equal(Number(geometry.momentCount), 40, `${label}: product must render 40 Moments`);
  assert.equal(Number(geometry.familyCount), 5, `${label}: product must preserve five orbital families`);
  assert.equal(geometry.cardCount, 40, `${label}: product card count drifted`);
  assert.ok(geometry.depthCount.foreground > 0 && geometry.depthCount.mid > 0 && geometry.depthCount.far > 0, `${label}: depth tiers missing`);
  assert.equal(geometry.centerVisible, true, `${label}: product Welcome center must remain visible`);
  assert.equal(geometry.finiteCardGeometry, true, `${label}: product card geometry must be finite and non-zero`);
  assert.ok(geometry.maxWelcomeOverlap < 0.65, `${label}: product cards over-occlude Welcome center`);

  const viewer = await page.locator('[data-source64-viewer="true"] [data-viewer-layout="mediaShell"]').boundingBox();
  const layout = await page.locator('[data-source64-viewer="true"] [data-viewer-layout="mediaShell"]').evaluate((shell) => {
    const style = getComputedStyle(shell);
    const visual = shell.querySelector('[data-source64-media-visual="true"]')?.getBoundingClientRect();
    const info = shell.querySelector('[data-source64-media-info="true"]')?.getBoundingClientRect();
    return {
      columns: style.gridTemplateColumns,
      rows: style.gridTemplateRows,
      visualWidth: visual?.width ?? 0,
      infoWidth: info?.width ?? 0,
    };
  });
  assert.ok(viewer && viewer.width <= width + 1, `${label}: viewer escapes viewport`);
  if (width > 700) {
    assert.equal(layout.columns.split(" ").length, 2, `${label}: desktop viewer must use two columns`);
    assert.ok(layout.visualWidth / Math.max(layout.infoWidth, 1) > 1.65, `${label}: desktop viewer media/info split is not source-like`);
    assert.ok(layout.infoWidth >= 300, `${label}: desktop viewer info column is too narrow`);
  } else {
    assert.equal(layout.columns.split(" ").length, 1, `${label}: mobile viewer must stack media/info`);
    assert.ok(layout.rows.split(" ").length >= 2, `${label}: mobile viewer rows are missing`);
  }
}

async function captureSource(browser, width, height, reduced = false) {
  const label = `${viewportLabel(width, height)}${reduced ? "-reduced" : ""}`;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = attachErrors(page);
  try {
    await page.goto(`file://${sourcePath}`, { waitUntil: "load" });
    await page.waitForSelector("#world .card", { timeout: 15000 });
    await assertSourceGeometry(page, `A-source-${label}`);
    results.source[label] ??= {};
    results.source[label].initial = await save(page, "A-source", label, "initial");

    await page.locator("#world .card").first().click({ force: true });
    await page.locator("#focusLayer").waitFor({ state: "visible", timeout: 5000 });
    results.source[label].selected = await save(page, "A-source", label, "selected-moment");
    await page.locator("#mediaViewer.open").waitFor({ state: "visible", timeout: 5000 });
    results.source[label].viewer = await save(page, "A-source", label, "viewer-open");
    await page.locator("#mediaClose").click();
    await page.locator("#mediaViewer.open").waitFor({ state: "hidden" });
    await page.locator("#closeFocus").click();
    await page.locator("#focusLayer:not(.open)").waitFor({ state: "visible" });
    results.source[label].primaryOrbitInteraction = await save(page, "A-source", label, "primary-orbit-interaction");
    if (reduced) results.source[label].reducedMotion = results.source[label].initial;
  } finally {
    results.errors[`source-${label}${reduced ? "-reduced" : ""}`] = errors;
    await context.close();
  }
}

async function captureNative(browser, width, height, reduced = false) {
  const label = `${viewportLabel(width, height)}${reduced ? "-reduced" : ""}`;
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reduced ? "reduce" : undefined,
  });
  const page = await context.newPage();
  const errors = attachErrors(page);
  try {
    await page.goto(`${base}/design-lab/lineages/64/v1-2-1`, { waitUntil: "networkidle" });
    await page.locator('[data-rendering="css3d-dom"]').waitFor({ state: "visible" });
    results.native[label] ??= {};
    results.native[label].initial = await save(page, "B-native", label, "initial");

    const menuToggle = page.getByRole("button", { name: /시맨틱 목록/ });
    await menuToggle.waitFor({ state: "visible", timeout: 15000 });
    await menuToggle.click({ force: true });
    await page.locator('button[aria-expanded="true"]').waitFor({ state: "attached", timeout: 5000 });
    const list = page.locator('[role="listbox"]');
    await list.waitFor({ state: "visible", timeout: 15000 });
    const firstOption = list.locator('[role="option"]').first();
    await firstOption.waitFor({ state: "attached", timeout: 8000 });
    await firstOption.click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await assertProductGeometry(page, `B-native-${label}`, width);
    results.native[label].selected = await save(page, "B-native", label, "selected-moment");
    await page.getByRole("button", { name: /PATH CONTINUE/ }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    results.native[label].continue = await save(page, "B-native", label, "continue");
    await page.getByRole("button", { name: /BRANCH CHOICE/ }).click();
    results.native[label].branch = await save(page, "B-native", label, "branch");
    await page.getByRole("button", { name: "닫기" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    results.native[label].primaryOrbitInteraction = await save(page, "B-native", label, "primary-orbit-interaction");
    if (reduced) results.native[label].reducedMotion = await save(page, "B-native", label, "reduced-motion");
  } finally {
    results.errors[`native-${label}${reduced ? "-reduced" : ""}`] = errors;
    await context.close();
  }
}

async function captureCanonical(browser, width, height, reduced = false) {
  const label = `${viewportLabel(width, height)}${reduced ? "-reduced" : ""}`;
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width <= 390,
    isMobile: width <= 390,
  });
  const page = await context.newPage();
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = attachErrors(page);
  try {
    await page.route(`**/api/trees/${treeId}/memories*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) }),
    );
    await page.route(`**/api/trees/${treeId}`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tree) }),
    );
    await page.goto(`${base}/trees/${treeId}/portal`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-mvp-source="64"]').waitFor({ state: "visible" });
    await page.locator('[data-rendering="css3d-dom"][data-reduced-motion]').waitFor({ state: "attached" });
    results.canonical[label] ??= {};
    results.canonical[label].initial = await save(page, "C-canonical", label, "initial");

    await page.goto(`${base}/trees/${treeId}/portal?moment=moment-01`, { waitUntil: "domcontentloaded" });
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await assertProductGeometry(page, `C-canonical-${label}`, width);
    results.canonical[label].selected = await save(page, "C-canonical", label, "selected-moment");
    results.canonical[label].viewer = await save(page, "C-canonical", label, "viewer-open");
    await page.getByRole("button", { name: "Moment 포털 닫기" }).click();
    await page.waitForURL((url) => url.searchParams.get("moment") === null);
    results.canonical[label].primaryOrbitInteraction = await save(page, "C-canonical", label, "primary-orbit-interaction");
    if (reduced) results.canonical[label].reducedMotion = await save(page, "C-canonical", label, "reduced-motion");
  } finally {
    results.errors[`canonical-${label}${reduced ? "-reduced" : ""}`] = errors;
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of viewports) {
    await captureSource(browser, width, height);
    await captureNative(browser, width, height);
    await captureCanonical(browser, width, height);
  }
  for (const [width, height] of viewports) {
    await captureSource(browser, width, height, true);
    await captureNative(browser, width, height, true);
    await captureCanonical(browser, width, height, true);
  }
} finally {
  await browser.close();
}

const runtimeErrors = Object.values(results.errors).flatMap((value) => [...value.console, ...value.page]);
await writeFile(
  path.join(evidence, "abc-results.json"),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    checkedOutHead,
    workflowSha,
    pullRequestHead,
    sourcePath: path.relative(root, sourcePath),
    nativeRoute: "/design-lab/lineages/64/v1-2-1",
    canonicalRoute: `/trees/:id/portal`,
    results,
  }, null, 2)}\n`,
);

assert.deepEqual(runtimeErrors, [], `Source64 A/B/C runtime errors: ${runtimeErrors.join(" | ")}`);
console.log(`SOURCE64_ABC_FIDELITY_PASS evidence=${path.relative(root, evidence)}`);
