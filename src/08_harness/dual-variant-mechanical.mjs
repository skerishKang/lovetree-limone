import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const gitBlobSha1 = (buffer) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer])).digest('hex');

const HEX64 = /^[0-9a-f]{64}$/;
const VARIANT_KEYS = ['A', 'B'];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function variantKeysOf(variants) {
  if (!isRecord(variants)) return null;
  return Object.keys(variants).sort();
}

export function checkVariantEntry(prefix, entry, failures) {
  if (!isRecord(entry)) {
    failures.push(`${prefix}: variant entry must be an object`);
    return;
  }
  if (typeof entry.drive_file_id !== 'string' || entry.drive_file_id.length === 0) failures.push(`${prefix}: missing drive_file_id`);
  if (typeof entry.filename !== 'string' || !entry.filename.endsWith('.html')) failures.push(`${prefix}: missing/invalid filename`);
  if (!Number.isInteger(entry.bytes) || entry.bytes <= 0) failures.push(`${prefix}: missing/invalid bytes`);
  if (typeof entry.sha256 !== 'string' || !HEX64.test(entry.sha256)) failures.push(`${prefix}: missing/invalid sha256`);
}

export function resolveAuthorityMode(manifest, record) {
  const fromManifest = manifest?.authority_mode;
  const fromRecord = record?.authority_mode;
  if (fromManifest !== undefined && fromRecord !== undefined && fromManifest !== fromRecord) return { mode: null, agreement: false };
  const mode = fromManifest ?? fromRecord ?? 'SINGLE';
  if (mode !== 'SINGLE' && mode !== 'DUAL_VARIANT') return { mode: null, agreement: true };
  return { mode, agreement: true };
}

export function validateDualVariantSelector(selector, failures, where) {
  if (!isRecord(selector)) {
    failures.push(`${where}: variant_selector must be an object`);
    return;
  }
  if (selector.selector !== 'mediaVariant') failures.push(`${where}: selector must be exactly "mediaVariant"`);
  if (JSON.stringify(selector.allowed_values) !== JSON.stringify(VARIANT_KEYS)) failures.push(`${where}: allowed_values must be exactly ["A","B"]`);
  if (selector.default !== null) failures.push(`${where}: default variant must be null (no default)`);
  if (selector.fail_closed !== true) failures.push(`${where}: fail_closed must be true`);
}

function failOnVariantIdentityLeak(sourceId, value, failures, where) {
  const text = JSON.stringify(value ?? null);
  if (new RegExp(`${sourceId}-[AB]`).test(text)) failures.push(`${where}: variant Source identity derived from ${sourceId} is forbidden`);
}

/**
 * Validate a DUAL_VARIANT mechanical split without touching SINGLE behavior.
 * Returns a failures array (empty means PASS). Throws nothing.
 */
