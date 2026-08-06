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

async function makeScratchRepo({ source = SOURCE, built = builtConfig() } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "prod-guard-repo-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "guard-test@example.com"]);
  git(dir, ["config", "user.name", "Guard Test"]);
  await writeFile(path.join(dir, "wrangler.jsonc"), source, "utf8");
  await writeFile(path.join(dir, "placeholder.txt"), "placeholder\n", "utf8");
  await mkdir(path.join(dir, "dist", "client", "assets"), { recursive: true });
  await writeFile(path.join(dir, "dist", "client", "assets", "app.js"), "console.log('asset');\n", "utf8");
  await mkdir(path.join(dir, "dist", "server"), { recursive: true });
  await writeFile(path.join(dir, "dist", "server", "wrangler.json"), built, "utf8");
  await writeFile(path.join(dir, "dist", "server", "index.js"), "export default {};\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "base"]);
  const head = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  git(dir, ["update-ref", "refs/remotes/origin/main", head]);
  return { dir, head };
}

// Scripted wrangler fake. Returns { run, calls, state }.
function makeFakeRun(options = {}) {
  const state = {
    activeVersion: options.activeVersion ?? ACTIVE_VERSION,
    forbiddenExists: options.forbiddenExists ?? false,
    secrets: options.secrets ?? ["DATABASE_URL"],
    deployExit: options.deployExit ?? 0,
    dryRunExit: options.dryRunExit ?? 0,
    dryRunOut: options.dryRunOut ?? DRY_RUN_OUT,
    dbRows: options.dbRows ?? {},
  };
  const calls = [];
  const run = (command, opts = {}) => {
    const joined = command.join(" ");
    calls.push({ command, env: opts.env ?? {} });
    if (joined.startsWith(`npx wrangler deployments list --name ${FORBIDDEN_WORKER_NAME}`)) {
      if (!state.forbiddenExists) {
        return { exitCode: 1, stdout: "", stderr: "This Worker does not exist on your account. [code: 10007]" };
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
      return {
        exitCode: 0,
        stdout: JSON.stringify([
          { id: "deploy-1", created_on: "2026-07-31T03:23:01.919732Z", versions: [{ version_id: state.activeVersion, percentage: 100 }] },
        ]),
        stderr: "",
      };
    }
    if (joined.startsWith("npx wrangler secret list")) {
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

// Fake `pg` client factory backed by canned rows.
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
      if (trimmed.includes("memories_tree_sort_order_uniq_partial")) {
        return { rows: rows.noPartial ? [] : [{ found: 1 }] };
      }
      if (trimmed.includes("memories_tree_sort_order_uniq")) {
        return { rows: rows.hasFullIndex ? [{ found: 1 }] : [] };
      }
      if (trimmed.includes("memories_tree_client_key_uniq")) {
        return { rows: rows.noClientKeyIndex ? [] : [{ found: 1 }] };
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
    }),
    fake,
    pg,
  };
}

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
  // The trailing "}\n  }\n}" makes this unique to the production block
  // (the staging block ends with ",").
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
  });
  assert.equal(result.status, "BLOCKED");
  assert.ok(problemNames(result).includes("db-expand-state"));
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
