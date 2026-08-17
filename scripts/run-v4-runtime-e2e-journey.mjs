#!/usr/bin/env node

// V4 Runtime E2E Journey Runner CLI
//
// Usage:
//   node scripts/run-v4-runtime-e2e-journey.mjs --creds <path-to-disposable-creds.json> [--desktop-only] [--mobile-only] [--dry-run]

import { readFile } from "node:fs/promises";
import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import {
  createRuntimeE2EAuthority,
  verifyRuntimeE2EHealth,
} from "./lib/v4-runtime-e2e-operator.mjs";
import {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
} from "./lib/v4-runtime-e2e-runner.mjs";

function parseArgs(argv) {
  const args = {
    desktopOnly: false,
    mobileOnly: false,
    dryRun: false,
    credsPath: null,
    baseUrl: null,
    expectedOrigin: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--desktop-only") args.desktopOnly = true;
    else if (arg === "--mobile-only") args.mobileOnly = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--creds" && argv[i + 1]) {
      args.credsPath = argv[i + 1];
      i += 1;
    } else if (arg === "--base-url" && argv[i + 1]) {
      args.baseUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--expected-origin" && argv[i + 1]) {
      args.expectedOrigin = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Step 1: Preflight from environment
  const identity = preflightFromEnv(process.env);
  const baseUrl = args.baseUrl || process.env.V4_E2E_BASE_URL;
  const expectedOrigin = args.expectedOrigin || process.env.E2E_EXPECTED_ORIGIN;

  const authority = createRuntimeE2EAuthority({
    baseUrl,
    expectedOrigin,
    expectedWorker: identity.worker,
    expectedFirebaseProjectId: identity.firebaseProjectId,
    expectedNeonBranchId: identity.neonBranchId,
    expectedDatabaseHost: identity.databaseHost,
    expectedAppEnv: identity.appEnv,
  });

  console.log("V4_RUNTIME_E2E_JOURNEY_PREFLIGHT_PASS");
  console.log(`targetOrigin=${authority.targetOrigin}`);
  console.log(`worker=${authority.worker}`);
  console.log(`firebaseProjectId=${authority.firebaseProjectId}`);
  console.log(`neonBranchId=${authority.neonBranchId}`);
  console.log(`databaseHost=${authority.databaseHost}`);

  // Step 2: Health check
  const health = await verifyRuntimeE2EHealth({
    baseUrl: authority.targetOrigin,
    expectedOrigin: authority.approvedOrigin,
    expectedWorker: authority.worker,
    expectedFirebaseProjectId: authority.firebaseProjectId,
    expectedNeonBranchId: authority.neonBranchId,
    expectedDatabaseHost: authority.databaseHost,
    expectedAppEnv: authority.appEnv,
  });
  console.log(`V4_RUNTIME_E2E_JOURNEY_HEALTH_PASS: mutationsEnabled=${health.mutationsEnabled}`);

  if (args.dryRun) {
    console.log("V4_RUNTIME_E2E_JOURNEY_DRY_RUN_COMPLETE");
    return;
  }

  if (!args.credsPath) {
    throw new Error("missing required argument --creds <path>");
  }

  const rawCreds = await readFile(args.credsPath, "utf8");
  const creds = JSON.parse(rawCreds);
  if (!creds?.apiKey || !Array.isArray(creds?.users)) {
    throw new Error("invalid disposable credentials format");
  }

  const viewports = [];
  if (!args.mobileOnly) viewports.push({ name: "desktop", viewport: DESKTOP_VIEWPORT });
  if (!args.desktopOnly) viewports.push({ name: "mobile", viewport: MOBILE_VIEWPORT });

  console.log(`Executing Canonical Journey across ${viewports.map((v) => v.name).join(", ")} viewports (users: ${creds.users.length})...`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
