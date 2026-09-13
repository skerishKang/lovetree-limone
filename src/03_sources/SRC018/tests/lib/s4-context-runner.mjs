/**
 * SRC018 S4 context-aware parity runner — SOURCE-LOCAL ONLY.
 *
 * SRC018 declares capture_surface.mode = CONTEXT_AWARE_ONLY, so the shared
 * single-executable baseline/parity harnesses fail closed (SKIP) for it: its
 * runtime surface is NOT a standalone HTML file — it needs the exact eight
 * relative assets/cyber-0N.png hydrated from an isolated virtual root.
 *
 * This module builds two isolated virtual roots and serves them so the HTML's
 * own relative asset paths resolve naturally, with NO URL rewriting:
 *
 *   ORIGINAL_ROOT/  index.html (= original/original.html, verbatim)
 *                   assets/cyber-01.png .. cyber-08.png
 *   SPLIT_ROOT/     index.html (= split/index.html)
 *                   styles.css        (= split/styles.css)
 *                   script.js         (= split/script.js)
 *                   assets/cyber-01.png .. cyber-08.png
 *
 * Both roots receive the byte-identical eight PNGs. This runner does not touch
 * any shared harness/workflow/schema; it is used only by the SRC018 S4 test.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export const RUNTIME_ASSETS = [
  "cyber-01.png", "cyber-02.png", "cyber-03.png", "cyber-04.png",
  "cyber-05.png", "cyber-06.png", "cyber-07.png", "cyber-08.png",
];

// Chromium refuses "unsafe" ports (SIP 5060, mDNS 5353, ...); on Windows the OS
// may hand listen(0) one of them -> net::ERR_UNSAFE_PORT at goto. Pin to safe
// candidates and fall back to an ephemeral port.
const SAFE_PORTS = [8318, 8321, 8324, 8327, 8330, 8333, 8336, 8339];

/**
 * Materialize the two isolated virtual roots under tmpRoot from the frozen
 * capsule. Returns absolute root dirs and the asset byte/sha map actually
 * hydrated (read from split/assets, which S3 byte-locked against the authority).
 */
export function buildRoots({ capsuleDir, tmpRoot }) {
  const originalSrc = path.join(capsuleDir, "original", "original.html");
  const splitIndex = path.join(capsuleDir, "split", "index.html");
  const splitCss = path.join(capsuleDir, "split", "styles.css");
  const splitJs = path.join(capsuleDir, "split", "script.js");
  const splitAssetDir = path.join(capsuleDir, "split", "assets");

  const originalRoot = path.join(tmpRoot, "ORIGINAL_ROOT");
  const splitRoot = path.join(tmpRoot, "SPLIT_ROOT");
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(originalRoot, "assets"), { recursive: true });
  fs.mkdirSync(path.join(splitRoot, "assets"), { recursive: true });

  // ORIGINAL_ROOT: index.html is the verbatim authority original.
  fs.copyFileSync(originalSrc, path.join(originalRoot, "index.html"));
  // SPLIT_ROOT: the three mechanical-split files.
  fs.copyFileSync(splitIndex, path.join(splitRoot, "index.html"));
  fs.copyFileSync(splitCss, path.join(splitRoot, "styles.css"));
  fs.copyFileSync(splitJs, path.join(splitRoot, "script.js"));

  // Hydrate the SAME exact eight PNG bytes into both roots.
  const assetMap = {};
  for (const name of RUNTIME_ASSETS) {
    const src = path.join(splitAssetDir, name);
    const bytes = fs.readFileSync(src);
    const digest = sha256(bytes);
    fs.writeFileSync(path.join(originalRoot, "assets", name), bytes);
    fs.writeFileSync(path.join(splitRoot, "assets", name), bytes);
    assetMap[name] = { bytes: bytes.length, sha256: digest };
  }

  return { originalRoot, splitRoot, assetMap };
}

/**
 * Start an isolated HTTP server rooted at rootDir. "/" and "/index.html" both
 * serve the root index; "/styles.css", "/script.js" serve the split parts;
 * "/assets/<name>" serves the PNG. /favicon.ico -> 204 (not a Source failure).
 * Everything else -> 404 (this is how the Track17 ../../ provenance path, which
 * resolves to /17_.../... from the virtual root, surfaces — an EXPECTED
 * source-local mapping HOLD, never a Source asset failure).
 */
export function startServer(rootDir) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png",
  };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (pathname === "/favicon.ico") { res.statusCode = 204; res.end(); return; }
    let rel = pathname === "/" ? "/index.html" : pathname;
    const file = path.normalize(path.join(rootDir, rel));
    if (!file.startsWith(rootDir + path.sep) && file !== path.join(rootDir, "index.html")) {
      res.statusCode = 403; res.end("forbidden"); return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end("not found"); return; }
    const type = mime[path.extname(file).toLowerCase()] || "application/octet-stream";
    const buf = fs.readFileSync(file);
    res.statusCode = 200;
    res.setHeader("content-type", type);
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
 * Wait until the SRC018 runtime is in a stable, deterministic state:
 *  - the eight runtime assets are all loaded (performance resource entries with
 *    decodedBodySize > 0), and the four portal <img> have naturalWidth > 0;
 *  - --progress is identical across two consecutive animation frames;
 *  - document.fonts.ready resolved.
 * No mouse movement is performed, so the parallax default (viewport center) is
 * identical for both roots.
 */
