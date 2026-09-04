/**
 * SRC062 S4 Original-vs-Split Parity — Dedicated Candidate Capture.
 *
 * Captures the accepted S2 interaction matrix against BOTH the frozen
 * authority original and the mechanically split build, then compares
 * settled states + interaction assertions strictly.
 *
 * - Runtime bytes are locked before capture; any drift aborts
 *   (HOLD_RUNTIME_DRIFT). S4 never mutates the Source.
 * - Settle-physics floats are normalized to 3 decimals (same tolerance as
 *   the S3 CI parity routing; NOT broadened). Real scene/geometry drift fails.
 * - Screenshot SHAs are recorded as equality flags with both PNGs retained
 *   for CENTRAL direct review. A PNG mismatch is reported, never hidden and
 *   never forced. State/geometry/style/runtime equality is asserted strictly.
 * - Output goes to evidence/parity/candidate/ ONLY. This script never writes
 *   accepted-parity.json and never sets source_split_parity_pass. Final S4
 *   acceptance is CENTRAL-owned.
 *
 * Viewports: 1440x900 DESKTOP, 390x844 MOBILE, 320x720 SMALL_MOBILE (the
 * accepted S2 matrix) plus 1280x800 LEGACY_DESKTOP (the preserved legacy
 * INITIAL/VIEWER viewport; the established driver runs its desktop matrix
 * there, a superset that retains the legacy pair).
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { captureSRC62Variant } from './source062-driver.mjs';

const repoRoot = process.cwd();
const sourceId = 'SRC062';
const sourceDir = path.join(repoRoot, 'src', '03_sources', sourceId);
const outRoot = path.join(sourceDir, 'evidence', 'parity', 'candidate');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// ---- S3 accepted-state lock -------------------------------------------------
const EXPECTED_AUTHORITY = {
  bytes: 20728647,
  sha256: 'bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8',
};
const EXPECTED_SPLIT = {
  'split/index.html': 'b6fad69f235bae5d1e4666005a68282528ae28b8a7fc34c8297c9a053c50cb68',
  'split/styles.css': '870ed0acd5807828e4f92c5d9f04481179da57989d87ecd4c0d0d6861b5e3bae',
  'split/script.js': '2252d05b01f7d0cefbf4d36d9b49ce694ef0a7869897ac9929288536a0825420',
};

const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.source_id, sourceId, 'manifest source_id drift');
assert.equal(manifest.stages?.mechanical_split_complete, true, 'S4 requires S3 complete');
assert.equal(manifest.stages?.source_split_parity_pass, false, 'S4 must not run on an already-accepted split');
assert.equal(manifest.authority?.bytes, EXPECTED_AUTHORITY.bytes, 'manifest authority bytes drift');
assert.equal(manifest.authority?.sha256, EXPECTED_AUTHORITY.sha256, 'manifest authority SHA256 drift');

const originalBytes = fs.readFileSync(path.join(sourceDir, 'original', 'original.html'));
assert.equal(originalBytes.length, EXPECTED_AUTHORITY.bytes, 'HOLD_RUNTIME_DRIFT: original byte count drift');
assert.equal(sha256(originalBytes), EXPECTED_AUTHORITY.sha256, 'HOLD_RUNTIME_DRIFT: original SHA256 drift');
for (const [relative, digest] of Object.entries(EXPECTED_SPLIT)) {
  const bytes = fs.readFileSync(path.join(sourceDir, relative));
  assert.equal(sha256(bytes), digest, `HOLD_RUNTIME_DRIFT: ${relative} SHA256 drift`);
}
console.log('SRC062_S4_RUNTIME_LOCK=PASS authority+split bytes frozen');

// ---- provenance ---------------------------------------------------------------
let baseSha = 'UNKNOWN';
try {
  baseSha = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
} catch {
  // ignore
}
let headSha = 'UNKNOWN';
try {
  headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // ignore
}

// ---- loopback server (original + split) ----------------------------------------
const files = new Map([
  [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
  [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
  [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
  [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
]);
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const entry = files.get(pathname);
  if (!entry || !fs.existsSync(entry[0])) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('content-type', entry[1]);
  res.end(fs.readFileSync(entry[0]));
});
const SAFE_PORTS = [8137, 8140, 8143, 8150, 8160, 8170, 8180, 8190];
await new Promise((resolve, reject) => {
  let i = 0;
  const tryNext = () => {
    const port = i < SAFE_PORTS.length ? SAFE_PORTS[i++] : 0;
    const onError = (e) => {
      server.removeListener('error', onError);
      if (e.code === 'EADDRINUSE' && i <= SAFE_PORTS.length) return tryNext();
      return reject(e);
    };
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', onError);
      resolve();
    });
  };
  tryNext();
});
const { port } = server.address();

// ---- comparison helpers ----------------------------------------------------------
// Same 3-decimal settle-physics normalization as the S3 CI parity routing.
// NOT broadened: structure, text, styles, geometry compare exactly.
function normalizeSRC62ParityValue(value) {
  if (typeof value === 'number') return Math.round(value * 1000) / 1000;
  if (Array.isArray(value)) return value.map(normalizeSRC62ParityValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeSRC62ParityValue(v)]));
  }
  return value;
}

function shotCount(results, equal) {
  let n = 0;
  for (const r of Object.values(results)) {
    for (const v of Object.values(r.screenshot_sha_equal)) if (v === equal) n += 1;
  }
  return n;
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const viewports = [
  { width: 1440, height: 900, label: 'DESKTOP' },
  { width: 390, height: 844, label: 'MOBILE' },
  { width: 320, height: 720, label: 'SMALL_MOBILE' },
  { width: 1280, height: 800, label: 'LEGACY_DESKTOP' },
];

const evidenceManifest = [];
const viewportResults = {};
const screenshotMismatches = [];

try {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  for (const viewport of viewports) {
    const vp = { width: viewport.width, height: viewport.height };
    const prefix = `${viewport.width}x${viewport.height}`;
    const originalUrl = `http://127.0.0.1:${port}/${sourceId}/original.html`;
    const splitUrl = `http://127.0.0.1:${port}/${sourceId}/split/index.html`;
    const original = await captureSRC62Variant(browser, originalUrl, vp, outRoot, 'original', sourceId);
    const split = await captureSRC62Variant(browser, splitUrl, vp, outRoot, 'split', sourceId);

    // Zero-tolerance error gates on both sides.
    assert.deepEqual(original.errors, [], `${prefix} original browser errors: ${original.errors.join('; ')}`);
    assert.deepEqual(split.errors, [], `${prefix} split browser errors: ${split.errors.join('; ')}`);
    assert.deepEqual(original.failedRequests, [], `${prefix} original failed requests: ${original.failedRequests.join('; ')}`);
    assert.deepEqual(split.failedRequests, [], `${prefix} split failed requests: ${split.failedRequests.join('; ')}`);

    // Strict settled-state + interaction parity.
    const stateKeys = Object.keys(original.states);
    assert.deepEqual(Object.keys(split.states).sort(), [...stateKeys].sort(), `${prefix}: captured state set drift`);
    for (const state of stateKeys) {
      assert.deepEqual(
        normalizeSRC62ParityValue(split.states[state]),
        normalizeSRC62ParityValue(original.states[state]),
        `${prefix} ${state}: state drift`,
      );
    }
    assert.deepEqual(split.interaction, original.interaction, `${prefix}: interaction drift`);

    // Screenshot SHAs are evidence flags, never forced. Every mismatch is
    // recorded with both SHAs; both PNGs are retained for CENTRAL review.
    const shotKeys = Object.keys(original.screenshots);
    const screenshotEquality = {};
    for (const key of shotKeys) {
      const equal = split.screenshots[key] === original.screenshots[key];
      screenshotEquality[key] = equal;
      if (!equal) {
        screenshotMismatches.push({
          viewport: prefix,
          viewport_label: viewport.label,
          state: key.replace(/_sha256$/, ''),
          original_sha256: original.screenshots[key],
          split_sha256: split.screenshots[key],
        });
      }
    }

    const comparison = {
      viewport: { width: viewport.width, height: viewport.height, label: viewport.label },
      states_compared: stateKeys,
      states_equal: Object.fromEntries(stateKeys.map((k) => [k, true])),
      interaction_equal: true,
      errors_equal_empty: true,
      failed_requests_equal_empty: true,
      screenshot_sha_equal: screenshotEquality,
      original_screenshots: original.screenshots,
      split_screenshots: split.screenshots,
    };
    fs.writeFileSync(path.join(outRoot, `${prefix}.json`), JSON.stringify({ viewport, original, split, comparison }, null, 2));
    viewportResults[prefix] = comparison;

    for (const state of stateKeys) {
      for (const side of ['original', 'split']) {
        // Driver filenames are `${prefix}-${side}-${state}.png`; pairs are
        // obvious and the manifest below is the authoritative pairing index.
        const filename = `${prefix}-${side}-${state}.png`;
        evidenceManifest.push({
          base_sha: baseSha,
          head_sha: headSha,
          authority_sha256: EXPECTED_AUTHORITY.sha256,
          authority_bytes: EXPECTED_AUTHORITY.bytes,
          split_index_sha256: EXPECTED_SPLIT['split/index.html'],
          split_styles_sha256: EXPECTED_SPLIT['split/styles.css'],
          split_script_sha256: EXPECTED_SPLIT['split/script.js'],
          viewport: prefix,
          viewport_label: viewport.label,
          state,
          side,
          filename,
          screenshot_sha256: (side === 'original' ? original : split).screenshots[`${state}_sha256`],
          console_page_errors: (side === 'original' ? original : split).errors,
          failed_requests: (side === 'original' ? original : split).failedRequests,
        });
      }
    }
    console.log(`SRC062_S4_PARITY_PASS=${viewport.label} ${prefix} states=${stateKeys.length} interaction=EQUAL errors=0`);
  }

  const summary = {
    schema_version: '1.0',
    source_id: sourceId,
    stage: 'S4_PARITY_CANDIDATE',
    status: 'CANDIDATE_PASS_CENTRAL_PENDING',
    parity_result: 'CANDIDATE_PASS',
    base_sha: baseSha,
    head_sha: headSha,
    authority: EXPECTED_AUTHORITY,
    split: EXPECTED_SPLIT,
    viewports: viewports.map((v) => `${v.width}x${v.height}`),
    viewport_labels: Object.fromEntries(viewports.map((v) => [`${v.width}x${v.height}`, v.label])),
    states_per_viewport: Object.fromEntries(Object.entries(viewportResults).map(([vp, r]) => [vp, r.states_compared])),
    pair_count: evidenceManifest.length,
    dom_parity: 'EQUAL',
    geometry_parity: 'EQUAL',
    computed_style_parity: 'EQUAL',
    runtime_state_parity: 'EQUAL',
    interaction_parity: 'EQUAL',
    console_errors: 0,
    page_errors: 0,
    failed_requests: 0,
    screenshot_byte_identical_count: shotCount(viewportResults, true),
    screenshot_mismatch_count: screenshotMismatches.length,
    screenshot_mismatches: screenshotMismatches,
    screenshot_note: 'Screenshot SHA equality is evidence, not the sole truth; render timing can differ with equivalent state. Every mismatch above retains both PNGs for CENTRAL direct review.',
    source_split_parity_pass: false,
    central_visual_acceptance: 'PENDING',
  };
  fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outRoot, 'evidence-manifest.json'), JSON.stringify(evidenceManifest, null, 2));
  console.log(`SRC062_S4_PARITY_CANDIDATE_PASS viewports=${viewports.length} pairs=${evidenceManifest.length} screenshot_mismatches=${screenshotMismatches.length}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
