import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "reference", "lineage-55-moonlit-blossom-v1", "assets");
const expected = [
  {
    group: "flowers",
    file: "lovetree-memory-blossom-hero-v1.png",
    bytes: 1_150_427,
    width: 1536,
    height: 1024,
    colorType: 2,
    mode: "RGB",
    sha256: "c6587ae2d37628a5c003cbd44fd96f6ed649579ad92104f2e08a101e6e59f230",
    gitBlobSha: "17c791ed5a4624c3dabeb35c6affb26d76c03fca",
  },
  {
    group: "flowers",
    file: "lovetree-memory-blossom-detail-v1.png",
    bytes: 1_405_653,
    width: 1536,
    height: 1024,
    colorType: 2,
    mode: "RGB",
    sha256: "52a3456b89a1406f87ba3a40ffcc61ff296851f819fe44f89a06d2f98c059d0e",
    gitBlobSha: "9160c4581517ba844456bef6698c4c20c0db5c3c",
  },
  {
    group: "portraits",
    file: "memory-cast-a.png",
    bytes: 334_419,
    width: 1024,
    height: 1536,
    colorType: 2,
    mode: "RGB",
    sha256: "7bf8cc570880b5eff35c4a951f15199b3fc1eb11aec7a6126fa6b25425334f48",
    gitBlobSha: "320708c979c300fd87b1cdf03c53105ec748397f",
  },
  {
    group: "portraits",
    file: "memory-cast-b.png",
    bytes: 327_151,
    width: 1024,
    height: 1536,
    colorType: 2,
    mode: "RGB",
    sha256: "fd34eb40759538d6369a0dfe0bf151e2f2864357a8f234376d242250603c6cf7",
    gitBlobSha: "a2959d33b0beb576ee0ca27b2181e95fbbbfac4f",
  },
  {
    group: "portraits",
    file: "memory-cast-c.png",
    bytes: 332_328,
    width: 1024,
    height: 1536,
    colorType: 2,
    mode: "RGB",
    sha256: "9f939a071b0ddfcd9c7ebd173bf0dd3f49ba4506b691a0a1b370812671c63d85",
    gitBlobSha: "ebda9a45399a30fb1260ad1c30a849c7d1b80cb5",
  },
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

function pngIdentity(buffer) {
  if (buffer.length < 26 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

let failed = false;
for (const asset of expected) {
  const path = join(root, asset.group, asset.file);
  if (!existsSync(path)) {
    console.error(`MISSING ${asset.group}/${asset.file}`);
    failed = true;
    continue;
  }

  const buffer = readFileSync(path);
  const png = pngIdentity(buffer);
  const actual = {
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    gitBlobSha: gitBlobSha(buffer),
    png,
  };

  const mismatch =
    actual.bytes !== asset.bytes ||
    actual.sha256 !== asset.sha256 ||
    actual.gitBlobSha !== asset.gitBlobSha ||
    png?.width !== asset.width ||
    png?.height !== asset.height ||
    png?.colorType !== asset.colorType;

  if (mismatch) {
    console.error(`MISMATCH ${asset.group}/${asset.file}`);
    console.error(`  bytes: expected ${asset.bytes}, got ${actual.bytes}`);
    console.error(`  sha256: expected ${asset.sha256}, got ${actual.sha256}`);
    console.error(`  git blob: expected ${asset.gitBlobSha}, got ${actual.gitBlobSha}`);
    console.error(`  dimensions: expected ${asset.width}x${asset.height}, got ${png ? `${png.width}x${png.height}` : "invalid PNG"}`);
    console.error(`  mode: expected ${asset.mode} (PNG color type ${asset.colorType}), got ${png ? `color type ${png.colorType}` : "invalid PNG"}`);
    failed = true;
    continue;
  }

  console.log(`OK ${asset.group}/${asset.file} ${actual.bytes} ${actual.sha256} git:${actual.gitBlobSha} ${asset.width}x${asset.height} ${asset.mode}`);
}

if (failed) process.exit(1);
console.log("LINEAGE_55_EXACT_ASSET_GATE_PASS");
