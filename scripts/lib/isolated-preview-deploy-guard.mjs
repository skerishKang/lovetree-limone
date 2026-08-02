#!/usr/bin/env node
// Guarded isolated-preview deployment core.
//
// Incident context (Issue #26, 2026-08-02): a `vinext deploy --skip-build`
// attempt intended for the isolated Worker `lovetree-limone-cache-pr12-preview`
// ignored the requested name override and targeted the repository default
// Production Worker `lovetree-limone`. This module makes that class of mistake
// impossible: the deployment target is always derived from a generated, safe
// Wrangler config whose `name` is the exact isolated preview Worker, protected
// names are rejected, the default is dry-run, and `--execute` is required for
// any remote upload.

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

export async function validateSourceState({
  repoRoot,
  sourceSha,
  allowDirty = false,
}) {
  const head = gitCapture(repoRoot, ["rev-parse", "HEAD"]).stdout.trim();
  const branch =
    gitCapture(repoRoot, ["branch", "--show-current"]).stdout.trim() ||
    "(detached HEAD)";
  const porcelain = gitCapture(repoRoot, ["status", "--porcelain"]).stdout;
  const clean = porcelain.length === 0;

  if (head !== sourceSha) {
    const error = new Error(
      `source SHA mismatch: expected ${sourceSha}, current HEAD is ${head}`
    );
    error.code = "SOURCE_SHA_MISMATCH";
    throw error;
  }

  let patchSha256 = null;
  if (!clean) {
    if (!allowDirty) {
      const changed = porcelain
        .split("\n")
        .filter((line) => line.trim().length > 0).length;
      const error = new Error(
        `dirty worktree is blocked by default (${changed} changed entr${changed === 1 ? "y" : "ies"}); ` +
          "use --allow-dirty only for an explicit A/B marker deployment"
      );
      error.code = "DIRTY_WORKTREE";
      error.porcelain = porcelain;
      throw error;
    }
    const diff = gitCapture(repoRoot, ["diff", "HEAD"]).stdout;
    patchSha256 = sha256Hex(diff);
  }

  return { head, branch, clean, dirty: !clean, porcelain, patchSha256 };
}

export function assertBuildOutputPresent(repoRoot) {
  const clientAssets = path.join(repoRoot, "dist", "client");
  if (!existsSync(clientAssets)) {
    const error = new Error(
      `build output not found at ${clientAssets}; run 'npm run build' first`
    );
    error.code = "BUILD_OUTPUT_MISSING";
    throw error;
  }
  return clientAssets;
}

function pickSafeCommon(source, repoRoot) {
  const allowed = {};
  if (source.$schema !== undefined) allowed.$schema = source.$schema;
  if (source.compatibility_date !== undefined) {
    allowed.compatibility_date = source.compatibility_date;
  }
  if (source.compatibility_flags !== undefined) {
    allowed.compatibility_flags = structuredClone(source.compatibility_flags);
  }
  if (source.main !== undefined) {
    allowed.main = path.resolve(repoRoot, source.main);
  }
  if (source.assets !== undefined) {
    const { directory, binding, ...rest } = source.assets;
    if (directory !== undefined) {
      allowed.assets = {
        ...structuredClone(rest),
        directory: path.resolve(repoRoot, directory),
        ...(binding !== undefined ? { binding } : {}),
      };
    } else {
      allowed.assets = structuredClone(source.assets);
    }
  }
  if (source.node_compat !== undefined) {
    allowed.node_compat = structuredClone(source.node_compat);
  }
  if (source.observability !== undefined) {
    allowed.observability = structuredClone(source.observability);
  }
  return allowed;
}

