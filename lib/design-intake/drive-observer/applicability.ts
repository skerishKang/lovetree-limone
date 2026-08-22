/**
 * Shadow Source-Freshness Applicability Gate (Issue #173).
 *
 * A pure applicability gate so a required "Design Source Freshness" check can
 * deterministically report NOT_APPLICABLE (neutral success) on unrelated PRs,
 * avoiding merge deadlocks WITHOUT hiding provider failures.
 *
 * CRITICAL contract (mirrors the #173 CTO direction):
 * - NOT_APPLICABLE is decided ONLY from PR file paths and explicit config,
 *   NEVER from provider observation state. A provider failure on an
 *   applicable PR must stay UNKNOWN/blocking, never become N/A.
 * - When the check becomes required, an unrelated PR that touches none of the
 *   applicability surfaces reports N/A so the check is absent-allowed, not
 *   absent-blocked.
 */

export interface ApplicabilityInput {
  /** Files changed in the PR (repo-relative POSIX paths). */
  changedFiles: readonly string[];
  /** true if a design-intake manifest or source-snapshot field changed. */
  manifestImpact?: boolean;
  /** true if a source track / lineage lineage manifest changed. */
  trackImpact?: boolean;
  /**
   * Optional explicit track ids the freshness gate is configured to govern.
   * When provided, applicability is AND-ed with a track match.
   */
  governedTrackIds?: readonly string[];
  /** Optional observed track id (from the normalized observation). */
  observedTrackId?: string;
}

export type ApplicabilityResult =
  | { applicable: true }
  | { applicable: false; reasonCode: "NO_DESIGN_INTAKE_CHANGES" | "NO_GOVERNED_TRACK_MATCH" };

const DESIGN_INTAKE_PATH_PREFIXES = [
  "lib/design-intake/",
  "design-intake/",
  "tests/fixtures/source-freshness/",
] as const;

const MANIFEST_MARKERS = [
  "manifest",
  "source-snapshot",
  "source-freshness",
  "drive-observer",
] as const;

/** True if a repo-relative path touches design-intake manifest authority. */
export function touchesDesignIntake(path: string): boolean {
  for (const prefix of DESIGN_INTAKE_PATH_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  for (const marker of MANIFEST_MARKERS) {
    if (path.includes(marker)) return true;
  }
  return false;
}

export function isSourceFreshnessApplicable(input: ApplicabilityInput): ApplicabilityResult {
  const files = Array.isArray(input.changedFiles) ? input.changedFiles : [];
  const manifestImpact = input.manifestImpact === true;
  const trackImpact = input.trackImpact === true;

  const fileImpact = files.some((f) => typeof f === "string" && touchesDesignIntake(f));

  if (manifestImpact || trackImpact || fileImpact) {
    const governed = input.governedTrackIds;
    if (governed && governed.length > 0) {
      const observed = input.observedTrackId;
      if (typeof observed !== "string" || !governed.includes(observed)) {
        return { applicable: false, reasonCode: "NO_GOVERNED_TRACK_MATCH" };
      }
    }
    return { applicable: true };
  }

  return { applicable: false, reasonCode: "NO_DESIGN_INTAKE_CHANGES" };
}
