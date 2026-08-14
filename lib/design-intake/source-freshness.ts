/**
 * Design Source Freshness P0 Pure Resolver.
 *
 * Pure, deterministic source-freshness resolution for Design Intake manifests:
 * given a parsed manifest and a DECLARED Drive source state, it returns a
 * fail-closed verdict about whether the manifest's pinned source snapshot is
 * still the current source authority.
 *
 * The resolver is deliberately pure:
 * - it never touches Google Drive, WIF, service accounts or network;
 * - the Drive state is an explicit input (`DriveSourceState`) supplied by the
 *   caller (operator-provided snapshot), so all behaviour is testable;
 * - missing/incomplete Drive evidence fails closed to UNKNOWN with a
 *   mergeBlock instead of guessing.
 *
 * Verdict model (status / reason):
 * - PASS / CURRENT             — pinned snapshot fingerprint == functional Drive current.
 * - PASS / PACKAGING_ONLY      — same content (SHA-256), different Drive file id:
 *                                a repackaging, not a freshness change.
 * - PASS / HISTORICAL_PINNED   — snapshot pins a historical revision and records
 *                                the newer current; historical integrity is kept (#80).
 * - FAIL / SOURCE_STALE        — snapshot claims CURRENT_AT_OBSERVATION but the
 *                                functional Drive current is newer / content differs.
 * - FAIL / UNMAPPED            — manifest root has no sourceSnapshot, or a current
 *                                claim has no mappable pinned executable evidence.
 * - NON_PASS / EXECUTABLE_PENDING — lifecycle is not executable; the candidate
 *                                can never be freshness-PASS until an executable
 *                                current exists.
 * - UNKNOWN / DRIVE_UNAVAILABLE|DRIVE_INCOMPLETE — Drive evidence is missing or
 *                                incomplete; a mergeBlock explains why.
 *
 * Display-only revision labels (e.g. Track64 "V1.3" folder label vs functional
 * "V1.2.1") are ignored: staleness is resolved against the FUNCTIONAL Drive
 * current revision only, never against raw labels.
 */

import {
  type DesignIntakeManifest,
  lifecycleImpliesExecutable,
} from "./manifest";

/* ------------------------------------------------------------------ */
/* Declared Drive source state (operator-supplied, never fetched)     */
/* ------------------------------------------------------------------ */

export interface DriveFileState {
  /** Authoritative Drive file id. */
  driveId: string;
  filename?: string;
  /** Drive-side revision label, e.g. "V1.9". Parsed as dotted numeric version. */
  revisionLabel?: string;
  /** SHA-256 content fingerprint (64 hex). */
  sha256?: string;
  bytes?: number;
  /**
   * true = functional/executable authority (the content that defines the
   * current revision). false/undefined = display/empty/placeholder entries
   * that must never drive staleness (Track64 V1.3 display label precedent).
   */
  functional?: boolean;
}

export interface DriveSourceState {
  /** false = Drive authority unavailable (never guessed). */
  available: boolean;
  /** true = snapshot exists but is incomplete (truncated/missing fingerprints). */
  incomplete?: boolean;
  note?: string;
  files?: readonly DriveFileState[];
}

/* ------------------------------------------------------------------ */
/* Verdict                                                            */
/* ------------------------------------------------------------------ */

export type SourceFreshnessStatus = "PASS" | "FAIL" | "NON_PASS" | "UNKNOWN";

export type SourceFreshnessReason =
  | "CURRENT"
  | "PACKAGING_ONLY"
  | "HISTORICAL_PINNED"
  | "SOURCE_STALE"
  | "UNMAPPED"
  | "EXECUTABLE_PENDING"
  | "DRIVE_UNAVAILABLE"
  | "DRIVE_INCOMPLETE";