export async function buildSafePreviewConfig({
  repoRoot,
  workerName,
  outputDir,
}) {
  const source = await readWranglerConfig(repoRoot);
  const safe = {
    ...pickSafeCommon(source, repoRoot),
    name: workerName,
    workers_dev: true,
    vars: {
      APP_ENV: "staging",
      API_MUTATIONS_ENABLED: "false",
    },
  };

  const firebaseProjectId = source?.vars?.FIREBASE_PROJECT_ID;
  if (typeof firebaseProjectId === "string" && firebaseProjectId.length > 0) {
    safe.vars.FIREBASE_PROJECT_ID = firebaseProjectId;
  }

  const requiredSecrets = source?.secrets?.required;
  if (Array.isArray(requiredSecrets) && requiredSecrets.length > 0) {
    safe.secrets = { required: [...requiredSecrets] };
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

export async function collectWorkerVersion(
  workerName,
  { apiToken = process.env.CLOUDFLARE_API_TOKEN, accountId = process.env.CLOUDFLARE_ACCOUNT_ID } = {}
) {
  if (!apiToken || !accountId) return null;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(workerName)}/deployments`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const deployments = Array.isArray(payload?.result)
      ? payload.result.filter(
          (entry) => entry?.version_id || entry?.deployment_id
        )
      : [];
    if (deployments.length === 0) return null;
    const latest = deployments[deployments.length - 1];
    return latest?.version_id ?? latest?.deployment_id ?? null;
  } catch {
    return null;
  }
}

export async function collectWorkerVersions(
  workerNames,
  { apiToken = process.env.CLOUDFLARE_API_TOKEN, accountId = process.env.CLOUDFLARE_ACCOUNT_ID } = {}
) {
  const versions = {};
  for (const name of workerNames) {
    versions[name] = await collectWorkerVersion(name, { apiToken, accountId });
  }
  return versions;
}

export async function runGuardedPreviewDeploy({
  workerName,
  confirmWorker,
  sourceSha,
  repoRoot,
  execute = false,
  allowDirty = false,
  runCommand,
  collectVersions,
  canonicalName,
  protectedNames = PROTECTED_WORKER_NAMES,
}) {
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

  const safeConfig = await buildSafePreviewConfig({
    repoRoot,
    workerName,
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
    run: [],
  };

  const dryRun = runCommand(commands.dryRun);
  result.run.push({ kind: "dryRun", command: commands.dryRun, exitCode: dryRun.exitCode });
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

  const versionNames = [workerName, ...protectedNames];
  const before =
    typeof collectVersions === "function"
      ? await collectVersions(versionNames)
      : null;
  result.before = before;

  if (dryRun.exitCode !== 0) {
    const error = new Error(
      `wrangler dry-run failed (exit ${dryRun.exitCode}); remote deployment aborted`
    );
    error.code = "DRY_RUN_FAILED";
    error.dryRun = result.dryRun;
    throw error;
  }

  const deploy = runCommand(commands.deploy);
  result.run.push({ kind: "deploy", command: commands.deploy, exitCode: deploy.exitCode });
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

  const after =
    typeof collectVersions === "function"
      ? await collectVersions(versionNames)
      : null;
  result.after = after;

  const protectedDeltas = [];
  if (before && after) {
    for (const name of protectedNames) {
      if (before[name] && after[name] && before[name] !== after[name]) {
        protectedDeltas.push({ name, before: before[name], after: after[name] });
      }
    }
  }
  result.protectedDeltas = protectedDeltas;

  if (protectedDeltas.length > 0) {
    const priorVersionId = protectedDeltas[0].before;
    const rollback = buildRollbackCommand({
      configPath: safeConfig.configPath,
      versionId: priorVersionId,
    });
    const error = new Error(
      `PROTECTED_WORKER_CHANGED\n` +
        `A protected Worker gained a new version during this deployment:\n` +
        protectedDeltas
          .map(
            (delta) =>
              `  - ${delta.name}: before ${delta.before}, after ${delta.after}`
          )
          .join("\n") +
        `\nDo NOT perform an automated rollback; this is a second-order incident risk.` +
        `\nExact rollback command (run manually after triage):` +
        `\n  ${rollback.join(" ")}` +
        `\nPrior version id: ${priorVersionId}`
    );
    error.code = "PROTECTED_WORKER_CHANGED";
    error.protectedDeltas = protectedDeltas;
    error.rollbackCommand = rollback;
    throw error;
  }

  return result;
}

export function formatResult(result) {
  const lines = [];
  lines.push(`[isolated-preview-deploy-guard] ${result.execute ? "EXECUTE" : "DRY-RUN"}`);
  lines.push(`resolved worker:        ${result.worker}`);
  lines.push(`confirm worker:         ${result.confirmWorker}`);
  lines.push(`source sha:             ${result.sourceSha}`);
  lines.push(`current HEAD:           ${result.sourceState.head}`);
  lines.push(`branch:                 ${result.sourceState.branch}`);
  lines.push(
    `worktree:               ${result.sourceState.clean ? "clean" : `dirty${result.sourceState.patchSha256 ? ` (patch sha-256 ${result.sourceState.patchSha256})` : ""}`}`
  );
  lines.push(`build output:           ${result.clientAssets}`);
  lines.push(`generated config:       ${result.safeConfig.configPath}`);
  lines.push(`generated config sha-256: ${result.safeConfig.configSha256}`);
  lines.push(`protected workers blocked: ${PROTECTED_WORKER_NAMES.join(", ")}`);
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
    lines.push(`target version before:  ${result.before[result.worker] ?? "unknown"}`);
    lines.push(`target version after:   ${result.after[result.worker] ?? "unknown"}`);
    for (const name of PROTECTED_WORKER_NAMES) {
      lines.push(
        `protected ${name} version: ${result.before[name] ?? "unknown"} -> ${result.after[name] ?? "unknown"}`
      );
    }
  }
  if (result.warning) lines.push(`warning:                ${result.warning}`);
  return lines.join("\n");
}
