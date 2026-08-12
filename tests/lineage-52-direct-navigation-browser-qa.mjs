import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const INERT_SOURCE_URL =
  `${BASE}/design-lab-assets/lineages/52/v3/lovetree-52-v3-reference-earth-orbit.txt`;

test("Lineage 52 V3 — direct source navigation remains inert outside the sandboxed runner", { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(INERT_SOURCE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    assert.ok(response?.ok(), `inert source HTTP ${response?.status()}`);

    const headers = await response.allHeaders();
    assert.match(headers["content-type"] || "", /^text\/plain(?:;|$)/i, "direct source is text/plain");
    assert.equal((headers["x-content-type-options"] || "").toLowerCase(), "nosniff");
    assert.match(headers["content-security-policy"] || "", /default-src 'none'/i);
    assert.match(headers["content-security-policy"] || "", /(?:^|;)\s*sandbox(?:;|$)/i);

    const state = await page.evaluate(() => ({
      contentType: document.contentType,
      scriptElements: document.querySelectorAll("script").length,
      orbitReady: window.__V3_READY === true,
      orbitApi: typeof window.__ORBIT3,
    }));

    assert.equal(state.contentType, "text/plain");
    assert.equal(state.scriptElements, 0, "raw HTML text is not parsed into executable script elements");
    assert.equal(state.orbitReady, false, "raw source runtime never initializes on direct navigation");
    assert.equal(state.orbitApi, "undefined", "raw source API is unavailable on direct navigation");
    assert.deepEqual(pageErrors, [], `direct navigation has no page errors: ${pageErrors.join(" | ")}`);
  } finally {
    await browser.close();
  }
});
