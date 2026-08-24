import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/a-track-p0-validation.yml', 'utf8');

test('A-track failure diagnostics run after the late Orbit phase and include phase server logs', () => {
  const orbitIndex = workflow.indexOf('- name: V4 Orbit canonical actual-route browser QA');
  const screenshotsIndex = workflow.indexOf('- name: Upload V4 Orbit canonical screenshots');
  const surfaceIndex = workflow.indexOf('- name: Surface A-track failure diagnostics');
  const uploadIndex = workflow.indexOf('- name: Upload A-track failure diagnostics');

  assert.ok(orbitIndex >= 0, 'Orbit QA step must exist');
  assert.ok(screenshotsIndex > orbitIndex, 'Orbit screenshot upload must follow Orbit QA');
  assert.ok(surfaceIndex > screenshotsIndex, 'failure summary must be evaluated after the late Orbit phase');
  assert.ok(uploadIndex > surfaceIndex, 'failure artifact upload must follow the failure summary');

  assert.equal((workflow.match(/- name: Surface A-track failure diagnostics/g) ?? []).length, 1);
  assert.equal((workflow.match(/- name: Upload A-track failure diagnostics/g) ?? []).length, 1);
  assert.match(workflow.slice(surfaceIndex, uploadIndex), /if: failure\(\)/);
  assert.match(workflow.slice(uploadIndex), /if: failure\(\)/);

  assert.ok((workflow.match(/\/tmp\/lineage-53-v2-server\.log/g) ?? []).length >= 2,
    'Lineage53 server log must be surfaced and uploaded');
  assert.ok((workflow.match(/\/tmp\/v4-orbit-route-server\.log/g) ?? []).length >= 2,
    'Orbit server log must be surfaced and uploaded');
});
