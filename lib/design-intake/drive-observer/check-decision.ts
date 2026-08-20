/**
 * Shadow Source-Freshness GitHub Check Decision Builder (Issue #173).
 *
 * Pure builder that turns an observation → resolver verdict → race-guard result
 * into a deterministic GitHub Check decision payload. It does NOT call the
 * GitHub API; it produces the exact `name / status / conclusion / summary /
 * details / headSha / blocking / reasonCode` a publisher would post.
 *
 * Invariants:
 * - FAIL / NON_PASS / UNKNOWN NEVER become a merge-allowing SUCCESS.
 * - NOT_APPLICABLE (when applicable=false) maps to a deterministic NEUTRAL
 *   success so the required check is absent-allowed on unrelated PRs.
 * - provider failures on applicable PRs stay UNKNOWN/blocking (never N/A).
 * - The decision timestamp is INJECTED (never wall-clock) for determinism.
 *
 * Stable check identity (from #173 / #243 enforcement contract):
 *   name = "Design Source Freshness"  (the future required-check identity,
 *   NOT the workflow display name "Design Source Freshness Observer").
 */

import type { DriveProviderState } from "./types";
import { observationToDriveSourceState } from "./normalize";
import {
  evaluatePassSeal,
  isBlockingProviderState,
  type PassSeal,
  type FreshPreMergeState,
} from "./race-guard";
import type { ApplicabilityResult } from "./applicability";
import { resolveSourceFreshness, type SourceFreshnessVerdict } from "../source-freshness";
import type { DriveObservation } from "./types";

export const DESIGN_SOURCE_FRESHNESS_CHECK_NAME = "Design Source Freshness" as const;

export type CheckConclusion =
  | "SUCCESS"
  | "FAILURE"
  | "NEUTRAL"
  | "ACTION_REQUIRED"
  | "UNKNOWN";

export type CheckReasonCode =
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
  | "DRIVE_INCOMPLETE"
  | "PROVIDER_BLOCKED"
  | "HEAD_MOVED"
  | "BASE_MOVED"
  | "SOURCE_CHANGED_SINCE_PASS"
  | "NOT_APPLICABLE";

export interface CheckDecision {
  name: string;
  status: "completed";
  conclusion: CheckConclusion;
  summary: string;
  details: {
    observedHeadSha: string | null;
    observedBaseSha: string | null;
    sourceObservationTimestamp: string | null;
    decisionTimestamp: string;
    providerState: DriveProviderState | "NOT_APPLICABLE";
    paginationComplete: boolean;
    resolverStatus: string;
    resolverReason: string;
    raceStale: boolean;
    applicable: boolean;
  };
  headSha: string | null;
  blocking: boolean;
  reasonCode: CheckReasonCode;
}

export interface CheckDecisionInput {
  observation: DriveObservation;
  /** Manifest the observation resolves against (already parsed). */
  manifest: Parameters<typeof resolveSourceFreshness>[0];
  /** PR head/base captured AT observation time. */
  observedHeadSha: string | null;
  observedBaseSha: string | null;
  /** Fresh PR head/base checked right before publish (may differ). */
  freshHeadSha: string | null;
  freshBaseSha: string | null;
  /** Applicability gate result (from `isSourceFreshnessApplicable`). */
  applicability: ApplicabilityResult;
  /** Optional prior PASS seal for TOCTOU comparison (omit on first observation). */
  passSeal?: PassSeal;
  /** Injected decision timestamp (ISO-8601) for determinism. */
  decisionTimestamp: string;
  /** Provider state to verify for the race-guard provider check. */
  providerState: DriveProviderState;
  paginationComplete: boolean;
  observationComplete: boolean;
}

/**
 * Build a deterministic GitHub Check decision from the shadow pipeline.
 */
