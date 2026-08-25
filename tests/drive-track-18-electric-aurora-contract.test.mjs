import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DRIVE_TRACK_18_ELECTRIC_AURORA_ID,
  ELECTRIC_AURORA_SOURCE_ONLY_SEMANTICS,
  deriveElectricAuroraFieldStatus,
  projectElectricAuroraMoments,
} from "../lib/drive-track-18-electric-aurora/authority.ts";
import { DRIVE_TRACK_18_ELECTRIC_AURORA_PROVENANCE } from "../lib/drive-track-18-electric-aurora/provenance.ts";

const sourcePath = new URL(
  "../reference/source-tracks-snapshot/18_메모리코어_전기오로라/01_메모리코어_전기오로라_v1.html",
  import.meta.url,
);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Electric Aurora exact source fingerprint stays pinned", async () => {
  const bytes = await readFile(sourcePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha256, "8c46647d2d2a573d87484cbf2c3ad532f57a32c1742cf252be83029cf6025d7b");
  assert.equal(sha256, DRIVE_TRACK_18_ELECTRIC_AURORA_PROVENANCE.sha256);
});

test("Drive Track18 Electric Aurora is not GitHub Source Track18 Fragment Loader", async () => {
  const fragmentProvenance = await readFile(new URL("../lib/source-track-18/provenance.ts", import.meta.url), "utf8");
  assert.match(fragmentProvenance, /SOURCE_TRACK_18_TITLE = "LoveTree — Identity Fragment Loader V2"/);
  assert.match(fragmentProvenance, /\/design-lab-assets\/source-tracks\/18\/v2\/index\.html/);
  assert.match(fragmentProvenance, /runnerRoute: "\/design-lab\/source-tracks\/18\/v2\/source"/);
  assert.doesNotMatch(fragmentProvenance, /메모리코어_전기오로라|electric-aurora/i);
  assert.equal(DRIVE_TRACK_18_ELECTRIC_AURORA_ID, "drive-track-18-electric-aurora");
  assert.equal(DRIVE_TRACK_18_ELECTRIC_AURORA_PROVENANCE.fragmentLoaderNamespace.relationshipToElectricAurora, "SEPARATE_IDENTITY_DO_NOT_ALIAS");
  assert.notEqual(DRIVE_TRACK_18_ELECTRIC_AURORA_PROVENANCE.nativeRoute, "/design-lab/source-tracks/18/v2/source");
});

test("Electric Aurora projection uses canonical Moment fields and does not promote source demo semantics", () => {
  const moments = [
    { id: "m2", treeId: "t", parentId: "m1", title: "Second", memo: "", sourceType: "memo", thumbnail: "", timestamp: "", discoveryDate: "", sortOrder: 2 },
    { id: "m1", treeId: "t", parentId: null, title: "First", memo: "", sourceType: "photo", thumbnail: "", timestamp: "", discoveryDate: "", sortOrder: 1 },
  ];
  const projected = projectElectricAuroraMoments(moments, "m2");
  assert.deepEqual(projected.map((moment) => moment.id), ["m1", "m2"]);
  assert.equal(projected[0].isRoot, true);
  assert.equal(projected[1].isSelected, true);
  assert.deepEqual(deriveElectricAuroraFieldStatus(projected, "m2"), {
    totalMoments: 2,
    selectedMomentId: "m2",
    selectedOrdinal: 2,
  });
  assert.deepEqual([...ELECTRIC_AURORA_SOURCE_ONLY_SEMANTICS], [
    "core-status",
    "energy",
    "importance",
    "return-distance",
    "season-count",
    "activity-score",
  ]);
});

test("native donor keeps semantic namespace and accessibility/mobile motion contracts", async () => {
  const [component, css, page, authority] = await Promise.all([
    read("app/design-lab/drive-track-18-electric-aurora/DriveTrack18ElectricAurora.tsx"),
    read("app/design-lab/drive-track-18-electric-aurora/drive-track-18-electric-aurora.module.css"),
    read("app/design-lab/drive-track-18-electric-aurora/page.tsx"),
    read("lib/drive-track-18-electric-aurora/authority.ts"),
  ]);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /ArrowLeft/);
  assert.match(component, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(component, /getContext\("webgl"/);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /focus-visible/);
  assert.match(page, /CanonicalMoment/);
  assert.match(authority, /CanonicalMoment/);
  assert.doesNotMatch(page, /energy|importance|return-distance|season-count|activity-score/i);
});
