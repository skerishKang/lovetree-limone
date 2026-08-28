import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVED_E2E_DATABASE_HOST,
  PRODUCTION_DATABASE_HOST,
  PRODUCTION_FIREBASE_PROJECT_ID,
  databaseHostFromUrl,
  e2eHealthIdentity,
  evaluateMutationGate,
} from "../core/runtime/server/api/e2e-safety.ts";
import { handleApiRequest } from "../core/runtime/server/api/handler.ts";
import {
  APPROVED_E2E_NEON_HOST,
  PRODUCTION_NEON_HOST,
} from "../scripts/lib/v4-runtime-e2e-preflight.mjs";

function fixtureDatabaseUrl(
  host,
  {
    protocol = "postgresql:",
    username = "fixture-user",
    password = "fixture-password",
  } = {}
) {
  const url = new URL(`${protocol}//${host}/neondb`);
  url.username = username;
  url.password = password;
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

const SAFE_DATABASE_URL = fixtureDatabaseUrl(APPROVED_E2E_DATABASE_HOST);

const SAFE_E2E_ENV = Object.freeze({
  APP_ENV: "e2e",
  API_MUTATIONS_ENABLED: "true",
  FIREBASE_PROJECT_ID: "lovetree-e2e",
  DATABASE_URL: SAFE_DATABASE_URL,
});

test("server and deployment preflight share the same approved and Production Neon hosts", () => {
  assert.equal(APPROVED_E2E_DATABASE_HOST, APPROVED_E2E_NEON_HOST);
  assert.equal(PRODUCTION_DATABASE_HOST, PRODUCTION_NEON_HOST);
});

test("database host parser never returns credentials", () => {
  assert.equal(databaseHostFromUrl(SAFE_DATABASE_URL), APPROVED_E2E_DATABASE_HOST);
  assert.equal(databaseHostFromUrl("not-a-url"), null);
  assert.equal(databaseHostFromUrl("https://example.invalid"), null);
});

test("existing non-E2E mutation configuration behavior is preserved", () => {
  for (const appEnv of ["production", "staging", undefined]) {
    const decision = evaluateMutationGate({
      APP_ENV: appEnv,
      API_MUTATIONS_ENABLED: "true",
      FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      DATABASE_URL: fixtureDatabaseUrl(PRODUCTION_DATABASE_HOST),
    });
    assert.equal(decision.enabled, true, String(appEnv));
    assert.equal(decision.reason, "configured-enabled", String(appEnv));
    assert.equal(decision.e2e, false, String(appEnv));
  }
});

test("configured mutation disable remains authoritative in every environment", () => {
  for (const apiValue of ["false", "", undefined]) {
    const decision = evaluateMutationGate({
      ...SAFE_E2E_ENV,
      API_MUTATIONS_ENABLED: apiValue,
    });
    assert.equal(decision.enabled, false);
    assert.equal(decision.reason, "configured-disabled");
  }
});

test("safe dedicated E2E Firebase plus isolated DB binding enables E2E mutations", () => {
  const decision = evaluateMutationGate(SAFE_E2E_ENV);
  assert.deepEqual(decision, {
    enabled: true,
    reason: "e2e-approved",
    e2e: true,
    databaseBinding: "approved",
  });
});

test("E2E runtime blocks missing or Production Firebase even when mutations are configured true", () => {
  const missing = evaluateMutationGate({ ...SAFE_E2E_ENV, FIREBASE_PROJECT_ID: "" });
  assert.equal(missing.enabled, false);
  assert.equal(missing.reason, "e2e-firebase-missing");

  const production = evaluateMutationGate({
    ...SAFE_E2E_ENV,
    FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
  });
  assert.equal(production.enabled, false);
  assert.equal(production.reason, "e2e-production-firebase-blocked");
});

test("E2E runtime blocks invalid, Production, and unapproved DB bindings", () => {
  const invalid = evaluateMutationGate({ ...SAFE_E2E_ENV, DATABASE_URL: "not-a-url" });
  assert.equal(invalid.enabled, false);
  assert.equal(invalid.reason, "e2e-database-url-invalid");
  assert.equal(invalid.databaseBinding, "unapproved");

  const production = evaluateMutationGate({
    ...SAFE_E2E_ENV,
    DATABASE_URL: fixtureDatabaseUrl(PRODUCTION_DATABASE_HOST),
  });
  assert.equal(production.enabled, false);
  assert.equal(production.reason, "e2e-production-database-blocked");

  const other = evaluateMutationGate({
    ...SAFE_E2E_ENV,
    DATABASE_URL: fixtureDatabaseUrl("other-endpoint.neon.tech"),
  });
  assert.equal(other.enabled, false);
  assert.equal(other.reason, "e2e-database-host-mismatch");
});

test("E2E health identity reports only safe runtime binding status", () => {
  assert.deepEqual(e2eHealthIdentity(SAFE_E2E_ENV), {
    firebaseProjectId: "lovetree-e2e",
    mutationsEnabled: true,
    databaseBinding: "approved",
  });

  const unsafe = e2eHealthIdentity({
    ...SAFE_E2E_ENV,
    FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
  });
  assert.deepEqual(unsafe, {
    firebaseProjectId: PRODUCTION_FIREBASE_PROJECT_ID,
    mutationsEnabled: false,
    databaseBinding: "unapproved",
  });

  assert.equal(e2eHealthIdentity({ ...SAFE_E2E_ENV, APP_ENV: "staging" }), null);
});

test("/api/health preserves legacy shape outside E2E and exposes safe E2E gate state only in E2E", async () => {
  const staging = await handleApiRequest(
    new Request("https://example.invalid/api/health"),
    {
      APP_ENV: "staging",
      API_MUTATIONS_ENABLED: "false",
      FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      DATABASE_URL: "not-used-by-health-route",
    }
  );
  assert.ok(staging);
  assert.deepEqual(await staging.json(), { status: "ok", env: "staging" });

  const e2e = await handleApiRequest(
    new Request("https://example.invalid/api/health"),
    SAFE_E2E_ENV
  );
  assert.ok(e2e);
  const body = await e2e.json();
  assert.deepEqual(body, {
    status: "ok",
    env: "e2e",
    e2e: {
      firebaseProjectId: "lovetree-e2e",
      mutationsEnabled: true,
      databaseBinding: "approved",
    },
  });
  assert.doesNotMatch(JSON.stringify(body), /postgresql:\/\//);
  assert.doesNotMatch(JSON.stringify(body), /fixture-password/);
});

test("every mutating API method is rejected before router/DB work when E2E bindings are unsafe", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    let routerCalled = false;
    const response = await handleApiRequest(
      new Request("https://example.invalid/api/e2e-guard-test", { method }),
      {
        ...SAFE_E2E_ENV,
        FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      },
      async () => {
        routerCalled = true;
        return new Response("unexpected");
      }
    );
    assert.ok(response);
    assert.equal(response.status, 503, method);
    assert.equal(routerCalled, false, method);
    const body = await response.json();
    assert.match(body.error, /Mutations are temporarily disabled/);
  }
});
