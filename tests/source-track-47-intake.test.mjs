// Source Track 47 V4.2.5 — intake pinning + route normalization tests.
// Layer 1 of 3: exact-source identity, asset transport truth, manifest
// validity and route classification. No skip, no weakened assertions.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import {
  NAV_MENU_GROUPS,
  SOURCE_TRACK_47_ROUTES,
  resolvableHref,
  routeByKey,
} from "../lib/source-track-47/route-map.ts";
import {
  SOURCE_TRACK_47_HTML,
  SOURCE_TRACK_47_POSTER,
  SOURCE_TRACK_47_SOURCE_RUNNER,
  SOURCE_TRACK_47_VIDEO,
} from "../lib/source-track-47/provenance.ts";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("pinned source identity matches the Web CTO release evidence (#234)", () => {
  assert.equal(SOURCE_TRACK_47_HTML.bytes, 40_890);
  assert.equal(
    SOURCE_TRACK_47_HTML.sha256,
    "676f5220ec4e4c8c1b15c36eaeb6a2ee4320ecceb7e413b15eee585e8ed9a596",
  );
  assert.equal(SOURCE_TRACK_47_HTML.byteIdentical, true);
  assert.deepEqual(
    SOURCE_TRACK_47_HTML.variants.map((variant) => variant.driveId).sort(),
    ["18tZB-eTCz6aeceNlbhXN3iEnfD1N442X", "1aONTs8UGsz0Kzs3rpwhAhEPFyu1vo1Z7"].sort(),
  );
  assert.equal(SOURCE_TRACK_47_POSTER.bytes, 187_679);
  assert.equal(
    SOURCE_TRACK_47_POSTER.sha256,
    "1056d9b89d49818dc43593c35b33648423d10aa340d3a69412bb88b71dcd8fdd",
  );
  assert.equal(SOURCE_TRACK_47_POSTER.driveId, "1jQ6A4RX933xPik9HKZmoyU55d969Xwg0");
  assert.equal(SOURCE_TRACK_47_VIDEO.bytes, 28_650_099);
  assert.equal(
    SOURCE_TRACK_47_VIDEO.sha256,
    "28951ccb76923e0dfbbb60e7757ab2f6fa379e405731a386fa03b05a32a227ce",
  );
  assert.equal(SOURCE_TRACK_47_VIDEO.driveId, "1dRmVkiHrV-dGJ4XNA4mp9ftKP5ozqRGT");
  assert.equal(SOURCE_TRACK_47_VIDEO.transport, "REPO_PIN_NOT_APPROPRIATE");
  assert.equal(SOURCE_TRACK_47_VIDEO.assetState, "VIDEO_EXACT_ASSET_HOLD");
});

test("committed source HTML and poster are byte-exact to the pinned identity", async () => {
  const htmlPath = "public/design-lab-assets/source-tracks/47/v4-2-5/index.html";
  const posterPath = "public/design-lab-assets/source-tracks/47/v4-2-5/assets/poster-act01.jpg";
  const html = await readFile(new URL(htmlPath, root));
  const poster = await readFile(new URL(posterPath, root));
  assert.equal(html.byteLength, SOURCE_TRACK_47_HTML.bytes);
  assert.equal(sha256(html), SOURCE_TRACK_47_HTML.sha256);
  assert.equal(poster.byteLength, SOURCE_TRACK_47_POSTER.bytes);
  assert.equal(sha256(poster), SOURCE_TRACK_47_POSTER.sha256);

  const htmlText = html.toString("utf8");
  assert.match(htmlText, /Cinematic Front Door V4\.2\.5 · Pinned Navigation Menu Fix/);
  // The exact source must stay the exact source — the runner must not modify it.
  assert.doesNotMatch(htmlText, /lovetree-limone-design-lab-injected/i);
});

test("video asset hold is truthful: the exact video is NOT in the repository tree", async () => {
  assert.equal(
    await exists("public/design-lab-assets/source-tracks/47/v4-2-5/assets/Track47_V4.2_Cinematic_DirectorCut_v2.1_CLEAN_1920x1080.mp4"),
    false,
    "the 28,650,099 B video must not be committed (Cloudflare 25 MiB static-asset limit)",
  );
  assert.equal(
    await exists("public/design-lab-assets/source-tracks/47/v4-2-5/assets/__missing_video__.mp4"),
    false,
  );
});

test("runner routes live in the isolated Source Track 47 namespace", () => {
  assert.equal(
    SOURCE_TRACK_47_SOURCE_RUNNER.runnerRoute,
    "/design-lab/source-tracks/47/v4-2-5/source",
  );
  assert.equal(
    SOURCE_TRACK_47_SOURCE_RUNNER.nativeRoute,
    "/design-lab/source-tracks/47/v4-2-5/native",
  );
  assert.equal(
    SOURCE_TRACK_47_SOURCE_RUNNER.sourceAssetPath,
    "/design-lab-assets/source-tracks/47/v4-2-5/index.html",
  );
});

