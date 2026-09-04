/**
 * CLEAN-108 M1 Slice 4A (#611): production test inventory contract.
 *
 * NO BROWSER IS LAUNCHED here. This suite proves the post-merge Production
 * workflow (`production-auto-deploy.yml`) runs every standard root test EXCEPT
 * the CLEAN-108 real-browser pilot, and that the pilot remains owned ONLY by
 * `src-108-harness-gate.yml` on the exact PR head sha.
 *
 * Background: positional '!glob' negation is not honored by the Node 22 test
 * runner, so the exclusion MUST be an explicit find/mapfile inventory. The
 * pilot fails closed in CI without SRC_EXACT_HEAD (evidence must bind the PR
 * head sha, never a synthetic merge ref), so running it from Production would
 * intentionally fail the deploy gate.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const PILOT = 'tests/clean108-src056-real-browser-pilot.test.mjs';

function readWorkflow(name) {
  return fs.readFileSync(path.join(repoRoot, '.github', 'workflows', name), 'utf8');
}

/** Exact production inventory: find tests -maxdepth 1 -name '*.test.mjs' minus the pilot. */
function productionInventory() {
  return fs.readdirSync(path.join(repoRoot, 'tests'))
    .filter((name) => name.endsWith('.test.mjs'))
    .map((name) => `tests/${name}`)
    .filter((entry) => entry !== PILOT)
    .sort();
}

test('production test inventory is non-empty and excludes exactly the CLEAN-108 pilot', () => {
  const inventory = productionInventory();
  assert.ok(inventory.length > 0, 'production test inventory must never be empty');

  const pilotIndex = inventory.indexOf(PILOT);
  assert.equal(pilotIndex, -1, `${PILOT} must be excluded from the production test inventory`);

  // normal tests remain included — e.g. the executor regression and a
  // representative non-CLEAN-108 standard test if one exists at the root
  const normalCandidates = [
    'tests/clean108-state-replay-executor.test.mjs',
    'tests/clean108-matched-pair-contract.test.mjs',
  ];
  for (const candidate of normalCandidates) {
    assert.ok(inventory.includes(candidate), `${candidate} must remain in the production test inventory`);
  }
  assert.ok(inventory.includes('tests/clean108-approved-recipe-s2-capture.test.mjs'));
});

test('production-auto-deploy.yml uses the explicit find/mapfile inventory (no positional negation)', () => {
  const workflow = readWorkflow('production-auto-deploy.yml');

  // the fix: explicit inventory with a fail-closed empty guard
  assert.match(workflow, /mapfile\s+-t\s+production_tests/);
  assert.match(workflow, /! -name 'clean108-src056-real-browser-pilot\.test\.mjs'/);
  assert.match(workflow, /production test inventory unexpectedly empty/);
  assert.match(workflow, /node --import tsx --test "\$\{production_tests\[@\]\}"/);

  // the invalid positional negation must be gone
  assert.doesNotMatch(workflow, /--test 'tests\/\*\.test\.mjs' '!tests\/clean108/);
});

test('exactly one CLEAN-108 pilot exclusion exists in production-auto-deploy.yml', () => {
  const workflow = readWorkflow('production-auto-deploy.yml');
  const matches = workflow.match(/clean108-src056-real-browser-pilot\.test\.mjs/g) ?? [];
  // one occurrence in the find exclusion; the comment block does not name the file
  assert.equal(matches.length, 1, `expected exactly 1 pilot reference, got ${matches.length}`);
});

test('A-track inventory semantics are unchanged (11-test expected browser inventory)', () => {
  const workflow = readWorkflow('a-track-p0-validation.yml');
  assert.match(workflow, /expected_browser_count=11/);
  // the A-track exclusion list names the pilot exactly once and nothing else CLEAN-108
  const clean108Exclusions = [...workflow.matchAll(/! -name 'clean108-[^']+\.test\.mjs'/g)];
  assert.equal(clean108Exclusions.length, 1, 'A-track must exclude exactly one CLEAN-108 test');
  assert.match(clean108Exclusions[0][0], /clean108-src056-real-browser-pilot\.test\.mjs/);
});

test('CLEAN-108 pilot remains owned only by src-108-harness-gate.yml on the exact head', () => {
  const gate = readWorkflow('src-108-harness-gate.yml');
  assert.match(gate, /node --test tests\/clean108-src056-real-browser-pilot\.test\.mjs/);
  assert.match(gate, /SRC_EXACT_HEAD: \${{ github\.event\.pull_request\.head\.sha }}/);
  assert.match(gate, /SRC_BROWSER_CHANNEL: chrome/);
  // the gate is the only workflow that invokes the pilot as a test
  const deploy = readWorkflow('production-auto-deploy.yml');
  assert.doesNotMatch(deploy, /node[^|]*--test[^|]*clean108-src056-real-browser-pilot/);
});

test('SRC_EXACT_HEAD CI fail-closed provenance rule is unchanged', () => {
  const runner = fs.readFileSync(
    path.join(repoRoot, 'src', '08_harness', 'state-replay', 'replay-approved-state-pair.mjs'),
    'utf8',
  );
  assert.match(runner, /CI requires SRC_EXACT_HEAD \(40-char hex\); refusing git fallback on synthetic merge refs/);
});