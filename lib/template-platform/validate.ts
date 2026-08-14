/**
 * Template Platform — first fail-closed validator (Issue #184, Refs #142).
 *
 * Pure validation only. No React, no DOM, no DB/API/Auth, no persistence
 * semantics, no canonical product adoption. Inputs are untrusted data; every
 * violation is reported as an error string (never coerced, never guessed).
 *
 * Fail-closed rejections include:
 *   - unknown keys (definition, slot, constraints, compatibility, instance,
 *     binding) — a schema evolution must be explicit, not silently ignored
 *   - unknown templateId / templateVersion (instance must match the exact
 *     definition version it was validated against)
 *   - undeclared slot ids, duplicate slot ids, duplicate primitive ids,
 *     duplicate capability ids, duplicate bindings, duplicate collection
 *     values, duplicate ordering entries
 *   - type mismatches (string vs collection array per slot kind)
 *   - out-of-range enums (rendering tier, slot kinds, policies, status,
 *     primitive ids, readiness, visualToken/option allowedValues) and ranges
 *     (maxItems / maxLength / constraints min-max / compatibility min-max)
 *   - unauthorized ordering (orderingAllowed === false, or ordering entries
 *     that are not declared collection slots)
 *   - missing policy classification on any slot (every property must declare
 *     its policy — a property without classification is a validation error)
 *   - executable HTML/JS/CSS anywhere in the data layer: script/iframe/embed/
 *     object/style/svg/math/form tags, javascript:/vbscript:/data:text/html
 *     schemes, on* handler attributes
 *   - false primitive readiness promotion: a TemplateDefinition may only be
 *     VALIDATED when EVERY required primitive is CONSUMER_PROVEN
 *   - required slots that are not instance-bindable (a required slot must be
 *     USER_BINDABLE or USER_CONFIGURABLE — otherwise the definition is
 *     uninstantiable)
 *   - bindings on slots whose policy does not permit instance bindings
 *
 * `containsExecutableContent` is a data-layer boundary check, not a sanitizer:
 * template data must never CONTAIN executable tokens in the first place.
 */

import { EXPERIENCE_CAPABILITIES } from "../experience-capabilities";
import {
  BINDABLE_POLICIES,
  COPY_SLOT_TYPES,
  DATA_SLOT_TYPES,
  MEDIA_SLOT_TYPES,
  PROPERTY_POLICIES,
  PRIMITIVE_READINESS_STATES,
  RENDERING_TIERS,
  RUNTIME_PRIMITIVE_IDS,
  TEMPLATE_LIFECYCLE_STATUSES,
  TEMPLATE_SCHEMA_VERSION,
  VISUAL_TOKEN_TYPES,
  compareSemver,
  isSemver,
  type PropertyPolicy,
  type TemplateDefinition,
  type TemplateInstance,
  type TemplateSlot,
} from "./schema";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Data-layer executable-content boundary. Template data is DATA; any string
 * that carries an executable token is rejected fail-closed.
 */
const EXECUTABLE_CONTENT_PATTERN =
  /<\s*(script|iframe|embed|object|style|svg|math|form)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

export function containsExecutableContent(value: string): boolean {
  return EXECUTABLE_CONTENT_PATTERN.test(value);
}

function checkExecutable(errors: string[], path: string, value: string): void {
  if (containsExecutableContent(value)) {
    errors.push(`${path} contains executable content (rejected fail-closed)`);
  }
}

const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const COLLECTION_DATA_TYPES = new Set([
  "momentCollection",
  "personCollection",
  "connectionCollection",
]);
const COLLECTION_MEDIA_TYPES = new Set(["angleFrameSet", "expressionFrameSet"]);

function isCollectionSlot(slot: TemplateSlot): boolean {
  if (slot.kind === "data") return COLLECTION_DATA_TYPES.has(slot.dataType);
  if (slot.kind === "media") return COLLECTION_MEDIA_TYPES.has(slot.mediaType);
  return false;
}

