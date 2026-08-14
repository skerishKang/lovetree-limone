import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || process.env.LOVETREE_QA_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/lineages/61/61-v1-9`;
const EVIDENCE_DIR = path.resolve("test-results/track-61-guided-next-moment-builder");

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, scenario, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: scenario.height },
    isMobile: scenario.mobile === true,
    hasTouch: scenario.mobile === true,
    reducedMotion,
  });
  const page = await context.newPage();
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `${scenario.label}: route HTTP ${response?.status()}`);
  await page.getByRole("heading", { name: "Guided Next Moment LoveTree Builder" }).waitFor();
  return { context, page, errors };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert.ok(overflow.document <= 1, `${label}: document horizontal overflow ${overflow.document}px`);
  assert.ok(overflow.body <= 1, `${label}: body horizontal overflow ${overflow.body}px`);
}

async function activate(locator, touch) {
  if (touch) await locator.tap();
  else await locator.click();
}

async function assertRepresentativeGrammar(page, label) {
  const choices = page.locator("[data-representative-kind]");
  assert.equal(await choices.count(), 3, `${label}: exactly three representative choices`);
  const kinds = await choices.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-representative-kind")));
  assert.deepEqual(new Set(kinds), new Set(["same-subject", "different-subject", "format-shift"]), `${label}: semantic 3-way grammar`);
  for (const kind of kinds) assert.ok(kind, `${label}: representative kind present`);
  assert.equal(await page.locator("[data-demo-media-preview]").count(), 3, `${label}: three demo media previews are explicit`);
}

async function exerciseFilter(page, label, touch) {
  const toggle = page.getByRole("button", { name: /추천 풀 펼치기/ });
  await activate(toggle, touch);
  const travel = page.getByRole("button", { name: "travel", exact: true });
  await activate(travel, touch);
  const travelItems = page.locator('[data-pool-theme="travel"]');
  assert.ok(await travelItems.count() >= 1, `${label}: travel filter yields candidates`);
  const visiblePool = page.locator("[data-pool-candidate]:visible");
  assert.equal(await visiblePool.count(), await travelItems.count(), `${label}: filter narrows the visible pool`);
  await activate(page.getByRole("button", { name: "all", exact: true }), touch);
  await activate(page.getByRole("button", { name: /추천 풀 닫기/ }), touch);
}

async function selectAndInspect(page, label, touch, kind) {
  const choice = page.locator(`[data-representative-kind="${kind}"]`);
  await activate(choice, touch);
  const textarea = page.getByLabel(/WHY NEXT/);
  await textarea.waitFor();
  assert.ok((await textarea.inputValue()).length > 0, `${label}: suggested WHY NEXT is editable and prefilled`);
  await textarea.fill(`${label} edited WHY NEXT`);

  const detailTrigger = page.getByRole("button", { name: "선택 후보 상세보기" });
  await activate(detailTrigger, touch);
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.getByRole("heading", { name: /미디어 미리보기/ }).count(), 1, `${label}: media preview panel`);
  assert.equal(await dialog.getByRole("heading", { name: /추천 근거/ }).count(), 1, `${label}: recommendation reason panel`);
  assert.equal(await dialog.getByRole("heading", { name: /팬 반응/ }).count(), 1, `${label}: fan reaction panel`);
  assert.equal(await dialog.getByRole("heading", { name: /상세/ }).count(), 1, `${label}: detail panel`);
  await page.waitForFunction(() => document.activeElement?.textContent?.includes("닫기"));
  await page.keyboard.press("Tab");
  assert.equal(await dialog.evaluate((node) => node.contains(document.activeElement)), true, `${label}: focus remains inside dialog`);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0, `${label}: Escape closes dialog`);
  assert.equal(await detailTrigger.evaluate((node) => document.activeElement === node), true, `${label}: focus restores to trigger`);
  return textarea;
}

async function exerciseJourney(page, scenario) {
  const { label, mobile } = scenario;
  await assertRepresentativeGrammar(page, label);
  await assertNoHorizontalOverflow(page, label);
  await exerciseFilter(page, label, mobile);

  let textarea = await selectAndInspect(page, label, mobile, "same-subject");
  await textarea.fill(`${label} main WHY NEXT`);
  await activate(page.getByRole("button", { name: "이 Moment로 내 나무 키우기" }), mobile);
  await page.getByRole("status").filter({ hasText: /Main으로 연결/ }).waitFor();
  assert.ok(await page.locator('[aria-current="step"]').count() >= 1, `${label}: Story Path updates current node`);

  await assertRepresentativeGrammar(page, `${label}/after-main`);
  textarea = await selectAndInspect(page, `${label}/branch`, mobile, "different-subject");
  await page.getByRole("radio", { name: /Branch/ }).check();
  await textarea.fill(`${label} branch WHY NEXT`);
  await activate(page.getByRole("button", { name: "이 Moment로 내 나무 키우기" }), mobile);
  await page.getByRole("status").filter({ hasText: /Branch으로 연결|Branch로 연결/ }).waitFor();
  assert.ok(await page.getByText(/Branch ·/).count() >= 1, `${label}: Branch is materially represented in Story Path`);

  // Continue from the branch's current node into another Moment.
  await assertRepresentativeGrammar(page, `${label}/branch-continuation`);
  textarea = await selectAndInspect(page, `${label}/branch-continuation`, mobile, "format-shift");
  await textarea.fill(`${label} branch continuation WHY NEXT`);
  await activate(page.getByRole("button", { name: "이 Moment로 내 나무 키우기" }), mobile);
  await page.getByRole("status").filter({ hasText: /Main으로 연결/ }).waitFor();
  assert.ok(await page.locator('[aria-current="step"]').count() >= 1, `${label}: branch continuation becomes new current node`);
  await assertNoHorizontalOverflow(page, `${label}/final`);
}

async function screenshot(page, name) {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${name}.png`), fullPage: false });
}

test("Track61 V1.7 — desktop/mobile/narrow actual-route interaction contract", { timeout: 180000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of [
      { label: "1280x800", width: 1280, height: 800, mobile: false },
      { label: "390x844", width: 390, height: 844, mobile: true },
      { label: "320x720", width: 320, height: 720, mobile: true },
    ]) {
      const { context, page, errors } = await openRoute(browser, scenario);
      try {
        await exerciseJourney(page, scenario);
        await screenshot(page, `${scenario.label}-journey`);
        assert.deepEqual(errors, [], `${scenario.label}: no page/console errors: ${errors.join(" | ")}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("Track61 V1.7 — reduced motion preserves the semantic builder flow", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  const scenario = { label: "390x844-reduced", width: 390, height: 844, mobile: true };
  try {
    const { context, page, errors } = await openRoute(browser, scenario, "reduce");
    try {
      assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
      await assertRepresentativeGrammar(page, scenario.label);
      const choice = page.locator('[data-representative-kind="same-subject"]');
      await choice.tap();
      const textarea = page.getByLabel(/WHY NEXT/);
      await textarea.fill("reduced motion WHY NEXT");
      await page.getByRole("button", { name: "이 Moment로 내 나무 키우기" }).tap();
      await page.getByRole("status").filter({ hasText: /Main으로 연결/ }).waitFor();
      await assertNoHorizontalOverflow(page, scenario.label);
      await screenshot(page, "390x844-reduced-motion");
      assert.deepEqual(errors, [], `reduced motion: no page/console errors: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
