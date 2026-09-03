import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { captureSRC62Baseline, src062SourceFiles } from './source062-driver.mjs';

const repoRoot = process.cwd();
const sourceId = 'SRC062';
const sourceDir = path.join(repoRoot, 'src', '03_sources', sourceId);
const outRoot = path.join(sourceDir, 'baseline', 's2');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const EXPECTED = {
  bytes: 20728647,
  sha256: 'bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8',
  fileId: '1Zivp0wDxNOw4Vg1ame8sjZLspHMdQPi-',
};

// S1 byte lock.
const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.authority.sha256, EXPECTED.sha256);
assert.equal(manifest.authority.bytes, EXPECTED.bytes);
const originalBytes = fs.readFileSync(path.join(sourceDir, 'original', 'original.html'));
assert.equal(originalBytes.length, EXPECTED.bytes, 'original byte count drift');
assert.equal(sha256(originalBytes), EXPECTED.sha256, 'original SHA256 drift');

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

const { files } = src062SourceFiles(sourceDir, sourceId);
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

const browser = await chromium.launch({ headless: true, channel: 'chrome' });

// Preserve existing valid PNGs from prior S2 capture before regenerating metadata.
const preservedPngNames = new Set([
  '1280x800-INITIAL.png',
  '1280x800-VIEWER_OPEN.png',
  '390x844-INITIAL.png',
  '390x844-VIEWER_OPEN.png',
]);
const preservedPngs = new Map();
for (const name of preservedPngNames) {
  const src = path.join(outRoot, name);
  if (fs.existsSync(src)) {
    preservedPngs.set(name, fs.readFileSync(src));
  }
}

const evidenceManifest = [];
const viewportResults = {};

try {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  // Restore previously valid PNG evidence so CENTRAL can re-review the original
  // capture alongside the new matrix.
  for (const [name, data] of preservedPngs) {
    fs.writeFileSync(path.join(outRoot, name), data);
  }

  const viewports = [
    { width: 1440, height: 900, label: 'DESKTOP' },
    { width: 390, height: 844, label: 'MOBILE' },
    { width: 320, height: 720, label: 'SMALL_MOBILE' },
  ];

  for (const viewport of viewports) {
    const vp = { width: viewport.width, height: viewport.height };
    const prefix = `${viewport.width}x${viewport.height}`;
    const url = `http://127.0.0.1:${port}/${sourceId}/original.html`;
    const capture = await captureSRC62Baseline(browser, url, vp, outRoot, prefix, sourceId);

    assert.deepEqual(capture.errors, [], `${viewport.label} browser errors: ${capture.errors.join('; ')}`);
    assert.deepEqual(capture.failedRequests, [], `${viewport.label} failed requests: ${capture.failedRequests.join('; ')}`);
    assert.ok(Object.keys(capture.states).length > 0, `${viewport.label}: no states captured`);

    fs.writeFileSync(path.join(outRoot, `${prefix}.json`), JSON.stringify(capture, null, 2));
    for (const [stateKey, screenshotSha] of Object.entries(capture.screenshots)) {
      const state = stateKey.replace(/_sha256$/, '');
      evidenceManifest.push({
        base_sha: baseSha,
        head_sha: headSha,
        authority_sha256: EXPECTED.sha256,
        authority_bytes: EXPECTED.bytes,
        authority_file_id: EXPECTED.fileId,
        viewport: `${viewport.width}x${viewport.height}`,
        viewport_label: viewport.label,
        state,
        filename: `${prefix}-${state}.png`,
        screenshot_sha256: screenshotSha,
        console_page_errors: capture.errors,
        failed_requests: capture.failedRequests,
        interaction: capture.interaction,
      });
    }
    viewportResults[viewport.label] = { pass: true, interaction: capture.interaction, states: Object.keys(capture.states) };
    console.log(`SRC062_S2_BASELINE_PASS=${viewport.label} ${viewport.width}x${viewport.height} states=${Object.keys(capture.states).join(',')}`);
  }

  const summary = {
    schema_version: '1.0',
    source_id: sourceId,
    stage: 'S2_BASELINE_LOCAL_CAPTURE',
    status: 'CAPTURED_PENDING_CENTRAL_REVIEW',
    base_sha: baseSha,
    head_sha: headSha,
    authority: EXPECTED,
    viewports: viewports.map((v) => `${v.width}x${v.height}`),
    states: [
      'D01_INITIAL_SCENE01',
      'D02_RAIL_TRAVEL_SCENE04',
      'D03_ACTIVE_VIEWER_SCENE04',
      'D04_MEMORY_FILMS_PANEL',
      'D05_MY_TREE_PANEL',
      'D06_SCENE07_MEMORY_PATH_VIEWER',
      'M01_INITIAL_SCENE01',
      'M02_MENU_SHEET',
      'M03_SWIPE_TRAVEL_SCENE06',
      'M04_ACTIVE_VIEWER_SCENE06',
      'M05_MEMORY_FILMS_PANEL',
      'M06_MY_TREE_PANEL',
    ],
    viewports_results: viewportResults,
    preserved_legacy_evidence: [...preservedPngNames],
    central_acceptance: 'PENDING',
  };
  fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outRoot, 'evidence-manifest.json'), JSON.stringify(evidenceManifest, null, 2));
  console.log('SRC062_S2_BASELINE_LOCAL_PASS=DESKTOP,MOBILE,SMALL_MOBILE');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
