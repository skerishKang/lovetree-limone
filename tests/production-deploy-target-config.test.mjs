import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveDefaultTarget,
  resolveProductionConfig,
  configBindingNames,
  EXPECTED_BINDING_NAMES,
  PRODUCTION_WORKER_NAME,
  FORBIDDEN_WORKER_NAME,
} from "../scripts/lib/production-deploy-guard.mjs";

// Mirrors the repository wrangler.jsonc AFTER the fix (env.production.name).
const FIXED_SOURCE = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "lovetree-limone",
  "main": "worker/index.ts",
  "compatibility_date": "2026-07-01",
  "assets": { "directory": "dist/client", "binding": "ASSETS" },
  "vars": {
    "APP_ENV": "staging",
    "API_MUTATIONS_ENABLED": "false",
    "FIREBASE_PROJECT_ID": "relovetree"
  },
  "secrets": { "required": ["DATABASE_URL"] },
  "env": {
    "staging": {
      "workers_dev": true,
      "vars": {
        "APP_ENV": "staging",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": { "required": ["DATABASE_URL"] }
    },
    "production": {
      "name": "lovetree-limone",
      "vars": {
        "APP_ENV": "production",
        "API_MUTATIONS_ENABLED": "true",
        "FIREBASE_PROJECT_ID": "relovetree"
      },
      "secrets": { "required": ["DATABASE_URL"] }
    }
  }
}
`;

// The pre-fix shape: env.production has NO name, so the legacy environment
// naming scheme resolves the Worker to `<name>-production`.
const BUGGY_SOURCE = FIXED_SOURCE.replace(
  '    "production": {\n      "name": "lovetree-limone",\n',
  '    "production": {\n'
);

test("default (top-level) target stays lovetree-limone with mutations disabled", () => {
  const target = resolveDefaultTarget(FIXED_SOURCE);
  assert.equal(target.name, PRODUCTION_WORKER_NAME);
  assert.equal(target.vars.APP_ENV, "staging");
  assert.equal(target.vars.API_MUTATIONS_ENABLED, "false");
  assert.equal(target.vars.FIREBASE_PROJECT_ID, "relovetree");
});

test("production target resolves to lovetree-limone with mutations enabled (after fix)", () => {
  const prod = resolveProductionConfig(FIXED_SOURCE);
  assert.equal(prod.resolvedName, PRODUCTION_WORKER_NAME);
  assert.notEqual(prod.resolvedName, FORBIDDEN_WORKER_NAME);
  assert.equal(prod.envName, PRODUCTION_WORKER_NAME);
  assert.equal(prod.vars.APP_ENV, "production");
  assert.equal(prod.vars.API_MUTATIONS_ENABLED, "true");
  assert.equal(prod.vars.FIREBASE_PROJECT_ID, "relovetree");
  assert.ok(prod.secretsRequired.includes("DATABASE_URL"));
  assert.equal(prod.compatibilityDate, "2026-07-01");
});

test("production target without an env name resolves to the forbidden lovetree-limone-production", () => {
  const prod = resolveProductionConfig(BUGGY_SOURCE);
  assert.equal(prod.resolvedName, FORBIDDEN_WORKER_NAME);
  assert.equal(prod.vars.API_MUTATIONS_ENABLED, "true");
});

test("production binding names are exactly the expected set", () => {
  const prod = resolveProductionConfig(FIXED_SOURCE);
  assert.deepEqual(configBindingNames(prod), [...EXPECTED_BINDING_NAMES].sort());
});
