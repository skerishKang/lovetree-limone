import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = process.env.TRACK01_QA_URL || "http://127.0.0.1:3000";
const SOURCE = path.resolve(process.cwd(), "reference/source-tracks-snapshot/01_0730작업물/lovetree-community-discovery-v2.html");
const EXPECTED_SHA256 = "661d21d4e85711603f7e8fe3966d3fd5ccc29c920fd6479850c2f99040e39f59";
const OUT = path.resolve(process.cwd(), "qa-artifacts/track01-community-visual-fidelity");
fs.mkdirSync(OUT, { recursive: true });

const imageIds = ["nqofkzQD19E", "5dsm6m44cL4", "LlQEKB2H7z4", "bcUfIpQ6aeA"];
const trees = [
  { id: "qa-violet", title: "함께 쌓인 보랏빛 순간", memo: "서로의 응원과 위로가 오래 쌓여 하나의 길이 된 공개 러브트리입니다.", artist: "별빛정원", visibility: "public", likeCount: 2814, viewCount: 9482, createdAt: "2026-07-29T00:00:00.000Z" },
  { id: "qa-red", title: "레드와 별빛 사이", memo: "무대의 붉은 조명과 심장이 먼저 알아본 순간들을 이어 만든 기록입니다.", artist: "오늘의기록", visibility: "public", likeCount: 3160, viewCount: 10544, createdAt: "2026-07-30T00:00:00.000Z" },
  { id: "qa-season", title: "우리가 사랑하는 새로운 계절", memo: "따뜻한 바람만 불어도 다시 떠오르는 장면과 노래를 이어 담았습니다.", groupName: "봄의정원", visibility: "public", likeCount: 2420, viewCount: 7188, createdAt: "2026-07-27T00:00:00.000Z" },
];
const memoriesByTree = Object.fromEntries(trees.map((tree, treeIndex) => [tree.id, Array.from({ length: 4 }, (_, index) => ({
  id: `${tree.id}-m${index + 1}`,
  treeId: tree.id,
  parentId: index ? `${tree.id}-m${index}` : null,
  connectionReason: index ? ["댓글을 따라 다시 찾았어요", "다른 모습을 더 찾아봤어요", "직접 다시 검색했어요"][index - 1] : null,
  title: ["처음 마음이 멈춘 장면", "다시 찾아본 순간", "오래 남은 한 문장", "무대 밖의 이야기"][index],
  memo: ["첫 장면에서 마음이 먼저 멈췄습니다.", "다시 찾은 이유가 선명하게 남았습니다.", "힘든 날마다 조용히 꺼내 보는 문장이 됐습니다.", "조금 더 알고 싶어 이어서 찾아본 순간입니다."][index],
  sourceType: "youtube",
  sourceUrl: `https://www.youtube.com/watch?v=${imageIds[(treeIndex + index) % imageIds.length]}`,
  thumbnail: `https://img.youtube.com/vi/${imageIds[(treeIndex + index) % imageIds.length]}/hqdefault.jpg`,
  emotionTags: ["설렘", "추억"],
  visibility: "public",
  timestamp: `2026-07-${String(20 + treeIndex + index).padStart(2, "0")}T12:00:00.000Z`,
}))]));

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function placeholderSvg(seed) {
  const hue = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${hue} 32% 62%)"/><circle cx="470" cy="95" r="110" fill="rgba(255,255,255,.16)"/></svg>`;
}

async function installNetwork(context) {
  await context.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await context.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await context.route("https://img.youtube.com/**", async (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: placeholderSvg(route.request().url()) }));
  await context.route("**/api/community/trees**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(trees) }));
  await context.route("**/api/community/memories**", async (route) => {
    const url = new URL(route.request().url());
    const treeId = url.searchParams.get("treeId") || trees[0].id;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memoriesByTree[treeId] || []) });
  });
}

function attachErrors(page) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return { pageErrors, consoleErrors };
}

async function makeSource(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 390, isMobile: viewport.width <= 390, reducedMotion });
  await installNetwork(context);
  await context.route("http://track01-source.local/", async (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fs.readFileSync(SOURCE, "utf8") }));
  const page = await context.newPage();
  const errors = attachErrors(page);
  await page.goto("http://track01-source.local/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("#grid .tree-card").first().waitFor({ state: "visible", timeout: 10000 });
  return { context, page, ...errors };
}

