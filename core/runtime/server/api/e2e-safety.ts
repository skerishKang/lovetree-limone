export interface E2ERuntimeEnv {
  DATABASE_URL?: string;
  FIREBASE_PROJECT_ID?: string;
  API_MUTATIONS_ENABLED?: string;
  APP_ENV?: string;
}

export const E2E_APP_ENV = "e2e";
export const PRODUCTION_FIREBASE_PROJECT_ID = "relovetree";
export const APPROVED_E2E_DATABASE_HOST =
  "ep-red-paper-azsjzfte.c-3.ap-southeast-1.aws.neon.tech";
export const PRODUCTION_DATABASE_HOST =
  "ep-old-sky-az0qftwa.c-3.ap-southeast-1.aws.neon.tech";

export type MutationGateReason =
  | "configured-disabled"
  | "configured-enabled"
  | "e2e-firebase-missing"
  | "e2e-production-firebase-blocked"
  | "e2e-database-url-invalid"
  | "e2e-production-database-blocked"
  | "e2e-database-host-mismatch"
  | "e2e-approved";

export interface MutationGateDecision {
  enabled: boolean;
  reason: MutationGateReason;
  e2e: boolean;
  databaseBinding?: "approved" | "unapproved";
}

export function databaseHostFromUrl(databaseUrl: unknown): string | null {
  if (typeof databaseUrl !== "string" || databaseUrl.trim().length === 0) return null;
  try {
    const parsed = new URL(databaseUrl.trim());
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") return null;
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

export function evaluateMutationGate(env: E2ERuntimeEnv): MutationGateDecision {
  const configured = env.API_MUTATIONS_ENABLED === "true";
  const e2e = env.APP_ENV === E2E_APP_ENV;

  if (!configured) {
    return { enabled: false, reason: "configured-disabled", e2e };
  }

  // Preserve the existing Production/staging behavior. The stricter binding
  // contract applies only to the dedicated mutable E2E runtime class.
  if (!e2e) {
    return { enabled: true, reason: "configured-enabled", e2e: false };
  }

  const firebaseProjectId = env.FIREBASE_PROJECT_ID?.trim() ?? "";
  if (!firebaseProjectId) {
    return { enabled: false, reason: "e2e-firebase-missing", e2e: true };
  }
  if (firebaseProjectId === PRODUCTION_FIREBASE_PROJECT_ID) {
    return {
      enabled: false,
      reason: "e2e-production-firebase-blocked",
      e2e: true,
    };
  }

  const databaseHost = databaseHostFromUrl(env.DATABASE_URL);
  if (!databaseHost) {
    return {
      enabled: false,
      reason: "e2e-database-url-invalid",
      e2e: true,
      databaseBinding: "unapproved",
    };
  }
  if (databaseHost === PRODUCTION_DATABASE_HOST) {
    return {
      enabled: false,
      reason: "e2e-production-database-blocked",
      e2e: true,
      databaseBinding: "unapproved",
    };
  }
  if (databaseHost !== APPROVED_E2E_DATABASE_HOST) {
    return {
      enabled: false,
      reason: "e2e-database-host-mismatch",
      e2e: true,
      databaseBinding: "unapproved",
    };
  }

  return {
    enabled: true,
    reason: "e2e-approved",
    e2e: true,
    databaseBinding: "approved",
  };
}

export function e2eHealthIdentity(env: E2ERuntimeEnv): Record<string, unknown> | null {
  if (env.APP_ENV !== E2E_APP_ENV) return null;
  const gate = evaluateMutationGate(env);
  return {
    firebaseProjectId: env.FIREBASE_PROJECT_ID?.trim() || null,
    mutationsEnabled: gate.enabled,
    databaseBinding: gate.databaseBinding ?? "unapproved",
  };
}
