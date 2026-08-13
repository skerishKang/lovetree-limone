/**
 * Registry seams for the Design Intake Native Candidate Factory.
 *
 * Every scaffolded candidate must be covered by the three existing registry
 * seams — never a route that is missing from one of them:
 *
 * 1. lib/design-lineages.ts          → Lineage / Revision authority
 * 2. lib/design-lab.ts               → Scenario Variant / Design Lab exposure
 * 3. scripts/design-fidelity-validation-registry.mjs → exact-head fidelity CI target
 *
 * Collisions against the live registries fail closed at plan time. The factory
 * never mutates these registries itself: it emits deterministic registration
 * entries + a wiring document for a human reviewer to apply.
 */

import { DESIGN_CANDIDATES } from "../design-lab";
import { DESIGN_LINEAGES } from "../design-lineages";
import type { DesignIntakeManifest } from "./manifest";

export interface FidelityTargetLite {
  id: string;
  route: string;
}

/**
 * Registration for one of the three registry seams. `entry` carries the exact
 * structured registration; `not-applicable`/`deferred` carry an explicit reason
 * so a route is never silently missing from a seam.
 */
export interface RegistrySeamRegistration {
  seam: "designLineages" | "designLab" | "designFidelity";
  status: "entry" | "deferred" | "not-applicable";
  targetFile: string;
  entry?: unknown;
  reason?: string;
}

export interface RegistrySnapshot {
  lineageIds: ReadonlySet<string>;
  lineageNumbers: ReadonlySet<number>;
  /** Map lineageId → lineage number (needed to resolve EXISTING_LINEAGE_VARIANT routes). */
  lineageNumbersById: ReadonlyMap<string, number>;
  /** Map lineageId → revision ids. */
  lineageRevisionIds: ReadonlyMap<string, ReadonlySet<string>>;
  candidateIds: ReadonlySet<string>;
  fidelityTargetIds: ReadonlySet<string>;
  fidelityTargetRoutes: ReadonlySet<string>;
}

export function loadRegistrySnapshot(
  fidelityTargets: readonly FidelityTargetLite[] = [],
): RegistrySnapshot {
  const lineageRevisionIds = new Map<string, Set<string>>();
  const lineageNumbersById = new Map<string, number>();
  for (const lineage of DESIGN_LINEAGES) {
    lineageRevisionIds.set(
      lineage.id,
      new Set(lineage.revisions.map((revision) => revision.id)),
    );
    lineageNumbersById.set(lineage.id, lineage.number);
  }
  return {
    lineageIds: new Set(DESIGN_LINEAGES.map((lineage) => lineage.id)),
    lineageNumbers: new Set(DESIGN_LINEAGES.map((lineage) => lineage.number)),
    lineageNumbersById,
    lineageRevisionIds,
    candidateIds: new Set(DESIGN_CANDIDATES.map((candidate) => candidate.id)),
    fidelityTargetIds: new Set(fidelityTargets.map((target) => target.id)),
    fidelityTargetRoutes: new Set(fidelityTargets.map((target) => target.route)),
  };
}

export class IntakeCollisionError extends Error {
  readonly collisions: readonly string[];

  constructor(collisions: readonly string[]) {
    super(`design intake scaffold collisions:\n- ${collisions.join("\n- ")}`);
    this.name = "IntakeCollisionError";
    this.collisions = collisions;
  }
}

/**
 * Fail-closed collision checks. Returns a list of collision descriptions;
 * an empty list means the manifest identity is free to scaffold.
 */
export function checkRegistryCollisions(
  manifest: DesignIntakeManifest,
  snapshot: RegistrySnapshot,
): readonly string[] {
  const collisions: string[] = [];

  if (manifest.classification === "NEW_LINEAGE") {
    if (manifest.designLineageId && snapshot.lineageIds.has(manifest.designLineageId)) {
      collisions.push(
        `NEW_LINEAGE designLineageId '${manifest.designLineageId}' already exists in lib/design-lineages.ts`,
      );
    }
    if (manifest.lineageNumber !== undefined && snapshot.lineageNumbers.has(manifest.lineageNumber)) {
      collisions.push(
        `NEW_LINEAGE lineageNumber ${manifest.lineageNumber} already exists in lib/design-lineages.ts`,
      );
    }
  }

  if (manifest.classification === "EXISTING_LINEAGE_VARIANT") {
    if (manifest.designLineageId && !snapshot.lineageIds.has(manifest.designLineageId)) {
      collisions.push(
        `EXISTING_LINEAGE_VARIANT references unknown lineage '${manifest.designLineageId}'`,
      );
    }
    if (manifest.designLineageId && manifest.revisionId) {
      const existing = snapshot.lineageRevisionIds.get(manifest.designLineageId);
      if (existing?.has(manifest.revisionId)) {
        collisions.push(
          `revision '${manifest.revisionId}' already exists in lineage '${manifest.designLineageId}'`,
        );
      }
    }
  }

  if (manifest.classification === "REFERENCE_CAPABILITY_ONLY") {
    if (manifest.designLineageId && snapshot.lineageIds.has(manifest.designLineageId)) {
      collisions.push(
        `REFERENCE_CAPABILITY_ONLY must not reuse existing lineage '${manifest.designLineageId}'`,
      );
    }
  }

  const designLabId = candidateIdFor(manifest);
  if (designLabId && snapshot.candidateIds.has(designLabId)) {
    collisions.push(`design candidate '${designLabId}' already exists in lib/design-lab.ts`);
  }

  const fidelityTargetId = fidelityTargetIdFor(manifest);
  if (fidelityTargetId && snapshot.fidelityTargetIds.has(fidelityTargetId)) {
    collisions.push(
      `design fidelity target '${fidelityTargetId}' already exists in scripts/design-fidelity-validation-registry.mjs`,
    );
  }

  if (manifest.route) {
    if (snapshot.fidelityTargetRoutes.has(manifest.route.path)) {
      collisions.push(`route '${manifest.route.path}' is already owned by a design fidelity target`);
    }
    if (manifest.route.path === "/design-lab") {
      collisions.push("route cannot be the bare /design-lab index");
    }
  }

  return collisions;
}

/** Deterministic Design Lab candidate id, e.g. `lineage:lt-60-...-v1`. */
export function candidateIdFor(manifest: DesignIntakeManifest): string | null {
  if (manifest.classification === "REFERENCE_CAPABILITY_ONLY") return null;
  if (manifest.designLineageId && manifest.revisionId) {
    return `lineage:${manifest.designLineageId}-${manifest.revisionId}`;
  }
  if (manifest.classification === "CANONICAL_OWNER_CAPABILITY") {
    return `capability:${manifest.stableId}`;
  }
  return null;
}

/** Deterministic Design Fidelity target id, e.g. `lineage-60-60-v1`. */
export function fidelityTargetIdFor(manifest: DesignIntakeManifest): string | null {
  if (!manifest.route) return null;
  const segment = manifest.route.path
    .replace(/^\/design-lab\/lineages\//, "lineage-")
    .replace(/^\/design-lab\/capabilities\//, "capability-")
    .replace(/\/+$/, "")
    .replace(/\//g, "-");
  return segment || null;
}
