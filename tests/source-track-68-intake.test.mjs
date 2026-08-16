// Source Track 68 V3 — intake pinning + exact-media evidence tests.
// Layer 1: exact-source identity, media transport truth (LOCAL_EXACT_OUT_OF_GIT),
// manifest inventory integrity, and Phase 1 boundary. No skip, no weakened assertions.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  SOURCE_TRACK_68_HTML,
  SOURCE_TRACK_68_MEDIA,
  SOURCE_TRACK_68_PHASE,
  SOURCE_TRACK_68_POINTER_CONTRACT,
  SOURCE_TRACK_68_RENDERING,
  SOURCE_TRACK_68_REVISION,
  SOURCE_TRACK_68_START_ALIAS,
} from "../lib/source-track-68/provenance.ts";

const root = new URL("../", import.meta.url);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function exists(path) {
  try {
    await stat(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

const MANIFEST_PATH = "design-intake/manifests/track-68-living-media-sphere-v3.json";
const HTML_PATH = "public/design-lab-assets/source-tracks/68/v3/index.html";

test("track68 pinned constants match the Web CTO Phase 1 release evidence (#235)", async () => {
  assert.equal(SOURCE_TRACK_68_REVISION, "V3");
  assert.equal(SOURCE_TRACK_68_HTML.bytes, 25_544);
  assert.equal(
    SOURCE_TRACK_68_HTML.sha256,
    "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232",
  );
  assert.equal(SOURCE_TRACK_68_HTML.byteIdentical, true);
  // Current executable variants are ONLY the executable + the accessible dev copy.
  assert.deepEqual(
    SOURCE_TRACK_68_HTML.variants.map((variant) => variant.driveId).sort(),
    ["1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx", "1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6"].sort(),
  );
  // START.html is TRASH/HISTORICAL_ALIAS (REFERENCE_ONLY) — never a current variant.
  assert.equal(SOURCE_TRACK_68_START_ALIAS.driveId, "1A30t1gY088DWbdWU6lqqYWdUJJhAzqwI");
  assert.equal(SOURCE_TRACK_68_START_ALIAS.classification, "TRASH/HISTORICAL_ALIAS");
  assert.equal(SOURCE_TRACK_68_START_ALIAS.status, "REFERENCE_ONLY");
  assert.equal(SOURCE_TRACK_68_START_ALIAS.currentAvailability, "DRIVE_API_404_FILE_NOT_FOUND");
  assert.equal(
    (SOURCE_TRACK_68_HTML.variants.find((v) => v.driveId === SOURCE_TRACK_68_START_ALIAS.driveId) ||
      undefined),
    undefined,
    "START.html must not appear among current executable variants",
  );
  // P0 pointercancel ledger + pinned Phase 2 cleanup-only contract.
  assert.equal(SOURCE_TRACK_68_POINTER_CONTRACT.severity, "P0");
  assert.match(SOURCE_TRACK_68_POINTER_CONTRACT.sourceDefect, /pointercancel/);
  assert.match(SOURCE_TRACK_68_POINTER_CONTRACT.pointercancel, /cleanup only/i);
  assert.match(SOURCE_TRACK_68_POINTER_CONTRACT.pointercancel, /never open viewer/);
  assert.match(SOURCE_TRACK_68_POINTER_CONTRACT.lostpointercapture, /cleanup only/i);
  assert.equal(SOURCE_TRACK_68_MEDIA.videoCount, 89);
  assert.equal(SOURCE_TRACK_68_MEDIA.posterCount, 89);
  assert.equal(SOURCE_TRACK_68_MEDIA.videoTotalBytes, 1_946_025_764);
  assert.equal(SOURCE_TRACK_68_MEDIA.posterTotalBytes, 1_619_015);
  assert.equal(SOURCE_TRACK_68_MEDIA.videosAtOrBelow25MiB, 64);
  assert.equal(SOURCE_TRACK_68_MEDIA.videosAbove25MiB, 25);
  assert.equal(SOURCE_TRACK_68_MEDIA.transport, "LOCAL_EXACT_OUT_OF_GIT_ONLY");
  // No machine-local absolute path may survive as repository authority.
  const provenanceSource = await readFile(new URL("../lib/source-track-68/provenance.ts", root), "utf8");
  assert.doesNotMatch(provenanceSource, /"[A-Z]:\//, "no Windows drive-letter absolute path in provenance");
  assert.doesNotMatch(provenanceSource, /\/mnt\/[a-z]\//, "no /mnt/<drive> absolute path in provenance");
  // Phase 1 boundary: native is HOLD, no lineage, no canonical adoption.
  assert.equal(SOURCE_TRACK_68_PHASE.nativeCandidate, "HOLD_PHASE_2");
  assert.equal(SOURCE_TRACK_68_PHASE.repositoryLineage, "NOT_ALLOCATED");
  assert.equal(SOURCE_TRACK_68_PHASE.canonicalV4Adoption, "NOT_AUTHORIZED");
  assert.equal(SOURCE_TRACK_68_RENDERING.primary, "css3d-dom");
});

test("committed source HTML is byte-exact to the pinned identity", async () => {
  const html = await readFile(new URL(HTML_PATH, root));
  assert.equal(html.byteLength, 25_544);
  assert.equal(
    sha256(html),
    "2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232",
  );
  const htmlText = html.toString("utf8");
  assert.match(htmlText, /LoveTree — Living Video Sphere V3/);
  assert.match(htmlText, /var TOTAL=89/);
  // The exact source must stay the exact source — the runner must not modify it.
  assert.doesNotMatch(htmlText, /lovetree-limone-design-lab-injected/i);
});

test("manifest media inventory is complete and internally consistent", async () => {
  const manifest = JSON.parse(await readFile(new URL(MANIFEST_PATH, root), "utf8"));
  assert.equal(manifest.sourceTrackId, "Track68");
  assert.equal(manifest.classification, "REFERENCE_CAPABILITY_ONLY");
  assert.equal(manifest.lifecycle, "EXECUTABLE_FINGERPRINT_PINNED");
  assert.equal(manifest.rendering, "css3d-dom");
  assert.equal(manifest.sourceSnapshot.revisionLabel, "V3");

  const inventory = manifest.track68MediaInventory;
  assert.equal(inventory.transport, "LOCAL_EXACT_OUT_OF_GIT_ONLY");
  assert.equal(inventory.videos.length, 89);
  assert.equal(inventory.posters.length, 89);

  const checkRows = (rows, kind, prefix) => {
    const ids = new Set();
    rows.forEach((row, i) => {
      assert.equal(row.i, i + 1, `${kind} index continuity broken at ${i + 1}`);
      assert.equal(row.f, `${prefix}-${String(i + 1).padStart(3, "0")}.${kind === "video" ? "mp4" : "jpg"}`);
      assert.match(row.id, /^[A-Za-z0-9_-]{20,}$/, `${kind} ${row.i}: driveFileId missing/placeholder`);
      assert.equal(typeof row.b, "number");
      assert.match(row.h, /^[0-9a-f]{64}$/, `${kind} ${row.i}: sha256 missing/invalid`);
      ids.add(row.id);
    });
    assert.equal(ids.size, rows.length, `${kind}: duplicate driveFileIds in inventory`);
  };
  checkRows(inventory.videos, "video", "v3");
  checkRows(inventory.posters, "poster", "poster");

  assert.equal(
    inventory.videos.reduce((sum, row) => sum + row.b, 0),
    1_946_025_764,
    "video bytes total must equal the aggregate authority",
  );
  assert.equal(
    inventory.posters.reduce((sum, row) => sum + row.b, 0),
    1_619_015,
  );
  const threshold = 25 * 1024 * 1024;
  assert.equal(inventory.videos.filter((row) => row.b <= threshold).length, 64);
  assert.equal(inventory.videos.filter((row) => row.b > threshold).length, 25);
});

test("media transport hold is truthful: no exact media is Git-tracked (local staging allowed)", async () => {
  const gitignore = await readFile(new URL(".gitignore", root), "utf8");
  assert.match(
    gitignore,
    /public\/design-lab-assets\/source-tracks\/68\/v3\/assets\//,
    "the Track68 media staging path must be gitignored",
  );

  // LOCAL_EXACT_OUT_OF_GIT_ONLY = staging exact media locally is ALLOWED.
  // The contract this guard proves is "zero Track68 exact-media binaries are
  // Git-tracked" — NOT "no untracked local media exists". A developer may
  // stage the 89+89 assets under the gitignored path for local exact-media
  // QA; that state must keep this test green.
  const tracked = execFileSync(
    "git",
    ["ls-files", "--", "public/design-lab-assets/source-tracks/68", "design-intake/manifests/track-68-living-media-sphere-v3.json"],
    { cwd: fileURLToPath(new URL("../", import.meta.url)) },
  )
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const trackedMedia = tracked.filter((path) => /\.(mp4|jpg|jpeg|png|webp|webm|mov)$/i.test(path));
  assert.equal(
    trackedMedia.length,
    0,
    `Track68 exact media must never be Git-tracked — found tracked media: ${trackedMedia.join(", ")}`,
  );
  // The repo transports the pinned executable HTML (not media) — sanity-check it stays tracked.
  assert.ok(
    tracked.includes("public/design-lab-assets/source-tracks/68/v3/index.html"),
    "the exact pinned executable HTML must remain Git-tracked",
  );
});

test("Phase 1 boundary: no native candidate route exists yet", async () => {
  assert.equal(
    await exists("app/design-lab/source-tracks/68/v3/native"),
    false,
    "Phase 2 native candidate is HOLD — no native route may exist in Phase 1",
  );
});
