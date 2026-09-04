import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const VIEWPORTS = [
  { name: "desktop1440x900", width: 1440, height: 900, desktop: true },
  { name: "mobile430x932", width: 430, height: 932, desktop: false },
  { name: "mobile390x844", width: 390, height: 844, desktop: false },
];

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
export const sha256str = (s) => sha256(Buffer.from(s, "utf8"));

export async function resolvePlaywright() {
  try {
    return await import("playwright");
  } catch {
    const base = process.env.S4_PLAYWRIGHT_BASE;
    if (!base) throw new Error("playwright not resolvable; set S4_PLAYWRIGHT_BASE to a playwright package dir");
    const req = createRequire(pathToFileURL(path.join(base, "resolver.js")));
    return req(base);
  }
}

function httpOk(url) {
  return new Promise((res) => {
    const req = http.get(url, (r) => { r.resume(); res(r.statusCode > 0); });
    req.on("error", () => res(false));
    req.setTimeout(500, () => { req.destroy(); res(false); });
  });
}

export async function startStaticServer(rootDir, port) {
  const py = process.env.S4_PYTHON || "python";
  const child = spawn(py, ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", rootDir], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 60; i++) {
    if (await httpOk(url)) return child;
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(`static server for ${rootDir} did not become ready on ${url}`);
}

export function prepareServeRoots(materialDir, originalFile, splitFiles) {
  const origRoot = path.join(materialDir, "serve", "original");
  const splitRoot = path.join(materialDir, "serve", "split");
  fs.mkdirSync(origRoot, { recursive: true });
  fs.mkdirSync(splitRoot, { recursive: true });
  fs.copyFileSync(originalFile, path.join(origRoot, "71_V7_FINAL_INTERACTIVE_R2.4.html"));
  for (const f of splitFiles) fs.copyFileSync(f, path.join(splitRoot, path.basename(f)));
  return { origRoot, splitRoot };
}

export function collectPageLogs(page) {
  const logs = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (m) => { if (m.type() === "error") logs.consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => logs.pageErrors.push(String(e)));
  page.on("requestfailed", (r) => logs.failedRequests.push(`${r.method()} ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) logs.failedRequests.push(`${r.status()} ${r.url()}`); });
  return logs;
}

export const SNAP_FX = () => {
  const api = window.__LOVE_TREE_V7_R24__;
  const paper = document.getElementById("paper");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("scene");
  const cs = getComputedStyle(paper);
  const r = paper.getBoundingClientRect();
  const meta = document.querySelector(".meta");
  const toggle = document.querySelector(".theme-toggle");
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  return {
    version: api.version,
    lensCount: api.lensCount,
    theme: api.theme,
    viewY: r6(api.viewY),
    reelVelocity: r6(api.reelVelocity),
    reelCycle: api.reelCycle,
    selected: api.selected,
    copyDone: document.getElementById("typedCopy").classList.contains("done"),
    copyText: document.getElementById("typedCopy").textContent,
    canvasW: canvas.width,
    canvasH: canvas.height,
    canvasDataURL: canvas.toDataURL("image/png"),
    paperBg: cs.backgroundColor,
    paperColor: cs.color,
    paperBox: { x: r6(r.x), y: r6(r.y), width: r6(r.width), height: r6(r.height) },
    stageTransform: getComputedStyle(stage).transform,
    metaDisplay: getComputedStyle(meta).display,
    toggleVisible: getComputedStyle(toggle).visibility,
    pressedW: document.getElementById("themeWhite").getAttribute("aria-pressed"),
    pressedB: document.getElementById("themeBlack").getAttribute("aria-pressed"),
    lensYs: api.lensState.map((o) => ({ label: o.label, y: r6(o.y), copies: o.copies.length, hover: o.hover, face: r6(o.face), scale: r6(o.scale) })),
    hitRects: [...document.querySelectorAll(".hit")].map((h) => { const b = h.getBoundingClientRect(); const r2 = (v) => Math.round(v * 100) / 100; return { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) }; }),
    bodyHTML: document.body.outerHTML,
    bodyText: document.body.innerText,
    scroll: [window.scrollX, window.scrollY],
  };
};

export async function scrollDriftGuard(page) {
  return page.evaluate(() => {
    const de = document.documentElement, b = document.body, v = document.querySelector(".viewport");
    const off = [de.scrollLeft, de.scrollTop, b.scrollLeft, b.scrollTop, v ? v.scrollLeft : 0, v ? v.scrollTop : 0];
    return { offsets: off, zero: off.every((n) => n === 0), windowScroll: [window.scrollX, window.scrollY] };
  });
}

export async function waitApi(page) {
  await page.waitForFunction(() => !!window.__LOVE_TREE_V7_R24__, null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById("typedCopy").classList.contains("done"), null, { timeout: 15000 });
}

export async function captureStableStates({ browser, baseUrl, entryFile, side, outDir, results }) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const logs = collectPageLogs(page);
    const url = `${baseUrl}/${entryFile}?paused`;
    await page.goto(url, { waitUntil: "load" });
    await waitApi(page);
    await page.waitForTimeout(700);

    const shot = async (label, snapExtra) => {
    const guard = await scrollDriftGuard(page);
    const snap = await page.evaluate(SNAP_FX);
    snap.canvasDataURLSha = sha256str(snap.canvasDataURL);
    delete snap.canvasDataURL;
    Object.assign(snap, snapExtra || {});
      const file = `${side}_${vp.name}_${label}.png`;
      const png = await page.screenshot({ path: path.join(outDir, "screenshots", file) });
      results.push({ side, viewport: vp.name, state: label, file, url, snapshot: snap, guard, logs: { ...logs } });
      return snap;
    };

    await shot("01_INITIAL");

    await page.evaluate(() => document.getElementById("themeBlack").click());
    await page.waitForTimeout(500);
    await shot("02_THEME_BLACK");

    await page.evaluate(() => document.getElementById("themeWhite").click());
    await page.waitForTimeout(500);
    const restored = await page.evaluate(() => ({ theme: window.__LOVE_TREE_V7_R24__.theme }));
    results.push({ side, viewport: vp.name, state: "THEME_RESTORE_WHITE", ...restored, guard: await scrollDriftGuard(page) });

    const paper = await page.evaluate(() => { const r = document.getElementById("paper").getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
    await page.mouse.move(paper.cx, paper.cy);
    await page.mouse.down();
    await page.mouse.move(paper.cx, paper.cy + 180, { steps: 12 });
    const dragMid = await page.evaluate(() => Math.round(window.__LOVE_TREE_V7_R24__.viewY * 1e6) / 1e6);
    await page.mouse.up();
    results.push({ side, viewport: vp.name, state: "DRAG_PROOF", viewYBefore: 0, viewYDuringDrag: dragMid, expected: 205.2, changed: dragMid > 200 });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.__LOVE_TREE_V7_R24__.dragTo(470));
    await page.waitForTimeout(500);
    await shot("03_REEL_OFFSET_470");

    const vBefore = await page.evaluate(() => Math.round(window.__LOVE_TREE_V7_R24__.viewY * 1e6) / 1e6);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(3000);
    const vAfter = await page.evaluate(() => Math.round(window.__LOVE_TREE_V7_R24__.viewY * 1e6) / 1e6);
    results.push({ side, viewport: vp.name, state: "WHEEL_PROOF", viewYBefore: vBefore, viewYAfter: vAfter, delta: Math.round((vAfter - vBefore) * 1e4) / 1e4, moved: vAfter > vBefore });

    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(250);
    const holdV = await page.evaluate(() => window.__LOVE_TREE_V7_R24__.reelVelocity);
    await page.keyboard.up("ArrowUp");
    await page.waitForTimeout(3000);
    results.push({ side, viewport: vp.name, state: "KEY_HOLD_PROOF", reelVelocityDuringHold: Math.round(holdV * 1e4) / 1e4, nonZero: holdV > 0.5 });

    const hoverTarget = await page.evaluate(() => {
      const api = window.__LOVE_TREE_V7_R24__;
      const o = api.lensState[2];
      const r = document.getElementById("paper").getBoundingClientRect();
      return { x: r.x + 965 * (r.width / 1448), y: r.y + o.y * (r.height / 937) };
    });
    await page.mouse.move(hoverTarget.x, hoverTarget.y);
    await page.waitForTimeout(200);
    const hover = await page.evaluate(() => ({
      hover: window.__LOVE_TREE_V7_R24__.lensState[2].hover,
      cursor: document.getElementById("scene").style.cursor,
    }));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    results.push({ side, viewport: vp.name, state: "HOVER_PROOF", ...hover });

    if (!vp.desktop) {
      const mq = await page.evaluate(() => {
        const ep = (x, y) => { const el = document.elementFromPoint(x, y); return el ? (el.id || el.className || el.tagName) : null; };
        const r = document.getElementById("paper").getBoundingClientRect();
        const cta = document.getElementById("cta").getBoundingClientRect();
        const tg = document.querySelector(".theme-toggle").getBoundingClientRect();
        const de = document.documentElement;
        return {
          centerHit: ep(innerWidth / 2, innerHeight / 2),
          ctaInside: cta.right <= innerWidth && cta.left >= 0 && cta.top >= 0,
          ctaHit: ep(cta.x + cta.width / 2, cta.y + cta.height / 2),
          toggleInside: tg.left < innerWidth && tg.right > 0,
          themeToggleHit: ep(tg.x + tg.width / 2, tg.y + tg.height / 2),
          paperRight: Math.round(r.right),
          brandRightEdge: Math.round(document.querySelector(".brand").getBoundingClientRect().right),
          scrollableY: de.scrollHeight > de.clientHeight,
          docOverflow: getComputedStyle(de).overflow,
        };
      });
      results.push({ side, viewport: vp.name, state: "MOBILE_CLIP_QA", ...mq });
    }

    results.push({ side, viewport: vp.name, state: "LOGS_STABLE", logs });
    await ctx.close();
  }
}

export async function captureLensState({ browser, baseUrl, entryFile, side, outDir, results }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const logs = collectPageLogs(page);
  const url = `${baseUrl}/${entryFile}?qa&paused`;
  await page.goto(url, { waitUntil: "load" });
  await waitApi(page);
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__LOVE_TREE_V7_R24__.activate(2));
  await page.waitForFunction(() => document.getElementById("portalStatus").textContent.startsWith("QA ROUTE"), null, { timeout: 5000 });
  const moment = await page.evaluate(() => ({
    status: document.getElementById("portalStatus").textContent,
    shown: document.getElementById("portalStatus").classList.contains("show"),
    selected: window.__LOVE_TREE_V7_R24__.selected,
    face2: Math.round(window.__LOVE_TREE_V7_R24__.lensState[2].face * 100) / 100,
    pressedCount: [...document.querySelectorAll(".hit")].filter((h) => h.getAttribute("aria-pressed") === "true").length,
  }));
  await page.waitForTimeout(2500);
  const guard = await scrollDriftGuard(page);
  const snap = await page.evaluate(SNAP_FX);
  snap.canvasDataURLSha = sha256str(snap.canvasDataURL);
  delete snap.canvasDataURL;
  const file = `${side}_desktop1440x900_04_LENS_ACTIVATE_OPENING.png`;
  const png = await page.screenshot({ path: path.join(outDir, "screenshots", file) });
  results.push({ side, viewport: "desktop1440x900", state: "04_LENS_ACTIVATE_OPENING", file, url, moment, snapshot: snap, guard, logs: { ...logs } });
  await ctx.close();
}

export async function captureMyTreeSacrificial({ browser, baseUrl, entryFile, side, outDir, results }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const logs = collectPageLogs(page);
  const url = `${baseUrl}/${entryFile}`;
  await page.goto(url, { waitUntil: "load" });
  await waitApi(page);
  const nav = page.waitForResponse((r) => r.url().includes("%EC%BD%94%EB%8D%B1%EC%8A%A4"), { timeout: 15000 }).catch(() => null);
  await page.evaluate(() => document.getElementById("cta").click());
  const resp = await nav;
  await page.waitForTimeout(500);
  const rec = {
    side,
    viewport: "desktop1440x900",
    state: "05_MYTREE_404",
    file: `${side}_desktop1440x900_05_MYTREE_404.png`,
    navigationUrl: page.url(),
    httpStatus: resp ? resp.status() : null,
    title: await page.title(),
    bodyText: (await page.evaluate(() => document.body.innerText)).replace(/\r/g, ""),
    classification: "EXPECTED_MAPPING_HOLD",
  };
  const png = await page.screenshot({ path: path.join(outDir, "screenshots", rec.file) });
  rec.pngBytes = png.length;
  rec.pngSha = sha256(png);
  results.push(rec);
  await ctx.close();
}

export async function captureLiveness({ browser, baseUrl, entryFile, side, results }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/${entryFile}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__LOVE_TREE_V7_R24__, null, { timeout: 15000 });
  const grab = () => page.evaluate(() => document.getElementById("scene").toDataURL("image/png"));
  const a = await grab();
  await page.waitForTimeout(600);
  const b = await grab();
  const caret = await page.evaluate(() => {
    const el = document.querySelector(".copy");
    const anims = document.getAnimations ? document.getAnimations().length : -1;
    return { anims, caretStyle: getComputedStyle(el, "::after").animationName };
  });
  results.push({ side, viewport: "desktop1440x900", state: "ANIMATION_LIVENESS", reducedMotion: "no-preference", paused: false, canvasPixelsChanged: a !== b, caretAnimating: caret.caretStyle === "caretBlink", animCount: caret.anims });
  await ctx.close();
}
