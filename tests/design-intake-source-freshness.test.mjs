import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import {
  compareRevisions,
  parseRevisionLabel,
  resolveSourceFreshness,
} from "../lib/design-intake/source-freshness.ts";

const repoRoot = process.cwd();
const FIXTURES_DIR = path.join(repoRoot, "tests", "fixtures", "source-freshness");
const MANIFESTS_DIR = path.join(repoRoot, "design-intake", "manifests");

function manifestFixture(name) {
  return JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "manifests", `${name}.json`), "utf8"),
  );
}

function driveFixture(name) {
  return JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "drive", `${name}.json`), "utf8"),
  );
}

function resolve(name, drive) {
  return resolveSourceFreshness(parseIntakeManifest(manifestFixture(name)), drive);
}

function withTempFile(contents) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "source-freshness-"));
  const file = path.join(dir, "drive-state.json");
  writeFileSync(file, JSON.stringify(contents), "utf8");
  return { dir, file };
}

/* ------------------------------------------------------------------ */
/* Revision label parsing / ordering                                  */
/* ------------------------------------------------------------------ */

test("revision labels parse dotted numeric versions", () => {
  assert.deepEqual(parseRevisionLabel("V1.7"), { major: 1, minor: 7, patch: 0 });
  assert.deepEqual(parseRevisionLabel("v1.2.1"), { major: 1, minor: 2, patch: 1 });
  assert.deepEqual(parseRevisionLabel("V1 (instruction accepted)"), {
    major: 1,
    minor: 0,
    patch: 0,
  });
  assert.deepEqual(parseRevisionLabel("1.10"), { major: 1, minor: 10, patch: 0 });
  assert.equal(parseRevisionLabel("garbage"), null);
  assert.equal(parseRevisionLabel(""), null);
});

test("revision ordering is numeric, not lexical", () => {
  const v17 = parseRevisionLabel("V1.7");
  const v19 = parseRevisionLabel("V1.9");
  const v121 = parseRevisionLabel("V1.2.1");
  const v13 = parseRevisionLabel("V1.3");
  assert.equal(compareRevisions(v19, v17), 1, "V1.9 > V1.7");
  assert.equal(compareRevisions(v121, v13), -1, "V1.2.1 < V1.3");
  assert.equal(compareRevisions(v17, v17), 0, "equal");
});

/* ------------------------------------------------------------------ */
/* Core fixture matrix (authoritative correction contract)             */
/* ------------------------------------------------------------------ */

test("fixtures: Track61 V1.7 CURRENT vs Drive V1.9 → FAIL/SOURCE_STALE", () => {
  const verdict = resolve("track61-v1-7-current", driveFixture("track61-v1-9"));
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "SOURCE_STALE");
  assert.ok(verdict.mergeBlock, "stale snapshot must block merge");
  assert.equal(verdict.manifestRevision, "V1.7");
  assert.equal(verdict.driveCurrentRevision, "V1.9");
  assert.equal(verdict.resolvedTargetRevision, "V1.9");
});

test("fixtures: Track62 exact current → PASS/CURRENT", () => {
  const verdict = resolve("track62-v1-1-current", driveFixture("track62-v1-1"));
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "CURRENT");
  assert.equal(verdict.mergeBlock, undefined);
  assert.equal(verdict.packagingOnly, undefined);
  assert.equal(verdict.driveCurrentRevision, "V1.1");
});

test("fixtures: Track63 newer empty V1.3 → NON_PASS/EXECUTABLE_PENDING", () => {
  const verdict = resolve("track63-v1-pending-newer-empty", driveFixture("track63-v1-3-empty"));
  assert.equal(verdict.status, "NON_PASS");
  assert.equal(verdict.reason, "EXECUTABLE_PENDING");
  assert.ok(verdict.mergeBlock, "non-executable candidate must not look mergeable");
});

test("fixtures: Track64 display V1.3 vs functional V1.2.1 → resolves to V1.2.1", () => {
  const verdict = resolve(
    "track64-v1-2-1-functional",
    driveFixture("track64-display-v1-3-functional-v1-2-1"),
  );
  // The display-only V1.3 label must never drive staleness.
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "CURRENT");
  assert.equal(verdict.mergeBlock, undefined);
  assert.equal(verdict.driveCurrentRevision, "V1.2.1");
  assert.equal(verdict.resolvedTargetRevision, "V1.2.1");
  assert.notEqual(verdict.reason, "SOURCE_STALE");
});

test("fixtures: Drive unavailable → UNKNOWN/DRIVE_UNAVAILABLE + mergeBlock", () => {
  const verdict = resolve("track62-v1-1-current", driveFixture("drive-unavailable"));
  assert.equal(verdict.status, "UNKNOWN");
  assert.equal(verdict.reason, "DRIVE_UNAVAILABLE");
  assert.ok(verdict.mergeBlock, "unavailable Drive authority must block merge");
});

