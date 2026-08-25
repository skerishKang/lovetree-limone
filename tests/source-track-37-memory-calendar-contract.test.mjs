import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  TRACK37_SOURCE_BYTES,
  TRACK37_SOURCE_SHA256,
  track37AdjacentDateKey,
  track37CalendarDateKey,
  track37FlattenDays,
  track37ProjectCalendar,
} from "../lib/source-track-37/memory-calendar.ts";

const SOURCE_PATH = "reference/source-tracks-snapshot/37_기억달력_메모리패드/01_기억달력_뜯어쓰는메모리패드.html";

function moment(overrides = {}) {
  return {
    id: "m-1",
    treeId: "tree-37",
    title: "기억",
    memo: "",
    thumbnail: "https://example.test/poster.jpg",
    sourceType: "youtube",
    sourceUrl: "https://example.test/watch",
    emotionTags: [],
    timestamp: "",
    discoveryDate: "",
    sortOrder: 0,
    createdAt: "2026-12-31T23:59:00Z",
    ...overrides,
  };
}

test("Track37 exact source fingerprint is pinned", async () => {
  const bytes = await readFile(SOURCE_PATH);
  assert.equal(bytes.byteLength, TRACK37_SOURCE_BYTES);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), TRACK37_SOURCE_SHA256);
  assert.equal(TRACK37_SOURCE_SHA256, "63ab49382fe9798515bf91bf5683b9224d0902f6f7b041757d8ddcd3dd57750e");
});

test("calendar date comes only from explicit discoveryDate or timestamp", () => {
  assert.equal(track37CalendarDateKey(moment({ discoveryDate: "2026-08-03", timestamp: "2025-01-01" })), "2026-08-03");
  assert.equal(track37CalendarDateKey(moment({ discoveryDate: "", timestamp: "2026-08-04T08:20:00+09:00" })), "2026-08-04");
  assert.equal(track37CalendarDateKey(moment({ discoveryDate: "", timestamp: "" })), null);
  assert.equal(track37CalendarDateKey(moment({ discoveryDate: "August 5, 2026", timestamp: "" })), null);
  assert.equal(track37CalendarDateKey(moment({ discoveryDate: "2026-02-31", timestamp: "" })), null);
});

test("createdAt, sort order, current date and source demo labels never manufacture calendar truth", () => {
  const rows = [
    moment({ id: "created-only", discoveryDate: "", timestamp: "", createdAt: "2026-08-09T00:00:00Z", sortOrder: 37 }),
    moment({ id: "demo-like", discoveryDate: "2026 · AUG · MEMORY 01", timestamp: "", createdAt: null }),
  ];
  assert.deepEqual(track37ProjectCalendar(rows), []);
});

test("projection groups real Moments by stored date without mutating their media/content identity", () => {
  const first = moment({ id: "a", discoveryDate: "2026-08-01", title: "A", sourceUrl: "https://example.test/a" });
  const second = moment({ id: "b", discoveryDate: "2026-08-01T12:00:00Z", title: "B", sourceUrl: "https://example.test/b" });
  const third = moment({ id: "c", timestamp: "2026-09-02", discoveryDate: "", title: "C" });
  const months = track37ProjectCalendar([third, first, second]);
  const days = track37FlattenDays(months);

  assert.deepEqual(months.map((entry) => entry.key), ["2026-08", "2026-09"]);
  assert.equal(months[0].momentCount, 2);
  assert.deepEqual(days.map((entry) => entry.key), ["2026-08-01", "2026-09-02"]);
  assert.deepEqual(days[0].moments.map((entry) => entry.id), ["a", "b"]);
  assert.equal(days[0].moments[0], first);
  assert.equal(days[0].moments[1].sourceUrl, "https://example.test/b");
});

test("adjacent date navigation clamps to actual stored dates only", () => {
  const days = track37FlattenDays(track37ProjectCalendar([
    moment({ id: "a", discoveryDate: "2026-08-01" }),
    moment({ id: "b", discoveryDate: "2026-08-10" }),
    moment({ id: "c", discoveryDate: "2026-09-02" }),
  ]));
  assert.equal(track37AdjacentDateKey(days, "2026-08-01", 1), "2026-08-10");
  assert.equal(track37AdjacentDateKey(days, "2026-08-10", -1), "2026-08-01");
  assert.equal(track37AdjacentDateKey(days, "2026-09-02", 1), "2026-09-02");
  assert.equal(track37AdjacentDateKey(days, null, -1), "2026-09-02");
});

test("implementation boundary forbids source demo date semantics and shared-registry mutation", async () => {
  const component = await readFile("app/v4/trees/[id]/archive/calendar/Track37MemoryCalendar.tsx", "utf8");
  const projection = await readFile("lib/source-track-37/memory-calendar.ts", "utf8");
  const manifest = JSON.parse(await readFile("design-intake/source-track-37-memory-calendar-archive-donor.json", "utf8"));

  for (const forbidden of ["2026 · AUG · MEMORY", "anniversary", "returnDate", "seasonDate", "importanceDate"]) {
    assert.equal(component.includes(forbidden), false, `runtime must not contain ${forbidden}`);
    assert.equal(projection.includes(forbidden), false, `projection must not contain ${forbidden}`);
  }
  assert.equal(manifest.productDisposition, "USE_AS_VISUAL_FUNCTION_DONOR");
  assert.equal(manifest.nativeProof.newBackend, false);
  assert.equal(manifest.nativeProof.newDatabaseEntity, false);
  assert.equal(manifest.nativeProof.newApi, false);
  assert.equal(manifest.parallelSafety.sharedRegistryTouched, false);
  assert.equal(manifest.parallelSafety.sharedNavigationTouched, false);
  assert.equal(manifest.parallelSafety.pr191Touched, false);
});
