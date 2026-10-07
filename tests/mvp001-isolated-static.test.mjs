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
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseMvp001UrlState } from '../public/mvp/01/productization-contract.js';
import { createAuthorityByteSource, readCommittedBlob } from '../src/08_harness/committed-blob-reader.mjs';
import { validateSourceCapsules } from '../src/08_harness/source-capsule-validator.mjs';

const ROOT = join(import.meta.dirname, '..');
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
  // #676: read COMMITTED blob bytes, not worktree bytes. A CRLF checkout
  // smudges the worktree to differ from the committed LF authority; the
  // committed blob is the authoritative input. Equality semantics unchanged.
  const bytes = createAuthorityByteSource(ROOT);
  for (const { id } of SOURCES) {
    const authShaRel = `src/03_sources/${id}/authority/sha256.txt`;
    const originalRel = `src/03_sources/${id}/original/original.html`;
    assert.ok(existsSync(join(ROOT, authShaRel)), `${id} must have authority/sha256.txt`);
    const expectedShaBuf = bytes.read(authShaRel);
    assert.ok(expectedShaBuf, `${id} authority/sha256.txt COMMITTED_BLOB_UNAVAILABLE`);
    const expectedSha = expectedShaBuf.toString('utf8').trim().split(/\s+/)[0];

    assert.ok(existsSync(join(ROOT, originalRel)), `${id} must have original.html`);
    const originalBuf = bytes.read(originalRel);
    assert.ok(originalBuf, `${id} original.html COMMITTED_BLOB_UNAVAILABLE`);
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
  // #676: authority + protected-product byte comparisons read COMMITTED Git
  // blob bytes; a CRLF worktree smudge is not authority (platform-neutral).
  const bytes = createAuthorityByteSource(ROOT);
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

    const targetDir = join(SURFACES_ROOT, surface);

    assert.ok(existsSync(targetDir), `Surface directory ${surface} must exist`);

    // #676: read artifact bytes from COMMITTED Git blobs (fail-closed on an
    // unavailable blob). Only WHAT BYTES ARE READ changes — expected hashes,
    // exact equality, occurrence counts, and allowed seam identifiers are
    // unchanged.
    const blob = (rel, what) => {
      const buf = bytes.read(rel);
      assert.ok(buf, `${what} COMMITTED_BLOB_UNAVAILABLE (fail-closed)`);
      return buf;
    };

    // (a) Authority hashes: the manifest must record the actual frozen bytes.
    for (const file of ['index.html', 'script.js', 'styles.css']) {
      const actual = sha256(blob(`src/03_sources/${id}/split/${file}`, `${id} authority ${file}`));
      assert.equal(entry.authority[file], actual, `${id} manifest authority ${file} hash must equal actual src/03_sources bytes`);
    }

    // (b) Product CSS hash: must be byte-identical to the authority CSS.
    const cssSrc = blob(`src/03_sources/${id}/split/styles.css`, `${id} authority CSS`);
    const cssDst = blob(`public/mvp/01/surfaces/${surface}/styles.css`, `${id} product CSS`);
    assert.equal(sha256(cssDst), sha256(cssSrc), `${id}/styles.css must be byte-identical to authority`);
    assert.equal(entry.product['styles.css'], entry.authority['styles.css'], `${id} manifest must lock product CSS to authority CSS`);

    // (c) Product index: authority + exactly the declared bridge include.
    const htmlSrc = blob(`src/03_sources/${id}/split/index.html`, `${id} authority index`).toString('utf8');
    const htmlDstBuf = blob(`public/mvp/01/surfaces/${surface}/index.html`, `${id} product index`);
    const htmlDst = htmlDstBuf.toString('utf8');
    const bridgeTag = `<script src="./${surface}-product-bridge.js"></script>`;
    assert.equal(entry.bridgeInclude.tag, bridgeTag, `${id} manifest bridge tag must match the surface include`);
    assert.equal(entry.bridgeInclude.occurrences, 1, `${id} manifest must declare exactly one bridge include`);
    const occurrences = htmlDst.split(bridgeTag).length - 1;
    assert.equal(occurrences, 1, `${id}/index.html must reference its Product bridge exactly once`);
    let htmlStripped = htmlDst.replace(`\n${bridgeTag}`, '').replace(bridgeTag, '');
    assert.equal(htmlStripped, htmlSrc, `${id}/index.html must be authority plus bridge tag only`);
    assert.equal(entry.product['index.html'], sha256(htmlDstBuf), `${id} manifest product index hash must equal actual product bytes`);

    // (d) Product script: must preserve authority identity hooks and carry
    // only the declared bounded Product seam.
    const jsSrc = blob(`src/03_sources/${id}/split/script.js`, `${id} authority script`).toString('utf8');
    const jsDstBuf = blob(`public/mvp/01/surfaces/${surface}/script.js`, `${id} product script`);
    const jsDst = jsDstBuf.toString('utf8');
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
    assert.equal(entry.product['script.js'], sha256(jsDstBuf), `${id} manifest product script hash must equal actual product bytes (reviewed expected hash)`);

    // (e) Companion bridge: exists exactly once, hash locked by the manifest.
    assert.equal(entry.bridge.file, `${surface}-product-bridge.js`, `${id} manifest must declare the companion bridge file`);
    const bridgePath = join(targetDir, entry.bridge.file);
    assert.ok(existsSync(bridgePath), `${id} companion bridge must exist`);
    assert.equal(entry.bridge.sha256, sha256(blob(`public/mvp/01/surfaces/${surface}/${entry.bridge.file}`, `${id} companion bridge`)), `${id} manifest bridge hash must equal actual bridge bytes`);

    // Authority split must contain no Product bridge references
    for (const file of ['index.html', 'styles.css', 'script.js']) {
      assert.ok(
        !blob(`src/03_sources/${id}/split/${file}`, `${id} authority ${file}`).toString('utf8').includes('product-bridge'),
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

// ---------------------------------------------------------------------------
// 8. #676 platform regression: committed-blob authority lock
//
// Pins the cross-platform contract:
//   real Git repository        -> committed blob bytes are the authority
//                                  (an EOL-smudged worktree cannot fake
//                                  drift, and a genuine committed-content
//                                  change still fails)
//   synthetic non-Git fixture  -> fixture worktree bytes are validated
//                                  (intentional fixture mutations still
//                                   fail — they are not silently resolved
//                                  against another repository's HEAD)
// ---------------------------------------------------------------------------

function gitRun(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: '676-fixture',
        GIT_AUTHOR_EMAIL: '676-fixture@localhost',
        GIT_COMMITTER_NAME: '676-fixture',
        GIT_COMMITTER_EMAIL: '676-fixture@localhost',
      },
    });
  } catch (e) {
    return e;
  }
}

