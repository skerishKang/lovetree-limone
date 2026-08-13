/**
 * Design Intake Native Candidate Factory — typed declarative intake manifest.
 *
 * The manifest is repository-owned data. It is parsed from JSON (never executed):
 * source HTML/JS referenced by `provenance.sourceFiles` / `sourceArtifacts` is
 * evidence/reference only and is never loaded, imported or evaluated by the factory.
 *
 * Identity contract:
 * - `sourceTrackId` is the sibling intake track identity (e.g. "Track60").
 * - `designLineageId` is the repository Design Lineage identity (e.g. "lt-60-...").
 * - The two are completely separate identities. A source track number never
 *   implies the repository lineage number (Track55 ≠ Lineage 55, Track56 ≠ Lineage 56).
 *
 * Lineage reservation contract:
 * - classification and lineage-number reservation are separate states.
 * - `lineageReservation: ALLOCATED` (or an explicit `lineageNumber`) reserves the number.
 * - `lineageReservation: HOLD | PENDING` expresses a candidate that does NOT
 *   reserve a lineage number yet (e.g. Track62 V1.1).
 */

import { DESIGN_SCENARIOS } from "../design-lab";
import { EXPERIENCE_CAPABILITIES } from "../experience-capabilities";

export const INTAKE_SCHEMA_VERSION = 1 as const;

/* ------------------------------------------------------------------ */
/* Closed unions (classifications / lifecycle / rendering)            */
/* ------------------------------------------------------------------ */

export const INTAKE_CLASSIFICATIONS = [
  "NEW_LINEAGE",
  "EXISTING_LINEAGE_VARIANT",
  "CANONICAL_OWNER_CAPABILITY",
  "REFERENCE_CAPABILITY_ONLY",
] as const;
export type IntakeClassification = (typeof INTAKE_CLASSIFICATIONS)[number];

export const INTAKE_LIFECYCLES = [
  "INSTRUCTION_ACCEPTED",
  "REFERENCE_PINNED",
  "EXECUTABLE_PENDING",
  "EXECUTABLE_AVAILABLE",
  "ARTIFACTS_PARTIAL",
  "ARTIFACTS_COMPLETE",
  "EXECUTABLE_FINGERPRINT_PINNED",
] as const;
export type IntakeLifecycle = (typeof INTAKE_LIFECYCLES)[number];

/** Concrete rendering discriminators certify an actual candidate implementation. */
export const CONCRETE_RENDERING_DISCRIMINATORS = [
  "dom-2d",
  "sprite-2.5d",
  "css3d-dom",
  "canvas-3d-projection",
  "webgl",
] as const;
export type ConcreteRenderingDiscriminator = (typeof CONCRETE_RENDERING_DISCRIMINATORS)[number];

/**
 * `unresolved` is only valid in pre-executable states (no executable candidate
 * exists yet). An executable lifecycle must fail closed without a concrete
 * discriminator — never certify rendering before the executable exists.
 */
export const RENDERING_DISCRIMINATORS = [
  ...CONCRETE_RENDERING_DISCRIMINATORS,
  "unresolved",
] as const;
export type RenderingDiscriminator = (typeof RENDERING_DISCRIMINATORS)[number];

/* ------------------------------------------------------------------ */
/* Source artifacts (distinct from runtime exactAssets)               */
/* ------------------------------------------------------------------ */

export const SOURCE_ARTIFACT_STATUSES = [
  "PINNED",
  "REFERENCE_ONLY",
  "PENDING",
] as const;
export type SourceArtifactStatus = (typeof SOURCE_ARTIFACT_STATUSES)[number];

/**
 * Source evidence — separate from `exactAssets` (runtime-required binaries).
 * Drive file IDs are authoritative source identity; placeholders are rejected.
 */
export interface SourceArtifact {
  filename: string;
  driveId: string;
  bytes?: number;
  sha256?: string;
  gitBlobSha?: string;
  /** e.g. executable, reference-video, sibling-qa, instruction, implementation-note */
  role: string;
  status: SourceArtifactStatus;
}

/* ------------------------------------------------------------------ */
/* P8 exact-asset contract (runtime-required binaries)                */
/* ------------------------------------------------------------------ */

export const FINGERPRINT_STATUSES = [
  "FINGERPRINT_NONE",
  "FINGERPRINT_PARTIAL",
  "FINGERPRINT_COMPLETE",
] as const;
export type FingerprintStatus = (typeof FINGERPRINT_STATUSES)[number];

export const BINARY_TRANSFER_STATUSES = [
  "BINARY_TRANSFER_NONE",
  "BINARY_TRANSFER_PARTIAL",
  "BINARY_TRANSFER_COMPLETE",
] as const;
export type BinaryTransferStatus = (typeof BINARY_TRANSFER_STATUSES)[number];

export const EXACT_GATE_STATUSES = [
  "EXACT_GATE_PENDING",
  "EXACT_GATE_PASS",
  "EXACT_GATE_FAIL",
] as const;
export type ExactGateStatus = (typeof EXACT_GATE_STATUSES)[number];

export interface ExactAssetEntry {
  filename: string;
  /** Optional Drive file id of the source original (read-only reference). */
  driveId?: string;
  /** Optional byte length of the source original. */
  bytes?: number;
  /** Optional SHA-256 of the source original (hex). */
  sha256?: string;
  /** Optional Git blob SHA once the binary has been transferred into the repo. */
  gitBlobSha?: string;
  width?: number;
  height?: number;
  /** Asset encoding mode, e.g. "png", "jpg", "mp4", "html". */
  mode: string;
  /** Repository target path where the exact binary must land. */
  targetPath: string;
  /** Role of the asset inside the candidate, e.g. "canvas-background". */
  role: string;
  /** Rights status of the source original, e.g. "sibling-source-owned". */
  rightsStatus: string;
}

