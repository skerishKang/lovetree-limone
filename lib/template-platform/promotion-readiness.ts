/**
 * Template Platform — data-variance promotion readiness gate (Issue #142
 * §8/§9, Refs #398/#344).
 *
 * Pure contract + validator only. No React, no DOM, no DB/API/Auth, no
 * persistence semantics, no canonical product adoption, NO real template
 * registration or promotion. This module never promotes anything; it only
 * computes whether declared data-variance evidence is complete enough that a
 * TemplateDefinition COULD be considered for promotion by its owner.
 *
 * Authority (#142): "A source-faithful page that only works with the
 * designer's hard-coded fixture is not yet a reusable template" — template
 * promotion requires DATA-VARIANCE QA evidence, not only source-fixture QA.
 *
 * Boundary vs #398: variant selection eligibility (EVIDENCE_ONLY /
 * VALIDATED / USER_SELECTABLE) is a DIFFERENT authority. A USER_SELECTABLE
 * variant is user-pickable inside a validated family; it is NOT production/
 * reusable-template promotion. Readiness here depends exclusively on the
 * declared variance requirements and evidence below — never on any variant
 * status, caller claim, or readiness flag.
 *
 * Evidence statuses:
 *   - `PROVEN`         — bounded QA evidence exists for this dimension.
 *   - `NOT_APPLICABLE` — the dimension structurally cannot apply; legitimate
 *                        ONLY under an OPTIONAL requirement.
 *   - `MISSING`        — explicitly declared as not yet evidenced.
 * An omitted dimension is treated as MISSING for REQUIRED requirements.
 *
 * Fail-closed rules (never coerced, never guessed):
 *   - unknown dimension / unknown status / unknown keys anywhere
 *   - duplicate requirement or evidence dimension entries
 *   - evidence claims without a matching declared requirement
 *   - zero declared requirements, or none REQUIRED (an all-optional contract
 *     cannot prove reusability)
 *   - malformed bounds (non-integer/negative/out-of-order min-max)
 *   - executable content in any free-form string (reuses the #184 boundary)
 *   - UNKNOWN / MISSING = NOT PROMOTABLE: `ready` is computed exclusively
 *     from requirements × evidence; callers cannot assert or override it
 */

import { isSemver } from "./schema";
import {
  containsExecutableContent,
  type ValidationResult,
} from "./validate";

export const PROMOTION_READINESS_SCHEMA_VERSION = 1 as const;
export type PromotionReadinessSchemaVersion =
  typeof PROMOTION_READINESS_SCHEMA_VERSION;

/* ------------------------------------------------------------------ */
/* Variance dimensions (#142 §9 authority)                             */
/* ------------------------------------------------------------------ */

export const TEMPLATE_VARIANCE_DIMENSIONS = [
  "korean-title-short",
  "korean-title-long",
  "english-title-short",
  "english-title-long",
  "single-moment",
  "multiple-moments-within-bound",
  "portrait-media",
  "landscape-media",
  "image-only-media",
  "mixed-media",
  "missing-optional-note",
  "long-person-subject-name",
  "mobile-narrow-viewport",
  "reduced-motion",
  "slow-media",
  "media-decode-load-failure",
] as const;
export type TemplateVarianceDimension = (typeof TEMPLATE_VARIANCE_DIMENSIONS)[number];

/* ------------------------------------------------------------------ */
/* Requirement levels + evidence statuses                              */
/* ------------------------------------------------------------------ */

export const VARIANCE_REQUIREMENT_LEVELS = [
  "REQUIRED",
  "OPTIONAL",
] as const;
export type VarianceRequirementLevel = (typeof VARIANCE_REQUIREMENT_LEVELS)[number];

export const VARIANCE_EVIDENCE_STATUSES = [
  "PROVEN",
  "NOT_APPLICABLE",
  "MISSING",
] as const;
export type VarianceEvidenceStatus = (typeof VARIANCE_EVIDENCE_STATUSES)[number];

/** Supported count range a template declares for one variance dimension. */
export interface TemplateVarianceBound {
  min?: number;
  max?: number;
}

/** One declared data-variance requirement of a template definition. */
export interface TemplateVarianceRequirement {
  dimension: TemplateVarianceDimension;
  level: VarianceRequirementLevel;
  /** Optional supported-range declaration; integrity is machine-checked. */
  bound?: TemplateVarianceBound;
}

/** One recorded data-variance QA outcome. */
export interface TemplateVarianceEvidence {
  dimension: TemplateVarianceDimension;
  status: VarianceEvidenceStatus;
  /**
   * Opaque provenance label of the QA run backing this status (e.g. a test
   * file id). Free-form but subject to the executable-content boundary.
   */
  evidenceRef?: string;
}

/* ------------------------------------------------------------------ */
/* Promotion evidence input                                            */
/* ------------------------------------------------------------------ */

