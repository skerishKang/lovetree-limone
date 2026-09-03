import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { src68ExpectedImages, src68SourceFiles } from './source068-driver.mjs';
import { captureSRC68Variant } from './source068-driver.mjs';

const repoRoot = process.cwd();
const sourceId = 'SRC068';
const sourceDir = path.join(repoRoot, 'src', '03_sources', sourceId);
const outRoot = path.join(sourceDir, 'parity', 's4');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
const materialization = JSON.parse(fs.readFileSync(path.join(sourceDir, 'split', 'materialization.json'), 'utf8'));
if (manifest.authority_mode !== 'DUAL_VARIANT') throw new Error('SRC068 authority_mode must be DUAL_VARIANT');
if (materialization.authority_mode !== 'DUAL_VARIANT') throw new Error('SRC068 materialization must be DUAL_VARIANT');
if (manifest.variant_selector?.default !== null) throw new Error('SRC068 must have no default variant');
if (manifest.variant_selector?.fail_closed !== true) throw new Error('SRC068 must fail closed');
if (JSON.stringify(materialization.variant_selector) !== JSON.stringify(manifest.variant_selector)) {
  throw new Error('SRC068 variant_selector drift between manifest and materialization');
}

const EXPECTED = {
  A: { bytes: 18565, sha256: '9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42' },
  B: { bytes: 18646, sha256: 'cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004' },
};

// 8. Source byte lock (ABSOLUTE): S4 must not repair/redesign the Source.
for (const key of ['A', 'B']) {
  const file = path.join(sourceDir, 'original', key, 'original.html');
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, EXPECTED[key].bytes, `original ${key} byte count drift`);
  assert.equal(sha256(bytes), EXPECTED[key].sha256, `original ${key} SHA256 drift`);
  assert.equal(manifest.authority.variants[key].sha256, EXPECTED[key].sha256);
}
const splitExpectations = {
  'split/index.html': 'b888e373d20f169b16863b863c51ef9a0f6e75221f7f99d6512f41e5858b45c5',
  'split/styles.css': '4d0b030d08aca71af79428bcbedff3b62f2a8e275e34c9b8d046dd7a6223970a',
  'split/script.js': '9a80353c592c3d82583438bf657386a20897e8ee59a4ff0a67c033c9352c85ee',
  'split/assets/variant-A.json': '1eaa3b498377ff62a9d102a4e57ac2b10b7b3ef6b56de56f0887dba322fb795f',
  'split/assets/variant-B.json': 'ddaf844818ce9f6be32551dc6b4579d4e9869027a603f151178357d676015ace',
};
for (const [relative, digest] of Object.entries(splitExpectations)) {
  const bytes = fs.readFileSync(path.join(sourceDir, relative));
  assert.equal(sha256(bytes), digest, `${relative} SHA256 drift`);
}

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

const { files, placeholder } = src68SourceFiles(sourceDir, sourceId);
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (src68IsLoopbackImage(pathname)) {
    res.statusCode = 200;
    res.setHeader('content-type', 'image/png');
    res.end(placeholder);
    return;
  }
  const entry = files.get(pathname);
  if (!entry) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  const [file, type] = entry;
  if (!fs.existsSync(file)) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('content-type', type);
  res.end(fs.readFileSync(file));
});

function src68IsLoopbackImage(pathname) {
  return pathname.endsWith('.png') && pathname.includes('/SRC068/');
}

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
const states = ['INITIAL_HERO', 'ARCHIVE_GRID'];
const evidenceManifest = [];
const variantResults = {};

function metricsEqual(aMetrics, bMetrics, eps = 1.5) {
  const aKeys = Object.keys(aMetrics).sort();
  const bKeys = Object.keys(bMetrics).sort();
  assert.deepEqual(bKeys, aKeys, 'metrics id set drift');
  for (const key of aKeys) {
    const av = aMetrics[key];
    const bv = bMetrics[key];
    for (const f of ['x', 'y', 'width', 'height']) {
      assert.ok(
        Math.abs(av.rect[f] - bv.rect[f]) <= eps,
        `metrics rect drift ${key}.${f}: ${av.rect[f]} vs ${bv.rect[f]}`,
      );
    }
    for (const f of ['display', 'position', 'visibility', 'opacity']) {
      assert.equal(bv[f], av[f], `metrics field drift ${key}.${f}`);
    }
  }
}

