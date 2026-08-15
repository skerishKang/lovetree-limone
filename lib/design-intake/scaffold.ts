/**
 * Deterministic, fail-closed scaffold generator for the Design Intake Native
 * Candidate Factory.
 *
 * - Input is an approved typed manifest only. Source HTML/JS is never executed.
 * - `buildScaffoldPlan` is a pure function of (manifest, registry snapshot,
 *   existing manifests, filesystem state) and produces an ordered, stable plan.
 * - Collisions (stable id, lineage/revision identity, route, target path,
 *   fidelity target id, registry entry, existing filesystem path) fail closed.
 * - `writeScaffoldPlan` refuses to overwrite any existing path.
 * - The factory never writes under canonical product trees (app/v4/...).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  DesignIntakeManifest,
  ExactAssetGateState,
  IntakeRoute,
  NativeReadinessState,
  QaContract,
} from "./manifest";
import {
  DEFAULT_NATIVE_READINESS,
  exactGatePassIsValid,
  lifecycleImpliesExecutable,
  parseIntakeManifest,
  IntakeManifestError,
} from "./manifest";
import {
  IntakeCollisionError,
  candidateIdFor,
  checkRegistryCollisions,
  fidelityTargetIdFor,
  loadRegistrySnapshot,
  type FidelityTargetLite,
  type RegistrySeamRegistration,
} from "./registry-seams";

export type { RegistrySeamRegistration } from "./registry-seams";
export { IntakeCollisionError } from "./registry-seams";


export interface ScaffoldOptions {
  /** Repo root for filesystem collision checks and writes. Defaults to process.cwd(). */
  root?: string;
  /** Previously scaffolded manifests (stableId + planned route collisions). */
  existingManifests?: readonly DesignIntakeManifest[];
  /** Live Design Fidelity targets (from scripts/design-fidelity-validation-registry.mjs). */
  fidelityTargets?: readonly FidelityTargetLite[];
}

export interface ScaffoldWrite {
  /** Repository-relative target path. */
  path: string;
  kind: string;
  content: string;
}


export interface ScaffoldPlan {
  manifest: DesignIntakeManifest;
  /** Deterministic ordered write list (sorted by path). */
  writes: readonly ScaffoldWrite[];
  /** The three registry seams: designLineages, designLab, designFidelity. */
  registrySeams: readonly RegistrySeamRegistration[];
  /** Resolved Design Lab route (null when the candidate has no executable route). */
  route: IntakeRoute | null;
  executable: boolean;
  /** Marker emitted by the generated asset verifier on exact gate PASS. */
  assetGateMarker: string | null;
}

const STABLE_ID_UPPER = (stableId: string) => stableId.toUpperCase().replace(/-/g, "_");
const ASSET_GATE_MARKER = (stableId: string) => `${STABLE_ID_UPPER(stableId)}_EXACT_ASSET_GATE_PASS`;

