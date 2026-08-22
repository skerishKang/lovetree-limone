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

const YT_A = "https://www.youtube.com/watch?v=ScMzIvxBSi4";
const YT_B = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

const STORAGE_KEYS = [
  "lovetree-first-journey-unified",
  "lovetree-step2-record",
  "lovetree-step3-connection",
];

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function stubRoutineThirdPartyResources(page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === "fonts.googleapis.com") {
      await route.fulfill({ status: 200, contentType: "text/css", body: "" });
      return;
    }
    if (requestUrl.hostname === "i.ytimg.com" || requestUrl.hostname === "img.youtube.com") {
      await route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG });
      return;
    }
    await route.continue();
  });
}

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  await stubRoutineThirdPartyResources(page);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  // #248 moves canonical V1.2 to the default product route. This historical
  // source-faithful suite remains intact against the explicit V1 reference/demo.
  const resolvedUrl = url === `${BASE}/v4/journey` ? `${url}?legacy=1` : url;
  const resp = await page.goto(resolvedUrl, { waitUntil: "networkidle", timeout: 20000 });
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

    const storedScreen = await page.evaluate(() => {
      const raw = localStorage.getItem("lovetree-first-journey-unified");
      return raw ? JSON.parse(raw).currentScreen : null;
    });
    assert.equal(storedScreen, "growth", "growth stage persisted before refresh");

    /* refresh restores the growth stage */
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="growth-first"]', { state: "visible", timeout: 8000 });
    const restoredGrowth = await page.locator('[data-testid="growth-first"]').isVisible();
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
      const h1Lines = Array.from(hero?.querySelectorAll("h1 > span") || []).map(
        (s) => s.textContent.trim(),
      );
      const proofSmall = document.querySelector(".v4-j-proof small")?.textContent?.trim() || "";
      const proofSpans = Array.from(
        document.querySelectorAll(".v4-j-proof-line span"),
      ).map((s) => s.textContent.replace(/\s+/g, " ").trim());
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
        h1Lines,
        proofSmall,
        proofSpans,
      };
    });
    assert.equal(landing.twoCols, true, "landing hero is a 2-column layout");
    assert.ok(landing.copyLeft < landing.boardLeft, "hero copy sits left of the board");
    assert.equal(landing.miniCount, 3, "landing browse shows 3 journey step mini cards");
    assert.equal(landing.boardTop, true, "board top row present");
    assert.equal(landing.caption, true, "board caption present");
    assert.equal(landing.oldHeroArt, false, "old stacked hero-art preview removed");
    assert.equal(landing.oldRow, false, "old inline desc row removed");
    assert.deepEqual(
      landing.h1Lines,
      ["사랑에 빠지는", "순간을 하나의", "러브트리로", "이어 보세요"],
      "landing hero title is the source 4-line copy",
    );
    assert.equal(landing.proofSmall, "러브트리는 이렇게 자라요", "proof small caption present");
    assert.deepEqual(
      landing.proofSpans,
      ["01 발견", "02 기록", "03 연결", "04 성장"],
      "proof line shows source 발견/기록/연결/성장",
    );

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
        ctaBg: cs ? cs.backgroundImage : "",
        ctaColor: cs ? cs.color : "",
        modalWidth: modalEl ? Math.round(modalEl.getBoundingClientRect().width) : 0,
      };
    });
    assert.equal(modal.notePresent, true, "modal green notice block present");
    assert.match(modal.noteBg, /223, 232, 220/, "green notice uses sage pale background");
    assert.ok(parseFloat(modal.ctaWidth) > 300, "modal primary CTA is full width");
    assert.match(modal.ctaBg, /linear-gradient/, "modal primary CTA is a filled gradient");
    assert.equal(modal.ctaColor, "rgb(255, 253, 248)", "modal primary CTA uses light text");
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
    await page.waitForSelector('[data-testid="growth-first"]', { state: "visible", timeout: 8000 });
    await page.waitForSelector('[data-testid="growth-next"]', { state: "visible", timeout: 8000 });
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
      const navEl = document.querySelector(".v4-journey-stage-nav");
      const doc = document.documentElement;
      const last = btns[btns.length - 1];
      return {
        count: btns.length,
        allNowrap: btns.every((b) => getComputedStyle(b).whiteSpace === "nowrap"),
        navClipped: navEl ? navEl.scrollWidth > navEl.clientWidth : false,
        lastVisible: last
          ? last.getBoundingClientRect().right <= doc.clientWidth
          : false,
        pageOverflow: doc.scrollWidth > doc.clientWidth,
      };
    });
    assert.equal(nav.count, 4, "mobile 4-stage nav present");
    assert.equal(nav.allNowrap, true, "mobile stage labels are single-line (nowrap, no char-break)");
    assert.equal(nav.navClipped, false, "mobile stage nav is not horizontally clipped");
    assert.equal(nav.lastVisible, true, "mobile last stage button is fully visible");
    assert.equal(nav.pageOverflow, false, "mobile page has no horizontal overflow");
    await mobilePage.page.close();
  } finally {
    await browser.close();
  }
});

