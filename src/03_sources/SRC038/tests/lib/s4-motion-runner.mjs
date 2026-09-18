/**
 * SRC038 S4 motion-aware parity runner primitives — SOURCE-LOCAL ONLY.
 *
 * SRC038 declares capture_surface.mode = CONTEXT_AWARE_ONLY: the generic
 * shared baseline/parity harnesses fail closed (SKIP) because they wait for
 * the legacy window.__lt / window.__lovetreeStats contract this Source
 * intentionally does not expose (#589 comment 5653391554). This module is the
 * SRC038-local S4 alternative released by CENTRAL (#589 comment 5654031252).
 *
 * Acceptance contract (S4, motion-aware):
 *  - RAW PNG byte equality is NOT the contract: the Source has unconditional
 *    time-based sin wobble (rotatePoint) plus optional auto-orbit yaw drift,
 *    so canvas pixels are non-repeatable by design (frozen defect D4).
 *  - Parity is asserted on DOM/CSSOM-observable state after the SAME
 *    source-native interaction sequence on both surfaces, with matched
 *    fixed observation windows.
 *  - Camera internals (yaw/pitch/zoom/focus) are closure-local. NO hooks are
 *    injected. Camera control effects are recorded as before/after visible
 *    frame changes (screenshot bytes differ / do not differ) plus DOM-observable
 *    suppression semantics (drag past moved-threshold must NOT change
 *    selection), and matched screenshots are preserved for CENTRAL visual
 *    review.
 *  - No clocks, rAF, Date, performance, RNG, or animation patches.
 *  - No SSIM / perceptual / pixel-percentage tolerance is introduced anywhere.
 *
 * Serving (equivalent local HTTP conditions, no URL rewriting, no proxying of
 * external hosts):
 *   ORIGINAL_ROOT/index.html  = original/original.html (verbatim, self-contained)
 *   SPLIT_ROOT/index.html     = split/index.html  (+ ./styles.css + ./script.js)
 * External i.ytimg.com / youtube.com / third-party iframe resources are fetched
 * by the browser directly over the real network.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// Chromium refuses "unsafe" ports; on Windows listen(0) may hand one out.
// Pin safe candidates distinct from other capsule runners, then ephemeral.
const SAFE_PORTS = [8341, 8344, 8347, 8350, 8353, 8356, 8359, 8362];

/** Materialize the two isolated virtual roots under tmpRoot from the frozen capsule. */
export function buildRoots({ capsuleDir, tmpRoot }) {
  const originalRoot = path.join(tmpRoot, "ORIGINAL_ROOT");
  const splitRoot = path.join(tmpRoot, "SPLIT_ROOT");
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(originalRoot, { recursive: true });
  fs.mkdirSync(splitRoot, { recursive: true });

  fs.copyFileSync(path.join(capsuleDir, "original", "original.html"), path.join(originalRoot, "index.html"));
  fs.copyFileSync(path.join(capsuleDir, "split", "index.html"), path.join(splitRoot, "index.html"));
  fs.copyFileSync(path.join(capsuleDir, "split", "styles.css"), path.join(splitRoot, "styles.css"));
  fs.copyFileSync(path.join(capsuleDir, "split", "script.js"), path.join(splitRoot, "script.js"));

  const digest = (f) => sha256(fs.readFileSync(f));
  return {
    originalRoot,
    splitRoot,
    files: {
      "ORIGINAL_ROOT/index.html": digest(path.join(originalRoot, "index.html")),
      "SPLIT_ROOT/index.html": digest(path.join(splitRoot, "index.html")),
      "SPLIT_ROOT/styles.css": digest(path.join(splitRoot, "styles.css")),
      "SPLIT_ROOT/script.js": digest(path.join(splitRoot, "script.js")),
    },
  };
}

