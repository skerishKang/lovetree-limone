import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.V4_BASE_URL ?? "http://127.0.0.1:3000";
const screenshotDir = process.env.TRACK38_SCREENSHOT_DIR ?? "/tmp/track38-browser-qa";
const donorPath = "/design-lab/source-tracks/38/v1/donor";
const canonicalDiscover = "/v4/community";

const treeFixtures = [
  { id: "tree-alpha", title: "봄밤의 첫 우주", artist: "Fan A", memo: "공개 트리 A", likeCount: 12, viewCount: 40 },
  { id: "tree-beta", title: "다시 만난 여름", artist: "Fan B", memo: "공개 트리 B", likeCount: 7, viewCount: 21 },
];
const memoryFixtures = {
  "tree-alpha": [
    { id: "m1", treeId: "tree-alpha", parentId: null, title: "첫 발견", memo: "처음 마음이 멈춘 공개 순간", emotionTags: ["설렘"], timestamp: "00:18", sortOrder: 0 },
    { id: "m2", treeId: "tree-alpha", parentId: "m1", title: "다음 무대", memo: "첫 발견에서 이어진 순간", emotionTags: ["벅참"], timestamp: "01:42", sortOrder: 1 },
    { id: "m3", treeId: "tree-alpha", parentId: "m1", title: "오래 남은 말", memo: "같은 사람의 다른 공개 기억", emotionTags: ["위로"], timestamp: "03:07", sortOrder: 2 },
    { id: "m4", treeId: "tree-alpha", parentId: "m2", title: "다시 돌아온 밤", memo: "연결이 한 번 더 이어진 순간", emotionTags: ["그리움"], timestamp: "02:11", sortOrder: 3 },
  ],
  "tree-beta": [
    { id: "b1", treeId: "tree-beta", parentId: null, title: "여름의 입구", memo: "두 번째 공개 트리의 루트", emotionTags: ["따뜻함"], timestamp: "00:33", sortOrder: 0 },
    { id: "b2", treeId: "tree-beta", parentId: "b1", title: "이어진 편지", memo: "공개 parent 연결", emotionTags: ["평온"], timestamp: "01:05", sortOrder: 1 },
  ],
};

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function installApiFixtures(page) {
  await page.route("**/api/community/trees**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(treeFixtures) });
  });
  await page.route("**/api/community/memories**", async (route) => {
    const url = new URL(route.request().url());
    const treeId = url.searchParams.get("treeId") || "tree-alpha";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(memoryFixtures[treeId] ?? []),
    });
  });
}

async function auditViewport({ name, width, height, mobile = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiFixtures(page);

  const response = await page.goto(`${baseUrl}${donorPath}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), `${name}: donor route must return 2xx`);
  await page.getByRole("heading", { name: /보이저의 우주는/ }).waitFor();
  await page.getByRole("button", { name: /첫 발견/ }).waitFor();

  const dimensions = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scrollWidth <= dimensions.innerWidth, `${name}: horizontal overflow ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
  assert.equal(await page.locator("iframe").count(), 0, `${name}: donor must not embed source YouTube runtime`);
  assert.equal(await page.locator("img").count(), 0, `${name}: donor must not copy source thumbnail runtime`);

  const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
  assert.ok(hrefs.includes(canonicalDiscover), `${name}: canonical Discover link missing`);
  assert.ok(hrefs.includes("/v4/community/trees/tree-alpha"), `${name}: canonical public-tree link missing`);
  assert.ok(hrefs.every((href) => typeof href === "string" && href.startsWith("/")), `${name}: donor contains an external/unresolved href`);

  const first = page.getByRole("button", { name: /첫 발견/ });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  const second = page.getByRole("button", { name: /다음 무대/ });
  await second.waitFor();
  assert.equal(await second.getAttribute("aria-pressed"), "true", `${name}: arrow-key navigation must move canonical selection`);

  await page.getByRole("button", { name: "radial" }).click();
  await page.getByRole("button", { name: "지도 확대" }).click();
  await page.getByRole("button", { name: "지도 오른쪽 이동" }).click();
  assert.match(await page.locator("main").innerText(), /다음 무대/, `${name}: selected inspector must remain available after layout controls`);

  if (mobile) {
    const third = page.getByRole("button", { name: /오래 남은 말/ });
    await third.tap();
    assert.equal(await third.getAttribute("aria-pressed"), "true", `${name}: touch selection must work`);
  }

  await page.screenshot({ path: `${screenshotDir}/${name}.png`, fullPage: true });
  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);
  await context.close();
}

try {
  await auditViewport({ name: "desktop-1280x800", width: 1280, height: 800 });
  await auditViewport({ name: "mobile-390x844", width: 390, height: 844, mobile: true });

  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await installApiFixtures(reducedPage);
  const response = await reducedPage.goto(`${baseUrl}${donorPath}`, { waitUntil: "domcontentloaded" });
  assert.ok(response?.ok(), "reduced-motion: donor route must return 2xx");
  const node = reducedPage.getByRole("button", { name: /첫 발견/ });
  await node.waitFor();
  const before = await node.boundingBox();
  await reducedPage.waitForTimeout(250);
  const after = await node.boundingBox();
  assert.ok(before && after, "reduced-motion: reference node must stay measurable");
  assert.ok(Math.abs(before.x - after.x) < 0.5 && Math.abs(before.y - after.y) < 0.5, "reduced-motion: donor must not auto-orbit or continuously move nodes");
  await reducedContext.close();

  console.log("TRACK38_V1_DISCOVER_DONOR_BROWSER_QA=PASS");
} finally {
  await browser.close();
}
