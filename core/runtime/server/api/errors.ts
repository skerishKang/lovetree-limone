const MAX_ERROR_CAUSE_DEPTH = 3;
const MAX_ERROR_FIELD_LENGTH = 1200;

const ERROR_FIELDS = [
  "name",
  "message",
  "code",
  "severity",
  "detail",
  "hint",
  "schema",
  "table",
  "column",
  "constraint",
] as const;

export type SafeError = {
  name?: string;
  message?: string;
  code?: string;
  severity?: string;
  detail?: string;
  hint?: string;
  schema?: string;
  table?: string;
  column?: string;
  constraint?: string;
  cause?: SafeError;
};

export interface ApiErrorContext {
  requestId: string;
  method: string;
  path: string;
}

function redactText(value: string): string {
  const redacted = value
    .replace(/\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi, "[redacted-postgres-url]")
    .replace(/\b(?:database_url|password|passwd|pwd|token|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\bauthorization\s*[:=]\s*[^\s,;]+/gi, "authorization=[redacted]")
    .replace(/\bbearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\bcookie\s*[:=]\s*[^\s,;]+/gi, "cookie=[redacted]")
    .replace(/\bparams\s*:\s*[\s\S]*$/i, "params: [redacted]");

  return redacted.length > MAX_ERROR_FIELD_LENGTH
    ? `${redacted.slice(0, MAX_ERROR_FIELD_LENGTH)}…`
    : redacted;
}

function readProperty(value: object, key: string): unknown {
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function safeField(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return undefined;
  }

  return redactText(String(value));
}

function sanitizeErrorValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): SafeError {
  if (value === null || value === undefined) return {};

  if (typeof value !== "object" && typeof value !== "function") {
    return { message: safeField(value) };
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) return { message: "[circular error cause]" };
  seen.add(objectValue);

  const safe: SafeError = {};
  for (const field of ERROR_FIELDS) {
    const sanitized = safeField(readProperty(objectValue, field));
    if (sanitized !== undefined) safe[field] = sanitized;
  }

  if (!safe.name) {
    const constructor = readProperty(objectValue, "constructor");
    const constructorName = constructor && typeof constructor === "function"
      ? safeField(readProperty(constructor, "name"))
      : undefined;
    if (constructorName) safe.name = constructorName;
  }

  if (depth < MAX_ERROR_CAUSE_DEPTH) {
    const cause = readProperty(objectValue, "cause");
    if (cause !== undefined) {
      safe.cause = sanitizeErrorValue(cause, depth + 1, seen);
    }
  }

  return safe;
}

export function sanitizeError(error: unknown): SafeError {
  return sanitizeErrorValue(error, 0, new WeakSet<object>());
}

export function logApiError(context: ApiErrorContext, error: unknown): void {
  const payload = {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    error: sanitizeError(error),
  };

  try {
    console.error("api_request_error", JSON.stringify(payload));
  } catch {
    console.error("api_request_error", context.requestId, context.method, context.path);
  }
}
