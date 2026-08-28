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

async function captureSource(browser, width, height, reduced = false) {
  const label = viewportLabel(width, height);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = attachErrors(page);
  try {
    await page.goto(`file://${sourcePath}`, { waitUntil: "load" });
    await page.waitForSelector("#world .card", { timeout: 15000 });
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
  const label = viewportLabel(width, height);
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
    await menuToggle.click();
    const list = page.locator('[role="listbox"]');
    await list.waitFor({ state: "visible", timeout: 15000 });
    const firstOption = list.locator('[role="option"]').first();
    await firstOption.waitFor({ state: "attached", timeout: 8000 });
    await firstOption.click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
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
  const label = viewportLabel(width, height);
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
  await captureSource(browser, 320, 720, true);
  await captureNative(browser, 320, 720, true);
  await captureCanonical(browser, 320, 720, true);
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
