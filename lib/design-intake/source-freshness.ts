/**
 * Design Source Freshness P0 Pure Resolver (fail-closed).
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
 * Fail-closed authority rules:
 * 1. ROOT CURRENT ALIAS — `DriveSourceState.rootCandidate` is the explicit
 *    authority alias for the current root revision (driveId + sha256). When
 *    present it must map by content identity (SHA-256) to an exact candidate
 *    in `files`; a root alias with no matching candidate is
 *    FAIL/ROOT_CURRENT_UNMAPPED. This is separate from a manifest that has no
 *    sourceSnapshot at all (FAIL/UNMAPPED).
 * 2. AMBIGUOUS CURRENT — the resolver NEVER auto-picks a "highest semver"
 *    among competing functional candidates. Without explicit unique authority
 *    evidence (a rootCandidate), two or more distinct functional candidates
 *    are FAIL/AMBIGUOUS_CURRENT. Display/version numbers are never used to
 *    guess which candidate is current.
 * 3. HISTORICAL PIN — HISTORICAL_PINNED means "a newer current revision does
 *    not, by itself, make the pinned snapshot stale". It does NOT mean the
 *    pinned artifact's fingerprint was verified. When the observation contains
 *    the historical artifact, its SHA-256 must match the manifest's pinned
 *    executable SHA-256, else FAIL/HISTORICAL_PIN_MISMATCH. When no historical
 *    artifact is observed, the verdict never claims the fingerprint is proven.
 *
 * Verdict model (status / reason):
 * - PASS / CURRENT             — pinned snapshot fingerprint == authoritative current.
 * - PASS / PACKAGING_ONLY      — same content (SHA-256), different Drive file id:
 *                                a repackaging, not a freshness change.
 * - PASS / HISTORICAL_PINNED   — pin preserved; `historicalFingerprintVerified`
 *                                records whether the observation actually verified it.
 * - FAIL / SOURCE_STALE        — snapshot claims CURRENT_AT_OBSERVATION but the
 *                                authoritative current is newer / content differs.
 * - FAIL / UNMAPPED            — manifest root has no sourceSnapshot, or a current
 *                                claim has no mappable pinned executable evidence.
 * - FAIL / ROOT_CURRENT_UNMAPPED — Drive rootCandidate exists but no candidate in
 *                                files matches its content identity.
 * - FAIL / AMBIGUOUS_CURRENT   — ≥2 distinct functional candidates without an
 *                                explicit unique authority (rootCandidate).
 * - FAIL / HISTORICAL_PIN_MISMATCH — observed historical artifact fingerprint
 *                                differs from the manifest's pinned executable SHA.
 * - NON_PASS / EXECUTABLE_PENDING — lifecycle is not executable; the candidate
 *                                can never be freshness-PASS until an executable
 *                                current exists.
 * - UNKNOWN / DRIVE_UNAVAILABLE|DRIVE_INCOMPLETE — Drive evidence is missing or
 *                                incomplete; a mergeBlock explains why.
 *
 * Display-only revision labels (e.g. Track64 "V1.3" folder label vs functional
 * "V1.2.1") are ignored: staleness is resolved against the authoritative
 * current only, never against raw labels.
 */

import {
  type DesignIntakeManifest,
  lifecycleImpliesExecutable,
} from "./manifest";

/* ------------------------------------------------------------------ */
/* Declared Drive source state (operator-supplied, never fetched)     */
/* ------------------------------------------------------------------ */

/**
 * Explicit authority alias for the current ROOT revision. The root candidate
 * is the single source of truth the manifest must match; it must map by
 * content identity (sha256) to an exact candidate in `files`.
 */
export interface DriveRootCandidate {
  /** Authoritative Drive file id of the root/current revision. */
  driveId: string;
  /** SHA-256 content fingerprint (64 hex) — the content identity. */
  sha256: string;
  bytes?: number;
  /** Optional Drive-side revision label (context only, never a guess basis). */
  revisionLabel?: string;
}

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
  /** Explicit root/current authority alias; disambiguates competing candidates. */
  rootCandidate?: DriveRootCandidate;
  /** Revision candidates observed in the snapshot. */
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
  | "ROOT_CURRENT_UNMAPPED"
  | "AMBIGUOUS_CURRENT"
  | "HISTORICAL_PIN_MISMATCH"
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
  /**
   * HISTORICAL_PINNED only: true when the observation actually contained the
   * historical artifact and its SHA-256 matched the pinned executable.
   * A PASS/HISTORICAL_PINNED with this flag false means the fingerprint was
   * NOT verified — the pin is preserved, not proven.
   */
  historicalFingerprintVerified?: boolean;
  /** Revision the manifest pins (sourceSnapshot.revisionLabel). */
  manifestRevision?: string;
  /** Authoritative current revision resolved from the Drive state. */
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