/** Isolated static HTTP server rooted at rootDir ("/" -> index.html). */
export function startServer(rootDir) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
    ".json": "application/json; charset=utf-8",
  };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (pathname === "/favicon.ico") { res.statusCode = 204; res.end(); return; }
    const rel = pathname === "/" ? "/index.html" : pathname;
    const file = path.normalize(path.join(rootDir, rel));
    if (!file.startsWith(rootDir + path.sep) && file !== path.join(rootDir, "index.html")) {
      res.statusCode = 403; res.end("forbidden"); return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end("not found"); return; }
    const buf = fs.readFileSync(file);
    res.statusCode = 200;
    res.setHeader("content-type", mime[path.extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("content-length", String(buf.length));
    res.setHeader("cache-control", "no-store");
    res.end(buf);
  });
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      const port = i < SAFE_PORTS.length ? SAFE_PORTS[i++] : 0;
      const onError = (e) => {
        server.removeListener("error", onError);
        if (e.code === "EADDRINUSE" && i <= SAFE_PORTS.length) return tryNext();
        reject(e);
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onError);
        resolve({ server, port: server.address().port, origin: `http://127.0.0.1:${server.address().port}` });
      });
    };
    tryNext();
  });
}

/**
 * Fixed matched observation windows (milliseconds). Identical on both surfaces;
 * they are pure external waits — no Source runtime is patched or accelerated.
 * Sized from the Source's own easing constants so lerp residuals stay sub-pixel:
 *  zoom .085/frame, focus .075/frame, node position .045/frame.
 */
export const SETTLE = {
  boot: 1200,
  select: 1500,
  layout: 2500,
  zoom: 1500,
  toggle: 350,
  search: 350,
  drag: 800,
  turn: 600,
  settings: 350,
  playerOpen: 1200,
  playerClosed: 600,
  reset: 1800,
  inspector: 350,
};

/**
 * Self-contained in-page state collector. Reads ONLY DOM/CSSOM-observable
 * state — canvas internals and the camera closure are never touched.
 */
export function SRC38_STATE() {
  const r2 = (n) => Math.round(n * 100) / 100;
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) }; };
  const q = (s) => document.querySelector(s);
  const id = (i) => document.getElementById(i);
  const txt = (i) => { const el = id(i); return el ? el.textContent : null; };
  const cls = (i) => { const el = id(i); return el ? [...el.classList].sort().join(" ") : null; };
  const aria = (i) => { const el = id(i); return el ? el.getAttribute("aria-pressed") : null; };
  const val = (i) => { const el = id(i); return el ? el.value : null; };
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const canvas = id("graph");
  const iframe = q("#playerFrame iframe");
  const conns = [...document.querySelectorAll("#connections .connection")].map((b) => ({ node: b.dataset.node, text: b.textContent }));
  const active = document.activeElement;
  return {
    title: document.title,
    lang: document.documentElement.lang,
    tabTitle: txt("tabTitle"),
    crumbTitle: txt("crumbTitle"),
    noteTitle: txt("noteTitle"),
    articleTitle: txt("articleTitle"),
    propType: txt("propType"),
    propDate: txt("propDate"),
    description: txt("description"),
    propTagsHTML: id("propTags").innerHTML,
    connectionsHTML: id("connections").innerHTML,
    connectionCount: conns.length,
    statsText: txt("statsText"),
    statsSub: txt("statsSub"),
    previewClass: cls("videoPreview"),
    previewDisplay: cs(id("videoPreview")).display,
    previewImgSrc: id("previewImage").getAttribute("src"),
    previewImgComplete: id("previewImage").complete,
    previewImgNaturalW: id("previewImage").naturalWidth,
    settingsClass: cls("settings"),
    filterValue: val("filterInput"),
    tagsToggleClass: cls("tagsToggle"), tagsToggleAria: aria("tagsToggle"),
    linksToggleClass: cls("linksToggle"), linksToggleAria: aria("linksToggle"),
    orbitToggleClass: cls("orbitToggle"), orbitToggleAria: aria("orbitToggle"),
    layoutValue: val("layoutSelect"),
    scaleText: txt("scaleValue"),
    scaleRange: val("scaleRange"),
    playerClass: cls("player"),
    playerPerson: txt("playerPerson"),
    playerTitle: txt("playerTitle"),
    iframeSrc: iframe ? iframe.getAttribute("src") : null,
    iframeTitle: iframe ? iframe.getAttribute("title") : null,
    iframeAllow: iframe ? iframe.getAttribute("allow") : null,
    inspectorClass: cls("inspector"),
    inspectorTransform: cs(id("inspector")).transform,
    canvasRect: rect(canvas),
    canvasBacking: { w: canvas.width, h: canvas.height },
    canvasTouchAction: cs(canvas).touchAction,
    workspaceCols: cs(q(".workspace")).gridTemplateColumns,
    spaceRect: rect(id("space")),
    gearRect: rect(id("gear")),
    mobileNoteRect: rect(id("mobileNote")),
    controlsRect: rect(q(".controls")),
    statsRect: rect(q(".stats")),
    hintDisplay: cs(q(".hint")).display,
    docScroll: {
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      cw: document.documentElement.clientWidth,
      ch: document.documentElement.clientHeight,
      bodySW: document.body.scrollWidth,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    elementCount: document.querySelectorAll("*").length,
    activeElement: active ? active.tagName + (active.id ? "#" + active.id : "") : null,
  };
}

