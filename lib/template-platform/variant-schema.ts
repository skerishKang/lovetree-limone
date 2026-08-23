/**
 * Template Platform — multi-variant layer (Issue #142 D8, Refs #344).
 *
 * Pure types only. No React, no DOM, no DB/API/Auth, no persistence semantics,
 * no canonical product adoption, no real template promotion.
 *
 * Owner decision (#344, 2026-08-23): validated alternatives (A/B variants,
 * versions, themes) are user-selectable options under one template family —
 * NOT a single canonical pick. This schema expresses that structure.
 *
 * Fail-closed rules encoded here and enforced in `validate-variants.ts`:
 *   - a variant status must be explicit; unknown/missing status is never
 *     treated as selectable
 *   - `USER_SELECTABLE` is reachable only by explicit promotion; unproven
 *     primitives can never back it
 *   - a selection is data (familyId + selectedVariantId), never code
 */

import type {
  RequiredPrimitive,
  SourceProvenanceRef,
  TemplateInstance,
} from "./schema";

export const VARIANT_SCHEMA_VERSION = 1 as const;
export type VariantSchemaVersion = typeof VARIANT_SCHEMA_VERSION;

/* ------------------------------------------------------------------ */
/* Variant lifecycle / eligibility status                              */
/* ------------------------------------------------------------------ */

/**
 * Explicit eligibility of a variant. Absent or unrecognized states are
 * validation errors — never inferred to be selectable.
 *
 * - `EVIDENCE_ONLY`    — source/evidence record only; not usable at runtime.
 * - `VALIDATED`        — contract + primitive readiness proven; still not
 *                        exposed to users until explicitly promoted.
 * - `USER_SELECTABLE`  — explicitly promoted; the ONLY status a selection
 *                        may reference.
 */
export const TEMPLATE_VARIANT_STATUSES = [
  "EVIDENCE_ONLY",
  "VALIDATED",
  "USER_SELECTABLE",
] as const;
export type TemplateVariantStatus = (typeof TEMPLATE_VARIANT_STATUSES)[number];

/** The only status a user selection may legally reference (fail closed). */
export const SELECTABLE_VARIANT_STATUS: TemplateVariantStatus =
  "USER_SELECTABLE";

/* ------------------------------------------------------------------ */
/* TemplateVariant                                                     */
/* ------------------------------------------------------------------ */

export interface TemplateVariantCompatibility {
  /** Accepted base TemplateDefinition versions (semver, inclusive). */
  minBaseTemplateVersion?: string;
  maxBaseTemplateVersion?: string;
  migrationNote?: string;
}

/**
 * One approved alternative inside a template family: an A/B candidate, a
 * version alternative, or a themed revision of the same experience mechanic.
 *
 * `baseTemplateId`/`baseTemplateVersion` pin the exact TemplateDefinition
 * identity this variant realizes. Provenance stays SOURCE_REFERENCE_ONLY.
 */
export interface TemplateVariant {
  schemaVersion: VariantSchemaVersion;
  /** Stable variant identity within its family, e.g. "orbit-a". */
  variantId: string;
  /** Owning template family, e.g. "orbit-gallery". */
  familyId: string;
  label: string;
  description?: string;
  /** Base TemplateDefinition this variant realizes (exact identity). */
  baseTemplateId: string;
  baseTemplateVersion: string;
  /** Source Lineage/Revision provenance — reference only, never runtime config. */
  sourceProvenanceRef: SourceProvenanceRef;
  status: TemplateVariantStatus;
  /** Optional bounded theme token, e.g. "midnight" | "daylight". */
  themeIdentity?: string;
  /** Additional required reusable ExperienceCapability ids beyond the base definition. */
  requiredCapabilities: readonly string[];
  /** Additional required runtime primitives with explicit declared readiness. */
  requiredPrimitives: readonly RequiredPrimitive[];
  compatibility?: TemplateVariantCompatibility;
}

/* ------------------------------------------------------------------ */
/* TemplateVariantFamily                                               */
/* ------------------------------------------------------------------ */

/**
 * One template family holding MULTIPLE approved variants. Existence of
 * several variants implies no canonical choice — eligibility is per-variant,
 * via each variant's explicit `status`.
 */
export interface TemplateVariantFamily {
  schemaVersion: VariantSchemaVersion;
  /** Stable family identity, e.g. "orbit-gallery". */
  familyId: string;
  label: string;
  description?: string;
  variants: readonly TemplateVariant[];
}

/* ------------------------------------------------------------------ */
/* Selection + variant-bound instance                                  */
/* ------------------------------------------------------------------ */

/**
 * The user-facing selection itself: DATA ONLY (two stable ids).
 */
export interface TemplateVariantSelection {
  familyId: string;
  selectedVariantId: string;
}

/**
 * A TemplateInstance bound through a variant selection. Everything except
 * the two selection ids is validated by the existing instance validator.
 */
export interface VariantBoundTemplateInstance
  extends TemplateInstance,
    TemplateVariantSelection {}

/**
 * Shared readiness gate (mirrors the #184 definition rule): every DECLARED
 * primitive must be CONSUMER_PROVEN. Vacuously true when none are declared.
 */
export function allPrimitivesProven(
  requiredPrimitives: readonly RequiredPrimitive[],
): boolean {
  return requiredPrimitives.every(
    (primitive) => primitive.readiness === "CONSUMER_PROVEN",
  );
}
