/**
 * Read-Only Drive Observation Orchestrator (Issue #173).
 *
 * `observeDriveTrack` runs one track's read-only observation:
 *
 *   transport.listFolder (pagination fail-closed)
 *     → raw records → candidate metadata (no classification inference)
 *   transport.streamFileContent (only for config-declared evidence files)
 *     → bounded streaming SHA-256, declared-vs-received size verification
 *   → DriveObservation (normalized, secret-redacted, deterministic shape)
 *
 * Fail-closed guarantees:
 * - pagination truncation ⇒ providerState INCOMPLETE (never a partial PASS);
 * - hash failure / size mismatch / limit truncation ⇒ INCOMPLETE;
 * - transport auth/permission errors ⇒ AUTH_FAILED / PERMISSION_DENIED;
 * - transport availability/API/malformed errors ⇒ UNAVAILABLE / API_ERROR;
 * - content is streamed and hashed, never buffered whole, never parsed,
 *   never executed, never persisted.
 */

import {
  DRIVE_OBSERVATION_SCHEMA_VERSION,
  type DriveObservedFile,
  type DriveObservation,
  type DriveObserverTrackConfig,
  type DriveProviderError,
  type DriveProviderState,
  type DriveRootAliasObservation,
  type DriveSha256Hasher,
  type DriveTransport,
  type DriveTransportErrorKind,
  DriveTransportError,
} from "./types";
import { redactString } from "./redact";

export interface DriveObserveDeps {
  transport: DriveTransport;
  hasher: DriveSha256Hasher;
  /** Injectable clock for deterministic tests (default: real time). */
  now?: () => Date;
}

const DEFAULT_HASH_MAX_BYTES = 268_435_456; // 256 MiB per file

/** "Track61 V1.9.html" / "V1.2.1 (current)" → "V1.9" / "V1.2.1" (context only). */
export function filenameRevisionLabel(filename: string): string | undefined {
  const match = /(?:^|[\s_\-.])v?\d+(?:\.\d+)+(?:\.\d+)?(?=$|[\s_\-.()])/i.exec(filename);
  if (!match) return undefined;
  return match[0].replace(/^[\s_\-.]+/, "");
}

function transportErrorState(kind: DriveTransportErrorKind): DriveProviderState {
  switch (kind) {
    case "AUTH_FAILED":
    case "SECURITY_REFUSAL":
      return "AUTH_FAILED";
    case "PERMISSION_DENIED":
      return "PERMISSION_DENIED";
    case "UNAVAILABLE":
    case "TIMEOUT":
      return "UNAVAILABLE";
    default:
      return "API_ERROR";
  }
}

function normalizeRecord(
  record: { id: string; name?: string; mimeType?: string; size?: string; modifiedTime?: string },
): DriveObservedFile {
  const declaredBytes = record.size !== undefined && /^\d+$/.test(record.size) ? Number(record.size) : undefined;
  return {
    fileId: record.id,
    filename: record.name ?? "",
    mimeType: record.mimeType,
    modifiedTime: record.modifiedTime,
    bytes: declaredBytes,
    sha256: undefined,
    sha256Source: "UNAVAILABLE",
    executableState: declaredBytes === 0 ? "EMPTY" : "UNKNOWN",
    hashEvidence: { attempted: false, verified: false, declaredBytes },
    filenameRevisionLabel: record.name !== undefined ? filenameRevisionLabel(record.name) : undefined,
  };
}

interface HashOutcome {
  sha256?: string;
  receivedBytes: number;
  verified: boolean;
  sizeMismatch: boolean;
  truncatedAtLimit: boolean;
  error?: DriveProviderError;
}

