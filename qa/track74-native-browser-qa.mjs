// Track74 V2 native browser QA — interaction-contract gate.
//
// Registered browser gate for the Design Fidelity inventory entry
// `track-74-v2-native` (scripts/design-fidelity-validation-inventory.mjs).
// The central Design Fidelity Validation matrix executes it through
// scripts/run-design-fidelity-target.mjs (`node --test`, tsx-enabled) after
// that runner has started and health-checked the app server, so this script
// connects to the running server by default (override: TRACK74_QA_URL).
// Intentionally lives OUTSIDE tests/*.test.mjs so it is never picked up by
// the shared A-track fail-closed browser corpus (Track67 gate precedent).
//
// Contract provenance: pinned V2 executable fcc7cad6… (#314 / PR #342),
// native port PR #355 under #344 owner decision 1 (Option A). Asserts the
// NATIVE interaction contract only:
//   1. candidate fruit-tree logo status stays explicit (data-logo-status)
//   2. no fabricated hrefs — every anchor target ∈ route-map authority
//      (lib/source-track-74/route-map.ts), including the inert mobile sheet
//   3. HOLD_UNRESOLVED entries render as non-anchor spans with a 보류 badge
//   4. desktop click-fixed nav opens/closes via trigger, outside click, Escape
//   5. live secure-pill link performs a real client-side navigation
//   6. mobile burger → sheet parity (inert/aria-hidden) + focus trap,
//      scrim and Escape close and restore focus to the burger
//   7. reduced-motion parity: entrance class released early, zero errors
// No synthetic state injection; every interaction uses real DOM events.
// Interaction contexts wait for the entrance sequence to release before
// driving the menu so assertions observe the settled UI, never mid-animation.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { SOURCE_TRACK_74_ROUTES } from "../lib/source-track-74/route-map.ts";

const BASE = process.env.TRACK74_QA_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/source-tracks/74/v2/native";
const URL = `${BASE}${ROUTE}`;
const OUT = path.resolve(process.cwd(), "qa-artifacts/track74-native");
fs.mkdirSync(OUT, { recursive: true });

const LIVE_HREFS = new Set(
  SOURCE_TRACK_74_ROUTES.filter((route) => route.repoRoute).map((route) => route.repoRoute),
);
const HOLD_LABELS = SOURCE_TRACK_74_ROUTES
  .filter((route) => route.classification === "HOLD_UNRESOLVED")
  .map((route) => route.label);
const NAV_LABEL = "LoveTree template menu";
const LOGO_STATUS = "candidate-fruit-tree-v2";

const checks = [];
const record = (vp, name, ok, detail = "") => checks.push({ viewport: vp, check: name, pass: ok, detail });

function attachErrorCollectors(page, bucket) {
  page.on("console", (message) => {
    if (message.type() === "error") bucket.push(`console:${message.text()}`);
  });
  page.on("pageerror", (error) => bucket.push(`page:${error.message}`));
}

async function collectAnchors(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: a.getAttribute("href"),
    })),
  );
}

async function overflowPx(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function holdBadgeLabels(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("span"))
      .filter((el) => el.querySelector("b")?.textContent === "보류")
      .map((el) => (el.textContent || "").replace("보류", "").trim()),
  );
}

async function navTriggers(page) {
  return page.locator(`ul[aria-label="${NAV_LABEL}"] > li > button`);
}

