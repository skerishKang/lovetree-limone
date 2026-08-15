import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { verifyExactAssetFingerprint } from "../lib/design-runtime/exact-asset.ts";
import {
  LINEAGE_58_VIDEOFIGURE_ASSETS,
  LINEAGE_58_VIDEOFIGURE_ASSET_HOLD,
  validateLineage58VideoFigureAssetRegistry,
} from "../lib/lineage-58-videofigure-assets.ts";

const registry = validateLineage58VideoFigureAssetRegistry();
const failures = [];
let observedCount = 0;

if (!registry.fingerprintComplete) {
  failures.push(`fingerprint registry incomplete: ${registry.metadataComplete}/80`);
}

for (const asset of LINEAGE_58_VIDEOFIGURE_ASSETS) {
  const path = resolve(process.cwd(), asset.targetPath);
  let buffer;
  try {
    buffer = await readFile(path);
  } catch {
    failures.push(`${asset.filename}: missing target ${asset.targetPath}`);
    continue;
  }
  observedCount += 1;

  // P8 remains pure: this Lineage adapter owns filesystem reads and hash
  // computation, then delegates only immutable byte/hash/PNG identity comparison.
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const verification = verifyExactAssetFingerprint(
    {
      bytes: asset.bytes,
      sha256: asset.sha256,
      png: { width: asset.width, height: asset.height },
    },
    { data: buffer, sha256 },
  );

  for (const mismatch of verification.mismatches) {
    failures.push(`${asset.filename}: ${mismatch.message}`);
  }
}

if (failures.length) {
  console.error(LINEAGE_58_VIDEOFIGURE_ASSET_HOLD);
  console.error(`Authoritative fingerprint registry: ${registry.metadataComplete}/80. Local exact binaries observed: ${observedCount}/80.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("LINEAGE_58_VIDEOFIGURE_EXACT_ASSETS_PASS 80/80");
}
