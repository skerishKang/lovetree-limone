import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { replaceTreeViewQuery } from "../lib/moment-url.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// ---- URL contract: the active view path is always preserved ----

test("tree selection keeps /trees/:id and adds ?moment", () => {
  const url = replaceTreeViewQuery("/trees/t1", new URLSearchParams(), (q) => q.set("moment", "m1"));
  assert.equal(url, "/trees/t1?moment=m1");
});

test("timeline selection keeps /trees/:id/timeline and adds ?moment", () => {
  const url = replaceTreeViewQuery("/trees/t1/timeline", new URLSearchParams(), (q) => q.set("moment", "m1"));
  assert.equal(url, "/trees/t1/timeline?moment=m1");
});

test("album selection keeps /trees/:id/album and adds ?moment", () => {
  const url = replaceTreeViewQuery("/trees/t1/album", new URLSearchParams(), (q) => q.set("moment", "m1"));
  assert.equal(url, "/trees/t1/album?moment=m1");
});

test("timeline deselection removes ?moment but keeps /timeline", () => {
  const url = replaceTreeViewQuery("/trees/t1/timeline", new URLSearchParams("moment=m1"), (q) => q.delete("moment"));
  assert.equal(url, "/trees/t1/timeline");
});

test("album invalid moment cleanup keeps /album", () => {
  const url = replaceTreeViewQuery("/trees/t1/album", new URLSearchParams("moment=gone"), (q) => q.delete("moment"));
  assert.equal(url, "/trees/t1/album");
});

test("highlight removal keeps the active subpath and the moment query", () => {
  const url = replaceTreeViewQuery(
    "/trees/t1/timeline",
    new URLSearchParams("moment=m1&highlight=m1"),
    (q) => q.delete("highlight")
  );
  assert.equal(url, "/trees/t1/timeline?moment=m1");
});

test("unrelated query parameters are preserved", () => {
  const url = replaceTreeViewQuery(
    "/trees/t1",
    new URLSearchParams("view=compact&moment=m1"),
    (q) => q.set("moment", "m2")
  );
  assert.equal(url, "/trees/t1?view=compact&moment=m2");
});

test("empty query produces a bare path", () => {
  const url = replaceTreeViewQuery("/trees/t1", new URLSearchParams(), () => {});
  assert.equal(url, "/trees/t1");
});

// ---- Structural wiring (multi-part contracts, not single-line greps) ----

test("all three views wire selection through useMomentUrlState with onSelect", () => {
  for (const file of [
    "app/trees/[id]/page.tsx",
    "app/trees/[id]/timeline/page.tsx",
    "app/trees/[id]/album/page.tsx",
  ]) {
    const page = read(file);
    assert.match(page, /useMomentUrlState\(/);
    assert.match(page, /onSelect: selectMoment/);
    assert.match(page, /handleSelectMoment\(/);
  }
});

test("ViewSwitcher preserves the selected moment across view links", () => {
  const switcher = read("app/components/ViewSwitcher.tsx");
  assert.match(switcher, /suffix = momentId \? `\?moment=\$\{encodeURIComponent\(momentId\)\}` : ""/);
  assert.match(switcher, /href={`\/trees\/\$\{encodedId\}\$\{view\.path\}\$\{suffix\}`}/);
});

test("the URL hook preserves the current pathname instead of rebuilding it from treeId", () => {
  const hook = read("lib/use-moment-url.ts");
  assert.match(hook, /usePathname\(\)/);
  // The path used for router.replace() must come from the live pathname,
  // never from treeId concatenation.
  assert.doesNotMatch(hook, /router\.replace\(`\/trees\/\$\{/);
  assert.doesNotMatch(hook, /`\/trees\/\$\{treeId\}/);
});
