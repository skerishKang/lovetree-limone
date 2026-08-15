import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright";
import { LINEAGE_57_ASSETS } from "../lib/lineage-57-assets.ts";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const URL = `${BASE}/design-lab/lineages/57/v2`;

function requireExactAssets() {
  const result = spawnSync(process.execPath, ["scripts/verify-lineage-57-assets.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `54/54 exact assets are required before browser QA:\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /LINEAGE_57_EXACT_ASSET_GATE_PASS 54\/54/);
}

function captureErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console:${message.text()}`); });
  return errors;
}

async function openRoute(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = captureErrors(page);
  const response = await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  assert.ok(response?.ok(), `Lineage 57 route HTTP ${response?.status()}`);
  await page.locator(".lcw-world").waitFor({ timeout: 15000 });
  return { page, errors };
}

async function assertNoOverflow(page, label) {
  const state = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vertical: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }));
  assert.ok(state.horizontal <= 1, `${label}: horizontal overflow ${state.horizontal}px`);
  assert.ok(state.vertical <= 1, `${label}: unintended outer scroll ${state.vertical}px`);
}

async function assertAllExactAssetsDecode(page, label) {
  const urls = LINEAGE_57_ASSETS.map((asset) => `/${asset.targetPath.replace(/^public\//, "")}`);
  const decoded = await page.evaluate(async (paths) => Promise.all(paths.map((src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ src, ok: true, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ src, ok: false, width: 0, height: 0 });
    image.src = src;
  }))), urls);
  assert.equal(decoded.length, 54, `${label}: 54 assets tested`);
  for (const item of decoded) assert.equal(item.ok, true, `${label}: ${item.src} decodes`);
}

async function assertExpressionMatrix(page, label) {
  const cast = page.locator(".lcw-cast button");
  const expressions = page.locator(".lcw-emotions button");
  assert.equal(await cast.count(), 4, `${label}: four source characters`);
  assert.equal(await expressions.count(), 12, `${label}: twelve expression controls`);
  for (let character = 0; character < 4; character += 1) {
    await cast.nth(character).click();
    for (let expression = 0; expression < 12; expression += 1) {
      await expressions.nth(expression).click();
      const image = page.locator(".lcw-portrait img");
      await image.waitFor({ timeout: 5000 });
      // The portrait <img> src swaps on every expression click; the decode lands a
      // frame after the element exists, so await the 362x362 decode deterministically
      // (same assertion, no weakening) before proceeding.
      await page.waitForFunction(
        () => {
          const node = document.querySelector(".lcw-portrait img");
          return !!node && node.complete && node.naturalWidth === 362 && node.naturalHeight === 362;
        },
        undefined,
        { timeout: 5000 }
      );
      assert.ok(await image.evaluate((node) => node.complete && node.naturalWidth === 362 && node.naturalHeight === 362), `${label}: character ${character + 1} expression ${expression + 1} decodes 362x362`);
    }
  }
}

async function assertCoreInteractions(page, label) {
  const face = page.locator(".lcw-face-target");
  const emotion = page.locator(".lcw-reaction strong");

  await page.locator(".lcw-cast button").first().click();
  await face.hover();
  await page.waitForTimeout(330);
  assert.equal((await emotion.innerText()).trim(), "SMILE", `${label}: 280ms hover smile`);

  await face.click();
  await page.waitForTimeout(270);
  assert.notEqual((await emotion.innerText()).trim(), "SMILE", `${label}: single click chooses another reaction`);

  await face.dblclick();
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, `${label}: double click enters special state`);
  assert.equal((await emotion.innerText()).trim(), "TOUCHED");
  await page.waitForTimeout(1900);
  assert.equal(await page.locator(".lcw-stage.special").count(), 0, `${label}: special state cleans up`);

  await face.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(40);
  assert.notEqual((await emotion.innerText()).trim(), "TOUCHED", `${label}: keyboard primary reaction works`);

  await page.getByRole("button", { name: "SPECIAL INTERACTION" }).click();
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, `${label}: accessible secondary special action works`);

  const phrase = page.getByLabel("Character phrase");
  await phrase.fill("기억해 줘");
  await phrase.press("Enter");
  assert.equal((await emotion.innerText()).trim(), "TALK", `${label}: Enter starts TALK`);
  await page.waitForTimeout(900);
  assert.match(await page.locator(".lcw-lubt-bubble").innerText(), /기억 가지/);

  await page.getByRole("button", { name: /SAVE THIS LIVING MOMENT/ }).click();
  assert.match(await page.locator(".lcw-engine-content small").first().innerText(), /NON-PERSISTENT/);
}