/**
 * The three exact-asset statuses are independent and must stay separated:
 *   FINGERPRINT_COMPLETE !== BINARY_TRANSFER_COMPLETE !== EXACT_GATE_PASS
 */
export interface ExactAssetGateState {
  fingerprintStatus: FingerprintStatus;
  binaryTransferStatus: BinaryTransferStatus;
  exactGateStatus: ExactGateStatus;
}

/* ------------------------------------------------------------------ */
/* Reuse-before-new-code metadata                                     */
/* ------------------------------------------------------------------ */

export const RUNTIME_PRIMITIVE_PATTERN = /^P[1-9]$/;

export type BackendScope = "BACKEND_FREE" | "BACKEND_DECISION_REQUIRED";

export interface SlotNotes {
  issue: "142";
  /** #142 template slot notes (data/media/copy slot expectations). */
  notes: readonly string[];
  /** Policy boundary — what must remain presentation state vs product data. */
  policyBoundary: readonly string[];
}

export interface FidelityTargetMetadata {
  validationClass: "source-fidelity" | "interaction-contract";
  label?: string;
}

/* ------------------------------------------------------------------ */
/* Lineage reservation + adoption state                               */
/* ------------------------------------------------------------------ */

export const LINEAGE_RESERVATION_STATUSES = [
  "ALLOCATED",
  "PENDING",
  "HOLD",
] as const;
export type LineageReservationStatus = (typeof LINEAGE_RESERVATION_STATUSES)[number];

export interface LineageReservation {
  status: LineageReservationStatus;
  note?: string;
}

export const ADOPTION_DECISIONS = [
  "ADOPT",
  "DO_NOT_ADOPT",
  "SOURCE_REFERENCE_ONLY",
  "PRODUCT_POLICY_REQUIRED",
  "UNDECIDED",
  "HOLD",
] as const;
export type AdoptionDecision = (typeof ADOPTION_DECISIONS)[number];

export interface AdoptionRecord {
  status: AdoptionDecision;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Navigation / handoff evidence                                      */
/* ------------------------------------------------------------------ */

export const NAVIGATION_HANDOFF_DIMENSIONS = [
  "targetMapping",
  "urlResolution",
  "openCall",
  "actualTargetOpen",
  "receiverConsume",
  "sameMomentFocus",
] as const;
export type NavigationHandoffDimension = (typeof NAVIGATION_HANDOFF_DIMENSIONS)[number];

/**
 * Handoff is not a single boolean: each dimension is independently recorded.
 * Track60/61 source QA required exactly this distinction.
 */
export type NavigationHandoffEvidence = Partial<
  Record<NavigationHandoffDimension, boolean>
>;

export const HANDOFF_RESOLUTION_STATUSES = ["MAPPING_HOLD", "RESOLVED"] as const;
export type HandoffResolutionStatus = (typeof HANDOFF_RESOLUTION_STATUSES)[number];

/**
 * Cross-namespace handoff mapping: source Track handoffs must resolve to stable
 * repository product targets, never source-local file paths. MAPPING_HOLD until
 * the target is authoritative (e.g. Track 61 handoffs to 55/56/59).
 */
export interface HandoffMapping {
  sourceTrackId: string;
  resolvedProductTargetId: string | null;
  resolutionStatus: HandoffResolutionStatus;
  handoffContext?: string;
}

/* ------------------------------------------------------------------ */
/* Derived / synthetic policy                                         */
/* ------------------------------------------------------------------ */

export interface DerivedDisplayValue {
  /** Displayed value, e.g. "Cluster", "Bridge Moment", "Recent". */
  value: string;
  kind: "VIEW_DERIVED";
  /** Derivation source, e.g. "cluster", "bridge-moment", "view-preset", "recent", "important", "resume". */
  source: string;
  canonicalProductPolicy: false;
  note?: string;
}

export interface SyntheticFixtureFlag {
  prototypeOnly: boolean;
  sourceDemoOnly: boolean;
}

/* ------------------------------------------------------------------ */
/* QA contract                                                        */
/* ------------------------------------------------------------------ */

export interface QaViewport {
  width: number;
  height: number;
  mobile?: boolean;
}

export interface QaContract {
  /** Desktop 1280×800 is required. Mobile 390×844 is required. Narrow 320×720 is optional. */
  viewports: readonly QaViewport[];
  reducedMotion: boolean;
  keyboardFocus: boolean;
  pointer: boolean;
  touch: boolean;
  horizontalOverflowZero: boolean;
  consoleErrorsZero: boolean;
  pageErrorsZero: boolean;
}

/* ------------------------------------------------------------------ */
/* Manifest shape                                                     */
/* ------------------------------------------------------------------ */

export interface IntakeProvenance {
  sourceLabel: string;
  driveFolderId?: string;
  sourceFiles: readonly string[];
  rightsStatus: string;
}

export interface IntakeReservation {
  /** True when the candidate is reserved but adoption/admission is held. */
  held: boolean;
  note?: string;
}

export interface IntakeRoute {
  /** Design Lab surface path, always under /design-lab/. */
  path: string;
  surface: "lineage" | "capability";
}

export interface DesignIntakeManifest {
  schemaVersion: typeof INTAKE_SCHEMA_VERSION;
  /** Stable repository identity for this intake, e.g. "track-60-3d-moment-cluster". */
  stableId: string;
  /** Sibling intake track identity, e.g. "Track60". Fully separate from designLineageId. */
  sourceTrackId: string;
  title: string;
  classification: IntakeClassification;
  lifecycle: IntakeLifecycle;
  /**
   * Optional. `unresolved` (or absence) is valid only in pre-executable states;
   * executable lifecycles require a concrete discriminator (fail closed).
   */
  rendering?: RenderingDiscriminator;
  scenarioId: string;
  productJob: string;
  summary: string;
  provenance: IntakeProvenance;
  /** Repository Design Lineage identity. Separate identity from sourceTrackId. */
  designLineageId?: string;
  /** Allocated repository lineage number (NEW_LINEAGE ALLOCATED only). */
  lineageNumber?: number;
  /** Repository revision id within the lineage. */
  revisionId?: string;
  /** Canonical product owner route (CANONICAL_OWNER_CAPABILITY only). Metadata only — never written by the factory. */
  ownerRoute?: string;
  route?: IntakeRoute;
  /** Adoption hold (product-level). Separate from lineage-number reservation. */
  reservation?: IntakeReservation;
  /** Lineage-number reservation state, separate from classification. */
  lineageReservation?: LineageReservation;
  /** Adoption decision metadata (authoritative disposition when recorded). */
  adoption?: AdoptionRecord;
  /* ---------------- source identity ---------------- */
  /** Source evidence artifacts (executables, reference videos, QA files, instructions). */
  sourceArtifacts?: readonly SourceArtifact[];
  /* ---------------- reuse-before-new-code ---------------- */
  /** Reusable ExperienceCapability ids (validated against lib/experience-capabilities.ts). */
  reusableCapabilities?: readonly string[];
  /** Reused runtime primitives P1–P9 (Issue #141). */
  runtimePrimitives?: readonly string[];
  /** Optional genuinely new primitive — never a P1–P9 id. */
  trulyNewPrimitive?: string;
  sourceDeltas?: readonly string[];
  sourceDefects?: readonly string[];
  nativeRemediations?: readonly string[];
  /** Source-only / fake demo values that must never become product truth. */
  sourceOnlyValues?: readonly string[];
  backendScope?: BackendScope;
  templateFamily?: string;
  slotNotes?: SlotNotes;
  fidelityTargetMetadata?: FidelityTargetMetadata;
  /** Cross-namespace handoff mapping evidence (source Track → stable target). */
  handoffMappings?: readonly HandoffMapping[];
  /** Visual-mechanic overlap that must NOT drive deduplication. */
  visualMechanicOverlap?: readonly string[];
  /** Product-job distinctness statement when visual overlap exists. */
  productJobDistinctness?: string;
  /* ---------------- P8 exact assets ---------------- */
  exactAssets?: readonly ExactAssetEntry[];
  exactAssetGate?: ExactAssetGateState;
  navigationHandoff?: NavigationHandoffEvidence;
  derivedDisplay?: readonly DerivedDisplayValue[];
  syntheticFixture?: SyntheticFixtureFlag;
  qa?: QaContract;
}

/* ------------------------------------------------------------------ */
/* Lifecycle helpers                                                  */
/* ------------------------------------------------------------------ */

export const EXECUTABLE_LIFECYCLES: readonly IntakeLifecycle[] = [
  "EXECUTABLE_AVAILABLE",
  "ARTIFACTS_PARTIAL",
  "ARTIFACTS_COMPLETE",
  "EXECUTABLE_FINGERPRINT_PINNED",
];

export function lifecycleImpliesExecutable(lifecycle: IntakeLifecycle): boolean {
  return EXECUTABLE_LIFECYCLES.includes(lifecycle);
}

/* ------------------------------------------------------------------ */
/* Validation                                                         */
/* ------------------------------------------------------------------ */

export class IntakeManifestError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`invalid design intake manifest:\n- ${problems.join("\n- ")}`);
    this.name = "IntakeManifestError";
    this.problems = problems;
  }
}