export function validateDualVariantMechanicalSplit({ sourceDir, manifest, record }) {
  const failures = [];
  const sourceId = manifest?.source_id ?? record?.source_id ?? 'UNKNOWN';

  if (!isRecord(manifest) || !isRecord(record)) {
    failures.push(`${sourceId}: manifest and materialization records are required`);
    return failures;
  }
  if (manifest.source_id !== record.source_id) {
    failures.push(`${sourceId}: materialization source_id mismatch`);
    return failures;
  }

  const mv = manifest?.authority?.variants;
  const rv = record?.authority?.variants;
  if (JSON.stringify(variantKeysOf(mv)) !== JSON.stringify(VARIANT_KEYS)) failures.push(`${sourceId}: manifest must define exactly variants A and B`);
  if (JSON.stringify(variantKeysOf(rv)) !== JSON.stringify(VARIANT_KEYS)) failures.push(`${sourceId}: materialization must define exactly variants A and B`);
  for (const key of VARIANT_KEYS) {
    checkVariantEntry(`${sourceId}: manifest variant ${key}`, mv?.[key], failures);
    checkVariantEntry(`${sourceId}: materialization variant ${key}`, rv?.[key], failures);
    if (isRecord(mv?.[key]) && isRecord(rv?.[key])) {
      if (mv[key].sha256 !== rv[key].sha256 || mv[key].bytes !== rv[key].bytes) failures.push(`${sourceId}: variant ${key} authority drift between manifest and materialization`);
      if (mv[key].drive_file_id !== rv[key].drive_file_id || mv[key].filename !== rv[key].filename) failures.push(`${sourceId}: variant ${key} identity drift between manifest and materialization`);
    }
  }

  validateDualVariantSelector(manifest?.variant_selector, failures, `${sourceId}: manifest`);
  validateDualVariantSelector(record?.variant_selector, failures, `${sourceId}: materialization`);
  if (
    isRecord(manifest?.variant_selector) && isRecord(record?.variant_selector) &&
    JSON.stringify(manifest.variant_selector) !== JSON.stringify(record.variant_selector)
  ) failures.push(`${sourceId}: variant_selector drift between manifest and materialization`);

  failOnVariantIdentityLeak(sourceId, manifest, failures, `${sourceId}: manifest`);
  failOnVariantIdentityLeak(sourceId, record, failures, `${sourceId}: materialization`);

  if (!['MATERIALIZED_PENDING_PARITY', 'ACCEPTED'].includes(record.status)) failures.push(`${sourceId}: invalid materialization status`);
  if (record.generation !== 'MECHANICAL_INLINE_EXTRACTION') failures.push(`${sourceId}: non-mechanical split generation`);

  const read = (relative) => {
    const full = path.join(sourceDir, ...relative.split('/'));
    if (!fs.existsSync(full)) {
      failures.push(`${sourceId}: missing ${relative}`);
      return null;
    }
    return fs.readFileSync(full);
  };

  const originals = {};
  for (const key of VARIANT_KEYS) {
    const bytes = read(`original/${key}/original.html`);
    if (!bytes) continue;
    originals[key] = bytes;
    if (isRecord(rv?.[key])) {
      if (bytes.length !== rv[key].bytes) failures.push(`${sourceId}: frozen original variant ${key} byte count drift`);
      if (sha256(bytes) !== rv[key].sha256) failures.push(`${sourceId}: frozen original variant ${key} SHA256 drift`);
    }
  }

  // NOTE: authority/sha256.txt content is owned by the capsule gate
  // (validateSourceCapsules); the mechanical gate pins bytes + SHA256 + Git
  // blob SHA1 per output and proves both round-trips below.
  const parts = {};
  for (const relative of ['split/index.html', 'split/styles.css', 'split/script.js']) {
    const bytes = read(relative);
    if (!bytes) continue;
    parts[relative] = bytes;
    const expected = record.outputs?.[relative];
    if (!isRecord(expected)) {
      failures.push(`${sourceId}: missing materialization metadata for ${relative}`);
      continue;
    }
    if (bytes.length !== expected.bytes) failures.push(`${sourceId}: ${relative} byte count drift`);
    if (sha256(bytes) !== expected.sha256) failures.push(`${sourceId}: ${relative} SHA256 drift`);
    if (expected.git_blob_sha1 !== undefined && gitBlobSha1(bytes) !== expected.git_blob_sha1) failures.push(`${sourceId}: ${relative} Git blob SHA1 drift`);
  }

  const mechanics = isRecord(record.mechanics) ? record.mechanics : null;
  if (!mechanics) {
    failures.push(`${sourceId}: materialization mechanics missing`);
    return failures;
  }
  for (const field of ['title_sentinel', 'css_link', 'script_src', 'script_head', 'js_marker']) {
    if (typeof mechanics[field] !== 'string' || mechanics[field].length === 0) failures.push(`${sourceId}: mechanics.${field} missing`);
  }
  for (const key of VARIANT_KEYS) {
    const v = mechanics.variants?.[key];
    if (!isRecord(v) || typeof v.title_element !== 'string' || typeof v.js_statement !== 'string') {
      failures.push(`${sourceId}: mechanics.variants.${key} missing title_element/js_statement`);
      continue;
    }
    if (!v.title_element.startsWith('<title>') || !v.title_element.endsWith('</title>')) failures.push(`${sourceId}: mechanics variant ${key} title_element malformed`);
    if (!v.js_statement.startsWith('const imageUrls=') || !v.js_statement.endsWith('];')) failures.push(`${sourceId}: mechanics variant ${key} js_statement malformed`);
  }

  const variantData = {};
  for (const key of VARIANT_KEYS) {
    const raw = read(`split/assets/variant-${key}.json`);
    if (!raw) continue;
    let data = null;
    try {
      data = JSON.parse(raw.toString('utf8'));
    } catch {
      failures.push(`${sourceId}: variant-${key}.json invalid JSON`);
      continue;
    }
    variantData[key] = data;
    if (data.variant !== key) failures.push(`${sourceId}: variant-${key}.json variant field mismatch`);
    if (!Array.isArray(data.imageUrls) || data.imageUrls.length !== 9 || data.imageUrls.some((u) => typeof u !== 'string' || u.length === 0)) {
      failures.push(`${sourceId}: variant-${key}.json must hold exactly 9 image URLs`);
    }
    if (typeof data.title !== 'string' || data.title.length === 0) failures.push(`${sourceId}: variant-${key}.json missing title`);
    if (data.titleElement !== mechanics.variants?.[key]?.title_element) failures.push(`${sourceId}: variant-${key}.json titleElement drift from mechanics`);
    if (data.jsImageUrlsStatement !== mechanics.variants?.[key]?.js_statement) failures.push(`${sourceId}: variant-${key}.json jsImageUrlsStatement drift from mechanics`);
  }
  if (variantData.A && variantData.B && Array.isArray(variantData.A.imageUrls) && Array.isArray(variantData.B.imageUrls)) {
    const overlap = variantData.A.imageUrls.filter((u) => variantData.B.imageUrls.includes(u));
    if (overlap.length > 0) failures.push(`${sourceId}: variant image URL sets must be disjoint`);
  }

  if (failures.length > 0) return failures;

  const index = parts['split/index.html'].toString('utf8');
  const css = parts['split/styles.css'].toString('utf8');
  const js = parts['split/script.js'].toString('utf8');
  const countOf = (haystack, needle) => haystack.split(needle).length - 1;
  if (countOf(index, mechanics.css_link) !== 1) failures.push(`${sourceId}: split index must contain exactly one stylesheet reference`);
  if (countOf(index, mechanics.script_src) !== 1) failures.push(`${sourceId}: split index must contain exactly one external script reference`);
  if (countOf(index, mechanics.title_sentinel) !== 1) failures.push(`${sourceId}: split index must contain exactly one variant title sentinel`);
  if (index.includes('<style>') || index.includes('</style>')) failures.push(`${sourceId}: inline style remains in split index`);
  const indexWithoutAllowedScript = index.replace(mechanics.script_src, () => '');
  if (/<script/i.test(indexWithoutAllowedScript)) failures.push(`${sourceId}: unexpected inline/alternate script remains in split index`);
  if (index.includes(mechanics.variants.A.title_element) || index.includes(mechanics.variants.B.title_element)) {
    failures.push(`${sourceId}: split index must not preselect a variant title (no default)`);
  }

  const walk = (dir) => {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
    return out;
  };
  for (const file of walk(path.join(sourceDir, 'split'))) {
    if (/\.(tsx|jsx|ts)$/i.test(file)) failures.push(`${sourceId}: framework/TypeScript file forbidden in mechanical split surface: ${path.relative(sourceDir, file)}`);
  }
  for (const file of walk(path.join(sourceDir, 'split'))) {
    if (/\.(png|jpe?g|gif|webp|mp4|woff2?|ttf|otf)$/i.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (new RegExp(`${sourceId}-[AB]`).test(text)) {
      failures.push(`${sourceId}: variant Source identity leak in ${path.relative(sourceDir, file)}`);
      break;
    }
  }

  if (countOf(js, mechanics.js_marker) !== 1) {
    failures.push(`${sourceId}: script.js must contain exactly one common-JS marker`);
    return failures;
  }
  const [bootstrap, tail] = js.split(mechanics.js_marker);
  if (!bootstrap.includes('throw') || !bootstrap.includes('mediaVariant')) {
    failures.push(`${sourceId}: script.js bootstrap must fail closed on invalid mediaVariant`);
  }
  if (tail.length === 0) failures.push(`${sourceId}: script.js common tail missing`);
  if ((js.match(/const imageUrls=/g) || []).length !== 1) failures.push(`${sourceId}: script.js must own exactly one imageUrls binding`);

  if (failures.length > 0) return failures;

  for (const key of VARIANT_KEYS) {
    const reconstructed = index
      .replace(mechanics.title_sentinel, () => mechanics.variants[key].title_element)
      .replace(mechanics.css_link, () => `<style>${css}</style>`)
      .replace(mechanics.script_src, () => `<script>${mechanics.script_head}${mechanics.variants[key].js_statement}${tail}</script>`);
    const bytes = Buffer.from(reconstructed, 'utf8');
    if (bytes.compare(originals[key]) !== 0) failures.push(`${sourceId}: variant ${key} reconstruction mismatch`);
    if (sha256(bytes) !== rv[key].sha256) failures.push(`${sourceId}: variant ${key} round-trip SHA256 mismatch`);
  }

  const contracts = isRecord(record.contracts) ? record.contracts : {};
  for (const key of ['variant_selector_explicit', 'default_variant_none', 'invalid_variant_fail_closed', 'a_round_trip_byte_identity', 'b_round_trip_byte_identity']) {
    if (contracts[key] !== true) failures.push(`${sourceId}: contract ${key} must be true`);
  }
  for (const key of ['redesign_or_refactor', 'framework_conversion', 'product_data_injection']) {
    if (contracts[key] !== false) failures.push(`${sourceId}: contract ${key} must be false`);
  }

  if (record.status === 'ACCEPTED') {
    const parityRef = record.parity_ref || manifest.parity_ref;
    if (!parityRef) failures.push(`${sourceId}: accepted materialization missing parity reference`);
    else {
      const parityPath = path.join(sourceDir, parityRef);
      if (!fs.existsSync(parityPath)) failures.push(`${sourceId}: accepted parity evidence missing`);
      else {
        let parity = null;
        try {
          parity = JSON.parse(fs.readFileSync(parityPath, 'utf8'));
        } catch {
          failures.push(`${sourceId}: accepted parity evidence invalid JSON`);
        }
        if (parity) {
          if (parity.source_id !== sourceId || parity.status !== 'ACCEPTED') failures.push(`${sourceId}: accepted parity record invalid`);
          for (const key of VARIANT_KEYS) {
            if (parity.authority?.variants?.[key]?.sha256 !== rv[key].sha256 || parity.authority?.variants?.[key]?.bytes !== rv[key].bytes) {
              failures.push(`${sourceId}: accepted parity variant ${key} authority drift`);
            }
          }
        }
      }
    }
  } else if (record.parity_status !== 'PENDING_EXACT_HEAD_CAPTURE') {
    failures.push(`${sourceId}: pending materialization must declare pending parity`);
  }

  return failures;
}
