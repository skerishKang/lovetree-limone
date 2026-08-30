#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { assert, assertString, readJson } from './source-gate-lib.mjs';
import { validateCapsule } from './validate-source-capsule.mjs';

const args = process.argv.slice(2);
const repoRoot = process.cwd();

export function validateVersionComposition(filePathInput) {
  const filePath = path.resolve(filePathInput);
  assert(fs.existsSync(filePath), `composition manifest missing: ${filePath}`);
  const composition = readJson(filePath);
  const allowed = ['schema_version', 'version', 'name', 'sources', 'created'];
  const extras = Object.keys(composition).filter((key) => !allowed.includes(key));
  assert(extras.length === 0, `composition contains unsupported keys: ${extras.join(', ')}`);
  for (const key of allowed) assert(Object.hasOwn(composition, key), `composition.${key} is required`);
  assert(composition.schema_version === '1.0', 'composition schema_version must be 1.0');
  assertString(composition.version, 'composition.version', { pattern: /^v[0-9]+(?:[.-][A-Za-z0-9]+)*$/ });
  assertString(composition.name, 'composition.name');
  assertString(composition.created, 'composition.created');
  assert(composition.sources && typeof composition.sources === 'object' && !Array.isArray(composition.sources), 'composition.sources must be an object');
  assert(Object.keys(composition.sources).length > 0, 'composition.sources cannot be empty');

  const results = [];
  for (const [role, capsuleId] of Object.entries(composition.sources)) {
    assertString(role, 'composition source role');
    assertString(capsuleId, `composition.sources.${role}`, { pattern: /^SRC[0-9]{3}$/ });
    const capsuleRoot = path.join(repoRoot, 'new', 'sources', capsuleId);
    assert(fs.existsSync(capsuleRoot), `composition references missing capsule ${capsuleId}`);
    const result = validateCapsule(capsuleRoot);
    assert(result.workflow.SOURCE_PORT_PARITY === 'PASS', `composition source ${capsuleId} is not S4 PASS`);
    results.push({ role, capsuleId });
  }
  return { version: composition.version, sources: results };
}

if (args.length === 0) {
  console.error('usage: node scripts/new/validate-version-composition.mjs <composition.json> [...]');
  process.exit(2);
}

try {
  for (const file of args) {
    const result = validateVersionComposition(file);
    console.log(`VERSION_COMPOSITION_GATE=PASS VERSION=${result.version} SOURCES=${result.sources.map((item) => item.capsuleId).join(',')}`);
  }
} catch (error) {
  console.error(`VERSION_COMPOSITION_GATE=FAIL ${error.message}`);
  process.exit(1);
}
