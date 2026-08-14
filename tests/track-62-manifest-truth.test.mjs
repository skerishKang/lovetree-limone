import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "design-intake",
  "manifests",
  "track-62-v1-1-reservation-hold.json",
);

function readTrack62() {
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  return parseIntakeManifest(JSON.parse(raw));
}

test("Track62 V1.1 keeps source evidence while native QA and lineage allocation remain fail-closed", () => {
  const manifest = readTrack62();

  // Source truth is retained exactly (Issue #159 CTO V1.1 update).
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.rendering, "dom-2d");
  assert.equal(manifest.sourceSnapshot.revisionLabel, "V1.1");
  assert.equal(manifest.sourceSnapshot.sourceAuthorityState, "CURRENT_AT_OBSERVATION");

  // Source identity/fingerprints are pinned and unchanged.
  const executable = manifest.sourceArtifacts.find((artifact) => artifact.role === "executable");
  assert.equal(executable.driveId, "1Fu0Vorz5BjX2uEjlL2bujQvrP0gFVC9S");
  assert.equal(executable.bytes, 20728647);
  assert.equal(
    executable.sha256,
    "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
  );
  const siblingQa = manifest.sourceArtifacts.find((artifact) => artifact.role === "sibling-qa");
  assert.equal(siblingQa.driveId, "12cv-Xw0lrk_RDnf7q8isANVm-eV_b5dd");
  assert.equal(siblingQa.bytes, 13953);
  assert.equal(
    siblingQa.sha256,
    "6462ef1f67016146e84942811b05a00b9e8f040030d4bc7acabc95d27f685d81",
  );

  // Reservation/adoption stay HOLD — NEW_LINEAGE classification must not imply
  // Lineage 62 allocation, and source executable must not imply native readiness.
  assert.equal(manifest.lineageReservation.status, "HOLD");
  assert.equal(manifest.reservation.held, true);
  assert.equal(manifest.adoption.status, "HOLD");
  assert.equal(manifest.lineageNumber, undefined, "no Lineage 62 number reserved");

  // No native route is claimed.
  assert.equal(manifest.route, undefined, "no native route claimed while reservation/adoption HOLD");

  // Completed-looking native QA must stay omitted until native browser QA
  // passes. Source standalone Chromium evidence (Issue #159) is not native QA:
  // dialog focus contract FAIL/HOLD, mobile readability HOLD, MY TREE handoff
  // pending, production media authority not proven.
  assert.equal(manifest.qa, undefined, "qa omitted until native browser QA passes");

  // The four source-level HOLDS remain recorded (never weakened).
  const defects = manifest.sourceDefects.join("\n");
  assert.match(defects, /DIALOG_ACCESSIBILITY/, "dialog focus entry/trap/return HOLD kept");
  assert.match(defects, /MOBILE_320_390_COPY_READABILITY/, "mobile 320/390 copy readability HOLD kept");
  assert.match(defects, /MY_TREE_NATIVE_HANDOFF/, "MY TREE native handoff pending kept");
  assert.match(defects, /PRODUCTION_MEDIA_AUTHORITY/, "production media authority not proven kept");
});
