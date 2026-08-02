#!/usr/bin/env node
// Guarded isolated-preview deployment core.
//
// Incident context (Issue #26, 2026-08-02): a `vinext deploy --skip-build`
// attempt intended for the isolated Worker `lovetree-limone-cache-pr12-preview`
// ignored the requested name override and targeted the repository default
// Production Worker `lovetree-limone`. This module makes that class of mistake
// impossible: the deployment target is always derived from a generated, safe
// Wrangler config whose `name` is the exact isolated preview Worker, protected
// names are rejected, the default is dry-run, `--execute` is required for any
// remote upload, and the execute path is fail-closed.
//
// Fail-closed guarantees (Web CTO audit 2026-08-02):
//   R1: before/after deployment snapshots are structured and required; any
//       unavailable snapshot blocks the deploy command (VERSION_SNAPSHOT_UNAVAILABLE).
//   R2: `--allow-dirty` permits only tracked A/B marker modifications;
//       untracked files/directories are rejected (UNTRACKED_FILES_NOT_ALLOWED).
//   R3: the generated temporary config is cleaned up by this core on every
//       exit path; `--keep-config` is the only opt-out.
//
// Real Cloudflare deployments schema (Web CTO follow-up 2026-08-02):
//   GET /accounts/{account_id}/workers/scripts/{script_name}/deployments
//   returns an envelope `payload.result.deployments[]`, NOT a direct array.
//   Each deployment has `versions[]` (each `{ version_id, percentage }`),
//   never a top-level `version_id`. The first deployment entry is the
//   current active deployment per the API contract. Snapshots carry a
//   deterministic `deploymentFingerprint` (deployment id, created_on,
//   strategy, and sorted versionId+percentage pairs) so weighted
//   deployments are compared without losing information.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const PROTECTED_WORKER_NAMES = Object.freeze([
  "lovetree-limone",
  "lovetree-limone-staging",
  "lovetree-limone-v2",
]);

export const ISOLATED_PREVIEW_WORKER_PATTERN =
  /^lovetree-limone-[a-z0-9][a-z0-9-]*-preview$/;

export function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

function stripJsoncComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^\\:])\/\/.*$/gm, "$1");
}

export function parseWranglerConfig(source) {
  return JSON.parse(stripJsoncComments(source));
}

export async function readWranglerConfig(repoRoot) {
  const configPath = path.join(repoRoot, "wrangler.jsonc");
  if (!existsSync(configPath)) {
    throw new Error(`wrangler.jsonc not found at ${configPath}`);
  }
  return parseWranglerConfig(await readFile(configPath, "utf8"));
}

export async function canonicalWranglerName(repoRoot) {
  const config = await readWranglerConfig(repoRoot);
  return typeof config?.name === "string" && config.name.length > 0
    ? config.name
    : null;
}

export function validatePreviewWorkerName({
  worker,
  confirmWorker,
  protectedNames = PROTECTED_WORKER_NAMES,
  canonicalName,
}) {
  const problems = [];

  if (typeof worker !== "string" || worker.length === 0) {
    problems.push("worker name is empty");
  }
  if (worker !== confirmWorker) {
    problems.push(
      `confirmation mismatch: --worker '${worker}' !== --confirm-worker '${confirmWorker}'`
    );
  }
  if (protectedNames.includes(worker)) {
    problems.push(`worker '${worker}' is a protected worker`);
  }
  if (typeof canonicalName === "string" && worker === canonicalName) {
    problems.push(
      `worker '${worker}' equals the canonical Wrangler default name '${canonicalName}'`
    );
  }
  if (!ISOLATED_PREVIEW_WORKER_PATTERN.test(worker)) {
    problems.push(
      `worker '${worker}' does not match the allowed isolated preview pattern ` +
        `^lovetree-limone-[a-z0-9][a-z0-9-]*-preview$`
    );
  }
  if (typeof worker === "string" && /\s/.test(worker)) {
    problems.push("worker name contains whitespace");
  }
  if (typeof worker === "string" && /[^a-z0-9-]/.test(worker)) {
    problems.push(
      "worker name contains characters outside lowercase alphanumerics and dashes"
    );
  }

  if (problems.length > 0) {
    const error = new Error(
      `invalid isolated preview worker name: ${JSON.stringify(worker)}\n` +
        problems.map((line) => `  - ${line}`).join("\n")
    );
    error.code = "INVALID_WORKER_NAME";
    throw error;
  }

  return { worker, confirmWorker, safe: true };
}

