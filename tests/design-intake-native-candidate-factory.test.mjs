import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  IntakeManifestError,
  exactGatePassIsValid,
  parseIntakeManifest,
} from "../lib/design-intake/manifest.ts";
import {
  IntakeCollisionError,
  buildScaffoldPlan,
  writeScaffoldPlan,
} from "../lib/design-intake/scaffold.ts";
import { DESIGN_FIDELITY_TARGETS } from "../scripts/design-fidelity-validation-registry.mjs";

const repoRoot = process.cwd();
const FIXTURES_DIR = path.join(repoRoot, "design-intake", "manifests");
const LIVE_TARGETS = DESIGN_FIDELITY_TARGETS.map((target) => ({
  id: target.id,
  route: target.route,
}));

const REAL_FIXTURE_NAMES = [
  "track-55-free-connection-routing",
  "track-56-vertical-moment-network",
  "track-59-living-memory-book",
  "track-60-3d-moment-cluster",
  "track-61-guided-next-moment-builder",
  "track-62-v1-reference-only",
  "track-62-v1-1-reservation-hold",
  "track-63-moment-field-view-studio",
  "track-64-floating-moment-entry-portal",
];

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{25,44}$/;

function fixture(stableId) {
  const raw = readFileSync(path.join(FIXTURES_DIR, `${stableId}.json`), "utf8");
  return JSON.parse(raw);
}

function withTempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "design-intake-"));
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

function newLineageManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    stableId: "track-test-new-lineage",
    sourceTrackId: "Track90",
    title: "Test New Lineage",
    classification: "NEW_LINEAGE",
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    scenarioId: "entry-onboarding",
    productJob: "test product job",
    summary: "test summary",
    provenance: {
      sourceLabel: "test source",
      sourceFiles: ["test.html"],
      rightsStatus: "sibling-source-owned",
    },
    designLineageId: "lt-test-new-lineage",
    lineageNumber: 90,
    revisionId: "90-v1",
    route: { path: "/design-lab/lineages/90/90-v1", surface: "lineage" },
    backendScope: "BACKEND_FREE",
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/* 1. Malformed manifest reject                                       */
/* ------------------------------------------------------------------ */

test("1. malformed manifests are rejected", () => {
  assert.throws(() => parseIntakeManifest("not-an-object"), IntakeManifestError);
  assert.throws(() => parseIntakeManifest(null), IntakeManifestError);
  assert.throws(() => parseIntakeManifest({}), IntakeManifestError);

  const unknownClassification = newLineageManifest({ classification: "NEW_PRODUCT" });
  assert.throws(() => parseIntakeManifest(unknownClassification), IntakeManifestError);

  const unknownLifecycle = newLineageManifest({ lifecycle: "SHIPPED_TO_PRODUCTION" });
  assert.throws(() => parseIntakeManifest(unknownLifecycle), IntakeManifestError);

  const unknownRendering = newLineageManifest({ rendering: "vr-3d" });
  assert.throws(() => parseIntakeManifest(unknownRendering), IntakeManifestError);

  const wrongType = newLineageManifest({ classification: 42 });
  assert.throws(() => parseIntakeManifest(wrongType), IntakeManifestError);

  const missingStableId = newLineageManifest({ stableId: "" });
  assert.throws(() => parseIntakeManifest(missingStableId), IntakeManifestError);

  const missingSourceTrackId = newLineageManifest({ sourceTrackId: "" });
  assert.throws(() => parseIntakeManifest(missingSourceTrackId), IntakeManifestError);

  const badStableId = newLineageManifest({ stableId: "UPPER_CASE" });
  assert.throws(() => parseIntakeManifest(badStableId), IntakeManifestError);

  const badSourceTrack = newLineageManifest({ sourceTrackId: "track sixty" });
  assert.throws(() => parseIntakeManifest(badSourceTrack), IntakeManifestError);

  const unknownScenario = newLineageManifest({ scenarioId: "not-a-scenario" });
  assert.throws(() => parseIntakeManifest(unknownScenario), IntakeManifestError);

  const missingBackendScope = newLineageManifest({ backendScope: undefined });
  assert.throws(() => parseIntakeManifest(missingBackendScope), IntakeManifestError);

  const invalidBackendScope = newLineageManifest({ backendScope: "MAYBE" });
  assert.throws(() => parseIntakeManifest(invalidBackendScope), IntakeManifestError);

  // Executable lifecycle without any executable anchor must fail closed.
  const executableWithoutAnchor = newLineageManifest({
    lifecycle: "EXECUTABLE_AVAILABLE",
    route: undefined,
  });
  assert.throws(() => parseIntakeManifest(executableWithoutAnchor), IntakeManifestError);

  // A declared route requires an executable lifecycle.
  const routeWithoutExecutable = newLineageManifest({
    lifecycle: "REFERENCE_PINNED",
    route: { path: "/design-lab/lineages/90/90-v1", surface: "lineage" },
  });
  assert.throws(() => parseIntakeManifest(routeWithoutExecutable), IntakeManifestError);
});

/* ------------------------------------------------------------------ */
/* 2. Ambiguous identity reject                                       */
/* ------------------------------------------------------------------ */

test("2. ambiguous identities are rejected", () => {
  const noLineageNumber = newLineageManifest({ lineageNumber: undefined });
  assert.throws(() => parseIntakeManifest(noLineageNumber), IntakeManifestError);

  const noDesignLineageId = newLineageManifest({ designLineageId: undefined });
  assert.throws(() => parseIntakeManifest(noDesignLineageId), IntakeManifestError);

  const noRevisionId = newLineageManifest({ revisionId: undefined });
  assert.throws(() => parseIntakeManifest(noRevisionId), IntakeManifestError);

  const variantWithoutRevision = newLineageManifest({
    classification: "EXISTING_LINEAGE_VARIANT",
    designLineageId: "lt-53-emotional-path-replay",
    revisionId: undefined,
    lineageNumber: undefined,
  });
  assert.throws(() => parseIntakeManifest(variantWithoutRevision), IntakeManifestError);

  const variantWithLineageNumber = newLineageManifest({
    classification: "EXISTING_LINEAGE_VARIANT",
    designLineageId: "lt-53-emotional-path-replay",
    revisionId: "53-v9-new-variant",
    lineageNumber: 53,
  });
  assert.throws(() => parseIntakeManifest(variantWithLineageNumber), IntakeManifestError);

  const canonicalWithLineage = newLineageManifest({
    classification: "CANONICAL_OWNER_CAPABILITY",
    ownerRoute: "/v4/trees/demo/graph",
    designLineageId: "lt-test-new-lineage",
    lineageNumber: 90,
    revisionId: "90-v1",
    route: undefined,
  });
  assert.throws(() => parseIntakeManifest(canonicalWithLineage), IntakeManifestError);

  const referenceWithLineage = newLineageManifest({
    classification: "REFERENCE_CAPABILITY_ONLY",
    lifecycle: "REFERENCE_PINNED",
    designLineageId: "lt-test-new-lineage",
    lineageNumber: 90,
    revisionId: "90-v1",
    route: undefined,
  });
  assert.throws(() => parseIntakeManifest(referenceWithLineage), IntakeManifestError);

  // NEW_LINEAGE with HOLD reservation must not allocate a number or a route.
  const holdWithNumber = newLineageManifest({
    lifecycle: "INSTRUCTION_ACCEPTED",
    route: undefined,
    lineageReservation: { status: "HOLD" },
    lineageNumber: 62,
    revisionId: undefined,
  });
  assert.throws(() => parseIntakeManifest(holdWithNumber), IntakeManifestError);

  const holdWithRoute = newLineageManifest({
    lifecycle: "INSTRUCTION_ACCEPTED",
    lineageReservation: { status: "HOLD" },
    lineageNumber: undefined,
    revisionId: undefined,
  });
  assert.throws(() => parseIntakeManifest(holdWithRoute), IntakeManifestError);
});

/* ------------------------------------------------------------------ */
/* 3. sourceTrackId != designLineageId is allowed                     */
/* ------------------------------------------------------------------ */

test("3. sourceTrackId and designLineageId are separate identities", () => {
  const manifest = parseIntakeManifest(fixture("track-60-3d-moment-cluster"));
  assert.equal(manifest.sourceTrackId, "Track60");
  assert.equal(manifest.designLineageId, "lt-60-3d-moment-cluster-explorer");
  assert.notEqual(manifest.sourceTrackId, manifest.designLineageId);
  assert.ok(!manifest.designLineageId.startsWith(manifest.sourceTrackId.toLowerCase()));
});

/* ------------------------------------------------------------------ */
/* 4. All four classifications are valid                              */
/* ------------------------------------------------------------------ */

test("4. all four classifications are schema-valid", () => {
  const newLineage = parseIntakeManifest(newLineageManifest());
  assert.equal(newLineage.classification, "NEW_LINEAGE");

  const existingVariant = parseIntakeManifest({
    ...newLineageManifest(),
    classification: "EXISTING_LINEAGE_VARIANT",
    designLineageId: "lt-53-emotional-path-replay",
    lineageNumber: undefined,
    revisionId: "53-v9-new-variant",
    route: { path: "/design-lab/lineages/53/53-v9-new-variant", surface: "lineage" },
  });
  assert.equal(existingVariant.classification, "EXISTING_LINEAGE_VARIANT");

  const canonicalOwner = parseIntakeManifest({
    ...newLineageManifest(),
    classification: "CANONICAL_OWNER_CAPABILITY",
    ownerRoute: "/v4/trees/demo/graph",
    designLineageId: undefined,
    lineageNumber: undefined,
    revisionId: undefined,
    route: undefined,
  });
  assert.equal(canonicalOwner.classification, "CANONICAL_OWNER_CAPABILITY");

  const referenceOnly = parseIntakeManifest({
    ...newLineageManifest(),
    classification: "REFERENCE_CAPABILITY_ONLY",
    lifecycle: "REFERENCE_PINNED",
    designLineageId: undefined,
    lineageNumber: undefined,
    revisionId: undefined,
    route: undefined,
  });
  assert.equal(referenceOnly.classification, "REFERENCE_CAPABILITY_ONLY");
});

