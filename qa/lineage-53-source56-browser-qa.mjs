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
  await page.getByRole("heading", { name: "Vertical Moment Network Overview" }).waitFor();
  return { context, page, errors };
}

async function healthy(page, errors, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
  assert.deepEqual(errors, [], `${label}: browser errors ${errors.join(" | ")}`);
  assert.equal(await page.locator("[data-network-moment-id]").count(), 31, `${label}: Moment node count`);
  assert.equal(await page.getByRole("button", { name: /^0[1-6] / }).count(), 6, `${label}: route-family controls`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const viewports = [
      { label: "desktop-1280x800", viewport: { width: 1280, height: 800 } },
      { label: "mobile-390x844", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      { label: "narrow-320x720", viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true },
    ];
    for (const spec of viewports) {
      const { context, page, errors } = await openRoute(browser, spec);
      try {
        await healthy(page, errors, spec.label);
        await page.screenshot({ path: `${OUT}/${spec.label}.png`, fullPage: true });
      } finally { await context.close(); }
    }

    {
      const { context, page, errors } = await openRoute(browser);
      try {
        await page.locator('[data-network-moment-id="m-first"]').click();
        await page.getByText(/01·02·03 주요 경로가 함께 펼쳐진 상태/).waitFor();
        const family = page.getByRole("button", { name: /^02 무대와 퍼포먼스$/ });
        await family.click();
        assert.equal(await family.getAttribute("aria-pressed"), "true");
        await page.getByRole("button", { name: "연습실 짧은 영상" }).click();
        await page.getByRole("heading", { name: "연습실 짧은 영상" }).waitFor();
        assert.match(await page.getByText(/완성된 무대 이전의 과정/).first().innerText(), /과정/);

        await page.getByRole("button", { name: "키보드용 Moment 목록 열기" }).click();
        const selected = page.locator('[role="option"][aria-selected="true"]');
        await selected.focus();
        await page.keyboard.press("ArrowDown");
        assert.equal(await page.locator('[role="option"][aria-selected="true"]').count(), 1, "single selected Moment authority");
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role")), "option", "keyboard focus follows selection");
        await page.screenshot({ path: `${OUT}/desktop-family-focus-inspector.png`, fullPage: true });
        await healthy(page, errors, "desktop interaction");
      } finally { await context.close(); }
    }

    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        await page.getByRole("button", { name: /^03 콘텐츠 탐색$/ }).tap();
        await page.getByRole("button", { name: "팬이 올린 짧은 클립" }).tap();
        await page.getByRole("heading", { name: "팬이 올린 짧은 클립" }).waitFor();
        await healthy(page, errors, "touch parity");
      } finally { await context.close(); }
    }

    {
      const { context, page, errors } = await openRoute(browser, { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      try {
        await page.locator('[data-reduced-motion="true"]').waitFor();
        await page.getByRole("button", { name: /^01 처음 빠져든 순간$/ }).tap();
        await page.getByRole("button", { name: "처음 눈에 들어온 무대" }).tap();
        await page.getByRole("heading", { name: "처음 눈에 들어온 무대" }).waitFor();
        await page.getByRole("button", { name: "선택 경로 한 단계 이동" }).tap();
        await page.screenshot({ path: `${OUT}/narrow-reduced-motion.png`, fullPage: true });
        await healthy(page, errors, "reduced motion");
      } finally { await context.close(); }
    }

    console.log("SOURCE56_LINEAGE53_BROWSER_SMOKE_PASS");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
