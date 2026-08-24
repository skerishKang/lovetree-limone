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

test('A-track persists late browser runner output without weakening failure semantics', () => {
  const lineage53 = stepBlock('Lineage 53 V2 actual-route browser QA');
  const standardBrowser = stepBlock('Unit/integration — standard-browser-tests');
  const orbit = stepBlock('V4 Orbit canonical actual-route browser QA');
  const surface = stepBlock('Surface A-track failure diagnostics');
  const upload = stepBlock('Upload A-track failure diagnostics');

  assert.match(lineage53, /set -euo pipefail/);
  assert.match(
    lineage53,
    /node --import tsx --test tests\/lineage-53-v2-route-browser-qa\.test\.mjs 2>&1 \| tee \/tmp\/a-track-lineage-53-v2-route\.log/
  );

  assert.match(standardBrowser, /set -euo pipefail/);
  assert.match(standardBrowser, /tee \/tmp\/a-track-standard-browser-tests\.log/);

  assert.match(orbit, /set -euo pipefail/);
  assert.match(
    orbit,
    /node --import tsx --test tests\/v4-orbit-canonical-browser-qa\.mjs 2>&1 \| tee \/tmp\/a-track-v4-orbit-canonical\.log/
  );

  assert.match(surface, /if:\s*failure\(\)/);
  assert.match(surface, /\/tmp\/a-track-\*\.log/);
  assert.match(upload, /if:\s*failure\(\)/);
  assert.match(upload, /\/tmp\/a-track-\*\.log/);

  for (const block of [lineage53, standardBrowser, orbit, surface, upload]) {
    assert.doesNotMatch(block, /continue-on-error/);
  }
});
