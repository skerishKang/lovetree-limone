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

// Bounded conditional-wait standard (#360/#374/#382/#404 pattern):
// every transition/readiness expectation polls for the actual semantic
// condition with an explicit timeout/polling budget; the original assertion
// stays verbatim below it, and a timeout fails loudly with self-classifying
// diagnostics attached so a recurrence classifies itself.
const CONDITION_WAIT = { timeout: 30000, polling: 50 };

async function waitForCondition(page, condition, classify, label, arg = null, wait = CONDITION_WAIT) {
  try {
    await page.waitForFunction(condition, arg, { timeout: wait.timeout, polling: wait.polling });
  } catch (err) {
    const diag = await page.evaluate(classify).catch((diagErr) => ({ diagError: diagErr.message }));
    assert.fail(
      `${label}: condition not met within ${wait.timeout}ms (self-classification: ${JSON.stringify(diag)}) :: ${err.message}`,
    );
  }
}

// Route-level render-complete observables (#408): each marker exists in the
// DOM only after that route's API-backed content has actually rendered.
// Registering them per-route keeps open() honest — an unknown route fails
// loudly instead of silently skipping readiness.
function readinessFor(route) {
  if (route === "/v4/community") return { text: "Every lasting obsession" };
  if (route.endsWith("/overview")) return { selector: "#v4-overview-title" };
  if (route.endsWith("/story")) return { selector: ".v4-story-scroll-space[data-story-chapters]" };
  if (route.endsWith("/graph")) return { selector: ".v4-graph-node" };
  if (route.endsWith("/replay")) return { selector: ".v4-vinyl-disc" };
  if (route.endsWith("/studio")) return { text: "스튜디오는 이 러브트리의 소유자만 사용할 수 있어요." };
  throw new Error(`no readiness observable registered for route: ${route}`);
}

async function open(browser, route, viewport) {
  const page = await browser.newPage({ viewport });
  await mockApi(page);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  const readiness = readinessFor(route);
  await waitForCondition(
    page,
    readiness.selector
      ? (sel) => Boolean(document.querySelector(sel))
      : (needle) => typeof document.body?.innerText === "string" && document.body.innerText.includes(needle),
    () => ({
      pathname: location.pathname,
      visibleHeading: document.querySelector("h1, h2")?.textContent ?? null,
      bodyTextSample: typeof document.body?.innerText === "string" ? document.body.innerText.slice(0, 160) : "",
      scrollY,
      documentReadyState: document.readyState,
    }),
    `route readiness ${route}`,
    readiness.selector ?? readiness.text,
  );
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
          await opened.page.getByRole("button", { name: /처음과 지금 사이/ }).click();
          const recentCard = opened.page.locator(".v4-overview-moments article").first();
          await recentCard.focus();
          assert.equal(await recentCard.getAttribute("role"), "link");
          await opened.page.keyboard.press("Enter");
          await opened.page.waitForURL(new RegExp(`/trees/${TREE_ID}\\?moment=m3`));
        }
        if (route === "story") {
          assert.equal(await opened.page.getByText("PUBLIC STORY", { exact: true }).count(), 1);
          assert.equal(await opened.page.getByText("비공개 메모", { exact: true }).count(), 0);
          assert.equal(await opened.page.locator(".v4-story-scroll-space").getAttribute("data-story-chapters"), "3");
          const sticky = await opened.page.locator(".v4-story-sticky").evaluate((node) => getComputedStyle(node).position);
          assert.equal(sticky, "sticky");
          await opened.page.locator(".v4-story-rail button").nth(2).click();
          // Chapter transition (#408): the click applies chapter state
          // immediately and then drives a smooth scroll whose progress
          // handler recomputes the chapter mid-flight, so the target state
          // can transiently appear and revert. Require the chapter-3 state
          // (rail selection + sticky heading) to PERSIST across consecutive
          // polls instead of sleeping a fixed 650ms.
          await waitForCondition(
            opened.page,
            () => {
              const buttons = [...document.querySelectorAll(".v4-story-rail button")];
              const third = buttons[2];
              const stickyHeading = document.querySelector(".v4-story-sticky h1");
              const settled =
                Boolean(third?.classList.contains("is-active")) &&
                stickyHeading?.textContent?.trim() === "여름 여행";
              const state = window;
              state.__finalSurfacesChapter3Ticks =
                settled ? (state.__finalSurfacesChapter3Ticks ?? 0) + 1 : 0;
              return state.__finalSurfacesChapter3Ticks >= 8;
            },
            () => ({
              pathname: location.pathname,
              visibleHeading: document.querySelector(".v4-story-sticky h1")?.textContent?.trim() ?? null,
              activeStoryIndex: [...document.querySelectorAll(".v4-story-rail button")]
                .findIndex((button) => button.classList.contains("is-active")),
              railState: [...document.querySelectorAll(".v4-story-rail button")]
                .map((button) => (button.classList.contains("is-active") ? 1 : 0)),
              scrollY,
              documentReadyState: document.readyState,
            }),
            'story chapter 3 ("여름 여행") settled after rail click',
          );
          assert.ok(await opened.page.getByRole("heading", { name: "여름 여행", exact: true }).count());
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
