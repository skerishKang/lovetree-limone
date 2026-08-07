import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  PROTECTED_WORKER_NAMES,
  ISOLATED_PREVIEW_WORKER_PATTERN,
  validatePreviewWorkerName,
  validateSourceState,
  buildSafePreviewConfig,
  sanitizeBuiltModuleRules,
  buildWranglerCommands,
  buildRollbackCommand,
  runGuardedPreviewDeploy,
  parseWranglerConfig,
  collectWorkerVersion,
  assertPreflightSnapshot,
  assertPostflightVerification,
  computeDeploymentFingerprint,
  buildRollbackInfo,
  absentSnapshot,
  runCommand,
} from "../scripts/lib/isolated-preview-deploy-guard.mjs";

const SOURCE_WRANGLER = `{
  // fixture mirroring the repository wrangler.jsonc (default name = Production)
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "lovetree-limone",
  "main": "worker/index.ts",
  "compatibility_date": "2026-07-01",
  "assets": {
    "directory": "dist/client",
    "binding": "ASSETS"
  },
  "vars": {
    "APP_ENV": "staging",
    "API_MUTATIONS_ENABLED": "false",
    "FIREBASE_PROJECT_ID": "relovetree"
  },
  "secrets": {
    "required": ["DATABASE_URL"]
  },
  "env": {
    "staging": {
      "workers_dev": true,
      "vars": {
        "APP_ENV": "staging",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": {
        "required": ["DATABASE_URL"]
      }
    },
    "production": {
      "name": "lovetree-limone",
      "vars": {
        "APP_ENV": "production",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": {
        "required": ["DATABASE_URL"]
      }
    }
  }
}
`;

const BUILT_WRANGLER = JSON.stringify({
  name: "lovetree-limone",
  main: "index.js",
  compatibility_date: "2026-07-01",
  compatibility_flags: ["nodejs_compat"],
  no_bundle: true,
  rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  assets: { directory: "../client", binding: "ASSETS" },
  vars: {
    APP_ENV: "staging",
    API_MUTATIONS_ENABLED: "false",
    FIREBASE_PROJECT_ID: "relovetree",
  },
  secrets: { required: ["DATABASE_URL"] },
});

const VALID_WORKER = "lovetree-limone-issue-26-preview";
const VALID_WORKER_CACHE = "lovetree-limone-cache-pr12-preview";
const ACCOUNT_ID = "test-account-id";
const API_TOKEN = "test-api-token";

function git(dir, args) {
  const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  return result;
}

async function makeScratchRepo({ builtConfig = BUILT_WRANGLER } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "guard-test-repo-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "guard-test@example.com"]);
  git(dir, ["config", "user.name", "Guard Test"]);
  await writeFile(path.join(dir, "wrangler.jsonc"), SOURCE_WRANGLER, "utf8");
  await writeFile(path.join(dir, "placeholder.txt"), "placeholder\n", "utf8");
  await mkdir(path.join(dir, "dist", "client"), { recursive: true });
  await writeFile(
    path.join(dir, "dist", "client", "index.html"),
    "<!doctype html>\n",
    "utf8"
  );
  await mkdir(path.join(dir, "dist", "server"), { recursive: true });
  await writeFile(
    path.join(dir, "dist", "server", "wrangler.json"),
    builtConfig,
    "utf8"
  );
  await writeFile(
    path.join(dir, "dist", "server", "index.js"),
    "export default { fetch() { return new Response('ok'); } };\n",
    "utf8"
  );
  git(dir, ["add", "."]);
  const commit = git(dir, ["commit", "-m", "init"]);
  assert.equal(commit.status, 0, commit.stderr);
  const head = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  return { dir, head };
}

function headOf(repoRoot) {
  return git(repoRoot, ["rev-parse", "HEAD"]).stdout.trim();
}

function mockRunner({ dryRunPlan = { exitCode: 0 }, deployPlan = { exitCode: 0 }, throwKind = null } = {}) {
  const calls = [];
  function runner(command) {
    calls.push(command);
    const isDryRun = command.includes("--dry-run");
    if (
      throwKind &&
      ((throwKind === "dryRun" && isDryRun) ||
        (throwKind === "deploy" && !isDryRun))
    ) {
      throw new Error(`mock runner threw on ${isDryRun ? "dryRun" : "deploy"}`);
    }
    if (isDryRun) {
      return { exitCode: dryRunPlan.exitCode, stdout: dryRunPlan.stdout ?? "", stderr: dryRunPlan.stderr ?? "" };
    }
    return { exitCode: deployPlan.exitCode, stdout: deployPlan.stdout ?? "", stderr: deployPlan.stderr ?? "" };
  }
  return { calls, runner };
}

async function withConfigDir(fn) {
  const outputDir = await mkdtemp(path.join(tmpdir(), "guard-config-"));
  try {
    return await fn(outputDir);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

// Real Cloudflare deployments envelope helpers.
//
// GET /accounts/{account_id}/workers/scripts/{script_name}/deployments
// returns `result.deployments[]` where each deployment carries a nested
// `versions[]` array. These helpers reproduce that exact shape so tests
// cannot drift from the real API again.

// Synthetic sanitized shape contract fixture mirroring the live response.
const CLOUDFLARE_DEPLOYMENTS_RESPONSE_FIXTURE = {
  success: true,
  errors: [],
  messages: [],
  result: {
    deployments: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        created_on: "2026-08-02T00:00:00.000000Z",
        source: "wrangler",
        strategy: "percentage",
        versions: [
          {
            version_id: "00000000-0000-4000-8000-000000000002",
            percentage: 100,
          },
        ],
      },
    ],
  },
};

function version(versionId, percentage = 100) {
  return { version_id: versionId, percentage };
}

function deploymentEntry({
  id,
  createdOn,
  strategy = "percentage",
  versions,
}) {
  return {
    id,
    created_on: createdOn,
    source: "wrangler",
    strategy,
    versions,
  };
}

function okResponse(deployments) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      errors: [],
      messages: [],
      result: { deployments },
    }),
  };
}

function rawOkResponse(result) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, errors: [], messages: [], result }),
  };
}

function errorResponse(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: false, errors: [], messages: [], result: null }),
  };
}

function invalidJsonResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  };
}

function malformedResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, result: { deployments: "not-an-array" } }),
  };
}

function workerNameFromUrl(url) {
  const after = String(url).split("/workers/scripts/")[1] ?? "";
  return decodeURIComponent(after.split("/deployments")[0]);
}

function makeApiPlan({ before, after, beforeError, afterError }) {
  const counts = new Map();
  const fetchImpl = async (url) => {
    const worker = workerNameFromUrl(url);
    const n = (counts.get(worker) ?? 0) + 1;
    counts.set(worker, n);
    if (n === 1) {
      if (beforeError) throw beforeError;
      return before[worker];
    }
    if (afterError) throw afterError;
    return after[worker];
  };
  return fetchImpl;
}

