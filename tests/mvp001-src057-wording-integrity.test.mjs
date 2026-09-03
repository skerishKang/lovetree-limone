import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..', 'public', 'mvp', '01', 'surfaces', 'src057');

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const manifest = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'mvp', '01', 'product-derivation-manifest.json'), 'utf8'));
const src057Manifest = manifest.sources.SRC057;

test('SRC057 product source files unchanged (index.html/script.js/styles.css)', () => {
  const expected = src057Manifest.product;
  for (const [file, sha] of Object.entries(expected)) {
    const actual = sha256File(join(BASE, file));
    assert.equal(actual, sha, `${file} SHA256 mismatch`);
  }
});

test('bridge SHA256 matches manifest', () => {
  const expected = src057Manifest.bridge.sha256;
  const actual = sha256File(join(BASE, 'src057-product-bridge.js'));
  assert.equal(actual, expected);
});

test('bridge has standalone early-return guard (zero behavior without mvpSession)', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  const guardMatch = src.match(/if\s*\(!SESSION\s*\|\|\s*SOURCE_PARAM\s*!==\s*SOURCE\s*\)\s*return/);
  assert.ok(guardMatch, 'Standalone guard missing: if (!SESSION || SOURCE_PARAM !== SOURCE) return');
});

test('bridge uses Memory-edit wording for edit entry (기억 수정)', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes('\\uAE30\\uC5EC\\u0020\\uB85C\\uC9C4'), 'Missing edit-entry Korean label');
});

test('bridge uses Memory-edit wording for modal heading (기억 수정)', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes('setProductEditWording'), 'setProductEditWording function missing');
});

test('bridge uses Korean labels for injected fields (제목/메모)', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes('\\uC900\\uAD6D'), 'Missing 제목 label');
  assert.ok(src.includes('\\uBA54\\uBCF4'), 'Missing 메모 label');
});

test('bridge uses 저장 submit button label', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes('\\uBC14\\uC601\\uC0AC\\uD56D\\u0020\\uAC00\\uB9AC'), 'Missing 변경사항 저장 label');
});
