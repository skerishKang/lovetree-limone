import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

/**
 * COM2 #204 Slice B remediation — BEHAVIORAL (browser) truthfulness checks.
 * No backend / real DB / real auth. Drives the real V12 component in a browser
 * and asserts actual runtime behavior, not source regex.
 */

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";

// Seed a minimal valid first-moment draft so the memory step is reachable,
// then verify inputs actually bind to draft state and that a stale
// localStorage `saved`/`canonical` is NOT resurrected on reload (BLOCKER 2).
test("BLOCKER 1+2: memory inputs bind to draft; stale localStorage cannot resurrect saved", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    // Stub third-party resources (fonts/youtube thumbnails) to avoid network 404 noise.
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "img.youtube.com" || u.hostname === "i.ytimg.com") {
        return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
      }
      if (u.hostname === "fonts.googleapis.com") {
        return route.fulfill({ status: 200, contentType: "text/css", body: "" });
      }
      return route.continue();
    });

    // First visit: wait for V12 to actually mount so its initializer runs.
    await page.goto(`${BASE}/v4/journey?v12=1`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="save-first-moment"]', { timeout: 30000 });

    // Seed localStorage with a STALE durable-claim (saved/canonical) to prove
    // BLOCKER 2: reload must NOT restore them as truth.
    await page.evaluate(() => {
      localStorage.setItem("lovetree-first-journey-unified", JSON.stringify({
        currentScreen: "step2",
        treeName: "건호에게 입덕한 3일",
        // NOTE: deliberately NO firstMoment.url so V12 activation gate is not
        // mistaken for existing V1 progress; we only seed stale DURABLE claims.
        firstMoment: { saved: true },
        memory: { emotion: "설렘", customEmotion: "", time: "01:30", note: "stale-memo", date: "2026-01-01", publicMemo: false, saved: true },
        connections: [{ first: {}, next: { id: "x" }, createdAt: "t", memoryId: "stale-mem-id" }],
        canonical: { treeId: "stale-tree", firstMemoryId: "stale-mem" },
        drafts: { step3: { url: "", title: "", time: "00:00", relation: "댓글을 따라 찾아봤어요", note: "" } },
      }));
    });
    // Reload and wait for V12 to mount again so the fail-closed initializer runs.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="save-first-moment"]', { timeout: 30000 });
    const blocked = await page.evaluate(() => {
      const raw = localStorage.getItem("lovetree-first-journey-unified");
      const s = raw ? JSON.parse(raw) : {};
      return {
        firstSavedVisible: !!document.querySelector('[data-testid="first-saved"]'),
        memorySavedVisible: !!document.querySelector('[data-testid="memory-saved"]'),
        lsFirstSaved: s.firstMoment?.saved,
        lsCanonical: s.canonical,
        lsMemId: s.connections?.[0]?.memoryId,
      };
    });
    assert.equal(blocked.firstSavedVisible, false, "stale first-saved must NOT render after reload");
    assert.equal(blocked.memorySavedVisible, false, "stale memory-saved must NOT render after reload");
    assert.equal(blocked.lsFirstSaved, false, "localStorage firstMoment.saved must be false after reload (fail-closed)");
    assert.equal(blocked.lsCanonical, null, "localStorage canonical must be null after reload (fail-closed)");
    assert.equal(blocked.lsMemId, undefined, "connection memoryId must be dropped after reload (not durable)");

    // BLOCKER 1: drive the memory form and assert the EXACT input reaches draft state.
    // Hard assertions only — no optional conditional around the core proof.
    const noteInput = page.locator('[data-testid="memory-note-input"]');
    // textarea must exist (fail the test if it does not, instead of silently skipping).
    await noteInput.first().waitFor({ state: "attached", timeout: 8000 });
    assert.equal(await noteInput.count(), 1, "memory note textarea must exist exactly once");
    await noteInput.first().scrollIntoViewIfNeeded();
    await noteInput.fill("내가 직접 쓴 마음");
    await page.waitForTimeout(200);
    const draftedNote = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("lovetree-first-journey-unified"));
      return s.memory?.note;
    });
    assert.equal(draftedNote, "내가 직접 쓴 마음", "textarea input must bind to draft state (actual user input)");

    // Drive a NON-DEFAULT emotion radio (default is '설렘'; pick '위로') and prove
    // the exact selected emotion reaches draft state.
    const NON_DEFAULT_EMOTION = "위로";
    const emotionRadio = page.locator(`input[type="radio"][name="emotion"][value="${NON_DEFAULT_EMOTION}"]`);
    await emotionRadio.first().waitFor({ state: "attached", timeout: 8000 });
    assert.equal(await emotionRadio.count(), 1, `emotion radio '${NON_DEFAULT_EMOTION}' must exist`);
    // V12 lays the memory step out in a horizontal scroll container, so a
    // viewport click can miss; trigger the real DOM click (onChange→draft).
    await emotionRadio.first().evaluate((el) => el.click());
    await page.waitForTimeout(200);
    const draftedEmotion = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("lovetree-first-journey-unified"));
      return s.memory?.emotion;
    });
    assert.equal(draftedEmotion, NON_DEFAULT_EMOTION, `selected emotion '${NON_DEFAULT_EMOTION}' must bind to draft state`);

    assert.equal(errors.length, 0, `no console/page errors (${errors.join(" | ")})`);
  } finally {
    await browser.close();
  }
});
