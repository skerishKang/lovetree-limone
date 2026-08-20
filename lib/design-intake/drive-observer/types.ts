/**
 * Live Drive Source-Freshness Observer — Observation Contract (Issue #173).
 *
 * This module owns the repository-side NORMALIZED observation schema that sits
 * between the read-only Drive provider and the already-merged #171 pure
 * resolver (`lib/design-intake/source-freshness.ts`):
 *
 *   Drive provider (transport)
 *           ↓ raw provider records
 *   normalizer / observer
 *           ↓ DriveObservation (this contract)
 *   observationToDriveSourceState()
 *           ↓ DriveSourceState
 *   #171 pure resolver (UNCHANGED — network logic must never enter it)
 *
 * Fail-closed rules baked into the contract:
 * - `providerState` is the provider truth; only `SUCCESS` with
 *   `observationComplete === true` may ever feed a resolvable state.
 * - Any non-SUCCESS provider state must normalize to UNKNOWN at the resolver,
 *   never to PASS (enforced by `observationToDriveSourceState`).
 * - Functional/display classification is EXPLICIT configuration only
 *   (config-declared file ids). Filename numbers, folder labels and Drive
 *   file ids are never used to infer source classification or authority.
 * - `executableState` records neutral content evidence (bytes received);
 *   it is descriptive, never an authority statement.
 */

/* ------------------------------------------------------------------ */
/* Provider states (fail-closed enum)                                 */
/* ------------------------------------------------------------------ */

/**
 * Provider observation states. Anything that is not SUCCESS is a degraded
 * observation and must block (UNKNOWN) downstream — never be guessed into a
 * PASS.
 */
export const DRIVE_PROVIDER_STATES = [
  "SUCCESS",
  "INCOMPLETE",
  "UNAVAILABLE",
  "AUTH_FAILED",
  "PERMISSION_DENIED",
  "API_ERROR",
] as const;
export type DriveProviderState = (typeof DRIVE_PROVIDER_STATES)[number];

/** Neutral executable-content evidence (descriptive, never authority). */
export const DRIVE_EXECUTABLE_STATES = [
  "EMPTY",
  "CONTENT_PRESENT",
  "UNKNOWN",
] as const;
export type DriveExecutableState = (typeof DRIVE_EXECUTABLE_STATES)[number];

export const DRIVE_SHA256_SOURCES = [
  "COMPUTED_FROM_CONTENT",
  "UNAVAILABLE",
] as const;
export type DriveSha256Source = (typeof DRIVE_SHA256_SOURCES)[number];

/** Where an authority alias came from. Explicit config only in this phase. */
export const DRIVE_ALIAS_SOURCES = ["CONFIG_DECLARED"] as const;
export type DriveAliasSource = (typeof DRIVE_ALIAS_SOURCES)[number];

/* ------------------------------------------------------------------ */
/* Raw provider records (transport layer, pre-normalization)          */
/* ------------------------------------------------------------------ */

/**
 * A raw Drive API file record exactly as the transport saw it. Field names
 * follow the Drive API v3 files resource (size is a string there); nothing is
 * interpreted yet.
 */
export interface DriveRawFileRecord {
  id: string;
  name?: string;
  mimeType?: string;
  /** Drive reports file sizes as decimal strings. */
  size?: string;
  /** RFC 3339, e.g. 2026-08-14T09:00:00.000Z. */
  modifiedTime?: string;
  md5Checksum?: string;
  trashed?: boolean;
}

export interface DriveListOutcome {
  /** Non-trashed records observed across all fetched pages. */
  records: readonly DriveRawFileRecord[];
  /**
   * true only when the listing reached a terminal page (no further
   * nextPageToken) within the configured page limits. false = the observation
   * is INCOMPLETE — never silently truncate.
   */
  paginationComplete: boolean;
  pagesFetched: number;
  /** true when listing stopped because the page/fetch limit was hit. */
  truncatedByLimit: boolean;
}

/* ------------------------------------------------------------------ */
/* Transport + hashing contracts (injectable, testable offline)       */
/* ------------------------------------------------------------------ */

/** Stable error kinds a transport can report; each maps fail-closed. */
export const DRIVE_TRANSPORT_ERROR_KINDS = [
  "AUTH_FAILED",
  "PERMISSION_DENIED",
  "UNAVAILABLE",
  "TIMEOUT",
  "API_ERROR",
  "MALFORMED_RESPONSE",
  "SECURITY_REFUSAL",
] as const;
export type DriveTransportErrorKind = (typeof DRIVE_TRANSPORT_ERROR_KINDS)[number];

/** Transport failure. `message` MUST already be secret-redacted. */
export class DriveTransportError extends Error {
  readonly kind: DriveTransportErrorKind;
  readonly stage: DriveProviderErrorStage;
  constructor(kind: DriveTransportErrorKind, message: string, stage: DriveProviderErrorStage = "LIST") {
    super(message);
    this.name = "DriveTransportError";
    this.kind = kind;
    this.stage = stage;
  }
}

export type DriveProviderErrorStage = "LIST" | "HASH" | "METADATA" | "AUTH";

/**
 * Read-only Drive transport. Implementations MUST only ever issue GET
 * requests (metadata listing + media download). No write/move/rename/share
 * operation exists anywhere in this interface — that is the NO_DRIVE_WRITE
 * boundary, and the HTTP implementation is statically tested against it.
 */