async function hashFile(
  transport: DriveTransport,
  hasher: DriveSha256Hasher,
  fileId: string,
  maxBytes: number,
): Promise<HashOutcome> {
  const digest = hasher.create();
  let received = 0;
  try {
    for await (const chunk of transport.streamFileContent(fileId)) {
      received += chunk.byteLength;
      if (received > maxBytes) {
        return {
          receivedBytes: received,
          verified: false,
          sizeMismatch: false,
          truncatedAtLimit: true,
          error: {
            stage: "HASH",
            code: "HASH_TRUNCATED",
            message: `content exceeded hashMaxBytes (${maxBytes}) — bounded streaming hash refuses to truncate`,
          },
        };
      }
      digest.update(chunk);
    }
  } catch (error) {
    const message =
      error instanceof DriveTransportError
        ? error.message
        : `content stream failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      receivedBytes: received,
      verified: false,
      sizeMismatch: false,
      truncatedAtLimit: false,
      error: { stage: "HASH", code: "HASH_STREAM_FAILED", message: redactString(message) },
    };
  }
  const sha256 = digest.digestHex();
  return { sha256, receivedBytes: received, verified: true, sizeMismatch: false, truncatedAtLimit: false };
}

function errorToProviderError(error: unknown, fallbackStage: "LIST" | "HASH"): DriveProviderError {
  if (error instanceof DriveTransportError) {
    return { stage: error.stage, code: error.kind, message: redactString(error.message) };
  }
  return {
    stage: fallbackStage,
    code: "API_ERROR",
    message: redactString(`unexpected observation error: ${error instanceof Error ? error.message : String(error)}`),
  };
}

/**
 * Observe one track's Drive source folder (read-only, fail-closed).
 * The returned observation is fully redacted and safe to print/serialize.
 */
export async function observeDriveTrack(
  config: DriveObserverTrackConfig,
  deps: DriveObserveDeps,
): Promise<DriveObservation> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const providerErrors: DriveProviderError[] = [];
  const hashMaxBytes = config.hashMaxBytes ?? DEFAULT_HASH_MAX_BYTES;

  /* 1. Listing (pagination fail-closed). */
  let listing: Awaited<ReturnType<DriveTransport["listFolder"]>> | undefined;
  try {
    listing = await deps.transport.listFolder(config.driveFolderId);
  } catch (error) {
    providerErrors.push(errorToProviderError(error, "LIST"));
    return finalize(config, now, transportErrorState(providerErrors[0].code as DriveTransportErrorKind), providerErrors, [], {
      paginationComplete: false,
    });
  }

  /* 2. Candidate metadata (no classification inference — declarations only). */
  const files: DriveObservedFile[] = listing.records.map((record) => normalizeRecord(record));
  const functionalIds = new Set(config.functionalFileIds ?? []);
  const displayIds = new Set(config.displayFileIds ?? []);
  const historicalIds = new Set(config.historicalFileIds ?? []);
  const evidenceIds = new Set<string>([
    ...(config.rootCurrentFileId !== undefined ? [config.rootCurrentFileId] : []),
    ...functionalIds,
    ...historicalIds,
  ]);

  const paginationComplete = listing.paginationComplete;
  if (!paginationComplete) {
    providerErrors.push({
      stage: "LIST",
      code: "API_ERROR",
      message: `listing pagination incomplete (pages=${listing.pagesFetched}, truncatedByLimit=${listing.truncatedByLimit}) — observation fails closed as INCOMPLETE`,
    });
  }

  /* 3. Bounded streaming hash of declared evidence files only. */
  const byId = new Map<string, DriveObservedFile>(
    files.map((file) => [file.fileId, file] as [string, DriveObservedFile]),
  );
  for (const fileId of evidenceIds) {
    const file = byId.get(fileId);
    if (!file) {
      providerErrors.push({
        stage: "METADATA",
        code: "ROOT_ALIAS_NOT_OBSERVED",
        message: `declared evidence file ${fileId} was not observed in folder listing`,
      });
      continue;
    }
    const outcome = await hashFile(deps.transport, deps.hasher, fileId, hashMaxBytes);
    file.sha256 = outcome.sha256;
    file.sha256Source = outcome.sha256 !== undefined ? "COMPUTED_FROM_CONTENT" : "UNAVAILABLE";
    file.receivedBytes = outcome.receivedBytes;
    file.executableState = outcome.receivedBytes === 0 ? "EMPTY" : "CONTENT_PRESENT";
    file.hashEvidence = {
      attempted: true,
      verified: outcome.verified,
      declaredBytes: file.bytes,
      receivedBytes: outcome.receivedBytes,
      ...(outcome.truncatedAtLimit ? { truncatedAtLimit: true } : {}),
    };
    if (outcome.error !== undefined) {
      providerErrors.push(outcome.error);
      continue;
    }
    if (file.bytes !== undefined && file.bytes !== outcome.receivedBytes) {
      file.hashEvidence.sizeMismatch = true;
      providerErrors.push({
        stage: "HASH",
        code: "HASH_SIZE_MISMATCH",
        message: `declared size ${file.bytes} != received ${outcome.receivedBytes} bytes for ${fileId} — interrupted or inconsistent download, fail closed`,
      });
    }
  }

  /* 4. Root alias (explicit config declaration only). */
  let rootCurrentAlias: DriveRootAliasObservation | undefined;
  if (config.rootCurrentFileId !== undefined) {
    const root = byId.get(config.rootCurrentFileId);
    rootCurrentAlias = {
      fileId: config.rootCurrentFileId,
      sha256: root?.sha256,
      bytes: root?.bytes,
      revisionLabel: root?.filenameRevisionLabel,
      aliasSource: "CONFIG_DECLARED",
    };
  }

  /* 5. State: SUCCESS only when everything completed with zero errors. */
  const providerState: DriveProviderState =
    providerErrors.length === 0 && paginationComplete ? "SUCCESS" : "INCOMPLETE";

  const observation = finalize(config, now, providerState, providerErrors, files, {
    paginationComplete,
    rootCurrentAlias,
    functionalIds,
    displayIds,
    historicalIds,
  });
  return observation;
}

type FinalizeContext = {
  paginationComplete: boolean;
  rootCurrentAlias?: DriveRootAliasObservation;
  functionalIds?: Set<string>;
  displayIds?: Set<string>;
  historicalIds?: Set<string>;
};

function finalize(
  config: DriveObserverTrackConfig,
  observationTimestamp: string,
  providerState: DriveProviderState,
  providerErrors: readonly DriveProviderError[],
  files: readonly DriveObservedFile[],
  context: FinalizeContext,
): DriveObservation {
  const functional = context.functionalIds ?? new Set<string>();
  const display = context.displayIds ?? new Set<string>();
  const historical = context.historicalIds ?? new Set<string>();
  const rootId = context.rootCurrentAlias?.fileId;
  for (const file of files) {
    file.declaredFunctional = functional.has(file.fileId) || file.fileId === rootId;
    file.declaredDisplay = display.has(file.fileId);
    file.declaredHistorical = historical.has(file.fileId);
    file.declaredRootCurrent = file.fileId === rootId;
  }

  const observedIds = new Set(files.map((file) => file.fileId));
  const functionalCandidates = files.filter((file) => file.declaredFunctional === true).map((file) => file.fileId);
  const displayCandidates = files.filter((file) => file.declaredDisplay === true).map((file) => file.fileId);
  const historicalCandidates = files.filter((file) => file.declaredHistorical === true).map((file) => file.fileId);

  const hashEvidenceComplete = files
    .filter((file) => file.declaredFunctional === true || file.declaredHistorical === true || file.declaredRootCurrent === true)
    .every(
      (file) =>
        observedIds.has(file.fileId) &&
        file.hashEvidence.attempted &&
        file.hashEvidence.verified &&
        !file.hashEvidence.sizeMismatch &&
        !file.hashEvidence.truncatedAtLimit,
    );

  const observationComplete =
    providerState === "SUCCESS" &&
    context.paginationComplete &&
    providerErrors.length === 0 &&
    hashEvidenceComplete &&
    (context.rootCurrentAlias === undefined || context.rootCurrentAlias.sha256 !== undefined);

  return {
    schemaVersion: DRIVE_OBSERVATION_SCHEMA_VERSION,
    observationTimestamp,
    trackRootIdentity: config.stableId,
    providerState,
    observationComplete,
    paginationComplete: context.paginationComplete,
    rootCurrentAlias: context.rootCurrentAlias,
    candidateFiles: files,
    functionalRevisionCandidates: functionalCandidates,
    displayRevisionCandidates: displayCandidates,
    historicalRevisionCandidates: historicalCandidates,
    providerErrors,
  };
}
