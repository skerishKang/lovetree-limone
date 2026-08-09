#!/usr/bin/env node

import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";

function format(result) {
  return [
    "V4_RUNTIME_E2E_PREFLIGHT_PASS",
    `worker=${result.worker}`,
    `firebaseProjectId=${result.firebaseProjectId}`,
    `neonProjectId=${result.neonProjectId}`,
    `neonBranchId=${result.neonBranchId}`,
    `appEnv=${result.appEnv}`,
    `apiMutationsEnabled=${result.apiMutationsEnabled}`,
  ].join("\n");
}

try {
  const result = preflightFromEnv(process.env);
  console.log(format(result));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
