import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

/**
 * #248 First Journey behavioral truthfulness checks.
 * No backend / real DB / real auth. Drives the real default V1.2 route and
 * verifies the browser-side boundary: localStorage is draft/UI state only and
 * can never resurrect canonical IDs or saved claims.
 */

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const STORAGE_KEY = "lovetree-first-journey-unified";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function openCanonicalPage(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "img.youtube.com" || u.hostname === "i.ytimg.com") {
      return route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG });
    }
    if (u.hostname === "fonts.googleapis.com") {
      return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    }
    return route.continue();
  });
  await page.goto(`${BASE}/v4/journey`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="canonical-first-journey-v12"]', { timeout: 30000 });
  return { page, errors };
}

test("#248: stale durable localStorage claims are stripped and cannot resurrect success", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCanonicalPage(browser);

    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        currentScreen: "growth",
        treeName: "stale tree",
        firstMoment: {
          url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
          title: "stale first",
          saved: true,
          memoryId: "stale-first-memory",
        },
        memory: { emotion: "설렘", note: "stale", saved: true },
        secondMoment: {
          url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
          title: "stale second",
          whyNext: "stale why",
          saved: true,
          id: "stale-second-memory",
        },
        connections: [{ memoryId: "stale-connection-id" }],
        canonical: {
          treeId: "stale-tree-id",
          firstMemoryId: "stale-first-memory",
          secondMemoryId: "stale-second-memory",
        },
        complete: true,
      }));
    }, STORAGE_KEY);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="canonical-first-journey-v12"]', { timeout: 30000 });

    const blocked = await page.evaluate((key) => {
      const raw = localStorage.getItem(key) || "";
      const state = raw ? JSON.parse(raw) : {};
      return {
        raw,
        firstSavedVisible: !!document.querySelector('[data-testid="first-saved"]'),
        memorySavedVisible: !!document.querySelector('[data-testid="memory-saved"]'),
        hasCanonical: Object.prototype.hasOwnProperty.call(state, "canonical"),
        hasConnections: Object.prototype.hasOwnProperty.call(state, "connections"),
        hasComplete: Object.prototype.hasOwnProperty.call(state, "complete"),
        hasFirstSaved: Object.prototype.hasOwnProperty.call(state.firstMoment || {}, "saved"),
        hasFirstMemoryId: Object.prototype.hasOwnProperty.call(state.firstMoment || {}, "memoryId"),
        hasSecondSaved: Object.prototype.hasOwnProperty.call(state.secondMoment || {}, "saved"),
        hasSecondId: Object.prototype.hasOwnProperty.call(state.secondMoment || {}, "id"),
      };
    }, STORAGE_KEY);

    assert.equal(blocked.firstSavedVisible, false, "stale first-saved must not render after reload");
    assert.equal(blocked.memorySavedVisible, false, "stale memory-saved must not render after reload");
    assert.equal(blocked.hasCanonical, false, "canonical IDs are omitted from the sanitized draft snapshot");
    assert.equal(blocked.hasConnections, false, "connection persistence truth is omitted from localStorage");
    assert.equal(blocked.hasComplete, false, "completion truth is omitted from localStorage");
    assert.equal(blocked.hasFirstSaved, false, "first saved claim is omitted");
    assert.equal(blocked.hasFirstMemoryId, false, "first Memory id is omitted");
    assert.equal(blocked.hasSecondSaved, false, "second saved claim is omitted");
    assert.equal(blocked.hasSecondId, false, "second Memory id is omitted");
    assert.doesNotMatch(blocked.raw, /stale-tree-id|stale-first-memory|stale-second-memory|stale-connection-id/);
    assert.equal(errors.length, 0, `no console/page errors (${errors.join(" | ")})`);
  } finally {
    await browser.close();
  }
});

