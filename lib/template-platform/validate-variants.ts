/**
 * Template Platform — multi-variant fail-closed validator (Issue #142 D8,
 * Refs #344).
 *
 * Pure validation only. No React, no DOM, no DB/API/Auth, no persistence
 * semantics, no canonical product adoption, no real template promotion.
 * Inputs are untrusted data; every violation is reported as an error string
 * (never coerced, never guessed).
 *
 * Fail-closed rejections include:
 *   - unknown keys (variant, family, compatibility, selection, bound instance)
 *   - unknown/missing variant status — an unrecognized state is NEVER treated
 *     as selectable; only the explicit `USER_SELECTABLE` status is selectable
 *   - duplicate variantId inside a family; variants whose familyId disagrees
 *     with their family; families with zero variants
 *   - false readiness promotion: `VALIDATED` and `USER_SELECTABLE` require
 *     every declared required primitive to be CONSUMER_PROVEN
 *   - executable HTML/JS/CSS tokens anywhere in the data layer (reuses the
 *     #184 boundary check)
 *   - a selection referencing an unknown variantId or a non-USER_SELECTABLE
 *     variant (EVIDENCE_ONLY / VALIDATED → rejected)
 *   - a bound instance whose template identity disagrees with its definition
 *     or with the selected variant's pinned base template identity
 */

