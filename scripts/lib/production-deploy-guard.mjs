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
//     (no binding drift), and the live Worker's actual bindings are verified
//     against the expected set (read-only Cloudflare metadata);
//   - the git source must be the exact release SHA with a clean worktree
//     (HEAD and origin/main both checked);
//   - the current active version of the live Worker must equal
//     --expected-current-version;
//   - Cloudflare lookup failures (auth/network/permission) are treated as
//     errors, never as "Worker absent" — only an explicit absence signal
//     (error code 10007 / "does not exist") is accepted as absent;
//   - the production DB must be in the verified Expand state, with the
//     sort-order index checked structurally (unique/valid/ready/predicate);
//   - the build output must be provably fresh via a build provenance manifest
//     (content hashes, never mtime);
//   - the default is dry-run; `--execute` is required for the real upload;
//   - no secret value is ever printed.
//
// The deploy command is `npx wrangler deploy` run with
// CLOUDFLARE_ENV=production (the same environment used for the build), so the
// build and the deploy always agree on the target Worker and its bindings.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import pg from "pg";

import { verifyBuildProvenance } from "./build-provenance.mjs";
import {
  checkFirebaseBuildConfig,
  verifyClientBundleHasFirebaseConfig,
} from "./firebase-build-config.mjs";

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
// Binding type per name as reported by the Cloudflare Workers API settings
// endpoint (read-only; secret *values* are never read).
export const EXPECTED_BINDING_TYPES = Object.freeze({
  ASSETS: "assets",
  APP_ENV: "plain_text",
  API_MUTATIONS_ENABLED: "plain_text",
  FIREBASE_PROJECT_ID: "plain_text",
  DATABASE_URL: "secret_text",
});

