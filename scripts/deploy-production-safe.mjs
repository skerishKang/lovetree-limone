#!/usr/bin/env node
// Guarded exact-production deployment command.
//
// Defaults to dry-run. A remote upload happens only when --execute is given
// AND every fail-closed guard passes (exact source SHA, clean worktree,
// confirmed Worker name, current active version match, production bindings,
// fresh production build output, dry-run verification, and the production DB
// Expand state). The build and the deploy use the same environment
// (CLOUDFLARE_ENV=production).
//
// Build first (required so the guard can verify the production build output):
//   CLOUDFLARE_ENV=production npm run build
//
// Usage:
//   npm run production:deploy:safe -- \
//     --source-sha "$(git rev-parse HEAD)" \
//     --expected-current-version 9b09919c-8fb6-4f01-9872-57b493525918 \
//     --confirm-worker lovetree-limone
//
//   npm run production:deploy:safe -- \
//     --source-sha "$(git rev-parse HEAD)" \
//     --expected-current-version 9b09919c-8fb6-4f01-9872-57b493525918 \
//     --confirm-worker lovetree-limone \
//     --execute
//
// No secret value is ever printed. DATABASE_URL may be supplied in the
// environment (it is used only in-process for read-only Expand-state checks).

import path from "node:path";

import {
  formatResult,
  runGuardedProductionDeploy,
} from "./lib/production-deploy-guard.mjs";

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
    "usage: npm run production:deploy:safe -- [options]",
    "",
    "required:",
    "  --source-sha <sha>                exact release SHA (HEAD and origin/main must match)",
    "  --expected-current-version <id>   current active version of the production Worker",
    "  --confirm-worker <name>           must be 'lovetree-limone'",
    "",
    "optional:",
    "  --execute                         allow the real Worker upload (default is dry-run)",
    "  --json                            print the result as JSON",
    "",
    "environment:",
    "  CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID or a wrangler OAuth login",
    "  DATABASE_URL                      production DB connection string (used in-process",
    "                                    for read-only Expand-state checks; never printed)",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceSha = args["source-sha"];
  const expectedCurrentVersion = args["expected-current-version"];
  const confirmWorker = args["confirm-worker"];
  const execute = args.execute === true;
  const json = args.json === true;

  const missing = [];
  if (typeof sourceSha !== "string" || sourceSha.length === 0) missing.push("--source-sha");
  if (typeof expectedCurrentVersion !== "string" || expectedCurrentVersion.length === 0) {
    missing.push("--expected-current-version");
  }
  if (typeof confirmWorker !== "string" || confirmWorker.length === 0) {
    missing.push("--confirm-worker");
  }
  if (missing.length > 0) {
    console.error(`missing required argument(s): ${missing.join(", ")}`);
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  try {
    const result = await runGuardedProductionDeploy({
      sourceSha,
      expectedCurrentVersion,
      confirmWorker,
      repoRoot,
      execute,
    });
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatResult(result));
      if (result.status === "DRY_RUN_GO") {
        console.log(
          "[production-deploy-guard] DRY-RUN PASSED; no Worker version was uploaded. " +
            "Re-run with --execute for the guarded deploy."
        );
      }
      if (result.status === "DEPLOYED") {
        console.log(
          `[production-deploy-guard] DEPLOY COMPLETE; rollback command: ${result.rollbackCommand.join(" ")}`
        );
      }
    }
    process.exitCode = result.blocked ? 1 : 0;
  } catch (error) {
    console.error(`[production-deploy-guard] ${error.message}`);
    process.exitCode = 2;
  }
}

main();
