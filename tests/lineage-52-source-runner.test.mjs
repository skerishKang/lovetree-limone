import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import {
  LINEAGE_52_V3_RUNNER_LABEL,
  LINEAGE_52_V3_SOURCE,
} from "../lib/lineage-52-v3-source.ts";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

test("Lineage 52 V3 source-runner identity is pinned to the verified Drive artifact", () => {
  assert.equal(LINEAGE_52_V3_SOURCE.lineageId, "lt-52-global-moment-orbit");
  assert.equal(LINEAGE_52_V3_SOURCE.revisionId, "52-v3-reference-earth-orbit");
  assert.equal(LINEAGE_52_V3_SOURCE.candidateId, "lineage:52-v3-reference-earth-orbit");
  assert.equal(LINEAGE_52_V3_SOURCE.runnerRoute, "/design-lab/lineages/52/v3");
  assert.equal(LINEAGE_52_V3_SOURCE.sourceBytes, 1_140_569);
  assert.equal(
    LINEAGE_52_V3_SOURCE.sourceSha256,
    "f8c017f964338a77b4286cc7fe3baed2675e8f6117aff0b83f943c071bf4f45b",
  );
  assert.equal(LINEAGE_52_V3_SOURCE.runtimeSeconds, 20);
  assert.equal(LINEAGE_52_V3_RUNNER_LABEL, "SOURCE RUNNER — NOT NATIVE NEXT IMPLEMENTATION");
});

test("Lineage 52 V3 review route verifies bytes before isolated iframe execution", async () => {
  for (const path of [
    "app/design-lab/lineages/52/v3/page.tsx",
    "app/design-lab/lineages/52/v3/SourceRunnerFrame.tsx",
    "app/styles/lineage-52-source-runner.css",
    "app/styles/lineage-52-source-runner-controls.css",
  ]) {
    assert.ok(await exists(path), `${path} must exist`);
  }

  const frameSource = await readFile(
    new URL("app/design-lab/lineages/52/v3/SourceRunnerFrame.tsx", root),
    "utf8",
  );
  assert.match(frameSource, /response\.arrayBuffer\(\)/);
  assert.match(frameSource, /crypto\.subtle\.digest\("SHA-256", bytes\)/);
  assert.match(frameSource, /bytes\.byteLength !== sourceBytes/);
  assert.match(frameSource, /URL\.createObjectURL/);
  assert.match(frameSource, /URL\.revokeObjectURL/);
  assert.match(frameSource, /sandbox="allow-scripts"/);
  assert.doesNotMatch(frameSource, /allow-same-origin/);
});

test("source runner protects reduced-motion users without rewriting the verified source", async () => {
  const frameSource = await readFile(
    new URL("app/design-lab/lineages/52/v3/SourceRunnerFrame.tsx", root),
    "utf8",
  );
  assert.match(frameSource, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(frameSource, /REDUCED MOTION ACTIVE/);
  assert.match(frameSource, /원본 모션 실행/);
  assert.match(frameSource, /motionPreference === "reduced" && !motionOverride/);
  assert.match(frameSource, /motionPreference === "full" \|\| motionOverride/);
});

test("source runner defaults to outer-page scroll and requires explicit orbit interaction", async () => {
  const frameSource = await readFile(
    new URL("app/design-lab/lineages/52/v3/SourceRunnerFrame.tsx", root),
    "utf8",
  );
  const controlsCss = await readFile(
    new URL("app/styles/lineage-52-source-runner-controls.css", root),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("app/design-lab/lineages/52/v3/page.tsx", root),
    "utf8",
  );

  assert.match(frameSource, /data-interaction-state=\{interactionEnabled \? "interactive" : "scroll"\}/);
  assert.match(frameSource, /lt-orbit-runner__iframe--passive/);
  assert.match(frameSource, /lt-orbit-runner__iframe--interactive/);
  assert.match(frameSource, /오비트 인터랙션 켜기/);
  assert.match(frameSource, /페이지 스크롤 모드/);
  assert.match(frameSource, /tabIndex=\{interactionEnabled \? 0 : -1\}/);
  assert.match(controlsCss, /\.lt-orbit-runner__iframe--passive\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(controlsCss, /\.lt-orbit-runner__iframe--interactive\s*\{[\s\S]*?pointer-events:\s*auto/);
  assert.match(pageSource, /lineage-52-source-runner-controls\.css/);
});

test("exact source asset, when committed, must retain the verified byte identity", async (t) => {
  const sourceUrl = new URL(`public${LINEAGE_52_V3_SOURCE.sourceAssetPath}`, root);
  let bytes;

  try {
    bytes = await readFile(sourceUrl);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      t.skip("exact source asset transfer is still pending; runner must remain fail-closed");
      return;
    }
    throw error;
  }

  assert.equal(bytes.byteLength, LINEAGE_52_V3_SOURCE.sourceBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), LINEAGE_52_V3_SOURCE.sourceSha256);
});
