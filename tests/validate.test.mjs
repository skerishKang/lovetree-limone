import assert from "node:assert/strict";
import test from "node:test";
import { validate, VISIBILITY_VALUES, SOURCE_TYPE_VALUES } from "../core/runtime/server/api/validate.ts";

const COMMENT_RULES = {
  body: { kind: "string", required: true, trim: true, minLength: 1, maxLength: 1000 },
}

const TREE_RULES = {
  title: { kind: "string", required: true, trim: true, minLength: 1, maxLength: 120 },
  visibility: { kind: "string", trim: true, allowed: VISIBILITY_VALUES },
  keywords: { kind: "stringArray", maxItems: 20, maxItemLength: 40 },
  sourceUrl: { kind: "url", maxLength: 2048 },
}

test("invalid visibility rejected", () => {
  const result = validate({ title: "t", visibility: "secret" }, TREE_RULES);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /visibility/);
});

test("valid visibility accepted", () => {
  for (const v of VISIBILITY_VALUES) {
    const result = validate({ title: "t", visibility: v }, TREE_RULES);
    assert.equal(result.ok, true, `visibility ${v} should pass`);
  }
});

test("invalid keywords rejected (non-array)", () => {
  const result = validate({ title: "t", keywords: "fan" }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("invalid keywords rejected (object instead of array)", () => {
  const result = validate({ title: "t", keywords: { a: 1 } }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("invalid keywords rejected (non-string items)", () => {
  const result = validate({ title: "t", keywords: ["ok", 123] }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("keywords array length limit enforced", () => {
  const many = Array.from({ length: 21 }, (_, i) => `k${i}`);
  const result = validate({ title: "t", keywords: many }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("keyword item length limit enforced", () => {
  const result = validate({ title: "t", keywords: ["x".repeat(41)] }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("invalid URL rejected", () => {
  for (const bad of ["notaurl", "ftp://example.com/a", "javascript:alert(1)"]) {
    const result = validate({ title: "t", sourceUrl: bad }, TREE_RULES);
    assert.equal(result.ok, false, `URL ${bad} should be rejected`);
  }
});

test("valid http(s) URL accepted", () => {
  for (const good of ["https://example.com/a?b=1", "http://example.com"]) {
    const result = validate({ title: "t", sourceUrl: good }, TREE_RULES);
    assert.equal(result.ok, true, `URL ${good} should pass`);
  }
});

test("oversized comment rejected", () => {
  const result = validate({ body: "x".repeat(1001) }, COMMENT_RULES);
  assert.equal(result.ok, false);
});

test("empty comment rejected", () => {
  const result = validate({ body: "   " }, COMMENT_RULES);
  assert.equal(result.ok, false);
});

test("title is trimmed and required", () => {
  const ok = validate({ title: "  내 트리  " }, TREE_RULES);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.title, "내 트리");

  const missing = validate({ title: "" }, TREE_RULES);
  assert.equal(missing.ok, false);

  const blank = validate({ title: "   " }, TREE_RULES);
  assert.equal(blank.ok, false);
});

test("title maximum length enforced", () => {
  const result = validate({ title: "x".repeat(121) }, TREE_RULES);
  assert.equal(result.ok, false);
});

test("sourceType allowlist exposed values", () => {
  assert.ok(SOURCE_TYPE_VALUES.includes("youtube"));
  assert.ok(SOURCE_TYPE_VALUES.includes("book"));
});

test("unknown fields are ignored", () => {
  const result = validate({ title: "t", admin: true, __proto__: { x: 1 } }, TREE_RULES);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal("admin" in result.value, false);
});

test("non-object body rejected", () => {
  assert.equal(validate("text", TREE_RULES).ok, false);
  assert.equal(validate(42, TREE_RULES).ok, false);
  assert.equal(validate(null, TREE_RULES).ok, false);
  assert.equal(validate(undefined, TREE_RULES).ok, false);
  assert.equal(validate([1, 2], TREE_RULES).ok, false);
});