test("fixtures: Drive incomplete → UNKNOWN/DRIVE_INCOMPLETE + mergeBlock", () => {
  const verdict = resolve("track62-v1-1-current", driveFixture("drive-incomplete"));
  assert.equal(verdict.status, "UNKNOWN");
  assert.equal(verdict.reason, "DRIVE_INCOMPLETE");
  assert.ok(verdict.mergeBlock, "incomplete Drive evidence must block merge");
});

test("fixtures: root current unmapped → FAIL/UNMAPPED", () => {
  const verdict = resolve("root-unmapped", driveFixture("root-unmapped"));
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "UNMAPPED");
  assert.ok(verdict.mergeBlock, "unmapped root must block merge");
  assert.equal(verdict.manifestRevision, undefined);
});

test("fixtures: same SHA different fileId → PASS/PACKAGING_ONLY", () => {
  const verdict = resolve("repackaged-track62-v1-1", driveFixture("repackaged"));
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "PACKAGING_ONLY");
  assert.equal(verdict.packagingOnly, true);
  assert.equal(verdict.mergeBlock, undefined, "repackaging is not a staleness failure");
});

test("fixtures: HISTORICAL_PINNED + newer current → PASS, pin preserved but fingerprint unverified", () => {
  // The observation contains the newer V1.7 current but NO V1.5 historical
  // artifact: the pin is preserved (newer current never = stale), but the
  // historical fingerprint must NOT be claimed as verified.
  const verdict = resolve(
    "track61-v1-5-historical-pinned",
    driveFixture("track61-v1-7"),
  );
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "HISTORICAL_PINNED");
  assert.equal(verdict.mergeBlock, undefined);
  assert.equal(verdict.manifestRevision, "V1.5");
  assert.equal(verdict.driveCurrentRevision, "V1.7");
  assert.equal(verdict.historicalFingerprintVerified, false);
  assert.doesNotMatch(verdict.summary, /historical integrity maintained/i);
  assert.match(verdict.summary, /NOT verified/i);
});

test("fixtures: HISTORICAL_PINNED + observed matching artifact → PASS, fingerprint verified", () => {
  const verdict = resolve(
    "track61-v1-5-historical-pinned",
    driveFixture("historical-pin-verified"),
  );
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "HISTORICAL_PINNED");
  assert.equal(verdict.historicalFingerprintVerified, true);
  assert.match(verdict.summary, /verified/i);
});

test("fixtures: observed historical artifact with wrong SHA → FAIL/HISTORICAL_PIN_MISMATCH", () => {
  const verdict = resolve(
    "track61-v1-5-historical-pinned",
    driveFixture("historical-pin-mismatch"),
  );
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "HISTORICAL_PIN_MISMATCH");
  assert.ok(verdict.mergeBlock, "wrong historical SHA must block merge");
});

/* ------------------------------------------------------------------ */
/* Defensive fail-closed edges                                        */
/* ------------------------------------------------------------------ */

test("CURRENT claim without a pinned executable fingerprint → FAIL/UNMAPPED", () => {
  // Route-anchored executable manifest with a CURRENT snapshot but no
  // source executable artifact: the current claim cannot be mapped.
  const routed = {
    schemaVersion: 1,
    stableId: "track-defensive-routed-current",
    sourceTrackId: "Track61",
    title: "defensive routed current",
    classification: "NEW_LINEAGE",
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    scenarioId: "entry-onboarding",
    productJob: "defensive fixture",
    summary: "defensive fixture",
    provenance: {
      sourceLabel: "synthetic",
      sourceFiles: ["f.html"],
      rightsStatus: "sibling-source-owned",
    },
    designLineageId: "lt-defensive",
    lineageNumber: 61,
    revisionId: "61-v1",
    route: { path: "/design-lab/lineages/61/61-v1", surface: "lineage" },
    backendScope: "BACKEND_FREE",
    sourceSnapshot: {
      revisionLabel: "V1.1",
      authorityObservedAt: "2026-08-13T09:00:00.000Z",
      sourceAuthorityState: "CURRENT_AT_OBSERVATION",
    },
  };
  const drive = {
    available: true,
    files: [
      {
        driveId: "1N11a2b3c4d5e6f7g8h9i0j1k2l3m4n",
        revisionLabel: "V1.1",
        sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        functional: true,
      },
    ],
  };
  const verdict = resolveSourceFreshness(parseIntakeManifest(routed), drive);
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "UNMAPPED");
  assert.ok(verdict.mergeBlock);
});

