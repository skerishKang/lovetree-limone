// Issue #173 / PR #243 — offline enforcement-release contracts only.
//
// This file does NOT activate WIF, issue credentials, publish a check, mutate
// branch protection/rulesets, or touch Drive. It freezes the future merge-gate
// semantics so a historical green observation cannot be reused across a
// source/GitHub trust-boundary change.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

const REPOSITORY_ID = "1316947337";
const REPOSITORY = "skerishKang/lovetree-limone";
const DEFAULT_BRANCH_REF = "refs/heads/main";
const TRUSTED_WORKFLOW_REF =
  "skerishKang/lovetree-limone/.github/workflows/design-source-freshness-observer.yml@refs/heads/main";
const TRUSTED_EVENT = "workflow_dispatch";

const REQUIRED_CHECKS = Object.freeze([
  "validate",
  "Design Fidelity Validation",
  "Design Source Freshness",
]);

function sourceEvidenceFromFixture(provider, fileId) {
  const pages = Object.values(provider.folderPages).flat();
  const record = pages.flatMap((page) => page.files ?? []).find((file) => file.id === fileId);
  assert.ok(record, `fixture record ${fileId} must exist`);
  const content = provider.content?.[fileId];
  assert.ok(content?.chunksBase64?.length, `fixture content ${fileId} must exist`);
  const chunks = content.chunksBase64.map((chunk) => Buffer.from(chunk, "base64"));
  const bytes = Buffer.concat(chunks);
  return {
    fileId: record.id,
    modifiedTime: record.modifiedTime,
    bytes: Number(record.size),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function evaluateHistoricalPass(passSeal, freshPreMerge) {
  if (
    freshPreMerge.providerState !== "SUCCESS" ||
    freshPreMerge.observationComplete !== true ||
    freshPreMerge.paginationComplete !== true
  ) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "UNKNOWN",
      mergeBlock: true,
      reason: "PROVIDER_NOT_TRUSTWORTHY_AT_MERGE",
    };
  }

  if (passSeal.prHeadSha !== freshPreMerge.prHeadSha || passSeal.mainSha !== freshPreMerge.mainSha) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "NON_PASS",
      mergeBlock: true,
      reason: "GITHUB_CONTEXT_MOVED_SINCE_PASS",
    };
  }

  const changedFields = ["fileId", "modifiedTime", "bytes", "sha256"].filter(
    (field) => passSeal.source[field] !== freshPreMerge.source[field],
  );
  if (changedFields.length > 0) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "NON_PASS",
      mergeBlock: true,
      reason: "SOURCE_CHANGED_SINCE_PASS",
      changedFields,
    };
  }

  return {
    mergeAuthoritative: true,
    reobservationRequired: false,
    status: "PASS",
    mergeBlock: false,
    reason: "EXACT_PASS_SEAL_STILL_CURRENT",
  };
}

function wifClaimsAdmitted(claims) {
  return (
    String(claims.repository_id) === REPOSITORY_ID &&
    claims.repository === REPOSITORY &&
    claims.ref === DEFAULT_BRANCH_REF &&
    claims.ref_type === "branch" &&
    claims.workflow_ref === TRUSTED_WORKFLOW_REF &&
    claims.event_name === TRUSTED_EVENT
  );
}

