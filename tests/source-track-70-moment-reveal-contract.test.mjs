import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  TRACK70_MOMENT_REVEAL_AUTHORITY,
  track70AdjacentIndex,
  track70CanonicalMedia,
} from "../lib/source-track-70/moment-reveal.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const donor = JSON.parse(read("design-intake/source-track-70-moment-reveal-native-donor.json"));
const sourceGate = JSON.parse(read("design-intake/manifests/source-track-70-moment-reveal-editorial.json"));
const page = read("app/trees/[id]/album/reveal/page.tsx");
const component = read("app/trees/[id]/album/reveal/Track70MomentReveal.tsx");
const css = read("app/trees/[id]/album/reveal/track70-moment-reveal.module.css");
const workflow = read(".github/workflows/source-track70-moment-reveal-browser-qa.yml");

test("Track70 #496 uses the explicit owner-queued A+B authority without inventing a winner", () => {
  assert.equal(donor.issue, 496);
  assert.equal(donor.sourceGateIssue, 291);
  assert.equal(donor.ownerDecisionIssue, 344);
  assert.equal(donor.sourceSelection, "A+B_COMPOSITE_OWNER_QUEUED");
  assert.equal(donor.productDisposition, "USE_AS_HIGH_VISUAL_MOMENT_DONOR");
  assert.equal(TRACK70_MOMENT_REVEAL_AUTHORITY.sourceSelection, donor.sourceSelection);

  const gateArtifacts = new Map(sourceGate.sourceArtifacts.map((item) => [item.filename, item]));
  const sourceA = gateArtifacts.get(donor.sourceAuthority.candidateA.filename);
  const sourceB = gateArtifacts.get(donor.sourceAuthority.candidateB.filename);
  assert.ok(sourceA, "candidate A must remain pinned by #291 manifest");
  assert.ok(sourceB, "candidate B must remain pinned by #291 manifest");
  assert.equal(sourceA.bytes, 31282);
  assert.equal(sourceA.sha256, donor.sourceAuthority.candidateA.sha256);
  assert.equal(sourceB.bytes, 24536470);
  assert.equal(sourceB.sha256, donor.sourceAuthority.candidateB.sha256);
  assert.equal(donor.sourceAuthority.candidateB.embeddedExecutableVersion, "V20");
});

test("Track70 donor stays on canonical Moment/media truth and adds no persistence authority", () => {
  assert.equal(donor.canonicalBoundary.momentModel, "lib/moment-model.ts::AlbumMomentView");
  assert.equal(donor.canonicalBoundary.runtimeProjection, "lib/use-tree-moments.ts::useTreeMoments");
  assert.equal(donor.canonicalBoundary.existingMomentSurface, "/trees/:treeId/album");
  assert.equal(donor.canonicalBoundary.nativeProofRoute, "/trees/:treeId/album/reveal");
  assert.equal(donor.canonicalBoundary.newBackend, false);
  assert.equal(donor.canonicalBoundary.newApi, false);
  assert.equal(donor.canonicalBoundary.newDatabase, false);
  assert.equal(donor.canonicalBoundary.newSchema, false);
  assert.equal(donor.canonicalBoundary.newPersistence, false);
  assert.match(page, /useTreeMoments\(treeId\)/);
  assert.match(page, /albumMoments/);
  assert.doesNotMatch(page + component, /createMoment|updateMoment|deleteMoment|localStorage|sessionStorage/);
  assert.doesNotMatch(component, /drive\.google|img\.youtube|youtube-nocookie|CANDIDATE_LOCK|SOURCE_LOCK/);
});

test("aligned reveal reuses exactly the same canonical thumbnail instead of a second likeness record", () => {
  const moment = {
    id: "m1",
    treeId: "t1",
    title: "Moment",
    memo: "",
    thumbnail: " https://media.example/canonical.jpg ",
    sourceType: "image",
    sourceUrl: "https://media.example/source",
    emotionTags: [],
    timestamp: "2026-08-01",
    discoveryDate: "2026-08-01",
    sortOrder: 0,
  };
  assert.equal(track70CanonicalMedia(moment), "https://media.example/canonical.jpg");
  assert.equal((component.match(/src=\{media\}/g) ?? []).length, 2);
  assert.match(component, /data-layer="shell"/);
  assert.match(component, /data-layer="clean"/);
  assert.match(css, /\.mediaImage[\s\S]*object-fit: cover;[\s\S]*object-position: 50% 50%;/);
  assert.equal(donor.provenanceBoundary.sourcePairAssets, "REFERENCE_ONLY_NOT_PRODUCT_MEDIA");
  assert.equal(donor.provenanceBoundary.likenessHandling, "NO_IDENTITY_OR_SENSITIVE_ATTRIBUTE_INFERENCE");
});

test("hover, touch, keyboard, focus and reduced-motion semantics are explicit", () => {
  assert.match(component, /onPointerEnter/);
  assert.match(component, /onPointerMove/);
  assert.match(component, /onPointerDown/);
  assert.match(component, /onPointerUp/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /event\.key === "Enter"/);
  assert.match(component, /event\.key === "ArrowLeft"/);
  assert.match(component, /event\.key === "ArrowRight"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /touch-action: pan-y/);
  assert.match(workflow, /source-track-70-moment-reveal-browser-qa\.mjs/);
  assert.equal(donor.centralRegistryHandoffRequired, true);
});

test("Moment stepping wraps without creating parallel selection state", () => {
  assert.equal(track70AdjacentIndex(0, -1, 4), 3);
  assert.equal(track70AdjacentIndex(3, 1, 4), 0);
  assert.equal(track70AdjacentIndex(1, 1, 4), 2);
  assert.equal(track70AdjacentIndex(0, 1, 0), 0);
});
