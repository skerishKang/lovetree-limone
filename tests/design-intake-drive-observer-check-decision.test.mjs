// Issue #173 / PR #243 — shadow decision layer: GitHub check decision builder.
//
// End-to-end (offline) pipeline tests:
//   fixture provider → observeDriveTrack → DriveObservation
//     → buildSourceFreshnessCheckDecision (observationToDriveSourceState
//       + #171 resolver + race guard + applicability)
//     → deterministic name/status/conclusion/summary/details/headSha/blocking.
//
// No network, no Drive mutation, no GitHub mutation.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import {
  buildSourceFreshnessCheckDecision,
  DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
  isSourceFreshnessApplicable,
  observeDriveTrack,
  parseDriveObserverConfig,
} from "../lib/design-intake/drive-observer/index.ts";

const repoRoot = process.cwd();
const FIXTURES = path.join(repoRoot, "tests", "fixtures", "source-freshness");
const OBSERVER_FIXTURES = path.join(FIXTURES, "observer");
const MANIFEST_FIXTURES = path.join(FIXTURES, "manifests");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const hasher = {
  create: () => {
    const digest = createHash("sha256");
    return { update: (chunk) => digest.update(chunk), digestHex: () => digest.digest("hex") };
  },
};

const observerConfig = parseDriveObserverConfig(readJson(path.join(OBSERVER_FIXTURES, "observer-config.json")));

function trackConfig(stableId, overrides = {}) {
  const track = observerConfig.tracks.find((entry) => entry.stableId === stableId);
  if (!track) throw new Error(`no fixture config track for ${stableId}`);
  return { ...track, ...overrides };
}

const HEAD = (c) => c.repeat(40);

/**
 * Observe + build a check decision for one acceptance case.
 */
async function decisionCase(
  manifestName,
  providerFixtureName,
  stableId,
  configOverrides = {},
  decisionOverrides = {},
) {
  const { createFixtureDriveTransport } = await import("../lib/design-intake/drive-observer/transport.ts");
  const provider = readJson(path.join(OBSERVER_FIXTURES, `${providerFixtureName}.json`));
  const observation = await observeDriveTrack(trackConfig(stableId, configOverrides), {
    transport: createFixtureDriveTransport(provider),
    hasher,
    now: () => new Date("2026-08-17T09:00:00.000Z"),
  });
  const manifest = parseIntakeManifest(readJson(path.join(MANIFEST_FIXTURES, `${manifestName}.json`)));
  const applicability = isSourceFreshnessApplicable({ changedFiles: ["lib/design-intake/x.ts"] });
  const decision = buildSourceFreshnessCheckDecision({
    observation,
    manifest,
    observedHeadSha: HEAD("a"),
    observedBaseSha: HEAD("b"),
    freshHeadSha: HEAD("a"),
    freshBaseSha: HEAD("b"),
    applicability,
    decisionTimestamp: "2026-08-17T13:40:00.000Z",
    providerState: observation.providerState,
    paginationComplete: observation.paginationComplete,
    observationComplete: observation.observationComplete,
    ...decisionOverrides,
  });
  return { observation, manifest, decision };
}

/* ------------------------------------------------------------------ */
/* Stable check identity                                              */
/* ------------------------------------------------------------------ */

test("check-decision: stable check name is Design Source Freshness", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
  );
  assert.equal(decision.name, DESIGN_SOURCE_FRESHNESS_CHECK_NAME);
  assert.equal(decision.name, "Design Source Freshness");
  assert.notEqual(decision.name, "Design Source Freshness Observer");
});

/* ------------------------------------------------------------------ */
/* Exact current → PASS → SUCCESS, not blocking                        */
/* ------------------------------------------------------------------ */

test("check-decision: exact current source → SUCCESS, not blocking", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
  );
  assert.equal(decision.conclusion, "SUCCESS");
  assert.equal(decision.blocking, false);
  assert.equal(decision.reasonCode, "CURRENT");
  assert.equal(decision.headSha, HEAD("a"));
  assert.equal(decision.details.applicable, true);
  assert.equal(decision.details.raceStale, false);
  assert.equal(decision.details.observedHeadSha, HEAD("a"));
});