async function waitForCondition(fn, timeoutMs, intervalMs = 100) {
  const start = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/** Wait until the one-shot entrance class is released (settled UI). */
async function waitEntranceReleased(page, root, timeoutMs) {
  const initial = await root.getAttribute("class");
  return waitForCondition(async () => {
    const current = await root.getAttribute("class");
    return current !== null && current !== initial && current;
  }, timeoutMs);
}

async function runDesktop(browser) {
  const name = "desktop-1280x800";
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  attachErrorCollectors(page, errors);

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const root = page.locator("main[data-logo-status]");
    await root.waitFor({ timeout: 15000 });

    const logoStatus = await root.getAttribute("data-logo-status");
    record(name, "candidate fruit-tree logo status explicit", logoStatus === LOGO_STATUS, `status=${logoStatus}`);

    const overflow = await overflowPx(page);
    record(name, "horizontal overflow 0 on desktop viewport", overflow <= 1, `overflow=${overflow}px`);

    const anchors = await collectAnchors(page);
    const fabricated = anchors.filter((a) => !LIVE_HREFS.has(a.href));
    record(name, "no fabricated hrefs (all anchors ∈ route-map authority)", fabricated.length === 0,
      fabricated.slice(0, 3).map((a) => a.href).join(" | "));

    const badges = await holdBadgeLabels(page);
    const missingHolds = HOLD_LABELS.filter((label) => !badges.includes(label));
    record(name, "HOLD entries render as non-anchor 보류 spans", missingHolds.length === 0 && badges.length >= HOLD_LABELS.length,
      missingHolds.join(" | ") || `badges=${badges.length}`);

    const triggers = await navTriggers(page);
    record(name, "four route-group triggers render", (await triggers.count()) === 4, `count=${await triggers.count()}`);

    await waitEntranceReleased(page, root, 10000);
    const first = triggers.first();
    await first.click();
    const openedAfterClick = await waitForCondition(async () => (await first.getAttribute("aria-expanded")) === "true", 3000);
    record(name, "trigger click opens group panel", Boolean(openedAfterClick));

    const panelHrefVisible = await page
      .locator(`ul[aria-label="${NAV_LABEL}"] > li > div a`)
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    record(name, "opened panel exposes live link", panelHrefVisible);

    await page.keyboard.press("Escape");
    const closedAfterEscape = await waitForCondition(async () => (await first.getAttribute("aria-expanded")) === "false", 3000);
    record(name, "Escape closes open group", Boolean(closedAfterEscape));

    await first.click();
    await waitForCondition(async () => (await first.getAttribute("aria-expanded")) === "true", 3000);
    await page.mouse.click(640, 650);
    const closedAfterOutside = await waitForCondition(async () => (await first.getAttribute("aria-expanded")) === "false", 3000);
    record(name, "outside click closes open group", Boolean(closedAfterOutside));

    // The pill label duplicates the guide-group menu item ("64 · 첫 순간 심기");
    // the pill is the label's direct <section> child, panel links are nested
    // inside the nav list, so scope by structure to hit the pill itself.
    const pill = page.locator('section > a:has-text("첫 순간 심기")').first();
    const pillHref = await pill.getAttribute("href");
    record(name, "secure pill maps to live repoRoute", LIVE_HREFS.has(pillHref), `href=${pillHref}`);
    let navigated = false;
    let navDetail = "";
    try {
      await pill.click({ timeout: 10000 });
      await page.waitForURL(/\/design-lab\/lineages\/64\/v1-2-1\/?$/, { timeout: 20000 });
      navigated = true;
    } catch (error) {
      navDetail = String(error?.message ?? error).split("\n")[0];
    }
    record(name, "pill performs real navigation to mapped route", navigated, `url=${page.url()}${navDetail ? " err=" + navDetail : ""}`);

    record(name, "desktop console/page errors 0", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await context.close();
  }
}

async function runMobile(browser) {
  const name = "phone-390x844";
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  attachErrorCollectors(page, errors);

  // Nav group triggers also carry aria-expanded; the burger is the only
  // aria-expanded button that is a DIRECT child of the stage section.
  const burger = page.locator("section > button[aria-expanded]");
  const scrim = page.locator('button[aria-label="메뉴 닫기"]:not([aria-expanded])');
  const sheet = page.locator(`aside[aria-label="${NAV_LABEL}"]`);

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const root = page.locator("main[data-logo-status]");
    await root.waitFor({ timeout: 15000 });
    await waitEntranceReleased(page, root, 10000);

    const overflow = await overflowPx(page);
    record(name, "horizontal overflow 0 on phone viewport", overflow <= 1, `overflow=${overflow}px`);

    const sheetClosedState = await sheet.evaluate((el) => ({ inert: el.inert, hidden: el.getAttribute("aria-hidden") }));
    record(name, "sheet inert+hidden while closed", sheetClosedState.inert === true && sheetClosedState.hidden === "true",
      JSON.stringify(sheetClosedState));

    await burger.click();
    await waitForCondition(async () => (await burger.getAttribute("aria-expanded")) === "true", 3000);
    const openedState = await sheet.evaluate((el) => ({ inert: el.inert, hidden: el.getAttribute("aria-hidden") }));
    record(name, "burger opens sheet (inert/aria-hidden parity)", openedState.inert === false && openedState.hidden === "false",
      JSON.stringify(openedState));

    const focusInside = await sheet.evaluate((el) =>
      document.activeElement instanceof Element && el.contains(document.activeElement),
    );
    record(name, "initial focus moves inside sheet", focusInside);

    const focusables = await sheet.evaluate((el) =>
      el.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])').length,
    );
    record(name, "sheet exposes exactly the live links as focusables", focusables === LIVE_HREFS.size,
      `focusables=${focusables}, live=${LIVE_HREFS.size}`);
    if (focusables >= 2) {
      await sheet.evaluate((el) => {
        const items = el.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
        items[items.length - 1].focus();
      });
      await page.keyboard.press("Tab");
      const wrappedToFirst = await page.evaluate((navLabel) => {
        const sheetEl = document.querySelector(`aside[aria-label="${navLabel}"]`);
        const firstItem = sheetEl.querySelector('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
        return document.activeElement === firstItem;
      }, NAV_LABEL);
      record(name, "Tab from last wraps to first (focus trap)", wrappedToFirst);

      await page.keyboard.press("Shift+Tab");
      const wrappedToLast = await sheet.evaluate((el) => {
        const items = el.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
        return document.activeElement === items[items.length - 1];
      });
      record(name, "Shift+Tab from first wraps to last (focus trap)", wrappedToLast);
    }

    // The sheet panel overlays part of the scrim; tap the scrim corner a real
    // user would hit (sheet-free area) rather than the geometric center.
    await scrim.click({ position: { x: 8, y: 8 } });
    await waitForCondition(async () => (await burger.getAttribute("aria-expanded")) === "false", 3000);
    const closedByScrim = await sheet.evaluate((el) => ({ inert: el.inert, hidden: el.getAttribute("aria-hidden") }));
    const focusRestored = await page.evaluate(() =>
      document.activeElement instanceof Element &&
      document.activeElement.getAttribute("aria-expanded") === "false",
    );
    record(name, "scrim click closes sheet", closedByScrim.inert === true && closedByScrim.hidden === "true",
      JSON.stringify(closedByScrim));
    record(name, "focus returns to burger after close", focusRestored);

    await burger.click();
    await waitForCondition(async () => (await burger.getAttribute("aria-expanded")) === "true", 3000);
    await page.keyboard.press("Escape");
    const closedByEscape = await waitForCondition(async () => (await burger.getAttribute("aria-expanded")) === "false", 3000);
    record(name, "Escape closes mobile menu", Boolean(closedByEscape));

    record(name, "mobile console/page errors 0", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await context.close();
  }
}

