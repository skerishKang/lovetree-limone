import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "reference", "lineage-56-crystal-memory-atelier-v3", "assets");
const expected = [
  ["crystal-front.png",548429,"22ff5cbd7a125bc2d6fa955668e5c2a3140840aaefee63a6fefaa33ce7c6598a","7b8e604aebf7fd5bc2306d6256aedc8f7e281de5"],
  ["crystal-threequarter.png",548301,"f42888b30bf417c486b0c28dbb153c2983de42c6a14ed81c74058b22d2842e9b","e606abd762e58715cd7b62a91a0a0a2233c54f88"],
  ["crystal-profile.png",550521,"a7a3f9c92bccfd75927a2f05f7866c1d2517e705737a4386ac36cc0169df8138","3cca9fc05610c83e1ce64a1fff002d0b6dd683ee"],
  ["crystal-rear.png",568418,"fdb40900e5c8e971ec2b5d0c20a3aeb6f33ec2d169ee7d0a109629962d716217","a6d3f8493410d5b1252caa5200008e6433f1a0bc"],
  ["crystal-awake-01.png",559524,"c8fa0d3849e7e841d23f3c227eac31161623f36f4ba6470e689aa4e0806d8b9c","32f9a9a76dbd7262bd7aca493acbab06202a2814"],
  ["crystal-awake-02.png",555716,"bead2e9c2c834e716bb903516abdaa7de9a784e5582516272b1c5c0e88221d84","b0f2a2e5822842994c0dbc84bfb99be4cd0a3e6e"],
  ["crystal-awake-03.png",558172,"75893d9563fffe35cac171c7fb47feda9455494dc7c3e015f49f75ab992a6421","b91741222330167db94a48219d93eb330541bcae"],
  ["crystal-awake-04.png",557520,"4f39a44fbd69c9c0c91aa8c15604c42e55bce97b385416abf898257675e80811","3512d422e9bbb283e674d16831df17edf74f60db"],
];
const signature=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
function gitBlobSha(buffer){return createHash("sha1").update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest("hex")}
function png(buffer){if(buffer.length<26||!buffer.subarray(0,8).equals(signature)||buffer.toString("ascii",12,16)!=="IHDR")return null;return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),colorType:buffer[25]}}
let failed=false;
for(const [file,bytes,sha256,blob] of expected){const path=join(root,file);if(!existsSync(path)){console.error(`MISSING ${file}`);failed=true;continue}const buffer=readFileSync(path);const meta=png(buffer);const actualSha=createHash("sha256").update(buffer).digest("hex");const actualBlob=gitBlobSha(buffer);if(buffer.length!==bytes||actualSha!==sha256||actualBlob!==blob||meta?.width!==627||meta?.height!==627||meta?.colorType!==2){console.error(`MISMATCH ${file}`);failed=true;continue}console.log(`OK ${file} ${bytes} ${sha256} git:${blob} 627x627 RGB`)}
if(failed)process.exit(1);console.log("LINEAGE_56_EXACT_ASSET_GATE_PASS");
