/**
 * Template Platform — data-variance promotion readiness gate (Issue #142
 * §8/§9, Refs #398/#344; corrected per PR #435 CTO review).
 *
 * Pure contract + validator only. No React, no DOM, no DB/API/Auth, no
 * persistence semantics, no canonical product adoption, NO real template
 * registration or promotion, no runtime activation, no hydration, no
 * public-gallery or first-user-ready semantics. This module never promotes
 * anything; it computes whether declared data-variance evidence satisfies
 * the authority promotion gate.
 *
 * Authority (#142): "A source-faithful page that only works with the
 * designer's hard-coded fixture is not yet a reusable template" — template
 * promotion requires DATA-VARIANCE QA evidence, not only source-fixture QA.
 *
 * Fail-closed applicability invariant (PR #435 CTO blocking finding):
 *
 *   the evidence caller must not be able to weaken the promotion gate it is
 *   being evaluated against.
 *
 * Concretely:
 *   - there is NO caller-facing requirement/classification field. The
 *     authority gate is fixed: EVERY dimension in TEMPLATE_VARIANCE_DIMENSIONS
 *     (the #142 §9 registry) is REQUIRED, and `ready` is true only when all
 *     sixteen carry explicit PROVEN evidence. An inline `requirements` array
 *     — including any REQUIRED/OPTIONAL mix such as "1 REQUIRED + 15
 *     OPTIONAL" — is an unknown key and is rejected outright.
 *   - exemptions (NOT_APPLICABLE) live ONLY in a separately validated,
 *     full-registry applicability policy: complete 16-dimension coverage is
 *     mandatory, every exemption must carry an authorityRef justification,
 *     and the policy is identity-bound to the exact template version.
 *   - even a valid bound policy can NEVER flip `ready`: exemptions are
 *     declarative classifications surfaced transparently in the result
 *     (`exemptedUnprovenDimensions`) for the separate promotion authority;
 *     the computed gate itself stays strict. UNKNOWN / MISSING / UNPROVEN =
 *     NOT PROMOTABLE, always.
 *
 * Boundary vs #398: variant selection eligibility (EVIDENCE_ONLY /
 * VALIDATED / USER_SELECTABLE) is a DIFFERENT authority and is neither
 * weakened nor extended here. A USER_SELECTABLE variant is user-pickable
 * inside its family; it is NOT production/reusable-template promotion.
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

/**
 * The authority-defined gate: every registered variance dimension is
 * REQUIRED for promotion. This is not configurable by callers — the #142
 * data-variance QA requirement cannot be downgraded by the entity whose
 * evidence is being judged.
 */
export const AUTHORITY_REQUIRED_DIMENSIONS: readonly TemplateVarianceDimension[] =
  Object.freeze([...TEMPLATE_VARIANCE_DIMENSIONS]);

/* ------------------------------------------------------------------ */
/* Evidence statuses                                                   */
/* ------------------------------------------------------------------ */

/**
 * Observation outcomes only. NOT_APPLICABLE is deliberately absent: the
 * evidence layer may not excuse a dimension — applicability is decided
 * exclusively by a validated applicability policy (see below).
 */
