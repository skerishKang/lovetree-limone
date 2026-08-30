import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src', '03_sources');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha1 = (buffer) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer])).digest('hex');
const fail = (message) => { throw new Error(message); };

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
  if (!['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(record.status)) fail(`${sourceId}: invalid materialization status`);
  if (record.generation !== 'MECHANICAL_INLINE_EXTRACTION') fail(`${sourceId}: non-mechanical split generation`);
  if (record.authority?.bytes !== manifest.authority?.bytes || record.authority?.sha256 !== manifest.authority?.sha256) fail(`${sourceId}: materialization authority drift`);
  if (record.contracts?.exact_single_style_extraction !== true || record.contracts?.exact_single_script_extraction !== true || record.contracts?.round_trip_byte_identity !== true) fail(`${sourceId}: extraction contract incomplete`);
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

  const reconstructed = index.replace(cssLink, `<style>${css}</style>`).replace(scriptSrc, `<script>${js}</script>`);
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
    if (parity.source_head !== 'f74bdd34a0f9d54ff285c3c7f287d8021ea988d9') fail(`${sourceId}: accepted parity source head drift`);
    if (parity.authority?.sha256 !== manifest.authority?.sha256 || parity.authority?.bytes !== manifest.authority?.bytes) fail(`${sourceId}: accepted parity authority drift`);
    if (parity.comparisons?.dom !== 'EQUAL' || parity.comparisons?.geometry !== 'EQUAL' || parity.comparisons?.computed_style !== 'EQUAL' || parity.comparisons?.runtime_state !== 'EQUAL' || parity.comparisons?.interactions !== 'EQUAL' || parity.comparisons?.screenshots !== 'BYTE_IDENTICAL') fail(`${sourceId}: accepted parity result is not fully PASS`);
    if (parity.browser_errors !== 0) fail(`${sourceId}: accepted parity browser errors present`);
  } else if (record.parity_status !== 'PENDING_EXACT_HEAD_CAPTURE') {
    fail(`${sourceId}: pending materialization must declare pending parity`);
  }

  console.log(`SRC_MECHANICAL_SPLIT_VALIDATE_PASS=${sourceId}`);
  validated += 1;
}

console.log(`SRC_MECHANICAL_SPLIT_VALIDATE_COUNT=${validated}`);