try {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  for (const variant of ['A', 'B']) {
    const expectedImages = src68ExpectedImages(variant);
    for (const viewport of viewports) {
      const vp = { width: viewport.width, height: viewport.height };
      const prefix = `${variant}-${viewport.width}x${viewport.height}`;
      const originalUrl = `http://127.0.0.1:${port}/${sourceId}/original/${variant}/original.html`;
      const splitUrl = `http://127.0.0.1:${port}/${sourceId}/split/index.html`;
      const original = await captureSRC68Variant(browser, originalUrl, vp, outRoot, `${prefix}-original`, sourceId, { mediaVariant: null });
      const split = await captureSRC68Variant(browser, splitUrl, vp, outRoot, `${prefix}-split`, sourceId, { mediaVariant: variant });

      // Per-state parity assertions.
      for (const state of states) {
        const o = original.states[state];
        const s = split.states[state];
        assert.deepEqual(s.ids, o.ids, `${variant} ${viewport.label} ${state}: ids drift`);
        assert.equal(s.elementCount, o.elementCount, `${variant} ${viewport.label} ${state}: elementCount drift`);
        assert.deepEqual(s.buttonIds, o.buttonIds, `${variant} ${viewport.label} ${state}: buttonIds drift`);
        assert.equal(s.title, o.title, `${variant} ${viewport.label} ${state}: title drift`);
        assert.deepEqual(s.images, o.images, `${variant} ${viewport.label} ${state}: image srcs drift`);
        assert.deepEqual(s.imageBasenames, o.imageBasenames, `${variant} ${viewport.label} ${state}: image basenames drift`);
        assert.deepEqual(s.imageBasenames, expectedImages, `${variant} ${viewport.label} ${state}: variant image set drift`);
        assert.deepEqual(s.tags, o.tags, `${variant} ${viewport.label} ${state}: archive tags drift`);
        assert.equal(s.cards, 9, `${variant} ${viewport.label} ${state}: cards must be 9`);
        assert.equal(o.cards, 9, `${variant} ${viewport.label} ${state}: original cards must be 9`);
        assert.equal(s.worksRows, o.worksRows, `${variant} ${viewport.label} ${state}: works catalog drift`);
        assert.deepEqual(
          s.videos.map((v) => v.src),
          o.videos.map((v) => v.src),
          `${variant} ${viewport.label} ${state}: hero video src drift`,
        );
        metricsEqual(o.metrics, s.metrics);
        // Split resolves via explicit selector only; original has none.
        assert.equal(s.mediaVariant, variant, `${variant} ${viewport.label} ${state}: split mediaVariant must be ${variant}`);
        assert.equal(o.mediaVariant, null, `${variant} ${viewport.label} ${state}: original must not carry mediaVariant`);
      }
      assert.deepEqual(split.interaction, original.interaction, `${variant} ${viewport.label}: interaction drift`);
      assert.deepEqual(original.errors, [], `${variant} ${viewport.label} original browser errors: ${original.errors.join('; ')}`);
      assert.deepEqual(split.errors, [], `${variant} ${viewport.label} split browser errors: ${split.errors.join('; ')}`);

      // Media: all 9 loopback image requests must succeed (200) per variant.
      for (const [label, capture] of [['original', original], ['split', split]]) {
        const okImages = capture.imageRequests.filter((r) => r.status === 200);
        assert.equal(okImages.length >= 9, true, `${variant} ${viewport.label} ${label}: expected >=9 image 200s, got ${okImages.length}`);
        const basenames = okImages.map((r) => decodeURIComponent(r.url.split('/').pop().split('?')[0])).sort();
        for (const expected of expectedImages) {
          assert.ok(basenames.includes(expected), `${variant} ${viewport.label} ${label}: missing image request ${expected}`);
        }
      }
      // Loopback failures must be zero; external (fonts/MP4) recorded separately.
      const loopbackFailures = [...original.failedRequests, ...split.failedRequests].filter((f) => f.includes('127.0.0.1'));
      assert.deepEqual(loopbackFailures, [], `${variant} ${viewport.label}: loopback failures: ${loopbackFailures.join('; ')}`);

      // Screenshot pairing evidence (recorded shas; strict equality asserted).
      for (const state of states) {
        assert.equal(
          split.screenshots[`${state}_sha256`],
          original.screenshots[`${state}_sha256`],
          `${variant} ${viewport.label} ${state}: screenshot sha drift`,
        );
      }

      // Persist per-viewport comparison JSON.
      const comparison = {
        variant,
        viewport: { width: viewport.width, height: viewport.height, label: viewport.label },
        states_equal: Object.fromEntries(states.map((s) => [s, true])),
        interaction_equal: true,
        images_equal: true,
        cross_contamination: 'ZERO',
        original_screenshots: original.screenshots,
        split_screenshots: split.screenshots,
      };
      fs.writeFileSync(
        path.join(outRoot, `${prefix}.json`),
        JSON.stringify({ variant, viewport, original, split, comparison }, null, 2),
      );
      for (const state of states) {
        for (const side of ['original', 'split']) {
          evidenceManifest.push({
            base_sha: baseSha,
            head_sha: headSha,
            variant,
            original_authority_sha256: EXPECTED[variant].sha256,
            split_index_sha256: splitExpectations['split/index.html'],
            split_styles_sha256: splitExpectations['split/styles.css'],
            split_script_sha256: splitExpectations['split/script.js'],
            viewport: `${viewport.width}x${viewport.height}`,
            viewport_label: viewport.label,
            state,
            side,
            filename: `${prefix}-${side}-${state}.png`,
            screenshot_sha256: (side === 'original' ? original : split).screenshots[`${state}_sha256`],
            console_page_errors: (side === 'original' ? original : split).errors,
            failed_requests: (side === 'original' ? original : split).failedRequests,
          });
        }
      }
      console.log(`SRC068_S4_PARITY_PASS=${variant} ${viewport.label} ${viewport.width}x${viewport.height}`);
    }
    // Cross-variant contamination: A/B image sets must be disjoint.
    const overlap = src68ExpectedImages('A').filter((u) => src68ExpectedImages('B').includes(u));
    assert.deepEqual(overlap, [], 'A/B image sets must be disjoint');
    variantResults[variant] = { pass: true };
    console.log(`SRC068_S4_VARIANT_PASS=${variant}`);
  }

  const summary = {
    schema_version: '1.0',
    source_id: sourceId,
    stage: 'S4_DUAL_PARITY_LOCAL_EVIDENCE',
    status: 'LOCAL_PASS_CENTRAL_PENDING',
    base_sha: baseSha,
    head_sha: headSha,
    authority: EXPECTED,
    split: splitExpectations,
    viewports: viewports.map((v) => `${v.width}x${v.height}`),
    states,
    variants: variantResults,
    cross_contamination: 'ZERO',
    central_acceptance: 'PENDING',
  };
  fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outRoot, 'evidence-manifest.json'), JSON.stringify(evidenceManifest, null, 2));
  console.log('SRC068_S4_PARITY_LOCAL_PASS=A,B');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
