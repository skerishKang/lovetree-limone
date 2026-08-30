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

  for (const marker of ['<style>', '</style>', '<script>', '</script>']) {
    if (count(original, marker) !== 1) throw new Error(`${sourceId}: expected exactly one ${marker}`);
  }

  const styleOpen = original.indexOf('<style>');
  const styleClose = original.indexOf('</style>', styleOpen + 7);
  const scriptOpen = original.indexOf('<script>', styleClose + 8);
  const scriptClose = original.indexOf('</script>', scriptOpen + 8);
  if (!(styleOpen >= 0 && styleClose > styleOpen && scriptOpen > styleClose && scriptClose > scriptOpen)) {
    throw new Error(`${sourceId}: invalid inline style/script ordering`);
  }

  const css = original.slice(styleOpen + '<style>'.length, styleClose);
  const js = original.slice(scriptOpen + '<script>'.length, scriptClose);
  const cssLink = '<link rel="stylesheet" href="./styles.css"/>';
  const scriptSrc = '<script src="./script.js"></script>';
  const indexHtml = original.slice(0, styleOpen)
    + cssLink
    + original.slice(styleClose + '</style>'.length, scriptOpen)
    + scriptSrc
    + original.slice(scriptClose + '</script>'.length);

  const reconstructed = indexHtml
    .replace(cssLink, `<style>${css}</style>`)
    .replace(scriptSrc, `<script>${js}</script>`);
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
      script_open: scriptOpen,
      script_close: scriptClose,
    },
    outputs: {
      'split/index.html': { bytes: Buffer.byteLength(indexHtml), sha256: sha256(Buffer.from(indexHtml, 'utf8')) },
      'split/styles.css': { bytes: Buffer.byteLength(css), sha256: sha256(Buffer.from(css, 'utf8')) },
      'split/script.js': { bytes: Buffer.byteLength(js), sha256: sha256(Buffer.from(js, 'utf8')) },
    },
    contracts: {
      exact_single_style_extraction: true,
      exact_single_script_extraction: true,
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
