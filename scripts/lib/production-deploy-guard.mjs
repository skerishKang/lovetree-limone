#!/usr/bin/env node
// Guarded exact-production deployment core (fail-closed).
//
// Context (2026-08-07): the Production Worker `lovetree-limone` runs in
// staging-preview mode (API_MUTATIONS_ENABLED=false). Deploying exact main
// with mutations enabled requires the production Wrangler environment, but
// that environment had no explicit `name`. Under Wrangler's legacy
// environment naming scheme a `CLOUDFLARE_ENV=production` build resolved the
// Worker name to `lovetree-limone-production` — a *different* Worker. This
// module makes that class of mistake impossible:
//
//   - the resolved production target must be exactly `lovetree-limone`
//     (`lovetree-limone-production` is a forbidden target);
//   - vars/bindings/secrets must match the expected production set exactly
//     (no binding drift);
//   - the git source must be the exact release SHA with a clean worktree
//     (HEAD and origin/main both checked);
//   - the current active version of the live Worker must equal
//     --expected-current-version;
//   - the production DB must be in the verified Expand state (read-only,
//     SELECT/catalog queries only);
//   - the build output used for deploy must be a fresh production build
//     (dist/server/wrangler.json must carry the production target);
//   - the default is dry-run; `--execute` is required for the real upload;
//   - no secret value is ever printed.
//
// The deploy command is `npx wrangler deploy` run with
// CLOUDFLARE_ENV=production (the same environment used for the build), so the
// build and the deploy always agree on the target Worker and its bindings.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

export const PRODUCTION_WORKER_NAME = "lovetree-limone";
export const FORBIDDEN_WORKER_NAME = "lovetree-limone-production";
export const EXPECTED_COMPATIBILITY_DATE = "2026-07-01";
export const EXPECTED_VARS = Object.freeze({
  APP_ENV: "production",
  API_MUTATIONS_ENABLED: "true",
  FIREBASE_PROJECT_ID: "relovetree",
});
export const EXPECTED_REQUIRED_SECRETS = Object.freeze(["DATABASE_URL"]);
// Exact binding-name set for the production Worker (assets binding + vars +
// the required secret). Any addition or removal is binding drift.
export const EXPECTED_BINDING_NAMES = Object.freeze(
  ["ASSETS", "APP_ENV", "API_MUTATIONS_ENABLED", "FIREBASE_PROJECT_ID", "DATABASE_URL"].sort()
);

function stripJsoncComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^\\:])\/\/.*$/gm, "$1");
}

export function parseWranglerConfig(source) {
  return JSON.parse(stripJsoncComments(source));
}

// Effective production environment, resolved the way Wrangler resolves it:
// `env.<env>.name` overrides the top-level name; without an env name the
// legacy environment naming scheme produces `<top-level-name>-<env>`.
export function resolveProductionConfig(source) {
  const config = parseWranglerConfig(source);
  const envBlock = config.env?.production ?? {};
  const topName = typeof config.name === "string" ? config.name : null;
  const envName =
    typeof envBlock.name === "string" && envBlock.name.length > 0
      ? envBlock.name
      : null;
  const resolvedName =
    envName ?? (topName ? `${topName}-production` : null);
  const vars = { ...(config.vars ?? {}), ...(envBlock.vars ?? {}) };
  const secretsRequired =
    envBlock.secrets?.required ?? config.secrets?.required ?? [];
  const compatibilityDate =
    envBlock.compatibility_date ?? config.compatibility_date ?? null;
  return {
    config,
    envBlock,
    topName,
    envName,
    resolvedName,
    vars,
    secretsRequired,
    compatibilityDate,
  };
}

// The plain (no-env) deploy target: the top-level config. It must stay
// staging-preview so a raw `npx wrangler deploy` can never enable mutations.
export function resolveDefaultTarget(source) {
  const config = parseWranglerConfig(source);
  return {
    name: typeof config.name === "string" ? config.name : null,
    vars: { ...(config.vars ?? {}) },
    compatibilityDate: config.compatibility_date ?? null,
  };
}

