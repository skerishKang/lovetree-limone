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
});

/* ------------------------------------------------------------------ */
/* 3. sourceTrackId != designLineageId is allowed                     */
/* ------------------------------------------------------------------ */

test("3. sourceTrackId and designLineageId are separate identities", () => {
  const manifest = parseIntakeManifest(fixture("track-60-canvas-memory-orbit"));
  assert.equal(manifest.sourceTrackId, "Track60");
  assert.equal(manifest.designLineageId, "lt-60-canvas-memory-orbit");
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

test("5. dom-2d rendering is valid", () => {
  const manifest = parseIntakeManifest(newLineageManifest({ rendering: "dom-2d" }));
  assert.equal(manifest.rendering, "dom-2d");
});

test("6. canvas-3d-projection rendering is valid", () => {
  const manifest = parseIntakeManifest(
    newLineageManifest({ rendering: "canvas-3d-projection" }),
  );
  assert.equal(manifest.rendering, "canvas-3d-projection");
});

test("7. EXECUTABLE_PENDING lifecycle is valid", () => {
  const manifest = parseIntakeManifest(
    newLineageManifest({ lifecycle: "EXECUTABLE_PENDING", route: undefined }),
  );
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
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
  const manifest = fixture("track-60-canvas-memory-orbit");
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
    const plan = buildScaffoldPlan(fixture("track-60-canvas-memory-orbit"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    assert.deepEqual(
      plan.registrySeams.map((seam) => seam.seam),
      ["designLineages", "designLab", "designFidelity"],
    );
    for (const seam of plan.registrySeams) {
      assert.equal(seam.status, "entry", `${seam.seam} must carry a real registration`);
      assert.ok(seam.entry, `${seam.seam} must carry registration data`);
    }

    // The fidelity registration carries viewports + reduced-motion config.
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    const target = fidelity.entry.target;
    assert.equal(target.route, "/design-lab/lineages/60/60-v1");
    assert.deepEqual(target.browserGates, ["tests/track-60-canvas-memory-orbit-route-browser-qa.mjs"]);

    // Non-executable candidates must still declare every seam (deferred/N-A).
    const pending = buildScaffoldPlan(fixture("track-63-executable-pending"), {
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

  // A partial-lifecycle manifest never enables the fidelity assetGate.
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fixture("track-60-canvas-memory-orbit"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.entry.target.assetGate, null, "partial lifecycle: asset gate stays off");

    // A complete-lifecycle manifest with a valid PASS state enables the verifier gate.
    const complete = parseIntakeManifest({
      ...pending,
      lifecycle: "ARTIFACTS_COMPLETE",
      exactAssetGate: {
        fingerprintStatus: "FINGERPRINT_COMPLETE",
        binaryTransferStatus: "BINARY_TRANSFER_COMPLETE",
        exactGateStatus: "EXACT_GATE_PASS",
      },
    });
    const completePlan = buildScaffoldPlan(complete, { root, fidelityTargets: LIVE_TARGETS });
    const completeFidelity = completePlan.registrySeams.find((seam) => seam.seam === "designFidelity");
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

test("13. 320×720 narrow viewport configuration is transmitted", () => {
  const root = withTempRoot();
  try {
    const plan = buildScaffoldPlan(fixture("track-60-canvas-memory-orbit"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
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
    const plan = buildScaffoldPlan(fixture("track-60-canvas-memory-orbit"), {
      root,
      fidelityTargets: LIVE_TARGETS,
    });
    const fidelity = plan.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(fidelity.entry.target.captureReducedMotion, true);

    const withoutMotion = buildScaffoldPlan(
      newLineageManifest({ qa: undefined }),
      { root, fidelityTargets: LIVE_TARGETS },
    );
    const withoutFidelity = withoutMotion.registrySeams.find((seam) => seam.seam === "designFidelity");
    assert.equal(withoutFidelity.entry.target.captureReducedMotion, false);
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
    const fixtureNames = [
      "track-55-canonical-owner",
      "track-56-existing-lineage-variant",
      "track-59-new-lineage",
      "track-60-canvas-memory-orbit",
      "track-61-dom-2d-journey",
      "track-62-v1-reference-only",
      "track-62-v1-1-reservation-hold",
      "track-63-executable-pending",
      "track-64-memory-entry-portal",
    ];
    for (const name of fixtureNames) {
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
    const track55 = buildScaffoldPlan(fixture("track-55-canonical-owner"), {
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
  const manifest = parseIntakeManifest(fixture("track-55-canonical-owner"));
  assert.equal(manifest.classification, "CANONICAL_OWNER_CAPABILITY");
  assert.equal(manifest.ownerRoute, "/v4/trees/demo/graph");
  assert.equal(manifest.lifecycle, "ARTIFACTS_COMPLETE");
});

test("fixtures: Track56 → EXISTING_LINEAGE_VARIANT → Lineage53/CAP14 family", () => {
  const manifest = parseIntakeManifest(fixture("track-56-existing-lineage-variant"));
  assert.equal(manifest.classification, "EXISTING_LINEAGE_VARIANT");
  assert.equal(manifest.designLineageId, "lt-53-emotional-path-replay");
  assert.notEqual(manifest.sourceTrackId, manifest.designLineageId);
});

test("fixtures: Track59 → NEW_LINEAGE", () => {
  const manifest = parseIntakeManifest(fixture("track-59-new-lineage"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "INSTRUCTION_ACCEPTED");
});

test("fixtures: Track60 → NEW_LINEAGE → canvas-3d-projection", () => {
  const manifest = parseIntakeManifest(fixture("track-60-canvas-memory-orbit"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.rendering, "canvas-3d-projection");
  assert.equal(manifest.lifecycle, "ARTIFACTS_PARTIAL");
});

test("fixtures: Track61 → NEW_LINEAGE → dom-2d", () => {
  const manifest = parseIntakeManifest(fixture("track-61-dom-2d-journey"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.rendering, "dom-2d");
  assert.equal(manifest.navigationHandoff.actualTargetOpen, false);
  assert.equal(manifest.navigationHandoff.openCall, true);
});

test("fixtures: Track62 V1 → REFERENCE_CAPABILITY_ONLY", () => {
  const manifest = parseIntakeManifest(fixture("track-62-v1-reference-only"));
  assert.equal(manifest.classification, "REFERENCE_CAPABILITY_ONLY");
  assert.equal(manifest.lifecycle, "REFERENCE_PINNED");
  assert.equal(manifest.designLineageId, undefined);
});

test("fixtures: Track62 V1.1 → lineage/template candidate with adoption HOLD", () => {
  const manifest = parseIntakeManifest(fixture("track-62-v1-1-reservation-hold"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.reservation.held, true);
  assert.equal(manifest.lifecycle, "INSTRUCTION_ACCEPTED");
  assert.equal(manifest.route, undefined);
});

test("fixtures: Track63 → NEW_LINEAGE → executable pending", () => {
  const manifest = parseIntakeManifest(fixture("track-63-executable-pending"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "EXECUTABLE_PENDING");
  assert.equal(manifest.route, undefined);
});

test("fixtures: Track64 → NEW_LINEAGE → reference pinned, Memory Entry Portal job", () => {
  const manifest = parseIntakeManifest(fixture("track-64-memory-entry-portal"));
  assert.equal(manifest.classification, "NEW_LINEAGE");
  assert.equal(manifest.lifecycle, "REFERENCE_PINNED");
  assert.equal(manifest.route, undefined);
  assert.match(manifest.productJob, /Returning-user Memory Entry Portal/);
});

test("fixtures: all repository manifests parse and scaffold cleanly", () => {
  const names = [
    "track-55-canonical-owner",
    "track-56-existing-lineage-variant",
    "track-59-new-lineage",
    "track-60-canvas-memory-orbit",
    "track-61-dom-2d-journey",
    "track-62-v1-reference-only",
    "track-62-v1-1-reservation-hold",
    "track-63-executable-pending",
    "track-64-memory-entry-portal",
  ];
  for (const name of names) {
    const manifest = parseIntakeManifest(fixture(name));
    assert.ok(manifest.stableId, `${name}: stableId`);
    assert.ok(manifest.provenance.sourceFiles.length > 0, `${name}: sourceFiles`);
  }

  const root = withTempRoot();
  try {
    for (const name of names) {
      const plan = buildScaffoldPlan(fixture(name), { root, fidelityTargets: LIVE_TARGETS });
      assert.ok(plan.writes.length >= 4, `${name}: expected at least metadata/provenance/tests/docs writes`);
      assert.ok(plan.registrySeams.length === 3, `${name}: three registry seams`);
    }
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
        path.join(FIXTURES_DIR, "track-60-canvas-memory-orbit.json"),
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
      existsSync(path.join(root, "design-intake/scaffolds/track-60-canvas-memory-orbit/manifest.json")),
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
        path.join(FIXTURES_DIR, "track-61-dom-2d-journey.json"),
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
      existsSync(path.join(root, "app/design-lab/lineages/61/61-v1/page.tsx")),
      "route page written",
    );
    assert.ok(
      existsSync(path.join(root, "tests/track-61-dom-2d-journey-intake-contract.test.mjs")),
      "contract test written",
    );
    assert.ok(
      !existsSync(path.join(root, "app/v4")),
      "no canonical /v4 tree created",
    );
  } finally {
    cleanup(root);
  }
});