export function buildSourceFreshnessCheckDecision(
  input: CheckDecisionInput,
): CheckDecision {
  const { observation, manifest, applicability, decisionTimestamp } = input;

  /* NOT_APPLICABLE: deterministic neutral success, never hides provider failure. */
  if (!applicability.applicable) {
    return {
      name: DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
      status: "completed",
      conclusion: "NEUTRAL",
      summary: `Design Source Freshness: not applicable (${applicability.reasonCode}).`,
      details: {
        observedHeadSha: input.observedHeadSha,
        observedBaseSha: input.observedBaseSha,
        sourceObservationTimestamp: observation.observationTimestamp,
        decisionTimestamp,
        providerState: "NOT_APPLICABLE",
        paginationComplete: observation.paginationComplete,
        resolverStatus: "SKIPPED",
        resolverReason: "NOT_APPLICABLE",
        raceStale: false,
        applicable: false,
      },
      headSha: input.freshHeadSha ?? input.observedHeadSha,
      blocking: false,
      reasonCode: "NOT_APPLICABLE",
    };
  }

  /* Provider blocked: fail closed to UNKNOWN/ACTION_REQUIRED, never PASS. */
  if (isBlockingProviderState(input.providerState) || input.observationComplete !== true) {
    const providerReason: CheckReasonCode = "PROVIDER_BLOCKED";
    const conclusion: CheckConclusion =
      input.providerState === "INCOMPLETE" ? "UNKNOWN" : "ACTION_REQUIRED";
    return {
      name: DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
      status: "completed",
      conclusion,
      summary: `Design Source Freshness: provider state ${input.providerState}${input.observationComplete !== true ? " (observation incomplete)" : ""} — freshness unverifiable, merge blocked.`,
      details: {
        observedHeadSha: input.observedHeadSha,
        observedBaseSha: input.observedBaseSha,
        sourceObservationTimestamp: observation.observationTimestamp,
        decisionTimestamp,
        providerState: input.providerState,
        paginationComplete: input.paginationComplete,
        resolverStatus: "SKIPPED",
        resolverReason: providerReason,
        raceStale: false,
        applicable: true,
      },
      headSha: input.freshHeadSha ?? input.observedHeadSha,
      blocking: true,
      reasonCode: providerReason,
    };
  }

  /* Run the reused #171 resolver. */
  const driveState = observationToDriveSourceState(observation);
  const verdict: SourceFreshnessVerdict = resolveSourceFreshness(manifest, driveState);

  /* TOCTOU race guard: if a pass seal exists, the old PASS is revoked on
   * head/base/source movement. A moved head can never be blessed by the old
   * verdict. */
  let raceStale = false;
  let raceReason: CheckReasonCode | null = null;
  if (input.passSeal !== undefined) {
    const fresh: FreshPreMergeState = {
      providerState: input.providerState,
      observationComplete: input.observationComplete,
      paginationComplete: input.paginationComplete,
      prHeadSha: input.freshHeadSha ?? input.passSeal.prHeadSha,
      mainSha: input.freshBaseSha ?? input.passSeal.mainSha,
      source: input.passSeal.source,
    };
    const guard = evaluatePassSeal(input.passSeal, fresh);
    if (!guard.mergeAuthoritative) {
      raceStale = true;
      raceReason =
        guard.reason === "HEAD_MOVED"
          ? "HEAD_MOVED"
          : guard.reason === "BASE_MOVED"
            ? "BASE_MOVED"
            : guard.reason === "SOURCE_CHANGED_SINCE_PASS"
              ? "SOURCE_CHANGED_SINCE_PASS"
              : "PROVIDER_BLOCKED";
    }
  }
  if (raceStale && raceReason !== null) {
    return {
      name: DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
      status: "completed",
      conclusion: "FAILURE",
      summary: `Design Source Freshness: stale observation (${raceReason}) — reobservation required before merge.`,
      details: {
        observedHeadSha: input.observedHeadSha,
        observedBaseSha: input.observedBaseSha,
        sourceObservationTimestamp: observation.observationTimestamp,
        decisionTimestamp,
        providerState: input.providerState,
        paginationComplete: input.paginationComplete,
        resolverStatus: verdict.status,
        resolverReason: verdict.reason,
        raceStale: true,
        applicable: true,
      },
      headSha: input.freshHeadSha ?? input.observedHeadSha,
      blocking: true,
      reasonCode: raceReason,
    };
  }

  /* Map the resolver verdict to a check decision. */
  return verdictToDecision(verdict, observation, input, decisionTimestamp);
}

function verdictToDecision(
  verdict: SourceFreshnessVerdict,
  observation: DriveObservation,
  input: CheckDecisionInput,
  decisionTimestamp: string,
): CheckDecision {
  const blocking = verdict.status === "FAIL" || verdict.status === "UNKNOWN" || verdict.status === "NON_PASS";
  const reasonCode = verdict.reason as CheckReasonCode;
  let conclusion: CheckConclusion;
  switch (verdict.status) {
    case "PASS":
      conclusion = "SUCCESS";
      break;
    case "FAIL":
      conclusion = "FAILURE";
      break;
    case "NON_PASS":
      conclusion = "NEUTRAL";
      break;
    case "UNKNOWN":
    default:
      conclusion = "UNKNOWN";
      break;
  }

  return {
    name: DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
    status: "completed",
    conclusion,
    summary: `Design Source Freshness: ${verdict.status}/${verdict.reason} — ${verdict.summary}`,
    details: {
      observedHeadSha: input.observedHeadSha,
      observedBaseSha: input.observedBaseSha,
      sourceObservationTimestamp: observation.observationTimestamp,
      decisionTimestamp,
      providerState: input.providerState,
      paginationComplete: input.paginationComplete,
      resolverStatus: verdict.status,
      resolverReason: verdict.reason,
      raceStale: false,
      applicable: true,
    },
    headSha: input.freshHeadSha ?? input.observedHeadSha,
    blocking,
    reasonCode,
  };
}