export interface DriveTransport {
  readonly kind: string;
  listFolder(folderId: string): Promise<DriveListOutcome>;
  /**
   * Stream file content in bounded chunks. Content is evidence to be hashed
   * and discarded — it is NEVER decoded, parsed, saved or executed.
   */
  streamFileContent(fileId: string): AsyncIterable<Uint8Array>;
}

/** Incremental SHA-256 hasher (streaming — never buffer whole files). */
export interface DriveSha256Hasher {
  create(): {
    update(chunk: Uint8Array): void;
    digestHex(): string;
  };
}

/** Access-token source. Short-lived tokens only; long-lived keys are refused. */
export interface DriveAccessTokenProvider {
  getAccessToken(): Promise<string>;
}

/* ------------------------------------------------------------------ */
/* Observer configuration (repository-owned, no secrets)              */
/* ------------------------------------------------------------------ */

/**
 * Per-track observation config. Every authority statement here is an EXPLICIT
 * human declaration backed by real Drive file ids:
 * - `rootCurrent` is the declared root/current authority alias;
 * - `functionalFileIds` / `displayFileIds` / `historicalFileIds` are declared
 *   classifications;
 * filename numbers, folder labels and bare file ids never imply any of them.
 */
export interface DriveObserverTrackConfig {
  /** Manifest stableId this observation resolves (track root identity). */
  stableId: string;
  /** Read-only Drive folder to observe. */
  driveFolderId: string;
  /** Explicit root/current authority alias (never inferred). */
  rootCurrentFileId?: string;
  /** File ids declared as functional revision candidates. */
  functionalFileIds?: readonly string[];
  /** File ids declared display-only (never functional authority). */
  displayFileIds?: readonly string[];
  /** Historical pin-evidence file ids (HISTORICAL_PINNED verification). */
  historicalFileIds?: readonly string[];
  /** Bounded streaming-hash limit per file (default 268435456 = 256 MiB). */
  hashMaxBytes?: number;
}

export interface DriveObserverConfig {
  schemaVersion: 1;
  tracks: readonly DriveObserverTrackConfig[];
}

/* ------------------------------------------------------------------ */
/* Normalized observation (Phase A contract)                          */
/* ------------------------------------------------------------------ */

export const DRIVE_OBSERVATION_SCHEMA_VERSION = 1 as const;

/** Hash evidence for one observed candidate file. */
export interface DriveHashEvidence {
  /** Whether content streaming was attempted for this file. */
  attempted: boolean;
  /** true only when the full content was streamed and hashed end-to-end. */
  verified: boolean;
  /** Metadata-declared byte size. */
  declaredBytes?: number;
  /** Bytes actually received from the content stream. */
  receivedBytes?: number;
  /** Declared vs received mismatch — always a hash failure (fail closed). */
  sizeMismatch?: boolean;
  /** Truncated at hashMaxBytes — always a hash failure (fail closed). */
  truncatedAtLimit?: boolean;
}

/** One observed candidate file, normalized. */
export interface DriveObservedFile {
  fileId: string;
  filename: string;
  mimeType?: string;
  modifiedTime?: string;
  /** Metadata-declared size (Drive `size` string parsed). */
  bytes?: number;
  sha256?: string;
  sha256Source: DriveSha256Source;
  receivedBytes?: number;
  executableState: DriveExecutableState;
  hashEvidence: DriveHashEvidence;
  /**
   * Revision label parsed from the filename, recorded as DESCRIPTIVE context
   * only (e.g. "V1.9" from "Track61 V1.9.html"). Authority is never derived
   * from it — the #171 resolver also never selects current by label.
   */
  filenameRevisionLabel?: string;
  /** Config-declared classification (explicit only, never inferred). */
  declaredFunctional?: boolean;
  declaredDisplay?: boolean;
  declaredHistorical?: boolean;
  declaredRootCurrent?: boolean;
}

/** Root/current authority alias carried into the resolver input. */
export interface DriveRootAliasObservation {
  fileId: string;
  sha256?: string;
  bytes?: number;
  revisionLabel?: string;
  aliasSource: DriveAliasSource;
}

/** Redacted provider error recorded in the observation. */
export interface DriveProviderError {
  stage: DriveProviderErrorStage;
  code: DriveTransportErrorKind | "HASH_SIZE_MISMATCH" | "HASH_TRUNCATED" | "HASH_STREAM_FAILED" | "ROOT_ALIAS_NOT_OBSERVED";
  message: string;
}

/**
 * The normalized observation. This object is what the CLI prints
 * (deterministically ordered) and what `observationToDriveSourceState`
 * consumes. It contains no secrets by contract (redaction enforced at every
 * boundary).
 */
export interface DriveObservation {
  schemaVersion: typeof DRIVE_OBSERVATION_SCHEMA_VERSION;
  /** ISO-8601 instant the observation was taken. */
  observationTimestamp: string;
  /** Track root identity (manifest stableId). */
  trackRootIdentity: string;
  providerState: DriveProviderState;
  /** true only when pagination completed AND all declared evidence hashed. */
  observationComplete: boolean;
  paginationComplete: boolean;
  rootCurrentAlias?: DriveRootAliasObservation;
  candidateFiles: readonly DriveObservedFile[];
  /** Observed file ids declared functional (config only). */
  functionalRevisionCandidates: readonly string[];
  /** Observed file ids declared display-only (config only). */
  displayRevisionCandidates: readonly string[];
  /** Observed file ids declared historical pin evidence (config only). */
  historicalRevisionCandidates: readonly string[];
  providerErrors: readonly DriveProviderError[];
}
