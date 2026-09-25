/**
 * SRC036 S4 context-aware original/split parity runner — SOURCE-LOCAL ONLY.
 *
 * SRC036's portal shell resolves an exact first-journey sibling at a fixed
 * path. The runner serves both frozen surfaces from isolated virtual roots,
 * hydrates the same sibling bytes into both roots, and compares DOM/CSSOM/
 * interaction state without changing Source code, clocks, timers, events, or
 * network URLs. It never writes parity acceptance flags.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "playwright";

export const SOURCE_ID = "SRC036";
export const AUTHORITY_SHA256 = "b8be6b49ba8a736c369050eb4f669a51e07b7b1e56f3d683b25504b9aa383927";
export const AUTHORITY_BYTES = 22561;
export const SIBLING_SHA256 = "3b61fe4bfbbacb9d4bcff1c6da86d54ba28af60f29c12df44e0ebcc3bdf17468";
export const SIBLING_BYTES = 111950;
export const CONTEXT_ENCODED_PATH =
  "04_%EB%94%94%EC%9E%90%EC%9D%B8-%EC%B1%84%ED%83%9D%EB%B3%B8/0.%EC%B2%AB%EC%97%AC%EC%A0%95%ED%86%B5%ED%95%A9-3%EA%B0%9Chtml%ED%95%A9%EB%B3%B8/lovetree-first-journey-unified-v1.html";
export const CONTEXT_RELATIVE_PATH = decodeURIComponent(CONTEXT_ENCODED_PATH);
export const VIEWPORTS = Object.freeze([
  { key: "1280x800", width: 1280, height: 800, mobile: false, narrow: false },
  { key: "390x844", width: 390, height: 844, mobile: true, narrow: false },
  { key: "320x720", width: 320, height: 720, mobile: true, narrow: true },
]);
export const EXPECTED_STATE_COUNT = 20;
export const CONTEXT_MISSING_STATE = "CONTEXT_MISSING_FALSE_POSITIVE";
const SAFE_PORTS = [8371, 8381, 8391, 8401, 8411, 8421, 8431, 8441];
const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
});

export const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const round = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : value);
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contextSegments() {
  return CONTEXT_RELATIVE_PATH.split("/").filter(Boolean);
}

function copySurfaceFiles(capsuleDir, root, surface) {
  fs.mkdirSync(root, { recursive: true });
  if (surface === "original") {
    fs.copyFileSync(path.join(capsuleDir, "original", "original.html"), path.join(root, "index.html"));
  } else {
    fs.copyFileSync(path.join(capsuleDir, "split", "index.html"), path.join(root, "index.html"));
    fs.copyFileSync(path.join(capsuleDir, "split", "styles.css"), path.join(root, "styles.css"));
    fs.copyFileSync(path.join(capsuleDir, "split", "script.js"), path.join(root, "script.js"));
  }
}

export function buildRoots({ capsuleDir, siblingPath, tmpRoot, includeSibling = true }) {
  const siblingBytes = fs.readFileSync(siblingPath);
  assert(siblingBytes.length === SIBLING_BYTES, `sibling byte length mismatch: ${siblingBytes.length}`);
  assert(sha256(siblingBytes) === SIBLING_SHA256, "sibling SHA-256 mismatch");

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  const roots = {};
  const files = {};
  for (const surface of ["original", "split"]) {
    const root = path.join(tmpRoot, `${surface.toUpperCase()}_ROOT`);
    copySurfaceFiles(capsuleDir, root, surface);
    if (includeSibling) {
      const target = path.join(root, ...contextSegments());
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, siblingBytes);
      files[`${surface}:sibling`] = { bytes: siblingBytes.length, sha256: SIBLING_SHA256 };
    }
    files[`${surface}:index.html`] = {
      bytes: fs.statSync(path.join(root, "index.html")).size,
      sha256: sha256(fs.readFileSync(path.join(root, "index.html"))),
    };
    if (surface === "split") {
      for (const name of ["styles.css", "script.js"]) {
        files[`${surface}:${name}`] = {
          bytes: fs.statSync(path.join(root, name)).size,
          sha256: sha256(fs.readFileSync(path.join(root, name))),
        };
      }
    }
    roots[surface] = root;
  }
  return { roots, files, includeSibling, sibling: { bytes: SIBLING_BYTES, sha256: SIBLING_SHA256 } };
}

export function startVirtualRootServer(rootDir) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
    } catch {
      res.statusCode = 400;
      res.end("bad request");
      return;
    }
    if (pathname === "/favicon.ico") {
      res.statusCode = 204;
      res.end();
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      res.statusCode = 400;
      res.end("bad encoding");
      return;
    }
    const segments = decoded.split("/").filter((part) => part.length > 0 && part !== ".");
    const target = path.resolve(root, ...(segments.length === 0 ? ["index.html"] : segments));
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const body = fs.readFileSync(target);
    res.statusCode = 200;
    res.setHeader("content-type", MIME[path.extname(target).toLowerCase()] || "application/octet-stream");
    res.setHeader("content-length", String(body.length));
    res.setHeader("cache-control", "no-store");
    res.end(body);
  });

  return new Promise((resolve, reject) => {
    let index = 0;
    const tryNext = () => {
      const port = index < SAFE_PORTS.length ? SAFE_PORTS[index++] : 0;
      const onError = (error) => {
        server.removeListener("error", onError);
        if (error.code === "EADDRINUSE" && index <= SAFE_PORTS.length) return tryNext();
        reject(error);
      };
      server.once("error", onError);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onError);
        const address = server.address();
        resolve({ server, port: address.port, origin: `http://127.0.0.1:${address.port}` });
      });
    };
    tryNext();
  });
}

function attachHealth(page) {
  const health = { responses: [], failedRequests: [], pageErrors: [], consoleErrors: [] };
  page.on("response", (response) => {
    try {
      health.responses.push({ url: response.url(), status: response.status(), resourceType: response.request().resourceType() });
    } catch {
      // A navigation can close a response listener while a run is winding down.
    }
  });
  page.on("requestfailed", (request) => {
    try {
      health.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || null, resourceType: request.resourceType() });
    } catch {
      // Ignore a request that is already gone at context close.
    }
  });
  page.on("pageerror", (error) => health.pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    let url = "";
    try { url = message.location().url || ""; } catch { /* closed */ }
    health.consoleErrors.push({ text: message.text(), url });
  });
  return health;
}