const STABLE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SOURCE_TRACK_PATTERN = /^Track\d+(\.\d+)?(\s+V\d+(\.\d+)?)?$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const GIT_BLOB_SHA_PATTERN = /^[0-9a-f]{40}$/i;
/** Authoritative Drive object ids: 25–44 base64url chars. Placeholders rejected. */
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{25,44}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string, problems: string[]): string {
  if (typeof value !== "string" || value.trim() === "") {
    problems.push(`${field} must be a non-empty string`);
    return "";
  }
  return value;
}

function expectOptionalString(value: unknown, field: string, problems: string[]): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    problems.push(`${field} must be a non-empty string when provided`);
    return undefined;
  }
  return value;
}

function expectOptionalNumber(value: unknown, field: string, problems: string[]): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    problems.push(`${field} must be a finite number when provided`);
    return undefined;
  }
  return value;
}

function expectEnum<T extends string>(
  value: unknown,
  allowlist: readonly T[],
  field: string,
  problems: string[],
): T | undefined {
  if (typeof value !== "string") {
    problems.push(`${field} must be one of: ${allowlist.join(", ")}`);
    return undefined;
  }
  if (!(allowlist as readonly string[]).includes(value)) {
    problems.push(`${field} must be one of: ${allowlist.join(", ")} (got '${value}')`);
    return undefined;
  }
  return value as T;
}

function parseStringList(
  raw: unknown,
  field: string,
  problems: string[],
): readonly string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push(`${field} must be an array`);
    return undefined;
  }
  const values: string[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      problems.push(`${field}[${index}] must be a non-empty string`);
      return;
    }
    values.push(entry);
  });
  return values;
}

