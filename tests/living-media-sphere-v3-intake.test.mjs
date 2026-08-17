import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  LIVING_MEDIA_SPHERE_FAMILY_ID,
  LIVING_MEDIA_SPHERE_GOVERNANCE,
  LIVING_MEDIA_SPHERE_HTML,
  LIVING_MEDIA_SPHERE_MEDIA,
  LIVING_MEDIA_SPHERE_PHASE,
  LIVING_MEDIA_SPHERE_POINTER_CONTRACT,
  LIVING_MEDIA_SPHERE_RENDERING,
  LIVING_MEDIA_SPHERE_REVISION,
  LIVING_MEDIA_SPHERE_SOURCE_RUNNER,
  LIVING_MEDIA_SPHERE_START_ALIAS,
} from "../lib/living-media-sphere-v3/provenance.ts";

const ROOT = new URL("../", import.meta.url);
const REPO = fileURLToPath(ROOT);
const FAMILY_MANIFEST = "design-intake/source-families/living-media-sphere-v3.json";
const HTML = "public/design-lab-assets/source-families/living-media-sphere/v3/index.html";
const HISTORY = "docs/design/source-families/living-media-sphere/history/pre-242-numeric-identity-manifest.json";
const exists = (path) => stat(new URL(path, ROOT)).then(() => true).catch(() => false);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
function inventoryOf(snapshot) {
  const inventory = Object.values(snapshot).find((v) => v && typeof v === "object" && Array.isArray(v.videos) && Array.isArray(v.posters) && v.videos.length === 89 && v.posters.length === 89);
  assert.ok(inventory, "historical snapshot must preserve the 89+89 inventory");
  return inventory;
}

test("Living Media Sphere uses independent source-family identity after #242", async () => {
  assert.equal(LIVING_MEDIA_SPHERE_FAMILY_ID, "living-media-sphere");
  assert.equal(LIVING_MEDIA_SPHERE_REVISION, "V3");
  assert.equal(LIVING_MEDIA_SPHERE_GOVERNANCE.decisionIssue, 242);
  assert.equal(LIVING_MEDIA_SPHERE_GOVERNANCE.historicalDriveFolderNumber, 68);
  assert.equal(LIVING_MEDIA_SPHERE_GOVERNANCE.historicalNumberMeaning, "ADOPTED_DESIGN_FOLDER_PROVENANCE_ONLY");
  assert.equal(LIVING_MEDIA_SPHERE_GOVERNANCE.repositoryNumericSourceTrackId, null);
  assert.equal(LIVING_MEDIA_SPHERE_GOVERNANCE.repositoryLineage68, "NOT_ALLOCATED");
  assert.equal(LIVING_MEDIA_SPHERE_SOURCE_RUNNER.runnerRoute, "/design-lab/source-families/living-media-sphere/v3/source");
  assert.equal(LIVING_MEDIA_SPHERE_SOURCE_RUNNER.sourceAssetPath, "/design-lab-assets/source-families/living-media-sphere/v3/index.html");

  const manifest = JSON.parse(await readFile(new URL(FAMILY_MANIFEST, ROOT), "utf8"));
  assert.equal(manifest.kind, "SOURCE_FAMILY_INTAKE");
  assert.equal(manifest.stableId, "living-media-sphere-v3");
  assert.equal(manifest.sourceFamilyId, "living-media-sphere");
  assert.equal(manifest.governance.historicalDriveFolderNumber, 68);
  assert.equal(manifest.governance.repositoryNumericSourceTrackId, null);
  assert.equal(manifest.governance.repositoryLineage68, "NOT_ALLOCATED");
  assert.equal(manifest.governance.canonicalV4Adoption, "NO");
  assert.equal(manifest.governance.productionMutation, "NONE");
  assert.equal(manifest.exactMedia.rows, 178);
});

test("namespace move preserves the exact executable bytes", async () => {
  const html = await readFile(new URL(HTML, ROOT));
  assert.equal(html.byteLength, 25_544);
  assert.equal(sha256(html), "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232");
  assert.equal(LIVING_MEDIA_SPHERE_HTML.bytes, 25_544);
  assert.equal(LIVING_MEDIA_SPHERE_HTML.sha256, "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232");
  assert.equal(LIVING_MEDIA_SPHERE_HTML.byteIdentical, true);
  assert.deepEqual(LIVING_MEDIA_SPHERE_HTML.variants.map((v) => v.driveId).sort(), ["1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx", "1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6"].sort());
  assert.equal(LIVING_MEDIA_SPHERE_START_ALIAS.classification, "TRASH/HISTORICAL_ALIAS");
  assert.equal(LIVING_MEDIA_SPHERE_START_ALIAS.status, "REFERENCE_ONLY");
  const text = html.toString("utf8");
  assert.match(text, /LoveTree — Living Video Sphere V3/);
  assert.match(text, /var TOTAL=89/);
  assert.doesNotMatch(text, /lovetree-limone-design-lab-injected/i);
});

