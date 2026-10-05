import fs from 'node:fs';
import path from 'node:path';

const [originalFile, splitFile, outputFile] = process.argv.slice(2);
if (!originalFile || !splitFile || !outputFile) {
  console.error('usage: node s4-suite-compare.mjs ORIGINAL_JSON SPLIT_JSON OUTPUT_JSON');
  process.exit(2);
}
const original = JSON.parse(fs.readFileSync(originalFile, 'utf8'));
const split = JSON.parse(fs.readFileSync(splitFile, 'utf8'));

const clone = (v) => JSON.parse(JSON.stringify(v));
const keyOf = (a) => `${a.ctx}/${a.surface}/${a.state}`;

function finiteTransitions(action) {
  return (action.snapshot?.animations || []).filter((x) => x.type === 'CSSTransition');
}

const p02StoryPhases = new Map([
  ['14%', { index: 0, title: 'Source Video', status: 'STORY PLAYING · SOURCE' }],
  ['28.5714%', { index: 1, title: 'Moment Cut', status: 'STORY PLAYING · MOMENT CUT' }],
  ['42.8571%', { index: 2, title: 'Person Lock', status: 'STORY PLAYING · PERSON LOCK' }],
  ['57.1429%', { index: 3, title: 'Outfit Map', status: 'STORY PLAYING · OUTFIT MAP' }],
  ['71.4286%', { index: 4, title: 'Emotion', status: 'STORY PLAYING · EMOTION' }],
  ['85.7143%', { index: 5, title: 'My Note', status: 'STORY PLAYING · MY NOTE' }],
  ['100%', { index: 6, title: 'Connection', status: 'STORY PLAYING · CONNECTION' }],
]);

function p02StoryPhase(action) {
  if (action.surface !== 'P02' || !new Set(['story_play', 'story_pause_manual_takeover']).has(action.state)) return null;
  const s = action.snapshot?.state || {};
  const phase = p02StoryPhases.get(s.progress);
  if (!phase) return { valid: false, progress: s.progress, title: s.inspectTitle, status: s.status };
  return {
    valid: s.inspectTitle === phase.title && s.status === phase.status,
    index: phase.index,
    progress: s.progress,
    title: s.inspectTitle,
    status: s.status,
  };
}

function normalize(action) {
  const a = clone(action);
  delete a.shot;
  const snap = a.snapshot;
  const state = snap.state || {};

  if (Array.isArray(state.burstScalars) && state.burstScalars.length) {
    state.burstScalars = state.burstScalars.map(() => ({ random: 'P01_BURST_SCALAR' }));
  }
  if (Array.isArray(state.particleScalars) && state.particleScalars.length) {
    state.particleScalars = state.particleScalars.map(() => ({ random: 'P03_PARTICLE_SCALAR' }));
  }
  if (a.surface === 'P01' && new Set(['initial', 'auto_orbit', 'auto_orbit_probe']).has(a.state)) {
    state.angleText = 'AUTHORED_LIVE_PHASE';
    state.figureSrc = 'AUTHORED_LIVE_PHASE';
    if (a.extra && typeof a.extra === 'object') {
      for (const k of ['angleBefore', 'angleAfter', 'before', 'after']) {
        if (k in a.extra) a.extra[k] = 'AUTHORED_LIVE_PHASE';
      }
    }
  }
  if (a.surface === 'P03' && a.state === 'scene_05_8angle_build') {
    state.buildFigureSrc = 'AUTHORED_LIVE_PHASE';
  }
  if (a.surface === 'P02' && new Set(['story_play', 'story_pause_manual_takeover']).has(a.state)) {
    state.inspectTitle = 'AUTHORED_LIVE_PHASE';
    state.progress = 'AUTHORED_LIVE_PHASE';
    state.status = 'AUTHORED_LIVE_PHASE';
  }

  const animations = [];
  for (const x of snap.animations || []) {
    if (x.type === 'CSSTransition') continue;
    const y = { ...x };
    delete y.currentTime;
    const target = String(y.target || '');
    if (y.name === 'rise' && target.includes('particle')) {
      y.duration = 'AUTHORED_RANDOM_SCALAR';
      y.delay = 'AUTHORED_RANDOM_SCALAR';
    }
    if (y.name === 'fall' && target.includes('petal')) {
      y.delay = 'AUTHORED_RANDOM_SCALAR';
    }
    animations.push(y);
  }
  animations.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  snap.animations = animations;
  return a;
}

function diff(a, b, p = '') {
  const out = [];
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [{ path: p, a, b, reason: 'type' }];
    if (a.length !== b.length) out.push({ path: `${p}.length`, a: a.length, b: b.length, reason: 'length' });
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i += 1) out.push(...diff(a[i], b[i], `${p}[${i}]`));
    return out;
  }
  const ao = a && typeof a === 'object';
  const bo = b && typeof b === 'object';
  if (ao || bo) {
    if (!ao || !bo) return [{ path: p, a, b, reason: 'type' }];
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      const q = p ? `${p}.${k}` : k;
      if (!(k in a) || !(k in b)) out.push({ path: q, a: a[k] ?? '<MISSING>', b: b[k] ?? '<MISSING>', reason: 'missing' });
      else out.push(...diff(a[k], b[k], q));
    }
    return out;
  }
  if (a !== b) out.push({ path: p, a, b, reason: 'value' });
  return out;
}

