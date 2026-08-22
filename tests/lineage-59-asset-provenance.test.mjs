import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

test("committed exact assets are pinned and repo-pinnable; large binaries remain HOLD", () => {
  const summary = ledgerStatusSummary();
  assert.equal(summary.exactPinned, 5, "5 small exact payloads committed + pinned");
  assert.equal(summary.repoPinnable, 5);
  const pinned = ASSET_LEDGER.filter((e) => e.provenanceStatus === "EXACT_ASSET_PINNED");
  assert.ok(
    pinned.every((e) => e.repoTransportPolicy === "REPO_PIN_OK" && typeof e.committedPath === "string"),
    "pinned entries are repo-pin approved with a committed path",
  );
  // large background PNGs + standalone executable stay transport HOLD (never pinned)
  for (const i of [1, 2, 3]) {
    assert.equal(getLedgerEntry(`src-environment-background-${i}`).provenanceStatus, "SOURCE_REFERENCE_ONLY");
  }
  assert.equal(getLedgerEntry("src-executable-current-candidate").provenanceStatus, "SOURCE_REFERENCE_ONLY");
  assert.equal(LINEAGE_59_SOURCE.mediaBindingDisposition, "EXACT_SMALL_PINNED_TRANSPORT_HOLD");
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
  assert.equal(status, "EXACT_ASSET_PINNED");
  assert.equal(selection.currentMomentId, before, "resolver must not mutate selection state");
  assert.equal(resolveMomentMediaBinding(null), null, "media-less moment has no false binding");
});

test("native data media resolves to DEMO_FIXTURE or EXACT_ASSET_PINNED truthfully", () => {
  for (const dataset of [MOMENTS, LONG_PATH_MOMENTS, BRANCH_MOMENTS]) {
    for (const m of dataset) {
      if (!m.media) {
        assert.equal(resolveMomentMediaBinding(m.media), null);
        continue;
      }
      const status = resolveMomentMediaBinding(m.media);
      const isExactBound = m.media.src.includes("moment-m") || m.media.src.includes("source-demo-video");
      assert.ok(
        isExactBound ? status === "EXACT_ASSET_PINNED" : status === "DEMO_FIXTURE",
        `moment ${m.id} (${m.media.src}) resolved to ${status}`,
      );
    }
  }
});

test("no giant binary / accidental exact-asset commit", async () => {
  const files = await readdir(PLACEHOLDER_DIR);
  for (const file of files) {
    const buf = await readFile(path.join(fileURLToPath(PLACEHOLDER_DIR), file));
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
    // Only actually-pinned exact assets may be repo-pinnable; everything else
    // (large binaries, placeholders, standalone executable) must not be.
    const expectedPinnable = entry.provenanceStatus === "EXACT_ASSET_PINNED";
    assert.equal(
      isRepoPinnable(entry),
      expectedPinnable,
      `${entry.assetId} repo-pinnable matches pin state`,
    );
  }
});