/** `required` exists only on data/media/copy slot variants. */
function isRequiredSlot(slot: TemplateSlot): boolean {
  return "required" in slot && slot.required === true;
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

/* ------------------------------------------------------------------ */
/* TemplateDefinition                                                 */
/* ------------------------------------------------------------------ */

const DEFINITION_KEYS = [
  "schemaVersion",
  "templateId",
  "templateVersion",
  "label",
  "description",
  "scenarioId",
  "rendering",
  "sourceProvenanceRef",
  "requiredCapabilities",
  "requiredPrimitives",
  "slots",
  "constraints",
  "compatibility",
  "status",
] as const;

const SOURCE_PROVENANCE_KEYS = ["manifestStableId", "revisionLabel"] as const;
const REQUIRED_PRIMITIVE_KEYS = ["id", "readiness"] as const;
const CONSTRAINT_KEYS = ["orderingAllowed", "minItems", "maxItems"] as const;
const COMPATIBILITY_KEYS = [
  "minTemplateVersion",
  "maxTemplateVersion",
  "migrationNote",
] as const;

function validateSlot(errors: string[], path: string, raw: unknown): TemplateSlot | undefined {
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  if (!isNonEmptyString(raw.id) || !KEBAB_PATTERN.test(raw.id)) {
    errors.push(`${path} id must be a non-empty kebab-case string`);
  }
  const slotId = typeof raw.id === "string" ? raw.id : "<unknown>";
  if (!(typeof raw.kind === "string")) {
    errors.push(`${path} (${slotId}) is missing a kind`);
    return undefined;
  }
  // Missing/unknown policy classification is a hard fail-closed error.
  if (typeof raw.policy !== "string" || !(PROPERTY_POLICIES as readonly string[]).includes(raw.policy)) {
    errors.push(`${path} (${slotId}) is missing a valid policy classification`);
  }
  if (raw.required !== undefined && typeof raw.required !== "boolean") {
    errors.push(`${path} (${slotId}) required must be a boolean`);
  }
  if (raw.maxItems !== undefined && !isPositiveInteger(raw.maxItems)) {
    errors.push(`${path} (${slotId}) maxItems must be a positive integer`);
  }
  if (raw.maxLength !== undefined && !isPositiveInteger(raw.maxLength)) {
    errors.push(`${path} (${slotId}) maxLength must be a positive integer`);
  }

  switch (raw.kind) {
    case "data": {
      pushUnknownKeys(errors, `${path} (${slotId})`, raw, ["id", "kind", "dataType", "policy", "required", "maxItems"]);
      if (typeof raw.dataType !== "string" || !(DATA_SLOT_TYPES as readonly string[]).includes(raw.dataType)) {
        errors.push(`${path} (${slotId}) dataType is out of range: ${String(raw.dataType)}`);
      }
      break;
    }
    case "media": {
      pushUnknownKeys(errors, `${path} (${slotId})`, raw, ["id", "kind", "mediaType", "policy", "required", "maxItems"]);
      if (typeof raw.mediaType !== "string" || !(MEDIA_SLOT_TYPES as readonly string[]).includes(raw.mediaType)) {
        errors.push(`${path} (${slotId}) mediaType is out of range: ${String(raw.mediaType)}`);
      }
      break;
    }
    case "copy": {
      pushUnknownKeys(errors, `${path} (${slotId})`, raw, ["id", "kind", "copyType", "policy", "required", "maxLength"]);
      if (typeof raw.copyType !== "string" || !(COPY_SLOT_TYPES as readonly string[]).includes(raw.copyType)) {
        errors.push(`${path} (${slotId}) copyType is out of range: ${String(raw.copyType)}`);
      }
      break;
    }
    case "visualToken": {
      pushUnknownKeys(errors, `${path} (${slotId})`, raw, ["id", "kind", "tokenType", "policy", "allowedValues"]);
      if (typeof raw.tokenType !== "string" || !(VISUAL_TOKEN_TYPES as readonly string[]).includes(raw.tokenType)) {
        errors.push(`${path} (${slotId}) tokenType is out of range: ${String(raw.tokenType)}`);
      }
      if (!Array.isArray(raw.allowedValues) || raw.allowedValues.length === 0 ||
          !raw.allowedValues.every((v) => isNonEmptyString(v))) {
        errors.push(`${path} (${slotId}) allowedValues must be a non-empty array of strings`);
      }
      break;
    }
    case "option": {
      pushUnknownKeys(errors, `${path} (${slotId})`, raw, ["id", "kind", "policy", "allowedValues"]);
      if (!Array.isArray(raw.allowedValues) || raw.allowedValues.length === 0 ||
          !raw.allowedValues.every((v) => isNonEmptyString(v))) {
        errors.push(`${path} (${slotId}) allowedValues must be a non-empty array of strings`);
      }
      break;
    }
    default:
      errors.push(`${path} (${slotId}) kind is out of range: ${String(raw.kind)}`);
      return undefined;
  }
  return raw as unknown as TemplateSlot;
}

export function validateDefinition(input: unknown): ValidationResult<TemplateDefinition> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["definition must be an object"] };
  }
  pushUnknownKeys(errors, "definition", input, DEFINITION_KEYS);

  if (input.schemaVersion !== TEMPLATE_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${TEMPLATE_SCHEMA_VERSION} (got ${String(input.schemaVersion)})`,
    );
  }

  if (!isNonEmptyString(input.templateId) || !KEBAB_PATTERN.test(input.templateId)) {
    errors.push("templateId must be a non-empty kebab-case string");
  } else {
    checkExecutable(errors, "templateId", input.templateId);
  }

  if (!isNonEmptyString(input.templateVersion) || !isSemver(input.templateVersion)) {
    errors.push(`templateVersion must be a semver string (got ${String(input.templateVersion)})`);
  }

  if (!isNonEmptyString(input.label)) {
    errors.push("label must be a non-empty string");
  } else {
    checkExecutable(errors, "label", input.label);
  }
  if (input.description !== undefined && !isNonEmptyString(input.description)) {
    errors.push("description must be a non-empty string");
  } else if (typeof input.description === "string") {
    checkExecutable(errors, "description", input.description);
  }

  if (!isNonEmptyString(input.scenarioId) || !KEBAB_PATTERN.test(input.scenarioId)) {
    errors.push("scenarioId must be a non-empty kebab-case string");
  } else {
    checkExecutable(errors, "scenarioId", input.scenarioId);
  }

  if (typeof input.rendering !== "string" || !(RENDERING_TIERS as readonly string[]).includes(input.rendering)) {
    errors.push(`rendering is out of range: ${String(input.rendering)}`);
  }

  // Source provenance — reference only, never executable, never runtime config.
  if (!isRecord(input.sourceProvenanceRef)) {
    errors.push("sourceProvenanceRef must be an object");
  } else {
    pushUnknownKeys(errors, "sourceProvenanceRef", input.sourceProvenanceRef, SOURCE_PROVENANCE_KEYS);
    if (!isNonEmptyString(input.sourceProvenanceRef.manifestStableId)) {
      errors.push("sourceProvenanceRef.manifestStableId must be a non-empty string");
    } else {
      checkExecutable(errors, "sourceProvenanceRef.manifestStableId", input.sourceProvenanceRef.manifestStableId);
    }
    if (!isNonEmptyString(input.sourceProvenanceRef.revisionLabel)) {
      errors.push("sourceProvenanceRef.revisionLabel must be a non-empty string");
    }
  }

  // Required capabilities — validated against the canonical ExperienceCapability registry.
  const registryIds = new Set<string>(EXPERIENCE_CAPABILITIES.map((c) => c.id));
  if (!Array.isArray(input.requiredCapabilities)) {
    errors.push("requiredCapabilities must be an array");
  } else {
    const seen = new Set<string>();
    for (const capability of input.requiredCapabilities) {
      if (!isNonEmptyString(capability)) {
        errors.push("requiredCapabilities entries must be non-empty strings");
        continue;
      }
      checkExecutable(errors, `requiredCapabilities[${capability}]`, capability);
      if (seen.has(capability)) {
        errors.push(`duplicate required capability id: ${capability}`);
      }
      seen.add(capability);
      if (!registryIds.has(capability)) {
        errors.push(`required capability id is not in the canonical registry: ${capability}`);
      }
    }
  }

  // Required primitives — declared readiness must be honest; VALIDATED is gated below.
  if (!Array.isArray(input.requiredPrimitives)) {
    errors.push("requiredPrimitives must be an array");
  } else {
    const seen = new Set<string>();
    for (const raw of input.requiredPrimitives) {
      if (!isRecord(raw)) {
        errors.push("requiredPrimitives entries must be objects");
        continue;
      }
      pushUnknownKeys(errors, "requiredPrimitives entry", raw, REQUIRED_PRIMITIVE_KEYS);
      const id = raw.id;
      if (typeof id !== "string" || !(RUNTIME_PRIMITIVE_IDS as readonly string[]).includes(id)) {
        errors.push(`requiredPrimitives id is out of range: ${String(id)}`);
        continue;
      }
      if (seen.has(id)) {
        errors.push(`duplicate required primitive id: ${id}`);
      }
      seen.add(id);
      if (typeof raw.readiness !== "string" ||
          !(PRIMITIVE_READINESS_STATES as readonly string[]).includes(raw.readiness)) {
        errors.push(`requiredPrimitives ${id} readiness is out of range: ${String(raw.readiness)}`);
      }
    }
  }

  // Typed slots.
  const slotIds = new Set<string>();
  if (!Array.isArray(input.slots)) {
    errors.push("slots must be an array");
  } else {
    for (const raw of input.slots) {
      const slot = validateSlot(errors, "slot", raw);
      if (slot && typeof slot.id === "string") {
        if (slotIds.has(slot.id)) {
          errors.push(`duplicate slot id: ${slot.id}`);
        }
        slotIds.add(slot.id);
        if (isRequiredSlot(slot) && !(BINDABLE_POLICIES as readonly PropertyPolicy[]).includes(slot.policy)) {
          errors.push(
            `slot ${slot.id} is required but its policy ${slot.policy} does not permit instance bindings`,
          );
        }
      }
    }
  }

  // Constraints.
  if (!isRecord(input.constraints)) {
    errors.push("constraints must be an object");
  } else {
    pushUnknownKeys(errors, "constraints", input.constraints, CONSTRAINT_KEYS);
    if (typeof input.constraints.orderingAllowed !== "boolean") {
      errors.push("constraints.orderingAllowed must be a boolean");
    }
    if (input.constraints.minItems !== undefined && !isPositiveInteger(input.constraints.minItems)) {
      errors.push("constraints.minItems must be a positive integer");
    }
    if (input.constraints.maxItems !== undefined && !isPositiveInteger(input.constraints.maxItems)) {
      errors.push("constraints.maxItems must be a positive integer");
    }
    if (typeof input.constraints.minItems === "number" && typeof input.constraints.maxItems === "number" &&
        input.constraints.minItems > input.constraints.maxItems) {
      errors.push("constraints.minItems must not exceed constraints.maxItems");
    }
  }

  // Compatibility / version info.
  if (!isRecord(input.compatibility)) {
    errors.push("compatibility must be an object");
  } else {
    pushUnknownKeys(errors, "compatibility", input.compatibility, COMPATIBILITY_KEYS);
    for (const key of ["minTemplateVersion", "maxTemplateVersion"] as const) {
      if (input.compatibility[key] !== undefined) {
        if (!isNonEmptyString(input.compatibility[key]) || !isSemver(input.compatibility[key])) {
          errors.push(`compatibility.${key} must be a semver string`);
        }
      }
    }
    if (isNonEmptyString(input.compatibility.minTemplateVersion) &&
        isNonEmptyString(input.compatibility.maxTemplateVersion) &&
        compareSemver(input.compatibility.minTemplateVersion, input.compatibility.maxTemplateVersion) > 0) {
      errors.push("compatibility.minTemplateVersion must not exceed maxTemplateVersion");
    }
    if (input.compatibility.migrationNote !== undefined &&
        !isNonEmptyString(input.compatibility.migrationNote)) {
      errors.push("compatibility.migrationNote must be a non-empty string");
    }
  }

  // Lifecycle / readiness status.
  if (typeof input.status !== "string" ||
      !(TEMPLATE_LIFECYCLE_STATUSES as readonly string[]).includes(input.status)) {
    errors.push(`status is out of range: ${String(input.status)}`);
  }

  // False primitive readiness promotion: VALIDATED requires every required
  // primitive to be CONSUMER_PROVEN. Never infer, never guess.
  if (input.status === "VALIDATED" && Array.isArray(input.requiredPrimitives)) {
    for (const raw of input.requiredPrimitives) {
      if (isRecord(raw) && typeof raw.id === "string" &&
          typeof raw.readiness === "string" && raw.readiness !== "CONSUMER_PROVEN") {
        errors.push(
          `status VALIDATED requires every required primitive to be CONSUMER_PROVEN; "${raw.id}" is declared ${raw.readiness}`,
        );
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as unknown as TemplateDefinition };
}

/* ------------------------------------------------------------------ */
/* TemplateInstance                                                   */
/* ------------------------------------------------------------------ */

const INSTANCE_KEYS = ["templateId", "templateVersion", "treeId", "bindings", "ordering"] as const;
const BINDING_KEYS = ["slotId", "value"] as const;

function pushBindingError(
  errors: string[],
  slotId: string,
  message: string,
): void {
  errors.push(`binding ${slotId}: ${message}`);
}

export function validateInstance(
  input: unknown,
  definition: TemplateDefinition,
): ValidationResult<TemplateInstance> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["instance must be an object"] };
  }
  pushUnknownKeys(errors, "instance", input, INSTANCE_KEYS);

  if (input.templateId !== definition.templateId) {
    errors.push(
      `instance templateId "${String(input.templateId)}" does not match definition "${definition.templateId}"`,
    );
  }
  if (input.templateVersion !== definition.templateVersion) {
    errors.push(
      `instance templateVersion "${String(input.templateVersion)}" does not match definition "${definition.templateVersion}"`,
    );
  }
  if (input.treeId !== undefined && !isNonEmptyString(input.treeId)) {
    errors.push("treeId must be a non-empty string");
  } else if (typeof input.treeId === "string") {
    checkExecutable(errors, "treeId", input.treeId);
  }

  const slotsById = new Map<string, TemplateSlot>();
  for (const slot of definition.slots) slotsById.set(slot.id, slot);
  const collectionSlotIds = new Set(
    definition.slots.filter(isCollectionSlot).map((slot) => slot.id),
  );

  if (!Array.isArray(input.bindings)) {
    errors.push("bindings must be an array");
  } else {
    const boundSlotIds = new Set<string>();
    for (const raw of input.bindings) {
      if (!isRecord(raw)) {
        errors.push("binding entries must be objects");
        continue;
      }
      pushUnknownKeys(errors, "binding", raw, BINDING_KEYS);
      const slotId = raw.slotId;
      if (!isNonEmptyString(slotId)) {
        errors.push("binding slotId must be a non-empty string");
        continue;
      }
      checkExecutable(errors, `binding ${slotId} slotId`, slotId);
      if (boundSlotIds.has(slotId)) {
        errors.push(`duplicate binding for slot: ${slotId}`);
      }
      boundSlotIds.add(slotId);

      const slot = slotsById.get(slotId);
      if (!slot) {
        errors.push(`binding references an undeclared slot: ${slotId}`);
        continue;
      }
      if (!(BINDABLE_POLICIES as readonly PropertyPolicy[]).includes(slot.policy)) {
        errors.push(
          `binding ${slotId}: slot policy ${slot.policy} does not permit instance bindings`,
        );
      }

      const value = raw.value;
      const values: string[] = [];
      switch (slot.kind) {
        case "data": {
          const isCollection = COLLECTION_DATA_TYPES.has(slot.dataType);
          if (isCollection) {
            if (!Array.isArray(value) || !value.every((v) => isNonEmptyString(v))) {
              pushBindingError(errors, slotId, `dataType ${slot.dataType} requires a non-empty array of strings`);
              break;
            }
            values.push(...value);
          } else {
            if (!isNonEmptyString(value)) {
              pushBindingError(errors, slotId, `dataType ${slot.dataType} requires a single non-empty string`);
              break;
            }
            values.push(value);
          }
          break;
        }
        case "media": {
          const isCollection = COLLECTION_MEDIA_TYPES.has(slot.mediaType);
          if (isCollection) {
            if (!Array.isArray(value) || !value.every((v) => isNonEmptyString(v))) {
              pushBindingError(errors, slotId, `mediaType ${slot.mediaType} requires a non-empty array of strings`);
              break;
            }
            values.push(...value);
          } else {
            if (!isNonEmptyString(value)) {
              pushBindingError(errors, slotId, `mediaType ${slot.mediaType} requires a single non-empty string`);
              break;
            }
            values.push(value);
          }
          break;
        }
        case "copy": {
          if (!isNonEmptyString(value)) {
            pushBindingError(errors, slotId, "copy requires a single non-empty string");
            break;
          }
          values.push(value);
          if (slot.maxLength !== undefined && value.length > slot.maxLength) {
            pushBindingError(errors, slotId, `copy exceeds maxLength ${slot.maxLength}`);
          }
          break;
        }
        case "visualToken":
        case "option": {
          if (!isNonEmptyString(value)) {
            pushBindingError(errors, slotId, `${slot.kind} requires a single non-empty string`);
            break;
          }
          values.push(value);
          if (!slot.allowedValues.includes(value)) {
            pushBindingError(
              errors,
              slotId,
              `value "${value}" is out of the allowed enum range [${slot.allowedValues.join(", ")}]`,
            );
          }
          break;
        }
      }

      // Executable content + duplicate value checks on every bound string.
      const seenValues = new Set<string>();
      for (const item of values) {
        checkExecutable(errors, `binding ${slotId}`, item);
        if (seenValues.has(item)) {
          pushBindingError(errors, slotId, `duplicate bound value: ${item}`);
        }
        seenValues.add(item);
      }

      // Range bounds: slot-level maxItems, then global constraints.
      if (slot.kind !== "copy" && slot.kind !== "visualToken" && slot.kind !== "option") {
        if (slot.maxItems !== undefined && values.length > slot.maxItems) {
          pushBindingError(errors, slotId, `exceeds slot maxItems ${slot.maxItems}`);
        }
        const minItems = definition.constraints.minItems;
        const maxItems = definition.constraints.maxItems;
        if (minItems !== undefined && values.length < minItems) {
          pushBindingError(errors, slotId, `below constraints.minItems ${minItems}`);
        }
        if (maxItems !== undefined && values.length > maxItems) {
          pushBindingError(errors, slotId, `exceeds constraints.maxItems ${maxItems}`);
        }
      }
    }

    // Required slots must be bound (required slots are guaranteed bindable by validateDefinition).
    for (const slot of definition.slots) {
      if (isRequiredSlot(slot) && !boundSlotIds.has(slot.id)) {
        errors.push(`missing required binding for slot: ${slot.id}`);
      }
    }
  }

  // Ordering — only when the template explicitly allows it, and only over
  // declared collection slots. The ordering must cover exactly the bound
  // collection slots (no partial/ambiguous ordering).
  if (input.ordering !== undefined) {
    if (!definition.constraints.orderingAllowed) {
      errors.push("ordering is not allowed by template constraints (orderingAllowed === false)");
    }
    if (!Array.isArray(input.ordering)) {
      errors.push("ordering must be an array of collection slot ids");
    } else {
      const seen = new Set<string>();
      for (const entry of input.ordering) {
        if (!isNonEmptyString(entry)) {
          errors.push("ordering entries must be non-empty strings");
          continue;
        }
        checkExecutable(errors, `ordering entry ${entry}`, entry);
        if (seen.has(entry)) errors.push(`duplicate ordering entry: ${entry}`);
        seen.add(entry);
        if (!collectionSlotIds.has(entry)) {
          errors.push(`ordering entry is not a declared collection slot: ${entry}`);
        }
      }
      const boundCollections = new Set(
        (Array.isArray(input.bindings) ? input.bindings : [])
          .filter((b) => isRecord(b) && typeof b.slotId === "string" && collectionSlotIds.has(b.slotId))
          .map((b) => (b as Record<string, unknown>).slotId as string),
      );
      for (const id of seen) {
        if (!boundCollections.has(id)) {
          errors.push(`ordering entry is not bound in this instance: ${id}`);
        }
      }
      for (const id of boundCollections) {
        if (!seen.has(id)) {
          errors.push(`bound collection slot is missing from ordering: ${id}`);
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as unknown as TemplateInstance };
}
