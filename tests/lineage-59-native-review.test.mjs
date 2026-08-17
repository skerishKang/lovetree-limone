import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DESIGN_LINEAGES, validateDesignLineages } from "../lib/design-lineages.ts";
import { LINEAGE_59_SOURCE, LINEAGE_59_V5_REVIEW_LABEL } from "../lib/lineage-59/lineage-59-source.ts";

test("Lineage 59 V5 provenance pins to the V5 Drive source", () => {
  assert.equal(LINEAGE_59_SOURCE.lineageId, "lt-59-living-memory-book");
  assert.equal(LINEAGE_59_SOURCE.revisionId, "59-v5-living-memory-book");
  assert.equal(LINEAGE_59_SOURCE.candidateId, "lineage:59-v5-living-memory-book");
  assert.equal(LINEAGE_59_SOURCE.sourceFile, "현재후보.html");
  assert.equal(LINEAGE_59_SOURCE.sourceBytes, 17_192_064);
  assert.equal(
    LINEAGE_59_SOURCE.sourceSha256,
    "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71",
  );
  assert.equal(LINEAGE_59_SOURCE.runnerRoute, "/design-lab/lineages/59/v5");
  assert.equal(LINEAGE_59_SOURCE.implementationMode, "native-react-living-memory-book");
  assert.equal(LINEAGE_59_V5_REVIEW_LABEL, "NATIVE FIDELITY REVIEW — LIVING MEMORY BOOK V5");
});

test("Lineage 59 is registered as an active lineage with V5 candidate", () => {
  const problems = validateDesignLineages();
  assert.deepEqual(problems, []);
  const lineage = DESIGN_LINEAGES.find((entry) => entry.id === "lt-59-living-memory-book");
  assert.ok(lineage);
  assert.equal(lineage.number, 59);
  assert.equal(lineage.status, "active");
  assert.equal(lineage.revisions.length, 1);
  const v5 = lineage.revisions[0];
  assert.equal(v5.id, "59-v5-living-memory-book");
  assert.equal(v5.decision, "candidate");
  assert.equal(v5.executable, true);
  assert.equal(v5.route, "/design-lab/lineages/59/v5");
});

test("Lineage 59 route page exists", async () => {
  const page = await readFile(new URL("../app/design-lab/lineages/59/v5/page.tsx", import.meta.url), "utf-8");
  assert.ok(page.includes("LivingMemoryBookV5"));
  assert.ok(page.includes("LINEAGE_59_V5_REVIEW_LABEL"));
  assert.ok(page.includes("/design-lab"));
});

test("Lineage 59 CSS file exists", async () => {
  const css = await readFile(new URL("../app/styles/lineage-59-living-memory-book.css", import.meta.url), "utf-8");
  assert.ok(css.includes("lt59-book"));
  assert.ok(css.includes("lt59-overlay"));
  assert.ok(css.includes("lt59-edit"));
  assert.ok(css.includes("lt59-branch"));
});