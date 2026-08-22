/**
 * Read-Only Drive Source-Freshness Observer — public surface (Issue #173).
 *
 * Trust boundary summary:
 * - provider (transport, read-only GET) → raw records
 * - observe (pagination fail-closed, bounded streaming SHA-256)
 * - normalized DriveObservation (secret-redacted, deterministic)
 * - observationToDriveSourceState → #171 pure resolver input
 *
 * The #171 resolver itself is imported ONLY by callers; this module never
 * modifies it and never moves network logic into it.
 */

export * from "./types";
export { redactString, redactDeep, registerSecret, clearRegisteredSecrets } from "./redact";
export {
  createFixtureDriveTransport,
  createHttpDriveTransport,
  createEnvAccessTokenProvider,
  liveObservationAvailability,
  DRIVE_ACCESS_TOKEN_ENV,
} from "./transport";
export type { DriveFixtureData, DriveFixturePage, HttpDriveTransportOptions } from "./transport";
export { observeDriveTrack, filenameRevisionLabel } from "./observe";
export type { DriveObserveDeps } from "./observe";
export { observationToDriveSourceState } from "./normalize";
export { parseDriveObserverConfig, observeTracks, allObservationsComplete } from "./run";
export type { ObservationMode, ObserveTracksOptions, ObservationRunResult } from "./run";

/* Shadow decision layer (Issue #173 — reusable pure race/applicability/check). */
export { stableStringify, stableParseAndReserialize, stableEqual } from "./stable-json";
export {
  evaluatePassSeal,
  headMoved,
  baseMoved,
  isBlockingProviderState,
} from "./race-guard";
export type {
  SourceEvidence,
  PassSeal,
  FreshPreMergeState,
  RaceGuardReason,
  RaceGuardResult,
} from "./race-guard";
export { isSourceFreshnessApplicable, touchesDesignIntake } from "./applicability";
export type { ApplicabilityInput, ApplicabilityResult } from "./applicability";
export {
  buildSourceFreshnessCheckDecision,
  DESIGN_SOURCE_FRESHNESS_CHECK_NAME,
} from "./check-decision";
export type {
  CheckConclusion,
  CheckReasonCode,
  CheckDecision,
  CheckDecisionInput,
} from "./check-decision";
