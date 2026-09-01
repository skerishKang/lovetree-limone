// Source60 canvas resize lifecycle regression QA.
//
// Regression this locks down:
//   The explore canvas sized itself in a useEffect with an empty dependency list.
//   The stage/canvas only mount once `loading === false && !error`, so on the
//   only mount the effect ever saw, both refs were null, it returned early, and
//   it never re-ran. The backing buffer stayed at the 300x150 HTML default while
//   the draw loop projected the scene into the 800x560 viewportRef default, so
//   every cluster halo, node and bridge line was clipped outside the buffer.
//   Result: a blank 3D surface with zero console/page errors.
//
// Gates:
//   - backing buffer is sized to the CSS box (never the 300x150 default)
//   - the surface carries rendered content (distinctColors / nonBgSamples floors)
//   - all four clusters and the bridge stroke are visibly present
//   - ResizeObserver is actually registered (buffer follows a viewport change)
//
// Fixture is Playwright API interception only. No DB/API mutation.

import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  readCanvasRenderMetrics,
  assertCanvasSized,
  assertCanvasNonBlank,
  readClusterPaletteHits,
} from "./lib/canvas-render-metrics.mjs";

const baseUrl = process.env.SOURCE60_QA_URL ?? "http://127.0.0.1:3000";
const treeId = "five-source-mvp-qa-tree";
const pixel =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='400'%3E%3Crect width='640' height='400' fill='%23d9cbd3'/%3E%3C/svg%3E";

const qaTree = {
  id: treeId,
  ownerId: "qa-owner-not-authenticated",
  title: "Source60 Canonical QA Tree",
  visibility: "private",
};

const moment = (id, parentId, sourceType, title, tags, day) => ({
  id,
  treeId,
  parentId,
  connectionReason: parentId ? `${title} 로 이어진 연결` : null,
  title,
  memo: `${title} — representative canonical Moment for Source60`,
  sourceType,
  sourceUrl: `https://example.test/${id}`,
  thumbnail: pixel,
  discoveryDate: `2026-01-${String(day).padStart(2, "0")}`,
  timestamp: `2026-01-${String(day).padStart(2, "0")}`,
  createdAt: `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  sortOrder: day,
  emotionTags: tags,
});

// Representative canonical set: 16 Moments spanning all four Product clusters,
// with parent/child chains, branch points and five cross-cluster bridge edges.
const qaMoments = [
  moment("m-root", null, "moment", "처음의 시작", ["warm"], 1),

  // visual: image/photo/video/youtube/travel
  moment("m-v1", "m-root", "youtube", "첫 영상", ["warm", "bright"], 2),
  moment("m-v2", "m-v1", "video", "두 번째 장면", ["bright"], 3),
  moment("m-v3", "m-v2", "image", "빛이 머문 사진", ["calm"], 4),
  moment("m-v4", "m-v2", "photo", "여행의 한 컷", ["joy"], 5),
  moment("m-v5", "m-v1", "travel", "떠난 길의 기록", ["wander"], 6),

  // stories: song/audio/music/book
  moment("m-s1", "m-v1", "song", "그때 들은 노래", ["soft", "echo"], 7),
  moment("m-s2", "m-s1", "audio", "남겨진 목소리", ["echo"], 8),
  moment("m-s3", "m-root", "music", "함께한 선율", ["warm"], 9),
  moment("m-s4", "m-s2", "book", "읽어주던 이야기", ["tender"], 10),
  moment("m-s5", "m-s3", "song", "다시 만난 음악", ["nostalgia"], 11),

  // notes: everything else
  moment("m-n1", "m-s1", "memo", "짧은 메모", ["quiet"], 12),
  moment("m-n2", "m-n1", "link", "남겨둔 링크", ["curious"], 13),
  moment("m-n3", "m-root", "text", "오래 남은 문장", ["reflective"], 14),
  moment("m-n4", "m-n2", "place", "머물렀던 장소", ["calm"], 15),
  moment("m-n5", "m-n3", "note", "마지막 기록", ["grateful"], 16),
];

// Bridge edges (parent.cluster !== child.cluster):
//   m-root(roots) -> m-v1(visual), m-s3(stories), m-n3(notes)
//   m-v1(visual)  -> m-s1(stories)
//   m-s1(stories) -> m-n1(notes)

const browser = await chromium.launch({ headless: true });
const report = {};

async function installFixtures(page) {
  await page.route(`**/api/trees/${treeId}/memories*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaMoments) });
  });
  await page.route(`**/api/trees/${treeId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(qaTree) });
  });
}

async function auditViewport({ name, width, height }) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await installFixtures(page);

  await page.goto(`${baseUrl}/trees/${treeId}/explore`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('[data-mvp-source="60"]').first().waitFor({ state: "visible" });
  // Let the requestAnimationFrame draw loop paint several frames.
  await page.waitForTimeout(1200);

  const metrics = await readCanvasRenderMetrics(page);
  assert.ok(metrics, `${name}: Source60 canvas missing`);
  assertCanvasSized(metrics, `${name}-sized`);
  assertCanvasNonBlank(metrics, `${name}-nonblank`, { minDistinctColors: 20, minNonBgSamples: 500 });

  const palette = await readClusterPaletteHits(page);
  assert.ok(palette, `${name}: Source60 canvas palette unreadable`);
  for (const cluster of ["roots", "visual", "stories", "notes"]) {
    assert.ok(
      palette[cluster] > 0,
      `${name}: cluster "${cluster}" is not visible on the 3D surface (0 palette samples)`,
    );
  }
  assert.ok(
    palette.bridge > 0,
    `${name}: bridge stroke colour #c9b6ff absent — bridge relationships are not visible`,
  );

  const clusterButtons = await page.locator('aside[aria-label="Moment cluster list"] button').count();
  assert.equal(clusterButtons, 16, `${name}: representative fixture did not load 16 Moments`);

  // ResizeObserver must be registered: the buffer has to follow a viewport change.
  const beforeResize = metrics.nativeWidth;
  await page.setViewportSize({ width: Math.max(320, width - 240), height });
  await page.waitForTimeout(900);
  const afterResize = await readCanvasRenderMetrics(page);
  assert.ok(afterResize, `${name}: Source60 canvas missing after resize`);
  assert.notEqual(
    afterResize.nativeWidth,
    beforeResize,
    `${name}: canvas backing buffer did not follow a viewport change — ResizeObserver is not registered`,
  );
  assertCanvasSized(afterResize, `${name}-after-resize`);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(600);

  assert.deepEqual(consoleErrors, [], `${name}: console errors: ${consoleErrors.join(" | ")}`);
  assert.deepEqual(pageErrors, [], `${name}: page errors: ${pageErrors.join(" | ")}`);

  await context.close();

  return { metrics, palette, clusterButtons, resizeObserverActive: true };
}

try {
  for (const vp of [
    { name: "desktop-1440x900", width: 1440, height: 900 },
    { name: "phone-430x932", width: 430, height: 932 },
    { name: "phone-390x844", width: 390, height: 844 },
  ]) {
    report[vp.name] = await auditViewport(vp);
  }
  console.log("SOURCE60_CANVAS_RESIZE_REGRESSION_QA_PASS");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
