#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA40 = /^[a-f0-9]{40}$/;
const CAPSULE = /^SRC[0-9]{3}$/;
const ALLOWED_GATE = new Set(['PASS', 'FAIL', 'UNKNOWN', 'MISSING']);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function aggregateSourceFreshness(input) {
  invariant(input && typeof input === 'object' && !Array.isArray(input), 'aggregate input must be an object');
  const allowed = ['SCHEMA_VERSION', 'HEAD_SHA', 'BASE_SHA', 'APPLICABILITY', 'REASON', 'CAPSULE_RESULTS'];
  const extras = Object.keys(input).filter((key) => !allowed.includes(key));
  invariant(extras.length === 0, `unsupported aggregate keys: ${extras.join(', ')}`);
  for (const key of allowed) invariant(Object.hasOwn(input, key), `aggregate.${key} is required`);

  invariant(input.SCHEMA_VERSION === '1.0', 'aggregate schema must be 1.0');
  invariant(typeof input.HEAD_SHA === 'string' && SHA40.test(input.HEAD_SHA), 'HEAD_SHA must be a full lowercase git SHA');
  invariant(typeof input.BASE_SHA === 'string' && SHA40.test(input.BASE_SHA), 'BASE_SHA must be a full lowercase git SHA');
  invariant(input.HEAD_SHA !== input.BASE_SHA, 'HEAD_SHA and BASE_SHA must differ');
  invariant(['APPLICABLE', 'NOT_APPLICABLE'].includes(input.APPLICABILITY), 'APPLICABILITY invalid');
  invariant(typeof input.REASON === 'string' && input.REASON.trim().length > 0, 'REASON is required');
  invariant(Array.isArray(input.CAPSULE_RESULTS), 'CAPSULE_RESULTS must be an array');

  const seen = new Set();
  for (const [index, row] of input.CAPSULE_RESULTS.entries()) {
    invariant(row && typeof row === 'object' && !Array.isArray(row), `CAPSULE_RESULTS[${index}] must be object`);
    const rowAllowed = ['CAPSULE_ID', 'CAPSULE_GATE', 'LIVE_AUTHORITY_GATE'];
    const rowExtras = Object.keys(row).filter((key) => !rowAllowed.includes(key));
    invariant(rowExtras.length === 0, `CAPSULE_RESULTS[${index}] unsupported keys: ${rowExtras.join(', ')}`);
    for (const key of rowAllowed) invariant(Object.hasOwn(row, key), `CAPSULE_RESULTS[${index}].${key} is required`);
    invariant(typeof row.CAPSULE_ID === 'string' && CAPSULE.test(row.CAPSULE_ID), `CAPSULE_RESULTS[${index}].CAPSULE_ID invalid`);
    invariant(!seen.has(row.CAPSULE_ID), `duplicate capsule result: ${row.CAPSULE_ID}`);
    seen.add(row.CAPSULE_ID);
    invariant(ALLOWED_GATE.has(row.CAPSULE_GATE), `CAPSULE_RESULTS[${index}].CAPSULE_GATE invalid`);
    invariant(ALLOWED_GATE.has(row.LIVE_AUTHORITY_GATE), `CAPSULE_RESULTS[${index}].LIVE_AUTHORITY_GATE invalid`);
  }

  if (input.APPLICABILITY === 'NOT_APPLICABLE') {
    invariant(input.CAPSULE_RESULTS.length === 0, 'NOT_APPLICABLE must not carry capsule results');
    return {
      SCHEMA_VERSION: '1.0',
      HEAD_SHA: input.HEAD_SHA,
      BASE_SHA: input.BASE_SHA,
      VERDICT: 'NOT_APPLICABLE',
      REASON: input.REASON,
      CAPSULES: []
    };
  }

  if (input.CAPSULE_RESULTS.length === 0) {
    return {
      SCHEMA_VERSION: '1.0',
      HEAD_SHA: input.HEAD_SHA,
      BASE_SHA: input.BASE_SHA,
      VERDICT: 'UNKNOWN',
      REASON: input.REASON,
      CAPSULES: []
    };
  }

  let verdict = 'PASS';
  for (const row of input.CAPSULE_RESULTS) {
    const states = [row.CAPSULE_GATE, row.LIVE_AUTHORITY_GATE];
    if (states.includes('FAIL')) {
      verdict = 'FAIL';
      break;
    }
    if (states.includes('UNKNOWN') || states.includes('MISSING')) verdict = 'UNKNOWN';
  }

  return {
    SCHEMA_VERSION: '1.0',
    HEAD_SHA: input.HEAD_SHA,
    BASE_SHA: input.BASE_SHA,
    VERDICT: verdict,
    REASON: input.REASON,
    CAPSULES: [...seen].sort()
  };
}