/* ------------------------------------------------------------------ */
/* 5-7. rendering discriminators and lifecycle values                 */
/* ------------------------------------------------------------------ */

test("5. all concrete rendering discriminators are valid", () => {
  for (const rendering of ["dom-2d", "sprite-2.5d", "css3d-dom", "canvas-3d-projection", "webgl"]) {
    const manifest = parseIntakeManifest(newLineageManifest({ rendering }));
    assert.equal(manifest.rendering, rendering);
  }
});

test("6. canvas-3d-projection rendering is valid for an executable lineage", () => {
  const manifest = parseIntakeManifest(
    newLineageManifest({ rendering: "canvas-3d-projection" }),
  );
  assert.equal(manifest.rendering, "canvas-3d-projection");
});

test("7. EXECUTABLE_PENDING lifecycle is valid (pre-executable)", () => {
  const manifest = parseIntakeManifest(
    newLineageManifest({ lifecycle: "EXECUTABLE_PENDING", route: undefined, rendering: "unresolved" }),
  );
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(manifest.rendering, "unresolved");
});

/* ------------------------------------------------------------------ */
/* 8. Collisions fail closed                                          */
/* ------------------------------------------------------------------ */

test("8. identity and registry collisions fail closed", () => {
  const root = withTempRoot();
  try {
    // Existing lineage id.
    assert.throws(
      () =>
        buildScaffoldPlan(
          newLineageManifest({ designLineageId: "lt-54-petal-runner-love-journey" }),
          { root, fidelityTargets: LIVE_TARGETS },
        ),
      IntakeCollisionError,
    );

    // Existing lineage number.
    assert.throws(
      () =>
        buildScaffoldPlan(newLineageManifest({ lineageNumber: 54 }), {
          root,
          fidelityTargets: LIVE_TARGETS,
        }),
      IntakeCollisionError,
    );

    // Existing revision inside an existing lineage.
    assert.throws(
      () =>
        buildScaffoldPlan(
          newLineageManifest({
            classification: "EXISTING_LINEAGE_VARIANT",
            designLineageId: "lt-53-emotional-path-replay",
            lineageNumber: undefined,
            revisionId: "53-v2-node-light-flow",
            route: { path: "/design-lab/lineages/53/53-v2-node-light-flow", surface: "lineage" },
          }),
          { root, fidelityTargets: LIVE_TARGETS },
        ),
      IntakeCollisionError,
    );

    // Existing Design Fidelity target id (route already owned by a live target).
    assert.throws(
      () =>
        buildScaffoldPlan(
          newLineageManifest({
            classification: "EXISTING_LINEAGE_VARIANT",
            designLineageId: "lt-54-petal-runner-love-journey",
            lineageNumber: undefined,
            revisionId: "54-v9-collision",
            route: { path: "/design-lab/lineages/54/v4", surface: "lineage" },
          }),
          { root, fidelityTargets: LIVE_TARGETS },
        ),
      IntakeCollisionError,
    );

    // Duplicate stableId against an already-scaffolded manifest.
    const existing = newLineageManifest();
    assert.throws(
      () =>
        buildScaffoldPlan(existing, {
          root,
          fidelityTargets: LIVE_TARGETS,
          existingManifests: [existing],
        }),
      IntakeCollisionError,
    );

    // Route path that does not match the identity-derived path.
    assert.throws(
      () =>
        buildScaffoldPlan(
          newLineageManifest({
            route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" },
          }),
          { root, fidelityTargets: LIVE_TARGETS },
        ),
      IntakeCollisionError,
    );
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 9. Existing files are never overwritten                            */
/* ------------------------------------------------------------------ */

test("9. existing filesystem paths are never overwritten", () => {
  const root = withTempRoot();
  try {
    const blocker = path.join(root, "app/design-lab/lineages/90/90-v1/page.tsx");
    mkdirSync(path.dirname(blocker), { recursive: true });
    writeFileSync(blocker, "ORIGINAL", "utf8");

    assert.throws(
      () =>
        buildScaffoldPlan(newLineageManifest(), {
          root,
          fidelityTargets: LIVE_TARGETS,
        }),
      IntakeCollisionError,
    );
    assert.equal(readFileSync(blocker, "utf8"), "ORIGINAL", "blocking file untouched");

    // writeScaffoldPlan also re-checks and refuses partial writes.
    const root2 = withTempRoot();
    try {
      const plan = buildScaffoldPlan(newLineageManifest(), {
        root: root2,
        fidelityTargets: LIVE_TARGETS,
      });
      const blocker2 = path.join(
        root2,
        "reference/design-intake/track-test-new-lineage/PROVENANCE.md",
      );
      mkdirSync(path.dirname(blocker2), { recursive: true });
      writeFileSync(blocker2, "BLOCKED", "utf8");

      assert.throws(() => writeScaffoldPlan(plan, { root: root2 }), IntakeCollisionError);
      assert.equal(
        existsSync(path.join(root2, "design-intake/scaffolds/track-test-new-lineage/manifest.json")),
        false,
        "no files written when any target already exists",
      );
    } finally {
      cleanup(root2);
    }
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 10. Determinism                                                     */
/* ------------------------------------------------------------------ */

test("10. identical manifest produces an identical plan", () => {
  const manifest = fixture("track-60-3d-moment-cluster");
  const root = withTempRoot();
  try {
    const first = buildScaffoldPlan(manifest, { root, fidelityTargets: LIVE_TARGETS });
    const second = buildScaffoldPlan(manifest, { root, fidelityTargets: LIVE_TARGETS });
    assert.deepEqual(second, first);
    assert.deepEqual(second.writes, first.writes);
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 11. All three registry seams are in the plan                       */
/* ------------------------------------------------------------------ */

test("11. scaffold plans cover all three registry seams", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fixture("track-60-3d-moment-cluster"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    assert.deepEqual(
      plan.registrySeams.map((seam) => seam.seam),
      ["designLineages", "designLab", "designFidelity"],
    );
    const lineages = plan.registrySeams.find((seam) => seam.seam === "designLineages");
    const lab = plan.registrySeams.find((seam) => seam.seam === "designLab");
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(lineages.status, "entry");
    assert.equal(lab.status, "entry");
    // H: a scaffold-only source executable must NOT activate fidelity.
    assert.equal(fidelity.status, "deferred");
    assert.match(fidelity.reason, /native implementation/);
    assert.equal(lab.entry.candidate.status, "mapped", "scaffold-only candidate is mapped, not implemented");
    assert.equal(lab.entry.candidate.nativeReadiness, "SCAFFOLDED");

    // A manifest that is IMPLEMENTED + qa + (no runtime assets) becomes a full
    // three-seam entry with the fidelity target fully configured.
    const eligible = buildScaffoldPlan(
      newLineageManifest({
        nativeReadiness: "IMPLEMENTED",
        qa: {
          viewports: [
            { width: 1280, height: 800 },
            { width: 390, height: 844, mobile: true },
          ],
          reducedMotion: true,
          keyboardFocus: true,
          pointer: true,
          touch: true,
          horizontalOverflowZero: true,
          consoleErrorsZero: true,
          pageErrorsZero: true,
        },
      }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    for (const seam of eligible.registrySeams) {
      assert.equal(seam.status, "entry", `${seam.seam} must carry a real registration`);
      assert.ok(seam.entry, `${seam.seam} must carry registration data`);
    }
    const eligibleFidelity = eligible.registrySeams.find((seam) => seam.seam === "designFidelity");
    const target = eligibleFidelity.entry.target;
    assert.equal(target.route, "/design-lab/lineages/90/90-v1");
    assert.deepEqual(target.browserGates, ["tests/track-test-new-lineage-route-browser-qa.mjs"]);
    assert.equal(eligible.registrySeams.find((seam) => seam.seam === "designLab").entry.candidate.status, "implemented");

    // Non-executable candidates must still declare every seam (deferred/N-A).
    const pending = buildScaffoldPlan(fixture("track-63-moment-field-view-studio"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    assert.deepEqual(
      pending.registrySeams.map((seam) => seam.seam),
      ["designLineages", "designLab", "designFidelity"],
    );
    const pendingFidelity = pending.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(pendingFidelity.status, "not-applicable");
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 12. fingerprint / binary / exactGate stay independent              */
/* ------------------------------------------------------------------ */

test("12. fingerprint, binary transfer and exact gate are independent", () => {
  // Fingerprint complete + transfer partial + gate pending → valid.
  const pending = newLineageManifest({
    exactAssets: [
      {
        filename: "sprite.png",
        mode: "png",
        targetPath: "public/design-lab/lineages/90/90-v1/sprite.png",
        role: "sprite",
        rightsStatus: "sibling-source-owned",
      },
    ],
    exactAssetGate: {
      fingerprintStatus: "FINGERPRINT_COMPLETE",
      binaryTransferStatus: "BINARY_TRANSFER_PARTIAL",
      exactGateStatus: "EXACT_GATE_PENDING",
    },
  });
  const parsedPending = parseIntakeManifest(pending);
  assert.equal(parsedPending.exactAssetGate.fingerprintStatus, "FINGERPRINT_COMPLETE");
  assert.equal(parsedPending.exactAssetGate.binaryTransferStatus, "BINARY_TRANSFER_PARTIAL");
  assert.equal(parsedPending.exactAssetGate.exactGateStatus, "EXACT_GATE_PENDING");
  assert.equal(exactGatePassIsValid(parsedPending.exactAssetGate), true);

  // Transfer complete but fingerprint partial → still valid, still not PASS.
  const transferOnly = parseIntakeManifest({
    ...pending,
    exactAssetGate: {
      fingerprintStatus: "FINGERPRINT_PARTIAL",
      binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
      exactGateStatus: "EXACT_GATE_PENDING",
    },
  });
  assert.equal(exactGatePassIsValid(transferOnly.exactAssetGate), true);

  // PASS claimed without both complete → rejected (fail closed).
  const falsePass = {
    ...pending,
    exactAssetGate: {
      fingerprintStatus: "FINGERPRINT_COMPLETE",
      binaryTransferStatus: "BINARY_TRANSFER_PARTIAL",
      exactGateStatus: "EXACT_GATE_PASS",
    },
  };
  assert.throws(() => parseIntakeManifest(falsePass), IntakeManifestError);
  assert.equal(
    exactGatePassIsValid({
      fingerprintStatus: "FINGERPRINT_COMPLETE",
      binaryTransferStatus: "BINARY_TRANSFER_PARTIAL",
      exactGateStatus: "EXACT_GATE_PASS",
    }),
    false,
  );

  // A complete-lifecycle manifest with a valid PASS state + required artifact
  // evidence + native readiness + QA enables the verifier gate.
  const root = withTempRoot();
  try {
    const complete = parseIntakeManifest({
      ...pending,
      lifecycle: "ARTIFACTS_COMPLETE",
      requiredArtifacts: { requiredRoles: ["executable"], status: "COMPLETE" },
      sourceArtifacts: [
        {
          filename: "현재후보.html",
          driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
          bytes: 17192064,
          sha256: "763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71",
          role: "executable",
          status: "PINNED",
        },
      ],
      nativeReadiness: "IMPLEMENTED",
      qa: {
        viewports: [
          { width: 1280, height: 800 },
          { width: 390, height: 844, mobile: true },
        ],
        reducedMotion: true,
        keyboardFocus: true,
        pointer: true,
        touch: true,
        horizontalOverflowZero: true,
        consoleErrorsZero: true,
        pageErrorsZero: true,
      },
      exactAssetGate: {
        fingerprintStatus: "FINGERPRINT_COMPLETE",
        binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
        exactGateStatus: "EXACT_GATE_PASS",
      },
    });
    const completePlan = buildScaffoldPlan(complete, { root, fidelityTargets: LIVE_TARGETS });
    const completeFidelity = completePlan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(completeFidelity.status, "entry");
    assert.equal(completeFidelity.entry.target.assetGate.verifier, "scripts/verify-track-test-new-lineage-assets.mjs");
    assert.equal(
      completeFidelity.entry.target.assetGate.expectedMarker,
      "TRACK_TEST_NEW_LINEAGE_EXACT_ASSET_GATE_PASS",
    );
    assert.ok(
      completePlan.writes.some((write) => write.path === "scripts/verify-track-test-new-lineage-assets.mjs"),
    );
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 13-14. QA viewports + reduced motion are transmitted               */
/* ------------------------------------------------------------------ */

function fidelityEligibleManifest(overrides = {}) {
  return newLineageManifest({
    nativeReadiness: "IMPLEMENTED",
    qa: {
      viewports: [
        { width: 1280, height: 800 },
        { width: 390, height: 844, mobile: true },
        { width: 320, height: 720, mobile: true },
      ],
      reducedMotion: true,
      keyboardFocus: true,
      pointer: true,
      touch: true,
      horizontalOverflowZero: true,
      consoleErrorsZero: true,
      pageErrorsZero: true,
    },
    ...overrides,
  });
}

test("13. 320×720 narrow viewport configuration is transmitted", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.status, "entry");
    assert.ok(
      fidelity.entry.target.viewports.some(
        (viewport) => viewport.width === 320 && viewport.height === 720 && viewport.mobile === true,
      ),
    );
    assert.ok(
      fidelity.entry.target.viewports.some(
        (viewport) => viewport.width === 1280 && viewport.height === 800,
      ),
    );
    assert.ok(
      fidelity.entry.target.viewports.some(
        (viewport) => viewport.width === 390 && viewport.height === 844,
      ),
    );
  } finally {
    cleanup(root);
  }
});

test("14. reduced-motion configuration is transmitted", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.entry.target.captureReducedMotion, true);

    // K: without a QA contract the fidelity seam cannot be active.
    const withoutMotion = buildScaffoldPlan(
      newLineageManifest({ nativeReadiness: "IMPLEMENTED", qa: undefined }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const withoutFidelity = withoutMotion.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(withoutFidelity.status, "deferred");
    assert.match(withoutFidelity.reason, /qa absent/i);
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 15. Source HTML/JS is never executed                               */
/* ------------------------------------------------------------------ */

test("15. source HTML/JS is never read or executed", () => {
  const root = withTempRoot();
  try {
    const manifest = newLineageManifest({
      provenance: {
        sourceLabel: "test",
        sourceFiles: ["DOES-NOT-EXIST.html", "DOES-NOT-EXIST.js"],
        rightsStatus: "sibling-source-owned",
      },
    });
    // The plan builds fine even though the referenced sources do not exist —
    // proof that the factory never touches source files.
    const plan = buildScaffoldPlan(manifest, { root, fidelityTargets: LIVE_TARGETS });
    assert.ok(plan.writes.length > 0);

    const content = plan.writes.map((write) => write.content).join("\n");
    assert.ok(!content.includes("exec("), "no exec usage in generated content");
    assert.ok(!content.includes("eval("), "no eval usage in generated content");
    assert.ok(!content.includes("child_process"), "no child_process in generated content");
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* 16. No canonical /v4 writes                                        */
/* ------------------------------------------------------------------ */

test("16. scaffold plans never write under canonical /v4 product trees", () => {
  const root = withTempRoot();
  try {
    for (const name of REAL_FIXTURE_NAMES) {
      const plan = buildScaffoldPlan(fixture(name), { root, fidelityTargets: LIVE_TARGETS });
      for (const write of plan.writes) {
        assert.ok(
          !write.path.startsWith("app/v4/"),
          `${name}: forbidden /v4 write ${write.path}`,
        );
        assert.ok(
          write.path.startsWith("design-intake/") ||
            write.path.startsWith("reference/") ||
            write.path.startsWith("app/design-lab/") ||
            write.path.startsWith("tests/") ||
            write.path.startsWith("scripts/") ||
            write.path.startsWith("docs/product/"),
          `${name}: unexpected write location ${write.path}`,
        );
      }
    }

    // Track55 owns /v4/trees/demo/graph as metadata only — no write touches it.
    const track55 = buildScaffoldPlan(fixture("track-55-free-connection-routing"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    assert.equal(track55.manifest.ownerRoute, "/v4/trees/demo/graph");
    assert.ok(
      track55.writes.every((write) => !write.path.includes("trees/demo/graph")),
      "ownerRoute is metadata only",
    );
    assert.ok(
      track55.writes.every((write) => !write.path.startsWith("app/design-lab/lineages")),
      "canonical owner gets no design-lab lineage route",
    );
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* Section 6 — existing intake cases validate against the schema      */
/* ------------------------------------------------------------------ */

test("fixtures: Track55 → CANONICAL_OWNER_CAPABILITY → /v4/trees/demo/graph owner", () => {
  const manifest = parseIntakeManifest(fixture("track-55-free-connection-routing"));
  assert.equal(manifest.classification, "CANONICAL_OWNER_CAPABILITY");
  assert.equal(manifest.ownerRoute, "/v4/trees/demo/graph");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.sourceTrackId, "Track55");
  assert.equal(manifest.designLineageId, undefined, "Track55 must NOT reserve a lineage id");
  assert.equal(manifest.lineageNumber, undefined, "Track55 must NOT allocate a lineage number");
});

test("fixtures: Track56 → EXISTING_LINEAGE_VARIANT → Lineage53/CAP14 family", () => {
  const manifest = parseIntakeManifest(fixture("track-56-vertical-moment-network"));
  assert.equal(manifest.classification, "EXISTING_LINEAGE_VARIANT");
  assert.equal(manifest.designLineageId, "lt-53-emotional-path-replay");
  assert.equal(manifest.lineageNumber, undefined, "variant must not allocate its own number");
  assert.notEqual(manifest.sourceTrackId, manifest.designLineageId);
});

test("fixtures: Track59 → NEW_LINEAGE → Living Memory Book V5", () => {
  const manifest = parseIntakeManifest(fixture("track-59-living-memory-book"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.title, "Living Memory Book V5");
  assert.match(manifest.productJob, /memory book/i);
});

test("fixtures: Track60 → NEW_LINEAGE → canvas-3d-projection", () => {
  const manifest = parseIntakeManifest(fixture("track-60-3d-moment-cluster"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.rendering, "canvas-3d-projection");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
});

test("fixtures: Track61 → NEW_LINEAGE → dom-2d V1.5 with RESOLVED handoffs", () => {
  const manifest = parseIntakeManifest(fixture("track-61-guided-next-moment-builder"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.rendering, "dom-2d");
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.revisionId, "61-v1-5");
  assert.equal(manifest.route.path, "/design-lab/lineages/61/61-v1-5");
  assert.ok(manifest.handoffMappings.length >= 3);
  for (const mapping of manifest.handoffMappings) {
    assert.equal(mapping.resolutionStatus, "RESOLVED");
    assert.ok(mapping.resolvedProductTargetId, `${mapping.sourceTrackId} resolved target`);
    assert.ok(
      !/^\/design-lab\/lineages\/(55|56|59)\//.test(mapping.resolvedProductTargetId),
      "never infer repository Lineage 55/56/59 routes from raw track numbers",
    );
  }
  const byTrack = Object.fromEntries(manifest.handoffMappings.map((m) => [m.sourceTrackId, m]));
  assert.equal(byTrack["Track55"].resolvedProductTargetId, "/v4/trees/demo/graph");
  assert.match(byTrack["Track56"].resolvedProductTargetId, /lt-53-emotional-path-replay/);
  assert.equal(byTrack["Track59"].resolvedProductTargetId, "lt-59-living-memory-book");
});

test("fixtures: Track61 V1.5 authoritative source identity is pinned", () => {
  const manifest = parseIntakeManifest(fixture("track-61-guided-next-moment-builder"));
  assert.equal(manifest.provenance.driveFolderId, "1Ebd1WW5e3I4uSQo9o2Q_leL8ncvgUXQB");
  const executable = manifest.sourceArtifacts.find((artifact) => artifact.role === "executable");
  assert.equal(executable.driveId, "17GwHW0uFafc35UR7-TZ0g_ulJyADw2_L");
  assert.equal(executable.bytes, 488588);
  assert.equal(
    executable.sha256,
    "725350cd9132d499cee46eac0d3d0d9fc0c9a868d68efc635ceb6c94a884c474",
  );
  const instruction = manifest.sourceArtifacts.find((artifact) => artifact.role === "instruction");
  assert.equal(instruction.driveId, "1zCROGw4ekblYdJIBwSpzruz6ZYmY2ayF");
});

test("fixtures: Track61 V1.5 navigation evidence keeps open/focus HOLDS separate", () => {
  const manifest = parseIntakeManifest(fixture("track-61-guided-next-moment-builder"));
  assert.equal(manifest.navigationHandoff.targetMapping, true);
  assert.equal(manifest.navigationHandoff.urlResolution, true);
  assert.equal(manifest.navigationHandoff.openCall, true);
  assert.equal(manifest.navigationHandoff.actualTargetOpen, false, "physical click→open HOLD");
  assert.equal(manifest.navigationHandoff.receiverConsume, false, "receiver hook absent HOLD");
  assert.equal(manifest.navigationHandoff.sameMomentFocus, false, "receiver same-Moment focus HOLD");
});

test("fixtures: Track62 V1 → REFERENCE_CAPABILITY_ONLY", () => {
  const manifest = parseIntakeManifest(fixture("track-62-v1-reference-only"));
  assert.equal(manifest.classification, "REFERENCE_CAPABILITY_ONLY");
  assert.equal(manifest.lifecycle, "REFERENCE_PINNED");
  assert.equal(manifest.designLineageId, undefined);
  assert.equal(manifest.lineageNumber, undefined);
  assert.equal(manifest.adoption.status, "SOURCE_REFERENCE_ONLY");
});

test("fixtures: Track62 V1.1 → source-executable lifecycle orthogonal to HOLD reservation", () => {
  const manifest = parseIntakeManifest(fixture("track-62-v1-1-reservation-hold"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lineageReservation.status, "HOLD");
  assert.equal(manifest.lineageNumber, undefined, "no lineage number reserved");
  assert.equal(manifest.reservation.held, true);
  assert.equal(manifest.adoption.status, "HOLD");
  // Lifecycle is SOURCE truth — the real V1.1 executable is pinned — and is
  // orthogonal to the repository reservation/adoption HOLDS.
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.rendering, "dom-2d");
  assert.equal(manifest.route, undefined);
  const executable = manifest.sourceArtifacts.find((artifact) => artifact.role === "executable");
  assert.equal(executable.driveId, "1Fu0Vorz5BjX2uEjlL2bujQvrP0gFVC9S");
  assert.equal(executable.bytes, 20728647);
  assert.equal(
    executable.sha256,
    "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
  );
  assert.ok(manifest.sourceArtifacts.length >= 3, "executable + instruction + sibling QA pinned");
});

test("fixtures: Track63 → NEW_LINEAGE → executable pending, rendering unresolved", () => {
  const manifest = parseIntakeManifest(fixture("track-63-moment-field-view-studio"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(manifest.rendering, "unresolved");
  assert.equal(manifest.route, undefined);
});

test("fixtures: Track64 → NEW_LINEAGE → Memory Entry Portal, executable pending", () => {
  const manifest = parseIntakeManifest(fixture("track-64-floating-moment-entry-portal"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(manifest.rendering, "unresolved");
  assert.equal(manifest.route, undefined);
  assert.match(manifest.productJob, /Memory Entry Portal/);
  assert.ok(manifest.productJobDistinctness);
});

test("fixtures: all repository manifests parse and scaffold cleanly", () => {
  for (const name of REAL_FIXTURE_NAMES) {
    const manifest = parseIntakeManifest(fixture(name));
    assert.ok(manifest.stableId, `${name}: stableId`);
    assert.ok(manifest.provenance.sourceFiles.length > 0, `${name}: sourceFiles`);
  }

  const root = withTempRoot();
  try {
    for (const name of REAL_FIXTURE_NAMES) {
      const plan = buildScaffoldPlan(fixture(name), { root, fidelityTargets: LIVE_TARGETS });
      assert.ok(plan.writes.length >= 5, `${name}: expected metadata/provenance/checklist/tests/docs writes`);
      assert.ok(plan.registrySeams.length === 3, `${name}: three registry seams`);
    }
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* CTO audit regressions                                              */
/* ------------------------------------------------------------------ */

test("regression: real Track fixtures never use placeholder Drive IDs", () => {
  const bad = /example/i;
  for (const name of REAL_FIXTURE_NAMES) {
    const manifest = parseIntakeManifest(fixture(name));
    const folderId = manifest.provenance.driveFolderId;
    if (folderId) {
      assert.match(folderId, DRIVE_ID_PATTERN, `${name}: folder ${folderId}`);
      assert.ok(!bad.test(folderId), `${name}: placeholder folder id`);
    }
    for (const artifact of manifest.sourceArtifacts ?? []) {
      assert.match(artifact.driveId, DRIVE_ID_PATTERN, `${name}: ${artifact.filename}`);
      assert.ok(!bad.test(artifact.driveId), `${name}: placeholder drive id in ${artifact.filename}`);
      if (artifact.sha256) assert.match(artifact.sha256, /^[0-9a-f]{64}$/i, `${name}: sha256`);
      if (artifact.bytes !== undefined) assert.ok(artifact.bytes > 0, `${name}: bytes`);
    }
  }
});

test("regression: Track59 title/productJob contract is pinned", () => {
  const manifest = parseIntakeManifest(fixture("track-59-living-memory-book"));
  assert.equal(manifest.title, "Living Memory Book V5");
  assert.match(manifest.title, /Living Memory Book/);
  assert.match(manifest.productJob, /memory book/i);
  assert.ok(manifest.productJob.length > 40, "productJob is a real product statement, not a stub");
});

test("regression: pre-executable 'unresolved' rendering is valid", () => {
  for (const lifecycle of ["INSTRUCTION_ACCEPTED", "REFERENCE_PINNED", "EXECUTABLE_PENDING"]) {
    const manifest = parseIntakeManifest(
      newLineageManifest({ lifecycle, route: undefined, rendering: "unresolved" }),
    );
    assert.equal(manifest.rendering, "unresolved", lifecycle);
  }
  // Absent rendering is also valid pre-executable.
  const absent = parseIntakeManifest(
    newLineageManifest({ lifecycle: "REFERENCE_PINNED", route: undefined, rendering: undefined }),
  );
  assert.equal(absent.rendering, undefined);
});

test("regression: executable lifecycle + unresolved rendering is rejected", () => {
  for (const lifecycle of ["EXECUTABLE_AVAILABLE", "ARTIFACTS_COMPLETE", "EXECUTABLE_FINGERPRINT_PINNED"]) {
    assert.throws(
      () =>
        parseIntakeManifest(
          newLineageManifest({ lifecycle, rendering: "unresolved" }),
        ),
      IntakeManifestError,
      `${lifecycle} must fail closed with unresolved rendering`,
    );
    assert.throws(
      () => parseIntakeManifest(newLineageManifest({ lifecycle, rendering: undefined })),
      IntakeManifestError,
      `${lifecycle} must fail closed without a concrete rendering`,
    );
  }
});

test("regression: source artifact SHA/bytes/Drive identity validation", () => {
  const base = newLineageManifest({
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1LlK6lrDKpH97nnyVHfw6RoOayUt8SMvp",
        bytes: 55327,
        sha256: "5e19f76ed72558464c9bfb1dab5f56839f9f34b48a42c54c5f5db99b21eaa5f7",
        role: "executable",
        status: "PINNED",
      },
    ],
  });

  assert.doesNotThrow(() => parseIntakeManifest(base));

  const badSha = {
    ...base,
    sourceArtifacts: [{ ...base.sourceArtifacts[0], sha256: "not-a-sha" }],
  };
  assert.throws(() => parseIntakeManifest(badSha), IntakeManifestError);

  const negativeBytes = {
    ...base,
    sourceArtifacts: [{ ...base.sourceArtifacts[0], bytes: -5 }],
  };
  assert.throws(() => parseIntakeManifest(negativeBytes), IntakeManifestError);

  const placeholderDrive = {
    ...base,
    sourceArtifacts: [{ ...base.sourceArtifacts[0], driveId: "1exampleDrive60" }],
  };
  assert.throws(() => parseIntakeManifest(placeholderDrive), IntakeManifestError);

  const badGitBlob = {
    ...base,
    sourceArtifacts: [{ ...base.sourceArtifacts[0], gitBlobSha: "short" }],
  };
  assert.throws(() => parseIntakeManifest(badGitBlob), IntakeManifestError);

  const badStatus = {
    ...base,
    sourceArtifacts: [{ ...base.sourceArtifacts[0], status: "DONE" }],
  };
  assert.throws(() => parseIntakeManifest(badStatus), IntakeManifestError);
});

test("regression: invalid runtime primitive ids are rejected", () => {
  for (const bad of ["P0", "P10", "P42", "gesture-arbiter", "P1-P9"]) {
    assert.throws(
      () => parseIntakeManifest(newLineageManifest({ runtimePrimitives: [bad] })),
      IntakeManifestError,
      `${bad} must be rejected`,
    );
  }
  assert.doesNotThrow(() => parseIntakeManifest(newLineageManifest({ runtimePrimitives: ["P1", "P9"] })));

  // trulyNewPrimitive must not collide with P1-P9.
  assert.throws(
    () => parseIntakeManifest(newLineageManifest({ trulyNewPrimitive: "P3" })),
    IntakeManifestError,
  );
  assert.doesNotThrow(() =>
    parseIntakeManifest(newLineageManifest({ trulyNewPrimitive: "ConnectionBundleRouter" })),
  );

  // reusableCapabilities must be known ExperienceCapability ids.
  assert.throws(
    () => parseIntakeManifest(newLineageManifest({ reusableCapabilities: ["not-a-capability"] })),
    IntakeManifestError,
  );
  assert.doesNotThrow(() =>
    parseIntakeManifest(newLineageManifest({ reusableCapabilities: ["physical-object-navigation"] })),
  );
});

test("regression: adoption decision union validation", () => {
  for (const status of ["ADOPT", "DO_NOT_ADOPT", "SOURCE_REFERENCE_ONLY", "PRODUCT_POLICY_REQUIRED", "UNDECIDED", "HOLD"]) {
    const manifest = parseIntakeManifest(newLineageManifest({ adoption: { status } }));
    assert.equal(manifest.adoption.status, status);
  }
  assert.throws(
    () => parseIntakeManifest(newLineageManifest({ adoption: { status: "SHIP_IT" } })),
    IntakeManifestError,
  );
});

test("regression: incomplete reuse checklist stays HOLD / not implementation-ready", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(newLineageManifest(), { root, fidelityTargets: LIVE_TARGETS });
    const checklist = plan.writes.find((write) => write.path.endsWith("REUSE_CHECKLIST.md"));
    assert.ok(checklist, "reuse checklist is generated");
    assert.match(checklist.content, /IMPLEMENTATION_READY: NO/);
    assert.ok(!/IMPLEMENTATION_READY:\s*YES/.test(checklist.content));
    assert.match(checklist.content, /HOLD/);
    assert.match(checklist.content, /TODO/);
    assert.ok(
      plan.writes.every((write) => !write.path.endsWith("ADOPTION_REPORT.md") ||
        /UNDECIDED|HOLD/.test(write.content)),
      "adoption report never auto-selects a decision",
    );
  } finally {
    cleanup(root);
  }
});

test("regression: Track62 candidate does not accidentally reserve Lineage62", () => {
  const root = withTempRoot();
  try {
    const manifest = parseIntakeManifest(fixture("track-62-v1-1-reservation-hold"));
    assert.equal(manifest.lineageNumber, undefined);

    const plan = buildScaffoldPlan(manifest, { root, fidelityTargets: LIVE_TARGETS });
    const serialized = JSON.stringify(plan);
    assert.ok(!serialized.includes('"number": 62'), "no lineage number 62 allocated anywhere");
    assert.ok(
      plan.writes.every((write) => !write.path.includes("/62/")),
      "no lineage 62 route path",
    );

    const lineageSeam = plan.registrySeams.find((seam) => seam.seam === "designLineages");
    assert.equal(lineageSeam.status, "not-applicable");
    assert.match(lineageSeam.reason, /HOLD/);
    const fidelitySeam = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelitySeam.status, "not-applicable");
  } finally {
    cleanup(root);
  }
});

test("regression: lifecycle is orthogonal to reservation/adoption (source truth vs repo decision)", () => {
  // HOLD reservation + executable lifecycle is only valid when a PINNED source
  // executable artifact anchors the claim.
  const heldWithPinnedExecutable = newLineageManifest({
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    route: undefined,
    lineageReservation: { status: "HOLD" },
    lineageNumber: undefined,
    revisionId: undefined,
    reservation: { held: true },
    adoption: { status: "HOLD" },
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Fu0Vorz5BjX2uEjlL2bujQvrP0gFVC9S",
        bytes: 20728647,
        sha256: "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
        role: "executable",
        status: "PINNED",
      },
    ],
  });
  const parsed = parseIntakeManifest(heldWithPinnedExecutable);
  assert.equal(parsed.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(parsed.lineageReservation.status, "HOLD");
  assert.equal(parsed.adoption.status, "HOLD");
  assert.equal(parsed.lineageNumber, undefined);

  // The same HOLD + executable claim WITHOUT a pinned source executable fails closed.
  const heldWithoutExecutable = newLineageManifest({
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    route: undefined,
    lineageReservation: { status: "HOLD" },
    lineageNumber: undefined,
    revisionId: undefined,
    reservation: { held: true },
    adoption: { status: "HOLD" },
    sourceArtifacts: [],
  });
  assert.throws(() => parseIntakeManifest(heldWithoutExecutable), IntakeManifestError);

  // HOLD + executable lifecycle must never claim a route.
  const heldWithRoute = newLineageManifest({
    lifecycle: "EXECUTABLE_AVAILABLE",
    rendering: "dom-2d",
    route: { path: "/design-lab/lineages/62/62-v1-1", surface: "lineage" },
    lineageReservation: { status: "HOLD" },
    lineageNumber: undefined,
    revisionId: undefined,
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Fu0Vorz5BjX2uEjlL2bujQvrP0gFVC9S",
        bytes: 20728647,
        sha256: "bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8",
        role: "executable",
        status: "PINNED",
      },
    ],
  });
  assert.throws(() => parseIntakeManifest(heldWithRoute), IntakeManifestError);
});

test("regression: Track55/56 cross-namespace mappings are preserved", () => {
  const track55 = parseIntakeManifest(fixture("track-55-free-connection-routing"));
  assert.equal(track55.sourceTrackId, "Track55");
  assert.equal(track55.classification, "CANONICAL_OWNER_CAPABILITY");
  assert.equal(track55.ownerRoute, "/v4/trees/demo/graph");
  assert.equal(track55.designLineageId, undefined);
  assert.equal(track55.lineageNumber, undefined);

  const track56 = parseIntakeManifest(fixture("track-56-vertical-moment-network"));
  assert.equal(track56.sourceTrackId, "Track56");
  assert.equal(track56.designLineageId, "lt-53-emotional-path-replay");
  assert.equal(track56.lineageNumber, undefined);
  assert.notEqual(track56.designLineageId, "lt-56-crystal-memory-atelier");
});

test("regression: reuse checklist + adoption report are generated for real fixtures", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fixture("track-60-3d-moment-cluster"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const checklist = plan.writes.find((write) => write.path.endsWith("REUSE_CHECKLIST.md"));
    assert.ok(checklist);
    assert.match(checklist.content, /## 1\. Product Job/);
    assert.match(checklist.content, /## 10\. Backend\/Auth\/DB-free scope/);
    assert.match(checklist.content, /## 4\. Existing ExperienceCapabilities/);
    assert.match(checklist.content, /## 5\. P1–P9 reused/);

    const adoption = plan.writes.find((write) => write.path.endsWith("ADOPTION_REPORT.md"));
    assert.ok(adoption);
    assert.match(adoption.content, /adoptionStatus: UNDECIDED/);
    assert.match(adoption.content, /| mechanic | source evidence |/);
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* Final factory hardening regressions (PR #166 CTO checklist)        */
/* ------------------------------------------------------------------ */

test("hardening: traversal revisionId is rejected", () => {
  for (const revisionId of ["../escape", "..", "a/../b", "seg/../.."]) {
    assert.throws(
      () => parseIntakeManifest(newLineageManifest({ revisionId })),
      IntakeManifestError,
      `revisionId '${revisionId}' must be rejected`,
    );
  }
});

test("hardening: absolute / backslash / drive revisionIds are rejected", () => {
  for (const revisionId of ["/abs", "/etc/passwd", "a\\b", "C:\\x", "C:/x", "a\nb"]) {
    assert.throws(
      () => parseIntakeManifest(newLineageManifest({ revisionId })),
      IntakeManifestError,
      `revisionId '${revisionId}' must be rejected`,
    );
  }
  assert.doesNotThrow(() => parseIntakeManifest(newLineageManifest({ revisionId: "61-v1-5" })));
  assert.doesNotThrow(() => parseIntakeManifest(newLineageManifest({ revisionId: "53-v9-new-variant" })));
});

test("hardening: crafted plan ../outside write is rejected at write time", () => {
  const root = withTempRoot();
  try {
    const crafted = {
      manifest: {},
      writes: [{ path: "../outside.txt", kind: "crafted", content: "x" }],
      registrySeams: [],
      route: null,
      executable: false,
      assetGateMarker: null,
    };
    assert.throws(() => writeScaffoldPlan(crafted, { root }), IntakeCollisionError);
    assert.equal(existsSync(path.join(path.dirname(root), "outside.txt")), false, "no escape write");
  } finally {
    cleanup(root);
  }
});

test("hardening: crafted plan app/v4 write is rejected at write time", () => {
  const root = withTempRoot();
  try {
    const crafted = {
      manifest: {},
      writes: [{ path: "app/v4/evil/page.tsx", kind: "crafted", content: "x" }],
      registrySeams: [],
      route: null,
      executable: false,
      assetGateMarker: null,
    };
    assert.throws(() => writeScaffoldPlan(crafted, { root }), IntakeCollisionError);
    assert.equal(existsSync(path.join(root, "app/v4")), false, "no app/v4 write");
  } finally {
    cleanup(root);
  }
});

test("hardening: unsafe exact-asset targetPaths are rejected", () => {
  const base = newLineageManifest({
    exactAssets: [
      {
        filename: "sprite.png",
        mode: "png",
        targetPath: "public/design-lab/lineages/90/90-v1/sprite.png",
        role: "sprite",
        rightsStatus: "sibling-source-owned",
      },
    ],
    exactAssetGate: {
      fingerprintStatus: "FINGERPRINT_COMPLETE",
      binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
      exactGateStatus: "EXACT_GATE_PASS",
    },
  });
  for (const targetPath of [
    "public/../../app/v4/x.png",
    "reference/../outside",
    "../../../v4/foo",
    "public/./x.png",
    "public//x.png",
    "public\\x.png",
    "/public/x.png",
    "C:\\public\\x.png",
    "app/v4/x.png",
    "lib/x.png",
  ]) {
    const manifest = {
      ...base,
      exactAssets: [{ ...base.exactAssets[0], targetPath }],
    };
    assert.throws(() => parseIntakeManifest(manifest), IntakeManifestError, `targetPath '${targetPath}' must be rejected`);
  }
  // Safe public/** and reference/** targets are accepted.
  assert.doesNotThrow(() => parseIntakeManifest(base));
  const reference = {
    ...base,
    exactAssets: [
      { ...base.exactAssets[0], targetPath: "reference/design-intake/track-test-new-lineage/sprite.png" },
    ],
  };
  assert.doesNotThrow(() => parseIntakeManifest(reference));
});

test("hardening: manifest newline/code injection is inert or rejected", () => {
  // Newline in a role → control char → schema reject.
  const newlineRole = newLineageManifest({
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        sha256: "a".repeat(64),
        role: "executable\nprocess.exit(1);",
        status: "PINNED",
      },
    ],
  });
  assert.throws(() => parseIntakeManifest(newlineRole), IntakeManifestError);

  // Code-like value WITHOUT newline must stay an inert JSON data literal in the
  // generated verifier — never a top-level statement.
  const codeLike = newLineageManifest({
    exactAssets: [
      {
        filename: "sprite.png",
        mode: "png",
        targetPath: "public/design-lab/lineages/90/90-v1/sprite.png",
        role: 'sprite"; process.exit(1); //',
        rightsStatus: "sibling-source-owned",
      },
    ],
    exactAssetGate: {
      fingerprintStatus: "FINGERPRINT_COMPLETE",
      binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
      exactGateStatus: "EXACT_GATE_PASS",
    },
  });
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(codeLike, { root, fidelityTargets: LIVE_TARGETS });
    const verifier = plan.writes.find((write) => write.path.endsWith("-assets.mjs"));
    assert.ok(verifier, "verifier generated");
    assert.ok(
      !verifier.content.includes('process.exit(1); //') || verifier.content.includes('"sprite\\"; process.exit(1); //"'),
      "code-like value stays escaped inside the JSON literal",
    );
    assert.ok(verifier.content.includes("const EXPECTED_ASSETS"), "inert data literal");
    // Fail-closed: default gate state is PENDING and the skeleton never logs the
    // PASS marker as a success line — the marker only appears as the expected
    // marker constant and the EXPECT_EXACT_GATE=PASS guard that exits 1.
    assert.match(verifier.content, /exactGateStatus: \"EXACT_GATE_PENDING\"/);
    assert.match(verifier.content, /skeleton cannot satisfy EXACT_GATE_PASS/);
    assert.ok(!/console\.log\(.*GATE_MARKER/.test(verifier.content), "PASS marker is never emitted");
  } finally {
    cleanup(root);
  }
});

test("hardening: exclusive-create prevents overwrite (EEXIST fail closed)", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(newLineageManifest(), { root, fidelityTargets: LIVE_TARGETS });
    const firstTarget = path.join(root, plan.writes[0].path);
    mkdirSync(path.dirname(firstTarget), { recursive: true });
    writeFileSync(firstTarget, "TOCTOU", "utf8");
    // fsCollisions pre-check sees it, but also verify the write-level EEXIST path
    // by removing the pre-check entry from the plan's writes.
    const trimmed = { ...plan, writes: plan.writes.filter((write) => write.path !== plan.writes[0].path) };
    writeScaffoldPlan(trimmed, { root });
    const again = { ...trimmed, writes: [plan.writes[0]] };
    assert.throws(() => writeScaffoldPlan(again, { root }), IntakeCollisionError);
    assert.equal(readFileSync(firstTarget, "utf8"), "TOCTOU", "original content preserved");
  } finally {
    cleanup(root);
  }
});

test("hardening: malformed existing manifest fails the scaffold (never SKIP)", () => {
  const root = withTempRoot();
  try {
    mkdirSync(path.join(root, "design-intake", "manifests"), { recursive: true });
    writeFileSync(
      path.join(root, "design-intake", "manifests", "broken.json"),
      "{ not valid json",
      "utf8",
    );
    let error = null;
    try {
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/design-intake-scaffold.mjs",
          path.join(FIXTURES_DIR, "track-60-3d-moment-cluster.json"),
          "--write",
        ],
        {
          encoding: "utf8",
          cwd: repoRoot,
          env: { ...process.env, DESIGN_INTAKE_ROOT: root },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (err) {
      error = err;
    }
    assert.ok(error, "scaffold must fail on a malformed existing manifest");
    assert.match(String(error.stderr ?? ""), /broken\.json/);
    assert.ok(!/SKIP existing manifest/.test(String(error.stderr ?? "")), "never SKIP a malformed manifest");
  } finally {
    cleanup(root);
  }
});

test("hardening: duplicate manifest stableId is rejected cross-manifest", () => {
  const root = withTempRoot();
  try {
    const a = newLineageManifest({ stableId: "track-test-new-lineage" });
    const b = { ...a, designLineageId: "lt-other", lineageNumber: 91, revisionId: "91-v1", route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" } };
    assert.throws(
      () => buildScaffoldPlan(b, { root, existingManifests: [a], fidelityTargets: LIVE_TARGETS }),
      IntakeCollisionError,
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: duplicate allocated lineage number is rejected", () => {
  const root = withTempRoot();
  try {
    const a = newLineageManifest({ stableId: "track-a", designLineageId: "lt-a", lineageNumber: 91, revisionId: "91-v1", route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" } });
    const b = newLineageManifest({ stableId: "track-b", designLineageId: "lt-b", lineageNumber: 91, revisionId: "92-v1", route: { path: "/design-lab/lineages/91/92-v1", surface: "lineage" } });
    assert.throws(
      () => buildScaffoldPlan(b, { root, existingManifests: [a], fidelityTargets: LIVE_TARGETS }),
      IntakeCollisionError,
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: duplicate route / fidelity target id is rejected", () => {
  const root = withTempRoot();
  try {
    const a = newLineageManifest({ stableId: "track-a", designLineageId: "lt-a", lineageNumber: 91, revisionId: "91-v1", route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" } });
    const b = newLineageManifest({ stableId: "track-b", designLineageId: "lt-b", lineageNumber: 92, revisionId: "92-v1", route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" } });
    assert.throws(
      () => buildScaffoldPlan(b, { root, existingManifests: [a], fidelityTargets: LIVE_TARGETS }),
      IntakeCollisionError,
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: duplicate exact-asset targetPath is rejected (within + cross manifest)", () => {
  const asset = {
    filename: "sprite.png",
    mode: "png",
    targetPath: "public/design-lab/lineages/90/90-v1/sprite.png",
    role: "sprite",
    rightsStatus: "sibling-source-owned",
  };
  const gate = {
    fingerprintStatus: "FINGERPRINT_COMPLETE",
    binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
    exactGateStatus: "EXACT_GATE_PASS",
  };
  // Within one manifest.
  assert.throws(
    () =>
      parseIntakeManifest(
        newLineageManifest({ exactAssets: [asset, { ...asset, filename: "sprite2.png" }], exactAssetGate: gate }),
      ),
    IntakeManifestError,
  );
  // Cross-manifest.
  const root = withTempRoot();
  try {
    const a = newLineageManifest({ stableId: "track-a", designLineageId: "lt-a", lineageNumber: 91, revisionId: "91-v1", route: { path: "/design-lab/lineages/91/91-v1", surface: "lineage" }, exactAssets: [asset], exactAssetGate: gate });
    const b = newLineageManifest({ stableId: "track-b", designLineageId: "lt-b", lineageNumber: 92, revisionId: "92-v1", route: { path: "/design-lab/lineages/92/92-v1", surface: "lineage" }, exactAssets: [asset], exactAssetGate: gate });
    assert.throws(
      () => buildScaffoldPlan(b, { root, existingManifests: [a], fidelityTargets: LIVE_TARGETS }),
      IntakeCollisionError,
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: EXECUTABLE_FINGERPRINT_PINNED requires pinned executable SHA/bytes", () => {
  const base = newLineageManifest({ lifecycle: "EXECUTABLE_FINGERPRINT_PINNED" });
  assert.throws(() => parseIntakeManifest(base), IntakeManifestError, "no source artifacts at all");

  const pinnedNoSha = {
    ...base,
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        role: "executable",
        status: "PINNED",
      },
    ],
  };
  assert.throws(() => parseIntakeManifest(pinnedNoSha), IntakeManifestError, "PINNED without SHA-256");

  const pinnedNoBytes = {
    ...base,
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        sha256: "a".repeat(64),
        role: "executable",
        status: "PINNED",
      },
    ],
  };
  assert.throws(() => parseIntakeManifest(pinnedNoBytes), IntakeManifestError, "PINNED without bytes");

  const notPinned = {
    ...base,
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        sha256: "a".repeat(64),
        role: "executable",
        status: "REFERENCE_ONLY",
      },
    ],
  };
  assert.throws(() => parseIntakeManifest(notPinned), IntakeManifestError, "not PINNED");

  const valid = {
    ...base,
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        sha256: "a".repeat(64),
        role: "executable",
        status: "PINNED",
      },
    ],
  };
  assert.doesNotThrow(() => parseIntakeManifest(valid));
});

test("hardening: ARTIFACTS_COMPLETE requires a declared required artifact contract", () => {
  const base = newLineageManifest({ lifecycle: "ARTIFACTS_COMPLETE" });
  assert.throws(() => parseIntakeManifest(base), IntakeManifestError, "no requiredArtifacts declared");

  const declaredButMissing = {
    ...base,
    requiredArtifacts: { requiredRoles: ["executable", "sibling-qa"], status: "COMPLETE" },
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        sha256: "a".repeat(64),
        role: "executable",
        status: "PINNED",
      },
    ],
  };
  assert.throws(
    () => parseIntakeManifest(declaredButMissing),
    IntakeManifestError,
    "required role 'sibling-qa' has no evidence",
  );

  const valid = {
    ...base,
    requiredArtifacts: { requiredRoles: ["executable", "sibling-qa"], status: "COMPLETE" },
    sourceArtifacts: [
      {
        filename: "현재후보.html",
        driveId: "1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d",
        bytes: 1000,
        sha256: "a".repeat(64),
        role: "executable",
        status: "PINNED",
      },
      {
        filename: "검증결과.json",
        driveId: "1ZT8xpC5rPVL4qDuYCfnREWR68zrgFcxn",
        bytes: 100,
        sha256: "b".repeat(64),
        role: "sibling-qa",
        status: "PINNED",
      },
    ],
  };
  assert.doesNotThrow(() => parseIntakeManifest(valid));
});

test("hardening: source executable != native implemented (readiness separation)", () => {
  const root = withTempRoot();
  try {
    // EXECUTABLE_AVAILABLE source with a route, but no native readiness.
    const plan = buildScaffoldPlan(newLineageManifest(), { root, fidelityTargets: LIVE_TARGETS });
    assert.equal(plan.executable, true);
    const lab = plan.registrySeams.find((seam) => seam.seam === "designLab");
    assert.notEqual(lab.entry.candidate.status, "implemented");
    assert.equal(lab.entry.candidate.status, "mapped");
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.status, "deferred");
  } finally {
    cleanup(root);
  }
});

test("hardening: scaffold initial native readiness is never IMPLEMENTED", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(newLineageManifest(), { root, fidelityTargets: LIVE_TARGETS });
    assert.equal(plan.manifest.nativeReadiness ?? "SCAFFOLDED", "SCAFFOLDED");
    const lab = plan.registrySeams.find((seam) => seam.seam === "designLab");
    assert.equal(lab.entry.candidate.nativeReadiness, "SCAFFOLDED");
    assert.notEqual(lab.entry.candidate.status, "implemented");
    // Even an explicit IMPLEMENTATION_PENDING stays non-implemented.
    const pending = buildScaffoldPlan(
      newLineageManifest({ nativeReadiness: "IMPLEMENTATION_PENDING" }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const pendingLab = pending.registrySeams.find((seam) => seam.seam === "designLab");
    assert.equal(pendingLab.entry.candidate.status, "mapped");
  } finally {
    cleanup(root);
  }
});

test("hardening: required exact assets with incomplete gate never activate fidelity", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(
      fidelityEligibleManifest({
        exactAssets: [
          {
            filename: "bg.png",
            mode: "png",
            targetPath: "public/design-lab/lineages/90/90-v1/bg.png",
            role: "canvas-background",
            rightsStatus: "sibling-source-owned",
          },
        ],
        exactAssetGate: {
          fingerprintStatus: "FINGERPRINT_PARTIAL",
          binaryTransferStatus: "BINARY_TRANSFER_NONE",
          exactGateStatus: "EXACT_GATE_PENDING",
        },
      }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.status, "deferred");
    assert.match(fidelity.reason, /exact gate/);
    assert.equal(fidelity.entry, undefined, "no active target with assetGate:null");
  } finally {
    cleanup(root);
  }
});

test("hardening: route filesystem changes select the fidelity target", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    const prefixes = fidelity.entry.target.impactPrefixes;
    assert.ok(
      prefixes.some((prefix) => "app/design-lab/lineages/90/90-v1/page.tsx".startsWith(prefix)),
      "route page filesystem change must select the target",
    );
    assert.ok(
      prefixes.some((prefix) => "tests/track-test-new-lineage-route-browser-qa.mjs".startsWith(prefix)),
      "browser gate change must select the target",
    );
    assert.ok(
      prefixes.every((prefix) => !prefix.startsWith("/design-lab")),
      "impactPrefixes are repository filesystem paths, never URL routes",
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: exact-asset binary changes select the fidelity target", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(
      fidelityEligibleManifest({
        exactAssets: [
          {
            filename: "bg.png",
            mode: "png",
            targetPath: "public/design-lab/lineages/90/90-v1/bg.png",
            role: "canvas-background",
            rightsStatus: "sibling-source-owned",
          },
        ],
        exactAssetGate: {
          fingerprintStatus: "FINGERPRINT_COMPLETE",
          binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
          exactGateStatus: "EXACT_GATE_PASS",
        },
      }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    const prefixes = fidelity.entry.target.impactPrefixes;
    assert.ok(
      prefixes.includes("public/design-lab/lineages/90/90-v1/bg.png"),
      "exact asset targetPath participates in impact planning",
    );
    assert.ok(
      prefixes.some((prefix) => "public/design-lab/lineages/90/90-v1/bg.png".startsWith(prefix)),
      "binary-only change must select the target",
    );
  } finally {
    cleanup(root);
  }
});

test("hardening: qa missing → fidelity-eligible candidate is rejected (deferred)", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(
      newLineageManifest({ nativeReadiness: "IMPLEMENTED", qa: undefined }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.status, "deferred");
    assert.match(fidelity.reason, /qa absent/i);
  } finally {
    cleanup(root);
  }
});

test("hardening: fidelity-eligible candidate with qa.reducedMotion=false stays deferred", () => {
  const root = withTempRoot();
  try {
    const noMotion = newLineageManifest({
      nativeReadiness: "IMPLEMENTED",
      qa: {
        viewports: [
          { width: 1280, height: 800 },
          { width: 390, height: 844, mobile: true },
        ],
        reducedMotion: false,
        keyboardFocus: true,
        pointer: true,
        touch: true,
        horizontalOverflowZero: true,
        consoleErrorsZero: true,
        pageErrorsZero: true,
      },
    });
    const plan = buildScaffoldPlan(noMotion, { root, fidelityTargets: LIVE_TARGETS });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.status, "deferred", "IMPLEMENTED + reducedMotion:false must not activate fidelity");
    assert.match(fidelity.reason, /reduced-motion evidence is not yet satisfied/i);

    // VALIDATED + reducedMotion:false is likewise deferred.
    const validatedNoMotion = buildScaffoldPlan(
      newLineageManifest({
        nativeReadiness: "VALIDATED",
        qa: {
          viewports: [
            { width: 1280, height: 800 },
            { width: 390, height: 844, mobile: true },
          ],
          reducedMotion: false,
          keyboardFocus: true,
          pointer: true,
          touch: true,
          horizontalOverflowZero: true,
          consoleErrorsZero: true,
          pageErrorsZero: true,
        },
      }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const validatedFidelity = validatedNoMotion.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(validatedFidelity.status, "deferred");
    assert.match(validatedFidelity.reason, /reduced-motion evidence is not yet satisfied/i);

    // IMPLEMENTED + reducedMotion:true + rest of gates satisfied → entry.
    const entryPlan = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const entryFidelity = entryPlan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(entryFidelity.status, "entry");
    assert.equal(entryFidelity.entry.target.captureReducedMotion, true);

    // Source/reference-only states must not gain a new constraint: Track62 V1
    // (REFERENCE_CAPABILITY_ONLY, no qa) scaffolds without fidelity entry but
    // without any reduced-motion-specific failure.
    const referenceOnly = parseIntakeManifest(fixture("track-62-v1-reference-only"));
    const referencePlan = buildScaffoldPlan(referenceOnly, { root, fidelityTargets: LIVE_TARGETS });
    const referenceFidelity = referencePlan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(referenceFidelity.status, "not-applicable");
  } finally {
    cleanup(root);
  }
});

test("hardening: pinned historical snapshot remains valid after newer source exists", () => {
  // Track62 V1 is HISTORICAL_PINNED while V1.1 exists — still valid.
  const track62v1 = parseIntakeManifest(fixture("track-62-v1-reference-only"));
  assert.equal(track62v1.sourceSnapshot.sourceAuthorityState, "HISTORICAL_PINNED");
  assert.ok(track62v1.sourceSnapshot.newerRevisionKnown);
  assert.match(track62v1.sourceSnapshot.newerRevisionKnown, /V1\.1/);

  // A synthetic HISTORICAL_PINNED snapshot with a known newer revision is valid.
  const pinned = newLineageManifest({
    sourceSnapshot: {
      revisionLabel: "V1.5",
      authorityObservedAt: "2026-08-13T00:00:00.000Z",
      sourceAuthorityState: "HISTORICAL_PINNED",
      newerRevisionKnown: "V1.6 observed in Drive; proving snapshot stays V1.5 per #80",
    },
  });
  assert.doesNotThrow(() => parseIntakeManifest(pinned));

  // CURRENT_AT_OBSERVATION requires the observation timestamp.
  assert.throws(
    () =>
      parseIntakeManifest(
        newLineageManifest({
          sourceSnapshot: { revisionLabel: "V1.5", sourceAuthorityState: "CURRENT_AT_OBSERVATION" },
        }),
      ),
    IntakeManifestError,
  );

  // CURRENT_AT_OBSERVATION + newerRevisionKnown is a contradiction — reject.
  assert.throws(
    () =>
      parseIntakeManifest(
        newLineageManifest({
          sourceSnapshot: {
            revisionLabel: "V1.5",
            authorityObservedAt: "2026-08-13T00:00:00.000Z",
            sourceAuthorityState: "CURRENT_AT_OBSERVATION",
            newerRevisionKnown: "V1.6 observed in Drive",
          },
        }),
      ),
    IntakeManifestError,
  );

  // HISTORICAL_PINNED requires newerRevisionKnown.
  assert.throws(
    () =>
      parseIntakeManifest(
        newLineageManifest({
          sourceSnapshot: {
            revisionLabel: "V1.5",
            authorityObservedAt: "2026-08-13T00:00:00.000Z",
            sourceAuthorityState: "HISTORICAL_PINNED",
          },
        }),
      ),
    IntakeManifestError,
  );

  // Real superseded proving snapshots are explicitly HISTORICAL_PINNED and stay
  // valid even though newer authoritative revisions exist (Track61 → V1.7,
  // Track63 → V1.2).
  const track61 = parseIntakeManifest(fixture("track-61-guided-next-moment-builder"));
  assert.equal(track61.sourceSnapshot.sourceAuthorityState, "HISTORICAL_PINNED");
  assert.equal(track61.sourceSnapshot.revisionLabel, "V1.5");
  assert.match(track61.sourceSnapshot.newerRevisionKnown, /V1\.7/);
  const track63 = parseIntakeManifest(fixture("track-63-moment-field-view-studio"));
  assert.equal(track63.sourceSnapshot.sourceAuthorityState, "HISTORICAL_PINNED");
  assert.match(track63.sourceSnapshot.newerRevisionKnown, /V1\.2/);
  assert.equal(track63.lifecycle, "EXECUTABLE_PENDING", "pre-executable proving snapshot is not force-upgraded");
  // Track64 was promoted from a pinned proving snapshot to the current-source
  // re-intake: V1.2.1 is CURRENT_AT_OBSERVATION, no newerRevisionKnown, the
  // executable fingerprint is pinned, and QA is absent until a native
  // candidate actually passes the gates (no false-green qa object).
  const track64 = parseIntakeManifest(fixture("track-64-floating-moment-entry-portal"));
  assert.equal(track64.sourceSnapshot.sourceAuthorityState, "CURRENT_AT_OBSERVATION");
  assert.equal(track64.sourceSnapshot.revisionLabel, "V1.2.1");
  assert.ok(!track64.sourceSnapshot.newerRevisionKnown, "CURRENT promotion removes newerRevisionKnown");
  assert.equal(track64.lifecycle, "EXECUTABLE_PENDING", "re-intake stays pre-executable until a native candidate exists");
  assert.equal(track64.qa, undefined, "source-only re-intake omits qa (no false-green)");
  const track64Exec = track64.sourceArtifacts?.find((a) => a.role === "executable");
  assert.equal(track64Exec?.status, "PINNED");
  assert.equal(track64Exec?.sha256, "80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d");
  assert.equal(track64.navigationHandoff?.targetMapping, true);
  assert.equal(track64.navigationHandoff?.actualTargetOpen, false);
});

test("hardening: Track62 executable + reservation HOLD/adoption HOLD stays valid", () => {
  const manifest = parseIntakeManifest(fixture("track-62-v1-1-reservation-hold"));
  assert.equal(manifest.lifecycle, "EXECUTABLE_AVAILABLE");
  assert.equal(manifest.lineageReservation.status, "HOLD");
  assert.equal(manifest.adoption.status, "HOLD");
  assert.equal(manifest.sourceSnapshot.sourceAuthorityState, "CURRENT_AT_OBSERVATION");
  assert.equal(manifest.lineageNumber, undefined);
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(manifest, { root, fidelityTargets: LIVE_TARGETS });
    assert.equal(plan.route, null, "no route under HOLD reservation");
    const lineageSeam = plan.registrySeams.find((seam) => seam.seam === "designLineages");
    assert.equal(lineageSeam.status, "not-applicable");
  } finally {
    cleanup(root);
  }
});

test("hardening: safe normal scaffold stays deterministic", () => {
  const root = withTempRoot();
  try {
    const first = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const second = buildScaffoldPlan(fidelityEligibleManifest(), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    assert.deepEqual(second, first);
  } finally {
    cleanup(root);
  }
});

/* ------------------------------------------------------------------ */
/* CLI integration                                                    */
/* ------------------------------------------------------------------ */

test("CLI: design:intake:validate passes over the repository manifests", () => {
  const result = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/design-intake-validate.mjs"],
    { encoding: "utf8", cwd: repoRoot },
  );
  assert.match(result, /All \d+ manifest\(s\) valid\./);
});

test("CLI: design:intake:validate rejects a malformed manifest", () => {
  const root = withTempRoot();
  try {
    const bad = path.join(root, "bad-manifest.json");
    writeFileSync(bad, JSON.stringify({ schemaVersion: 1 }), "utf8");
    let error = null;
    try {
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/design-intake-validate.mjs", bad],
        { encoding: "utf8", cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (err) {
      error = err;
    }
    assert.ok(error, "CLI must exit non-zero for a malformed manifest");
    assert.match(String(error.stderr ?? ""), /FAIL/);
    assert.match(String(error.stderr ?? ""), /invalid design intake manifest/);
  } finally {
    cleanup(root);
  }
});

test("CLI: design:intake:scaffold dry-run emits a three-seam plan without writing", () => {
  const root = withTempRoot();
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/design-intake-scaffold.mjs",
        path.join(FIXTURES_DIR, "track-60-3d-moment-cluster.json"),
      ],
      {
        encoding: "utf8",
        cwd: repoRoot,
        env: { ...process.env, DESIGN_INTAKE_ROOT: root },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    const plan = JSON.parse(stdout);
    assert.deepEqual(
      plan.registrySeams.map((seam) => seam.seam),
      ["designLineages", "designLab", "designFidelity"],
    );
    assert.ok(plan.writes.length > 0);
    assert.equal(
      existsSync(path.join(root, "design-intake/scaffolds/track-60-3d-moment-cluster/manifest.json")),
      false,
      "dry run must not write",
    );
  } finally {
    cleanup(root);
  }
});

test("CLI: design:intake:scaffold --write materializes the plan in a clean root", () => {
  const root = withTempRoot();
  try {
    const stdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/design-intake-scaffold.mjs",
        path.join(FIXTURES_DIR, "track-59-living-memory-book.json"),
        "--write",
      ],
      {
        encoding: "utf8",
        cwd: repoRoot,
        env: { ...process.env, DESIGN_INTAKE_ROOT: root },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    assert.match(stdout, /WROTE \d+ files:/);
    assert.ok(
      existsSync(path.join(root, "app/design-lab/lineages/59/59-v5/page.tsx")),
      "route page written",
    );
    assert.ok(
      existsSync(path.join(root, "tests/track-59-living-memory-book-intake-contract.test.mjs")),
      "contract test written",
    );
    assert.ok(
      existsSync(path.join(root, "design-intake/scaffolds/track-59-living-memory-book/REUSE_CHECKLIST.md")),
      "reuse checklist written",
    );
    assert.ok(
      !existsSync(path.join(root, "app/v4")),
      "no canonical /v4 tree created",
    );
  } finally {
    cleanup(root);
  }
});
