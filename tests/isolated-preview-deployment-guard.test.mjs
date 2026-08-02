import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
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

async function makeScratchRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), "guard-test-repo-"));
  spawnSync("git", ["-C", dir, "init", "-b", "main"], { encoding: "utf8" });
  spawnSync("git", ["-C", dir, "config", "user.email", "guard-test@example.com"], {
    encoding: "utf8",
  });
  spawnSync("git", ["-C", dir, "config", "user.name", "Guard Test"], {
    encoding: "utf8",
  });
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
  spawnSync("git", ["-C", dir, "add", "."], { encoding: "utf8" });
  const commit = spawnSync("git", ["-C", dir, "commit", "-m", "init"], {
    encoding: "utf8",
  });
  assert.equal(commit.status, 0, commit.stderr);
  const head = spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim();
  return { dir, head };
}

function mockRunner({ dryRunPlan = { exitCode: 0 }, deployPlan = { exitCode: 0 } } = {}) {
  const calls = [];
  function runCommand(command) {
    calls.push(command);
    if (command.includes("--dry-run")) {
      return { exitCode: dryRunPlan.exitCode, stdout: dryRunPlan.stdout ?? "", stderr: dryRunPlan.stderr ?? "" };
    }
    return { exitCode: deployPlan.exitCode, stdout: deployPlan.stdout ?? "", stderr: deployPlan.stderr ?? "" };
  }
  return { calls, runCommand };
}

function sequenceVersions(before, after) {
  let invocation = 0;
  return async function collectVersions(names) {
    invocation += 1;
    const map = invocation === 1 ? before : after;
    return Object.fromEntries(names.map((name) => [name, map[name] ?? null]));
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
  await writeFile(path.join(dir, "dirty-marker.txt"), "A/B marker\n", "utf8");
  await assert.rejects(
    () => validateSourceState({ repoRoot: dir, sourceSha: head }),
    (error) => error.code === "DIRTY_WORKTREE"
  );
});

test("source: explicit dirty allow emits a patch sha-256", async () => {
  const { dir, head } = await makeScratchRepo();
  await writeFile(path.join(dir, "dirty-marker.txt"), "A/B marker\n", "utf8");
  const state = await validateSourceState({
    repoRoot: dir,
    sourceSha: head,
    allowDirty: true,
  });
  assert.equal(state.dirty, true);
  assert.match(state.patchSha256, /^[0-9a-f]{64}$/);
});

