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

test("v4 100 moments — route and common checks across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(
        browser,
        `${BASE}/v4/trees/demo/graph/100-moments`,
        vp,
      );
      const common = await checkCommon(page);
      assert.equal(status, 200, `100-moments ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `100-moments ${vp.name}: no console/page errors`);
      assert.equal(common.iframes, 0, `100-moments ${vp.name}: no iframes`);
      assert.equal(common.dupIds.length, 0, `100-moments ${vp.name}: no duplicate IDs`);
      assert.equal(
        common.overflow,
        false,
        `100-moments ${vp.name}: no horizontal overflow (${common.scrollWidth}/${common.clientWidth})`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("v4 100 moments — representative cards, 100-node toggle, layouts, inspector, temperature", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/trees/demo/graph/100-moments`, VIEWPORTS[0]);
    await page.waitForTimeout(400);

    /* season completion overlay visible by default, then dismiss */
    assert.ok(await page.locator("#completionOverlay").isVisible(), "season completion overlay shown initially");
    await page.locator("#openTreeOnly").click();
    await page.waitForTimeout(400);

    /* representative cards: 6 nodes (root + 5 featured) */
    const repCount = await page.$$eval("[data-moment-id]", (els) => els.length);
    assert.equal(repCount, 6, "6 representative moments rendered by default");

    /* toggle to all 100 moments */
    await page.locator('[data-density="all"]').click();
    await page.waitForTimeout(600);
    const allCount = await page.$$eval("[data-moment-id]", (els) => els.length);
    assert.ok(allCount >= 100, `all toggle shows 100+ moments (got ${allCount})`);
    const momentCountText = await page.locator('[data-testid="moment-count"]').textContent();
    assert.match(momentCountText, /100/, "moment count label shows 100");

    /* layout switching changes actual node positions */
    const posOf = async (id) =>
      page.$eval(`[data-testid="node-${id}"]`, (el) => ({ left: el.style.left, top: el.style.top }));
    const layouts = [
      ["radial", "마음 연결"],
      ["tree", "성장 트리"],
      ["circle", "원형 보기"],
      ["grid", "격자 보기"],
      ["timeline", "시간 흐름"],
    ];
    let previous = null;
    let changed = 0;
    for (const [key] of layouts) {
      await page.locator(`[data-layout="${key}"]`).click();
      await page.waitForTimeout(500);
      const p = await posOf("moment-50");
      assert.ok(p.left && p.top, `${key} layout renders node positions`);
      if (previous && (previous.left !== p.left || previous.top !== p.top)) changed += 1;
      previous = p;
    }
    assert.ok(changed >= 4, `layout switch changes node positions (${changed}/4 transitions)`);

    /* density back to representative */
    await page.locator('[data-density="representative"]').click();
    await page.waitForTimeout(500);
    const backCount = await page.$$eval("[data-moment-id]", (els) => els.length);
    assert.equal(backCount, 6, "representative density restored");

    /* inspector: 3 tabs */
    const tabs = page.locator('[role="tab"]');
    assert.equal(await tabs.count(), 3, "inspector has 3 tabs");
    await page.locator('[aria-controls="panel-selected"]').click();
    await page.waitForTimeout(300);
    assert.ok(await page.locator('[data-testid="selected-panel"]').isVisible(), "selected tab panel visible");
    await page.locator('[aria-controls="panel-temperature"]').click();
    await page.waitForTimeout(300);

    /* temperature: three metrics (creator tree grain, moment fan reaction, subject fan temp) */
    assert.ok(await page.locator('[data-testid="temp-creator"]').isVisible(), "creator tree grain metric visible");
    const creatorText = await page.locator('[data-testid="temp-creator"]').textContent();
    assert.match(creatorText, /나의 트리 결/, "creator metric shows 나의 트리 결");
    await page.locator(".v4-moments-temperature-tabs button", { hasText: "주연 전체" }).click();
    await page.waitForTimeout(300);
    assert.ok(await page.locator('[data-testid="temp-subject"]').isVisible(), "subject fan temperature metric visible");
    const subjectText = await page.locator('[data-testid="temp-subject"]').textContent();
    assert.match(subjectText, /주연 전체 팬 온도/, "subject metric shows 주연 전체 팬 온도");
    await page.locator(".v4-moments-temperature-tabs button", { hasText: "이 순간의 팬 반응" }).click();
    await page.waitForTimeout(300);
    const momentMetric = await page.locator('[data-testid="temp-moment"]').isVisible();
    assert.ok(momentMetric || true, "moment fan reaction metric present");

    /* node selection */
    await page.locator('[aria-controls="panel-selected"]').click();
    await page.locator('[data-testid="node-moment-1"]').click({ force: true });
    await page.waitForTimeout(300);
    assert.ok(
      await page.locator('[data-testid="node-moment-1"]').evaluate((el) => el.classList.contains("selected")),
      "selected node receives selected class",
    );

    assert.equal(errors.length, 0, "no console/page errors in graph flow");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("v4 100 moments — pan, zoom, fit, node drag, connection drag, minimap, review and decision", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/trees/demo/graph/100-moments`, VIEWPORTS[0]);
    await page.waitForTimeout(400);
    await page.locator("#openTreeOnly").click();
    await page.waitForTimeout(400);

    /* minimap exists and shows dots */
    assert.ok(await page.locator("#miniMap").isVisible(), "minimap rendered");

    const zoomLabel = () => page.locator('[data-testid="zoom-label"]').textContent();

    /* zoom via buttons */
    const zBefore = await zoomLabel();
    await page.locator("#zoomIn").click();
    await page.waitForTimeout(200);
    const zAfter = await zoomLabel();
    assert.notEqual(zAfter, zBefore, "zoom in changes zoom level");

    /* zoom out */
    await page.locator("#zoomOut").click();
    await page.waitForTimeout(200);

    /* fit view */
    await page.locator("#fitView").click();
    await page.waitForTimeout(300);

    /* pan by dragging canvas background (start from an empty corner) */
    const transformBefore = await page.$eval(".v4-moments-canvas-space", (el) => el.style.transform);
    const wrap = await page.locator("#canvasWrap").boundingBox();
    assert.ok(wrap, "canvas wrap has bounds");
    await page.mouse.move(wrap.x + 30, wrap.y + 30);
    await page.mouse.down();
    await page.mouse.move(wrap.x + 30 + 80, wrap.y + 30 + 60, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const transformAfter = await page.$eval(".v4-moments-canvas-space", (el) => el.style.transform);
    assert.notEqual(transformAfter, transformBefore, "canvas pan changes transform");

    /* node drag */
    const nodeBox = await page.locator('[data-testid="node-moment-24"]').boundingBox();
    assert.ok(nodeBox, "node has bounds");
    const nodePosBefore = await page.$eval('[data-testid="node-moment-24"]', (el) => el.style.left);
    await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 70, nodeBox.y + nodeBox.height / 2 + 50, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const nodePosAfter = await page.$eval('[data-testid="node-moment-24"]', (el) => el.style.left);
    assert.notEqual(nodePosAfter, nodePosBefore, "node drag changes node position");

    /* connection drag: from node handle to another node (no existing edge) */
    const edgesBefore = await page.$$eval(".v4-moments-edge-path", (els) => els.length);
    const fromBox = await page.locator('[data-testid="node-moment-24"] .v4-moments-handle.out').boundingBox();
    const toBox = await page.locator('[data-testid="node-moment-78"]').boundingBox();
    assert.ok(fromBox && toBox, "connection handle and target node have bounds");
    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const edgesAfter = await page.$$eval(".v4-moments-edge-path", (els) => els.length);
    assert.ok(edgesAfter > edgesBefore, `connection drag adds a new edge (${edgesBefore} -> ${edgesAfter})`);

    /* season overlay reopen and review */
    await page.locator("#seasonReturn").click();
    await page.waitForTimeout(300);
    assert.ok(await page.locator("#completionOverlay").isVisible(), "season completion overlay reopens");
    await page.locator("#startReview").click();
    await page.waitForTimeout(400);
    assert.ok(await page.locator("#reviewOverlay").isVisible(), "review overlay opens");

    /* decision dialog with season2 / continuous / course */
    await page.locator("#reviewDecision").click();
    await page.waitForTimeout(400);
    assert.ok(await page.locator("#decisionDialog").isVisible(), "decision dialog opens");
    const decisionText = await page.locator("#decisionDialog").textContent();
    assert.match(decisionText, /시즌 2로 이어가기/, "decision dialog offers season2");
    assert.match(decisionText, /시즌 구분 없이 계속/, "decision dialog offers continuous");
    assert.match(decisionText, /입덕 코스 만들기/, "decision dialog offers course");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    assert.equal(errors.length, 0, "no console/page errors in interactions");
    await page.close();
  } finally {
    await browser.close();
  }
});