function parseJobBlocks(workflow) {
  const lines = workflow.split(/\r?\n/);
  const jobsIndex = lines.findIndex((line) => line === "jobs:");
  assert.ok(jobsIndex >= 0, "workflow must declare jobs:");
  const blocks = {};
  let current = null;
  for (const line of lines.slice(jobsIndex + 1)) {
    const match = /^  ([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (match) {
      current = match[1];
      blocks[current] = [];
      continue;
    }
    if (current !== null) blocks[current].push(line);
  }
  return Object.fromEntries(Object.entries(blocks).map(([id, linesForJob]) => [id, linesForJob.join("\n")]));
}

test("historical PASS is merge-authoritative only while exact source + head + main evidence is unchanged", () => {
  const provider = readJson("tests/fixtures/source-freshness/observer/provider-track62-v1-1-exact.json");
  const source = sourceEvidenceFromFixture(provider, "1f73observerTrack62V11OldFileAaa");
  const passSeal = {
    verdict: "PASS",
    prHeadSha: "a".repeat(40),
    mainSha: "b".repeat(40),
    observationTimestamp: "2026-08-17T13:40:00.000Z",
    source,
  };
  const decision = evaluateHistoricalPass(passSeal, {
    providerState: "SUCCESS",
    observationComplete: true,
    paginationComplete: true,
    prHeadSha: passSeal.prHeadSha,
    mainSha: passSeal.mainSha,
    source: { ...source },
  });
  assert.deepEqual(decision, {
    mergeAuthoritative: true,
    reobservationRequired: false,
    status: "PASS",
    mergeBlock: false,
    reason: "EXACT_PASS_SEAL_STILL_CURRENT",
  });
});

test("TOCTOU matrix: file identity / modifiedTime / bytes / hash drift each revoke the old green and require re-observation", () => {
  const provider = readJson("tests/fixtures/source-freshness/observer/provider-track62-v1-1-exact.json");
  const source = sourceEvidenceFromFixture(provider, "1f73observerTrack62V11OldFileAaa");
  const passSeal = { prHeadSha: "a".repeat(40), mainSha: "b".repeat(40), source };
  const mutations = {
    fileId: "1f73observerTrack62V11ReplacementBb",
    modifiedTime: "2026-08-17T13:41:00.000Z",
    bytes: source.bytes + 1,
    sha256: "f".repeat(64),
  };

  for (const [field, value] of Object.entries(mutations)) {
    const decision = evaluateHistoricalPass(passSeal, {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      prHeadSha: passSeal.prHeadSha,
      mainSha: passSeal.mainSha,
      source: { ...source, [field]: value },
    });
    assert.equal(decision.mergeAuthoritative, false, `${field} drift must revoke historical green`);
    assert.equal(decision.reobservationRequired, true, `${field} drift requires a new full observation`);
    assert.equal(decision.status, "NON_PASS");
    assert.equal(decision.mergeBlock, true);
    assert.equal(decision.reason, "SOURCE_CHANGED_SINCE_PASS");
    assert.deepEqual(decision.changedFields, [field]);
  }
});

test("packaging-only may become PASS only after fresh resolution; the old PASS cannot survive the file-id change", () => {
  const provider = readJson("tests/fixtures/source-freshness/observer/provider-track62-v1-1-exact.json");
  const source = sourceEvidenceFromFixture(provider, "1f73observerTrack62V11OldFileAaa");
  const passSeal = { prHeadSha: "a".repeat(40), mainSha: "b".repeat(40), source };
  const decision = evaluateHistoricalPass(passSeal, {
    providerState: "SUCCESS",
    observationComplete: true,
    paginationComplete: true,
    prHeadSha: passSeal.prHeadSha,
    mainSha: passSeal.mainSha,
    source: { ...source, fileId: "1f73observerTrack62V11RepackagedBb" },
  });
  assert.equal(decision.mergeAuthoritative, false);
  assert.equal(decision.reobservationRequired, true);
  assert.deepEqual(decision.changedFields, ["fileId"]);
});

test("PR head or main movement revokes old green before merge", () => {
  const source = { fileId: "file", modifiedTime: "2026-08-17T00:00:00Z", bytes: 1, sha256: "a".repeat(64) };
  const passSeal = { prHeadSha: "1".repeat(40), mainSha: "2".repeat(40), source };
  for (const changed of [
    { prHeadSha: "3".repeat(40), mainSha: passSeal.mainSha },
    { prHeadSha: passSeal.prHeadSha, mainSha: "4".repeat(40) },
  ]) {
    const decision = evaluateHistoricalPass(passSeal, {
      providerState: "SUCCESS",
      observationComplete: true,
      paginationComplete: true,
      ...changed,
      source,
    });
    assert.equal(decision.mergeAuthoritative, false);
    assert.equal(decision.reobservationRequired, true);
    assert.equal(decision.mergeBlock, true);
    assert.equal(decision.reason, "GITHUB_CONTEXT_MOVED_SINCE_PASS");
  }
});

test("provider negative matrix is always UNKNOWN/non-authoritative + mergeBlock", () => {
  const source = { fileId: "file", modifiedTime: "2026-08-17T00:00:00Z", bytes: 1, sha256: "a".repeat(64) };
  const passSeal = { prHeadSha: "1".repeat(40), mainSha: "2".repeat(40), source };
  for (const providerState of ["INCOMPLETE", "UNAVAILABLE", "AUTH_FAILED", "PERMISSION_DENIED", "API_ERROR"]) {
    const decision = evaluateHistoricalPass(passSeal, {
      providerState,
      observationComplete: false,
      paginationComplete: providerState !== "INCOMPLETE",
      prHeadSha: passSeal.prHeadSha,
      mainSha: passSeal.mainSha,
      source,
    });
    assert.equal(decision.mergeAuthoritative, false, `${providerState} must not preserve green`);
    assert.equal(decision.status, "UNKNOWN");
    assert.equal(decision.mergeBlock, true);
    assert.equal(decision.reobservationRequired, true);
  }
});

test("WIF subject contract admits only the exact repository/default-branch/workflow identity", () => {
  const exact = {
    repository_id: REPOSITORY_ID,
    repository: REPOSITORY,
    ref: DEFAULT_BRANCH_REF,
    ref_type: "branch",
    workflow_ref: TRUSTED_WORKFLOW_REF,
    event_name: TRUSTED_EVENT,
  };
  assert.equal(wifClaimsAdmitted(exact), true);

  const negativeMatrix = [
    { label: "wrong repository id", patch: { repository_id: "999999999" } },
    { label: "wrong repository name", patch: { repository: "attacker/lovetree-limone" } },
    { label: "same-name tag", patch: { ref: "refs/tags/main", ref_type: "tag" } },
    { label: "pull ref", patch: { ref: "refs/pull/243/merge" } },
    { label: "feature branch", patch: { ref: "refs/heads/feat/173-drive-source-freshness-observer-foundation" } },
    { label: "wrong workflow path", patch: { workflow_ref: `${REPOSITORY}/.github/workflows/attacker.yml@refs/heads/main` } },
    { label: "workflow from feature branch", patch: { workflow_ref: `${REPOSITORY}/.github/workflows/design-source-freshness-observer.yml@refs/heads/feature` } },
    { label: "untrusted event", patch: { event_name: "pull_request" } },
  ];
  for (const { label, patch } of negativeMatrix) {
    assert.equal(wifClaimsAdmitted({ ...exact, ...patch }), false, `${label} must be denied`);
  }
});

test("required-check names are exact stable job identities, never workflow/conditional child aliases", () => {
  const aTrack = parseJobBlocks(read(".github/workflows/a-track-p0-validation.yml"));
  assert.ok(aTrack.validate, "A-track must keep the exact `validate` job id");
  assert.doesNotMatch(aTrack.validate, /^\s*name:/m, "validate check identity must remain the stable job id `validate`");

  const fidelity = parseJobBlocks(read(".github/workflows/design-fidelity-validation.yml"));
  assert.match(fidelity.result ?? "", /^\s*name:\s*Design Fidelity Validation\s*$/m);
  assert.match(fidelity.validate ?? "", /^\s*name:\s*Fidelity · \$\{\{ matrix\.id \}\}\s*$/m);

  assert.deepEqual(REQUIRED_CHECKS, ["validate", "Design Fidelity Validation", "Design Source Freshness"]);
  assert.ok(!REQUIRED_CHECKS.includes("Design Source Freshness Observer"), "workflow display name is not a required-check identity");
  assert.ok(!REQUIRED_CHECKS.includes("Observer contract + security (unprivileged, credential-free)"));
  assert.ok(!REQUIRED_CHECKS.some((name) => name.startsWith("Fidelity ·")), "conditional matrix children are never global required checks");
});

test("future freshness aggregator is documented but intentionally not active on this HOLD branch", () => {
  const observerWorkflow = read(".github/workflows/design-source-freshness-observer.yml");
  const topology = read("docs/design-intake/drive-observer-wif-trust-topology.md");

  assert.match(topology, /FUTURE_FRESHNESS_REQUIRED_CHECK\s*=\s*`Design Source Freshness`/);
  assert.match(topology, /REQUIRED_CHECK_RENAME_OR_ABSENCE\s*=\s*BLOCK\/HOLD/);
  assert.match(topology, /`repository_id`\s*==\s*`1316947337`/);
  assert.match(topology, /`ref`\s*==\s*`refs\/heads\/main`/);
  assert.match(topology, /`workflow_ref`\s*==\s*`skerishKang\/lovetree-limone\/\.github\/workflows\/design-source-freshness-observer\.yml@refs\/heads\/main`/);

  assert.doesNotMatch(observerWorkflow, /^\s*id-token:\s*write/m, "WIF HOLD must keep id-token disabled");
  assert.doesNotMatch(observerWorkflow, /^\s*name:\s*Design Source Freshness\s*$/m, "future required freshness aggregator must not be fabricated before live enforcement is authorized");
  assert.doesNotMatch(observerWorkflow, /^[^#\n]*pull_request_target:/m);
});
