import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TRACK70_REVEAL_QA_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track70-moment-reveal");
fs.mkdirSync(OUT, { recursive: true });

const PORTRAIT = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9dde0"/>
      <stop offset="1" stop-color="#6f7880"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <ellipse cx="600" cy="570" rx="265" ry="310" fill="#ded8cc"/>
  <path d="M330 500 Q600 250 870 500 L830 360 Q600 165 370 360Z" fill="#aeb6bd"/>
  <circle cx="505" cy="565" r="24" fill="#374047"/>
  <circle cx="695" cy="565" r="24" fill="#374047"/>
  <path d="M500 710 Q600 760 700 710" fill="none" stroke="#766d67" stroke-width="18" stroke-linecap="round"/>
  <path d="M235 1510 Q260 960 600 900 Q940 960 965 1510Z" fill="#343b42"/>
  <path d="M360 1020 Q600 1160 840 1020" fill="none" stroke="#aab3ba" stroke-width="28" opacity=".8"/>
</svg>`);

const TREE = {
  id: "qa-track70",
  ownerId: "qa-owner",
  title: "QA Canonical Moment Tree",
  memo: "Track70 visual closure",
  visibility: "public",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
};

const MOMENTS = [{
  id: "qa-m1",
  treeId: TREE.id,
  title: "첫 인상",
  memo: "canonical portrait used for visual closure",
  thumbnail: PORTRAIT,
  sourceType: "image",
  sourceUrl: "https://example.invalid/canonical-one",
  emotionTags: ["설렘"],
  discoveryDate: "2026-08-01",
  timestamp: "2026-08-01",
  sortOrder: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
}];

async function installCanonicalApi(context) {
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/trees/${TREE.id}`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TREE) });
      return;
    }
    if (url.pathname === `/api/trees/${TREE.id}/memories`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOMENTS) });
      return;
    }
    await route.continue();
  });
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

async function state(stage) {
  return stage.getAttribute("data-reveal-state");
}

async function expectState(stage, expected, label) {
  const actual = await state(stage);
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

async function openSurface(browser, { width, height, touch = false, reducedMotion = "no-preference" }) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch,
    isMobile: touch,
    reducedMotion,
  });
  await installCanonicalApi(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  const response = await page.goto(`${BASE}/trees/${TREE.id}/album/reveal`, { waitUntil: "networkidle", timeout: 30000 });
  if (!response?.ok()) throw new Error(`visual closure route failed: ${response?.status() ?? "no response"}`);
  const stage = page.getByTestId("track70-reveal-stage");
  await stage.waitFor({ state: "visible", timeout: 10000 });
  return { context, page, stage, errors };
}

async function performTouchDrag(context, page, stage) {
  const box = await stage.boundingBox();
  if (!box) throw new Error("Track70 touch stage has no bounding box");
  const cdp = await context.newCDPSession(page);
  const points = [0.30, 0.39, 0.48, 0.57, 0.66].map((fraction) => ({
    x: box.x + box.width * fraction,
    y: box.y + box.height * 0.51,
  }));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] });
  for (const point of points.slice(1)) {
    await page.waitForTimeout(28);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
  }
  await page.waitForTimeout(28);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function desktopSeries(browser) {
  const { context, page, stage, errors } = await openSurface(browser, { width: 1280, height: 800 });
  try {
    await expectState(stage, "rest", "desktop clean");
    await screenshot(page, "visual-desktop-1280x800-clean-base.png");

    const box = await stage.boundingBox();
    if (!box) throw new Error("Track70 desktop stage has no bounding box");
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.43);
    await page.waitForTimeout(70);
    await expectState(stage, "trail", "desktop pointer reveal");
    await screenshot(page, "visual-desktop-1280x800-pointer-reveal.png");

    for (const fraction of [0.37, 0.43, 0.49, 0.55, 0.61, 0.67]) {
      await page.mouse.move(box.x + box.width * fraction, box.y + box.height * 0.52, { steps: 2 });
      await page.waitForTimeout(18);
    }
    await expectState(stage, "trail", "desktop active trail");
    await screenshot(page, "visual-desktop-1280x800-active-trail.png");

    await page.mouse.move(2, 2);
    await page.waitForTimeout(260);
    await expectState(stage, "trail", "desktop linger");
    await screenshot(page, "visual-desktop-1280x800-linger.png");

    await page.waitForTimeout(980);
    await expectState(stage, "rest", "desktop return");
    await screenshot(page, "visual-desktop-1280x800-return.png");

    if (errors.length) throw new Error(`desktop visual closure errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function touchSeries(browser, width, height, prefix, includeLingerReturn) {
  const { context, page, stage, errors } = await openSurface(browser, { width, height, touch: true });
  try {
    await expectState(stage, "rest", `${prefix} clean`);
    await screenshot(page, `visual-${prefix}-clean-base.png`);

    await performTouchDrag(context, page, stage);
    await expectState(stage, "trail", `${prefix} touch drag`);
    await screenshot(page, `visual-${prefix}-touch-drag.png`);

    if (includeLingerReturn) {
      await page.waitForTimeout(260);
      await expectState(stage, "trail", `${prefix} linger`);
      await screenshot(page, `visual-${prefix}-linger.png`);
      await page.waitForTimeout(980);
      await expectState(stage, "rest", `${prefix} return`);
      await screenshot(page, `visual-${prefix}-return.png`);
    }

    if (errors.length) throw new Error(`${prefix} visual closure errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function reducedMotionSeries(browser) {
  const { context, page, stage, errors } = await openSurface(browser, {
    width: 1280,
    height: 800,
    reducedMotion: "reduce",
  });
  try {
    if (await stage.getAttribute("data-reduced-motion") !== "true") throw new Error("reduced motion was not detected");
    await screenshot(page, "visual-desktop-1280x800-reduced-motion-clean.png");

    const box = await stage.boundingBox();
    if (!box) throw new Error("Track70 reduced-motion stage has no bounding box");
    await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.48);
    await page.waitForTimeout(100);
    await expectState(stage, "rest", "reduced-motion pointer suppression");
    await screenshot(page, "visual-desktop-1280x800-reduced-motion-pointer-suppressed.png");

    await stage.focus();
    await page.keyboard.press("Enter");
    await expectState(stage, "pinned", "reduced-motion keyboard reveal");
    await screenshot(page, "visual-desktop-1280x800-reduced-motion-keyboard-reveal.png");

    if (errors.length) throw new Error(`reduced-motion visual closure errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    await desktopSeries(browser);
    await touchSeries(browser, 390, 844, "phone-390x844", true);
    await touchSeries(browser, 320, 720, "mobile-320x720", false);
    await reducedMotionSeries(browser);
  } finally {
    await browser.close();
  }
  console.log("PASS Track70 visual closure screenshots captured");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