function classifyHealth(health, origin) {
  const base = new URL(origin);
  const classify = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== base.origin) return "external";
      const decoded = decodeURIComponent(parsed.pathname);
      if (decoded === `/${CONTEXT_RELATIVE_PATH}` || parsed.pathname === `/${CONTEXT_ENCODED_PATH}`) return "sibling";
      return "authority-local";
    } catch {
      return "unclassified";
    }
  };
  const responses = health.responses.map((entry) => ({ ...entry, category: classify(entry.url), path: safePath(entry.url) }));
  const failedRequests = health.failedRequests.map((entry) => ({ ...entry, category: classify(entry.url), path: safePath(entry.url) }));
  return {
    responses,
    failedRequests,
    pageErrors: health.pageErrors,
    consoleErrors: health.consoleErrors,
    authorityLocalFailed: failedRequests.filter((entry) => entry.category === "authority-local" && entry.failure !== "net::ERR_ABORTED"),
    siblingFailed: failedRequests.filter((entry) => entry.category === "sibling" && entry.failure !== "net::ERR_ABORTED"),
    externalFailed: failedRequests.filter((entry) => entry.category === "external" && entry.failure !== "net::ERR_ABORTED"),
  };
}

function safePath(url) {
  try { return new URL(url).pathname; } catch { return String(url); }
}