function jsonContent(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/* ------------------------------------------------------------------ */
/* Route resolution — routes are derived from identity, fail closed   */
/* ------------------------------------------------------------------ */

function resolveRoute(
  manifest: DesignIntakeManifest,
  lineageNumber: number | null,
): IntakeRoute | null {
  if (!manifest.route) return null;

  if (manifest.route.surface === "lineage") {
    if (lineageNumber === null || !manifest.revisionId) {
      throw new IntakeCollisionError([
        `route surface 'lineage' requires a resolvable lineage number and revisionId for ${manifest.stableId}`,
      ]);
    }
    const expected = `/design-lab/lineages/${lineageNumber}/${manifest.revisionId}`;
    if (manifest.route.path !== expected) {
      throw new IntakeCollisionError([
        `route path '${manifest.route.path}' does not match identity-derived path '${expected}'`,
      ]);
    }
    return manifest.route;
  }

  const expectedCapability = `/design-lab/capabilities/${manifest.stableId}`;
  if (manifest.route.path !== expectedCapability) {
    throw new IntakeCollisionError([
      `capability route path '${manifest.route.path}' does not match identity-derived path '${expectedCapability}'`,
    ]);
  }
  return manifest.route;
}

/* ------------------------------------------------------------------ */
/* Registry seam registration builders                                 */
/* ------------------------------------------------------------------ */

function designLineagesSeam(
  manifest: DesignIntakeManifest,
  executable: boolean,
  routePath: string | null,
): RegistrySeamRegistration {
  if (manifest.classification === "NEW_LINEAGE") {
    if (manifest.lineageNumber === undefined) {
      return {
        seam: "designLineages",
        status: "not-applicable",
        targetFile: "lib/design-lineages.ts",
        reason: `lineage reservation is '${manifest.lineageReservation?.status ?? "PENDING"}' — no lineage number is allocated; register only after explicit reservation (e.g. Track62 V1.1)`,
      };
    }
    return {
      seam: "designLineages",
      status: "entry",
      targetFile: "lib/design-lineages.ts",
      entry: {
        action: "add-lineage",
        lineage: {
          id: manifest.designLineageId,
          number: manifest.lineageNumber,
          label: manifest.title,
          status: manifest.reservation?.held ? "hold" : "incoming",
          summary: manifest.summary,
          scenarios: [manifest.scenarioId],
          currentDecision: `Intake scaffolded from ${manifest.stableId} (${
            manifest.reservation?.held ? "reservation/adoption HOLD" : "candidate review"
          }) — canonical adoption is a separate decision.`,
          sourceLabel: manifest.provenance.sourceLabel,
          revisions: [
            {
              id: manifest.revisionId,
              label: manifest.title,
              decision: "candidate",
              executable,
              route: routePath ?? undefined,
              notes: `scaffolded from ${manifest.stableId}; source fidelity not claimed`,
            },
          ],
        },
      },
    };
  }

  if (manifest.classification === "EXISTING_LINEAGE_VARIANT") {
    return {
      seam: "designLineages",
      status: "entry",
      targetFile: "lib/design-lineages.ts",
      entry: {
        action: "add-revision",
        lineageId: manifest.designLineageId,
        revision: {
          id: manifest.revisionId,
          label: manifest.title,
          decision: "candidate",
          executable,
          route: routePath ?? undefined,
          notes: `scaffolded from ${manifest.stableId}; source fidelity not claimed`,
        },
      },
    };
  }

  return {
    seam: "designLineages",
    status: "not-applicable",
    targetFile: "lib/design-lineages.ts",
    reason:
      manifest.classification === "CANONICAL_OWNER_CAPABILITY"
        ? `capability is canonically owned at ${manifest.ownerRoute ?? "<ownerRoute>"}; no lineage reservation`
        : "REFERENCE_CAPABILITY_ONLY reserves no lineage/revision identity",
  };
}

function designLabSeam(
  manifest: DesignIntakeManifest,
  executable: boolean,
  routePath: string | null,
  nativeReadiness: NativeReadinessState,
): RegistrySeamRegistration {
  const id = candidateIdFor(manifest);
  if (!id) {
    return {
      seam: "designLab",
      status: "not-applicable",
      targetFile: "lib/design-lab.ts",
      reason: "REFERENCE_CAPABILITY_ONLY exposes no Design Lab variant until adopted",
    };
  }

  const origin =
    manifest.classification === "CANONICAL_OWNER_CAPABILITY"
      ? "integrated-experience"
      : "lineage-intake";

  // H: Design Lab status derives from the native readiness state, never from
  // sibling source existence. SCAFFOLDED/IMPLEMENTATION_PENDING stay
  // received/mapped — only IMPLEMENTED/VALIDATED promote the candidate.
  const status =
    nativeReadiness === "IMPLEMENTED"
      ? "implemented"
      : nativeReadiness === "VALIDATED"
        ? "validated"
        : executable
          ? "mapped"
          : "received";

  return {
    seam: "designLab",
    status: "entry",
    targetFile: "lib/design-lab.ts",
    entry: {
      action: "add-candidate",
      candidate: {
        id,
        label: manifest.title,
        scenarioId: manifest.scenarioId,
        route: routePath ?? undefined,
        status,
        origin,
        kind: "experience",
        lineageId: manifest.designLineageId,
        revisionId: manifest.revisionId,
        sourceFile: manifest.provenance.sourceFiles[0],
        role: manifest.productJob,
        nativeReadiness,
        notes: `scaffolded from ${manifest.stableId}; source fidelity not claimed`,
      },
    },
  };
}

function designFidelitySeam(
  manifest: DesignIntakeManifest,
  executable: boolean,
  routePath: string | null,
  nativeReadiness: NativeReadinessState,
  qa: QaContract | undefined,
  assetGate: ExactAssetGateState | undefined,
  assetVerifierPath: string | null,
  marker: string | null,
): RegistrySeamRegistration {
  const targetId = routePath ? fidelityTargetIdFor(manifest) : null;

  if (!routePath || !targetId) {
    return {
      seam: "designFidelity",
      status: "not-applicable",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: "no executable Design Lab route yet — fidelity target deferred until EXECUTABLE_AVAILABLE",
    };
  }

  if (!executable) {
    return {
      seam: "designFidelity",
      status: "deferred",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: `lifecycle ${manifest.lifecycle} is not executable — register the fidelity target only after EXECUTABLE_AVAILABLE`,
    };
  }

  // H: a source executable alone never activates fidelity. The target may only
  // become active after the native candidate is IMPLEMENTED/VALIDATED with
  // target-specific browser QA. Order: source executable → scaffold → native
  // implementation → focused/browser QA → Fidelity eligibility.
  if (nativeReadiness !== "IMPLEMENTED" && nativeReadiness !== "VALIDATED") {
    return {
      seam: "designFidelity",
      status: "deferred",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: `source executable does not imply native implementation (nativeReadiness '${nativeReadiness}') — fidelity target activates only after the native candidate is IMPLEMENTED/VALIDATED with browser QA`,
    };
  }

  // K: a fidelity-eligible candidate must carry the standard QA contract
  // (1280×800 + 390×844 + reduced-motion + overflow/console/page flags).
  if (!qa) {
    return {
      seam: "designFidelity",
      status: "deferred",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: "manifest.qa absent — a fidelity-eligible candidate requires the standard QA contract (1280×800 + 390×844 + reduced-motion + overflow/console/page)",
    };
  }

  // B2: standard reduced-motion evidence is mandatory before a fidelity target
  // may activate. The central runner only performs the reduced-motion capture
  // when captureReducedMotion is true, so declaring reducedMotion:false (or
  // omitting the evidence) must never produce an active target — fail closed.
  if (qa.reducedMotion !== true) {
    return {
      seam: "designFidelity",
      status: "deferred",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: `qa.reducedMotion is not true — standard reduced-motion evidence is not yet satisfied; fidelity target stays deferred (reducedMotion: '${qa.reducedMotion}')`,
    };
  }

  // I: P8 ordering — declared runtime exact assets with an incomplete/FAIL gate
  // must never produce an active target with assetGate:null.
  const runtimeAssets = manifest.exactAssets ?? [];
  const gatePass =
    Boolean(assetGate) &&
    exactGatePassIsValid(assetGate as ExactAssetGateState) &&
    (assetGate as ExactAssetGateState).exactGateStatus === "EXACT_GATE_PASS";
  if (runtimeAssets.length > 0 && !gatePass) {
    return {
      seam: "designFidelity",
      status: "deferred",
      targetFile: "scripts/design-fidelity-validation-registry.mjs",
      reason: `runtime exact assets declared but exact gate is not PASS (${assetGate?.exactGateStatus ?? "no gate"}) — visual fidelity PASS is impossible until the exact asset gate passes`,
    };
  }

  const useAssetGate = runtimeAssets.length > 0 && gatePass && Boolean(assetVerifierPath) && Boolean(marker);

  // J: impactPrefixes are repository FILESYSTEM prefixes (Git changed paths),
  // never URL routes. The route page, browser gate, manifest/scaffold files and
  // every runtime exact asset target participate in impact selection.
  const impactPrefixes = [
    `app${routePath}/`,
    `reference/design-intake/${manifest.stableId}/`,
    `tests/${manifest.stableId}-`,
    `docs/product/design-intake/${manifest.stableId}/`,
    `design-intake/manifests/${manifest.stableId}`,
    `design-intake/scaffolds/${manifest.stableId}/`,
    ...(assetVerifierPath ? [assetVerifierPath] : []),
    ...runtimeAssets.map((asset) => asset.targetPath),
  ];

  return {
    seam: "designFidelity",
    status: "entry",
    targetFile: "scripts/design-fidelity-validation-registry.mjs",
    entry: {
      action: "add-target",
      target: {
        id: targetId,
        label: manifest.fidelityTargetMetadata?.label ?? manifest.title,
        route: routePath,
        validationClass: manifest.fidelityTargetMetadata?.validationClass ?? "source-fidelity",
        impactPrefixes,
        assetGate: useAssetGate
          ? { verifier: assetVerifierPath, expectedMarker: marker }
          : null,
        browserGates: [`tests/${manifest.stableId}-route-browser-qa.mjs`],
        viewports: qa.viewports,
        captureReducedMotion: qa.reducedMotion,
        extraEvidencePaths: [],
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Generated file content                                             */
/* ------------------------------------------------------------------ */

function provenanceContent(manifest: DesignIntakeManifest): string {
  const snapshot = manifest.sourceSnapshot;
  const lines = [
    `# ${manifest.stableId} — Provenance / Reference Skeleton`,
    "",
    "Generated by `design:intake:scaffold`. Drive originals are read-only reference;",
    "this scaffold never claims source fidelity.",
    "",
    "- stableId: " + manifest.stableId,
    "- sourceTrackId: " + manifest.sourceTrackId,
    "- designLineageId: " + (manifest.designLineageId ?? "(none)"),
    "- classification: " + manifest.classification,
    "- lifecycle: " + manifest.lifecycle,
    "- nativeReadiness: " + (manifest.nativeReadiness ?? "SCAFFOLDED"),
    "- rendering: " + (manifest.rendering ?? "unresolved"),
    ...(manifest.renderingAdapters?.length
      ? ["- renderingAdapters: " + manifest.renderingAdapters.join(", ")]
      : []),
    "- scenarioId: " + manifest.scenarioId,
    "- productJob: " + manifest.productJob,
    "- sourceLabel: " + manifest.provenance.sourceLabel,
    "- driveFolderId: " + (manifest.provenance.driveFolderId ?? "(none)"),
    "- rightsStatus: " + manifest.provenance.rightsStatus,
    "- reservation.held: " + String(manifest.reservation?.held ?? false),
    "- sourceSnapshot: " +
      (snapshot
        ? `${snapshot.revisionLabel} (${snapshot.sourceAuthorityState} @ ${snapshot.authorityObservedAt})`
        : "(none)"),
    ...(snapshot?.newerRevisionKnown ? ["- newerRevisionKnown: " + snapshot.newerRevisionKnown] : []),
    "- sourceFiles:",
    ...manifest.provenance.sourceFiles.map((file) => "  - " + file),
    "- sourceArtifacts:",
    ...(manifest.sourceArtifacts ?? []).map((artifact) =>
      `  - ${artifact.filename} (Drive ${artifact.driveId}, ${artifact.role}, ${artifact.status})`,
    ),
    ...((manifest.sourceArtifacts ?? []).length === 0 ? ["  - (none pinned)"] : []),
    "",
    "Rules:",
    "- Treat Drive originals as read-only; never rewrite or reformat them.",
    "- Source HTML/JS in this folder is evidence only and must never be executed by product code.",
    "- The pinned source snapshot is the proving revision: newer Drive revisions do not invalidate this pin (continuous intake under #80).",
    "- Exact fidelity PASS requires the P8 gate (fingerprint + binary transfer) and is never inferred from this file.",
  ];
  return lines.join("\n") + "\n";
}

function routePageContent(manifest: DesignIntakeManifest, surface: "lineage" | "capability"): string {
  const rendering = manifest.rendering ?? "unresolved";
  const component = surface === "lineage" ? "LineageScaffoldPage" : "CapabilityScaffoldPage";
  return [
    'import type { Metadata } from "next";',
    "",
    "export const metadata: Metadata = {",
    `  title: ${JSON.stringify(manifest.title)},`,
    "};",
    "",
    "const CANDIDATE = {",
    `  stableId: ${JSON.stringify(manifest.stableId)},`,
    `  sourceTrackId: ${JSON.stringify(manifest.sourceTrackId)},`,
    `  title: ${JSON.stringify(manifest.title)},`,
    `  classification: ${JSON.stringify(manifest.classification)},`,
    `  lifecycle: ${JSON.stringify(manifest.lifecycle)},`,
    `  rendering: ${JSON.stringify(rendering)},`,
    `  productJob: ${JSON.stringify(manifest.productJob)},`,
    "  sourceFidelityClaimed: false,",
    "} as const;",
    "",
    `export default function ${component}() {`,
    "  return (",
    "    <main>",
    "      <h1>{CANDIDATE.title}</h1>",
    "      <p>{CANDIDATE.sourceTrackId} · {CANDIDATE.productJob}</p>",
    "      <p>",
    "        Lifecycle: {CANDIDATE.lifecycle} · Rendering: {CANDIDATE.rendering} ·",
    "        Classification: {CANDIDATE.classification}",
    "      </p>",
    "      <p>Source fidelity: not claimed by scaffold ({CANDIDATE.stableId}).</p>",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function contractTestContent(manifest: DesignIntakeManifest): string {
  return [
    'import assert from "node:assert/strict";',
    'import test from "node:test";',
    'import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";',
    "",
    `const MANIFEST = ${JSON.stringify(manifest, null, 2)};`,
    "",
    `test("${manifest.stableId}: manifest stays schema-valid", () => {`,
    "  const parsed = parseIntakeManifest(MANIFEST);",
    `  assert.equal(parsed.stableId, ${JSON.stringify(manifest.stableId)});`,
    `  assert.equal(parsed.sourceTrackId, ${JSON.stringify(manifest.sourceTrackId)});`,
    `  assert.equal(parsed.classification, ${JSON.stringify(manifest.classification)});`,
    "});",
    "",
    `test("${manifest.stableId}: provenance is reference-only and never executed", () => {`,
    "  const parsed = parseIntakeManifest(MANIFEST);",
    "  assert.ok(parsed.provenance.sourceFiles.length > 0);",
    "  assert.equal(parsed.schemaVersion, 1);",
    "});",
    "",
  ].join("\n");
}

function browserQaContent(manifest: DesignIntakeManifest, routePath: string): string {
  return [
    'import assert from "node:assert/strict";',
    'import test from "node:test";',
    "",
    `const ROUTE = ${JSON.stringify(routePath)};`,
    "",
    `test("${manifest.stableId}: design lab route responds without claiming source fidelity", async () => {`,
    "  const baseUrl = process.env.V4_BASE_URL ?? process.env.LOVETREE_QA_BASE_URL;",
    '  assert.ok(baseUrl, "V4_BASE_URL or LOVETREE_QA_BASE_URL must be set");',
    '  const response = await fetch(`${baseUrl}${ROUTE}`, { redirect: "manual" });',
    '  assert.ok(response.ok, `route HTTP ${response.status}`);',
    "  const html = await response.text();",
    "  assert.match(html, /Source fidelity/);",
    "});",
    "",
  ].join("\n");
}

function assetVerifierContent(manifest: DesignIntakeManifest, marker: string): string {
  // C: generated executable content never raw-interpolates manifest strings.
  // Manifest-derived metadata is embedded as an inert JSON.stringify data
  // literal and only referenced by index — a newline/code-like manifest value
  // can never become a top-level generated JS statement.
  const assetsJson = JSON.stringify(manifest.exactAssets ?? [], null, 2);
  const assetCount = (manifest.exactAssets ?? []).length;
  return [
    `// Exact-asset verifier SKELETON for ${manifest.stableId}.`,
    "// P8 contract: FINGERPRINT_COMPLETE !== BINARY_TRANSFER_COMPLETE !== EXACT_GATE_PASS.",
    "// Fingerprint metadata alone never implies transfer PASS, and transfer alone never",
    "// implies an exact gate PASS.",
    "//",
    "// Manifest-derived metadata below is an inert JSON data literal; it is never",
    "// evaluated as executable code.",
    "//",
    `const EXPECTED_ASSETS = ${assetsJson};`,
    "//",
    "// Replace this skeleton with the real binary check (bytes + sha256 + gitBlobSha",
    "// per EXPECTED_ASSETS entry) before the Design Fidelity target enables its",
    "// assetGate. The skeleton deliberately never emits a PASS marker.",
    "",
    `const GATE_MARKER = ${JSON.stringify(marker)};`,
    `const EXPECTED_ASSET_COUNT = ${JSON.stringify(assetCount)};`,
    "",
    "const status = {",
    '  fingerprintStatus: "FINGERPRINT_PARTIAL",',
    '  binaryTransferStatus: "BINARY_TRANSFER_NONE",',
    '  exactGateStatus: "EXACT_GATE_PENDING",',
    "};",
    "",
    "if (EXPECTED_ASSET_COUNT === 0) {",
    '  console.error("skeleton requires at least one runtime exact asset");',
    "  process.exit(1);",
    "}",
    'if (process.env.EXPECT_EXACT_GATE === "PASS") {',
    '  console.error(`${GATE_MARKER}: skeleton cannot satisfy EXACT_GATE_PASS`);',
    "  process.exit(1);",
    "}",
    "",
    "console.log(\"EXACT_ASSET_GATE_PENDING\");",
    "",
  ].join("\n");
}

function mechanicRows(manifest: DesignIntakeManifest): readonly string[] {
  const rows: string[] = [];
  const evidence = (manifest.sourceArtifacts ?? []).map((artifact) => artifact.filename).join(", ") || "(source evidence pending)";
  const pushRow = (mechanic: string, kind: string) => {
    rows.push(
      [
        mechanic,
        evidence,
        `NONE — scaffold (${kind} not implemented)`,
        "UNDECIDED",
        "canonical Moment/Connection projections — no schema change",
        "NOT VERIFIED — HOLD",
        "NOT VERIFIED — HOLD",
        "NOT VERIFIED — HOLD",
        "pending — Design Fidelity + browser QA required",
        "UNDECIDED/HOLD",
        "scaffold never auto-selects an adoption decision",
      ].join(" | "),
    );
  };
  for (const capabilityId of manifest.reusableCapabilities ?? []) {
    pushRow(`capability:${capabilityId}`, "capability");
  }
  for (const primitiveId of manifest.runtimePrimitives ?? []) {
    pushRow(`primitive:${primitiveId}`, "runtime primitive");
  }
  if (manifest.trulyNewPrimitive) {
    pushRow(`new:${manifest.trulyNewPrimitive}`, "new primitive");
  }
  if (rows.length === 0) {
    rows.push(
      [
        "(no mechanics declared yet)",
        evidence,
        "NONE — scaffold",
        "UNDECIDED",
        "canonical Moment/Connection projections — no schema change",
        "NOT VERIFIED — HOLD",
        "NOT VERIFIED — HOLD",
        "NOT VERIFIED — HOLD",
        "pending — reuse review required before implementation-ready",
        "UNDECIDED/HOLD",
        "scaffold never auto-selects an adoption decision",
      ].join(" | "),
    );
  }
  return rows;
}

function adoptionReportContent(manifest: DesignIntakeManifest): string {
  const adoptionStatus = manifest.adoption?.status ?? "UNDECIDED";
  const lines = [
    `# ${manifest.stableId} — Adoption Report (scaffold)`,
    "",
    "Generated by `design:intake:scaffold`. The scaffold initial value is UNDECIDED/HOLD;",
    "it never auto-selects an adoption decision. Adoption is a separate product decision.",
    "",
    `- adoptionStatus: ${adoptionStatus} (manifest metadata; scaffold initial is UNDECIDED/HOLD)`,
    "- supported statuses: ADOPT / DO NOT ADOPT / SOURCE REFERENCE ONLY / PRODUCT POLICY REQUIRED",
    `- adoption note: ${manifest.adoption?.note ?? "(none recorded)"}`,
    "- sourceTrackId: " + manifest.sourceTrackId,
    "- designLineageId: " + (manifest.designLineageId ?? "(none)"),
    "- lineageReservation: " + (manifest.lineageReservation?.status ?? "(n/a)"),
    "- classification: " + manifest.classification,
    "- lifecycle: " + manifest.lifecycle,
    "- nativeReadiness: " + (manifest.nativeReadiness ?? "SCAFFOLDED"),
    "- rendering: " + (manifest.rendering ?? "unresolved"),
    "- scenarioId: " + manifest.scenarioId,
    "- productJob: " + manifest.productJob,
    "- canonical /v4 adoption: NOT CLAIMED by scaffold",
    "- exact asset gate: " + (manifest.exactAssetGate?.exactGateStatus ?? "EXACT_GATE_PENDING (no runtime assets)"),
    "- reservation held: " + String(manifest.reservation?.held ?? false),
    "",
    "## Mechanic-by-mechanic review",
    "",
    "| mechanic | source evidence | candidate proof | canonical V4 owner surface | data authority | accessibility contract | mobile/touch contract | reduced-motion contract | tests/evidence required | decision | decision reason |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...mechanicRows(manifest),
    "",
    "Next steps:",
    "- Review registry wiring (design-intake/scaffolds/" + manifest.stableId + "/REGISTRY_WIRING.md).",
    "- Resolve every HOLD in the reuse checklist before claiming implementation-ready.",
    "- Transfer exact binaries and flip the P8 gate only with verifier evidence.",
    "",
  ];
  return lines.join("\n") + "\n";
}

function reuseChecklistContent(manifest: DesignIntakeManifest): string {
  const rendering = manifest.rendering ?? "unresolved";
  const sections: Array<{ title: string; answer: string; status: string }> = [
    {
      title: "1. Product Job",
      answer: manifest.productJob,
      status: "OK",
    },
    {
      title: "2. Lineage visual identity",
      answer: `${manifest.classification} — ${manifest.title} (${rendering})`,
      status: manifest.rendering ? "OK" : "HOLD — rendering unresolved until executable",
    },
    {
      title: "3. Rendering",
      answer: rendering === "unresolved" ? "UNRESOLVED — no executable candidate yet" : rendering,
      status: rendering === "unresolved" ? "HOLD" : "OK",
    },
    {
      title: "4. Existing ExperienceCapabilities",
      answer: (manifest.reusableCapabilities ?? []).join(", ") || "TODO — reuse review required",
      status: (manifest.reusableCapabilities ?? []).length > 0 ? "OK" : "HOLD",
    },
    {
      title: "5. P1–P9 reused",
      answer: (manifest.runtimePrimitives ?? []).join(", ") || "TODO — runtime primitive mapping required",
      status: (manifest.runtimePrimitives ?? []).length > 0 ? "OK" : "HOLD",
    },
    {
      title: "6. Truly new primitive",
      answer: manifest.trulyNewPrimitive ?? "NONE — reuse only",
      status: "OK (NONE is a valid answer)",
    },
    {
      title: "7. Exact assets",
      answer:
        (manifest.exactAssets ?? []).length > 0
          ? (manifest.exactAssets ?? []).map((asset) => asset.filename).join(", ")
          : "NONE recorded — confirm no runtime-required binaries or pin them",
      status: (manifest.exactAssets ?? []).length > 0 ? "OK" : "HOLD — confirm before implementation-ready",
    },
    {
      title: "8. Source defects / native remediation",
      answer:
        (manifest.sourceDefects ?? []).length > 0 || (manifest.nativeRemediations ?? []).length > 0
          ? [
              ...(manifest.sourceDefects ?? []).map((defect) => `defect: ${defect}`),
              ...(manifest.nativeRemediations ?? []).map((remediation) => `remediation: ${remediation}`),
            ].join("\n")
          : "TODO — source defect review required",
      status:
        (manifest.sourceDefects ?? []).length > 0 || (manifest.nativeRemediations ?? []).length > 0
          ? "OK"
          : "HOLD",
    },
    {
      title: "9. Source-only / fake values excluded",
      answer: (manifest.sourceOnlyValues ?? []).join(", ") || "NONE recorded — verify before implementation-ready",
      status: (manifest.sourceOnlyValues ?? []).length > 0 ? "OK" : "HOLD — verify no source-only values leak",
    },
    {
      title: "10. Backend/Auth/DB-free scope",
      answer: manifest.backendScope ?? "UNSET",
      status: manifest.backendScope === "BACKEND_FREE" ? "OK" : "HOLD — backend decision required",
    },
  ];

  const lines = [
    `# ${manifest.stableId} — Reuse-before-new-code checklist (scaffold)`,
    "",
    "Reuse existing mechanics/primitives before writing new code. Every section must be",
    "answered; empty answers stay HOLD and never imply implementation-ready PASS.",
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      section.answer,
      "",
      `Status: ${section.status}`,
      "",
    ]),
    `IMPLEMENTATION_READY: NO — scaffold; resolve every HOLD above before claiming implementation-ready.`,
    "",
  ];
  return lines.join("\n") + "\n";
}

function wiringContent(
  manifest: DesignIntakeManifest,
  seams: readonly RegistrySeamRegistration[],
): string {
  const lines = [
    `# ${manifest.stableId} — Registry Wiring`,
    "",
    "A scaffolded route must never be missing from any of the three registry seams.",
    "Apply these registrations to the target files below, then run:",
    "",
    "```bash",
    "npm run design:intake:validate -- design-intake/manifests/" + manifest.stableId + ".json",
    "npm run lint && npm run typecheck && npm test",
    "```",
    "",
  ];
  for (const seam of seams) {
    lines.push(`## ${seam.seam} (${seam.status})`);
    lines.push("");
    lines.push(`Target file: \`${seam.targetFile}\``);
    lines.push("");
    if (seam.entry) {
      lines.push("```json");
      lines.push(JSON.stringify(seam.entry, null, 2));
      lines.push("```");
    } else {
      lines.push(`Not applicable: ${seam.reason ?? "no reason recorded"}`);
    }
    lines.push("");
  }
  lines.push("Reminders:");
  lines.push("- Source HTML/JS referenced by the manifest is never executed by product code.");
  lines.push("- Do not claim source fidelity until the exact-asset gate passes with verifier evidence.");
  lines.push("- The factory never writes under canonical /v4 product trees.");
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Plan building + write mode                                         */
/* ------------------------------------------------------------------ */

function existingCollisions(
  manifest: DesignIntakeManifest,
  existingManifests: readonly DesignIntakeManifest[],
): readonly string[] {
  const collisions: string[] = [];
  const duplicate = existingManifests.find((other) => other.stableId === manifest.stableId);
  if (duplicate) {
    collisions.push(`stableId '${manifest.stableId}' is already scaffolded by another manifest`);
  }
  const manifestTargets = new Set((manifest.exactAssets ?? []).map((asset) => asset.targetPath));
  for (const other of existingManifests) {
    if (other.stableId === manifest.stableId) continue;

    // Cross-manifest Design Fidelity target id collision.
    const otherId = fidelityTargetIdFor(other);
    if (otherId && otherId === fidelityTargetIdFor(manifest)) {
      collisions.push(
        `planned fidelity target id '${otherId}' collides with existing manifest '${other.stableId}'`,
      );
    }

    // Cross-manifest route collision.
    if (other.route && manifest.route && other.route.path === manifest.route.path) {
      collisions.push(
        `planned route '${manifest.route.path}' collides with existing manifest '${other.stableId}'`,
      );
    }

    // F: cross-manifest lineage identity collisions.
    if (
      manifest.designLineageId &&
      manifest.designLineageId === other.designLineageId &&
      manifest.revisionId &&
      manifest.revisionId === other.revisionId
    ) {
      collisions.push(
        `revision identity '${manifest.designLineageId}/${manifest.revisionId}' collides with existing manifest '${other.stableId}'`,
      );
    }

    // F: allocated lineage number collision (ALLOCATED vs ALLOCATED).
    if (
      manifest.lineageNumber !== undefined &&
      manifest.lineageNumber === other.lineageNumber
    ) {
      collisions.push(
        `allocated lineage number ${manifest.lineageNumber} collides with existing manifest '${other.stableId}'`,
      );
    }

    // F: competing designLineageId for unwired NEW_LINEAGE candidates.
    if (
      manifest.designLineageId &&
      manifest.designLineageId === other.designLineageId &&
      manifest.classification === "NEW_LINEAGE" &&
      other.classification === "NEW_LINEAGE"
    ) {
      collisions.push(
        `competing designLineageId '${manifest.designLineageId}' collides with existing manifest '${other.stableId}'`,
      );
    }

    // F: cross-manifest exact-asset targetPath collision.
    for (const target of manifestTargets) {
      if ((other.exactAssets ?? []).some((asset) => asset.targetPath === target)) {
        collisions.push(
          `exact asset targetPath '${target}' collides with existing manifest '${other.stableId}'`,
        );
      }
    }
  }
  return collisions;
}

/**
 * Resolve a repository-relative write path and enforce writer containment (B):
 * the resolved candidate must stay inside the scaffold root and must never be
 * under the canonical `app/v4` product tree. Throws IntakeCollisionError.
 */
function resolveContainedWrite(root: string, relativePath: string): string {
  const rootResolved = path.resolve(root);
  const candidate = path.resolve(rootResolved, relativePath);
  const rel = path.relative(rootResolved, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new IntakeCollisionError([
      `write path escapes scaffold root: '${relativePath}' (resolves outside '${rootResolved}')`,
    ]);
  }
  const segments = rel.split(path.sep);
  if (segments[0] === "app" && segments[1] === "v4") {
    throw new IntakeCollisionError([
      `write path under canonical app/v4 is forbidden: '${relativePath}'`,
    ]);
  }
  return candidate;
}

function fsCollisions(writes: readonly ScaffoldWrite[], root: string): readonly string[] {
  const collisions: string[] = [];
  for (const write of writes) {
    const candidate = resolveContainedWrite(root, write.path);
    if (existsSync(candidate)) {
      collisions.push(`existing filesystem path: ${write.path}`);
    }
  }
  return collisions;
}

/**
 * Build a deterministic scaffold plan. Throws IntakeManifestError for schema
 * problems and IntakeCollisionError for any identity/registry/filesystem
 * collision. Never writes to disk.
 */
export function buildScaffoldPlan(
  rawManifest: unknown,
  options: ScaffoldOptions = {},
): ScaffoldPlan {
  const root = options.root ?? process.cwd();
  const manifest = parseIntakeManifest(rawManifest);
  const snapshot = loadRegistrySnapshot(options.fidelityTargets ?? []);

  const registryCollisions = checkRegistryCollisions(manifest, snapshot);
  const manifestCollisions = existingCollisions(manifest, options.existingManifests ?? []);
  const allCollisions = [...registryCollisions, ...manifestCollisions];
  if (allCollisions.length > 0) {
    throw new IntakeCollisionError(allCollisions);
  }

  const executable = lifecycleImpliesExecutable(manifest.lifecycle);
  const lineageNumber = resolveLineageNumber(manifest, snapshot);
  const nativeReadiness = manifest.nativeReadiness ?? DEFAULT_NATIVE_READINESS;

  const route = resolveRoute(manifest, lineageNumber);

  const marker =
    manifest.exactAssets && manifest.exactAssets.length > 0
      ? ASSET_GATE_MARKER(manifest.stableId)
      : null;

  const gate = manifest.exactAssetGate;
  if (gate && !exactGatePassIsValid(gate)) {
    throw new IntakeCollisionError([
      "EXACT_GATE_PASS requires FINGERPRINT_COMPLETE and BINARY_TRANSFER_COMPLETE",
    ]);
  }

  const assetVerifierPath =
    manifest.exactAssets && manifest.exactAssets.length > 0
      ? `scripts/verify-${manifest.stableId}-assets.mjs`
      : null;

  const seams: RegistrySeamRegistration[] = [
    designLineagesSeam(manifest, executable, route?.path ?? null),
    designLabSeam(manifest, executable, route?.path ?? null, nativeReadiness),
    designFidelitySeam(
      manifest,
      executable,
      route?.path ?? null,
      nativeReadiness,
      manifest.qa,
      gate,
      assetVerifierPath,
      marker,
    ),
  ];

  const writes: ScaffoldWrite[] = [
    {
      path: `design-intake/scaffolds/${manifest.stableId}/manifest.json`,
      kind: "metadata-copy",
      content: jsonContent(manifest),
    },
    {
      path: `design-intake/scaffolds/${manifest.stableId}/registry-seams.json`,
      kind: "registry-seams",
      content: jsonContent(seams),
    },
    {
      path: `design-intake/scaffolds/${manifest.stableId}/REGISTRY_WIRING.md`,
      kind: "registry-wiring",
      content: wiringContent(manifest, seams),
    },
    {
      path: `design-intake/scaffolds/${manifest.stableId}/REUSE_CHECKLIST.md`,
      kind: "reuse-checklist",
      content: reuseChecklistContent(manifest),
    },
    {
      path: `reference/design-intake/${manifest.stableId}/PROVENANCE.md`,
      kind: "provenance",
      content: provenanceContent(manifest),
    },
    ...(route
      ? [
          {
            path:
              route.surface === "lineage"
                ? `app/design-lab/lineages/${lineageNumber}/${manifest.revisionId}/page.tsx`
                : `app/design-lab/capabilities/${manifest.stableId}/page.tsx`,
            kind: "route-page",
            content: routePageContent(manifest, route.surface),
          },
          {
            path: `tests/${manifest.stableId}-route-browser-qa.mjs`,
            kind: "browser-qa",
            content: browserQaContent(manifest, route.path),
          },
        ]
      : []),
    {
      path: `tests/${manifest.stableId}-intake-contract.test.mjs`,
      kind: "contract-test",
      content: contractTestContent(manifest),
    },
    ...(assetVerifierPath
      ? [
          {
            path: assetVerifierPath,
            kind: "asset-verifier",
            content: assetVerifierContent(manifest, marker as string),
          },
        ]
      : []),
    {
      path: `docs/product/design-intake/${manifest.stableId}/ADOPTION_REPORT.md`,
      kind: "adoption-report",
      content: adoptionReportContent(manifest),
    },
  ].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const filesystemCollisions = fsCollisions(writes, root);
  if (filesystemCollisions.length > 0) {
    throw new IntakeCollisionError(filesystemCollisions);
  }

  return {
    manifest,
    writes,
    registrySeams: seams,
    route,
    executable,
    assetGateMarker: marker,
  };
}

function resolveLineageNumber(
  manifest: DesignIntakeManifest,
  snapshot: ReturnType<typeof loadRegistrySnapshot>,
): number | null {
  if (manifest.lineageNumber !== undefined) return manifest.lineageNumber;
  if (!manifest.designLineageId) return null;
  return snapshot.lineageNumbersById.get(manifest.designLineageId) ?? null;
}

/** Read + parse a manifest JSON file from disk. */
export function readManifestFile(filePath: string): DesignIntakeManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new IntakeManifestError([
      `cannot read manifest '${filePath}': ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
  return parseIntakeManifest(raw);
}

/**
 * Write a plan's files with an atomic never-overwrite contract (D):
 * - the whole plan is re-checked for existing paths first (no partial start),
 * - each file is created exclusively (`wx`) so a TOCTOU race can never
 *   overwrite another process's file,
 * - containment is re-verified immediately before each write,
 * - if a single file already exists the write FAILS closed — no overwrite, no
 *   silent partial continue.
 * Returns the repository-relative paths written.
 */
export function writeScaffoldPlan(
  plan: ScaffoldPlan,
  options: ScaffoldOptions = {},
): readonly string[] {
  const root = path.resolve(options.root ?? process.cwd());
  const collisions = fsCollisions(plan.writes, root);
  if (collisions.length > 0) {
    throw new IntakeCollisionError(collisions);
  }
  const written: string[] = [];
  for (const write of plan.writes) {
    // Defense-in-depth: re-resolve and re-check containment right before the
    // write. A crafted plan must never escape the root or reach app/v4.
    const target = resolveContainedWrite(root, write.path);
    mkdirSync(path.dirname(target), { recursive: true });
    try {
      writeFileSync(target, write.content, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") {
        throw new IntakeCollisionError([
          `refusing to overwrite existing path (exclusive-create EEXIST): ${write.path}`,
        ]);
      }
      throw error;
    }
    written.push(write.path);
  }
  return written;
}
