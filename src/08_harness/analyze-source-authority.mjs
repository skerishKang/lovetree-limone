#!/usr/bin/env node
/**
 * analyze-source-authority.mjs
 *
 * CLEAN-108 Auto Analyzer CLI — Slice 1 (#611).
 *
 * READ-ONLY: reads one authoritative single-HTML file (+ optional manifest),
 * writes an analysis JSON document to stdout (or --out <path>).
 * NEVER mutates the authority. NEVER selects canonical variants.
 * NEVER falls back to `window.__lt` (or any hook) for unknown sources —
 * unknown shapes are reported via `disposition.holds` (fail-closed).
 *
 * Usage:
 *   node src/08_harness/analyze-source-authority.mjs --input <original.html> [--source-id SRCxxx] [--manifest <manifest.json>] [--out <analysis.json>]
 *
 * Exit code is 0 on successful analysis (HOLD is a valid result, not a CLI
 * error). Non-zero only for I/O / usage errors.
 *
 * Runtime: Node built-ins only.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeAuthorityHtml, ANALYZER_VERSION } from './auto-analyzer/analyze-html.mjs';

function usage() {
  return [
    'Usage: node src/08_harness/analyze-source-authority.mjs --input <html> [--source-id SRCxxx] [--manifest <manifest.json>] [--out <json>]',
    '',
    'Options:',
    '  --input <path>       authoritative single-HTML file (required, read-only)',
    '  --source-id <id>     SRCxxx identity (optional; inferred from --manifest)',
    '  --manifest <path>    parsed for authority_mode/dual-variant policy only',
    '  --out <path>         write analysis JSON here instead of stdout',
    '  --help               print this help',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { input: null, sourceId: null, manifest: null, out: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--input' && argv[i + 1]) {
      args.input = argv[++i];
    } else if (token === '--source-id' && argv[i + 1]) {
      args.sourceId = argv[++i];
    } else if (token === '--manifest' && argv[i + 1]) {
      args.manifest = argv[++i];
    } else if (token === '--out' && argv[i + 1]) {
      args.out = argv[++i];
    } else if (!token.startsWith('--') && !args.input) {
      args.input = token;
    } else {
      throw new Error(`unknown argument: ${token}\n${usage()}`);
    }
  }
  return args;
}

function fail(message) {
  process.stderr.write(`ANALYZE_SOURCE_AUTHORITY=ERROR ${message}\n`);
  process.exit(2);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  fail(error.message);
}
if (args.help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
if (!args.input) fail(`--input is required\n${usage()}`);

let bytes;
try {
  bytes = fs.readFileSync(args.input);
} catch (error) {
  fail(`cannot read input: ${error.message}`);
}
let html;
try {
  html = bytes.toString('utf8');
} catch (error) {
  fail(`input is not decodable UTF-8: ${error.message}`);
}

let manifest = null;
let sourceId = args.sourceId;
if (args.manifest) {
  try {
    manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
  } catch (error) {
    fail(`cannot read manifest: ${error.message}`);
  }
  if (!sourceId && typeof manifest?.source_id === 'string') sourceId = manifest.source_id;
}

const analysis = analyzeAuthorityHtml({
  html,
  bytes,
  sourceId,
  authorityPath: path.resolve(args.input),
  manifest,
});

// Defense-in-depth: re-verify bytes/sha against the file on disk (read-only check).
analysis.authority.bytes = bytes.length;
analysis.authority.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

const json = `${JSON.stringify(analysis, null, 2)}\n`;
if (args.out) {
  try {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, json, 'utf8');
  } catch (error) {
    fail(`cannot write output: ${error.message}`);
  }
  process.stderr.write(
    `ANALYZE_SOURCE_AUTHORITY source=${analysis.sourceId ?? 'UNKNOWN'} s3=${analysis.s3Classification} disposition=${analysis.disposition.status} analyzer=${ANALYZER_VERSION}\n`,
  );
} else {
  process.stdout.write(json);
}
