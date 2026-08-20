import { test } from "node:test";
import assert from "node:assert/strict";

// These tests verify the pure-logic provenance/host-bridge constants.
// They do NOT load the browser; browser QA is in tests/source-track68-v332-browser-qa.mjs.

import {
  SOURCE_TRACK_68_A_B_SEMANTICS,
  SOURCE_TRACK_68_HERO_LEFT,
  SOURCE_TRACK_68_HERO_RIGHT,
  SOURCE_TRACK_68_LAUNCHER,
  SOURCE_TRACK_68_PORTAL_COUNTS,
  SOURCE_TRACK_68_PORTAL_LEDGER,
  SOURCE_TRACK_68_VARIANT_A,
  SOURCE_TRACK_68_VARIANT_B,
  SOURCE_TRACK_68_EXTERNAL_MEDIA,
} from "@/app/design-lab/source-tracks/68/v3-3-2/compare/lib/provenance";

test("Track68 launcher fingerprint matches Issue #244 authority", () => {
  assert.equal(SOURCE_TRACK_68_LAUNCHER.bytes, 2670);
  assert.equal(
    SOURCE_TRACK_68_LAUNCHER.sha256,
    "31637f6ffd49a280cded499e6c1a65fda79f0647561bdfd83d4696332129d8c8",
  );
});

test("Track68 variant A fingerprint matches Issue #244 authority", () => {
  assert.equal(SOURCE_TRACK_68_VARIANT_A.bytes, 18565);
  assert.equal(
    SOURCE_TRACK_68_VARIANT_A.sha256,
    "9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42",
  );
});

test("Track68 variant B fingerprint matches Issue #244 authority", () => {
  assert.equal(SOURCE_TRACK_68_VARIANT_B.bytes, 18646);
  assert.equal(
    SOURCE_TRACK_68_VARIANT_B.sha256,
    "cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004",
  );
});

test("Track68 A/B semantics: IDENTICAL, SELECTED_VARIANT=UNRESOLVED", () => {
  assert.equal(SOURCE_TRACK_68_A_B_SEMANTICS.semantics, "IDENTICAL");
  assert.equal(SOURCE_TRACK_68_A_B_SEMANTICS.selectedVariant, "UNRESOLVED");
  assert.equal(SOURCE_TRACK_68_A_B_SEMANTICS.diffClasses.length, 2);
});

test("Track68 portal ledger: 9 total, 4 design-lab, 0 stable-repo, 5 hold", () => {
  assert.equal(SOURCE_TRACK_68_PORTAL_COUNTS.total, 9);
  assert.equal(SOURCE_TRACK_68_PORTAL_COUNTS.designLabTarget, 4);
  assert.equal(SOURCE_TRACK_68_PORTAL_COUNTS.stableRepoTarget, 0);
  assert.equal(SOURCE_TRACK_68_PORTAL_COUNTS.holdUnresolved, 5);
});

test("Track68 portal ledger includes all 9 source target IDs", () => {
  const ids = SOURCE_TRACK_68_PORTAL_LEDGER.map((p) => p.sourceTargetId);
  assert.deepEqual(
    [...ids].sort(),
    ["65", "67", "C08", "C09", "C10", "C11", "C12", "C13", "C14"].sort(),
  );
});

test("Track68 C12 maps to Living Media Sphere source-family route (fresh current-main)", () => {
  const c12 = SOURCE_TRACK_68_PORTAL_LEDGER.find((p) => p.sourceTargetId === "C12");
  assert.ok(c12, "C12 entry must exist");
  assert.equal(c12.routeStatus, "DESIGN_LAB_TARGET");
  assert.equal(
    c12.resolvedRepositoryRoute,
    "/design-lab/source-families/living-media-sphere/v3/source",
  );
});

test("Track67 portal maps to /design-lab/lineages/67/v2-4/source", () => {
  const t67 = SOURCE_TRACK_68_PORTAL_LEDGER.find((p) => p.sourceTargetId === "67");
  assert.ok(t67, "67 entry must exist");
  assert.equal(t67.routeStatus, "DESIGN_LAB_TARGET");
  assert.equal(t67.resolvedRepositoryRoute, "/design-lab/lineages/67/v2-4/source");
});

test("Track65 portal is HOLD_UNRESOLVED (no current-main target)", () => {
  const t65 = SOURCE_TRACK_68_PORTAL_LEDGER.find((p) => p.sourceTargetId === "65");
  assert.ok(t65);
  assert.equal(t65.routeStatus, "HOLD_UNRESOLVED");
  assert.equal(t65.resolvedRepositoryRoute, null);
});

test("Track68 hero companions: local, not CloudFront", () => {
  assert.equal(SOURCE_TRACK_68_HERO_LEFT.transport, "REPO_LOCAL_COMPANION");
  assert.equal(SOURCE_TRACK_68_HERO_RIGHT.transport, "REPO_LOCAL_COMPANION");
  assert.equal(SOURCE_TRACK_68_HERO_LEFT.cloudfrontByteEquivalence, "HOLD");
  assert.equal(SOURCE_TRACK_68_HERO_RIGHT.cloudfrontByteEquivalence, "HOLD");
});

test("Track68 hero companion fingerprints match Issue #244 authority", () => {
  assert.equal(SOURCE_TRACK_68_HERO_LEFT.bytes, 2485522);
  assert.equal(
    SOURCE_TRACK_68_HERO_LEFT.sha256,
    "2b898552691e6562c255ed18fd318979134eec4c7005647336e3390187a1cb59",
  );
  assert.equal(SOURCE_TRACK_68_HERO_RIGHT.bytes, 2265192);
  assert.equal(
    SOURCE_TRACK_68_HERO_RIGHT.sha256,
    "e70bbeea35a13c55f92942f1dbd8d2fcc097921b33def0bec3fafa2eedb65500",
  );
});

test("Track68 external media: CloudFront hotlink NOT authorized", () => {
  assert.equal(SOURCE_TRACK_68_EXTERNAL_MEDIA.directCloudfrontHotlink, "NOT_AUTHORIZED");
  assert.equal(SOURCE_TRACK_68_EXTERNAL_MEDIA.cloudfrontByteEquivalence, "HOLD");
  assert.equal(SOURCE_TRACK_68_EXTERNAL_MEDIA.externalJs, "NONE");
  assert.equal(SOURCE_TRACK_68_EXTERNAL_MEDIA.iframe, "NONE");
});

test("Track68 HOLD portal targets never have resolved routes", () => {
  for (const p of SOURCE_TRACK_68_PORTAL_LEDGER) {
    if (p.routeStatus === "HOLD_UNRESOLVED") {
      assert.equal(p.resolvedRepositoryRoute, null, `${p.sourceTargetId} HOLD must have null route`);
      assert.equal(p.resolvedRepositoryTargetId, null, `${p.sourceTargetId} HOLD must have null target`);
    }
  }
});

test("Track68 DESIGN_LAB_TARGET portal targets always have resolved routes", () => {
  for (const p of SOURCE_TRACK_68_PORTAL_LEDGER) {
    if (p.routeStatus === "DESIGN_LAB_TARGET") {
      assert.ok(p.resolvedRepositoryRoute, `${p.sourceTargetId} must have a resolved route`);
      assert.ok(p.resolvedRepositoryTargetId, `${p.sourceTargetId} must have a target id`);
    }
  }
});
