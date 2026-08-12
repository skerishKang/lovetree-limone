import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "reference", "lineage-55-moonlit-blossom-v1", "assets");
const currentDriveOnly = process.argv.includes("--current-drive-only");
const expected = [
  ["flowers", "lovetree-memory-blossom-hero-v1.png", "1XSakvKw04G_of1s6WWPL45Nu_YKYlDkR", "1n8I9RK1C8V_ydIDvvpmuF9JWKnPR6Bep", 1389065, 1672, 941, "91b3ddde71978831b1c1c8667823cf00b60ba60e94d389e67677e424d95084c2", "f118339e668d459a4c2211d4e443e17a4c69dac8", "c6587ae2d37628a5c003cbd44fd96f6ed649579ad92104f2e08a101e6e59f230", "17c791ed5a4624c3dabeb35c6affb26d76c03fca"],
  ["flowers", "lovetree-memory-blossom-detail-v1.png", "17AVNADRaU41bXCjrYnwED5PStYQTRkQ7", "13vuscHRELQt99gMBd6t00m8XpLX_MGu0", 2205696, 1672, 941, "feb194b2d4d8200e07e7c46dc5157ed2f49aa0b794b254def456721329611127", "1659183b4850eebaa7839604830c0a4263bfd3ff", "52a3456b89a1406f87ba3a40ffcc61ff296851f819fe44f89a06d2f98c059d0e", "9160c4581517ba844456bef6698c4c20c0db5c3c"],
  ["portraits", "memory-cast-a.png", "1EyyAfqoJlaUvx7W4-USwdbmCB5DGuEhS", "1pBBAGRsNcmPzEuMifMZM_Hpwftl7vw86", 2007120, 1122, 1402, "edcb755869ca7928cd278e9d3093710a1b5366f3997b0e3e90ebb9386dbac557", "6de82c26b5009c7ca8252867d95b58d23c993fd5", "7bf8cc570880b5eff35c4a951f15199b3fc1eb11aec7a6126fa6b25425334f48", "320708c979c300fd87b1cdf03c53105ec748397f"],
  ["portraits", "memory-cast-b.png", "1cxMQs-sO-MK1GCI2HSWa-_1WHu7Cg8u5", "1utGm7IKmwMkvlMYNEctTj9xcc5JsCX8x", 2015646, 1122, 1402, "16015bf3f5c7d9459daef9bf440445b1c8006620643b78b61d8e01c354bdea9c", "a539e39d0b0c2d7ec1907744ffd01151fba0e587", "fd34eb40759538d6369a0dfe0bf151e2f2864357a8f234376d242250603c6cf7", "a2959d33b0beb576ee0ca27b2181e95fbbbfac4f"],
  ["portraits", "memory-cast-c.png", "1q0ZiW9Rr61junOZmUvV3wE0gk1h9QHnf", "1Nn7tRXrVVNi9M2MPJ79WNjnxmH7iU2GR", 1938260, 1122, 1402, "77591962709e30a043cb7fd489b965ff2f52f34d44f2701450bc11cfa2cbb2b7", "598d868d0dd09dc8369d3be7d20c3ff8b05cbced", "9f939a071b0ddfcd9c7ebd173bf0dd3f49ba4506b691a0a1b370812671c63d85", "ebda9a45399a30fb1260ad1c30a849c7d1b80cb5"],
].map(([group, file, driveId, v2DriveId, bytes, width, height, sha256, gitBlobSha, historicalSha256, historicalGitBlobSha]) => ({
  group, file, driveId, v2DriveId, bytes, width, height, colorType: 2, sha256, gitBlobSha,
  historicalSha256, historicalGitBlobSha,
}));

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash("sha1").update(header).update(buffer).digest("hex");
}
function pngIdentity(buffer) {
  if (buffer.length < 26 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

let binaryFailure = false;
for (const asset of expected) {
  if (asset.driveId === asset.v2DriveId) {
    console.error(`PROVENANCE_DATA_ERROR shared Drive ID for ${asset.file}`);
    binaryFailure = true;
  }
  const path = join(root, asset.group, asset.file);
  if (!existsSync(path)) {
    console.error(`MISSING_CURRENT_DRIVE_V1 ${asset.group}/${asset.file}`);
    binaryFailure = true;
    continue;
  }
  const buffer = readFileSync(path);
  const png = pngIdentity(buffer);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const blob = gitBlobSha(buffer);
  const matchesCurrent =
    buffer.length === asset.bytes && sha256 === asset.sha256 && blob === asset.gitBlobSha &&
    png?.width === asset.width && png?.height === asset.height && png?.colorType === asset.colorType;
  const matchesHistorical = sha256 === asset.historicalSha256 && blob === asset.historicalGitBlobSha;

  if (!matchesCurrent) {
    console.error(`${matchesHistorical ? "HISTORICAL_UNKNOWN_ORIGIN_BYTES_PRESENT" : "CURRENT_DRIVE_V1_MISMATCH"} ${asset.group}/${asset.file}`);
    binaryFailure = true;
    continue;
  }
  console.log(`CURRENT_DRIVE_V1_EXACT ${asset.group}/${asset.file} ${sha256} v2:${asset.v2DriveId}`);
}

if (binaryFailure) process.exit(1);
console.log("LINEAGE_55_CURRENT_DRIVE_V1_ASSET_SET_PASS");
console.error("HISTORICAL_ASSET_SOURCE_UNRESOLVED");
if (!currentDriveOnly) process.exit(2);
console.log("LINEAGE_55_CURRENT_DRIVE_ONLY_GATE_PASS");
