import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://127.0.0.1:3000";
const TREE_ID = "tree-final-acceptance";
const TREE = {
  id: TREE_ID,
  title: "여름에 시작된 작은 러브트리",
  memo: "첫 장면에서 음악과 여행으로 이어진 공개 테스트 트리",
  artist: "Acceptance",
  visibility: "public",
  keywords: ["여름", "음악"],
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
  likeCount: 18,
  viewCount: 42,
};
const MOMENTS = [
  { id: "m1", treeId: TREE_ID, parentId: null, title: "처음 마음이 멈춘 장면", memo: "첫 장면", sourceUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4", thumbnail: "https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg", sourceType: "youtube", emotionTags: ["설렘"], timestamp: "2026-06-01", sortOrder: 0, visibility: "public", createdAt: "2026-06-01T00:00:00.000Z" },
  { id: "m2", treeId: TREE_ID, parentId: "m1", title: "다시 찾아본 노래", memo: "며칠 뒤 다시 들었다", sourceUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE", thumbnail: "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg", sourceType: "youtube", emotionTags: ["그리움"], timestamp: "2026-06-14", sortOrder: 1, visibility: "public", createdAt: "2026-06-14T00:00:00.000Z" },
  { id: "m3", treeId: TREE_ID, parentId: "m2", title: "여름 여행", memo: "노래 때문에 떠올린 바다", sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", thumbnail: "https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg", sourceType: "youtube", emotionTags: ["따뜻함"], timestamp: "2026-07-08", sortOrder: 2, visibility: "public", createdAt: "2026-07-08T00:00:00.000Z" },
  { id: "m-private", treeId: TREE_ID, parentId: "m2", title: "비공개 메모", memo: "공개 API에는 절대 없음", sourceType: "other", emotionTags: ["비밀"], timestamp: "2026-07-09", sortOrder: 3, visibility: "private", createdAt: "2026-07-09T00:00:00.000Z" },
];
const PUBLIC_MOMENTS = MOMENTS.filter((moment) => moment.visibility === "public");

async function mockApi(page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let payload = null;
    let status = 200;
    if (url.pathname === "/api/community/trees") payload = [{ ...TREE, ownerId: undefined }];
    else if (url.pathname === "/api/community/memories") payload = PUBLIC_MOMENTS;
    else if (url.pathname === `/api/trees/${TREE_ID}`) payload = { ...TREE, ownerId: undefined };
    else if (url.pathname === `/api/trees/${TREE_ID}/memories`) payload = PUBLIC_MOMENTS;
    else { status = 404; payload = { error: "Not found" }; }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
  });
}

async function open(browser, route, viewport) {
  const page = await browser.newPage({ viewport });
  await mockApi(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(350);
  return { page, pageErrors, status: response?.status() ?? 0 };
}

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`final Discovery renders live editorial home without overflow @ ${viewport.name}`, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const { page, pageErrors, status } = await open(browser, "/v4/community", viewport);
      assert.equal(status, 200);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.getByText("Every lasting obsession", { exact: false }).count(), 1);
      assert.ok(await page.getByText(TREE.title).count() >= 1);
      assert.equal(await noOverflow(page), true);
      await page.getByRole("button", { name: "Plant your first moment" }).first().click();
      await page.waitForURL(/\/v4\?start=1/);
    } finally { await browser.close(); }
  });

  test(`final canonical Tree surfaces render safely @ ${viewport.name}`, async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      for (const route of ["overview", "story", "graph", "replay", "studio"]) {
        const opened = await open(browser, `/trees/${TREE_ID}/${route}`, viewport);
        assert.equal(opened.status, 200, `${route} status`);
        assert.deepEqual(opened.pageErrors, [], `${route} page errors`);
        assert.equal(await noOverflow(opened.page), true, `${route} horizontal overflow`);
        if (route === "overview") {
          assert.equal(await opened.page.getByText("좋아한 마음을", { exact: false }).count(), 1);
          assert.equal(await opened.page.getByText("3", { exact: true }).count() > 0, true);
        }
        if (route === "story") {
          assert.equal(await opened.page.getByText("PUBLIC STORY", { exact: true }).count(), 1);
          assert.equal(await opened.page.getByText("비공개 메모", { exact: true }).count(), 0);
        }
        if (route === "graph") {
          await opened.page.getByRole("button", { name: "Constellation", exact: true }).click();
          assert.match(await opened.page.locator(".v4-graph").getAttribute("class"), /constellation/);
          assert.equal(await opened.page.getByText("비공개 메모", { exact: true }).count(), 0);
        }
        if (route === "replay") {
          assert.ok(await opened.page.locator(".v4-vinyl-disc").count());
          await opened.page.keyboard.press("ArrowRight");
          assert.ok(await opened.page.getByText("다시 찾아본 노래", { exact: true }).count());
        }
        if (route === "studio") {
          assert.ok(await opened.page.getByText("스튜디오는 이 러브트리의 소유자만 사용할 수 있어요.").count());
          assert.equal(await opened.page.getByRole("button", { name: "EXPORT", exact: true }).count(), 0);
        }
        await opened.page.close();
      }
    } finally { await browser.close(); }
  });
}