function deploymentFor(targetVersion) {
  return deploymentEntry({
    id: `deployment-${targetVersion}`,
    createdOn: "2026-08-02T00:00:00Z",
    versions: [version(targetVersion)],
  });
}

function presentSnapshots(targetVersion, protectedVersionFn = (name) => `ver-${name}`) {
  const before = {};
  before[VALID_WORKER] = okResponse([deploymentFor(targetVersion)]);
  for (const name of PROTECTED_WORKER_NAMES) {
    const protectedVersion = protectedVersionFn(name);
    before[name] = okResponse([deploymentFor(protectedVersion)]);
  }
  return before;
}

function presentAfter(targetVersion) {
  return { ...presentSnapshots(targetVersion) };
}

// Builds a structured snapshot object for preflight/postflight tests.
// Accepts versions in raw API shape ({ version_id, percentage }) or the
// normalized shape ({ versionId, percentage }).
function snapshotFor({
  workerName,
  state,
  deploymentId,
  createdOn = "2026-08-02T00:00:00Z",
  strategy = "percentage",
  versions,
}) {
  if (state === "absent") {
    return absentSnapshot(workerName);
  }
  const normalizedVersions = (versions ?? []).map((entry) => ({
    versionId: entry.versionId ?? entry.version_id,
    percentage: entry.percentage,
  }));
  return {
    worker: workerName,
    state: "present",
    deploymentId,
    createdOn,
    strategy,
    versions: normalizedVersions,
    deploymentFingerprint: computeDeploymentFingerprint({
      deploymentId,
      createdOn,
      strategy,
      versions: normalizedVersions,
    }),
  };
}

test("parseWranglerConfig strips jsonc comments", () => {
  const config = parseWranglerConfig(SOURCE_WRANGLER);
  assert.equal(config.name, "lovetree-limone");
  assert.equal(config.env.staging.vars.API_MUTATIONS_ENABLED, "true");
});

test("protected list contains the three protected workers", () => {
  assert.deepEqual(
    [...PROTECTED_WORKER_NAMES].sort(),
    ["lovetree-limone", "lovetree-limone-staging", "lovetree-limone-v2"].sort()
  );
});

test("allowed naming pattern accepts documented previews", () => {
  assert.equal(ISOLATED_PREVIEW_WORKER_PATTERN.test(VALID_WORKER), true);
  assert.equal(ISOLATED_PREVIEW_WORKER_PATTERN.test(VALID_WORKER_CACHE), true);
});

test("allowed naming pattern rejects forbidden names", () => {
  for (const name of [
    "lovetree-limone",
    "lovetree-limone-staging",
    "lovetree-limone-v2",
    "lovetree-limone-preview-production",
    "other-worker",
    "",
    "lovetree-limone-cache preview",
    "lovetree-limone/cache-preview",
    "Lovetree-limone-cache-preview",
    "lovetree-limone-cache-preview;rm -rf /",
  ]) {
    assert.equal(
      ISOLATED_PREVIEW_WORKER_PATTERN.test(name),
      false,
      `pattern should reject ${JSON.stringify(name)}`
    );
  }
});

test("worker name: production exact name is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone",
        confirmWorker: "lovetree-limone",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: staging exact name is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone-staging",
        confirmWorker: "lovetree-limone-staging",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: V2 exact name is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone-v2",
        confirmWorker: "lovetree-limone-v2",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: confirm mismatch is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: VALID_WORKER,
        confirmWorker: `${VALID_WORKER}x`,
        canonicalName: "lovetree-limone",
      }),
    (error) =>
      error.code === "INVALID_WORKER_NAME" && /confirmation mismatch/.test(error.message)
  );
});

test("worker name: valid cache preview is allowed", () => {
  const result = validatePreviewWorkerName({
    worker: VALID_WORKER_CACHE,
    confirmWorker: VALID_WORKER_CACHE,
    canonicalName: "lovetree-limone",
  });
  assert.equal(result.safe, true);
});

test("worker name: valid issue preview is allowed", () => {
  const result = validatePreviewWorkerName({
    worker: VALID_WORKER,
    confirmWorker: VALID_WORKER,
    canonicalName: "lovetree-limone",
  });
  assert.equal(result.safe, true);
});

test("worker name: upper-case is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "Lovetree-limone-cache-preview",
        confirmWorker: "Lovetree-limone-cache-preview",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: spaces are blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone-cache preview",
        confirmWorker: "lovetree-limone-cache preview",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: slash is blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone/cache-preview",
        confirmWorker: "lovetree-limone/cache-preview",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: shell metacharacters are blocked", () => {
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: "lovetree-limone-cache-preview;rm -rf /",
        confirmWorker: "lovetree-limone-cache-preview;rm -rf /",
        canonicalName: "lovetree-limone",
      }),
    (error) => error.code === "INVALID_WORKER_NAME"
  );
});

test("worker name: canonical default name equality is blocked even when not protected", () => {
  const canonical = VALID_WORKER_CACHE;
  assert.throws(
    () =>
      validatePreviewWorkerName({
        worker: canonical,
        confirmWorker: canonical,
        canonicalName: canonical,
      }),
    (error) =>
      error.code === "INVALID_WORKER_NAME" && /canonical Wrangler default/.test(error.message)
  );
});

test("source: exact clean head is allowed", async () => {
  const { dir, head } = await makeScratchRepo();
  const state = await validateSourceState({ repoRoot: dir, sourceSha: head });
  assert.equal(state.clean, true);
  assert.equal(state.head, head);
});

test("source: SHA mismatch is blocked", async () => {
  const { dir } = await makeScratchRepo();
  await assert.rejects(
    () =>
      validateSourceState({
        repoRoot: dir,
        sourceSha: "0".repeat(40),
      }),
    (error) => error.code === "SOURCE_SHA_MISMATCH"
  );
});

test("source: dirty worktree is blocked by default", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "placeholder.txt"), "modified\n", "utf8");
  await assert.rejects(
    () => validateSourceState({ repoRoot: dir, sourceSha: head }),
    (error) => error.code === "DIRTY_WORKTREE"
  );
});

test("source: tracked unstaged modification is allowed with --allow-dirty and hashes deterministically", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "placeholder.txt"), "A/B marker unstaged\n", "utf8");
  const state = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  assert.equal(state.dirty, true);
  assert.match(state.patchSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(state.dirtyTrackedFiles, ["placeholder.txt"]);
  const again = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  assert.equal(again.patchSha256, state.patchSha256);
});

test("source: tracked staged modification is allowed with --allow-dirty and hashes", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "placeholder.txt"), "A/B marker staged\n", "utf8");
  git(dir, ["add", "placeholder.txt"]);
  const state = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  assert.equal(state.dirty, true);
  assert.match(state.patchSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(state.dirtyTrackedFiles, ["placeholder.txt"]);
});

