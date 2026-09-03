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

// S1 byte lock: S2 capture runs only against the CENTRAL-pinned authority bytes.
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
const viewports = [
  { width: 1280, height: 800, label: 'DESKTOP' },
  { width: 390, height: 844, label: 'MOBILE' },
];
const evidenceManifest = [];
const viewportResults = {};

try {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  for (const viewport of viewports) {
    const vp = { width: viewport.width, height: viewport.height };
    const prefix = `${viewport.width}x${viewport.height}`;
    const url = `http://127.0.0.1:${port}/${sourceId}/original.html`;
    const capture = await captureSRC62Baseline(browser, url, vp, outRoot, prefix, sourceId);

    assert.deepEqual(capture.errors, [], `${viewport.label} browser errors: ${capture.errors.join('; ')}`);
    assert.deepEqual(capture.failedRequests, [], `${viewport.label} failed requests: ${capture.failedRequests.join('; ')}`);
    assert.ok(capture.states.INITIAL.stationCount >= 1, `${viewport.label}: stations missing`);
    assert.ok(capture.states.VIEWER_OPEN.viewerTitle.length > 0, `${viewport.label}: viewer title empty`);

    fs.writeFileSync(path.join(outRoot, `${prefix}.json`), JSON.stringify(capture, null, 2));
    for (const state of ['INITIAL', 'VIEWER_OPEN']) {
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
        screenshot_sha256: capture.screenshots[`${state}_sha256`],
        console_page_errors: capture.errors,
        failed_requests: capture.failedRequests,
      });
    }
    viewportResults[viewport.label] = { pass: true, interaction: capture.interaction };
    console.log(`SRC062_S2_BASELINE_PASS=${viewport.label} ${viewport.width}x${viewport.height}`);
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
    states: ['INITIAL', 'VIEWER_OPEN'],
    viewports_results: viewportResults,
    central_acceptance: 'PENDING',
  };
  fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outRoot, 'evidence-manifest.json'), JSON.stringify(evidenceManifest, null, 2));
  console.log('SRC062_S2_BASELINE_LOCAL_PASS=DESKTOP,MOBILE');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
