import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const outRoot = process.env.SRC_SPLIT_CANDIDATE_DIR || '/tmp/src-mechanical-split-candidate';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const count = (text, needle) => text.split(needle).length - 1;

const sourceIds = fs.readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^SRC\d{3}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

let generated = 0;
for (const sourceId of sourceIds) {
  const sourceDir = path.join(sourceRoot, sourceId);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  if (manifest.stages?.baseline_captured !== true || manifest.stages?.mechanical_split_complete !== false) continue;

  const originalPath = path.join(sourceDir, 'original', 'original.html');
  const originalBytes = fs.readFileSync(originalPath);
  const original = originalBytes.toString('utf8');
  if (Buffer.from(original, 'utf8').compare(originalBytes) !== 0) throw new Error(`${sourceId}: original is not stable UTF-8`);
  if (originalBytes.length !== manifest.authority?.bytes) throw new Error(`${sourceId}: original byte count drift`);
  if (sha256(originalBytes) !== manifest.authority?.sha256) throw new Error(`${sourceId}: original SHA256 drift`);

  if (count(original, '<style>') !== 1 || count(original, '</style>') !== 1) throw new Error(`${sourceId}: expected exactly one style block`);
  const scriptOpenCount = count(original, '<script>');
  if (scriptOpenCount < 1 || scriptOpenCount !== count(original, '</script>')) throw new Error(`${sourceId}: unbalanced inline script blocks`);
  if (count(original, '<script') !== scriptOpenCount) throw new Error(`${sourceId}: attributed or external script tags are outside mechanical extraction scope`);

  const styleOpen = original.indexOf('<style>');
  const styleClose = original.indexOf('</style>', styleOpen + 7);
  if (!(styleOpen >= 0 && styleClose > styleOpen)) throw new Error(`${sourceId}: invalid inline style ordering`);

  const blocks = [];
  const gaps = [];
  let searchFrom = styleClose + '</style>'.length;
  for (let b = 0; b < scriptOpenCount; b += 1) {
    const open = original.indexOf('<script>', searchFrom);
    const close = original.indexOf('</script>', open + '<script>'.length);
    if (open < 0 || close < 0) throw new Error(`${sourceId}: invalid inline script ordering`);
    blocks.push({ open, close, length: close - (open + '<script>'.length), content: original.slice(open + '<script>'.length, close) });
    if (b > 0) gaps.push(original.slice(blocks[b - 1].close + '</script>'.length, open));
    searchFrom = close + '</script>'.length;
  }

  const css = original.slice(styleOpen + '<style>'.length, styleClose);
  const js = blocks.map((block) => block.content).join('');
  const cssLink = '<link rel="stylesheet" href="./styles.css"/>';
  const scriptSrc = '<script src="./script.js"></script>';
  const scriptRegion = blocks.map((block) => `<script>${block.content}</script>`).reduce((acc, part, i) => (i === 0 ? part : `${acc}${gaps[i - 1]}${part}`), '');
  const indexHtml = original.slice(0, styleOpen)
    + cssLink
    + original.slice(styleClose + '</style>'.length, blocks[0].open)
    + scriptSrc
    + original.slice(blocks[blocks.length - 1].close + '</script>'.length);

  const reconstructed = indexHtml
    .replace(cssLink, () => `<style>${css}</style>`)
    .replace(scriptSrc, () => scriptRegion);
  const reconstructedBytes = Buffer.from(reconstructed, 'utf8');
  if (reconstructedBytes.compare(originalBytes) !== 0) throw new Error(`${sourceId}: round-trip reconstruction is not byte-identical`);

  if (count(indexHtml, cssLink) !== 1 || count(indexHtml, scriptSrc) !== 1) throw new Error(`${sourceId}: external reference injection mismatch`);
  if (indexHtml.includes('<style>')) throw new Error(`${sourceId}: split index still contains inline style`);
  if (count(indexHtml, '<script>') !== 0) throw new Error(`${sourceId}: split index still contains inline script`);

  const targetDir = path.join(outRoot, sourceId, 'split');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(targetDir, 'styles.css'), css, 'utf8');
  fs.writeFileSync(path.join(targetDir, 'script.js'), js, 'utf8');

  const candidate = {
    schema_version: '1.0',
    source_id: sourceId,
    generation: 'MECHANICAL_INLINE_EXTRACTION',
    original: {
      bytes: originalBytes.length,
      sha256: sha256(originalBytes),
    },
    boundaries: {
      style_open: styleOpen,
      style_close: styleClose,
      script_open: blocks[0].open,
      script_close: blocks[blocks.length - 1].close,
      script_blocks: blocks.map((block) => ({ open: block.open, close: block.close, length: block.length })),
      script_gaps: gaps,
    },
    outputs: {
      'split/index.html': { bytes: Buffer.byteLength(indexHtml), sha256: sha256(Buffer.from(indexHtml, 'utf8')) },
      'split/styles.css': { bytes: Buffer.byteLength(css), sha256: sha256(Buffer.from(css, 'utf8')) },
      'split/script.js': { bytes: Buffer.byteLength(js), sha256: sha256(Buffer.from(js, 'utf8')) },
    },
    contracts: {
      exact_single_style_extraction: true,
      exact_single_script_extraction: blocks.length === 1,
      exact_script_blocks_extraction: true,
      round_trip_byte_identity: true,
      redesign_or_refactor: false,
      framework_conversion: false,
    },
  };
  fs.writeFileSync(path.join(outRoot, sourceId, 'candidate-manifest.json'), JSON.stringify(candidate, null, 2));
  console.log(`SRC_MECHANICAL_SPLIT_CANDIDATE_PASS=${sourceId}`);
  generated += 1;
}

console.log(`SRC_MECHANICAL_SPLIT_CANDIDATE_COUNT=${generated}`);
