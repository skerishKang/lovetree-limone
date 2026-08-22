import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const PHASE = process.argv[2];
if (!new Set(["hold", "exact"]).has(PHASE)) {
  console.error("usage: node tests/living-media-sphere-v3-browser-qa.mjs <hold|exact>");
  process.exit(2);
}

const BASE = process.env.LIVING_MEDIA_SPHERE_BASE_URL || process.env.V4_BASE_URL || "http://localhost:3000";
const RUNNER = `${BASE}/design-lab/source-families/living-media-sphere/v3/source`;
const ASSET = "/design-lab-assets/source-families/living-media-sphere/v3";
const SHOTS = process.env.LIVING_MEDIA_SPHERE_SCREENSHOT_DIR || "/tmp/living-media-sphere-browser-qa";
const ROOT = new URL("../", import.meta.url);
await mkdir(SHOTS, { recursive: true });

const family = JSON.parse(await readFile(new URL("design-intake/source-families/living-media-sphere-v3.json", ROOT), "utf8"));
const historical = JSON.parse(await readFile(new URL(family.exactMedia.historicalEvidenceSnapshot, ROOT), "utf8"));
const inventory = Object.values(historical).find((v) => v && typeof v === "object" && Array.isArray(v.videos) && Array.isArray(v.posters) && v.videos.length === 89 && v.posters.length === 89);
assert.ok(inventory, "preserved historical evidence must contain 89 videos + 89 posters");

const unexpected = [];
const expectedHold = [];
const mp4Requests = [];
const MEDIA = /\.(mp4|jpg|jpeg|png|webp|webm|mov)$/i;
function expectedMediaError(text, url) {
  if (!url?.includes(`${ASSET}/assets/`) || !MEDIA.test(url)) return false;
  if (/net::ERR_ABORTED/i.test(text)) return true;
  return PHASE === "hold" && /404|net::ERR|Failed to load resource/i.test(text);
}
function note(kind, text, url = "") {
  (expectedMediaError(text, url) ? expectedHold : unexpected).push({ kind, text: text.slice(0, 180), url });
}
function collect(page, label) {
  page.on("console", (msg) => { if (msg.type() === "error") note(`console[${label}]`, msg.text(), msg.location()?.url || ""); });
  page.on("pageerror", (err) => note(`pageerror[${label}]`, String(err)));
  page.on("request", (req) => { if (req.url().includes(".mp4")) mp4Requests.push(req.url()); });
  page.on("requestfailed", (req) => note(`requestfailed[${label}]`, `net::ERR ${req.failure()?.errorText} ${req.url()}`, req.url()));
}
function sourceFrame(page) { return page.frames().find((f) => f.url().includes(`${ASSET}/index.html`)); }
async function focusById(frame, id) {
  const target = frame.locator(`#${id}`);
  if ((await target.count()) !== 1) return false;
  await target.focus();
  return (await frame.evaluate(() => document.activeElement?.id || "")) === id;
}
async function screenshot(page, name) { await writeFile(`${SHOTS}/${name}.png`, await page.screenshot()); }
const results = {};
function record(key, value) {
  results[key] = value;
  console.log(`${value === false ? "FAIL" : "OK  "} ${key} = ${typeof value === "string" ? value : JSON.stringify(value)}`);
  if (value === false) process.exitCode = 1;
}
async function slider(frame, page) {
  if (!(await focusById(frame, "objects"))) return false;
  await page.keyboard.press("Home");
  await frame.waitForFunction(() => document.getElementById("objectCount")?.textContent === "18", null, { timeout: 5000 });
  await frame.waitForFunction(() => document.querySelectorAll('.node[style*="display: none"]').length === 71, null, { timeout: 5000 });
  await page.keyboard.press("End");
  await frame.waitForFunction(() => document.getElementById("objectCount")?.textContent === "89", null, { timeout: 5000 });
  await frame.waitForFunction(() => document.querySelectorAll('.node[style*="display: none"]').length === 0, null, { timeout: 5000 });
  return true;
}
async function reset(frame, page) {
  if (!(await focusById(frame, "objects"))) return false;
  await page.keyboard.press("Home");
  if (!(await focusById(frame, "corner"))) return false;
  await page.keyboard.press("Home");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  if (!(await focusById(frame, "reset"))) return false;
  await page.keyboard.press("Enter");
  await frame.waitForFunction(() => document.getElementById("objectCount")?.textContent === "89", null, { timeout: 5000 });
  return (await frame.locator("#objects").inputValue()) === "89" && (await frame.locator("#corner").inputValue()) === "7";
}
async function clickFilm(page, frame, film) {
  try { await film.click({ timeout: 3000 }); return true; }
  catch {
    await page.evaluate(() => window.scrollBy(0, 700));
    const box = await film.boundingBox();
    if (!box) return false;
    await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 40));
    return true;
  }
}

if (PHASE === "exact") {
  const stage = new URL("public/design-lab-assets/source-families/living-media-sphere/v3/assets", ROOT);
  assert.ok(await stat(stage).then(() => true).catch(() => false), "exact phase requires gitignored 89+89 local overlay");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const hash = async (url) => {
    const res = await page.request.get(url);
    assert.ok(res.ok(), `staged asset fetch failed ${url}`);
    return createHash("sha256").update(await res.body()).digest("hex");
  };
  let posters = 0, videos = 0;
  for (const p of inventory.posters) { assert.equal(await hash(`${BASE}${ASSET}/assets/posters-v3/${p.f}`), p.h); posters++; }
  const limit = Number(process.env.LIVING_MEDIA_SPHERE_EXACT_VIDEO_SAMPLE || inventory.videos.length);
  for (const v of inventory.videos.slice(0, limit)) { assert.equal(await hash(`${BASE}${ASSET}/assets/videos-v3/${v.f}`), v.h); videos++; }
  record("exact_phase_served_sha_verified", `posters ${posters}/89, videos ${videos}/${limit}`);
  await browser.close();
}

