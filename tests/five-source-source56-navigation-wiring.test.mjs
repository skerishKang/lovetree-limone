import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/trees/[id]/relationships/page.tsx", "utf8");

test("Source56 inspector exposes a Source56-local outbound hook to every sibling Five-Source view", () => {
  assert.match(route, /className=\{styles\.crossSource\} aria-label="이 Moment를 다른 보기로 열기"/);
  // Source57 (memory card) carries the same ?moment= context.
  assert.match(route, /\/trees\/\$\{encodedTreeId\}\$\{momentSuffix\}/);
  // Source58 board.
  assert.match(route, /\/trees\/\$\{encodedTreeId\}\/board\$\{momentSuffix\}/);
  // Source60 cluster exploration.
  assert.match(route, /\/trees\/\$\{encodedTreeId\}\/explore\$\{momentSuffix\}/);
  // Source64 portal return.
  assert.match(route, /\/trees\/\$\{encodedTreeId\}\/portal\$\{momentSuffix\}/);
});

test("Source56 outbound hooks preserve the selected Moment context (?moment=)", () => {
  assert.match(
    route,
    /const momentSuffix = selectedMomentId \? `\?moment=\$\{encodeURIComponent\(selectedMomentId\)\}` : "";/,
  );
});

test("Source56 restores scroll/selection continuity for an inbound ?moment= from another source", () => {
  // The selected node is addressable for scroll-into-view restoration.
  assert.match(route, /data-network-moment-id=\{node\.id\}/);
  assert.match(
    route,
    /worldRef\.current\?\.querySelector<HTMLElement>\([^)]*`\[data-network-moment-id="\$\{selectedMomentId\}"\]`/,
  );
  assert.match(route, /scrollIntoView\(\{ block: "center", inline: "center", behavior: "auto" \}\)/);
});

test("Source56 still owns the canonical relationship mode and uses canonical Moment truth", () => {
  assert.match(route, /data-mvp-source="56"/);
  assert.match(route, /ViewSwitcher treeId=\{treeId\} active="relationships" momentId=\{selectedMomentId\}/);
  assert.match(route, /parentId: moment\.parentId/);
  assert.match(route, /connectionReason: moment\.connectionReason/);
});

test("Source56 wiring adds no relation persistence, DB write, or new relation entity", () => {
  const durable = /\b(?:fetch|apiFetch)\s*\(|\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']|\b(?:prisma|drizzle|neon|firebase|supabase)\b|SOURCE56_MOMENTS|SOURCE56_CONNECTIONS|deriveSource56PathFamilies/iu;
  assert.doesNotMatch(route, durable);
});
