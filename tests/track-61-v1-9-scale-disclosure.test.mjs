import assert from "node:assert/strict";
import test from "node:test";
import {
  discloseMoments,
  discloseBranches,
  buildStressMoments,
} from "../app/design-lab/lineages/61/61-v1-9/tree-disclosure.ts";

function flow(count, currentId) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ id: `m-${i}`, title: `Moment ${i}`, isCurrent: i === count - 1 });
  }
  if (currentId) {
    const cur = out.find((m) => m.id === currentId);
    if (cur) cur.isCurrent = true;
  }
  return out;
}

test("V1.9 scale: small flow (<= 12) shows every Moment", () => {
  for (const count of [1, 9, 12]) {
    const d = discloseMoments(flow(count));
    assert.equal(d.collapsed, false, `count=${count} must not collapse`);
    assert.equal(d.lead.length, count);
    assert.equal(d.hiddenCount, 0);
  }
});

test("V1.9 scale: desktop 30+ → lead 2 + Memory Cluster + tail 4", () => {
  const d = discloseMoments(flow(30), { isMobile: false });
  assert.equal(d.collapsed, true);
  assert.equal(d.lead.length, 2);
  assert.equal(d.tail.length, 4);
  assert.equal(d.hiddenCount, 24);
  assert.equal(d.collapsedMiddle.length, 24);
});

test("V1.9 scale: mobile 30+ → lead 1 + Memory Cluster + tail 4", () => {
  const d = discloseMoments(flow(30), { isMobile: true });
  assert.equal(d.collapsed, true);
  assert.equal(d.lead.length, 1);
  assert.equal(d.tail.length, 4);
  assert.equal(d.hiddenCount, 25);
});

test("V1.9 scale: expandedAll shows every Moment", () => {
  const d = discloseMoments(flow(30), { expandedAll: true });
  assert.equal(d.collapsed, false);
  assert.equal(d.lead.length, 30);
  assert.equal(d.hiddenCount, 0);
});

test("V1.9 scale: current Moment always stays visible (authoritative) even in the middle", () => {
  const moments = flow(30, "m-15");
  const d = discloseMoments(moments, { isMobile: false });
  const visible = new Set([...d.lead, ...d.tail].map((m) => m.id));
  assert.ok(visible.has("m-15"), "current middle Moment must stay visible");
});

test("V1.9 scale: 100-Moment stress fixture builds 100 items with last current", () => {
  const stress = buildStressMoments(100);
  assert.equal(stress.length, 100);
  assert.equal(stress[99].isCurrent, true);
  const d = discloseMoments(stress, { isMobile: false });
  assert.equal(d.collapsed, true);
  assert.equal(d.lead.length, 2);
  assert.equal(d.tail.length, 4);
  assert.equal(d.hiddenCount, 94);
  const visible = new Set([...d.lead, ...d.tail].map((m) => m.id));
  assert.ok(visible.has("stress-99"), "current tail Moment must stay visible");
});

test("V1.9 branch scaling: > 5 branches → early core + recent, past omitted", () => {
  const children = flow(8);
  const d = discloseBranches(children);
  assert.equal(d.collapsed, true);
  assert.equal(d.visible.length, 5);
  assert.equal(d.hiddenCount, 3);
  assert.equal(d.collapsedMiddle.length, 3);
  assert.deepEqual(
    d.visible.map((m) => m.id),
    ["m-0", "m-1", "m-5", "m-6", "m-7"],
  );
});

test("V1.9 branch scaling: <= 5 branches are all shown", () => {
  for (const count of [1, 4, 5]) {
    const d = discloseBranches(flow(count));
    assert.equal(d.collapsed, false, `count=${count} must not collapse`);
    assert.equal(d.visible.length, count);
    assert.equal(d.hiddenCount, 0);
  }
});

test("V1.9 branch scaling: showAllBranches reveals every branch", () => {
  const d = discloseBranches(flow(8), { showAllBranches: true });
  assert.equal(d.collapsed, false);
  assert.equal(d.visible.length, 8);
});