export interface TemplatePromotionEvidence {
  schemaVersion: PromotionReadinessSchemaVersion;
  /** Exact TemplateDefinition identity this evidence belongs to. */
  templateId: string;
  templateVersion: string;
  /** Declared variance dimensions with their promotion requirement level. */
  requirements: readonly TemplateVarianceRequirement[];
  /** Recorded variance QA outcomes. */
  evidence: readonly TemplateVarianceEvidence[];
}

/* ------------------------------------------------------------------ */
/* Computed readiness result                                           */
/* ------------------------------------------------------------------ */

export interface TemplatePromotionReadiness {
  templateId: string;
  templateVersion: string;
  /**
   * COMPUTED, never claimed: true iff every REQUIRED dimension carries
   * explicit PROVEN evidence. There is no input field that can set this.
   */
  ready: boolean;
  provenDimensions: readonly TemplateVarianceDimension[];
  notApplicableOptionalDimensions: readonly TemplateVarianceDimension[];
  /** OPTIONAL dimensions absent from evidence or explicitly MISSING. */
  unaddressedOptionalDimensions: readonly TemplateVarianceDimension[];
  /** REQUIRED dimensions without explicit PROVEN evidence — blockers. */
  missingRequiredDimensions: readonly TemplateVarianceDimension[];
}

const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function pushUnknownKeys(
  errors: string[],
  path: string,
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) errors.push(`${path} has unknown key: ${key}`);
  }
}

function checkExecutable(errors: string[], path: string, value: string): void {
  if (containsExecutableContent(value)) {
    errors.push(`${path} contains executable content (rejected fail-closed)`);
  }
}

