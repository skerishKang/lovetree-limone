import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TRACK70_REVEAL_QA_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.cwd(), "qa-artifacts/source-track70-moment-reveal");
fs.mkdirSync(OUT, { recursive: true });

const PIXEL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#5d6470"/><circle cx="600" cy="580" r="260" fill="#d8d2c5"/><rect x="250" y="920" width="700" height="520" rx="220" fill="#343943"/></svg>');
const PIXEL_TWO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#2d3338"/><circle cx="600" cy="610" r="250" fill="#d4c7b4"/><rect x="230" y="930" width="740" height="500" rx="210" fill="#7c6f64"/></svg>');

const TREE = {
  id: "qa-track70",
  ownerId: "qa-owner",
  title: "QA Canonical Moment Tree",
  memo: "Track70 reveal QA",
  visibility: "public",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z"
};

const MOMENTS = [
  { id: "qa-m1", treeId: TREE.id, title: "첫 인상", memo: "canonical memo one", thumbnail: PIXEL, sourceType: "image", sourceUrl: "https://example.invalid/canonical-one", emotionTags: ["설렘"], discoveryDate: "2026-08-01", timestamp: "2026-08-01", sortOrder: 0, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "qa-m2", treeId: TREE.id, title: "두 번째 잔상", memo: "canonical memo two", thumbnail: PIXEL_TWO, sourceType: "video", sourceUrl: "https://example.invalid/canonical-two", emotionTags: ["기억"], discoveryDate: "2026-08-02", timestamp: "2026-08-02", sortOrder: 1, createdAt: "2026-08-02T00:00:00.000Z" },
  { id: "qa-m3", treeId: TREE.id, title: "미디어 없는 기록", memo: "no invented thumbnail", thumbnail: "", sourceType: "book", sourceUrl: "", emotionTags: [], discoveryDate: "2026-08-03", timestamp: "2026-08-03", sortOrder: 2, createdAt: "2026-08-03T00:00:00.000Z" }
];

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
  { name: "phone-390x844", width: 390, height: 844, touch: true },
  { name: "mobile-320x720", width: 320, height: 720, touch: true }
];

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

async function assertAlignedCanonicalLayers(page, record, viewport) {
  const shell = page.locator('[data-layer="shell"] img');
  const clean = page.locator('[data-layer="clean"] img');
  const shellSrc = await shell.getAttribute("src");
  const cleanSrc = await clean.getAttribute("src");
  record(viewport, "same canonical media reused by both layers", shellSrc === cleanSrc && shellSrc?.startsWith("data:image/svg+xml") === true, `${shellSrc?.slice(0, 32)} / ${cleanSrc?.slice(0, 32)}`);

  const [shellFrame, cleanFrame] = await Promise.all([
    shell.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, objectFit: style.objectFit, objectPosition: style.objectPosition };
    }),
    clean.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, objectFit: style.objectFit, objectPosition: style.objectPosition };
    }),
  ]);
  const epsilon = 0.5;
  const sameFrame = ["x", "y", "width", "height"].every((key) => Math.abs(shellFrame[key] - cleanFrame[key]) <= epsilon)
    && shellFrame.objectFit === cleanFrame.objectFit
    && shellFrame.objectPosition === cleanFrame.objectPosition;
  record(viewport, "exact same-frame geometry/object-fit alignment", sameFrame, JSON.stringify({ shellFrame, cleanFrame }));

  const sourceHref = await page.getByTestId("track70-source-link").getAttribute("href");
  record(viewport, "canonical sourceUrl preserved", sourceHref === MOMENTS[0].sourceUrl, String(sourceHref));
}

