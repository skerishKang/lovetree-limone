/**
 * Template Platform — first declarative, versioned schema (Issue #184, Refs #142).
 *
 * Pure types only. No React, no DOM, no DB/API/Auth, no persistence semantics,
 * no canonical product adoption. Template data is DATA, never executable
 * content: instances carry safe canonical id / media / copy / bounded option
 * bindings only.
 *
 * Every template property must carry an explicit policy classification — a
 * property with no classification is a validation error (fail closed).
 *
 * Runtime primitive readiness must never be promoted without proof: a
 * TemplateDefinition may only reach `VALIDATED` when every required primitive
 * is declared `CONSUMER_PROVEN` (see `validate.ts`).
 */

export const TEMPLATE_SCHEMA_VERSION = 1 as const;
export type TemplateSchemaVersion = typeof TEMPLATE_SCHEMA_VERSION;

/* ------------------------------------------------------------------ */
/* Property policy classification (#142 mandatory enum)               */
/* ------------------------------------------------------------------ */

export const PROPERTY_POLICIES = [
  "USER_BINDABLE",
  "USER_CONFIGURABLE",
  "TEMPLATE_LOCKED",
  "PRODUCT_POLICY",
  "SOURCE_REFERENCE_ONLY",
] as const;
export type PropertyPolicy = (typeof PROPERTY_POLICIES)[number];

/** A property may only receive instance bindings when user-facing. */
export const BINDABLE_POLICIES: readonly PropertyPolicy[] = [
  "USER_BINDABLE",
  "USER_CONFIGURABLE",
];

/* ------------------------------------------------------------------ */
/* Rendering classification                                           */
/* ------------------------------------------------------------------ */

export const RENDERING_TIERS = [
  "dom-2d",
  "css3d-dom",
  "sprite-2.5d",
  "webgl",
] as const;
export type RenderingTier = (typeof RENDERING_TIERS)[number];

/* ------------------------------------------------------------------ */
/* Runtime primitive readiness (fail-closed promotion)                */
/* ------------------------------------------------------------------ */

export const RUNTIME_PRIMITIVE_IDS = [
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "P7",
  "P8",
  "P9",
] as const;
export type RuntimePrimitiveId = (typeof RUNTIME_PRIMITIVE_IDS)[number];

/**
 * Declared readiness of a runtime primitive (Issue #141 P1–P9).
 * - `HOLD`            — not globally extracted; consumer-local or unimplemented.
 * - `CORE_EXTRACTED`  — pure core merged on main; consumer wiring not proven.
 * - `CONSUMER_PROVEN` — core + first canonical consumer wiring merged.
 *
 * A source page or a local duplicate is NEVER sufficient to declare
 * `CONSUMER_PROVEN`.
 */
export const PRIMITIVE_READINESS_STATES = [
  "HOLD",
  "CORE_EXTRACTED",
  "CONSUMER_PROVEN",
] as const;
export type PrimitiveReadiness = (typeof PRIMITIVE_READINESS_STATES)[number];

export interface RequiredPrimitive {
  id: RuntimePrimitiveId;
  readiness: PrimitiveReadiness;
}

/* ------------------------------------------------------------------ */
/* Template lifecycle / readiness status                              */
/* ------------------------------------------------------------------ */

