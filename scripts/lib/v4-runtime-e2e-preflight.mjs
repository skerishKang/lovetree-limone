import {
  ISOLATED_PREVIEW_WORKER_PATTERN,
  PROTECTED_WORKER_NAMES,
  validatePreviewWorkerName,
} from "./isolated-preview-deploy-guard.mjs";

export const PRODUCTION_FIREBASE_PROJECT_ID = "relovetree";
export const EXPECTED_NEON_PROJECT_ID = "autumn-cherry-54971674";
export const PRODUCTION_NEON_BRANCH_ID = "br-holy-scene-azwi84gb";
export const APPROVED_E2E_NEON_BRANCH_ID = "br-purple-violet-azsxemfv";
export const REQUIRED_E2E_APP_ENV = "e2e";

const SAFE_OUTPUT_KEYS = Object.freeze([
  "worker",
  "firebaseProjectId",
  "neonProjectId",
  "neonBranchId",
  "appEnv",
  "apiMutationsEnabled",
]);

export class RuntimeE2EPreflightError extends Error {
  constructor(issues) {
    super(
      "V4 Runtime E2E preflight failed:\n" +
        issues.map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n")
    );
    this.name = "RuntimeE2EPreflightError";
    this.code = "V4_RUNTIME_E2E_PREFLIGHT_FAILED";
    this.issues = issues;
  }
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pushMissing(issues, value, field) {
  if (!clean(value)) {
    issues.push({ code: "MISSING_IDENTITY", message: `${field} is required` });
    return true;
  }
  return false;
}

function isTrue(value) {
  return value === true || clean(value).toLowerCase() === "true";
}

export function validateRuntimeE2EIdentity(input = {}) {
  const worker = clean(input.E2E_EXPECTED_WORKER);
  const expectedFirebase = clean(input.E2E_FIREBASE_PROJECT_ID);
  const browserFirebase = clean(input.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const workerFirebase = clean(input.FIREBASE_PROJECT_ID);
  const neonProjectId = clean(input.E2E_NEON_PROJECT_ID);
  const neonBranchId = clean(input.E2E_NEON_BRANCH_ID);
  const appEnv = clean(input.APP_ENV);
  const mutationsEnabled = isTrue(input.API_MUTATIONS_ENABLED);

  const issues = [];

  const workerMissing = pushMissing(issues, worker, "E2E_EXPECTED_WORKER");
  if (!workerMissing) {
    try {
      validatePreviewWorkerName({
        worker,
        confirmWorker: worker,
        protectedNames: PROTECTED_WORKER_NAMES,
        canonicalName: "lovetree-limone",
      });
    } catch (error) {
      issues.push({
        code: "UNSAFE_WORKER",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const [field, value] of [
    ["E2E_FIREBASE_PROJECT_ID", expectedFirebase],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", browserFirebase],
    ["FIREBASE_PROJECT_ID", workerFirebase],
  ]) {
    const missing = pushMissing(issues, value, field);
    if (!missing && value === PRODUCTION_FIREBASE_PROJECT_ID) {
      issues.push({
        code: "PRODUCTION_FIREBASE_BLOCKED",
        message: `${field} must not equal Production Firebase project '${PRODUCTION_FIREBASE_PROJECT_ID}'`,
      });
    }
  }

  if (
    expectedFirebase &&
    browserFirebase &&
    workerFirebase &&
    (browserFirebase !== expectedFirebase || workerFirebase !== expectedFirebase)
  ) {
    issues.push({
      code: "FIREBASE_PROJECT_MISMATCH",
      message:
        "E2E, browser, and Worker Firebase project IDs must be byte-identical",
    });
  }

  if (!pushMissing(issues, neonProjectId, "E2E_NEON_PROJECT_ID")) {
    if (neonProjectId !== EXPECTED_NEON_PROJECT_ID) {
      issues.push({
        code: "NEON_PROJECT_MISMATCH",
        message: `E2E_NEON_PROJECT_ID must equal approved project '${EXPECTED_NEON_PROJECT_ID}'`,
      });
    }
  }

  if (!pushMissing(issues, neonBranchId, "E2E_NEON_BRANCH_ID")) {
    if (neonBranchId === PRODUCTION_NEON_BRANCH_ID) {
      issues.push({
        code: "PRODUCTION_NEON_BLOCKED",
        message: `Production Neon branch '${PRODUCTION_NEON_BRANCH_ID}' is forbidden`,
      });
    }
    if (neonBranchId !== APPROVED_E2E_NEON_BRANCH_ID) {
      issues.push({
        code: "UNAPPROVED_NEON_BRANCH",
        message: `E2E_NEON_BRANCH_ID must equal approved isolated branch '${APPROVED_E2E_NEON_BRANCH_ID}'`,
      });
    }
  }

  if (pushMissing(issues, appEnv, "APP_ENV") === false && appEnv !== REQUIRED_E2E_APP_ENV) {
    issues.push({
      code: "APP_ENV_NOT_E2E",
      message: `APP_ENV must be exactly '${REQUIRED_E2E_APP_ENV}' for mutable Runtime E2E`,
    });
  }

  if (!mutationsEnabled) {
    issues.push({
      code: "MUTATIONS_NOT_ENABLED",
      message:
        "API_MUTATIONS_ENABLED must be true only on the fully isolated E2E target",
    });
  }

  if (issues.length > 0) {
    throw new RuntimeE2EPreflightError(issues);
  }

  const result = {
    ok: true,
    worker,
    firebaseProjectId: expectedFirebase,
    neonProjectId,
    neonBranchId,
    appEnv,
    apiMutationsEnabled: true,
    workerPattern: ISOLATED_PREVIEW_WORKER_PATTERN.source,
  };

  return Object.fromEntries(
    Object.entries(result).filter(([key]) => key === "ok" || key === "workerPattern" || SAFE_OUTPUT_KEYS.includes(key))
  );
}

export function preflightFromEnv(env = process.env) {
  return validateRuntimeE2EIdentity({
    E2E_EXPECTED_WORKER: env.E2E_EXPECTED_WORKER,
    E2E_FIREBASE_PROJECT_ID: env.E2E_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    E2E_NEON_PROJECT_ID: env.E2E_NEON_PROJECT_ID,
    E2E_NEON_BRANCH_ID: env.E2E_NEON_BRANCH_ID,
    APP_ENV: env.APP_ENV,
    API_MUTATIONS_ENABLED: env.API_MUTATIONS_ENABLED,
  });
}
