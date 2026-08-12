import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LINEAGE_57_ASSETS, LINEAGE_57_EXPECTED_ASSET_COUNT } from "../lib/lineage-57-assets.ts";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parsePng(bytes) {
  if (bytes.length < 26 || bytes.subarray(1, 4).toString("ascii") !== "PNG") return null;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  const mode = colorType === 6 ? "RGBA" : colorType === 2 ? "RGB" : `PNG_COLOR_${colorType}`;
  return { width, height, mode };
}

function readU24LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function parseWebp(bytes) {
  if (bytes.length < 30 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") return null;
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    const flags = bytes[20];
    return {
      width: readU24LE(bytes, 24) + 1,
      height: readU24LE(bytes, 27) + 1,
      mode: (flags & 0x10) !== 0 ? "RGBA" : "RGB",
    };
  }
  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
      mode: "RGB",
    };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      mode: "RGBA",
    };
  }
  return null;
}

function imageInfo(bytes, filename) {
  if (filename.endsWith(".png")) return parsePng(bytes);
  if (filename.endsWith(".webp")) return parseWebp(bytes);
  return null;
}

async function verify(root = process.cwd()) {
  if (LINEAGE_57_ASSETS.length !== LINEAGE_57_EXPECTED_ASSET_COUNT) {
    throw new Error(`manifest count mismatch: ${LINEAGE_57_ASSETS.length}/${LINEAGE_57_EXPECTED_ASSET_COUNT}`);
  }
  const filenames = new Set();
  const driveIds = new Set();
  const missing = [];
  const invalid = [];
  let exact = 0;

  for (const asset of LINEAGE_57_ASSETS) {
    if (filenames.has(asset.filename)) invalid.push(`${asset.filename}:duplicate-filename`);
    filenames.add(asset.filename);
    if (driveIds.has(asset.driveId)) invalid.push(`${asset.filename}:duplicate-drive-id`);
    driveIds.add(asset.driveId);

    let bytes;
    try {
      bytes = await readFile(path.join(root, asset.targetPath));
    } catch {
      missing.push(asset.filename);
      continue;
    }

    const info = imageInfo(bytes, asset.filename);
    const reasons = [];
    if (bytes.length !== asset.bytes) reasons.push(`bytes=${bytes.length} expected=${asset.bytes}`);
    const actualSha = sha256(bytes);
    if (actualSha !== asset.sha256) reasons.push(`sha256=${actualSha}`);
    if (!info) reasons.push("unrecognized-image");
    else {
      if (info.width !== asset.width || info.height !== asset.height) reasons.push(`dimensions=${info.width}x${info.height}`);
      if (info.mode !== asset.mode) reasons.push(`mode=${info.mode}`);
    }
    if (reasons.length) invalid.push(`${asset.filename}:${reasons.join(",")}`);
    else exact += 1;
  }

  if (missing.length || invalid.length || exact !== LINEAGE_57_EXPECTED_ASSET_COUNT) {
    console.error(`EXACT_CHARACTER_ASSET_TRANSFER_HOLD exact=${exact}/${LINEAGE_57_EXPECTED_ASSET_COUNT} missing=${missing.length} invalid=${invalid.length}`);
    if (missing.length) console.error(`missing: ${missing.join(", ")}`);
    if (invalid.length) console.error(`invalid: ${invalid.join(" | ")}`);
    process.exitCode = 2;
    return;
  }

  console.log(`LINEAGE_57_EXACT_ASSET_GATE_PASS ${exact}/${LINEAGE_57_EXPECTED_ASSET_COUNT}`);
}

await verify();
