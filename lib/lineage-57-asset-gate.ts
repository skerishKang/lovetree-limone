import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LINEAGE_57_ASSETS, LINEAGE_57_EXPECTED_ASSET_COUNT } from "./lineage-57-assets";

export interface Lineage57AssetGateStatus {
  passed: boolean;
  exact: number;
  expected: number;
  missing: readonly string[];
  invalid: readonly string[];
}

export async function getLineage57AssetGateStatus(root = process.cwd()): Promise<Lineage57AssetGateStatus> {
  const missing: string[] = [];
  const invalid: string[] = [];
  let exact = 0;

  for (const asset of LINEAGE_57_ASSETS) {
    try {
      const bytes = await readFile(path.join(root, asset.targetPath));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (bytes.length !== asset.bytes || sha256 !== asset.sha256) {
        invalid.push(asset.filename);
      } else {
        exact += 1;
      }
    } catch {
      missing.push(asset.filename);
    }
  }

  return {
    passed: exact === LINEAGE_57_EXPECTED_ASSET_COUNT && missing.length === 0 && invalid.length === 0,
    exact,
    expected: LINEAGE_57_EXPECTED_ASSET_COUNT,
    missing,
    invalid,
  };
}
