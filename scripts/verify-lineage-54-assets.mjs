import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "reference", "lineage-54-petal-runner-v4", "assets");
const expected = [
  ["lovetree-arrival-garden-v3.png", 2_458_998, "731ce39ccd9bbb9fe20fa1ba98a390ca8691d16f92110502a16cbcfee161ea35"],
  ["petal-runner-front-v3.png", 178_894, "391b77902d26b89eeea892f7847dc1a99212456e80ff7aec918dd17f580c9826"],
  ["petal-runner-side-v3.png", 135_739, "84014bf23b44194a00f85093d0dfac6ba6736fbe91aaff6cf70c3db130a0d0a3"],
  ["petal-runner-rear-v3.png", 168_905, "2708fe6625bd87da61de3e30e8b034766f0df5ccd5fef584d405c5e05d3ca37d"],
  ["petal-runner-open-v3.png", 261_150, "96b53667e2f2fc71498238ff1403035b1c7c0f454049dadfa07da421eff7838a"],
];

let failed = false;
for (const [file, bytes, sha256] of expected) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.error(`MISSING ${file}`);
    failed = true;
    continue;
  }

  const actualBytes = statSync(path).size;
  const actualSha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actualBytes !== bytes || actualSha256 !== sha256) {
    console.error(`MISMATCH ${file}`);
    console.error(`  bytes: expected ${bytes}, got ${actualBytes}`);
    console.error(`  sha256: expected ${sha256}, got ${actualSha256}`);
    failed = true;
    continue;
  }

  console.log(`OK ${file} ${actualBytes} ${actualSha256}`);
}

if (failed) process.exit(1);
console.log("LINEAGE_54_EXACT_ASSET_GATE_PASS");