test("no overlap with concurrently owned namespaces (#232 Lineage60 / #233 Lineage67 / #191)", async () => {
  for (const path of [
    "app/design-lab/lineages/60/v1-2/page.tsx",
    "lib/lineage-60/data.ts",
    "app/design-lab/lineages/67/v2-3/page.tsx",
    "lib/lineage-67-v23-source.ts",
    "app/design-lab/lineages/63/Lineage63ViewStudio.tsx",
    "lib/design-lineages.ts",
  ]) {
    // These files exist only on their owning PR branches (or main-untouched);
    // Track47 must not have created or modified anything inside them.
    if (await exists(path)) {
      const content = await readFile(new URL(path, root), "utf8");
      assert.doesNotMatch(
        content,
        /source-track-47|Track47|track-47/i,
        `${path} must not reference Track47 work`,
      );
    }
  }
});

test("design intake manifest parses and holds the classification boundary", async () => {
  const raw = JSON.parse(
    await readFile(
      new URL("design-intake/manifests/track-47-cinematic-frontdoor.json", root),
      "utf8",
    ),
  );
  const manifest = parseIntakeManifest(raw);
  assert.equal(manifest.classification, "REFERENCE_CAPABILITY_ONLY");
  assert.equal(manifest.lifecycle, "EXECUTABLE_FINGERPRINT_PINNED");
  assert.equal(manifest.stableId, "track-47-cinematic-frontdoor");
  assert.equal(manifest.designLineageId, undefined);
  assert.equal(manifest.lineageNumber, undefined);
  assert.equal(manifest.revisionId, undefined);
  // SOURCE TRACK 47 != REPOSITORY LINEAGE 47 — nothing reserves lineage 47.
  const executable = manifest.sourceArtifacts.filter(
    (artifact) => artifact.role === "executable",
  );
  assert.equal(executable.length, 1);
  assert.equal(executable[0].status, "PINNED");
  const video = manifest.sourceArtifacts.find(
    (artifact) => artifact.role === "cinematic-video-asset",
  );
  assert.equal(video.status, "REFERENCE_ONLY");
});

test("route normalization: exact classification of all 11 source routes", () => {
  assert.equal(SOURCE_TRACK_47_ROUTES.length, 11);

  const designLab = SOURCE_TRACK_47_ROUTES.filter(
    (route) => route.classification === "DESIGN_LAB_TARGET",
  );
  assert.deepEqual(
    designLab.map((route) => route.key),
    ["moment64"],
  );
  assert.equal(designLab[0].repoRoute, "/design-lab/lineages/64/v1-2-1");

  const stable = SOURCE_TRACK_47_ROUTES.filter(
    (route) => route.classification === "STABLE_REPO_TARGET",
  );
  assert.deepEqual(
    stable.map((route) => route.key),
    ["firstMoment"],
  );
  assert.equal(stable[0].repoRoute, "/v4");

  const hold = SOURCE_TRACK_47_ROUTES.filter(
    (route) => route.classification === "HOLD_UNRESOLVED",
  );
  assert.deepEqual(
    hold.map((route) => route.key).sort(),
    [
      "connection11",
      "connection16",
      "moment57",
      "moment58",
      "moment62",
      "moment63",
      "tree35",
      "tree39",
      "tree46",
    ].sort(),
  );
});

test("route normalization: repo Lineage 57/58 are different products than the source targets", async () => {
  // Evidence boundary for moment57/moment58 HOLD: the repository lineage
  // registries describe different products than Living Glass Cards / the
  // Living Memory Pinboard, so those source routes must never link there.
  const registry = await readFile(new URL("lib/design-lineages.ts", root), "utf8");
  assert.match(registry, /lt-57-living-character-world/);
  assert.match(registry, /lt-58-videofigure-atelier/);
  assert.equal(resolvableHref(routeByKey("moment57")), null);
  assert.equal(resolvableHref(routeByKey("moment58")), null);
});

test("HOLD routes never produce a live href; resolved routes do", () => {
  for (const route of SOURCE_TRACK_47_ROUTES) {
    if (route.classification === "HOLD_UNRESOLVED") {
      assert.equal(resolvableHref(route), null, `${route.key} must not resolve a href`);
    } else {
      assert.ok(resolvableHref(route)?.startsWith("/"), `${route.key} must resolve a repo route`);
    }
  }
  // Source-local paths are evidence, never product routes.
  for (const route of SOURCE_TRACK_47_ROUTES) {
    assert.match(route.sourceLocalPath, /^\.\.\//);
  }
});

test("nav menu groups mirror the owner route map composition", () => {
  assert.deepEqual(
    NAV_MENU_GROUPS.map((group) => group.id),
    ["moments", "connections", "mytree"],
  );
  assert.deepEqual(
    NAV_MENU_GROUPS[0].options.map((option) => option.key),
    ["moment57", "moment58", "moment62", "moment63", "moment64"],
  );
  assert.deepEqual(
    NAV_MENU_GROUPS[1].options.map((option) => option.key),
    ["connection11", "connection16"],
  );
  assert.deepEqual(
    NAV_MENU_GROUPS[2].options.map((option) => option.key),
    ["tree46", "tree35", "tree39"],
  );
});
