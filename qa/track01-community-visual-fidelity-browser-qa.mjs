import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = process.env.TRACK01_QA_URL || "http://127.0.0.1:3000";
const SOURCE = path.resolve(process.cwd(), "reference/source-tracks-snapshot/01_0730작업물/lovetree-community-discovery-v2.html");
const EXPECTED_SHA256 = "661d21d4e85711603f7e8fe3966d3fd5ccc29c920fd6479850c2f99040e39f59";
const OUT = path.resolve(process.cwd(), "qa-artifacts/track01-community-visual-fidelity");
fs.mkdirSync(OUT, { recursive: true });

const imageIds = ["nqofkzQD19E", "5dsm6m44cL4", "LlQEKB2H7z4", "bcUfIpQ6aeA", "mRppy-KnyNI"];
const trees = [
  { id: "qa-violet", title: "함께 쌓인 보랏빛 순간", memo: "서로의 응원과 위로가 오래 쌓여 하나의 길이 된 공개 러브트리입니다.", artist: "별빛정원", visibility: "public", likeCount: 2814, viewCount: 9482, createdAt: "2026-07-29T00:00:00.000Z" },
  { id: "qa-red", title: "레드와 별빛 사이", memo: "무대의 붉은 조명과 심장이 먼저 알아본 순간들을 이어 만든 기록입니다.", artist: "오늘의기록", visibility: "public", likeCount: 3160, viewCount: 10544, createdAt: "2026-07-30T00:00:00.000Z" },
  { id: "qa-season", title: "우리가 사랑하는 새로운 계절", memo: "따뜻한 바람만 불어도 다시 떠오르는 장면과 노래를 이어 담았습니다.", groupName: "봄의정원", visibility: "public", likeCount: 2420, viewCount: 7188, createdAt: "2026-07-27T00:00:00.000Z" },
  { id: "qa-youth", title: "반짝이는 우리의 청춘 기록", memo: "웃음과 눈물이 한 페이지에 나란히 남은 시간을 모은 공개 기록입니다.", groupName: "청춘보관소", visibility: "public", likeCount: 2196, viewCount: 6403, createdAt: "2026-07-22T00:00:00.000Z" },
];
const emotionSets = [
  ["설렘", "위로", "응원", "사랑"],
  ["설렘", "추억", "무대"],
  ["계절", "설렘", "추억"],
  ["추억", "응원", "청춘"],
];
const memoriesByTree = Object.fromEntries(trees.map((tree, treeIndex) => [
  tree.id,
  Array.from({ length: 5 }, (_, index) => ({
    id: `${tree.id}-m${index + 1}`,
    treeId: tree.id,
    parentId: index ? `${tree.id}-m${index}` : null,
    connectionReason: index ? ["댓글을 따라 다시 찾았어요", "다른 모습을 더 찾아봤어요", "직접 다시 검색했어요", "팬의 추천으로 이어졌어요"][index - 1] : null,
    title: ["처음 마음이 멈춘 장면", "다시 찾아본 순간", "오래 남은 한 문장", "무대 밖의 이야기", "추천으로 이어진 기억"][index],
    memo: ["첫 장면에서 마음이 먼저 멈췄습니다.", "다시 찾은 이유가 선명하게 남았습니다.", "힘든 날마다 조용히 꺼내 보는 문장이 됐습니다.", "조금 더 알고 싶어 이어서 찾아본 순간입니다.", "다른 사람의 추천이 새로운 가지가 됐습니다."][index],
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${imageIds[(treeIndex + index) % imageIds.length]}`,
    thumbnail: `https://img.youtube.com/vi/${imageIds[(treeIndex + index) % imageIds.length]}/hqdefault.jpg`,
    emotionTags: emotionSets[treeIndex],
    visibility: "public",
    timestamp: `2026-07-${String(20 + treeIndex + index).padStart(2, "0")}T12:00:00.000Z`,
  })),
]));

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function placeholderSvg(seed) {
  const hue = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 38% 72%)"/><stop offset="1" stop-color="hsl(${(hue + 42) % 360} 36% 38%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="470" cy="95" r="110" fill="rgba(255,255,255,.18)"/><path d="M0 310 C140 230 260 340 420 250 C520 195 575 230 640 180 V360 H0Z" fill="rgba(38,28,31,.28)"/></svg>`;
}

async function installDeterministicNetwork(context) {
  await context.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await context.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await context.route("https://img.youtube.com/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "image/svg+xml", body: placeholderSvg(route.request().url()) });
  });
  await context.route("**/api/community/trees**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(trees) });
  });
  await context.route("**/api/community/memories**", async (route) => {
    const url = new URL(route.request().url());
    const treeId = url.searchParams.get("treeId") || trees[0].id;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memoriesByTree[treeId] || []) });
  });
}

async function sourcePage(browser, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 390, isMobile: viewport.width <= 390 });
  await installDeterministicNetwork(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${BASE}/v4/community`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.setContent(fs.readFileSync(SOURCE, "utf8"), { waitUntil: "domcontentloaded" });
  await page.locator("#grid .tree-card").first().waitFor({ state: "visible", timeout: 10000 });
  return { context, page, errors };
}