test("historical snapshot preserves all 178 per-file media authority rows", async () => {
  const snapshot = JSON.parse(await readFile(new URL(HISTORY, ROOT), "utf8"));
  const inventory = inventoryOf(snapshot);
  assert.equal(inventory.transport, "LOCAL_EXACT_OUT_OF_GIT_ONLY");
  const checkRows = (rows, kind, prefix, ext) => {
    const ids = new Set();
    rows.forEach((row, i) => {
      assert.equal(row.i, i + 1);
      assert.equal(row.f, `${prefix}-${String(i + 1).padStart(3, "0")}.${ext}`);
      assert.match(row.id, /^[A-Za-z0-9_-]{20,}$/);
      assert.equal(typeof row.b, "number");
      assert.match(row.h, /^[0-9a-f]{64}$/);
      ids.add(row.id);
    });
    assert.equal(ids.size, rows.length, `${kind}: duplicate Drive IDs`);
  };
  checkRows(inventory.videos, "video", "v3", "mp4");
  checkRows(inventory.posters, "poster", "poster", "jpg");
  assert.equal(inventory.videos.reduce((sum, row) => sum + row.b, 0), 1_946_025_764);
  assert.equal(inventory.posters.reduce((sum, row) => sum + row.b, 0), 1_619_015);
  const threshold = 25 * 1024 * 1024;
  assert.equal(inventory.videos.filter((row) => row.b <= threshold).length, 64);
  assert.equal(inventory.videos.filter((row) => row.b > threshold).length, 25);
  assert.equal(LIVING_MEDIA_SPHERE_MEDIA.mediaManifestRows, 178);
  assert.equal(LIVING_MEDIA_SPHERE_MEDIA.videoCount, 89);
  assert.equal(LIVING_MEDIA_SPHERE_MEDIA.posterCount, 89);
});

test("exact media stays local-only and zero binary media is Git-tracked", async () => {
  const gitignore = await readFile(new URL(".gitignore", ROOT), "utf8");
  assert.match(gitignore, /public\/design-lab-assets\/source-families\/living-media-sphere\/v3\/assets\//);
  const tracked = execFileSync("git", ["ls-files", "--", "public/design-lab-assets/source-families/living-media-sphere", FAMILY_MANIFEST, HISTORY], { cwd: REPO })
    .toString().split("\n").map((line) => line.trim()).filter(Boolean);
  const media = tracked.filter((path) => /\.(mp4|jpg|jpeg|png|webp|webm|mov)$/i.test(path));
  assert.equal(media.length, 0, `exact media must not be Git-tracked: ${media.join(", ")}`);
  assert.ok(tracked.includes(HTML), "exact executable HTML must remain Git-tracked");
  assert.equal(LIVING_MEDIA_SPHERE_MEDIA.transport, "LOCAL_EXACT_OUT_OF_GIT_ONLY");
});

test("source defect and Phase-2 remediation truth remain pinned", () => {
  assert.equal(LIVING_MEDIA_SPHERE_POINTER_CONTRACT.severity, "P0");
  assert.match(LIVING_MEDIA_SPHERE_POINTER_CONTRACT.sourceDefect, /pointercancel/);
  assert.match(LIVING_MEDIA_SPHERE_POINTER_CONTRACT.pointercancel, /cleanup only/i);
  assert.match(LIVING_MEDIA_SPHERE_POINTER_CONTRACT.pointercancel, /never open viewer/);
  assert.match(LIVING_MEDIA_SPHERE_POINTER_CONTRACT.lostpointercapture, /cleanup only/i);
  assert.equal(LIVING_MEDIA_SPHERE_RENDERING.primary, "css3d-dom");
  assert.equal(LIVING_MEDIA_SPHERE_PHASE.nativeCandidate, "HOLD_PHASE_2");
  assert.equal(LIVING_MEDIA_SPHERE_PHASE.repositoryLineage, "NOT_ALLOCATED");
  assert.equal(LIVING_MEDIA_SPHERE_PHASE.canonicalV4Adoption, "NOT_AUTHORIZED");
});

test("old numeric repository namespace is retired and current files are residue-clean", async () => {
  const retired = [
    "app/design-lab/source-tracks/68/v3/source",
    "lib/source-track-68",
    "design-intake/manifests/track-68-living-media-sphere-v3.json",
    "docs/design/source-tracks/TRACK68_V3_SOURCE_FORENSICS.md",
    "public/design-lab-assets/source-tracks/68/v3/index.html",
    "tests/source-track-68-intake.test.mjs",
    "tests/source-track-68-browser-qa.mjs",
    ".github/workflows/source-track68-v3-hold-browser-qa.yml",
  ];
  for (const path of retired) assert.equal(await exists(path), false, `retired namespace still exists: ${path}`);
  assert.equal(await exists(HISTORY), true);

  const current = [
    "lib/living-media-sphere-v3/provenance.ts",
    "app/design-lab/source-families/living-media-sphere/v3/source/LivingMediaSphereSourceRunner.tsx",
    "app/design-lab/source-families/living-media-sphere/v3/source/page.tsx",
    FAMILY_MANIFEST,
    "tests/living-media-sphere-v3-browser-qa.mjs",
    ".github/workflows/living-media-sphere-v3-hold-browser-qa.yml",
    ".gitignore",
  ];
  const forbidden = [/source-tracks\/68/, /source-track-68/, /source_track_68/, /\bTrack68\b/, /\bTRACK68\b/, /track-68-living/, /Source Track 68/, /source-track68/, /track68-v3/];
  for (const path of current) {
    const text = await readFile(new URL(path, ROOT), "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${path} contains forbidden current numeric ownership residue`);
  }
});

test("Phase 1 stays bounded: no native family route exists", async () => {
  assert.equal(await exists("app/design-lab/source-families/living-media-sphere/v3/native"), false);
});