// Minimal SINGLE-authority capsule whose recorded bytes match originalBytes.
function writeMinimalCapsule(root, sourceId, originalBytes) {
  const rel = `src/03_sources/${sourceId}`;
  const sha = createHash('sha256').update(originalBytes).digest('hex');
  const authority = {
    drive_folder_id: 'fixture-folder',
    drive_file_id: `fixture-file-${sourceId}`,
    filename: `${sourceId}-fixture.html`,
    bytes: originalBytes.length,
    sha256: sha,
    status: 'LOCKED',
  };
  mkdirSync(join(root, rel, 'authority'), { recursive: true });
  mkdirSync(join(root, rel, 'original'), { recursive: true });
  mkdirSync(join(root, rel, 'evidence/source'), { recursive: true });
  writeFileSync(join(root, rel, 'original/original.html'), originalBytes);
  writeFileSync(join(root, rel, 'manifest.json'), JSON.stringify({
    source_id: sourceId,
    authority_mode: 'SINGLE',
    authority,
    stages: {
      identity_verified: true,
      raw_authority_locked: true,
      baseline_captured: false,
      mechanical_split_complete: false,
      source_split_parity_pass: false,
    },
  }, null, 2));
  writeFileSync(join(root, rel, 'authority/authority.json'), JSON.stringify({
    source_id: sourceId,
    authority_mode: 'SINGLE',
    authority_status: 'LOCKED',
    ...authority,
  }, null, 2));
  writeFileSync(join(root, rel, 'authority/sha256.txt'), `${sha}  original/original.html\n`);
  writeFileSync(join(root, rel, 'evidence/source/drive-authority-readback.json'), JSON.stringify({
    source_id: sourceId,
    verification_mode: 'CENTRAL_FRESH_DRIVE_READBACK',
    fresh_drive: {
      folder_id: authority.drive_folder_id,
      file_id: authority.drive_file_id,
      filename: authority.filename,
      bytes: authority.bytes,
      sha256: authority.sha256,
    },
  }, null, 2));
}