test("config: generated config contains only the exact target and safe values", async () => {
  const { dir } = await makeScratchRepo();
  const { config, configSha256 } = await buildSafePreviewConfig({
    repoRoot: dir,
    workerName: VALID_WORKER,
  });
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

test("config: no routes, custom domains, env blocks, or production/mutation-true values", async () => {
  const { dir } = await makeScratchRepo();
  const { content } = await buildSafePreviewConfig({
    repoRoot: dir,
    workerName: VALID_WORKER,
  });
  assert.equal(content.includes("routes"), false);
  assert.equal(content.includes("custom_domains"), false);
  assert.equal(content.includes('"env"'), false);
  assert.equal(content.includes("APP_ENV\": \"production"), false);
  assert.equal(content.includes("API_MUTATIONS_ENABLED\": \"true"), false);
  assert.equal(content.includes('"lovetree-limone-staging"'), false);
  assert.equal(content.includes('"lovetree-limone-v2"'), false);
});

test("config: generated name is never a protected name", async () => {
  const { dir } = await makeScratchRepo();
  const { config } = await buildSafePreviewConfig({
    repoRoot: dir,
    workerName: VALID_WORKER,
  });
  assert.equal(PROTECTED_WORKER_NAMES.includes(config.name), false);
});

test("config: source wrangler.jsonc is not modified", async () => {
  const { dir } = await makeScratchRepo();
  const before = await readFile(path.join(dir, "wrangler.jsonc"), "utf8");
  await buildSafePreviewConfig({ repoRoot: dir, workerName: VALID_WORKER });
  const after = await readFile(path.join(dir, "wrangler.jsonc"), "utf8");
  assert.equal(after, before);
});

test("commands: dry-run precedes deploy and neither carries --name", async () => {
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

test("deploy flow: default is dry-run and never runs an upload", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const result = await runGuardedPreviewDeploy({
    workerName: VALID_WORKER,
    confirmWorker: VALID_WORKER,
    sourceSha: head,
    repoRoot: dir,
    execute: false,
    runCommand: runner.runCommand,
  });
  assert.equal(result.dryRunDefault, true);
  assert.equal(result.execute, false);
  assert.equal(result.deploy, undefined);
  const kinds = result.run.map((entry) => entry.kind);
  assert.deepEqual(kinds, ["dryRun"]);
});

test("deploy flow: dry-run runs before deploy in execute mode", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const collectVersions = sequenceVersions(
    { [VALID_WORKER]: "v1", ...Object.fromEntries(PROTECTED_WORKER_NAMES.map((n) => [n, "unchanged"])) },
    { [VALID_WORKER]: "v2", ...Object.fromEntries(PROTECTED_WORKER_NAMES.map((n) => [n, "unchanged"])) }
  );
  const result = await runGuardedPreviewDeploy({
    workerName: VALID_WORKER,
    confirmWorker: VALID_WORKER,
    sourceSha: head,
    repoRoot: dir,
    execute: true,
    runCommand: runner.runCommand,
    collectVersions,
  });
  assert.deepEqual(
    result.run.map((entry) => entry.kind),
    ["dryRun", "deploy"]
  );
  assert.equal(result.before[VALID_WORKER], "v1");
  assert.equal(result.after[VALID_WORKER], "v2");
});

test("deploy flow: dry-run failure blocks the upload", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner({ dryRunPlan: { exitCode: 1, stderr: "boom" } });
  await assert.rejects(
    () =>
      runGuardedPreviewDeploy({
        workerName: VALID_WORKER,
        confirmWorker: VALID_WORKER,
        sourceSha: head,
        repoRoot: dir,
        execute: true,
        runCommand: runner.runCommand,
        collectVersions: async () => ({}),
      }),
    (error) => error.code === "DRY_RUN_FAILED"
  );
  const kinds = runner.calls.map((command) =>
    command.includes("--dry-run") ? "dryRun" : "deploy"
  );
  assert.deepEqual(kinds, ["dryRun"]);
});

test("deploy flow: protected worker version delta triggers PROTECTED_WORKER_CHANGED", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const collectVersions = sequenceVersions(
    { [VALID_WORKER]: "v1", "lovetree-limone": "cc92d036-5868-4bb6-b4f4-dfd747ea6485" },
    { [VALID_WORKER]: "v2", "lovetree-limone": "dd93e147-9999-4bb6-b4f4-000000000000" }
  );
  await assert.rejects(
    () =>
      runGuardedPreviewDeploy({
        workerName: VALID_WORKER,
        confirmWorker: VALID_WORKER,
        sourceSha: head,
        repoRoot: dir,
        execute: true,
        runCommand: runner.runCommand,
        collectVersions,
      }),
    (error) => {
      assert.equal(error.code, "PROTECTED_WORKER_CHANGED");
      assert.ok(/lovetree-limone: before cc92d036/.test(error.message));
      assert.ok(error.rollbackCommand.join(" ").includes("cc92d036-5868-4bb6-b4f4-dfd747ea6485"));
      return true;
    }
  );
});

test("deploy flow: deploy command uses the generated config path and no --name", async () => {
  const { dir, head } = await makeScratchRepo();
  const runner = mockRunner();
  const result = await runGuardedPreviewDeploy({
    workerName: VALID_WORKER,
    confirmWorker: VALID_WORKER,
    sourceSha: head,
    repoRoot: dir,
    execute: true,
    runCommand: runner.runCommand,
    collectVersions: sequenceVersions(
      { [VALID_WORKER]: "v1" },
      { [VALID_WORKER]: "v2" }
    ),
  });
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
        runCommand: runner.runCommand,
        collectVersions: async () => ({}),
      }),
    (error) => error.code === "SOURCE_SHA_MISMATCH"
  );
  assert.equal(runner.calls.length, 0);
});
