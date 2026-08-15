import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const BASE = process.env.V4_BASE_URL || "http://localhost:3000";
const TREE_ID = "why-next-canonical-tree";

const TREE_FIXTURE = {
  id: TREE_ID,
  title: "WHY NEXT 정렬 나무",
  visibility: "public",
  ownerId: "owner-1",
};

// Ordered so chapter 0 is the root (no parentId). The later chapters exercise
// the two connected branches: explicit reason vs. generic fallback.
const MOMENTS_FIXTURE = [
  { id: "m-0", treeId: TREE_ID, title: "첫 순간", memo: "시작", parentId: null, connectionReason: null, emotionTags: ["기쁨"] },
  { id: "m-1", treeId: TREE_ID, title: "둘째 순간", memo: "이어짐", parentId: "m-0", connectionReason: "같은 무대 위에서 이어진 순간", emotionTags: ["설렘"] },
  { id: "m-2", treeId: TREE_ID, title: "셋째 순간", memo: "연결만", parentId: "m-0", connectionReason: null, emotionTags: ["평온"] },
];

const GENERIC_RELATION = "이전 순간과 이어지는 관계";

function relationReasonText(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-why-next] .v4-story-relation-reason");
    return el ? el.textContent.trim() : null;
  });
}

async function openStory(browser, moments) {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();

  page.on("pageerror", (err) => { throw new Error(`pageerror: ${err.message}`); });

  await page.route(`**/api/trees/${TREE_ID}`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TREE_FIXTURE) }),
  );
  await page.route("**/api/community/memories**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(moments) }),
  );

  await page.goto(`${BASE}/trees/${TREE_ID}/story`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector(".v4-story-copy", { timeout: 10000 });
  return { context, page };
}

test("WHY NEXT — root moment without parentId shows no relation", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openStory(browser, MOMENTS_FIXTURE);
    // Chapter 0 (default) renders the root moment; no parentId -> no WHY NEXT.
    const present = await page.evaluate(() => Boolean(document.querySelector("[data-why-next]")));
    assert.equal(present, false, "root moment must not render a WHY NEXT relation");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("WHY NEXT — connected moment with connectionReason shows stored value", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openStory(browser, MOMENTS_FIXTURE);
    await page.locator(".v4-story-rail button").nth(1).click();
    await page.waitForFunction(
      (text) => {
        const el = document.querySelector("[data-why-next] .v4-story-relation-reason");
        return el && el.textContent.trim() === text;
      },
      MOMENTS_FIXTURE[1].connectionReason,
      { timeout: 5000 },
    );
    const reason = await relationReasonText(page);
    assert.equal(reason, MOMENTS_FIXTURE[1].connectionReason, "must show the stored connectionReason");
    await context.close();
  } finally {
    await browser.close();
  }
});

test("WHY NEXT — connected moment without reason falls back to generic", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await openStory(browser, MOMENTS_FIXTURE);
    await page.locator(".v4-story-rail button").nth(2).click();
    await page.waitForFunction(
      (text) => {
        const el = document.querySelector("[data-why-next] .v4-story-relation-reason");
        return el && el.textContent.trim() === text;
      },
      GENERIC_RELATION,
      { timeout: 5000 },
    );
    const reason = await relationReasonText(page);
    assert.equal(reason, GENERIC_RELATION, "must fall back to the generic canonical relation");
    await context.close();
  } finally {
    await browser.close();
  }
});