import { EXPERIENCE_CAPABILITIES } from "../experience-capabilities";
import {
  containsExecutableContent,
  validateInstance,
  type ValidationResult,
} from "./validate";
import {
  SELECTABLE_VARIANT_STATUS,
  TEMPLATE_VARIANT_STATUSES,
  VARIANT_SCHEMA_VERSION,
  allPrimitivesProven,
  type TemplateVariant,
  type TemplateVariantFamily,
  type TemplateVariantSelection,
  type VariantBoundTemplateInstance,
} from "./variant-schema";
import {
  PRIMITIVE_READINESS_STATES,
  RUNTIME_PRIMITIVE_IDS,
  compareSemver,
  isSemver,
  type RequiredPrimitive,
  type TemplateDefinition,
} from "./schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/* ------------------------------------------------------------------ */
/* TemplateVariant                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_KEYS = [
  "schemaVersion",
  "variantId",
  "familyId",
  "label",
  "description",
  "baseTemplateId",
  "baseTemplateVersion",
  "sourceProvenanceRef",
  "status",
  "themeIdentity",
  "requiredCapabilities",
  "requiredPrimitives",
  "compatibility",
] as const;

const SOURCE_PROVENANCE_KEYS = ["manifestStableId", "revisionLabel"] as const;
const REQUIRED_PRIMITIVE_KEYS = ["id", "readiness"] as const;
const VARIANT_COMPATIBILITY_KEYS = [
  "minBaseTemplateVersion",
  "maxBaseTemplateVersion",
  "migrationNote",
] as const;

export function validateVariant(input: unknown): ValidationResult<TemplateVariant> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["variant must be an object"] };
  }
  pushUnknownKeys(errors, "variant", input, VARIANT_KEYS);

  if (input.schemaVersion !== VARIANT_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${VARIANT_SCHEMA_VERSION} (got ${String(input.schemaVersion)})`,
    );
  }

  for (const key of ["variantId", "familyId", "baseTemplateId"] as const) {
    const id = input[key];
    if (!isNonEmptyString(id) || !KEBAB_PATTERN.test(id)) {
      errors.push(`variant ${key} must be a non-empty kebab-case string`);
    } else {
      checkExecutable(errors, `variant ${key}`, id);
    }
  }

  if (!isNonEmptyString(input.baseTemplateVersion) || !isSemver(input.baseTemplateVersion)) {
    errors.push(
      `baseTemplateVersion must be a semver string (got ${String(input.baseTemplateVersion)})`,
    );
  }

  if (!isNonEmptyString(input.label)) {
    errors.push("variant label must be a non-empty string");
  } else {
    checkExecutable(errors, "variant label", input.label);
  }
  if (input.description !== undefined && !isNonEmptyString(input.description)) {
    errors.push("variant description must be a non-empty string");
  } else if (typeof input.description === "string") {
    checkExecutable(errors, "variant description", input.description);
  }

  // Source provenance — reference only.
  if (!isRecord(input.sourceProvenanceRef)) {
    errors.push("variant sourceProvenanceRef must be an object");
  } else {
    pushUnknownKeys(errors, "variant sourceProvenanceRef", input.sourceProvenanceRef, SOURCE_PROVENANCE_KEYS);
    for (const key of SOURCE_PROVENANCE_KEYS) {
      const entry = input.sourceProvenanceRef[key];
      if (!isNonEmptyString(entry)) {
        errors.push(`variant sourceProvenanceRef.${key} must be a non-empty string`);
      } else {
        checkExecutable(errors, `variant sourceProvenanceRef.${key}`, entry);
      }
    }
  }

  // Status — explicit or fail. Unknown/missing status is never selectable.
  if (typeof input.status !== "string" ||
      !(TEMPLATE_VARIANT_STATUSES as readonly string[]).includes(input.status)) {
    errors.push(
      `variant status is out of range (missing/unknown status is never selectable): ${String(input.status)}`,
    );
  }

  // Optional theme identity — bounded token only.
  if (input.themeIdentity !== undefined) {
    if (!isNonEmptyString(input.themeIdentity) || !KEBAB_PATTERN.test(input.themeIdentity)) {
      errors.push("variant themeIdentity must be a kebab-case string when present");
    } else {
      checkExecutable(errors, "variant themeIdentity", input.themeIdentity);
    }
  }

  // Additional capabilities — validated against the canonical registry.
  const registryIds = new Set<string>(EXPERIENCE_CAPABILITIES.map((c) => c.id));
  if (!Array.isArray(input.requiredCapabilities)) {
    errors.push("variant requiredCapabilities must be an array");
  } else {
    const seen = new Set<string>();
    for (const capability of input.requiredCapabilities) {
      if (!isNonEmptyString(capability)) {
        errors.push("variant requiredCapabilities entries must be non-empty strings");
        continue;
      }
      checkExecutable(errors, `variant requiredCapabilities[${capability}]`, capability);
      if (seen.has(capability)) {
        errors.push(`duplicate variant required capability id: ${capability}`);
      }
      seen.add(capability);
      if (!registryIds.has(capability)) {
        errors.push(`variant required capability id is not in the canonical registry: ${capability}`);
      }
    }
  }

  // Additional primitives — declared readiness must be honest; promotion gated below.
  if (!Array.isArray(input.requiredPrimitives)) {
    errors.push("variant requiredPrimitives must be an array");
  } else {
    const seen = new Set<string>();
    for (const raw of input.requiredPrimitives) {
      if (!isRecord(raw)) {
        errors.push("variant requiredPrimitives entries must be objects");
        continue;
      }
      pushUnknownKeys(errors, "variant requiredPrimitives entry", raw, REQUIRED_PRIMITIVE_KEYS);
      const id = raw.id;
      if (typeof id !== "string" || !(RUNTIME_PRIMITIVE_IDS as readonly string[]).includes(id)) {
        errors.push(`variant requiredPrimitives id is out of range: ${String(id)}`);
        continue;
      }
      if (seen.has(id)) {
        errors.push(`duplicate variant required primitive id: ${id}`);
      }
      seen.add(id);
      if (typeof raw.readiness !== "string" ||
          !(PRIMITIVE_READINESS_STATES as readonly string[]).includes(raw.readiness)) {
        errors.push(`variant requiredPrimitives ${id} readiness is out of range: ${String(raw.readiness)}`);
      }
    }
  }

  // Compatibility / version bounds.
  if (input.compatibility !== undefined) {
    if (!isRecord(input.compatibility)) {
      errors.push("variant compatibility must be an object when present");
    } else {
      pushUnknownKeys(errors, "variant compatibility", input.compatibility, VARIANT_COMPATIBILITY_KEYS);
      for (const key of ["minBaseTemplateVersion", "maxBaseTemplateVersion"] as const) {
        const bound = input.compatibility[key];
        if (bound !== undefined && (!isNonEmptyString(bound) || !isSemver(bound))) {
          errors.push(`variant compatibility.${key} must be a semver string`);
        }
      }
      const minBound = input.compatibility.minBaseTemplateVersion;
      const maxBound = input.compatibility.maxBaseTemplateVersion;
      if (typeof minBound === "string" && typeof maxBound === "string" &&
          isSemver(minBound) && isSemver(maxBound) &&
          compareSemver(minBound, maxBound) > 0) {
        errors.push("variant compatibility.minBaseTemplateVersion must not exceed maxBaseTemplateVersion");
      }
      const migrationNote = input.compatibility.migrationNote;
      if (migrationNote !== undefined && !isNonEmptyString(migrationNote)) {
        errors.push("variant compatibility.migrationNote must be a non-empty string");
      } else if (typeof migrationNote === "string") {
        checkExecutable(errors, "variant compatibility.migrationNote", migrationNote);
      }
    }
  }

  // False readiness promotion: both proven statuses require every declared
  // primitive to be CONSUMER_PROVEN. Never infer, never guess.
  if ((input.status === "VALIDATED" || input.status === "USER_SELECTABLE") &&
      Array.isArray(input.requiredPrimitives)) {
    const declared: RequiredPrimitive[] = [];
    for (const raw of input.requiredPrimitives) {
      if (isRecord(raw) && typeof raw.id === "string") {
        declared.push(raw as unknown as RequiredPrimitive);
      }
    }
    if (!allPrimitivesProven(declared)) {
      errors.push(
        `variant status ${input.status} requires every declared required primitive to be CONSUMER_PROVEN`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as unknown as TemplateVariant };
}

/* ------------------------------------------------------------------ */
/* TemplateVariantFamily                                               */
/* ------------------------------------------------------------------ */

