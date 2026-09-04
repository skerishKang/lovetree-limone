#!/usr/bin/env node
/**
 * analyze-source-authority.mjs
 *
 * CLEAN-108 Auto Analyzer CLI — Slice 1 (#611).
 *
 * ANALYZER CORE (`auto-analyzer/analyze-html.mjs`):
 *   pure / read-only, no filesystem mutation of any kind.
 *
 * CLI:
 *   authority (+ optional manifest) are READ-ONLY inputs.
 *   analysis JSON may be written ONLY to an explicitly safe non-authority
 *   path via --out; the destination is fail-closed guarded (see
 *   guardOutputDestination) BEFORE any mkdir/write/rename side effect.
 *
 * NEVER mutates the authority. NEVER selects canonical variants.
 * NEVER falls back to `window.__lt` (or any hook) for unknown sources —
 * unknown shapes are reported via `disposition.holds` (fail-closed) and
 * runtime-hook trust is source-bound via SOURCE_HOOK_REGISTRY.
 *
 * Usage:
 *   node src/08_harness/analyze-source-authority.mjs --input <original.html> [--source-id SRCxxx] [--manifest <manifest.json>] [--out <analysis.json>]
 *
 * Exit code is 0 on successful analysis (HOLD is a valid result, not a CLI
 * error). Non-zero only for I/O / usage / unsafe-output-path errors.
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
    '  --input <path>       authoritative single-HTML file (required, READ-ONLY input)',
    '  --source-id <id>     SRCxxx identity (optional; inferred from --manifest)',
    '  --manifest <path>    parsed for authority_mode/dual-variant policy only (READ-ONLY input)',
    '  --out <path>         write analysis JSON here instead of stdout; SAFE non-authority path',
    '                       ONLY (lexical + canonical target rejected when equal to --input/',
    '                       --manifest or inside src/03_sources/**; symlink/junction aliases',
    '                       cannot bypass the guard)',
    '  --help               print this help',
  ].join('\n');
}

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SOURCE_CAPSULE_ROOT = path.join(REPO_ROOT, 'src', '03_sources');

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function samePath(a, b) {
  return comparablePath(a) === comparablePath(b);
}

function isPathInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function realpathOrResolved(value) {
  const resolved = path.resolve(value);
  try {
    return fs.realpathSync.native(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') return resolved;
    fail(`OUTPUT_PATH_INSPECTION_FAILED: cannot canonicalize ${resolved}: ${error.message}`);
  }
}

/**
 * Canonicalize a prospective write destination without creating anything.
 *
 * If the exact output does not exist, walk upward until the nearest existing
 * ancestor, realpath that ancestor (thereby resolving symlink/junction
 * indirection), then append the still-missing suffix. A broken symlink is
 * fail-closed because lstat sees the link while realpath cannot resolve it.
 */
function canonicalWriteDestination(value) {
  const resolved = path.resolve(value);
  let cursor = resolved;
  const suffix = [];

  for (;;) {
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        fail(`OUTPUT_PATH_INSPECTION_FAILED: cannot inspect ${cursor}: ${error.message}`);
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) {
        fail(`OUTPUT_PATH_INSPECTION_FAILED: no existing ancestor for ${resolved}`);
      }
      suffix.unshift(path.basename(cursor));
      cursor = parent;
      continue;
    }

    try {
      const canonical = fs.realpathSync.native(cursor);
      return path.join(canonical, ...suffix);
    } catch (error) {
      const kind = stat.isSymbolicLink() ? 'symlink/junction' : 'path';
      fail(`OUTPUT_PATH_INSPECTION_FAILED: cannot resolve ${kind} ${cursor}: ${error.message}`);
    }
  }
}

/**
 * Fail-closed output destination guard (CENTRAL Blocker A + canonical-path
 * corrective).
 *
 * Rejects, before ANY filesystem mutation (no mkdir, writeFile, touch,
 * truncate, or rename may happen before this succeeds):
 *   A1. --out lexically OR canonically resolving to the authority input
 *   A2. --out lexically OR canonically resolving to the manifest input
 *   A3. --out lexically OR canonically resolving inside the accepted Source
 *       capsule tree (src/03_sources/** of this repository)
 *
 * Canonical checks resolve existing symlink/junction components through the
 * nearest existing ancestor, so an apparently external alias cannot tunnel a
 * write back into Source authority/capsule ownership.
 *
 * A rejected invocation leaves authority bytes unchanged, manifest bytes
 * unchanged, no output file, and no new output parent directory.
 */
function guardOutputDestination(args) {
  if (!args.out) return;

  const out = path.resolve(args.out);
  const input = path.resolve(args.input);
  const manifest = args.manifest ? path.resolve(args.manifest) : null;

  const canonicalOut = canonicalWriteDestination(out);
  const canonicalInput = realpathOrResolved(input);
  const canonicalManifest = manifest ? realpathOrResolved(manifest) : null;
  const canonicalSourceRoot = realpathOrResolved(SOURCE_CAPSULE_ROOT);

  if (samePath(out, input) || samePath(canonicalOut, canonicalInput)) {
    fail(`OUTPUT_EQUALS_INPUT_REJECTED: --out (${out}) resolves to the authority input itself; the authority is read-only`);
  }
  if (manifest && (samePath(out, manifest) || samePath(canonicalOut, canonicalManifest))) {
    fail(`OUTPUT_EQUALS_MANIFEST_REJECTED: --out (${out}) resolves to the manifest input; the manifest is read-only`);
  }
  if (isPathInside(out, SOURCE_CAPSULE_ROOT) || isPathInside(canonicalOut, canonicalSourceRoot)) {
    fail(`OUTPUT_UNDER_SRC03_REJECTED: --out (${out}) resolves inside the accepted Source capsule tree (${SOURCE_CAPSULE_ROOT}); the analyzer must never write into Source authority/capsule ownership`);
  }
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

// Output destination safety must be proven BEFORE any read/write side effect
// (reads are read-only, but rejection must leave every file untouched).
guardOutputDestination(args);

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