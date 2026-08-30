#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assert, readJson } from './source-gate-lib.mjs';

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(target));
    else if (entry.isFile()) out.push(target);
  }
  return out;
}

function isTextRuntimeFile(filePath) {
  return ['.html', '.css', '.js', '.mjs', '.json'].includes(path.extname(filePath).toLowerCase());
}

export function validateRuntimePolicy(capsuleRootInput) {
  const capsuleRoot = path.resolve(capsuleRootInput);
  const capsuleId = path.basename(capsuleRoot);
  assert(/^SRC[0-9]{3}$/.test(capsuleId), `invalid capsule directory: ${capsuleId}`);

  const manifestPath = path.join(capsuleRoot, `${capsuleId}-00-manifest.json`);
  assert(fs.existsSync(manifestPath), `manifest missing: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  const runtimeRoot = path.join(capsuleRoot, `${capsuleId}-02-runtime`);
  const files = walkFiles(runtimeRoot);

  if (files.length === 0) return { capsuleId, runtimeFiles: 0 };

  assert(
    manifest.WORKFLOW_STATUS?.BASELINE_A_PRESENT === 'PASS',
    `S3 work cannot begin before S2 PASS: runtime files exist while BASELINE_A_PRESENT=${manifest.WORKFLOW_STATUS?.BASELINE_A_PRESENT ?? 'MISSING'}`
  );

  const forbiddenExtensions = new Set(['.ts', '.tsx', '.jsx', '.vue', '.svelte']);
  const forbiddenFiles = files.filter((file) => forbiddenExtensions.has(path.extname(file).toLowerCase()));
  assert(
    forbiddenFiles.length === 0,
    `STRUCTURAL_SPLIT_FRAMEWORK_CONVERSION_FORBIDDEN: ${forbiddenFiles.map((file) => path.relative(capsuleRoot, file)).join(', ')}`
  );

  const frameworkPatterns = [
    /(?:from\s*|import\s*)["']react(?:["'/]|$)/,
    /(?:from\s*|import\s*)["']react-dom(?:["'/]|$)/,
    /(?:from\s*|import\s*)["']next(?:["'/]|$)/,
    /require\s*\(\s*["']react(?:-dom)?["']\s*\)/,
    /ReactDOM\.(?:createRoot|render)\s*\(/
  ];

  const frameworkHits = [];
  for (const file of files.filter(isTextRuntimeFile)) {
    const text = fs.readFileSync(file, 'utf8');
    if (frameworkPatterns.some((pattern) => pattern.test(text))) {
      frameworkHits.push(path.relative(capsuleRoot, file));
    }
  }
  assert(
    frameworkHits.length === 0,
    `STRUCTURAL_SPLIT_REACT_NEXT_FORBIDDEN: ${frameworkHits.join(', ')}`
  );

  return { capsuleId, runtimeFiles: files.length };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: node scripts/new/validate-source-runtime-policy.mjs <new/sources/SRCxxx> [...]');
    process.exitCode = 2;
    return;
  }
  try {
    for (const item of args) {
      const result = validateRuntimePolicy(item);
      console.log(`SOURCE_RUNTIME_POLICY=PASS CAPSULE=${result.capsuleId} FILES=${result.runtimeFiles}`);
    }
  } catch (error) {
    console.error(`SOURCE_RUNTIME_POLICY=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
