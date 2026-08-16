#!/usr/bin/env node

import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import { verifyRuntimeE2EHealth } from "./lib/v4-runtime-e2e-operator.mjs";

try {
  const identity = preflightFromEnv(process.env);
  const result = await verifyRuntimeE2EHealth({
    baseUrl: process.env.V4_E2E_BASE_URL,
    expectedFirebaseProjectId: identity.firebaseProjectId,
  });
  console.log(
    [
      "V4_RUNTIME_E2E_RUNTIME_VERIFY_PASS",
      `baseUrl=${result.baseUrl}`,
      `firebaseProjectId=${result.firebaseProjectId}`,
      `appEnv=${result.appEnv}`,
      `mutationsEnabled=${result.mutationsEnabled}`,
      `databaseBinding=${result.databaseBinding}`,
    ].join("\n")
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
