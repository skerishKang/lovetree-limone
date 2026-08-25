import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifestPath = "design-intake/source-track-09-full-memory-summary-dashboard-mytree-donor.json";
const sourcePath = "reference/source-tracks-snapshot/09_전체기억_요약대시보드/01_전체기억_요약대시보드.html";
const overviewPath = "app/components/v4/product/V4FinalTreeSurface.tsx";
const overviewRoutePath = "app/trees/[id]/overview/page.tsx";

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const source = readFileSync(sourcePath);
const sourceText = source.toString("utf8");
const overview = readFileSync(overviewPath, "utf8");
const overviewRoute = readFileSync(overviewRoutePath, "utf8");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("Track09 source identity is pinned exactly", () => {
  assert.equal(manifest.masterRow, 47);
  assert.equal(manifest.productJob, "MYTREE");
  assert.equal(manifest.disposition, "USE_AS_VISUAL_FUNCTION_DONOR");
  assert.equal(manifest.source.repositorySnapshot, sourcePath);
  assert.equal(source.byteLength, 25265);
  assert.equal(manifest.source.bytes, source.byteLength);
  assert.equal(sha256(source), "ed7c42c5ccce92a1e6f5d7e986f3b061a59e29cca390aef6cf86b4d91d1e0b41");
  assert.equal(manifest.source.sha256, sha256(source));
});

test("Track09 donor reuses the existing MYTREE overview instead of creating another app", () => {
  assert.equal(manifest.baseImplementation.routeTemplate, "/trees/:treeId/overview");
  assert.equal(manifest.baseImplementation.canonicalHook, "useTreeMoments(treeId)");
  assert.equal(manifest.releaseBoundary.newMytreeApplication, false);
  assert.equal(manifest.releaseBoundary.newProductionRoute, false);
  assert.equal(manifest.releaseBoundary.defaultNavigationChanged, false);
  assert.match(overviewRoute, /V4FinalTreeSurface/);
  assert.match(overview, /function OverviewSurface/);
  assert.match(overview, /useTreeMoments/);
});

test("existing overview reads persisted Tree and Moment fields for bounded summaries", () => {
  for (const token of ["moments.length", "sourceUrl", "parentId", "emotionTags", "formatTreeDate", "tree.title"]) {
    assert.match(overview, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const allowed of ["Moment count", "sourceUrl-present media count", "parentId-present connection count", "first/latest Moment ordering from persisted timestamps"]) {
    assert.ok(manifest.canonicalDataBoundary.allowedSummaryDerivations.includes(allowed));
  }
});

test("source demo/static claims remain non-canonical", () => {
  for (const sourceClaim of ["93", "184일", "42%", "+ 8개", "시즌 완성까지 7개", "꽃망울", "300개", "91%", "qKkJ6YHLhak"]) {
    assert.ok(sourceText.includes(sourceClaim), `expected source fixture evidence: ${sourceClaim}`);
  }
  const blocked = manifest.canonicalDataBoundary.sourceDemoFactsNotPromoted.join("\n");
  for (const guard of ["93 videos", "184 days", "emotion percentages", "weekly +8", "Season completion", "300-Moment", "future Season prediction", "numeric action recommendation", "YouTube/video identities"]) {
    assert.ok(blocked.includes(guard), `missing non-promotion guard: ${guard}`);
  }
});

test("Track09 does not certify arbitrary presentation scores as product truth", () => {
  assert.match(overview, /pulse/);
  const excluded = manifest.canonicalDataBoundary.nonCanonicalPresentationMetricsExcluded;
  for (const item of [
    "V4FinalTreeSurface overview pulse/100",
    "importance score",
    "revisit count",
    "emotion score",
    "Season entity/state",
    "growth/health score",
    "future prediction score",
  ]) {
    assert.ok(excluded.includes(item));
  }
});

test("Track09 source interaction and responsive donor evidence exists", () => {
  assert.match(sourceText, /class="question active"/);
  assert.match(sourceText, /data-view="stand"/);
  assert.match(sourceText, /data-view="changed"/);
  assert.match(sourceText, /data-view="future"/);
  assert.match(sourceText, /data-view="next"/);
  assert.match(sourceText, /@media\(max-width:950px\)/);
  assert.match(sourceText, /@media\(max-width:590px\)/);
  assert.match(sourceText, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(sourceText, /button:focus-visible/);
});

test("release boundary leaves shared authority and backend untouched", () => {
  assert.deepEqual(
    {
      authChanged: manifest.releaseBoundary.authChanged,
      apiChanged: manifest.releaseBoundary.apiChanged,
      dbChanged: manifest.releaseBoundary.dbChanged,
      schemaChanged: manifest.releaseBoundary.schemaChanged,
      sharedFidelityRegistryTouched: manifest.releaseBoundary.sharedFidelityRegistryTouched,
      masterCoverageLedgerTouched: manifest.releaseBoundary.masterCoverageLedgerTouched,
      masterCoverageContractTouched: manifest.releaseBoundary.masterCoverageContractTouched,
      pr191Touched: manifest.releaseBoundary.pr191Touched,
    },
    {
      authChanged: false,
      apiChanged: false,
      dbChanged: false,
      schemaChanged: false,
      sharedFidelityRegistryTouched: false,
      masterCoverageLedgerTouched: false,
      masterCoverageContractTouched: false,
      pr191Touched: false,
    },
  );
});
