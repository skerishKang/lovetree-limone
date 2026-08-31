import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateGenerationPhase } from '../src/08_harness/generation-phase-validator.mjs';
import {
  validateMechanicalSplitSurface,
  validateSourceCapsules,
} from '../src/08_harness/source-capsule-validator.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const calibrationSet = new Set(['SRC064', 'SRC058', 'SRC057', 'SRC056', 'SRC060']);

function cloneSource(sourceId = 'SRC056', targetId = 'SRC999') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'src108-rollout-contract-'));
  fs.mkdirSync(path.join(root, 'src', '03_sources'), { recursive: true });
  fs.cpSync(
    path.join(repoRoot, 'src', '03_sources', sourceId),
    path.join(root, 'src', '03_sources', targetId),
    { recursive: true },
  );
  const base = path.join(root, 'src', '03_sources', targetId);
  for (const relative of [
    'manifest.json',
    'authority/authority.json',
    'baseline/accepted-baseline.json',
    'split/materialization.json',
    'evidence/source/drive-authority-readback.json',
    'evidence/parity/accepted-parity.json',
  ]) {
    const file = path.join(base, relative);
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if ('source_id' in value) value.source_id = targetId;
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  }
  return { root, base };
}

test('registry declares the formal Source rollout contract and release state', () => {
  const state = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/01_registry/generation-state.json'), 'utf8'));
  assert.deepEqual(state.supported_phases, ['SETUP', 'CALIBRATION', 'ROLLOUT']);
  assert.equal(state.phase, 'ROLLOUT');
  assert.equal(state.broad_108_rollout_released, true);
  assert.equal(state.phase_contract.rollout.active_root, 'src/');
  assert.equal(state.phase_contract.rollout.allows_sources_outside_calibration_batch, true);
  assert.equal(state.phase_contract.rollout.mechanical_only_source_port, true);
  assert.deepEqual(state.phase_contract.rollout.stage_order, ['S0', 'S1', 'S2', 'S3', 'S4']);
  assert.deepEqual(state.phase_contract.downstream_phases_separate, [
    'CODEX',
    'FAMILY',
    'COMPONENTIZATION',
    'PRODUCT_COMPOSITION',
    'PRODUCT_ADOPTION',
    'BACKEND_API_DB_AUTH',
  ]);
});

test('current ROLLOUT fixture remains valid', () => {
  const result = spawnSync(process.execPath, ['src/08_harness/validate-layout.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /GENERATION_PHASE=ROLLOUT/);
});

test('synthetic valid ROLLOUT state passes phase validation', () => {
  assert.deepEqual(validateGenerationPhase({
    state: {
      phase: 'ROLLOUT',
      active_root: 'src/',
      real_source_runtime_started: true,
      real_codex_runtime_started: false,
      broad_108_rollout_released: true,
    },
    sourceDirs: ['SRC056', 'SRC999'],
    codexDirs: [],
    familyDirs: [],
  }), []);
});

test('ROLLOUT with broad release false fails closed', () => {
  assert.deepEqual(validateGenerationPhase({
    state: {
      phase: 'ROLLOUT',
      active_root: 'src/',
      real_source_runtime_started: true,
      real_codex_runtime_started: false,
      broad_108_rollout_released: false,
    },
    sourceDirs: [],
    codexDirs: [],
    familyDirs: [],
  }), ['ROLLOUT requires broad_108_rollout_released=true']);
});

test('CALIBRATION with broad release true fails closed', () => {
  assert.deepEqual(validateGenerationPhase({
    state: {
      phase: 'CALIBRATION',
      active_root: 'src/',
      real_source_runtime_started: true,
      real_codex_runtime_started: false,
      broad_108_rollout_released: true,
    },
    sourceDirs: [],
    codexDirs: [],
    familyDirs: [],
  }), ['CALIBRATION cannot release broad 108 rollout']);
});

test('ROLLOUT accepts a valid Source outside the fixed calibration batch', () => {
  const { root } = cloneSource();
  const failures = validateSourceCapsules({
    repoRoot: root,
    sourceDirs: ['SRC999'],
    phase: 'ROLLOUT',
    calibrationSet,
  });
  assert.deepEqual(failures, []);
});

test('malformed Source capsule fails shared integrity validation', () => {
  const { root, base } = cloneSource();
  const manifestPath = path.join(base, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.authority.sha256 = '0'.repeat(64);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const failures = validateSourceCapsules({
    repoRoot: root,
    sourceDirs: ['SRC999'],
    phase: 'ROLLOUT',
    calibrationSet,
  });
  assert.ok(failures.some((message) => message.includes('Drive SHA256 mismatch')));
});

test('TS/TSX/JSX files under split surfaces fail closed', () => {
  const { root, base } = cloneSource();
  for (const extension of ['.ts', '.tsx', '.jsx']) {
    fs.writeFileSync(path.join(base, 'split', `ConvertedSurface${extension}`), 'export default function ConvertedSurface() {}\n');
  }
  const failures = validateMechanicalSplitSurface({ repoRoot: root });
  for (const extension of ['.ts', '.tsx', '.jsx']) {
    assert.ok(failures.some((message) => message.includes(`ConvertedSurface${extension}`)));
  }
});