async function assertLubtDrag(page, label) {
  const lubt = page.locator(".lcw-lubt");

  // Record native browser ownership transitions. The test waits for the real
  // gotpointercapture event before movement instead of treating the pending
  // setPointerCapture state as equivalent to activated capture.
  await lubt.evaluate((node) => {
    node.dataset.qaPointerEvents = "[]";
    delete node.dataset.qaPointerId;
    delete node.dataset.qaGotPointerCapture;
    const record = (event) => {
      const events = JSON.parse(node.dataset.qaPointerEvents || "[]");
      events.push({
        type: event.type,
        pointerId: event.pointerId,
        button: event.button,
        buttons: event.buttons,
        captured: node.hasPointerCapture(event.pointerId),
        dragging: node.classList.contains("dragging"),
        clientX: Math.round(event.clientX),
        clientY: Math.round(event.clientY),
      });
      node.dataset.qaPointerEvents = JSON.stringify(events);
      if (event.type === "pointerdown") node.dataset.qaPointerId = String(event.pointerId);
      if (event.type === "gotpointercapture") node.dataset.qaGotPointerCapture = String(event.pointerId);
    };
    for (const type of ["pointerdown", "gotpointercapture", "pointermove", "pointercancel", "lostpointercapture", "pointerup"]) {
      node.addEventListener(type, record);
    }
  });

  const firstBox = await lubt.boundingBox();
  assert.ok(firstBox, `${label}: Lubt exists`);
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);

  const liveBox = await lubt.boundingBox();
  assert.ok(liveBox, `${label}: Lubt live box remains available`);
  const startX = liveBox.x + liveBox.width / 2;
  const startY = liveBox.y + liveBox.height / 2;
  await page.mouse.move(startX, startY);

  const receivesPointer = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return Boolean(target?.closest?.(".lcw-lubt"));
  }, { x: startX, y: startY });
  assert.equal(receivesPointer, true, `${label}: live Lubt receives the pointer-down point`);

  await page.mouse.down();
  await page.locator(".lcw-lubt.dragging").waitFor({ state: "visible", timeout: 5000 });

  const pendingCapture = await lubt.evaluate((node) => {
    const pointerId = Number(node.dataset.qaPointerId);
    return Number.isInteger(pointerId) && node.hasPointerCapture(pointerId);
  });
  assert.equal(pendingCapture, true, `${label}: Lubt pending pointer capture is established`);

  await page.waitForFunction(
    () => {
      const node = document.querySelector(".lcw-lubt");
      return Boolean(node?.dataset.qaPointerId && node.dataset.qaGotPointerCapture === node.dataset.qaPointerId);
    },
    undefined,
    { timeout: 5000 },
  );

  await page.mouse.move(
    Math.min(page.viewportSize().width - 40, startX + 140),
    Math.min(page.viewportSize().height - 80, startY + 100),
    { steps: 5 },
  );

  const afterMove = await lubt.evaluate((node) => {
    const pointerId = Number(node.dataset.qaPointerId);
    return {
      dragging: node.classList.contains("dragging"),
      captured: Number.isInteger(pointerId) && node.hasPointerCapture(pointerId),
      events: JSON.parse(node.dataset.qaPointerEvents || "[]"),
    };
  });
  const prematureTerminal = afterMove.events.find((event) =>
    event.type === "pointercancel" || event.type === "lostpointercapture" || event.type === "pointerup"
  );
  assert.equal(
    prematureTerminal,
    undefined,
    `${label}: no terminal pointer event before explicit mouse up; trace=${JSON.stringify(afterMove.events)}`,
  );
  assert.equal(afterMove.captured, true, `${label}: Lubt retains pointer capture through movement; trace=${JSON.stringify(afterMove.events)}`);
  assert.equal(afterMove.dragging, true, `${label}: Lubt drag owns pointer; trace=${JSON.stringify(afterMove.events)}`);

  await page.mouse.up();
  await page.locator(".lcw-lubt.dragging").waitFor({ state: "detached", timeout: 5000 });

  const afterUp = await lubt.evaluate((node) => ({
    dragging: node.classList.contains("dragging"),
    events: JSON.parse(node.dataset.qaPointerEvents || "[]"),
  }));
  assert.equal(afterUp.dragging, false, `${label}: Lubt pointer release recovers`);
  assert.equal(afterUp.events.some((event) => event.type === "pointerup"), true, `${label}: explicit pointerup is observed`);
  assert.equal(afterUp.events.some((event) => event.type === "pointercancel"), false, `${label}: normal mouse drag is not cancelled`);
  assert.match(await page.locator(".lcw-lubt-bubble").innerText(), /새로운 자리/);
  await page.waitForTimeout(2500);
  const inline = await lubt.evaluate((node) => ({ left: node.style.left, top: node.style.top }));
  assert.equal(inline.left, "300px", `${label}: Lubt auto-returns left`);
  assert.equal(inline.top, "95px", `${label}: Lubt auto-returns top`);
}

