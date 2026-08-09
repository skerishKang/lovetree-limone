import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVED_E2E_NEON_BRANCH_ID,
  EXPECTED_NEON_PROJECT_ID,
  PRODUCTION_FIREBASE_PROJECT_ID,
  PRODUCTION_NEON_BRANCH_ID,
  validateRuntimeE2EIdentity,
} from "../scripts/lib/v4-runtime-e2e-preflight.mjs";

const SAFE = Object.freeze({
  E2E_EXPECTED_WORKER: "lovetree-limone-v4-runtime-e2e-preview",
  E2E_FIREBASE_PROJECT_ID: "lovetree-e2e",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "lovetree-e2e",
  FIREBASE_PROJECT_ID: "lovetree-e2e",
  E2E_NEON_PROJECT_ID: EXPECTED_NEON_PROJECT_ID,
  E2E_NEON_BRANCH_ID: APPROVED_E2E_NEON_BRANCH_ID,
  APP_ENV: "e2e",
  API_MUTATIONS_ENABLED: "true",
});

function issueCodes(input) {
  try {
    validateRuntimeE2EIdentity(input);
    assert.fail("expected preflight to fail");
  } catch (error) {
    assert.equal(error?.code, "V4_RUNTIME_E2E_PREFLIGHT_FAILED");
    return new Set(error.issues.map((issue) => issue.code));
  }
}

test("approved isolated Runtime E2E identities pass", () => {
  const result = validateRuntimeE2EIdentity(SAFE);
  assert.equal(result.ok, true);
  assert.equal(result.worker, SAFE.E2E_EXPECTED_WORKER);
  assert.equal(result.firebaseProjectId, SAFE.E2E_FIREBASE_PROJECT_ID);
  assert.equal(result.neonProjectId, EXPECTED_NEON_PROJECT_ID);
  assert.equal(result.neonBranchId, APPROVED_E2E_NEON_BRANCH_ID);
  assert.equal(result.appEnv, "e2e");
  assert.equal(result.apiMutationsEnabled, true);
});

test("every protected Worker is rejected", () => {
  for (const worker of [
    "lovetree-limone",
    "lovetree-limone-staging",
    "lovetree-limone-v2",
  ]) {
    const codes = issueCodes({ ...SAFE, E2E_EXPECTED_WORKER: worker });
    assert.equal(codes.has("UNSAFE_WORKER"), true, worker);
  }
});

test("a non-preview or malformed Worker name is rejected", () => {
  for (const worker of ["lovetree-limone-e2e", "Lovetree-preview", "other-preview"]) {
    const codes = issueCodes({ ...SAFE, E2E_EXPECTED_WORKER: worker });
    assert.equal(codes.has("UNSAFE_WORKER"), true, worker);
  }
});

test("Production Firebase is blocked in every Firebase identity position", () => {
  for (const field of [
    "E2E_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
  ]) {
    const codes = issueCodes({ ...SAFE, [field]: PRODUCTION_FIREBASE_PROJECT_ID });
    assert.equal(codes.has("PRODUCTION_FIREBASE_BLOCKED"), true, field);
  }
});

test("browser, Worker, and expected Firebase IDs must match", () => {
  const browserCodes = issueCodes({
    ...SAFE,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "other-e2e-project",
  });
  assert.equal(browserCodes.has("FIREBASE_PROJECT_MISMATCH"), true);

  const workerCodes = issueCodes({
    ...SAFE,
    FIREBASE_PROJECT_ID: "other-e2e-project",
  });
  assert.equal(workerCodes.has("FIREBASE_PROJECT_MISMATCH"), true);
});

test("Production Neon branch is blocked", () => {
  const codes = issueCodes({ ...SAFE, E2E_NEON_BRANCH_ID: PRODUCTION_NEON_BRANCH_ID });
  assert.equal(codes.has("PRODUCTION_NEON_BLOCKED"), true);
  assert.equal(codes.has("UNAPPROVED_NEON_BRANCH"), true);
});

test("wrong Neon project or unapproved branch is rejected", () => {
  const projectCodes = issueCodes({ ...SAFE, E2E_NEON_PROJECT_ID: "other-project" });
  assert.equal(projectCodes.has("NEON_PROJECT_MISMATCH"), true);

  const branchCodes = issueCodes({ ...SAFE, E2E_NEON_BRANCH_ID: "br-unapproved-preview" });
  assert.equal(branchCodes.has("UNAPPROVED_NEON_BRANCH"), true);
});

test("mutable Runtime E2E requires exact e2e environment and mutations enabled", () => {
  for (const appEnv of ["production", "staging", "preview", ""]) {
    const codes = issueCodes({ ...SAFE, APP_ENV: appEnv });
    assert.equal(
      codes.has(appEnv ? "APP_ENV_NOT_E2E" : "MISSING_IDENTITY"),
      true,
      appEnv || "empty"
    );
  }

  for (const value of ["false", "", false, undefined]) {
    const codes = issueCodes({ ...SAFE, API_MUTATIONS_ENABLED: value });
    assert.equal(codes.has("MUTATIONS_NOT_ENABLED"), true);
  }
});

test("missing required identities fail closed", () => {
  for (const field of [
    "E2E_EXPECTED_WORKER",
    "E2E_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
    "E2E_NEON_PROJECT_ID",
    "E2E_NEON_BRANCH_ID",
    "APP_ENV",
  ]) {
    const codes = issueCodes({ ...SAFE, [field]: "" });
    assert.equal(codes.has("MISSING_IDENTITY"), true, field);
  }
});

test("preflight result never echoes unrelated secrets", () => {
  const result = validateRuntimeE2EIdentity({
    ...SAFE,
    DATABASE_URL: "postgresql://secret@example.invalid/db",
    CLOUDFLARE_API_TOKEN: "secret-cloudflare-token",
    NEXT_PUBLIC_FIREBASE_API_KEY: "secret-api-key",
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /postgresql:\/\//);
  assert.doesNotMatch(serialized, /secret-cloudflare-token/);
  assert.doesNotMatch(serialized, /secret-api-key/);
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      "apiMutationsEnabled",
      "appEnv",
      "firebaseProjectId",
      "neonBranchId",
      "neonProjectId",
      "ok",
      "worker",
      "workerPattern",
    ].sort()
  );
});
