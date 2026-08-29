import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SOURCE_TRACK_58_STAGING, source58BoardSlot } from "../lib/source-track-58-living-memory-pinboard.ts";

const pagePath = "app/design-lab/source-tracks/58/v1-2-native/page.tsx";
const componentPath = "components/source-track-58/SourceTrack58LivingMemoryBoard.tsx";
const mobileCssPath = "app/design-lab/source-tracks/58/v1-2-native/source58-mobile-spatial-p0.module.css";

const [pageSource, componentSource, mobileCss] = await Promise.all([
  readFile(pagePath, "utf8"),
  readFile(componentPath, "utf8"),
  readFile(mobileCssPath, "utf8"),
]);

test("Source58 mobile P0 repair stays inside the authorized source-track namespace", () => {
  assert.equal(SOURCE_TRACK_58_STAGING.route, "/design-lab/source-tracks/58/v1-2-native");
  assert.equal(SOURCE_TRACK_58_STAGING.revision, "V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE");
  assert.equal(SOURCE_TRACK_58_STAGING.bytes, 532697);
  assert.equal(
    SOURCE_TRACK_58_STAGING.sha256,
    "9fd5b6e7b69bc14347cf3eb1905e7a118ad9bd7b62faa9d81f47b4389a7d3cb5",
  );
  assert.match(pageSource, /source58-mobile-spatial-p0\.module\.css/);
  assert.doesNotMatch(pageSource, /design-lab\/lineages\/58/);
  assert.doesNotMatch(componentSource, /design-lab\/lineages\/58/);
});

test("mobile board remains an absolute spatial canvas instead of a vertical list", () => {
  assert.match(componentSource, /data-mobile-spatial-board="true"/);
  assert.match(componentSource, /data-source58-card="true"/);
  assert.match(componentSource, /"--source58-x": `\$\{slot\.x\}%`/);
  assert.match(componentSource, /"--source58-y": `\$\{slot\.y\}%`/);
  assert.match(componentSource, /"--card-rotate": `\$\{slot\.rotate\}deg`/);
  assert.match(mobileCss, /@media \(max-width: 760px\)/);
  assert.match(mobileCss, /\[data-testid="source58-board"\][\s\S]*display:\s*block\s*!important/);
  assert.match(mobileCss, /button\[data-source58-card\][\s\S]*position:\s*absolute\s*!important/);
  assert.match(mobileCss, /left:\s*clamp\(/);
  assert.match(mobileCss, /top:\s*clamp\(/);
  assert.doesNotMatch(mobileCss, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(mobileCss, /thread[^\n]*path[^\n]*\{[^}]*display:\s*none/s);
});

test("mobile Living Thread keeps the accepted curved layered renderer visible across the board", () => {
  assert.match(componentSource, /data-layer="glow"/);
  assert.match(componentSource, /data-layer="color"/);
  assert.match(componentSource, /data-layer="core"/);
  assert.match(componentSource, /threadPath\(connection\.from, connection\.to\)/);
  assert.match(componentSource, /data-active=\{String\(activePath\)\}/);
  assert.match(mobileCss, /svg\[aria-label="Canonical Connection living thread"\][\s\S]*inset:\s*0\s*!important/);
  assert.match(mobileCss, /svg\[aria-label="Canonical Connection living thread"\] path[\s\S]*display:\s*block\s*!important/);
});

test("mobile selected Moment uses a foreground detail sheet while retaining board context", () => {
  assert.match(componentSource, /mobileInspectorOpen/);
  assert.match(componentSource, /data-mobile-open=\{String\(mobileInspectorOpen\)\}/);
  assert.match(componentSource, /data-mobile-inspector-close/);
  assert.match(componentSource, /data-source58-inspector-media/);
  assert.match(componentSource, /data-source58-moment-copy/);
  assert.match(componentSource, /data-source58-connection-panel/);
  assert.match(componentSource, /WHY NEXT/);
  assert.match(mobileCss, /aside\[aria-label="Selected Moment inspector"\][\s\S]*position:\s*fixed\s*!important/);
  assert.match(mobileCss, /bottom:\s*14px\s*!important/);
  assert.match(mobileCss, /max-height:\s*min\(42dvh, 300px\)/);
  assert.match(mobileCss, /\[data-mobile-open="true"\][\s\S]*pointer-events:\s*auto/);
});

test("Cinema exit retains the active Moment and returns to the mobile detail-over-board state", () => {
  assert.match(componentSource, /const exitCinema = \(\) => \{/);
  assert.match(componentSource, /if \(active\) selectMoment\(active\.id\)/);
  assert.match(componentSource, /setCinemaOpen\(false\);\n\s*setMobileInspectorOpen\(true\)/);
  assert.match(componentSource, /EXIT TO BOARD/);
  assert.match(componentSource, /data-cinema-board-context/);
});

test("mobile repair stays presentation-only and preserves deterministic large-tree projection", () => {
  assert.match(componentSource, /useTreeMoments\(treeId\)/);
  assert.match(componentSource, /moment\.parentId/);
  assert.match(componentSource, /moment\.connectionReason/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(componentSource, /fetch\(\s*["'`]\/api\//);
  assert.doesNotMatch(mobileCss, /localStorage|sessionStorage|indexedDB|\/api\//i);

  const firstForty = Array.from({ length: 40 }, (_, index) => source58BoardSlot(index));
  assert.equal(new Set(firstForty.map((slot) => `${slot.x}:${slot.y}`)).size, 40);
  assert.deepEqual(source58BoardSlot(0), { x: 11, y: 14, rotate: -3, style: "polaroid" });
  assert.equal(source58BoardSlot(9).style, "compact");
});
