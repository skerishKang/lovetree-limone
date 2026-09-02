import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { checkVariantEntry, resolveAuthorityMode, validateDualVariantSelector } from './dual-variant-mechanical.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function readJson(repoRoot, relativePath, failures) {
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) {
    failures.push(`missing required file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    failures.push(`invalid JSON ${relativePath}: ${error.message}`);
    return null;
  }
}

function requirePath(repoRoot, relativePath, failures) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) failures.push(`missing required path: ${relativePath}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

export function validateMechanicalSplitSurface({ repoRoot, roots = ['src/03_sources', 'src/04_codex'] }) {
  const failures = [];
  for (const root of roots) {
    for (const file of walk(path.join(repoRoot, root))) {
      const relative = path.relative(repoRoot, file);
      if (relative.split(path.sep).includes('split') && /\.(tsx|jsx|ts)$/i.test(file)) {
        failures.push(`framework/TypeScript file forbidden in mechanical split surface: ${relative}`);
      }
    }
  }
  return failures;
}

function validateAcceptedParityComparisons(sourceId, parity, failures) {
  const comps = parity?.comparisons ?? {};
  const allowedGeometry = ['EQUAL', 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS'];
  const allowedScreenshots = [
    'BYTE_IDENTICAL',
    'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST',
    'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD',
  ];

  if (
    comps.dom !== 'EQUAL'
    || !allowedGeometry.includes(comps.geometry)
    || !allowedGeometry.includes(comps.computed_style)
    || comps.runtime_state !== 'EQUAL'
    || comps.interactions !== 'EQUAL'
    || !allowedScreenshots.includes(comps.screenshots)
  ) {
    failures.push(`${sourceId}: parity comparison is not fully PASS`);
  }

  if (comps.screenshots === 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD') {
    const max = comps.canonical_pixel_hamming_max;
    const threshold = comps.canonical_pixel_threshold;
    if (!Number.isInteger(max) || max < 0) failures.push(`${sourceId}: parity canonical Hamming max invalid`);
    if (!Number.isInteger(threshold) || threshold <= 0 || threshold > 32) failures.push(`${sourceId}: parity canonical Hamming threshold invalid`);
    if (Number.isInteger(max) && Number.isInteger(threshold) && max > threshold) failures.push(`${sourceId}: parity canonical Hamming exceeds threshold`);
    if (parity?.visual_review?.central_direct_artifact_review !== true) failures.push(`${sourceId}: Hamming parity requires direct CENTRAL artifact review`);
    if (parity?.required_network_errors !== 0) failures.push(`${sourceId}: Hamming parity required-network errors present`);
  }

  if (parity?.browser_errors !== 0) failures.push(`${sourceId}: parity browser errors present`);
}

/**
 * Validate a DUAL_VARIANT source capsule (one identity, two retained
 * executable authorities, explicit neutral selector, no default, fail closed).
 * SINGLE capsules never reach this branch; their behavior is unchanged.
 */
function validateDualVariantCapsule({ repoRoot, base, sourceId, manifest, authority, driveReadback }) {
  const failures = [];
  const fail = (message) => failures.push(`${sourceId}: ${message}`);

  if (manifest.source_id !== sourceId || authority.source_id !== sourceId || driveReadback.source_id !== sourceId) {
    fail('source_id identity drift');
    return failures;
  }

  const mv = manifest.authority?.variants;
  const av = authority.variants;
  for (const [label, variants] of [['manifest', mv], ['authority', av]]) {
    const keys = variants && typeof variants === 'object' && !Array.isArray(variants) ? Object.keys(variants).sort() : null;
    if (JSON.stringify(keys) !== JSON.stringify(['A', 'B'])) fail(`${label} must define exactly variants A and B`);
  }
  if (manifest.authority?.status !== 'LOCKED') fail('manifest authority must be LOCKED');
  if (authority.authority_status !== 'LOCKED') fail('authority must be LOCKED');
  if (typeof manifest.authority?.drive_folder_id !== 'string' || manifest.authority.drive_folder_id.length === 0) fail('manifest Drive folder id missing');
  if (authority.drive_folder_id !== manifest.authority?.drive_folder_id) fail('Drive folder id mismatch');

  for (const key of ['A', 'B']) {
    checkVariantEntry(`${sourceId}: manifest variant ${key}`, mv?.[key], failures);
    checkVariantEntry(`${sourceId}: authority variant ${key}`, av?.[key], failures);
    const m = mv?.[key];
    const a = av?.[key];
    if (m && a && typeof m === 'object' && typeof a === 'object' && !Array.isArray(m) && !Array.isArray(a)) {
      if (m.drive_file_id !== a.drive_file_id) fail(`variant ${key} Drive file id mismatch`);
      if (m.filename !== a.filename) fail(`variant ${key} Drive filename mismatch`);
      if (m.bytes !== a.bytes) fail(`variant ${key} Drive byte count mismatch`);
      if (m.sha256 !== a.sha256) fail(`variant ${key} Drive SHA256 mismatch`);
    }
  }

  if (driveReadback.verification_mode !== 'CENTRAL_FRESH_DRIVE_READBACK') {
    fail('Drive readback must be CENTRAL_FRESH_DRIVE_READBACK (LOCAL rclone evidence is corroboration only and cannot satisfy raw authority lock)');
  }
  for (const key of ['A', 'B']) {
    const entry = driveReadback.variants?.[key];
    if (!entry || typeof entry !== 'object') {
      fail(`Drive readback missing variant ${key}`);
      continue;
    }
    if (entry.folder_id !== manifest.authority?.drive_folder_id) fail(`Drive readback variant ${key} folder id mismatch`);
    if (entry.file_id !== mv?.[key]?.drive_file_id) fail(`Drive readback variant ${key} file id mismatch`);
    if (entry.filename !== mv?.[key]?.filename) fail(`Drive readback variant ${key} filename mismatch`);
    if (entry.bytes !== mv?.[key]?.bytes) fail(`Drive readback variant ${key} byte count mismatch`);
    if (entry.sha256 !== mv?.[key]?.sha256) fail(`Drive readback variant ${key} SHA256 mismatch`);
  }

  validateDualVariantSelector(manifest.variant_selector, failures, `${sourceId}: manifest`);
  if (authority.variant_selector !== undefined) {
    validateDualVariantSelector(authority.variant_selector, failures, `${sourceId}: authority`);
    if (JSON.stringify(authority.variant_selector) !== JSON.stringify(manifest.variant_selector)) fail('variant_selector drift between manifest and authority');
  }

  for (const [label, record] of [['manifest', manifest], ['authority', authority], ['drive-readback', driveReadback]]) {
    if (new RegExp(`${sourceId}-[AB]`).test(JSON.stringify(record))) fail(`${label} derives a variant Source identity`);
  }

  const shaPath = path.join(repoRoot, base, 'authority/sha256.txt');
  if (fs.existsSync(shaPath)) {
    const text = fs.readFileSync(shaPath, 'utf8');
    for (const key of ['A', 'B']) {
      if (typeof mv?.[key]?.sha256 === 'string' && !text.includes(mv[key].sha256)) fail(`sha256.txt missing variant ${key} hash`);
    }
  }

  for (const key of ['A', 'B']) requirePath(repoRoot, `${base}/original/${key}/original.html`, failures);
  for (const key of ['A', 'B']) {
    const originalPath = path.join(repoRoot, base, 'original', key, 'original.html');
    if (!fs.existsSync(originalPath)) continue;
    const original = fs.readFileSync(originalPath);
    if (typeof mv?.[key]?.bytes === 'number' && original.length !== mv[key].bytes) fail(`frozen original ${key} byte count drift`);
    if (typeof mv?.[key]?.sha256 === 'string' && sha256(original) !== mv[key].sha256) fail(`frozen original ${key} SHA256 drift`);
  }

  const stages = manifest.stages ?? {};
  const ordered = ['identity_verified', 'raw_authority_locked', 'baseline_captured', 'mechanical_split_complete', 'source_split_parity_pass'];
  let falseSeen = false;
  for (const stage of ordered) {
    if (typeof stages[stage] !== 'boolean') fail(`stage ${stage} must be boolean`);
    if (falseSeen && stages[stage] === true) fail(`stage ordering violated at ${stage}`);
    if (stages[stage] === false) falseSeen = true;
  }
  if (stages.identity_verified !== true || stages.raw_authority_locked !== true) fail('S0/S1 incomplete');

  if (stages.baseline_captured === true) {
    requirePath(repoRoot, `${base}/baseline/capture-plan.json`, failures);
    requirePath(repoRoot, `${base}/baseline/accepted-baseline.json`, failures);
    const acceptedBase = readJson(repoRoot, `${base}/baseline/accepted-baseline.json`, failures);
    if (!acceptedBase || acceptedBase.status !== 'ACCEPTED' || acceptedBase.source_id !== sourceId) fail('accepted baseline invalid');
    if (acceptedBase) {
      for (const key of ['A', 'B']) {
        if (acceptedBase.authority?.variants?.[key]?.sha256 !== mv?.[key]?.sha256 || acceptedBase.authority?.variants?.[key]?.bytes !== mv?.[key]?.bytes) {
          fail(`accepted baseline variant ${key} authority drift`);
        }
      }
    }
  }

  if (stages.mechanical_split_complete === true) {
    if (stages.baseline_captured !== true) fail('mechanical split cannot precede accepted baseline');
    for (const required of ['split/index.html', 'split/styles.css', 'split/script.js', 'split/materialization.json']) requirePath(repoRoot, `${base}/${required}`, failures);
    const materialization = readJson(repoRoot, `${base}/split/materialization.json`, failures);
    if (!materialization || !['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(materialization.status)) fail('invalid materialization status');
    if (materialization) {
      if (materialization.authority_mode !== 'DUAL_VARIANT') fail('materialization authority_mode must be DUAL_VARIANT');
      for (const key of ['A', 'B']) {
        if (materialization.authority?.variants?.[key]?.sha256 !== mv?.[key]?.sha256 || materialization.authority?.variants?.[key]?.bytes !== mv?.[key]?.bytes) {
          fail(`materialization variant ${key} authority drift`);
        }
      }
      if (materialization.variant_selector !== undefined && JSON.stringify(materialization.variant_selector) !== JSON.stringify(manifest.variant_selector)) {
        fail('variant_selector drift between manifest and materialization');
      }
    }
  }
  if (stages.source_split_parity_pass === true) {
    if (stages.mechanical_split_complete !== true) fail('parity cannot precede mechanical split');
    const parity = readJson(repoRoot, `${base}/evidence/parity/accepted-parity.json`, failures);
    if (!parity || parity.status !== 'ACCEPTED' || parity.source_id !== sourceId) fail('accepted parity evidence missing/invalid');
    if (parity) {
      for (const key of ['A', 'B']) {
        if (parity.authority?.variants?.[key]?.sha256 !== mv?.[key]?.sha256 || parity.authority?.variants?.[key]?.bytes !== mv?.[key]?.bytes) {
          fail(`parity variant ${key} authority drift`);
        }
      }
      validateAcceptedParityComparisons(sourceId, parity, failures);
    }
  }

  return failures;
}

/**
 * Validate the shared mechanical Source contract for every active phase.
 * Phase-specific scope is deliberately limited to calibration membership:
 * ROLLOUT accepts any registered SRCxxx capsule, while every capsule uses
 * this same identity, authority, stage-order, baseline, split, and parity gate.
 *
 * Stage requirements are cumulative rather than all-or-nothing. An S1-only
 * capsule is valid when identity + authority/original are complete and every
 * downstream stage remains false. S2/S3/S4 files become mandatory only when
 * the corresponding manifest stage is true.
 */
export function validateSourceCapsules({ repoRoot, sourceDirs, phase, calibrationSet }) {
  const failures = [];
  const fixedCalibrationSet = calibrationSet ?? new Set();

  if (phase === 'CALIBRATION') {
    if (!sourceDirs.includes('SRC056')) failures.push('CALIBRATION must include first calibration SRC056');
    if (sourceDirs.some((id) => !fixedCalibrationSet.has(id))) failures.push('CALIBRATION active Source must belong to fixed five-source batch');
  }

  for (const sourceId of sourceDirs) {
    const base = `src/03_sources/${sourceId}`;
    for (const required of [
      'manifest.json',
      'authority/authority.json',
      'authority/sha256.txt',
      'evidence/source/drive-authority-readback.json',
    ]) requirePath(repoRoot, `${base}/${required}`, failures);

    const manifest = readJson(repoRoot, `${base}/manifest.json`, failures);
    const authority = readJson(repoRoot, `${base}/authority/authority.json`, failures);
    const driveReadback = readJson(repoRoot, `${base}/evidence/source/drive-authority-readback.json`, failures);
    if (!manifest || !authority || !driveReadback) continue;

    const { mode: authorityMode, agreement: authorityModeAgreement } = resolveAuthorityMode(manifest, authority);
    if (!authorityModeAgreement) {
      failures.push(`${sourceId}: authority_mode disagreement between manifest and authority`);
      continue;
    }
    if (!authorityMode) {
      failures.push(`${sourceId}: unknown authority_mode`);
      continue;
    }
    if (authorityMode === 'DUAL_VARIANT') {
      failures.push(...validateDualVariantCapsule({ repoRoot, base, sourceId, manifest, authority, driveReadback }));
      continue;
    }

    for (const required of [
      'original/original.html',
    ]) requirePath(repoRoot, `${base}/${required}`, failures);

    const m = manifest.authority ?? {};
    const a = authority;
    const d = driveReadback.fresh_drive ?? {};
    if (manifest.source_id !== sourceId || a.source_id !== sourceId || driveReadback.source_id !== sourceId) failures.push(`${sourceId}: source_id identity drift`);
    if (m.drive_folder_id !== a.drive_folder_id || a.drive_folder_id !== d.folder_id) failures.push(`${sourceId}: Drive folder id mismatch`);
    if (m.drive_file_id !== a.drive_file_id || a.drive_file_id !== d.file_id) failures.push(`${sourceId}: Drive file id mismatch`);
    if (m.filename !== a.filename || a.filename !== d.filename) failures.push(`${sourceId}: Drive filename mismatch`);
    if (m.bytes !== a.bytes || a.bytes !== d.bytes) failures.push(`${sourceId}: Drive byte count mismatch`);
    if (m.sha256 !== a.sha256 || a.sha256 !== d.sha256) failures.push(`${sourceId}: Drive SHA256 mismatch`);
    if (a.authority_status !== 'LOCKED' || m.status !== 'LOCKED') failures.push(`${sourceId}: authority must be LOCKED`);
    if (driveReadback.verification_mode !== 'CENTRAL_FRESH_DRIVE_READBACK') failures.push(`${sourceId}: Drive readback mode drift`);

    const originalPath = path.join(repoRoot, base, 'original/original.html');
    if (fs.existsSync(originalPath)) {
      const original = fs.readFileSync(originalPath);
      if (original.length !== m.bytes) failures.push(`${sourceId}: frozen original byte count drift`);
      if (sha256(original) !== m.sha256) failures.push(`${sourceId}: frozen original SHA256 drift`);
    }
    const shaPath = path.join(repoRoot, base, 'authority/sha256.txt');
    if (fs.existsSync(shaPath) && !fs.readFileSync(shaPath, 'utf8').trim().startsWith(m.sha256)) failures.push(`${sourceId}: sha256.txt mismatch`);

    const stages = manifest.stages ?? {};
    const ordered = ['identity_verified', 'raw_authority_locked', 'baseline_captured', 'mechanical_split_complete', 'source_split_parity_pass'];
    let falseSeen = false;
    for (const stage of ordered) {
      if (typeof stages[stage] !== 'boolean') failures.push(`${sourceId}: stage ${stage} must be boolean`);
      if (falseSeen && stages[stage] === true) failures.push(`${sourceId}: stage ordering violated at ${stage}`);
      if (stages[stage] === false) falseSeen = true;
    }
    if (stages.identity_verified !== true || stages.raw_authority_locked !== true) failures.push(`${sourceId}: S0/S1 incomplete`);

    if (stages.baseline_captured === true) {
      requirePath(repoRoot, `${base}/baseline/capture-plan.json`, failures);
      requirePath(repoRoot, `${base}/baseline/accepted-baseline.json`, failures);
      const acceptedBase = readJson(repoRoot, `${base}/baseline/accepted-baseline.json`, failures);
      if (!acceptedBase || acceptedBase.status !== 'ACCEPTED' || acceptedBase.source_id !== sourceId) failures.push(`${sourceId}: accepted baseline invalid`);
    }

    if (stages.mechanical_split_complete === true) {
      if (stages.baseline_captured !== true) failures.push(`${sourceId}: mechanical split cannot precede accepted baseline`);
      for (const required of ['split/index.html', 'split/styles.css', 'split/script.js', 'split/materialization.json']) requirePath(repoRoot, `${base}/${required}`, failures);
      const materialization = readJson(repoRoot, `${base}/split/materialization.json`, failures);
      if (!materialization || !['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(materialization.status)) failures.push(`${sourceId}: invalid materialization status`);
      if (materialization && (materialization.authority?.bytes !== m.bytes || materialization.authority?.sha256 !== m.sha256)) failures.push(`${sourceId}: materialization authority drift`);
    }
    if (stages.source_split_parity_pass === true) {
      if (stages.mechanical_split_complete !== true) failures.push(`${sourceId}: parity cannot precede mechanical split`);
      const parity = readJson(repoRoot, `${base}/evidence/parity/accepted-parity.json`, failures);
      if (!parity || parity.status !== 'ACCEPTED' || parity.source_id !== sourceId) failures.push(`${sourceId}: accepted parity evidence missing/invalid`);
      if (parity && (parity.authority?.bytes !== m.bytes || parity.authority?.sha256 !== m.sha256)) failures.push(`${sourceId}: parity authority drift`);
      if (parity) validateAcceptedParityComparisons(sourceId, parity, failures);
    }
  }

  return failures;
}