test("source: tracked binary modification is allowed with --allow-dirty and hashes", async () => {
  const { dir } = await makeScratchRepo();
  await writeFile(path.join(dir, "binary.dat"), Buffer.from([0, 1, 2, 3, 254, 255]));
  git(dir, ["add", "binary.dat"]);
  assert.equal(git(dir, ["commit", "-m", "add binary"]).status, 0);
  const newHead = headOf(dir);
  await writeFile(path.join(dir, "binary.dat"), Buffer.from([0, 1, 2, 3, 254, 254]));
  const state = await validateSourceState({
    repoRoot: dir,
    sourceSha: newHead,
    allowDirty: true,
  });
  assert.equal(state.dirty, true);
  assert.match(state.patchSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(state.dirtyTrackedFiles, ["binary.dat"]);
});

test("source: untracked file is rejected even with --allow-dirty", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "dirty-marker.txt"), "untracked\n", "utf8");
  await assert.rejects(
    () =>
      validateSourceState({
        repoRoot: dir,
        sourceSha: head,
        allowDirty: true,
      }),
    (error) => error.code === "UNTRACKED_FILES_NOT_ALLOWED"
  );
});

test("source: untracked directory is rejected even with --allow-dirty", async () => {
  const { dir, head } = await makeScratchRepo();
  await mkdir(path.join(dir, "untracked-dir"), { recursive: true });
  await writeFile(path.join(dir, "untracked-dir", "marker.txt"), "x\n", "utf8");
  await assert.rejects(
    () =>
      validateSourceState({
        repoRoot: dir,
        sourceSha: head,
        allowDirty: true,
      }),
    (error) => error.code === "UNTRACKED_FILES_NOT_ALLOWED"
  );
});

test("source: distinct tracked patches produce distinct hashes", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "placeholder.txt"), "patch one\n", "utf8");
  const first = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  await writeFile(path.join(dir, "placeholder.txt"), "patch two\n", "utf8");
  const second = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  assert.notEqual(first.patchSha256, second.patchSha256);
});

test("config: generated config contains only the exact target and safe values", async () => {
  const { dir } = await makeScratchRepo();
  const { config, configSha256 } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.equal(config.name, VALID_WORKER);
  assert.equal(config.workers_dev, true);
  assert.equal(config.main, path.join(dir, "dist", "server", "index.js"));
  assert.equal(config.no_bundle, true);
  assert.deepEqual(config.assets, {
    directory: path.join(dir, "dist", "client"),
    binding: "ASSETS",
  });
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  assert.equal(config.vars.APP_ENV, "staging");
  assert.equal(config.vars.API_MUTATIONS_ENABLED, "false");
  assert.equal(config.vars.FIREBASE_PROJECT_ID, "relovetree");
  assert.match(configSha256, /^[0-9a-f]{64}$/);
});

test("config: no routes, custom domains, env blocks, production, mutations, or secret metadata", async () => {
  const { dir } = await makeScratchRepo();
  const { content } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.equal(content.includes("routes"), false);
  assert.equal(content.includes("custom_domains"), false);
  assert.equal(content.includes('"env"'), false);
  assert.equal(content.includes("APP_ENV\": \"production"), false);
  assert.equal(content.includes("API_MUTATIONS_ENABLED\": \"true"), false);
  assert.equal(content.includes('"lovetree-limone-staging"'), false);
  assert.equal(content.includes('"lovetree-limone-v2"'), false);
  assert.equal(content.includes("secrets"), false);
  assert.equal(content.includes("DATABASE_URL"), false);
});

test("config: generated name is never a protected name", async () => {
  const { dir } = await makeScratchRepo();
  const { config } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.equal(PROTECTED_WORKER_NAMES.includes(config.name), false);
});

test("config: source wrangler.jsonc is not modified", async () => {
  const { dir } = await makeScratchRepo();
  const before = await readFile(path.join(dir, "wrangler.jsonc"), "utf8");
  await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  const after = await readFile(path.join(dir, "wrangler.jsonc"), "utf8");
  assert.equal(after, before);
});

// --- Built module rules contract (R1-R5, 2026-08-02 rules omission repair) ---
//
// The built worker config (`dist/server/wrangler.json`) carries module-discovery
// `rules` that Wrangler needs when `no_bundle: true`. Without them Wrangler does
// not upload sibling ES modules (e.g. `__vite_rsc_assets_manifest.js`) and
// Cloudflare rejects the deployment with error 10021. These tests pin the
// sanitizer contract: built rules only, strict validation, order preservation,
// and fail-closed behavior before any command is invoked.

function builtConfigWith(overrides) {
  return JSON.stringify({
    name: "lovetree-limone",
    main: "index.js",
    compatibility_date: "2026-07-01",
    compatibility_flags: ["nodejs_compat"],
    no_bundle: true,
    assets: { directory: "../client", binding: "ASSETS" },
    vars: {
      APP_ENV: "staging",
      API_MUTATIONS_ENABLED: "false",
      FIREBASE_PROJECT_ID: "relovetree",
    },
    ...overrides,
  });
}

test("rules T1: valid ESModule rules are preserved semantically (sanitizer)", () => {
  const rules = [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }];
  const result = sanitizeBuiltModuleRules(rules, { noBundle: true });
  assert.deepEqual(result, [
    { type: "ESModule", globs: ["**/*.js", "**/*.mjs"] },
  ]);
});

test("rules T1: generated config preserves built ESModule rules", async () => {
  const { dir } = await makeScratchRepo();
  const { config } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.deepEqual(config.rules, [
    { type: "ESModule", globs: ["**/*.js", "**/*.mjs"] },
  ]);
  assert.equal(config.rules[0].type, "ESModule");
  assert.deepEqual(config.rules[0].globs, ["**/*.js", "**/*.mjs"]);
});

test("rules T2: multiple rules, rule order, glob order, and fallthrough preserved", () => {
  const rules = [
    { type: "ESModule", globs: ["**/*.js"], fallthrough: true },
    { type: "Text", globs: ["**/*.txt"] },
  ];
  const result = sanitizeBuiltModuleRules(rules, { noBundle: true });
  assert.deepEqual(result, [
    { type: "ESModule", globs: ["**/*.js"], fallthrough: true },
    { type: "Text", globs: ["**/*.txt"] },
  ]);
  assert.deepEqual(Object.keys(result[0]).sort(), ["fallthrough", "globs", "type"]);
  assert.deepEqual(Object.keys(result[1]).sort(), ["globs", "type"]);
});

test("rules T2: duplicate rules are not merged and order is stable", () => {
  const rules = [
    { type: "ESModule", globs: ["**/*.js"] },
    { type: "ESModule", globs: ["**/*.js"] },
  ];
  const result = sanitizeBuiltModuleRules(rules, { noBundle: true });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], result[1]);
});

test("rules T3: no_bundle with missing rules fails closed before any command", async () => {
  const { dir, head } = await makeScratchRepo({
    builtConfig: builtConfigWith({ rules: undefined }),
  });
  const runner = mockRunner();
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "BUILD_MODULE_RULES_MISSING"
    );
  });
  assert.equal(runner.calls.length, 0);
});