function parseSourceArtifacts(raw: unknown, problems: string[]): readonly SourceArtifact[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push("sourceArtifacts must be an array");
    return undefined;
  }
  const artifacts: SourceArtifact[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      problems.push(`sourceArtifacts[${index}] must be an object`);
      return;
    }
    const prefix = `sourceArtifacts[${index}]`;
    const filename = expectString(entry.filename, `${prefix}.filename`, problems);
    const driveId = expectString(entry.driveId, `${prefix}.driveId`, problems);
    if (driveId && (!DRIVE_ID_PATTERN.test(driveId) || /example/i.test(driveId))) {
      problems.push(
        `${prefix}.driveId must be an authoritative Drive file id (25–44 base64url chars, no placeholders)`,
      );
    }
    const role = expectString(entry.role, `${prefix}.role`, problems);
    const status = expectEnum(entry.status, SOURCE_ARTIFACT_STATUSES, `${prefix}.status`, problems);
    const bytes = expectOptionalNumber(entry.bytes, `${prefix}.bytes`, problems);
    if (bytes !== undefined && (!Number.isInteger(bytes) || bytes <= 0)) {
      problems.push(`${prefix}.bytes must be a positive integer`);
    }
    let sha256: string | undefined;
    if (entry.sha256 !== undefined && entry.sha256 !== null) {
      sha256 = expectString(entry.sha256, `${prefix}.sha256`, problems);
      if (sha256 && !SHA256_PATTERN.test(sha256)) problems.push(`${prefix}.sha256 must be 64 hex chars`);
    }
    let gitBlobSha: string | undefined;
    if (entry.gitBlobSha !== undefined && entry.gitBlobSha !== null) {
      gitBlobSha = expectString(entry.gitBlobSha, `${prefix}.gitBlobSha`, problems);
      if (gitBlobSha && !GIT_BLOB_SHA_PATTERN.test(gitBlobSha)) {
        problems.push(`${prefix}.gitBlobSha must be 40 hex chars`);
      }
    }
    if (filename && driveId && role && status) {
      artifacts.push({ filename, driveId, bytes, sha256, gitBlobSha, role, status });
    }
  });
  return artifacts;
}

function parseExactAssetGate(raw: unknown, problems: string[]): ExactAssetGateState | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("exactAssetGate must be an object");
    return undefined;
  }
  const fingerprintStatus = expectEnum(
    raw.fingerprintStatus,
    FINGERPRINT_STATUSES,
    "exactAssetGate.fingerprintStatus",
    problems,
  );
  const binaryTransferStatus = expectEnum(
    raw.binaryTransferStatus,
    BINARY_TRANSFER_STATUSES,
    "exactAssetGate.binaryTransferStatus",
    problems,
  );
  const exactGateStatus = expectEnum(
    raw.exactGateStatus,
    EXACT_GATE_STATUSES,
    "exactAssetGate.exactGateStatus",
    problems,
  );
  if (!fingerprintStatus || !binaryTransferStatus || !exactGateStatus) return undefined;
  return { fingerprintStatus, binaryTransferStatus, exactGateStatus };
}

function parseExactAssets(raw: unknown, problems: string[]): readonly ExactAssetEntry[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push("exactAssets must be an array");
    return undefined;
  }
  const entries: ExactAssetEntry[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      problems.push(`exactAssets[${index}] must be an object`);
      return;
    }
    const prefix = `exactAssets[${index}]`;
    const filename = expectString(entry.filename, `${prefix}.filename`, problems);
    const mode = expectString(entry.mode, `${prefix}.mode`, problems);
    const targetPath = expectString(entry.targetPath, `${prefix}.targetPath`, problems);
    const role = expectString(entry.role, `${prefix}.role`, problems);
    const rightsStatus = expectString(entry.rightsStatus, `${prefix}.rightsStatus`, problems);

    const driveId = expectOptionalString(entry.driveId, `${prefix}.driveId`, problems);
    if (driveId && (!DRIVE_ID_PATTERN.test(driveId) || /example/i.test(driveId))) {
      problems.push(`${prefix}.driveId must be an authoritative Drive file id`);
    }
    const bytes = expectOptionalNumber(entry.bytes, `${prefix}.bytes`, problems);
    const width = expectOptionalNumber(entry.width, `${prefix}.width`, problems);
    const height = expectOptionalNumber(entry.height, `${prefix}.height`, problems);

    let sha256: string | undefined;
    if (entry.sha256 !== undefined && entry.sha256 !== null) {
      sha256 = expectString(entry.sha256, `${prefix}.sha256`, problems);
      if (sha256 && !SHA256_PATTERN.test(sha256)) problems.push(`${prefix}.sha256 must be 64 hex chars`);
    }
    let gitBlobSha: string | undefined;
    if (entry.gitBlobSha !== undefined && entry.gitBlobSha !== null) {
      gitBlobSha = expectString(entry.gitBlobSha, `${prefix}.gitBlobSha`, problems);
      if (gitBlobSha && !GIT_BLOB_SHA_PATTERN.test(gitBlobSha)) {
        problems.push(`${prefix}.gitBlobSha must be 40 hex chars`);
      }
    }
    if (targetPath && !targetPath.startsWith("public/") && !targetPath.startsWith("reference/")) {
      problems.push(`${prefix}.targetPath must live under public/ or reference/`);
    }

    entries.push({ filename, driveId, bytes, sha256, gitBlobSha, width, height, mode, targetPath, role, rightsStatus });
  });
  return entries;
}

function parseNavigationHandoff(raw: unknown, problems: string[]): NavigationHandoffEvidence | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("navigationHandoff must be an object");
    return undefined;
  }
  const evidence: NavigationHandoffEvidence = {};
  for (const dimension of NAVIGATION_HANDOFF_DIMENSIONS) {
    const value = raw[dimension];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      problems.push(`navigationHandoff.${dimension} must be a boolean`);
      continue;
    }
    evidence[dimension] = value;
  }
  if (Object.keys(evidence).length === 0) {
    problems.push("navigationHandoff must record at least one dimension");
  }
  return evidence;
}

