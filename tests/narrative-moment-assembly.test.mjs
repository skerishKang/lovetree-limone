import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  deriveNarrativeMomentAssembly,
  editNarrativeMomentAssembly,
  setNarrativeMomentConfirmation,
} from "../lib/narrative-moment-assembly.ts";

const root = new URL("../", import.meta.url);
const sampleNarrative = "2026년 8월 2일 올림픽공원에서 민아와 지수랑 함께 공연 영상을 찍고 사진도 남겼다.";

test("CAP-12 deterministically derives inspectable Moment candidate fields while preserving the original narrative", () => {
  const assembly = deriveNarrativeMomentAssembly(sampleNarrative);

  assert.equal(assembly.originalNarrative, sampleNarrative);
  assert.equal(assembly.fields.capturedAtHint, "2026년 8월 2일");
  assert.equal(assembly.fields.placeHint, "올림픽공원");
  assert.deepEqual(assembly.fields.peopleHints, ["민아", "지수"]);
  assert.deepEqual(assembly.fields.mediaHints, ["photo", "video"]);
  assert.match(assembly.fields.summary, /2026년 8월 2일 올림픽공원/);
  assert.equal(assembly.confirmed, false);
  assert.equal(assembly.revision, 1);
});

test("missing narrative details remain explicitly unknown instead of being invented", () => {
  const assembly = deriveNarrativeMomentAssembly("그날 정말 좋았다.");

  assert.equal(assembly.fields.capturedAtHint, "");
  assert.equal(assembly.fields.placeHint, "");
  assert.deepEqual(assembly.fields.peopleHints, []);
  assert.deepEqual(assembly.fields.mediaHints, []);
  assert.equal(assembly.fields.summary, "그날 정말 좋았다");
});

test("draft edits never rewrite the preserved original narrative and invalidate prior confirmation", () => {
  const original = setNarrativeMomentConfirmation(deriveNarrativeMomentAssembly(sampleNarrative), true);
  const edited = editNarrativeMomentAssembly(original, {
    placeHint: "한강공원",
    peopleHints: ["민아"],
  });

  assert.equal(edited.originalNarrative, sampleNarrative);
  assert.equal(original.fields.placeHint, "올림픽공원");
  assert.deepEqual(original.fields.peopleHints, ["민아", "지수"]);
  assert.equal(edited.fields.placeHint, "한강공원");
  assert.deepEqual(edited.fields.peopleHints, ["민아"]);
  assert.equal(edited.confirmed, false);
  assert.equal(edited.revision, 3);
});

test("confirmation is explicit reversible prototype state", () => {
  const draft = deriveNarrativeMomentAssembly(sampleNarrative);
  const confirmed = setNarrativeMomentConfirmation(draft, true);
  const reopened = setNarrativeMomentConfirmation(confirmed, false);

  assert.equal(draft.confirmed, false);
  assert.equal(confirmed.confirmed, true);
  assert.equal(reopened.confirmed, false);
  assert.equal(reopened.originalNarrative, sampleNarrative);
  assert.equal(reopened.revision, 3);
});

test("CAP-12 route keeps derivation local and adds focus live-region and source-boundary contracts", async () => {
  const page = await readFile(
    new URL("app/design-lab/capabilities/narrative-assembly/page.tsx", root),
    "utf8",
  );

  assert.match(page, /deriveNarrativeMomentAssembly/);
  assert.match(page, /editNarrativeMomentAssembly/);
  assert.match(page, /setNarrativeMomentConfirmation/);
  assert.match(page, /assembly\.originalNarrative/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /CAP-12 · INTERNAL MECHANIC PROTOTYPE · ISSUE #107/);
  assert.match(page, /75,174 bytes/);
  assert.match(page, /e0c82fb5…03355e0/);
  assert.doesNotMatch(page, /fetch\(|\/api\/|firebase|signedUrl/i);
  assert.doesNotMatch(page, /수사|고소|기관 결정|증거 제출/);
});

test("CAP-12 mobile focus and reduced-motion contracts are explicit", async () => {
  const css = await readFile(
    new URL("app/styles/narrative-assembly-prototype.css", root),
    "utf8",
  );

  assert.match(css, /grid-template-columns:\s*minmax\(0, 0\.9fr\) minmax\(0, 1\.1fr\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.lt-narrative-assembly__shell\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration:\s*0\.001ms/);
  assert.match(css, /animation-duration:\s*0\.001ms/);
});
