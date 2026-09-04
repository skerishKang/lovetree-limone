/**
 * Canonical output-path safety regressions for CLEAN-108 analyzer CLI.
 *
 * These tests prove that symlink/junction aliases cannot tunnel --out back
 * into authority/manifest/Source-capsule ownership. They are intentionally
 * non-browser tests and are auto-discovered by A-track validation.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const ANALYZER_CLI = path.join(REPO_ROOT, 'src/08_harness/analyze-source-authority.mjs');

function runCliReject(args, expectedMarker) {
  let code = 0;
  let stderr = '';
  try {
    execFileSync('node', [ANALYZER_CLI, ...args], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    code = typeof error.status === 'number' ? error.status : -1;
    stderr = String(error.stderr ?? '');
  }
  assert.notEqual(code, 0, `CLI must exit non-zero on rejection; args=${JSON.stringify(args)}`);
  assert.ok(stderr.includes(expectedMarker), `stderr must include ${expectedMarker}; got: ${JSON.stringify(stderr)}`);
}

function createDirectoryAlias(target, link) {
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

function bytesAndMtime(file) {
  return { bytes: fs.readFileSync(file), mtimeMs: fs.statSync(file).mtimeMs };
}

function assertUnchanged(file, before, label) {
  assert.deepEqual(fs.readFileSync(file), before.bytes, `${label} bytes changed`);
  assert.equal(fs.statSync(file).mtimeMs, before.mtimeMs, `${label} mtime changed`);
}

test('OUTPUT_SYMLINK_ALIAS_TO_AUTHORITY_REJECTED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const before = bytesAndMtime(authority);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-output-authority-alias-'));
  try {
    const aliasParent = path.join(tmp, 'authority-parent');
    createDirectoryAlias(path.dirname(authority), aliasParent);
    const out = path.join(aliasParent, path.basename(authority));
    runCliReject(['--input', authority, '--out', out], 'OUTPUT_EQUALS_INPUT_REJECTED');
    assertUnchanged(authority, before, 'authority');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('OUTPUT_SYMLINK_ALIAS_TO_MANIFEST_REJECTED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC068/original/A/original.html');
  const manifest = path.join(REPO_ROOT, 'src/03_sources/SRC068/manifest.json');
  const before = bytesAndMtime(manifest);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-output-manifest-alias-'));
  try {
    const aliasParent = path.join(tmp, 'manifest-parent');
    createDirectoryAlias(path.dirname(manifest), aliasParent);
    const out = path.join(aliasParent, path.basename(manifest));
    runCliReject(
      ['--input', authority, '--manifest', manifest, '--out', out],
      'OUTPUT_EQUALS_MANIFEST_REJECTED',
    );
    assertUnchanged(manifest, before, 'manifest');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('OUTPUT_SYMLINK_PARENT_INTO_SRC03_REJECTED_WITHOUT_DIRECTORY_CREATION', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const sourceDir = path.join(REPO_ROOT, 'src/03_sources/SRC056');
  const probeName = `output-path-probe-${process.pid}-${Date.now()}`;
  const protectedProbeDir = path.join(sourceDir, probeName);
  assert.equal(fs.existsSync(protectedProbeDir), false, 'probe path must start absent');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-output-parent-alias-'));
  try {
    const aliasParent = path.join(tmp, 'src056-alias');
    createDirectoryAlias(sourceDir, aliasParent);
    const out = path.join(aliasParent, probeName, 'nested', 'analysis.json');
    runCliReject(['--input', authority, '--out', out], 'OUTPUT_UNDER_SRC03_REJECTED');
    assert.equal(fs.existsSync(protectedProbeDir), false, 'rejection must not create a directory under Source ownership');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('OUTPUT_SYMLINK_PARENT_TO_SAFE_TEMP_TARGET_ALLOWED', () => {
  const authority = path.join(REPO_ROOT, 'src/03_sources/SRC056/original/original.html');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clean108-output-safe-alias-'));
  try {
    const realDir = path.join(tmp, 'real-output');
    const aliasDir = path.join(tmp, 'alias-output');
    fs.mkdirSync(realDir, { recursive: true });
    createDirectoryAlias(realDir, aliasDir);
    const out = path.join(aliasDir, 'analysis.json');
    execFileSync('node', [ANALYZER_CLI, '--input', authority, '--source-id', 'SRC056', '--out', out], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    assert.equal(fs.existsSync(path.join(realDir, 'analysis.json')), true, 'safe canonical target should receive analysis output');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});