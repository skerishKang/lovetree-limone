#!/usr/bin/env node
/**
 * scripts/materialize-mvp001.mjs
 *
 * Deterministic, fail-closed materializer for MVP001.
 * Copies runtime split files from canonical source authority in src/03_sources/
 * into isolated public surfaces under public/mvp/01/surfaces/.
 *
 * Rules:
 * - Byte-for-byte exact copy.
 * - No transforms, no line-ending changes, no beautification, no minification.
 * - Every copied file is verified with SHA256 and byte-length equality.
 * - Fail closed on any discrepancy or missing file.
 */

import { readdirSync, statSync, copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(import.meta.dirname, '..');
const SOURCES_ROOT = join(ROOT, 'src/03_sources');
const TARGET_ROOT = join(ROOT, 'public/mvp/01/surfaces');

const SOURCES = [
  { id: 'SRC064', surface: 'src064', role: 'entry' },
  { id: 'SRC058', surface: 'src058', role: 'board' },
  { id: 'SRC056', surface: 'src056', role: 'relationships' },
  { id: 'SRC057', surface: 'src057', role: 'memory' },
  { id: 'SRC060', surface: 'src060', role: 'explore' },
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function collectFiles(dir, base = dir, list = []) {
  if (!existsSync(dir)) return list;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, base, list);
    } else if (st.isFile()) {
      // Exclude split metadata if we only want runtime surface files, or include all runtime files
      // index.html, styles.css, script.js, and any assets
      const rel = relative(base, full).replace(/\\/g, '/');
      if (rel !== 'materialization.json') {
        list.push({ full, rel });
      }
    }
  }
  return list;
}

console.log('=== MVP001 Deterministic Materializer ===');
console.log(`Source Root: ${relative(ROOT, SOURCES_ROOT)}`);
console.log(`Target Root: ${relative(ROOT, TARGET_ROOT)}\n`);

const report = [];
let failures = 0;

for (const { id, surface, role } of SOURCES) {
  const splitDir = join(SOURCES_ROOT, id, 'split');
  const targetDir = join(TARGET_ROOT, surface);

  if (!existsSync(splitDir)) {
    console.error(`FAIL: Missing split directory for ${id} at ${splitDir}`);
    process.exit(1);
  }

  const files = collectFiles(splitDir);
  if (files.length === 0) {
    console.error(`FAIL: No split files found for ${id}`);
    process.exit(1);
  }

  // Required core files
  const coreFiles = ['index.html', 'styles.css', 'script.js'];
  for (const core of coreFiles) {
    if (!files.some(f => f.rel === core)) {
      console.error(`FAIL: Missing required core file ${core} in ${id}/split`);
      process.exit(1);
    }
  }

  for (const { full: srcFull, rel } of files) {
    const dstFull = join(targetDir, rel);
    mkdirSync(dirname(dstFull), { recursive: true });

    // Read source
    const srcBuf = readFileSync(srcFull);
    const srcBytes = srcBuf.length;
    const srcHash = sha256(srcBuf);

    // Copy byte-for-byte
    copyFileSync(srcFull, dstFull);

    // Read destination and verify
    const dstBuf = readFileSync(dstFull);
    const dstBytes = dstBuf.length;
    const dstHash = sha256(dstBuf);

    const bytesMatch = srcBytes === dstBytes;
    const hashMatch = srcHash === dstHash;
    const match = bytesMatch && hashMatch;

    if (!match) {
      failures++;
    }

    report.push({
      source_id: id,
      role,
      rel_path: `${surface}/${rel}`,
      source_bytes: srcBytes,
      output_bytes: dstBytes,
      source_sha256: srcHash,
      output_sha256: dstHash,
      match: match ? 'PASS' : 'FAIL',
    });
  }
}

console.log('| Source | Role | Relative Surface Path | Bytes | SHA256 (first 12) | Status |');
console.log('|---|---|---|---|---|---|');
for (const r of report) {
  console.log(`| ${r.source_id} | ${r.role} | ${r.rel_path} | ${r.output_bytes} | ${r.output_sha256.slice(0, 12)}... | ${r.match} |`);
}

console.log(`\nTotal Materialized Files: ${report.length}`);
console.log(`Failures: ${failures}`);

if (failures > 0) {
  console.error('\nMATERIALIZATION_FAIL_CLOSED: Byte or hash mismatch detected!');
  process.exit(1);
} else {
  console.log('\nMATERIALIZATION_HASH_PARITY = PASS');
}
