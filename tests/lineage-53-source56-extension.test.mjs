import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOURCE56_AUTHORITY,
  SOURCE56_CONNECTIONS,
  SOURCE56_MOMENTS,
  SOURCE56_PRIMARY_PATH_COUNTS,
  deriveSource56PathFamilies,
} from "../lib/lineage-53-source56.ts";

const SOURCE_PATH = "old/reference/source-tracks-snapshot/56_세로형_모먼트관계망_전체조망/후보_버전1.2_세로형_모먼트관계망_전체조망.html";
const COMPONENT_PATH = "app/design-lab/lineages/53/53-v3-vertical-network-overview/Lineage53VerticalNetworkOverview.tsx";
const PAGE_PATH = "app/design-lab/lineages/53/53-v3-vertical-network-overview/page.tsx";
const MANIFEST_PATH = "design-intake/source-56-lineage53-extension.json";

 test("Source56 V1.2 source snapshot is pinned without source runtime execution", async () => {
  const source = await readFile(SOURCE_PATH);
  assert.equal(source.length, SOURCE56_AUTHORITY.bytes);
  assert.equal(createHash("sha256").update(source).digest("hex"), SOURCE56_AUTHORITY.sha256);
});

test("Source56 remains a bounded Lineage53 extension and never Lineage56", async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  assert.equal(SOURCE56_AUTHORITY.repositoryFamily, "lt-53-emotional-path-replay");
  assert.equal(SOURCE56_AUTHORITY.targetRoute, "/design-lab/lineages/53/53-v3-vertical-network-overview");
  assert.equal(manifest.lineageNumber, 53);
  assert.equal(manifest.newLineage, false);
  assert.equal(manifest.selfVisualPassClaim, false);
  assert.ok(manifest.forbidden.includes("Lineage56 mutation"));
  assert.ok(manifest.forbidden.includes("Lineage53 V2 overwrite"));
  assert.ok(manifest.forbidden.includes("/v4 adoption"));
});

test("canonical proof data stays Moment + Connection while Source56 multi-primary hierarchy is VIEW_DERIVED", () => {
  assert.equal(SOURCE56_MOMENTS.length, 133);
  assert.equal(SOURCE56_CONNECTIONS.length, 132);
  assert.equal(SOURCE56_MOMENTS.filter((moment) => moment.first).length, 1);
  for (const moment of SOURCE56_MOMENTS) {
    assert.equal("pathFamily" in moment, false);
    assert.equal("primaryPath" in moment, false);
    assert.equal("hub" in moment, false);
    assert.equal("cluster" in moment, false);
  }
  for (const edge of SOURCE56_CONNECTIONS) {
    assert.equal("pathFamily" in edge, false);
    assert.equal("primaryPath" in edge, false);
    assert.equal("hub" in edge, false);
    assert.equal("cluster" in edge, false);
  }

  const families = deriveSource56PathFamilies();
  assert.equal(families.length, 6);
  assert.deepEqual(families.map((family) => family.primaryPaths.length), [...SOURCE56_PRIMARY_PATH_COUNTS]);
  families.forEach((family, familyIndex) => {
    const expectedPrimary = SOURCE56_PRIMARY_PATH_COUNTS[familyIndex];
    assert.equal(family.primaryMomentIds.length, expectedPrimary * 4);
    assert.equal(family.secondaryMomentIds.length, expectedPrimary * 2);
    assert.ok(family.primaryPaths.every((path) => path.momentIds.length === 4));
    assert.ok(family.primaryPaths.every((path) => path.secondaryBranches.length === 1));
    assert.ok(family.primaryPaths.every((path) => path.secondaryBranches[0].momentIds.length === 2));
  });
});

test("initial state is true OVERVIEW; First reveal is user-triggered and first viewport starts with network", async () => {
  const component = await readFile(COMPONENT_PATH, "utf8");
  const page = await readFile(PAGE_PATH, "utf8");
  assert.match(component, /useState<number \| null>\(null\)/);
  assert.match(component, /useState\(false\)[^\n]*;\n\s*const \[listOpen/);
  assert.match(component, /OVERVIEW · First Moment를 선택하면 주요 성장 경로가 펼쳐집니다/);
  assert.match(component, /First Moment → 01·02·03의 복수 Primary path/);
  assert.ok(page.indexOf("<Lineage53VerticalNetworkOverview />") < page.indexOf("Source56 implementation diagnostics"));
  assert.match(page, /<details/);
});

test("branch-choice adapter reuses P3/P4 and creates no source runner or persistence", async () => {
  const code = `${await readFile(COMPONENT_PATH, "utf8")}\n${await readFile(PAGE_PATH, "utf8")}`;
  assert.match(code, /design-runtime\/transport/);
  assert.match(code, /design-runtime\/selection/);
  assert.match(code, /canAutoAdvance/);
  assert.match(code, /stepSelectionIndex/);
  assert.match(code, /Branch choice/);
  assert.match(code, /choosePrimary/);
  assert.match(code, /chooseSecondary/);
  assert.match(code, /secondaryBranches/);
  assert.doesNotMatch(code, /fetch\s*\(/);
  assert.doesNotMatch(code, /\/api\//);
  assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(code, /iframe|dangerouslySetInnerHTML/);
  assert.doesNotMatch(code, /<canvas/);
  assert.doesNotMatch(code, /후보_버전1\.2_세로형_모먼트관계망_전체조망\.html[^\n]*src=/);
});