async function assertMobileParity(page) {
  await page.getByRole("button", { name: "EMOTION ENGINE" }).click();
  const dialog = page.getByRole("dialog", { name: "Mobile Emotion Engine" });
  await dialog.waitFor();
  for (const name of ["TALK", "SING", "HEART", "SURPRISE", "CALL LUBT", "SAY"]) {
    assert.ok(await dialog.getByRole("button", { name, exact: true }).isVisible(), `mobile: ${name} remains reachable`);
  }
  assert.ok(await dialog.getByRole("slider", { name: "Intensity" }).isVisible(), "mobile: intensity remains reachable");
  assert.ok(await dialog.getByRole("slider", { name: "Liveliness" }).isVisible(), "mobile: liveliness remains reachable");
  assert.ok(await dialog.getByRole("button", { name: /SAVE THIS LIVING MOMENT/ }).isVisible(), "mobile: SAVE demo remains reachable");
  await dialog.getByRole("button", { name: "CLOSE" }).click();

  const face = page.locator(".lcw-face-target");
  await face.dispatchEvent("pointerdown", { button: 0, pointerId: 57, pointerType: "touch" });
  await page.waitForTimeout(720);
  await face.dispatchEvent("pointerup", { button: 0, pointerId: 57, pointerType: "touch" });
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, "mobile: long press enters special state");
}

async function assertReducedMotion(page) {
  await page.waitForTimeout(120);
  assert.match(await page.getByRole("button", { name: /AUTO LIFE/ }).innerText(), /OFF/, "reduced motion disables Auto Life by default");
  const names = await page.evaluate(() => ({
    aurora: getComputedStyle(document.querySelector(".lcw-aurora")).animationName,
    portrait: getComputedStyle(document.querySelector(".lcw-portrait")).animationName,
    lubt: getComputedStyle(document.querySelector(".lcw-lubt")).animationName,
  }));
  assert.equal(names.aurora, "none");
  assert.equal(names.portrait, "none");
  assert.equal(names.lubt, "none");
  await page.getByRole("button", { name: "SPECIAL INTERACTION" }).click();
  await page.waitForTimeout(330);
  assert.equal(await page.locator(".lcw-stage.special").count(), 0, "reduced motion shortens special visual cleanup while preserving action");
}

test("Lineage 57 V2 post-transfer desktop/mobile/reduced-motion browser QA", { timeout: 180000 }, async () => {
  requireExactAssets();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const scenario of [
      { label: "1280x800", viewport: { width: 1280, height: 800 } },
      { label: "390x844", viewport: { width: 390, height: 844 }, mobile: true },
      { label: "320x720", viewport: { width: 320, height: 720 }, mobile: true },
    ]) {
      const { page, errors } = await openRoute(browser, scenario.viewport, scenario.mobile ? { isMobile: true, hasTouch: true } : {});
      try {
        assert.match(await page.locator(".lcw-asset-status").innerText(), /LINEAGE_57_EXACT_ASSET_GATE_PASS 54\/54/, `${scenario.label}: route gate is explicitly flipped only after verifier PASS`);
        await assertNoOverflow(page, scenario.label);
        await assertAllExactAssetsDecode(page, scenario.label);
        if (scenario.label === "1280x800") {
          await assertExpressionMatrix(page, scenario.label);
          await assertCoreInteractions(page, scenario.label);
          await assertLubtDrag(page, scenario.label);
        } else {
          await assertMobileParity(page);
        }
        assert.equal(errors.length, 0, `${scenario.label}: no page/console errors: ${errors.join(" | ")}`);
      } finally { await page.close(); }
    }

    const { page, errors } = await openRoute(browser, { width: 1280, height: 800 }, { reducedMotion: "reduce" });
    try {
      await assertReducedMotion(page);
      assert.equal(errors.length, 0, `reduced motion: no page/console errors: ${errors.join(" | ")}`);
    } finally { await page.close(); }
  } finally { await browser.close(); }
});
