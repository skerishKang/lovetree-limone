import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";
import { LINEAGE_53_V2_RUNNER_LABEL, LINEAGE_53_V2_SOURCE } from "../lib/lineage-53-v2-source.ts";

const root = new URL("../", import.meta.url);

test("Lineage 53 V2 is pinned to the exact sibling Drive artifact", () => {
  assert.equal(LINEAGE_53_V2_SOURCE.lineageId, "lt-53-emotional-path-replay");
  assert.equal(LINEAGE_53_V2_SOURCE.revisionId, "53-v2-node-light-flow");
  assert.equal(LINEAGE_53_V2_SOURCE.runnerRoute, "/design-lab/lineages/53/v2");
  assert.equal(LINEAGE_53_V2_SOURCE.sourceBytes, 39_162);
  assert.equal(LINEAGE_53_V2_SOURCE.sourceSha256, "9dff1d204b6d09bb7198b5f61965c2bd81e08d04dec8b6b59d4c07807d07b847");
  assert.equal(LINEAGE_53_V2_RUNNER_LABEL, "SOURCE RUNNER — EXACT LOVE TREE REVISION");
});

test("Lineage 53 registry preserves V1 history and promotes V2 as current candidate", () => {
  assert.deepEqual(validateDesignLineages(), []);
  const lineage = DESIGN_LINEAGES.find((entry) => entry.id === "lt-53-emotional-path-replay");
  assert.ok(lineage);
  assert.equal(lineage.status, "active");
  assert.equal(lineage.revisions.length, 2);
  assert.equal(lineage.revisions[0].id, "53-v1-node-light-flow");
  assert.equal(lineage.revisions[0].decision, "superseded");
  assert.equal(lineage.revisions[1].id, "53-v2-node-light-flow");
  assert.equal(lineage.revisions[1].decision, "candidate");
  assert.equal(lineage.revisions[1].route, LINEAGE_53_V2_SOURCE.runnerRoute);
});

test("exact Lineage 53 V2 source bytes are reconstructed and retain the V1 engine plus V2 delta", async () => {
  const chunks = await Promise.all(
    LINEAGE_53_V2_SOURCE.sourceChunkPaths.map((path) => readFile(new URL(`public${path}`, root))),
  );
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.byteLength, LINEAGE_53_V2_SOURCE.sourceBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), LINEAGE_53_V2_SOURCE.sourceSha256);

  const source = bytes.toString("utf8");
  for (const marker of [
    "VERSION: v2",
    "V1 motion engine preserved + visible Connection skeleton + saturated energy + Living Tree climax",
    "function pulseNode",
    "function pulseEdge",
    "getTotalLength()",
    "getPointAtLength",
    "ResizeObserver",
    "__LOVE_TREE_MOTION__",
    "prefers-reduced-motion",
    "connection-active-outer",
    "connection-active-inner",
    "living-tree",
    "baseConnectionOpacity",
    "completedTreeGlow",
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Lineage 53 V2 runner verifies exact bytes before sandboxed execution and preserves page scroll priority", async () => {
  const frame = await readFile(new URL("app/design-lab/lineages/53/v2/SourceRunnerFrame.tsx", root), "utf8");
  assert.match(frame, /responses\.map\(\(response\) => response\.arrayBuffer\(\)\)/);
  assert.match(frame, /Uint8Array\(totalBytes\)/);
  assert.match(frame, /crypto\.subtle\.digest\("SHA-256", bytes\)/);
  assert.match(frame, /bytes\.byteLength !== sourceBytes/);
  assert.match(frame, /URL\.createObjectURL/);
  assert.match(frame, /sandbox="allow-scripts"/);
  assert.doesNotMatch(frame, /allow-same-origin/);
  assert.match(frame, /lt-flow-runner__iframe--passive/);
  assert.match(frame, /리플레이 인터랙션 켜기/);
});