export async function collectState(page) {
  return page.evaluate(() => {
    const round = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) / 100 : value);
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { x: round(value.x), y: round(value.y), width: round(value.width), height: round(value.height) };
    };
    const style = (element, property) => (element ? getComputedStyle(element).getPropertyValue(property) : null);
    const pageElement = document.getElementById("page");
    const stage = document.getElementById("journeyStage");
    const frame = document.getElementById("journeyFrame");
    const warning = document.getElementById("warning");
    const returnButton = document.getElementById("returnButton");
    const status = document.getElementById("statusText");
    const loader = stage?.querySelector(".loader");
    const siblingDocument = (() => {
      try { return frame?.contentDocument || null; } catch { return null; }
    })();
    const key = (element) => element ? { tag: element.tagName.toLowerCase(), id: element.id || null, className: typeof element.className === "string" ? element.className : "" } : null;
    const domSignature = (root) => {
      const walk = (element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        attributes: [...element.attributes]
          .filter((attribute) => !["class", "style", "src", "tabindex"].includes(attribute.name))
          .map((attribute) => [attribute.name, attribute.value])
          .sort(([a], [b]) => a.localeCompare(b)),
        children: [...element.children].map(walk),
      });
      return walk(root);
    };
    return {
      document: {
        title: document.title,
        lang: document.documentElement.lang,
        bodyDomSignature: domSignature(document.body),
        elementCount: document.querySelectorAll("*").length,
        bodyElementCount: document.body.querySelectorAll("*").length,
        ids: [...document.querySelectorAll("[id]")].map((element) => element.id),
        classes: [...new Set([...document.querySelectorAll("[class]")].flatMap((element) => (typeof element.className === "string" ? element.className.split(/\s+/).filter(Boolean) : [])))].sort(),
        styleTagCount: document.querySelectorAll("style").length,
        linkCount: document.querySelectorAll("link").length,
        scriptCount: document.querySelectorAll("script").length,
        externalLinkHrefs: [...document.querySelectorAll("link[href]")].map((element) => element.getAttribute("href")),
        externalScriptSources: [...document.querySelectorAll("script[src]")].map((element) => element.getAttribute("src")),
      },
      text: {
        body: document.body.innerText,
        status: status?.textContent || null,
        warning: warning?.innerText || null,
        heading: document.querySelector("h1")?.innerText || null,
        actions: document.querySelector(".actions")?.innerText || null,
      },
      classes: {
        page: pageElement?.className || "",
        stage: stage?.className || "",
        warning: warning?.className || "",
        returnButton: returnButton?.className || "",
      },
      state: {
        loaded: stage?.classList.contains("loaded") || false,
        entering: pageElement?.classList.contains("entering") || false,
        crossing: pageElement?.classList.contains("crossing") || false,
        inside: pageElement?.classList.contains("inside") || false,
        warningVisible: Boolean(warning && getComputedStyle(warning).opacity !== "0" && getComputedStyle(warning).pointerEvents !== "none"),
        loaderOpacity: style(loader, "opacity"),
        returnPointerEvents: style(returnButton, "pointer-events"),
      },
      iframe: {
        srcAttribute: frame?.getAttribute("src") || null,
        srcPath: frame?.src ? new URL(frame.src, location.href).pathname : null,
        title: frame?.getAttribute("title") || null,
        tabIndex: frame?.tabIndex ?? null,
        pointerEvents: style(frame, "pointer-events"),
        contentAccessible: Boolean(siblingDocument),
        contentReadyState: siblingDocument?.readyState || null,
        contentTitle: siblingDocument?.title || null,
        contentBodyChildCount: siblingDocument?.body?.children.length ?? null,
        contentBodyTextLength: siblingDocument?.body?.innerText.length ?? null,
        contentDataStarted: siblingDocument?.body?.getAttribute("data-started") ?? null,
      },
      geometry: {
        page: rect(pageElement),
        stage: rect(stage),
        frame: rect(frame),
        copy: rect(document.querySelector(".copy")),
        windowLabel: rect(document.querySelector(".window-label")),
        returnButton: rect(returnButton),
        warning: rect(warning),
        activeElement: key(document.activeElement),
      },
      styles: {
        pageMinWidth: style(pageElement, "min-width"),
        pageMinHeight: style(pageElement, "min-height"),
        pageOverflow: style(pageElement, "overflow"),
        stageTransform: style(stage, "transform"),
        stageFilter: style(stage, "filter"),
        stageClipPath: style(stage, "clip-path"),
        stageBorderRadius: style(stage, "border-radius"),
        stageAnimationDuration: style(stage, "animation-duration"),
        stageTransitionDuration: style(stage, "transition-duration"),
        warningOpacity: style(warning, "opacity"),
        returnOpacity: style(returnButton, "opacity"),
        customMx: style(pageElement, "--mx"),
        customMy: style(pageElement, "--my"),
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      },
      scroll: {
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        x: window.scrollX,
        y: window.scrollY,
      },
      hash: location.hash,
    };
  });
}