// Cloudflare "Worker does not exist" signal: error code 10007 or an explicit
// message. Anything else (auth, network, permission, internal) is an error.
const WORKER_ABSENCE_PATTERNS = [
  /\[?code:\s*10007\]?/i,
  /does not exist/i,
  /could not find\b.*worker/i,
  /worker.*not found/i,
  /no such worker/i,
];

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
    return { exitCode: -1, signal: null, error: String(result.error?.message ?? result.error), stdout: "", stderr: "" };
  }
  if (result.signal) {
    return { exitCode: -2, signal: result.signal, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  }
  return { exitCode: typeof result.status === "number" ? result.status : -3, signal: null, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
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

// Classifies a `wrangler deployments list` result:
//   present — exit 0 with a parseable active version
//   absent  — explicit Cloudflare absence signal (code 10007 / "does not exist")
//   error   — any other failure (auth, network, permission, malformed JSON,
//             empty deployment list, missing version)
export function classifyActiveVersion(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.exitCode !== 0) {
    const absent = WORKER_ABSENCE_PATTERNS.some((re) => re.test(output));
    if (absent) {
      return { state: "absent", versionId: null, deploymentId: null, createdOn: null, errorCode: "WORKER_ABSENT", errorMessage: "Cloudflare reports the Worker does not exist" };
    }
    return {
      state: "error",
      versionId: null,
      deploymentId: null,
      createdOn: null,
      errorCode: `EXIT_${result.exitCode}`,
      errorMessage: output.trim().split("\n").filter(Boolean).slice(-2).join(" | ") || "wrangler deployments list failed",
    };
  }
  try {
    const deployments = JSON.parse(result.stdout);
    if (!Array.isArray(deployments) || deployments.length === 0) {
      return { state: "error", versionId: null, deploymentId: null, createdOn: null, errorCode: "EMPTY_DEPLOYMENT_LIST", errorMessage: "deployments JSON is empty" };
    }
    const latest = latestActiveVersionId(deployments);
    if (!latest) {
      return { state: "error", versionId: null, deploymentId: null, createdOn: null, errorCode: "NO_ACTIVE_VERSION", errorMessage: "deployments JSON has no parseable active version" };
    }
    return { state: "present", ...latest, errorCode: null, errorMessage: null };
  } catch (error) {
    return { state: "error", versionId: null, deploymentId: null, createdOn: null, errorCode: "INVALID_JSON", errorMessage: `invalid deployments JSON: ${error.message}` };
  }
}

export function collectActiveVersion(runCommandImpl, workerName, repoRoot) {
  const result = runCommandImpl(
    ["npx", "wrangler", "deployments", "list", "--name", workerName, "--json"],
    { cwd: repoRoot }
  );
  return classifyActiveVersion(result);
}

// Classifies a `wrangler secret list` result:
//   ok    — exit 0 with a parseable array (possibly empty = no secrets)
//   error — any failure (auth/network/permission/malformed JSON)
export function classifySecretList(result) {
  if (result.exitCode !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    return { state: "error", names: [], errorCode: `EXIT_${result.exitCode}`, errorMessage: output.split("\n").filter(Boolean).slice(-2).join(" | ") || "wrangler secret list failed" };
  }
  try {
    const list = JSON.parse(result.stdout);
    if (!Array.isArray(list)) {
      return { state: "error", names: [], errorCode: "INVALID_JSON", errorMessage: "secret list JSON is not an array" };
    }
    const names = list
      .map((entry) => entry?.name)
      .filter((name) => typeof name === "string")
      .sort();
    return { state: "ok", names, errorCode: null, errorMessage: null };
  } catch (error) {
    return { state: "error", names: [], errorCode: "INVALID_JSON", errorMessage: `invalid secret list JSON: ${error.message}` };
  }
}

export function collectSecrets(runCommandImpl, workerName, repoRoot) {
  const result = runCommandImpl(
    ["npx", "wrangler", "secret", "list", "--name", workerName, "--format", "json"],
    { cwd: repoRoot }
  );
  return classifySecretList(result);
}

// ── live Worker metadata (read-only Cloudflare API) ────────────────────────

// Resolves read-only Cloudflare credentials without ever printing them:
// CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN env, or the wrangler OAuth
// login (config file + `wrangler whoami`). Returns { accountId, apiToken }
// or { error }.
export function resolveCloudflareReadCredentials({ repoRoot, runCommandImpl = runCommandEnv, env = process.env }) {
  const envAccount = typeof env.CLOUDFLARE_ACCOUNT_ID === "string" ? env.CLOUDFLARE_ACCOUNT_ID : null;
  const envToken = typeof env.CLOUDFLARE_API_TOKEN === "string" ? env.CLOUDFLARE_API_TOKEN : null;
  if (envAccount && envToken) return { accountId: envAccount, apiToken: envToken };

  let oauthToken = null;
  const candidates = [
    path.join(homedir(), ".config", ".wrangler", "config", "default.toml"),
    path.join(homedir(), ".wrangler", "config", "default.toml"),
  ];
  for (const candidate of candidates) {
    try {
      const text = readFileSync(candidate, "utf8");
      const match = text.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (match) {
        oauthToken = match[1];
        break;
      }
    } catch {
      // try the next candidate
    }
  }
  let accountFromWhoami = null;
  if (runCommandImpl) {
    try {
      const whoami = runCommandImpl(["npx", "wrangler", "whoami"], { cwd: repoRoot });
      // `wrangler whoami` prints a table:
      //   │ Account Name                    │ Account ID                       │
      //   │ Charliekant@gmail.com's Account │ 9be14bb7b8974e65d0afba647ab16932 │
      // so extract the 32-hex inside the table pipe row; fall back to the
      // first 32-hex anywhere in the output.
      const whoamiText = `${whoami.stdout ?? ""}\n${whoami.stderr ?? ""}`;
      const tableMatch = /\|\s*([0-9a-f]{32})\s*\|/.exec(whoamiText);
      const anyMatch = /[0-9a-f]{32}/.exec(whoamiText);
      if (tableMatch) accountFromWhoami = tableMatch[1];
      else if (anyMatch) accountFromWhoami = anyMatch[0];
    } catch {
      // A runCommandImpl that throws simply means "no account from whoami".
    }
  }
  const accountId = envAccount ?? accountFromWhoami;
  if (accountId && oauthToken) return { accountId, apiToken: oauthToken };
  return { error: "no Cloudflare read credentials (set CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN or use a wrangler OAuth login)" };
}

// Read-only live Worker metadata via the Cloudflare Workers API. Only names,
// types, non-secret var values and settings are collected; secret values are
// never read. fetchImpl is injectable for tests.
export async function collectLiveWorkerMetadata({
  accountId,
  apiToken,
  workerName,
  fetchImpl = fetch,
  baseUrl = "https://api.cloudflare.com/client/v4",
}) {
  const headers = { Authorization: `Bearer ${apiToken}` };
  const get = async (pathname) => {
    const response = await fetchImpl(`${baseUrl}${pathname}`, { headers });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, success: body?.success === true, body };
  };
  try {
    const settings = await get(`/accounts/${accountId}/workers/scripts/${workerName}/settings`);
    if (!settings.ok || !settings.success) {
      const message = settings.body?.errors?.[0]?.message ?? `HTTP ${settings.ok ? "fail" : "error"}`;
      return { state: "error", error: `live settings lookup failed: ${message}` };
    }
    const bindings = Array.isArray(settings.body?.result?.bindings) ? settings.body.result.bindings : [];
    const compatDate = settings.body?.result?.compatibility_date ?? null;
    const flags = settings.body?.result?.compatibility_flags ?? [];
    const usageModel = settings.body?.result?.usage_model ?? null;
    const placement = settings.body?.result?.placement ?? null;
    const observability = settings.body?.result?.observability ?? null;

    const subdomain = await get(`/accounts/${accountId}/workers/scripts/${workerName}/subdomain`);
    const subdomainEnabled = subdomain.success ? subdomain.body?.result?.enabled === true : null;

    const domains = await get(`/accounts/${accountId}/workers/domains?script=${workerName}`);
    const domainList = domains.success && Array.isArray(domains.body?.result) ? domains.body.result : null;

    return {
      state: "ok",
      bindings,
      compatibilityDate: compatDate,
      compatibilityFlags: flags,
      usageModel,
      placement,
      observability,
      subdomainEnabled,
      subdomainOk: subdomain.success,
      domains: domainList,
      domainsOk: domains.success,
    };
  } catch (error) {
    return { state: "error", error: `live metadata fetch failed: ${error.message}` };
  }
}