test("v4 first journey — success states use centered large success panels", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    /* step 2 success panel */
    const step2 = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[0]);
    await step2.page.evaluate(({ YT_A }) => {
      localStorage.setItem("lovetree-first-journey-unified", JSON.stringify({
        currentScreen: "step2-success",
        treeName: "건호에게 입덕한 3일",
        firstMoment: { url: YT_A, videoId: "ScMzIvxBSi4", title: "처음 마음이 멈춘 장면", note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.", discoveryDate: "2026-08-03", thumbnail: `https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg`, saved: true },
        memory: { emotion: "벅참", customEmotion: "벅참", time: "00:42", note: "표정과 말투가 오래 남은 장면.", date: "2026-08-03", publicMemo: true, saved: true },
        connections: [],
        step3Origin: null,
        drafts: { step3: { url: "", title: "", time: "00:00", relation: "댓글을 따라 찾아봤어요", note: "" } },
      }));
    }, { YT_A });
    await step2.page.reload({ waitUntil: "networkidle" });
    await step2.page.waitForSelector('[data-testid="step2-success"]', { state: "visible", timeout: 8000 });
    const s2 = await step2.page.evaluate(() => {
      const panel = document.querySelector("[data-testid='step2-success']");
      const shell = document.querySelector(".v4-j-shell");
      const layout = document.querySelector(".v4-j-layout-two");
      const pr = panel?.getBoundingClientRect();
      const sr = shell?.getBoundingClientRect();
      return {
        panelPresent: !!panel,
        centered: pr && sr
          ? Math.abs(pr.left + pr.width / 2 - (sr.left + sr.width / 2)) < 8
          : false,
        wide: pr ? pr.width > 460 : false,
        layoutHidden: !layout,
        flower: !!panel?.querySelector(".v4-j-success-flower"),
        resultCard: !!panel?.querySelector(".v4-j-result-card"),
        actionCount: panel?.querySelectorAll(".v4-j-success-actions button").length || 0,
        overlayLeft: pr ? pr.left < 0 : false,
      };
    });
    assert.equal(s2.panelPresent, true, "step2 success panel present");
    assert.equal(s2.centered, true, "step2 success panel is centered in the shell");
    assert.equal(s2.wide, true, "step2 success panel is a wide panel");
    assert.equal(s2.layoutHidden, true, "step2 two-column layout hidden in success state");
    assert.equal(s2.flower, true, "step2 success flower mark present");
    assert.equal(s2.resultCard, true, "step2 success result card present");
    assert.equal(s2.actionCount, 2, "step2 success shows edit + next actions");
    assert.equal(s2.overlayLeft, false, "step2 success panel stays within the viewport");
    assert.equal(step2.errors.length, 0, "step2 success produces no console/page errors");
    await step2.page.close();

    /* step 3 success panel */
    const step3 = await openPage(browser, `${BASE}/v4/journey`, VIEWPORTS[0]);
    await step3.page.evaluate(({ YT_A, YT_B }) => {
      localStorage.setItem("lovetree-first-journey-unified", JSON.stringify({
        currentScreen: "step3-success",
        treeName: "건호에게 입덕한 3일",
        firstMoment: { url: YT_A, videoId: "ScMzIvxBSi4", title: "처음 마음이 멈춘 장면", note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.", discoveryDate: "2026-08-03", thumbnail: `https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg`, saved: true },
        memory: { emotion: "벅참", customEmotion: "벅참", time: "00:42", note: "표정과 말투가 오래 남은 장면.", date: "2026-08-03", publicMemo: true, saved: true },
        connections: [{ first: { url: YT_A, videoId: "ScMzIvxBSi4", title: "처음 마음이 멈춘 장면", note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.", discoveryDate: "2026-08-03", thumbnail: `https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg`, saved: true }, next: { id: "ysz5S6PUM-U", url: YT_B, title: "다시 찾아본 무대", time: "01:15", relation: "팬이 추천해 줬어요", note: "댓글에서 인터뷰를 추천받아 바로 찾아봤어." }, createdAt: new Date().toISOString() }],
        step3Origin: null,
        drafts: { step3: { url: "", title: "", time: "00:00", relation: "댓글을 따라 찾아봤어요", note: "" } },
      }));
    }, { YT_A, YT_B });
    await step3.page.reload({ waitUntil: "networkidle" });
    await step3.page.waitForSelector('[data-testid="step3-success"]', { state: "visible", timeout: 8000 });
    const s3 = await step3.page.evaluate(() => {
      const panel = document.querySelector("[data-testid='step3-success']");
      const shell = document.querySelector(".v4-j-shell");
      const layout = document.querySelector(".v4-j-layout-three");
      const pr = panel?.getBoundingClientRect();
      const sr = shell?.getBoundingClientRect();
      return {
        panelPresent: !!panel,
        centered: pr && sr
          ? Math.abs(pr.left + pr.width / 2 - (sr.left + sr.width / 2)) < 8
          : false,
        wide: pr ? pr.width > 460 : false,
        layoutHidden: !layout,
        pathSummary: !!panel?.querySelector(".v4-j-path-summary"),
        relation: panel?.querySelector("[data-testid='success-relation']")?.textContent?.trim() || "",
        actionCount: panel?.querySelectorAll(".v4-j-success-actions button").length || 0,
      };
    });
    assert.equal(s3.panelPresent, true, "step3 success panel present");
    assert.equal(s3.centered, true, "step3 success panel is centered in the shell");
    assert.equal(s3.wide, true, "step3 success panel is a wide panel");
    assert.equal(s3.layoutHidden, true, "step3 three-column layout hidden in success state");
    assert.equal(s3.pathSummary, true, "step3 success path summary present");
    assert.equal(s3.relation, "팬이 추천해 줬어요", "step3 success relation carried through");
    assert.equal(s3.actionCount, 2, "step3 success shows again + finish actions");
    assert.equal(step3.errors.length, 0, "step3 success produces no console/page errors");
    await step3.page.close();
  } finally {
    await browser.close();
  }
});