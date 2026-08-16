// Source Track 47 V4.2.5 — actual browser interaction QA (explicit run).
//
// NOT part of `node --test 'tests/*.test.mjs'` (deliberately no .test.
// suffix) so the shared A-track browser-test classification gate stays
// untouched. Run against a dev/preview server:
//
//   V4_BASE_URL=http://localhost:3000 node --import tsx tests/source-track-47-browser-qa.mjs hold
//   V4_BASE_URL=http://localhost:3000 node --import tsx tests/source-track-47-browser-qa.mjs exact
//
// Two truthful phases:
//
// - `hold`  — REPOSITORY TRUTH. The exact 28,650,099 B video is NOT
//   transported; the runner/native candidate execute the source-faithful
//   video-failed poster path. This phase proves the hold state, the pinned
//   nav contract, reduced-motion 5-keyframe scroll→act mapping, viewports,
//   zero console/page errors and zero horizontal overflow.
//
// - `exact` — LOCAL EXACT-OVERLAY EVIDENCE ONLY (never committed). The exact
//   video bytes are staged at the declared public path out-of-git; this
//   script verifies the served SHA-256 equals 28951ccb…27ce BEFORE running
//   and fails closed otherwise. It then proves the full normal-motion
//   mechanics: scroll-driven ACT 1→5 in USER_CONTROLLED, eased rail, real
//   play/pause, CTA timing and cinematic screenshots. Video fidelity PASS is
//   claimed for THIS overlay run only, never for the repository state.
//
// Screenshots are written to TRACK47_SCREENSHOT_DIR (default /tmp).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const PHASE = process.argv[2];
if (PHASE !== "hold" && PHASE !== "exact") {
  console.error("usage: node tests/source-track-47-browser-qa.mjs <hold|exact>");
  process.exit(2);
}

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const NATIVE = `${BASE}/design-lab/source-tracks/47/v4-2-5/native`;
const SOURCE = `${BASE}/design-lab/source-tracks/47/v4-2-5/source`;
const VIDEO_URL = `${BASE}/design-lab-assets/source-tracks/47/v4-2-5/assets/Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4`;
const SHOTS = process.env.TRACK47_SCREENSHOT_DIR || "/tmp/track47-browser-qa";
const HTML_SHA = "676f5220ec4e4c8c1b15c36eaeb6a2ee4320ecceb7e413b15eee585e8ed9a596";
const VIDEO_SHA = "28951ccb76923e0dfbbb60e7757ab2f6fa379e405731a386fa03b05a32a227ce";

await mkdir(SHOTS, { recursive: true });

function attachErrorCapture(page, errors) {
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
}