function gitCapture(repoRoot, args) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (exit ${result.status}): ${result.stderr || result.stdout}`
    );
  }
  return result;
}

function parsePorcelainV1Z(output) {
  const tokens = output.split("\0").filter((token) => token.length > 0);
  const entries = [];
  let last = null;
  for (const token of tokens) {
    const match = /^(.{2}) (.*)$/s.exec(token);
    if (match) {
      last = { xy: match[1], path: match[2] };
      entries.push(last);
    } else if (last) {
      last.otherPath = token;
    }
  }
  return entries;
}

function normalizeTrackedStatus(entries) {
  const lines = [];
  for (const entry of entries) {
    if (entry.xy === "??") continue;
    lines.push(`${entry.xy}\0${entry.path}`);
    if (entry.otherPath !== undefined) {
      lines.push(`${entry.xy}\0${entry.otherPath}`);
    }
  }
  lines.sort();
  return lines.join("\n");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export async function validateSourceState({
  repoRoot,
  sourceSha,
  allowDirty = false,
}) {
  const head = gitCapture(repoRoot, ["rev-parse", "HEAD"]).stdout.trim();
  const branch =
    gitCapture(repoRoot, ["branch", "--show-current"]).stdout.trim() ||
    "(detached HEAD)";
  const porcelain = gitCapture(repoRoot, ["status", "--porcelain=v1", "-z"]).stdout;
  const clean = porcelain.length === 0;

  if (head !== sourceSha) {
    const error = new Error(
      `source SHA mismatch: expected ${sourceSha}, current HEAD is ${head}`
    );
    error.code = "SOURCE_SHA_MISMATCH";
    throw error;
  }

  let patchSha256 = null;
  let dirtyTrackedFiles = [];
  const untrackedFiles = [];
  const untrackedDirectories = [];

  if (!clean) {
    if (!allowDirty) {
      const changed = parsePorcelainV1Z(porcelain).length;
      const error = new Error(
        `dirty worktree is blocked by default (${changed} changed entr${changed === 1 ? "y" : "ies"}); ` +
          "use --allow-dirty only for an explicit A/B marker deployment"
      );
      error.code = "DIRTY_WORKTREE";
      error.porcelain = porcelain;
      throw error;
    }

    const entries = parsePorcelainV1Z(porcelain);
    for (const entry of entries) {
      if (entry.xy !== "??") continue;
      if (entry.path.endsWith("/")) untrackedDirectories.push(entry.path);
      else untrackedFiles.push(entry.path);
    }
    if (untrackedFiles.length > 0 || untrackedDirectories.length > 0) {
      const error = new Error(
        `untracked files are not allowed even with --allow-dirty; ` +
          `only tracked A/B marker modifications are permitted\n` +
          untrackedFiles.map((p) => `  - file ${p}`).join("\n") +
          untrackedDirectories.map((p) => `  - directory ${p}`).join("\n")
      );
      error.code = "UNTRACKED_FILES_NOT_ALLOWED";
      error.untrackedFiles = untrackedFiles;
      error.untrackedDirectories = untrackedDirectories;
      throw error;
    }

    const trackedStatus = normalizeTrackedStatus(entries);
    const trackedPaths = [];
    for (const entry of entries) {
      if (entry.xy === "??") continue;
      trackedPaths.push(entry.path);
      if (entry.otherPath !== undefined) trackedPaths.push(entry.otherPath);
    }
    dirtyTrackedFiles = uniqueSorted(trackedPaths);
    const binaryDiff = gitCapture(repoRoot, [
      "diff",
      "--binary",
      "--no-ext-diff",
      "HEAD",
    ]).stdout;
    const payload = `STATUS\0${trackedStatus}\0DIFF\0${binaryDiff}`;
    patchSha256 = sha256Hex(payload);
  }

  return {
    head,
    branch,
    clean,
    dirty: !clean,
    porcelain,
    patchSha256,
    dirtyTrackedFiles,
    untrackedFiles: [],
    untrackedDirectories: [],
  };
}

export function assertBuildOutputPresent(repoRoot) {
  const clientAssets = path.join(repoRoot, "dist", "client");
  const builtConfigPath = path.join(repoRoot, "dist", "server", "wrangler.json");
  const missing = [];
  if (!existsSync(clientAssets)) missing.push(clientAssets);
  if (!existsSync(builtConfigPath)) missing.push(builtConfigPath);
  if (missing.length > 0) {
    const error = new Error(
      `build output not found; run 'npm run build' first\n` +
        missing.map((entry) => `  - ${entry}`).join("\n")
    );
    error.code = "BUILD_OUTPUT_MISSING";
    throw error;
  }
  return { clientAssets, builtConfigPath };
}

async function readBuiltWorkerConfig(repoRoot, builtConfigPath) {
  if (!existsSync(builtConfigPath)) return null;
  try {
    const parsed = JSON.parse(await readFile(builtConfigPath, "utf8"));
    return typeof parsed?.main === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function buildSafePreviewConfig({
  repoRoot,
  workerName,
  outputDir,
}) {
  const source = await readWranglerConfig(repoRoot);
  const { clientAssets, builtConfigPath } = assertBuildOutputPresent(repoRoot);
  const built = await readBuiltWorkerConfig(repoRoot, builtConfigPath);
  if (!built) {
    const error = new Error(
      `built worker config missing or invalid at ${builtConfigPath}; run 'npm run build' first`
    );
    error.code = "BUILD_OUTPUT_MISSING";
    throw error;
  }

  const distServer = path.dirname(builtConfigPath);
  const safe = {
    $schema: typeof source.$schema === "string"
      ? source.$schema
      : "node_modules/wrangler/config-schema.json",
    name: workerName,
    main: path.resolve(distServer, built.main),
    workers_dev: true,
    no_bundle: built.no_bundle ?? false,
    assets: {
      directory: clientAssets,
      binding: built.assets?.binding ?? "ASSETS",
    },
    vars: {
      APP_ENV: "staging",
      API_MUTATIONS_ENABLED: "false",
    },
  };

  if (typeof built.compatibility_date === "string") {
    safe.compatibility_date = built.compatibility_date;
  }
  if (Array.isArray(built.compatibility_flags) && built.compatibility_flags.length > 0) {
    safe.compatibility_flags = [...built.compatibility_flags];
  }

  const firebaseProjectId = source?.vars?.FIREBASE_PROJECT_ID;
  if (typeof firebaseProjectId === "string" && firebaseProjectId.length > 0) {
    safe.vars.FIREBASE_PROJECT_ID = firebaseProjectId;
  }

  const dropped = [];
  for (const forbidden of [
    "env",
    "routes",
    "custom_domains",
    "dev",
    "triggers",
    "queues_producers",
    "queues_consumers",
    "workflows",
    "secrets",
  ]) {
    if (source[forbidden] !== undefined) {
      dropped.push(forbidden);
    }
  }

  if (!/^(true|false)$/.test(String(safe.workers_dev))) {
    throw new Error("generated workers_dev must be boolean true");
  }
  if (safe.vars.APP_ENV !== "staging") {
    throw new Error("generated APP_ENV must be 'staging'");
  }
  if (safe.vars.API_MUTATIONS_ENABLED !== "false") {
    throw new Error("generated API_MUTATIONS_ENABLED must be 'false'");
  }
  if (safe.routes !== undefined || safe.custom_domains !== undefined) {
    throw new Error("generated config must not contain routes or custom_domains");
  }
  if (safe.env !== undefined) {
    throw new Error("generated config must not contain env blocks");
  }
  if (PROTECTED_WORKER_NAMES.includes(safe.name) || safe.name !== workerName) {
    throw new Error(
      `generated config name '${safe.name}' must equal the validated worker '${workerName}'`
    );
  }
  if (safe.secrets !== undefined) {
    throw new Error("generated config must not carry secret metadata");
  }

  const content = `${JSON.stringify(safe, null, 2)}\n`;
  const configDir =
    outputDir ??
    (await mkdtemp(path.join(tmpdir(), "isolated-preview-deploy-")));
  const configPath = path.join(configDir, "wrangler-isolated-preview.json");
  await writeFile(configPath, content, "utf8");

  return {
    configPath,
    configDir,
    configSha256: sha256Hex(content),
    content,
    config: safe,
    dropped,
  };
}

export async function removeSafeConfig(safeConfig) {
  if (!safeConfig?.configDir) return;
  await rm(safeConfig.configDir, { recursive: true, force: true });
}

export function buildWranglerCommands({ configPath }) {
  return {
    dryRun: ["npx", "wrangler", "deploy", "--dry-run", "--config", configPath],
    deploy: ["npx", "wrangler", "deploy", "--config", configPath],
  };
}

export function buildRollbackCommand({ configPath, versionId }) {
  return ["npx", "wrangler", "rollback", versionId, "--config", configPath];
}

// Distinguishes process spawn errors, signal termination, and numeric exit
// codes so a failed spawn is never misread as exit 0.
export function runCommand(command) {
  const [executable, ...args] = command;
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    return {
      exitCode: -1,
      signal: null,
      error: String(result.error?.message ?? result.error),
      stdout: "",
      stderr: "",
    };
  }
  if (result.signal) {
    return {
      exitCode: -2,
      signal: result.signal,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }
  return {
    exitCode: typeof result.status === "number" ? result.status : -3,
    signal: null,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function snapshotUnavailableError(worker, reason, extra = {}) {
  const error = new Error(
    `version snapshot unavailable for '${worker}': ${reason}`
  );
  error.code = "VERSION_SNAPSHOT_UNAVAILABLE";
  Object.assign(error, extra);
  return error;
}

export function assertCredentialsPresent({
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
} = {}) {
  if (!apiToken) {
    throw snapshotUnavailableError(
      "<preflight>",
      "CLOUDFLARE_API_TOKEN is not set"
    );
  }
  if (!accountId) {
    throw snapshotUnavailableError(
      "<preflight>",
      "CLOUDFLARE_ACCOUNT_ID is not set"
    );
  }
  return { apiToken, accountId };
}

export function absentSnapshot(workerName) {
  return {
    worker: workerName,
    state: "absent",
    deploymentId: null,
    createdOn: null,
    strategy: null,
    versions: [],
    deploymentFingerprint: null,
  };
}

export function sortVersions(versions) {
  return [...versions].sort(
    (a, b) =>
      b.percentage - a.percentage ||
      a.versionId.localeCompare(b.versionId)
  );
}

// Deterministic fingerprint of a deployment. Independent of the versions
// array order from the API because versions are sorted first.
export function computeDeploymentFingerprint({
  deploymentId,
  createdOn,
  strategy,
  versions,
}) {
  const payload = JSON.stringify({
    deploymentId,
    createdOn,
    strategy,
    versions: sortVersions(versions),
  });
  return sha256Hex(payload);
}

// Validates one deployment entry from `result.deployments[]` and returns a
// structured snapshot. Any malformed field is fail-closed with
// VERSION_SNAPSHOT_UNAVAILABLE; malformed responses are never silently
// accepted.
export function normalizeDeploymentSnapshot({ workerName, deployment }) {
  if (!deployment || typeof deployment !== "object") {
    throw snapshotUnavailableError(workerName, "deployment entry is malformed");
  }

  const deploymentId = deployment.id;
  if (typeof deploymentId !== "string" || deploymentId.length === 0) {
    throw snapshotUnavailableError(workerName, "deployment id missing");
  }

  const createdOn = deployment.created_on;
  if (
    typeof createdOn !== "string" ||
    createdOn.length === 0 ||
    Number.isNaN(Date.parse(createdOn))
  ) {
    throw snapshotUnavailableError(workerName, "deployment created_on missing or invalid");
  }

  const strategy = deployment.strategy;
  if (typeof strategy !== "string" || strategy.length === 0) {
    throw snapshotUnavailableError(workerName, "deployment strategy missing");
  }

  if (!Array.isArray(deployment.versions) || deployment.versions.length === 0) {
    throw snapshotUnavailableError(workerName, "deployment has no versions");
  }

  const versions = [];
  const seenVersionIds = new Set();
  let percentageTotal = 0;
  for (const entry of deployment.versions) {
    if (!entry || typeof entry !== "object") {
      throw snapshotUnavailableError(workerName, "version entry is malformed");
    }
    const versionId = entry.version_id;
    if (typeof versionId !== "string" || versionId.length === 0) {
      throw snapshotUnavailableError(workerName, "version id missing or empty");
    }
    if (seenVersionIds.has(versionId)) {
      throw snapshotUnavailableError(workerName, `duplicate version id '${versionId}'`);
    }
    seenVersionIds.add(versionId);
    const percentage = entry.percentage;
    if (typeof percentage !== "number" || !Number.isFinite(percentage)) {
      throw snapshotUnavailableError(workerName, "version percentage is not a number");
    }
    if (percentage <= 0 || percentage > 100) {
      throw snapshotUnavailableError(
        workerName,
        `version percentage out of range (${percentage})`
      );
    }
    percentageTotal += percentage;
    versions.push({ versionId, percentage });
  }

  if (Math.abs(percentageTotal - 100) > 1e-6) {
    throw snapshotUnavailableError(
      workerName,
      `version percentages do not sum to 100 (${percentageTotal})`
    );
  }

  const sortedVersions = sortVersions(versions);
  return {
    worker: workerName,
    state: "present",
    deploymentId,
    createdOn,
    strategy,
    versions: sortedVersions,
    deploymentFingerprint: computeDeploymentFingerprint({
      deploymentId,
      createdOn,
      strategy,
      versions: sortedVersions,
    }),
  };
}

export async function collectWorkerVersion(workerName, options = {}) {
  const {
    apiToken = process.env.CLOUDFLARE_API_TOKEN,
    accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
    fetchImpl = fetch,
    timeoutMs = 15000,
  } = options;

  if (!apiToken) {
    throw snapshotUnavailableError(workerName, "credentials missing (CLOUDFLARE_API_TOKEN)");
  }
  if (!accountId) {
    throw snapshotUnavailableError(workerName, "credentials missing (CLOUDFLARE_ACCOUNT_ID)");
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}` +
    `/workers/scripts/${encodeURIComponent(workerName)}/deployments`;

  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error?.name;
    const reason =
      name === "AbortError" || name === "TimeoutError"
        ? "timeout"
        : `network failure: ${name ?? error?.message ?? String(error)}`;
    throw snapshotUnavailableError(workerName, reason);
  }

  if (!response || typeof response.status !== "number") {
    throw snapshotUnavailableError(workerName, "invalid fetch response (no HTTP status)");
  }

  if (response.status === 404) {
    return absentSnapshot(workerName);
  }
  if (response.status === 401) {
    throw snapshotUnavailableError(workerName, "authentication failure (HTTP 401)");
  }
  if (response.status === 403) {
    throw snapshotUnavailableError(workerName, "permission failure (HTTP 403)");
  }
  if (response.status === 429) {
    throw snapshotUnavailableError(workerName, "rate limit (HTTP 429)");
  }
  if (!response.ok) {
    throw snapshotUnavailableError(workerName, `unexpected HTTP status ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw snapshotUnavailableError(workerName, "invalid JSON in response");
  }

  // Real Cloudflare deployments envelope:
  // { success, errors, messages, result: { deployments: [...] } }
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.success === false ||
    !payload.result ||
    typeof payload.result !== "object" ||
    !Array.isArray(payload.result.deployments)
  ) {
    throw snapshotUnavailableError(
      workerName,
      "malformed payload (missing result.deployments array)"
    );
  }

  const deployments = payload.result.deployments;
  if (deployments.length === 0) {
    throw snapshotUnavailableError(workerName, "present worker has no deployments");
  }

  // Per the API contract the first deployment is the current active
  // deployment; do not re-order by fabricated timestamp sorting.
  const active = deployments[0];
  return normalizeDeploymentSnapshot({ workerName, deployment: active });
}

export async function collectWorkerVersions(workerNames, options = {}) {
  const snapshots = {};
  for (const name of workerNames) {
    snapshots[name] = await collectWorkerVersion(name, options);
  }
  return snapshots;
}

export function formatSnapshot(snapshot) {
  if (!snapshot) return "unavailable";
  if (snapshot.state === "absent") return "absent";
  if (typeof snapshot.deploymentId !== "string" || snapshot.deploymentId.length === 0) {
    return "unknown";
  }
  const versionsText = (snapshot.versions ?? [])
    .map((entry) => `${entry.versionId}@${entry.percentage}%`)
    .join(",");
  return `deploy ${snapshot.deploymentId} [${versionsText}]`;
}

export function assertPreflightSnapshot(snapshots, { workerName, protectedNames }) {
  for (const name of protectedNames) {
    const snapshot = snapshots?.[name];
    if (!snapshot) {
      throw snapshotUnavailableError(name, "protected worker snapshot missing");
    }
    if (
      snapshot.state !== "present" ||
      typeof snapshot.deploymentId !== "string" ||
      snapshot.deploymentId.length === 0 ||
      typeof snapshot.deploymentFingerprint !== "string" ||
      snapshot.deploymentFingerprint.length === 0
    ) {
      throw snapshotUnavailableError(
        name,
        `protected worker must be present with an exact deployment fingerprint (state=${snapshot.state})`
      );
    }
  }

  const target = snapshots?.[workerName];
  if (!target) {
    throw snapshotUnavailableError(workerName, "target snapshot missing");
  }
  if (target.state !== "present" && target.state !== "absent") {
    throw snapshotUnavailableError(
      workerName,
      `target state must be 'present' or 'absent' (state=${target.state})`
    );
  }
  return snapshots;
}

export function assertPostflightVerification(before, after, { workerName, protectedNames }) {
  for (const name of [workerName, ...protectedNames]) {
    const snapshot = after?.[name];
    if (!snapshot) {
      throw snapshotUnavailableError(name, "postflight snapshot missing");
    }
    if (name !== workerName && snapshot.state !== "present") {
      throw snapshotUnavailableError(
        name,
        "protected worker must remain present after deployment"
      );
    }
  }

  const targetBefore = before?.[workerName];
  const targetAfter = after?.[workerName];
  if (!targetBefore || !targetAfter) {
    throw snapshotUnavailableError(
      workerName,
      "incomplete before/after target snapshot"
    );
  }

  let targetChanged;
  if (targetBefore.state === "absent") {
    targetChanged =
      targetAfter.state === "present" &&
      typeof targetAfter.deploymentFingerprint === "string" &&
      targetAfter.deploymentFingerprint.length > 0;
  } else {
    targetChanged =
      targetAfter.state === "present" &&
      (targetAfter.deploymentId !== targetBefore.deploymentId ||
        targetAfter.deploymentFingerprint !== targetBefore.deploymentFingerprint);
  }

  if (!targetChanged) {
    const error = new Error(
      `TARGET_VERSION_NOT_CHANGED: '${workerName}' did not gain a new deployment\n` +
        `  before: ${formatSnapshot(targetBefore)}\n` +
        `  after:  ${formatSnapshot(targetAfter)}`
    );
    error.code = "TARGET_VERSION_NOT_CHANGED";
    throw error;
  }

  const protectedDeltas = [];
  for (const name of protectedNames) {
    const beforeSnapshot = before[name];
    const afterSnapshot = after[name];
    const changed =
      beforeSnapshot?.deploymentId !== afterSnapshot?.deploymentId ||
      beforeSnapshot?.deploymentFingerprint !== afterSnapshot?.deploymentFingerprint;
    if (changed) {
      protectedDeltas.push({
        name,
        before: formatSnapshot(beforeSnapshot),
        after: formatSnapshot(afterSnapshot),
      });
    }
  }
  return { targetChanged, protectedDeltas };
}

// Rollback guidance. Automatic rollback stays forbidden. A single-version
// deployment at 100% can print an exact rollback candidate; weighted
// deployments require a manual weighted restore.
export function buildRollbackInfo(snapshot, configPath) {
  if (
    snapshot?.state === "present" &&
    Array.isArray(snapshot.versions) &&
    snapshot.versions.length === 1 &&
    snapshot.versions[0].percentage === 100
  ) {
    const versionId = snapshot.versions[0].versionId;
    const rollbackCommand = buildRollbackCommand({ configPath, versionId });
    return {
      kind: "single",
      message:
        `Exact rollback command (run manually after triage):` +
        `\n  ${rollbackCommand.join(" ")}` +
        `\nPrior version id: ${versionId}`,
      rollbackCommand,
    };
  }
  return {
    kind: "weighted",
    message:
      `MANUAL_WEIGHTED_DEPLOYMENT_RESTORE_REQUIRED` +
      `\nprior deployment id: ${snapshot?.deploymentId ?? "unknown"}` +
      `\nprior versions and percentages:\n` +
      (snapshot?.versions ?? [])
        .map((entry) => `  - ${entry.versionId} (${entry.percentage}%)`)
        .join("\n") +
      `\nDo not fabricate a single-version rollback for a weighted deployment.`,
    rollbackCommand: null,
  };
}

export async function runGuardedPreviewDeploy({
  workerName,
  confirmWorker,
  sourceSha,
  repoRoot,
  execute = false,
  allowDirty = false,
  keepConfig = false,
  runCommand: runCommandImpl,
  fetchImpl,
  apiToken,
  accountId,
  timeoutMs,
  canonicalName,
  protectedNames = PROTECTED_WORKER_NAMES,
  outputDir,
}) {
  const snapshotOptions = { apiToken, accountId, fetchImpl, timeoutMs };
  const versionNames = [workerName, ...protectedNames];
  let safeConfig = null;

  try {
    const canonical = canonicalName ?? (await canonicalWranglerName(repoRoot));
    validatePreviewWorkerName({
      worker: workerName,
      confirmWorker,
      protectedNames,
      canonicalName: canonical,
    });

    const sourceState = await validateSourceState({
      repoRoot,
      sourceSha,
      allowDirty,
    });

    const clientAssets = assertBuildOutputPresent(repoRoot);

    safeConfig = await buildSafePreviewConfig({
      repoRoot,
      workerName,
      outputDir,
    });
    const commands = buildWranglerCommands({
      configPath: safeConfig.configPath,
    });

    const result = {
      worker: workerName,
      confirmWorker,
      sourceSha,
      canonicalName: canonical,
      sourceState,
      clientAssets,
      safeConfig,
      commands,
      execute,
      dryRunDefault: !execute,
      configCleanup: keepConfig ? "kept" : "removed",
      run: [],
    };

    const dryRun = runCommandImpl(commands.dryRun);
    result.run.push({
      kind: "dryRun",
      command: commands.dryRun,
      exitCode: dryRun.exitCode,
    });
    result.dryRun = {
      command: commands.dryRun,
      exitCode: dryRun.exitCode,
      stdout: dryRun.stdout,
      stderr: dryRun.stderr,
    };

    if (!execute) {
      if (dryRun.exitCode !== 0) {
        result.warning =
          "wrangler dry-run failed; remote deployment remains blocked without --execute";
      }
      return result;
    }

    if (dryRun.exitCode !== 0) {
      const error = new Error(
        `wrangler dry-run failed (exit ${dryRun.exitCode}); remote deployment aborted`
      );
      error.code = "DRY_RUN_FAILED";
      error.dryRun = result.dryRun;
      throw error;
    }

    assertCredentialsPresent(snapshotOptions);
    const before = await collectWorkerVersions(versionNames, snapshotOptions);
    assertPreflightSnapshot(before, { workerName, protectedNames });
    result.before = before;

    const deploy = runCommandImpl(commands.deploy);
    result.run.push({
      kind: "deploy",
      command: commands.deploy,
      exitCode: deploy.exitCode,
    });
    result.deploy = {
      command: commands.deploy,
      exitCode: deploy.exitCode,
      stdout: deploy.stdout,
      stderr: deploy.stderr,
    };
    if (deploy.exitCode !== 0) {
      const error = new Error(
        `wrangler deploy failed (exit ${deploy.exitCode}); see stderr`
      );
      error.code = "DEPLOY_FAILED";
      error.deploy = result.deploy;
      throw error;
    }

    let after;
    try {
      after = await collectWorkerVersions(versionNames, snapshotOptions);
    } catch (error) {
      const incident = snapshotUnavailableError(
        workerName,
        `postflight snapshot unavailable after the deploy command succeeded: ${error?.message ?? error}`
      );
      incident.afterDeploySucceeded = true;
      incident.beforeSnapshot = before;
      incident.manualVerification =
        "Deploy command succeeded but post-deploy verification is impossible. " +
        "Do NOT report success and do NOT auto-rollback; this is a second-order " +
        "incident risk. Manually verify the intended target Worker version via " +
        "the Cloudflare dashboard/API against the before snapshot, then run the " +
        "documented incident procedure.";
      throw incident;
    }
    result.after = after;

    const verification = assertPostflightVerification(before, after, {
      workerName,
      protectedNames,
    });
    result.protectedDeltas = verification.protectedDeltas;

    if (verification.protectedDeltas.length > 0) {
      const firstDelta = verification.protectedDeltas[0];
      const rollbackInfo = buildRollbackInfo(
        before[firstDelta.name],
        safeConfig.configPath
      );
      const error = new Error(
        `PROTECTED_WORKER_CHANGED\n` +
          `A protected Worker gained a new deployment during this deployment:\n` +
          verification.protectedDeltas
            .map(
              (delta) =>
                `  - ${delta.name}: before ${delta.before}, after ${delta.after}`
            )
            .join("\n") +
          `\nDo NOT perform an automated rollback; this is a second-order incident risk.` +
          `\n${rollbackInfo.message}`
      );
      error.code = "PROTECTED_WORKER_CHANGED";
      error.protectedDeltas = verification.protectedDeltas;
      error.rollbackCommand = rollbackInfo.rollbackCommand ?? null;
      throw error;
    }

    return result;
  } catch (error) {
    if (
      safeConfig &&
      error &&
      typeof error === "object" &&
      error.safeConfig === undefined
    ) {
      error.safeConfig = safeConfig;
    }
    throw error;
  } finally {
    if (safeConfig && !keepConfig) {
      await removeSafeConfig(safeConfig);
    }
  }
}

export function formatResult(result) {
  const lines = [];
  lines.push(
    `[isolated-preview-deploy-guard] ${result.execute ? "EXECUTE" : "DRY-RUN"}`
  );
  lines.push(`resolved worker:        ${result.worker}`);
  lines.push(`confirm worker:         ${result.confirmWorker}`);
  lines.push(`source sha:             ${result.sourceSha}`);
  lines.push(`current HEAD:           ${result.sourceState.head}`);
  lines.push(`branch:                 ${result.sourceState.branch}`);
  lines.push(
    `worktree:               ${result.sourceState.clean ? "clean" : `dirty${result.sourceState.patchSha256 ? ` (patch sha-256 ${result.sourceState.patchSha256})` : ""}`}`
  );
  if (result.sourceState.dirtyTrackedFiles?.length > 0) {
    lines.push(
      `dirty tracked files:    ${result.sourceState.dirtyTrackedFiles.join(", ")}`
    );
  }
  lines.push(`client assets:          ${result.clientAssets.clientAssets}`);
  lines.push(`built worker config:    ${result.clientAssets.builtConfigPath}`);
  lines.push(
    `generated config:       ${result.safeConfig.configPath} (${result.configCleanup ?? "removed"})`
  );
  lines.push(`generated config sha-256: ${result.safeConfig.configSha256}`);
  lines.push(
    `protected workers blocked: ${PROTECTED_WORKER_NAMES.join(", ")}`
  );
  lines.push(`dry-run command:        ${result.commands.dryRun.join(" ")}`);
  lines.push(`deploy command:         ${result.commands.deploy.join(" ")}`);
  lines.push(
    `dry-run result:         exit ${result.dryRun.exitCode}${result.dryRun.exitCode !== 0 ? " (FAILED)" : ""}`
  );
  if (!result.execute) {
    lines.push(`NO REMOTE DEPLOYMENT: pass --execute to allow an upload`);
  }
  if (result.deploy) {
    lines.push(`deploy result:          exit ${result.deploy.exitCode}`);
  }
  if (result.before && result.after) {
    const targetBefore = result.before[result.worker];
    const targetAfter = result.after[result.worker];
    lines.push(`target before:          ${formatSnapshot(targetBefore)}`);
    if (targetBefore?.deploymentFingerprint) {
      lines.push(`target before fp:       ${targetBefore.deploymentFingerprint}`);
    }
    lines.push(`target after:           ${formatSnapshot(targetAfter)}`);
    if (targetAfter?.deploymentFingerprint) {
      lines.push(`target after fp:        ${targetAfter.deploymentFingerprint}`);
    }
    for (const name of PROTECTED_WORKER_NAMES) {
      const beforeSnapshot = result.before[name];
      const afterSnapshot = result.after[name];
      lines.push(
        `protected ${name}:       ${formatSnapshot(beforeSnapshot)} -> ${formatSnapshot(afterSnapshot)}`
      );
      if (beforeSnapshot?.deploymentFingerprint) {
        lines.push(`protected ${name} fp:    ${beforeSnapshot.deploymentFingerprint}`);
      }
    }
  }
  if (result.warning) lines.push(`warning:                ${result.warning}`);
  return lines.join("\n");
}
