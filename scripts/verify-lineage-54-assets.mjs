import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "reference", "lineage-54-petal-runner-v4", "assets");
const expected = [
  {
    file: "lovetree-arrival-garden-v3.png",
    bytes: 2_458_998,
    width: 1672,
    height: 941,
    colorType: 2,
    mode: "RGB",
    sha256: "731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35",
    gitBlobSha: "e8009e58ccb42617ee3ba3d59fc97da68ed7340a",
  },
  {
    file: "petal-runner-front-v3.png",
    bytes: 178_894,
    width: 627,
    height: 627,
    colorType: 6,
    mode: "RGBA",
    sha256: "391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826",
    gitBlobSha: "eed19757463401eba0913dfd35e9c7fa14445249",
  },
  {
    file: "petal-runner-side-v3.png",
    bytes: 135_739,
    width: 627,
    height: 627,
    colorType: 6,
    mode: "RGBA",
    sha256: "84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3",
    gitBlobSha: "1326fe2b6f66fd696cecd5688693f299f5c26434",
  },
  {
    file: "petal-runner-rear-v3.png",
    bytes: 168_905,
    width: 627,
    height: 627,
    colorType: 6,
    mode: "RGBA",
    sha256: "2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d",
    gitBlobSha: "28b5859e3b9d7e0e02228e4703b347aa85218f24",
  },
  {
    file: "petal-runner-open-v3.png",
    bytes: 261_150,
    width: 627,
    height: 627,
    colorType: 6,
    mode: "RGBA",
    sha256: "96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a",
    gitBlobSha: "c1a51d939275bf5706c65815fb77c12feb8c35d3",
  },
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

function pngIdentity(buffer) {
  if (buffer.length < 26 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }
  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

let failed = false;
for (const asset of expected) {
  const path = join(root, asset.file);
  if (!existsSync(path)) {
    console.error(`MISSING ${asset.file}`);
    failed = true;
    continue;
  }

  const buffer = readFileSync(path);
  const actual = {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    gitBlobSha: gitBlobSha(buffer),
    png: pngIdentity(buffer),
  };

  const mismatch =
    actual.bytes !== asset.bytes ||
    actual.sha256 !== asset.sha256 ||
    actual.gitBlobSha !== asset.gitBlobSha ||
    actual.png?.width !== asset.width ||
    actual.png?.height !== asset.height ||
    actual.png?.colorType !== asset.colorType;

  if (mismatch) {
    console.error(`MISMATCH ${asset.file}`);
    console.error(`  bytes: expected ${asset.bytes}, got ${actual.bytes}`);
    console.error(`  sha256: expected ${asset.sha256}, got ${actual.sha256}`);
    console.error(`  git blob: expected ${asset.gitBlobSha}, got ${actual.gitBlobSha}`);
    console.error(`  dimensions: expected ${asset.width}x${asset.height}, got ${actual.png ? `${actual.png.width}x${actual.png.height}` : "invalid PNG"}`);
    console.error(`  mode: expected ${asset.mode} (PNG color type ${asset.colorType}), got ${actual.png ? `color type ${actual.png.colorType}` : "invalid PNG"}`);
    failed = true;
    continue;
  }

  console.log(`OK ${asset.file} ${actual.bytes} ${asset.sha256} git:${actual.gitBlobSha} ${asset.width}x${asset.height} ${asset.mode}`);
}

if (failed) process.exit(1);
console.log("LINEAGE_54_EXACT_ASSET_GATE_PASS");
