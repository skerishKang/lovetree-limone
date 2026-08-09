import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const [readme, agents, wslPolicy, releasePolicy] = await Promise.all([
  read("README.md"),
  read("AGENTS.md"),
  read("docs/operations/WSL_WORKSPACE_POLICY.md"),
  read("docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md"),
]);

test("README and operator guide reflect current V4/Next product authority and stack", () => {
  assert.match(readme, /\*\*Legacy\*\*.*\*\*Next\*\*/s);
  assert.match(readme, /currently implemented through \*\*V4\*\*/);
  assert.match(readme, /Neon PostgreSQL \+ Drizzle ORM/);
  assert.match(readme, /npm run typecheck/);
  assert.doesNotMatch(readme, /There is currently no `typecheck` script/);
  assert.doesNotMatch(readme, /Backend services, D1\/Drizzle persistence, authentication, and deployment are\s+explicitly out of scope/);

  assert.match(agents, /Product families exposed by the current architecture are \*\*Legacy\*\* and \*\*Next\*\*/);
  assert.match(agents, /Current product implementation authority is \*\*V4 \/ Next\*\*/);
  assert.match(agents, /Database: Neon PostgreSQL through Drizzle ORM/);
  assert.match(agents, /Production Worker: `lovetree-limone`/);
  assert.match(agents, /`\/v2\/\*\*` and `\/v3\/\*\*` are historical comparison surfaces/);
  assert.doesNotMatch(agents, /Backend API:\s*Cloudflare Workers \(D1\/Drizzle ORM\)/);
});

test("WSL policy keeps active repository work off Windows-mounted paths", () => {
  assert.match(readme, /\$HOME\/worktrees\/\*\*/);
  assert.match(agents, /\$HOME\/worktrees\/\*\*/);
  assert.match(agents, /Do not run repository workloads from Windows-mounted paths/);
  assert.match(wslPolicy, /Do not use `\/mnt\/c\/\*\*`, `\/mnt\/g\/\*\*`/);
  assert.match(wslPolicy, /npm run typecheck/);
  assert.match(wslPolicy, /Playwright \/ Chromium/);
});

test("release policy records the lightweight demo loop without weakening high-risk gates", () => {
  assert.match(readme, /implementation → CI GREEN → Production demo → direct visual review → fix\/redeploy/);
  assert.match(releasePolicy, /implementation\s*\n→ automated validation \/ CI GREEN\s*\n→ Production demo release\s*\n→ direct product-owner visual review/);
  assert.match(releasePolicy, /destructive or irreversible DB migration\/data mutation/);
  assert.match(releasePolicy, /Firebase\/Auth identity or authorization policy/);
  assert.match(releasePolicy, /privacy\/security trust-boundary changes/);
  assert.match(releasePolicy, /Runtime E2E remains separate/);
});

test("Production instructions preserve guarded deployment and explicit auto-deploy enablement", () => {
  assert.match(readme, /Draft PR #111/);
  assert.match(agents, /production:build:safe/);
  assert.match(agents, /production:deploy:safe/);
  assert.match(agents, /do not assume a push to main automatically deploys Cloudflare/i);
  assert.match(releasePolicy, /Issue #75 \/ Draft PR #111/);
  assert.match(releasePolicy, /Automatic Production deployment must remain fail-closed and disabled/);
  assert.match(releasePolicy, /lovetree-limone-production/);
});

test("Design Lab prototypes remain distinct from product adoption", () => {
  assert.match(readme, /an internal prototype is not automatically a product-adopted V4 screen/);
  assert.match(agents, /`\/design-lab\/\*\*` is an internal review\/R&D surface/);
  assert.match(releasePolicy, /`prototyped` does not mean product-adopted/);
  assert.match(releasePolicy, /observed → mapped\/prototype-requested → prototyped → validated → adopted/);
});
