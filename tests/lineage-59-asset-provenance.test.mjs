import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  ASSET_LEDGER,
  LINEAGE_59_SOURCE_FINGERPRINTS,
  DRIVE_FETCH_STATUS,
  WEB_CTO_DRIVE_FETCH_VERIFIED,
  WEB_CTO_VERIFIED_PAYLOADS,
  EXACT_PINNED_ASSET_PATHS,
  MAX_PINNED_BINARY_BYTES,
  resolveMomentMediaBinding,
  verifyExactPin,
  isRepoPinnable,
  classifyLedgerBinding,
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
  const pathIds = MOMENTS.map((m) => m.id);
  const selection = createSelection(pathIds[0], pathIds);
  const before = selection.currentMomentId;
  const status = resolveMomentMediaBinding(MOMENTS[0].media);
  assert.equal(status, "DEMO_FIXTURE");
  assert.equal(selection.currentMomentId, before, "resolver must not mutate selection state");
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

test("Web CTO Drive V5 re-verification is recorded as a separate authority", () => {
  assert.equal(DRIVE_FETCH_STATUS, "LOCAL_DRIVE_FETCH_UNAVAILABLE");
  assert.equal(WEB_CTO_DRIVE_FETCH_VERIFIED, true);
  assert.equal(LINEAGE_59_SOURCE.webCtoDriveFetchVerified, true);
  assert.equal(LINEAGE_59_SOURCE.webCtoReviewId, "4946999933");
});

test("asset ledger covers all 8 unique embedded payloads (9 data-URI occurrences)", () => {
  const backgrounds = ASSET_LEDGER.filter((e) => e.role === "environment-background");
  assert.equal(backgrounds.length, 3, "3 unique environment backgrounds");
  const smallWebp = ASSET_LEDGER.filter(
    (e) => e.role === "character" && e.mediaType === "image/webp",
  );
  assert.equal(smallWebp.length, 3, "3 character WebP payloads");
  const jpeg = ASSET_LEDGER.filter(
    (e) => e.role === "inline-media" && e.mediaType === "image/jpeg",
  );
  assert.equal(jpeg.length, 1, "1 inline JPEG payload");
  const mp4 = ASSET_LEDGER.filter((e) => e.role === "inline-video");
  assert.equal(mp4.length, 1, "1 inline MP4 payload (previously missing, now recorded)");
  const uniqueEmbedded = [...backgrounds, ...smallWebp, ...jpeg, ...mp4];
  assert.equal(uniqueEmbedded.length, 8, "8 unique embedded payloads");
});

test("exact small payloads carry Web CTO-verified bytes and SHA-256", () => {
  const small = WEB_CTO_VERIFIED_PAYLOADS.smallExact;
  assert.equal(small.length, 5);
  const bySha = new Map(ASSET_LEDGER.map((e) => [e.sha256, e]));
  for (const p of small) {
    const entry = bySha.get(p.sha256);
    assert.ok(entry, `ledger must contain small payload sha ${p.sha256}`);
    assert.equal(entry.bytes, p.bytes, "exact byte size recorded");
    assert.equal(entry.repoTransportPolicy, "REPO_PIN_OK", "repo-pin approved");
  }
  // MP4 specifically
  const mp4 = getLedgerEntry("src-inline-video-mp4");
  assert.ok(mp4);
  assert.equal(mp4.sha256, "1c84aa49be5bf35b58196831f8c2d5562e65cb23732dfd80d2322a249ca60465");
  assert.equal(mp4.bytes, 4606);
});

test("EXACT_ASSET_PINNED resolver is fail-closed until exact bytes are committed", () => {
  // Map is empty while Drive is unreachable for the worker, so the resolver
  // can never fabricate an exact-media PASS.
  assert.equal(Object.keys(EXACT_PINNED_ASSET_PATHS).length, 0);
  assert.equal(
    resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg", type: "photo" }),
    "DEMO_FIXTURE",
  );
  assert.equal(
    resolveMomentMediaBinding({ src: "/any/unknown/source.jpg", type: "photo" }),
    "SOURCE_REFERENCE_ONLY",
  );
  // A ledger entry that IS EXACT_ASSET_PINNED classifies as such (proves the
  // classification path exists for when exact bytes are later committed).
  const pinned = { ...getLedgerEntry("src-inline-video-mp4"), provenanceStatus: "EXACT_ASSET_PINNED" };
  assert.equal(classifyLedgerBinding(pinned), "EXACT_ASSET_PINNED");
});

test("placeholder demo media stays distinct from exact source assets", () => {
  const placeholder = resolveMomentMediaBinding({
    src: "/design-lab-assets/lineages/59/v5/media/placeholder-landscape.svg",
    type: "photo",
  });
  assert.equal(placeholder, "DEMO_FIXTURE");
  assert.notEqual(placeholder, "EXACT_ASSET_PINNED");
  const exactLike = resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/src-inline-video-mp4.mp4", type: "video" });
  assert.equal(exactLike, "SOURCE_REFERENCE_ONLY", "uncommitted exact path must not be reported pinned");
});

test("large environment PNGs are never repo-pinnable and remain HOLD", () => {
  for (const i of [1, 2, 3]) {
    const bg = getLedgerEntry(`src-environment-background-${i}`);
    assert.ok(bg);
    assert.equal(bg.repoTransportPolicy, "REPO_TRANSPORT_HOLD");
    assert.equal(isRepoPinnable(bg), false, "large binary must not be repo-pinnable");
  }
  assert.equal(getLedgerEntry("src-executable-current-candidate").repoTransportPolicy, "REPO_TRANSPORT_HOLD");
});

test("selection/story/product contract regression is not broken by media binding", async () => {
  const pathIds = MOMENTS.map((m) => m.id);
  const selection = createSelection(pathIds[0], pathIds);
  const before = selection.currentMomentId;
  const status = resolveMomentMediaBinding(MOMENTS[0].media);
  assert.equal(status, "DEMO_FIXTURE");
  assert.equal(selection.currentMomentId, before, "resolver must not mutate selection state");
  assert.equal(resolveMomentMediaBinding(null), null, "media-less moment has no false binding");
  // story transport untouched
  const { createStoryState, startStory, advanceStoryPhase } = await import("../lib/lineage-59/story-transport.ts");
  const story = createStoryState();
  const started = startStory(story);
  assert.ok(started.phase !== story.phase || started.playing !== story.playing, "story transport still functions");
  advanceStoryPhase(started);
});

