import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_QUESTION_LENS,
  QUESTION_LENSES,
  QUESTION_LENS_MOMENTS,
  deriveQuestionLensView,
  parseQuestionLensState,
  projectMomentsForLens,
  serializeQuestionLensState,
} from "../lib/question-lens-prototype.ts";

const root = new URL("../", import.meta.url);

test("CAP-11 exposes four typed LoveTree question lenses over one canonical Moment dataset", () => {
  assert.equal(QUESTION_LENSES.length, 4);
  assert.deepEqual(QUESTION_LENSES.map((lens) => lens.id), ["first", "recent", "connections", "revisit"]);
  assert.equal(new Set(QUESTION_LENSES.map((lens) => lens.id)).size, 4);
  assert.equal(QUESTION_LENS_MOMENTS.length, 6);
  assert.equal(new Set(QUESTION_LENS_MOMENTS.map((moment) => moment.id)).size, 6);

  for (const lens of QUESTION_LENSES) {
    assert.ok(lens.question.length > 0);
    assert.ok(lens.interpretation.length > 0);
    assert.ok(lens.resultLabel.length > 0);
  }
});

test("each lens deterministically projects the same canonical records", () => {
  assert.deepEqual(projectMomentsForLens("first").map((moment) => moment.id), ["lens-01", "lens-02", "lens-03"]);
  assert.deepEqual(projectMomentsForLens("recent").map((moment) => moment.id), ["lens-05", "lens-06", "lens-04"]);
  assert.deepEqual(projectMomentsForLens("connections").map((moment) => moment.id), ["lens-05", "lens-02", "lens-04"]);
  assert.deepEqual(projectMomentsForLens("revisit").map((moment) => moment.id), ["lens-03", "lens-02", "lens-06"]);
});

test("derived view coordinates summary results selection and canonical timeline", () => {
  const connected = deriveQuestionLensView({ lens: "connections", selectedMomentId: "lens-02" });
  assert.equal(connected.lens.id, "connections");
  assert.equal(connected.selectedMomentId, "lens-02");
  assert.equal(connected.moments.length, 3);
  assert.equal(connected.timelineMomentIds.length, QUESTION_LENS_MOMENTS.length);
  assert.deepEqual(connected.timelineMomentIds, ["lens-01", "lens-02", "lens-03", "lens-04", "lens-05", "lens-06"]);
  assert.match(connected.primaryMetric, /links/);

  const invalidSelection = deriveQuestionLensView({ lens: "recent", selectedMomentId: "lens-01" });
  assert.equal(invalidSelection.selectedMomentId, "lens-05", "selection falls back inside the active projection");
});

test("question lens state round-trips through inspectable query parameters", () => {
  const query = serializeQuestionLensState({ lens: "connections", selectedMomentId: "lens-02" });
  assert.equal(query, "lens=connections&moment=lens-02");
  assert.deepEqual(parseQuestionLensState(`?${query}`), { lens: "connections", selectedMomentId: "lens-02" });

  assert.deepEqual(parseQuestionLensState("?lens=unknown&moment=missing"), { lens: DEFAULT_QUESTION_LENS, selectedMomentId: undefined });
  assert.deepEqual(parseQuestionLensState(""), { lens: DEFAULT_QUESTION_LENS, selectedMomentId: undefined });
});

test("desktop and mobile lens controls converge on one state update function", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/question-lens/page.tsx", root),
    "utf8",
  );

  const activations = page.match(/onClick=\{\(\) => activateLens\(lens\.id\)\}/g) ?? [];
  assert.equal(activations.length, 2, "desktop rail and mobile nav must share activateLens()");
  assert.match(page, /const activateLens = \(lens: QuestionLensId\)/);
  assert.match(page, /setState\(\{ lens \}\)/);
  assert.match(page, /deriveQuestionLensView\(state\)/);
  assert.match(page, /QUESTION_LENS_MOMENTS\.find/);
  assert.doesNotMatch(page, /router\.push|useRouter\(/, "lens change must preserve one shell rather than navigate routes");
});

test("URL state is restored and replaced from the same page state", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/question-lens/page.tsx", root),
    "utf8",
  );

  assert.match(page, /parseQuestionLensState\(window\.location\.search\)/);
  assert.match(page, /serializeQuestionLensState\(state\)/);
  assert.match(page, /window\.history\.replaceState/);
  assert.match(page, /if \(!hydrated\) return/);
  assert.doesNotMatch(page, /fetch\(|\/api\/|firebase|signedUrl/i);
});

test("CAP-11 prototype pins source provenance and remains explicitly non-product", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/question-lens/page.tsx", root),
    "utf8",
  );

  assert.match(page, /PROTOTYPE · NOT PRODUCT-READY/);
  assert.match(page, /CAP-11 #104/);
  assert.match(page, /67,735 bytes/);
  assert.match(page, /8192dbde…f4ab5b/);
  assert.doesNotMatch(page, /대표자|회사 전체|계약 충돌|준공확인서/);
});

test("mobile lens navigation, horizontal timeline, focus and reduced-motion contracts are explicit", async () => {
  const css = await readFile(new URL("app/styles/question-lens-prototype.css", root), "utf8");

  assert.match(css, /grid-template-columns:\s*270px minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.lt-question-lens__rail\s*\{\s*display:\s*none;/);
  assert.match(css, /\.lt-question-lens__mobile-nav\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(css, /\.lt-question-lens__timeline ol\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow-x:\s*auto;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration:\s*0\.001ms/);
  assert.match(css, /:focus-visible/);
});
