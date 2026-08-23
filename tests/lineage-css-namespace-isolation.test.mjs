import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoCrossLineageNamespaceCollisions,
  checkRepositoryLineageCssNamespaceIsolation,
  findCrossLineageNamespaceCollisions,
  selectorPreludes,
  splitSelectorList,
} from "../scripts/check-lineage-css-namespace-isolation.mjs";

function style(lineage, suffix, cssText) {
  return {
    filePath: `app/styles/lineage-${lineage}-${suffix}.css`,
    cssText,
  };
}

test("CSS namespace guard: distinct Lineage-owned BEM roots pass", () => {
  const files = [
    style(52, "runner", ".lt-orbit-runner{} .lt-orbit-runner__mode{}"),
    style(67, "runner", ".lt67-source-runner{} .lt67-source-runner__mode{}"),
  ];
  assert.deepEqual(findCrossLineageNamespaceCollisions(files), []);
  assert.doesNotThrow(() => assertNoCrossLineageNamespaceCollisions(files));
});

test("CSS namespace guard: same root across multiple files of one Lineage is allowed", () => {
  const files = [
    style(57, "world", ".lt57-world{} .lt57-world__card{}"),
    style(57, "world-fixes", ".lt57-world__card{overflow:hidden} .lt57-world--compact{}"),
  ];
  assert.deepEqual(findCrossLineageNamespaceCollisions(files), []);
});

test("CSS namespace guard: unscoped shared BEM root claimed by two Lineages fails closed", () => {
  const files = [
    style(52, "source-runner", ".lt-orbit-runner{} .lt-orbit-runner__mode{}"),
    style(67, "source-runner", ".lt-orbit-runner__mode{white-space:nowrap}"),
  ];
  const collisions = findCrossLineageNamespaceCollisions(files);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].root, "lt-orbit-runner");
  assert.deepEqual(
    collisions[0].lineages.map(({ lineageId }) => lineageId),
    ["52", "67"],
  );
  assert.throws(
    () => assertNoCrossLineageNamespaceCollisions(files),
    /Global CSS namespace "\.lt-orbit-runner" is claimed by multiple Lineages/,
  );
});

test("CSS namespace guard: foreign shared selectors are allowed beneath a local Lineage scope", () => {
  const files = [
    style(52, "source-runner", ".lt-orbit-runner{} .lt-orbit-runner__mode{}"),
    style(
      67,
      "source-runner",
      ".lt67-source-runner.lt-orbit-runner{} .lt67-source-runner .lt-orbit-runner__mode{white-space:nowrap}",
    ),
  ];
  assert.deepEqual(findCrossLineageNamespaceCollisions(files), []);
});

test("CSS namespace guard: comma selector lists preserve independent ownership evidence", () => {
  const selectors = splitSelectorList(
    '.lt52-shell__a, .lt52-shell__b:is(.x,.y), [data-label="a,b"] .lt52-shell__c',
  );
  assert.deepEqual(selectors, [
    ".lt52-shell__a",
    ".lt52-shell__b:is(.x,.y)",
    '[data-label="a,b"] .lt52-shell__c',
  ]);

  const files = [
    style(52, "a", ".lt52-shell__a,.lt52-shell__b{}"),
    style(53, "a", ".lt52-shell__c,.lt53-shell__a{}"),
  ];
  const collisions = findCrossLineageNamespaceCollisions(files);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].root, "lt52-shell");
});

test("CSS namespace guard: comments cannot fabricate namespace ownership", () => {
  const files = [
    style(52, "a", ".lt52-shell{} .lt52-shell__item{}"),
    style(67, "a", "/* .lt52-shell__item{color:red} */ .lt67-shell{} .lt67-shell__item{}"),
  ];
  assert.deepEqual(findCrossLineageNamespaceCollisions(files), []);
});

test("CSS namespace guard: selectors nested in @media remain visible to the checker", () => {
  const css = `
    .lt52-shell { display: block; }
    @media (max-width: 600px) {
      .lt52-shell__item { display: grid; }
    }
  `;
  assert.ok(selectorPreludes(css).includes(".lt52-shell__item"));

  const files = [
    style(52, "a", css),
    style(67, "a", "@media (max-width:600px){.lt52-shell__item{display:none}}"),
  ];
  assert.equal(findCrossLineageNamespaceCollisions(files)[0].root, "lt52-shell");
});

test("CSS namespace guard: non-Lineage fixture paths fail closed", () => {
  assert.throws(
    () => findCrossLineageNamespaceCollisions([{ filePath: "app/styles/shared.css", cssText: ".x__y{}" }]),
    /Cannot infer Lineage id/,
  );
});

test("CSS namespace guard: current repository Lineage styles have isolated global ownership", async () => {
  const result = await checkRepositoryLineageCssNamespaceIsolation();
  assert.ok(result.filesChecked > 0, "expected at least one Lineage stylesheet");
  assert.deepEqual(result.collisions, []);
});