function selfTest() {
  const base = 'b'.repeat(40);
  const head = 'a'.repeat(40);
  const pass = aggregateSourceFreshness({
    SCHEMA_VERSION: '1.0', HEAD_SHA: head, BASE_SHA: base,
    APPLICABILITY: 'APPLICABLE', REASON: 'SRC056 changed',
    CAPSULE_RESULTS: [{ CAPSULE_ID: 'SRC056', CAPSULE_GATE: 'PASS', LIVE_AUTHORITY_GATE: 'PASS' }]
  });
  invariant(pass.VERDICT === 'PASS', 'self-test PASS aggregation failed');

  const unknown = aggregateSourceFreshness({
    SCHEMA_VERSION: '1.0', HEAD_SHA: head, BASE_SHA: base,
    APPLICABILITY: 'APPLICABLE', REASON: 'SRC056 changed',
    CAPSULE_RESULTS: [{ CAPSULE_ID: 'SRC056', CAPSULE_GATE: 'PASS', LIVE_AUTHORITY_GATE: 'MISSING' }]
  });
  invariant(unknown.VERDICT === 'UNKNOWN', 'self-test UNKNOWN aggregation failed');

  const unknownNoEvidence = aggregateSourceFreshness({
    SCHEMA_VERSION: '1.0', HEAD_SHA: head, BASE_SHA: base,
    APPLICABILITY: 'APPLICABLE', REASON: 'Source-facing paths changed but trusted evidence is unavailable',
    CAPSULE_RESULTS: []
  });
  invariant(unknownNoEvidence.VERDICT === 'UNKNOWN', 'self-test empty applicable aggregation must be UNKNOWN');

  const fail = aggregateSourceFreshness({
    SCHEMA_VERSION: '1.0', HEAD_SHA: head, BASE_SHA: base,
    APPLICABILITY: 'APPLICABLE', REASON: 'SRC056 changed',
    CAPSULE_RESULTS: [{ CAPSULE_ID: 'SRC056', CAPSULE_GATE: 'FAIL', LIVE_AUTHORITY_GATE: 'PASS' }]
  });
  invariant(fail.VERDICT === 'FAIL', 'self-test FAIL aggregation failed');

  const na = aggregateSourceFreshness({
    SCHEMA_VERSION: '1.0', HEAD_SHA: head, BASE_SHA: base,
    APPLICABILITY: 'NOT_APPLICABLE', REASON: 'no Source-facing paths changed', CAPSULE_RESULTS: []
  });
  invariant(na.VERDICT === 'NOT_APPLICABLE', 'self-test NOT_APPLICABLE aggregation failed');
  console.log('DESIGN_SOURCE_FRESHNESS_AGGREGATOR_SELF_TEST=PASS');
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') {
    selfTest();
    return;
  }
  if (args.length !== 1) {
    console.error('usage: node scripts/new/aggregate-source-freshness.mjs <input.json> | --self-test');
    process.exitCode = 2;
    return;
  }
  try {
    const input = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const output = aggregateSourceFreshness(input);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    if (output.VERDICT === 'FAIL' || output.VERDICT === 'UNKNOWN') process.exitCode = 1;
  } catch (error) {
    console.error(`DESIGN_SOURCE_FRESHNESS=FAIL ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
