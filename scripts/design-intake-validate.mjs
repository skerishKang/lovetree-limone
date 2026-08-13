// design:intake:validate — validate one or more Design Intake manifests.
//
// Usage:
//   node scripts/design-intake-validate.mjs <manifest.json> [more.json ...]
//   node scripts/design-intake-validate.mjs            # validate design-intake/manifests/*.json
//
// The manifest is parsed (never executed) and every schema/identity rule is
// checked. Exit code 0 = all valid, 1 = problems, 2 = usage error.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";

const args = process.argv.slice(2);
const manifestDir = path.join(process.cwd(), "design-intake", "manifests");

function readManifest(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  return parseIntakeManifest(raw);
}

let files = args;
if (files.length === 0) {
  if (!readdirSync(manifestDir, { withFileTypes: true }).some((entry) => entry.isFile())) {
    console.error(`No manifest files found under design-intake/manifests/`);
    process.exit(2);
  }
  files = readdirSync(manifestDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(manifestDir, name));
}

let failed = false;

for (const file of files) {
  const absolute = path.resolve(file);
  const basename = path.basename(absolute);
  try {
    const manifest = readManifest(absolute);
    const expectedName = `${manifest.stableId}.json`;
    if (basename !== expectedName) {
      console.error(
        `FAIL ${file}: manifest file must be named '${expectedName}' (stableId convention), got '${basename}'`,
      );
      failed = true;
      continue;
    }
    console.log(
      `OK   ${file} — ${manifest.stableId} [${manifest.classification} / ${manifest.lifecycle} / ${manifest.rendering}]`,
    );
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log(`All ${files.length} manifest(s) valid.`);