test("no functional Drive current → UNKNOWN/DRIVE_INCOMPLETE, never a guess", () => {
  const empty = resolve("track62-v1-1-current", { available: true, files: [] });
  assert.equal(empty.status, "UNKNOWN");
  assert.equal(empty.reason, "DRIVE_INCOMPLETE");
  assert.ok(empty.mergeBlock);

  // Display-only files (even a higher version label) must NOT read as stale.
  const displayOnly = resolve("track62-v1-1-current", {
    available: true,
    files: [
      {
        driveId: "1O11a2b3c4d5e6f7g8h9i0j1k2l3m4n",
        revisionLabel: "V9.9",
        sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        functional: false,
      },
    ],
  });
  assert.equal(displayOnly.status, "UNKNOWN");
  assert.equal(displayOnly.reason, "DRIVE_INCOMPLETE");
  assert.notEqual(displayOnly.reason, "SOURCE_STALE");
});

test("two competing functional-current candidates → FAIL/AMBIGUOUS_CURRENT, never PASS", () => {
  // No rootCandidate: the resolver must NEVER auto-pick by version number,
  // even though the V1.1 candidate matches the manifest exactly.
  const verdict = resolve("track62-v1-1-current", driveFixture("two-competitors"));
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "AMBIGUOUS_CURRENT");
  assert.ok(verdict.mergeBlock, "ambiguous current must block merge");
  assert.notEqual(verdict.status, "PASS");
});

test("rootCandidate provides explicit unique authority over competing candidates → PASS/CURRENT", () => {
  const verdict = resolve("track62-v1-1-current", driveFixture("root-disambiguates"));
  assert.equal(verdict.status, "PASS");
  assert.equal(verdict.reason, "CURRENT");
  assert.equal(verdict.driveCurrentRevision, "V1.1");
  assert.equal(verdict.mergeBlock, undefined);
});

test("Drive rootCandidate with no matching candidate → FAIL/ROOT_CURRENT_UNMAPPED", () => {
  // Distinct from the manifest-without-sourceSnapshot case (UNMAPPED): here
  // the Drive observation itself is inconsistent.
  const verdict = resolve("track62-v1-1-current", driveFixture("root-alias-unmapped"));
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "ROOT_CURRENT_UNMAPPED");
  assert.ok(verdict.mergeBlock, "ungrounded root alias must block merge");
});

test("manifest without sourceSnapshot stays FAIL/UNMAPPED (separate from Drive root alias)", () => {
  const verdict = resolve("root-unmapped", driveFixture("root-unmapped"));
  assert.equal(verdict.status, "FAIL");
  assert.equal(verdict.reason, "UNMAPPED");
  assert.ok(verdict.mergeBlock);
});

/* ------------------------------------------------------------------ */
/* CLI smoke tests (pure resolver wiring)                             */
/* ------------------------------------------------------------------ */

test("CLI: without drive state, fails closed to UNKNOWN (exit 1)", () => {
  let error = null;
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/design-intake-source-freshness.mjs"],
      { encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    error = err;
  }
  assert.ok(error, "CLI must exit non-zero without Drive state");
  assert.match(String(error.stdout ?? ""), /UNKNOWN/);
});

test("CLI: complete matching drive state → no FAIL/UNKNOWN (exit 0)", () => {
  // Build a drive state that mirrors every real manifest's pinned executable,
  // so the pure resolver must certify every manifest PASS/NON_PASS.
  const driveStates = {};
  for (const file of readdirSync(MANIFESTS_DIR).filter((name) => name.endsWith(".json"))) {
    const manifest = parseIntakeManifest(
      JSON.parse(readFileSync(path.join(MANIFESTS_DIR, file), "utf8")),
    );
    const executable = (manifest.sourceArtifacts ?? []).find(
      (artifact) =>
        artifact.role === "executable" &&
        artifact.status === "PINNED" &&
        Boolean(artifact.sha256),
    );
    driveStates[manifest.stableId] = executable
      ? {
          available: true,
          rootCandidate: {
            driveId: executable.driveId,
            sha256: executable.sha256,
            bytes: executable.bytes,
            revisionLabel: manifest.sourceSnapshot?.revisionLabel,
          },
          files: [
            {
              driveId: executable.driveId,
              revisionLabel: manifest.sourceSnapshot?.revisionLabel,
              sha256: executable.sha256,
              bytes: executable.bytes,
              functional: true,
            },
          ],
        }
      : { available: true, files: [] };
  }

  const { dir, file } = withTempFile(driveStates);
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/design-intake-source-freshness.mjs", file],
      { encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] },
    );
    assert.doesNotMatch(stdout, /^(FAIL|UNKNOWN)\s/m, "no blocking verdict lines expected");
    assert.match(stdout, /track-60-3d-moment-cluster\.json — CURRENT/);
    assert.match(stdout, /track-61-guided-next-moment-builder\.json — HISTORICAL_PINNED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
