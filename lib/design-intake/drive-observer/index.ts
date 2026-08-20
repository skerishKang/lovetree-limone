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
