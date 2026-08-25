import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.SOURCE56_QA_URL || process.env.LOVETREE_QA_BASE_URL || "http://127.0.0.1:3000";
const ROUTE = "/design-lab/lineages/53/53-v3-vertical-network-overview";
const OUT = "qa/evidence/lineage-53-source56";

function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
  return errors;
}

async function openRoute(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 800 },
    isMobile: options.isMobile || false,
    hasTouch: options.hasTouch || false,
    reducedMotion: options.reducedMotion,
  });
  const page = await context.newPage();
  const errors = watchErrors(page);
  const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Source56 route HTTP ${response?.status()}`);
  await page.locator('[data-network-mode="OVERVIEW"]').waitFor();
  return { context, page, errors };
}

async function healthy(page, errors, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
  assert.deepEqual(errors, [], `${label}: browser errors ${errors.join(" | ")}`);
  assert.equal(await page.locator("[data-network-moment-id]").count(), 133, `${label}: Moment node count`);
  assert.equal(await page.locator('.s56-legend button[aria-pressed]').count(), 6, `${label}: route-family controls`);
  assert.equal(await page.locator('.s56-stage').count(), 1, `${label}: full viewport network stage`);
}

async function viewportShot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function firstReveal(page) {
  await page.locator('[data-network-moment-id="m-first"]').click();
  await page.locator('[data-network-mode="FIRST · 01/02/03 REVEAL"]').waitFor();
  await page.getByText(/01·02·03의 복수 Primary path가 함께 reveal/).waitFor();
  assert.equal(await page.locator('.s56-hub.reveal').count(), 3, "exactly 01/02/03 family hubs revealed");
  assert.ok(await page.locator('.s56-edge.reveal').count() > 12, "major route primary edges are spatially revealed, not only origin edges");
}

async function focusFamily(page, familyNumber, familyLabel) {
  const button = page.getByRole("button", { name: new RegExp(`^0${familyNumber} ${familyLabel}`) }).first();
  await button.click();
  assert.equal(await button.getAttribute("aria-pressed"), "true");
  await page.getByText(new RegExp(`0${familyNumber} ${familyLabel} · .*Primary path`), { exact: false }).first().waitFor();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    // Desktop: explicit viewport screenshots for all five visual audit states.
    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 1280, height: 800 } });
      try {
        await healthy(page, errors, "desktop initial");
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').count(), 0, "initial overview has no selected Moment");
        assert.ok(await page.getByText(/OVERVIEW · First Moment를 선택하면/).isVisible(), "initial pacing is overview-first");
        await viewportShot(page, "desktop-1280x800-01-initial-overview");

        await firstReveal(page);
        await viewportShot(page, "desktop-1280x800-02-first-reveal");

        await focusFamily(page, 2, "무대와 퍼포먼스");
        assert.equal(await page.getByRole("button", { name: /^주경로 [A-D] 따라가기$/ }).count(), 4, "family 02 exposes four primary paths");
        await viewportShot(page, "desktop-1280x800-03-family02-focus");

        await page.getByRole("button", { name: "주경로 A 따라가기" }).click();
        await page.getByRole("dialog", { name: "Branch choice" }).waitFor({ timeout: 5000 });
        await viewportShot(page, "desktop-1280x800-04-branch-choice");

        await page.getByRole("button", { name: /Secondary branch 선택/ }).click();
        await page.locator('.s56-inspector.open').waitFor();
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').count(), 1, "single selected Moment authority after branch choice");
        assert.ok(await page.getByText(/WHY NEXT · Connection/).isVisible(), "selected inspector preserves WHY NEXT");
        await viewportShot(page, "desktop-1280x800-05-selected-inspector");
        await healthy(page, errors, "desktop interactions");
      } finally { await context.close(); }
    }

    // Mobile 390×844: network remains first viewport and interaction stays spatial.
    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        await healthy(page, errors, "mobile initial");
        await viewportShot(page, "mobile-390x844-01-initial-overview");
        await page.locator('[data-network-moment-id="m-first"]').tap();
        await page.locator('[data-network-mode="FIRST · 01/02/03 REVEAL"]').waitFor();
        await viewportShot(page, "mobile-390x844-02-first-reveal");
        await page.getByRole("button", { name: /^03 콘텐츠 탐색/ }).tap();
        await page.locator('[data-network-mode="PATH FAMILY FOCUS"]').waitFor();
        await viewportShot(page, "mobile-390x844-03-family03-focus");
        await page.locator('[data-network-moment-id="m03-p1-1"]').tap();
        await page.locator('.s56-inspector.open').waitFor();
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').count(), 1, "mobile single selected Moment");
        await viewportShot(page, "mobile-390x844-04-selected-moment");
        await healthy(page, errors, "mobile interactions");
      } finally { await context.close(); }
    }

    // Narrow 320×720.
    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });
      try {
        await viewportShot(page, "narrow-320x720-01-initial-overview");
        await page.locator('[data-network-moment-id="m-first"]').tap();
        await page.locator('[data-network-mode="FIRST · 01/02/03 REVEAL"]').waitFor();
        await viewportShot(page, "narrow-320x720-02-first-reveal");
        await page.locator('[data-network-moment-id="m02-p1-1"]').tap();
        await page.locator('.s56-inspector.open').waitFor();
        await viewportShot(page, "narrow-320x720-03-selected-moment");
        await healthy(page, errors, "narrow interactions");
      } finally { await context.close(); }
    }

    // Keyboard focus follows the one canonical selected Moment authority.
    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 1280, height: 800 } });
      try {
        const first = page.locator('[data-network-moment-id="m-first"]');
        await first.focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("ArrowDown");
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').count(), 1, "keyboard selection stays singular");
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-network-moment-id") !== null), true, "keyboard focus follows network selection");
        await healthy(page, errors, "keyboard selection");
      } finally { await context.close(); }
    }

    // Reduced motion: no auto advance; family/path and branch choice remain manual.
    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      try {
        await page.locator('[data-reduced-motion="true"]').waitFor();
        await viewportShot(page, "reduced-390x844-01-initial-overview");
        await page.getByRole("button", { name: /^01 처음 빠져든 순간/ }).tap();
        await page.getByRole("button", { name: "주경로 A 따라가기" }).tap();
        const firstSelected = await page.locator('[data-network-moment-id][aria-pressed="true"]').getAttribute("data-network-moment-id");
        await page.waitForTimeout(1000);
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').getAttribute("data-network-moment-id"), firstSelected, "reduced motion does not auto advance");
        await page.getByRole("button", { name: "수동 한 단계 →" }).tap();
        await viewportShot(page, "reduced-390x844-02-manual-path-navigation");
        await page.getByRole("button", { name: "수동 한 단계 →" }).tap();
        await page.getByRole("dialog", { name: "Branch choice" }).waitFor();
        await viewportShot(page, "reduced-390x844-03-manual-branch-choice");
        await page.getByRole("button", { name: /Secondary branch 선택/ }).tap();
        assert.equal(await page.locator('[data-network-moment-id][aria-pressed="true"]').count(), 1, "reduced-motion branch selection keeps one selected Moment");
        await healthy(page, errors, "reduced motion manual semantics");
      } finally { await context.close(); }
    }

    console.log("SOURCE56_LINEAGE53_BROWSER_SMOKE_PASS");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
