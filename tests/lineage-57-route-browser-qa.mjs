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

// Bounded semantic wait: poll a concrete DOM observable until it matches, with an
// explicit timeout and a self-classifying diagnostic (last observed value) on failure.
// Replaces fixed wall-clock waits for transition/readiness assertions only; genuine
// gesture-duration windows stay as explicit input pacing with rationale at the call site.
async function waitForSemantic(page, description, probe, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastObserved = "unavailable";
  while (Date.now() < deadline) {
    try {
      const value = await page.evaluate(probe);
      lastObserved = JSON.stringify(value);
      if (value.ready === true) return value;
    } catch {
      // Page navigation/teardown races surface through the timeout diagnostic below.
    }
    await page.waitForTimeout(25);
  }
  throw new Error(
    `${description}: semantic condition not reached within ${timeoutMs}ms; `
    + `classification=TRANSITION_TIMEOUT; lastObserved=${lastObserved}`,
  );
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
  // Source contract: onFaceEnter arms a hoverSmileMs=280 timer (lib/lineage-57-living-character-source.ts).
  // The reaction label is the semantic completion observable of that transition.
  await page.locator(".lcw-cast button").first().click();
  await face.hover();
  await waitForSemantic(
    page,
    `${label}: hover smile transition (source hoverSmileMs=280)`,
    () => {
      const node = document.querySelector(".lcw-reaction strong");
      return { ready: !!node && node.textContent?.trim() === "SMILE", value: node?.textContent?.trim() ?? null };
    },
    3000,
  );
  assert.equal((await emotion.innerText()).trim(), "SMILE", `${label}: 280ms hover smile`);

  // Source contract: onFaceClick defers runPrimaryReaction by singleClickDelayMs=220.
  await face.click();
  await waitForSemantic(
    page,
    `${label}: single click reaction transition (source singleClickDelayMs=220)`,
    () => {
      const node = document.querySelector(".lcw-reaction strong");
      const value = node?.textContent?.trim() ?? null;
      return { ready: value !== null && value !== "SMILE", value };
    },
    3000,
  );
  assert.notEqual((await emotion.innerText()).trim(), "SMILE", `${label}: single click chooses another reaction`);

  await face.dblclick();
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, `${label}: double click enters special state`);
  assert.equal((await emotion.innerText()).trim(), "TOUCHED");
  // Source contract: runSpecial schedules cleanup after specialCleanupMs=1800 and announces
  // "Special visual state cleaned up" via the aria-live region. Wait for the actual
  // cleanup completion, not a fixed wall-clock guess at it.
  await waitForSemantic(
    page,
    `${label}: special state cleanup completion (source specialCleanupMs=1800 + announcement)`,
    () => {
      const stage = document.querySelector(".lcw-stage");
      const live = document.querySelector('p[aria-live="polite"]');
      const cleaned = !!stage && !stage.classList.contains("special");
      return { ready: cleaned, special: stage?.classList.contains("special") ?? null, announcement: live?.textContent ?? null };
    },
    4000,
  );
  assert.equal(await page.locator(".lcw-stage.special").count(), 0, `${label}: special state cleans up`);

  // Source contract: onKeyDown calls runPrimaryReaction synchronously; no product timer exists.
  await face.focus();
  await page.keyboard.press("Enter");
  await waitForSemantic(
    page,
    `${label}: keyboard primary reaction transition (synchronous publish)`,
    () => {
      const node = document.querySelector(".lcw-reaction strong");
      const value = node?.textContent?.trim() ?? null;
      return { ready: value !== null && value !== "TOUCHED", value };
    },
    3000,
  );
  assert.notEqual((await emotion.innerText()).trim(), "TOUCHED", `${label}: keyboard primary reaction works`);

  await page.getByRole("button", { name: "SPECIAL INTERACTION" }).click();
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, `${label}: accessible secondary special action works`);

  const phrase = page.getByLabel("Character phrase");
  await phrase.fill("기억해 줘");
  await phrase.press("Enter");
  assert.equal((await emotion.innerText()).trim(), "TALK", `${label}: Enter starts TALK`);
  // Source contract: say() first publishes lubtMessage="…", then after sayGuideReplyMs=850
  // swaps in the final reaction and announces "Lubt reply: …". The probe matches the final
  // reply suffix "연결해 둘게" specifically — the bare "기억 가지" stem also occurs in the
  // unrelated TALK-mode guide line ("…연결해 볼게"), so matching it could fire early.
  await waitForSemantic(
    page,
    `${label}: SAY guide reply completion (source sayGuideReplyMs=850 + Lubt reply announcement)`,
    () => {
      const bubble = document.querySelector(".lcw-lubt-bubble");
      const live = document.querySelector('p[aria-live="polite"]');
      const text = bubble?.textContent ?? "";
      return { ready: /연결해 둘게/.test(text), bubble: text, announcement: live?.textContent ?? null };
    },
    3000,
  );
  assert.match(await page.locator(".lcw-lubt-bubble").innerText(), /기억 가지/);

  await page.getByRole("button", { name: /SAVE THIS LIVING MOMENT/ }).click();
  assert.match(await page.locator(".lcw-engine-content small").first().innerText(), /NON-PERSISTENT/);
}

