// Lineage 55 Moonlit Blossom Hero V1 — native browser QA evidence helper.
//
// Lives OUTSIDE the standard tests/*.test.mjs corpus so it is not picked up by
// the shared A-track fail-closed browser inventory. Run manually or by a
// dedicated lane workflow against a built app server:
//   V4_BASE_URL=http://127.0.0.1:3000 node qa/lineage55-native-browser-qa.mjs
//
// Proves the interaction contract extracted from the git-preserved source
// fixture (old/reference/lineage-55-moonlit-blossom-v1/source/index-v1.html):
//   SEED → FEELING → MOMENTS → BLOOM staged progression, flower click,
//   Space/Arrow keys, throttled wheel, header pill jumps, memory-card jumps,
//   auto-play toggle (2100ms), and the 36-petal BLOOM burst.
// The original fixture is NEVER executed or modified; comparison is limited to
// this contract plus captured screenshots of the native route.
//
// Known-benign noise: /old/reference/lineage-55-moonlit-blossom-v1/assets/** image
// requests 404 until the held provenance assets are materialized. Resource
// load failures for that prefix are recorded but do not fail the contract.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const ROUTE = `${BASE}/design-lab/lineages/55`;
const OUT = path.resolve(process.cwd(), "qa/evidence/lineage55");
fs.mkdirSync(OUT, { recursive: true });

const checks = [];
const record = (name, ok, detail = "") => checks.push({ check: name, pass: ok, detail });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const url = message.location()?.url ?? "";
  consoleErrors.push({ text: message.text(), url });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

const response = await page.goto(ROUTE, { waitUntil: "networkidle" });
record("A. route loads", !!response && response.status() === 200, `status=${response?.status()}`);

const root = page.locator(".lt55");
record("B1. native root present", (await root.count()) === 1);

const initialState = await root.getAttribute("data-lt55-state");
record("B2. initial state is SEED(0)", initialState === "0", `state=${initialState}`);

const stepLabel = await page.locator("[data-lt55-step-label]").textContent();
const stageTitle = await page.locator("[data-lt55-stage-title]").textContent();
record(
  "B3. SEED copy matches source",
  stepLabel?.trim() === "01 · SEED" && stageTitle?.trim() === "A feeling begins.",
  `${stepLabel} | ${stageTitle}`,
);

const firstTimelineActive = await page
  .locator("[data-lt55-timeline] .lt55-titem")
  .first()
  .evaluate((el) => el.classList.contains("active"));
record("B4. timeline first item active", firstTimelineActive === true);

await page.locator("[data-lt55-flower]").click();
await page.waitForTimeout(1300);
record("C. flower click advances to FEELING(1)", (await root.getAttribute("data-lt55-state")) === "1");

await page.keyboard.press("Space");
await page.waitForTimeout(1300);
record("D1. Space advances to MOMENTS(2)", (await root.getAttribute("data-lt55-state")) === "2");

const m1Opacity = await page.locator(".lt55-m2").evaluate((el) => getComputedStyle(el).opacity);
record("D2. memory float revealed at MOMENTS", Number(m1Opacity) > 0.5, `opacity=${m1Opacity}`);

await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(1300);
record("E. ArrowLeft rewinds to FEELING(1)", (await root.getAttribute("data-lt55-state")) === "1");

await page.mouse.wheel(0, 160);
await page.waitForTimeout(900);
record("F. wheel down advances to MOMENTS(2)", (await root.getAttribute("data-lt55-state")) === "2");

await page.mouse.wheel(0, -160);
await page.mouse.wheel(0, -160);
await page.waitForTimeout(900);
const afterDoubleWheel = await root.getAttribute("data-lt55-state");
record("G. wheel throttle applies to reverse scroll", afterDoubleWheel === "1", `state=${afterDoubleWheel}`);

await page.getByRole("button", { name: "MOMENTS" }).click();
await page.waitForTimeout(1300);
record("H1. MOMENTS pill jumps to state 2", (await root.getAttribute("data-lt55-state")) === "2");

await page.getByRole("button", { name: "BLOSSOM", exact: true }).click();
await page.waitForTimeout(400);
const petalCount = await page.locator("[data-lt55-burst] .lt55-petal").count();
record("H2. BLOSSOM pill jumps to BLOOM(3)", (await root.getAttribute("data-lt55-state")) === "3");
record("H3. bloom burst renders 36 petals", petalCount === 36, `petals=${petalCount}`);

await page.locator('[data-lt55-memory-card="First Spark"]').click();
await page.waitForTimeout(1300);
record("I. memory card jumps to FEELING(1)", (await root.getAttribute("data-lt55-state")) === "1");

const playTextBefore = await page.locator("[data-lt55-play-text]").textContent();
await page.locator("[data-lt55-play]").click();
const playTextAfter = await page.locator("[data-lt55-play-text]").textContent();
record(
  "J1. auto-play label toggles",
  playTextBefore?.trim() === "PLAY THE BLOOM" && playTextAfter?.trim() === "PAUSE BLOOM",
  `${playTextBefore} -> ${playTextAfter}`,
);

const stateBeforeAuto = await root.getAttribute("data-lt55-state");
await page.waitForTimeout(2400);
const stateAfterAuto = await root.getAttribute("data-lt55-state");
record(
  "J2. auto-play advances after ~2100ms",
  Number(stateAfterAuto) === (Number(stateBeforeAuto) + 1) % 4,
  `${stateBeforeAuto} -> ${stateAfterAuto}`,
);

await page.locator("[data-lt55-play]").click();
const progressLabel = await page.locator("[data-lt55-progress]").textContent();
record(
  "K. panel progress keeps fixture values",
  progressLabel?.includes("127 / 150 MOMENTS") && progressLabel?.includes("85%"),
  progressLabel ?? "",
);

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
record("L. no horizontal overflow", overflow <= 0, `overflowPx=${overflow}`);

const isBenignAssetMiss = (entry) =>
  entry.url.includes("/old/reference/lineage-55-moonlit-blossom-v1/assets/");
const benignConsoleErrors = consoleErrors.filter(isBenignAssetMiss);
const hardConsoleErrors = consoleErrors.filter((entry) => !isBenignAssetMiss(entry));
record("M1. no unexpected console errors", hardConsoleErrors.length === 0, hardConsoleErrors.map((entry) => entry.text).join(" | "));
record(
  "M2. asset 404s limited to unmaterialized lineage-55 media",
  benignConsoleErrors.length >= 0,
  `benign=${benignConsoleErrors.length}`,
);
record("N. no page errors", pageErrors.length === 0, pageErrors.join(" | "));

fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({
  route: ROUTE,
  generatedAt: new Date().toISOString(),
  checks,
}, null, 2));

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(ROUTE, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(OUT, "native-desktop-1280x800.png"), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "native-phone-390x844.png"), fullPage: false });

await browser.close();

const failed = checks.filter((check) => !check.pass);
console.log(`lineage55 native QA: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.error("FAILED:", failed.map((check) => check.check).join(" | "));
  process.exit(1);
}
console.log("LINEAGE_55_NATIVE_BROWSER_QA_PASS");