const FAMILY_KEYS = [
  "schemaVersion",
  "familyId",
  "label",
  "description",
  "variants",
] as const;

export function validateVariantFamily(
  input: unknown,
): ValidationResult<TemplateVariantFamily> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["family must be an object"] };
  }
  pushUnknownKeys(errors, "family", input, FAMILY_KEYS);

  if (input.schemaVersion !== VARIANT_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${VARIANT_SCHEMA_VERSION} (got ${String(input.schemaVersion)})`,
    );
  }

  if (!isNonEmptyString(input.familyId) || !KEBAB_PATTERN.test(input.familyId)) {
    errors.push("family familyId must be a non-empty kebab-case string");
  } else {
    checkExecutable(errors, "family familyId", input.familyId);
  }

  if (!isNonEmptyString(input.label)) {
    errors.push("family label must be a non-empty string");
  } else {
    checkExecutable(errors, "family label", input.label);
  }
  if (input.description !== undefined && !isNonEmptyString(input.description)) {
    errors.push("family description must be a non-empty string");
  } else if (typeof input.description === "string") {
    checkExecutable(errors, "family description", input.description);
  }

  // A family exists to hold variants; zero variants cannot express the
  // multi-variant structure this contract exists for.
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    errors.push("family variants must be a non-empty array");
  } else {
    const seenVariantIds = new Set<string>();
    for (const raw of input.variants) {
      const result = validateVariant(raw);
      if (!result.ok) {
        errors.push(...result.errors);
        continue;
      }
      const variant = result.value;
      if (isNonEmptyString(input.familyId) && variant.familyId !== input.familyId) {
        errors.push(
          `variant "${variant.variantId}" declares familyId "${variant.familyId}" but is registered under "${String(input.familyId)}"`,
        );
      }
      if (seenVariantIds.has(variant.variantId)) {
        errors.push(`duplicate variantId in family: ${variant.variantId}`);
      }
      seenVariantIds.add(variant.variantId);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as unknown as TemplateVariantFamily };
}

/* ------------------------------------------------------------------ */
/* Selection + variant-bound instance                                  */
/* ------------------------------------------------------------------ */

const SELECTION_KEYS = ["familyId", "selectedVariantId"] as const;

export function validateVariantSelection(
  input: unknown,
  family: TemplateVariantFamily,
): ValidationResult<TemplateVariantSelection> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["selection must be an object"] };
  }
  pushUnknownKeys(errors, "selection", input, SELECTION_KEYS);

  if (input.familyId !== family.familyId) {
    errors.push(
      `selection familyId "${String(input.familyId)}" does not match family "${family.familyId}"`,
    );
    return { ok: false, errors };
  }

  const selectedVariantId = input.selectedVariantId;
  if (!isNonEmptyString(selectedVariantId)) {
    errors.push("selection selectedVariantId must be a non-empty string");
    return { ok: false, errors };
  }
  checkExecutable(errors, "selection selectedVariantId", selectedVariantId);

  const variant = family.variants.find((v) => v.variantId === selectedVariantId);
  if (!variant) {
    errors.push(
      `selectedVariantId does not exist in family "${family.familyId}": ${selectedVariantId}`,
    );
    return { ok: false, errors };
  }
  if (variant.status !== SELECTABLE_VARIANT_STATUS) {
    errors.push(
      `variant "${selectedVariantId}" is not user-selectable (status ${variant.status}); only explicitly promoted USER_SELECTABLE variants may be selected`,
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as unknown as TemplateVariantSelection };
}

const BOUND_INSTANCE_KEYS = [
  "templateId",
  "templateVersion",
  "treeId",
  "bindings",
  "ordering",
  "familyId",
  "selectedVariantId",
] as const;

/**
 * Validate one user instance bound through a variant selection:
 *   1. selection must resolve to an explicitly USER_SELECTABLE variant,
 *   2. the base instance shape is delegated to the existing #184 validator,
 *   3. the instance template identity must equal BOTH the definition identity
 *      AND the variant's pinned base template identity.
 */
export function validateVariantBoundInstance(
  input: unknown,
  family: TemplateVariantFamily,
  definition: TemplateDefinition,
): ValidationResult<VariantBoundTemplateInstance> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["instance must be an object"] };
  }
  pushUnknownKeys(errors, "instance", input, BOUND_INSTANCE_KEYS);

  // 1. Selection against the family.
  const selectionResult = validateVariantSelection(
    {
      familyId: input.familyId,
      selectedVariantId: input.selectedVariantId,
    },
    family,
  );
  if (!selectionResult.ok) {
    errors.push(...selectionResult.errors);
  } else {
    const variant = family.variants.find(
      (v) => v.variantId === input.selectedVariantId,
    ) as TemplateVariant | undefined;
    if (variant) {
      // 3. Cross-identity checks: definition ↔ variant ↔ instance.
      if (definition.templateId !== variant.baseTemplateId) {
        errors.push(
          `definition templateId "${definition.templateId}" does not match variant baseTemplateId "${variant.baseTemplateId}"`,
        );
      }
      if (definition.templateVersion !== variant.baseTemplateVersion) {
        errors.push(
          `definition templateVersion "${definition.templateVersion}" does not match variant baseTemplateVersion "${variant.baseTemplateVersion}"`,
        );
      }
    }
  }

  // 2. Base instance validation (existing fail-closed validator).
  const baseInstance = {
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    ...(input.treeId === undefined ? {} : { treeId: input.treeId }),
    bindings: input.bindings,
    ...(input.ordering === undefined ? {} : { ordering: input.ordering }),
  };
  const baseResult = validateInstance(baseInstance, definition);
  if (!baseResult.ok) {
    errors.push(...baseResult.errors);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: input as unknown as VariantBoundTemplateInstance,
  };
}