// Compares the live Worker config against the expected production set.
// Returns { ok, problems } where problems is a list of human strings.
export function verifyLiveWorkerDrift({
  live,
  expectedBindings = EXPECTED_BINDING_NAMES,
  expectedTypes = EXPECTED_BINDING_TYPES,
  expectedCompatibilityDate = EXPECTED_COMPATIBILITY_DATE,
}) {
  const problems = [];
  if (live.state !== "ok") return { ok: false, problems: [live.error ?? "live metadata unavailable"] };

  const liveNames = live.bindings.map((b) => b.name).sort();
  if (!arraysEqual(liveNames, [...expectedBindings].sort())) {
    problems.push(`live binding names ${JSON.stringify(liveNames)} != expected ${JSON.stringify([...expectedBindings].sort())}`);
  }
  for (const binding of live.bindings) {
    const expectedType = expectedTypes[binding.name];
    if (expectedType && binding.type !== expectedType) {
      problems.push(`binding ${binding.name}: type '${binding.type}' != expected '${expectedType}'`);
    }
    if (!(binding.name in expectedTypes)) {
      problems.push(`unexpected live binding '${binding.name}'`);
    }
  }
  for (const expectedName of Object.keys(expectedTypes)) {
    if (!live.bindings.some((b) => b.name === expectedName)) {
      problems.push(`live binding '${expectedName}' missing`);
    }
  }
  if (live.compatibilityDate !== expectedCompatibilityDate) {
    problems.push(`live compatibility_date '${live.compatibilityDate}' != expected '${expectedCompatibilityDate}'`);
  }
  // Route / workers.dev target state must be *readable* (fail-closed): a
  // lookup failure for the workers.dev subdomain or the custom-domains list is
  // a BLOCK, never a silent pass. Additionally, the production Worker is a
  // workers.dev Worker with no custom routes — any custom domain attached to
  // it is a route mismatch (BLOCK).
  if (live.subdomainOk !== true) {
    problems.push("workers.dev subdomain state could not be verified (lookup failed)");
  }
  if (live.domainsOk !== true) {
    problems.push("custom domains list could not be verified (lookup failed)");
  } else if (Array.isArray(live.domains) && live.domains.length > 0) {
    problems.push(`unexpected custom domains on production Worker (expected none): ${live.domains.length} domain(s)`);
  }
  return { ok: problems.length === 0, problems };
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
    checks.push(["built-name", name === PRODUCTION_WORKER_NAME, `name='${name}' expected='${PRODUCTION_WORKER_NAME}'`]);
    checks.push(["built-app-env", vars.APP_ENV === EXPECTED_VARS.APP_ENV, `APP_ENV='${vars.APP_ENV}' expected='${EXPECTED_VARS.APP_ENV}'`]);
    checks.push(["built-mutations", vars.API_MUTATIONS_ENABLED === EXPECTED_VARS.API_MUTATIONS_ENABLED, `API_MUTATIONS_ENABLED='${vars.API_MUTATIONS_ENABLED}' expected='${EXPECTED_VARS.API_MUTATIONS_ENABLED}'`]);
    checks.push(["built-firebase-project", vars.FIREBASE_PROJECT_ID === EXPECTED_VARS.FIREBASE_PROJECT_ID, `FIREBASE_PROJECT_ID='${vars.FIREBASE_PROJECT_ID}' expected='${EXPECTED_VARS.FIREBASE_PROJECT_ID}'`]);
    checks.push(["built-compat-date", compatibilityDate === EXPECTED_COMPATIBILITY_DATE, `compatibility_date='${compatibilityDate}' expected='${EXPECTED_COMPATIBILITY_DATE}'`]);
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
  checks.push(["built-client-assets", hasClientAssets, "dist/client/assets present and non-empty"]);
  checks.push(["built-worker-entry", existsSync(path.join(serverDir, "index.js")), "dist/server/index.js present"]);
  return { checks, clientDir };
}