export interface SourceFreshnessVerdict {
  stableId: string;
  status: SourceFreshnessStatus;
  reason: SourceFreshnessReason;
  /** Human-readable one-line summary of the evidence. */
  summary: string;
  /**
   * Present whenever the verdict blocks merge/promotion
   * (FAIL, NON_PASS, UNKNOWN). Absent on PASS.
   */
  mergeBlock?: string;
  /** Content-identical repackaging (same SHA-256, different Drive file id). */
  packagingOnly?: boolean;
  /** Revision the manifest pins (sourceSnapshot.revisionLabel). */
  manifestRevision?: string;
  /** Highest functional current revision resolved from the Drive state. */
  driveCurrentRevision?: string;
  /** Highest revision label seen across ALL Drive files (context only). */
  driveLatestRevision?: string;
  /** Functional revision the manifest must track (display labels ignored). */
  resolvedTargetRevision?: string;
}

/* ------------------------------------------------------------------ */
/* Revision label parsing / ordering                                  */
/* ------------------------------------------------------------------ */

export interface RevisionParts {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a dotted numeric version prefix such as "V1.7", "v1.2.1" or
 * "V1 (instruction accepted)" -> { major, minor, patch }. Returns null when
 * no version prefix exists (label cannot participate in ordering).
 */
export function parseRevisionLabel(label: string): RevisionParts | null {
  if (typeof label !== "string") return null;
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i.exec(label.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

/** -1 | 0 | 1 numeric ordering of parsed revision parts. */
export function compareRevisions(a: RevisionParts, b: RevisionParts): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function highestFunctionalCurrent(
  files: readonly DriveFileState[] | undefined,
): DriveFileState | undefined {
  const functional = (files ?? []).filter((file) => file.functional === true);
  if (functional.length === 0) return undefined;
  const withVersion = functional
    .map((file) => ({ file, version: parseRevisionLabel(file.revisionLabel ?? "") }))
    .filter((entry) => entry.version !== null) as Array<{
    file: DriveFileState;
    version: RevisionParts;
  }>;
  if (withVersion.length > 0) {
    withVersion.sort((a, b) => compareRevisions(b.version, a.version));
    return withVersion[0].file;
  }
  return functional[0];
}

function highestLabelAcrossAllFiles(
  files: readonly DriveFileState[] | undefined,
): string | undefined {
  const parsed = (files ?? [])
    .map((file) => ({
      label: file.revisionLabel,
      version: parseRevisionLabel(file.revisionLabel ?? ""),
    }))
    .filter((entry) => entry.version !== null && entry.label !== undefined) as Array<{
    label: string;
    version: RevisionParts;
  }>;
  if (parsed.length === 0) return undefined;
  parsed.sort((a, b) => compareRevisions(b.version, a.version));
  return parsed[0].label;
}

function pinnedExecutable(manifest: DesignIntakeManifest) {
  const executables = (manifest.sourceArtifacts ?? []).filter(
    (artifact) => artifact.role === "executable" && artifact.status === "PINNED",
  );
  return (
    executables.find((artifact) => Boolean(artifact.sha256)) ?? executables[0]
  );
}

function verdict(
  stableId: string,
  status: SourceFreshnessStatus,
  reason: SourceFreshnessReason,
  summary: string,
  extra: Partial<SourceFreshnessVerdict> = {},
): SourceFreshnessVerdict {
  return { stableId, status, reason, summary, ...extra };
}

/* ------------------------------------------------------------------ */
/* Resolver                                                           */
/* ------------------------------------------------------------------ */

export function resolveSourceFreshness(
  manifest: DesignIntakeManifest,
  drive: DriveSourceState,
): SourceFreshnessVerdict {
  const stableId = manifest.stableId;
  const snapshot = manifest.sourceSnapshot;
  const manifestRevision = snapshot?.revisionLabel;

  /* 1. Drive authority must be available and complete — never guess. */
  if (!drive.available) {
    return verdict(stableId, "UNKNOWN", "DRIVE_UNAVAILABLE",
      `${stableId}: Drive source authority unavailable — source freshness cannot be verified.`,
      {
        mergeBlock:
          `${stableId}: Drive authority unavailable — UNKNOWN. Do not merge/promote until current source freshness can be verified.`,
        manifestRevision,
      },
    );
  }
  if (drive.incomplete === true) {
    return verdict(stableId, "UNKNOWN", "DRIVE_INCOMPLETE",
      `${stableId}: Drive source snapshot is incomplete (${drive.note ?? "no reason"}).`,
      {
        mergeBlock:
          `${stableId}: Drive authority incomplete — UNKNOWN. Do not merge/promote until full fingerprint evidence is provided.`,
        manifestRevision,
      },
    );
  }

  const driveFiles = drive.files ?? [];
  const driveLatestRevision = highestLabelAcrossAllFiles(driveFiles);

  /* 2. Root current must be mapped: a manifest without a sourceSnapshot can
   *    never claim it pins the current source revision. */
  if (!snapshot) {
    return verdict(stableId, "FAIL", "UNMAPPED",
      `${stableId}: no sourceSnapshot — the manifest root never maps a current source revision.`,
      {
        mergeBlock:
          `${stableId}: root current unmapped (no sourceSnapshot) — FAIL. Do not merge until the pinned current revision is declared.`,
        driveCurrentRevision:
          highestFunctionalCurrent(driveFiles)?.revisionLabel,
        driveLatestRevision,
      },
    );
  }

  /* 3. Non-executable lifecycle: freshness can never certify a candidate
   *    that has no executable source (Track63/64 EXECUTABLE_PENDING
   *    precedent). Checked before HISTORICAL_PINNED so a pending manifest
   *    never looks green. */
  if (!lifecycleImpliesExecutable(manifest.lifecycle)) {
    return verdict(stableId, "NON_PASS", "EXECUTABLE_PENDING",
      `${stableId}: lifecycle '${manifest.lifecycle}' is not executable — the candidate cannot be freshness-PASS until an executable current revision exists.`,
      {
        mergeBlock:
          `${stableId}: lifecycle '${manifest.lifecycle}' (EXECUTABLE_PENDING) — NON_PASS. Do not merge as a current candidate until an executable current revision is pinned.`,
        manifestRevision,
        driveLatestRevision,
      },
    );
  }

  /* 4. HISTORICAL_PINNED keeps historical integrity (#80): the snapshot pins
   *    an older proving revision and records the newer current — never a
   *    staleness failure. */
  if (snapshot.sourceAuthorityState === "HISTORICAL_PINNED") {
    const driveCurrentRevision = highestFunctionalCurrent(driveFiles)?.revisionLabel;
    return verdict(stableId, "PASS", "HISTORICAL_PINNED",
      `${stableId}: HISTORICAL_PINNED snapshot '${manifestRevision}' recorded${driveCurrentRevision ? ` (newer current '${driveCurrentRevision}' known)` : ""} — historical integrity maintained per #80.`,
      {
        manifestRevision,
        driveCurrentRevision,
        driveLatestRevision,
        resolvedTargetRevision: driveCurrentRevision,
      },
    );
  }

  /* 5. CURRENT_AT_OBSERVATION: must match the functional Drive current. */

  const pinned = pinnedExecutable(manifest);
  if (!pinned) {
    return verdict(stableId, "FAIL", "UNMAPPED",
      `${stableId}: CURRENT_AT_OBSERVATION claim has no PINNED source executable artifact to map against the Drive current.`,
      {
        mergeBlock:
          `${stableId}: current claim unmappable (no PINNED executable artifact) — FAIL. Do not merge until the current executable is pinned.`,
        manifestRevision,
        driveLatestRevision,
      },
    );
  }

  const driveCurrent = highestFunctionalCurrent(driveFiles);
  if (!driveCurrent) {
    return verdict(stableId, "UNKNOWN", "DRIVE_INCOMPLETE",
      driveFiles.length === 0
        ? `${stableId}: Drive reports no files — current revision cannot be verified.`
        : `${stableId}: Drive reports only non-functional/empty entries (latest '${driveLatestRevision ?? "?"}') — no functional current revision to resolve against.`,
      {
        mergeBlock:
          `${stableId}: no functional Drive current revision — UNKNOWN. Do not merge/promote until a functional current file is provided.`,
        manifestRevision,
        driveLatestRevision,
      },
    );
  }

  const sameContent =
    pinned.sha256 !== undefined &&
    driveCurrent.sha256 !== undefined &&
    pinned.sha256 === driveCurrent.sha256;

  if (sameContent) {
    if (pinned.driveId === driveCurrent.driveId) {
      return verdict(stableId, "PASS", "CURRENT",
        `${stableId}: pinned snapshot '${manifestRevision}' matches the functional Drive current ('${driveCurrent.revisionLabel ?? driveCurrent.driveId}') exactly.`,
        {
          manifestRevision,
          driveCurrentRevision: driveCurrent.revisionLabel,
          driveLatestRevision,
          resolvedTargetRevision: driveCurrent.revisionLabel,
        },
      );
    }
    return verdict(stableId, "PASS", "PACKAGING_ONLY",
      `${stableId}: pinned content SHA-256 matches the functional Drive current but the Drive file id changed — packaging only, not a freshness change.`,
      {
        packagingOnly: true,
        manifestRevision,
        driveCurrentRevision: driveCurrent.revisionLabel,
        driveLatestRevision,
        resolvedTargetRevision: driveCurrent.revisionLabel,
      },
    );
  }

  /* Content differs (or fingerprints are absent) — version-based staleness. */
  const pinnedVersion = parseRevisionLabel(manifestRevision ?? "");
  const currentVersion = parseRevisionLabel(driveCurrent.revisionLabel ?? "");
  if (pinnedVersion !== null && currentVersion !== null) {
    if (compareRevisions(currentVersion, pinnedVersion) > 0) {
      return verdict(stableId, "FAIL", "SOURCE_STALE",
        `${stableId}: snapshot pins '${manifestRevision}' as CURRENT_AT_OBSERVATION but the functional Drive current is '${driveCurrent.revisionLabel}' — SOURCE_STALE.`,
        {
          mergeBlock:
            `${stableId}: SOURCE_STALE — pins '${manifestRevision}' while Drive current is '${driveCurrent.revisionLabel}'. Do not merge/promote until the snapshot pins the current revision.`,
          manifestRevision,
          driveCurrentRevision: driveCurrent.revisionLabel,
          driveLatestRevision,
          resolvedTargetRevision: driveCurrent.revisionLabel,
        },
      );
    }
    /* Same/older version with different content = content drift. */
    return verdict(stableId, "FAIL", "SOURCE_STALE",
      `${stableId}: pinned content differs from the functional Drive current at version '${driveCurrent.revisionLabel ?? "?"}' — content drift, fail closed as stale.`,
      {
        mergeBlock:
          `${stableId}: SOURCE_STALE — pinned content no longer matches the functional Drive current. Do not merge/promote until the snapshot is updated.`,
        manifestRevision,
        driveCurrentRevision: driveCurrent.revisionLabel,
        driveLatestRevision,
        resolvedTargetRevision: driveCurrent.revisionLabel,
      },
    );
  }

  /* No fingerprints and no parseable revisions — cannot verify. */
  return verdict(stableId, "UNKNOWN", "DRIVE_INCOMPLETE",
    `${stableId}: cannot verify freshness — no matching fingerprint and no parseable revision on either side.`,
    {
      mergeBlock:
        `${stableId}: freshness evidence incomplete — UNKNOWN. Do not merge/promote until fingerprint + revision evidence is provided.`,
      manifestRevision,
      driveCurrentRevision: driveCurrent.revisionLabel,
      driveLatestRevision,
    },
  );
}
