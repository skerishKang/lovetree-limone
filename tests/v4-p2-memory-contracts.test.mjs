import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeMemoryCreateInput,
  normalizeMemoryUpdateInput,
  parseVideoOffsetSeconds,
  validateMemoryDateCompatibility,
} from "../server/api/memory-contract.ts";
import { validate } from "../server/api/validate.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("video offsets are first-class with YouTube URL compatibility parsing", () => {
  assert.equal(parseVideoOffsetSeconds("https://www.youtube.com/watch?v=x&t=42s"), 42);
  assert.equal(parseVideoOffsetSeconds("https://www.youtube.com/watch?v=x&t=1m2s"), 62);
  assert.equal(parseVideoOffsetSeconds("https://youtu.be/x?start=90"), 90);
  assert.equal(parseVideoOffsetSeconds("https://example.com/video"), null);
  assert.equal(parseVideoOffsetSeconds("not-a-url"), null);
});

test("discoveryDate and legacy timestamp mirror safely during compatibility window", () => {
  assert.equal(validateMemoryDateCompatibility({ discoveryDate: "2026-08-09" }), null);
  assert.equal(validateMemoryDateCompatibility({ timestamp: "2026-08-09" }), null);
  assert.match(
    validateMemoryDateCompatibility({ timestamp: "2026-08-08", discoveryDate: "2026-08-09" }) || "",
    /must match/
  );
  assert.match(
    validateMemoryDateCompatibility({ discoveryDate: "2026-02-30" }) || "",
    /valid YYYY-MM-DD/
  );

  const fromNew = normalizeMemoryCreateInput({
    discoveryDate: "2026-08-09",
    connectionReason: "  이 무대를 보고 인터뷰를 찾아봤어요  ",
    sourceUrl: "https://www.youtube.com/watch?v=x&t=1m2s",
  });
  assert.equal(fromNew.discoveryDate, "2026-08-09");
  assert.equal(fromNew.timestamp, "2026-08-09");
  assert.equal(fromNew.connectionReason, "이 무대를 보고 인터뷰를 찾아봤어요");
  assert.equal(fromNew.videoOffsetSeconds, 62);

  const fromLegacy = normalizeMemoryCreateInput({ timestamp: "2026-08-08" });
  assert.equal(fromLegacy.discoveryDate, "2026-08-08");
  assert.equal(fromLegacy.timestamp, "2026-08-08");
});

test("P2 update mirrors date fields and can clear a connection reason", () => {
  const dateUpdate = normalizeMemoryUpdateInput({ discoveryDate: "2026-08-09" });
  assert.equal(dateUpdate.discoveryDate, "2026-08-09");
  assert.equal(dateUpdate.timestamp, "2026-08-09");

  const reasonUpdate = normalizeMemoryUpdateInput({ connectionReason: "   " });
  assert.equal(reasonUpdate.connectionReason, null);
});

test("explicitly nullable string rules preserve parentId null for relation removal", () => {
  const parsed = validate(
    { parentId: null },
    { parentId: { kind: "string", nullable: true, trim: true, maxLength: 100 } }
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.parentId, null);

  const rejected = validate(
    { parentId: null },
    { parentId: { kind: "string", trim: true, maxLength: 100 } }
  );
  assert.equal(rejected.ok, false);
});

test("P2 migration is additive and non-destructive", async () => {
  const migration = await read("drizzle/0003_peaceful_radioactive_man.sql");
  assert.match(migration, /ADD COLUMN "connection_reason" text/);
  assert.match(migration, /ADD COLUMN "discovery_date" date/);
  assert.match(migration, /ADD COLUMN "video_offset_seconds" integer/);
  assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN)|RENAME|DELETE\s+FROM|UPDATE\s+"?memories/i);
});

test("schema and all Memory write paths include the P2 fields", async () => {
  const schema = await read("db/schema.ts");
  const memories = await read("server/api/memories.ts");
  const trees = await read("server/api/trees.ts");
  for (const token of ["connectionReason", "discoveryDate", "videoOffsetSeconds"]) {
    assert.match(schema, new RegExp(token));
    assert.match(memories, new RegExp(token));
    assert.match(trees, new RegExp(token));
  }
  assert.match(memories, /serializeMemoryContract/);
  assert.match(trees, /serializeMemoryContract\(memoryRow\)/);
  assert.match(trees, /normalizeMemoryCreateInput\(memory\)/);
  assert.match(memories, /parentId: \{ kind: "string", nullable: true/);
  assert.match(trees, /parentId: \{ kind: "string", nullable: true/);
});

test("client Moment UX uses discoveryDate, connection reason and removable parent relations", async () => {
  const types = await read("lib/tree-types.ts");
  const hook = await read("lib/use-tree-moments.ts");
  const composer = await read("app/components/MomentComposerModal.tsx");
  const detail = await read("app/components/MomentDetailModal.tsx");
  const treePage = await read("app/trees/[id]/page.tsx");

  assert.match(types, /discoveryDate\?: string \| null/);
  assert.match(types, /connectionReason\?: string \| null/);
  assert.match(types, /videoOffsetSeconds\?: number \| null/);
  assert.match(hook, /payload\.discoveryDate/);
  assert.match(hook, /payload\.connectionReason/);
  assert.match(hook, /payload\.parentId = input\.parentId \|\| null/);
  assert.match(hook, /videoOffsetSecondsFromUrl/);
  assert.match(composer, /왜 이 순간에서 이어졌나요\?/);
  assert.match(composer, /discoveryDate: form\.discoveryDate/);
  assert.match(detail, /parentId: form\.parentId \|\| null/);
  assert.match(detail, /moment\.connectionReason/);
  assert.match(detail, /memoryDiscoveryDate\(moment\)/);
  assert.match(treePage, /memoryDiscoveryDate\(memory\)/);
});
