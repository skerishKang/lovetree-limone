/**
 * Track 67 V2.4.2 — exact-source identity + WORKS target ledger (revision-local).
 *
 * This is a DESIGN-LAB review artifact, not canonical /v4 product adoption.
 * Fingerprint values are taken from the verified exact source and the design team's
 * own V2.4.2_SHA256SUMS.txt (drive id 1my0skzyOU_fsoz4MCkSl_mGz-nL4rGeG).
 *
 * WORKS ledger policy: fail-closed. No href may be fabricated. Every target is
 * either (a) a known, explicitly-provided route, or (b) status HOLD with href = null.
 * The invariant `worksLedgerHasNoFabricatedHref` is checked by the unit tests and
 * at runtime before any OPEN WORK affordance is rendered.
 */

export const LINEAGE_67_V24_ROUTE = "/design-lab/lineages/67/v2-4";
export const LINEAGE_67_V24_SOURCE_ROUTE = `${LINEAGE_67_V24_ROUTE}/source`;
export const LINEAGE_67_V24_NATIVE_ROUTE = `${LINEAGE_67_V24_ROUTE}/native`;

export const LINEAGE_67_V24_SOURCE = {
  candidateId: "track67_v2.4.2_works_compare_menu",
  revision: "V2.4.2",
  title: "Track 67 V2.4 — Persistent World + Works Navigation",
  /** Legacy Blob-based source path (shared SourceRunnerFrame uses this). */
  sourceAssetPath:
    "/design-lab-assets/lineages/67/v2-4/track67_v2.4_persistent_world_works_navigation.txt",
  /** Real package URL — iframe loads this directly; relative paths resolve naturally. */
  realPackageUrl:
    "/design-lab-assets/lineages/67/v2-4/track67_v2.4.2_works_compare_menu.html",
  sourceBytes: 12265511,
  sourceSha256: "85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f",
  driveExecutableId: "18krSKEJ1QLA0bGFBh1MDg5Q261fJ-r5A",
  driveInstructionId: "1VeMh85AZ_87unRt3-hIV8l2gQoQYSlsB",
  rendering: "RAW_WEBGL2_CUSTOM_WEBGL",
  runtimeSeconds: 24.0,
  expectedRuntimeApi: [
    "gl.getContext('webgl2')",
    "requestAnimationFrame loop",
    "STATIC CHUNKS + ACTIVE TAIL (112 raw samples / bake, no chunk-count cap)",
    "active tail bounded by bake cycle (trigger 120, residual raw)",
    "ribbonHitTest -> openInspect",
    "Space rewind / Tab orbit",
    "WORKS_ archive navigation",
  ],
} as const;

export const LINEAGE_67_V24_RUNNER_LABEL = "V2.4.2 EXACT SOURCE RUNNER";

export type WorksTargetStatus = "ENABLED" | "INTERNAL_STABLE" | "HOLD" | "REFERENCE";

export interface WorksTarget {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
  /** Known, explicitly-provided route. null means DO NOT navigate (HOLD/unknown). */
  readonly href: string | null;
  readonly status: WorksTargetStatus;
  readonly provenance: string;
}

/**
 * Assignable HOLD ledger (handoff §11). This is the project reference set.
 * - 66 / 64 / 61 carry explicitly-provided known routes -> ENABLED/INTERNAL_STABLE.
 * - 63 / 62 / 60 / 59 are HOLD (per handoff) -> href null, never fabricated.
 */
export const LINEAGE_67_V24_WORKS_ASSIGNABLE: readonly WorksTarget[] = [
  {
    id: "66",
    label: "TRACK 66 — FIRST TREE",
    sub: "Journey entry · 현재후보/v1.2",
    href: "/v4/journey?v12=1",
    status: "ENABLED",
    provenance: "handoff §11 ENABLED/INTERNAL_STABLE",
  },
  {
    id: "64",
    label: "TRACK 64 — WELCOME ORBIT",
    sub: "Floating Moment Entry Portal · v1-2-1",
    href: "/design-lab/lineages/64/v1-2-1",
    status: "INTERNAL_STABLE",
    provenance: "handoff §11 ENABLED/INTERNAL_STABLE",
  },
  {
    id: "61",
    label: "TRACK 61 — CONNECTION REVIEW",
    sub: "Guided Next Moment Builder · v1.9",
    href: "/design-lab/lineages/61/61-v1-9",
    status: "INTERNAL_STABLE",
    provenance: "handoff §11 ENABLED/INTERNAL_STABLE",
  },
  {
    id: "63",
    label: "TRACK 63 — MOMENT FIELD",
    sub: "3D View Studio · HOLD (V1.2 only runnable)",
    href: null,
    status: "HOLD",
    provenance: "handoff §11 HOLD (#191)",
  },
  {
    id: "62",
    label: "TRACK 62 — MEMORY SCULPTURE",
    sub: "Reference Fidelity rebuild · HOLD",
    href: null,
    status: "HOLD",
    provenance: "handoff §11 HOLD (ref-only)",
  },
  {
    id: "60",
    label: "TRACK 60 — MOMENT CLUSTER",
    sub: "HOLD until #232 merged",
    href: null,
    status: "HOLD",
    provenance: "handoff §11 HOLD (#232, only if merged)",
  },
  {
    id: "59",
    label: "TRACK 59 — MEMORY SKETCHBOOK",
    sub: "HOLD (depends #237)",
    href: null,
    status: "HOLD",
    provenance: "handoff §11 HOLD (#237)",
  },
] as const;

