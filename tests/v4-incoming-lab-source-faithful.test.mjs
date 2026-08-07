import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1536, height: 960 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "mobile", width: 320, height: 720 },
];

const SCREENS = [
  { route: "/v4/labs/incoming", testid: null, title: "신규 동생 디자인 소스 미리보기" },
  { route: "/v4/labs/incoming/template-composer", testid: "incoming-composer", source: "reference/v4-sibling-new-sources/lovetree-auto-unfold-template-composer-v2.4-youtube-fixed.html" },
  { route: "/v4/labs/incoming/live-flow-map", testid: "incoming-live-flow-map", source: "reference/v4-sibling-new-sources/lovetree-live-flow-map-v1-1.html" },
  { route: "/v4/labs/incoming/memory-terrain", testid: "incoming-memory-terrain", source: "reference/v4-sibling-new-sources/lovetree-living-memory-terrain-v1-2-standalone.html" },
  { route: "/v4/labs/incoming/film-studio", testid: "incoming-film-studio", source: "reference/v4-sibling-new-sources/lovetree-memory-film-studio-v1.html" },
  { route: "/v4/labs/incoming/popup-season-book", testid: "incoming-popup-season-book", source: "reference/v4-sibling-new-sources/lovetree-popup-season-memory-book-v1.html" },
];

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(900);
  return { page, errors, status: resp.status() };
}

async function checkCommon(page) {
  const iframes = await page.$$eval("iframe", (els) => els.length);
  const dupIds = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
    const seen = new Set();
    const dupes = new Set();
    for (const id of ids) {
      if (seen.has(id)) dupes.add(id);
      seen.add(id);
    }
    return [...dupes];
  });
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth;
  });
  return { iframes, dupIds, overflow };
}