async function assertLubtDrag(page, label) {
  const lubt = page.locator(".lcw-lubt");

  // Record native browser ownership transitions. One 1px activation move processes
  // the pending setPointerCapture request; only after gotpointercapture is observed
  // do we perform the real drag movement.
  await lubt.evaluate((node) => {
    node.dataset.qaPointerEvents = "[]";
    delete node.dataset.qaPointerId;
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
    };
    for (const type of ["pointerdown", "gotpointercapture", "pointermove", "pointercancel", "lostpointercapture", "pointerup"]) {
      node.addEventListener(type, record);
    }
  });

  const firstBox = await lubt.boundingBox();
  assert.ok(firstBox, `${label}: Lubt exists`);
  // The Lubt visual floats on an infinite lcwLubtWander CSS animation (16s loop, up to
  // ~320px translate) and its wandering path crosses ABOVE the cast/engine panels, whose
  // stacking contexts sit at a higher paint order than the button's z-index for that part
  // of the loop (measured: elementFromPoint returns .lcw-grid / engine INPUT there). The
  // press must land while the visual is over open stage, so aim = read live center + move
  // pointer + atomically verify the hit (rect + elementFromPoint in ONE evaluate), retried
  // with a bounded attempt budget and a self-classifying diagnostic on exhaustion.
  let aim = null;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const center = await lubt.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
    });
    await page.mouse.move(center.x, center.y);
    const verification = await page.evaluate(({ x, y }) => {
      const node = document.querySelector(".lcw-lubt");
      const rect = node?.getBoundingClientRect();
      const target = document.elementFromPoint(x, y);
      return {
        received: Boolean(target?.closest?.(".lcw-lubt")),
        liveCenter: rect ? { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) } : null,
      };
    }, { x: center.x, y: center.y });
    aim = { attempt, aimed: center, ...verification };
    if (verification.received) break;
    await page.waitForTimeout(250);
  }
  assert.equal(
    aim?.received,
    true,
    `${label}: live Lubt receives the pointer-down point; classification=AIM_EXHAUSTED after ${aim?.attempt}/20 attempts; last=${JSON.stringify(aim)}`,
  );

  const startX = aim.liveCenter.x;
  const startY = aim.liveCenter.y;

  await page.mouse.down();
  await page.locator(".lcw-lubt.dragging").waitFor({ state: "visible", timeout: 5000 });

  const pendingCapture = await lubt.evaluate((node) => {
    const pointerId = Number(node.dataset.qaPointerId);
    return Number.isInteger(pointerId) && node.hasPointerCapture(pointerId);
  });
  assert.equal(pendingCapture, true, `${label}: Lubt pending pointer capture is established`);

  // Processing one tiny real mouse move activates pending capture. This is not a
  // retry: the gesture remains the single original pointerdown sequence.
  await page.mouse.move(Math.min(page.viewportSize().width - 40, startX + 1), startY, { steps: 1 });

  const activation = await lubt.evaluate((node) => {
    const pointerId = Number(node.dataset.qaPointerId);
    return {
      dragging: node.classList.contains("dragging"),
      captured: Number.isInteger(pointerId) && node.hasPointerCapture(pointerId),
      events: JSON.parse(node.dataset.qaPointerEvents || "[]"),
    };
  });
  const gotCapture = activation.events.find((event) => event.type === "gotpointercapture");
  const activationTerminal = activation.events.find((event) =>
    event.type === "pointercancel" || event.type === "lostpointercapture" || event.type === "pointerup"
  );
  assert.ok(gotCapture, `${label}: activated gotpointercapture is observed; trace=${JSON.stringify(activation.events)}`);
  assert.equal(activationTerminal, undefined, `${label}: capture activation has no terminal event; trace=${JSON.stringify(activation.events)}`);
  assert.equal(activation.captured, true, `${label}: activated capture remains owned; trace=${JSON.stringify(activation.events)}`);
  assert.equal(activation.dragging, true, `${label}: drag remains active after capture activation; trace=${JSON.stringify(activation.events)}`);

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
  assert.equal(prematureTerminal, undefined, `${label}: no terminal pointer event before explicit mouse up; trace=${JSON.stringify(afterMove.events)}`);
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
  // Source contract: finishLubtDrag schedules the auto-return after lubtReturnMs=2400
  // (reduced-motion branch: 120ms). The elapsed lifetime window itself is part of the
  // product behavior under test, so it is NOT shortened or masked; the assertion target,
  // however, is the semantic outcome — inline style restored to DEFAULT_LUBT left/top —
  // polled with an explicit bounded timeout instead of a fixed wall-clock guess.
  await waitForSemantic(
    page,
    `${label}: Lubt auto-return completion (source lubtReturnMs=2400)`,
    () => {
      const node = document.querySelector(".lcw-lubt");
      const left = node?.style.left ?? "";
      const top = node?.style.top ?? "";
      return { ready: left === "300px" && top === "95px", left, top };
    },
    4000,
  );
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
  // Genuine gesture-duration contract (PRESERVED): the product arms a longPressMs=680
  // timer on pointerdown (onFacePointerDown); releasing before it fires cancels the
  // special state. The hold duration is itself part of the behavior under test, so the
  // input pacing stays explicit. The semantic observable (special stage) is then polled
  // after release with an explicit bounded timeout instead of assuming instant paint.
  await face.dispatchEvent("pointerdown", { button: 0, pointerId: 57, pointerType: "touch" });
  await page.waitForTimeout(720);
  await face.dispatchEvent("pointerup", { button: 0, pointerId: 57, pointerType: "touch" });
  await waitForSemantic(
    page,
    "mobile: long press special-state transition (source longPressMs=680 gesture contract)",
    () => {
      const stage = document.querySelector(".lcw-stage");
      return { ready: !!stage && stage.classList.contains("special"), special: stage?.classList.contains("special") ?? null };
    },
    3000,
  );
  assert.equal(await page.locator(".lcw-stage.special").count(), 1, "mobile: long press enters special state");
}

async function assertReducedMotion(page) {
  // Readiness wait: reduced-motion sync runs in queueMicrotask after mount; poll for the
  // AUTO LIFE default instead of assuming a fixed wall-clock settle time.
  await waitForSemantic(
    page,
    "reduced motion: Auto Life OFF readiness (matchMedia sync after mount)",
    () => {
      const button = Array.from(document.querySelectorAll("button")).find((item) => /AUTO LIFE/.test(item.textContent || ""));
      const text = button?.textContent ?? "";
      return { ready: /OFF/.test(text), value: text };
    },
    3000,
  );
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
  // Source contract: under reduced motion runSpecial schedules cleanup after 260ms
  // (vs 1800ms normal). Wait for the actual cleanup completion.
  await waitForSemantic(
    page,
    "reduced motion: shortened special cleanup completion (reduced branch 260ms)",
    () => {
      const stage = document.querySelector(".lcw-stage");
      return { ready: !!stage && !stage.classList.contains("special"), special: stage?.classList.contains("special") ?? null };
    },
    3000,
  );
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