export const TEMPLATE_LIFECYCLE_STATUSES = [
  "DRAFT",
  "HOLD",
  "VALIDATED",
  "RETIRED",
] as const;
export type TemplateLifecycleStatus = (typeof TEMPLATE_LIFECYCLE_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Typed slots                                                        */
/* ------------------------------------------------------------------ */

export const DATA_SLOT_TYPES = [
  "moment",
  "momentCollection",
  "person",
  "personCollection",
  "connectionCollection",
  "treeSummary",
] as const;
export type DataSlotType = (typeof DATA_SLOT_TYPES)[number];

export const MEDIA_SLOT_TYPES = [
  "portrait",
  "photo",
  "videoPoster",
  "angleFrameSet",
  "expressionFrameSet",
  "backgroundHero",
] as const;
export type MediaSlotType = (typeof MEDIA_SLOT_TYPES)[number];

export const COPY_SLOT_TYPES = [
  "title",
  "subtitle",
  "chapterLabel",
  "userNote",
  "ctaLabel",
] as const;
export type CopySlotType = (typeof COPY_SLOT_TYPES)[number];

export const VISUAL_TOKEN_TYPES = [
  "accent",
  "materialVariant",
  "backgroundTreatment",
  "typographyRole",
  "density",
] as const;
export type VisualTokenType = (typeof VISUAL_TOKEN_TYPES)[number];

/**
 * A template slot. Every slot MUST declare a `policy` classification;
 * missing/unknown policy is a validation error.
 *
 * - `data`      — canonical Tree/Moment/Person/Connection ids.
 * - `media`     — media refs permitted by the slot type.
 * - `copy`      — user text within a bounded length.
 * - `visualToken` — bounded enumerated token value.
 * - `option`    — bounded enumerated interaction option (USER_CONFIGURABLE).
 *
 * Only `USER_BINDABLE` / `USER_CONFIGURABLE` slots accept instance bindings.
 */
export type TemplateSlot =
  | {
      id: string;
      kind: "data";
      dataType: DataSlotType;
      policy: PropertyPolicy;
      required?: boolean;
      maxItems?: number;
    }
  | {
      id: string;
      kind: "media";
      mediaType: MediaSlotType;
      policy: PropertyPolicy;
      required?: boolean;
      maxItems?: number;
    }
  | {
      id: string;
      kind: "copy";
      copyType: CopySlotType;
      policy: PropertyPolicy;
      required?: boolean;
      maxLength?: number;
    }
  | {
      id: string;
      kind: "visualToken";
      tokenType: VisualTokenType;
      policy: PropertyPolicy;
      allowedValues: readonly string[];
    }
  | {
      id: string;
      kind: "option";
      policy: PropertyPolicy;
      allowedValues: readonly string[];
    };

/* ------------------------------------------------------------------ */
/* Constraints + compatibility                                        */
/* ------------------------------------------------------------------ */

export interface TemplateConstraints {
  /** User-supplied ordering of collection bindings — only when explicitly allowed. */
  orderingAllowed: boolean;
  /** Data-variance bounds for Moment/Person collection bindings. */
  minItems?: number;
  maxItems?: number;
}

export interface TemplateCompatibility {
  /** Accepted instance template versions (semver, inclusive). */
  minTemplateVersion?: string;
  maxTemplateVersion?: string;
  migrationNote?: string;
}

/* ------------------------------------------------------------------ */
/* Source provenance reference                                        */
/* ------------------------------------------------------------------ */

export interface SourceProvenanceRef {
  /** design-intake manifest stableId (SOURCE_REFERENCE_ONLY — never runtime config). */
  manifestStableId: string;
  revisionLabel: string;
}

/* ------------------------------------------------------------------ */
/* TemplateDefinition                                                 */
/* ------------------------------------------------------------------ */

export interface TemplateDefinition {
  schemaVersion: TemplateSchemaVersion;
  /** Stable template identity, e.g. "moment-orbit-gallery". */
  templateId: string;
  /** Semver of this definition, e.g. "0.1.0". */
  templateVersion: string;
  label: string;
  description?: string;
  /** design-lab scenario identity, e.g. "relationship-retrospective". */
  scenarioId: string;
  rendering: RenderingTier;
  /** Source Lineage/Revision provenance — reference only, never executable. */
  sourceProvenanceRef: SourceProvenanceRef;
  /** Required reusable ExperienceCapability ids (Issue #80 registry). */
  requiredCapabilities: readonly string[];
  /** Required runtime primitives with explicit declared readiness. */
  requiredPrimitives: readonly RequiredPrimitive[];
  slots: readonly TemplateSlot[];
  constraints: TemplateConstraints;
  compatibility: TemplateCompatibility;
  status: TemplateLifecycleStatus;
}

/* ------------------------------------------------------------------ */
/* TemplateInstance                                                   */
/* ------------------------------------------------------------------ */

/**
 * One user's bound data/configuration. DATA ONLY.
 *
 * `value` is a canonical id (data), a safe media ref (media), text (copy),
 * or an enumerated token value (visualToken/option). Never executable code.
 */
export interface TemplateInstanceBinding {
  slotId: string;
  value: string | readonly string[];
}

export interface TemplateInstance {
  templateId: string;
  templateVersion: string;
  /** Owning Tree context (canonical id). */
  treeId?: string;
  bindings: readonly TemplateInstanceBinding[];
  /**
   * User-selected order of collection bindings (slotIds).
   * Only permitted when `constraints.orderingAllowed === true`.
   */
  ordering?: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Shared semantic validation helpers (used by validate.ts + tests)   */
/* ------------------------------------------------------------------ */

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export function isSemver(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

/**
 * Compare two loose-semver strings. Returns -1/0/1.
 * Assumes both passed `isSemver`.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}
