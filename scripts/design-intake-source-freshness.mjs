// design:intake:freshness — resolve Design Source Freshness for every manifest.
//
// Usage:
//   node scripts/design-intake-source-freshness.mjs [drive-state.json]
//
// The resolver is PURE: it never touches Google Drive / WIF / service
// accounts / network. The Drive source state must be supplied as a JSON file
// mapping manifest stableId -> { available, incomplete?, note?, files[] }.
// Manifests without an entry are treated as Drive-unavailable and fail closed
// to UNKNOWN.
//
// Exit codes:
//   0 — no FAIL and no UNKNOWN verdict (NON_PASS pending states are reported
//       but are expected for non-executable candidates).
//   1 — at least one FAIL or UNKNOWN verdict (merge is blocked).
//   2 — usage/parse error (no manifests or unreadable drive state).

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { resolveSourceFreshness } from "../lib/design-intake/source-freshness.ts";

const manifestDir = path.join(process.cwd(), "design-intake", "manifests");
const driveStatePath = process.argv[2];

let driveStates = {};
if (driveStatePath) {
  try {
    const raw = JSON.parse(readFileSync(driveStatePath, "utf8"));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      console.error(`FAIL drive-state ${driveStatePath}: expected an object mapping stableId -> DriveSourceState`);
      process.exit(2);
    }
    driveStates = raw;
  } catch (error) {
    console.error(`FAIL drive-state ${driveStatePath}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
} else {
  console.error("No drive-state file given — all manifests will resolve UNKNOWN (fail closed).");
}

const files = readdirSync(manifestDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.error(`No manifest files found under design-intake/manifests/`);
  process.exit(2);
}

let blocked = false;

for (const file of files) {
  let manifest;
  try {
    manifest = parseIntakeManifest(
      JSON.parse(readFileSync(path.join(manifestDir, file), "utf8")),
    );
  } catch (error) {
    blocked = true;
    console.error(`FAIL ${file}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  const drive =
    driveStates[manifest.stableId] ??
    { available: false, note: "no drive-state entry — treated as unavailable" };
  const verdict = resolveSourceFreshness(manifest, drive);

  const marker = verdict.mergeBlock ? " [mergeBlock]" : "";
  console.log(
    `${verdict.status.padEnd(7)} ${file} — ${verdict.reason}${marker} | ${verdict.summary}`,
  );
  if (verdict.status === "FAIL" || verdict.status === "UNKNOWN") {
    blocked = true;
  }
}

if (blocked) {
  console.error("Freshness gate FAILED — at least one manifest is FAIL or UNKNOWN (merge blocked).");
  process.exit(1);
}
console.log("All manifests freshness-resolvable (no blocking verdicts).");
