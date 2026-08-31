import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Validate the shared mechanical Source contract for every active phase.
 * Phase-specific scope is deliberately limited to calibration membership:
 * ROLLOUT accepts any registered SRCxxx capsule, while every capsule uses
 * this same identity, authority, stage-order, baseline, split, and parity gate.
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
      'original/original.html',
      'baseline/capture-plan.json',
      'baseline/accepted-baseline.json',
      'evidence/source/drive-authority-readback.json',
    ]) requirePath(repoRoot, `${base}/${required}`, failures);

    const manifest = readJson(repoRoot, `${base}/manifest.json`, failures);
    const authority = readJson(repoRoot, `${base}/authority/authority.json`, failures);
    const driveReadback = readJson(repoRoot, `${base}/evidence/source/drive-authority-readback.json`, failures);
    if (!manifest || !authority || !driveReadback) continue;

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

    const acceptedBase = readJson(repoRoot, `${base}/baseline/accepted-baseline.json`, failures);
    if (!acceptedBase || acceptedBase.status !== 'ACCEPTED' || acceptedBase.source_id !== sourceId) failures.push(`${sourceId}: accepted baseline invalid`);
    if (stages.baseline_captured !== true) failures.push(`${sourceId}: baseline_captured must be true before S3`);

    if (stages.mechanical_split_complete === true) {
      for (const required of ['split/index.html', 'split/styles.css', 'split/script.js', 'split/materialization.json']) requirePath(repoRoot, `${base}/${required}`, failures);
      const materialization = readJson(repoRoot, `${base}/split/materialization.json`, failures);
      if (!materialization || !['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(materialization.status)) failures.push(`${sourceId}: invalid materialization status`);
      if (materialization && (materialization.authority?.bytes !== m.bytes || materialization.authority?.sha256 !== m.sha256)) failures.push(`${sourceId}: materialization authority drift`);
    }
    if (stages.source_split_parity_pass === true) {
      const parity = readJson(repoRoot, `${base}/evidence/parity/accepted-parity.json`, failures);
      if (!parity || parity.status !== 'ACCEPTED' || parity.source_id !== sourceId) failures.push(`${sourceId}: accepted parity evidence missing/invalid`);
      if (parity && (parity.authority?.bytes !== m.bytes || parity.authority?.sha256 !== m.sha256)) failures.push(`${sourceId}: parity authority drift`);
      const comps = parity?.comparisons ?? {};
      const allowedGeometry = ['EQUAL', 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS'];
      const allowedScreenshots = ['BYTE_IDENTICAL', 'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST'];
      if (comps.dom !== 'EQUAL' || !allowedGeometry.includes(comps.geometry) || !allowedGeometry.includes(comps.computed_style) || comps.runtime_state !== 'EQUAL' || comps.interactions !== 'EQUAL' || !allowedScreenshots.includes(comps.screenshots)) failures.push(`${sourceId}: parity comparison is not fully PASS`);
      if (parity?.browser_errors !== 0) failures.push(`${sourceId}: parity browser errors present`);
    }
  }

  return failures;
}
