import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LINEAGE_55_APPROVAL_BOUNDARY, LINEAGE_55_MOONLIT_BLOSSOM_SOURCE } from "../lib/lineage-55-moonlit-blossom-source.ts";
const root = new URL("../", import.meta.url);
function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

test("Lineage 55 separates historical recorded claim from actual Git snapshot", async () => {
  const source = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE;
  const claim = source.historicalRecordedClaim;
  const git = source.gitPreservedSnapshot;
  const bytes = await readFile(new URL(git.repositoryPath, root));
  assert.equal(source.provenanceStatus, "PROVENANCE_UNRESOLVED");
  assert.equal(source.rootCauseClass, "INTAKE_SOURCE_PROVENANCE_MIS-ASSOCIATION");
  assert.equal(claim.state, "HISTORICALLY_RECORDED_UNVERIFIED_FINGERPRINT");
  assert.equal(claim.currentDriveTruth, false);
  assert.equal(git.origin, "UNRESOLVED");
  assert.equal(git.identity, "LoveTree Memory Blossom Hero v1");
  assert.equal(git.canonicalDriveV1, false);
  assert.equal(gitBlobSha(bytes), "3590e5fbe3af35c364f9ca3444901ee2671e18e5");
  assert.notEqual(gitBlobSha(bytes), claim.gitBlobSha);
});

test("Lineage 55 pins Drive-authoritative observable V1 R3 independently", () => {
  const drive = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE.driveAuthoritativeRevision;
  assert.equal(drive.state, "V1_DRIVE_AUTHORITATIVE_R3");
  assert.equal(drive.driveId, "11VCsXcP2OlOH1pOAwFmhD4HwIU1blc6M");
  assert.equal(drive.revisionId, "0B-UtbwYpFaMJZWpzeVE0eGU4MDNWR1pTTVRzZWlZbHBIM3dJPQ");
  assert.equal(drive.temporalRelationToPr135, "PRE_DATES_PR_135_NOT_LATER_POST_PR_SNAPSHOT");
  assert.equal(drive.sha256, "1c682715a193ae9b1670f4a415d555a27ee7ad49a4dd58fecfa83e9f14da5f41");
  assert.equal(drive.gitBlobSha, "0fa3066680a556e9f6c0ee50780f39abe0f98cfc");
  assert.equal(drive.identity, "LoveTree — Moonlit Blossom");
  assert.equal(drive.repositoryEvidenceMaterialization, "NOT_COMMITTED_EXACT_FILE_TRANSFER_UNAVAILABLE");
});

test("Lineage 55 keeps five historical/current asset records separate and V2 aliases exact", () => {
  const source = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE;
  assert.equal(source.assets.length, 5);
  assert.equal(source.historicalAssetSourceState, "HISTORICAL_ASSET_SOURCE_UNRESOLVED");
  assert.equal(source.v2AssetAliasState, "V1_V2_5_OF_5_BYTE_IDENTICAL_DIFFERENT_DRIVE_OBJECTS");
  for (const asset of source.assets) {
    assert.equal(asset.historicalPinnedFingerprint.state, "HISTORICALLY_RECORDED_UNVERIFIED_FINGERPRINT");
    assert.equal(asset.currentDriveFingerprint.state, "CURRENT_DRIVE_V1_VERIFIED_FINGERPRINT");
    assert.equal(asset.v2Alias.byteIdenticalToCurrentDriveV1, true);
    assert.equal(asset.v2Alias.relation, "BYTE_IDENTICAL_COPY_DIFFERENT_DRIVE_OBJECT");
    assert.notEqual(asset.driveObject.id, asset.v2Alias.driveId);
    assert.notEqual(asset.historicalPinnedFingerprint.sha256, asset.currentDriveFingerprint.sha256);
  }
});

test("Lineage 55 V2 remains a revision and source fixtures do not define product policy", () => {
  const source = LINEAGE_55_MOONLIT_BLOSSOM_SOURCE;
  assert.equal(source.v2Revision.state, "LINEAGE_55_REVISION");
  assert.equal(source.v2Revision.lineageId, source.lineageId);
  assert.equal(source.v2Revision.newLineage, false);
  assert.equal(source.productPolicyInference, "NONE_FROM_SOURCE_FIXTURE");
  assert.match(LINEAGE_55_APPROVAL_BOUNDARY, /No source fixture is canonical V4 product policy/);
});

test("Lineage 55 verifier keeps unresolved historical provenance fail-closed", async () => {
  const verifier = await readFile(new URL("scripts/verify-lineage-55-assets.mjs", root), "utf8");
  assert.match(verifier, /HISTORICAL_ASSET_SOURCE_UNRESOLVED/);
  assert.match(verifier, /LINEAGE_55_CURRENT_DRIVE_V1_ASSET_SET_PASS/);
  assert.match(verifier, /LINEAGE_55_CURRENT_DRIVE_ONLY_GATE_PASS/);
  assert.match(verifier, /process\.exit\(2\)/);
  assert.doesNotMatch(verifier, /LINEAGE_55_EXACT_ASSET_GATE_PASS/);
  assert.doesNotMatch(verifier, /\.skip\(/);
});

test("Lineage 55 documentation retracts false exact-Drive claim without deleting history", async () => {
  const doc = await readFile(new URL("docs/product/lineages/55_MOONLIT_BLOSSOM_HERO_V1_SOURCE_ANALYSIS.md", root), "utf8");
  assert.match(doc, /INTAKE_SOURCE_PROVENANCE_MIS-ASSOCIATION/);
  assert.match(doc, /HISTORICALLY_RECORDED_UNVERIFIED_FINGERPRINT/);
  assert.match(doc, /V1_DRIVE_AUTHORITATIVE_R3/);
  assert.match(doc, /PROVENANCE_UNRESOLVED/);
  assert.doesNotMatch(doc, /byte-exact HTML preservation confirmed/i);
  assert.doesNotMatch(doc, /proving byte-exact text preservation/i);
});
