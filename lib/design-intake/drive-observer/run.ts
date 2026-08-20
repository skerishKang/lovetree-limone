/**
 * Observation runner shared by the #173 CLIs (observe + freshness:live).
 *
 * Pure orchestration: config → transport (fixture or live) → observations.
 * I/O, exit codes and printing stay in the CLI scripts. The runner never
 * fabricates a PASS: every degraded provider state stays in the observation
 * for the CLI to fail closed on.
 */

import {
  type DriveAccessTokenProvider,
  type DriveObservation,
  type DriveObserverConfig,
  type DriveSha256Hasher,
  type DriveTransport,
} from "./types";
import type { DriveFixtureData } from "./transport";
import {
  createEnvAccessTokenProvider,
  createFixtureDriveTransport,
  createHttpDriveTransport,
  liveObservationAvailability,
  type LiveObservationAvailability,
} from "./transport";
import { observeDriveTrack } from "./observe";

export type ObservationMode = "fixture" | "live";

export interface ObserveTracksOptions {
  mode: ObservationMode;
  /** Fixture-mode provider data (required when mode === "fixture"). */
  fixture?: DriveFixtureData;
  /** Environment for the live credential contract (LIVE mode). */
  env?: Record<string, string | undefined>;
  /** Injectable fetch for tests; default global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Restrict to specific stableIds (default: every configured track). */
  trackIds?: readonly string[];
  hasher: DriveSha256Hasher;
  /** Injectable clock for deterministic output. */
  now?: () => Date;
}

export interface ObservationRunResult {
  observations: readonly DriveObservation[];
  availability: LiveObservationAvailability;
}

export function parseDriveObserverConfig(raw: unknown): DriveObserverConfig {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("drive observer config must be a JSON object");
  }
  const config = raw as { schemaVersion?: unknown; tracks?: unknown };
  if (config.schemaVersion !== 1) {
    throw new Error("drive observer config schemaVersion must be 1");
  }
  if (!Array.isArray(config.tracks) || config.tracks.length === 0) {
    throw new Error("drive observer config must declare a non-empty tracks array");
  }
  const seen = new Set<string>();
  for (const [index, entry] of config.tracks.entries()) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`drive observer config tracks[${index}] must be an object`);
    }
    const track = entry as Record<string, unknown>;
    if (typeof track.stableId !== "string" || track.stableId.trim() === "") {
      throw new Error(`drive observer config tracks[${index}].stableId must be a non-empty string`);
    }
    if (typeof track.driveFolderId !== "string" || track.driveFolderId.trim() === "") {
      throw new Error(`drive observer config tracks[${index}].driveFolderId must be a non-empty string`);
    }
    if (seen.has(track.stableId)) {
      throw new Error(`drive observer config duplicate stableId '${track.stableId}'`);
    }
    seen.add(track.stableId);
  }
  return config as unknown as DriveObserverConfig;
}

export async function observeTracks(
  config: DriveObserverConfig,
  options: ObserveTracksOptions,
): Promise<ObservationRunResult> {
  const filter = options.trackIds !== undefined ? new Set(options.trackIds) : undefined;
  const tracks = config.tracks.filter((track) => filter === undefined || filter.has(track.stableId));
  if (filter !== undefined && tracks.length === 0) {
    throw new Error(`no configured track matches: ${[...filter].join(", ")}`);
  }

  let transport: DriveTransport;
  let availability: LiveObservationAvailability;
  if (options.mode === "fixture") {
    if (options.fixture === undefined) {
      throw new Error("fixture mode requires --fixture <provider-fixture.json>");
    }
    transport = createFixtureDriveTransport(options.fixture);
    availability = { enabled: true, reason: "fixture mode — offline deterministic transport (no network)" };
  } else {
    const env = options.env ?? {};
    availability = liveObservationAvailability(env);
    if (!availability.enabled) {
      return { observations: [], availability };
    }
    const tokenProvider: DriveAccessTokenProvider = createEnvAccessTokenProvider(env);
    transport = createHttpDriveTransport({ tokenProvider, fetch: options.fetch });
  }

  const observations: DriveObservation[] = [];
  for (const track of tracks) {
    observations.push(
      await observeDriveTrack(track, { transport, hasher: options.hasher, now: options.now }),
    );
  }
  return { observations, availability };
}

/** true only when every observation is a complete SUCCESS. */
export function allObservationsComplete(observations: readonly DriveObservation[]): boolean {
  return observations.length > 0 && observations.every(
    (observation) => observation.providerState === "SUCCESS" && observation.observationComplete === true,
  );
}