function waitReady(page) {
  return page.waitForFunction(() => document.getElementById("journeyStage")?.classList.contains("loaded"), null, { timeout: 15000 });
}

async function applyAction(page, state, viewport) {
  const enter = async () => {
    await page.locator("#enterButton").click();
  };
  switch (state) {
    case "INITIAL_LOADING":
    case "READY":
    case "CONTEXT_MISSING_FALSE_POSITIVE":
      return [];
    case "POINTER_PARALLAX":
      await page.mouse.move(viewport.width * 0.82, viewport.height * 0.24);
      await page.waitForTimeout(80);
      return ["pointermove"];
    case "ENTER_TRIGGERED":
      await enter();
      await page.waitForTimeout(120);
      return ["click:#enterButton", "wait:120ms"];
    case "ENTERING_1600MS":
      await enter();
      await page.waitForTimeout(1700);
      return ["click:#enterButton", "wait:1700ms"];
    case "INSIDE":
    case "REDUCED_MOTION_INSIDE":
      await enter();
      await page.waitForTimeout(3700);
      return ["click:#enterButton", "wait:3700ms"];
    case "ESCAPE_EXIT":
      await enter();
      await page.waitForTimeout(3700);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(120);
      return ["click:#enterButton", "wait:3700ms", "press:Escape", "wait:120ms"];
    case "RETURN_EXIT":
      await enter();
      await page.waitForTimeout(3700);
      await page.locator("#returnButton").click();
      await page.waitForTimeout(120);
      return ["click:#enterButton", "wait:3700ms", "click:#returnButton", "wait:120ms"];
    case "GLOBAL_ENTER":
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      return ["press:Enter", "wait:120ms"];
    case "REDUCED_MOTION_READY":
      return [];
    case "BRAND_HASH_LINK":
      await page.locator(".brand").click();
      await page.waitForTimeout(80);
      return ["click:.brand", "wait:80ms"];
    case "MOBILE_390_READY_CLIPPED":
    case "MOBILE_320_READY_CLIPPED":
      return [];
    case "MOBILE_390_INSIDE_CLIPPED":
    case "MOBILE_320_INSIDE_CLIPPED":
      await enter();
      await page.waitForTimeout(3700);
      return ["click:#enterButton", "wait:3700ms"];
    case "D11_STALE_TIMER_AFTER_ESCAPE":
      await enter();
      await page.waitForTimeout(120);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(3700);
      return ["click:#enterButton", "wait:120ms", "press:Escape", "wait:3700ms"];
    case "D12_RETURN_BUTTON_ENTER_SELF_CANCEL":
      await enter();
      await page.waitForTimeout(3700);
      await page.locator("#returnButton").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      return ["click:#enterButton", "wait:3700ms", "focus:#returnButton", "press:Enter", "wait:120ms"];
    case "D13_ENTERING_CLASS_PERSISTS":
      await enter();
      await page.waitForTimeout(3700);
      return ["click:#enterButton", "wait:3700ms"];
    default:
      throw new Error(`unknown SRC036 state: ${state}`);
  }
}

