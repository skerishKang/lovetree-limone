/**
 * Design Intake Native Candidate Factory — typed declarative intake manifest.
 *
 * The manifest is repository-owned data. It is parsed from JSON (never executed):
 * source HTML/JS referenced by `provenance.sourceFiles` is evidence/reference only
 * and is never loaded, imported or evaluated by the factory.
 *
 * Identity contract:
 * - `sourceTrackId` is the sibling intake track identity (e.g. "Track60").
 * - `designLineageId` is the repository Design Lineage identity (e.g. "lt-60-...").
 * - The two are completely separate identities. A source track number never
 *   implies the repository lineage number.
 */

import { DESIGN_SCENARIOS } from "../design-lab";

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

export const RENDERING_DISCRIMINATORS = [
  "dom-2d",
  "sprite-2.5d",
  "css3d-dom",
  "canvas-3d-projection",
  "webgl",
] as const;
export type RenderingDiscriminator = (typeof RENDERING_DISCRIMINATORS)[number];

/* ------------------------------------------------------------------ */
/* P8 exact-asset contract                                            */
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
 * Fingerprint metadata alone never implies asset transfer, and transfer alone
 * never implies an exact gate pass.
 */
export interface ExactAssetGateState {
  fingerprintStatus: FingerprintStatus;
  binaryTransferStatus: BinaryTransferStatus;
  exactGateStatus: ExactGateStatus;
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

/* ------------------------------------------------------------------ */
/* Derived / synthetic policy                                         */
/* ------------------------------------------------------------------ */

export interface DerivedDisplayValue {
  /** Displayed value, e.g. "Cluster", "Bridge Moment", "Recent". */
  value: string;
  kind: "VIEW_DERIVED";
  /** Derivation source, e.g. "cluster", "bridge-moment", "view-preset", "recent", "important", "resume". */
  source: string;
  /**
   * VIEW_DERIVED values are display calculations and are never canonical
   * product policy. This field must therefore always be `false`.
   */
  canonicalProductPolicy: false;
  note?: string;
}

export interface SyntheticFixtureFlag {
  /** Prototype-only fixture, not product truth. */
  prototypeOnly: boolean;
  /** Source-demo-only value (e.g. 100/200/365), not canonical policy. */
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
  /** Stable repository identity for this intake, e.g. "track-60-memory-entry-portal". */
  stableId: string;
  /** Sibling intake track identity, e.g. "Track60". Fully separate from designLineageId. */
  sourceTrackId: string;
  title: string;
  classification: IntakeClassification;
  lifecycle: IntakeLifecycle;
  rendering: RenderingDiscriminator;
  scenarioId: string;
  /** Product Job this intake serves, e.g. "returning-user Memory Entry Portal". */
  productJob: string;
  summary: string;
  provenance: IntakeProvenance;
  /** Repository Design Lineage identity. Separate identity from sourceTrackId. */
  designLineageId?: string;
  /** Proposed repository lineage number (NEW_LINEAGE only). */
  lineageNumber?: number;
  /** Repository revision id within the lineage. */
  revisionId?: string;
  /** Canonical product owner route (CANONICAL_OWNER_CAPABILITY only). Metadata only — never written by the factory. */
  ownerRoute?: string;
  route?: IntakeRoute;
  reservation?: IntakeReservation;
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
  // Narrow 320×720 is optional but must be exactly 320×720 when present.
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
    problems.push("stableId must be a lowercase kebab slug (e.g. track-60-memory-entry-portal)");
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
  const rendering = expectEnum(raw.rendering, RENDERING_DISCRIMINATORS, "rendering", problems);

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
  const exactAssets = parseExactAssets(raw.exactAssets, problems);
  const exactAssetGate = parseExactAssetGate(raw.exactAssetGate, problems);
  const navigationHandoff = parseNavigationHandoff(raw.navigationHandoff, problems);
  const derivedDisplay = parseDerivedDisplay(raw.derivedDisplay, problems);
  const syntheticFixture = parseSyntheticFixture(raw.syntheticFixture, problems);
  const qa = parseQa(raw.qa, problems);

  /* ---------------- identity rules (fail closed) ---------------- */

  if (classification === "NEW_LINEAGE") {
    if (!designLineageId || !lineageNumber || !revisionId) {
      problems.push(
        "ambiguous identity: NEW_LINEAGE requires designLineageId, lineageNumber and revisionId together",
      );
    }
    if (lineageNumber !== undefined && (!Number.isInteger(lineageNumber) || lineageNumber <= 0)) {
      problems.push("lineageNumber must be a positive integer");
    }
  }

  if (classification === "EXISTING_LINEAGE_VARIANT") {
    if (!designLineageId || !revisionId) {
      problems.push("ambiguous identity: EXISTING_LINEAGE_VARIANT requires designLineageId and revisionId");
    }
    if (lineageNumber !== undefined) {
      problems.push("lineageNumber must not be set for EXISTING_LINEAGE_VARIANT (identity comes from designLineageId)");
    }
  }

  if (classification === "CANONICAL_OWNER_CAPABILITY") {
    if (!ownerRoute) {
      problems.push("CANONICAL_OWNER_CAPABILITY requires ownerRoute (canonical product owner path)");
    }
    if (ownerRoute && !ownerRoute.startsWith("/")) {
      problems.push("ownerRoute must start with '/'");
    }
    if (lineageNumber !== undefined || revisionId !== undefined) {
      problems.push("lineageNumber/revisionId must not be set for CANONICAL_OWNER_CAPABILITY");
    }
  }

  if (classification === "REFERENCE_CAPABILITY_ONLY") {
    if (lineageNumber !== undefined || revisionId !== undefined || designLineageId) {
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
    rendering: rendering as RenderingDiscriminator,
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
