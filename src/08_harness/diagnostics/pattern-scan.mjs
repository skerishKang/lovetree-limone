import fs from 'node:fs';
import path from 'node:path';

const root = 'E:\\tmp\\candidate\\SRC047';
const idx = fs.readFileSync(path.join(root, 'split', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'split', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'split', 'script.js'), 'utf8');

const count = (text, re) => (text.match(re) || []).length;
const checks = [
  ['index <style> (must be 0)', count(idx, /<style>/g), 0],
  ['index </style> (must be 0)', count(idx, /<\/style>/g), 0],
  ['index <script> inline (must be 0)', count(idx, /<script>/g), 0],
  ['index external css link (must be 1)', count(idx, /rel="stylesheet"/g), 1],
  ['index external script src (must be 1)', count(idx, /src="\.\/script\.js"/g), 1],
  ['css @import (must be 0)', count(css, /@import/g), 0],
  ['js __NEXT (must be 0)', count(js, /__NEXT/g), 0],
  ['js react (must be 0)', count(js, /\breact\b/gi), 0],
  ['js import (must be 0)', count(js, /\bimport\b/g), 0],
  ['js export (must be 0)', count(js, /\bexport\b/g), 0],
  ['js fetch( (must be 0)', count(js, /fetch\(/g), 0],
  ['js window.location (must be 0)', count(js, /window\.location/g), 0],
  ['js product_data (must be 0)', count(js, /product_data/gi), 0],
  ['js axios (must be 0)', count(js, /\baxios\b/g), 0],
  ['js TS/TSX (must be 0)', count(js, /:\s*(string|number|boolean|any|void|Promise|React)\b/g), 0],
  ['css lines (multi-line)', css.split('\n').length, null],
  ['js lines (multi-line)', js.split('\n').length, null],
  ['index lines', idx.split('\n').length, null],
];

let pass = 0, fail = 0;
for (const [label, actual, expected] of checks) {
  const ok = expected === null || actual === expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(42)} actual=${actual}${expected === null ? '' : ` expected=${expected}`}`);
}
console.log(`\nPATTERN_SCAN total=${pass + fail} pass=${pass} fail=${fail}`);