async function captureState(browser, { origin, viewport, state, reducedMotion, outDir, surface, includeSibling, context: providedContext }) {
  const ownsContext = !providedContext;
  const context = providedContext || await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const health = attachHealth(page);
  const actions = [];
  let waitError = null;
  try {
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    if (state === "INITIAL_LOADING") {
      actions.push("goto:/");
    } else if (state === CONTEXT_MISSING_STATE) {
      actions.push("goto:/", "wait:5200ms");
      await page.waitForTimeout(5200);
    } else {
      await waitReady(page);
      actions.push("goto:/", "wait:loaded");
      actions.push(...(await applyAction(page, state, viewport)));
    }
  } catch (error) {
    waitError = String(error?.message || error);
  }
  const data = await collectState(page).catch((error) => ({ collection_error: String(error?.message || error) }));
  const screenshotDir = path.join(outDir, "screenshots", surface, viewport.key);
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${state}.png`);
  let screenshot = null;
  try {
    const bytes = await page.screenshot({ path: screenshotPath, type: "png" });
    screenshot = { path: path.relative(outDir, screenshotPath), bytes: bytes.length, sha256: sha256(bytes) };
  } catch (error) {
    screenshot = { error: String(error?.message || error) };
  }
  const result = {
    surface,
    state,
    viewport: viewport.key,
    reducedMotion,
    includeSibling,
    actions,
    waitError,
    data,
    screenshot,
    health: classifyHealth(health, origin),
  };
  await page.close();
  if (ownsContext) await context.close();
  return result;
}

export function requiredPlan() {
  const common = [
    "INITIAL_LOADING",
    "READY",
    "POINTER_PARALLAX",
    "ENTER_TRIGGERED",
    "ENTERING_1600MS",
    "INSIDE",
    "ESCAPE_EXIT",
    "RETURN_EXIT",
    "GLOBAL_ENTER",
    "BRAND_HASH_LINK",
    "D11_STALE_TIMER_AFTER_ESCAPE",
    "D12_RETURN_BUTTON_ENTER_SELF_CANCEL",
    "D13_ENTERING_CLASS_PERSISTS",
  ];
  const plan = [];
  for (const viewport of VIEWPORTS) {
    for (const state of common) plan.push({ viewport, state, reducedMotion: false });
    if (viewport.key === "1280x800") {
      plan.push({ viewport, state: "CONTEXT_MISSING_FALSE_POSITIVE", reducedMotion: false, missingContext: true });
      plan.push({ viewport, state: "REDUCED_MOTION_READY", reducedMotion: true });
      plan.push({ viewport, state: "REDUCED_MOTION_INSIDE", reducedMotion: true });
    }
    if (viewport.key === "390x844") {
      plan.push({ viewport, state: "MOBILE_390_READY_CLIPPED", reducedMotion: false });
      plan.push({ viewport, state: "MOBILE_390_INSIDE_CLIPPED", reducedMotion: false });
    }
    if (viewport.key === "320x720") {
      plan.push({ viewport, state: "MOBILE_320_READY_CLIPPED", reducedMotion: false });
      plan.push({ viewport, state: "MOBILE_320_INSIDE_CLIPPED", reducedMotion: false });
    }
  }
  return plan;
}

function normalizeBodyHtml(value) {
  return String(value || "").replace(/http:\/\/127\.0\.0\.1:\d+/g, "LOCAL_SERVER");
}

function normalizeData(data) {
  const clone = JSON.parse(JSON.stringify(data || {}));
  if (clone.document) {
    // The mechanical split intentionally changes only the <head> glue:
    // inline style -> external link, inline script -> external script.
    for (const key of ["styleTagCount", "linkCount", "scriptCount", "externalLinkHrefs", "externalScriptSources"]) {
      delete clone.document[key];
    }
  }
  if (clone.iframe) {
    clone.iframe.srcAttribute = normalizeBodyHtml(clone.iframe.srcAttribute);
  }
  if (clone.text) clone.text.body = normalizeBodyHtml(clone.text.body);
  return clone;
}

function firstDifference(a, b, prefix = "") {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return { path: prefix, original: a, split: b };
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const result = firstDifference(a[key], b[key], prefix ? `${prefix}.${key}` : key);
    if (result) return result;
  }
  return { path: prefix, original: a, split: b };
}

function stateKey(entry) {
  const viewportKey = typeof entry.viewport === "string" ? entry.viewport : entry.viewport.key;
  return `${viewportKey}:${entry.state}:${entry.reducedMotion ? "reduced" : "normal"}`;
}

function healthComparable(health) {
  return {
    authorityLocalFailed: health.authorityLocalFailed.map(({ path, status, failure }) => ({ path, status, failure })),
    siblingFailed: health.siblingFailed.map(({ path, status, failure }) => ({ path, status, failure })),
    externalFailedCount: health.externalFailed.length,
  };
}

function probeOf(result) {
  const data = result?.data || {};
  return {
    state: data.state || null,
    styles: data.styles || null,
    scroll: data.scroll || null,
    hash: data.hash ?? null,
    text: { status: data.text?.status ?? null, warning: data.text?.warning ?? null },
    iframe: data.iframe || null,
  };
}

function runGate(results, roots) {
  const gate = [];
  const check = (name, ok, detail = null) => gate.push({ name, ok: Boolean(ok), detail });
  const byKey = new Map();
  for (const result of results) byKey.set(`${result.surface}:${stateKey(result)}`, result);
  const plan = requiredPlan();
  const comparisons = [];
  let stateMismatches = 0;
  let healthMismatches = 0;
  for (const entry of plan) {
    const key = stateKey(entry);
    const original = byKey.get(`original:${key}`);
    const split = byKey.get(`split:${key}`);
    if (!original || !split) {
      stateMismatches += 1;
      comparisons.push({ key, present: false, equal: false, difference: { path: "capture", original: Boolean(original), split: Boolean(split) } });
      continue;
    }
    const difference = firstDifference(normalizeData(original.data), normalizeData(split.data));
    const healthDifference = firstDifference(healthComparable(original.health), healthComparable(split.health));
    const equal = !difference && !healthDifference;
    if (!equal) stateMismatches += 1;
    if (healthDifference) healthMismatches += 1;
    comparisons.push({
      key,
      present: true,
      equal,
      actionsEqual: JSON.stringify(original.actions) === JSON.stringify(split.actions),
      originalProbe: probeOf(original),
      splitProbe: probeOf(split),
      difference,
      healthDifference,
    });
  }

  check("sibling identity is exact", roots.sibling.bytes === SIBLING_BYTES && roots.sibling.sha256 === SIBLING_SHA256, roots.sibling);
  const readyPair = comparisons.find((entry) => entry.key === "1280x800:READY:normal");
  const originalHead = byKey.get("original:1280x800:READY:normal")?.data?.document;
  const splitHead = byKey.get("split:1280x800:READY:normal")?.data?.document;
  check(
    "mechanical head glue is the only normalized document difference",
    originalHead?.styleTagCount === 1 && originalHead?.linkCount === 0 && originalHead?.scriptCount === 1 &&
      splitHead?.styleTagCount === 0 && splitHead?.linkCount === 1 && splitHead?.scriptCount === 1,
    { original: originalHead, split: splitHead, pairEqual: readyPair?.equal }
  );
  check("all required state pairs captured", comparisons.every((entry) => entry.present), `${comparisons.filter((entry) => entry.present).length}/${plan.length}`);
  check("all matched DOM/runtime/geometry/text channels equal", stateMismatches === 0, stateMismatches);
  check("all authority/sibling health classifications equal", healthMismatches === 0, healthMismatches);
  check("same action sequence on both surfaces", comparisons.every((entry) => entry.actionsEqual !== false), "action methods and order");
  const contextPair = comparisons.find((entry) => entry.key === "1280x800:CONTEXT_MISSING_FALSE_POSITIVE:normal");
  const d11 = comparisons.find((entry) => entry.key === "1280x800:D11_STALE_TIMER_AFTER_ESCAPE:normal");
  const d12 = comparisons.find((entry) => entry.key === "1280x800:D12_RETURN_BUTTON_ENTER_SELF_CANCEL:normal");
  const d13 = comparisons.find((entry) => entry.key === "1280x800:D13_ENTERING_CLASS_PERSISTS:normal");
  const d7Probe = contextPair?.originalProbe;
  const d7SplitProbe = contextPair?.splitProbe;
  const bothState = (entry, predicate) => Boolean(
    entry?.present &&
    predicate(entry.originalProbe) &&
    predicate(entry.splitProbe)
  );
  check("D7 context-missing false-positive pair captured", Boolean(contextPair?.present && contextPair.equal), contextPair?.difference || null);
  check("D7 false-positive observable semantics preserved", bothState(contextPair, (probe) => probe?.state?.loaded === true && probe?.state?.warningVisible === false), { original: d7Probe?.state, split: d7SplitProbe?.state });
  check("D11/D12/D13 matched probes captured", Boolean(d11?.present && d12?.present && d13?.present), { d11: d11?.present, d12: d12?.present, d13: d13?.present });
  check("D11 stale timer semantics preserved", bothState(d11, (probe) => probe?.state?.crossing === true && probe?.state?.inside === true && probe?.state?.entering === false), { original: d11?.originalProbe?.state, split: d11?.splitProbe?.state });
  check("D12 return-button Enter self-cancel preserved", bothState(d12, (probe) => probe?.state?.inside === false && probe?.state?.crossing === false && probe?.state?.entering === false), { original: d12?.originalProbe?.state, split: d12?.splitProbe?.state });
  check("D13 entering-class persistence preserved", bothState(d13, (probe) => probe?.state?.inside === true && probe?.state?.crossing === true && probe?.state?.entering === true), { original: d13?.originalProbe?.state, split: d13?.splitProbe?.state });
  const reduced = comparisons.find((entry) => entry.key === "1280x800:REDUCED_MOTION_READY:reduced");
  check("reduced-motion CSS channel captured and equal", bothState(reduced, (probe) => probe?.styles?.reducedMotion === true), { original: reduced?.originalProbe?.styles, split: reduced?.splitProbe?.styles });
  const mobile390 = comparisons.find((entry) => entry.key === "390x844:MOBILE_390_READY_CLIPPED:normal");
  const mobile320 = comparisons.find((entry) => entry.key === "320x720:MOBILE_320_READY_CLIPPED:normal");
  check("390/320 clipping geometry captured and equal", Boolean(mobile390?.present && mobile320?.present && mobile390.equal && mobile320.equal), { mobile390: mobile390?.originalProbe?.scroll, mobile320: mobile320?.originalProbe?.scroll });
  check("no pixel/SSIM/perceptual acceptance threshold used", true, "screenshots are visual-review artifacts only");
  check("no Source runtime hook/clock/timer/event patch used", true, "read-only collectors plus native Playwright input");
  check("no parity acceptance flag written by runner", true, "manifest remains parity=false/ref=null");
  return { gate, comparisons, stateMismatches, healthMismatches, planCount: plan.length };
}

export async function runContextParity({ capsuleDir, siblingPath, outDir, head }) {
  assert(/^[0-9a-f]{40}$/.test(String(head)), "exact 40-hex head is required");
  assert(fs.existsSync(siblingPath), `sibling path does not exist: ${siblingPath}`);
  const normalTmp = path.join(outDir, "normal-roots");
  const missingTmp = path.join(outDir, "missing-context-roots");
  const normalRoots = buildRoots({ capsuleDir, siblingPath, tmpRoot: normalTmp, includeSibling: true });
  const missingRoots = buildRoots({ capsuleDir, siblingPath, tmpRoot: missingTmp, includeSibling: false });
  const servers = {};
  for (const surface of ["original", "split"]) {
    servers[surface] = {
      normal: await startVirtualRootServer(normalRoots.roots[surface]),
      missing: await startVirtualRootServer(missingRoots.roots[surface]),
    };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const contexts = new Map();
  for (const surface of ["original", "split"]) {
    for (const viewport of VIEWPORTS) {
      for (const reducedMotion of [false, true]) {
        contexts.set(
          `${surface}:${viewport.key}:${reducedMotion ? "reduced" : "normal"}`,
          await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            deviceScaleFactor: 1,
            reducedMotion: reducedMotion ? "reduce" : "no-preference",
          }),
        );
      }
    }
  }
  const results = [];
  try {
    for (const surface of ["original", "split"]) {
      for (const entry of requiredPlan()) {
        const server = entry.missingContext ? servers[surface].missing : servers[surface].normal;
        const context = contexts.get(`${surface}:${entry.viewport.key}:${entry.reducedMotion ? "reduced" : "normal"}`);
        process.stderr.write(`[src036-s4] ${surface} ${entry.viewport.key} ${entry.state}\n`);
        results.push(await captureState(browser, {
          origin: server.origin,
          viewport: entry.viewport,
          state: entry.state,
          reducedMotion: entry.reducedMotion,
          outDir,
          surface,
          includeSibling: !entry.missingContext,
          context,
        }));
      }
    }
  } finally {
    for (const context of contexts.values()) await context.close();
    await browser.close();
    for (const surface of ["original", "split"]) {
      servers[surface].normal.server.close();
      servers[surface].missing.server.close();
    }
  }

  const comparison = runGate(results, normalRoots);
  const failed = comparison.gate.filter((entry) => !entry.ok);
  const evidence = {
    schema_version: "1.0",
    source_id: SOURCE_ID,
    stage: "S4_CONTEXT_AWARE_MOTION_STATE_PARITY",
    contract: "PR #657 latest CENTRAL S4 release comment",
    generated_at: new Date().toISOString(),
    exact_head: head,
    authority: { bytes: AUTHORITY_BYTES, sha256: AUTHORITY_SHA256 },
    sibling: { bytes: SIBLING_BYTES, sha256: SIBLING_SHA256, source: "CENTRAL-locked first-journey sibling; bytes staged outside Git" },
    viewports: VIEWPORTS.map(({ key, width, height }) => ({ key, width, height, deviceScaleFactor: 1 })),
    required_state_names: EXPECTED_STATE_COUNT,
    captured_state_pairs: comparison.planCount,
    raw_png_equality_used: false,
    pixel_tolerance_used: false,
    ssim_used: false,
    qa_clock_patch_used: false,
    qa_timer_patch_used: false,
    qa_event_patch_used: false,
    qa_runtime_hook_used: false,
    roots: normalRoots.files,
    gate: { total: comparison.gate.length, failed: failed.map((entry) => entry.name) },
    state_mismatches: comparison.stateMismatches,
    health_mismatches: comparison.healthMismatches,
    worker_disposition: failed.length === 0 ? "READY_FOR_CENTRAL_S4_VISUAL_REVIEW" : "HOLD_S4_GATE_FAILURE",
    parity_flags_written: false,
  };
  writeJson(path.join(outDir, "comparison.json"), { evidence, comparisons: comparison.comparisons, gate: comparison.gate });
  const report = [
    "# SRC036 S4 Context-Aware Original/Split Parity — Candidate",
    "",
    "```text",
    `exact_head: ${head}`,
    `authority: ${AUTHORITY_BYTES} bytes / ${AUTHORITY_SHA256}`,
    `sibling: ${SIBLING_BYTES} bytes / ${SIBLING_SHA256}`,
    `viewports: ${evidence.viewports.map((entry) => entry.key).join(" / ")} (deviceScaleFactor=1)`,
    `captured_state_pairs: ${comparison.planCount}`,
    `gate: ${comparison.gate.length - failed.length}/${comparison.gate.length} PASS`,
    `worker_disposition: ${evidence.worker_disposition}`,
    "raw PNG equality: NOT an acceptance channel",
    "pixel/SSIM/perceptual tolerance: NOT USED",
    "Source clock/timer/event/runtime patch: NOT USED",
    "parity acceptance flags written: NO",
    "```",
    "",
    "## Gate",
    "",
    ...comparison.gate.map((entry) => `- [${entry.ok ? "x" : " "}] ${entry.name}${entry.detail ? ` — ${JSON.stringify(entry.detail)}` : ""}`),
    "",
    "## State pairs",
    "",
    "| key | equal | actions | difference |",
    "| --- | --- | --- | --- |",
    ...comparison.comparisons.map((entry) => `| ${entry.key} | ${entry.equal} | ${entry.actionsEqual} | ${entry.difference ? JSON.stringify(entry.difference).slice(0, 240) : "none"} |`),
    "",
    "Screenshots and side-by-side visual-review artifacts are written outside Git under the S4 output directory. This candidate does not grant acceptance; CENTRAL performs final visual acceptance and controls any parity promotion.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "SRC036_S4_CONTEXT_PARITY_REPORT.md"), report);
  return { evidence, comparisons: comparison.comparisons, gate: comparison.gate, report };
}

export function writeCandidateEvidence(capsuleDir, result) {
  const evidenceDir = path.join(capsuleDir, "evidence", "s4");
  writeJson(path.join(evidenceDir, "contract.json"), result.evidence);
  writeJson(path.join(evidenceDir, "comparison.json"), { evidence: result.evidence, comparisons: result.comparisons, gate: result.gate });
  fs.writeFileSync(path.join(evidenceDir, "SRC036_S4_CONTEXT_PARITY_REPORT.md"), result.report);
}
