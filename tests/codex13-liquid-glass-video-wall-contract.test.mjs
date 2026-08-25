import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT,
  CODEX13_DESKTOP_CELL_COUNT,
  CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT,
  CODEX13_MOBILE_CELL_COUNT,
  CODEX13_SOURCE_BYTES,
  CODEX13_SOURCE_SHA256,
  codex13ActiveDirectVideoSlots,
  codex13BuildWallCells,
  codex13IsDirectVideoUrl,
  codex13MediaKind,
  codex13PositionCells,
  codex13VisualMoments,
  codex13Wrap,
  codex13YoutubeVideoId,
  codex13YouTubeEmbedUrl,
} from "../lib/source-codex-13/liquid-glass-video-wall.ts";

const routeSource = readFileSync("app/v4/trees/[id]/archive/video-wall/Codex13LiquidGlassVideoWall.tsx", "utf8");
const cssSource = readFileSync("app/v4/trees/[id]/archive/video-wall/codex13-liquid-glass-video-wall.module.css", "utf8");
const helperSource = readFileSync("lib/source-codex-13/liquid-glass-video-wall.ts", "utf8");

const moment = (id, sourceType, sourceUrl, thumbnail = "") => ({
  id,
  treeId: "tree",
  title: `Moment ${id}`,
  memo: "",
  thumbnail,
  sourceType,
  sourceUrl,
  emotionTags: [],
  timestamp: "",
  discoveryDate: "",
  sortOrder: Number(id.replace(/\D/g, "")) || 0,
  createdAt: null,
});

test("Codex13 exact Drive executable fingerprint remains pinned as provenance only", () => {
  assert.equal(CODEX13_SOURCE_BYTES, 18053);
  assert.equal(CODEX13_SOURCE_SHA256, "91fb117b7e764fb42e4817d6fa60eb960dea8032977c804abdd9084e5a626fd7");
  assert.doesNotMatch(routeSource, /videos-v3|posters-v3|리빙미디어스피어|\.\.\/12_/);
  assert.doesNotMatch(helperSource, /videos-v3|posters-v3|리빙미디어스피어|\.\.\/12_/);
});

test("wall is a bounded presentation window over canonical AlbumMomentView data", () => {
  const moments = [
    moment("m1", "youtube", "https://youtu.be/dQw4w9WgXcQ", "https://example.test/one.jpg"),
    moment("m2", "image", "https://example.test/two.webp"),
    moment("m3", "text", ""),
  ];
  assert.deepEqual(codex13VisualMoments(moments).map((item) => item.id), ["m1", "m2"]);
  const desktop = codex13BuildWallCells(moments, false);
  const mobile = codex13BuildWallCells(moments, true);
  assert.equal(desktop.length, CODEX13_DESKTOP_CELL_COUNT);
  assert.equal(mobile.length, CODEX13_MOBILE_CELL_COUNT);
  assert.ok(desktop.every((cell) => cell.moment === moments[0] || cell.moment === moments[1]));
  assert.ok(mobile.every((cell) => cell.row >= 0 && cell.row < 5 && cell.column >= 0 && cell.column < 5));
});

test("media adapter uses sourceType/sourceUrl and never upgrades demo video truth", () => {
  assert.equal(codex13YoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(codex13YouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  assert.equal(codex13IsDirectVideoUrl("https://cdn.example.test/memory.mp4?token=1"), true);
  assert.equal(codex13MediaKind("youtube", "https://youtu.be/dQw4w9WgXcQ", ""), "youtube");
  assert.equal(codex13MediaKind("video", "https://cdn.example.test/memory.webm", ""), "direct-video");
  assert.equal(codex13MediaKind("video", "https://example.test/watch/abc", "poster.jpg"), "visual-link");
});

test("spatial wrap remains infinite-looking without unbounded DOM growth", () => {
  assert.equal(codex13Wrap(0, 100), 0);
  assert.equal(codex13Wrap(60, 100), -40);
  assert.equal(codex13Wrap(-60, 100), 40);
  const cells = codex13BuildWallCells([moment("m1", "image", "https://example.test/one.jpg")], false);
  const before = codex13PositionCells(cells, 0, 0, false);
  const after = codex13PositionCells(cells, 2142, 1070, false);
  assert.equal(before.length, CODEX13_DESKTOP_CELL_COUNT);
  assert.equal(after.length, CODEX13_DESKTOP_CELL_COUNT);
  assert.ok(after.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y) && Number.isFinite(cell.z)));
});

test("direct-video decoding is strictly bounded and suspended behind the inspector", () => {
  const sources = Array.from({ length: 35 }, (_, index) => moment(`m${index + 1}`, "video", `https://cdn.example.test/${index + 1}.mp4`));
  const desktop = codex13PositionCells(codex13BuildWallCells(sources, false), 0, 0, false);
  const mobile = codex13PositionCells(codex13BuildWallCells(sources, true), 0, 0, true);
  const desktopActive = codex13ActiveDirectVideoSlots(desktop, false, false);
  const mobileActive = codex13ActiveDirectVideoSlots(mobile, true, false);
  assert.ok(desktopActive.length > 0 && desktopActive.length <= CODEX13_DESKTOP_ACTIVE_VIDEO_LIMIT);
  assert.ok(mobileActive.length > 0 && mobileActive.length <= CODEX13_MOBILE_ACTIVE_VIDEO_LIMIT);
  assert.deepEqual(codex13ActiveDirectVideoSlots(desktop, false, true), []);
  assert.deepEqual(codex13ActiveDirectVideoSlots(mobile, true, true), []);
});

test("native route preserves canonical, input, dialog and reduced-motion boundaries", () => {
  assert.match(routeSource, /useTreeMoments\(treeId\)/);
  assert.match(routeSource, /albumMoments/);
  assert.doesNotMatch(routeSource, /apiFetch\(|fetch\(/);
  assert.match(routeSource, /ArrowLeft/);
  assert.match(routeSource, /ArrowRight/);
  assert.match(routeSource, /ArrowUp/);
  assert.match(routeSource, /ArrowDown/);
  assert.match(routeSource, /event\.key === "Enter"/);
  assert.match(routeSource, /onPointerCancel/);
  assert.match(routeSource, /onWheel/);
  assert.match(routeSource, /<dialog/);
  assert.match(routeSource, /showModal\(\)/);
  assert.match(routeSource, /prefers-reduced-motion: reduce/);
  assert.match(routeSource, /requestAnimationFrame/);
  assert.match(routeSource, /elapsed >= 32/);
  assert.match(cssSource, /touch-action:\s*none/);
  assert.match(cssSource, /@media \(max-width: 760px\)/);
  assert.match(cssSource, /@media \(max-width: 360px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(cssSource, /min-width:\s*(980|1040|1200)px/);
});
