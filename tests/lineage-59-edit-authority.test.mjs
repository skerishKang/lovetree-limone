import assert from "node:assert/strict";
import test from "node:test";

import { openEdit, closeEdit, updateEditField, getEditData, applyEditData } from "../lib/lineage-59/edit-authority.ts";

const MOMENT = {
  title: "Test Moment",
  body: "A body text",
  primaryEmotion: "궁금함",
  keywords: ["test", "moment"],
  link: { url: "https://example.com", title: "Example" },
  whyNext: "Because it matters",
};

test("edit-authority openEdit creates fields", () => {
  const e = openEdit("m1", MOMENT);
  assert.equal(e.active, true);
  assert.equal(e.momentId, "m1");
  assert.ok(e.fields.length >= 7);
  assert.equal(e.dirty, false);
});

test("edit-authority closeEdit resets", () => {
  const e = closeEdit(openEdit("m1", MOMENT));
  assert.equal(e.active, false);
  assert.equal(e.momentId, null);
});

test("edit-authority updateEditField marks dirty", () => {
  const e = updateEditField(openEdit("m1", MOMENT), "title", "New Title");
  assert.equal(e.dirty, true);
  const titleField = e.fields.find((f) => f.key === "title");
  assert.equal(titleField?.value, "New Title");
});

test("edit-authority getEditData returns the combined data", () => {
  const e = openEdit("m1", MOMENT);
  const data = getEditData(e);
  assert.equal(data.title, "Test Moment");
  assert.equal(data.body, "A body text");
});

test("edit-authority applyEditData preserves ID and provenance", () => {
  const result = applyEditData(MOMENT, { title: "Updated" });
  assert.equal(result.title, "Updated");
  assert.equal(result.body, "A body text");
});