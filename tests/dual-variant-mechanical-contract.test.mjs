import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateDualVariantMechanicalSplit } from '../src/08_harness/dual-variant-mechanical.mjs';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha1 = (buffer) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer])).digest('hex');

const SOURCE_ID = 'SRC068';
const TITLE_A = '<title>Mini V-A</title>';
const TITLE_B = '<title>Mini V-B</title>';
const SENTINEL = '<!--MINI_VARIANT_TITLE-->';
const CSS_LINK = '<link rel="stylesheet" href="./styles.css"/>';
const SCRIPT_SRC = '<script src="./script.js"></script>';
const MARKER = '/*MINI_COMMON_JS_FOLLOWS*/\n';
const SCRIPT_HEAD = '\n';
const URLS_A = Array.from({ length: 9 }, (_, i) => `../images/0${i + 1}.png`);
const URLS_B = Array.from({ length: 9 }, (_, i) => `../images/b0${i + 1}.png`);
const STMT_A = `const imageUrls=[${URLS_A.map((u) => `'${u}'`).join(',')}];`;
const STMT_B = `const imageUrls=[${URLS_B.map((u) => `'${u}'`).join(',')}];`;
const TAIL = '\nconst titles=["t"];\nbuild();\n';
const CSS = 'body{margin:0}\n';
const BOOTSTRAP = `const imageUrls=(()=>{var v=window.mediaVariant;if(v!=="A"&&v!=="B"){throw new Error("mini variant contract violation")};return v==="A"?${JSON.stringify(URLS_A)}:${JSON.stringify(URLS_B)}})();\n${MARKER}`;

function buildOriginals() {
  const head = '<!doctype html>\n<html>\n<head>\n';
  const mid = '\n<link rel="preconnect" href="https://x">\n';
  const styleSpan = `<style>${CSS}</style>`;
  const mid2 = '\n</head>\n<body>\n<p>hi</p>\n';
  const foot = '\n</body>\n';
  const scriptA = `<script>${SCRIPT_HEAD}${STMT_A}${TAIL}</script>`;
  const scriptB = `<script>${SCRIPT_HEAD}${STMT_B}${TAIL}</script>`;
  return {
    a: head + TITLE_A + mid + styleSpan + mid2 + scriptA + foot,
    b: head + TITLE_B + mid + styleSpan + mid2 + scriptB + foot,
    shell: head + SENTINEL + mid + CSS_LINK + mid2 + SCRIPT_SRC + foot,
  };
}

