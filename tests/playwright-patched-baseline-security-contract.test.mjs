import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const BASELINE = '1.55.1';
const EXPECTED_CHROMIUM_REVISION = '1193';
const EXPECTED_CHROMIUM_VERSION = '140.0.7339.186';

const activeBrowserWorkflows = [
  '.github/workflows/a-track-p0-validation.yml',
  '.github/workflows/design-fidelity-validation.yml',
  '.github/workflows/lineage52-phase2-native-browser-qa.yml',
  '.github/workflows/lineage60-v12-native-browser-qa.yml',
  '.github/workflows/living-media-sphere-v3-hold-browser-qa.yml',
  '.github/workflows/source-track18-v2-browser-qa.yml',
  '.github/workflows/source-track47-v425-browser-qa.yml',
  '.github/workflows/source-track68-v332-browser-qa.yml',
  '.github/workflows/track62-v11-continuous-exhibition-qa.yml',
  '.github/workflows/track66-native-browser-qa.yml',
  '.github/workflows/track67-native-browser-qa.yml',
];

const withDepsWorkflows = new Set([
  '.github/workflows/design-fidelity-validation.yml',
  '.github/workflows/lineage52-phase2-native-browser-qa.yml',
  '.github/workflows/source-track18-v2-browser-qa.yml',
  '.github/workflows/track62-v11-continuous-exhibition-qa.yml',
]);

const seedPath = '.github/workflows/playwright-cache-seed.yml';

function read(path) {
  return readFileSync(path, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('root manifest and canonical lock pin the accepted patched Playwright baseline', () => {
  const manifest = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));

  assert.equal(manifest.devDependencies?.playwright, BASELINE);
  assert.equal(lock.packages?.['']?.devDependencies?.playwright, BASELINE);
  assert.equal(lock.packages?.['node_modules/playwright']?.version, BASELINE);
  assert.equal(lock.packages?.['node_modules/playwright']?.dependencies?.['playwright-core'], BASELINE);
  assert.equal(lock.packages?.['node_modules/playwright-core']?.version, BASELINE);
  assert.equal(lock.packages?.['node_modules/playwright']?.dev, true);
  assert.equal(lock.packages?.['node_modules/playwright-core']?.dev, true);
});

test('active browser workflows rely on npm ci and never reintroduce mutable Playwright package installs', () => {
  assert.equal(activeBrowserWorkflows.length, 11);
  assert.equal(withDepsWorkflows.size, 4);

  for (const path of activeBrowserWorkflows) {
    const source = read(path);

    assert.match(source, /run:\s*npm ci/, `${path} must install the canonical lock with npm ci`);
    assert.doesNotMatch(source, /npm install[^\n]*playwright@/, `${path} must not mutate node_modules with a dynamic Playwright install`);
    assert.doesNotMatch(source, /playwright@1\.55\.0/, `${path} still references vulnerable Playwright 1.55.0`);

    if (withDepsWorkflows.has(path)) {
      assert.match(source, /npx playwright install --with-deps chromium/, `${path} must preserve --with-deps Chromium install semantics`);
      assert.doesNotMatch(source, /npx playwright install chromium(?:\s|$)/, `${path} must not silently downgrade to plain Chromium install`);
    } else {
      assert.match(source, /npx playwright install chromium(?:\s|$)/, `${path} must preserve plain Chromium install semantics`);
      assert.doesNotMatch(source, /npx playwright install --with-deps chromium/, `${path} must not silently add --with-deps`);
    }
  }
});

test('cache seed and A-track cache identity remain atomic with the patched baseline', () => {
  const seed = read(seedPath);
  const atrack = read('.github/workflows/a-track-p0-validation.yml');
  const cacheKey = `${'${{ runner.os }}'}-playwright-${BASELINE}-chromium`;

  assert.match(seed, new RegExp(`playwright@${escapeRegExp(BASELINE)} install chromium`));
  assert.doesNotMatch(seed, /playwright@1\.55\.0/);
  assert.ok(seed.includes(cacheKey), 'seed cache key must use the patched baseline');
  assert.ok(atrack.includes(cacheKey), 'A-track cache key/summary must use the patched baseline');
  assert.doesNotMatch(seed, /playwright-1\.55\.0-chromium/);
  assert.doesNotMatch(atrack, /playwright-1\.55\.0-chromium/);
});

test('patched baseline records the expected Chromium compatibility target', () => {
  assert.equal(BASELINE, '1.55.1');
  assert.equal(EXPECTED_CHROMIUM_REVISION, '1193');
  assert.equal(EXPECTED_CHROMIUM_VERSION, '140.0.7339.186');
});
