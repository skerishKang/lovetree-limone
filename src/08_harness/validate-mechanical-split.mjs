import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAuthorityMode, validateDualVariantMechanicalSplit } from './dual-variant-mechanical.mjs';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha1 = (buffer) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer])).digest('hex');
const fail = (message) => { throw new Error(message); };

function validateAcceptedParityComparisons(sourceId, parity) {
  const comps = parity?.comparisons ?? {};
  const allowedGeometry = ['EQUAL', 'EQUAL_FOR_STABLE_SOURCE_LANDMARKS'];
  const allowedScreenshots = ['BYTE_IDENTICAL', 'BYTE_IDENTICAL_CANONICAL_PIXEL_DIGEST', 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD'];
  if (comps.dom !== 'EQUAL' || !allowedGeometry.includes(comps.geometry) || !allowedGeometry.includes(comps.computed_style) || comps.runtime_state !== 'EQUAL' || comps.interactions !== 'EQUAL' || !allowedScreenshots.includes(comps.screenshots)) fail(`${sourceId}: accepted parity result is not fully PASS`);
  if (comps.screenshots === 'CANONICAL_PIXEL_HAMMING_WITHIN_THRESHOLD') {
    const max = comps.canonical_pixel_hamming_max;
    const threshold = comps.canonical_pixel_threshold;
    if (!Number.isInteger(max) || max < 0) fail(`${sourceId}: parity canonical Hamming max invalid`);
    if (!Number.isInteger(threshold) || threshold <= 0 || threshold > 32) fail(`${sourceId}: parity canonical Hamming threshold invalid`);
    if (max > threshold) fail(`${sourceId}: parity canonical Hamming exceeds threshold`);
    if (parity?.visual_review?.central_direct_artifact_review !== true) fail(`${sourceId}: Hamming parity requires direct CENTRAL artifact review`);
    if (parity?.required_network_errors !== 0) fail(`${sourceId}: Hamming parity required-network errors present`);
  }
  if (parity?.browser_errors !== 0) fail(`${sourceId}: accepted parity browser errors present`);
}

let validated = 0;
for (const sourceId of fs.readdirSync(sourceRoot).filter((id) => /^SRC\d{3}$/.test(id)).sort()) {
  const sourceDir = path.join(sourceRoot, sourceId);
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
  if (manifest.stages?.mechanical_split_complete !== true) continue;

  if (manifest.stages?.baseline_captured !== true) fail(`${sourceId}: mechanical split cannot precede accepted baseline`);
  if (manifest.runtime_policy !== 'HTML_CSS_JS_MECHANICAL_ONLY') fail(`${sourceId}: mechanical split runtime policy drift`);
  if (manifest.tsx_allowed_during_split !== false) fail(`${sourceId}: TSX must remain forbidden during split`);
  if (manifest.mechanical_split_ref !== 'split/materialization.json') fail(`${sourceId}: mechanical_split_ref mismatch`);

  const materializationPath = path.join(sourceDir, manifest.mechanical_split_ref);
  if (!fs.existsSync(materializationPath)) fail(`${sourceId}: materialization record missing`);
  const record = JSON.parse(fs.readFileSync(materializationPath, 'utf8'));
  if (record.source_id !== sourceId) fail(`${sourceId}: materialization source_id mismatch`);
  const { mode: authorityMode, agreement: authorityModeAgreement } = resolveAuthorityMode(manifest, record);
  if (!authorityModeAgreement) fail(`${sourceId}: authority_mode disagreement between manifest and materialization`);
  if (!authorityMode) fail(`${sourceId}: unknown authority_mode`);
  if (authorityMode === 'DUAL_VARIANT') {
    if (manifest.authority_mode !== 'DUAL_VARIANT' || record.authority_mode !== 'DUAL_VARIANT') fail(`${sourceId}: dual authority_mode agreement required`);
    for (const failure of validateDualVariantMechanicalSplit({ sourceDir, manifest, record })) fail(failure);
    console.log(`SRC_MECHANICAL_SPLIT_VALIDATE_PASS=${sourceId}`);
    validated += 1;
    continue;
  }
  if (!['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(record.status)) fail(`${sourceId}: invalid materialization status`);
  if (record.generation !== 'MECHANICAL_INLINE_EXTRACTION') fail(`${sourceId}: non-mechanical split generation`);
  if (record.authority?.bytes !== manifest.authority?.bytes || record.authority?.sha256 !== manifest.authority?.sha256) fail(`${sourceId}: materialization authority drift`);
  const scriptBlocks = Array.isArray(record.boundaries?.script_blocks) ? record.boundaries.script_blocks : null;
  const styleBlocks = Array.isArray(record.boundaries?.style_blocks) ? record.boundaries.style_blocks : null;
  const multiBlock = scriptBlocks !== null && scriptBlocks.length > 1;
  const multiStyle = styleBlocks !== null && styleBlocks.length > 1;
  const scriptContract = multiBlock ? record.contracts?.exact_script_blocks_extraction : record.contracts?.exact_single_script_extraction;
  const styleContract = multiStyle ? record.contracts?.exact_style_blocks_extraction : record.contracts?.exact_single_style_extraction;
  if (styleContract !== true || scriptContract !== true || record.contracts?.round_trip_byte_identity !== true) fail(`${sourceId}: extraction contract incomplete`);
  if (scriptBlocks && scriptBlocks.length < 1) fail(`${sourceId}: script block metadata is empty`);
  if (record.contracts?.redesign_or_refactor !== false || record.contracts?.framework_conversion !== false || record.contracts?.product_data_injection !== false) fail(`${sourceId}: forbidden transformation recorded`);

  const required = ['split/index.html', 'split/styles.css', 'split/script.js'];
  const bytesByPath = {};
  for (const relative of required) {
    const file = path.join(sourceDir, relative);
    if (!fs.existsSync(file)) fail(`${sourceId}: missing ${relative}`);
    const bytes = fs.readFileSync(file);
    const expected = record.outputs?.[relative];
    if (!expected) fail(`${sourceId}: missing materialization metadata for ${relative}`);
    if (bytes.length !== expected.bytes) fail(`${sourceId}: ${relative} byte count drift`);
    if (sha256(bytes) !== expected.sha256) fail(`${sourceId}: ${relative} SHA256 drift`);
    if (gitBlobSha1(bytes) !== expected.git_blob_sha1) fail(`${sourceId}: ${relative} Git blob SHA1 drift`);
    bytesByPath[relative] = bytes;
  }

  const index = bytesByPath['split/index.html'].toString('utf8');
  const css = bytesByPath['split/styles.css'].toString('utf8');
  const js = bytesByPath['split/script.js'].toString('utf8');
  const cssLink = '<link rel="stylesheet" href="./styles.css"/>';
  const scriptSrc = '<script src="./script.js"></script>';
  if ((index.split(cssLink).length - 1) !== 1) fail(`${sourceId}: split index must contain exactly one stylesheet reference`);
  if ((index.split(scriptSrc).length - 1) !== 1) fail(`${sourceId}: split index must contain exactly one external script reference`);
  if (index.includes('<style>') || index.includes('</style>')) fail(`${sourceId}: inline style remains in split index`);
  if (/<script(?!\s+src=["']\.\/script\.js["'])/i.test(index)) fail(`${sourceId}: unexpected inline/alternate script remains in split index`);

  let reconstructed;
  const sortedBlocks = Array.isArray(record.boundaries?.sorted_blocks) ? record.boundaries.sorted_blocks : null;
  if (sortedBlocks && multiStyle) {
    const originalBytesForGaps = fs.readFileSync(path.join(sourceDir, 'original', 'original.html')).toString('utf8');
    let recon = '';
    let pos = 0;
    let cssCursor = 0;
    let jsCursor = 0;
    for (const block of sortedBlocks) {
      recon += originalBytesForGaps.slice(pos, block.open);
      if (block.type === 'style') {
        const part = css.slice(cssCursor, cssCursor + block.length);
        recon += `<style>${part}</style>`;
        cssCursor += block.length;
      } else {
        const part = js.slice(jsCursor, jsCursor + block.length);
        recon += `<script>${part}</script>`;
        jsCursor += block.length;
      }
      pos = block.close + (block.type === 'style' ? 8 : 9);
    }
    recon += originalBytesForGaps.slice(pos);
    reconstructed = recon;
  } else {
    let scriptRegion = `<script>${js}</script>`;
    if (multiBlock) {
      const gaps = record.boundaries.script_gaps;
      if (!Array.isArray(gaps) || gaps.length !== scriptBlocks.length - 1) fail(`${sourceId}: script gap metadata mismatch`);
      let cursor = 0;
      const parts = scriptBlocks.map((block) => {
        const content = js.slice(cursor, cursor + block.length);
        cursor += block.length;
        return `<script>${content}</script>`;
      });
      if (cursor !== js.length) fail(`${sourceId}: script block lengths do not cover script.js`);
      scriptRegion = parts.reduce((acc, part, i) => (i === 0 ? part : `${acc}${gaps[i - 1]}${part}`), '');
    }
    reconstructed = index.replace(cssLink, () => `<style>${css}</style>`).replace(scriptSrc, () => scriptRegion);
  }
  const reconstructedBytes = Buffer.from(reconstructed, 'utf8');
  const originalBytes = fs.readFileSync(path.join(sourceDir, 'original', 'original.html'));
  if (reconstructedBytes.compare(originalBytes) !== 0) fail(`${sourceId}: split does not round-trip byte-identically to frozen original`);
  if (originalBytes.length !== manifest.authority.bytes || sha256(originalBytes) !== manifest.authority.sha256) fail(`${sourceId}: frozen original no longer matches authority`);

  if (record.status === 'ACCEPTED') {
    const parityRef = record.parity_ref || manifest.parity_ref;
    if (!parityRef) fail(`${sourceId}: accepted materialization missing parity reference`);
    const parityPath = path.join(sourceDir, parityRef);
    if (!fs.existsSync(parityPath)) fail(`${sourceId}: accepted parity evidence missing`);
    const parity = JSON.parse(fs.readFileSync(parityPath, 'utf8'));
    if (parity.source_id !== sourceId || parity.status !== 'ACCEPTED') fail(`${sourceId}: accepted parity record invalid`);
    if (!/^[0-9a-f]{40}$/.test(parity.source_head ?? '')) fail(`${sourceId}: accepted parity source head is not an exact commit SHA`);

    const parityBindingHead = record.parity_evidence?.exact_head ?? record.source_candidate?.exact_head;
    if (parityBindingHead && parity.source_head !== parityBindingHead) fail(`${sourceId}: accepted parity source head drift`);
    if (record.parity_evidence) {
      if (!/^[0-9a-f]{40}$/.test(record.parity_evidence.exact_head ?? '')) fail(`${sourceId}: parity evidence head is not an exact commit SHA`);
      if (record.parity_evidence.artifact_id !== parity.artifact?.id) fail(`${sourceId}: parity artifact id drift`);
      if (record.parity_evidence.artifact_name !== parity.artifact?.name) fail(`${sourceId}: parity artifact name drift`);
      if (record.parity_evidence.artifact_digest !== parity.artifact?.digest) fail(`${sourceId}: parity artifact digest drift`);
    }
    if (parity.authority?.sha256 !== manifest.authority?.sha256 || parity.authority?.bytes !== manifest.authority?.bytes) fail(`${sourceId}: accepted parity authority drift`);
    validateAcceptedParityComparisons(sourceId, parity);
  } else if (record.parity_status !== 'PENDING_EXACT_HEAD_CAPTURE') {
    fail(`${sourceId}: pending materialization must declare pending parity`);
  }

  console.log(`SRC_MECHANICAL_SPLIT_VALIDATE_PASS=${sourceId}`);
  validated += 1;
}

console.log(`SRC_MECHANICAL_SPLIT_VALIDATE_COUNT=${validated}`);
