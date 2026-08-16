/**
 * Observation → #171 Pure Resolver Adapter (Issue #173).
 *
 * `observationToDriveSourceState` is the ONLY bridge between the live
 * observation layer and the merged #171 pure resolver
 * (`lib/design-intake/source-freshness.ts` — reused UNCHANGED).
 *
 * Fail-closed precedence (any deviation can only make the resolver MORE
 * blocking, never less):
 * 1. providerState AUTH_FAILED / PERMISSION_DENIED / UNAVAILABLE / API_ERROR
 *    → { available: false } ⇒ resolver UNKNOWN/DRIVE_UNAVAILABLE + mergeBlock.
 * 2. providerState INCOMPLETE, or SUCCESS without observationComplete
 *    → { available: true, incomplete: true } ⇒ resolver
 *      UNKNOWN/DRIVE_INCOMPLETE + mergeBlock.
 * 3. SUCCESS + observationComplete → full evidence state. The root alias is
 *    forwarded ONLY when its SHA-256 was actually computed (an unverified
 *    alias can never reach the resolver as grounded authority evidence).
 *
 * Classification: `functional` in the resolver input comes exclusively from
 * config-declared file ids carried by the observation. Filename numbers and
 * folder labels never classify anything here.
 */

import type { DriveSourceState, DriveFileState } from "../source-freshness";
import type { DriveObservation } from "./types";

export function observationToDriveSourceState(observation: DriveObservation): DriveSourceState {
  /* 1. Degraded provider — never guess, never PASS. */
  if (
    observation.providerState === "AUTH_FAILED" ||
    observation.providerState === "PERMISSION_DENIED" ||
    observation.providerState === "UNAVAILABLE" ||
    observation.providerState === "API_ERROR"
  ) {
    return {
      available: false,
      note: `providerState=${observation.providerState}${
        observation.providerErrors.length > 0
          ? ` (${observation.providerErrors.map((error) => `${error.stage}:${error.code}`).join(", ")})`
          : ""
      } — live Drive authority unavailable, freshness unverifiable`,
    };
  }

  /* 2. Incomplete observation — available but not trustworthy. */
  if (observation.providerState === "INCOMPLETE" || observation.observationComplete !== true) {
    const reasons = observation.providerErrors
      .map((error) => `${error.stage}:${error.code}`)
      .join(", ");
    return {
      available: true,
      incomplete: true,
      note:
        `providerState=${observation.providerState}, paginationComplete=${observation.paginationComplete}` +
        (reasons !== "" ? `, errors=[${reasons}]` : "") +
        " — observation evidence incomplete, freshness unverifiable",
    };
  }

  /* 3. Complete observation → full resolver evidence. Only files with
   *    COMPUTED content hashes are forwarded (nothing is asserted from
   *    metadata alone). */
  const files: DriveFileState[] = observation.candidateFiles
    .filter((file) => file.sha256 !== undefined && file.sha256Source === "COMPUTED_FROM_CONTENT")
    .map((file) => ({
      driveId: file.fileId,
      filename: file.filename,
      revisionLabel: file.filenameRevisionLabel,
      sha256: file.sha256,
      bytes: file.bytes,
      functional: file.declaredFunctional === true,
    }));

  const alias = observation.rootCurrentAlias;
  const rootCandidate =
    alias !== undefined && alias.sha256 !== undefined && alias.aliasSource === "CONFIG_DECLARED"
      ? {
          driveId: alias.fileId,
          sha256: alias.sha256,
          bytes: alias.bytes,
          revisionLabel: alias.revisionLabel,
        }
      : undefined;

  return {
    available: true,
    rootCandidate,
    files,
  };
}
