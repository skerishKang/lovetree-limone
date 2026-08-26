import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOURCE_58_BOARD_THEMES,
  SOURCE_TRACK_58_STAGING,
  source58BoardSlot,
  source58SafeExternalUrl,
  source58YouTubeEmbedUrl,
} from "../lib/source-track-58-living-memory-pinboard.ts";

const pagePath = "app/design-lab/source-tracks/58/v1-2-native/page.tsx";
const componentPath = "components/source-track-58/SourceTrack58LivingMemoryBoard.tsx";
const cssPath = "components/source-track-58/source-track-58-living-memory-board.module.css";
const repairCssPath = "app/design-lab/source-tracks/58/v1-2-native/source58-visual-repair.module.css";

const [pageSource, componentSource, cssSource, repairCssSource] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(componentPath, "utf8"),
  readFile(cssPath, "utf8"),
  readFile(repairCssPath, "utf8"),
]);

test("Source58 keeps the authorized collision-safe staging identity", () => {
  assert.equal(SOURCE_TRACK_58_STAGING.stableId, "source-track-58-living-memory-pinboard");
  assert.equal(SOURCE_TRACK_58_STAGING.route, "/design-lab/source-tracks/58/v1-2-native");
  assert.equal(SOURCE_TRACK_58_STAGING.revision, "V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE");
  assert.equal(SOURCE_TRACK_58_STAGING.bytes, 532697);
  assert.equal(
    SOURCE_TRACK_58_STAGING.sha256,
    "9fd5b6e7b69bc14347cf3eb1905e7a118ad9bd7b62faa9d81f47b4389a7d3cb5",
  );
  assert.doesNotMatch(pageSource, /design-lab\/lineages\/58/);
  assert.doesNotMatch(componentSource, /design-lab\/lineages\/58/);
  assert.doesNotMatch(pageSource, /VideoFigure Atelier/);
  assert.doesNotMatch(componentSource, /VideoFigure Atelier/);
});

test("native board consumes canonical Moment, Connection and media contracts", () => {
  assert.match(componentSource, /useTreeMoments\(treeId\)/);
  assert.match(componentSource, /canonicalMoments/);
  assert.match(componentSource, /albumMoments/);
  assert.match(componentSource, /moment\.parentId/);
  assert.match(componentSource, /moment\.connectionReason/);
  assert.match(componentSource, /moment\.album\.thumbnail/);
  assert.match(componentSource, /moment\.sourceType/);
  assert.match(componentSource, /moment\.sourceUrl/);
  assert.match(componentSource, /updateMoment\(selected\.id/);
  assert.doesNotMatch(componentSource, /fetch\(\s*["'`]\/api\//);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage|indexedDB/i);
  assert.match(componentSource, /VIEW_DERIVED/);
});

test("source fixture data is not promoted into the runtime board", () => {
  assert.match(componentSource, /if \(!treeId\)/);
  assert.match(componentSource, /샘플 Moment를 만들지 않습니다/);
  assert.match(componentSource, /Source58 demo card를 대신 만들지 않습니다/);
  assert.doesNotMatch(componentSource, /const\s+(cards|moments)\s*=\s*\[/);
  assert.doesNotMatch(componentSource, /mockMoment|demoMoment|fixtureMoment/i);
});

test("Source58 restores the authoritative six material themes", () => {
  assert.deepEqual(
    SOURCE_58_BOARD_THEMES.map((theme) => theme.id),
    ["pearl", "cork", "letter", "blossom", "night", "mint"],
  );
  assert.deepEqual(
    SOURCE_58_BOARD_THEMES.map((theme) => theme.label),
    ["Pearl", "Warm Cork", "Letter", "Blossom", "Night", "Mint"],
  );
  for (const theme of ["pearl", "cork", "letter", "blossom", "night", "mint"]) {
    assert.match(repairCssSource, new RegExp(`data-theme=\\"${theme}\\"`));
  }
  assert.match(repairCssSource, /repeating-linear-gradient/);
  assert.match(repairCssSource, /data-theme=\\"night\\"/);
  assert.match(repairCssSource, /data-theme=\\"mint\\"/);
});

test("Source58 spatial projection scales beyond nine Moments without modulo-slot collapse", () => {
  assert.deepEqual(source58BoardSlot(0), { x: 11, y: 14, rotate: -3, style: "polaroid" });
  assert.notDeepEqual(source58BoardSlot(0), source58BoardSlot(1));
  const firstForty = Array.from({ length: 40 }, (_, index) => source58BoardSlot(index));
  assert.equal(
    new Set(firstForty.map((slot) => `${slot.x}:${slot.y}`)).size,
    40,
    "first 40 view-derived Moment positions must be spatially unique",
  );
  assert.equal(source58BoardSlot(9).style, "compact");
  assert.match(repairCssSource, /:has\(> button\[data-card-style=\\"compact\\"\]\)/);
  assert.match(repairCssSource, /min-height:\s*980px/);
});

test("Living Thread uses layered glow/color/core and selected-path emphasis", () => {
  assert.match(componentSource, /Canonical Connection living thread/);
  assert.match(componentSource, /data-layer=\"glow\"/);
  assert.match(componentSource, /data-layer=\"color\"/);
  assert.match(componentSource, /data-layer=\"core\"/);
  assert.match(componentSource, /data-active=\{String\(activePath\)\}/);
  assert.match(repairCssSource, /g\[data-active=\\"true\\"\]/);
  assert.match(componentSource, /WHY NEXT/);
  assert.match(componentSource, /NEXT MOMENT/);
  assert.match(componentSource, /children\.length > 1/);
});

test("Cinema Replay preserves controls while restoring in-board spatial context", () => {
  assert.match(componentSource, /Cinema Replay — Moments/);
  assert.match(componentSource, /PAUSE/);
  assert.match(componentSource, /RESUME/);
  assert.match(componentSource, /Cinema Moment scrubber/);
  assert.match(componentSource, /EXIT TO BOARD/);
  assert.match(componentSource, /data-cinema-board-context/);
  assert.match(componentSource, /data-cinema-memory/);
  assert.match(componentSource, /data-cinema-spotlight/);
  assert.match(componentSource, /YouTube에서 재생/);
  assert.match(componentSource, /Embed playback은 실행 환경 정책에 따라 차단될 수 있습니다/);

  assert.equal(
    source58YouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12", 12),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&start=12",
  );
  assert.equal(source58YouTubeEmbedUrl("javascript:alert(1)"), null);
  assert.equal(source58SafeExternalUrl("https://example.com/media"), "https://example.com/media");
  assert.equal(source58SafeExternalUrl("data:text/html,unsafe"), null);
});

test("keyboard focus, touch-safe native controls and reduced-motion policy are present", () => {
  assert.match(componentSource, /ArrowRight/);
  assert.match(componentSource, /ArrowLeft/);
  assert.match(componentSource, /focus\(\)/);
  assert.match(componentSource, /aria-pressed/);
  assert.match(componentSource, /prefers-reduced-motion: reduce/);
  assert.match(componentSource, /data-reduced-motion/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /@media \(max-width: 760px\)/);
  assert.match(cssSource, /@media \(max-width: 360px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(repairCssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /overflow-x: clip/);
});