function parseHandoffMappings(raw: unknown, problems: string[]): readonly HandoffMapping[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push("handoffMappings must be an array");
    return undefined;
  }
  const mappings: HandoffMapping[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      problems.push(`handoffMappings[${index}] must be an object`);
      return;
    }
    const prefix = `handoffMappings[${index}]`;
    const sourceTrackId = expectString(entry.sourceTrackId, `${prefix}.sourceTrackId`, problems);
    const resolutionStatus = expectEnum(
      entry.resolutionStatus,
      HANDOFF_RESOLUTION_STATUSES,
      `${prefix}.resolutionStatus`,
      problems,
    );
    const resolvedProductTargetId =
      entry.resolvedProductTargetId === null || entry.resolvedProductTargetId === undefined
        ? null
        : expectString(entry.resolvedProductTargetId, `${prefix}.resolvedProductTargetId`, problems);
    if (resolutionStatus === "RESOLVED" && !resolvedProductTargetId) {
      problems.push(`${prefix}: RESOLVED mapping requires resolvedProductTargetId`);
    }
    if (resolutionStatus === "MAPPING_HOLD" && resolvedProductTargetId) {
      problems.push(`${prefix}: MAPPING_HOLD must not claim resolvedProductTargetId`);
    }
    const handoffContext = expectOptionalString(entry.handoffContext, `${prefix}.handoffContext`, problems);
    if (sourceTrackId && resolutionStatus) {
      mappings.push({ sourceTrackId, resolvedProductTargetId, resolutionStatus, handoffContext });
    }
  });
  return mappings;
}

function parseDerivedDisplay(raw: unknown, problems: string[]): readonly DerivedDisplayValue[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    problems.push("derivedDisplay must be an array");
    return undefined;
  }
  const values: DerivedDisplayValue[] = [];
  raw.forEach((entry, index) => {
    if (!isRecord(entry)) {
      problems.push(`derivedDisplay[${index}] must be an object`);
      return;
    }
    const prefix = `derivedDisplay[${index}]`;
    const value = expectString(entry.value, `${prefix}.value`, problems);
    const kind = expectEnum(entry.kind, ["VIEW_DERIVED"], `${prefix}.kind`, problems);
    const source = expectString(entry.source, `${prefix}.source`, problems);
    const canonicalProductPolicy = entry.canonicalProductPolicy;
    if (canonicalProductPolicy !== false) {
      problems.push(`${prefix}.canonicalProductPolicy must be false — VIEW_DERIVED values are never canonical product policy`);
    }
    const note = expectOptionalString(entry.note, `${prefix}.note`, problems);
    if (kind && value && source) values.push({ value, kind, source, canonicalProductPolicy: false, note });
  });
  return values;
}

function parseSyntheticFixture(raw: unknown, problems: string[]): SyntheticFixtureFlag | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("syntheticFixture must be an object");
    return undefined;
  }
  const prototypeOnly = raw.prototypeOnly;
  const sourceDemoOnly = raw.sourceDemoOnly;
  if (typeof prototypeOnly !== "boolean" || typeof sourceDemoOnly !== "boolean") {
    problems.push("syntheticFixture.prototypeOnly and syntheticFixture.sourceDemoOnly must be booleans");
    return undefined;
  }
  if (!prototypeOnly && !sourceDemoOnly) {
    problems.push("syntheticFixture must mark at least one of prototypeOnly / sourceDemoOnly");
    return undefined;
  }
  return { prototypeOnly, sourceDemoOnly };
}

function parseQa(raw: unknown, problems: string[]): QaContract | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("qa must be an object");
    return undefined;
  }
  const viewportsRaw = raw.viewports;
  if (!Array.isArray(viewportsRaw) || viewportsRaw.length === 0) {
    problems.push("qa.viewports must be a non-empty array");
    return undefined;
  }
  const viewports: QaViewport[] = [];
  viewportsRaw.forEach((viewport, index) => {
    if (!isRecord(viewport)) {
      problems.push(`qa.viewports[${index}] must be an object`);
      return;
    }
    const width = viewport.width;
    const height = viewport.height;
    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
      problems.push(`qa.viewports[${index}].width must be a positive number`);
    }
    if (typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
      problems.push(`qa.viewports[${index}].height must be a positive number`);
    }
    if (viewport.mobile !== undefined && typeof viewport.mobile !== "boolean") {
      problems.push(`qa.viewports[${index}].mobile must be a boolean`);
    }
    viewports.push({
      width: typeof width === "number" && Number.isFinite(width) ? width : 0,
      height: typeof height === "number" && Number.isFinite(height) ? height : 0,
      mobile: viewport.mobile === true,
    });
  });

  const requiredBooleans: Array<keyof QaContract> = [
    "reducedMotion",
    "keyboardFocus",
    "pointer",
    "touch",
    "horizontalOverflowZero",
    "consoleErrorsZero",
    "pageErrorsZero",
  ];
  for (const field of requiredBooleans) {
    if (typeof raw[field] !== "boolean") problems.push(`qa.${field} must be a boolean`);
  }

  const desktop = viewports.find((v) => v.width === 1280 && v.height === 800);
  const mobile = viewports.find((v) => v.width === 390 && v.height === 844);
  if (!desktop) problems.push("qa.viewports must include desktop 1280×800");
  if (!mobile) problems.push("qa.viewports must include mobile 390×844");
  const narrow = viewports.find((v) => v.width === 320);
  if (narrow && (narrow.height !== 720 || narrow.mobile !== true)) {
    problems.push("qa.viewports narrow variant must be 320×720 with mobile:true");
  }

  return {
    viewports,
    reducedMotion: raw.reducedMotion === true,
    keyboardFocus: raw.keyboardFocus === true,
    pointer: raw.pointer === true,
    touch: raw.touch === true,
    horizontalOverflowZero: raw.horizontalOverflowZero === true,
    consoleErrorsZero: raw.consoleErrorsZero === true,
    pageErrorsZero: raw.pageErrorsZero === true,
  };
}

