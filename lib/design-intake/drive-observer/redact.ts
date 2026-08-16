/**
 * Secret redaction for the Drive observer (Issue #173).
 *
 * Two layers, deliberately redundant:
 * 1. EXACT REGISTRY — transports register the exact bearer-token string they
 *    hold; any occurrence of that exact string is replaced before a message
 *    or object can leave the observer.
 * 2. PATTERN SCRUB — well-known token shapes (OAuth access tokens, Google
 *    API keys, GitHub tokens, PEM blocks, `Authorization: Bearer …`) are
 *    scrubbed even when they were never registered, so an unexpected copy of
 *    a credential in an error string still cannot leak.
 *
 * Everything the observer emits (observation JSON, CLI stdout/stderr, provider
 * error messages) passes through `redactDeep` / `redactString`.
 */

const REDACTED = "[REDACTED]";

const exactSecrets = new Set<string>();

/** Register an exact secret string (e.g. the live bearer token) for redaction. */
export function registerSecret(secret: string | undefined | null): void {
  if (typeof secret !== "string" || secret.length < 8) return;
  exactSecrets.add(secret);
}

/** Test seam: forget registered secrets between unit tests. */
export function clearRegisteredSecrets(): void {
  exactSecrets.clear();
}

/** Well-known credential shapes that must never appear in observer output. */
const TOKEN_PATTERNS: readonly RegExp[] = [
  /ya29\.[A-Za-z0-9._-]+/g,
  /1\/\/[A-Za-z0-9._-]+/g,
  /AIza[A-Za-z0-9_-]{35}/g,
  /gh[pousr]_[A-Za-z0-9]{16,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /"access_token"\s*:\s*"[^"]+"/gi,
  /"refresh_token"\s*:\s*"[^"]+"/gi,
];

/** Redact a single string: exact registered secrets first, then patterns. */
export function redactString(text: string): string {
  let out = text;
  for (const secret of exactSecrets) {
    out = out.split(secret).join(REDACTED);
  }
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

/**
 * JSON-safe deep redaction. Returns a structurally identical copy in which
 * every string value (at any depth, array elements included) is redacted.
 * Non-JSON values are dropped defensively (observation output must be pure
 * JSON anyway).
 */
export function redactDeep<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[redactString(key)] = redactValue(entry);
    }
    return out;
  }
  return value;
}

/**
 * Fail-closed assertion used by the token provider: refuse configurations
 * that require long-lived credential material. Detecting such material is a
 * security refusal (SECURITY_REFUSAL), not a supported path.
 */
export function assertNoLongLivedCredentialEnv(env: Record<string, string | undefined>): void {
  const forbidden = [
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "SERVICE_ACCOUNT_KEY",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "OAUTH_REFRESH_TOKEN",
    "DRIVE_OAUTH_REFRESH_TOKEN",
  ] as const;
  const present = forbidden.filter((name) => Boolean(env[name]));
  if (present.length > 0) {
    throw new Error(
      `long-lived Drive credential environment detected (${present.join(", ")}) — refused. ` +
        "The observer only accepts a short-lived access token via DESIGN_INTAKE_DRIVE_ACCESS_TOKEN " +
        "(future GitHub Actions OIDC → Google WIF topology). Never commit or export service-account keys.",
    );
  }
}