async function performTouchDrag(context, page, stage) {
  const box = await stage.boundingBox();
  if (!box) throw new Error("Track70 touch stage has no bounding box");
  const cdp = await context.newCDPSession(page);
  const start = { x: box.x + box.width * 0.32, y: box.y + box.height * 0.52 };
  const middle = { x: box.x + box.width * 0.48, y: box.y + box.height * 0.52 };
  const end = { x: box.x + box.width * 0.64, y: box.y + box.height * 0.52 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
  await page.waitForTimeout(30);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [middle] });
  await page.waitForTimeout(30);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
  await page.waitForTimeout(30);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function main() {
  const browser = await chromium.launch();
  const checks = [];
  const record = (viewport, check, pass, detail = "") => checks.push({ viewport, check, pass, detail });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
    });
    await installCanonicalApi(context);
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(`${BASE}/trees/${TREE.id}/album/reveal`, { waitUntil: "networkidle", timeout: 30000 });
    record(viewport.name, "route response 2xx", response?.ok() === true, `${response?.status() ?? "no-response"}`);
    const surface = page.getByTestId("track70-moment-reveal");
    await surface.waitFor({ state: "visible", timeout: 10000 });
    const stage = page.getByTestId("track70-reveal-stage");

    record(viewport.name, "canonical tree title rendered", (await page.getByRole("heading", { name: TREE.title }).count()) === 1);
    record(viewport.name, "canonical Moment rows rendered", await page.getByTestId("track70-moment-selector").count() === MOMENTS.length);
    await assertAlignedCanonicalLayers(page, record, viewport.name);

    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    record(viewport.name, "horizontal overflow 0", overflow === 0, `overflow:${overflow}`);

    if (!viewport.touch) {
      const box = await stage.boundingBox();
      if (!box) throw new Error("Track70 stage has no bounding box");
      await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.48);
      await page.waitForTimeout(80);
      record(viewport.name, "desktop pointer produces reveal trail", await stage.getAttribute("data-reveal-state") === "trail");
      await page.waitForTimeout(1100);
      record(viewport.name, "trail lingers then clears", await stage.getAttribute("data-reveal-state") === "rest");
    } else {
      await stage.tap();
      record(viewport.name, "touch tap has hover-equivalent reveal", await stage.getAttribute("data-reveal-state") === "pinned");
      await stage.tap();
      record(viewport.name, "touch tap toggles reveal closed", await stage.getAttribute("data-reveal-state") === "rest");
      await performTouchDrag(context, page, stage);
      record(viewport.name, "touch drag paints reveal trail", await stage.getAttribute("data-reveal-state") === "trail");
      await page.waitForTimeout(1100);
      record(viewport.name, "touch drag trail lingers then clears", await stage.getAttribute("data-reveal-state") === "rest");
    }

    await stage.focus();
    await page.keyboard.press("Enter");
    record(viewport.name, "keyboard Enter toggles reveal", await stage.getAttribute("data-reveal-state") === "pinned");
    await page.keyboard.press("Escape");
    record(viewport.name, "keyboard Escape clears reveal", await stage.getAttribute("data-reveal-state") === "rest");
    await page.keyboard.press("ArrowRight");
    record(viewport.name, "keyboard ArrowRight changes selected Moment", (await page.getByTestId("track70-selected-moment").textContent())?.includes(MOMENTS[1].title) === true);

    await page.getByTestId("track70-moment-selector").nth(2).click();
    record(viewport.name, "missing canonical thumbnail fails closed", (await stage.textContent())?.includes("canonical thumbnail") === true);
    record(viewport.name, "page errors 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    record(viewport.name, "console errors 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

    await page.screenshot({ path: path.join(OUT, `${viewport.name}.png`), fullPage: true });
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await installCanonicalApi(context);
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const response = await page.goto(`${BASE}/trees/${TREE.id}/album/reveal`, { waitUntil: "networkidle", timeout: 30000 });
    record("reduced-motion", "route response 2xx", response?.ok() === true, `${response?.status() ?? "no-response"}`);
    const stage = page.getByTestId("track70-reveal-stage");
    await stage.waitFor({ state: "visible", timeout: 10000 });
    record("reduced-motion", "runtime detects reduced motion", await stage.getAttribute("data-reduced-motion") === "true");
    await assertAlignedCanonicalLayers(page, record, "reduced-motion");
    await stage.focus();
    await page.keyboard.press("Enter");
    record("reduced-motion", "semantic reveal still works", await stage.getAttribute("data-reveal-state") === "pinned");
    const transition = await page.getByTestId("track70-clean-layer").evaluate((element) => getComputedStyle(element).transitionDuration);
    record("reduced-motion", "clean reveal transition disabled", transition.split(",").every((value) => value.trim() === "0s"), transition);
    await page.keyboard.press("Escape");
    const box = await stage.boundingBox();
    if (!box) throw new Error("Track70 reduced-motion stage has no bounding box");
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
    await page.waitForTimeout(80);
    record("reduced-motion", "pointer trail motion disabled", await stage.getAttribute("data-reveal-state") === "rest");
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    record("reduced-motion", "horizontal overflow 0", overflow === 0, `overflow:${overflow}`);
    record("reduced-motion", "page errors 0", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    record("reduced-motion", "console errors 0", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
    await page.screenshot({ path: path.join(OUT, "desktop-1280x800-reduced-motion.png"), fullPage: true });
    await context.close();
  }

  await browser.close();
  const failures = checks.filter((check) => !check.pass);
  const output = { summary: { checks: checks.length, failures: failures.length }, results: checks };
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify(output, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail ? `  [${check.detail}]` : ""}`);
  if (failures.length) {
    console.error(`Track70 Moment Reveal QA had ${failures.length} failure(s)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