function pushDimensionError(errors: string[], path: string, raw: unknown): boolean {
  if (typeof raw !== "string" ||
      !(TEMPLATE_VARIANCE_DIMENSIONS as readonly string[]).includes(raw)) {
    errors.push(`${path} dimension is out of range: ${String(raw)}`);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Input validation                                                    */
/* ------------------------------------------------------------------ */

const EVIDENCE_INPUT_KEYS = [
  "schemaVersion",
  "templateId",
  "templateVersion",
  "requirements",
  "evidence",
] as const;
const REQUIREMENT_KEYS = ["dimension", "level", "bound"] as const;
const BOUND_KEYS = ["min", "max"] as const;
const EVIDENCE_ENTRY_KEYS = ["dimension", "status", "evidenceRef"] as const;

function validateBound(
  errors: string[],
  path: string,
  raw: unknown,
): boolean {
  if (!isRecord(raw)) {
    errors.push(`${path} bound must be an object`);
    return false;
  }
  pushUnknownKeys(errors, `${path} bound`, raw, BOUND_KEYS);
  let valid = true;
  if (raw.min !== undefined && !isNonNegativeInteger(raw.min)) {
    errors.push(`${path} bound.min must be a non-negative integer`);
    valid = false;
  }
  if (raw.max !== undefined && !isNonNegativeInteger(raw.max)) {
    errors.push(`${path} bound.max must be a non-negative integer`);
    valid = false;
  }
  if (raw.min === undefined && raw.max === undefined) {
    errors.push(`${path} bound must declare at least one of min/max`);
    valid = false;
  }
  if (isNonNegativeInteger(raw.min) && isNonNegativeInteger(raw.max) && raw.min > raw.max) {
    errors.push(`${path} bound.min must not exceed bound.max`);
    valid = false;
  }
  return valid;
}

function validateRequirements(
  errors: string[],
  input: Record<string, unknown>,
): Set<string> {
  const requiredDimensions = new Set<string>();
  if (!Array.isArray(input.requirements) || input.requirements.length === 0) {
    errors.push("requirements must be a non-empty array");
    return requiredDimensions;
  }
  const seen = new Set<string>();
  for (const raw of input.requirements) {
    if (!isRecord(raw)) {
      errors.push("requirement entries must be objects");
      continue;
    }
    pushUnknownKeys(errors, "requirement", raw, REQUIREMENT_KEYS);
    const path = `requirement (${String(raw.dimension)})`;
    if (!pushDimensionError(errors, path, raw.dimension)) continue;
    const dimension = raw.dimension as string;
    if (seen.has(dimension)) {
      errors.push(`duplicate requirement dimension: ${dimension}`);
    }
    seen.add(dimension);
    if (typeof raw.level !== "string" ||
        !(VARIANCE_REQUIREMENT_LEVELS as readonly string[]).includes(raw.level)) {
      errors.push(`${path} level is out of range: ${String(raw.level)}`);
    } else if (raw.level === "REQUIRED") {
      requiredDimensions.add(dimension);
    }
    if (raw.bound !== undefined) {
      validateBound(errors, path, raw.bound);
    }
  }
  // #142: promotion requires data-variance QA. A contract that declares no
  // REQUIRED dimension cannot prove reusability — it would let a single
  // source fixture pass vacuously.
  if (requiredDimensions.size === 0) {
    errors.push(
      "at least one variance dimension must be declared REQUIRED (a source-fixture-only contract is not promotable)",
    );
  }
  return seen;
}

function validateEvidenceEntries(
  errors: string[],
  input: Record<string, unknown>,
  declaredDimensions: Set<string>,
): void {
  if (!Array.isArray(input.evidence)) {
    errors.push("evidence must be an array");
    return;
  }
  const seen = new Set<string>();
  for (const raw of input.evidence) {
    if (!isRecord(raw)) {
      errors.push("evidence entries must be objects");
      continue;
    }
    pushUnknownKeys(errors, "evidence", raw, EVIDENCE_ENTRY_KEYS);
    const path = `evidence (${String(raw.dimension)})`;
    if (!pushDimensionError(errors, path, raw.dimension)) continue;
    const dimension = raw.dimension as string;
    if (!declaredDimensions.has(dimension)) {
      errors.push(
        `evidence claims an undeclared requirement dimension: ${dimension}`,
      );
    }
    if (seen.has(dimension)) {
      errors.push(`duplicate evidence dimension: ${dimension}`);
    }
    seen.add(dimension);
    if (typeof raw.status !== "string" ||
        !(VARIANCE_EVIDENCE_STATUSES as readonly string[]).includes(raw.status)) {
      errors.push(`${path} status is out of range: ${String(raw.status)}`);
    }
    if (raw.evidenceRef !== undefined) {
      if (!isNonEmptyString(raw.evidenceRef)) {
        errors.push(`${path} evidenceRef must be a non-empty string when present`);
      } else {
        checkExecutable(errors, `${path} evidenceRef`, raw.evidenceRef);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Readiness evaluation                                                */
/* ------------------------------------------------------------------ */

function sortedDimensions(dimensions: Iterable<string>): readonly TemplateVarianceDimension[] {
  return Object.freeze([...dimensions].sort() as TemplateVarianceDimension[]);
}

/**
 * Compute template promotion readiness from declared variance requirements
 * and recorded evidence. Structural violations yield `{ ok: false }`; a
 * structurally valid input always yields `{ ok: true }` with a computed
 * `ready` flag plus the exact blocker dimensions.
 */
export function evaluateTemplatePromotionReadiness(
  input: unknown,
): ValidationResult<TemplatePromotionReadiness> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["promotion evidence must be an object"] };
  }
  pushUnknownKeys(errors, "promotion evidence", input, EVIDENCE_INPUT_KEYS);

  if (input.schemaVersion !== PROMOTION_READINESS_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${PROMOTION_READINESS_SCHEMA_VERSION} (got ${String(input.schemaVersion)})`,
    );
  }

  if (!isNonEmptyString(input.templateId) || !KEBAB_PATTERN.test(input.templateId)) {
    errors.push("templateId must be a non-empty kebab-case string");
  }
  if (!isNonEmptyString(input.templateVersion) || !isSemver(input.templateVersion)) {
    errors.push(
      `templateVersion must be a semver string (got ${String(input.templateVersion)})`,
    );
  }

  const declaredDimensions = validateRequirements(errors, input);
  validateEvidenceEntries(errors, input, declaredDimensions);

  if (errors.length > 0) return { ok: false, errors };

  const evidenceInput = input.evidence as readonly unknown[];
  const requirementsInput = input.requirements as readonly unknown[];

  const proven = new Set<string>();
  const notApplicableOptional = new Set<string>();
  const unaddressedOptional = new Set<string>();
  const missingRequired = new Set<string>();

  const statusByDimension = new Map<string, string>();
  for (const raw of evidenceInput) {
    const entry = raw as Record<string, unknown>;
    if (typeof entry.dimension === "string" && typeof entry.status === "string") {
      statusByDimension.set(entry.dimension, entry.status);
    }
  }

  for (const raw of requirementsInput) {
    const requirement = raw as Record<string, unknown>;
    if (typeof requirement.dimension !== "string" ||
        typeof requirement.level !== "string") {
      continue;
    }
    const dimension = requirement.dimension;
    const status = statusByDimension.get(dimension);
    if (requirement.level === "REQUIRED") {
      if (status === "PROVEN") {
        proven.add(dimension);
      } else {
        // PROVEN is the only promotable state: MISSING, NOT_APPLICABLE, or
        // silently absent evidence all block a REQUIRED dimension.
        missingRequired.add(dimension);
      }
    } else {
      if (status === "PROVEN") {
        proven.add(dimension);
      } else if (status === "NOT_APPLICABLE") {
        notApplicableOptional.add(dimension);
      } else {
        // Optional may stay unproven (absent or explicitly MISSING).
        unaddressedOptional.add(dimension);
      }
    }
  }

  const missingRequiredSorted = sortedDimensions(missingRequired);
  const readiness: TemplatePromotionReadiness = Object.freeze({
    templateId: input.templateId as string,
    templateVersion: input.templateVersion as string,
    ready: missingRequiredSorted.length === 0,
    provenDimensions: sortedDimensions(proven),
    notApplicableOptionalDimensions: sortedDimensions(notApplicableOptional),
    unaddressedOptionalDimensions: sortedDimensions(unaddressedOptional),
    missingRequiredDimensions: missingRequiredSorted,
  });
  return { ok: true, value: readiness };
}
