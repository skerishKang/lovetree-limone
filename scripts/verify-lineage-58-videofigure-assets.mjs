import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  LINEAGE_58_VIDEOFIGURE_ASSETS,
  LINEAGE_58_VIDEOFIGURE_ASSET_HOLD,
  validateLineage58VideoFigureAssetRegistry,
} from "../lib/lineage-58-videofigure-assets.ts";

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("not a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

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
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  let dimensions;
  try {
    dimensions = pngDimensions(buffer);
  } catch (error) {
    failures.push(`${asset.filename}: ${error.message}`);
    continue;
  }
  if (buffer.length !== asset.bytes) failures.push(`${asset.filename}: bytes ${buffer.length} != ${asset.bytes}`);
  if (sha256 !== asset.sha256) failures.push(`${asset.filename}: sha256 ${sha256} != ${asset.sha256}`);
  if (dimensions.width !== asset.width || dimensions.height !== asset.height) failures.push(`${asset.filename}: dimensions ${dimensions.width}x${dimensions.height} != ${asset.width}x${asset.height}`);
}

if (failures.length) {
  console.error(LINEAGE_58_VIDEOFIGURE_ASSET_HOLD);
  console.error(`Authoritative fingerprint registry: ${registry.metadataComplete}/80. Local exact binaries observed: ${observedCount}/80.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("LINEAGE_58_VIDEOFIGURE_EXACT_ASSETS_PASS 80/80");
}