const browser = await chromium.launch();
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  collect(page, "gate");
  await page.goto(RUNNER, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-runner-state="ready"]', { timeout: 15000 });
  await page.waitForSelector('iframe[data-source-state="ready"]', { timeout: 15000 });
  record("hash_gate", true);

  let tamperedFetches = 0;
  await ctx.route(`**${ASSET}/index.html`, (route) => { tamperedFetches++; return route.fulfill({ status: 200, contentType: "text/html", body: "<html>tampered</html>" }); });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-runner-state="failed"]', { timeout: 15000 });
  record("fail_closed", (await page.locator("iframe").count()) === 0);
  await page.getByRole("button", { name: "Re-verify" }).click();
  await page.waitForSelector('[data-runner-state="failed"]', { timeout: 15000 });
  const refetched = tamperedFetches >= 2;
  await ctx.unroute(`**${ASSET}/index.html`);
  await page.getByRole("button", { name: "Re-verify" }).click();
  await page.waitForSelector('[data-runner-state="ready"]', { timeout: 15000 });
  record("reverify_real_refetch_and_recovery", refetched);
  const retired = `${BASE}/design-lab/source-tracks/${String(68)}/v3/source`;
  record("retired_numeric_route_404", (await page.request.get(retired)).status() === 404);
  await screenshot(page, "gate-recovered");
  await ctx.close();
}

for (const vp of [
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "narrow-320x720", width: 320, height: 720 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  collect(page, vp.name);
  await page.goto(RUNNER, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-runner-state="ready"]', { timeout: 15000 });
  const frame = sourceFrame(page);
  assert.ok(frame, `source frame mounted ${vp.name}`);
  await frame.waitForSelector(".node", { timeout: 10000 });
  if (vp.width < 800) { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700); }
  record(`${vp.name}_89_nodes`, (await frame.locator(".node").count()) === 89 && (await frame.locator("#objectCount").textContent()) === "89");

  await frame.locator("#libraryTrigger").press("l");
  await frame.waitForSelector("body.library-open", { timeout: 5000 });
  await page.keyboard.press("Escape");
  record(`${vp.name}_media_drawer`, (await frame.locator("body.library-open").count()) === 0);

  await frame.locator("#controlsTrigger").press("r");
  await frame.waitForSelector("body.controls-open", { timeout: 5000 });
  if (vp.name === "desktop-1280x800") {
    record("desktop_slider_89_18_89", await slider(frame, page));
    record("desktop_reset_defaults", await reset(frame, page));
  }
  await page.keyboard.press("Escape");
  record(`${vp.name}_shape_drawer`, (await frame.locator("body.controls-open").count()) === 0);

  const stage = frame.locator("#stage");
  const box = await stage.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  const viewerAfterDrag = await frame.locator(".viewer.open").count();

  await frame.locator("#libraryTrigger").press("l");
  await frame.waitForSelector("body.library-open", { timeout: 5000 });
  const film = frame.locator('.film[data-index="0"]');
  const firstClick = await clickFilm(page, frame, film);
  await frame.waitForSelector(".node.selected", { timeout: 5000 });
  record(`${vp.name}_selection`, firstClick && (await frame.locator(".node.selected").first().getAttribute("data-index")) === "0");

  await frame.locator("#libraryTrigger").press("l");
  await frame.waitForSelector("body.library-open", { timeout: 5000 });
  await clickFilm(page, frame, film);
  await frame.waitForSelector(".viewer.open", { timeout: 5000 });
  const viewerSrc = await frame.locator("#viewerMedia video").getAttribute("src");
  record(`${vp.name}_repeat_click_viewer`, /v3-001\.mp4/.test(viewerSrc || ""));
  await page.keyboard.press("Escape");
  record(`${vp.name}_drag_no_open_escape_close`, viewerAfterDrag === 0 && (await frame.locator(".viewer.open").count()) === 0);

  const frameOverflow = await frame.evaluate(() => ({ html: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(`${vp.name}_overflow_zero`, frameOverflow.html === 0 && frameOverflow.body === 0 && pageOverflow === 0);
  await screenshot(page, vp.name);
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  collect(page, "reduced-motion");
  await page.goto(RUNNER, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-runner-state="ready"]', { timeout: 15000 });
  const frame = sourceFrame(page);
  assert.ok(frame);
  await frame.waitForSelector(".node", { timeout: 10000 });
  const before = await frame.locator(".node").first().getAttribute("style");
  await page.waitForTimeout(800);
  const after = await frame.locator(".node").first().getAttribute("style");
  record("reduced_motion_partial_known_source_defect", before !== after);
  record("reduced_motion_classification", "PARTIAL / KNOWN_SOURCE_DEFECT");
  await ctx.close();
}
await browser.close();
record("unexpected_console_page_errors", unexpected.length === 0 ? 0 : unexpected);
record("expected_missing_media_transport_errors", PHASE === "hold" ? expectedHold.length : "n/a");
record("mp4_requests_observed", mp4Requests.length);
console.log(JSON.stringify(results, null, 2));
if (unexpected.length > 0 || process.exitCode) process.exit(1);
console.log("ALL PASS");