test('8. Committed-blob lock: EOL smudge cannot fake drift; committed drift and fixture mutations still fail', () => {
  // (1) Synthetic Git fixture: a minimal capsule committed with LF bytes.
  const gitRoot = mkdtempSync(join(tmpdir(), 'lovetree-676-gitfixture-'));
  try {
    execFileSync('git', ['init'], { cwd: gitRoot, stdio: 'ignore' });
    gitRun(gitRoot, ['config', 'core.autocrlf', 'false']); // deterministic LF blobs
    const originalLf = Buffer.from('<html>\n<body>fixture orbit</body>\n</html>\n', 'utf8');
    writeMinimalCapsule(gitRoot, 'SRC101', originalLf);
    gitRun(gitRoot, ['add', '-A']);
    gitRun(gitRoot, ['commit', '-m', 'fixture capsule']);

    // (3) The committed-blob reader returns the original committed LF bytes.
    const committed = readCommittedBlob(gitRoot, 'src/03_sources/SRC101/original/original.html');
    assert.ok(committed, 'committed blob must resolve for the fixture capsule');
    assert.equal(committed.toString('utf8'), originalLf.toString('utf8'), 'reader must return committed LF bytes');

    // (2) The worktree copy is smudged to CRLF — the platform artifact.
    const smudged = originalLf.toString('utf8').split('\n').join('\r\n');
    writeFileSync(join(gitRoot, 'src/03_sources/SRC101/original/original.html'), smudged, 'utf8');
    const worktreeSha = sha256(readFileSync(join(gitRoot, 'src/03_sources/SRC101/original/original.html')));
    assert.notEqual(worktreeSha, sha256(committed), 'smudged worktree SHA must differ from committed SHA');

    // (5) The validator still uses the committed authority: the smudge alone
    // produces NO drift, and the capsule validates clean.
    assert.deepEqual(
      validateSourceCapsules({ repoRoot: gitRoot, sourceDirs: ['SRC101'], phase: 'ROLLOUT', calibrationSet: new Set() }),
      [],
      'a CRLF worktree smudge must not fake authority drift (committed-blob input)',
    );

    // A genuinely changed committed content is still AUTHORITY DRIFT.
    writeFileSync(join(gitRoot, 'src/03_sources/SRC101/original/original.html'), '<html>\n<body>DRIFTED</body>\n</html>\n', 'utf8');
    gitRun(gitRoot, ['add', '-A']);
    gitRun(gitRoot, ['commit', '-m', 'drift']);
    const drifted = validateSourceCapsules({ repoRoot: gitRoot, sourceDirs: ['SRC101'], phase: 'ROLLOUT', calibrationSet: new Set() });
    assert.ok(
      drifted.some((f) => f.includes('frozen original') && (f.includes('SHA256 drift') || f.includes('byte count drift'))),
      `a genuine committed-content change must fail: ${JSON.stringify(drifted)}`,
    );

    // Unavailable blobs fail closed (never a worktree fallback).
    assert.equal(readCommittedBlob(gitRoot, 'src/03_sources/SRC101/does-not-exist.txt'), null, 'unknown path -> COMMITTED_BLOB_UNAVAILABLE');

    // (4) Synthetic NON-Git fixture root: fixture worktree bytes are
    // validated, and an intentional fixture mutation is still detected —
    // it is never silently resolved against another repository's HEAD.
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'lovetree-676-fixture-'));
    try {
      writeMinimalCapsule(fixtureRoot, 'SRC102', originalLf);
      assert.deepEqual(
        validateSourceCapsules({ repoRoot: fixtureRoot, sourceDirs: ['SRC102'], phase: 'ROLLOUT', calibrationSet: new Set() }),
        [],
        'a consistent non-Git fixture validates clean on fixture bytes',
      );
      const manifestPath = join(fixtureRoot, 'src/03_sources/SRC102/manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      manifest.authority.sha256 = '0'.repeat(64); // a real, intentional mutation
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      const failed = validateSourceCapsules({ repoRoot: fixtureRoot, sourceDirs: ['SRC102'], phase: 'ROLLOUT', calibrationSet: new Set() });
      assert.ok(
        failed.some((f) => f.includes('Drive SHA256 mismatch') || f.includes('frozen original SHA256 drift')),
        `an intentional fixture mutation must still be detected: ${JSON.stringify(failed)}`,
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(gitRoot, { recursive: true, force: true });
  }
});
