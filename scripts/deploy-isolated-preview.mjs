#!/usr/bin/env node
// Canonical guarded isolated-preview deployment command.
//
// Defaults to dry-run. A remote upload happens only when --execute is given,
// the Worker name passes the isolated preview validation, the source SHA
// matches HEAD, and the generated safe Wrangler config dry-run succeeds.
//
// Usage:
//   npm run preview:deploy:safe -- \
//     --worker lovetree-limone-issue-26-preview \
//     --confirm-worker lovetree-limone-issue-26-preview \
//     --source-sha "$(git rev-parse HEAD)"
//
//   npm run preview:deploy:safe -- \
//     --worker lovetree-limone-issue-26-preview \
//     --confirm-worker lovetree-limone-issue-26-preview \
//     --source-sha "$(git rev-parse HEAD)" \
//     --execute

import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  collectWorkerVersions,
  formatResult,
  removeSafeConfig,
  runGuardedPreviewDeploy,
} from "./lib/isolated-preview-deploy-guard.mjs";

function parseArgs(argv) {
  const parsed = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    if (equalsIndex !== -1) {
      parsed[argument.slice(2, equalsIndex)] = argument.slice(equalsIndex + 1);
      continue;
    }
    const key = argument.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  parsed._positional = positional;
  return parsed;
}

function runCommand(command) {
  const [executable, ...args] = command;
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function usage() {
  return [
    "usage: npm run preview:deploy:safe -- [options]",
    "",
    "required:",
    "  --worker <name>            exact isolated preview Worker name",
    "  --confirm-worker <name>    byte-identical repeat of --worker",
    "  --source-sha <sha>         git HEAD the deployment must match",
    "",
    "optional:",
    "  --execute                  allow the remote upload (default is dry-run only)",
    "  --allow-dirty              allow an explicit A/B marker dirty worktree",
    "  --keep-config              keep the generated Wrangler config on disk",
    "  --json                     print the result as JSON",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const worker = args.worker;
  const confirmWorker = args["confirm-worker"];
  const sourceSha = args["source-sha"];
  const execute = args.execute === true;
  const allowDirty = args["allow-dirty"] === true;
  const keepConfig = args["keep-config"] === true;
  const json = args.json === true;

  const missing = [];
  if (typeof worker !== "string" || worker.length === 0) missing.push("--worker");
  if (typeof confirmWorker !== "string" || confirmWorker.length === 0) {
    missing.push("--confirm-worker");
  }
  if (typeof sourceSha !== "string" || sourceSha.length === 0) {
    missing.push("--source-sha");
  }
  if (missing.length > 0) {
    console.error(`missing required argument(s): ${missing.join(", ")}`);
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  let result;
  try {
    result = await runGuardedPreviewDeploy({
      workerName: worker,
      confirmWorker,
      sourceSha,
      repoRoot,
      execute,
      allowDirty,
      runCommand,
      collectVersions: execute
        ? (workerNames) => collectWorkerVersions(workerNames)
        : undefined,
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatResult(result));
      if (!execute) {
        console.log(
          "[isolated-preview-deploy-guard] DRY-RUN COMPLETE; no Cloudflare version was created"
        );
      }
    }
  } catch (error) {
    if (json) {
      console.error(
        JSON.stringify(
          { error: error.message, code: error.code, stack: error.stack },
          null,
          2
        )
      );
    } else {
      console.error(`[isolated-preview-deploy-guard] ${error.message}`);
    }
    process.exitCode = error.code === "PROTECTED_WORKER_CHANGED" ? 3 : 1;
  } finally {
    if (!keepConfig && result?.safeConfig) {
      await removeSafeConfig(result.safeConfig);
    }
  }
}

await main();
