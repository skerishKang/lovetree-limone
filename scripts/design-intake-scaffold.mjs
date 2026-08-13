// design:intake:scaffold — build the deterministic scaffold plan for one manifest.
//
// Usage:
//   node scripts/design-intake-scaffold.mjs <manifest.json>          # dry-run: print plan
//   node scripts/design-intake-scaffold.mjs <manifest.json> --dry-run
//   node scripts/design-intake-scaffold.mjs <manifest.json> --write  # explicit write mode
//
// The scaffold never executes source HTML/JS, never overwrites existing paths,
// never writes under canonical /v4 product trees, and fails closed on any
// identity/registry/filesystem collision.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  buildScaffoldPlan,
  readManifestFile,
  writeScaffoldPlan,
} from "../lib/design-intake/scaffold.ts";
import { parseIntakeManifest } from "../lib/design-intake/manifest.ts";
import { DESIGN_FIDELITY_TARGETS } from "./design-fidelity-validation-registry.mjs";

const args = process.argv.slice(2);
const writeMode = args.includes("--write");
const manifestPathArg = args.find((arg) => !arg.startsWith("--"));

if (!manifestPathArg) {
  console.error("Usage: node scripts/design-intake-scaffold.mjs <manifest.json> [--dry-run|--write]");
  process.exit(2);
}

// Scaffold root. Defaults to the current directory; DESIGN_INTAKE_ROOT lets
// automation (CI/tests) direct outputs into an isolated workspace.
const root = process.env.DESIGN_INTAKE_ROOT ?? process.cwd();
const manifestDir = path.join(root, "design-intake", "manifests");

function loadExistingManifests(selfPath) {
  if (!existsSync(manifestDir)) return [];
  const manifests = [];
  for (const name of readdirSync(manifestDir).filter((entry) => entry.endsWith(".json"))) {
    const file = path.join(manifestDir, name);
    if (path.resolve(file) === path.resolve(selfPath)) continue;
    // E: a repository-owned manifest that fails to parse is a hard FAIL — it is
    // never skipped. Malformed manifests carry stableId/route/lineage/fidelity
    // collisions that must not be silently ignored.
    try {
      manifests.push(parseIntakeManifest(JSON.parse(readFileSync(file, "utf8"))));
    } catch (error) {
      throw new Error(
        `malformed existing manifest ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return manifests;
}

try {
  const manifestPath = path.resolve(manifestPathArg);
  const manifest = readManifestFile(manifestPath);
  const plan = buildScaffoldPlan(manifest, {
    root,
    existingManifests: loadExistingManifests(manifestPath),
    fidelityTargets: DESIGN_FIDELITY_TARGETS.map((target) => ({
      id: target.id,
      route: target.route,
    })),
  });

  if (!writeMode) {
    console.log(JSON.stringify(plan, null, 2));
    console.error(`DRY RUN: ${plan.writes.length} writes planned, nothing written.`);
    process.exit(0);
  }

  const written = writeScaffoldPlan(plan, { root });
  console.log(`WROTE ${written.length} files:`);
  for (const file of written) console.log(`  ${file}`);
  console.log("Registry wiring: design-intake/scaffolds/" + plan.manifest.stableId + "/REGISTRY_WIRING.md");
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
