import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.LINEAGE59_BASE_URL || "http://127.0.0.1:3160";
const ROUTE = `${BASE}/design-lab/lineages/59/v5`;
const EXPECTED_SHA256 = "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71";
const OUT_DIR = new URL(`${pathToFileURL(path.join(os.tmpdir(), "lovetree-qa-evidence", "lineage-59"))}/`);

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

/** Selects the branch dataset and runs the Story at 2× speed until the Branch dialog appears. */
async function reachBranchDialog(page, timeout = 40000) {
  await page.locator(".lt59-book__ds-select").selectOption("branch");
  await page.locator(".lt59-book[data-dataset='branch']").waitFor({ timeout: 10000 });
  const speedBtn = page.getByRole("button", { name: /Speed/ });
  await speedBtn.click();
  await speedBtn.click();
  await page.getByRole("button", { name: /Story ON|Play Story|Resume Story/ }).click();
  const dialog = page.getByRole("dialog", { name: "Branch choice" });
  await dialog.waitFor({ timeout });
  return dialog;
}

async function bookState(page) {
  return page.evaluate(() => {
    const book = document.querySelector(".lt59-book");
    if (!book) return null;
    return {
      momentId: book.getAttribute("data-moment-id"),
      index: Number(book.getAttribute("data-moment-index")),
      phase: book.getAttribute("data-story-phase"),
      playing: book.getAttribute("data-story-playing") === "true",
    };
  });
}

/**
 * Drives a horizontal page gesture with real PointerEvent dispatches.
 * `delayMs` between moves controls the measured velocity: short delay = flick,
 * long delay = slow drag over the exact same distance. The gesture is tracked
 * by the component's pointer handlers (curl appears mid-gesture) and the final
 * release is decided by `resolveDragCommit`.
 */
async function gestureShortDistance(page, { delayMs, sampleMid }) {
  const box = await page.locator(".lt59-book__page").boundingBox();
  assert.ok(box, "page element must have a bounding box");
  const startX = box.x + box.width * 0.6;
  const y = Math.max(box.y + 20, Math.min(box.y + box.height * 0.5, 740));
  const distance = Math.round(box.width * 0.15);
  const endX = startX - distance;

  await page.evaluate(async ({ startX, y, endX, delayMs, sampleMid }) => {
    const el = document.querySelector(".lt59-book__page");
    const fire = (type, x) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 9,
      pointerType: "touch",
      isPrimary: true,
      clientX: x,
      clientY: y,
      button: 0,
    }));
    fire("pointerdown", startX);
    for (let i = 1; i <= 10; i += 1) {
      fire("pointermove", startX + (endX - startX) * (i / 10));
      if (sampleMid && i === 5) {
        window.__midCurl = Boolean(document.querySelector(".lt59-book__curl-shadow"));
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    fire("pointerup", endX);
  }, { startX, y, endX, delayMs, sampleMid });
  await page.waitForTimeout(300);
  const midCurl = sampleMid ? await page.evaluate(() => Boolean(window.__midCurl)) : true;
  return { midCurl, distance };
}

async function assertOverlayFocusLifecycle(page, label) {
  const indexTrigger = page.getByRole("button", { name: "Open index" });
  await indexTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Moment Index" });
  await dialog.waitFor({ timeout: 5000 });

  const inside = await page.evaluate(() => {
    const panel = document.querySelector(".lt59-overlay__panel");
    return Boolean(panel?.contains(document.activeElement));
  });
  assert.equal(inside, true, `${label}: focus enters the dialog`);

  // Tab containment: cycle several times, focus must never escape the overlay.
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    const contained = await page.evaluate(() => {
      const overlay = document.querySelector(".lt59-overlay");
      return Boolean(overlay?.contains(document.activeElement));
    });
    assert.equal(contained, true, `${label}: Tab ${i} kept focus inside the overlay`);
  }

  // Programmatic focus on background must be recaptured into the overlay.
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Edit"));
    button?.focus();
  });
  const recaptured = await page.evaluate(() => {
    const overlay = document.querySelector(".lt59-overlay");
    return Boolean(overlay?.contains(document.activeElement));
  });
  assert.equal(recaptured, true, `${label}: background focus escape is recaptured`);

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  const restoredToTrigger = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  assert.equal(restoredToTrigger, "Open index", `${label}: focus returns to the trigger after close`);
}

