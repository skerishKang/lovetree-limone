import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  APPROVED_E2E_NEON_BRANCH_ID,
  APPROVED_E2E_NEON_HOST,
  EXPECTED_NEON_PROJECT_ID,
  PRODUCTION_FIREBASE_PROJECT_ID,
  PRODUCTION_NEON_BRANCH_ID,
  PRODUCTION_NEON_HOST,
  parsePostgresHost,
  validateRuntimeE2EIdentity,
} from "../scripts/lib/v4-runtime-e2e-preflight.mjs";

const FIXTURE_DATABASE_PASSWORD = ["fixture", "password"].join("-");

function fixturePostgresUrl(
  host,
  {
    protocol = "postgresql:",
    username = "fixture-user",
    password = FIXTURE_DATABASE_PASSWORD,
  } = {}
) {
  const url = new URL(`${protocol}//${host}/neondb`);
  url.username = username;
  url.password = password;
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

const SAFE = Object.freeze({
  E2E_EXPECTED_WORKER: "lovetree-limone-v4-runtime-e2e-preview",
  E2E_FIREBASE_PROJECT_ID: "lovetree-e2e",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "lovetree-e2e",
  FIREBASE_PROJECT_ID: "lovetree-e2e",
  E2E_NEON_PROJECT_ID: EXPECTED_NEON_PROJECT_ID,
  E2E_NEON_BRANCH_ID: APPROVED_E2E_NEON_BRANCH_ID,
  DATABASE_URL: fixturePostgresUrl(APPROVED_E2E_NEON_HOST),
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

test("approved isolated Runtime E2E identities and actual DB endpoint pass", () => {
  const result = validateRuntimeE2EIdentity(SAFE);
  assert.equal(result.ok, true);
  assert.equal(result.worker, SAFE.E2E_EXPECTED_WORKER);
  assert.equal(result.firebaseProjectId, SAFE.E2E_FIREBASE_PROJECT_ID);
  assert.equal(result.neonProjectId, EXPECTED_NEON_PROJECT_ID);
  assert.equal(result.neonBranchId, APPROVED_E2E_NEON_BRANCH_ID);
  assert.equal(result.databaseHost, APPROVED_E2E_NEON_HOST);
  assert.equal(result.appEnv, "e2e");
  assert.equal(result.apiMutationsEnabled, true);
});

test("postgres URL parsing extracts only hostname", () => {
  assert.equal(parsePostgresHost(SAFE.DATABASE_URL), APPROVED_E2E_NEON_HOST);
  assert.equal(
    parsePostgresHost(fixturePostgresUrl("example.invalid", { protocol: "postgres:" })),
    "example.invalid"
  );
  assert.equal(parsePostgresHost("https://example.invalid/db"), null);
  assert.equal(parsePostgresHost("not-a-url"), null);
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

test("DATABASE_URL must point to the approved isolated Neon endpoint", () => {
  const productionCodes = issueCodes({
    ...SAFE,
    DATABASE_URL: fixturePostgresUrl(PRODUCTION_NEON_HOST),
  });
  assert.equal(productionCodes.has("PRODUCTION_DATABASE_HOST_BLOCKED"), true);
  assert.equal(productionCodes.has("DATABASE_HOST_MISMATCH"), true);

  const otherCodes = issueCodes({
    ...SAFE,
    DATABASE_URL: fixturePostgresUrl("other-project.neon.tech"),
  });
  assert.equal(otherCodes.has("DATABASE_HOST_MISMATCH"), true);

  const invalidCodes = issueCodes({ ...SAFE, DATABASE_URL: "not-a-postgres-url" });
  assert.equal(invalidCodes.has("DATABASE_URL_INVALID"), true);
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
    "DATABASE_URL",
    "APP_ENV",
  ]) {
    const codes = issueCodes({ ...SAFE, [field]: "" });
    assert.equal(codes.has("MISSING_IDENTITY"), true, field);
  }
});

test("preflight result never echoes credentials, tokens, or full DATABASE_URL", () => {
  const secretUserMarker = ["very", "secret", "user"].join("-");
  const secretPasswordMarker = ["very", "secret", "password"].join("-");
  const cloudflareMarker = ["secret", "cloudflare", "token"].join("-");
  const firebaseMarker = ["secret", "api", "key"].join("-");
  const databaseUrl = fixturePostgresUrl(APPROVED_E2E_NEON_HOST, {
    username: secretUserMarker,
    password: secretPasswordMarker,
  });
  const result = validateRuntimeE2EIdentity({
    ...SAFE,
    DATABASE_URL: databaseUrl,
    CLOUDFLARE_API_TOKEN: cloudflareMarker,
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseMarker,
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    secretUserMarker,
    secretPasswordMarker,
    cloudflareMarker,
    firebaseMarker,
    "postgresql://",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      "apiMutationsEnabled",
      "appEnv",
      "databaseHost",
      "firebaseProjectId",
      "neonBranchId",
      "neonProjectId",
      "ok",
      "worker",
      "workerPattern",
    ].sort()
  );
});

test("CLI passes with safe identities and fails closed for Production Firebase without leaking DB credentials", () => {
  const pass = spawnSync(process.execPath, ["scripts/check-v4-runtime-e2e-preflight.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, ...SAFE },
    encoding: "utf8",
  });
  assert.equal(pass.status, 0, pass.stderr || pass.stdout);
  assert.match(pass.stdout, /V4_RUNTIME_E2E_PREFLIGHT_PASS/);
  assert.match(
    pass.stdout,
    new RegExp(`databaseHost=${APPROVED_E2E_NEON_HOST.replaceAll(".", "\\.")}`)
  );
  assert.equal(pass.stdout.includes(FIXTURE_DATABASE_PASSWORD), false, pass.stdout);
  assert.equal(pass.stdout.includes("postgresql://"), false, pass.stdout);

  const fail = spawnSync(process.execPath, ["scripts/check-v4-runtime-e2e-preflight.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: {
      ...process.env,
      ...SAFE,
      E2E_FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
    },
    encoding: "utf8",
  });
  assert.notEqual(fail.status, 0);
  assert.match(fail.stderr, /PRODUCTION_FIREBASE_BLOCKED/);
  assert.equal(fail.stderr.includes(FIXTURE_DATABASE_PASSWORD), false, fail.stderr);
  assert.equal(fail.stderr.includes("postgresql://"), false, fail.stderr);
});
