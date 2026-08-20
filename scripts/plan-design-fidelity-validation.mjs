import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { planDesignFidelityInventory } from "./design-fidelity-validation-inventory.mjs";

const [baseSha, headSha] = process.argv.slice(2);

if (!baseSha || !headSha) {
  console.error("Usage: node scripts/plan-design-fidelity-validation.mjs <base-sha> <head-sha>");
  process.exit(2);
}

function changedPathsFor(args) {
  const diff = execFileSync(
    "git",
    ["diff", ...args, `${baseSha}...${headSha}`],
    { encoding: "utf8" },
  );
  return diff.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

const changedPaths = changedPathsFor(["--name-only"]);
const addedPaths = changedPathsFor(["--diff-filter=A", "--name-only"]);
const plan = planDesignFidelityInventory(changedPaths, { addedPaths });
const targets = plan.targets;
const exclusions = plan.exclusions.map(({ id, route, validationClass, reason }) => ({
  id,
  route,
  validationClass,
  reason,
}));
const matrix = { include: targets.map((target) => ({ id: target.id })) };
const hasTargets = targets.length > 0;
const hasExclusions = exclusions.length > 0;

const payload = {
  baseSha,
  headSha,
  changedPaths,
  addedPaths,
  targets: targets.map((target) => target.id),
  exclusions,
  genuinelyNoImpact: plan.genuinelyNoImpact,
};

console.log(JSON.stringify(payload, null, 2));

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `has_targets=${hasTargets ? "true" : "false"}`,
      `matrix=${JSON.stringify(matrix)}`,
      `target_ids=${JSON.stringify(payload.targets)}`,
      `has_exclusions=${hasExclusions ? "true" : "false"}`,
      `excluded_targets=${JSON.stringify(exclusions)}`,
      `no_impact=${plan.genuinelyNoImpact ? "true" : "false"}`,
      "",
    ].join("\n"),
  );
}
