// One-shot generator for public/mvp/01/product-derivation-manifest.json.
// Derives every field from the actual bytes on disk so the manifest can never
// drift from reality. Re-run after any reviewed change to a Product surface,
// its companion bridge, or the frozen authority split.
//
//   node qa/generate-derivation-manifest.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SOURCES = {
  SRC064: ['__TRACK64_SELECT__'],
  SRC058: ['__LT58_SELECT__', '__LT58_PRODUCT__'],
  SRC056: ['__LT56_SELECT__', '__LT56_COPY__'],
  SRC057: ['__LT57_SELECT__', '__LT57_PRODUCT__'],
  SRC060: ['__LT60_SELECT__'],
};

const SEAM_COMMENTS = {
  SRC064: 'authoritative focus/close sites call __TRACK64_SELECT__(focusIdOrNull) with the runtime card id',
};

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const manifest = {
  $comment: [
    'MVP001 Productized Alpha derivation manifest (PR #607 Blocker C).',
    'Locks each Product surface to its frozen Source authority plus the reviewed bounded seam.',
    'The regression suite (tests/mvp001-isolated-static.test.mjs) validates every field against',
    'actual bytes on disk: authority hashes must match src/03_sources/<ID>/split, product CSS must',
    'equal authority CSS, product index must equal authority index plus exactly the declared bridge',
    'include delta, product script.js must match the reviewed expected hash and differ from authority',
    'script only by the declared seam identifiers, and the companion bridge must exist exactly once.',
    'Regenerate with: node qa/generate-derivation-manifest.mjs',
  ].join(' '),
  schemaVersion: 1,
  mvpId: 'MVP001',
  sources: {},
};

for (const [id, seamIdentifiers] of Object.entries(SOURCES)) {
  const s = id.toLowerCase();
  const authDir = join('src/03_sources', id, 'split');
  const prodDir = join('public/mvp/01/surfaces', s);
  const bridgeFile = `${s}-product-bridge.js`;
  const tag = `<script src="./${bridgeFile}"></script>`;

  const productHtml = readFileSync(join(prodDir, 'index.html'), 'utf8');
  const authorityHtml = readFileSync(join(authDir, 'index.html'), 'utf8');
  const occurrences = productHtml.split(tag).length - 1;
  const strippedNewline = productHtml.replace(`\n${tag}`, '');
  const strippedInline = strippedNewline.replace(tag, '');
  const includeStyle = strippedInline === authorityHtml
    ? (productHtml.includes(`\n${tag}`) ? 'own-line' : 'inline')
    : 'MISMATCH';

  manifest.sources[id] = {
    authority: {
      'index.html': sha256(join(authDir, 'index.html')),
      'script.js': sha256(join(authDir, 'script.js')),
      'styles.css': sha256(join(authDir, 'styles.css')),
    },
    product: {
      'index.html': sha256(join(prodDir, 'index.html')),
      'script.js': sha256(join(prodDir, 'script.js')),
      'styles.css': sha256(join(prodDir, 'styles.css')),
    },
    bridge: {
      file: bridgeFile,
      sha256: sha256(join(prodDir, bridgeFile)),
    },
    bridgeInclude: {
      tag,
      occurrences,
      includeStyle,
    },
    seamIdentifiers,
  };
  if (SEAM_COMMENTS[id]) manifest.sources[id].seamComment = SEAM_COMMENTS[id];
}

const json = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync('public/mvp/01/product-derivation-manifest.json', json);
console.log('WROTE public/mvp/01/product-derivation-manifest.json');
for (const id of Object.keys(SOURCES)) {
  const src = manifest.sources[id];
  console.log(`${id}: include=${src.bridgeInclude.includeStyle} occurrences=${src.bridgeInclude.occurrences} cssIdentical=${src.authority['styles.css'] === src.product['styles.css']}`);
}
