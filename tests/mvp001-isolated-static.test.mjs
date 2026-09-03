/**
 * tests/mvp001-isolated-static.test.mjs
 *
 * Verification suite for MVP001 Isolated Static realization.
 * Enforces:
 * 1. Source capsules in src/03_sources/ remain 100% untouched.
 * 2. Materialized files in public/mvp/01/surfaces/ match source split bytes and sha256.
 * 3. Direct DOM merge is forbidden (isolated frames required).
 * 4. Five candidate surfaces exist with canonical step mappings.
 * 5. Invalid step fails safe to entry through the shared productization contract.
 * 6. Shell viewport geometry guarantees full 100vw/100vh iframe space without permanent shrinking header.
 * 7. Generation phase guard passes closed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseMvp001UrlState } from '../public/mvp/01/productization-contract.js';

const ROOT = join(import.meta.dirname, '..');
const SOURCES_ROOT = join(ROOT, 'src/03_sources');
const SURFACES_ROOT = join(ROOT, 'public/mvp/01/surfaces');

const SOURCES = [
  { id: 'SRC064', surface: 'src064', step: 'entry' },
  { id: 'SRC058', surface: 'src058', step: 'board' },
  { id: 'SRC056', surface: 'src056', step: 'relationships' },
  { id: 'SRC057', surface: 'src057', step: 'memory' },
  { id: 'SRC060', surface: 'src060', step: 'explore' },
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

test('1. Source capsules in src/03_sources/ remain untouched and match authority', () => {
  for (const { id } of SOURCES) {
    const authShaPath = join(SOURCES_ROOT, id, 'authority/sha256.txt');
    assert.ok(existsSync(authShaPath), `${id} must have authority/sha256.txt`);
    const expectedSha = readFileSync(authShaPath, 'utf8').trim().split(/\s+/)[0];

    const originalPath = join(SOURCES_ROOT, id, 'original/original.html');
    assert.ok(existsSync(originalPath), `${id} must have original.html`);
    const originalBuf = readFileSync(originalPath);
    assert.equal(sha256(originalBuf), expectedSha, `${id} original.html must match authority SHA256`);
  }
});

test('2. Materialized files in public/mvp/01/surfaces/ match source split byte-for-byte', () => {
  for (const { id, surface } of SOURCES) {
    const splitDir = join(SOURCES_ROOT, id, 'split');
    const targetDir = join(SURFACES_ROOT, surface);

    assert.ok(existsSync(targetDir), `Surface directory ${surface} must exist`);

    const coreFiles = ['index.html', 'styles.css', 'script.js'];
    for (const file of coreFiles) {
      const srcFile = join(splitDir, file);
      const dstFile = join(targetDir, file);

      assert.ok(existsSync(srcFile), `Source split file ${srcFile} must exist`);
      assert.ok(existsSync(dstFile), `Materialized file ${dstFile} must exist`);

      const srcBuf = readFileSync(srcFile);
      const dstBuf = readFileSync(dstFile);

      assert.equal(dstBuf.length, srcBuf.length, `${id}/${file} byte length mismatch`);
      assert.equal(sha256(dstBuf), sha256(srcBuf), `${id}/${file} SHA256 mismatch`);
    }
  }

  const surfaceDirs = readdirSync(SURFACES_ROOT);
  const expectedDirs = SOURCES.map((s) => s.surface).sort();
  assert.deepEqual(surfaceDirs.sort(), expectedDirs, 'Surface directory set must strictly match expected 5 sources');

  for (const dir of surfaceDirs) {
    const files = readdirSync(join(SURFACES_ROOT, dir));
    const core = ['index.html', 'script.js', 'styles.css'];
    const extras = files.filter((f) => !core.includes(f));
    assert.ok(core.every((f) => files.includes(f)), `Directory ${dir} must contain core split files`);
    assert.ok(extras.every((f) => f.endsWith('-product-bridge.js')), `Directory ${dir} may only contain authorized companion bridge files`);
  }
});

test('3. Direct DOM merge is not used; isolated surfaces architecture is enforced', () => {
  const shellHtml = readFileSync(join(ROOT, 'public/mvp/01/index.html'), 'utf8');
  const shellJs = readFileSync(join(ROOT, 'public/mvp/01/shell.js'), 'utf8');
  const orchestratorJs = readFileSync(join(ROOT, 'public/mvp/01/product-orchestrator.js'), 'utf8');

  assert.ok(!shellHtml.includes('living-memory-board'), 'Shell HTML must not contain SRC058 internal DOM');
  assert.ok(!shellHtml.includes('canvas2d-3d-cluster-projection'), 'Shell HTML must not contain SRC060 internal DOM');

  assert.ok(shellJs.includes("document.createElement('iframe')"), 'Shell must mount isolated iframe surfaces');
  assert.ok(shellJs.includes('iframe.src = buildSurfaceUrl(surfaceUrl, sessionId, sourceId)'), 'Shell must load the orchestrator-provided surface URL through iframe src');

  assert.ok(shellJs.includes("frame.src = 'about:blank'"), 'Shell removeFrame adapter must flush iframe before removal');
  assert.ok(orchestratorJs.includes('this.shell.removeFrame(frame)'), 'Orchestrator must delegate inactive-frame removal to shell adapter');
});

test('4. Five surfaces exist and canonical step mapping is exact', () => {
  const shellJs = readFileSync(join(ROOT, 'public/mvp/01/shell.js'), 'utf8');

  const expectedSteps = [
    { id: 'entry', srcId: 'SRC064', surface: '/mvp/01/surfaces/src064/index.html' },
    { id: 'board', srcId: 'SRC058', surface: '/mvp/01/surfaces/src058/index.html' },
    { id: 'relationships', srcId: 'SRC056', surface: '/mvp/01/surfaces/src056/index.html' },
    { id: 'memory', srcId: 'SRC057', surface: '/mvp/01/surfaces/src057/index.html' },
    { id: 'explore', srcId: 'SRC060', surface: '/mvp/01/surfaces/src060/index.html' },
  ];

  for (const step of expectedSteps) {
    assert.ok(shellJs.includes(`id: '${step.id}'`), `Shell must register step id: ${step.id}`);
    assert.ok(shellJs.includes(`srcId: '${step.srcId}'`), `Shell must map ${step.id} to ${step.srcId}`);
    assert.ok(shellJs.includes(step.surface), `Shell must reference surface path ${step.surface}`);
  }
});

test('5. Invalid query step fails safe to entry', () => {
  const context = parseMvp001UrlState('?step=not-a-real-step');
  assert.equal(context.currentStep, 'entry', 'shared URL contract must fallback to entry on invalid step');
});

test('6. Shell viewport geometry guarantees full space without shrinking header', () => {
  const shellCss = readFileSync(join(ROOT, 'public/mvp/01/shell.css'), 'utf8');

  assert.ok(/#surface-container\s*\{[^}]*width:\s*100%/i.test(shellCss), 'surface container must span 100% width');
  assert.ok(/#surface-container\s*\{[^}]*height:\s*100%/i.test(shellCss), 'surface container must span 100% height');
  assert.ok(/\.mvp-nav\s*\{[^}]*position:\s*fixed/i.test(shellCss), 'mvp navigation chrome must be position: fixed overlay');
});

test('7. Generation phase guard remains PASS', () => {
  const guardPath = join(ROOT, 'src/08_harness/generation-phase-guard.mjs');
  assert.ok(existsSync(guardPath), 'generation-phase-guard.mjs must be present');

  const output = execFileSync('node', [guardPath], { encoding: 'utf8' });
  assert.ok(output.includes('GENERATION_PHASE_GUARD = PASS'), 'Guard execution must yield PASS');
});
