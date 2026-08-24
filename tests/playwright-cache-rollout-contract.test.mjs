import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflows = new Map([
  ['.github/workflows/design-fidelity-validation.yml', 'npx playwright install --with-deps chromium'],
  ['.github/workflows/lineage52-phase2-native-browser-qa.yml', 'npx playwright install --with-deps chromium'],
  ['.github/workflows/lineage60-v12-native-browser-qa.yml', 'npx playwright install chromium'],
  ['.github/workflows/living-media-sphere-v3-hold-browser-qa.yml', 'npx playwright install chromium'],
  ['.github/workflows/source-track18-v2-browser-qa.yml', 'npx playwright install --with-deps chromium'],
  ['.github/workflows/source-track47-v425-browser-qa.yml', 'npx playwright install chromium'],
  ['.github/workflows/source-track68-v332-browser-qa.yml', 'npx playwright install chromium'],
  ['.github/workflows/track62-v11-continuous-exhibition-qa.yml', 'npx playwright install --with-deps chromium'],
  ['.github/workflows/track66-native-browser-qa.yml', 'npx playwright install chromium'],
  ['.github/workflows/track67-native-browser-qa.yml', 'npx playwright install chromium'],
]);

const CACHE_STEP = '- name: Restore Playwright Chromium cache';
const PREPARE_STEP = '- name: Prepare Playwright runtime';
const CACHE_ACTION = 'uses: actions/cache@v4';
const CACHE_PATH = 'path: ~/.cache/ms-playwright';
const CACHE_KEY = 'key: ${{ runner.os }}-playwright-1.55.0-chromium';
const DYNAMIC_INSTALL = 'npm install --no-save --package-lock=false playwright@1.55.0';

test('dedicated browser workflows restore the proven trusted-main Chromium cache without changing install semantics', async () => {
  assert.equal(workflows.size, 10, 'rollout inventory must remain exactly 10 non-A-track workflows');
  assert.equal(workflows.has('.github/workflows/a-track-p0-validation.yml'), false, 'A-track stays outside this rollout');

  for (const [path, browserInstall] of workflows) {
    const source = await readFile(path, 'utf8');
    const cacheIndex = source.indexOf(CACHE_STEP);
    const prepareIndex = source.indexOf(PREPARE_STEP);

    assert.notEqual(cacheIndex, -1, `${path}: missing Chromium cache restore step`);
    assert.notEqual(prepareIndex, -1, `${path}: missing Playwright preparation step`);
    assert.ok(cacheIndex < prepareIndex, `${path}: cache restore must run before Playwright preparation`);
    assert.ok(source.includes(CACHE_ACTION), `${path}: cache action must stay actions/cache@v4`);
    assert.ok(source.includes(CACHE_PATH), `${path}: cache path drifted`);
    assert.ok(source.includes(CACHE_KEY), `${path}: trusted-main cache key drifted`);
    assert.ok(source.includes(DYNAMIC_INSTALL), `${path}: stage must preserve Playwright 1.55.0 dynamic install`);
    assert.ok(source.includes(browserInstall), `${path}: Chromium install semantics drifted`);
  }
});