test("rules T3: missing-rules sanitizer error carries BUILD_MODULE_RULES_MISSING", () => {
  assert.throws(
    () => sanitizeBuiltModuleRules(undefined, { noBundle: true }),
    (error) => error.code === "BUILD_MODULE_RULES_MISSING"
  );
  assert.throws(
    () => sanitizeBuiltModuleRules(null, { noBundle: true }),
    (error) => error.code === "BUILD_MODULE_RULES_MISSING"
  );
});

test("rules T4: no_bundle with empty rules array fails closed", () => {
  assert.throws(
    () => sanitizeBuiltModuleRules([], { noBundle: true }),
    (error) => error.code === "BUILD_MODULE_RULES_MISSING"
  );
});

test("rules T4: no_bundle with empty rules fails closed before any command", async () => {
  const { dir, head } = await makeScratchRepo({
    builtConfig: builtConfigWith({ rules: [] }),
  });
  const runner = mockRunner();
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "BUILD_MODULE_RULES_MISSING"
    );
  });
  assert.equal(runner.calls.length, 0);
});

test("rules T5: malformed rules fail closed with BUILD_MODULE_RULES_INVALID", () => {
  const malformedCases = [
    { label: "rules is object", rules: { type: "ESModule", globs: ["**/*.js"] } },
    { label: "rule is null", rules: [null] },
    { label: "rule is array", rules: [["ESModule"]] },
    { label: "unsupported type", rules: [{ type: "Python", globs: ["**/*.py"] }] },
    { label: "type missing", rules: [{ globs: ["**/*.js"] }] },
    { label: "globs missing", rules: [{ type: "ESModule" }] },
    { label: "globs empty", rules: [{ type: "ESModule", globs: [] }] },
    { label: "glob non-string", rules: [{ type: "ESModule", globs: [42] }] },
    { label: "glob empty string", rules: [{ type: "ESModule", globs: [""] }] },
    { label: "glob whitespace only", rules: [{ type: "ESModule", globs: ["   "] }] },
    { label: "glob NUL", rules: [{ type: "ESModule", globs: ["**\0*.js"] }] },
    { label: "fallthrough non-boolean", rules: [{ type: "ESModule", globs: ["**/*.js"], fallthrough: "yes" }] },
    { label: "unknown rule key", rules: [{ type: "ESModule", globs: ["**/*.js"], extra: 1 }] },
  ];
  for (const { label, rules } of malformedCases) {
    assert.throws(
      () => sanitizeBuiltModuleRules(rules, { noBundle: true }),
      (error) => error.code === "BUILD_MODULE_RULES_INVALID",
      `expected BUILD_MODULE_RULES_INVALID for: ${label}`
    );
  }
});

test("rules T5: malformed rules fail closed even when no_bundle is false", () => {
  assert.throws(
    () =>
      sanitizeBuiltModuleRules([{ type: "Python", globs: ["**/*.py"] }], {
        noBundle: false,
      }),
    (error) => error.code === "BUILD_MODULE_RULES_INVALID"
  );
});

test("rules T6: no_bundle false allows missing rules (returns null)", () => {
  assert.equal(sanitizeBuiltModuleRules(undefined, { noBundle: false }), null);
  assert.equal(sanitizeBuiltModuleRules(null, { noBundle: false }), null);
  assert.equal(sanitizeBuiltModuleRules(undefined, {}), null);
});

test("rules T6: no_bundle false preserves valid rules through the sanitizer", () => {
  const rules = [{ type: "ESModule", globs: ["**/*.js"] }];
  const result = sanitizeBuiltModuleRules(rules, { noBundle: false });
  assert.deepEqual(result, [{ type: "ESModule", globs: ["**/*.js"] }]);
});

test("rules T6: no_bundle false omits rules from generated config when absent", async () => {
  const { dir } = await makeScratchRepo({
    builtConfig: builtConfigWith({ no_bundle: false, rules: undefined }),
  });
  const { config } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.equal(config.no_bundle, false);
  assert.equal(config.rules, undefined);
});

test("rules T7: forbidden fields stay absent after rules preservation", async () => {
  const { dir } = await makeScratchRepo();
  const { config, content } = await withConfigDir((outputDir) =>
    buildSafePreviewConfig({
      repoRoot: dir,
      workerName: VALID_WORKER,
      outputDir,
    })
  );
  assert.ok(Array.isArray(config.rules) && config.rules.length > 0);
  for (const forbidden of [
    "routes",
    "custom_domains",
    "env",
    "secrets",
    "triggers",
    "queues",
    "queues_producers",
    "queues_consumers",
    "workflows",
  ]) {
    assert.equal(config[forbidden], undefined, `config must not contain ${forbidden}`);
  }
  assert.equal(content.includes("routes"), false);
  assert.equal(content.includes("custom_domains"), false);
  assert.equal(content.includes('"env"'), false);
  assert.equal(content.includes("secrets"), false);
  assert.equal(content.includes("triggers"), false);
  assert.equal(content.includes("queues"), false);
  assert.equal(content.includes("workflows"), false);
});

test("rules T8: distinct rules produce distinct generated config SHA-256", async () => {
  const buildSha = async (rules) => {
    const { dir } = await makeScratchRepo({
      builtConfig: builtConfigWith({ rules }),
    });
    const { configSha256 } = await withConfigDir((outputDir) =>
      buildSafePreviewConfig({
        repoRoot: dir,
        workerName: VALID_WORKER,
        outputDir,
      })
    );
    return configSha256;
  };
  const base = await buildSha([{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }]);
  const differentGlob = await buildSha([{ type: "ESModule", globs: ["**/*.js"] }]);
  const differentType = await buildSha([{ type: "CommonJS", globs: ["**/*.js", "**/*.mjs"] }]);
  const withFallthrough = await buildSha([
    { type: "ESModule", globs: ["**/*.js", "**/*.mjs"], fallthrough: true },
  ]);
  assert.notEqual(base, differentGlob);
  assert.notEqual(base, differentType);
  assert.notEqual(base, withFallthrough);
});

test("rules T9: mutating sanitizer output does not affect the built input", () => {
  const rules = [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }];
  const result = sanitizeBuiltModuleRules(rules, { noBundle: true });
  assert.notEqual(result, rules);
  assert.notEqual(result[0], rules[0]);
  assert.notEqual(result[0].globs, rules[0].globs);
  result[0].type = "Text";
  result[0].globs.push("**/*.cjs");
  result.push({ type: "Data", globs: ["**/*.bin"] });
  assert.deepEqual(rules, [
    { type: "ESModule", globs: ["**/*.js", "**/*.mjs"] },
  ]);
});

test("commands: dry-run precedes deploy and neither carries --name", () => {
  const commands = buildWranglerCommands({ configPath: "/tmp/fake-config.json" });
  assert.deepEqual(commands.dryRun[0], "npx");
  assert.ok(commands.dryRun.includes("--dry-run"));
  assert.ok(!commands.dryRun.includes("--name"));
  assert.ok(!commands.deploy.includes("--name"));
  const deployIndex = commands.deploy.indexOf("--config");
  const dryIndex = commands.dryRun.indexOf("--config");
  assert.ok(deployIndex !== -1);
  assert.ok(dryIndex !== -1);
  assert.equal(commands.deploy[deployIndex + 1], "/tmp/fake-config.json");
});

