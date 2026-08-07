import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  runGuardedProductionDeploy,
  PRODUCTION_WORKER_NAME,
  FORBIDDEN_WORKER_NAME,
  EXPECTED_VARS,
} from "../scripts/lib/production-deploy-guard.mjs";
import { buildManifest } from "../scripts/lib/build-provenance.mjs";

const ACTIVE_VERSION = "9b09919c-8fb6-4f01-9872-57b493525918";
const NEW_VERSION = "new-version-456-8fb6-4f01-9872-57b493525918";

// Mirrors the repository wrangler.jsonc after the fix.
const SOURCE = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "lovetree-limone",
  "main": "worker/index.ts",
  "compatibility_date": "2026-07-01",
  "assets": { "directory": "dist/client", "binding": "ASSETS" },
  "vars": {
    "APP_ENV": "staging",
    "API_MUTATIONS_ENABLED": "false",
    "FIREBASE_PROJECT_ID": "relovetree"
  },
  "secrets": { "required": ["DATABASE_URL"] },
  "env": {
    "staging": {
      "workers_dev": true,
      "vars": {
        "APP_ENV": "staging",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": { "required": ["DATABASE_URL"] }
    },
    "production": {
      "name": "lovetree-limone",
      "vars": {
        "APP_ENV": "production",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": { "required": ["DATABASE_URL"] }
    }
  }
}
`;

// dist/server/wrangler.json as produced by CLOUDFLARE_ENV=production build.
function builtConfig(overrides = {}) {
  return JSON.stringify({
    name: overrides.name ?? PRODUCTION_WORKER_NAME,
    main: "index.js",
    compatibility_date: overrides.compatibilityDate ?? "2026-07-01",
    compatibility_flags: ["nodejs_compat"],
    no_bundle: true,
    rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
    assets: { directory: "../client", binding: "ASSETS" },
    vars: {
      APP_ENV: "production",
      API_MUTATIONS_ENABLED: overrides.mutations ?? "true",
      FIREBASE_PROJECT_ID: "relovetree",
      ...(overrides.extraVar ? { [overrides.extraVar]: "x" } : {}),
    },
    secrets: { required: ["DATABASE_URL"] },
  });
}

const DRY_RUN_OUT = `
Your Worker has access to the following bindings:
env.ASSETS                                    Assets
env.APP_ENV ("production")                    Environment Variable
env.API_MUTATIONS_ENABLED ("true")            Environment Variable
env.FIREBASE_PROJECT_ID ("relovetree")        Environment Variable
--dry-run: exiting now.
`;

function git(dir, args) {
  return spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
}

// Mirrors the real repository flow: source files are committed, `dist/` is
// gitignored and lives only in the working tree, and the build manifest is
// stamped with the exact committed HEAD. HEAD === origin/main === sourceSha ===
// manifest.sourceSha, and the worktree stays clean because dist/ is ignored.
async function makeScratchRepo({ source = SOURCE, built = builtConfig(), withManifest = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "prod-guard-repo-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "guard-test@example.com"]);
  git(dir, ["config", "user.name", "Guard Test"]);
  await writeFile(path.join(dir, "wrangler.jsonc"), source, "utf8");
  await writeFile(path.join(dir, ".gitignore"), "dist/\nnode_modules/\n", "utf8");
  await writeFile(path.join(dir, "placeholder.txt"), "placeholder\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "base"]);
  const head = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  git(dir, ["update-ref", "refs/remotes/origin/main", head]);
  // Build output: untracked + ignored, exactly like the real repository.
  await mkdir(path.join(dir, "dist", "client", "assets"), { recursive: true });
  await writeFile(path.join(dir, "dist", "client", "assets", "app.js"), "console.log('asset');\n", "utf8");
  await mkdir(path.join(dir, "dist", "server"), { recursive: true });
  await writeFile(path.join(dir, "dist", "server", "wrangler.json"), built, "utf8");
  await writeFile(path.join(dir, "dist", "server", "index.js"), "export default {};\n", "utf8");
  if (withManifest) {
    const manifest = await buildManifest({ repoRoot: dir, sourceSha: head });
    await writeFile(
      path.join(dir, "dist", "server", "lovetree-build-manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
  }
  return { dir, head };
}

// ── live Cloudflare metadata fake (fetchImpl) ─────────────────────────────

function liveSettingsBody({ bindings, compatibilityDate }) {
  return {
    success: true,
    result: {
      bindings,
      compatibility_date: compatibilityDate,
      compatibility_flags: ["nodejs_compat"],
      usage_model: "standard",
      placement: {},
      observability: null,
    },
  };
}

function defaultLiveBindings() {
  // Matches the CURRENT live production worker (staging preview): the two
  // intended transitions APP_ENV staging→production and mutations false→true.
  return [
    { type: "plain_text", name: "APP_ENV", text: "staging" },
    { type: "plain_text", name: "API_MUTATIONS_ENABLED", text: "false" },
    { type: "assets", name: "ASSETS" },
    { type: "secret_text", name: "DATABASE_URL" },
    { type: "plain_text", name: "FIREBASE_PROJECT_ID", text: "relovetree" },
  ];
}

function makeFakeLiveFetch(options = {}) {
  const bindings = options.bindings ?? defaultLiveBindings();
  const compatibilityDate = options.compatibilityDate ?? "2026-07-01";
  const settingsError = options.settingsError ?? null;
  const subdomainError = options.subdomainError ?? null;
  const domainsError = options.domainsError ?? null;
  const customDomains = options.customDomains ?? null;
  const fetchImpl = async (url) => {
    if (settingsError) {
      return { ok: false, json: async () => ({ success: false, errors: [{ message: settingsError }] }) };
    }
    if (url.includes("/settings")) {
      return { ok: true, json: async () => liveSettingsBody({ bindings, compatibilityDate }) };
    }
    if (url.includes("/subdomain")) {
      if (subdomainError) return { ok: false, json: async () => ({ success: false, errors: [{ message: subdomainError }] }) };
      return { ok: true, json: async () => ({ success: true, result: { enabled: true, previews_enabled: true } }) };
    }
    if (url.includes("/domains")) {
      if (domainsError) return { ok: false, json: async () => ({ success: false, errors: [{ message: domainsError }] }) };
      return { ok: true, json: async () => ({ success: true, result: customDomains ?? [] }) };
    }
    throw new Error("unexpected live fetch url: " + url);
  };
  return fetchImpl;
}

// ── scripted wrangler fake ────────────────────────────────────────────────

function makeFakeRun(options = {}) {
  const state = {
    activeVersion: options.activeVersion ?? ACTIVE_VERSION,
    forbiddenExists: options.forbiddenExists ?? false,
    forbiddenError: options.forbiddenError ?? null,
    currentError: options.currentError ?? null,
    secrets: options.secrets ?? ["DATABASE_URL"],
    secretsError: options.secretsError ?? null,
    deployExit: options.deployExit ?? 0,
    dryRunExit: options.dryRunExit ?? 0,
    dryRunOut: options.dryRunOut ?? DRY_RUN_OUT,
    dbRows: options.dbRows ?? {},
  };
  const calls = [];
  const run = (command, opts = {}) => {
    const joined = command.join(" ");
    calls.push({ command, env: opts.env ?? {} });
    if (joined.startsWith("npx wrangler whoami")) {
      return { exitCode: 0, stdout: "Account ID: 00000000000000000000000000000000\n", stderr: "" };
    }
    if (joined.startsWith(`npx wrangler deployments list --name ${FORBIDDEN_WORKER_NAME}`)) {
      if (state.forbiddenError) {
        return { exitCode: -1, stdout: "", stderr: state.forbiddenError };
      }
      if (!state.forbiddenExists) {
        return { exitCode: 1, stdout: "", stderr: "Could not find Worker with name 'lovetree-limone-production'. [code: 10007]" };
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify([
          { id: "forbidden-deploy", created_on: "2026-08-05T05:59:59Z", versions: [{ version_id: "forbidden-v1", percentage: 100 }] },
        ]),
        stderr: "",
      };
    }
    if (joined.startsWith(`npx wrangler deployments list --name ${PRODUCTION_WORKER_NAME}`)) {
      if (state.currentError) {
        return { exitCode: -1, stdout: "", stderr: state.currentError };
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify([
          { id: "deploy-1", created_on: "2026-07-31T03:23:01.919732Z", versions: [{ version_id: state.activeVersion, percentage: 100 }] },
        ]),
        stderr: "",
      };
    }
    if (joined.startsWith("npx wrangler secret list")) {
      if (state.secretsError) {
        return { exitCode: -1, stdout: "", stderr: state.secretsError };
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify(state.secrets.map((name) => ({ name, type: "secret_text" }))),
        stderr: "",
      };
    }
    if (joined.includes("--dry-run")) {
      return { exitCode: state.dryRunExit, stdout: state.dryRunOut, stderr: "" };
    }
    if (joined.startsWith("npx wrangler deploy")) {
      state.activeVersion = NEW_VERSION;
      return {
        exitCode: state.deployExit,
        stdout: "Uploaded.\nDeployed version: " + NEW_VERSION + "\n",
        stderr: "",
      };
    }
    throw new Error("unexpected command: " + joined);
  };
  return { run, calls, state };
}

// ── fake `pg` client factory (index semantics aware) ──────────────────────

function makeFakePg(rows = {}) {
  const queryCalls = [];
  class FakeClient {
    constructor(opts) {
      this.connectionString = opts?.connectionString;
    }
    async connect() {}
    async query(sql) {
      queryCalls.push(sql);
      const trimmed = sql.trim();
      if (trimmed.includes("information_schema.columns") && trimmed.includes("'sort_order'")) {
        return { rows: rows.noSortColumn ? [] : [{ column_name: "sort_order", data_type: "integer", is_nullable: "YES", column_default: null }] };
      }
      if (trimmed.includes("pg_get_expr")) {
        const out = [];
        if (!rows.noPartial) {
          out.push({
            index_name: "memories_tree_sort_order_uniq_partial",
            indisunique: rows.partialNotUnique ? false : true,
            indisvalid: rows.partialInvalid ? false : true,
            indisready: rows.partialNotReady ? false : true,
            predicate: rows.partialWrongPredicate === "IS_NULL" ? "(sort_order IS NULL)" : rows.partialWrongPredicate === "NONE" ? null : "(sort_order IS NOT NULL)",
            columns: ["tree_id", "sort_order"],
          });
        }
        if (rows.hasFullIndex) {
          out.push({
            index_name: "memories_tree_sort_order_uniq",
            indisunique: true,
            indisvalid: true,
            indisready: true,
            predicate: null,
            columns: ["tree_id", "sort_order"],
          });
        }
        if (!rows.noClientKeyIndex) {
          const columns = rows.clientKeyWrongColumns
            ? ["client_key", "tree_id"]
            : rows.stringCols
              ? "{tree_id,client_key}"
              : ["tree_id", "client_key"];
          out.push({
            index_name: "memories_tree_client_key_uniq",
            indisunique: rows.clientKeyNotUnique ? false : true,
            indisvalid: rows.clientKeyInvalid ? false : true,
            indisready: rows.clientKeyNotReady ? false : true,
            predicate: null,
            columns,
          });
        }
        return { rows: out };
      }
      if (trimmed.includes("NOT EXISTS")) return { rows: [{ c: rows.orphans ?? 0 }] };
      if (trimmed.includes("HAVING count(*) > 1")) return { rows: [{ c: rows.dupSort ?? 0 }] };
      if (trimmed.includes("WHERE sort_order IS NULL")) return { rows: [{ c: rows.nullSort ?? 0 }] };
      if (/^SELECT count\(\*\)::int AS c FROM trees$/.test(trimmed)) return { rows: [{ c: rows.trees ?? 8 }] };
      if (/^SELECT count\(\*\)::int AS c FROM memories$/.test(trimmed)) return { rows: [{ c: rows.memories ?? 5 }] };
      throw new Error("unexpected SQL: " + sql);
    }
    async end() {}
  }
  return { Client: FakeClient, queryCalls };
}

const DB_URL = "postgres://fake:fake@fake/fake";

function problemNames(result) {
  return result.problems;
}

async function runGuard({
  dir,
  head,
  sourceSha = head,
  expectedCurrentVersion = ACTIVE_VERSION,
  confirmWorker = PRODUCTION_WORKER_NAME,
  execute = false,
  fake,
  pgRows = {},
  liveFetch = makeFakeLiveFetch(),
  cloudflareCredentials = { accountId: "acct", apiToken: "tok" },
}) {
  const pg = makeFakePg(pgRows);
  return {
    result: await runGuardedProductionDeploy({
      sourceSha,
      expectedCurrentVersion,
      confirmWorker,
      repoRoot: dir,
      execute,
      dbConnectionString: DB_URL,
      runCommandImpl: fake.run,
      pgFactory: pg.Client,
      fetchImpl: liveFetch,
      cloudflareCredentials,
    }),
    fake,
    pg,
  };
}

// ── F1: Cloudflare lookup fail-closed ─────────────────────────────────────

test("F1: forbidden Worker truly absent (10007) passes the absent check", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  const check = result.checks.find((c) => c.name === "forbidden-worker-absent");
  assert.equal(check.ok, true);
});

test("F1: forbidden Worker lookup network failure must BLOCK (not treated as absent)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ forbiddenError: "network error: ECONNRESET" });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("forbidden-worker-absent"));
});

test("F1: forbidden Worker lookup auth/permission failure must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ forbiddenError: "A request to the Cloudflare API failed (401) Unauthorized" });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("forbidden-worker-absent"));
});

test("F1: current Worker lookup failure must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ currentError: "OAuth token expired" });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("current-version"));
});

test("F1: malformed deployments JSON must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  fake.run = (command, opts) => {
    const joined = command.join(" ");
    if (joined.includes("deployments list")) return { exitCode: 0, stdout: "not json at all", stderr: "" };
    return makeFakeRun().run(command, opts);
  };
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("current-version"));
});

test("F1: empty deployment list must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  fake.run = (command, opts) => {
    const joined = command.join(" ");
    if (joined.includes("deployments list") && joined.includes(PRODUCTION_WORKER_NAME)) {
      return { exitCode: 0, stdout: "[]", stderr: "" };
    }
    return makeFakeRun().run(command, opts);
  };
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("current-version"));
});

test("F1: secret list failure must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ secretsError: "A request to the Cloudflare API failed (403) Forbidden" });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("secret-database-url"));
});

test("F1: malformed secret list JSON must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  fake.run = (command, opts) => {
    const joined = command.join(" ");
    if (joined.includes("secret list")) return { exitCode: 0, stdout: "[[[", stderr: "" };
    return makeFakeRun().run(command, opts);
  };
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("secret-database-url"));
});

test("F1: explicit 'does not exist' (without code 10007) classifies as absent", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  fake.run = (command, opts) => {
    const joined = command.join(" ");
    if (joined.includes("deployments list") && joined.includes(FORBIDDEN_WORKER_NAME)) {
      return { exitCode: 1, stdout: "", stderr: "The Worker does not exist." };
    }
    return makeFakeRun().run(command, opts);
  };
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  const check = result.checks.find((c) => c.name === "forbidden-worker-absent");
  assert.equal(check.ok, true);
});

test("F1: account mismatch error must BLOCK (not treated as absent)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  fake.run = (command, opts) => {
    const joined = command.join(" ");
    if (joined.includes("deployments list") && joined.includes(FORBIDDEN_WORKER_NAME)) {
      return { exitCode: 1, stdout: "", stderr: "You are not authorized to access this account." };
    }
    return makeFakeRun().run(command, opts);
  };
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("forbidden-worker-absent"));
});

// ── F2: DB index semantics ────────────────────────────────────────────────

test("F2: partial index without predicate must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { partialWrongPredicate: "NONE" } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
});

test("F2: predicate sort_order IS NULL must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { partialWrongPredicate: "IS_NULL" } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
});

test("F2: non-unique partial index must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { partialNotUnique: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
});

test("F2: invalid partial index must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { partialInvalid: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
});

test("F2: not-ready partial index must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { partialNotReady: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
});

test("F2: full unique index present must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { hasFullIndex: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-fullUniqueIndexAbsent"));
});

test("F2: clientKey index with wrong columns must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { clientKeyWrongColumns: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-clientKeyUniqueIndex"));
});

test("F2: clientKey index non-unique must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { clientKeyNotUnique: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-clientKeyUniqueIndex"));
});

test("F2: correct partial + clientKey indexes PASS", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.ok(!problemNames(result).includes("db-partialUniqueIndex"));
  assert.ok(!problemNames(result).includes("db-clientKeyUniqueIndex"));
});

test("F2: clientKey index columns as PG array literal string PASS", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { stringCols: true } });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.ok(!problemNames(result).includes("db-clientKeyUniqueIndex"));
});

test("F2: same index name in a different schema must BLOCK (not found in public)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  // Simulate the index existing only in a non-public schema: the pg_index
  // query filters by n.nspname = 'public', so no rows are returned.
  const { result } = await runGuard({ dir, head, fake, pgRows: { noPartial: true, noClientKeyIndex: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-partialUniqueIndex"));
  assert.ok(problemNames(result).includes("db-clientKeyUniqueIndex"));
});

// ── F3: build provenance ──────────────────────────────────────────────────

test("F3: missing build manifest must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo({ withManifest: false });
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("build-manifest-present"));
});

test("F3: manifest with wrong source SHA must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  // run with a sourceSha that does not match HEAD or origin/main
  const { result } = await runGuard({ dir, head, sourceSha: "deadbeef".repeat(5), fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("build-manifest-source-sha"));
  assert.ok(problemNames(result).includes("source-sha-head"));
  assert.ok(problemNames(result).includes("source-sha-origin-main"));
});

test("F3: stale server entry hash must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "dist", "server", "index.js"), "export default { changed: true };\n", "utf8");
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("build-manifest-server-entry"));
});

test("F3: stale client assets digest must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "dist", "client", "assets", "extra.js"), "console.log('extra');\n", "utf8");
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("build-manifest-assets"));
});

test("F3: manifest with wrong environment must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const manifestPath = path.join(dir, "dist", "server", "lovetree-build-manifest.json");
  const manifest = JSON.parse(await readManifest(dir));
  manifest.environment = "staging";
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("build-manifest-env"));
});

test("F3: valid manifest PASSES", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.ok(!problemNames(result).some((name) => name.startsWith("build-manifest")));
});

// ── F6: live Worker drift ─────────────────────────────────────────────────

test("F6: live metadata lookup error must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ settingsError: "permission denied" }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: missing live binding must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const bindings = defaultLiveBindings().filter((b) => b.name !== "DATABASE_URL");
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ bindings }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: extra live binding must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const bindings = [...defaultLiveBindings(), { type: "plain_text", name: "EXTRA", text: "x" }];
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ bindings }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: binding type mismatch must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const bindings = defaultLiveBindings().map((b) => (b.name === "ASSETS" ? { ...b, type: "plain_text", text: "x" } : b));
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ bindings }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: compatibility date mismatch must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ compatibilityDate: "2025-01-01" }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: expected mutation transition only PASSES", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.ok(!problemNames(result).includes("live-worker-drift"));
});

test("F6: workers.dev subdomain lookup failure must BLOCK (fail-closed)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ subdomainError: "internal error" }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: custom domains lookup failure must BLOCK (fail-closed)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, liveFetch: makeFakeLiveFetch({ domainsError: "internal error" }) });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: unexpected custom domain (route mismatch) must BLOCK", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({
    dir,
    head,
    fake,
    liveFetch: makeFakeLiveFetch({ customDomains: [{ hostname: "unexpected.example.com", service: "lovetree-limone" }] }),
  });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-worker-drift"));
});

test("F6: no Cloudflare credentials must BLOCK (fail-closed)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const pg = makeFakePg();
  const result = await runGuardedProductionDeploy({
    sourceSha: head,
    expectedCurrentVersion: ACTIVE_VERSION,
    confirmWorker: PRODUCTION_WORKER_NAME,
    repoRoot: dir,
    execute: false,
    dbConnectionString: DB_URL,
    runCommandImpl: fake.run,
    pgFactory: pg.Client,
    fetchImpl: makeFakeLiveFetch(),
    cloudflareCredentials: { error: "no credentials" },
  });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("live-metadata-credentials"));
});

// ── F7: real PR state (origin/main != head) ───────────────────────────────

test("F7: real PR state — origin/main differs from HEAD must BLOCK on source-sha-origin-main", async () => {
  const { dir } = await makeScratchRepo();
  // Simulate the untouched PR clone: origin/main points at the base, HEAD at
  // the PR head. Write a second commit so the refs genuinely differ.
  await writeFile(path.join(dir, "extra.txt"), "extra\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "second"]);
  const prHead = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  // origin/main stays at the first commit (the base) — do NOT update it.
  const base = git(dir, ["rev-parse", "HEAD~1"]).stdout.trim();
  assert.notEqual(base, prHead);
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head: prHead, sourceSha: prHead, fake });
  assert.equal(result.status, "BLOCKED");
  const headCheck = result.checks.find((c) => c.name === "source-sha-head");
  const originCheck = result.checks.find((c) => c.name === "source-sha-origin-main");
  assert.equal(headCheck.ok, true);
  assert.equal(originCheck.ok, false);
  assert.ok(problemNames(result).includes("source-sha-origin-main"));
});

// ── existing guard behaviors (regression) ─────────────────────────────────

test("dry-run blocks on wrong source SHA", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, sourceSha: "deadbeef".repeat(5), fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("source-sha-head"));
  assert.ok(problemNames(result).includes("source-sha-origin-main"));
});

test("dry-run blocks on a dirty worktree", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "stray.txt"), "stray\n", "utf8");
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("worktree-clean"));
});

test("dry-run blocks on a wrong confirmed worker name", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, confirmWorker: "lovetree-limone-production", fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("confirm-worker"));
});

test("dry-run blocks on a current version mismatch", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ activeVersion: "other-version-000" });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("current-version"));
});

test("dry-run blocks when the built config has mutations disabled", async () => {
  const { dir, head } = await makeScratchRepo({ built: builtConfig({ mutations: "false" }) });
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("built-mutations"));
});

test("dry-run blocks when the required secret is missing", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ secrets: [] });
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("secret-database-url"));
});

test("dry-run blocks on binding drift (extra var in the production env)", async () => {
  const source = SOURCE.replace(
    '        "FIREBASE_PROJECT_ID": "relovetree"\n      },\n      "secrets": { "required": ["DATABASE_URL"] }\n    }\n  }\n}',
    '        "FIREBASE_PROJECT_ID": "relovetree",\n        "EXTRA_BINDING": "x"\n      },\n      "secrets": { "required": ["DATABASE_URL"] }\n    }\n  }\n}'
  );
  const { dir, head } = await makeScratchRepo({ source });
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("binding-drift"));
});

test("dry-run blocks when the production DB is not in the Expand state", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, pgRows: { noPartial: true } });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-expand-state"));
});

test("dry-run blocks when DATABASE_URL is unavailable (fail-closed)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const pg = makeFakePg();
  const result = await runGuardedProductionDeploy({
    sourceSha: head,
    expectedCurrentVersion: ACTIVE_VERSION,
    confirmWorker: PRODUCTION_WORKER_NAME,
    repoRoot: dir,
    execute: false,
    dbConnectionString: null,
    runCommandImpl: fake.run,
    pgFactory: pg.Client,
    fetchImpl: makeFakeLiveFetch(),
    cloudflareCredentials: { accountId: "acct", apiToken: "tok" },
  });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-expand-state"));
});

test("dry-run blocks when the DB query throws (fail-closed, no crash)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  class ThrowingClient {
    constructor() {}
    async connect() {}
    async query() { throw new Error('column "sort_order" does not exist'); }
    async end() {}
  }
  const result = await runGuardedProductionDeploy({
    sourceSha: head,
    expectedCurrentVersion: ACTIVE_VERSION,
    confirmWorker: PRODUCTION_WORKER_NAME,
    repoRoot: dir,
    execute: false,
    dbConnectionString: DB_URL,
    runCommandImpl: fake.run,
    pgFactory: ThrowingClient,
    fetchImpl: makeFakeLiveFetch(),
    cloudflareCredentials: { accountId: "acct", apiToken: "tok" },
  });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-expand-state"));
  assert.ok(result.checks.some((c) => c.name === "db-expand-state" && c.detail.includes("fail-closed")));
});

test("dry-run passes and never runs a deploy (no upload without --execute)", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.equal(result.blocked, false);
  const isDeployUpload = (call) =>
    /^npx wrangler deploy( |$)/.test(call.command.join(" ")) &&
    !call.command.join(" ").includes("--dry-run");
  const deployCalls = fake.calls.filter(isDeployUpload);
  assert.equal(deployCalls.length, 0, "no upload command may run without --execute");
  const dryRuns = fake.calls.filter((call) => call.command.join(" ").includes("--dry-run"));
  assert.equal(dryRuns.length, 1, "exactly one dry-run is expected");
  assert.equal(dryRuns[0].env.CLOUDFLARE_ENV, "production");
});

test("--execute composes and runs the deploy with the production environment", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake, execute: true });
  assert.equal(result.status, "DEPLOYED");
  assert.equal(result.blocked, false);
  const isDeployUpload = (call) =>
    /^npx wrangler deploy( |$)/.test(call.command.join(" ")) &&
    !call.command.join(" ").includes("--dry-run");
  const deployCalls = fake.calls.filter(isDeployUpload);
  assert.equal(deployCalls.length, 1, "exactly one upload command expected with --execute");
  assert.equal(deployCalls[0].env.CLOUDFLARE_ENV, "production");
  assert.deepEqual(deployCalls[0].command, ["npx", "wrangler", "deploy"]);
  assert.equal(result.deploy.newActiveVersion, NEW_VERSION);
  assert.equal(result.deploy.changed, true);
  assert.ok(result.rollbackCommand.join(" ").includes(ACTIVE_VERSION));
});

test("--execute with a failing deploy reports DEPLOY_INCIDENT and keeps the rollback target", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun({ deployExit: 1 });
  const { result } = await runGuard({ dir, head, fake, execute: true });
  assert.equal(result.status, "DEPLOY_INCIDENT");
  assert.ok(problemNames(result).includes("deploy-exit"));
  assert.equal(result.blocked, true);
  assert.ok(result.rollbackCommand.join(" ").includes(ACTIVE_VERSION));
});

test("guard result carries the exact expected production config target", async () => {
  const { dir, head } = await makeScratchRepo();
  const fake = makeFakeRun();
  const { result } = await runGuard({ dir, head, fake });
  assert.equal(result.status, "DRY_RUN_GO");
  assert.equal(result.configTarget.worker, PRODUCTION_WORKER_NAME);
  assert.equal(result.configTarget.vars.API_MUTATIONS_ENABLED, EXPECTED_VARS.API_MUTATIONS_ENABLED);
  assert.equal(result.configTarget.vars.APP_ENV, EXPECTED_VARS.APP_ENV);
  assert.equal(result.configTarget.vars.FIREBASE_PROJECT_ID, EXPECTED_VARS.FIREBASE_PROJECT_ID);
});

// helper used by the F3 environment test
async function readManifest(dir) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(dir, "dist", "server", "lovetree-build-manifest.json"), "utf8");
}
