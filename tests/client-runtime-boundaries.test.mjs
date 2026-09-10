import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildApiHeaders } from "../lib/api.ts";
import { selectTreeMoments } from "../lib/moment-model.ts";

test("api headers preserve standard HeadersInit and bind authorization", () => {
  const supplied = new Headers([["x-trace", "abc"], ["content-type", "text/custom"]]);
  const headers = buildApiHeaders({ headers: supplied, body: "plain text" }, "bound-token");

  assert.equal(headers.get("x-trace"), "abc");
  assert.equal(headers.get("content-type"), "text/custom");
  assert.equal(headers.get("authorization"), "Bearer bound-token");
});

test("api headers add JSON content type only for JSON string bodies", () => {
  const jsonHeaders = buildApiHeaders({ headers: [["x-mode", "json"]], body: JSON.stringify({ ok: true }) });
  assert.equal(jsonHeaders.get("x-mode"), "json");
  assert.equal(jsonHeaders.get("content-type"), "application/json");

  const textHeaders = buildApiHeaders({ body: "hello" });
  assert.equal(textHeaders.has("content-type"), false);

  const form = new FormData();
  form.set("file", "value");
  const formHeaders = buildApiHeaders({ body: form });
  assert.equal(formHeaders.has("content-type"), false);
});

test("Tree projection reuses one lookup Map for the whole projection pass", () => {
  const moments = [
    { id: "a", treeId: "t", ownerId: "o", parentId: null, connectionReason: null, title: "A", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-01", discoveryDate: "2026-01-01", videoOffsetSeconds: null, sortOrder: 1, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: null, updatedAt: null },
    { id: "b", treeId: "t", ownerId: "o", parentId: "a", connectionReason: "next", title: "B", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-02", discoveryDate: "2026-01-02", videoOffsetSeconds: null, sortOrder: 2, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: null, updatedAt: null },
    { id: "c", treeId: "t", ownerId: "o", parentId: "b", connectionReason: "next", title: "C", memo: "", artist: "", source: "", sourceUrl: "", sourceType: "youtube", thumbnail: "", emotionTags: [], timestamp: "2026-01-03", discoveryDate: "2026-01-03", videoOffsetSeconds: null, sortOrder: 3, visibility: "public", channelId: null, channelName: null, channelUrl: null, createdAt: null, updatedAt: null },
  ];

  const NativeMap = globalThis.Map;
  let constructions = 0;
  globalThis.Map = class CountingMap extends NativeMap {
    constructor(...args) {
      constructions += 1;
      super(...args);
    }
  };

  try {
    const projected = selectTreeMoments(moments);
    assert.deepEqual(projected.map((moment) => moment.depth), [0, 1, 2]);
    assert.equal(constructions, 1);
  } finally {
    globalThis.Map = NativeMap;
  }
});

test("Tree refresh invalidates stale request generations before state commits", async () => {
  const source = await readFile(new URL("../lib/use-tree-moments.ts", import.meta.url), "utf8");

  assert.match(source, /const refreshGenerationRef = useRef\(0\)/);
  assert.match(source, /const generation = \+\+refreshGenerationRef\.current/);
  assert.match(source, /const isCurrent = \(\) => generation === refreshGenerationRef\.current/);
  assert.match(source, /if \(!isCurrent\(\)\) return;/);
  assert.match(source, /if \(isCurrent\(\)\) setLoading\(false\)/);
  assert.match(source, /refreshGenerationRef\.current \+= 1/);
});