async function makeNative(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 390, isMobile: viewport.width <= 390, reducedMotion });
  await installNetwork(context);
  const page = await context.newPage();
  const errors = attachErrors(page);
  await page.goto(`${BASE}/v4/community`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('[data-track01-native="community"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('[data-track01-tree-card]').first().waitFor({ state: "visible", timeout: 10000 });
  return { context, page, ...errors };
}

async function screenshot(page, name) {
  const output = path.join(OUT, name);
  await page.screenshot({ path: output, fullPage: false, animations: "disabled" });
  return output;
}

async function compose(browser, sourcePath, nativePath, outputPath, width, height) {
  const context = await browser.newContext({ viewport: { width: width * 2, height: height + 42 } });
  const page = await context.newPage();
  const a = fs.readFileSync(sourcePath).toString("base64");
  const b = fs.readFileSync(nativePath).toString("base64");
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#1f1b1a;font:700 12px Arial;color:white}.labels{height:42px;display:grid;grid-template-columns:1fr 1fr;align-items:center;text-align:center;letter-spacing:.12em}.pair{display:flex;width:${width * 2}px;height:${height}px}.pair img{width:${width}px;height:${height}px;object-fit:cover;display:block}</style><div class="labels"><span>SOURCE</span><span>NATIVE</span></div><div class="pair"><img src="data:image/png;base64,${a}"><img src="data:image/png;base64,${b}"></div>`);
  await page.screenshot({ path: outputPath, fullPage: false });
  await context.close();
}

async function measure(page, kind) {
  const selectors = kind === "source" ? {
    title: "h1", parent: ".intro", main: ".main", search: ".search", controls: ".controls", grid: ".grid", preview: ".preview",
  } : {
    title: ".track01-intro h1", parent: ".track01-intro", main: ".track01-main", search: ".track01-search", controls: ".track01-controls", grid: ".track01-grid", preview: ".track01-preview-wrap",
  };
  return page.evaluate((s) => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    const title = document.querySelector(s.title);
    const parent = document.querySelector(s.parent);
    const main = document.querySelector(s.main);
    if (!title || !parent || !main) return { missing: true, selectors: s };
    const style = getComputedStyle(title);
    const parentStyle = getComputedStyle(parent);
    const mainStyle = getComputedStyle(main);
    const firstText = [...title.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const firstSegmentRects = [];
    if (firstText) {
      const range = document.createRange();
      range.selectNodeContents(firstText);
      for (const r of range.getClientRects()) firstSegmentRects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
    }
    const parsedLineHeight = Number.parseFloat(style.lineHeight);
    const titleRect = title.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      title: rect(s.title),
      parent: rect(s.parent),
      main: rect(s.main),
      search: rect(s.search),
      controls: rect(s.controls),
      grid: rect(s.grid),
      preview: rect(s.preview),
      firstSegmentRects,
      firstSegmentSoftWraps: Math.max(0, firstSegmentRects.length - 1),
      estimatedLines: Number.isFinite(parsedLineHeight) && parsedLineHeight > 0 ? Math.round(titleRect.height / parsedLineHeight) : null,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      wordBreak: style.wordBreak,
      overflowWrap: style.overflowWrap,
      whiteSpace: style.whiteSpace,
      maxWidth: style.maxWidth,
      display: style.display,
      parentPadding: parentStyle.padding,
      mainDisplay: mainStyle.display,
      mainGridTemplateColumns: mainStyle.gridTemplateColumns,
      mainGap: mainStyle.gap,
      fontsStatus: document.fonts.status,
      sourceFontLoaded: document.fonts.check(`700 ${style.fontSize} "Gowun Batang"`),
      georgiaLoaded: document.fonts.check(`700 ${style.fontSize} Georgia`),
    };
  }, selectors);
}

function recordErrors(checks, label, pageState) {
  checks.push({ viewport: label, check: "page errors 0", pass: pageState.pageErrors.length === 0, detail: pageState.pageErrors });
  checks.push({ viewport: label, check: "console errors 0", pass: pageState.consoleErrors.length === 0, detail: pageState.consoleErrors });
}

async function captureGeometry(browser, checks, geometry, width, height) {
  const viewport = { width, height };
  const source = await makeSource(browser, viewport);
  const native = await makeNative(browser, viewport);
  geometry[`${width}x${height}`] = { source: await measure(source.page, "source"), native: await measure(native.page, "native") };
  const sourceOverflow = await source.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const nativeOverflow = await native.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  checks.push({ viewport: `${width}x${height}`, check: "source horizontal overflow 0", pass: sourceOverflow === 0, detail: sourceOverflow });
  checks.push({ viewport: `${width}x${height}`, check: "native horizontal overflow 0", pass: nativeOverflow === 0, detail: nativeOverflow });
  recordErrors(checks, `source-${width}x${height}`, source);
  recordErrors(checks, `native-${width}x${height}`, native);
  if (width === 320) {
    const sourcePath = await screenshot(source.page, "source-narrow-320x720.png");
    const nativePath = await screenshot(native.page, "native-narrow-320x720-precentral.png");
    await compose(browser, sourcePath, nativePath, path.join(OUT, "compare-narrow-320x720.png"), width, height);
  }
  await source.context.close();
  await native.context.close();
}

