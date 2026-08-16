import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const YT_A = "https://www.youtube.com/watch?v=ScMzIvxBSi4";
const YT_B = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

async function dismissCompletion(page) {
  for (let i = 0; i < 8; i += 1) {
    const hidden = await page
      .locator("#completionOverlay")
      .getAttribute("data-hidden")
      .catch(() => "false");
    if (hidden === "true") return;
    await page
      .locator("#openTreeOnly")
      .click({ timeout: 3000 })
      .catch(() => page.locator("#plant101Now").click({ timeout: 3000 }).catch(() => {}));
    await page.waitForTimeout(250);
  }
}

async function startJourney(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /첫 순간 심기/ }).first().click();
  await page.waitForSelector("#name-form");
  await page.locator('#name-form button[type="submit"]').click();
  await page.waitForSelector("#discovery-form");
}

test("v4 existing fidelity — First Journey restores source story, preview, narrative and pacing", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: DESKTOP });
    await page.goto(`${BASE}/v4/journey`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-source-story="three-moment-youtube"]');

    const story = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-source-story-card]")).map((card) => ({
        id: card.getAttribute("data-source-story-card"),
        background: card.querySelector(".v4-j-media")?.style.backgroundImage || "",
        text: card.textContent?.replace(/\s+/g, " ").trim() || "",
      })),
    );
    assert.equal(story.length, 3, "landing keeps the three source Moment cards");
    assert.match(story[0].background, /nqofkzQD19E/, "source Moment 1 thumbnail restored");
    assert.match(story[1].background, /bcUfIpQ6aeA/, "source Moment 2 thumbnail restored");
    assert.match(story[2].background, /mRppy-KnyNI/, "source Moment 3 thumbnail restored");
    assert.match(story[1].text, /다정한 말투가 남은 인터뷰/, "source Moment 2 copy restored");

    await startJourney(page);
    await page.fill("#content-url", "https://example.com/not-youtube");
    assert.equal(await page.locator(".v4-j-preview-window").getAttribute("data-source-preview"), null);

    await page.fill("#content-url", YT_A);
    await page.waitForFunction(
      () =>
        document.querySelector(".v4-j-preview-window")?.getAttribute("data-source-preview") ===
        "ScMzIvxBSi4",
    );
    const previewBg = await page
      .locator(".v4-j-preview-window")
      .evaluate((el) => el.style.backgroundImage);
    assert.match(previewBg, /ScMzIvxBSi4/, "valid YouTube URL immediately paints the source thumbnail");
    assert.match(
      await page.locator('[data-testid="preview-title"]').textContent(),
      /첫 순간으로 연결할 영상/,
    );

    await page.fill("#discovery-note", "");
    const submittedAt = Date.now();
    await page.locator('#discovery-form button[type="submit"]').click();
    await page.waitForTimeout(180);
    assert.equal(
      await page.locator("#memory-form").count(),
      0,
      "Step 1 dwell does not transition immediately",
    );
    await page.waitForSelector("#memory-form", { timeout: 3000 });
    assert.ok(Date.now() - submittedAt >= 420, "Step 1 source-like ~480ms dwell is preserved");
    await page.waitForTimeout(40);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lovetree-first-journey-unified") || "{}"),
    );
    assert.equal(stored.firstMoment.title, "첫 순간으로 연결할 영상", "source first Moment title restored");
    assert.equal(
      stored.firstMoment.note,
      "",
      "blank discovery note remains blank instead of receiving fallback copy",
    );

    await page.fill("#time", "00:42");
    await page.fill("#memory", "표정과 말투가 오래 남은 장면.");
    await page.locator('#memory-form button[type="submit"]').click();
    await page.waitForSelector('[data-testid="step2-success"]');
    const step2At = Date.now();
    await page.getByRole("button", { name: /첫 여정 보기/ }).click();
    await page.waitForTimeout(140);
    assert.equal(await page.locator("#connect-form").count(), 0, "Step 2 success dwell is visible");
    await page.waitForSelector("#connect-form", { timeout: 2500 });
    assert.ok(Date.now() - step2At >= 320, "Step 2 source-like ~360ms dwell is preserved");

    const step3Text = (await page.locator(".v4-journey-connect .v4-j-copy").textContent()) || "";
    assert.match(step3Text, /03 · 첫 가지를 이어가는 시간/);
    assert.match(step3Text.replace(/\s+/g, " "), /첫 마음이.*다음 장면을.*찾아갔어요/);
    assert.equal(await page.locator(".v4-j-source-branch-label").count(), 1, "FIRST BRANCH hierarchy restored");
    assert.match(await page.locator(".v4-j-source-branch-label").textContent(), /FIRST BRANCH · 첫 연결/);
    assert.match(await page.locator(".v4-j-source-branch-label").textContent(), /01 → 02/);
    assert.equal(await page.locator(".v4-j-source-board-caption").count(), 1, "source board caption restored");

    await page.fill("#next-url", YT_B);
    await page.fill("#next-title", "다시 찾아본 무대");
    await page.fill("#next-time", "01:15");
    await page.fill("#next-note", "댓글을 따라 찾아본 다음 장면.");
    await page.locator('#connect-form button[type="submit"]').click();
    await page.waitForSelector('[data-testid="step3-success"]');
    const step3At = Date.now();
    await page.getByRole("button", { name: /내 러브트리 보기/ }).click();
    await page.waitForTimeout(130);
    assert.equal(
      await page.locator('[data-testid="growth-first"]').count(),
      0,
      "Step 3 success dwell is visible",
    );
    await page.waitForSelector('[data-testid="growth-first"]', { timeout: 2500 });
    assert.ok(Date.now() - step3At >= 310, "Step 3 source-like ~350ms dwell is preserved");
    assert.equal(
      (await page.locator(".v4-journey-growth .v4-j-eyebrow").textContent())?.trim(),
      "04 · 러브트리 성장",
    );
    assert.equal((await page.locator(".v4-j-growth-connector i").textContent())?.trim(), "✿");

    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 existing fidelity — First Journey reduced motion bypasses source dwell", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: DESKTOP, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${BASE}/v4/journey`, { waitUntil: "networkidle" });
    await startJourney(page);
    await page.fill("#content-url", YT_A);
    await page.locator('#discovery-form button[type="submit"]').click();
    assert.equal(
      await page.locator(".v4-journey-page").getAttribute("data-fidelity-dwell"),
      "bypassed",
      "prefers-reduced-motion bypasses the 480ms fidelity dwell",
    );
    await page.waitForSelector("#memory-form", { timeout: 1500 });
    await context.close();
  } finally {
    await browser.close();
  }
});

