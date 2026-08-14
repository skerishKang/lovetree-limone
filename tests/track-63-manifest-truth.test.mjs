import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";

const manifestPath = new URL(
  "../design-intake/manifests/track-63-moment-field-view-studio.json",
  import.meta.url,
);
const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
const manifest = parseIntakeManifest(raw);

test("Track63 current V1.3 instruction authority remains non-executable and non-fidelity-eligible", () => {
  // Identity
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(manifest.rendering, "unresolved");

  // Route — no native Track63 route exists
  assert.equal(manifest.route, undefined);

  // Source snapshot: historical pinned V1 (instruction accepted)
  assert.equal(manifest.sourceSnapshot.sourceAuthorityState, "HISTORICAL_PINNED");
  assert.equal(manifest.sourceSnapshot.revisionLabel, "V1 (instruction accepted)");

  const nk = manifest.sourceSnapshot.newerRevisionKnown;
  assert.ok(nk, "newerRevisionKnown must be present (HISTORICAL_PINNED requires it)");

  // V1.3 is the current instruction authority
  assert.match(nk, /V1\.3/, "newerRevisionKnown mentions V1.3");
  assert.match(nk, /EXECUTABLE_PENDING/, "newerRevisionKnown marks V1.3 as EXECUTABLE_PENDING");
  assert.match(nk, /INSTRUCTION_AUTHORITY_CURRENT/, "newerRevisionKnown labels V1.3 as instruction authority");

  // V1.2 is NOT called current authority (the old "supersedes ... current authority" pattern)
  assert.doesNotMatch(nk, /V1\.2 supersedes.*current authority/);
  assert.doesNotMatch(nk, /V1\.2 is current/);

  // V1.2 role is UX DONOR ONLY / HOLD
  assert.match(nk, /UX DONOR ONLY/);
  assert.match(nk, /HOLD/);

  // V1.1 role is BASE MASTER
  assert.match(nk, /BASE MASTER/);

  // QA is absent — false-green removed
  assert.equal(manifest.qa, undefined);

  // Fidelity eligibility is absent — false-green removed
  assert.equal(manifest.fidelityTargetMetadata, undefined);

  // Adoption is NOT ADOPT
  assert.ok(manifest.adoption);
  assert.notEqual(manifest.adoption.status, "ADOPT");

  // No executable PINNED artifact was introduced for V1.1 or V1.2
  const executables = manifest.sourceArtifacts?.filter((a) => a.role === "executable" && a.status === "PINNED") ?? [];
  assert.equal(executables.length, 0, "no PINNED executable artifact (V1.3 candidate folder is EMPTY)");

  // Reference-video history remains intact
  const refVideo = manifest.sourceArtifacts?.find((a) => a.role === "reference-video");
  assert.ok(refVideo, "reference-video artifact preserved");
  assert.equal(refVideo?.status, "REFERENCE_ONLY");
  assert.equal(refVideo?.driveId, "1iopa96U_ID4bknrOIOw-Y83sgvrRudyD");
  assert.equal(refVideo?.bytes, 43394198);
  assert.equal(refVideo?.sha256, "1514c0c50d8d274a8dac61332f3e28094634048f2dd0e1a9d9631db7de38b1df");
});