test("rollback command embeds the exact prior version id", () => {
  const command = buildRollbackCommand({
    configPath: "/tmp/cfg.json",
    versionId: "cc92d036-5868-4bb6-b4f4-dfd747ea6485",
  });
  assert.deepEqual(command, [
    "npx",
    "wrangler",
    "rollback",
    "cc92d036-5868-4bb6-b4f4-dfd747ea6485",
    "--config",
    "/tmp/cfg.json",
  ]);
});

test("runCommand: numeric exit codes are preserved", () => {
  assert.equal(runCommand(["node", "-e", "process.exit(0)"]).exitCode, 0);
  assert.equal(runCommand(["node", "-e", "process.exit(7)"]).exitCode, 7);
});

test("runCommand: spawn failure is not misread as exit 0", () => {
  const result = runCommand(["definitely-not-a-real-binary-xyz"]);
  assert.notEqual(result.exitCode, 0);
  assert.ok(result.exitCode < 0);
});

test("runCommand: signal termination is not misread as exit 0", () => {
  const result = runCommand(["node", "-e", "process.kill(process.pid, 'SIGKILL')"]);
  assert.notEqual(result.exitCode, 0);
});

test("collectWorkerVersion: 404 yields explicit absent snapshot", async () => {
  const snapshot = await collectWorkerVersion(VALID_WORKER, {
    apiToken: API_TOKEN,
    accountId: ACCOUNT_ID,
    fetchImpl: async () => errorResponse(404),
  });
  assert.deepEqual(snapshot, {
    worker: VALID_WORKER,
    state: "absent",
    deploymentId: null,
    createdOn: null,
    strategy: null,
    versions: [],
    deploymentFingerprint: null,
  });
});

test("collectWorkerVersion: single deployment with single 100% version parses", async () => {
  const snapshot = await collectWorkerVersion(VALID_WORKER, {
    apiToken: API_TOKEN,
    accountId: ACCOUNT_ID,
    fetchImpl: async () => okResponse([deploymentFor("v1")]),
  });
  assert.equal(snapshot.state, "present");
  assert.equal(snapshot.deploymentId, "deployment-v1");
  assert.equal(snapshot.createdOn, "2026-08-02T00:00:00Z");
  assert.equal(snapshot.strategy, "percentage");
  assert.deepEqual(snapshot.versions, [{ versionId: "v1", percentage: 100 }]);
  assert.match(snapshot.deploymentFingerprint, /^[0-9a-f]{64}$/);
});

test("collectWorkerVersion: first deployment is the active deployment per API contract", async () => {
  const deployments = [
    deploymentEntry({
      id: "deployment-first",
      createdOn: "2026-08-02T00:00:00Z",
      versions: [version("first-v")],
    }),
    deploymentEntry({
      id: "deployment-second",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("second-v")],
    }),
  ];
  const snapshot = await collectWorkerVersion(VALID_WORKER, {
    apiToken: API_TOKEN,
    accountId: ACCOUNT_ID,
    fetchImpl: async () => okResponse(deployments),
  });
  assert.equal(snapshot.deploymentId, "deployment-first");
  assert.equal(snapshot.versions[0].versionId, "first-v");
});

test("collectWorkerVersion: weighted deployment with two versions parses", async () => {
  const snapshot = await collectWorkerVersion(VALID_WORKER, {
    apiToken: API_TOKEN,
    accountId: ACCOUNT_ID,
    fetchImpl: async () =>
      okResponse([
        deploymentEntry({
          id: "deployment-weighted",
          createdOn: "2026-08-02T00:00:00Z",
          versions: [version("a", 60), version("b", 40)],
        }),
      ]),
  });
  assert.equal(snapshot.state, "present");
  assert.deepEqual(snapshot.versions, [
    { versionId: "a", percentage: 60 },
    { versionId: "b", percentage: 40 },
  ]);
});

test("collectWorkerVersion: versions input order does not change the fingerprint", async () => {
  const run = (order) =>
    collectWorkerVersion(VALID_WORKER, {
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl: async () =>
        okResponse([
          deploymentEntry({
            id: "deployment-weighted",
            createdOn: "2026-08-02T00:00:00Z",
            versions: order,
          }),
        ]),
    });
  const first = await run([version("a", 40), version("b", 60)]);
  const second = await run([version("b", 60), version("a", 40)]);
  assert.equal(first.deploymentFingerprint, second.deploymentFingerprint);
  assert.deepEqual(first.versions, second.versions);
});

test("collectWorkerVersion: identical responses produce a deterministic fingerprint", async () => {
  const run = () =>
    collectWorkerVersion(VALID_WORKER, {
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl: async () => okResponse([deploymentFor("v1")]),
    });
  const first = await run();
  const second = await run();
  assert.equal(first.deploymentFingerprint, second.deploymentFingerprint);
});

test("collectWorkerVersion: sanitized live-shape fixture parses", async () => {
  const snapshot = await collectWorkerVersion(VALID_WORKER, {
    apiToken: API_TOKEN,
    accountId: ACCOUNT_ID,
    fetchImpl: async () => rawOkResponse(CLOUDFLARE_DEPLOYMENTS_RESPONSE_FIXTURE.result),
  });
  assert.equal(snapshot.state, "present");
  assert.equal(snapshot.deploymentId, "00000000-0000-4000-8000-000000000001");
  assert.deepEqual(snapshot.versions, [
    { versionId: "00000000-0000-4000-8000-000000000002", percentage: 100 },
  ]);
});