async function runReducedMotion(browser) {
  const name = "reduced-motion-desktop";
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  attachErrorCollectors(page, errors);

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const root = page.locator("main[data-logo-status]");
    await root.waitFor({ timeout: 15000 });

    const released = await waitEntranceReleased(page, root, 2500);
    record(name, "entrance class released early under reduced motion", Boolean(released));

    await page.waitForTimeout(500);
    const overflow = await overflowPx(page);
    record(name, "reduced motion horizontal overflow 0", overflow <= 1, `overflow=${overflow}px`);
    record(name, "reduced motion console/page errors 0", errors.length === 0, errors.slice(0, 3).join(" | "));
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await runDesktop(browser);
    await runMobile(browser);
    await runReducedMotion(browser);
  } finally {
    await browser.close();
  }

  const failures = checks.filter((c) => !c.pass).length;
  fs.writeFileSync(
    path.join(OUT, "qa-results.json"),
    JSON.stringify({ summary: { checks: checks.length, failures }, results: checks }, null, 2),
  );
  console.log(`CHECKS: ${checks.length}, FAILURES: ${failures}`);
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.viewport}  ${c.check}${c.detail ? "  [" + c.detail + "]" : ""}`);
  }
  if (failures > 0) {
    console.error(`Track74 native QA had ${failures} failures`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