/** Semantic label equality (V1.5 === "V1.5 (proving snapshot)"). */
function labelsEqual(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  const pa = parseRevisionLabel(a);
  const pb = parseRevisionLabel(b);
  if (pa === null || pb === null) return a.trim() === b.trim();
  return compareRevisions(pa, pb) === 0;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function functionalCandidates(
  files: readonly DriveFileState[] | undefined,
): readonly DriveFileState[] {
  return (files ?? []).filter((file) => file.functional === true);
}

/**
 * Content identity key for ambiguity: SHA-256 when present, otherwise the
 * file id (distinct candidates that cannot prove identical content stay
 * distinct — fail closed).
 */
function contentKey(file: DriveFileState): string {
  return file.sha256 ?? `file:${file.driveId}`;
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

/**
 * The historical artifact observed in the Drive snapshot: the candidate whose
 * revision label matches the pinned snapshot label (fallback: the candidate
 * whose file id matches the pinned executable's Drive file id).
 */
function observedHistoricalArtifact(
  files: readonly DriveFileState[] | undefined,
  manifest: DesignIntakeManifest,
): DriveFileState | undefined {
  const pinned = pinnedExecutable(manifest);
  const snapshotLabel = manifest.sourceSnapshot?.revisionLabel;
  if (snapshotLabel !== undefined) {
    const byLabel = (files ?? []).find((file) => labelsEqual(file.revisionLabel, snapshotLabel));
    if (byLabel) return byLabel;
  }
  if (pinned?.driveId) {
    return (files ?? []).find((file) => file.driveId === pinned.driveId);
  }
  return undefined;
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

  /* 2. Manifest root must be mapped: a manifest without a sourceSnapshot can
   *    never claim it pins the current source revision. */
  if (!snapshot) {
    return verdict(stableId, "FAIL", "UNMAPPED",
      `${stableId}: no sourceSnapshot — the manifest root never maps a current source revision.`,
      {
        mergeBlock:
          `${stableId}: root current unmapped (no sourceSnapshot) — FAIL. Do not merge until the pinned current revision is declared.`,
        driveCurrentRevision:
          drive.rootCandidate?.revisionLabel ??
          functionalCandidates(driveFiles)[0]?.revisionLabel,
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

  /* 4. Root current alias must be grounded: when the observation declares a
   *    root candidate, some candidate in `files` must match its content
   *    identity (SHA-256). An ungrounded root alias is FAIL. */
  if (drive.rootCandidate) {
    const root = drive.rootCandidate;
    const mapped = (driveFiles ?? []).some(
      (file) => file.sha256 !== undefined && file.sha256 === root.sha256,
    );
    if (!mapped) {
      return verdict(stableId, "FAIL", "ROOT_CURRENT_UNMAPPED",
        `${stableId}: Drive rootCandidate (${root.driveId}) exists but no observed candidate matches its content identity (SHA-256 ${root.sha256}).`,
        {
          mergeBlock:
            `${stableId}: Drive root alias unmapped — FAIL. Do not merge/promote until the root candidate is grounded in an observed candidate.`,
          manifestRevision,
          driveLatestRevision,
        },
      );
    }
  }

  /* 5. Ambiguous current: without explicit unique authority evidence
   *    (rootCandidate), two or more distinct functional candidates are a
   *    contradiction — NEVER auto-pick by version/display numbers. */
  const functional = functionalCandidates(driveFiles);
  if (!drive.rootCandidate) {
    const distinctContents = new Set(functional.map(contentKey));
    if (distinctContents.size > 1) {
      return verdict(stableId, "FAIL", "AMBIGUOUS_CURRENT",
        `${stableId}: ${distinctContents.size} distinct functional candidates claim current authority with no explicit unique authority evidence (rootCandidate) — cannot resolve which is current.`,
        {
          mergeBlock:
            `${stableId}: ambiguous current — ${distinctContents.size} competing functional candidates. Do not merge/promote until a single authoritative candidate (rootCandidate) is declared.`,
          manifestRevision,
          driveLatestRevision,
        },
      );
    }
  }

  /* 6. HISTORICAL_PINNED: a newer current revision never, by itself, makes
   *    the pin stale. But the pin is separate from fingerprint verification:
   *    an observed historical artifact must match the pinned executable SHA. */
  if (snapshot.sourceAuthorityState === "HISTORICAL_PINNED") {
    const pinned = pinnedExecutable(manifest);
    const historical = observedHistoricalArtifact(driveFiles, manifest);
    const pinnedSha = pinned?.sha256;
    const historicalSha = historical?.sha256;

    if (
      pinnedSha &&
      historical &&
      historicalSha !== undefined &&
      historicalSha !== pinnedSha
    ) {
      return verdict(stableId, "FAIL", "HISTORICAL_PIN_MISMATCH",
        `${stableId}: observed historical artifact '${historical.revisionLabel ?? historical.driveId}' has SHA-256 ${historicalSha}, but the manifest pins ${pinnedSha} — historical pin fingerprint mismatch.`,
        {
          mergeBlock:
            `${stableId}: HISTORICAL_PIN_MISMATCH — the observed historical artifact does not match the pinned executable fingerprint. Do not merge/promote until the pin matches the observed artifact.`,
          manifestRevision,
          driveCurrentRevision:
            drive.rootCandidate?.revisionLabel ?? functional[0]?.revisionLabel,
          driveLatestRevision,
        },
      );
    }

    const verified = Boolean(
      pinnedSha && historical && historicalSha === pinnedSha,
    );
    const driveCurrentRevision =
      drive.rootCandidate?.revisionLabel ?? functional[0]?.revisionLabel;
    return verdict(stableId, "PASS", "HISTORICAL_PINNED",
      verified
        ? `${stableId}: HISTORICAL_PINNED snapshot '${manifestRevision}' preserved; historical artifact fingerprint verified against the observation (SHA-256 match).`
        : `${stableId}: HISTORICAL_PINNED snapshot '${manifestRevision}' preserved (a newer current does not make it stale); historical artifact fingerprint NOT verified — no matching artifact observed.`,
      {
        historicalFingerprintVerified: verified,
        manifestRevision,
        driveCurrentRevision,
        driveLatestRevision,
        resolvedTargetRevision: driveCurrentRevision,
      },
    );
  }

  /* 7. CURRENT_AT_OBSERVATION: must match the authoritative current. */

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

  /* The authoritative current: the explicit root alias when present,
   * otherwise the single functional candidate (ambiguity already failed
   * closed above). */
  const driveCurrent =
    drive.rootCandidate ??
    (functional.length === 1 ? functional[0] : undefined);

  if (!driveCurrent) {
    return verdict(stableId, "UNKNOWN", "DRIVE_INCOMPLETE",
      driveFiles.length === 0
        ? `${stableId}: Drive reports no files — current revision cannot be verified.`
        : `${stableId}: Drive reports no functional current revision (latest '${driveLatestRevision ?? "?"}') and no rootCandidate — nothing to resolve against.`,
      {
        mergeBlock:
          `${stableId}: no authoritative Drive current — UNKNOWN. Do not merge/promote until a functional current file or rootCandidate is provided.`,
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
        `${stableId}: pinned snapshot '${manifestRevision}' matches the authoritative current ('${driveCurrent.revisionLabel ?? driveCurrent.driveId}') exactly.`,
        {
          manifestRevision,
          driveCurrentRevision: driveCurrent.revisionLabel,
          driveLatestRevision,
          resolvedTargetRevision: driveCurrent.revisionLabel,
        },
      );
    }
    return verdict(stableId, "PASS", "PACKAGING_ONLY",
      `${stableId}: pinned content SHA-256 matches the authoritative current but the Drive file id changed — packaging only, not a freshness change.`,
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
        `${stableId}: snapshot pins '${manifestRevision}' as CURRENT_AT_OBSERVATION but the authoritative current is '${driveCurrent.revisionLabel}' — SOURCE_STALE.`,
        {
          mergeBlock:
            `${stableId}: SOURCE_STALE — pins '${manifestRevision}' while the current is '${driveCurrent.revisionLabel}'. Do not merge/promote until the snapshot pins the current revision.`,
          manifestRevision,
          driveCurrentRevision: driveCurrent.revisionLabel,
          driveLatestRevision,
          resolvedTargetRevision: driveCurrent.revisionLabel,
        },
      );
    }
    /* Same/older version with different content = content drift. */
    return verdict(stableId, "FAIL", "SOURCE_STALE",
      `${stableId}: pinned content differs from the authoritative current at version '${driveCurrent.revisionLabel ?? "?"}' — content drift, fail closed as stale.`,
      {
        mergeBlock:
          `${stableId}: SOURCE_STALE — pinned content no longer matches the authoritative current. Do not merge/promote until the snapshot is updated.`,
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
