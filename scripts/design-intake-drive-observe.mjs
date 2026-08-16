// design:intake:observe — run the read-only Drive source-freshness observer.
//
// Usage:
//   node --import tsx scripts/design-intake-drive-observe.mjs \
//     --config <observer-config.json> \
//     --mode fixture --fixture <provider-fixture.json> [--track <stableId>] \
//     [--json] [--out <file>]
//   node --import tsx scripts/design-intake-drive-observe.mjs \
//     --config <observer-config.json> --mode live [--track <stableId>] [--json]
//
// Modes:
//   fixture — offline deterministic transport (tests, CI contract runs). The
//             fixture holds raw provider records + streamed content chunks.
//   live    — real Drive API v3 read-only GET transport. Requires the future
//             trusted short-lived credential contract
//             (DESIGN_INTAKE_DRIVE_ACCESS_TOKEN via GitHub Actions OIDC →
//             Google WIF). Absent ⇒ LIVE_DISABLED, fail closed, never PASS.
//
// Exit codes (fail closed):
//   0 — every observation providerState SUCCESS + observationComplete.
//   1 — at least one degraded observation (INCOMPLETE/UNAVAILABLE/…).
//   2 — usage/parse error.
//   3 — LIVE_DISABLED (live mode without the credential contract).

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

import {
  allObservationsComplete,
  observeTracks,
  parseDriveObserverConfig,
  redactDeep,
  redactString,
} from "../lib/design-intake/drive-observer/index.ts";

function usage(message) {
  console.error(`FAIL usage: ${message}`);
  console.error(
    "usage: node --import tsx scripts/design-intake-drive-observe.mjs --config <config.json> " +
      "--mode fixture --fixture <provider.json> [--track <stableId>] [--json] [--out <file>]\n" +
      "       node --import tsx scripts/design-intake-drive-observe.mjs --config <config.json> --mode live [--track <stableId>] [--json]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const options = {};
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
  else if (arg === "--track") (options.tracks ??= []).push(next());
  else if (arg === "--json") options.json = true;
  else if (arg === "--out") options.out = next();
  else usage(`unknown argument ${arg}`);
}

if (!options.config) usage("--config is required");
if (options.mode !== "fixture" && options.mode !== "live") usage("--mode must be fixture or live");
if (options.mode === "fixture" && !options.fixture) usage("fixture mode requires --fixture");

let config;
let fixture;
try {
  config = parseDriveObserverConfig(JSON.parse(readFileSync(options.config, "utf8")));
  if (options.fixture !== undefined) {
    fixture = JSON.parse(readFileSync(options.fixture, "utf8"));
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

const observations = result.observations;

// Human-readable summary: stderr, so --json stdout stays machine-parseable.
const human = (line) => {
  if (options.json) console.error(line);
  else console.log(line);
};

for (const observation of observations) {
  const errors =
    observation.providerErrors.length > 0
      ? ` errors=[${observation.providerErrors.map((error) => `${error.stage}:${error.code}`).join(", ")}]`
      : "";
  human(
    `${observation.providerState.padEnd(17)} ${observation.trackRootIdentity} — ` +
      `paginationComplete=${observation.paginationComplete} observationComplete=${observation.observationComplete}${errors}`,
  );
}

const payload = JSON.stringify(redactDeep({ observations }), null, options.json ? 2 : 0);
if (options.out !== undefined) {
  writeFileSync(options.out, `${payload}\n`, "utf8");
} else if (options.json) {
  console.log(payload);
}

if (!allObservationsComplete(observations)) {
  console.error("Observation gate FAILED — at least one observation is degraded (fail closed).");
  process.exit(1);
}
human("All observations complete (SUCCESS).");
