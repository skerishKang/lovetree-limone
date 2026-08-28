import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  track35AdjacentMomentId,
  track35IndexFromScrubValue,
  track35MediaKind,
  track35ProgressPercent,
  track35ResolveIndex,
  track35YoutubeVideoId,
  track35YouTubeEmbedUrl,
} from "../lib/source-track-35/lp-archive.ts";

const routeSource = readFileSync("app/v4/trees/[id]/archive/lp/Track35LpArchive.tsx", "utf8");
const cssSource = readFileSync("app/v4/trees/[id]/archive/lp/track35-lp-archive.module.css", "utf8");
const snapshot = readFileSync("reference/source-tracks-snapshot/35_LP플레이어/01_LP플레이어_영상기억.html");
const moments = [
  { id: "m1", treeId: "t", title: "one", memo: "", thumbnail: "", sourceType: "youtube", sourceUrl: "https://youtu.be/dQw4w9WgXcQ", emotionTags: [], timestamp: "", discoveryDate: "", sortOrder: 0, createdAt: null },
  { id: "m2", treeId: "t", title: "two", memo: "", thumbnail: "", sourceType: "image", sourceUrl: "https://example.test/a.jpg", emotionTags: [], timestamp: "", discoveryDate: "", sortOrder: 1, createdAt: null },
  { id: "m3", treeId: "t", title: "three", memo: "", thumbnail: "", sourceType: "music", sourceUrl: "https://example.test/a.mp3", emotionTags: [], timestamp: "", discoveryDate: "", sortOrder: 2, createdAt: null },
];

test("Track35 snapshot remains the exact Drive-authoritative source", () => {
  assert.equal(snapshot.length, 43297);
  assert.equal(createHash("sha256").update(snapshot).digest("hex"), "87cd2740c096b7a3d9fc8df4cc598f41fc0871a1fa5c761bda74c241b5260b52");
});

test("LP archive transport is presentation state over AlbumMomentView identity", () => {
  assert.equal(track35ResolveIndex(moments, null), 0);
  assert.equal(track35ResolveIndex(moments, "m2"), 1);
  assert.equal(track35AdjacentMomentId(moments, "m1", -1), "m3");
  assert.equal(track35AdjacentMomentId(moments, "m3", 1), "m1");
  assert.equal(track35IndexFromScrubValue(3, 1.7), 2);
  assert.equal(track35IndexFromScrubValue(3, -5), 0);
  assert.equal(track35ProgressPercent(3, 1), 50);
});

test("media adapter reuses existing sourceType/sourceUrl without LP-specific persistence", () => {
  assert.equal(track35YoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(track35YouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  assert.equal(track35MediaKind("youtube", moments[0].sourceUrl), "video");
  assert.equal(track35MediaKind("image", moments[1].sourceUrl), "image");
  assert.equal(track35MediaKind("music", moments[2].sourceUrl), "audio");
});

test("native route binds canonical Moment capability and required input/accessibility contracts", () => {
  assert.match(routeSource, /useTreeMoments\(treeId\)/);
  assert.match(routeSource, /albumMoments/);
  assert.doesNotMatch(routeSource, /apiFetch\(|fetch\(/);
  assert.match(routeSource, /type="range"/);
  assert.match(routeSource, /ArrowLeft/);
  assert.match(routeSource, /ArrowRight/);
  assert.match(routeSource, /event\.code === "Space"/);
  assert.match(routeSource, /<dialog/);
  assert.match(routeSource, /showModal\(\)/);
  assert.match(routeSource, /requestAnimationFrame/);
  assert.match(routeSource, /prefers-reduced-motion: reduce/);
  assert.match(cssSource, /@media \(max-width: 760px\)/);
  assert.match(cssSource, /@media \(max-width: 360px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(cssSource, /min-width:\s*(980|1040)px/);
});
