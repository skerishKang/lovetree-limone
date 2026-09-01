#!/usr/bin/env node
/**
 * generation-phase-guard.mjs
 *
 * Fail-closed guard for the current clean-generation mechanical source phase.
 * Enforces that active src/ contains no TS/TSX/JSX files, no premature
 * component records beyond README.md, and no premature MVP compositions
 * beyond README.md.
 *
 * Exit 0 = PASS, Exit 1 = FAIL (any violation).
 *
 * Runtime: .mjs only — TS/TSX forbidden in current phase.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const SRC_ROOT = join(import.meta.dirname, '..');
const ROOT = join(SRC_ROOT, '..');

const FORBIDDEN_EXTENSIONS = new Set(['.ts', '.tsx', '.jsx']);

/** Directories that may only contain README.md under current phase */
const README_ONLY_DIRS = [
  'src/06_components',
  'src/07_compositions',
];

/** Files/dirs that must not exist in active src under current phase */
const FORBIDDEN_PATTERNS = [
  'src/06_components/source*-*/',
  'src/07_compositions/MVP*/',
  'src/08_harness/validate-mvp*.mjs',
  'tests/mvp*-composition-contract.test.mjs',
];

let violations = [];

/**
 * Recursively collect all files under a directory.
 */
function walkDir(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        walkDir(full, files);
      } else if (st.isFile()) {
        files.push(full);
      }
    } catch {
      // skip unreadable entries
    }
  }
  return files;
}

/**
 * Check 1: No .ts/.tsx/.jsx files anywhere in src/
 */
function checkNoTypeScriptInSrc() {
  const allFiles = walkDir(join(ROOT, 'src'));
  const tsFiles = allFiles.filter(f => FORBIDDEN_EXTENSIONS.has(extname(f).toLowerCase()));
  for (const f of tsFiles) {
    violations.push(`FORBIDDEN_EXT: ${relative(ROOT, f)} — .ts/.tsx/.jsx not allowed in src/ during current phase`);
  }
  if (tsFiles.length === 0) {
    console.log('PASS: No .ts/.tsx/.jsx files in src/');
  }
}

/**
 * Check 2: src/06_components/ — only README.md allowed
 */
function checkComponentsReadOnly() {
  const dir = join(ROOT, 'src/06_components');
  if (!existsSync(dir)) {
    console.log('PASS: src/06_components/ does not exist');
    return;
  }
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'README.md') continue;
    violations.push(`FORBIDDEN_COMPONENT: src/06_components/${entry} — only README.md allowed in current phase`);
  }
  if (entries.every(e => e === 'README.md')) {
    console.log('PASS: src/06_components/ contains only README.md');
  }
}

/**
 * Check 3: src/07_compositions/ — only README.md allowed
 */
function checkCompositionsReadOnly() {
  const dir = join(ROOT, 'src/07_compositions');
  if (!existsSync(dir)) {
    console.log('PASS: src/07_compositions/ does not exist');
    return;
  }
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'README.md') continue;
    violations.push(`FORBIDDEN_COMPOSITION: src/07_compositions/${entry} — only README.md allowed in current phase`);
  }
  if (entries.every(e => e === 'README.md')) {
    console.log('PASS: src/07_compositions/ contains only README.md');
  }
}

/**
 * Check 4: No MVP001/MVP* composition in active src
 */
function checkNoMVPInSrc() {
  const allFiles = walkDir(join(ROOT, 'src'));
  const mvpFiles = allFiles.filter(f => /mvp\d/i.test(f));
  for (const f of mvpFiles) {
    // Exception: the guard script itself in harness is fine, but MVP composition/validator files are not
    const rel = relative(ROOT, f);
    if (rel.startsWith('src/08_harness/generation-phase-guard')) continue;
    violations.push(`FORBIDDEN_MVP: ${rel} — MVP composition/validator not allowed in active src during current phase`);
  }
  if (mvpFiles.filter(f => !relative(ROOT, f).includes('generation-phase-guard')).length === 0) {
    console.log('PASS: No MVP composition/validator files in active src');
  }
}

// --- Execute all checks ---
console.log('=== Generation Phase Guard (fail-closed) ===');
console.log(`SRC_ROOT: ${relative(ROOT, SRC_ROOT)}`);
console.log('');

checkNoTypeScriptInSrc();
checkComponentsReadOnly();
checkCompositionsReadOnly();
checkNoMVPInSrc();

console.log('');
if (violations.length > 0) {
  console.log(`FAIL: ${violations.length} violation(s) detected:`);
  for (const v of violations) {
    console.log(`  - ${v}`);
  }
  console.log('');
  console.log('GENERATION_PHASE_GUARD = FAIL');
  process.exit(1);
} else {
  console.log('GENERATION_PHASE_GUARD = PASS');
  process.exit(0);
}
