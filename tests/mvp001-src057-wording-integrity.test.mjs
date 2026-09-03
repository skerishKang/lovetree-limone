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

test('bridge uses exact Memory-edit wording for Product edit entry and heading', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes("editBtn.textContent = '기억 수정'"), 'Missing exact 기억 수정 edit-entry label');
  assert.ok(src.includes("heading.textContent = '기억 수정'"), 'Missing exact 기억 수정 modal heading');
});

test('bridge uses exact Product description copy', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes("desc.textContent = '제목과 메모를 수정합니다. 미디어 정보는 변경하지 않습니다.'"), 'Missing exact Product edit description');
});

test('bridge uses exact Korean labels for injected fields (제목/메모)', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes('>제목</label>'), 'Missing exact 제목 label');
  assert.ok(src.includes('>메모</label>'), 'Missing exact 메모 label');
});

test('bridge uses exact 변경사항 저장 submit label', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  assert.ok(src.includes("saveBtn.textContent = '변경사항 저장'"), 'Missing exact 변경사항 저장 label');
});

test('bridge does not hard-code the legacy media-edit copy as Product replacement text', () => {
  const src = readFileSync(join(BASE, 'src057-product-bridge.js'), 'utf8');
  const replacementSection = src.slice(src.indexOf('function setProductEditWording'), src.indexOf('function hideEditEntries'));
  assert.ok(!replacementSection.includes("'미디어 링크 연결'"));
  assert.ok(!replacementSection.includes("'이 Moment에 연결'"));
});
