import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOMENT_ORBIT_AUTOPLAY_MS,
  MOMENT_ORBIT_CANDIDATE_MOMENTS,
  MOMENT_ORBIT_SOURCE_PROVENANCE,
  canonicalSnap,
  nearestEquivalentMomentPosition,
  projectMomentOnOrbit,
  stepMomentIndex,
  wrapMomentIndex,
} from "../lib/moment-orbit-carousel-capability.ts";

const componentPath = "app/design-lab/capabilities/moment-orbit-carousel/MomentOrbitCarouselCandidate.tsx";
const pagePath = "app/design-lab/capabilities/moment-orbit-carousel/page.tsx";
const cssPath = "app/styles/moment-orbit-carousel-candidate.css";
const component = fs.readFileSync(componentPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

test("Moment Orbit Carousel candidate — provenance and adoption boundary stay pinned", () => {
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.classification, "CAPABILITY");
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.recommendation, "PARTIAL IMPLEMENT");
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.productAdopted, false);
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.benchmarkReferenceRuntimeAllowed, false);
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.sourceFolderId, "1qyrwsNyxi5f4uiRQ8rl0gyzhNRTwAnvv");
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.sourceHtmlBytes, 24146);
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.sourceHtmlSha256, "5268d78efc757854a6bc123396f3e4cfa03e70a2b73f6a7d19b3f1ce9564d7a1");
  assert.equal(MOMENT_ORBIT_SOURCE_PROVENANCE.canonicalComparisonRoute, "/v4/subjects/demo/orbit");
  assert.match(page, /MomentOrbitCarouselCandidate/);
  assert.doesNotMatch(page, /V4LiquidOrbitGallery|V4ArchiveExperiences/);
});

test("Moment Orbit Carousel candidate — ten mixed-media Moments remain neutral capability data", () => {
  assert.equal(MOMENT_ORBIT_CANDIDATE_MOMENTS.length, 10);
  assert.equal(MOMENT_ORBIT_CANDIDATE_MOMENTS.filter((moment) => moment.mediaType === "video").length, 6);
  assert.equal(MOMENT_ORBIT_CANDIDATE_MOMENTS.filter((moment) => moment.mediaType === "photo").length, 4);
  assert.equal(new Set(MOMENT_ORBIT_CANDIDATE_MOMENTS.map((moment) => moment.id)).size, 10);
  assert.ok(MOMENT_ORBIT_CANDIDATE_MOMENTS.every((moment) => moment.poster.startsWith("data:image/svg+xml")));
  for (const forbidden of ["ASTRIN", "184 SAVED MOMENTS", "12 CONNECTIONS", "827 DAYS", "SAVE THIS MOMENT"]) {
    assert.ok(!component.includes(forbidden), `candidate component must not import source demo semantic: ${forbidden}`);
  }
});

test("Moment Orbit Carousel core — wraparound previous/next is canonical", () => {
  assert.equal(wrapMomentIndex(10, 10), 0);
  assert.equal(wrapMomentIndex(-1, 10), 9);
  assert.equal(stepMomentIndex(9, 1, 10), 0);
  assert.equal(stepMomentIndex(0, -1, 10), 9);
});

test("Moment Orbit Carousel core — drag position snaps to nearest canonical Moment", () => {
  assert.deepEqual(canonicalSnap(2.49, 10), { position: 2, index: 2 });
  assert.deepEqual(canonicalSnap(2.51, 10), { position: 3, index: 3 });
  assert.deepEqual(canonicalSnap(-0.6, 10), { position: -1, index: 9 });
  assert.equal(nearestEquivalentMomentPosition(9.8, 0, 10), 10);
  assert.equal(nearestEquivalentMomentPosition(-0.2, 9, 10), -1);
});

test("Moment Orbit Carousel core — horizontal/vertical projection changes geometry without changing identity", () => {
  const horizontal = projectMomentOnOrbit(2, 0, 10, "horizontal", "desktop");
  const vertical = projectMomentOnOrbit(2, 0, 10, "vertical", "desktop");
  assert.notEqual(horizontal.x, vertical.x);
  assert.notEqual(horizontal.y, vertical.y);
  assert.equal(horizontal.z, vertical.z);
  assert.equal(horizontal.scale, vertical.scale);
});

test("Moment Orbit Carousel component — selection, autoplay takeover and selected-only audio contracts are explicit", () => {
  assert.equal(MOMENT_ORBIT_AUTOPLAY_MS, 4200);
  assert.match(component, /canonicalSnap\(drag\.latestPosition, count\)/);
  assert.match(component, /nearestEquivalentMomentPosition/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /releasePointerCapture/);
  assert.match(component, /addEventListener\("wheel", onWheel, \{ passive: false \}\)/);
  assert.match(component, /removeEventListener\("wheel", onWheel\)/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.doesNotMatch(component, /onWheel=\{/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /ArrowLeft/);
  assert.match(component, /scrollIntoView/);
  assert.match(component, /data-selected-index=\{selectedIndex\}/);
  assert.match(component, /data-selected-id=\{selectedMoment\.id\}/);
  assert.match(component, /data-shelf-index=\{index\}/);
  assert.match(component, /const auto = autoPreference \?\? !reducedMotion/);
  assert.match(component, /setAutoPreference/);
  assert.match(component, /muted=\{!soundOn\}/);
  assert.match(component, /data-audio-authority=/);
  assert.match(component, /selectedMoment\.mediaType === "video"/);
});

test("Moment Orbit Carousel component — axis state and mobile/reduced-motion policies are preserved", () => {
  assert.match(component, /axis === "horizontal" \? "vertical" : "horizontal"/);
  assert.match(component, /setPosition\(\(current\) => nearestEquivalentMomentPosition\(current, selectedIndex, count\)\)/);
  assert.match(component, /aria-modal=/);
  assert.match(component, /previousFocusRef/);
  assert.match(component, /useLayoutEffect/);
  assert.match(component, /event\.key !== "Tab"/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /@media\(max-width:759px\)/);
  assert.match(css, /visibility:hidden;pointer-events:none/);
  assert.match(css, /\.lt-moc__inspector\.is-open\{transform:none;visibility:visible;pointer-events:auto\}/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /transition:none!important/);
});
