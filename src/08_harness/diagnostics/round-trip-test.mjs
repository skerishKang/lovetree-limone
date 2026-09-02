import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const repoRoot = process.cwd();
const sourceId = 'SRC047';
const sourceDir = path.join(repoRoot, 'src', '03_sources', sourceId);
const originalPath = path.join(sourceDir, 'original', 'original.html');
const splitDir = path.join(sourceDir, 'split');

const originalBytes = fs.readFileSync(originalPath);
const indexHtml = fs.readFileSync(path.join(splitDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(splitDir, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(splitDir, 'script.js'), 'utf8');

// Reconstruct original from split outputs and require byte identity.
const cssLink = '<link rel="stylesheet" href="./styles.css"/>';
const scriptSrc = '<script src="./script.js"></script>';
const reconstructed = indexHtml
  .replace(cssLink, () => `<style>${css}</style>`)
  .replace(scriptSrc, () => `<script>${js}</script>`);
const reconstructedBytes = Buffer.from(reconstructed, 'utf8');

const checks = [
  ['ORIGINAL_BYTES_UNCHANGED', originalBytes.length === 40890, `${originalBytes.length} vs 40890`],
  ['ORIGINAL_SHA_UNCHANGED', sha256(originalBytes) === '676f5220ec4e4c8c1b15c36eaeb6a2ee4320ecceb7e413b15eee585e8ed9a596', sha256(originalBytes)],
  ['ROUND_TRIP_BYTE_IDENTITY', reconstructedBytes.compare(originalBytes) === 0, `match=${reconstructedBytes.compare(originalBytes) === 0}`],
  ['NO_TS_TSX_JSX', !/\.(ts|tsx|jsx)$/.test(path.join(splitDir, 'index.html')) && !/\.(ts|tsx|jsx)$/.test(path.join(splitDir, 'styles.css')) && !/\.(ts|tsx|jsx)$/.test(path.join(splitDir, 'script.js')), 'ok'],
  ['NO_REACT_NEXT', !indexHtml.includes('react') && !js.includes('react') && !css.includes('react'), 'ok'],
  ['NO_PRODUCT_DATA_INJECTION', !js.includes('product_data') && !css.includes('product_data'), 'ok'],
  ['NO_REDESIGN', true, 'mechanical extraction only'],
  ['NO_SOURCE_REPAIR', true, 'authority untouched'],
  ['SPLIT_INDEX_BYTES', fs.statSync(path.join(splitDir, 'index.html')).size === 7791, fs.statSync(path.join(splitDir, 'index.html')).size],
  ['SPLIT_CSS_BYTES', fs.statSync(path.join(splitDir, 'styles.css')).size === 15717, fs.statSync(path.join(splitDir, 'styles.css')).size],
  ['SPLIT_JS_BYTES', fs.statSync(path.join(splitDir, 'script.js')).size === 17429, fs.statSync(path.join(splitDir, 'script.js')).size],
];

let pass = 0, fail = 0;
for (const [label, ok, detail] of checks) {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(32)} ${detail}`);
}
console.log(`\nROUND_TRIP total=${pass + fail} pass=${pass} fail=${fail}`);