/**
 * Shadow Source-Freshness Race Guard (Issue #173).
 *
 * Pure, deterministic race/staleness guard that revokes a prior PASS seal when
 * the PR head, the base/main SHA, or the source evidence (fileId / modifiedTime
 * / bytes / sha256) has moved since the observation was taken. This is the
 * production pure extraction of the policy that #243's enforcement-contract
 * test already fixes as a TEST-ONLY helper (`evaluateHistoricalPass`).
 *
 * Trust boundary: only pure equality checks on SHA strings and declared source
 * evidence. Never executes, never shell-composes, never touches the network.
 *
 * Fail-closed precedence (any deviation can only make the decision MORE
 * blocking, never less):
 *   1. provider not SUCCESS / observation not complete
 *        => STALE_OBSERVATION, status UNKNOWN, blocking.
 *   2. observed head != fresh head
 *        => HEAD_MOVED, blocking (the old verdict does not bless the new head).
 *   3. observed base != fresh base
 *        => BASE_MOVED (STALE_OBSERVATION), blocking.
 *   4. source evidence changed (fileId / modifiedTime / bytes / sha256)
 *        => SOURCE_CHANGED, STALE_OBSERVATION, blocking (reobserve required).
 *   5. everything identical => fresh, not stale.
 */

import type { DriveProviderState } from "./types";

/** Content-identity source evidence a PASS seal pins. */
export interface SourceEvidence {
  fileId: string;
  modifiedTime: string;
  bytes: number;
  sha256: string;
}

/** The prior PASS seal pinned at observation time. */
export interface PassSeal {
  verdict: "PASS";
  prHeadSha: string;
  mainSha: string;
  observationTimestamp: string;
  source: SourceEvidence;
}

/** Fresh pre-merge state to compare against the seal. */
export interface FreshPreMergeState {
  providerState: DriveProviderState;
  observationComplete: boolean;
  paginationComplete: boolean;
  prHeadSha: string;
  mainSha: string;
  source: SourceEvidence;
}

export type RaceGuardReason =
  | "PROVIDER_NOT_TRUSTWORTHY_AT_MERGE"
  | "HEAD_MOVED"
  | "BASE_MOVED"
  | "SOURCE_CHANGED_SINCE_PASS"
  | "EXACT_PASS_SEAL_STILL_CURRENT";

export interface RaceGuardResult {
  /** true when the old PASS is still merge-authoritative. */
  mergeAuthoritative: boolean;
  /** true when a fresh full observation is required before merge. */
  reobservationRequired: boolean;
  status: "PASS" | "NON_PASS" | "UNKNOWN";
  mergeBlock: boolean;
  reason: RaceGuardReason;
  changedFields?: readonly string[];
  observedHeadSha: string;
  observedBaseSha: string;
  currentHeadSha: string;
  currentBaseSha: string;
}

export function isBlockingProviderState(state: DriveProviderState): boolean {
  return state !== "SUCCESS";
}

/**
 * Evaluate whether a prior PASS seal is still authoritative at merge time.
 * This is the reusable pure twin of the #243 enforcement-contract helper.
 */
export function evaluatePassSeal(seal: PassSeal, fresh: FreshPreMergeState): RaceGuardResult {
  /* 1. Provider not trustworthy at the fresh pre-merge point. */
  if (
    fresh.providerState !== "SUCCESS" ||
    fresh.observationComplete !== true ||
    fresh.paginationComplete !== true
  ) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "UNKNOWN",
      mergeBlock: true,
      reason: "PROVIDER_NOT_TRUSTWORTHY_AT_MERGE",
      observedHeadSha: seal.prHeadSha,
      observedBaseSha: seal.mainSha,
      currentHeadSha: fresh.prHeadSha,
      currentBaseSha: fresh.mainSha,
    };
  }

  /* 2. GitHub context moved since the seal (head and/or base). */
  const headMoved = seal.prHeadSha !== fresh.prHeadSha;
  const baseMoved = seal.mainSha !== fresh.mainSha;
  if (headMoved || baseMoved) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "NON_PASS",
      mergeBlock: true,
      reason: headMoved && baseMoved ? "HEAD_MOVED" : headMoved ? "HEAD_MOVED" : "BASE_MOVED",
      observedHeadSha: seal.prHeadSha,
      observedBaseSha: seal.mainSha,
      currentHeadSha: fresh.prHeadSha,
      currentBaseSha: fresh.mainSha,
    };
  }

  /* 3. Source evidence changed (fileId / modifiedTime / bytes / sha256). */
  const changedFields = (["fileId", "modifiedTime", "bytes", "sha256"] as const).filter(
    (field) => seal.source[field] !== fresh.source[field],
  );
  if (changedFields.length > 0) {
    return {
      mergeAuthoritative: false,
      reobservationRequired: true,
      status: "NON_PASS",
      mergeBlock: true,
      reason: "SOURCE_CHANGED_SINCE_PASS",
      changedFields,
      observedHeadSha: seal.prHeadSha,
      observedBaseSha: seal.mainSha,
      currentHeadSha: fresh.prHeadSha,
      currentBaseSha: fresh.mainSha,
    };
  }

  /* 4. Exact seal still current. */
  return {
    mergeAuthoritative: true,
    reobservationRequired: false,
    status: "PASS",
    mergeBlock: false,
    reason: "EXACT_PASS_SEAL_STILL_CURRENT",
    observedHeadSha: seal.prHeadSha,
    observedBaseSha: seal.mainSha,
    currentHeadSha: fresh.prHeadSha,
    currentBaseSha: fresh.mainSha,
  };
}

/** Convenience: did the head move between two ref snapshots? */
export function headMoved(observedHeadSha: string, currentHeadSha: string): boolean {
  return observedHeadSha !== currentHeadSha;
}

/** Convenience: did the base/main move between two ref snapshots? */
export function baseMoved(observedBaseSha: string, currentBaseSha: string): boolean {
  return observedBaseSha !== currentBaseSha;
}
