// design:intake:freshness:live — live/observed Drive source freshness gate.
//
// Pipeline (Issue #173):
//   read-only Drive observation (fixture or live transport)
//     → normalized observation (fail-closed provider states)
//     → observationToDriveSourceState
//     → #171 pure resolver (reused UNCHANGED)
//     → PASS / FAIL / NON_PASS / UNKNOWN verdicts
//
// Usage:
//   node --import tsx scripts/design-intake-source-freshness-live.mjs \
//     --config <observer-config.json> \
//     --mode fixture --fixture <provider-fixture.json> \
//     [--manifests <dir>] [--track <stableId>] [--json]
//   node --import tsx scripts/design-intake-source-freshness-live.mjs \
//     --config <observer-config.json> --mode live [--manifests <dir>] [--track <stableId>]
//
// Exit codes (mirrors the #171 pure CLI, fail closed):
//   0 — no FAIL and no UNKNOWN verdict (NON_PASS pending states are expected
//       for non-executable candidates).
//   1 — at least one FAIL or UNKNOWN verdict (merge is blocked), or a
//       configured track has no manifest.
//   2 — usage/parse error.
//   3 — LIVE_DISABLED (live mode without the credential contract).
//
// A provider failure can NEVER print as PASS: degraded observations map to
// UNKNOWN with a mergeBlock before the resolver runs.

import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { resolveSourceFreshness } from "../lib/design-intake/source-freshness.ts";
import {
  observationToDriveSourceState,
  observeTracks,
  parseDriveObserverConfig,
  redactDeep,
  redactString,
} from "../lib/design-intake/drive-observer/index.ts";

function usage(message) {
  console.error(`FAIL usage: ${message}`);
  console.error(
    "usage: node --import tsx scripts/design-intake-source-freshness-live.mjs --config <observer-config.json> " +
      "--mode fixture --fixture <provider.json> [--manifests <dir>] [--track <stableId>] [--json]\n" +
      "       node --import tsx scripts/design-intake-source-freshness-live.mjs --config <observer-config.json> --mode live [--manifests <dir>] [--track <stableId>]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const options = { manifests: path.join(process.cwd(), "design-intake", "manifests") };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  const next = () => {
    if (i + 1 >= args.length) usage(`missing value for ${arg}`);
    i += 1;
    return args[i];
  };
  if (arg === "--config") options.config = next();
  else if (arg === "--mode") options.mode = next();
  else if (arg === "--fixture") options.fixture = next();
  else if (arg === "--manifests") options.manifests = next();
  else if (arg === "--track") (options.tracks ??= []).push(next());
  else if (arg === "--json") options.json = true;
  else usage(`unknown argument ${arg}`);
}

if (!options.config) usage("--config is required");
if (options.mode !== "fixture" && options.mode !== "live") usage("--mode must be fixture or live");
if (options.mode === "fixture" && !options.fixture) usage("fixture mode requires --fixture");

let config;
let fixture;
const manifestsByStableId = new Map();
try {
  config = parseDriveObserverConfig(JSON.parse(readFileSync(options.config, "utf8")));
  if (options.fixture !== undefined) {
    fixture = JSON.parse(readFileSync(options.fixture, "utf8"));
  }
  for (const file of readdirSync(options.manifests).filter((name) => name.endsWith(".json")).sort()) {
    const manifest = parseIntakeManifest(JSON.parse(readFileSync(path.join(options.manifests, file), "utf8")));
    manifestsByStableId.set(manifest.stableId, { manifest, file });
  }
} catch (error) {
  console.error(redactString(`FAIL parse: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(2);
}

const hasher = {
  create: () => {
    const digest = createHash("sha256");
    return {
      update: (chunk) => digest.update(chunk),
      digestHex: () => digest.digest("hex"),
    };
  },
};

const result = await observeTracks(config, {
  mode: options.mode,
  fixture,
  env: process.env,
  trackIds: options.tracks,
  hasher,
});

if (!result.availability.enabled) {
  // LIVE_DISABLED — fail closed. Never print anything that reads like PASS.
  console.error(result.availability.reason);
  process.exit(3);
}

let blocked = false;
const report = [];

for (const observation of result.observations) {
  const entry = manifestsByStableId.get(observation.trackRootIdentity);
  const providerLine =
    `  provider: ${observation.providerState} paginationComplete=${observation.paginationComplete} ` +
    `observationComplete=${observation.observationComplete}` +
    (observation.providerErrors.length > 0
      ? ` errors=[${observation.providerErrors.map((error) => `${error.stage}:${error.code}`).join(", ")}]`
      : "");
  if (!entry) {
    blocked = true;
    console.log(`FAIL    (no manifest) — ${observation.trackRootIdentity} [mergeBlock]`);
    console.log(redactString(providerLine));
    report.push({ stableId: observation.trackRootIdentity, status: "FAIL", reason: "NO_MANIFEST" });
    continue;
  }
  const driveState = observationToDriveSourceState(observation);
  const verdict = resolveSourceFreshness(entry.manifest, driveState);
  const marker = verdict.mergeBlock ? " [mergeBlock]" : "";
  console.log(
    `${verdict.status.padEnd(7)} ${entry.file} — ${verdict.reason}${marker} | ${verdict.summary}`,
  );
  console.log(redactString(providerLine));
  report.push({
    stableId: observation.trackRootIdentity,
    status: verdict.status,
    reason: verdict.reason,
    mergeBlock: verdict.mergeBlock,
  });
  if (verdict.status === "FAIL" || verdict.status === "UNKNOWN") {
    blocked = true;
  }
}

if (options.json) {
  console.log(JSON.stringify(redactDeep({ verdicts: report }), null, 2));
}

if (blocked) {
  console.error("Live freshness gate FAILED — at least one manifest is FAIL or UNKNOWN (merge blocked).");
  process.exit(1);
}
console.log("All manifests freshness-resolvable (no blocking verdicts).");
