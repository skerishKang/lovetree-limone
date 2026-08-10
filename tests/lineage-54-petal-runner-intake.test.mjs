import assert from "node:assert/strict";
import test from "node:test";

import { LINEAGE_54_PETAL_RUNNER_SOURCE as source } from "../lib/lineage-54-petal-runner-source.ts";

test("Lineage 54 intake pins the exact sibling V4 runtime and byte-identical alias", () => {
  assert.equal(source.lineageId, "lt-54-petal-runner-love-journey");
  assert.equal(source.lineageNumber, 54);
  assert.equal(source.revisionId, "54-v4-petal-runner-love-journey");
  assert.equal(source.sourceRole, "direct LoveTree sibling product/story UI");
  assert.equal(source.sourceFile, "01_HTML/index-v4.html");
  assert.equal(source.sourceDriveFileId, "1woLMELxsldvYdDJiBG8_XIupsj1St9CV");
  assert.equal(source.sourceAliasFile, "01_HTML/index.html");
  assert.equal(source.sourceAliasByteIdentical, true);
  assert.equal(source.sourceBytes, 21_337);
  assert.equal(source.sourceSha256, "ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9");
});

test("Lineage 54 requires the exact five sibling image assets before fidelity approval", () => {
  assert.equal(source.currentDisposition, "incoming-source-verified-assets-pending-git-transfer");
  assert.deepEqual(source.requiredAssets.map((asset) => asset.file), [
    "lovetree-arrival-garden-v3.png",
    "petal-runner-front-v3.png",
    "petal-runner-side-v3.png",
    "petal-runner-rear-v3.png",
    "petal-runner-open-v3.png",
  ]);
  assert.deepEqual(source.requiredAssets.map((asset) => asset.sha256), [
    "731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35",
    "391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826",
    "84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3",
    "2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d",
    "96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a",
  ]);
  assert.equal(source.requiredAssets[0].width, 1672);
  assert.equal(source.requiredAssets[0].height, 941);
  for (const vehicle of source.requiredAssets.slice(1)) {
    assert.equal(vehicle.width, 627);
    assert.equal(vehicle.height, 627);
    assert.equal(vehicle.mode, "RGBA");
  }
});

test("Lineage 54 preserves the Petal Runner V4 journey mechanics as the implementation contract", () => {
  assert.deepEqual(source.chapters, ["FIRST MOMENT", "FEELING GROWS", "CONNECTION", "LOVE BLOOMS"]);
  assert.equal(source.implementationContract.sourceNarrative, "FIRST MOMENT → DEPART → TRAVEL → ARRIVE");
  assert.equal(source.implementationContract.travelDurationMs, 1800);
  assert.equal(source.implementationContract.preserveFourVehicleViews, true);
  assert.equal(source.implementationContract.preserveStoryButtons, true);
  assert.equal(source.implementationContract.preserveTimelineButtons, true);
  assert.equal(source.implementationContract.preservePointerDrag, true);
  assert.equal(source.implementationContract.preserveCameraTravel, true);
  assert.equal(source.implementationContract.preserveSpeedStreaks, true);
  assert.equal(source.implementationContract.preserveMemoryPathGrowth, true);
  assert.equal(source.implementationContract.preserveFinalOpenDoorArrival, true);
  assert.equal(source.implementationContract.preserveFinalBloom, true);
  assert.equal(source.implementationContract.mobileMaxWidthPx, 760);
});
