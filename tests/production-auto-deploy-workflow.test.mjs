import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL("../.github/workflows/production-auto-deploy.yml", import.meta.url);
const docsPath = new URL("../docs/operations/GITHUB_PRODUCTION_AUTO_DEPLOY.md", import.meta.url);

const workflow = await readFile(workflowPath, "utf8");
const docs = await readFile(docsPath, "utf8");

test("Production auto deploy is main-scoped and enabled unless explicitly paused", () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /LOVETREE_PRODUCTION_AUTO_DEPLOY != 'false'/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
});

test("workflow reuses exact repository Production safety commands", () => {
  assert.match(workflow, /npm run production:build:safe/);
  assert.match(workflow, /npm run production:deploy:safe --/);
  assert.match(workflow, /--confirm-worker lovetree-limone/);
  assert.match(workflow, /--expected-current-version/);
  assert.match(workflow, /--execute/);
  assert.match(workflow, /collectActiveVersion/);
  assert.match(workflow, /HEAD does not equal origin\/main/);
});

test("workflow never uses a raw ad-hoc wrangler deploy command", () => {
  assert.doesNotMatch(workflow, /(?:^|\s)npx\s+wrangler\s+deploy(?:\s|$)/m);
  assert.doesNotMatch(workflow, /lovetree-limone-production/);
});

test("required Production secrets are names only and smoke uses the exact HTTPS Production URL", () => {
  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "DATABASE_URL",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  ]) {
    assert.match(workflow, new RegExp(name));
  }
  assert.match(workflow, /https:\/\/lovetree-limone\.charliekant\.workers\.dev/);
  assert.match(workflow, /https:\/\/\*/);
  assert.match(workflow, /Post-deploy smoke/);
  assert.match(workflow, /\/v4\/trees\/demo/);
  assert.match(workflow, /\/design-lab/);
});

test("operations doc records default-on behavior, emergency pause, and rollback", () => {
  assert.match(docs, /default.*ON/i);
  assert.match(docs, /LOVETREE_PRODUCTION_AUTO_DEPLOY=false/);
  assert.match(docs, /https:\/\/lovetree-limone\.charliekant\.workers\.dev/);
  assert.match(docs, /npx wrangler rollback <previous-version-id> --name lovetree-limone/);
  assert.match(docs, /no Production DB migration\/write/i);
  assert.match(docs, /no Firebase user\/data mutation/i);
});
