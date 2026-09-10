import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const EXPECTED_MAIN = "9544014e2e278d5d4bec1a57c5b68e85ad7e1c92";
const SOURCE_PATH = "reference/source-tracks-snapshot/02_첫여정통합-3개html합본/02_러브트리_첫여정통합_v1.html";
const EXPECTED_BYTES = 111950;
const EXPECTED_SHA256 = "3b61fe4bfbbacb9d4bcff1c6da86d54ba28af60f29c12df44e0ebcc3bdf17468";
const NATIVE_BASE = process.env.TRACK02_NATIVE_BASE || "http://127.0.0.1:3000";
const SOURCE_BASE = process.env.TRACK02_SOURCE_BASE || "http://127.0.0.1:4173";
const NATIVE_URL = `${NATIVE_BASE}/v4/journey?legacy=1`;
const CANONICAL_URL = `${NATIVE_BASE}/v4/journey`;
const SOURCE_URL = `${SOURCE_BASE}/${SOURCE_PATH.split("/").map(encodeURIComponent).join("/")}`;
const OUT = path.resolve(process.cwd(), "qa-artifacts/track02-final-closure");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280x800", width: 1280, height: 800, reducedMotion: "no-preference" },
  { name: "phone-390x844", width: 390, height: 844, reducedMotion: "no-preference" },
  { name: "narrow-320x720", width: 320, height: 720, reducedMotion: "no-preference" },
  { name: "phone-390x844-reduced-motion", width: 390, height: 844, reducedMotion: "reduce" },
];

const STATES = [
  { key: "01-entry", screen: "landing", landmark: /첫 순간 심기/ },
  { key: "02-first-moment", screen: "step1", landmark: /첫 순간을|마음이 처음/ },
  { key: "03-mid-journey", screen: "step3-success", landmark: /내 러브트리 보기|다정하게 이어졌어요/ },
  { key: "04-completion", screen: "growth", landmark: /처음 화면으로|다정하게 이어졌어요/ },
];

const FIRST = {
  url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
  videoId: "ScMzIvxBSi4",
  title: "처음 마음이 멈춘 장면",
  note: "우연히 보게 됐는데 하루 종일 이 장면이 생각났어.",
  discoveryDate: "2026-08-25",
  thumbnail: "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg",
  saved: true,
};
const MEMORY = {
  emotion: "설렘",
  customEmotion: "",
  time: "00:42",
  note: "표정과 말투가 오래 남은 장면.",
  date: "2026-08-25",
  publicMemo: true,
  saved: true,
};
const NEXT = {
  id: "ysz5S6PUM-U",
  url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
  title: "다시 찾아본 무대",
  time: "01:15",
  relation: "팬이 추천해 줬어요",
  note: "댓글에서 인터뷰를 추천받아 바로 찾아봤어.",
};
const CONNECTION = { first: FIRST, next: NEXT, createdAt: "2026-08-25T00:00:00.000Z" };

function fixture(screen) {
  const hasConnection = screen === "step3-success" || screen === "growth";
  return {
    currentScreen: screen,
    treeName: "건호에게 입덕한 3일",
    firstMoment: { ...FIRST, saved: screen !== "landing" && screen !== "step1" },
    memory: { ...MEMORY, saved: hasConnection },
    connections: hasConnection ? [CONNECTION] : [],
    step3Origin: hasConnection ? FIRST : null,
    drafts: { step3: { url: NEXT.url, title: NEXT.title, time: NEXT.time, relation: NEXT.relation, note: NEXT.note } },
  };
}

async function installState(context, screen) {
  const state = fixture(screen);
  await context.addInitScript(({ state, memory, connection }) => {
    localStorage.setItem("lovetree-first-journey-unified", JSON.stringify(state));
    localStorage.setItem("lovetree-step2-record", JSON.stringify(memory));
    localStorage.setItem("lovetree-step3-connection", JSON.stringify(connection));
  }, { state, memory: MEMORY, connection: CONNECTION });
}

async function waitVisibleText(page, regex, timeout = 12000) {
  const locator = page.getByText(regex);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      if (await locator.nth(i).isVisible().catch(() => false)) return locator.nth(i);
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`No visible landmark for ${regex}`);
}

