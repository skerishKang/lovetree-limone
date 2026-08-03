import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1536, height: 960 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "mobile", width: 320, height: 720 },
];

const YT_A = "https://www.youtube.com/watch?v=ScMzIvxBSi4";
const YT_B = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

const STORAGE_KEYS = [
  "lovetree-first-journey-unified",
  "lovetree-step2-record",
  "lovetree-step3-connection",
];

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
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
    const body = document.body;
    return {
      bodyOverflow: body.scrollWidth > body.clientWidth,
      docWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  return {
    iframes,
    dupIds,
    overflow: overflow.bodyOverflow,
    scrollWidth: overflow.docWidth,
    clientWidth: overflow.clientWidth,
  };
}

test("v4 first journey — route and common checks across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(browser, `${BASE}/v4/journey`, vp);
      const common = await checkCommon(page);
      assert.equal(status, 200, `journey ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `journey ${vp.name}: no console/page errors`);
      assert.equal(common.iframes, 0, `journey ${vp.name}: no iframes`);
      assert.equal(common.dupIds.length, 0, `journey ${vp.name}: no duplicate IDs`);
      assert.equal(
        common.overflow,
        false,
        `journey ${vp.name}: no horizontal overflow (${common.scrollWidth}/${common.clientWidth})`,
      );
      const stageBtns = await page.$$(".v4-journey-stage-btn");
      assert.equal(stageBtns.length, 4, `journey ${vp.name}: 4-stage navigation exists`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("v4 first journey — locked stages cannot be reached directly", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[0]);
    const stageBtns = page.locator(".v4-journey-stage-btn");
    assert.equal(await stageBtns.count(), 4);
    for (const idx of [1, 2, 3]) {
      assert.equal(
        await stageBtns.nth(idx).getAttribute("aria-disabled"),
        "true",
        `stage ${idx + 1} must be aria-disabled before unlock`,
      );
    }
    for (const idx of [1, 2, 3]) {
      await stageBtns.nth(idx).click({ force: true }).catch(() => {});
      await page.waitForTimeout(150);
      const advanced = await page.evaluate(() => {
        return {
          memoryForm: document.querySelector("#memory-form") !== null,
          connectForm: document.querySelector("#connect-form") !== null,
          growthBoard: document.querySelector("[data-testid='growth-first']") !== null,
        };
      });
      assert.equal(advanced.memoryForm, false, `stage ${idx + 1} click must not open step2`);
      assert.equal(advanced.connectForm, false, `stage ${idx + 1} click must not open step3`);
      assert.equal(advanced.growthBoard, false, `stage ${idx + 1} click must not open growth`);
    }
    assert.equal(errors.length, 0, "locked stage interactions produce no errors");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 first journey — full flow, storage keys, refresh restore, ESC modal", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[0]);
    await page.evaluate(() => localStorage.clear());

    const stageBtns = page.locator(".v4-journey-stage-btn");
    assert.equal(await stageBtns.count(), 4);

    /* step 1: open tree-name modal, ESC closes, reopen and submit */
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await page.getByRole("button", { name: /첫 순간 심기/ }).first().click().catch(() => {});
      const opened = await page
        .waitForSelector("#name-form", { timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (opened) break;
    }
    await page.waitForSelector("#name-form", { timeout: 8000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    assert.equal(await page.locator("#name-form").count(), 0, "ESC closes the modal");

    await page.getByRole("button", { name: /첫 순간 심기/ }).first().click();
    await page.waitForSelector("#name-form");
    await page.fill("#tree-name", "건호에게 입덕한 3일");
    await page.locator('#name-form button[type="submit"]').click();
    await page.waitForSelector("#discovery-form", { timeout: 8000 });

    await page.fill("#content-url", YT_A);
    await page.fill("#discovery-note", "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.");
    await page.locator('#discovery-form button[type="submit"]').click();
    await page.waitForSelector("#memory-form", { timeout: 8000 });

    /* step 2: emotion chip + custom emotion + memo + visibility + time */
    await page.locator('[data-emotion="웃음"]').click();
    await page.fill("#custom-emotion", "벅참");
    await page.fill("#time", "00:42");
    await page.fill("#memory", "표정과 말투가 오래 남은 장면.");
    await page.locator("#visibility").click();
    await page.locator('#memory-form button[type="submit"]').click();
    await page.waitForSelector('[data-testid="step2-success"]', { timeout: 8000 });

    const step2Stored = await page.evaluate(() => localStorage.getItem("lovetree-step2-record"));
    assert.ok(step2Stored, "lovetree-step2-record saved");
    const step2Parsed = JSON.parse(step2Stored);
    assert.equal(step2Parsed.emotion, "벅참", "custom emotion persisted");
    assert.equal(step2Parsed.publicMemo, true, "visibility persisted");

    await page.getByRole("button", { name: /첫 여정 보기/ }).click();
    await page.waitForSelector("#connect-form", { timeout: 8000 });

    /* step 3: connect next video with relation + note */
    await page.fill("#next-url", YT_B);
    await page.fill("#next-title", "다시 찾아본 무대");
    await page.fill("#next-time", "01:15");
    await page.locator('[data-relation="팬이 추천해 줬어요"]').click();
    await page.fill("#next-note", "댓글에서 인터뷰를 추천받아 바로 찾아봤어.");
    await page.locator('#connect-form button[type="submit"]').click();
    await page.waitForSelector('[data-testid="step3-success"]', { timeout: 8000 });

    const step3Stored = await page.evaluate(() => localStorage.getItem("lovetree-step3-connection"));
    assert.ok(step3Stored, "lovetree-step3-connection saved");
    const step3Parsed = JSON.parse(step3Stored);
    assert.equal(step3Parsed.next.title, "다시 찾아본 무대", "connection next persisted");

    await page.getByRole("button", { name: /내 러브트리 보기/ }).click();
    await page.waitForSelector('[data-testid="growth-first"]', { timeout: 8000 });
    assert.ok(await page.locator('[data-testid="growth-next"]').isVisible(), "growth shows connected next");

    /* storage: 3 keys present */
    for (const key of STORAGE_KEYS) {
      const value = await page.evaluate((k) => localStorage.getItem(k), key);
      assert.ok(value, `${key} must be stored`);
    }

    /* refresh restores the growth stage */
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const restoredGrowth = await page.locator('[data-testid="growth-first"]').isVisible().catch(() => false);
    assert.ok(restoredGrowth, "refresh restores completed flow (growth stage)");

    assert.equal(errors.length, 0, "no console/page errors through full flow");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 first journey — restored source composition (landing 2-col, growth landscape, modal, mobile nav)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    /* desktop landing composition */
    const { page, errors } = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[0]);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const landing = await page.evaluate(() => {
      const hero = document.querySelector(".v4-j-hero");
      const heroCols = hero ? getComputedStyle(hero).gridTemplateColumns : "";
      const copy = document.querySelector(".v4-j-hero .v4-j-copy");
      const board = document.querySelector(".v4-j-hero .v4-j-board");
      const copyRect = copy?.getBoundingClientRect();
      const boardRect = board?.getBoundingClientRect();
      return {
        heroCols,
        twoCols: heroCols.split(" ").length === 2,
        copyLeft: Math.round(copyRect?.left || 0),
        boardLeft: Math.round(boardRect?.left || 0),
        boardRight: Math.round(boardRect?.left || 0) > Math.round(copyRect?.left || 0),
        miniCount: document.querySelectorAll(".v4-j-mini").length,
        browsePresent: !!document.querySelector(".v4-j-browse"),
        boardTop: !!document.querySelector(".v4-j-board-top"),
        caption: !!document.querySelector(".v4-j-caption"),
        oldHeroArt: !!document.querySelector(".v4-j-hero-art"),
        oldRow: !!document.querySelector(".v4-j-row"),
      };
    });
    assert.equal(landing.twoCols, true, "landing hero is a 2-column layout");
    assert.ok(landing.copyLeft < landing.boardLeft, "hero copy sits left of the board");
    assert.equal(landing.miniCount, 3, "landing browse shows 3 journey step mini cards");
    assert.equal(landing.boardTop, true, "board top row present");
    assert.equal(landing.caption, true, "board caption present");
    assert.equal(landing.oldHeroArt, false, "old stacked hero-art preview removed");
    assert.equal(landing.oldRow, false, "old inline desc row removed");

    /* modal green notice + filled primary CTA */
    await page.getByRole("button", { name: /첫 순간 심기/ }).first().click();
    await page.waitForSelector("#name-form", { timeout: 8000 });
    const modal = await page.evaluate(() => {
      const note = document.querySelector(".v4-j-modal-note");
      const cta = document.querySelector(".v4-j-modal .v4-j-btn-primary");
      const modalEl = document.querySelector(".v4-j-modal");
      const cs = cta ? getComputedStyle(cta) : null;
      return {
        notePresent: !!note,
        noteBg: note ? getComputedStyle(note).backgroundColor : "",
        ctaWidth: cs ? cs.width : "",
        ctaBg: cs ? cs.backgroundColor : "",
        modalWidth: modalEl ? Math.round(modalEl.getBoundingClientRect().width) : 0,
      };
    });
    assert.equal(modal.notePresent, true, "modal green notice block present");
    assert.match(modal.noteBg, /223, 232, 220/, "green notice uses sage pale background");
    assert.ok(parseFloat(modal.ctaWidth) > 300, "modal primary CTA is full width");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    /* growth landscape cards + central connector */
    await page.evaluate(({ YT_A, YT_B }) => {
      localStorage.setItem("lovetree-first-journey-unified", JSON.stringify({
        currentScreen: "growth",
        treeName: "건호에게 입덕한 3일",
        firstMoment: { url: YT_A, videoId: "ScMzIvxBSi4", title: "처음 마음이 멈춘 장면", note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.", discoveryDate: "2026-08-03", thumbnail: `https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg`, saved: true },
        memory: { emotion: "벅참", customEmotion: "벅참", time: "00:42", note: "표정과 말투가 오래 남은 장면.", date: "2026-08-03", publicMemo: true, saved: true },
        connections: [{ first: { url: YT_A, videoId: "ScMzIvxBSi4", title: "처음 마음이 멈춘 장면", note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.", discoveryDate: "2026-08-03", thumbnail: `https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg`, saved: true }, next: { id: "ysz5S6PUM-U", url: YT_B, title: "다시 찾아본 무대", time: "01:15", relation: "팬이 추천해 줬어요", note: "댓글에서 인터뷰를 추천받아 바로 찾아봤어." }, createdAt: new Date().toISOString() }],
        step3Origin: null,
        drafts: { step3: { url: "", title: "", time: "00:00", relation: "댓글을 따라 찾아봤어요", note: "" } },
      }));
    }, { YT_A, YT_B });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const growth = await page.evaluate(() => {
      const cards = document.querySelectorAll("[data-testid='growth-first'], [data-testid='growth-next']");
      const first = document.querySelector("[data-testid='growth-first']");
      const thumb = document.querySelector(".v4-j-growth-thumb");
      const connector = document.querySelector(".v4-j-growth-connector");
      const cardsGrid = document.querySelector(".v4-j-growth-cards");
      const fr = first?.getBoundingClientRect();
      const tr = thumb?.getBoundingClientRect();
      return {
        cardCount: cards.length,
        landscape: !!fr && fr.width > fr.height,
        thumbLandscape: !!tr && tr.width > tr.height,
        thumbHeight: Math.round(tr?.height || 0),
        connectorPresent: !!connector,
        cardsCols: cardsGrid ? getComputedStyle(cardsGrid).gridTemplateColumns : "",
        connectorText: connector?.textContent?.trim() || "",
      };
    });
    assert.equal(growth.cardCount, 2, "growth shows two moment cards");
    assert.equal(growth.landscape, true, "growth cards are wide landscape");
    assert.equal(growth.thumbLandscape, true, "growth thumb is landscape ratio");
    assert.ok(growth.thumbHeight >= 140 && growth.thumbHeight <= 175, `growth thumb height ~155px (${growth.thumbHeight})`);
    assert.equal(growth.connectorPresent, true, "central circular connector present");
    const cols = growth.cardsCols.split(" ").filter(Boolean);
    assert.equal(cols.length, 3, "growth cards grid has 3 columns");
    assert.match(growth.cardsCols, /72px/, "growth cards grid middle column is ~72px (connector column)");
    assert.ok(growth.connectorText.includes("✿"), "connector carries flower mark");
    assert.equal(errors.length, 0, "no console/page errors in composition checks");

    /* mobile: stage nav labels never break per character + growth vertical landscape */
    const mobilePage = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[4]);
    await mobilePage.page.evaluate(() => localStorage.clear());
    await mobilePage.page.reload({ waitUntil: "networkidle" });
    await mobilePage.page.waitForTimeout(500);
    const nav = await mobilePage.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll(".v4-journey-stage-btn"));
      return {
        count: btns.length,
        allNowrap: btns.every((b) => getComputedStyle(b).whiteSpace === "nowrap"),
      };
    });
    assert.equal(nav.count, 4, "mobile 4-stage nav present");
    assert.equal(nav.allNowrap, true, "mobile stage labels are single-line (nowrap, no char-break)");
    await mobilePage.page.close();
  } finally {
    await browser.close();
  }
});