function parseProvenance(raw: unknown, problems: string[]): IntakeProvenance | undefined {
  if (!isRecord(raw)) {
    problems.push("provenance must be an object");
    return undefined;
  }
  const sourceLabel = expectString(raw.sourceLabel, "provenance.sourceLabel", problems);
  const rightsStatus = expectString(raw.rightsStatus, "provenance.rightsStatus", problems);
  const driveFolderId = expectOptionalString(raw.driveFolderId, "provenance.driveFolderId", problems);
  if (driveFolderId && (!DRIVE_ID_PATTERN.test(driveFolderId) || /example/i.test(driveFolderId))) {
    problems.push("provenance.driveFolderId must be an authoritative Drive folder id (no placeholders)");
  }
  const sourceFilesRaw = raw.sourceFiles;
  if (!Array.isArray(sourceFilesRaw) || sourceFilesRaw.length === 0) {
    problems.push("provenance.sourceFiles must be a non-empty array");
  }
  const sourceFiles = Array.isArray(sourceFilesRaw)
    ? sourceFilesRaw.map((file, index) => {
        if (typeof file !== "string" || file.trim() === "") {
          problems.push(`provenance.sourceFiles[${index}] must be a non-empty string`);
          return "";
        }
        return file;
      }).filter(Boolean)
    : [];
  if (!sourceLabel || !rightsStatus) return undefined;
  return { sourceLabel, driveFolderId, sourceFiles, rightsStatus };
}

function parseReservation(raw: unknown, problems: string[]): IntakeReservation | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("reservation must be an object");
    return undefined;
  }
  if (typeof raw.held !== "boolean") {
    problems.push("reservation.held must be a boolean");
    return undefined;
  }
  const note = expectOptionalString(raw.note, "reservation.note", problems);
  return { held: raw.held, note };
}

function parseLineageReservation(raw: unknown, problems: string[]): LineageReservation | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("lineageReservation must be an object");
    return undefined;
  }
  const status = expectEnum(raw.status, LINEAGE_RESERVATION_STATUSES, "lineageReservation.status", problems);
  const note = expectOptionalString(raw.note, "lineageReservation.note", problems);
  if (!status) return undefined;
  return { status, note };
}

function parseAdoption(raw: unknown, problems: string[]): AdoptionRecord | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("adoption must be an object");
    return undefined;
  }
  const status = expectEnum(raw.status, ADOPTION_DECISIONS, "adoption.status", problems);
  const note = expectOptionalString(raw.note, "adoption.note", problems);
  if (!status) return undefined;
  return { status, note };
}

function parseSlotNotes(raw: unknown, problems: string[]): SlotNotes | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("slotNotes must be an object");
    return undefined;
  }
  if (raw.issue !== "142") {
    problems.push("slotNotes.issue must be '142'");
  }
  const notes = parseStringList(raw.notes, "slotNotes.notes", problems);
  const policyBoundary = parseStringList(raw.policyBoundary, "slotNotes.policyBoundary", problems);
  if (raw.issue !== "142" || !notes || !policyBoundary) return undefined;
  return { issue: "142", notes, policyBoundary };
}

function parseFidelityTargetMetadata(raw: unknown, problems: string[]): FidelityTargetMetadata | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("fidelityTargetMetadata must be an object");
    return undefined;
  }
  const validationClass = expectEnum(
    raw.validationClass,
    ["source-fidelity", "interaction-contract"],
    "fidelityTargetMetadata.validationClass",
    problems,
  );
  const label = expectOptionalString(raw.label, "fidelityTargetMetadata.label", problems);
  if (!validationClass) return undefined;
  return { validationClass, label };
}

function parseRoute(raw: unknown, problems: string[]): IntakeRoute | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    problems.push("route must be an object");
    return undefined;
  }
  const path = expectString(raw.path, "route.path", problems);
  const surface = expectEnum(raw.surface, ["lineage", "capability"], "route.surface", problems);
  if (path && !path.startsWith("/design-lab/")) {
    problems.push("route.path must be under /design-lab/");
  }
  if (!surface) return undefined;
  return { path, surface };
}

/**
 * Parse an untyped (JSON-decoded) value into a validated manifest.
 * Throws IntakeManifestError listing every problem.
 */
