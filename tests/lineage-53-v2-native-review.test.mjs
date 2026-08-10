import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";
import { LINEAGE_53_V2_REVIEW_LABEL, LINEAGE_53_V2_SOURCE } from "../lib/lineage-53-v2-source.ts";

const root = new URL("../", import.meta.url);

test("Lineage 53 V2 provenance stays pinned to the new sibling LoveTree source", () => {
  assert.equal(LINEAGE_53_V2_SOURCE.lineageId, "lt-53-emotional-path-replay");
  assert.equal(LINEAGE_53_V2_SOURCE.revisionId, "53-v2-node-light-flow");
  assert.equal(LINEAGE_53_V2_SOURCE.candidateId, "lineage:53-v2-node-light-flow");
  assert.equal(LINEAGE_53_V2_SOURCE.sourceFile, "53_LOVETREE_NODE_LIGHT_FLOW_v2.html");
  assert.equal(LINEAGE_53_V2_SOURCE.sourceBytes, 39_162);
  assert.equal(LINEAGE_53_V2_SOURCE.sourceSha256, "9dff1d204b6d09bb7198b5f61965c2bd81e08d04dec8b6b59d4c07807d07b847");
  assert.equal(LINEAGE_53_V2_SOURCE.runnerRoute, "/design-lab/lineages/53/v2");
  assert.equal(LINEAGE_53_V2_SOURCE.implementationMode, "native-react-svg-review");
  assert.equal(LINEAGE_53_V2_REVIEW_LABEL, "NATIVE FIDELITY REVIEW — LOVETREE SOURCE");
});

test("Lineage 53 preserves V1 history while V2 is the current executable candidate", () => {
  assert.deepEqual(validateDesignLineages(), []);
  const lineage = DESIGN_LINEAGES.find((entry) => entry.id === "lt-53-emotional-path-replay");
  assert.ok(lineage);
  assert.equal(lineage.status, "active");
  assert.equal(lineage.revisions.length, 2);
  assert.deepEqual(
    lineage.revisions.map(({ id, decision, executable }) => ({ id, decision, executable })),
    [
      { id: "53-v1-node-light-flow", decision: "superseded", executable: true },
      { id: "53-v2-node-light-flow", decision: "candidate", executable: true },
    ],
  );
  assert.equal(lineage.revisions[1].route, LINEAGE_53_V2_SOURCE.runnerRoute);
  assert.match(lineage.currentDecision, /V1 motion engine/);
  assert.match(lineage.currentDecision, /Connection skeleton/);
  assert.match(lineage.currentDecision, /CAP-14/);
});

test("Lineage 53 V2 native review implements the source motion engine and V2 visual delta", async () => {
  const component = await readFile(new URL("app/design-lab/lineages/53/v2/Lineage53V2Motion.tsx", root), "utf8");
  const css = await readFile(new URL("app/styles/lineage-53-source-runner.css", root), "utf8");

  assert.equal((component.match(/id: "m[1-7]"/g) ?? []).length, 7, "seven Moment nodes remain explicit");
  assert.equal((component.match(/id: "e[1-6]"/g) ?? []).length, 6, "six directed Connections remain explicit");

  for (const marker of [
    "처음 멈춰 본 장면",
    "표정이 자꾸 생각나서",
    "완전히 빠진 순간",
    "#38E8FF",
    "#8B5CFF",
    "#FF4FA3",
    "getTotalLength()",
    "getPointAtLength",
    "ResizeObserver",
    "prefers-reduced-motion: reduce",
    "lt53-motion__connection-active-outer",
    "lt53-motion__connection-active-inner",
    "is-living-tree",
    "PLAY PATH",
    "PAUSE",
    "REPLAY",
    "SPEED",
  ]) assert.match(component, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(css, /\.lt53-motion__connection-skeleton\{[^}]*opacity:\.22/);
  assert.match(css, /\.lt53-motion__connection-memory\{[^}]*opacity:\.39/);
  assert.match(css, /\.lt53-motion__connection-active-outer\{/);
  assert.match(css, /\.lt53-motion__connection-active-inner\{/);
  assert.match(css, /\.lt53-motion\.is-living-tree\{/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("Lineage 53 V2 review remains an internal fidelity surface rather than an automatic V4 product adoption", async () => {
  const page = await readFile(new URL("app/design-lab/lineages/53/v2/page.tsx", root), "utf8");
  assert.match(page, /네이티브 React\/SVG로 재현/);
  assert.match(page, /원본 기준으로 직접 비교·검수/);
  assert.match(page, /PRODUCT BOUNDARY/);
  assert.match(page, /CAP-14/);
  assert.doesNotMatch(page, /canonical V4 adopted|PRODUCTION ADOPTED/i);
});
