// MVP entry flow smoke QA (issue #318).
//
// Proves the integrated demo journey end-to-end against a built app server:
//   /v4/entry (Moonlit Blossom first screen) → click ENTER MY TREE →
//   /v4/trees/demo/graph editor reached, console errors 0.
//
// Run: V4_BASE_URL=http://127.0.0.1:3000 node qa/mvp-entry-flow-smoke.mjs
// Evidence artifacts land under qa/evidence/mvp-entry-flow/ (uncommitted).

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const ENTRY_ROUTE = `${BASE}/v4/entry`;
const EDITOR_PATH = "/v4/trees/demo/graph";
const OUT = path.resolve(process.cwd(), "qa/evidence/mvp-entry-flow");
fs.mkdirSync(OUT, { recursive: true });

const checks = [];
const record = (name, ok, detail = "") => checks.push({ check: name, pass: ok, detail });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(`${message.text()} @ ${message.location()?.url ?? ""}`);
  }
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

// Step 1 — first screen loads.
const response = await page.goto(ENTRY_ROUTE, { waitUntil: "networkidle" });
record("A. entry route loads", !!response && response.status() === 200, `status=${response?.status()}`);

record("B1. Moonlit Blossom first screen rendered", (await page.locator(".lt55").count()) === 1);
const stepLabel = await page.locator("[data-lt55-step-label]").textContent();
record(
  "B2. first screen starts at SEED",
  stepLabel?.trim() === "01 · SEED",
  stepLabel ?? "",
);

const enterMyTree = page.locator(".lt55-pill.primary", { hasText: "ENTER MY TREE" });
record("C. ENTER MY TREE pill visible", (await enterMyTree.count()) === 1);

await page.screenshot({ path: path.join(OUT, "entry-first-screen.png"), fullPage: false });

// Step 2 — single click navigates to the graph editor.
await enterMyTree.click();
await page.waitForURL(`**${EDITOR_PATH}`, { timeout: 15000 });
record("D. navigation to graph editor", page.url().endsWith(EDITOR_PATH), page.url());

// Step 3 — editor reached and healthy.
await page.waitForSelector(".v4-freegraph-page", { timeout: 15000 });
const heading = await page.locator(".v4-freegraph-heading strong").textContent();
record(
  "E. graph editor rendered",
  heading?.includes("자유 연결 그래프") === true,
  heading ?? "",
);

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
record("F. no horizontal overflow on editor", overflow <= 0, `overflowPx=${overflow}`);

await page.screenshot({ path: path.join(OUT, "graph-editor.png"), fullPage: false });

record("G. no console errors across the flow", consoleErrors.length === 0, consoleErrors.join(" | "));
record("H. no page errors across the flow", pageErrors.length === 0, pageErrors.join(" | "));

fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({
  entryRoute: ENTRY_ROUTE,
  editorPath: EDITOR_PATH,
  generatedAt: new Date().toISOString(),
  checks,
}, null, 2));

await browser.close();

const failed = checks.filter((check) => !check.pass);
console.log(`mvp entry flow smoke: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) {
  console.error("FAILED:", failed.map((check) => check.check).join(" | "));
  process.exit(1);
}
console.log("MVP_ENTRY_FLOW_SMOKE_PASS");
