import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.LINEAGE59_BASE_URL || "http://127.0.0.1:3159";
const ROUTE = `${BASE}/design-lab/lineages/59/v5`;
const EXPECTED_SHA256 = "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71";
const OUT_DIR = new URL("../qa/evidence/lineage-59/", import.meta.url);

async function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = await captureErrors(page);
  const response = await page.goto(ROUTE, { waitUntil: "networkidle", timeout: 45000 });
  assert.ok(response?.ok(), `Lineage 59 V5 route HTTP ${response?.status()}`);
  await page.locator(".lt59-book").waitFor({ timeout: 20000 });
  return { page, errors };
}

async function assertStaticFidelity(page, label) {
  assert.match(await page.locator(".lt59-runner__mode").innerText(), /NATIVE FIDELITY REVIEW — LIVING MEMORY BOOK V5/);
  assert.match(await page.locator(".lt59-runner__meta").innerText(), /17,192,064/);
  assert.equal(await page.locator(".lt59-runner__hash code").innerText(), EXPECTED_SHA256);
  assert.match(await page.locator(".lt59-book__page-title").innerText(), /처음 멈춰 본 장면/);
  assert.equal(await page.locator(".lt59-book__page-num").innerText(), "1 / 7", `${label}: first page of seven`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    book: document.querySelector(".lt59-book")?.scrollWidth - document.querySelector(".lt59-book")?.clientWidth,
  }));
  assert.ok((overflow.document ?? 0) <= 1, `${label}: outer document horizontal overflow ${overflow.document}px`);
  assert.ok((overflow.book ?? 0) <= 1, `${label}: book horizontal overflow ${overflow.book}px`);
}

async function assertStoryControls(page) {
  await page.getByRole("button", { name: /Story ON|Play Story|Resume Story/ }).click();
  await page.locator(".lt59-book__story-status").waitFor({ timeout: 5000 });
  const status = await page.locator(".lt59-book__story-status").innerText();
  assert.match(status, /Reading moment|WHY NEXT|Turning|Arriving/, `Story status visible: ${status}`);
}

async function assertOverlaySemantics(page, label) {
  await page.getByRole("button", { name: "Open index" }).click();
  const dialog = page.getByRole("dialog", { name: "Moment Index" });
  await dialog.waitFor({ timeout: 5000 });
  assert.ok(await dialog.isVisible(), `${label}: index dialog visible`);
  assert.equal(await dialog.getAttribute("aria-modal"), "true", `${label}: index dialog aria-modal`);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 5000 });
}

async function assertKeyboardNav(page) {
  await page.keyboard.press("ArrowRight");
  await page.locator(".lt59-book__page-num").filter({ hasText: "2 / 7" }).waitFor({ timeout: 5000 });
}

async function assertInlineEdit(page) {
  await page.getByRole("button", { name: "Edit moment", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit moment" });
  await dialog.waitFor({ timeout: 5000 });
  await dialog.getByLabel("Title", { exact: true }).fill("수정된 첫 순간");
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await page.locator(".lt59-book__page-title").filter({ hasText: "수정된 첫 순간" }).waitFor({ timeout: 5000 });
}

async function assertBranchChoice(page) {
  await page.locator(".lt59-book__ds-select").selectOption("branch");
  await page.locator(".lt59-book__page-title").first().waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Story ON|Play Story|Resume Story/ }).click();
  const branchDialog = page.getByRole("dialog", { name: "Branch choice" });
  await branchDialog.waitFor({ timeout: 30000 });
  const choiceCount = await branchDialog.getByRole("button").count();
  assert.equal(choiceCount, 2, "Branch offers exactly 2 explicit choices");
  await branchDialog.getByRole("button").first().click();
  await branchDialog.waitFor({ state: "detached", timeout: 10000 });
}

test("Lineage 59 V5 desktop 1280x800 static + interaction QA", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    await assertStaticFidelity(page, "desktop");
    await assertNoHorizontalOverflow(page, "desktop");
    await assertStoryControls(page);
    await assertKeyboardNav(page);
    await assertOverlaySemantics(page, "desktop");
    await assertInlineEdit(page);
    assert.deepEqual(errors, [], `desktop console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 branch auto-pause with explicit choices", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    await assertBranchChoice(page);
    assert.deepEqual(errors, [], `branch console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 mobile 390x844 single-page QA", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 390, height: 844 });
    await page.locator(".lt59-book").waitFor({ timeout: 15000 });
    await assertNoHorizontalOverflow(page, "mobile-390");
    await page.keyboard.press("ArrowRight");
    await page.locator(".lt59-book__page-num").filter({ hasText: "2 / 7" }).waitFor({ timeout: 5000 });
    assert.deepEqual(errors, [], `mobile-390 console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 narrow 320x720 no-overflow QA", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 320, height: 720 });
    await assertNoHorizontalOverflow(page, "narrow-320");
    await page.keyboard.press("ArrowRight");
    await page.locator(".lt59-book__page-num").filter({ hasText: "2 / 7" }).waitFor({ timeout: 5000 });
    assert.deepEqual(errors, [], `narrow-320 console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 reduced-motion semantic parity", async () => {
  const browser = await chromium.launch();
  try {
    const { page } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
    await page.locator(".lt59-book.is-reduced-motion").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Story ON|Play Story|Resume Story/ }).click();
    const status = await page.locator(".lt59-book__story-status").innerText();
    assert.ok(status.length > 0, "reduced-motion Story still exposes semantic status");
    await page.keyboard.press("ArrowRight");
    await page.locator(".lt59-book__page-num").filter({ hasText: "2 / 7" }).waitFor({ timeout: 5000 });
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 desktop screenshots for visual review", async () => {
  const browser = await chromium.launch();
  try {
    await mkdir(OUT_DIR, { recursive: true });
    for (const [label, viewport] of [
      ["desktop-1280x800", { width: 1280, height: 800 }],
      ["mobile-390x844", { width: 390, height: 844 }],
      ["narrow-320x720", { width: 320, height: 720 }],
    ]) {
      const { page } = await openRoute(browser, viewport);
      await page.screenshot({ path: new URL(`${label}.png`, OUT_DIR).pathname, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});