test("ledger transport policy is consistent: large HOLD, small exact approved, synthetic DEMO_ONLY", () => {
  const demoOnly = ASSET_LEDGER.filter((e) => e.repoTransportPolicy === "DEMO_ONLY");
  assert.equal(demoOnly.length, 3, "exactly 3 synthetic placeholders");
  assert.ok(
    demoOnly.every((e) => e.provenanceStatus === "DEMO_FIXTURE"),
    "DEMO_ONLY entries must be DEMO_FIXTURE",
  );
  const hold = ASSET_LEDGER.filter((e) => e.repoTransportPolicy === "REPO_TRANSPORT_HOLD");
  const large = hold.filter((e) => typeof e.bytes === "number" && e.bytes > MAX_PINNED_BINARY_BYTES);
  assert.equal(large.length, 4, "standalone executable + 3 environment backgrounds are large HOLD");
  const pinOk = ASSET_LEDGER.filter((e) => e.repoTransportPolicy === "REPO_PIN_OK");
  assert.equal(pinOk.length, 5, "5 small exact payloads are repo-pin approved");
  assert.ok(
    pinOk.every((e) => e.provenanceStatus === "EXACT_ASSET_PINNED"),
    "approved small exact are EXACT_ASSET_PINNED once committed",
  );
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

test("exact small payloads are repo-pinned with verified bytes and SHA-256", () => {
  const small = WEB_CTO_VERIFIED_PAYLOADS.smallExact;
  assert.equal(small.length, 5);
  const bySha = new Map(ASSET_LEDGER.map((e) => [e.sha256, e]));
  for (const p of small) {
    const entry = bySha.get(p.sha256);
    assert.ok(entry, `ledger must contain small payload sha ${p.sha256}`);
    assert.equal(entry.bytes, p.bytes, "exact byte size recorded");
    assert.equal(entry.repoTransportPolicy, "REPO_PIN_OK", "repo-pin approved");
    assert.equal(entry.provenanceStatus, "EXACT_ASSET_PINNED", "committed exact → EXACT_ASSET_PINNED");
    assert.ok(entry.committedPath, "committed path recorded");
  }
  // MP4 specifically
  const mp4 = getLedgerEntry("src-inline-video-mp4");
  assert.ok(mp4);
  assert.equal(mp4.sha256, "1c84aa49be5bf35b58196831f8c2d5562e65cb23732dfd80d2322a249ca60465");
  assert.equal(mp4.bytes, 4606);
  assert.equal(mp4.provenanceStatus, "EXACT_ASSET_PINNED");
});

test("5 exact binaries actually exist in the repo with verified bytes and SHA-256", async () => {
  const dir = new URL("../public/design-lab-assets/lineages/59/v5/media/", import.meta.url);
  const expected = [
    ["moment-m1-character-f01.webp", 9120, "aea1b65c10f6a937afc2a95d7892b5c277fe65cec4a56167696bfe56151cbef6"],
    ["moment-m5-character-m01.webp", 6114, "5a0aaa877c77b8edcfe286f839f27e611a9647166f3eae2db7b0040147de1a77"],
    ["moment-m7-character-f01.webp", 9162, "9ee926a2e59a2c6243ff27064001b1f5aa5ee4ef0d65cfac3bdbd8f3b4ac358b"],
    ["moment-m3-video-still.jpg", 9718, "cc086ddd6d8ad5fad1bcff40c8f0323f201b4c70e3d0dab85e91b59fd9f54d48"],
    ["source-demo-video.mp4", 4606, "1c84aa49be5bf35b58196831f8c2d5562e65cb23732dfd80d2322a249ca60465"],
  ];
  for (const [file, bytes, sha] of expected) {
    const buf = await readFile(new URL(file, dir));
    assert.equal(buf.length, bytes, `${file} exact byte size`);
    const actual = createHash("sha256").update(buf).digest("hex");
    assert.equal(actual, sha, `${file} exact SHA-256`);
  }
});

test("resolver returns EXACT_ASSET_PINNED only for committed exact paths; wrong/missing/hash-mismatch cannot", () => {
  assert.equal(
    Object.keys(EXACT_PINNED_ASSET_PATHS).length,
    5,
    "5 committed exact paths registered",
  );
  assert.equal(
    resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/moment-m1-character-f01.webp", type: "photo" }),
    "EXACT_ASSET_PINNED",
  );
  assert.equal(
    resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/source-demo-video.mp4", type: "video" }),
    "EXACT_ASSET_PINNED",
  );
  // wrong path (no such committed file) → not exact
  assert.equal(
    resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/does-not-exist.webp", type: "photo" }),
    "SOURCE_REFERENCE_ONLY",
  );
  // placeholder can never masquerade as exact
  assert.equal(
    resolveMomentMediaBinding({ src: "/design-lab-assets/lineages/59/v5/media/placeholder-portrait.svg", type: "photo" }),
    "DEMO_FIXTURE",
  );
  // hash mismatch forbids a PASS even if a matching file existed
  assert.equal(verifyExactPin("aea1b65c10f6a937afc2a95d7892b5c277fe65cec4a56167696bfe56151cbef6", "deadbeef"), false);
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
  const exact = resolveMomentMediaBinding({
    src: "/design-lab-assets/lineages/59/v5/media/moment-m3-video-still.jpg",
    type: "photo",
  });
  assert.equal(exact, "EXACT_ASSET_PINNED", "committed exact path must report pinned");
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
  assert.equal(status, "EXACT_ASSET_PINNED");
  assert.equal(selection.currentMomentId, before, "resolver must not mutate selection state");
  assert.equal(resolveMomentMediaBinding(null), null, "media-less moment has no false binding");
  // a still-placeholder moment stays DEMO_FIXTURE (not upgraded to exact)
  const placeholderMoment = MOMENTS.find((m) => m.media && m.media.src.includes("placeholder"));
  assert.equal(resolveMomentMediaBinding(placeholderMoment.media), "DEMO_FIXTURE");
  // story transport untouched
  const { createStoryState, startStory, advanceStoryPhase } = await import("../lib/lineage-59/story-transport.ts");
  const story = createStoryState();
  const started = startStory(story);
  assert.ok(started.phase !== story.phase || started.playing !== story.playing, "story transport still functions");
  advanceStoryPhase(started);
});

