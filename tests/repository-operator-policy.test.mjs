import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const [readme, agents, wslPolicy, releasePolicy, productionFirstPolicy, workflow] = await Promise.all([
  read("README.md"),
  read("AGENTS.md"),
  read("docs/operations/WSL_WORKSPACE_POLICY.md"),
  read("docs/operations/LOVETREE_RELEASE_OPERATING_POLICY.md"),
  read("docs/operations/PRODUCTION_FIRST_ROLLBACK_POLICY.md"),
  read(".github/workflows/production-auto-deploy.yml"),
]);

test("README and operator guide reflect current product, source, and backend authority", () => {
  assert.match(readme, /\*\*Legacy\*\*.*\*\*Next\*\*/s);
  assert.match(readme, /currently implemented through \*\*V4\*\*/);
  assert.match(readme, /Neon PostgreSQL \+ Drizzle ORM/);
  assert.match(readme, /npm run typecheck/);
  assert.doesNotMatch(readme, /There is currently no `typecheck` script/);
  assert.doesNotMatch(readme, /Backend services, D1\/Drizzle persistence, authentication, and deployment are\s+explicitly out of scope/);

  assert.match(agents, /SOURCE WORK\s*\n= preserve the sibling\/original executable/s);
  assert.match(agents, /mechanically split the single-file HTML into maintainable HTML\/CSS\/JS\/assets/);
  assert.match(agents, /Database: Neon PostgreSQL through the shared Product authority/);
  assert.match(agents, /Production Worker identity: `lovetree-limone`/);
  assert.match(agents, /Do not create a second canonical Product DB\/Auth\/API\/provider authority/);
  assert.doesNotMatch(agents, /Backend API:\s*Cloudflare Workers \(D1\/Drizzle ORM\)/);
});

test("workspace policy keeps each Lane OS-native and WSL work off cross-mounted paths", () => {
  assert.match(readme, /dedicated Windows-native worktree/);
  assert.match(readme, /\$HOME\/worktrees\/\*\*/);
  assert.match(readme, /Do not run WSL repository workloads from Windows-mounted `\/mnt\/c\/\*\*` or `\/mnt\/g\/\*\*` paths/);

  assert.match(agents, /Both WSL and Windows may be used in OS-native worktrees/);
  assert.match(agents, /Do not run heavy repository workloads from cross-mounted paths when an OS-native worktree is available/);

  const crossMountedProhibition = wslPolicy
    .split("\n")
    .find((line) => line.includes("/mnt/c/**") && line.includes("/mnt/g/**"));
  assert.ok(crossMountedProhibition, "workspace policy must name both /mnt/c/** and /mnt/g/**");
  assert.match(crossMountedProhibition, /^Do not (?:use|run)\b/);
  assert.match(crossMountedProhibition, /active repository (?:workspace|workloads)/);
  assert.match(crossMountedProhibition, /Windows-mounted (?:filesystem|paths)/);

  assert.match(wslPolicy, /This document no longer imposes a repository-wide WSL mandate/);
  assert.match(wslPolicy, /npm run typecheck/);
  assert.match(wslPolicy, /Playwright \/ Chromium/);
});

test("dual-track workspace policy enforces one owning OS, durable GitHub history, and heavy-process gates", () => {
  assert.match(wslPolicy, /## One Lane, one owning OS/);
  assert.match(wslPolicy, /Every active implementation or mutation Lane declares one primary OS at start/);
  assert.match(wslPolicy, /## Shared root is administration only/);
  assert.match(wslPolicy, /## Mandatory Lane declaration/);
  assert.match(wslPolicy, /## GitHub is the durable ledger/);
  assert.match(wslPolicy, /Local-only state is never completion/);
  assert.match(wslPolicy, /## Heavy processes/);

  assert.match(agents, /Fresh-read the current remote before a decision that depends on current state/);
  assert.match(agents, /Existing explicit CTO\/owner approval requirements for heavyweight infrastructure remain in force/);
});

test("release policy records Production-first rollback-first semantics without weakening high-risk gates", () => {
  assert.match(readme, /bounded implementation → Production → direct Product Owner\/operator inspection → KEEP \/ FIX FORWARD \/ ROLLBACK/);
  assert.doesNotMatch(readme, /implementation → CI GREEN → Production demo/);

  assert.match(productionFirstPolicy, /default is \*\*Production first, observe in the real product, then keep\/fix\/rollback\*\*/);
  assert.match(productionFirstPolicy, /CI GREEN is not a mandatory precondition/);
  assert.match(releasePolicy, /implementation\s*\n→ Production\s*\n→ direct Product Owner \/ operator review on the real Production surface/);
  assert.match(releasePolicy, /destructive or irreversible DB migration\/data mutation/);
  assert.match(releasePolicy, /Firebase\/Auth identity or authorization policy/);
  assert.match(releasePolicy, /privacy\/security trust-boundary changes/);
});

test("Production instructions preserve guarded auto deploy, exact Worker identity, and emergency pause", () => {
  assert.match(readme, /automatic `main → Production` deployment is active/);
  assert.match(agents, /Production Worker identity: `lovetree-limone`/);
  assert.match(agents, /Automatic deployment and guard implementation details are documented in/);
  assert.match(releasePolicy, /automatic Production deployment path remains available/);
  assert.match(releasePolicy, /LOVETREE_PRODUCTION_AUTO_DEPLOY=false/);
  assert.match(releasePolicy, /Never deploy to an accidental `lovetree-limone-production` target/);

  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /vars\.LOVETREE_PRODUCTION_AUTO_DEPLOY != 'false'/);
  assert.match(workflow, /production:build:safe/);
  assert.match(workflow, /production:deploy:safe/);
  assert.match(workflow, /--confirm-worker lovetree-limone/);
  assert.match(workflow, /--execute/);
});

test("Production Firebase verification remains non-mutating", () => {
  assert.match(agents, /Do not mutate Production DB\/Firebase merely to make a validation gate pass/);
  assert.match(releasePolicy, /Do not create Production users or mutate Production data merely to test configuration/);
  assert.match(releasePolicy, /Production Firebase project identity is `relovetree`/);
  assert.match(productionFirstPolicy, /Auth\/Firebase identity or authorization-policy changes/);
});

test("Design Lab and historical implementations remain distinct from product adoption", () => {
  assert.match(readme, /an internal prototype is not automatically a product-adopted V4 screen/);
  assert.match(readme, /Keep prototype status distinct from product adoption/);
  assert.match(releasePolicy, /`\/design-lab\/\*\*` and source\/module work may be inspected directly in Production/);
  assert.match(agents, /Historical OLD and current NEW implementations are evidence\/regression material unless and until the Product Owner explicitly adopts/);
});