test("v4 existing fidelity — 100 Moments plays the saved exact range inside the modal", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [DESKTOP, MOBILE]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/v4/trees/demo/graph/100-moments`, { waitUntil: "networkidle" });
      await dismissCompletion(page);
      await page.locator('[aria-controls="panel-selected"]').click();
      await page.locator('[data-testid="node-moment-1"]').click({ force: true });
      await page.waitForTimeout(100);
      await page.locator("#selectedPlay").click();
      const frame = page.locator("iframe[data-exact-range-player='true']");
      await frame.waitFor({ state: "attached", timeout: 3000 });
      const src = await frame.getAttribute("src");
      assert.ok(src, "in-product iframe has a source");
      const parsed = new URL(src);
      assert.match(parsed.pathname, /\/embed\/ScMzIvxBSi4$/, "correct YouTube video ID is embedded");
      assert.equal(parsed.searchParams.get("start"), "42", "saved startTime becomes start=42");
      assert.equal(parsed.searchParams.get("end"), "68", "saved endTime becomes end=68");
      assert.equal(parsed.searchParams.get("autoplay"), "1", "source autoplay semantics restored");
      assert.equal(
        await page.locator(".v4-moments-video-poster").isHidden(),
        true,
        "external-link poster is not the active player",
      );

      const geometry = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        rect: (() => {
          const el = document.querySelector("iframe[data-exact-range-player='true']");
          const r = el?.getBoundingClientRect();
          return r ? { left: r.left, right: r.right, width: r.width } : null;
        })(),
      }));
      assert.equal(
        geometry.scrollWidth <= geometry.clientWidth,
        true,
        "video modal creates no horizontal overflow",
      );
      assert.ok(
        geometry.rect && geometry.rect.left >= -1 && geometry.rect.right <= viewport.width + 1,
        "player stays inside the viewport",
      );

      await page.locator("#videoClose").click();
      await page.waitForTimeout(80);
      assert.equal(await frame.count(), 0, "closing the modal removes the iframe and stops playback");

      await page.locator('[data-testid="node-moment-50"]').click({ force: true });
      await page.waitForTimeout(80);
      assert.equal(
        await page.locator("#selectedPlay").count(),
        0,
        "non-video Moment does not gain a playback control",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
});