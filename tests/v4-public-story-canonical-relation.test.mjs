import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePublicStoryRelation,
  PUBLIC_STORY_GENERIC_RELATION,
} from "../app/components/v4/product/V4PublicStorySticky.tsx";

// Non-browser source-contract test for the V4 Public Story canonical WHY NEXT
// relation. It exercises the exact source authority (resolvePublicStoryRelation)
// that the product surface renders, proving the three canonical semantics
// required by issue #220 without driving a browser.

// A. root — no parentId renders no WHY NEXT relation element at all.
test("WHY NEXT — root moment without parentId renders no relation (A)", () => {
  const relation = resolvePublicStoryRelation({ parentId: null, connectionReason: null });
  assert.equal(relation.visible, false, "root moment with no parentId must not render a WHY NEXT relation");
});

// B. connected moment + stored reason — canonical stored value is shown verbatim.
test("WHY NEXT — connected moment with connectionReason shows stored value (B)", () => {
  const stored = "같은 무대 위에서 이어진 순간";
  const relation = resolvePublicStoryRelation({ parentId: "m-0", connectionReason: stored });
  assert.equal(relation.visible, true);
  assert.equal(relation.isGeneric, false, "an explicit reason must not be treated as the generic fallback");
  assert.equal(relation.reason, stored, "must display the canonical stored connectionReason");
});

// B (edge) — a stored reason that is only whitespace is not canonical and must fall through.
test("WHY NEXT — whitespace-only connectionReason is not canonical (B edge)", () => {
  const relation = resolvePublicStoryRelation({ parentId: "m-0", connectionReason: "   " });
  assert.equal(relation.visible, true);
  assert.equal(relation.isGeneric, true, "whitespace-only reason falls back to the generic relation");
  assert.equal(relation.reason, PUBLIC_STORY_GENERIC_RELATION);
});

// C. connected moment + missing reason — generic canonical fallback exists.
test("WHY NEXT — connected moment without reason falls back to generic (C)", () => {
  const relation = resolvePublicStoryRelation({ parentId: "m-0", connectionReason: "" });
  assert.equal(relation.visible, true);
  assert.equal(relation.isGeneric, true, "missing reason must use the generic fallback");
  assert.equal(relation.reason, PUBLIC_STORY_GENERIC_RELATION, "must fall back to the generic canonical relation");
  assert.equal(relation.reason, "이전 순간과 이어지는 관계");
});

// C (edge) — missing/undefined reason also falls back to the generic canonical relation.
test("WHY NEXT — undefined connectionReason falls back to generic (C edge)", () => {
  const relation = resolvePublicStoryRelation({ parentId: "m-0" });
  assert.equal(relation.visible, true);
  assert.equal(relation.isGeneric, true);
  assert.equal(relation.reason, PUBLIC_STORY_GENERIC_RELATION);
});