/**
 * V2.4.2 owner-selected WORKS set, transcribed from
 * 16_V2.4.2_WORKS_COMPARE_MENU_REPORT.md. This is WHAT THE SOURCE NAVIGATES.
 * Note: V2.4.2 drops 61 and 60 from the archive menu and adds 62 V1.1,
 * Track 13 MEMORY ATLAS, and FILE 01 LIVING VIDEO GRAPH. Href values for
 * non-67 tracks are intentionally null (no fabricated routes); only lineage-local
 * review routes that are explicitly known are filled.
 */
export const LINEAGE_67_V24_WORKS_V242_OWNER_SET: readonly WorksTarget[] = [
  { id: "67", label: "TRACK 67 — MEMORY TAPE", sub: "current", href: LINEAGE_67_V24_NATIVE_ROUTE, status: "ENABLED", provenance: "V2.4.2 owner set row 01" },
  { id: "66", label: "TRACK 66 — FIRST TREE", sub: "Journey entry", href: "/v4/journey?v12=1", status: "ENABLED", provenance: "V2.4.2 owner set row 02" },
  { id: "64", label: "TRACK 64 — WELCOME ORBIT", sub: "Floating Moment Entry Portal", href: "/design-lab/lineages/64/v1-2-1", status: "INTERNAL_STABLE", provenance: "V2.4.2 owner set row 03" },
  { id: "63", label: "TRACK 63 — MOMENT FIELD", sub: "3D View Studio", href: null, status: "HOLD", provenance: "V2.4.2 owner set row 04 · runnable V1.2 only" },
  { id: "62-v1-0", label: "TRACK 62 · V1.0 — MEMORY SCULPTURE", sub: "Reference Fidelity V1.0", href: null, status: "HOLD", provenance: "V2.4.2 owner set row 05 · 2026-08-16 버전1.0_레퍼런스피델리티_재구축_후보.html" },
  { id: "62-v1-1", label: "TRACK 62 · V1.1 — MEMORY SCULPTURE", sub: "62_기억조각상_원형레일전시", href: null, status: "REFERENCE", provenance: "V2.4.2 owner set row 06 · package-relative html" },
  { id: "13", label: "TRACK 13 — MEMORY ATLAS", sub: "04_메모리아틀라스_현재채택_진주360_v4", href: null, status: "HOLD", provenance: "V2.4.2 owner set row 07 · source Track13 resurrection HOLD per handoff §23" },
  { id: "59", label: "TRACK 59 — MEMORY SKETCHBOOK", sub: "Memory Sketchbook", href: null, status: "HOLD", provenance: "V2.4.2 owner set row 09 · depends #237" },
  { id: "file-01", label: "FILE 01 — LIVING VIDEO GRAPH", sub: "01_리빙영상기억그래프_v1", href: null, status: "REFERENCE", provenance: "V2.4.2 owner set row 08 · package-relative html" },
] as const;

/** Fail-closed invariant: a HOLD/unknown target must never carry a fabricated href. */
export function worksLedgerHasNoFabricatedHref(ledger: readonly WorksTarget[]): boolean {
  for (const target of ledger) {
    if (target.status === "HOLD" && target.href !== null) return false;
    if (target.href !== null && !target.href.startsWith("/")) return false;
  }
  return true;
}

export interface Lineage67V24Supersession {
  readonly observed: boolean;
  readonly supersedingRevisions: readonly string[];
  readonly v24_2Verified: boolean;
  readonly v25OrNewerObserved: boolean;
}

export const LINEAGE_67_V24_SUPERSESSION: Lineage67V24Supersession = {
  observed: true,
  supersedingRevisions: ["V2.4.1", "V2.4.2"],
  v24_2Verified: true,
  v25OrNewerObserved: false,
};
