import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync, renameSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Generation phase guard — release authority contract (#674 / PR #675).
//
// The guard's component release authority comes ONLY from
// src/01_registry/generation-state.json -> componentization (currently
// broad_release=false, released_pilots=["SRC064"]). The adoption ledger is
// corroborating evidence and NEVER a release: a ledger record on its own must
// not permit a component directory.
//
// Each scenario mutates the real repository tree, runs the guard as a
// subprocess, and restores the tree in a finally block. The final test
// re-asserts the untouched baseline.
// ---------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GUARD = join(ROOT, 'src/08_harness/generation-phase-guard.mjs');
const COMPONENTS_DIR = join(ROOT, 'src/06_components');
const LEDGER_DIR = join(ROOT, 'src/01_registry/adoptions');
const STATE_FILE = join(ROOT, 'src/01_registry/generation-state.json');
const COMPOSITIONS_DIR = join(ROOT, 'src/07_compositions');
const SRC999_DIR = join(COMPONENTS_DIR, 'SRC999');
const SRC999_LEDGER = join(LEDGER_DIR, 'SRC999.json');
const SRC064_LEDGER = join(LEDGER_DIR, 'SRC064.json');
const SRC064_STASH = join(ROOT, 'guardtest-SRC064-ledger-stash.json');
const COMPO_DIR = join(COMPOSITIONS_DIR, 'version-001');

function runGuard() {
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [GUARD], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = typeof e.status === 'number' ? e.status : -1;
    out = `${e.stdout || ''}${e.stderr || ''}`;
  }
  return { code, out };
}

function readState() {
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function writeState(state) {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function src999LedgerRecord() {
  return `${JSON.stringify({
    identity: 'LOVETREE_ADOPTION_RECORD',
    schema_version: 1,
    source_or_codex_id: 'SRC999',
    adoption_status: 'ADOPTION_CANDIDATE',
  }, null, 2)}\n`;
}

function existsSrc064Stash() {
  return existsSync(SRC064_STASH);
}

test('G1. baseline: released pilot SRC064 + matching directory + corroborating ledger => PASS', () => {
  const { code, out } = runGuard();
  assert.equal(code, 0, out);
  assert.ok(out.includes('GENERATION_PHASE_GUARD = PASS'), out);
  assert.ok(
    out.includes('src/06_components/ matches generation-state released pilots exactly (SRC064)'),
    'PASS line must name the exact released pilot set',
  );
});

test('G2. SRC999 component directory + SRC999 ledger, not released in generation-state => FAIL', () => {
  mkdirSync(SRC999_DIR);
  writeFileSync(SRC999_LEDGER, src999LedgerRecord());
  try {
    const { code, out } = runGuard();
    assert.equal(code, 1, out);
    assert.ok(out.includes('UNRELEASED_COMPONENT: src/06_components/SRC999'), out);
    assert.ok(out.includes('GENERATION_PHASE_GUARD = FAIL'), out);
  } finally {
    rmSync(SRC999_DIR, { recursive: true, force: true });
    rmSync(SRC999_LEDGER, { force: true });
  }
});

test('G3. unregistered SRC999 component directory (no ledger record) => FAIL', () => {
  mkdirSync(SRC999_DIR);
  try {
    const { code, out } = runGuard();
    assert.equal(code, 1, out);
    assert.ok(out.includes('UNRELEASED_COMPONENT: src/06_components/SRC999'), out);
  } finally {
    rmSync(SRC999_DIR, { recursive: true, force: true });
  }
});

test('G4. an adoption ledger record alone never releases a component (inert without generation-state release)', () => {
  // Documented contract: the guard resolves authority from generation-state
  // released_pilots only. An orphan ledger record for an unreleased pilot
  // neither releases nor forbids anything.
  writeFileSync(SRC999_LEDGER, src999LedgerRecord());
  try {
    const { code, out } = runGuard();
    assert.equal(code, 0, `orphan ledger record must not block the released pilot set: ${out}`);
    assert.ok(out.includes('GENERATION_PHASE_GUARD = PASS'), out);
  } finally {
    rmSync(SRC999_LEDGER, { force: true });
  }
});

test('G5. released pilot SRC064 with missing adoption ledger => FAIL', () => {
  renameSync(SRC064_LEDGER, SRC064_STASH);
  try {
    const { code, out } = runGuard();
    assert.equal(code, 1, out);
    assert.ok(out.includes('RELEASED_PILOT_LEDGER_MISMATCH'), out);
    assert.ok(out.includes('GENERATION_PHASE_GUARD = FAIL'), out);
  } finally {
    renameSync(SRC064_STASH, SRC064_LEDGER);
  }
});

test('G6. malformed/invalid generation-state release authority => FAIL (fail-closed)', () => {
  const original = readFileSync(STATE_FILE, 'utf8');
  const cases = [
    [
      'invalid JSON',
      'GENERATION_STATE_MALFORMED: src/01_registry/generation-state.json is not valid JSON',
      () => writeFileSync(STATE_FILE, '{not json'),
    ],
    [
      'missing componentization block',
      'componentization block missing or not an object',
      () => {
        const s = readState();
        delete s.componentization;
        writeState(s);
      },
    ],
    [
      'broad_release not exactly false',
      'BROAD_RELEASE_NOT_FALSE',
      () => {
        const s = readState();
        s.componentization.broad_release = true;
        writeState(s);
      },
    ],
    [
      'empty released_pilots',
      'RELEASED_PILOTS_INVALID',
      () => {
        const s = readState();
        s.componentization.released_pilots = [];
        writeState(s);
      },
    ],
    [
      'released pilot missing stage_by_id entry',
      'STAGE_BY_ID_MISMATCH',
      () => {
        const s = readState();
        delete s.componentization.stage_by_id.SRC064;
        writeState(s);
      },
    ],
  ];
  for (const [label, marker, mutate] of cases) {
    mutate();
    try {
      const { code, out } = runGuard();
      assert.equal(code, 1, `generation-state ${label} must FAIL: ${out}`);
      assert.ok(out.includes(marker), `guard output must cite ${marker} (got: ${out})`);
    } finally {
      writeFileSync(STATE_FILE, original);
    }
  }
});

test('G7. composition directory added under src/07_compositions => FAIL (README-only)', () => {
  mkdirSync(COMPO_DIR, { recursive: true });
  try {
    const { code, out } = runGuard();
    assert.equal(code, 1, out);
    assert.ok(out.includes('FORBIDDEN_COMPOSITION: src/07_compositions/version-001'), out);
    assert.ok(out.includes('GENERATION_PHASE_GUARD = FAIL'), out);
  } finally {
    rmSync(COMPO_DIR, { recursive: true, force: true });
  }
});

test('G8. tree restored: baseline PASS and no test artifacts remain', () => {
  assert.ok(!existsSync(SRC999_DIR), 'SRC999 component directory must be removed');
  assert.ok(!existsSync(SRC999_LEDGER), 'SRC999 ledger record must be removed');
  assert.ok(!existsSrc064Stash(), 'SRC064 ledger stash must be cleaned up');
  assert.ok(!existsSync(COMPO_DIR), 'composition directory must be removed');
  assert.ok(existsSync(SRC064_LEDGER), 'SRC064 ledger record must be restored');
  const { code, out } = runGuard();
  assert.equal(code, 0, out);
  assert.ok(out.includes('GENERATION_PHASE_GUARD = PASS'), out);
});
