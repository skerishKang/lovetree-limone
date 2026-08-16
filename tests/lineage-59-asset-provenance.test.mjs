import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  ASSET_LEDGER,
  LINEAGE_59_SOURCE_FINGERPRINTS,
  DRIVE_FETCH_STATUS,
  MAX_PINNED_BINARY_BYTES,
  resolveMomentMediaBinding,
  verifyExactPin,
  isRepoPinnable,
  getLedgerEntry,
  ledgerStatusSummary,
} from "../lib/lineage-59/asset-provenance.ts";
import { LINEAGE_59_SOURCE } from "../lib/lineage-59/lineage-59-source.ts";
import { MOMENTS, LONG_PATH_MOMENTS, BRANCH_MOMENTS } from "../lib/lineage-59/living-memory-book-data.ts";
import { createSelection } from "../lib/lineage-59/selection-authority.ts";

const PLACEHOLDER_DIR = new URL(
  "../public/design-lab-assets/lineages/59/v5/media/",
  import.meta.url,
);

test("exact asset identity mapping is recorded with source fingerprint authority", () => {
  const executable = getLedgerEntry("src-executable-current-candidate");
  assert.ok(executable);
  assert.equal(executable.driveObjectId, LINEAGE_59_SOURCE_FINGERPRINTS.executableDriveId);
  assert.equal(executable.bytes, LINEAGE_59_SOURCE_FINGERPRINTS.executableBytes);
  assert.equal(executable.sha256, LINEAGE_59_SOURCE_FINGERPRINTS.executableSha256);

  const bg = [0, 1, 2].map((i) => getLedgerEntry(`src-environment-background-${i + 1}`));
  bg.forEach((entry, i) => {
    assert.ok(entry);
    assert.equal(entry.sha256, LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[i]);
  });
});

test("placeholder demo media is distinctly DEMO_FIXTURE, never EXACT_ASSET_PINNED", () => {
  const portrait = resolveMomentMediaBinding({
    src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg",
    type: "photo",
  });
  assert.equal(portrait, "DEMO_FIXTURE");

  const landscapeVideoPoster = resolveMomentMediaBinding({
    src: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
    type: "video",
  });
  assert.equal(landscapeVideoPoster, "DEMO_FIXTURE");

  const unknownNonPlaceholder = resolveMomentMediaBinding({
    src: "/some/exact/source.jpg",
    type: "photo",
  });
  assert.equal(unknownNonPlaceholder, "SOURCE_REFERENCE_ONLY");

  const all = [
    resolveMomentMediaBinding({ src: "/x/placeholder.svg", type: "photo" }),
    resolveMomentMediaBinding({ src: "/y/placeholder.mp4", type: "video" }),
  ];
  assert.ok(!all.includes("EXACT_ASSET_PINNED"));
});

test("unavailable exact asset fails closed: nothing is pinned and nothing is repo-pinnable", () => {
  const summary = ledgerStatusSummary();
  assert.equal(summary.exactPinned, 0);
  assert.equal(summary.repoPinnable, 0);
  assert.ok(
    ASSET_LEDGER.every((e) => e.provenanceStatus !== "EXACT_ASSET_PINNED"),
    "no ledger entry may claim EXACT_ASSET_PINNED while Drive is un-fetched",
  );
  assert.equal(LINEAGE_59_SOURCE.mediaBindingDisposition, "FAIL_CLOSED_HOLD");
  assert.equal(LINEAGE_59_SOURCE.exactBinaryTransport, "HOLD");
  assert.equal(LINEAGE_59_SOURCE.driveFetchStatus, "LOCAL_DRIVE_FETCH_UNAVAILABLE");
});

test("source fingerprint mismatch forbids an exact-media PASS", () => {
  const expected = LINEAGE_59_SOURCE_FINGERPRINTS.executableSha256;
  assert.equal(verifyExactPin(expected, expected), true);
  assert.equal(verifyExactPin(expected, "deadbeef"), false);
  assert.equal(verifyExactPin(expected, undefined), false);
  assert.equal(verifyExactPin(undefined, expected), false);
  assert.equal(
    verifyExactPin(
      LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[0],
      LINEAGE_59_SOURCE_FINGERPRINTS.backgroundSha256[1],
    ),
    false,
    "two distinct background fingerprints must never validate as one another",
  );
});

test("media binding resolver does not depend on or break selection authority", () => {
  const selection = createSelection(MOMENTS.map((m) => m.id));
  const before = selection.currentId;
  const status = resolveMomentMediaBinding(MOMENTS[0].media);
  assert.equal(status, "DEMO_FIXTURE");
  assert.equal(selection.currentId, before, "resolver must not mutate selection state");
  assert.equal(resolveMomentMediaBinding(null), null, "media-less moment has no false binding");
});

test("native data placeholders all resolve to DEMO_FIXTURE truthfully", () => {
  for (const dataset of [MOMENTS, LONG_PATH_MOMENTS, BRANCH_MOMENTS]) {
    for (const m of dataset) {
      if (!m.media) {
        assert.equal(resolveMomentMediaBinding(m.media), null);
        continue;
      }
      assert.equal(
        resolveMomentMediaBinding(m.media),
        "DEMO_FIXTURE",
        `moment ${m.id} uses placeholder demo media and must be labeled DEMO_FIXTURE`,
      );
    }
  }
});

test("no giant binary / accidental exact-asset commit", async () => {
  const files = await readdir(PLACEHOLDER_DIR);
  for (const file of files) {
    const buf = await readFile(path.join(PLACEHOLDER_DIR.pathname, file));
    assert.ok(
      buf.length < 16 * 1024,
      `committed placeholder asset ${file} must stay small (got ${buf.length} bytes)`,
    );
  }
  for (const entry of ASSET_LEDGER) {
    if (typeof entry.bytes === "number" && entry.bytes > MAX_PINNED_BINARY_BYTES) {
      assert.notEqual(
        entry.repoTransportPolicy,
        "REPO_PIN_OK",
        `large asset ${entry.assetId} must not be repo-pinnable`,
      );
    }
    assert.equal(isRepoPinnable(entry), false);
  }
});

test("ledger transport policy is consistent: large/source assets are HOLD, only synthetic are DEMO_ONLY", () => {
  const demoOnly = ASSET_LEDGER.filter((e) => e.repoTransportPolicy === "DEMO_ONLY");
  assert.ok(demoOnly.length >= 3);
  assert.ok(
    demoOnly.every((e) => e.provenanceStatus === "DEMO_FIXTURE"),
    "DEMO_ONLY entries must be DEMO_FIXTURE",
  );
  const hold = ASSET_LEDGER.filter((e) => e.repoTransportPolicy === "REPO_TRANSPORT_HOLD");
  assert.ok(hold.length >= 6, "all exact source assets remain transport HOLD");
});