async function captureMobileStates(browser, checks) {
  const viewport = { width: 390, height: 844 };
  const source = await makeSource(browser, viewport);
  const native = await makeNative(browser, viewport);

  await source.page.locator('[data-tree="red"]').tap();
  await native.page.locator('[data-track01-tree-card][data-tree-id="qa-red"]').tap();
  const sourceSelected = await screenshot(source.page, "source-mobile-selected.png");
  const nativeSelected = await screenshot(native.page, "native-mobile-selected.png");
  await compose(browser, sourceSelected, nativeSelected, path.join(OUT, "compare-mobile-selected.png"), viewport.width, viewport.height);
  checks.push({ viewport: "390x844-touch", check: "candidate touch selection", pass: true });

  await source.page.locator("#open").tap();
  await source.page.locator("#overlay.opened").waitFor({ state: "visible" });
  await source.page.locator(".node").nth(1).tap();
  await native.page.locator('[data-track01-open]').tap();
  await native.page.locator('[data-track01-full-tree]').waitFor({ state: "visible" });
  await native.page.locator('[data-track01-moment-node]').nth(1).tap();
  const sourceFullTree = await screenshot(source.page, "source-mobile-full-tree.png");
  const nativeFullTree = await screenshot(native.page, "native-mobile-full-tree.png");
  await compose(browser, sourceFullTree, nativeFullTree, path.join(OUT, "compare-mobile-full-tree.png"), viewport.width, viewport.height);
  checks.push({ viewport: "390x844-touch", check: "full-tree touch navigation", pass: true });
  recordErrors(checks, "source-390x844-touch", source);
  recordErrors(checks, "native-390x844-touch", native);
  await source.context.close();
  await native.context.close();
}

async function captureReducedMotion(browser, checks) {
  const viewport = { width: 390, height: 844 };
  const source = await makeSource(browser, viewport, "reduce");
  const native = await makeNative(browser, viewport, "reduce");
  const sourceInitial = await screenshot(source.page, "source-mobile-reduced-motion.png");
  const nativeInitial = await screenshot(native.page, "native-mobile-reduced-motion-precentral.png");
  await compose(browser, sourceInitial, nativeInitial, path.join(OUT, "compare-mobile-reduced-motion.png"), viewport.width, viewport.height);
  const duration = await native.page.locator('[data-track01-preview]').evaluate((node) => getComputedStyle(node).transitionDuration);
  checks.push({ viewport: "reduced-motion", check: "native transitions collapse", pass: duration === "0s" || duration.split(",").every((value) => value.trim() === "0s"), detail: duration });
  await source.page.locator("#open").tap();
  await source.page.locator("#overlay.opened").waitFor({ state: "visible" });
  await native.page.locator('[data-track01-open]').tap();
  await native.page.locator('[data-track01-full-tree]').waitFor({ state: "visible" });
  const sourceFullTree = await screenshot(source.page, "source-mobile-full-tree-reduced-motion.png");
  const nativeFullTree = await screenshot(native.page, "native-mobile-full-tree-reduced-motion.png");
  await compose(browser, sourceFullTree, nativeFullTree, path.join(OUT, "compare-mobile-full-tree-reduced-motion.png"), viewport.width, viewport.height);
  recordErrors(checks, "source-reduced-motion", source);
  recordErrors(checks, "native-reduced-motion", native);
  await source.context.close();
  await native.context.close();
}

async function main() {
  const sourceHash = sha256(SOURCE);
  const checks = [{ viewport: "source", check: "pinned SHA256 matches executable", pass: sourceHash === EXPECTED_SHA256, detail: sourceHash }];
  const geometry = {};
  const browser = await chromium.launch();
  await captureGeometry(browser, checks, geometry, 1280, 800);
  await captureGeometry(browser, checks, geometry, 390, 844);
  await captureGeometry(browser, checks, geometry, 320, 720);
  await captureMobileStates(browser, checks);
  await captureReducedMotion(browser, checks);
  await browser.close();

  const failures = checks.filter((check) => !check.pass);
  const result = {
    source: SOURCE,
    sourceSha256: sourceHash,
    expectedSha256: EXPECTED_SHA256,
    nativeRoute: "/v4/community",
    summary: { checks: checks.length, failures: failures.length },
    geometry,
    checks,
  };
  fs.writeFileSync(path.join(OUT, "precentral-gate.json"), JSON.stringify(result, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail !== undefined ? `  [${JSON.stringify(check.detail)}]` : ""}`);
  console.log("TITLE_GEOMETRY", JSON.stringify(geometry));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