// Sorted binding names implied by the resolved production config.
export function configBindingNames(prod) {
  const names = [];
  if (prod.config?.assets?.binding) names.push(prod.config.assets.binding);
  for (const key of Object.keys(prod.vars)) names.push(key);
  for (const secret of prod.secretsRequired ?? []) names.push(secret);
  return names.sort();
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// ── git ────────────────────────────────────────────────────────────────────

function gitCapture(repoRoot, args) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

export function verifyGitState({ repoRoot, sourceSha }) {
  const head = gitCapture(repoRoot, ["rev-parse", "HEAD"]);
  const originMain = gitCapture(repoRoot, ["rev-parse", "origin/main"]);
  const status = gitCapture(repoRoot, ["status", "--porcelain"]);
  return {
    head: head.ok ? head.stdout : null,
    originMain: originMain.ok ? originMain.stdout : null,
    dirty: status.ok && status.stdout.length > 0,
    headOk: head.ok && head.stdout === sourceSha,
    originMainOk: originMain.ok && originMain.stdout === sourceSha,
  };
}

// ── command runner ─────────────────────────────────────────────────────────

// Like the isolated-preview `runCommand` but with an explicit env (so the
// production build/deploy environment can be forced) and cwd.
export function runCommandEnv(command, options = {}) {
  const { env = {}, cwd = process.cwd() } = options;
  const [executable, ...args] = command;
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
    cwd,
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

// ── Cloudflare state (read-only, wrangler CLI over OAuth) ──────────────────

// Picks the most recent deployment (newest created_on) and its highest-
// percentage version. The wrangler CLI returns deployments oldest-first, so
// "first entry" is not the active one; sorting is authoritative.
export function latestActiveVersionId(deployments) {
  if (!Array.isArray(deployments) || deployments.length === 0) return null;
  const sorted = [...deployments].sort((a, b) =>
    String(b.created_on ?? "").localeCompare(String(a.created_on ?? ""))
  );
  const active = sorted[0];
  const versions = Array.isArray(active?.versions) ? active.versions : [];
  const byPercentage = [...versions].sort(
    (a, b) => (b.percentage ?? 0) - (a.percentage ?? 0)
  );
  const top = byPercentage[0];
  if (!top || typeof top.version_id !== "string") return null;
  return {
    deploymentId: active?.id ?? null,
    versionId: top.version_id,
    createdOn: active?.created_on ?? null,
  };
}

export function collectActiveVersion(runCommandImpl, workerName, repoRoot) {
  const result = runCommandImpl(
    ["npx", "wrangler", "deployments", "list", "--name", workerName, "--json"],
    { cwd: repoRoot }
  );
  if (result.exitCode !== 0) {
    // Non-zero exit (e.g. code 10007) means the Worker does not exist.
    return { exists: false, versionId: null, deploymentId: null, createdOn: null, error: null };
  }
  try {
    const deployments = JSON.parse(result.stdout);
    const latest = latestActiveVersionId(deployments);
    if (!latest) {
      return {
        exists: true,
        versionId: null,
        deploymentId: null,
        createdOn: null,
        error: "deployments JSON has no parseable active version",
      };
    }
    return { exists: true, ...latest, error: null };
  } catch (error) {
    return {
      exists: true,
      versionId: null,
      deploymentId: null,
      createdOn: null,
      error: `invalid deployments JSON: ${error.message}`,
    };
  }
}

export function collectSecrets(runCommandImpl, workerName, repoRoot) {
  const result = runCommandImpl(
    // wrangler >=4.9x rejects `--json` for `secret list`; `--format json` is the
    // supported flag (and the default output format for this command).
    ["npx", "wrangler", "secret", "list", "--name", workerName, "--format", "json"],
    { cwd: repoRoot }
  );
  if (result.exitCode !== 0) return [];
  try {
    const list = JSON.parse(result.stdout);
    if (!Array.isArray(list)) return [];
    return list
      .map((entry) => entry?.name)
      .filter((name) => typeof name === "string")
      .sort();
  } catch {
    return [];
  }
}

// ── build output ───────────────────────────────────────────────────────────

export function verifyBuiltConfig({ repoRoot }) {
  const serverDir = path.join(repoRoot, "dist", "server");
  const clientDir = path.join(repoRoot, "dist", "client");
  const configPath = path.join(serverDir, "wrangler.json");
  const checks = [];
  let name = null;
  let vars = {};
  let compatibilityDate = null;

  if (!existsSync(configPath)) {
    checks.push(["built-config-present", false, "dist/server/wrangler.json missing"]);
    return { checks };
  }
  try {
    const built = JSON.parse(readFileSync(configPath, "utf8"));
    name = built.name ?? null;
    vars = built.vars ?? {};
    compatibilityDate = built.compatibility_date ?? null;
    checks.push([
      "built-name",
      name === PRODUCTION_WORKER_NAME,
      `name='${name}' expected='${PRODUCTION_WORKER_NAME}'`,
    ]);
    checks.push([
      "built-app-env",
      vars.APP_ENV === EXPECTED_VARS.APP_ENV,
      `APP_ENV='${vars.APP_ENV}' expected='${EXPECTED_VARS.APP_ENV}'`,
    ]);
    checks.push([
      "built-mutations",
      vars.API_MUTATIONS_ENABLED === EXPECTED_VARS.API_MUTATIONS_ENABLED,
      `API_MUTATIONS_ENABLED='${vars.API_MUTATIONS_ENABLED}' expected='${EXPECTED_VARS.API_MUTATIONS_ENABLED}'`,
    ]);
    checks.push([
      "built-firebase-project",
      vars.FIREBASE_PROJECT_ID === EXPECTED_VARS.FIREBASE_PROJECT_ID,
      `FIREBASE_PROJECT_ID='${vars.FIREBASE_PROJECT_ID}' expected='${EXPECTED_VARS.FIREBASE_PROJECT_ID}'`,
    ]);
    checks.push([
      "built-compat-date",
      compatibilityDate === EXPECTED_COMPATIBILITY_DATE,
      `compatibility_date='${compatibilityDate}' expected='${EXPECTED_COMPATIBILITY_DATE}'`,
    ]);
  } catch (error) {
    checks.push(["built-config-parse", false, error.message]);
  }
  // This is an RSC/SSR app: HTML is rendered at runtime by the worker, so the
  // client build is verified via the emitted assets directory (never a static
  // index.html).
  const clientAssets = path.join(clientDir, "assets");
  const hasClientAssets =
    existsSync(clientAssets) &&
    (() => {
      try {
        return readdirSync(clientAssets).length > 0;
      } catch {
        return false;
      }
    })();
  checks.push([
    "built-client-assets",
    hasClientAssets,
    "dist/client/assets present and non-empty",
  ]);
  checks.push([
    "built-worker-entry",
    existsSync(path.join(serverDir, "index.js")),
    "dist/server/index.js present",
  ]);
  return { checks };
}

export function runDeployDryRun(runCommandImpl, repoRoot) {
  const result = runCommandImpl(
    ["npx", "wrangler", "deploy", "--dry-run"],
    { env: { CLOUDFLARE_ENV: "production" }, cwd: repoRoot }
  );
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    exitCode: result.exitCode,
    hasMutationsTrue: /API_MUTATIONS_ENABLED \("true"\)/.test(output),
    hasAppEnvProduction: /APP_ENV \("production"\)/.test(output),
    matchesForbidden: output.includes(FORBIDDEN_WORKER_NAME),
  };
}

// ── production DB Expand state (read-only) ─────────────────────────────────

// Uses the `pg` driver with SELECT/catalog queries only. `pgFactory` is
// injectable so tests can substitute a fake client.
export async function verifyProductionDbExpandState({
  connectionString,
  pgFactory = pg.Client,
}) {
  const client = new pgFactory({ connectionString });
  await client.connect();
  try {
    const query = async (sql) => (await client.query(sql)).rows;

    const sortOrderColumns = await query(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'memories'
          AND column_name = 'sort_order'`
    );
    const partialIndex = await query(
      `SELECT 1 AS found FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'memories_tree_sort_order_uniq_partial'`
    );
    const fullIndex = await query(
      `SELECT 1 AS found FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'memories_tree_sort_order_uniq'`
    );
    const clientKeyIndex = await query(
      `SELECT 1 AS found FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'memories_tree_client_key_uniq'`
    );
    const orphan = await query(
      `SELECT count(*)::int AS c FROM memories m
        WHERE NOT EXISTS (SELECT 1 FROM trees t WHERE t.id = m.tree_id)`
    );
    const duplicateSort = await query(
      `SELECT count(*)::int AS c FROM (
         SELECT tree_id, sort_order FROM memories
         GROUP BY tree_id, sort_order HAVING count(*) > 1
       ) d`
    );
    const nullSort = await query(
      `SELECT count(*)::int AS c FROM memories WHERE sort_order IS NULL`
    );
    const trees = await query(`SELECT count(*)::int AS c FROM trees`);
    const memories = await query(`SELECT count(*)::int AS c FROM memories`);

    const column = sortOrderColumns[0];
    const checks = {
      sortOrderColumn: sortOrderColumns.length === 1,
      sortOrderInteger: column?.data_type === "integer",
      sortOrderNullable: column?.is_nullable === "YES",
      sortOrderNoDefault: column?.column_default == null,
      partialUniqueIndex: partialIndex.length === 1,
      fullUniqueIndexAbsent: fullIndex.length === 0,
      clientKeyUniqueIndex: clientKeyIndex.length === 1,
      orphanZero: orphan[0]?.c === 0,
      duplicateSortZero: duplicateSort[0]?.c === 0,
      nullSortZero: nullSort[0]?.c === 0,
    };
    return {
      checks,
      problems: Object.entries(checks)
        .filter(([, ok]) => !ok)
        .map(([key]) => key),
      counts: {
        trees: trees[0]?.c ?? null,
        memories: memories[0]?.c ?? null,
      },
    };
  } finally {
    await client.end().catch(() => {});
  }
}

// ── guarded deploy ─────────────────────────────────────────────────────────

export function buildRollbackCommand({ versionId }) {
  return ["npx", "wrangler", "rollback", versionId, "--name", PRODUCTION_WORKER_NAME];
}

export function guardError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

export async function runGuardedProductionDeploy({
  sourceSha,
  expectedCurrentVersion,
  confirmWorker,
  repoRoot,
  execute = false,
  dbConnectionString = process.env.DATABASE_URL ?? null,
  runCommandImpl = runCommandEnv,
  pgFactory = pg.Client,
  log = () => {},
}) {
  const checks = [];
  const problems = [];
  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail });
    if (!ok) problems.push(name);
  };

  // A. required arguments
  const missing = [];
  if (typeof sourceSha !== "string" || sourceSha.length === 0) missing.push("--source-sha");
  if (typeof expectedCurrentVersion !== "string" || expectedCurrentVersion.length === 0) {
    missing.push("--expected-current-version");
  }
  if (typeof confirmWorker !== "string" || confirmWorker.length === 0) {
    missing.push("--confirm-worker");
  }
  if (missing.length > 0) {
    throw guardError("MISSING_ARGS", `missing required argument(s): ${missing.join(", ")}`);
  }
  record(
    "confirm-worker",
    confirmWorker === PRODUCTION_WORKER_NAME,
    `confirm-worker='${confirmWorker}' expected='${PRODUCTION_WORKER_NAME}'`
  );

  // B. resolved production config (source wrangler.jsonc)
  const source = await readFile(path.join(repoRoot, "wrangler.jsonc"), "utf8");
  const prod = resolveProductionConfig(source);
  record(
    "worker-name",
    prod.resolvedName === PRODUCTION_WORKER_NAME,
    `resolved='${prod.resolvedName}' expected='${PRODUCTION_WORKER_NAME}'`
  );
  record(
    "forbidden-name",
    prod.resolvedName !== FORBIDDEN_WORKER_NAME,
    `resolved='${prod.resolvedName}'`
  );
  record(
    "app-env",
    prod.vars.APP_ENV === EXPECTED_VARS.APP_ENV,
    `APP_ENV='${prod.vars.APP_ENV}' expected='${EXPECTED_VARS.APP_ENV}'`
  );
  record(
    "mutations-enabled",
    prod.vars.API_MUTATIONS_ENABLED === EXPECTED_VARS.API_MUTATIONS_ENABLED,
    `API_MUTATIONS_ENABLED='${prod.vars.API_MUTATIONS_ENABLED}' expected='${EXPECTED_VARS.API_MUTATIONS_ENABLED}'`
  );
  record(
    "firebase-project",
    prod.vars.FIREBASE_PROJECT_ID === EXPECTED_VARS.FIREBASE_PROJECT_ID,
    `FIREBASE_PROJECT_ID='${prod.vars.FIREBASE_PROJECT_ID}' expected='${EXPECTED_VARS.FIREBASE_PROJECT_ID}'`
  );
  record(
    "required-secret",
    (prod.secretsRequired ?? []).includes("DATABASE_URL"),
    `secrets.required=${JSON.stringify(prod.secretsRequired ?? [])}`
  );
  record(
    "compatibility-date",
    prod.compatibilityDate === EXPECTED_COMPATIBILITY_DATE,
    `compatibility_date='${prod.compatibilityDate}' expected='${EXPECTED_COMPATIBILITY_DATE}'`
  );
  const bindingNames = configBindingNames(prod);
  record(
    "binding-drift",
    arraysEqual(bindingNames, EXPECTED_BINDING_NAMES),
    `config bindings=${JSON.stringify(bindingNames)} expected=${JSON.stringify(EXPECTED_BINDING_NAMES)}`
  );

  // C. git state
  const git = verifyGitState({ repoRoot, sourceSha });
  record("source-sha-head", git.headOk, `HEAD=${git.head ?? "(unavailable)"}`);
  record(
    "source-sha-origin-main",
    git.originMainOk,
    `origin/main=${git.originMain ?? "(unavailable)"}`
  );
  record("worktree-clean", !git.dirty, git.dirty ? "worktree has changes" : "clean");

  // D. live Cloudflare state (read-only)
  const current = collectActiveVersion(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
  if (current.error) {
    record("current-version", false, current.error);
  } else {
    record(
      "current-version",
      current.versionId === expectedCurrentVersion,
      `active=${current.versionId} expected=${expectedCurrentVersion}`
    );
  }
  const forbidden = collectActiveVersion(runCommandImpl, FORBIDDEN_WORKER_NAME, repoRoot);
  record(
    "forbidden-worker-absent",
    !forbidden.exists,
    forbidden.exists
      ? `forbidden Worker '${FORBIDDEN_WORKER_NAME}' has deployments (deployment ${forbidden.deploymentId})`
      : `forbidden Worker '${FORBIDDEN_WORKER_NAME}' absent`
  );
  const secretNames = collectSecrets(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
  record(
    "secret-database-url",
    secretNames.includes("DATABASE_URL"),
    secretNames.length > 0
      ? `secrets=[${secretNames.join(",")}] (values never read)`
      : "no secrets found"
  );

  // E. fresh production build output
  const built = verifyBuiltConfig({ repoRoot });
  for (const [name, ok, detail] of built.checks) record(name, ok, detail);

  // F. wrangler dry-run with the production environment
  const dry = runDeployDryRun(runCommandImpl, repoRoot);
  record("deploy-dry-run-exit", dry.exitCode === 0, `exit=${dry.exitCode}`);
  record("dry-run-mutations-true", dry.hasMutationsTrue, "bindings show API_MUTATIONS_ENABLED (\"true\")");
  record("dry-run-app-env-production", dry.hasAppEnvProduction, "bindings show APP_ENV (\"production\")");
  record("dry-run-no-forbidden", !dry.matchesForbidden, "dry-run does not mention the forbidden Worker");

  // G. production DB Expand state (read-only, fail-closed)
  if (dbConnectionString) {
    const db = await verifyProductionDbExpandState({ connectionString: dbConnectionString, pgFactory });
    for (const check of Object.entries(db.checks)) {
      record(`db-${check[0]}`, check[1], check[0]);
    }
    record(
      "db-expand-state",
      db.problems.length === 0,
      `trees=${db.counts.trees} memories=${db.counts.memories} problems=${JSON.stringify(db.problems)}`
    );
  } else {
    record(
      "db-expand-state",
      false,
      "DATABASE_URL not available locally; Production DB Expand state could not be verified (fail-closed)"
    );
  }

  const result = {
    status: null,
    sourceSha,
    expectedCurrentVersion,
    confirmWorker,
    execute,
    checks,
    problems,
    blocked: problems.length > 0,
    rollbackTarget: expectedCurrentVersion,
    rollbackCommand: buildRollbackCommand({ versionId: expectedCurrentVersion }),
  };

  if (result.blocked) {
    result.status = "BLOCKED";
    log(`[production-deploy-guard] BLOCKED by ${problems.length} failing check(s)`);
    return result;
  }

  result.configTarget = {
    worker: prod.resolvedName,
    vars: prod.vars,
    compatibilityDate: prod.compatibilityDate,
    bindings: bindingNames,
  };

  if (!execute) {
    result.status = "DRY_RUN_GO";
    log("[production-deploy-guard] all checks passed in dry-run mode; no Worker upload was performed");
    return result;
  }

  // H. guarded deploy (only with --execute and after every check passed)
  const deploy = runCommandImpl(["npx", "wrangler", "deploy"], {
    env: { CLOUDFLARE_ENV: "production" },
    cwd: repoRoot,
  });
  record("deploy-exit", deploy.exitCode === 0, `exit=${deploy.exitCode}`);
  result.deploy = { exitCode: deploy.exitCode };
  if (deploy.exitCode === 0) {
    const after = collectActiveVersion(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
    result.deploy.newActiveVersion = after.error ? null : after.versionId;
    result.deploy.changed =
      !after.error && after.versionId !== expectedCurrentVersion;
    record(
      "deploy-new-version",
      result.deploy.changed,
      after.error
        ? after.error
        : `new active=${after.versionId} previous=${expectedCurrentVersion}`
    );
  }
  result.blocked = problems.length > 0;
  result.status = result.blocked ? "DEPLOY_INCIDENT" : "DEPLOYED";
  return result;
}

// ── formatting ─────────────────────────────────────────────────────────────

export function formatResult(result) {
  const lines = [
    `production deploy guard (worker=${PRODUCTION_WORKER_NAME})`,
    `  source-sha:                ${result.sourceSha}`,
    `  expected-current-version:  ${result.expectedCurrentVersion}`,
    `  confirm-worker:            ${result.confirmWorker}`,
    `  execute:                   ${result.execute}`,
    `  status:                    ${result.status}`,
    "",
    "  checks:",
  ];
  for (const check of result.checks) {
    lines.push(`    ${check.ok ? "PASS" : "FAIL"}  ${check.name}  (${check.detail})`);
  }
  if (result.problems.length > 0) {
    lines.push("", `  failing check(s): ${result.problems.join(", ")}`);
  }
  if (result.configTarget) {
    lines.push(
      "",
      `  resolved target:           ${result.configTarget.worker}`,
      `  APP_ENV:                   ${result.configTarget.vars.APP_ENV}`,
      `  API_MUTATIONS_ENABLED:     ${result.configTarget.vars.API_MUTATIONS_ENABLED}`,
      `  FIREBASE_PROJECT_ID:       ${result.configTarget.vars.FIREBASE_PROJECT_ID}`,
      `  compatibility_date:        ${result.configTarget.compatibilityDate}`
    );
  }
  if (result.deploy) {
    lines.push(
      "",
      `  deploy exit:               ${result.deploy.exitCode}`,
      `  new active version:        ${result.deploy.newActiveVersion ?? "n/a"}`,
      `  version changed:           ${result.deploy.changed ?? "n/a"}`
    );
  }
  lines.push("", `  rollback command: ${result.rollbackCommand.join(" ")}`);
  return lines.join("\n");
}
