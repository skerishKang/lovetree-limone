import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const seed = readFileSync('.github/workflows/playwright-cache-seed.yml', 'utf8');
const atrack = readFileSync('.github/workflows/a-track-p0-validation.yml', 'utf8');

const cacheKeyPattern = /key:\s*\$\{\{ runner\.os \}\}-playwright-1\.55\.1-chromium/;

test('trusted-main Playwright cache seed matches A-track without privileged execution', () => {
  assert.match(atrack, cacheKeyPattern, 'A-track cache key contract changed');
  assert.match(seed, cacheKeyPattern, 'seed cache key must exactly match A-track');
  assert.match(seed, /path:\s*~\/\.cache\/ms-playwright/);
  assert.match(seed, /uses:\s*actions\/cache@v4/);

  assert.match(seed, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(seed, /paths:\s*\n\s*- \.github\/workflows\/playwright-cache-seed\.yml/);
  assert.match(seed, /workflow_dispatch:/);
  assert.doesNotMatch(seed, /pull_request:/);

  assert.match(seed, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(seed, /secrets\./);
  assert.doesNotMatch(seed, /actions\/checkout@/);

  assert.match(seed, /if:\s*steps\.playwright-cache\.outputs\.cache-hit != 'true'/);
  assert.match(seed, /npx --yes playwright@1\.55\.1 install chromium/);
});