async function capture(browser, kind, url, vp, state, checks) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.width <= 390,
    reducedMotion: vp.reducedMotion,
  });
  await installState(context, state.screen);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitVisibleText(page, state.landmark);
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve()).catch(() => {});
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const file = path.join(OUT, `${vp.name}__${state.key}__${kind}.png`);
  await page.screenshot({ path: file });
  const add = (check, pass, detail = "") => checks.push({ kind, viewport: vp.name, state: state.key, check, pass, detail });
  add("http-200", response?.status() === 200, String(response?.status()));
  add("landmark-visible", true, state.landmark.source);
  add("horizontal-overflow-0", overflow === 0, String(overflow));
  add("console-errors-0", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  add("page-errors-0", pageErrors.length === 0, pageErrors.slice(0, 4).join(" | "));
  add("reduced-motion-media", vp.reducedMotion === "reduce" ? reduced : !reduced, String(reduced));
  await context.close();
  return file;
}

async function sideBySide(browser, sourceFile, nativeFile, vp, state) {
  const source64 = fs.readFileSync(sourceFile).toString("base64");
  const native64 = fs.readFileSync(nativeFile).toString("base64");
  const context = await browser.newContext({ viewport: { width: vp.width * 2 + 28, height: vp.height + 54 } });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;background:#191919;color:#fff;font-family:Arial,sans-serif;overflow:hidden}
    header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:13px}
    main{display:grid;grid-template-columns:${vp.width}px ${vp.width}px;gap:28px}
    figure{margin:0;position:relative;width:${vp.width}px;height:${vp.height}px;overflow:hidden;background:#fff}
    figcaption{position:absolute;left:8px;top:8px;z-index:2;background:rgba(0,0,0,.72);padding:5px 8px;border-radius:6px;font-size:11px}
    img{display:block;width:${vp.width}px;height:${vp.height}px}
  </style><header><b>Track02 matched-state evidence</b><span>${state.key} · ${vp.name}</span></header><main>
    <figure><figcaption>SOURCE · pinned V1 HTML</figcaption><img src="data:image/png;base64,${source64}"></figure>
    <figure><figcaption>EXACT-MAIN NATIVE · legacy counterpart</figcaption><img src="data:image/png;base64,${native64}"></figure>
  </main>`);
  const file = path.join(OUT, `${vp.name}__${state.key}__side-by-side.png`);
  await page.screenshot({ path: file });
  await context.close();
  return file;
}

async function nativeFunctional(browser, checks) {
  const add = (viewport, check, pass, detail = "") => checks.push({ kind: "native", viewport, state: "functional", check, pass, detail });
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await installState(context, "landing");
    const page = await context.newPage();
    await page.goto(NATIVE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const target = page.getByRole("button", { name: /첫 순간 심기/ }).first();
    await target.waitFor({ state: "visible" });
    let reached = false;
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press("Tab");
      reached = await target.evaluate((el) => document.activeElement === el).catch(() => false);
      if (reached) break;
    }
    const visibleFocus = reached && await target.evaluate((el) => el.matches(":focus-visible")).catch(() => false);
    if (reached) await page.keyboard.press("Enter"); else await target.press("Enter");
    await page.locator("#name-form").waitFor({ state: "visible", timeout: 8000 });
    await page.keyboard.press("Escape");
    await page.locator("#name-form").waitFor({ state: "detached", timeout: 8000 });
    const returned = await target.evaluate((el) => document.activeElement === el).catch(() => false);
    add("desktop-1280x800", "keyboard-focus-reaches-cta", reached);
    add("desktop-1280x800", "visible-focus", visibleFocus);
    add("desktop-1280x800", "enter-opens-dialog", true);
    add("desktop-1280x800", "escape-closes-dialog", true);
    add("desktop-1280x800", "escape-focus-return", returned);
    await target.click();
    add("desktop-1280x800", "mouse-activation", await page.locator("#name-form").isVisible());
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await installState(context, "landing");
    const page = await context.newPage();
    await page.goto(NATIVE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const target = page.getByRole("button", { name: /첫 순간 심기/ }).first();
    await target.tap();
    add("phone-390x844", "touch-activation", await page.locator("#name-form").isVisible());
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
    await installState(context, "landing");
    const page = await context.newPage();
    await page.goto(NATIVE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const media = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    const duration = await page.getByRole("button", { name: /첫 순간 심기/ }).first().evaluate((el) => {
      const s = getComputedStyle(el);
      const seconds = (value) => value.split(",").map((x) => x.trim()).map((x) => x.endsWith("ms") ? parseFloat(x) / 1000 : parseFloat(x)).filter(Number.isFinite);
      return Math.max(0, ...seconds(s.transitionDuration), ...seconds(s.animationDuration));
    });
    add("phone-390x844-reduced-motion", "prefers-reduced-motion-active", media, String(duration));
    add("phone-390x844-reduced-motion", "motion-duration-collapsed", duration <= 0.05, String(duration));
    await context.close();
  }
}

async function canonicalBoundary(browser, checks) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const response = await page.goto(CANONICAL_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('[data-testid="canonical-first-journey-v12"]').waitFor({ state: "visible", timeout: 12000 });
  const canonicalCount = await page.locator('[data-testid="canonical-first-journey-v12"]').count();
  const legacyShell = await page.locator(".v4-journey-shell").count();
  const iframes = await page.locator("iframe").count();
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const add = (check, pass, detail = "") => checks.push({ kind: "canonical-v12", viewport: "desktop-1280x800", state: "boundary", check, pass, detail });
  add("http-200", response?.status() === 200, String(response?.status()));
  add("canonical-v12-present", canonicalCount === 1, String(canonicalCount));
  add("legacy-not-default", legacyShell === 0, String(legacyShell));
  add("source-iframe-0", iframes === 0, String(iframes));
  add("horizontal-overflow-0", overflow === 0, String(overflow));
  add("console-errors-0", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  add("page-errors-0", pageErrors.length === 0, pageErrors.slice(0, 4).join(" | "));
  await context.close();
}

async function main() {
  const sourceBytes = fs.readFileSync(SOURCE_PATH);
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  const checks = [
    { kind: "authority", viewport: "n/a", state: "source", check: "source-bytes", pass: sourceBytes.length === EXPECTED_BYTES, detail: String(sourceBytes.length) },
    { kind: "authority", viewport: "n/a", state: "source", check: "source-sha256", pass: sourceSha === EXPECTED_SHA256, detail: sourceSha },
    { kind: "authority", viewport: "n/a", state: "main", check: "expected-main", pass: process.env.TRACK02_EXPECTED_MAIN === EXPECTED_MAIN, detail: process.env.TRACK02_EXPECTED_MAIN || "missing" },
  ];
  const artifacts = [];
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      for (const state of STATES) {
        const source = await capture(browser, "source", SOURCE_URL, vp, state, checks);
        const native = await capture(browser, "native", NATIVE_URL, vp, state, checks);
        const pair = await sideBySide(browser, source, native, vp, state);
        artifacts.push({ viewport: vp.name, state: state.key, source: path.basename(source), native: path.basename(native), sideBySide: path.basename(pair) });
      }
    }
    await nativeFunctional(browser, checks);
    await canonicalBoundary(browser, checks);
  } finally {
    await browser.close();
  }
  const failures = checks.filter((c) => !c.pass);
  const result = {
    exactMain: EXPECTED_MAIN,
    source: { path: SOURCE_PATH, bytes: sourceBytes.length, sha256: sourceSha },
    mapping: {
      productJob: "FIRST JOURNEY / JOURNEY",
      canonicalRoute: "/v4/journey",
      canonicalComponent: "V4FirstJourneyV12",
      directTrack02Route: "/v4/journey?legacy=1",
      directTrack02Component: "V4FirstJourney + V4FirstJourneyFidelityBridge",
    },
    matchedStates: STATES.map(({ key, screen }) => ({ key, screen })),
    viewports: VIEWPORTS,
    artifacts,
    summary: { checks: checks.length, failures: failures.length },
    checks,
  };
  fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify(result, null, 2));
  console.log(`TRACK02 FINAL CLOSURE CHECKS=${checks.length} FAILURES=${failures.length}`);
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.kind} ${c.viewport} ${c.state} ${c.check}${c.detail ? ` [${c.detail}]` : ""}`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