test("#248: malformed localStorage fails closed to a clean draft schema", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCanonicalPage(browser);
    await page.evaluate((key) => localStorage.setItem(key, "{not-valid-json"), STORAGE_KEY);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="canonical-first-journey-v12"]', { timeout: 30000 });

    const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), STORAGE_KEY);
    assert.equal(state.version, 2, "malformed state is replaced by the current draft schema");
    assert.equal(state.treeName, "", "malformed durable state cannot seed a tree claim");
    assert.equal(state.firstMoment?.url, "", "first draft resets cleanly");
    assert.equal(state.secondMoment?.whyNext, "", "second draft resets cleanly");
    assert.equal(Object.prototype.hasOwnProperty.call(state, "canonical"), false, "no canonical field is created");
    assert.equal(errors.length, 0, `no console/page errors (${errors.join(" | ")})`);
  } finally {
    await browser.close();
  }
});

test("#248: exact first/second user draft values persist without saved or ID truth", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCanonicalPage(browser);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="canonical-first-journey-v12"]', { timeout: 30000 });

    const first = {
      treeName: "내가 만든 첫 러브트리",
      url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
      title: "내가 직접 고른 첫 순간",
      note: "첫 순간에 내가 직접 쓴 메모",
    };
    const second = {
      url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
      title: "내가 직접 고른 다음 순간",
      note: "두 번째 순간의 실제 메모",
      relation: "팬이 추천해 줬어요",
      whyNext: "댓글을 보고 바로 다음 영상을 직접 찾아봤어요",
    };

    await page.locator('[data-testid="tree-name-input"]').fill(first.treeName);
    await page.locator('[data-testid="first-url-input"]').fill(first.url);
    await page.locator('[data-testid="first-title-input"]').fill(first.title);
    await page.locator('[data-testid="first-note-input"]').fill(first.note);
    await page.locator('[data-testid="memory-note-input"]').fill("내가 직접 쓴 마음");
    await page.locator('input[type="radio"][name="emotion"][value="위로"]').evaluate((el) => el.click());
    await page.locator('[data-testid="second-url-input"]').fill(second.url);
    await page.locator('[data-testid="second-title-input"]').fill(second.title);
    await page.locator('[data-testid="second-note-input"]').fill(second.note);
    await page.locator('[data-testid="second-relation-input"]').selectOption({ label: second.relation });
    await page.locator('[data-testid="why-next-input"]').fill(second.whyNext);

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), STORAGE_KEY);
    assert.equal(stored.treeName, first.treeName);
    assert.equal(stored.firstMoment.url, first.url);
    assert.equal(stored.firstMoment.title, first.title);
    assert.equal(stored.firstMoment.note, first.note);
    assert.equal(stored.memory.note, "내가 직접 쓴 마음");
    assert.equal(stored.memory.emotion, "위로");
    assert.equal(stored.secondMoment.url, second.url);
    assert.equal(stored.secondMoment.title, second.title);
    assert.equal(stored.secondMoment.note, second.note);
    assert.equal(stored.secondMoment.relation, second.relation);
    assert.equal(stored.secondMoment.whyNext, second.whyNext);
    assert.equal(Object.prototype.hasOwnProperty.call(stored, "canonical"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(stored.firstMoment, "saved"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(stored.secondMoment, "saved"), false);
    assert.equal(errors.length, 0, `no console/page errors (${errors.join(" | ")})`);
  } finally {
    await browser.close();
  }
});

test("#248: anonymous first save composes existing auth and never claims success", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openCanonicalPage(browser);
    await page.locator('[data-testid="save-first-moment"]').click();
    await page.waitForSelector(".auth-modal-backdrop", { timeout: 8000 });
    assert.equal(await page.locator('[data-testid="first-saved"]').count(), 0, "anonymous action cannot show durable first-saved state");
    assert.equal(await page.locator('[data-testid="memory-saved"]').count(), 0, "anonymous action cannot show durable memory-saved state");
    assert.equal(errors.length, 0, `no console/page errors (${errors.join(" | ")})`);
  } finally {
    await browser.close();
  }
});