export const VARIANCE_EVIDENCE_STATUSES = [
  "PROVEN",
  "MISSING",
] as const;
export type VarianceEvidenceStatus = (typeof VARIANCE_EVIDENCE_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Validated applicability policy (separate exemption channel)         */
/* ------------------------------------------------------------------ */

export const APPLICABILITY_STATUSES = [
  "APPLICABLE",
  "EXEMPT_NOT_APPLICABLE",
] as const;
export type ApplicabilityStatus = (typeof APPLICABILITY_STATUSES)[number];

/** Supported count range a template declares for one variance dimension. */
export interface TemplateVarianceBound {
  min?: number;
  max?: number;
}

export interface TemplateDimensionApplicability {
  dimension: TemplateVarianceDimension;
  applicability: ApplicabilityStatus;
  /** Optional supported-range declaration; integrity is machine-checked. */
  bound?: TemplateVarianceBound;
  /**
   * Opaque justification reference for the exemption decision (required for
   * EXEMPT_NOT_APPLICABLE). Subject to the executable-content boundary.
   */
  authorityRef?: string;
}

/**
 * A full-registry applicability policy. Every one of the sixteen authority
 * dimensions MUST appear exactly once — partial policies are invalid, so
 * applicability can never be smuggled in by omission.
 */
export interface TemplateApplicabilityPolicy {
  schemaVersion: PromotionReadinessSchemaVersion;
  /** Exact TemplateDefinition identity this policy governs. */
  templateId: string;
  templateVersion: string;
  applicabilities: readonly TemplateDimensionApplicability[];
}

/* ------------------------------------------------------------------ */
/* Promotion evidence input                                            */
/* ------------------------------------------------------------------ */

/** One recorded data-variance QA outcome. */
export interface TemplateVarianceEvidence {
  dimension: TemplateVarianceDimension;
  status: VarianceEvidenceStatus;
  /**
   * Opaque provenance label of the QA run backing this status. Free-form
   * but subject to the executable-content boundary.
   */
  evidenceRef?: string;
}

export interface TemplatePromotionEvidence {
  schemaVersion: PromotionReadinessSchemaVersion;
  /** Exact TemplateDefinition identity this evidence belongs to. */
  templateId: string;
  templateVersion: string;
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
   * COMPUTED, never claimed: true iff EVERY authority-required dimension
   * (the full sixteen-dimension registry) carries explicit PROVEN evidence.
   * Bound applicability policies classify the gaps but can never set or
   * flip this flag.
   */
  ready: boolean;
  provenDimensions: readonly TemplateVarianceDimension[];
  /** Every registry dimension without PROVEN evidence. */
  unprovenDimensions: readonly TemplateVarianceDimension[];
  /** Unproven dimensions still applicable under the bound policy. */
  applicableUnprovenDimensions: readonly TemplateVarianceDimension[];
  /** Unproven dimensions the bound policy declares exempt (metadata only). */
  exemptedUnprovenDimensions: readonly TemplateVarianceDimension[];
  /** Whether a validated applicability policy was bound to this evaluation. */
  policyBound: boolean;
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

function validateIdentity(
  errors: string[],
  path: string,
  input: Record<string, unknown>,
): void {
  if (input.schemaVersion !== PROMOTION_READINESS_SCHEMA_VERSION) {
    errors.push(
      `${path} schemaVersion must be ${PROMOTION_READINESS_SCHEMA_VERSION} (got ${String(input.schemaVersion)})`,
    );
  }
  if (!isNonEmptyString(input.templateId) || !KEBAB_PATTERN.test(input.templateId)) {
    errors.push(`${path} templateId must be a non-empty kebab-case string`);
  }
  if (!isNonEmptyString(input.templateVersion) || !isSemver(input.templateVersion)) {
    errors.push(
      `${path} templateVersion must be a semver string (got ${String(input.templateVersion)})`,
    );
  }
}

function validateBound(
  errors: string[],
  path: string,
  raw: unknown,
): void {
  if (!isRecord(raw)) {
    errors.push(`${path} bound must be an object`);
    return;
  }
  pushUnknownKeys(errors, `${path} bound`, raw, ["min", "max"]);
  if (raw.min !== undefined && !isNonNegativeInteger(raw.min)) {
    errors.push(`${path} bound.min must be a non-negative integer`);
  }
  if (raw.max !== undefined && !isNonNegativeInteger(raw.max)) {
    errors.push(`${path} bound.max must be a non-negative integer`);
  }
  if (raw.min === undefined && raw.max === undefined) {
    errors.push(`${path} bound must declare at least one of min/max`);
  }
  if (isNonNegativeInteger(raw.min) && isNonNegativeInteger(raw.max) && raw.min > raw.max) {
    errors.push(`${path} bound.min must not exceed bound.max`);
  }
}

/* ------------------------------------------------------------------ */
/* Evidence validation                                                 */
/* ------------------------------------------------------------------ */

const EVIDENCE_INPUT_KEYS = [
  "schemaVersion",
  "templateId",
  "templateVersion",
  "evidence",
] as const;
// NOTE: there is intentionally no "requirements" key. Caller-supplied
// applicability/requiredness classification is the exact false-promotion
// vector the #435 CTO review blocks; any such key is rejected as unknown.
const EVIDENCE_ENTRY_KEYS = ["dimension", "status", "evidenceRef"] as const;

function validateEvidenceEntries(
  errors: string[],
  input: Record<string, unknown>,
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
    if (seen.has(dimension)) {
      errors.push(`duplicate evidence dimension: ${dimension}`);
    }
    seen.add(dimension);
    if (typeof raw.status !== "string" ||
        !(VARIANCE_EVIDENCE_STATUSES as readonly string[]).includes(raw.status)) {
      errors.push(
        `${path} status is out of range (NOT_APPLICABLE is a policy decision, never an evidence status): ${String(raw.status)}`,
      );
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
/* Applicability policy validation                                     */
/* ------------------------------------------------------------------ */

const POLICY_INPUT_KEYS = [
  "schemaVersion",
  "templateId",
  "templateVersion",
  "applicabilities",
] as const;
const APPLICABILITY_ENTRY_KEYS = [
  "dimension",
  "applicability",
  "bound",
  "authorityRef",
] as const;

/**
 * Validate one untrusted applicability policy object. Fail-closed:
 * complete full-registry coverage, unique dimensions, known statuses,
 * justified exemptions, structurally sound bounds, executable-content-free
 * free-form strings. The returned policy is deeply frozen; inputs are never
 * mutated.
 */
export function validateTemplateApplicabilityPolicy(
  input: unknown,
): ValidationResult<TemplateApplicabilityPolicy> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["applicability policy must be an object"] };
  }
  pushUnknownKeys(errors, "applicability policy", input, POLICY_INPUT_KEYS);
  validateIdentity(errors, "applicability policy", input);

  const classified = new Map<string, TemplateDimensionApplicability>();
  if (!Array.isArray(input.applicabilities)) {
    errors.push("applicability policy applicabilities must be an array");
  } else {
    for (const raw of input.applicabilities) {
      if (!isRecord(raw)) {
        errors.push("applicability entries must be objects");
        continue;
      }
      pushUnknownKeys(errors, "applicability", raw, APPLICABILITY_ENTRY_KEYS);
      const path = `applicability (${String(raw.dimension)})`;
      if (!pushDimensionError(errors, path, raw.dimension)) continue;
      const dimension = raw.dimension as TemplateVarianceDimension;
      if (classified.has(dimension)) {
        errors.push(`duplicate applicability dimension: ${dimension}`);
        continue;
      }
      if (typeof raw.applicability !== "string" ||
          !(APPLICABILITY_STATUSES as readonly string[]).includes(raw.applicability)) {
        errors.push(`${path} applicability is out of range: ${String(raw.applicability)}`);
        continue;
      }
      let authorityRef: string | undefined;
      if (raw.authorityRef !== undefined) {
        if (!isNonEmptyString(raw.authorityRef)) {
          errors.push(`${path} authorityRef must be a non-empty string when present`);
        } else {
          checkExecutable(errors, `${path} authorityRef`, raw.authorityRef);
          authorityRef = raw.authorityRef;
        }
      }
      if (raw.applicability === "EXEMPT_NOT_APPLICABLE" && authorityRef === undefined) {
        errors.push(
          `${path} EXEMPT_NOT_APPLICABLE requires an authorityRef justification`,
        );
      }
      let bound: TemplateVarianceBound | undefined;
      if (raw.bound !== undefined) {
        const before = errors.length;
        validateBound(errors, path, raw.bound);
        if (errors.length === before) {
          bound = Object.freeze({ ...(raw.bound as TemplateVarianceBound) });
        }
      }
      classified.set(dimension, Object.freeze({
        dimension,
        applicability: raw.applicability as ApplicabilityStatus,
        ...(bound === undefined ? {} : { bound }),
        ...(authorityRef === undefined ? {} : { authorityRef }),
      }));
    }
    // Full-registry coverage: a partial policy would leave applicability
    // decisions implicit — the exact smuggling vector being closed here.
    for (const dimension of TEMPLATE_VARIANCE_DIMENSIONS) {
      if (!classified.has(dimension)) {
        errors.push(
          `applicability policy is missing coverage for dimension: ${dimension}`,
        );
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const ordered: TemplateDimensionApplicability[] = [];
  for (const dimension of TEMPLATE_VARIANCE_DIMENSIONS) {
    ordered.push(classified.get(dimension) as TemplateDimensionApplicability);
  }
  const policy: TemplateApplicabilityPolicy = Object.freeze({
    schemaVersion: input.schemaVersion as PromotionReadinessSchemaVersion,
    templateId: input.templateId as string,
    templateVersion: input.templateVersion as string,
    applicabilities: Object.freeze(ordered),
  });
  return { ok: true, value: policy };
}

/* ------------------------------------------------------------------ */
/* Readiness evaluation                                                */
/* ------------------------------------------------------------------ */

function sortedDimensions(dimensions: Iterable<string>): readonly TemplateVarianceDimension[] {
  return Object.freeze([...dimensions].sort() as TemplateVarianceDimension[]);
}

/**
 * Compute template promotion readiness against the FIXED authority gate.
 *
 * `ready` is true only when all sixteen #142 §9 dimensions carry explicit
 * PROVEN evidence. An optional already-untrusted applicability policy may be
 * supplied; it is revalidated here (never trusted as a priori truth), must
 * pin the identical template identity, and can only CLASSIFY unproven
 * dimensions as exempt — it can never reduce the gate, add evidence, or set
 * `ready`.
 */
export function evaluateTemplatePromotionReadiness(
  input: unknown,
  applicabilityPolicy?: unknown,
): ValidationResult<TemplatePromotionReadiness> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["promotion evidence must be an object"] };
  }
  pushUnknownKeys(errors, "promotion evidence", input, EVIDENCE_INPUT_KEYS);
  validateIdentity(errors, "promotion evidence", input);
  validateEvidenceEntries(errors, input);

  let policy: TemplateApplicabilityPolicy | undefined;
  if (applicabilityPolicy !== undefined) {
    const policyResult = validateTemplateApplicabilityPolicy(applicabilityPolicy);
    if (!policyResult.ok) {
      errors.push(...policyResult.errors);
    } else {
      policy = policyResult.value;
      if (policy.templateId !== input.templateId ||
          policy.templateVersion !== input.templateVersion) {
        errors.push(
          `bound applicability policy identity (${policy.templateId}@${policy.templateVersion}) does not match the evaluated evidence (${String(input.templateId)}@${String(input.templateVersion)})`,
        );
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const proven = new Set<string>();
  const unproven = new Set<string>();
  for (const dimension of TEMPLATE_VARIANCE_DIMENSIONS) {
    unproven.add(dimension);
  }
  for (const raw of input.evidence as readonly unknown[]) {
    const entry = raw as Record<string, unknown>;
    if (typeof entry.dimension !== "string" || typeof entry.status !== "string") {
      continue;
    }
    if (entry.status === "PROVEN") {
      proven.add(entry.dimension);
      unproven.delete(entry.dimension);
    }
  }

  const exempted = new Set<string>();
  if (policy) {
    for (const entry of policy.applicabilities) {
      if (entry.applicability === "EXEMPT_NOT_APPLICABLE" && unproven.has(entry.dimension)) {
        exempted.add(entry.dimension);
      }
    }
  }

  const unprovenSorted = sortedDimensions(unproven);
  const readiness: TemplatePromotionReadiness = Object.freeze({
    templateId: input.templateId as string,
    templateVersion: input.templateVersion as string,
    ready: unprovenSorted.length === 0,
    provenDimensions: sortedDimensions(proven),
    unprovenDimensions: unprovenSorted,
    applicableUnprovenDimensions: sortedDimensions(
      [...unproven].filter((dimension) => !exempted.has(dimension)),
    ),
    exemptedUnprovenDimensions: sortedDimensions(exempted),
    policyBound: policy !== undefined,
  });
  return { ok: true, value: readiness };
}
