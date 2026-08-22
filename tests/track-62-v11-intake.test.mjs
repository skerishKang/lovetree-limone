import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "design-intake",
  "manifests",
  "track-62-v11-continuous-exhibition-native-proof.json",
);

test("Track62 V1.1 capability-proof intake manifest parses and stays truthful", () => {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const manifest = parseIntakeManifest(raw);
  assert.equal(manifest.stableId, "track-62-v11-continuous-exhibition-native-proof");
  assert.equal(manifest.rendering, "dom-2d");
  assert.equal(manifest.backendScope, "BACKEND_FREE");

  assert.ok(manifest.summary.includes("capability proof"), "manifest must declare capability proof scope");
  // REFERENCE_CAPABILITY_ONLY fails closed without reserving lineage identity:
  // absence of lineageReservation/designLineageId/lineageNumber IS the HOLD proof.
  assert.equal(manifest.lineageReservation, undefined, "no lineage number may be reserved");
  assert.equal(manifest.designLineageId, undefined, "no design lineage identity may be claimed");
  assert.equal(manifest.lineageNumber, undefined, "no lineage number may be allocated");
  assert.equal(manifest.adoption.status, "HOLD", "canonical adoption stays HOLD");
  assert.equal(manifest.reservation?.held, true, "reservation stays held");
  assert.equal(manifest.route?.path, "/design-lab/capabilities/continuous-exhibition-rail");

  const executable = manifest.sourceArtifacts.find((a) => a.role === "executable");
  assert.ok(executable, "pinned executable artifact must be recorded");
  assert.equal(executable.bytes, 20728647);
  assert.equal(
    executable.sha256,
    "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
  );
  assert.equal(executable.status, "PINNED");

  for (const defect of manifest.sourceDefects) {
    assert.ok(
      defect.includes("DIALOG_ACCESSIBILITY") ||
        defect.includes("MOBILE_320_390_COPY_READABILITY") ||
        defect.includes("MY_TREE_NATIVE_HANDOFF") ||
        defect.includes("PRODUCTION_MEDIA_AUTHORITY"),
      `tracked defect preserved: ${defect}`,
    );
  }
});
