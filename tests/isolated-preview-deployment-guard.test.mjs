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
  buildWranglerCommands,
  buildRollbackCommand,
  runGuardedPreviewDeploy,
  parseWranglerConfig,
  collectWorkerVersion,
  assertPreflightSnapshot,
  assertPostflightVerification,
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

async function makeScratchRepo() {
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
    BUILT_WRANGLER,
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

function deployment(versionId, createdOn, id = `deployment-${versionId}`) {
  return { id, version_id: versionId, created_on: createdOn, source: "wrangler" };
}

function okResponse(result) {
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
    json: async () => ({ success: false, errors: [], messages: [], result: [] }),
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
    json: async () => ({ success: true, result: "not-an-array" }),
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

function presentSnapshots(targetVersion, protectedVersionFn = (name) => `ver-${name}`) {
  const before = {};
  before[VALID_WORKER] = okResponse([
    deployment(targetVersion, "2026-08-02T00:00:00Z"),
  ]);
  for (const name of PROTECTED_WORKER_NAMES) {
    before[name] = okResponse([
      deployment(protectedVersionFn(name), "2026-08-02T00:00:00Z"),
    ]);
  }
  return before;
}

function presentAfter(targetVersion) {
  return { ...presentSnapshots(targetVersion) };
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
    versionId: null,
    deploymentId: null,
    createdOn: null,
  });
});

test("collectWorkerVersion: latest version is selected by timestamp regardless of array order", async () => {
  const deployments = [
    deployment("older", "2026-08-01T00:00:00Z"),
    deployment("newer", "2026-08-02T00:00:00Z"),
  ];
  const reversed = [...deployments].reverse();
  for (const result of [deployments, reversed]) {
    const snapshot = await collectWorkerVersion(VALID_WORKER, {
      apiToken: API_TOKEN,
      accountId: ACCOUNT_ID,
      fetchImpl: async () => okResponse(result),
    });
    assert.equal(snapshot.state, "present");
    assert.equal(snapshot.versionId, "newer");
  }
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

test("collectWorkerVersion: present worker without identifiable version is unavailable", async () => {
  await assert.rejects(
    () =>
      collectWorkerVersion(VALID_WORKER, {
        apiToken: API_TOKEN,
        accountId: ACCOUNT_ID,
        fetchImpl: async () => okResponse([{ id: "d1", created_on: "2026-08-02T00:00:00Z" }]),
      }),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
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

test("preflight: protected worker must be present with an exact version", () => {
  assert.throws(
    () =>
      assertPreflightSnapshot(
        {
          [VALID_WORKER]: { worker: VALID_WORKER, state: "absent", versionId: null },
          [PROTECTED_WORKER_NAMES[0]]: { worker: PROTECTED_WORKER_NAMES[0], state: "absent", versionId: null },
        },
        { workerName: VALID_WORKER, protectedNames: PROTECTED_WORKER_NAMES }
      ),
    (error) => error.code === "VERSION_SNAPSHOT_UNAVAILABLE"
  );
});

test("preflight: target may be present or absent", () => {
  const snapshots = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "absent", versionId: null },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
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
  const before = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "absent", versionId: null },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
      ])
    ),
  };
  const after = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "present", versionId: "v-2" },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
      ])
    ),
  };
  const verification = assertPostflightVerification(before, after, {
    workerName: VALID_WORKER,
    protectedNames: PROTECTED_WORKER_NAMES,
  });
  assert.equal(verification.targetChanged, true);
  assert.deepEqual(verification.protectedDeltas, []);
});

test("postflight: unchanged target version fails", () => {
  const before = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "present", versionId: "same" },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
      ])
    ),
  };
  const after = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "present", versionId: "same" },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
      ])
    ),
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
    [VALID_WORKER]: { worker: VALID_WORKER, state: "present", versionId: "v1" },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        { worker: name, state: "present", versionId: `ver-${name}` },
      ])
    ),
  };
  const after = {
    [VALID_WORKER]: { worker: VALID_WORKER, state: "present", versionId: "v2" },
    ...Object.fromEntries(
      PROTECTED_WORKER_NAMES.map((name) => [
        name,
        {
          worker: name,
          state: "present",
          versionId: name === PROTECTED_WORKER_NAMES[0] ? "CHANGED" : `ver-${name}`,
        },
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
  assert.equal(verification.protectedDeltas[0].before, `ver-${PROTECTED_WORKER_NAMES[0]}`);
  assert.equal(verification.protectedDeltas[0].after, "CHANGED");
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
  assert.equal(result.before[VALID_WORKER].versionId, "v1");
  assert.equal(result.after[VALID_WORKER].versionId, "v2");
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
    [VALID_WORKER]: okResponse([deployment("v1", "2026-08-02T00:00:00Z")]),
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
          okResponse([deployment(`ver-${name}`, "2026-08-02T00:00:00Z")]),
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
  assert.equal(result.after[VALID_WORKER].versionId, "v2");
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
    deployment("CHANGED-PROTECTED", "2026-08-02T00:00:01Z"),
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
        assert.ok(/lovetree-limone: before ver-lovetree-limone/.test(error.message));
        assert.ok(error.rollbackCommand.join(" ").includes("ver-lovetree-limone"));
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
    deployment("CHANGED", "2026-08-02T00:00:01Z"),
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