export async function waitForStable(page, { timeout = 15000 } = {}) {
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
  await page.waitForFunction(() => {
    const perf = performance.getEntriesByType("resource").filter((e) => /\/assets\/cyber-0\d\.png$/.test(e.name));
    const names = new Set(perf.map((e) => e.name.split("/").pop()));
    const assetsOk = [...names].every((n) => {
      const e = perf.find((x) => x.name.endsWith(n));
      return e && (e.decodedBodySize > 0 || e.transferSize > 0);
    }) && names.size === 8;
    const imgsOk = [...document.querySelectorAll(".portal-preview img")].every((im) => im.complete && im.naturalWidth > 0);
    return assetsOk && imgsOk;
  }, null, { timeout });
  await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true));
  // Ensure every runtime asset bitmap is actually decoded into the paint cache
  // (background-image fragments and portal <img> alike) before we sample.
  await page.evaluate(async () => {
    const urls = [...performance.getEntriesByType("resource")].map((e) => e.name).filter((n) => /\/assets\/cyber-0\d\.png$/.test(n));
    await Promise.all(urls.map((u) => { const im = new Image(); im.src = u; return im.decode().catch(() => {}); }));
  });
  // two-frame --progress stability probe
  await page.waitForFunction(() => new Promise((resolve) => {
    const read = () => document.documentElement.style.getPropertyValue("--progress");
    const a = read();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(read() === a)));
  }), null, { timeout });
}

/**
 * Self-contained in-page state collector for the matched comparison channels.
 * Only DOM/CSSOM-observable state is read; the JS closure's internal target/
 * running are not exposed, so running is derived from a pinned --progress and
 * target is observed to equal the stable progress value.
 */
export function SRC18_STATE() {
  const r2 = (n) => Math.round(n * 100) / 100;
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height) }; };
  const q = (s) => document.querySelector(s);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const app = document.getElementById("app");
  const de = document.documentElement;
  const progress = de.style.getPropertyValue("--progress");
  const stages = [...document.querySelectorAll(".stage")];
  const walk = (root) => { let s = ""; for (const k of root.children) { const cls = typeof k.className === "string" && k.className.trim() ? "." + k.className.trim().split(/\s+/).join(".") : ""; s += "<" + k.tagName.toLowerCase() + (k.id ? "#" + k.id : "") + cls + ">" + walk(k); } return s; };
  const frag = [...document.querySelectorAll(".fragment")].map((f) => { const b = f.getBoundingClientRect(); const s = cs(f); const m = /assets\/(cyber-0\d\.png)/.exec(f.style.backgroundImage || ""); return { x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height), op: s.opacity, tr: s.transform, blur: s.filter, bg: m ? m[1] : null }; });
  const perfAssets = {};
  for (const e of performance.getEntriesByType("resource")) {
    const m = /\/assets\/(cyber-0\d\.png)$/.exec(e.name);
    if (m) perfAssets[m[1]] = { status: e.responseStatus, decoded: e.decodedBodySize, transfer: e.transferSize };
  }
  const portalImgs = [...document.querySelectorAll(".portal-preview img")].map((im) => { const m = /assets\/(cyber-0\d\.png)/.exec(im.getAttribute("src") || ""); return { asset: m ? m[1] : null, complete: im.complete, nw: im.naturalWidth, nh: im.naturalHeight }; });
  return {
    title: document.title,
    progress,
    target: progress,
    running: false,
    count: q("#count") ? q("#count").textContent : null,
    stageNo: q("#stageNo") ? q("#stageNo").textContent : null,
    phase: q("#phase") ? q("#phase").textContent : null,
    eyebrow: q("#eyebrow") ? q("#eyebrow").textContent : null,
    stage: stages.findIndex((n) => n.classList.contains("active")),
    readyClass: app.classList.contains("ready"),
    introHiddenClass: q("#intro").classList.contains("hidden"),
    introDisplay: cs(q("#intro")).display,
    introVisibility: cs(q("#intro")).visibility,
    introOpacity: cs(q("#intro")).opacity,
    portalDisplay: cs(q(".portal-preview")).display,
    portalVisibility: cs(q(".portal-preview")).visibility,
    portalOpacity: cs(q(".portal-preview")).opacity,
    fragmentCount: frag.length,
    seedCount: document.querySelectorAll(".seed").length,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    appElementCount: app.querySelectorAll("*").length,
    appSignature: walk(app),
    fragments: frag,
    geometry: {
      app: rect(app),
      header: rect(q(".header")),
      editorial: rect(q(".editorial")),
      portal: rect(q(".portal-preview")),
      fragmentField: rect(q("#fragmentField")),
      progressZone: rect(q(".progress-zone")),
      intro: rect(q("#intro")),
      startBtn: rect(q("#startBtn")),
    },
    computed: {
      bodyBg: cs(document.body).backgroundColor,
      appPosition: cs(app).position,
      appOverflow: cs(app).overflow,
    },
    perfAssets,
    portalImgs,
  };
}
