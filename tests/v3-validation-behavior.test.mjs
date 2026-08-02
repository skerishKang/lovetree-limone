import assert from "node:assert/strict";
import test from "node:test";

// M3: runtime validation behavior tests.
// These execute the actual validation functions used by the V3 onboarding UI.
// If the runtime validation is removed or bypassed, these tests must fail.

const {
  parseTime,
  timeToSeconds,
  validateSourceInterval,
  validateConnectDraft,
  isCustomRelationLabelBlank,
} = await import("../app/components/v3/v3-validation.ts");

// ---- Source interval: MM:SS parsing ----
test("parseTime accepts MM:SS with seconds 00-59", () => {
  assert.deepEqual(parseTime("0:00"), { minutes: 0, seconds: 0 });
  assert.deepEqual(parseTime("1:30"), { minutes: 1, seconds: 30 });
  assert.deepEqual(parseTime("12:59"), { minutes: 12, seconds: 59 });
  assert.deepEqual(parseTime("99:00"), { minutes: 99, seconds: 0 });
});

test("parseTime rejects invalid seconds 60-99", () => {
  assert.equal(parseTime("1:60"), null, "01:60 must be rejected");
  assert.equal(parseTime("1:75"), null, "01:75 must be rejected");
  assert.equal(parseTime("0:99"), null, "00:99 must be rejected");
});

test("parseTime rejects malformed formats", () => {
  assert.equal(parseTime(""), null);
  assert.equal(parseTime("1:3"), null, "single-digit seconds rejected");
  assert.equal(parseTime("130"), null, "missing colon rejected");
  assert.equal(parseTime("a:30"), null);
  assert.equal(parseTime("1: 30"), null);
});

test("timeToSeconds converts minutes and seconds", () => {
  assert.equal(timeToSeconds({ minutes: 0, seconds: 0 }), 0);
  assert.equal(timeToSeconds({ minutes: 1, seconds: 30 }), 90);
  assert.equal(timeToSeconds({ minutes: 2, seconds: 5 }), 125);
});

// ---- Source interval: end-only and end-before-start ----
test("end-only interval is rejected", () => {
  const result = validateSourceInterval("", "0:30");
  assert.equal(result.valid, false);
  assert.ok(result.error, "error message present");
});

test("end-before-start interval is rejected", () => {
  const result = validateSourceInterval("1:00", "0:30");
  assert.equal(result.valid, false);
  assert.ok(result.error, "error message present");
});

test("invalid start or end values are rejected", () => {
  assert.equal(validateSourceInterval("1:75", "").valid, false);
  assert.equal(validateSourceInterval("1:00", "1:75").valid, false);
  assert.equal(validateSourceInterval("x", "1:30").valid, false);
});

test("valid intervals pass and empty intervals are allowed", () => {
  assert.equal(validateSourceInterval("", "").valid, true);
  assert.equal(validateSourceInterval("0:30", "").valid, true);
  assert.equal(validateSourceInterval("1:00", "1:30").valid, true);
  assert.equal(validateSourceInterval("1:00", "1:00").valid, true, "equal start/end allowed");
});

// ---- Connect draft: empty next Moment ----
test("empty next Moment is rejected by the primary connect action", () => {
  const base = {
    nextUrl: "",
    nextTitle: "",
    relationType: "follow-comment",
    relationLabel: "댓글을 따라갔어요",
  };
  assert.equal(validateConnectDraft(base).valid, false);
  assert.equal(validateConnectDraft({ ...base, nextUrl: "https://youtube.com/watch?v=x" }).valid, false);
  assert.equal(validateConnectDraft({ ...base, nextTitle: "제목" }).valid, false);
  assert.equal(validateConnectDraft({ ...base, nextUrl: "   ", nextTitle: "제목" }).valid, false);
  assert.equal(validateConnectDraft({ ...base, nextUrl: "https://youtube.com/watch?v=x", nextTitle: "  " }).valid, false);
});

test("valid next Moment passes for preset relations", () => {
  assert.equal(
    validateConnectDraft({
      nextUrl: "https://youtube.com/watch?v=nqofkzQD19E",
      nextTitle: "다음으로 이어진 무대",
      relationType: "follow-comment",
      relationLabel: "댓글을 따라갔어요",
    }).valid,
    true,
  );
});

// ---- Connect draft: custom relation label ----
test("blank, whitespace, placeholder, and preset-label custom relations are rejected", () => {
  const ok = {
    nextUrl: "https://youtube.com/watch?v=x",
    nextTitle: "제목",
  };
  assert.equal(isCustomRelationLabelBlank(""), true);
  assert.equal(isCustomRelationLabelBlank("   "), true);
  assert.equal(isCustomRelationLabelBlank("이어진 이유를 직접 적어 보세요"), true, "placeholder text rejected");
  assert.equal(isCustomRelationLabelBlank("직접 입력"), true, "preset label rejected");
  assert.equal(isCustomRelationLabelBlank("그날의 이유"), false);

  assert.equal(validateConnectDraft({ ...ok, relationType: "custom", relationLabel: "" }).valid, false);
  assert.equal(validateConnectDraft({ ...ok, relationType: "custom", relationLabel: " \t " }).valid, false);
  assert.equal(
    validateConnectDraft({ ...ok, relationType: "custom", relationLabel: "이어진 이유를 직접 적어 보세요" }).valid,
    false,
  );
  assert.equal(validateConnectDraft({ ...ok, relationType: "custom", relationLabel: "직접 입력" }).valid, false);
});

test("a real custom relation label passes", () => {
  assert.equal(
    validateConnectDraft({
      nextUrl: "https://youtube.com/watch?v=x",
      nextTitle: "제목",
      relationType: "custom",
      relationLabel: "팬아트를 보고 찾아갔어요",
    }).valid,
    true,
  );
});

// ---- Negative control reasoning ----
test("removing or bypassing runtime validation makes behavior tests fail", () => {
  // These assertions encode the exact runtime guarantees the UI depends on.
  // A validator that always returns valid would behave differently from the real
  // runtime validator on every invalid input, which is exactly what the rejection
  // tests above detect. If the runtime validation is removed or bypassed, the
  // rejection tests above fail.
  const alwaysValid = () => ({ valid: true, error: null });
  const invalidInputs = [
    () => validateSourceInterval("1:75", ""),
    () => validateSourceInterval("", "0:30"),
    () => validateSourceInterval("1:00", "0:30"),
    () =>
      validateConnectDraft({
        nextUrl: "",
        nextTitle: "",
        relationType: "follow-comment",
        relationLabel: "댓글을 따라갔어요",
      }),
    () =>
      validateConnectDraft({
        nextUrl: "https://youtube.com/watch?v=x",
        nextTitle: "제목",
        relationType: "custom",
        relationLabel: " ",
      }),
  ];
  for (const run of invalidInputs) {
    const real = run();
    const bypassed = alwaysValid();
    assert.notDeepEqual(
      real,
      bypassed,
      "real runtime validator must reject what an always-valid bypass would accept",
    );
    assert.equal(real.valid, false, "invalid input must be rejected by the runtime validator");
  }
});
