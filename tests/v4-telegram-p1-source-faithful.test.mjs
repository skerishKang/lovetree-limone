import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3418";

const VIEWPORTS = [
  { name: "desktop", width: 1536, height: 960 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
  { name: "mobile", width: 320, height: 720 },
];

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

async function openPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
  return { page, errors, status: resp.status() };
}

async function checkCommon(page) {
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
  const overflow = await page.evaluate(() => ({
    bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
    docWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return { dupIds, overflow: overflow.bodyOverflow, scrollWidth: overflow.docWidth, clientWidth: overflow.clientWidth };
}

const SOURCES = ["add/lovetree-whole-picture-memory-dashboard-v1.html", "add/lovetree-video-tearoff-memory-pad-v1.html"];
const ROUTES = ["app/v4/labs/whole-picture-memory-dashboard/page.tsx", "app/v4/labs/video-tearoff-memory-pad/page.tsx"];
const COMPONENTS = ["app/components/v4/V4WholePictureDashboard.tsx", "app/components/v4/V4VideoTearoffMemoryPad.tsx"];
const CSS_FILES = ["app/styles/v4/whole-picture-dashboard.css", "app/styles/v4/video-tearoff-memory-pad.css"];

test("source HTML files exist in add/", async () => {
  for (const source of SOURCES) assert.ok(await exists(source), `${source} must exist`);
});

test("two lab routes exist", async () => {
  for (const path of ROUTES) assert.ok(await exists(path), `${path} must exist`);
});

test("two lab components exist", async () => {
  for (const path of COMPONENTS) assert.ok(await exists(path), `${path} must exist`);
});

test("two lab CSS files exist", async () => {
  for (const path of CSS_FILES) assert.ok(await exists(path), `${path} must exist`);
});

test("every component names its exact source HTML", async () => {
  const pairs = [
    ["V4WholePictureDashboard.tsx", "lovetree-whole-picture-memory-dashboard-v1.html"],
    ["V4VideoTearoffMemoryPad.tsx", "lovetree-video-tearoff-memory-pad-v1.html"],
  ];
  for (const [component, source] of pairs) {
    const code = await read(`app/components/v4/${component}`);
    assert.match(code, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${component} must name ${source}`);
  }
});

test("every route imports its own component and CSS", async () => {
  const pairs = [
    ["app/v4/labs/whole-picture-memory-dashboard/page.tsx", "V4WholePictureDashboard", "whole-picture-dashboard.css"],
    ["app/v4/labs/video-tearoff-memory-pad/page.tsx", "V4VideoTearoffMemoryPad", "video-tearoff-memory-pad.css"],
  ];
  for (const [route, component, css] of pairs) {
    const source = await read(route);
    assert.match(source, new RegExp(component), `${route} must import ${component}`);
    assert.match(source, new RegExp(css), `${route} must import ${css}`);
  }
});

test("components do not import the protected central registry files", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /v4-source-manifest|v4-implemented-sources|v4-source-registry|V4JourneyDock|V4Landing/, `${path} must not import central registry files`);
  }
});

test("components do not import protected v4 components", async () => {
  for (const path of COMPONENTS) {
    const source = await read(path);
    assert.doesNotMatch(source, /V4FirstJourney|V4Moments100|V4BookShelf/, `${path} must not import protected components`);
  }
});

test("dashboard iframes carry title, allow, and allowFullScreen", async () => {
  const code = await read("app/components/v4/V4WholePictureDashboard.tsx");
  if (/<iframe/.test(code)) {
    assert.match(code, /title=/, "dashboard iframe must carry title");
    assert.match(code, /allow=/, "dashboard iframe must carry allow");
    assert.match(code, /allowFullScreen/, "dashboard iframe must carry allowFullScreen");
  }
});

test("tearoff iframes carry title, allow, and allowFullScreen", async () => {
  const code = await read("app/components/v4/V4VideoTearoffMemoryPad.tsx");
  if (/<iframe/.test(code)) {
    assert.match(code, /title=/, "tearoff iframe must carry title");
    assert.match(code, /allow=/, "tearoff iframe must carry allow");
    assert.match(code, /allowFullScreen/, "tearoff iframe must carry allowFullScreen");
  }
});

test("dashboard preserves questions, themes, score, stats, moments, video modal", async () => {
  const code = await read("app/components/v4/V4WholePictureDashboard.tsx");
  assert.match(code, /WPD_QUESTIONS/, "dashboard must have questions data");
  assert.match(code, /theme-green|theme-blue|theme-sunset/, "dashboard must have theme classes");
  assert.match(code, /wpd-score/, "dashboard must have score display");
  assert.match(code, /wpd-stats-grid|WPD_STATS/, "dashboard must have stats grid");
  assert.match(code, /WPD_MOMENTS/, "dashboard must have moments data");
  assert.match(code, /wpd-video-modal|openVideo|closeVideo/, "dashboard must have video modal");
  assert.match(code, /youtube\.com\/embed/, "dashboard must use YouTube embed");
});

test("tearoff preserves people, mesh strips, fibers, tear, archive, video, localStorage", async () => {
  const code = await read("app/components/v4/V4VideoTearoffMemoryPad.tsx");
  assert.match(code, /VTP_PEOPLE/, "tearoff must have people data");
  assert.match(code, /VTP_ROWS/, "tearoff must have row count");
  assert.match(code, /vtp-paper-strip|stripTransform/, "tearoff must have paper strip mesh");
  assert.match(code, /vtp-fiber|broken/, "tearoff must have fiber break");
  assert.match(code, /commitTear|autoTear/, "tearoff must have tear interaction");
  assert.match(code, /vtp-archive|archived/, "tearoff must have archive");
  assert.match(code, /vtp-player|openVideo|closeVideo/, "tearoff must have video player");
  assert.match(code, /localStorage/, "tearoff must use localStorage");
  assert.match(code, /youtube\.com\/embed/, "tearoff must use YouTube embed");
  assert.match(code, /prefers-reduced-motion|reducedMotion/, "tearoff must handle reduced motion");
});

test("tearoff preserves 3 people with 4 moments each (source data counts)", async () => {
  const code = await read("app/components/v4/V4VideoTearoffMemoryPad.tsx");
  assert.match(code, /felix/, "tearoff must keep felix");
  assert.match(code, /juyeon/, "tearoff must keep juyeon");
  assert.match(code, /junhyuk/, "tearoff must keep junhyuk");
  const moments = code.match(/day: "0[1-4]"/g);
  assert.ok(moments && moments.length === 12, `tearoff must have 12 moments total (3 people x 4), got ${moments?.length}`);
});

test("dashboard — route and common checks across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(browser, `${BASE}/v4/labs/whole-picture-memory-dashboard`, vp);
      const common = await checkCommon(page);
      assert.equal(status, 200, `dashboard ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `dashboard ${vp.name}: no console/page errors (${errors.join("; ")})`);
      assert.equal(common.dupIds.length, 0, `dashboard ${vp.name}: no duplicate IDs`);
      assert.equal(common.overflow, false, `dashboard ${vp.name}: no horizontal overflow (${common.scrollWidth}/${common.clientWidth})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("dashboard — summary interaction switches screens and themes", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/labs/whole-picture-memory-dashboard`, VIEWPORTS[0]);
    await page.waitForTimeout(400);
    const initialScreen = await page.locator('[data-screen="stand"]').getAttribute("class");
    assert.match(initialScreen || "", /active/, "stand screen must be active initially");
    await page.locator('[data-view="changed"]').click();
    await page.waitForTimeout(600);
    const changedScreen = await page.locator('[data-screen="changed"]').getAttribute("class");
    assert.match(changedScreen || "", /active/, "changed screen must be active after click");
    await page.locator('[data-view="next"]').click();
    await page.waitForTimeout(600);
    const nextScreen = await page.locator('[data-screen="next"]').getAttribute("class");
    assert.match(nextScreen || "", /active/, "next screen must be active after click");
    assert.equal(errors.length, 0, "no console/page errors in dashboard interaction");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("tearoff — route and common checks across all viewports", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const { page, errors, status } = await openPage(browser, `${BASE}/v4/labs/video-tearoff-memory-pad`, vp);
      assert.equal(status, 200, `tearoff ${vp.name}: HTTP 200`);
      assert.equal(errors.length, 0, `tearoff ${vp.name}: no console/page errors (${errors.join("; ")})`);
      const common = await checkCommon(page);
      assert.equal(common.dupIds.length, 0, `tearoff ${vp.name}: no duplicate IDs`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("tearoff — auto tear interaction commits and archives", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openPage(browser, `${BASE}/v4/labs/video-tearoff-memory-pad`, VIEWPORTS[0]);
    await page.waitForTimeout(500);
    const countBefore = await page.locator(".vtp-archive-count").textContent();
    assert.equal(countBefore, "0장", "archive count must be 0 before tear");
    await page.locator(".vtp-demo-btn").click();
    await page.waitForTimeout(2200);
    const countAfter = await page.locator(".vtp-archive-count").textContent();
    assert.equal(countAfter, "1장", "archive count must be 1 after tear");
    assert.equal(errors.length, 0, "no console/page errors in tearoff interaction");
    await page.close();
  } finally {
    await browser.close();
  }
});

test("tearoff — reduced motion does not break auto tear", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console:${msg.text()}`); });
    await page.goto(`${BASE}/v4/labs/video-tearoff-memory-pad`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(500);
    await page.locator(".vtp-demo-btn").click();
    await page.waitForTimeout(1000);
    const count = await page.locator(".vtp-archive-count").textContent();
    assert.equal(count, "1장", "reduced-motion tear must still archive");
    assert.equal(errors.length, 0, "no errors under reduced motion");
    await page.close();
    await context.close();
  } finally {
    await browser.close();
  }
});

test("tearoff — keyboard escape closes video player", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page } = await openPage(browser, `${BASE}/v4/labs/video-tearoff-memory-pad`, VIEWPORTS[0]);
    await page.waitForTimeout(500);
    await page.locator(".vtp-video-hit").click();
    await page.waitForTimeout(400);
    const openClass = await page.locator(".vtp-player").getAttribute("class");
    assert.match(openClass || "", /open/, "player must be open after click");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const closedClass = await page.locator(".vtp-player").getAttribute("class");
    assert.doesNotMatch(closedClass || "", /open/, "player must close on Escape");
    await page.close();
  } finally {
    await browser.close();
  }
});


