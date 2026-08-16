import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LINEAGE_67_V23_SOURCE } from "../lib/lineage-67-v23-source.ts";

const MANIFEST_PATH = new URL(
  "../design-intake/manifests/track-67-memory-tape-interactive-roll.json",
  import.meta.url,
);

test("Lineage 67 V2.3 intake manifest is repository-owned and schema-named", async () => {
  const raw = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  assert.equal(raw.stableId, "track-67-memory-tape-interactive-roll");
  assert.equal(raw.classification, "NEW_LINEAGE");
  assert.equal(raw.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(raw.route.path, "/design-lab/lineages/67/v2-3");
  assert.equal(raw.lineageReservation.status, "ALLOCATED");
  assert.equal(raw.adoption.status, "SOURCE_REFERENCE_ONLY");
});

test("Lineage 67 V2.3 authoritative Drive identity is pinned, exact bytes are fail-closed PENDING", async () => {
  const raw = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const executable = raw.sourceArtifacts.find((a) => a.role === "executable");
  const instruction = raw.sourceArtifacts.find((a) => a.role === "instruction");
  assert.ok(executable, "executable artifact present");
  assert.ok(instruction, "instruction artifact present");
  // Authoritative Drive IDs are real and must not be placeholders.
  assert.equal(executable.driveId, "1tidkeFhwCNvqztysxEQgkKFDpWIag8gh");
  assert.equal(instruction.driveId, "1XNz0t9A2apMxH0pqw2Ef-xihc1PxfMr-");
  // The exact executable is intentionally NOT pinned: fail closed, no fake fingerprint.
  assert.equal(executable.status, "PENDING");
  assert.equal(instruction.status, "PENDING");
  assert.equal(raw.exactAssetGate.exactGateStatus, "EXACT_GATE_PENDING");
  assert.equal(raw.exactAssetGate.fingerprintStatus, "FINGERPRINT_NONE");
  assert.equal(raw.exactAssetGate.binaryTransferStatus, "BINARY_TRANSFER_NONE");
});

test("Lineage 67 V2.3 source module mirrors the fail-closed pending disposition", () => {
  assert.equal(LINEAGE_67_V23_SOURCE.sourceStatus, "BLOCKED_EXACT_BYTES_UNAVAILABLE");
  assert.equal(LINEAGE_67_V23_SOURCE.sourcePinned, false);
  assert.equal(LINEAGE_67_V23_SOURCE.sourceBytes, null);
  assert.equal(LINEAGE_67_V23_SOURCE.sourceSha256, null);
  assert.equal(
    LINEAGE_67_V23_SOURCE.driveExecutableId,
    "1tidkeFhwCNvqztysxEQgkKFDpWIag8gh",
  );
  assert.equal(LINEAGE_67_V23_SOURCE.runnerRoute, "/design-lab/lineages/67/v2-3");
});
