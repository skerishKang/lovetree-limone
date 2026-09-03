/**
 * tests/mvp001-isolated-static.test.mjs
 *
 * Verification suite for MVP001 Isolated Static realization.
 * Enforces:
 * 1. Source capsules in src/03_sources/ remain 100% untouched.
 * 2. Product surfaces in public/mvp/01/surfaces/ are derived from frozen source split:
 *    styles.css byte-identical, index.html = authority + bridge tag only,
 *    script.js = authority plus bounded Product seam, authority hooks preserved.
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

test('2. Product surfaces derive from frozen source split with derivation-manifest guard', () => {
  const seamMarkers = {
    SRC056: ['__LT56_SELECT__', '__LT56_COPY__'],
    SRC057: ['__LT57_SELECT__', '__LT57_PRODUCT__'],
    SRC058: ['__LT58_SELECT__', '__LT58_PRODUCT__'],
    SRC060: ['__LT60_SELECT__'],
    SRC064: ['__TRACK64_SELECT__'],
  };

  // Derivation manifest (PR #607 Blocker C): every Product byte is locked to
  // the frozen authority plus the reviewed bounded seam. All fields are
  // validated against actual bytes; hash mismatches, undeclared deltas, or
  // undeclared seam identifiers fail the gate.
  const manifestPath = join(ROOT, 'public/mvp/01/product-derivation-manifest.json');
  assert.ok(existsSync(manifestPath), 'product-derivation-manifest.json must exist');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.mvpId, 'MVP001');
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(
    Object.keys(manifest.sources).sort(),
    SOURCES.map((s) => s.id).sort(),
    'manifest must declare exactly the five Product surfaces',
  );

  for (const { id, surface } of SOURCES) {
    const entry = manifest.sources[id];
    assert.ok(entry, `manifest must contain ${id}`);
    assert.deepEqual(
      Object.keys(entry.authority).sort(),
      ['index.html', 'script.js', 'styles.css'],
      `${id} manifest authority must declare the three split files`,
    );
    assert.deepEqual(
      Object.keys(entry.product).sort(),
      ['index.html', 'script.js', 'styles.css'],
      `${id} manifest product must declare the three split files`,
    );

    const splitDir = join(SOURCES_ROOT, id, 'split');
    const targetDir = join(SURFACES_ROOT, surface);

    assert.ok(existsSync(targetDir), `Surface directory ${surface} must exist`);

    // (a) Authority hashes: the manifest must record the actual frozen bytes.
    for (const file of ['index.html', 'script.js', 'styles.css']) {
      const actual = sha256(readFileSync(join(splitDir, file)));
      assert.equal(entry.authority[file], actual, `${id} manifest authority ${file} hash must equal actual src/03_sources bytes`);
    }

    // (b) Product CSS hash: must be byte-identical to the authority CSS.
    const cssSrc = readFileSync(join(splitDir, 'styles.css'));
    const cssDst = readFileSync(join(targetDir, 'styles.css'));
    assert.equal(sha256(cssDst), sha256(cssSrc), `${id}/styles.css must be byte-identical to authority`);
    assert.equal(entry.product['styles.css'], entry.authority['styles.css'], `${id} manifest must lock product CSS to authority CSS`);

    // (c) Product index: authority + exactly the declared bridge include.
    const htmlSrc = readFileSync(join(splitDir, 'index.html'), 'utf8');
    const htmlDst = readFileSync(join(targetDir, 'index.html'), 'utf8');
    const bridgeTag = `<script src="./${surface}-product-bridge.js"></script>`;
    assert.equal(entry.bridgeInclude.tag, bridgeTag, `${id} manifest bridge tag must match the surface include`);
    assert.equal(entry.bridgeInclude.occurrences, 1, `${id} manifest must declare exactly one bridge include`);
    const occurrences = htmlDst.split(bridgeTag).length - 1;
    assert.equal(occurrences, 1, `${id}/index.html must reference its Product bridge exactly once`);
    let htmlStripped = htmlDst.replace(`\n${bridgeTag}`, '').replace(bridgeTag, '');
    assert.equal(htmlStripped, htmlSrc, `${id}/index.html must be authority plus bridge tag only`);
    assert.equal(entry.product['index.html'], sha256(htmlDst), `${id} manifest product index hash must equal actual product bytes`);

    // (d) Product script: must preserve authority identity hooks and carry
    // only the declared bounded Product seam.
    const jsSrc = readFileSync(join(splitDir, 'script.js'), 'utf8');
    const jsDst = readFileSync(join(targetDir, 'script.js'), 'utf8');
    const authHooks = [...jsSrc.matchAll(/window\.(__[A-Za-z0-9_]+)\s*=/g)].map((m) => m[1]);
    assert.ok(authHooks.length > 0, `${id}/script.js authority must expose identity hooks`);
    for (const hook of authHooks) {
      assert.ok(new RegExp(`window\\.${hook}\\s*=`).test(jsDst), `${id}/script.js must preserve authority hook window.${hook}`);
    }
    assert.deepEqual(
      entry.seamIdentifiers.sort(),
      [...seamMarkers[id]].sort(),
      `${id} manifest seam identifiers must match the reviewed bounded seam`,
    );
    for (const marker of seamMarkers[id]) {
      assert.ok(jsDst.includes(marker), `${id}/script.js must expose bounded seam ${marker}`);
      assert.ok(!jsSrc.includes(marker), `${id} authority script.js must not contain Product seam ${marker}`);
    }
    assert.equal(entry.product['script.js'], sha256(jsDst), `${id} manifest product script hash must equal actual product bytes (reviewed expected hash)`);

    // (e) Companion bridge: exists exactly once, hash locked by the manifest.
    assert.equal(entry.bridge.file, `${surface}-product-bridge.js`, `${id} manifest must declare the companion bridge file`);
    const bridgePath = join(targetDir, entry.bridge.file);
    assert.ok(existsSync(bridgePath), `${id} companion bridge must exist`);
    assert.equal(entry.bridge.sha256, sha256(readFileSync(bridgePath)), `${id} manifest bridge hash must equal actual bridge bytes`);

    // Authority split must contain no Product bridge references
    for (const file of ['index.html', 'styles.css', 'script.js']) {
      assert.ok(
        !readFileSync(join(splitDir, file), 'utf8').includes('product-bridge'),
        `${id} authority ${file} must not reference Product bridge`
      );
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