// ── wrangler dry-run ───────────────────────────────────────────────────────

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

// Structural sort-order index verification. Returns the index row with
// indisunique/indisvalid/indisready and the normalized predicate.
export function normalizeIndexPredicate(predicate) {
  return String(predicate ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Accepts `sort_order IS NOT NULL` and its logically equivalent forms after
// whitespace/paren normalization.
const SORT_NOT_NULL_NORMALIZED = "sortorderisnotnull";
const NOT_SORT_NULL_NORMALIZED = "notsortorderisnull";

function isSortOrderNotNullPredicate(predicate) {
  const normalized = normalizeIndexPredicate(predicate);
  return normalized === SORT_NOT_NULL_NORMALIZED || normalized === NOT_SORT_NULL_NORMALIZED;
}

// The pg driver sometimes returns Postgres array literals as strings
// ("{tree_id,client_key}") instead of JS arrays when the result column type
// OID is not resolved; accept both forms.
function parsePgArrayLiteral(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    const inner = value.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(",").map((part) => {
      const trimmed = part.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      return trimmed;
    });
  }
  return null;
}

const INDEX_SEMANTICS_SQL = `
  SELECT i.relname AS index_name,
         ix.indisunique,
         ix.indisvalid,
         ix.indisready,
         pg_get_expr(ix.indpred, ix.indrelid) AS predicate,
         (SELECT array_agg(a.attname ORDER BY k.ordinality)
            FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordinality)
            JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = k.attnum
         ) AS columns
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = i.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'memories'
     AND i.relname IN ('memories_tree_sort_order_uniq_partial',
                       'memories_tree_sort_order_uniq',
                       'memories_tree_client_key_uniq')
`;

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
    const indexRows = await query(INDEX_SEMANTICS_SQL);
    const byName = Object.fromEntries(indexRows.map((row) => [row.index_name, row]));

    const partial = byName["memories_tree_sort_order_uniq_partial"];
    const full = byName["memories_tree_sort_order_uniq"];
    const clientKey = byName["memories_tree_client_key_uniq"];

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
    const partialOk =
      partial !== undefined &&
      partial.indisunique === true &&
      partial.indisvalid === true &&
      partial.indisready === true &&
      isSortOrderNotNullPredicate(partial.predicate);
    const clientKeyColumns = parsePgArrayLiteral(clientKey?.columns) ?? [];
    const clientKeyOk =
      clientKey !== undefined &&
      clientKey.indisunique === true &&
      clientKey.indisvalid === true &&
      clientKey.indisready === true &&
      arraysEqual(clientKeyColumns, ["tree_id", "client_key"]);

    const checks = {
      sortOrderColumn: sortOrderColumns.length === 1,
      sortOrderInteger: column?.data_type === "integer",
      sortOrderNullable: column?.is_nullable === "YES",
      sortOrderNoDefault: column?.column_default == null,
      partialUniqueIndex: partialOk,
      fullUniqueIndexAbsent: full === undefined,
      clientKeyUniqueIndex: clientKeyOk,
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
  fetchImpl = fetch,
  cloudflareCredentials = null,
  firebaseClientConfig = null,
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
  record("confirm-worker", confirmWorker === PRODUCTION_WORKER_NAME, `confirm-worker='${confirmWorker}' expected='${PRODUCTION_WORKER_NAME}'`);

  // B. resolved production config (source wrangler.jsonc)
  const source = await readFile(path.join(repoRoot, "wrangler.jsonc"), "utf8");
  const prod = resolveProductionConfig(source);
  record("worker-name", prod.resolvedName === PRODUCTION_WORKER_NAME, `resolved='${prod.resolvedName}' expected='${PRODUCTION_WORKER_NAME}'`);
  record("forbidden-name", prod.resolvedName !== FORBIDDEN_WORKER_NAME, `resolved='${prod.resolvedName}'`);
  record("app-env", prod.vars.APP_ENV === EXPECTED_VARS.APP_ENV, `APP_ENV='${prod.vars.APP_ENV}' expected='${EXPECTED_VARS.APP_ENV}'`);
  record("mutations-enabled", prod.vars.API_MUTATIONS_ENABLED === EXPECTED_VARS.API_MUTATIONS_ENABLED, `API_MUTATIONS_ENABLED='${prod.vars.API_MUTATIONS_ENABLED}' expected='${EXPECTED_VARS.API_MUTATIONS_ENABLED}'`);
  record("firebase-project", prod.vars.FIREBASE_PROJECT_ID === EXPECTED_VARS.FIREBASE_PROJECT_ID, `FIREBASE_PROJECT_ID='${prod.vars.FIREBASE_PROJECT_ID}' expected='${EXPECTED_VARS.FIREBASE_PROJECT_ID}'`);
  record("required-secret", (prod.secretsRequired ?? []).includes("DATABASE_URL"), `secrets.required=${JSON.stringify(prod.secretsRequired ?? [])}`);
  record("compatibility-date", prod.compatibilityDate === EXPECTED_COMPATIBILITY_DATE, `compatibility_date='${prod.compatibilityDate}' expected='${EXPECTED_COMPATIBILITY_DATE}'`);
  const bindingNames = configBindingNames(prod);
  record("binding-drift", arraysEqual(bindingNames, EXPECTED_BINDING_NAMES), `config bindings=${JSON.stringify(bindingNames)} expected=${JSON.stringify(EXPECTED_BINDING_NAMES)}`);

  // C. git state
  const git = verifyGitState({ repoRoot, sourceSha });
  record("source-sha-head", git.headOk, `HEAD=${git.head ?? "(unavailable)"}`);
  record("source-sha-origin-main", git.originMainOk, `origin/main=${git.originMain ?? "(unavailable)"}`);
  record("worktree-clean", !git.dirty, git.dirty ? "worktree has changes" : "clean");

  // D. live Cloudflare state (read-only, fail-closed)
  const current = collectActiveVersion(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
  if (current.state === "absent") {
    record("current-version", false, "current production Worker reported absent (10007)");
  } else if (current.state === "error") {
    record("current-version", false, `lookup error: ${current.errorMessage}`);
  } else {
    record("current-version", current.versionId === expectedCurrentVersion, `active=${current.versionId} expected=${expectedCurrentVersion}`);
  }
  const forbidden = collectActiveVersion(runCommandImpl, FORBIDDEN_WORKER_NAME, repoRoot);
  record(
    "forbidden-worker-absent",
    forbidden.state === "absent",
    forbidden.state === "absent"
      ? `forbidden Worker '${FORBIDDEN_WORKER_NAME}' absent`
      : forbidden.state === "present"
        ? `forbidden Worker '${FORBIDDEN_WORKER_NAME}' has deployments (deployment ${forbidden.deploymentId})`
        : `forbidden Worker lookup error: ${forbidden.errorMessage}`
  );

  const secrets = collectSecrets(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
  record(
    "secret-database-url",
    secrets.state === "ok" && secrets.names.includes("DATABASE_URL"),
    secrets.state === "ok"
      ? `secrets=[${secrets.names.join(",")}] (values never read)`
      : `secret list error: ${secrets.errorMessage}`
  );

  // E. live Worker config drift (read-only Cloudflare API; secret values never read)
  let creds = null;
  if (cloudflareCredentials && !cloudflareCredentials.error) {
    creds = { accountId: cloudflareCredentials.accountId, apiToken: cloudflareCredentials.apiToken };
  } else if (cloudflareCredentials && cloudflareCredentials.error) {
    record("live-metadata-credentials", false, cloudflareCredentials.error);
  } else {
    const resolved = resolveCloudflareReadCredentials({ repoRoot, runCommandImpl });
    if (resolved.error) {
      record("live-metadata-credentials", false, resolved.error);
    } else {
      creds = { accountId: resolved.accountId, apiToken: resolved.apiToken };
    }
  }
  if (creds) {
    const live = await collectLiveWorkerMetadata({ accountId: creds.accountId, apiToken: creds.apiToken, workerName: PRODUCTION_WORKER_NAME, fetchImpl });
    const liveCheck = verifyLiveWorkerDrift({ live });
    record("live-worker-drift", liveCheck.ok, liveCheck.ok ? "live bindings/types/compat match expected" : liveCheck.problems.join("; "));
  } else if (!checks.some((c) => c.name === "live-metadata-credentials")) {
    record("live-worker-drift", false, "live metadata unavailable (no credentials)");
  }

  // F. fresh production build output (structural)
  const built = verifyBuiltConfig({ repoRoot });
  for (const [name, ok, detail] of built.checks) record(name, ok, detail);

  // F2. Firebase client config in the build (fail-closed).
  // The production build must have inlined the three NEXT_PUBLIC_FIREBASE_*
  // env vars into the client bundle. This guard verifies:
  //   - the build environment has the Firebase client config (present, non-empty,
  //     projectId === relovetree);
  //   - the emitted client bundle actually contains the apiKey, authDomain, and
  //     projectId (proving the config was inlined, not left as empty
  //     placeholders); the apiKey is compared in-memory only and never printed;
  //   - the build manifest carries a Firebase config fingerprint and the
  //     expected projectId.
  // No raw config value (apiKey, authDomain) is ever printed.
  const fbConfig = firebaseClientConfig ?? checkFirebaseBuildConfig();
  record(
    "firebase-client-config-present",
    fbConfig.ok,
    fbConfig.ok
      ? `Firebase client config present (projectId=${fbConfig.projectId})`
      : `Firebase client config incomplete: ${fbConfig.problems.join("; ")}`,
  );
  if (built.clientDir && fbConfig.ok) {
    const bundleCheck = await verifyClientBundleHasFirebaseConfig({
      clientDir: built.clientDir,
      config: fbConfig.config,
    });
    record(
      "firebase-client-config-inlined",
      bundleCheck.ok,
      bundleCheck.ok
        ? "client bundle contains the inlined Firebase config"
        : `client bundle Firebase config check failed: ${bundleCheck.problems.join("; ")}`,
    );
  } else if (!fbConfig.ok) {
    record("firebase-client-config-inlined", false, "skipped — Firebase client config not present in build environment");
  }

  // G. build provenance manifest (content hashes + Firebase config fingerprint)
  const expectedFingerprint = fbConfig.ok ? fbConfig.fingerprint : null;
  const provenance = await verifyBuildProvenance({
    repoRoot,
    sourceSha,
    expectedWorker: PRODUCTION_WORKER_NAME,
    expectedFirebaseConfigFingerprint: expectedFingerprint,
  });
  for (const [name, ok, detail] of provenance.checks) record(name, ok, detail);

  // H. wrangler dry-run with the production environment
  const dry = runDeployDryRun(runCommandImpl, repoRoot);
  record("deploy-dry-run-exit", dry.exitCode === 0, `exit=${dry.exitCode}`);
  record("dry-run-mutations-true", dry.hasMutationsTrue, "bindings show API_MUTATIONS_ENABLED (\"true\")");
  record("dry-run-app-env-production", dry.hasAppEnvProduction, "bindings show APP_ENV (\"production\")");
  record("dry-run-no-forbidden", !dry.matchesForbidden, "dry-run does not mention the forbidden Worker");

  // I. production DB Expand state (read-only, fail-closed)
  if (dbConnectionString) {
    try {
      const db = await verifyProductionDbExpandState({ connectionString: dbConnectionString, pgFactory });
      for (const check of Object.entries(db.checks)) {
        record(`db-${check[0]}`, check[1], check[0]);
      }
      record("db-expand-state", db.problems.length === 0, `trees=${db.counts.trees} memories=${db.counts.memories} problems=${JSON.stringify(db.problems)}`);
    } catch (error) {
      record("db-expand-state", false, `DB Expand state verification failed (fail-closed): ${error.message}`);
    }
  } else {
    record("db-expand-state", false, "DATABASE_URL not available locally; Production DB Expand state could not be verified (fail-closed)");
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

  // J. guarded deploy (only with --execute and after every check passed)
  const deploy = runCommandImpl(["npx", "wrangler", "deploy"], {
    env: { CLOUDFLARE_ENV: "production" },
    cwd: repoRoot,
  });
  record("deploy-exit", deploy.exitCode === 0, `exit=${deploy.exitCode}`);
  result.deploy = { exitCode: deploy.exitCode };
  if (deploy.exitCode === 0) {
    const after = collectActiveVersion(runCommandImpl, PRODUCTION_WORKER_NAME, repoRoot);
    result.deploy.newActiveVersion = after.state === "present" ? after.versionId : null;
    result.deploy.changed = after.state === "present" && after.versionId !== expectedCurrentVersion;
    record(
      "deploy-new-version",
      result.deploy.changed,
      after.state === "present"
        ? `new active=${after.versionId} previous=${expectedCurrentVersion}`
        : after.state === "absent"
          ? "post-deploy lookup: worker absent"
          : `post-deploy lookup error: ${after.errorMessage}`
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
