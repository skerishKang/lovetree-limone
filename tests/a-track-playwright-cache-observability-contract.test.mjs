import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/a-track-p0-validation.yml', 'utf8');

function stepBlock(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = workflow.match(new RegExp(`\\n\\s*- name: ${escaped}\\n[\\s\\S]*?(?=\\n\\s*- name: |$)`));
  assert.ok(match, `missing workflow step: ${name}`);
  return match[0];
}

test('A-track exposes Playwright cache outcome without changing cache identity', () => {
  const cache = stepBlock('Cache Playwright Chromium');
  const report = stepBlock('Report Playwright Chromium cache outcome');

  assert.match(cache, /id:\s*playwright-cache/);
  assert.match(cache, /uses:\s*actions\/cache@v4/);
  assert.match(cache, /path:\s*~\/\.cache\/ms-playwright/);
  assert.match(cache, /key:\s*\$\{\{ runner\.os \}\}-playwright-1\.55\.1-chromium/);

  assert.match(report, /GITHUB_STEP_SUMMARY/);
  assert.match(report, /steps\.playwright-cache\.outputs\.cache-hit/);
  assert.match(report, /runner\.os \}\}-playwright-1\.55\.1-chromium/);
  assert.doesNotMatch(report, /continue-on-error|if:\s*failure\(\)|if:\s*success\(\)/);
});