test("collectWorkerVersion: direct result array is rejected as malformed", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () =>
          rawOkResponse([
            { id: "d1", version_id: "v1", created_on: "2026-08-02T00:00:00Z" },
          ]),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: authentication failure is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => errorResponse(401),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: permission failure is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => errorResponse(403),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: rate limit is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => errorResponse(429),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: network failure is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => {
          throw new Error("ECONNREFUSED");
        },
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: timeout is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => {
          throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
        },
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: invalid JSON is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => invalidJsonResponse(),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: malformed payload is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => malformedResponse(),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: present worker with empty deployments is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => okResponse([]),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("collectWorkerVersion: envelope errors are unavailable", async () => {
  const cases = [
    async () => ({ ok: true, status: 200, json: async () => null }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: false, result: { deployments: [] } }) }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: "nope" }) }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: {} }) }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: { deployments: "nope" } }) }),
    async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: { deployments: [] } }) }),
  ];
  for (const fetchImpl of cases) {
    await assert.rejects(
      () =>
        collectWorkerVersion(VALID_WORKER, {
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  }
});

test("collectWorkerVersion: first deployment malformed is unavailable", async () => {
  const cases = [
    null,
    { created_on: "2026-08-02T00:00:00Z", versions: [version("v1")] },
    { id: "d1", versions: [version("v1")] },
    { id: "d1", created_on: "not-a-date", versions: [version("v1")] },
    { id: "d1", created_on: "2026-08-02T00:00:00Z" },
    { id: "d1", created_on: "2026-08-02T00:00:00Z", versions: [] },
    { id: "d1", created_on: "2026-08-02T00:00:00Z", versions: [version("v1")], strategy: "" },
  ];
  for (const deployment of cases) {
    await assert.rejects(
      () =>
        collectWorkerVersion(VALID_WORKER, {
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl: async () => okResponse([deployment]),
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  }
});

test("collectWorkerVersion: version errors are unavailable", async () => {
  const versionCases = [
    [{ percentage: 100 }],
    [{ version_id: "v1" }],
    [{ version_id: "v1", percentage: "100" }],
    [{ version_id: "v1", percentage: 0 }],
    [{ version_id: "v1", percentage: -10 }],
    [{ version_id: "v1", percentage: 101 }],
    [{ version_id: "v1", percentage: 50 }],
    [{ version_id: "v1", percentage: 50 }, { version_id: "v2", percentage: 50.0001 }],
    [{ version_id: "v1", percentage: 100 }, { version_id: "v1", percentage: 100 }],
  ];
  for (const versions of versionCases) {
    await assert.rejects(
      () =>
        collectWorkerVersion(VALID_WORKER, {
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl: async () =>
            okResponse([
              deploymentEntry({
                id: "deployment-bad",
                createdOn: "2026-08-02T00:00:00Z",
                versions,
              }),
            ]),
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  }
});

test("collectWorkerVersion: missing credentials are unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: "",
        accountId: ACCOUNT_ID,
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: "",
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("preflight: protected worker must be present with an exact deployment", () => {
  assert.throws(
    () =>
      assertPreflightSnapshot(
        {
          [VALID_WORKER]: absentSnapshot(VALID_WORKER),
          [PROTECTED_WORKER_NAMES[0]]: absentSnapshot(PROTECTED_WORKER_NAMES[0]),
        },
        { workerName: VALID_WORKER, protectedNames: PROTECTED_WORKER_NAMES }
      ),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("preflight: target may be present or absent", () => {
  const snapshots = {
    [VALID_WORKER]: absentSnapshot(VALID_WORKER),
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        snapshotFor({
          workerName: name,
          state: "present",
          deploymentId: `deployment-${name}`,
          versions: [version(`ver-${name}`)],
        }),
      ])
    ),
  };
  const result = assertPreflightSnapshot(snapshots, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(result[VALID_WORKER].state, "absent");
});

test("postflight: target must change and protected workers must stay byte-identical", () => {
  const protectedSnapshots = Object.fromEntries(
    PROTECTED_WORKER_NAMES.map((name) => [
      name,
      snapshotFor({
        workerName: name,
        state: "present",
        deploymentId: `deployment-${name}`,
        versions: [version(`ver-${name}`)],
      }),
    ])
  );
  const before = {
    [VALID_WORKER]: absentSnapshot(VALID_WORKER),
    ...protectedSnapshots,
  };
  const after = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v2",
      versions: [version("v2")],
    }),
    ...protectedSnapshots,
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(verification.targetChanged, true);
  assert.deepEqual(verification.protectedDeltas, []);
});

test("postflight: unchanged target deployment fails", () => {
  const before = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-same",
      versions: [version("same")],
    }),
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        snapshotFor({
          workerName: name,
          state: "present",
          deploymentId: `deployment-${name}`,
          versions: [version(`ver-${name}`)],
        }),
      ])
    ),
  };
  const after = {
    ...before,
  };
  assert.throws(
    () =>
      assertPostflightVerification(before, after, {
        workerName: VALID_WORKER,
        protectedNames: PROTECTED_WORKER_NAMES,
      }),
    (error) => error.code === "TARGET_VERSION_NOT_CHANGED"
  );
});

test("postflight: protected worker delta is detected", () => {
  const before = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v1",
      versions: [version("v1")],
    }),
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        snapshotFor({
          workerName: name,
          state: "present",
          deploymentId: `deployment-${name}`,
          versions: [version(`ver-${name}`)],
        }),
      ])
    ),
  };
  const after = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v2",
      versions: [version("v2")],
    }),
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        snapshotFor({
          workerName: name,
          state: "present",
          deploymentId: name === PROTECTED_WORKER_NAMES[0] ? "deployment-changed" : `deployment-${name}`,
          createdOn: name === PROTECTED_WORKER_NAMES[0] ? "2026-08-02T00:00:01Z" : "2026-08-02T00:00:00Z",
          versions: [version(name === PROTECTED_WORKER_NAMES[0] ? "CHANGED" : `ver-${name}`)],
        }),
      ])
    ),
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(verification.targetChanged, true);
  assert.equal(verification.protectedDeltas.length, 1);
  assert.equal(verification.protectedDeltas[0].name, PROTECTED_WORKER_NAMES[0]);
  assert.equal(
    verification.protectedDeltas[0].before,
    `deploy deployment-${PROTECTED_WORKER_NAMES[0]} [ver-${PROTECTED_WORKER_NAMES[0]}@100%]`
  );
  assert.equal(verification.protectedDeltas[0].after, "deploy deployment-changed [CHANGED@100%]");
});

test("postflight: protected percentage change is detected", () => {
  const shared = {
    workerName: PROTECTED_WORKER_NAMES[0],
    state: "present",
    deploymentId: "deployment-weighted",
    createdOn: "2026-08-02T00:00:00Z",
  };
  const before = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v1",
      versions: [version("v1")],
    }),
    [PROTECTED_WORKER_NAMES[0]]: snapshotFor({
      ...shared,
      versions: [version("a", 60), version("b", 40)],
    }),
    [PROTECTED_WORKER_NAMES[1]]: snapshotFor({
      workerName: PROTECTED_WORKER_NAMES[1],
      state: "present",
      deploymentId: "deployment-s",
      versions: [version("vs")],
    }),
    [PROTECTED_WORKER_NAMES[2]]: snapshotFor({
      workerName: PROTECTED_WORKER_NAMES[2],
      state: "present",
      deploymentId: "deployment-v2w",
      versions: [version("vv")],
    }),
  };
  const after = {
    ...before,
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v2",
      versions: [version("v2")],
    }),
    [PROTECTED_WORKER_NAMES[0]]: snapshotFor({
      ...shared,
      versions: [version("a", 40), version("b", 60)],
    }),
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(verification.targetChanged, true);
  assert.equal(verification.protectedDeltas.length, 1);
  assert.equal(verification.protectedDeltas[0].name, PROTECTED_WORKER_NAMES[0]);
});

test("postflight: protected deployment id change is detected", () => {
  const before = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v1",
      versions: [version("v1")],
    }),
    [PROTECTED_WORKER_NAMES[0]]: snapshotFor({
      workerName: PROTECTED_WORKER_NAMES[0],
      state: "present",
      deploymentId: "deployment-before",
      versions: [version("same-v")],
    }),
  };
  const after = {
    ...before,
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-v2",
      versions: [version("v2")],
    }),
    [PROTECTED_WORKER_NAMES[0]]: snapshotFor({
      workerName: PROTECTED_WORKER_NAMES[0],
      state: "present",
      deploymentId: "deployment-after",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("same-v")],
    }),
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES.slice(0, 1),
  });
  assert.equal(verification.protectedDeltas.length, 1);
});

