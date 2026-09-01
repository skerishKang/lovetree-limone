#!/usr/bin/env node
/**
 * generation-phase-guard.mjs
 *
 * Fail-closed guard for the current clean-generation mechanical source phase.
 * Enforces that active src/ contains no TS/TSX/JSX files, no premature
 * component records beyond README.md, no premature MVP compositions
 * beyond README.md, and no reintroduced clean-generation MVP composition
 * contract tests under tests/.
 *
 * Exit 0 = PASS, Exit 1 = FAIL (any violation).
 *
 * Runtime: .mjs only — TS/TSX forbidden in current phase.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const SRC_ROOT = join(import.meta.dirname, '..');
const ROOT = join(SRC_ROOT, '..');

const FORBIDDEN_EXTENSIONS = new Set(['.ts', '.tsx', '.jsx']);

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
 * Check 4: No active MVP composition/validator artifacts under src/
 * Rejects files like validate-mvp*.mjs or MVP* directories.
 * Exception: this guard script itself.
 */
function checkNoMVPInSrc() {
  const allFiles = walkDir(join(ROOT, 'src'));
  const mvpFiles = allFiles.filter(f => {
    const rel = relative(ROOT, f);
    if (rel.startsWith('src/08_harness/generation-phase-guard')) return false;
    return /mvp\d/i.test(f);
  });
  for (const f of mvpFiles) {
    violations.push(`FORBIDDEN_MVP: ${relative(ROOT, f)} — MVP composition/validator not allowed in active src during current phase`);
  }
  if (mvpFiles.length === 0) {
    console.log('PASS: No MVP composition/validator files in active src');
  }
}

/**
 * Check 5: No reintroduced clean-generation MVP composition contract tests
 * Scoped specifically to mvpNNN-composition-contract.test.mjs patterns
 * (or equivalently named clean-generation MVP composition contract artifacts).
 */
function checkNoMVPCompositionTests() {
  const testsDir = join(ROOT, 'tests');
  if (!existsSync(testsDir)) {
    console.log('PASS: tests/ directory does not exist');
    return;
  }
  const allTestFiles = walkDir(testsDir);
  const forbidden = allTestFiles.filter(f => {
    const name = basename(f);
    // Match clean-generation MVP composition contract test pattern:
    // mvp001-composition-contract.test.mjs, mvpNNN-composition-contract.test.mjs, etc.
    return /^mvp\d+-composition-contract\.test\.mjs$/i.test(name);
  });
  for (const f of forbidden) {
    violations.push(`FORBIDDEN_TEST: ${relative(ROOT, f)} — clean-generation MVP composition contract test not allowed during current phase`);
  }
  if (forbidden.length === 0) {
    console.log('PASS: No clean-generation MVP composition contract tests in tests/');
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
checkNoMVPCompositionTests();

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