/* ------------------------------------------------------------------ */
/* Stale source → FAIL → FAILURE, blocking                            */
/* ------------------------------------------------------------------ */

test("check-decision: stale V1.7 vs live V1.9 → FAILURE, blocking", async () => {
  const { decision } = await decisionCase(
    "observer-track61-v1-7-current",
    "provider-track61-v1-9-live",
    "track-observer-61-stale",
  );
  assert.equal(decision.conclusion, "FAILURE");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "SOURCE_STALE");
});

/* ------------------------------------------------------------------ */
/* Packaging-only → PASS → SUCCESS (not a freshness failure)           */
/* ------------------------------------------------------------------ */

test("check-decision: same SHA / new fileId → PACKAGING_ONLY → SUCCESS", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-repackaged",
    "provider-track62-v1-1-repackaged",
    "track-observer-62-repackaged",
  );
  assert.equal(decision.conclusion, "SUCCESS");
  assert.equal(decision.blocking, false);
  assert.equal(decision.reasonCode, "PACKAGING_ONLY");
});

/* ------------------------------------------------------------------ */
/* Ambiguous current → FAIL → FAILURE, blocking                       */
/* ------------------------------------------------------------------ */

test("check-decision: competing functional candidates → FAILURE/AMBIGUOUS_CURRENT", async () => {
  const { decision } = await decisionCase(
    "observer-track64-v1-2-1-ambiguous",
    "provider-track64-two-competitors",
    "track-observer-64-ambiguous",
  );
  assert.equal(decision.conclusion, "FAILURE");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "AMBIGUOUS_CURRENT");
});

/* ------------------------------------------------------------------ */
/* Provider failure → never PASS, always blocking                      */
/* ------------------------------------------------------------------ */

test("check-decision: AUTH_FAILED provider → ACTION_REQUIRED, blocking (never PASS)", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-drive-auth-failed",
    "track-observer-62-exact",
  );
  assert.notEqual(decision.conclusion, "SUCCESS");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "PROVIDER_BLOCKED");
  assert.equal(decision.details.resolverStatus, "SKIPPED");
});

test("check-decision: pagination incomplete → UNKNOWN, blocking (never PASS)", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-drive-pagination-incomplete",
    "track-observer-62-exact",
  );
  assert.notEqual(decision.conclusion, "SUCCESS");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "PROVIDER_BLOCKED");
});

test("check-decision: PERMISSION_DENIED → ACTION_REQUIRED, blocking (never PASS)", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-drive-permission-denied",
    "track-observer-62-exact",
  );
  assert.notEqual(decision.conclusion, "SUCCESS");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "PROVIDER_BLOCKED");
});

/* ------------------------------------------------------------------ */
/* Race guard integration: moved head revokes the old green            */
/* ------------------------------------------------------------------ */

test("check-decision: moved head (fresh != observed) → FAILURE/HEAD_MOVED, blocking", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
    {},
    {
      freshHeadSha: HEAD("c"),
      passSeal: {
        verdict: "PASS",
        prHeadSha: HEAD("a"),
        mainSha: HEAD("b"),
        observationTimestamp: "2026-08-17T09:00:00.000Z",
        source: {
          fileId: "1f73observerTrack62V11OldFileAaa",
          modifiedTime: "2026-08-14T09:00:00.000Z",
          bytes: 123,
          sha256: "144d7668b219f817729f8057dba01247dd6f6e09900bf2c90b5290a2162822a6",
        },
      },
    },
  );
  assert.equal(decision.conclusion, "FAILURE");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "HEAD_MOVED");
  assert.equal(decision.details.raceStale, true);
  assert.equal(decision.headSha, HEAD("c"));
  assert.equal(decision.details.observedHeadSha, HEAD("a"));
});

/* ------------------------------------------------------------------ */
/* Race guard integration: moved base revokes the old green            */
/* ------------------------------------------------------------------ */