async function assertStoryControls(page) {
  await page.getByRole("button", { name: /Story ON|Play Story|Resume Story/ }).click();
  await page.locator(".lt59-book__story-status").waitFor({ timeout: 5000 });
  const status = await page.locator(".lt59-book__story-status").innerText();
  assert.match(status, /Reading moment|WHY NEXT|Turning|Arriving/, `Story status visible: ${status}`);
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

test("Lineage 59 V5 desktop 1280x800 static + interaction QA", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    await assertStaticFidelity(page, "desktop");
    await assertNoHorizontalOverflow(page, "desktop");
    await assertStoryControls(page);
    await assertKeyboardNav(page);
    await assertOverlayFocusLifecycle(page, "desktop");
    await assertInlineEdit(page);
    assert.deepEqual(errors, [], `desktop console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 branch choice A exact destination + Story resume", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const dialog = await reachBranchDialog(page);
    const choiceCount = await dialog.getByRole("button").count();
    assert.equal(choiceCount, 2, "Branch offers exactly 2 explicit choices");

    const choiceA = dialog.getByRole("button", { name: /Choice 1:/ });
    assert.match(await choiceA.innerText(), /감정을 따라 더 깊이/, "choice A label");
    await choiceA.click();

    // Exact selected continuation, chooser gone.
    await dialog.waitFor({ state: "detached", timeout: 10000 });
    const landed = await bookState(page);
    assert.equal(landed.momentId, "br-m59-005", "choice A lands exactly on br-m59-005");
    assert.equal(landed.index, 4, "choice A lands on path index 4");

    // Story resumes and advances to the next Moment.
    const advanced = await page.waitForFunction(
      () => document.querySelector(".lt59-book")?.getAttribute("data-moment-id") === "br-m59-006",
      { timeout: 10000 },
    );
    assert.ok(advanced);
    const after = await bookState(page);
    assert.equal(after.phase, "holding", "Story re-entered a next phase");
    assert.equal(after.playing, true, "Story is playing after the branch landing");
    assert.deepEqual(errors, [], `choice A console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 branch choice B exact destination + Story resume", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const dialog = await reachBranchDialog(page);

    const choiceB = dialog.getByRole("button", { name: /Choice 2:/ });
    assert.match(await choiceB.innerText(), /잠시 멈추고 돌아보기/, "choice B label");
    await choiceB.click();

    await dialog.waitFor({ state: "detached", timeout: 10000 });
    const landed = await bookState(page);
    assert.equal(landed.momentId, "br-m59-006", "choice B lands exactly on br-m59-006");
    assert.equal(landed.index, 5, "choice B lands on path index 5");

    const advanced = await page.waitForFunction(
      () => document.querySelector(".lt59-book")?.getAttribute("data-moment-id") === "br-m59-007",
      { timeout: 10000 },
    );
    assert.ok(advanced);
    const after = await bookState(page);
    assert.equal(after.playing, true, "Story is playing after the branch landing");
    assert.deepEqual(errors, [], `choice B console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 branch Escape dismisses without choice and without selection change", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const dialog = await reachBranchDialog(page);
    const before = await bookState(page);
    assert.equal(before.momentId, "br-m59-004", "Story paused exactly at the branch Moment");

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 5000 });

    const after = await bookState(page);
    assert.equal(after.momentId, "br-m59-004", "Escape on Branch never changes the selection");
    assert.equal(after.playing, false, "Story stays paused after dismissing the Branch");

    const reopen = page.getByRole("button", { name: "Choose path" });
    await reopen.waitFor({ timeout: 5000 });
    await reopen.click();
    await page.getByRole("dialog", { name: "Branch choice" }).waitFor({ timeout: 5000 });
    assert.deepEqual(errors, [], `branch Escape console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 short fast flick commits below the progress threshold", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const { midCurl, distance } = await gestureShortDistance(page, { delayMs: 2, sampleMid: true });
    assert.ok(distance > 0, "gesture distance must be non-zero");
    assert.equal(midCurl, true, "the flick drag was actually tracked (curl visible mid-gesture)");
    await page.locator(".lt59-book__page-num").filter({ hasText: "2 / 7" }).waitFor({ timeout: 5000 });
    assert.deepEqual(errors, [], `flick console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 slow drag over the same short distance cancels", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const { midCurl, distance } = await gestureShortDistance(page, { delayMs: 90, sampleMid: true });
    assert.ok(distance > 0, "gesture distance must be non-zero");
    assert.equal(midCurl, true, "the slow drag was actually tracked (curl visible mid-gesture)");
    const pageNum = await page.locator(".lt59-book__page-num").innerText();
    assert.equal(pageNum, "1 / 7", "slow short drag must cancel and keep the page");
    const curlActive = await page.evaluate(() =>
      Boolean(document.querySelector(".lt59-book__curl-shadow")));
    assert.equal(curlActive, false, "cancelled drag resets the curl");
    assert.deepEqual(errors, [], `slow drag console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 pointercancel never commits and never changes selection", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 });
    const result = await page.evaluate(async () => {
      const pageEl = document.querySelector(".lt59-book__page");
      const book = document.querySelector(".lt59-book");
      const rect = pageEl.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.6;
      const y = rect.top + Math.min(rect.height * 0.5, 740);
      const pointerId = 7;
      const fire = (type, x) => {
        pageEl.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          button: 0,
        }));
      };
      fire("pointerdown", startX);
      for (let i = 1; i <= 5; i += 1) {
        fire("pointermove", startX - i * 30);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      const curlMidDrag = Boolean(document.querySelector(".lt59-book__curl-shadow"));
      fire("pointercancel", startX - 150);
      const momentBefore = book.getAttribute("data-moment-id");
      const indexBefore = book.getAttribute("data-moment-index");
      return { momentBefore, indexBefore, curlMidDrag };
    });
    await page.waitForTimeout(400);
    const after = await bookState(page);
    assert.equal(result.curlMidDrag, true, "the cancelled gesture was in motion (curl visible before cancel)");
    assert.equal(after.momentId, result.momentBefore, "pointercancel must not change the Moment");
    assert.equal(after.index, Number(result.indexBefore), "pointercancel must not change the selection");
    const curlActive = await page.evaluate(() =>
      Boolean(document.querySelector(".lt59-book__curl-shadow")));
    assert.equal(curlActive, false, "pointercancel resets the curl instead of committing");
    assert.deepEqual(errors, [], `pointercancel console/page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});

test("Lineage 59 V5 mobile 390x844 single-page QA", async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors } = await openRoute(browser, { width: 390, height: 844 });
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
