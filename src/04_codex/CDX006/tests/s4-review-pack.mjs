import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const CAP = process.env.CDX006_CAPSULE || path.resolve(process.cwd(), 'src/04_codex/CDX006');
const PACK = path.join(CAP, 'evidence', 's4', 'review-pack');
const SRC = process.env.CDX006_SERIES_DIR || path.resolve(process.cwd(), 'mst108-s4-series');
const RUN = 3;

const PAIRS = [
  ['D1_HUB_initial.png', 'D1 HUB initial'],
  ['D1_P01_initial.png', 'D1 P01 initial'],
  ['D1_P01_manual_drag_angle.png', 'D1 P01 manual drag'],
  ['D1_P01_wheel_rotation.png', 'D1 P01 wheel rotation'],
  ['D1_P01_save_interaction.png', 'D1 P01 save burst'],
  ['D1_P02_initial.png', 'D1 P02 initial'],
  ['D1_P02_selected_layer.png', 'D1 P02 selected layer'],
  ['D1_P02_legend_selection.png', 'D1 P02 legend selection'],
  ['D1_P02_story_play.png', 'D1 P02 story playing'],
  ['D1_P02_story_completion.png', 'D1 P02 story completion'],
  ['D1_P03_scene_01.png', 'D1 P03 scene01'],
  ['D1_P03_scene_05_8angle_build.png', 'D1 P03 scene05 8-angle builder'],
  ['D1_P03_scene_06_bloom.png', 'D1 P03 scene06 bloom'],
  ['T1_P01_initial.png', 'T1 P01 initial'],
  ['M1_P03_initial.png', 'M1 P03 initial'],
];

const dataUri = (side, file) => {
  const p = path.join(SRC, `run${RUN}-${side}`, file);
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
};

const CHUNK = 5;
const browser = await chromium.launch({ headless: true });
const sheets = [];

try {
  for (let s = 0; s < Math.ceil(PAIRS.length / CHUNK); s++) {
    const chunk = PAIRS.slice(s * CHUNK, s * CHUNK + CHUNK);
    const rows = chunk.map(([file, label], i) => {
      const n = i + 1 + s * CHUNK;
      return `<div class="row">
  <div class="lbl">${n}. ${label}</div>
  <div class="pair">
    <figure><figcaption>ORIGINAL</figcaption><img src="${dataUri('original', file)}"></figure>
    <figure><figcaption>SPLIT</figcaption><img src="${dataUri('split', file)}"></figure>
  </div>
</div>`;
    }).join('');

    const ctx = await browser.newContext({ viewport: { width: 1480, height: 470 * chunk.length } });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#111;color:#eee;font:13px/1.4 system-ui,sans-serif;padding:10px}
  h1{font-size:15px;margin:0 0 10px;color:#f9a8d4}
  .row{margin-bottom:14px;border-bottom:1px solid #2a2a2a;padding-bottom:10px}
  .lbl{margin-bottom:4px;color:#f9a8d4}
  .pair{display:flex;gap:10px}
  figure{margin:0;flex:1}
  figcaption{font-size:10px;color:#8ab;margin-bottom:2px}
  figcaption+img{}
  .pair figure:last-child figcaption{color:#b8a}
  img{width:100%;border:1px solid #333;display:block}
</style><h1>CDX006 S4 candidate review — run${RUN} ORIGINAL vs SPLIT — sheet ${s + 1}/${Math.ceil(PAIRS.length / CHUNK)}</h1>${rows}`,
      { waitUntil: 'load' });
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((i) => (i.complete ? null
        : new Promise((r) => { i.onload = r; i.onerror = r; }))));
    });
    const out = path.join(PACK, `review-sheet-${s + 1}.jpg`);
    await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 82 });
    sheets.push(out);
    await ctx.close();
  }
} finally {
  await browser.close();
}

/* Sheet fingerprints are recorded by the caller into review-pack/review-manifest.json; this
 * generator only reports what it wrote. */
console.log(JSON.stringify(sheets.map((p) => ({ file: path.basename(p), bytes: fs.statSync(p).size })), null, 2));