test("v4 labs incoming — every screen renders at 200 across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const screen of SCREENS) {
      for (const vp of VIEWPORTS) {
        const { page, errors, status } = await openPage(browser, `${BASE}${screen.route}`, vp);
        assert.equal(status, 200, `${screen.route} @ ${vp.name}: HTTP 200`);
        assert.equal(errors.length, 0, `${screen.route} @ ${vp.name}: no page/console errors`);
        const common = await checkCommon(page);
        assert.equal(common.overflow, false, `${screen.route} @ ${vp.name}: no horizontal overflow`);
        assert.equal(common.dupIds.length, 0, `${screen.route} @ ${vp.name}: no duplicate ids`);
        if (screen.testid) {
          const present = await page.locator(`[data-testid="${screen.testid}"]`).count();
          assert.ok(present > 0, `${screen.route} @ ${vp.name}: ${screen.testid} root present`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — index lists five NEW_SCREEN candidates", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/labs/incoming`, VIEWPORTS[0]);
    assert.equal(errors.length, 0, "index no errors");
    const cards = await page.locator(".labs-card").count();
    assert.equal(cards, 5, "five candidate cards");
    const classifications = await page.locator(".labs-classification").allTextContents();
    assert.ok(classifications.every((c) => c === "NEW_SCREEN"), "all classified NEW_SCREEN");
    assert.equal(await page.getByText("신규 동생 디자인 소스 미리보기").count(), 1, "index heading");
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — template composer interactions (template switch, node editor, youtube apply)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = (await openPage(browser, `${BASE}/v4/labs/incoming/template-composer`, VIEWPORTS[0])).page;

    // template switch
    await page.getByRole("button", { name: "Season", exact: true }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".incoming-mode-label").textContent(), "SEASON MAP", "season template mode label");

    // node editor drawer (dispatch click on the node click rect)
    await page.waitForTimeout(1200);
    const clicked = await page.evaluate(() => {
      const rect = document.querySelector(".incoming-node-click");
      if (!rect) return false;
      const r = rect.getBoundingClientRect();
      rect.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
      return true;
    });
    assert.equal(clicked, true, "node click rect found");
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator(".incoming-drawer-head strong").textContent(),
      "노드 편집기",
      "node editor drawer opens",
    );

    // youtube apply
    await page.getByRole("textbox", { name: "YouTube 링크 붙여넣기" }).fill("https://youtu.be/M7lc1UVf-VE");
    await page.getByRole("button", { name: "링크 적용" }).click();
    await page.waitForTimeout(250);
    assert.match(await page.locator(".incoming-youtube-status").textContent(), /M7lc1UVf-VE/, "youtube id parsed");
    assert.ok((await page.locator(".incoming-media-preview").count()) > 0, "youtube preview rendered");
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — live flow map interactions (shape, filter, video modal)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = (await openPage(browser, `${BASE}/v4/labs/incoming/live-flow-map`, VIEWPORTS[0])).page;

    // shape switch
    await page.locator('[data-shape="heart"]').click();
    assert.match(
      await page.locator(".incoming-flowmap").getAttribute("class"),
      /shape-heart/,
      "heart shape applied",
    );

    // filter
    await page.locator('[data-filter-group="person"] [data-value="shared"]').click();
    await page.waitForTimeout(250);
    const impact = await page.locator(".incoming-flow-filter-impact").textContent();
    assert.match(impact, /nodes/, "filter impact shows node count");

    // video modal (wait for media nodes to appear, then click play via JS)
    await page.waitForTimeout(3500);
    const opened = await page.evaluate(() => {
      const play = document.querySelector(".incoming-flow-media-play");
      if (!play) return "no-play-button";
      play.click();
      return "clicked";
    });
    await page.waitForTimeout(250);
    assert.equal(opened, "clicked", "media play button found");
    assert.ok((await page.locator(".incoming-flow-video-modal.open").count()) > 0, "video modal opened");
    await page.locator(".incoming-flow-video-close").click();
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — memory terrain interactions (layer toggle, state dot)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = (await openPage(browser, `${BASE}/v4/labs/incoming/memory-terrain`, VIEWPORTS[0])).page;

    // layer toggle
    const returnToggle = page.locator(".incoming-terrain-layer-toggle", { hasText: "RETURN" });
    await returnToggle.click();
    await page.waitForTimeout(800);
    assert.equal(
      await page.locator(".incoming-terrain-layer.layer-1").count(),
      0,
      "RETURN layer removed",
    );
    await returnToggle.click();
    await page.waitForTimeout(800);

    // state dot -> season formation
    await page.locator(".incoming-terrain-state-dot").nth(4).click();
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator(".incoming-terrain-status-pill").textContent(),
      "SEASON FORMATION",
      "season formation state pill",
    );
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — film studio interactions (enter studio, scene select, ratio)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = (await openPage(browser, `${BASE}/v4/labs/incoming/film-studio`, VIEWPORTS[0])).page;

    await page.getByRole("button", { name: "Open studio" }).click();
    await page.waitForTimeout(250);
    assert.ok((await page.locator(".incoming-studio-shell").count()) > 0, "studio shell visible");

    await page.locator(".incoming-studio-scene-item").nth(2).click();
    assert.match(
      await page.locator(".incoming-studio-stage-badge").textContent(),
      /03 · THE REWATCH/,
      "scene 3 selected",
    );

    await page.locator(".incoming-studio-ratio-tabs .incoming-studio-mini-tab").nth(1).click();
    assert.match(
      await page.locator(".incoming-studio-ratio-frame").getAttribute("class"),
      /incoming-film-ratio-vertical/,
      "vertical ratio applied",
    );
  } finally {
    await browser.close();
  }
});

test("v4 labs incoming — popup season book interactions (open, chapter, moment)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = (await openPage(browser, `${BASE}/v4/labs/incoming/popup-season-book`, VIEWPORTS[0])).page;

    await page.getByRole("button", { name: "Open this Season" }).click();
    await page.waitForTimeout(7300);
    assert.equal(
      await page.locator(".incoming-seasonbook").getAttribute("data-state"),
      "bloom",
      "book reaches bloom state",
    );
    assert.equal(await page.locator(".incoming-seasonbook-moment-bloom").count(), 9, "nine moment blooms");

    await page.locator(".incoming-seasonbook-moment-bloom").nth(2).click();
    assert.ok(
      await page.locator(".incoming-seasonbook-moment-card.open").count(),
      "moment card opens",
    );

    await page.locator(".incoming-seasonbook-chapter-btn:last-of-type").click();
    await page.waitForTimeout(2200);
    assert.equal(
      await page.locator(".incoming-seasonbook-chapter-indicator").textContent(),
      "02 / 03",
      "chapter navigation advances",
    );
  } finally {
    await browser.close();
  }
});
