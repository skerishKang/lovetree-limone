import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const moments = Array.from({ length: 40 }, (_, index) => {
  const id = `moment-${String(index + 1).padStart(2, "0")}`;
  const parentId = index === 0 ? null : `moment-${String(Math.floor((index - 1) / 2) + 1).padStart(2, "0")}`;
  const sourceType = index < 18 ? "photo" : index < 28 ? "video" : index < 35 ? "memo" : "link";
  const date = `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`;
  const hue = (index * 37) % 360;
  const thumbnail = sourceType === "memo" ? "" :
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g${index}' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='hsl(${hue}, 42%25, 28%25)'/%3E%3Cstop offset='100%25' stop-color='hsl(${(hue + 45) % 360}, 50%25, 14%25)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='400' fill='url(%23g${index})'/%3E%3C/svg%3E`;
  return {
    id,
    treeId,
    parentId,
    connectionReason: parentId ? "이전 Moment에서 이어진 canonical 연결" : null,
    title: `Moment ${String(index + 1).padStart(2, "0")} · ${sourceType.toUpperCase()}`,
    memo: sourceType === "memo" ? "Canonical memo Moment" : `Canonical ${sourceType} Moment`,
    sourceType,
    sourceUrl: "",
    thumbnail,
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

function sha256(relativePath) {
  return createHash("sha256").update(readFileSync(path.join(root, relativePath))).digest("hex");
}

function viewportLabel(width, height) {
  return `${width}x${height}`;
}

// Focus and Viewer are distinct observable states: their captures must never be
// accidental duplicates (same bytes ⇒ the transition did not actually render).
function assertDistinctCaptures(focusShot, viewerShot, label) {
  assert.notEqual(
    sha256(focusShot),
    sha256(viewerShot),
    `${label}: Focus and Viewer captures are accidental duplicates — Viewer transition never rendered`,
  );
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

async function assertProductWorldGeometry(page, label) {
  const geometry = await page.evaluate(() => {
    const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
    const welcome = document.querySelector('[data-source64-welcome="true"]');
    const title = welcome?.querySelector("h2, .welcomeTitle");
    const cards = [...document.querySelectorAll("[data-moment-id]")];
    const welcomeRect = welcome?.getBoundingClientRect();
    const titleRect = title?.getBoundingClientRect();
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
    const titleOverlaps = titleRect
      ? cards.filter((card) => {
          const rect = card.getBoundingClientRect();
          const w = Math.max(0, Math.min(rect.right, titleRect.right) - Math.max(rect.left, titleRect.left));
          const h = Math.max(0, Math.min(rect.bottom, titleRect.bottom) - Math.max(rect.top, titleRect.top));
          return w > 0 && h > 0;
        }).length
      : 0;
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
      titleOverlaps,
    };
  });
  assert.equal(geometry.revision, "64-v1-2-1", `${label}: stale or foreign Source64 surface detected`);
  assert.equal(Number(geometry.momentCount), 40, `${label}: product must render 40 Moments`);
  assert.equal(Number(geometry.familyCount), 5, `${label}: product must preserve five orbital families`);
  assert.equal(geometry.cardCount, 40, `${label}: product card count drifted`);
  assert.ok(geometry.depthCount.foreground > 0 && geometry.depthCount.mid > 0 && geometry.depthCount.far > 0, `${label}: depth tiers missing`);
  assert.equal(geometry.centerVisible, true, `${label}: product Welcome center must remain visible`);
  assert.equal(geometry.finiteCardGeometry, true, `${label}: product card geometry must be finite and non-zero`);
  assert.ok(geometry.maxWelcomeOverlap < 0.35, `${label}: product cards over-occlude Welcome center (${geometry.maxWelcomeOverlap})`);
  assert.equal(geometry.titleOverlaps, 0, `${label}: product cards must not occlude Welcome title`);
}

async function assertProductViewerLayout(page, label, width) {
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
    results.source[label].stateProof ??= {};

    // Focus state: source-owned focusCard() transition — focusLayer open, Viewer closed.
    await page.evaluate(() => window.__TRACK64__.focus("m01"));
    await page.waitForFunction(
      () => document.querySelector("#focusLayer")?.classList.contains("open")
        && window.__TRACK64__.snapshot().focusId === "m01",
    );
    const focusProof = await page.evaluate(() => ({
      focusId: window.__TRACK64__.snapshot().focusId,
      viewer: window.__TRACK64__.getViewer(),
      focusLayerOpen: document.querySelector("#focusLayer")?.classList.contains("open"),
      focusInfoVisible: document.querySelector(".focusInfo")?.getBoundingClientRect().width > 0,
      returnToOrbitVisible: document.querySelector("#closeFocus")?.textContent?.trim(),
    }));
    assert.equal(focusProof.focusLayerOpen, true, `A-source-${label}: focusLayer must be open in Focus state`);
    assert.equal(focusProof.focusId, "m01", `A-source-${label}: source focus authority must be m01`);
    assert.equal(focusProof.viewer.open, false, `A-source-${label}: Focus state must NOT force the Viewer open`);
    assert.equal(focusProof.returnToOrbitVisible, "RETURN TO ORBIT", `A-source-${label}: RETURN TO ORBIT control is source-owned`);
    results.source[label].stateProof.focus = focusProof;
    results.source[label].focus = await save(page, "A-source", label, "focus");

    // Viewer state: explicit openMoment() from Focus — Viewer opens, Focus persists behind it.
    await page.evaluate(() => window.__TRACK64__.openViewer());
    await page.locator("#mediaViewer.open").waitFor({ state: "visible", timeout: 5000 });
    const viewerProof = await page.evaluate(() => ({
      focusId: window.__TRACK64__.snapshot().focusId,
      viewer: window.__TRACK64__.getViewer(),
      focusLayerOpen: document.querySelector("#focusLayer")?.classList.contains("open"),
    }));
    assert.equal(viewerProof.viewer.open, true, `A-source-${label}: Viewer must be open in Viewer state`);
    assert.equal(viewerProof.viewer.momentId, "m01", `A-source-${label}: Viewer must show the focused Moment`);
    assert.equal(viewerProof.focusLayerOpen, true, `A-source-${label}: Focus persists behind the Viewer`);
    results.source[label].stateProof.viewer = viewerProof;
    results.source[label].viewer = await save(page, "A-source", label, "viewer");
    assertDistinctCaptures(results.source[label].focus, results.source[label].viewer, `A-source-${label}`);
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
    await assertProductWorldGeometry(page, `B-native-${label}`);
    results.native[label] ??= {};
    results.native[label].stateProof ??= {};

    // Focus state: semantic-list selection must land in Focus, never the Viewer.
    const menuToggle = page.getByRole("button", { name: /시맨틱 목록/ });
    await menuToggle.waitFor({ state: "visible", timeout: 15000 });
    await menuToggle.click({ force: true });
    const list = page.locator('[role="listbox"]');
    await list.waitFor({ state: "visible", timeout: 15000 });
    const firstOption = list.locator('[role="option"]').first();
    await firstOption.waitFor({ state: "attached", timeout: 8000 });
    await firstOption.click();
    await page.locator('[data-source64-focus="true"]').waitFor({ state: "attached", timeout: 8000 });
    const focusProof = await page.evaluate(() => {
      const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
      return {
        focusOpen: stage?.getAttribute("data-source64-focus-open"),
        viewerOpen: stage?.getAttribute("data-source64-viewer-open"),
        focusedId: stage?.getAttribute("data-source64-focused-moment-id"),
        focusLayer: !!document.querySelector('[data-source64-focus="true"]'),
        focusInfo: !!document.querySelector('[data-source64-focus-info="true"]'),
        returnToOrbit: document.querySelector('[data-source64-return-to-orbit="true"]')?.textContent?.trim(),
        pinnedCard: document.querySelector('[data-moment-id="moment-01"]')?.getAttribute("data-focused"),
        dimmedCards: document.querySelectorAll('[data-focus-dim="true"]').length,
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
      };
    });
    assert.equal(focusProof.focusOpen, "true", `B-native-${label}: focus-open must be true after list selection`);
    assert.equal(focusProof.viewerOpen, "false", `B-native-${label}: list selection must NOT open the Viewer`);
    assert.equal(focusProof.focusedId, "moment-01", `B-native-${label}: Focus authority must own moment-01`);
    assert.equal(focusProof.dialogCount, 0, `B-native-${label}: no dialog may exist in Focus state`);
    assert.equal(focusProof.focusLayer, true, `B-native-${label}: source-owned focusLayer must render`);
    assert.equal(focusProof.focusInfo, true, `B-native-${label}: source-owned focusInfo must render`);
    assert.equal(focusProof.returnToOrbit, "RETURN TO ORBIT", `B-native-${label}: RETURN TO ORBIT control must render`);
    assert.equal(focusProof.pinnedCard, "true", `B-native-${label}: selected card must be the pinned Focus card`);
    assert.ok(focusProof.dimmedCards > 30, `B-native-${label}: world context must stay visible-but-receded`);
    results.native[label].stateProof.focus = focusProof;
    results.native[label].focus = await save(page, "B-native", label, "focus");

    // Viewer state: explicit action from Focus opens the Source64 mediaShell Viewer.
    await page.locator('[data-source64-open-viewer-from-focus="true"]').click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
    const viewerProof = await page.evaluate(() => {
      const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
      return {
        focusOpen: stage?.getAttribute("data-source64-focus-open"),
        viewerOpen: stage?.getAttribute("data-source64-viewer-open"),
        focusedId: stage?.getAttribute("data-source64-focused-moment-id"),
        dialogLayout: document.querySelector('[data-viewer-layout="mediaShell"]')?.getAttribute("data-selected-moment-id"),
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
      };
    });
    assert.equal(viewerProof.viewerOpen, "true", `B-native-${label}: viewer-open must be true in Viewer state`);
    assert.equal(viewerProof.focusOpen, "true", `B-native-${label}: Focus must persist behind the Viewer`);
    assert.equal(viewerProof.dialogCount, 1, `B-native-${label}: exactly one Source64 Viewer dialog`);
    assert.equal(viewerProof.dialogLayout, "moment-01", `B-native-${label}: Viewer must show the focused Moment`);
    await assertProductViewerLayout(page, `B-native-${label}`, width);
    results.native[label].stateProof.viewer = viewerProof;
    results.native[label].viewer = await save(page, "B-native", label, "viewer");
    assertDistinctCaptures(results.native[label].focus, results.native[label].viewer, `B-native-${label}`);
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
    results.canonical[label] ??= {};
    results.canonical[label].stateProof ??= {};

    // World geometry is checked in the orbit state, before any Focus pinning.
    await page.goto(`${base}/trees/${treeId}/portal`, { waitUntil: "commit" });
    await page.locator('[data-source64-revision="64-v1-2-1"]').waitFor({ state: "attached", timeout: 15000 });
    await page.locator('[data-rendering="css3d-dom"][data-reduced-motion]').waitFor({ state: "attached" });
    await assertProductWorldGeometry(page, `C-canonical-${label}`);

    // Focus state: canonical ?moment= deep link must establish Focus without forcing the Viewer.
    await page.goto(`${base}/trees/${treeId}/portal?moment=moment-01`, { waitUntil: "commit" });
    await page.locator('[data-source64-revision="64-v1-2-1"]').waitFor({ state: "attached", timeout: 15000 });
    await page.locator('[data-source64-focus="true"]').waitFor({ state: "attached", timeout: 15000 });
    const focusProof = await page.evaluate(() => {
      const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
      return {
        urlMoment: new URL(location.href).searchParams.get("moment"),
        focusOpen: stage?.getAttribute("data-source64-focus-open"),
        viewerOpen: stage?.getAttribute("data-source64-viewer-open"),
        focusedId: stage?.getAttribute("data-source64-focused-moment-id"),
        focusLayer: !!document.querySelector('[data-source64-focus="true"]'),
        focusInfo: !!document.querySelector('[data-source64-focus-info="true"]'),
        pinnedCard: document.querySelector('[data-moment-id="moment-01"]')?.getAttribute("data-focused"),
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
      };
    });
    assert.equal(focusProof.urlMoment, "moment-01", `C-canonical-${label}: canonical ?moment= must stay in the URL`);
    assert.equal(focusProof.focusOpen, "true", `C-canonical-${label}: deep link must establish Focus authority`);
    assert.equal(focusProof.viewerOpen, "false", `C-canonical-${label}: deep link must NOT force the Viewer open`);
    assert.equal(focusProof.focusedId, "moment-01", `C-canonical-${label}: focused moment id`);
    assert.equal(focusProof.dialogCount, 0, `C-canonical-${label}: no dialog may exist in Focus state`);
    assert.equal(focusProof.pinnedCard, "true", `C-canonical-${label}: canonical deep link pins the Focus card`);
    results.canonical[label].stateProof.focus = focusProof;
    results.canonical[label].focus = await save(page, "C-canonical", label, "focus");

    // Viewer state: explicit action from Focus opens the Source64 Viewer on canonical data.
    await page.locator('[data-source64-open-viewer-from-focus="true"]').click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
    const viewerProof = await page.evaluate(() => {
      const stage = document.querySelector('[data-source64-revision="64-v1-2-1"]');
      return {
        focusOpen: stage?.getAttribute("data-source64-focus-open"),
        viewerOpen: stage?.getAttribute("data-source64-viewer-open"),
        focusedId: stage?.getAttribute("data-source64-focused-moment-id"),
        dialogLayout: document.querySelector('[data-viewer-layout="mediaShell"]')?.getAttribute("data-selected-moment-id"),
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
      };
    });
    assert.equal(viewerProof.viewerOpen, "true", `C-canonical-${label}: viewer-open must be true in Viewer state`);
    assert.equal(viewerProof.focusOpen, "true", `C-canonical-${label}: Focus must persist behind the Viewer`);
    assert.equal(viewerProof.dialogCount, 1, `C-canonical-${label}: exactly one Source64 Viewer dialog`);
    assert.equal(viewerProof.dialogLayout, "moment-01", `C-canonical-${label}: Viewer must show the canonical Moment`);
    await assertProductViewerLayout(page, `C-canonical-${label}`, width);
    results.canonical[label].stateProof.viewer = viewerProof;
    results.canonical[label].viewer = await save(page, "C-canonical", label, "viewer");
    assertDistinctCaptures(results.canonical[label].focus, results.canonical[label].viewer, `C-canonical-${label}`);
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