test("postflight: weighted target change is a success", () => {
  const before = {
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-weighted-before",
      versions: [version("a", 60), version("b", 40)],
    }),
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        snapshotFor({
          workerName: name,
          state: "present",
          deploymentId: `deployment-${name}`,
          versions: [version(`ver-${name}`)],
        }),
      ])
    ),
  };
  const after = {
    ...before,
    [VALID_WORKER]: snapshotFor({
      workerName: VALID_WORKER,
      state: "present",
      deploymentId: "deployment-weighted-after",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("a", 40), version("b", 60)],
    }),
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(verification.targetChanged, true);
  assert.deepEqual(verification.protectedDeltas, []);
});

test("rollback: single 100% preflight prints an exact rollback candidate", () => {
  const snapshot = snapshotFor({
    workerName: PROTECTED_WORKER_NAMES[0],
    state: "present",
    deploymentId: "deployment-before",
    versions: [version("prior-v")],
  });
  const info = buildRollbackInfo(snapshot, "/tmp/cfg.json");
  assert.equal(info.kind, "single");
  assert.ok(info.rollbackCommand.join(" ").includes("prior-v"));
});

test("rollback: weighted preflight requires a manual weighted restore", () => {
  const snapshot = snapshotFor({
    workerName: PROTECTED_WORKER_NAMES[0],
    state: "present",
    deploymentId: "deployment-weighted",
    versions: [version("a", 60), version("b", 40)],
  });
  const info = buildRollbackInfo(snapshot, "/tmp/cfg.json");
  assert.equal(info.kind, "weighted");
  assert.equal(info.rollbackCommand, null);
  assert.match(info.message, /MANUAL_WEIGHTED_DEPLOYMENT_RESTORE_REQUIRED/);
  assert.match(info.message, /deployment-weighted/);
});

test("deploy flow: default is dry-run and never runs an upload", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: false,
      runCommand: runner.runner,
      outputDir,
    })
  );
  assert.equal(result.dryRunDefault, true);
  assert.equal(result.execute, false);
  assert.equal(result.deploy, undefined);
  const kinds = result.run.map((entry) => entry.kind);
  assert.deepEqual(kinds, ["dryRun"]);
});

test("deploy flow: dry-run runs before deploy in execute mode", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    })
  );
  assert.deepEqual(
    result.run.map((entry) => entry.kind),
    ["dryRun", "deploy"]
  );
  assert.equal(result.before[VALID_WORKER].deploymentId, "deployment-v1");
  assert.equal(result.after[VALID_WORKER].deploymentId, "deployment-v2");
});

test("deploy flow: dry-run failure blocks the upload", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ dryRunPlan: { exitCode: 1, stderr: "boom" } });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "DRY_RUN_FAILED"
    );
  });
  const kinds = runner.calls.map((command) =>
    command.includes("--dry-run") ? "dryRun" : "deploy"
  );
  assert.deepEqual(kinds, ["dryRun"]);
});

test("deploy flow: missing credentials block the deploy command", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: "",
          accountId: "",
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  });
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 0);
});

test("deploy flow: API failure blocks the deploy command", async () => {
  for (const status of [401, 403, 429]) {
    const { dir, head } = await makeScratchRepo();
    const runner = mockRunner();
    const fetchImpl = makeApiPlan({
      before: { [VALID_WORKER]: errorResponse(status) },
      after: presentAfter("v2"),
    });
    await withConfigDir(async (outputDir) => {
      await assert.rejects(
        () =>
          runGuardedPreviewDeploy({
            workerName: VALID_WORKER,
            confirmWorker: VALID_WORKER,
            sourceSha: head,
            repoRoot: dir,
            execute: true,
            apiToken: API_TOKEN,
            accountId: ACCOUNT_ID,
            fetchImpl,
            runCommand: runner.runner,
            outputDir,
          }),
        (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
      );
    });
    const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
    assert.equal(deployCount, 0, `status ${status} must block deploy`);
  }
});

test("deploy flow: network failure blocks the deploy command", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
    beforeError: new Error("ECONNREFUSED"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  });
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 0);
});

test("deploy flow: timeout blocks the deploy command", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
    beforeError: Object.assign(new Error("timeout"), { name: "TimeoutError" }),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  });
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 0);
});

test("deploy flow: invalid JSON and malformed payload block the deploy command", async () => {
  for (const bad of [invalidJsonResponse(), malformedResponse()]) {
    const { dir, head } = await makeScratchRepo();
    const runner = mockRunner();
    const fetchImpl = makeApiPlan({
      before: { [VALID_WORKER]: bad },
      after: presentAfter("v2"),
    });
    await withConfigDir(async (outputDir) => {
      await assert.rejects(
        () =>
          runGuardedPreviewDeploy({
            workerName: VALID_WORKER,
            confirmWorker: VALID_WORKER,
            sourceSha: head,
            repoRoot: dir,
            execute: true,
            apiToken: API_TOKEN,
            accountId: ACCOUNT_ID,
            fetchImpl,
            runCommand: runner.runner,
            outputDir,
          }),
        (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
      );
    });
    const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
    assert.equal(deployCount, 0);
  }
});

test("deploy flow: protected worker absent or incomplete blocks the deploy command", async () => {
  const absentPlan = {
    [VALID_WORKER]: okResponse([deploymentFor("v1")]),
    [PROTECTED_WORKER_NAMES[0]]: errorResponse(404),
  };
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({ before: absentPlan, after: presentAfter("v2") });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
    );
  });
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 0);
});

test("deploy flow: new target absent transitions to present and passes", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: {
      [VALID_WORKER]: errorResponse(404),
      ...Object.fromEntries(
        PROTECTED_WORKER_NAMES.map((name) => [
          name,
          okResponse([deploymentFor(`ver-${name}`)]),
        ])
      ),
    },
    after: presentAfter("v1"),
  });
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    })
  );
  assert.equal(result.before[VALID_WORKER].state, "absent");
  assert.equal(result.after[VALID_WORKER].state, "present");
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 1);
});

test("deploy flow: existing target present is allowed", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    })
  );
  assert.equal(result.before[VALID_WORKER].state, "present");
  assert.equal(result.after[VALID_WORKER].deploymentId, "deployment-v2");
});

test("deploy flow: postflight unavailable is never reported as success", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
    afterError: new Error("ECONNREFUSED"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "VERSION_SNAPSHOT_UNAVAILABLE");
        assert.equal(error.afterDeploySucceeded, true);
        assert.ok(error.beforeSnapshot);
        assert.ok(error.manualVerification);
        return true;
      }
    );
  });
  const deployCount = runner.calls.filter((c) => !c.includes("--dry-run")).length;
  assert.equal(deployCount, 1);
});