async function overflowX(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function openNative(browser, viewport, options = {}) {
  const page = await browser.newPage({ viewport, ...options });
  const errors = [];
  attachErrorCapture(page, errors);
  const response = await page.goto(NATIVE, { waitUntil: "networkidle", timeout: 45000 });
  assert.ok(response?.ok(), `native route HTTP ${response?.status()}`);
  await page.locator("main[data-act]").waitFor({ timeout: 15000 });
  return { page, errors };
}

const stage = (page) => page.locator("main[data-act]");
const attr = (page, name) => stage(page).getAttribute(name);

async function maxScroll(page) {
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
}

const checks = [];
function record(name, fn) {
  checks.push({ name, fn });
}

/* ------------------------------------------------------------------ */
/* Shared: pinned nav contract (identical in both phases)               */
/* ------------------------------------------------------------------ */

let navPage = null;

function navContract() {
  return [
    record("06 Moments trigger click pins the menu open", async () => {
      const trigger = navPage.locator('[data-nav-menu="moments"]');
      await trigger.click();
      await navPage.waitForTimeout(250);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      assert.equal(await trigger.getAttribute("aria-haspopup"), "true");
    }),
    record("07 pointer leaving the trigger keeps the pinned menu open", async () => {
      await navPage.mouse.move(640, 500);
      await navPage.waitForTimeout(400);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "true",
        "pinned menu must survive pointer leaving the trigger",
      );
    }),
    record("08 first menu option receives keyboard focus on open", async () => {
      await navPage.locator('[data-nav-menu="moments"]').click();
      await navPage.waitForTimeout(350);
      const active = await navPage.evaluate(() => ({
        key: document.activeElement?.getAttribute("data-route-key"),
        menu: document.activeElement?.closest("[data-nav-group]")?.getAttribute("data-nav-group"),
      }));
      assert.equal(active.menu, "moments");
      assert.equal(active.key, "moment57", "first option focused");
    }),
    record("09 Escape closes the menu and restores trigger focus", async () => {
      await navPage.locator('[data-nav-menu="moments"]').click();
      await navPage.waitForTimeout(250);
      await navPage.keyboard.press("Escape");
      await navPage.waitForTimeout(250);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "false",
        "Escape closes",
      );
      assert.equal(
        await navPage.evaluate(() => document.activeElement?.getAttribute("data-nav-menu")),
        "moments",
        "trigger focus restored",
      );
      await navPage.waitForTimeout(350);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "false",
        "focus restore must not reopen the menu",
      );
    }),
    record("10 outside click closes the pinned menu", async () => {
      await navPage.locator('[data-nav-menu="moments"]').click();
      await navPage.waitForTimeout(250);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "true",
      );
      await navPage.mouse.click(640, 650);
      await navPage.waitForTimeout(250);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "false",
      );
    }),
    record("11 Connections and My Tree triggers behave identically", async () => {
      for (const menu of ["connections", "mytree"]) {
        const trigger = navPage.locator(`[data-nav-menu="${menu}"]`);
        await trigger.click();
        await navPage.waitForTimeout(250);
        assert.equal(await trigger.getAttribute("aria-expanded"), "true", `${menu} opens`);
        const active = await navPage.evaluate(() =>
          document.activeElement?.closest("[data-nav-group]")?.getAttribute("data-nav-group"),
        );
        assert.equal(active, menu, `${menu} first option focused`);
        await navPage.keyboard.press("Escape");
        await navPage.waitForTimeout(250);
        assert.equal(await trigger.getAttribute("aria-expanded"), "false", `${menu} Escape close`);
        assert.equal(
          await navPage.evaluate(() => document.activeElement?.getAttribute("data-nav-menu")),
          menu,
          `${menu} trigger focus restored`,
        );
      }
    }),
    record("12 unresolved routes cannot fake navigate; the one resolved target works", async () => {
      const urlBefore = navPage.url();
      await navPage.locator('[data-nav-menu="moments"]').click();
      await navPage.waitForTimeout(250);
      const holdOption = navPage.locator('[data-route-key="moment57"]');
assert.equal(
  await holdOption.getAttribute("aria-disabled"),
  "true",
  "HOLD option must be aria-disabled for real users",
);
await holdOption.click({ force: true });
      await navPage.waitForTimeout(400);
      assert.equal(navPage.url(), urlBefore, "HOLD option must not navigate");
      assert.match(await navPage.locator("[role='status']").innerText(), /REVIEW PENDING/);
      assert.equal(
        await navPage.locator('[data-nav-menu="moments"]').getAttribute("aria-expanded"),
        "false",
        "option click closes the menu",
      );
      await navPage.locator('[data-nav-menu="moments"]').click();
      await navPage.waitForTimeout(250);
      await navPage.locator('[data-route-key="moment64"]').click();
      await navPage.waitForURL("**/design-lab/lineages/64/v1-2-1", { timeout: 10000 });
      await navPage.goto(NATIVE, { waitUntil: "networkidle" });
      await navPage.locator("main[data-act]").waitFor({ timeout: 15000 });
    }),
  ];
}