function makeMechanicalFixture({ mutateFiles, mutateManifest, mutateRecord } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lovetree-dualmech-'));
  const dir = path.join(root, 'src', '03_sources', SOURCE_ID);
  const { a, b, shell } = buildOriginals();
  const files = {
    'original/A/original.html': Buffer.from(a, 'utf8'),
    'original/B/original.html': Buffer.from(b, 'utf8'),
    'split/index.html': Buffer.from(shell, 'utf8'),
    'split/styles.css': Buffer.from(CSS, 'utf8'),
    'split/script.js': Buffer.from(BOOTSTRAP + TAIL, 'utf8'),
    'split/assets/variant-A.json': Buffer.from(`${JSON.stringify({ variant: 'A', title: 'Mini V-A', titleElement: TITLE_A, imageUrls: URLS_A, jsImageUrlsStatement: STMT_A }, null, 2)}\n`, 'utf8'),
    'split/assets/variant-B.json': Buffer.from(`${JSON.stringify({ variant: 'B', title: 'Mini V-B', titleElement: TITLE_B, imageUrls: URLS_B, jsImageUrlsStatement: STMT_B }, null, 2)}\n`, 'utf8'),
    'authority/sha256.txt': Buffer.from('x\n', 'utf8'),
  };
  for (const [relative, bytes] of Object.entries(files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  if (typeof mutateFiles === 'function') mutateFiles(dir, files);
  const out = (relative) => {
    const bytes = fs.readFileSync(path.join(dir, relative));
    return { bytes: bytes.length, sha256: sha256(bytes), git_blob_sha1: gitBlobSha1(bytes) };
  };
  const variants = {
    A: { drive_file_id: 'file-a', filename: 'a.html', bytes: files['original/A/original.html'].length, sha256: sha256(files['original/A/original.html']) },
    B: { drive_file_id: 'file-b', filename: 'b.html', bytes: files['original/B/original.html'].length, sha256: sha256(files['original/B/original.html']) },
  };
  const selector = { selector: 'mediaVariant', allowed_values: ['A', 'B'], default: null, fail_closed: true };
  const manifest = {
    source_id: SOURCE_ID,
    authority_mode: 'DUAL_VARIANT',
    authority: { drive_folder_id: 'folder', status: 'LOCKED', variants: JSON.parse(JSON.stringify(variants)) },
    variant_selector: JSON.parse(JSON.stringify(selector)),
  };
  const record = {
    source_id: SOURCE_ID,
    authority_mode: 'DUAL_VARIANT',
    status: 'MATERIALIZED_PENDING_PARITY',
    generation: 'MECHANICAL_INLINE_EXTRACTION',
    authority: { drive_folder_id: 'folder', status: 'LOCKED', variants: JSON.parse(JSON.stringify(variants)) },
    variant_selector: JSON.parse(JSON.stringify(selector)),
    mechanics: {
      title_sentinel: SENTINEL,
      css_link: CSS_LINK,
      script_src: SCRIPT_SRC,
      script_head: SCRIPT_HEAD,
      js_marker: MARKER,
      variants: {
        A: { title_element: TITLE_A, js_statement: STMT_A },
        B: { title_element: TITLE_B, js_statement: STMT_B },
      },
    },
    outputs: { 'split/index.html': out('split/index.html'), 'split/styles.css': out('split/styles.css'), 'split/script.js': out('split/script.js') },
    contracts: {
      variant_selector_explicit: true,
      default_variant_none: true,
      invalid_variant_fail_closed: true,
      a_round_trip_byte_identity: true,
      b_round_trip_byte_identity: true,
      redesign_or_refactor: false,
      framework_conversion: false,
      product_data_injection: false,
    },
    parity_status: 'PENDING_EXACT_HEAD_CAPTURE',
  };
  if (typeof mutateManifest === 'function') mutateManifest(manifest);
  if (typeof mutateRecord === 'function') mutateRecord(record, { out });
  return { root, dir, manifest, record };
}

function check(fixture) {
  return validateDualVariantMechanicalSplit({ sourceDir: fixture.dir, manifest: fixture.manifest, record: fixture.record });
}

function withFixture(options, assertion) {
  const fixture = makeMechanicalFixture(options);
  try {
    assertion(check(fixture), fixture);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

test('dual mechanical positive fixture passes', () => {
  withFixture({}, (failures) => assert.deepEqual(failures, []));
});

test('dual mechanical rejects missing variant A metadata', () => {
  withFixture(
    {
      mutateManifest: (manifest) => delete manifest.authority.variants.A,
      mutateRecord: (record) => delete record.authority.variants.A,
    },
    (failures) => assert.ok(failures.some((message) => message.includes('exactly variants A and B'))),
  );
});

test('dual mechanical rejects missing variant B metadata', () => {
  withFixture(
    {
      mutateManifest: (manifest) => delete manifest.authority.variants.B,
      mutateRecord: (record) => delete record.authority.variants.B,
    },
    (failures) => assert.ok(failures.some((message) => message.includes('exactly variants A and B'))),
  );
});

test('dual mechanical rejects wrong A SHA', () => {
  withFixture(
    {
      mutateFiles: (dir) => fs.appendFileSync(path.join(dir, 'original/A/original.html'), '<!-- drift -->\n'),
    },
    (failures) => assert.ok(failures.some((message) => message.includes('variant A') && message.includes('SHA256'))),
  );
});

test('dual mechanical rejects wrong B SHA', () => {
  withFixture(
    {
      mutateFiles: (dir) => fs.appendFileSync(path.join(dir, 'original/B/original.html'), '<!-- drift -->\n'),
    },
    (failures) => assert.ok(failures.some((message) => message.includes('variant B') && message.includes('SHA256'))),
  );
});

test('dual mechanical rejects default variant A', () => {
  withFixture(
    {
      mutateManifest: (manifest) => {
        manifest.variant_selector.default = 'A';
      },
      mutateRecord: (record) => {
        record.variant_selector.default = 'A';
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('default variant must be null'))),
  );
});

test('dual mechanical rejects default variant B', () => {
  withFixture(
    {
      mutateManifest: (manifest) => {
        manifest.variant_selector.default = 'B';
      },
      mutateRecord: (record) => {
        record.variant_selector.default = 'B';
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('default variant must be null'))),
  );
});

test('dual mechanical rejects invalid selector values', () => {
  withFixture(
    {
      mutateManifest: (manifest) => {
        manifest.variant_selector.allowed_values = ['A', 'B', 'C'];
      },
      mutateRecord: (record) => {
        record.variant_selector.allowed_values = ['A', 'B', 'C'];
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('allowed_values must be exactly'))),
  );
});

test('dual mechanical rejects a third variant C', () => {
  const extra = { drive_file_id: 'file-c', filename: 'c.html', bytes: 8, sha256: 'c'.repeat(64) };
  withFixture(
    {
      mutateManifest: (manifest) => {
        manifest.authority.variants.C = { ...extra };
      },
      mutateRecord: (record) => {
        record.authority.variants.C = { ...extra };
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('exactly variants A and B'))),
  );
});

test('dual mechanical rejects missing original A', () => {
  withFixture(
    {
      mutateFiles: (dir) => fs.rmSync(path.join(dir, 'original/A/original.html'), { force: true }),
    },
    (failures) => assert.ok(failures.some((message) => message.includes('missing original/A/original.html'))),
  );
});

test('dual mechanical rejects missing original B', () => {
  withFixture(
    {
      mutateFiles: (dir) => fs.rmSync(path.join(dir, 'original/B/original.html'), { force: true }),
    },
    (failures) => assert.ok(failures.some((message) => message.includes('missing original/B/original.html'))),
  );
});

test('dual mechanical rejects A reconstruction mismatch', () => {
  withFixture(
    {
      mutateFiles: (dir) => {
        const target = path.join(dir, 'split/script.js');
        fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}/* tail drift */\n`);
      },
      mutateRecord: (record, { out }) => {
        record.outputs['split/script.js'] = out('split/script.js');
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('variant A reconstruction mismatch'))),
  );
});

test('dual mechanical rejects B reconstruction mismatch', () => {
  withFixture(
    {
      mutateFiles: (dir) => {
        const target = path.join(dir, 'split/styles.css');
        fs.writeFileSync(target, `${fs.readFileSync(target, 'utf8')}.drift{color:red}\n`);
      },
      mutateRecord: (record, { out }) => {
        record.outputs['split/styles.css'] = out('split/styles.css');
      },
    },
    (failures) => assert.ok(failures.some((message) => message.includes('variant B reconstruction mismatch'))),
  );
});

test('dual mechanical rejects TS/TSX/JSX in split', () => {
  for (const name of ['evil.tsx', 'evil.ts', 'evil.jsx']) {
    withFixture(
      {
        mutateFiles: (dir) => fs.writeFileSync(path.join(dir, 'split', name), 'export {};\n'),
      },
      (failures) => assert.ok(
        failures.some((message) => message.includes('framework/TypeScript file forbidden')),
        `expected framework refusal for ${name}`,
      ),
    );
  }
});

test('dual mechanical rejects a derived SRC068-B identity leak', () => {
  withFixture(
    {
      mutateFiles: (dir) => fs.appendFileSync(path.join(dir, 'split/script.js'), '\n// legacy SRC068-B surface\n'),
    },
    (failures) => assert.ok(failures.some((message) => message.includes('variant Source identity leak'))),
  );
});