function zeroErrors(data) {
  return Object.fromEntries(Object.entries(data.errors || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : -1]));
}

if (original.actions?.length !== 64 || split.actions?.length !== 64) {
  throw new Error(`expected 64 actions per side; got ${original.actions?.length}/${split.actions?.length}`);
}

const pairs = [];
const allowed = [];
const real = [];

for (let i = 0; i < 64; i += 1) {
  const oa = original.actions[i];
  const sa = split.actions[i];
  const ok = keyOf(oa);
  const sk = keyOf(sa);
  if (ok !== sk) throw new Error(`action-order mismatch ${i}: ${ok} != ${sk}`);

  const obs = oa.snapshot?.state?.burstScalars || [];
  const sbs = sa.snapshot?.state?.burstScalars || [];
  if (obs.length || sbs.length) {
    if (obs.length !== sbs.length) real.push({ key: ok, path: 'snapshot.state.burstScalars.length', a: obs.length, b: sbs.length, reason: 'random-structure' });
    allowed.push({ key: ok, classification: 'AUTHORED_RANDOM_SCALAR', field: 'state.burstScalars', original_count: obs.length, split_count: sbs.length });
  }
  const ops = oa.snapshot?.state?.particleScalars || [];
  const sps = sa.snapshot?.state?.particleScalars || [];
  if (ops.length || sps.length) {
    if (ops.length !== sps.length) real.push({ key: ok, path: 'snapshot.state.particleScalars.length', a: ops.length, b: sps.length, reason: 'random-structure' });
    allowed.push({ key: ok, classification: 'AUTHORED_RANDOM_SCALAR', field: 'state.particleScalars', original_count: ops.length, split_count: sps.length });
  }
  if (oa.surface === 'P01' && new Set(['initial', 'auto_orbit', 'auto_orbit_probe']).has(oa.state)) {
    allowed.push({ key: ok, classification: 'AUTHORED_LIVE_PHASE', field: 'P01 orbit angle/figure phase' });
  }
  if (oa.surface === 'P03' && oa.state === 'scene_05_8angle_build') {
    allowed.push({ key: ok, classification: 'AUTHORED_LIVE_PHASE', field: 'P03 buildFigureSrc' });
  }
  const op02 = p02StoryPhase(oa);
  const sp02 = p02StoryPhase(sa);
  if (op02 || sp02) {
    if (!op02?.valid || !sp02?.valid || Math.abs(op02.index - sp02.index) > 1) {
      real.push({ key: ok, path: 'snapshot.state.P02StoryPhase', a: op02, b: sp02, reason: 'story-phase-out-of-bounds' });
    } else {
      allowed.push({
        key: ok,
        classification: 'AUTHORED_LIVE_PHASE',
        field: 'P02 850ms story interval phase',
        original_phase: op02.index,
        split_phase: sp02.index,
        phase_delta: Math.abs(op02.index - sp02.index),
      });
    }
  }
  const oft = finiteTransitions(oa);
  const sft = finiteTransitions(sa);
  if (oft.length || sft.length) {
    allowed.push({
      key: ok,
      classification: 'AUTHORED_FINITE_TRANSIENT_PHASE',
      field: 'CSSTransition capture instant',
      original_count: oft.length,
      split_count: sft.length,
      original_targets: [...new Set(oft.map((x) => String(x.target || 'unknown')))].sort(),
      split_targets: [...new Set(sft.map((x) => String(x.target || 'unknown')))].sort(),
    });
  }

  const ds = diff(normalize(oa), normalize(sa));
  if (ds.length) real.push(...ds.map((d) => ({ key: ok, ...d })));
  pairs.push({ key: ok, diff_count: ds.length, diffs: ds });
}

const summary = {
  actions: 64,
  original_errors: zeroErrors(original),
  split_errors: zeroErrors(split),
  original_assets: {
    expected: original.assetSweep.runtimeExpected,
    loaded: original.assetSweep.runtimeLoaded,
    failures: original.assetSweep.failures.length,
  },
  split_assets: {
    expected: split.assetSweep.runtimeExpected,
    loaded: split.assetSweep.runtimeLoaded,
    failures: split.assetSweep.failures.length,
  },
  launcher_equal: original.launcher.finalPath === split.launcher.finalPath,
  allowed_projection_records: allowed.length,
  allowed_classifications: [...new Set(allowed.map((x) => x.classification))].sort(),
  real_parity_diffs: real.length,
  pairs_with_real_diffs: pairs.filter((x) => x.diff_count > 0).length,
  real_diff_preview: real.slice(0, 80),
  raw_png_equality_used: false,
  pixel_tolerance_used: false,
  ssim_used: false,
  perceptual_hash_used: false,
  rng_patch_used: false,
  clock_patch_used: false,
  runtime_source_patch_used: false,
};

const evidence = { schema_version: '1.0', source_id: 'CDX006', stage: 'S4_PARITY_CANDIDATE', summary, pairs, allowed };
fs.writeFileSync(outputFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (summary.real_parity_diffs !== 0 || summary.pairs_with_real_diffs !== 0) process.exitCode = 1;