async function nativePage(browser, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 390, isMobile: viewport.width <= 390, reducedMotion });
  await installDeterministicNetwork(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${BASE}/v4/community`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
  return { context, page, errors };
}

async function screenshot(page, name) {
  const target = path.join(OUT, name);
  await page.screenshot({ path: target, fullPage: false, animations: "disabled" });
  return target;
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

async function diff(browser, sourcePath, nativePath, outputPath, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const a = fs.readFileSync(sourcePath).toString("base64");
  const b = fs.readFileSync(nativePath).toString("base64");
  await page.setContent(`<canvas id="c" width="${width}" height="${height}"></canvas>`);
  await page.evaluate(async ({ leftB64, rightB64, canvasWidth, canvasHeight }) => {
    const load = (src) => new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.src = src; });
    const [left, right] = await Promise.all([load(`data:image/png;base64,${leftB64}`), load(`data:image/png;base64,${rightB64}`)]);
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    scratch.width = canvasWidth;
    scratch.height = canvasHeight;
    const sctx = scratch.getContext("2d");
    ctx.drawImage(left, 0, 0, canvasWidth, canvasHeight);
    const first = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    sctx.drawImage(right, 0, 0, canvasWidth, canvasHeight);
    const second = sctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const out = ctx.createImageData(canvasWidth, canvasHeight);
    for (let index = 0; index < first.data.length; index += 4) {
      const delta = (Math.abs(first.data[index] - second.data[index]) + Math.abs(first.data[index + 1] - second.data[index + 1]) + Math.abs(first.data[index + 2] - second.data[index + 2])) / 3;
      out.data[index] = Math.min(255, delta * 2.2);
      out.data[index + 1] = delta < 16 ? 12 : Math.min(255, delta * .45);
      out.data[index + 2] = delta < 16 ? 12 : Math.min(255, delta * .45);
      out.data[index + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, { leftB64: a, rightB64: b, canvasWidth: width, canvasHeight: height });
  await page.locator("#c").screenshot({ path: outputPath });
  await context.close();
}

async function captureDesktopAnchors(browser, checks) {
  const viewport = { width: 1280, height: 800 };
  const source = await sourcePage(browser, viewport);
  const native = await nativePage(browser, viewport);
  const nativeIsTrack01 = await native.page.locator('[data-track01-native="community"]').count() > 0;
  checks.push({ viewport: "desktop-1280x800", check: "native Track01 fidelity surface present", pass: nativeIsTrack01 });

  const pairs = [];
  pairs.push(["desktop-initial", await screenshot(source.page, "source-desktop-initial.png"), await screenshot(native.page, "native-desktop-initial.png")]);

  await source.page.locator('[data-tree="red"]').click();
  await native.page.locator('[data-track01-tree-card][data-tree-id="qa-red"]').click();
  pairs.push(["compare-state", await screenshot(source.page, "source-compare-state.png"), await screenshot(native.page, "native-compare-state.png")]);

  await source.page.locator('[data-tree="season"]').click();
  await native.page.locator('[data-track01-tree-card][data-tree-id="qa-season"]').click();
  await native.page.locator('[data-track01-preview]').scrollIntoViewIfNeeded();
  await source.page.locator(".preview").scrollIntoViewIfNeeded();
  pairs.push(["large-preview", await screenshot(source.page, "source-large-preview.png"), await screenshot(native.page, "native-large-preview.png")]);

  await source.page.locator("#open").click();
  await source.page.locator("#overlay.opened").waitFor({ state: "visible" });
  await source.page.locator(".node").nth(1).click();
  await native.page.locator('[data-track01-open]').click();
  await native.page.locator('[data-track01-full-tree]').waitFor({ state: "visible" });
  await native.page.locator('[data-track01-moment-node]').nth(1).click();
  checks.push({ viewport: "desktop-1280x800", check: "full-tree/deeper-detail semantic state available", pass: true });
  pairs.push(["full-tree", await screenshot(source.page, "source-full-tree.png"), await screenshot(native.page, "native-full-tree.png")]);

  for (const [name, sourcePath, nativePath] of pairs) {
    await compose(browser, sourcePath, nativePath, path.join(OUT, `compare-${name}.png`), viewport.width, viewport.height);
    await diff(browser, sourcePath, nativePath, path.join(OUT, `diff-${name}.png`), viewport.width, viewport.height);
  }

  const sourceOverflow = await source.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const nativeOverflow = await native.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  checks.push({ viewport: "desktop-1280x800", check: "source horizontal overflow 0", pass: sourceOverflow === 0, detail: sourceOverflow });
  checks.push({ viewport: "desktop-1280x800", check: "native horizontal overflow 0", pass: nativeOverflow === 0, detail: nativeOverflow });
  checks.push({ viewport: "desktop-1280x800", check: "source page errors 0", pass: source.errors.length === 0, detail: source.errors });
  checks.push({ viewport: "desktop-1280x800", check: "native page errors 0", pass: native.errors.length === 0, detail: native.errors });
  await source.context.close();
  await native.context.close();
}

async function captureMobile(browser, checks, width, height, includeSource = true) {
  const viewport = { width, height };
  const native = await nativePage(browser, viewport);
  const nativePath = await screenshot(native.page, width === 390 ? "native-mobile-initial.png" : "native-narrow-320x720.png");
  const nativeOverflow = await native.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  checks.push({ viewport: `${width}x${height}`, check: "native horizontal overflow 0", pass: nativeOverflow === 0, detail: nativeOverflow });
  checks.push({ viewport: `${width}x${height}`, check: "native page errors 0", pass: native.errors.length === 0, detail: native.errors });
  if (includeSource) {
    const source = await sourcePage(browser, viewport);
    const sourcePath = await screenshot(source.page, "source-mobile-initial.png");
    await compose(browser, sourcePath, nativePath, path.join(OUT, "compare-mobile-initial.png"), width, height);
    await diff(browser, sourcePath, nativePath, path.join(OUT, "diff-mobile-initial.png"), width, height);
    const sourceOverflow = await source.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    checks.push({ viewport: `${width}x${height}`, check: "source horizontal overflow 0", pass: sourceOverflow === 0, detail: sourceOverflow });
    checks.push({ viewport: `${width}x${height}`, check: "source page errors 0", pass: source.errors.length === 0, detail: source.errors });
    await source.context.close();
  }
  await native.context.close();
}

async function captureKeyboardAndMotion(browser, checks) {
  const keyboard = await nativePage(browser, { width: 1280, height: 800 });
  const firstCard = keyboard.page.locator('[data-track01-tree-card]').first();
  await firstCard.focus();
  checks.push({ viewport: "keyboard", check: "candidate card receives focus", pass: await firstCard.evaluate((node) => document.activeElement === node) });
  await keyboard.page.keyboard.press("Enter");
  await keyboard.page.locator('[data-track01-open]').focus();
  await keyboard.page.keyboard.press("Enter");
  await keyboard.page.locator('[data-track01-full-tree]').waitFor({ state: "visible" });
  const secondNode = keyboard.page.locator('[data-track01-moment-node]').nth(1);
  await secondNode.focus();
  checks.push({ viewport: "keyboard", check: "full-tree Moment node receives focus", pass: await secondNode.evaluate((node) => document.activeElement === node) });
  await keyboard.page.keyboard.press("Enter");
  await keyboard.page.keyboard.press("Escape");
  checks.push({ viewport: "keyboard", check: "Escape closes full-tree and restores trigger focus", pass: await keyboard.page.locator('[data-track01-open]').evaluate((node) => document.activeElement === node) });
  await keyboard.context.close();

  const reduced = await nativePage(browser, { width: 390, height: 844 }, "reduce");
  const transition = await reduced.page.locator('[data-track01-preview]').evaluate((node) => getComputedStyle(node).transitionDuration);
  checks.push({ viewport: "reduced-motion", check: "Track01 transitions collapse", pass: transition === "0s" || transition.split(",").every((value) => value.trim() === "0s"), detail: transition });
  await screenshot(reduced.page, "native-mobile-reduced-motion.png");
  await reduced.context.close();
}

async function main() {
  const sourceHash = sha256(SOURCE);
  const checks = [{ viewport: "source", check: "pinned SHA256 matches executable", pass: sourceHash === EXPECTED_SHA256, detail: sourceHash }];
  const browser = await chromium.launch();
  await captureDesktopAnchors(browser, checks);
  await captureMobile(browser, checks, 390, 844, true);
  await captureMobile(browser, checks, 320, 720, false);
  await captureKeyboardAndMotion(browser, checks);
  await browser.close();

  const failures = checks.filter((check) => !check.pass);
  const result = {
    source: SOURCE,
    sourceSha256: sourceHash,
    expectedSha256: EXPECTED_SHA256,
    nativeRoute: "/v4/community",
    nativeMode: "track01-fidelity",
    summary: { checks: checks.length, failures: failures.length },
    checks,
  };
  fs.writeFileSync(path.join(OUT, "visual-fidelity.json"), JSON.stringify(result, null, 2));
  for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.viewport}  ${check.check}${check.detail !== undefined ? `  [${JSON.stringify(check.detail)}]` : ""}`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
