import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CODEX14_ROTATING_INDEX_SOURCE,
  codex14AdjacentMomentId,
  codex14DeckSlots,
  codex14MediaKind,
  codex14ResolveIndex,
  codex14YouTubeEmbedUrl,
  codex14WrapIndex,
} from "../lib/codex14/rotating-memory-index.ts";

const routeSource = readFileSync("app/v4/trees/[id]/archive/rotating-index/RotatingMemoryIndexArchive.tsx", "utf8");
const cssSource = readFileSync("app/v4/trees/[id]/archive/rotating-index/rotating-memory-index.module.css", "utf8");
const provenance = JSON.parse(readFileSync("design-intake/codex14-rotating-memory-index-archive-native.json", "utf8"));
const moments = [
  { id: "m1" },
  { id: "m2" },
  { id: "m3" },
  { id: "m4" },
  { id: "m5" },
];

test("Codex14 exact Drive source fingerprint and external fixture dependency stay pinned", () => {
  assert.equal(CODEX14_ROTATING_INDEX_SOURCE.driveFileId, "1YKq2WiINn5MWhll8sSBq1azHMwaocIIP");
  assert.equal(CODEX14_ROTATING_INDEX_SOURCE.bytes, 19631);
  assert.equal(CODEX14_ROTATING_INDEX_SOURCE.sha256, "0cef6497103d05a853c4849d58967bed66e3af85db5e345a69724b2d26719361");
  assert.equal(CODEX14_ROTATING_INDEX_SOURCE.sourceFilmCount, 89);
  assert.equal(provenance.source.fixtureMedia.productPolicy, "SOURCE_REFERENCE_ONLY_DO_NOT_PROMOTE_89_FILM_FIXTURE_TO_CANONICAL_DATA");
});

test("rotating index selection and deck positions are bounded presentation math", () => {
  assert.equal(codex14WrapIndex(5, -1), 4);
  assert.equal(codex14WrapIndex(5, 5), 0);
  assert.equal(codex14ResolveIndex(moments, "m3"), 2);
  assert.equal(codex14AdjacentMomentId(moments, "m1", -1), "m5");
  assert.equal(codex14AdjacentMomentId(moments, "m5", 1), "m1");
  assert.deepEqual(codex14DeckSlots(5, 2, 5).map((slot) => slot.momentIndex), [0, 1, 2, 3, 4]);
  assert.deepEqual(codex14DeckSlots(3, 0, 7).map((slot) => slot.momentIndex), [2, 0, 1]);
});

test("selected Moment inspector uses canonical media fields without archive persistence", () => {
  assert.equal(codex14MediaKind("youtube", "https://youtu.be/dQw4w9WgXcQ"), "video");
  assert.equal(codex14MediaKind("image", "https://example.test/a.webp"), "image");
  assert.equal(codex14MediaKind("music", "https://example.test/a.mp3"), "audio");
  assert.equal(codex14YouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
  assert.match(routeSource, /useTreeMoments\(treeId\)/);
  assert.match(routeSource, /albumMoments/);
  assert.match(routeSource, /selectMoment\(/);
  assert.doesNotMatch(routeSource, /apiFetch\(|fetch\(/);
  assert.doesNotMatch(routeSource, /localStorage|sessionStorage|indexedDB/i);
});

test("native archive keeps high-visual grammar while hardening mobile/input/accessibility", () => {
  assert.match(routeSource, /data-codex14-deck/);
  assert.match(routeSource, /onPointerDown/);
  assert.match(routeSource, /onPointerCancel/);
  assert.match(routeSource, /onWheel/);
  assert.match(routeSource, /ArrowLeft/);
  assert.match(routeSource, /ArrowRight/);
  assert.match(routeSource, /event\.key\.toLowerCase\(\) === "i"/);
  assert.match(routeSource, /event\.code === "Space"/);
  assert.match(routeSource, /showModal\(\)/);
  assert.match(routeSource, /prefers-reduced-motion: reduce/);
  assert.match(cssSource, /perspective:\s*1650px/);
  assert.match(cssSource, /translate3d\(/);
  assert.match(cssSource, /@media \(max-width: 760px\)/);
  assert.match(cssSource, /@media \(max-width: 360px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /:focus-visible/);
  assert.doesNotMatch(cssSource, /min-width:\s*(980|1040)px/);
});

test("Issue 494 stays file-disjoint and backend-free by declared contract", () => {
  assert.equal(provenance.productDisposition, "ADOPT_AS_ARCHIVE_NATIVE");
  assert.equal(provenance.native.route, "/v4/trees/[id]/archive/rotating-index");
  assert.deepEqual(provenance.backend, {
    newArchiveEntity: false,
    newTable: false,
    newSchema: false,
    newApi: false,
  });
  assert.equal(provenance.centralSharedFilesModified, false);
  assert.equal(provenance.centralRegistryHandoffRequired, true);
});