test("deploy flow: unchanged target version fails with TARGET_VERSION_NOT_CHANGED", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v1"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => error.code === "TARGET_VERSION_NOT_CHANGED"
    );
  });
});

test("deploy flow: protected worker delta triggers PROTECTED_WORKER_CHANGED", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const before = presentSnapshots("v1");
  const after = presentAfter("v2");
  after[PROTECTED_WORKER_NAMES[0]] = okResponse([
    deploymentEntry({
      id: "deployment-CHANGED-PROTECTED",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("CHANGED-PROTECTED")],
    }),
  ]);
  const fetchImpl = makeApiPlan({ before, after });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "PROTECTED_WORKER_CHANGED");
        assert.ok(
          /lovetree-limone: before deploy deployment-ver-lovetree-limone/.test(error.message)
        );
        assert.ok(error.rollbackCommand.join(" ").includes("ver-lovetree-limone"));
        return true;
      }
    );
  });
});

test("deploy flow: weighted target deployment change passes and protected stay identical", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const before = presentSnapshots("v1");
  before[VALID_WORKER] = okResponse([
    deploymentEntry({
      id: "deployment-weighted-before",
      createdOn: "2026-08-02T00:00:00Z",
      versions: [version("a", 60), version("b", 40)],
    }),
  ]);
  const after = presentAfter("v1");
  after[VALID_WORKER] = okResponse([
    deploymentEntry({
      id: "deployment-weighted-after",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("a", 40), version("b", 60)],
    }),
  ]);
  const fetchImpl = makeApiPlan({ before, after });
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    })
  );
  assert.equal(result.before[VALID_WORKER].deploymentId, "deployment-weighted-before");
  assert.equal(result.after[VALID_WORKER].deploymentId, "deployment-weighted-after");
  assert.notEqual(
    result.before[VALID_WORKER].deploymentFingerprint,
    result.after[VALID_WORKER].deploymentFingerprint
  );
});

test("deploy flow: protected worker percentage change triggers PROTECTED_WORKER_CHANGED", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const before = presentSnapshots("v1");
  before[PROTECTED_WORKER_NAMES[0]] = okResponse([
    deploymentEntry({
      id: "deployment-weighted-protected",
      createdOn: "2026-08-02T00:00:00Z",
      versions: [version("a", 60), version("b", 40)],
    }),
  ]);
  const after = presentAfter("v2");
  after[PROTECTED_WORKER_NAMES[0]] = okResponse([
    deploymentEntry({
      id: "deployment-weighted-protected",
      createdOn: "2026-08-02T00:00:00Z",
      versions: [version("a", 40), version("b", 60)],
    }),
  ]);
  const fetchImpl = makeApiPlan({ before, after });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "PROTECTED_WORKER_CHANGED");
        assert.equal(error.rollbackCommand, null);
        assert.match(error.message, /MANUAL_WEIGHTED_DEPLOYMENT_RESTORE_REQUIRED/);
        return true;
      }
    );
  });
});

test("deploy flow: deploy command uses the generated config path and no --name", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  const result = await withConfigDir((outputDir) =>
    runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    })
  );
  const deployCommand = runner.calls.find((command) => !command.includes("--dry-run"));
  const configIndex = deployCommand.indexOf("--config");
  assert.ok(configIndex !== -1);
  assert.equal(deployCommand[configIndex + 1], result.safeConfig.configPath);
  assert.equal(deployCommand.includes("--name"), false);
});

test("deploy flow: target SHA mismatch is blocked before any command runs", async () => {
  const { dir } = await makeScratchRepo();
  const runner = mockRunner();
  await assert.rejects(
    () =>
      runGuardedPreviewDeploy({
        workerName: VALID_WORKER,
        confirmWorker: VALID_WORKER,
        sourceSha: "0".repeat(40),
        repoRoot: dir,
        execute: true,
        runCommand: runner.runner,
      }),
    (error) => error.code === "SOURCE_SHA_MISMATCH"
  );
  assert.equal(runner.calls.length, 0);
});

test("cleanup: config removed after dry-run failure", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ dryRunPlan: { exitCode: 1 } });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "DRY_RUN_FAILED");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after preflight snapshot failure", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: { [VALID_WORKER]: errorResponse(401) },
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "VERSION_SNAPSHOT_UNAVAILABLE");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after deploy failure", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ deployPlan: { exitCode: 1 } });
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "DEPLOY_FAILED");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after postflight snapshot failure", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
    afterError: new Error("network down"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "VERSION_SNAPSHOT_UNAVAILABLE");
        assert.equal(error.afterDeploySucceeded, true);
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after protected delta", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const before = presentSnapshots("v1");
  const after = presentAfter("v2");
  after[PROTECTED_WORKER_NAMES[0]] = okResponse([
    deploymentEntry({
      id: "deployment-CHANGED",
      createdOn: "2026-08-02T00:00:01Z",
      versions: [version("CHANGED")],
    }),
  ]);
  const fetchImpl = makeApiPlan({ before, after });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "PROTECTED_WORKER_CHANGED");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after target unchanged", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v1"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "TARGET_VERSION_NOT_CHANGED");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after a generic runCommand throw", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ throwKind: "deploy" });
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          apiToken: API_TOKEN,
          accountId: ACCOUNT_ID,
          fetchImpl,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), false);
        return true;
      }
    );
  });
});

test("cleanup: config removed after successful dry-run and successful execute", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    const dryResult = await runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: false,
      runCommand: runner.runner,
      outputDir,
    });
    assert.equal(existsSync(dryResult.safeConfig.configPath), false);
  });
  await withConfigDir(async (outputDir) => {
    const execResult = await runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    });
    assert.equal(existsSync(execResult.safeConfig.configPath), false);
  });
});

test("cleanup: keep-config preserves the config file on success", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const fetchImpl = makeApiPlan({
    before: presentSnapshots("v1"),
    after: presentAfter("v2"),
  });
  await withConfigDir(async (outputDir) => {
    const result = await runGuardedPreviewDeploy({
      workerName: VALID_WORKER,
      confirmWorker: VALID_WORKER,
      sourceSha: head,
      repoRoot: dir,
      execute: true,
      keepConfig: true,
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl,
      runCommand: runner.runner,
      outputDir,
    });
    assert.equal(existsSync(result.safeConfig.configPath), true);
  });
});

test("cleanup: keep-config preserves the config file on error", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ dryRunPlan: { exitCode: 1 } });
  await withConfigDir(async (outputDir) => {
    await assert.rejects(
      () =>
        runGuardedPreviewDeploy({
          workerName: VALID_WORKER,
          confirmWorker: VALID_WORKER,
          sourceSha: head,
          repoRoot: dir,
          execute: true,
          keepConfig: true,
          runCommand: runner.runner,
          outputDir,
        }),
      (error) => {
        assert.equal(error.code, "DRY_RUN_FAILED");
        assert.ok(error.safeConfig?.configPath);
        assert.equal(existsSync(error.safeConfig.configPath), true);
        return true;
      }
    );
  });
});
