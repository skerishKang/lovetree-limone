import assert from "node:assert/strict";
import test from "node:test";

import { applyMomentMediaUpdate } from "../lib/moment-media-update.ts";
import {
  normalizeMemoryCreateInput,
  normalizeMemoryUpdateInput,
} from "../core/runtime/server/api/memory-contract.ts";

test("omitted sourceUrl leaves media fields untouched", () => {
  const payload = { title: "same" };
  assert.deepEqual(applyMomentMediaUpdate(payload, {}), { title: "same" });
  assert.deepEqual(normalizeMemoryUpdateInput({ title: "same" }), { title: "same" });
});

test("explicit sourceUrl clear removes stale thumbnail and offset", () => {
  const payload = {};
  applyMomentMediaUpdate(payload, { sourceUrl: "" });
  assert.deepEqual(payload, {
    sourceUrl: "",
    thumbnail: "",
    videoOffsetSeconds: null,
  });

  assert.deepEqual(normalizeMemoryUpdateInput({ sourceUrl: "" }), {
    sourceUrl: "",
    thumbnail: "",
    videoOffsetSeconds: null,
  });
});

test("replacing with YouTube URL recomputes client-derived thumbnail and offset", () => {
  const payload = {};
  applyMomentMediaUpdate(payload, {
    sourceUrl: " https://youtu.be/abcdefghi?t=1m30s ",
  });
  assert.deepEqual(payload, {
    sourceUrl: "https://youtu.be/abcdefghi?t=1m30s",
    thumbnail: "https://img.youtube.com/vi/abcdefghi/hqdefault.jpg",
    videoOffsetSeconds: 90,
  });
});

test("replacing with ordinary URL invalidates stale derived media metadata", () => {
  const payload = {};
  applyMomentMediaUpdate(payload, { sourceUrl: "https://example.com/new" });
  assert.deepEqual(payload, {
    sourceUrl: "https://example.com/new",
    thumbnail: "",
    videoOffsetSeconds: null,
  });

  assert.deepEqual(normalizeMemoryUpdateInput({ sourceUrl: "https://example.com/new" }), {
    sourceUrl: "https://example.com/new",
    thumbnail: "",
    videoOffsetSeconds: null,
  });
});

test("explicit replacement thumbnail and offset are preserved", () => {
  const payload = {};
  applyMomentMediaUpdate(payload, {
    sourceUrl: "https://example.com/new",
    thumbnail: " https://example.com/thumb.jpg ",
    videoOffsetSeconds: 42,
  });
  assert.deepEqual(payload, {
    sourceUrl: "https://example.com/new",
    thumbnail: "https://example.com/thumb.jpg",
    videoOffsetSeconds: 42,
  });

  assert.deepEqual(normalizeMemoryUpdateInput({
    sourceUrl: "https://example.com/new",
    thumbnail: "https://example.com/thumb.jpg",
    videoOffsetSeconds: 42,
  }), {
    sourceUrl: "https://example.com/new",
    thumbnail: "https://example.com/thumb.jpg",
    videoOffsetSeconds: 42,
  });
});

test("server clear wins over contradictory stale derived values", () => {
  assert.deepEqual(normalizeMemoryUpdateInput({
    sourceUrl: "",
    thumbnail: "https://example.com/stale.jpg",
    videoOffsetSeconds: 77,
  }), {
    sourceUrl: "",
    thumbnail: "",
    videoOffsetSeconds: null,
  });
});

test("create normalization contract is unchanged", () => {
  assert.deepEqual(normalizeMemoryCreateInput({
    sourceUrl: "https://youtu.be/abcdefghi?t=30",
    thumbnail: "https://example.com/create-thumb.jpg",
  }), {
    sourceUrl: "https://youtu.be/abcdefghi?t=30",
    thumbnail: "https://example.com/create-thumb.jpg",
    timestamp: "",
    discoveryDate: null,
    connectionReason: null,
    videoOffsetSeconds: 30,
  });
});