/**
 * Boot stabilization: real network for external hosts is kept; we only wait
 * for the Source's own 18 preloaded thumbnails to have resource entries and
 * for fonts + a painted canvas. No runtime mutation of any kind.
 */
export async function waitForStable(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForFunction(() => {
    const c = document.getElementById("graph");
    return c && c.width > 0 && c.height > 0;
  }, null, { timeout: 10000 });
  await page.waitForFunction(() => {
    const yt = performance.getEntriesByType("resource").filter((e) => /i\.ytimg\.com/.test(e.name));
    return yt.length >= 18;
  }, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(SETTLE.boot);
}

/** Network entry classification — Source-external failures are never split failures. */
export function classifyNetwork(entries) {
  const out = {
    localRequests: [], localFailed: [],
    ytThumbRequests: [], ytThumb404: [],
    ytEmbedRequests: [], ytEmbedFailed: [],
    thirdPartyRequests: [], thirdPartyFailed: [],
    abortedExternal: [], abortedLocal: [],
  };
  for (const e of entries) {
    let host = "";
    try { host = new URL(e.url).hostname; } catch { continue; }
    const isLocal = host === "127.0.0.1" || host === "localhost";
    const aborted = e.failure === "net::ERR_ABORTED" || e.failure === "ERR_ABORTED";
    if (isLocal) {
      if (new URL(e.url).pathname === "/favicon.ico") continue;
      out.localRequests.push(e);
      if (aborted) out.abortedLocal.push(e);
      else if (e.failure || (e.status != null && e.status >= 400)) out.localFailed.push(e);
    } else if (host === "i.ytimg.com" || host.endsWith("ytimg.com")) {
      out.ytThumbRequests.push(e);
      if (e.status === 404) out.ytThumb404.push(e);
      else if (aborted) out.abortedExternal.push(e);
      else if (e.failure || (e.status != null && e.status >= 400)) out.thirdPartyFailed.push(e);
    } else if (/youtube\.com$/.test(host) || host === "www.youtube.com" || host === "youtube.com") {
      out.ytEmbedRequests.push(e);
      if (aborted) out.abortedExternal.push(e);
      else if (e.failure || (e.status != null && e.status >= 400)) out.ytEmbedFailed.push(e);
    } else {
      out.thirdPartyRequests.push(e);
      if (aborted) out.abortedExternal.push(e);
      else if (e.failure || (e.status != null && e.status >= 400)) out.thirdPartyFailed.push(e);
    }
  }
  return out;
}
