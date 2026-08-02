#!/usr/bin/env node
// Canonical guarded isolated-preview deployment command.
//
// Defaults to dry-run. A remote upload happens only when --execute is given,
// the Worker name passes the isolated preview validation, the source SHA
// matches HEAD, the generated safe Wrangler config dry-run succeeds, and the
// before/after version snapshots are complete (fail-closed).
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

import path from "node:path";

import {
  formatResult,
  runCommand,
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
    "  --allow-dirty              allow a tracked A/B marker dirty worktree (untracked blocked)",
    "  --keep-config              keep the generated Wrangler config on disk",
    "  --json                     print the result as JSON",
    "",
    "env for --execute:",
    "  CLOUDFLARE_API_TOKEN        Cloudflare API token (required for --execute)",
    "  CLOUDFLARE_ACCOUNT_ID       Cloudflare account id (required for --execute)",
  ].join("\n");
}

function formatSnapshotForIncident(snapshot) {
  if (!snapshot) return "unavailable";
  if (snapshot.state === "absent") return "absent";
  if (typeof snapshot.deploymentId !== "string") return "unknown";
  const versionsText = (snapshot.versions ?? [])
    .map((entry) => `${entry.versionId}@${entry.percentage}%`)
    .join(",");
  return `deploy ${snapshot.deploymentId} [${versionsText}]`;
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
  try {
    const result = await runGuardedPreviewDeploy({
      workerName: worker,
      confirmWorker,
      sourceSha,
      repoRoot,
      execute,
      allowDirty,
      keepConfig,
      runCommand,
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
    const code = error?.code;
    if (code === "PROTECTED_WORKER_CHANGED") {
      console.error(`[isolated-preview-deploy-guard] ${error.message}`);
    } else if (error?.afterDeploySucceeded) {
      console.error(
        "[isolated-preview-deploy-guard] INCIDENT: deploy command succeeded but post-deploy verification is impossible"
      );
      console.error(`  code:                ${code}`);
      console.error(`  message:             ${error.message}`);
      if (error.beforeSnapshot) {
        console.error("  before snapshot:     target=" +
          formatSnapshotForIncident(error.beforeSnapshot[worker]) +
          " protected=" +
          Object.entries(error.beforeSnapshot)
            .filter(([name]) => name !== worker)
            .map(([name, snapshot]) => `${name}:${formatSnapshotForIncident(snapshot)}`)
            .join(","));
      }
      console.error(`  manual verification: ${error.manualVerification ?? "see operations documentation"}`);
    } else {
      console.error(`[isolated-preview-deploy-guard] ${error?.message ?? error}`);
    }
    process.exitCode = code === "PROTECTED_WORKER_CHANGED" ? 3 : 1;
  }
}

await main();