test("check-decision: moved base (fresh != observed) → FAILURE/BASE_MOVED, blocking", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
    {},
    {
      freshBaseSha: HEAD("d"),
      passSeal: {
        verdict: "PASS",
        prHeadSha: HEAD("a"),
        mainSha: HEAD("b"),
        observationTimestamp: "2026-08-17T09:00:00.000Z",
        source: {
          fileId: "1f73observerTrack62V11OldFileAaa",
          modifiedTime: "2026-08-14T09:00:00.000Z",
          bytes: 123,
          sha256: "144d7668b219f817729f8057dba01247dd6f6e09900bf2c90b5290a2162822a6",
        },
      },
    },
  );
  assert.equal(decision.conclusion, "FAILURE");
  assert.equal(decision.blocking, true);
  assert.equal(decision.reasonCode, "BASE_MOVED");
  assert.equal(decision.details.raceStale, true);
});

/* ------------------------------------------------------------------ */
/* NOT_APPLICABLE: unrelated PR → NEUTRAL success, not blocking        */
/* ------------------------------------------------------------------ */

test("check-decision: NOT_APPLICABLE PR → NEUTRAL, not blocking", async () => {
  const { createFixtureDriveTransport } = await import("../lib/design-intake/drive-observer/transport.ts");
  const provider = readJson(path.join(OBSERVER_FIXTURES, "provider-track62-v1-1-exact.json"));
  const observation = await observeDriveTrack(trackConfig("track-observer-62-exact"), {
    transport: createFixtureDriveTransport(provider),
    hasher,
    now: () => new Date("2026-08-17T09:00:00.000Z"),
  });
  const manifest = parseIntakeManifest(readJson(path.join(MANIFEST_FIXTURES, "observer-track62-v1-1-current.json")));
  const decision = buildSourceFreshnessCheckDecision({
    observation,
    manifest,
    observedHeadSha: HEAD("a"),
    observedBaseSha: HEAD("b"),
    freshHeadSha: HEAD("a"),
    freshBaseSha: HEAD("b"),
    applicability: { applicable: false, reasonCode: "NO_DESIGN_INTAKE_CHANGES" },
    decisionTimestamp: "2026-08-17T13:40:00.000Z",
    providerState: observation.providerState,
    paginationComplete: observation.paginationComplete,
    observationComplete: observation.observationComplete,
  });
  assert.equal(decision.conclusion, "NEUTRAL");
  assert.equal(decision.blocking, false);
  assert.equal(decision.reasonCode, "NOT_APPLICABLE");
  assert.equal(decision.details.applicable, false);
  assert.equal(decision.details.providerState, "NOT_APPLICABLE");
});

/* ------------------------------------------------------------------ */
/* NOT_APPLICABLE never hides a provider failure: applicability is      */
/* decided from paths only; on an APPLICABLE PR a provider failure     */
/* stays blocking (covered above). Here we assert the boundary.        */
/* ------------------------------------------------------------------ */

test("check-decision: applicable + AUTH_FAILED is NOT turned into N/A (fail closed)", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-drive-auth-failed",
    "track-observer-62-exact",
  );
  assert.notEqual(decision.conclusion, "NEUTRAL");
  assert.equal(decision.blocking, true);
  assert.equal(decision.details.applicable, true);
  assert.equal(decision.reasonCode, "PROVIDER_BLOCKED");
});

/* ------------------------------------------------------------------ */
/* Determinism: details payload has the required fields                */
/* ------------------------------------------------------------------ */

test("check-decision: details carries observed/fresh refs + timestamps", async () => {
  const { decision } = await decisionCase(
    "observer-track62-v1-1-current",
    "provider-track62-v1-1-exact",
    "track-observer-62-exact",
  );
  assert.equal(decision.details.observedHeadSha, HEAD("a"));
  assert.equal(decision.details.observedBaseSha, HEAD("b"));
  assert.equal(decision.details.sourceObservationTimestamp, "2026-08-17T09:00:00.000Z");
  assert.equal(decision.details.decisionTimestamp, "2026-08-17T13:40:00.000Z");
  assert.equal(decision.details.providerState, "SUCCESS");
  assert.equal(decision.details.paginationComplete, true);
});
