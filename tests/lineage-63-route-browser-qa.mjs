import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.LOVETREE_QA_BASE_URL || process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const URL = `${BASE}/design-lab/lineages/63`;
const OUTPUT = "test-results/lineage-63-native";

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 63 route HTTP ${response?.status()}`);
  await page.locator("h1:has-text('MOMENT FIELD 3D VIEW STUDIO')").waitFor({ timeout: 15000 });
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

async function run() {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    console.log("1. Desktop 1280x800 Initial Studio & Preset Switching QA...");
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 });
      await assertNoHorizontalOverflow(page, "Desktop 1280x800");

      // Verify Studio hierarchy
      const presetButtons = page.locator("button:has-text('3D Single Ring Orbit')");
      await assert.ok(await presetButtons.count() > 0, "Preset buttons must be present");

      // Initial screenshot
      await page.screenshot({ path: `${OUTPUT}/01-desktop-1280x800-initial.png` });

      // Click another preset: 'Heart Petal Formation'
      const heartPreset = page.locator("button:has-text('Heart Petal Formation')");
      if (await heartPreset.count() > 0) {
        await heartPreset.first().click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUTPUT}/02-desktop-symbolic-heart.png` });
      }

      // Switch Seed Set to 'romantic'
      const romanticSeed = page.locator("button:has-text('로맨틱 모먼트')");
      if (await romanticSeed.count() > 0) {
        await romanticSeed.first().click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${OUTPUT}/03-desktop-seed-romantic.png` });
      }

      // Open Inspector tab 'style'
      const styleTab = page.locator("button:has-text('style')");
      if (await styleTab.count() > 0) {
        await styleTab.first().click();
        await page.waitForTimeout(100);
      }

      // Click Save View button
      const saveBtn = page.locator("button:has-text('SAVE VIEW')");
      await saveBtn.first().click();
      await page.waitForTimeout(200);

      // Verify Save Modal is visible
      const modal = page.locator("h2:has-text('Save Custom View Preset')");
      assert.ok(await modal.isVisible(), "Save View modal must open");
      await page.screenshot({ path: `${OUTPUT}/04-desktop-save-view-modal.png` });

      // Close modal
      const cancelBtn = page.locator("button:has-text('CANCEL')");
      await cancelBtn.click();
      await page.waitForTimeout(100);

      assert.equal(errors.length, 0, `Desktop console/page errors: ${errors.join(", ")}`);
      await context.close();
    }

    console.log("2. Mobile 390x844 Touch & Drawer QA...");
    {
      const { context, page, errors } = await openRoute(browser, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
      await assertNoHorizontalOverflow(page, "Mobile 390x844");

      await page.screenshot({ path: `${OUTPUT}/05-mobile-390x844-initial.png` });

      // Click Mobile Drawer tab 'PRESETS'
      const presetTab = page.locator("nav button:has-text('PRESETS')");
      if (await presetTab.count() > 0) {
        await presetTab.first().click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${OUTPUT}/06-mobile-390x844-presets.png` });
      }

      // Click Mobile Drawer tab 'INSPECTOR'
      const inspectorTab = page.locator("nav button:has-text('INSPECTOR')");
      if (await inspectorTab.count() > 0) {
        await inspectorTab.first().click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${OUTPUT}/07-mobile-390x844-inspector.png` });
      }

      assert.equal(errors.length, 0, `Mobile 390 console/page errors: ${errors.join(", ")}`);
      await context.close();
    }

    console.log("3. Small Mobile 320x720 QA...");
    {
      const { context, page, errors } = await openRoute(browser, { width: 320, height: 720 }, { isMobile: true, hasTouch: true });
      await assertNoHorizontalOverflow(page, "Mobile 320x720");

      await page.screenshot({ path: `${OUTPUT}/08-mobile-320x720-initial.png` });
      assert.equal(errors.length, 0, `Mobile 320 console/page errors: ${errors.join(", ")}`);
      await context.close();
    }

    console.log("4. Reduced Motion Mode QA...");
    {
      const { context, page, errors } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
      await page.screenshot({ path: `${OUTPUT}/09-desktop-reduced-motion.png` });
      assert.equal(errors.length, 0, `Reduced-motion console/page errors: ${errors.join(", ")}`);
      await context.close();
    }

    console.log("Lineage 63 Browser QA passed successfully!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Lineage 63 Browser QA failed:", err);
  process.exit(1);
});
