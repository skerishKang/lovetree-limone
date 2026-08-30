#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { authoritySummary, readJson, stableJson, validateAuthorityRecord } from './source-gate-lib.mjs';

const [authorityPathArg, summaryPathArg] = process.argv.slice(2);
if (!authorityPathArg || !summaryPathArg) {
  console.error('usage: node scripts/new/generate-source-authority-summary.mjs <authority.json> <summary.json>');
  process.exit(2);
}

const authorityPath = path.resolve(authorityPathArg);
const summaryPath = path.resolve(summaryPathArg);
const authority = readJson(authorityPath);
validateAuthorityRecord(authority);
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, stableJson(authoritySummary(authority)));
console.log(`SOURCE_AUTHORITY_SUMMARY_GENERATED=YES CAPSULE=${authority.CAPSULE_ID} PATH=${summaryPathArg}`);
