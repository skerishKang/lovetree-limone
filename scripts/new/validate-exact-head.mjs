#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;

export function assertExactHeadBinding(actualHeadSha, expectedHeadSha) {
  if (!FULL_SHA.test(actualHeadSha ?? '')) {
    throw new Error(`EXACT_HEAD_BINDING_FAIL invalid actual SHA: ${actualHeadSha ?? 'MISSING'}`);
  }
  if (!FULL_SHA.test(expectedHeadSha ?? '')) {
    throw new Error(`EXACT_HEAD_BINDING_FAIL invalid expected SHA: ${expectedHeadSha ?? 'MISSING'}`);
  }
  if (actualHeadSha !== expectedHeadSha) {
    throw new Error(`EXACT_HEAD_BINDING_FAIL expected=${expectedHeadSha} actual=${actualHeadSha}`);
  }
  return true;
}

export function readCurrentHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function runCli() {
  const expectedHeadSha = process.argv[2];
  if (!expectedHeadSha) {
    console.error('usage: node scripts/new/validate-exact-head.mjs <expected-full-head-sha>');
    process.exitCode = 2;
    return;
  }

  try {
    const actualHeadSha = readCurrentHead();
    assertExactHeadBinding(actualHeadSha, expectedHeadSha);
    console.log(`EXACT_HEAD_BINDING=PASS HEAD_SHA=${actualHeadSha}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
