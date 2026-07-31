import { errorResponse } from "./http";

export const VISIBILITY_VALUES = ["private", "unlisted", "public"] as const;
export type VisibilityValue = (typeof VISIBILITY_VALUES)[number];

export const SOURCE_TYPE_VALUES = [
  "youtube",
  "video",
  "song",
  "book",
  "person",
  "travel",
  "other",
  "link",
] as const;
export type SourceTypeValue = (typeof SOURCE_TYPE_VALUES)[number];

export const REACTION_TYPE_VALUES = [
  "like",
  "love",
  "laugh",
  "wow",
  "sad",
  "angry",
] as const;
export type ReactionTypeValue = (typeof REACTION_TYPE_VALUES)[number];

export interface StringRule {
  kind: "string";
  required?: boolean;
  trim?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowed?: readonly string[];
}

export interface StringArrayRule {
  kind: "stringArray";
  maxItems?: number;
  maxItemLength?: number;
}

export interface UrlRule {
  kind: "url";
  required?: boolean;
  maxLength?: number;
}

export interface ObjectRule {
  kind: "object";
  required?: boolean;
  rules: Rules;
}

export type FieldRule = StringRule | StringArrayRule | UrlRule | ObjectRule;

export type Rules = Record<string, FieldRule>;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function isVisibility(value: unknown): value is VisibilityValue {
  return (
    typeof value === "string" &&
    (VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}

export function isSourceType(value: unknown): value is SourceTypeValue {
  return (
    typeof value === "string" &&
    (SOURCE_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export function isReactionType(value: unknown): value is ReactionTypeValue {
  return (
    typeof value === "string" &&
    (REACTION_TYPE_VALUES as readonly string[]).includes(value)
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateString(value: unknown, rule: StringRule, field: string): string | null {
  if (value === undefined || value === null) {
    return rule.required ? `${field} is required` : null;
  }
  if (typeof value !== "string") return `${field} must be a string`;

  let candidate = rule.trim === false ? value : value.trim();
  if (rule.pattern && !rule.pattern.test(candidate)) {
    return `${field} has an invalid format`;
  }
  if (rule.allowed && !(rule.allowed as readonly string[]).includes(candidate)) {
    return `${field} must be one of: ${rule.allowed.join(", ")}`;
  }
  if (rule.minLength !== undefined && candidate.length < rule.minLength) {
    return `${field} is too short`;
  }
  if (rule.maxLength !== undefined && candidate.length > rule.maxLength) {
    return `${field} exceeds the maximum length`;
  }
  if (rule.required && candidate.length === 0) {
    return `${field} must not be empty`;
  }
  return null;
}

function validateStringArray(value: unknown, rule: StringArrayRule, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return `${field} must be an array of strings`;
  const maxItems = rule.maxItems ?? 20;
  const maxItemLength = rule.maxItemLength ?? 40;
  if (value.length > maxItems) return `${field} must not contain more than ${maxItems} items`;
  for (const item of value) {
    if (typeof item !== "string") return `${field} must only contain strings`;
    if (item.length > maxItemLength) {
      return `${field} items must not exceed ${maxItemLength} characters`;
    }
  }
  return null;
}

function validateUrl(value: unknown, rule: UrlRule, field: string): string | null {
  if (value === undefined || value === null) {
    return rule.required ? `${field} is required` : null;
  }
  if (typeof value !== "string") return `${field} must be a string`;
  const candidate = value.trim();
  if (rule.required && candidate.length === 0) return `${field} must not be empty`;
  if (candidate.length === 0) return null;
  if (rule.maxLength !== undefined && candidate.length > rule.maxLength) {
    return `${field} exceeds the maximum length`;
  }
  if (!isHttpUrl(candidate)) return `${field} must be an http(s) URL`;
  return null;
}

/**
 * Validates a request body against an explicit whitelist of fields. Values are
 * never blindly coerced with String(); wrong types are rejected with a 400
 * error. Unknown fields are ignored.
 */
export function validate<T extends Record<string, unknown>>(
  input: unknown,
  rules: Rules
): Validated<T> {
  if (input === null || input === undefined || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" };
  }

  const source = input as Record<string, unknown>;
  const value: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(rules)) {
    let error: string | null = null;
    if (rule.kind === "object") {
      if (source[field] === undefined || source[field] === null) {
        if (rule.required) {
          return { ok: false, error: `${field} is required` };
        }
      } else if (typeof source[field] !== "object" || Array.isArray(source[field])) {
        return { ok: false, error: `${field} must be an object` };
      } else {
        const nested = validate(source[field], rule.rules);
        if (!nested.ok) return { ok: false, error: `${field}.${nested.error}` };
        value[field] = nested.value;
      }
    } else if (rule.kind === "string") {
      error = validateString(source[field], rule, field);
      const candidate = source[field];
      if (error === null && candidate !== undefined && candidate !== null && typeof candidate === "string") {
        value[field] = rule.trim === false ? candidate : candidate.trim();
      }
    } else if (rule.kind === "stringArray") {
      error = validateStringArray(source[field], rule, field);
      if (error === null && source[field] !== undefined && source[field] !== null) {
        value[field] = source[field];
      }
    } else {
      error = validateUrl(source[field], rule, field);
      const candidate = source[field];
      if (error === null && candidate !== undefined && candidate !== null && typeof candidate === "string") {
        value[field] = candidate.trim();
      }
    }
    if (error) return { ok: false, error };
  }

  return { ok: true, value: value as T };
}

export function validationError(error: string): Response {
  return errorResponse(error, 400);
}
