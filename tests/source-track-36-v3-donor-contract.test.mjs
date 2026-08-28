import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SOURCE_TRACK_36_CANONICAL_TARGET,
  SOURCE_TRACK_36_DISPOSITION,
  SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR,
  SOURCE_TRACK_36_FAMILY,
  SOURCE_TRACK_36_SOURCE_GAPS,
} from "../lib/source-track-36/donor.ts";

const snapshotUrl = new URL(
  "../old/reference/source-tracks-snapshot/36_시네마틱메모리포털_버전통합/01_시네마틱메모리포털_밝은로컬진입_v3.html",
  import.meta.url,
);
const sumsUrl = new URL(
  "../old/reference/source-tracks-snapshot/36_시네마틱메모리포털_버전통합/SHA256SUMS.txt",
  import.meta.url,
);
const componentUrl = new URL(
  "../app/design-lab/source-tracks/36/v3/donor/Track36HomeDonor.tsx",
  import.meta.url,
);
const styleUrl = new URL(
  "../app/design-lab/source-tracks/36/v3/donor/track36-home-donor.module.css",
  import.meta.url,
);
const manifestUrl = new URL(
  "../design-intake/manifests/source-track-36-cinematic-memory-portal-v3.json",
  import.meta.url,
);

const source = readFileSync(snapshotUrl, "utf8");
const sums = readFileSync(sumsUrl, "utf8");
const component = readFileSync(componentUrl, "utf8");
const styles = readFileSync(styleUrl, "utf8");
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));

const actualSha256 = createHash("sha256").update(source).digest("hex");

test("Track36 V3 snapshot identity remains byte/fingerprint pinned", () => {
  assert.equal(Buffer.byteLength(source), SOURCE_TRACK_36_FAMILY.sourceBytes);
  assert.equal(actualSha256, SOURCE_TRACK_36_FAMILY.sourceSha256);
  assert.match(sums, new RegExp(`^${SOURCE_TRACK_36_FAMILY.sourceSha256}\\s+\\./01_시네마틱메모리포털_밝은로컬진입_v3\\.html`, "m"));
  assert.equal(SOURCE_TRACK_36_FAMILY.sourceRevision, "V3");
});

test("108 master rows 1/2/3 are normalized as one Track36 family", () => {
  assert.equal(SOURCE_TRACK_36_FAMILY.masterAnchorId, 1);
  assert.deepEqual([...SOURCE_TRACK_36_FAMILY.duplicateMasterIds], [2, 3]);
  assert.equal(SOURCE_TRACK_36_DISPOSITION, "USE_AS_DONOR_TO_EXISTING_NATIVE");
  assert.equal(manifest.stableId, "source-track-36-cinematic-memory-portal-v3");
  assert.equal(manifest.adoption.status, "SOURCE_REFERENCE_ONLY");
});

test("source defects that prevent direct HOME adoption remain explicit", () => {
  assert.match(source, /min-width:\s*980px/);
  assert.match(source, /min-height:\s*650px/);
  assert.match(source, /lovetree-first-journey-unified-v1\.html/);
  assert.match(source, /file:\/\/\/D:\/LoveTree-work\//);
  assert.match(source, /document\.addEventListener\('keydown'/);
  assert.match(source, /e\.key==='Enter'/);
  assert.match(source, /@media\(prefers-reduced-motion:reduce\)/);
  assert.ok(SOURCE_TRACK_36_SOURCE_GAPS.some((gap) => gap.includes("min-width:980px")));
});

test("bounded donor proof never replaces canonical data truth with the source iframe", () => {
  assert.equal(SOURCE_TRACK_36_CANONICAL_TARGET, "/v4");
  assert.equal(SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR, "/design-lab/source-tracks/74/v2/native");
  assert.doesNotMatch(component, /<iframe(?:\s|>)/i);
  assert.doesNotMatch(component, /createFirstTree|apiFetch|useAuth|localStorage/);
  assert.match(component, /router\.push\(SOURCE_TRACK_36_CANONICAL_TARGET\)/);
  assert.match(component, /SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR/);
});

test("donor remediation contract covers 390px, focus and reduced motion without a desktop minimum", () => {
  assert.doesNotMatch(styles, /min-width:\s*980px/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.deepEqual(manifest.qa.viewports, [
    { width: 1280, height: 800 },
    { width: 390, height: 844, mobile: true },
  ]);
  assert.equal(manifest.qa.horizontalOverflowZero, true);
  assert.equal(manifest.qa.keyboardFocus, true);
  assert.equal(manifest.qa.reducedMotion, true);
});

test("Track36 bounded files remain isolated from protected PR #191 and reconciliation files", () => {
  const boundedText = `${component}\n${styles}\n${JSON.stringify(manifest)}`;
  assert.doesNotMatch(boundedText, /pull\/191|PR #191/);
  assert.doesNotMatch(component, /master-design-coverage/);
});
