#!/usr/bin/env node

import { preflightFromEnv } from "./lib/v4-runtime-e2e-preflight.mjs";
import { verifyRuntimeE2EHealth } from "./lib/v4-runtime-e2e-operator.mjs";

try {
  const identity = preflightFromEnv(process.env);
  const result = await verifyRuntimeE2EHealth({
    baseUrl: process.env.V4_E2E_BASE_URL,
    expectedWorker: identity.worker,
    expectedFirebaseProjectId: identity.firebaseProjectId,
    expectedNeonBranchId: identity.neonBranchId,
    expectedDatabaseHost: identity.databaseHost,
    expectedAppEnv: identity.appEnv,
  });
  console.log(
    [
      "V4_RUNTIME_E2E_RUNTIME_VERIFY_PASS",
      `baseUrl=${result.baseUrl}`,
      `worker=${result.worker}`,
      `workerIdentitySource=${result.workerIdentitySource}`,
      `firebaseProjectId=${result.firebaseProjectId}`,
      `appEnv=${result.appEnv}`,
      `mutationsEnabled=${result.mutationsEnabled}`,
      `healthDatabaseBinding=${result.healthDatabaseBinding}`,
      `preflightNeonBranchId=${result.preflightNeonBranchId}`,
      `preflightDatabaseHost=${result.preflightDatabaseHost}`,
    ].join("\n")
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
