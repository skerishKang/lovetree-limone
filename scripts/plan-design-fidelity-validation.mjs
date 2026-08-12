import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { selectImpactedTargets } from "./design-fidelity-validation-registry.mjs";

const [baseSha, headSha] = process.argv.slice(2);

if (!baseSha || !headSha) {
  console.error("Usage: node scripts/plan-design-fidelity-validation.mjs <base-sha> <head-sha>");
  process.exit(2);
}

const diff = execFileSync(
  "git",
  ["diff", "--name-only", `${baseSha}...${headSha}`],
  { encoding: "utf8" },
);

const changedPaths = diff.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
const targets = selectImpactedTargets(changedPaths);
const matrix = { include: targets.map((target) => ({ id: target.id })) };
const hasTargets = targets.length > 0;

const payload = {
  baseSha,
  headSha,
  changedPaths,
  targets: targets.map((target) => target.id),
};

console.log(JSON.stringify(payload, null, 2));

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `has_targets=${hasTargets ? "true" : "false"}\nmatrix=${JSON.stringify(matrix)}\ntarget_ids=${JSON.stringify(payload.targets)}\n`,
  );
}
