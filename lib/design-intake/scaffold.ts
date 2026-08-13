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
  QaContract,
} from "./manifest";
import {
  exactGatePassIsValid,
  lifecycleImpliesExecutable,
  parseIntakeManifest,
  IntakeManifestError,
  type ExactAssetEntry,
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
        status: executable ? "mapped" : "received",
        origin,
        kind: "experience",
        lineageId: manifest.designLineageId,
        revisionId: manifest.revisionId,
        sourceFile: manifest.provenance.sourceFiles[0],
        role: manifest.productJob,
        notes: `scaffolded from ${manifest.stableId}; source fidelity not claimed`,
      },
    },
  };
}

function designFidelitySeam(
  manifest: DesignIntakeManifest,
  executable: boolean,
  routePath: string | null,
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

  const assetsComplete =
    manifest.lifecycle === "ARTIFACTS_COMPLETE" ||
    manifest.lifecycle === "EXECUTABLE_FINGERPRINT_PINNED";
  const useAssetGate = Boolean(assetGate && assetsComplete && assetVerifierPath && marker);

  return {
    seam: "designFidelity",
    status: "entry",
    targetFile: "scripts/design-fidelity-validation-registry.mjs",
    entry: {
      action: "add-target",
      target: {
        id: targetId,
        label: manifest.title,
        route: routePath,
        validationClass: "source-fidelity",
        impactPrefixes: [
          routePath.replace(/\/[^/]+\/[^/]+$/, "/"),
          `reference/design-intake/${manifest.stableId}/`,
          `tests/${manifest.stableId}-`,
          `docs/product/design-intake/${manifest.stableId}/`,
          `design-intake/manifests/${manifest.stableId}`,
          `design-intake/scaffolds/${manifest.stableId}/`,
          ...(assetVerifierPath ? [assetVerifierPath] : []),
        ],
        assetGate: useAssetGate
          ? { verifier: assetVerifierPath, expectedMarker: marker }
          : null,
        browserGates: [`tests/${manifest.stableId}-route-browser-qa.mjs`],
        viewports: qa?.viewports ?? [],
        captureReducedMotion: qa?.reducedMotion ?? false,
        extraEvidencePaths: [],
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Generated file content                                             */
/* ------------------------------------------------------------------ */

function provenanceContent(manifest: DesignIntakeManifest): string {
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
    "- rendering: " + manifest.rendering,
    "- scenarioId: " + manifest.scenarioId,
    "- productJob: " + manifest.productJob,
    "- sourceLabel: " + manifest.provenance.sourceLabel,
    "- driveFolderId: " + (manifest.provenance.driveFolderId ?? "(none)"),
    "- rightsStatus: " + manifest.provenance.rightsStatus,
    "- reservation.held: " + String(manifest.reservation?.held ?? false),
    "- sourceFiles:",
    ...manifest.provenance.sourceFiles.map((file) => "  - " + file),
    "",
    "Rules:",
    "- Treat Drive originals as read-only; never rewrite or reformat them.",
    "- Source HTML/JS in this folder is evidence only and must never be executed by product code.",
    "- Exact fidelity PASS requires the P8 gate (fingerprint + binary transfer) and is never inferred from this file.",
  ];
  return lines.join("\n") + "\n";
}

function routePageContent(manifest: DesignIntakeManifest, surface: "lineage" | "capability"): string {
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
    `  rendering: ${JSON.stringify(manifest.rendering)},`,
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
  const assetLines = (manifest.exactAssets ?? []).map(
    (asset: ExactAssetEntry) =>
      `//   - ${asset.filename} (${asset.mode}) -> ${asset.targetPath} (${asset.role}, ${asset.rightsStatus})`,
  );
  return [
    `// Exact-asset verifier SKELETON for ${manifest.stableId}.`,
    "// P8 contract: FINGERPRINT_COMPLETE !== BINARY_TRANSFER_COMPLETE !== EXACT_GATE_PASS.",
    "// Fingerprint metadata alone never implies transfer PASS, and transfer alone never",
    "// implies an exact gate PASS.",
    "// Expected assets:",
    ...assetLines,
    "//",
    "// Replace this skeleton with the real binary check (bytes + sha256 + gitBlobSha",
    `// per entry) before the Design Fidelity target enables its assetGate. The`,
    "// skeleton deliberately never emits a PASS marker.",
    "",
    `const GATE_MARKER = ${JSON.stringify(marker)};`,
    "",
    "const status = {",
    '  fingerprintStatus: "FINGERPRINT_PARTIAL",',
    '  binaryTransferStatus: "BINARY_TRANSFER_NONE",',
    '  exactGateStatus: "EXACT_GATE_PENDING",',
    "};",
    "",
    'if (process.env.EXPECT_EXACT_GATE === "PASS") {',
    '  console.error(`${GATE_MARKER}: skeleton cannot satisfy EXACT_GATE_PASS`);',
    "  process.exit(1);",
    "}",
    "",
    "console.log(\"EXACT_ASSET_GATE_PENDING\");",
    "",
  ].join("\n");
}

function adoptionReportContent(manifest: DesignIntakeManifest): string {
  return [
    `# ${manifest.stableId} — Adoption Report (skeleton)`,
    "",
    "Generated by `design:intake:scaffold`. Adoption is a separate product decision;",
    "this report records the intake state, not an approval.",
    "",
    "- status: NOT_APPROVED (scaffold)",
    "- sourceTrackId: " + manifest.sourceTrackId,
    "- designLineageId: " + (manifest.designLineageId ?? "(none)"),
    "- classification: " + manifest.classification,
    "- lifecycle: " + manifest.lifecycle,
    "- rendering: " + manifest.rendering,
    "- scenarioId: " + manifest.scenarioId,
    "- productJob: " + manifest.productJob,
    "- canonical /v4 adoption: NOT CLAIMED",
    "- exact asset gate: " + (manifest.exactAssetGate?.exactGateStatus ?? "EXACT_GATE_PENDING (no assets)"),
    "- reservation held: " + String(manifest.reservation?.held ?? false),
    "",
    "Next steps:",
    "- Review registry wiring (design-intake/scaffolds/" + manifest.stableId + "/REGISTRY_WIRING.md).",
    "- Implement the native candidate route, then real contract/browser QA.",
    "- Transfer exact binaries and flip the P8 gate only with verifier evidence.",
    "",
  ].join("\n");
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
  for (const other of existingManifests) {
    if (other.stableId === manifest.stableId) continue;
    const otherId = fidelityTargetIdFor(other);
    if (otherId && otherId === fidelityTargetIdFor(manifest)) {
      collisions.push(
        `planned fidelity target id '${otherId}' collides with existing manifest '${other.stableId}'`,
      );
    }
    if (other.route && manifest.route && other.route.path === manifest.route.path) {
      collisions.push(
        `planned route '${manifest.route.path}' collides with existing manifest '${other.stableId}'`,
      );
    }
  }
  return collisions;
}

function fsCollisions(writes: readonly ScaffoldWrite[], root: string): readonly string[] {
  const collisions: string[] = [];
  for (const write of writes) {
    if (existsSync(path.join(root, write.path))) {
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
    designLabSeam(manifest, executable, route?.path ?? null),
    designFidelitySeam(
      manifest,
      executable,
      route?.path ?? null,
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
 * Write a plan's files. Refuses to overwrite any existing path (checked again
 * at write time). Returns the repository-relative paths written.
 */
export function writeScaffoldPlan(
  plan: ScaffoldPlan,
  options: ScaffoldOptions = {},
): readonly string[] {
  const root = options.root ?? process.cwd();
  const collisions = fsCollisions(plan.writes, root);
  if (collisions.length > 0) {
    throw new IntakeCollisionError(collisions);
  }
  const written: string[] = [];
  for (const write of plan.writes) {
    const target = path.join(root, write.path);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, write.content, "utf8");
    written.push(write.path);
  }
  return written;
}