export function parseIntakeManifest(raw: unknown): DesignIntakeManifest {
  const problems: string[] = [];

  if (!isRecord(raw)) {
    throw new IntakeManifestError(["manifest must be a JSON object"]);
  }

  if (raw.schemaVersion !== INTAKE_SCHEMA_VERSION) {
    problems.push(`schemaVersion must be ${INTAKE_SCHEMA_VERSION}`);
  }

  const stableId = expectString(raw.stableId, "stableId", problems);
  if (stableId && !STABLE_ID_PATTERN.test(stableId)) {
    problems.push("stableId must be a lowercase kebab slug (e.g. track-60-3d-moment-cluster)");
  }

  const sourceTrackId = expectString(raw.sourceTrackId, "sourceTrackId", problems);
  if (sourceTrackId && !SOURCE_TRACK_PATTERN.test(sourceTrackId)) {
    problems.push("sourceTrackId must match Track<number>[ V<version>] (e.g. Track62 V1.1)");
  }

  const title = expectString(raw.title, "title", problems);
  const productJob = expectString(raw.productJob, "productJob", problems);
  const summary = expectString(raw.summary, "summary", problems);

  const classification = expectEnum(raw.classification, INTAKE_CLASSIFICATIONS, "classification", problems);
  const lifecycle = expectEnum(raw.lifecycle, INTAKE_LIFECYCLES, "lifecycle", problems);
  // rendering is optional (pre-executable states may omit it); 'unresolved' is valid only pre-executable.
  const rendering =
    raw.rendering === undefined || raw.rendering === null
      ? undefined
      : expectEnum(raw.rendering, RENDERING_DISCRIMINATORS, "rendering", problems);

  const scenarioId = expectString(raw.scenarioId, "scenarioId", problems);
  if (scenarioId && !DESIGN_SCENARIOS.some((scenario) => scenario.id === scenarioId)) {
    problems.push(`scenarioId must be one of: ${DESIGN_SCENARIOS.map((scenario) => scenario.id).join(", ")}`);
  }

  const provenance = parseProvenance(raw.provenance, problems);
  const designLineageId = expectOptionalString(raw.designLineageId, "designLineageId", problems);
  const lineageNumber = expectOptionalNumber(raw.lineageNumber, "lineageNumber", problems);
  const revisionId = expectOptionalString(raw.revisionId, "revisionId", problems);
  const ownerRoute = expectOptionalString(raw.ownerRoute, "ownerRoute", problems);
  const route = parseRoute(raw.route, problems);
  const reservation = parseReservation(raw.reservation, problems);
  const lineageReservation = parseLineageReservation(raw.lineageReservation, problems);
  const adoption = parseAdoption(raw.adoption, problems);
  const sourceArtifacts = parseSourceArtifacts(raw.sourceArtifacts, problems);
  const reusableCapabilities = parseStringList(raw.reusableCapabilities, "reusableCapabilities", problems);
  const runtimePrimitives = parseStringList(raw.runtimePrimitives, "runtimePrimitives", problems);
  const trulyNewPrimitive = expectOptionalString(raw.trulyNewPrimitive, "trulyNewPrimitive", problems);
  const sourceDeltas = parseStringList(raw.sourceDeltas, "sourceDeltas", problems);
  const sourceDefects = parseStringList(raw.sourceDefects, "sourceDefects", problems);
  const nativeRemediations = parseStringList(raw.nativeRemediations, "nativeRemediations", problems);
  const sourceOnlyValues = parseStringList(raw.sourceOnlyValues, "sourceOnlyValues", problems);
  const backendScope = expectEnum(raw.backendScope, ["BACKEND_FREE", "BACKEND_DECISION_REQUIRED"], "backendScope", problems);
  const templateFamily = expectOptionalString(raw.templateFamily, "templateFamily", problems);
  const slotNotes = parseSlotNotes(raw.slotNotes, problems);
  const fidelityTargetMetadata = parseFidelityTargetMetadata(raw.fidelityTargetMetadata, problems);
  const handoffMappings = parseHandoffMappings(raw.handoffMappings, problems);
  const visualMechanicOverlap = parseStringList(raw.visualMechanicOverlap, "visualMechanicOverlap", problems);
  const productJobDistinctness = expectOptionalString(raw.productJobDistinctness, "productJobDistinctness", problems);
  const exactAssets = parseExactAssets(raw.exactAssets, problems);
  const exactAssetGate = parseExactAssetGate(raw.exactAssetGate, problems);
  const navigationHandoff = parseNavigationHandoff(raw.navigationHandoff, problems);
  const derivedDisplay = parseDerivedDisplay(raw.derivedDisplay, problems);
  const syntheticFixture = parseSyntheticFixture(raw.syntheticFixture, problems);
  const qa = parseQa(raw.qa, problems);

  /* ---------------- reuse metadata validation ---------------- */

  if (reusableCapabilities) {
    const knownIds = new Set<string>(EXPERIENCE_CAPABILITIES.map((capability) => capability.id));
    for (const capabilityId of reusableCapabilities) {
      if (!knownIds.has(capabilityId)) {
        problems.push(
          `reusableCapabilities '${capabilityId}' is not a known ExperienceCapability id (${[...knownIds].join(", ")})`,
        );
      }
    }
  }

  if (runtimePrimitives) {
    for (const primitive of runtimePrimitives) {
      if (!RUNTIME_PRIMITIVE_PATTERN.test(primitive)) {
        problems.push(`runtimePrimitives '${primitive}' must be one of P1..P9`);
      }
    }
  }

  if (trulyNewPrimitive && RUNTIME_PRIMITIVE_PATTERN.test(trulyNewPrimitive)) {
    problems.push(`trulyNewPrimitive '${trulyNewPrimitive}' collides with a shared P1..P9 primitive id`);
  }

  /* ---------------- identity rules (fail closed) ---------------- */

  const impliedReservation = lineageNumber !== undefined ? "ALLOCATED" : undefined;
  const newLineageReservation = lineageReservation?.status ?? impliedReservation;

  if (classification === "NEW_LINEAGE") {
    if (!newLineageReservation) {
      problems.push(
        "ambiguous identity: NEW_LINEAGE requires lineageNumber (implicit ALLOCATED) or lineageReservation.status",
      );
    }
    if (newLineageReservation === "ALLOCATED") {
      if (!designLineageId || !lineageNumber || !revisionId) {
        problems.push(
          "ambiguous identity: NEW_LINEAGE ALLOCATED requires designLineageId, lineageNumber and revisionId together",
        );
      }
      if (lineageNumber !== undefined && (!Number.isInteger(lineageNumber) || lineageNumber <= 0)) {
        problems.push("lineageNumber must be a positive integer");
      }
    } else {
      if (lineageNumber !== undefined) {
        problems.push(
          `NEW_LINEAGE with lineageReservation '${newLineageReservation}' must not allocate a lineage number`,
        );
      }
      if (revisionId) {
        problems.push(`revisionId must not be set while lineage reservation is '${newLineageReservation}'`);
      }
      if (route) {
        problems.push(`route requires an ALLOCATED lineage; lineageReservation '${newLineageReservation}' cannot claim a route`);
      }
      if (lifecycle && lifecycleImpliesExecutable(lifecycle)) {
        problems.push(`lineageReservation '${newLineageReservation}' cannot claim an executable lifecycle`);
      }
    }
  }

  if (lineageReservation?.status === "ALLOCATED" && lineageNumber === undefined) {
    problems.push("lineageReservation ALLOCATED requires lineageNumber");
  }

  if (classification === "EXISTING_LINEAGE_VARIANT") {
    if (!designLineageId || !revisionId) {
      problems.push("ambiguous identity: EXISTING_LINEAGE_VARIANT requires designLineageId and revisionId");
    }
    if (lineageNumber !== undefined) {
      problems.push("lineageNumber must not be set for EXISTING_LINEAGE_VARIANT (identity comes from designLineageId)");
    }
    if (lineageReservation) {
      problems.push("lineageReservation must not be set for EXISTING_LINEAGE_VARIANT");
    }
  }

  if (classification === "CANONICAL_OWNER_CAPABILITY") {
    if (!ownerRoute) {
      problems.push("CANONICAL_OWNER_CAPABILITY requires ownerRoute (canonical product owner path)");
    }
    if (ownerRoute && !ownerRoute.startsWith("/")) {
      problems.push("ownerRoute must start with '/'");
    }
    if (lineageNumber !== undefined || revisionId !== undefined || lineageReservation) {
      problems.push("lineageNumber/revisionId/lineageReservation must not be set for CANONICAL_OWNER_CAPABILITY");
    }
  }

  if (classification === "REFERENCE_CAPABILITY_ONLY") {
    if (lineageNumber !== undefined || revisionId !== undefined || designLineageId || lineageReservation) {
      problems.push("REFERENCE_CAPABILITY_ONLY must not reserve lineage/revision identity");
    }
  }

  /* ---------------- route / lifecycle consistency ---------------- */

  if (route && route.surface === "lineage" && !designLineageId) {
    problems.push("ambiguous identity: lineage route requires designLineageId");
  }
  if (route && route.surface === "capability" && designLineageId) {
    problems.push("route.surface 'capability' must not carry designLineageId");
  }
  if (lifecycle && lifecycleImpliesExecutable(lifecycle)) {
    const hasExecutableAnchor =
      Boolean(route) ||
      (classification === "CANONICAL_OWNER_CAPABILITY" && Boolean(ownerRoute));
    if (!hasExecutableAnchor) {
      problems.push(`lifecycle ${lifecycle} claims an executable but no route/ownerRoute is declared`);
    }
  }
  if (!lifecycle || !lifecycleImpliesExecutable(lifecycle)) {
    if (route) {
      problems.push(`route declared with lifecycle '${lifecycle ?? "<missing>"}' — route requires an executable lifecycle`);
    }
  }
  if (reservation?.held && lifecycle) {
    if (lifecycleImpliesExecutable(lifecycle) || lifecycle === "ARTIFACTS_PARTIAL") {
      problems.push(`reservation held but lifecycle '${lifecycle}' claims executable/artifact progress`);
    }
  }

  /* ---------------- rendering rules (never certify pre-executable) ---------------- */

  if (lifecycle && lifecycleImpliesExecutable(lifecycle)) {
    if (!rendering || rendering === "unresolved") {
      problems.push(
        `lifecycle ${lifecycle} requires a concrete rendering discriminator (one of: ${CONCRETE_RENDERING_DISCRIMINATORS.join(", ")}) — rendering must never be 'unresolved' for an executable candidate`,
      );
    }
  }

  /* ---------------- P8 exact-asset gate rules ---------------- */

  if (exactAssets && exactAssets.length > 0) {
    if (!exactAssetGate) {
      problems.push("exactAssets present requires exactAssetGate state");
    } else if (
      exactAssetGate.exactGateStatus === "EXACT_GATE_PASS" &&
      (exactAssetGate.fingerprintStatus !== "FINGERPRINT_COMPLETE" ||
        exactAssetGate.binaryTransferStatus !== "BINARY_TRANSFER_COMPLETE")
    ) {
      problems.push(
        "EXACT_GATE_PASS requires FINGERPRINT_COMPLETE and BINARY_TRANSFER_COMPLETE — fingerprint metadata alone never implies transfer PASS",
      );
    }
  } else if (exactAssetGate) {
    problems.push("exactAssetGate declared without exactAssets");
  }

  /* ---------------- derived / synthetic policy ---------------- */

  if (derivedDisplay && derivedDisplay.length > 0) {
    for (const entry of derivedDisplay) {
      if (entry.canonicalProductPolicy !== false) {
        problems.push(`derivedDisplay '${entry.value}' must keep canonicalProductPolicy false`);
      }
    }
  }

  if (problems.length > 0) {
    throw new IntakeManifestError(problems);
  }

  return {
    schemaVersion: INTAKE_SCHEMA_VERSION,
    stableId,
    sourceTrackId,
    title,
    classification: classification as IntakeClassification,
    lifecycle: lifecycle as IntakeLifecycle,
    rendering,
    scenarioId,
    productJob,
    summary,
    provenance: provenance as IntakeProvenance,
    designLineageId,
    lineageNumber,
    revisionId,
    ownerRoute,
    route,
    reservation,
    lineageReservation,
    adoption,
    sourceArtifacts,
    reusableCapabilities,
    runtimePrimitives,
    trulyNewPrimitive,
    sourceDeltas,
    sourceDefects,
    nativeRemediations,
    sourceOnlyValues,
    backendScope,
    templateFamily,
    slotNotes,
    fidelityTargetMetadata,
    handoffMappings,
    visualMechanicOverlap,
    productJobDistinctness,
    exactAssets,
    exactAssetGate,
    navigationHandoff,
    derivedDisplay,
    syntheticFixture,
    qa,
  };
}

/**
 * Pure P8 gate rule used by validation and exposed for tests:
 * a PASS claim requires both fingerprint and binary transfer complete.
 */
export function exactGatePassIsValid(state: ExactAssetGateState): boolean {
  if (state.exactGateStatus !== "EXACT_GATE_PASS") return true;
  return (
    state.fingerprintStatus === "FINGERPRINT_COMPLETE" &&
    state.binaryTransferStatus === "BINARY_TRANSFER_COMPLETE"
  );
}