function mobileViewportChecks(label, viewport) {
  return [
    record(`mobile ${label}: composition, acts, errors=0, overflow=0`, async (browser) => {
      const mobile = await openNative(browser, viewport);
      const { page: mp, errors: me } = mobile;
      const menusHidden = await mp.evaluate(() => {
        const group = document.querySelector("[data-nav-group='moments']");
        return group ? getComputedStyle(group).display === "none" : true;
      });
      assert.equal(menusHidden, true, `${label}: nav groups hidden (source mobile composition)`);
      assert.equal(
        await mp.locator("[data-route-key='firstMoment']").first().isVisible(),
        true,
        `${label}: 첫 순간 심기 plant link visible`,
      );
      if (PHASE === "exact") {
        await mp.mouse.wheel(0, 180);
        await mp.waitForTimeout(400);
        const ms = await maxScroll(mp);
        await mp.evaluate((y) => window.scrollTo({ top: y }), ms - 2);
        await mp.waitForTimeout(900);
        assert.equal(await attr(mp, "data-act"), "5", `${label}: reaches ACT 5`);
        await mp.screenshot({ path: `${SHOTS}/native-mobile-${label}-act5.png` });
      } else {
        await mp.emulateMedia({ reducedMotion: "reduce" });
        await mp.waitForTimeout(400);
        const ms = await maxScroll(mp);
        await mp.evaluate((y) => window.scrollTo({ top: y }), ms - 2);
        await mp.waitForTimeout(600);
        assert.equal(await attr(mp, "data-act"), "5", `${label}: still-mode keyframe ACT 5`);
        await mp.emulateMedia({ reducedMotion: "no-preference" });
      }
      await mp.screenshot({ path: `${SHOTS}/native-mobile-${label}-act1.png` });
      assert.deepEqual(me, [], `${label} errors must be zero: ${me.join(" | ")}`);
      assert.equal(await overflowX(mp), 0, `${label} horizontal overflow must be 0`);
      await mp.close();
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Phase construction                                                  */
/* ------------------------------------------------------------------ */

if (PHASE === "exact") {
  // Fail closed unless the served bytes are the EXACT pinned video.
  const response = await fetch(VIDEO_URL);
  assert.equal(response.status, 200, "exact phase requires the staged exact video");
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.byteLength, 28_650_099, "exact video bytes");
  const servedSha = createHash("sha256").update(buffer).digest("hex");
  assert.equal(servedSha, VIDEO_SHA, "exact video SHA-256 — no substitutes allowed");

  record("exact-overlay gate: served video SHA matches the pinned identity", async () => {
    // proven above; kept as a recorded check for the report
    assert.equal(servedSha, VIDEO_SHA);
  });
  record("01/02 initial ACT 1 then scroll drives ACT 1→5 as USER_CONTROLLED", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    assert.equal(await attr(page, "data-act"), "1");
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-failure") === "false",
      { timeout: 10000 },
    );
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(350);
    assert.equal(await attr(page, "data-mode"), "USER_CONTROLLED");
    const ms = await maxScroll(page);
    for (const [ratio, expectedAct] of [
      [0.0, "1"],
      [0.3, "2"],
      [0.5, "3"],
      [0.75, "4"],
      [0.999, "5"],
    ]) {
      await page.evaluate((y) => window.scrollTo({ top: y }), Math.round(ms * ratio));
      await page.waitForTimeout(500);
      assert.equal(await attr(page, "data-act"), expectedAct, `ratio ${ratio}`);
    }
    await page.screenshot({ path: `${SHOTS}/native-desktop-act5.png` });
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${SHOTS}/native-desktop-act1.png` });
    await page.close();
  });
  record("03/04 rail reflects progress; real play/pause owns the film", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-failure") === "false",
      { timeout: 10000 },
    );
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(300);
    const ms = await maxScroll(page);
    await page.evaluate((y) => window.scrollTo({ top: y }), Math.round(ms * 0.6));
    await page.waitForTimeout(700);
    const now = Number(await page.locator('[role="slider"]').getAttribute("aria-valuenow"));
    assert.ok(now > 40 && now < 90, `rail aria-valuenow=${now}`);
    const pausedBefore = await page.evaluate(() =>
      document.querySelector("video")?.paused,
    );
    assert.equal(pausedBefore, true, "user authority pauses the film");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForTimeout(900);
    const playing = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? !video.paused && video.currentTime > 0 : false;
    });
    assert.equal(playing, true, "Play resumes the exact video");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.querySelector("video")?.paused), true);
    await page.locator('[role="slider"]').focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    const after = Number(await page.locator('[role="slider"]').getAttribute("aria-valuenow"));
    assert.ok(after >= now, "rail keyboard seek works");
    await page.close();
  });
  record("05 CTA appears on ACT 5 completion timing with the exact film", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.waitForTimeout(600);
    assert.equal(await attr(page, "data-cta-ready"), "false", "CTA hidden early");
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(250);
    const ms = await maxScroll(page);
    await page.evaluate((y) => window.scrollTo({ top: y }), ms - 2);
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-cta-ready") === "true",
      { timeout: 10000 },
    );
    await page.waitForTimeout(900);
    assert.equal(
      await page.locator("[data-cta='first-moment']").isVisible(),
      true,
      "첫 순간 심기 CTA visible at ACT 5",
    );
    await page.locator("[data-cta='first-moment']").click();
    await page.waitForTimeout(400);
    assert.match(
      await page.locator("[role='status']").innerText(),
      /ROUTE MAPPING PROOF/,
      "firstMoment CTA proves the /v4 mapping without replacing it",
    );
    assert.equal(page.url(), NATIVE, "mapping proof does not navigate");
    await page.screenshot({ path: `${SHOTS}/native-desktop-act5-cta.png` });
    await page.close();
  });
  checks.push(...navContract());
  checks.push(...mobileViewportChecks("390", { width: 390, height: 844 }));
  checks.push(...mobileViewportChecks("320", { width: 320, height: 720 }));
  record("reduced-motion 5-keyframe still mode with the exact film", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    assert.equal(await attr(page, "data-reduced"), "true");
    const ms = await maxScroll(page);
    await page.evaluate((y) => window.scrollTo({ top: y }), Math.round(ms * 0.9));
    await page.waitForTimeout(500);
    assert.equal(await attr(page, "data-act"), "5");
    await page.screenshot({ path: `${SHOTS}/native-desktop-reduced-act5.png` });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.close();
  });
} else {
  record("01 initial act is ACT 1 (poster mode — video HOLD)", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    assert.equal(await attr(page, "data-act"), "1");
    assert.match(await stage(page).innerText(), /01 \/ 05/);
    assert.match(await stage(page).innerText(), /FIRST FEELING/);
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-failure") === "true",
      { timeout: 10000 },
    );
    assert.equal(await attr(page, "data-failure"), "true", "absent video → source-faithful failure");
    // enterUser is blocked under failure exactly like the source.
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(400);
    assert.equal(await attr(page, "data-mode"), "PAUSED");
    await page.close();
  });
  record("02 poster fallback layer + fallback message visible", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-failure") === "true",
      { timeout: 10000 },
    );
    const posterVisible = await page.evaluate(() => {
      const fallback = document.querySelector("main[data-act] [style*='poster-act01']");
      return fallback ? Number(getComputedStyle(fallback).opacity) > 0.9 : false;
    });
    assert.equal(posterVisible, true, "poster fallback opacity must be 1");
    const messageVisible = await page.evaluate(() => {
      const message = Array.from(document.querySelectorAll("main[data-act] section")).find(
        (section) => section.textContent?.includes("LoveTree는 시작됩니다"),
      );
      return message ? getComputedStyle(message).opacity === "1" : false;
    });
    assert.equal(messageVisible, true, "fallback message visible");
    await page.screenshot({ path: `${SHOTS}/native-desktop-poster-fallback.png` });
    await page.close();
  });
  record("03 play toggle on a failed source settles to PAUSED (no fake playback)", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.waitForFunction(
      () => document.querySelector("main[data-act]")?.getAttribute("data-failure") === "true",
      { timeout: 10000 },
    );
    const button = page.getByRole("button", { name: /^Play$|^Pause$/ });
    if ((await button.innerText()) === "Play") {
      await button.click();
      await page.waitForTimeout(700);
      assert.equal(await button.innerText(), "Play");
      assert.equal(await attr(page, "data-mode"), "PAUSED");
    }
    await page.close();
  });
  checks.push(...navContract());
  record("13 reduced motion still mode maps scroll to the 5 keyframe acts", async (browser) => {
    const { page } = await openNative(browser, { width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    assert.equal(await attr(page, "data-reduced"), "true");
    const cardVisible = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll("main[data-act] div")).find((div) =>
        div.textContent?.includes("5 KEYFRAME STILL MODE"),
      );
      return card ? getComputedStyle(card).display === "flex" : false;
    });
    assert.equal(cardVisible, true, "reduced card visible");
    const ms = await maxScroll(page);
    for (const [ratio, expectedAct] of [
      [0.0, "1"],
      [0.3, "2"],
      [0.5, "3"],
      [0.75, "4"],
      [0.999, "5"],
    ]) {
      await page.evaluate((y) => window.scrollTo({ top: y }), Math.round(ms * ratio));
      await page.waitForTimeout(450);
      assert.equal(await attr(page, "data-act"), expectedAct, `still-mode ratio ${ratio}`);
    }
    assert.equal(await attr(page, "data-cta-ready"), "true", "ACT5 keyframe readies the CTA");
    await page.screenshot({ path: `${SHOTS}/native-desktop-reduced-act5.png` });
    await page.close();
  });
  checks.push(...mobileViewportChecks("390", { width: 390, height: 844 }));
  checks.push(...mobileViewportChecks("320", { width: 320, height: 720 }));
}

record("source runner: SHA-verified exact bytes + sandbox + truthful video state", async (browser) => {
  const runner = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const runnerErrors = [];
  attachErrorCapture(runner, runnerErrors);
  const response = await runner.goto(SOURCE, { waitUntil: "networkidle", timeout: 45000 });
  assert.ok(response?.ok(), `source route HTTP ${response?.status()}`);
  await runner.waitForSelector("[data-runner-state='ready']", { timeout: 20000 });
  const panelText = await runner.locator("body").innerText();
  assert.match(panelText, new RegExp(HTML_SHA.slice(0, 24)), "pinned SHA displayed");
  assert.match(panelText, /PINNED_EXACT/);
  assert.match(panelText, /VIDEO_EXACT_ASSET_HOLD/);
  assert.match(panelText, /NOT CANONICAL PRODUCT/);
  const frameLocator = runner.locator("iframe[data-source-state='ready']");
  await frameLocator.waitFor({ timeout: 15000 });
  assert.equal(await frameLocator.getAttribute("sandbox"), "allow-scripts");
  const frame = await frameLocator.elementHandle().then((handle) => handle.contentFrame());
  assert.ok(frame, "source frame exists");
  await frame.waitForSelector("main.stage", { timeout: 15000 });
  if (PHASE === "exact") {
    await frame.waitForFunction(() => {
      const video = document.getElementById("film");
      return video && video.readyState >= 2;
    }, { timeout: 20000 });
    await frame.evaluate(() => window.__lovetreeQA?.seek(12.95));
    await frame.waitForTimeout(700);
    assert.equal(await frame.evaluate(() => window.__lovetreeQA?.getState().act), 5);
    assert.equal(
      await frame.evaluate(() => window.__lovetreeQA?.getState().mode),
      "USER_CONTROLLED",
    );
  } else {
    await frame.waitForSelector(".stage.video-failed", { timeout: 15000 });
    const posterOpacity = await frame.evaluate(() => {
      const fallback = document.querySelector(".poster-fallback");
      return fallback ? getComputedStyle(fallback).opacity : "0";
    });
    assert.equal(posterOpacity, "1", "exact source poster fallback (video HOLD truth)");
  }
  await runner.screenshot({ path: `${SHOTS}/source-runner-${PHASE}.png` });
  assert.deepEqual(runnerErrors, [], `source runner errors must be zero: ${runnerErrors.join(" | ")}`);
  await runner.close();
});

record("17/18/19 desktop console errors=0, page errors=0, overflow=0", async (browser) => {
  const { page, errors } = await openNative(browser, { width: 1280, height: 800 });
  await page.waitForTimeout(800);
  assert.deepEqual(errors, [], `desktop errors must be zero: ${errors.join(" | ")}`);
  assert.equal(await overflowX(page), 0, "desktop horizontal overflow must be 0");
  await page.screenshot({ path: `${SHOTS}/native-desktop-${PHASE}-final.png` });
  await page.close();
});

/* ------------------------------------------------------------------ */

const browser = await chromium.launch();
try {
  // Provision the shared desktop page used by the nav contract checks.
  const navOpened = await openNative(browser, { width: 1280, height: 800 });
  navPage = navOpened.page;

  let failed = 0;
  for (const check of checks) {
    try {
      await check.fn(browser);
      console.log(`PASS ${check.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${check.name}\n${error?.message?.split("\n").slice(0, 6).join("\n")}`);
    }
  }
  assert.deepEqual(navOpened.errors, [], "nav page errors must be zero");
  assert.equal(await overflowX(navPage), 0);
  if (failed > 0) {
    console.error(`\nTrack47 browser QA [${PHASE}]: ${failed} FAIL`);
    process.exit(1);
  }
  await navPage.close();
  console.log(`\nTrack47 browser QA [${PHASE}]: ${checks.length} checks PASS, 0 fail`);
  console.log(`Screenshots: ${SHOTS}`);
} finally {
  await browser.close();
}
