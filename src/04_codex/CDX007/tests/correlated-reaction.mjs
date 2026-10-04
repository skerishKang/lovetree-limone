/**
 * MST106 / CDX007 - S4 ROUND6C correlated-emotion relational contract (FIX C / FIX D).
 *
 * Two states draw a RANDOM emotion from an authored pool:
 *
 *   D1/21_face_click_random  randomFaceReaction(): choose(allEmotionNames \ {current})
 *   D1/29_autolife_on_live   resetAuto()'s interval: choose(pool)
 *
 * Both legitimately draw DIFFERENT emotions on the two surfaces. That is not a parity defect and
 * is not waived by any projection: it is proved relationally, PER SURFACE, against the frozen
 * source contract. For a given surface with selected emotion E, every observable must be the
 * authored value that belongs to THAT surface's own E:
 *
 *   activeEmotion                     == E
 *   active portrait asset             == the E portrait
 *   emotionTitle                      == emos[E].title
 *   emotionLine                       == emos[E].line
 *   log                               names E's authored title
 *   speech                            in characterLines[E]
 *   Lubt pose asset                   == lubtPoses[poseForEmotion[E]]
 *   Lubt bubble                       in lubtTalk.emotion[E]
 *   FX family                         == fxMap[E][0]
 *
 * Nothing here demands original.selectedEmotion === split.selectedEmotion. Each surface is
 * evaluated independently; the PAIR contracts the correlated fields only when both surfaces are
 * individually clean. A wrong pose, a wrong FX family, or a stale portrait on EITHER surface
 * blocks the contract, so this is a proof and not an ignore.
 *
 * Every value compared here is read from SOURCE_CONTRACT, which is extracted from the frozen
 * bytes (see source-contract.mjs). There is no second hard-coded truth table in this file.
 */

/** Normalise a captured string for comparison: the collector already trims, but the authored
 *  metadata carries typographic quotes that must be compared the same way on both surfaces. */
function norm(v) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : null;
}

/**
 * The authored portrait asset name for an emotion, as the frozen src() helper builds it:
 *   assets/characters/<id>/<id>-<emotion>.webp
 * The contract checks SUBSTRING correspondence, so the character id is not duplicated here.
 */
function portraitCorrespondsTo(srcValue, emotion) {
  const s = norm(srcValue);
  if (!s) return false;
  return s.toLowerCase().includes(String(emotion).toLowerCase());
}

/**
 * Resolve every authored relation for one surface's selected emotion.
 * Fails closed: an unresolvable authored path is a HARNESS CONTRACT ERROR, never a pass.
 */
export function resolveCorrelations({ selectedEmotion, sourceContract }) {
  const errors = [];
  const src = sourceContract;
  if (!src) return { ok: false, errors: ['SOURCE_CONTRACT_MISSING'] };
  if (typeof selectedEmotion !== 'string' || selectedEmotion === '') {
    return { ok: false, errors: ['CORRELATED_SELECTED_EMOTION_MISSING'] };
  }
  if (!src.emotions.includes(selectedEmotion)) {
    return { ok: false, errors: [`CORRELATED_EMOTION_NOT_AUTHORED:${selectedEmotion}`] };
  }
  const meta = src.emoMeta ? src.emoMeta[selectedEmotion] : null;
  if (!meta) return { ok: false, errors: [`CORRELATED_EMO_META_MISSING:${selectedEmotion}`] };

  const pose = src.poseForEmotion[selectedEmotion];
  if (!pose) return { ok: false, errors: [`CORRELATED_POSE_MISSING:${selectedEmotion}`] };
  const poseAsset = src.lubtPoses[pose];
  if (!poseAsset) return { ok: false, errors: [`CORRELATED_POSE_ASSET_MISSING:${pose}`] };

  const fx = src.fxMap[selectedEmotion];
  if (!Array.isArray(fx) || !fx[0]) return { ok: false, errors: [`CORRELATED_FX_MISSING:${selectedEmotion}`] };

  const lines = src.characterLines[selectedEmotion];
  if (!Array.isArray(lines)) return { ok: false, errors: [`CORRELATED_LINES_MISSING:${selectedEmotion}`] };

  const bubbles = src.lubtTalk.emotion[selectedEmotion];
  if (!Array.isArray(bubbles)) return { ok: false, errors: [`CORRELATED_BUBBLE_MISSING:${selectedEmotion}`] };

  return {
    ok: true,
    errors,
    selectedEmotion,
    meta,
    pose,
    poseAsset,
    fxFamily: `fx-${fx[0]}`,
    lines,
    bubbles,
  };
}

/**
 * Evaluate ONE surface against its own selected emotion.
 *
 * @param {object} p
 * @param {string} p.surface           'original' | 'split'
 * @param {object} p.dom               that surface's collected semantic dom
 * @param {object} p.provenance        that surface's provenance report
 * @param {string} p.preEmotion        that surface's pre-action emotion
 * @param {object} p.sourceContract    the extracted SOURCE_CONTRACT
 * @param {boolean} p.requireLubt      true for D1/21 (calls callLubt); false for Auto Life
 * @returns {{valid:boolean, violated:number, satisfied:number, harnessErrors:string[],
 *            violations:Array<{path:string,surface:string,a:*,b:*}>}}
 */
export function evaluateSurfaceCorrelation(p) {
  const surface = p.surface;
  const out = {
    surface, valid: false, violated: 0, satisfied: 0,
    harnessErrors: [], violations: [],
  };
  const sel = p.provenance ? p.provenance.selectedEmotion : null;
  const r = resolveCorrelations({ selectedEmotion: sel, sourceContract: p.sourceContract });
  if (!r.ok) {
    /* The selected emotion is required instrumentation for a correlated state. A missing or
     * unauthored value is a HARNESS CONTRACT ERROR: it proves nothing either way, so evaluation
     * aborts instead of falling through to exact comparison. */
    out.harnessErrors.push(...r.errors.map((e) => `${e}:${surface}`));
    return out;
  }

  const dom = p.dom || {};
  const fail = (path, a, b) => {
    out.violated += 1;
    out.violations.push({ path, surface, a, b });
  };

  /* (1) ROUND6G - STATE-SPECIFIC CHANGED-EMOTION SEMANTICS.
   *
   * The two correlated random states draw from DIFFERENT authored pools, and only one of them
   * excludes the current emotion:
   *
   *   D1/21 randomFaceReaction():
   *     const pool = allEmotionNames.filter(name => name !== emotion);
   *     const next = choose(pool);
   *   => an unchanged draw is IMPOSSIBLE, so `selected !== preEmotion` is a required invariant:
   *      if it ever held, the random reaction did not exercise the correlated path.
   *
   *   D1/29 resetAuto()'s interval:
   *     setEmotion(pool[Math.floor(Math.random()*pool.length)])
   *   => the pool does NOT exclude the current emotion, so `selected === preEmotion` is an
   *      AUTHORED no-op tick and must be allowed.
   *
   * The requirement is therefore declared PER CONTRACT (`requireChangedEmotion`), never relaxed
   * globally. There is no generic unchanged-emotion waiver: a state that does not declare the
   * requirement keeps the strict behaviour. */
  if (p.requireChangedEmotion === true
    && p.preEmotion !== undefined && p.preEmotion !== null
    && r.selectedEmotion === p.preEmotion) {
    fail('semanticContract.correlated_emotion_unchanged', r.selectedEmotion, p.preEmotion);
  }

  /* (2) The active emotion IS this surface's own selection. */
  if (dom.activeEmotion !== r.selectedEmotion) {
    fail('semanticContract.correlated_active_emotion', r.selectedEmotion, dom.activeEmotion);
  }

  /* (3) The active portrait is this surface's own selection. FIX D made the collector
   * source-derived, so this compares against the authored asset for the selected emotion. */
  if (!portraitCorrespondsTo(dom.visible_portrait_src, r.selectedEmotion)) {
    fail('semanticContract.correlated_portrait', r.selectedEmotion, dom.visible_portrait_src);
  }

  /* (4) The title and line are this emotion's authored metadata.
   * ROUND6D (FIX 1): the collector's real field is `random_emotion_title`. The ROUND6C evaluator
   * read `dom.emotion_title`, which the collector never defines, so this comparison silently
   * compared `undefined` against the authored title and failed on EVERY surface. The field name
   * is validated against the collector by a static regression test, fail-closed. */
  if (norm(dom.random_emotion_title) !== norm(r.meta.title)) {
    fail('semanticContract.correlated_emotion_title', r.meta.title, dom.random_emotion_title);
  }
  if (norm(dom.emotion_line) !== norm(`“${r.meta.line}”`)) {
    fail('semanticContract.correlated_emotion_line', r.meta.line, dom.emotion_line);
  }

  /* (5) The log names this emotion's authored title. */
  if (!String(dom.log_text || '').toUpperCase().includes(String(r.meta.title).toUpperCase())) {
    fail('semanticContract.correlated_log', r.meta.title, dom.log_text);
  }

  /* (6) The retained speech, when visible, is one of this emotion's authored lines. D1/21 shows
   * a characterLines draw; Auto Life shows no speech, so an invisible speech is not a failure. */
  if (dom.speechVisible) {
    const spoken = norm(dom.random_speech);
    if (!r.lines.includes(spoken)) {
      fail('semanticContract.correlated_speech', r.lines.slice(0, 2), dom.random_speech);
    }
  }

  /* (7) The Lubt pose asset is the authored pose for this emotion, resolved THROUGH lubtPoses. */
  if (p.requireLubt) {
    const poseSrc = norm(dom.lubt_pose_src);
    const wanted = norm(r.poseAsset);
    if (!poseSrc || poseSrc.split('/').pop() !== wanted) {
      fail('semanticContract.correlated_lubt_pose', wanted, poseSrc);
    }
  }

  /* (8) The FX family emitted is this emotion's authored family. The particle lifecycle is the
   * observed evidence; a different valid emotion legitimately emits a different authored family,
   * which is exactly why this is relational rather than an equality check. */
  const prov = p.provenance || {};
  const particle = prov.particle || {};
  const observed = new Set([
    ...(particle.created_by_class || []),
    ...(particle.still_present_classes || []),
  ].map((c) => String(c).split(/\s+/).find((tok) => /^fx-/.test(tok)) || '').filter(Boolean));
  if (observed.size > 0 && !observed.has(r.fxFamily)) {
    fail('semanticContract.correlated_fx_family', r.fxFamily, [...observed].sort());
  }

  /* (9) The retained bubble text is one of this emotion's authored emotion lines. */
  if (dom.speechVisible || p.requireLubt) {
    const bubble = norm(dom.random_lubt_bubble);
    if (bubble && !r.bubbles.includes(bubble)) {
      fail('semanticContract.correlated_bubble', r.bubbles.slice(0, 2), dom.random_lubt_bubble);
    }
  }

  if (out.violated === 0) out.satisfied += 1;
  out.valid = out.harnessErrors.length === 0;
  return out;
}

/**
 * ROUND6D (FIX 3/FIX 4) The EXPECTED particle lifecycle for one surface's own selected emotion.
 *
 * Derived from the frozen source, never restated:
 *
 *   base setEmotion(name)        `if(name==='sing')notes();`
 *                                `if(name==='touched'||name==='laugh')petals();`
 *   V2 wrapper setEmotion(n,user)`if (user) burstEmotion(name);`
 *
 * D1/21 calls setEmotion(next, true)  -> user-triggered, so the V2 FX burst IS expected.
 * An Auto Life tick calls setEmotion(selected) with no user flag -> no V2 FX is expected.
 *
 * The counts come from the authored particle functions (8 notes, and fxMap[E][2] FX particles).
 *
 * @param {object} p
 * @param {string} p.selectedEmotion  this surface's own draw
 * @param {boolean} p.userTriggered   true for the D1/21 user path
 * @param {object} p.sourceContract
 */
export function expectedParticleLifecycle({ selectedEmotion, userTriggered, sourceContract }) {
  const src = sourceContract;
  if (!src || !src.baseParticleTriggers || !src.burstOnUser) {
    return { ok: false, error: 'PARTICLE_TRIGGER_CONTRACT_MISSING' };
  }
  if (typeof selectedEmotion !== 'string' || !src.emotions.includes(selectedEmotion)) {
    return { ok: false, error: `PARTICLE_TRIGGER_EMOTION_NOT_AUTHORED:${selectedEmotion}` };
  }
  const family = src.baseParticleTriggers[selectedEmotion] || null;
  const counts = {
    note: family === 'notes' ? src.particleCounts.notes : 0,
    petal: family === 'petals' ? src.particleCounts.petals : 0,
  };
  let fx = { family: null, count: 0 };
  if (userTriggered) {
    const spec = src.fxMap[selectedEmotion];
    if (!Array.isArray(spec)) return { ok: false, error: `PARTICLE_FX_NOT_AUTHORED:${selectedEmotion}` };
    fx = { family: `fx-${spec[0]}`, count: spec[2] };
  }
  return { ok: true, selectedEmotion, userTriggered: !!userTriggered, family, counts, fx };
}

/**
 * ROUND6D (FIX 3/FIX 4) Prove one surface's observed particle lifecycle against its OWN expected
 * relation. Cross-surface equality is never required: two surfaces drawing different emotions
 * legitimately produce different, both-correct, particle lifecycles.
 */
export function evaluateParticleLifecycle(p) {
  const out = {
    surface: p.surface, valid: true, violated: 0, satisfied: 0,
    harnessErrors: [], violations: [],
  };
  const exp = expectedParticleLifecycle({
    selectedEmotion: p.selectedEmotion,
    userTriggered: p.userTriggered,
    sourceContract: p.sourceContract,
  });
  if (!exp.ok) {
    out.valid = false;
    out.harnessErrors.push(`${exp.error}:${p.surface}`);
    return out;
  }
  const fail = (path, a, b) => {
    out.valid = false;
    out.violated += 1;
    out.violations.push({ path, surface: p.surface, a, b });
  };

  const particle = (p.provenance && p.provenance.particle) || {};
  const byClass = particle.created_count_by_class || {};
  const noteCount = byClass.note || 0;
  const petalCount = byClass.petal || 0;

  /* (a) The BASE particles the selected emotion authors. */
  if (noteCount !== exp.counts.note) {
    fail('semanticContract.particle_base_notes', exp.counts.note, noteCount);
  }
  if (petalCount !== exp.counts.petal) {
    fail('semanticContract.particle_base_petals', exp.counts.petal, petalCount);
  }

  /* (b) The V2 FX burst. A user-triggered call emits its emotion's authored family with the
   * authored count; an Auto Life tick emits none at all.
   *
   * The authored FX classes are authored WITH the emotion prefix - burstEmotion() sets
   * `fx fx-${spec[0]}` - so the observer's per-class count is keyed by the full class token.
   * Both the plain `fx` token and the family token are summed, so a report keyed either way is
   * counted exactly once. */
  const fxKeys = Object.keys(byClass).filter((k) => k === 'fx' || k.startsWith('fx-') || k.startsWith('fx '));
  const fxCount = fxKeys.reduce((a, k) => a + (byClass[k] || 0), 0);
  /* Normalize an observed key to its family token, so a report keyed `fx`, `fx-heart` or
   * `fx fx-heart` all resolve to the same family name. */
  const familyOf = (k) => {
    const m = /(?:^|\s)fx-([a-z]+)/.exec(String(k));
    return m ? `fx-${m[1]}` : null;
  };
  const observedFamilies = [...new Set(fxKeys.map(familyOf).filter(Boolean))]
    .filter((f) => {
      const total = fxKeys.filter((k) => familyOf(k) === f)
        .reduce((a, k) => a + (byClass[k] || 0), 0);
      return total > 0;
    });
  if (!exp.fx.family) {
    if (fxCount !== 0) {
      fail('semanticContract.particle_v2_fx_absent', 0, fxCount);
    }
  } else {
    if (!observedFamilies.includes(exp.fx.family)) {
      fail('semanticContract.particle_v2_fx_family', exp.fx.family, observedFamilies);
    } else if (fxCount !== exp.fx.count) {
      fail('semanticContract.particle_v2_fx_count', exp.fx.count, fxCount);
    }
  }

  if (out.violated === 0) out.satisfied += 1;
  return out;
}

/**
 * ROUND6F - THE BASE-PARTICLE CONTRACT, per surface, source-derived.
 *
 * notes() and petals() are the only authored base particle families, and setEmotion() decides
 * which one (if either) a given emotion authors:
 *
 *   selected == sing            => notes,   count 8,  --dx in [-70, 70]     (note CSS animation)
 *   selected in {touched,laugh} => petals,  count 20, --dx in [-250, 250]   (petal CSS animation)
 *   otherwise                   => neither, count 0,  no dx, no animation
 *
 * The counts and the ranges come from the frozen bytes via SOURCE_CONTRACT.particleCounts, which
 * was derived by the same fail-closed parser that reads the authored loop bounds and the authored
 * `Math.random()*SPAN-OFFSET` expressions. Nothing here restates them.
 *
 * This proves the relation PER SURFACE. Two surfaces that drew different emotions legitimately
 * emit different - both correct - base families; cross-surface equality is never required and
 * never demanded here.
 *
 * The dx range and the CSS-animation presence are part of the same proof, so a surface whose
 * authored family is present with the authored count but an out-of-range displacement still
 * FAILS. There is no generic particle waiver and no blanket animation filtering: an animation
 * family is contractable only when the surface's own selected emotion authors it.
 *
 * @returns {{ok:boolean, error:string|null, family:string|null, count:number,
 *            dxRange:object|null, animationKey:string|null}}
 */
export function expectedBaseParticleRelation({ selectedEmotion, sourceContract }) {
  const src = sourceContract;
  if (!src || !src.baseParticleTriggers || !src.particleCounts) {
    return { ok: false, error: 'BASE_PARTICLE_CONTRACT_MISSING' };
  }
  if (typeof selectedEmotion !== 'string' || !src.emotions.includes(selectedEmotion)) {
    return { ok: false, error: `BASE_PARTICLE_EMOTION_NOT_AUTHORED:${selectedEmotion}` };
  }
  const family = src.baseParticleTriggers[selectedEmotion] || null;
  if (family === 'notes') {
    return {
      ok: true, error: null, family: 'note', count: src.particleCounts.notes,
      dxRange: src.particleCounts.noteDxRange, animationKey: 'note|note|CSSAnimation|finite',
    };
  }
  if (family === 'petals') {
    return {
      ok: true, error: null, family: 'petal', count: src.particleCounts.petals,
      dxRange: src.particleCounts.petalDxRange, animationKey: 'petal|petal|CSSAnimation|finite',
    };
  }
  return {
    ok: true, error: null, family: null, count: 0, dxRange: null, animationKey: null,
  };
}

/** Parse one collected `--dx` list into finite px values. Fail-closed on an unparseable token. */
export function parseBaseDx(joined) {
  if (joined === null || joined === undefined || joined === '') return { ok: true, values: [] };
  const out = [];
  for (const token of String(joined).split('|')) {
    const t = token.trim();
    if (t === '') continue;
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n)) return { ok: false, values: [], error: `BASE_DX_UNPARSED:${t}` };
    out.push(n);
  }
  return { ok: true, values: out };
}

/**
 * ROUND6F - Prove ONE surface's base-particle relation against its own selected emotion.
 *
 * Checks, for the family that surface's emotion authors:
 *   count       == the authored count,
 *   every dx    finite and inside the authored range,
 *   animation   the authored base CSS animation present on this surface.
 * And for a family that emotion does NOT author: absent count, no dx, no animation.
 *
 * The observed CSS animations are passed in by the caller from the real inventory, so the
 * animation relation is proven against what the page actually reported, not assumed.
 *
 * @param {object} p
 * @param {string} p.surface
 * @param {string} p.selectedEmotion  this surface's own draw
 * @param {object} p.provenance
 * @param {string} p.noteDx           collected `random_note_dx`
 * @param {string} p.petalDx          collected `random_petal_dx`
 * @param {string[]} p.observedAnimations  inventory keys observed on this surface
 * @param {object} p.sourceContract
 */
export function evaluateBaseParticleRelation(p) {
  const out = {
    surface: p.surface, valid: true, violated: 0, satisfied: 0,
    harnessErrors: [], violations: [],
  };
  const rel = expectedBaseParticleRelation({
    selectedEmotion: p.selectedEmotion, sourceContract: p.sourceContract,
  });
  if (!rel.ok) {
    out.valid = false;
    out.harnessErrors.push(`${rel.error}:${p.surface}`);
    return out;
  }
  const fail = (path, a, b) => {
    out.valid = false;
    out.violated += 1;
    out.violations.push({ path, surface: p.surface, a, b });
  };
  const particle = (p.provenance && p.provenance.particle) || {};
  const byClass = particle.created_count_by_class || {};
  const animations = Array.isArray(p.observedAnimations) ? p.observedAnimations : [];

  for (const fam of ['note', 'petal']) {
    const isAuthored = rel.family === fam;
    const joined = fam === 'note' ? p.noteDx : p.petalDx;
    const observedCount = byClass[fam] || 0;
    const parsed = parseBaseDx(joined);

    if (!parsed.ok) {
      fail(`semanticContract.base_${fam}_dx_unparsed`, parsed.error, joined);
      continue;
    }
    /* (1) COUNT. */
    const expectedCount = isAuthored ? rel.count : 0;
    if (observedCount !== expectedCount) {
      fail(`semanticContract.base_${fam}_count`, expectedCount, observedCount);
      continue;
    }
    /* (2) DX VALUE COUNT must agree with the authored count, and be in range. */
    if (parsed.values.length !== expectedCount) {
      fail(`semanticContract.base_${fam}_dx_count`, expectedCount, parsed.values.length);
      continue;
    }
    if (isAuthored) {
      const range = rel.dxRange;
      const bad = parsed.values.filter((v) => v < range.min || v > range.max);
      if (bad.length > 0) {
        fail(`semanticContract.base_${fam}_dx_range`, [range.min, range.max], bad.slice(0, 3));
        continue;
      }
    }
    /* (3) The authored base CSS animation, present exactly when the family is authored. */
    const otherKey = fam === 'note'
      ? 'petal|petal|CSSAnimation|finite' : 'note|note|CSSAnimation|finite';
    const myKey = fam === 'note'
      ? 'note|note|CSSAnimation|finite' : 'petal|petal|CSSAnimation|finite';
    const minePresent = animations.some((k) => String(k).endsWith(myKey)
      || String(k).split('|').includes(fam));
    const otherPresent = otherKey !== myKey
      && animations.some((k) => String(k).endsWith(otherKey));
    if (minePresent !== isAuthored) {
      fail(`semanticContract.base_${fam}_animation`, isAuthored, minePresent);
      continue;
    }
    /* An emotion that authors NO base family must emit no base animation at all. */
    if (rel.family === null && (minePresent || otherPresent)) {
      fail('semanticContract.base_animation_unexpected', 'no base family', [minePresent, otherPresent]);
      continue;
    }
    out.satisfied += 1;
  }
  return out;
}

/**
 * ROUND6E PHASE 1 - PER-SURFACE DETERMINISTIC DIAGNOSTIC.
 *
 * Reads every D1/29 (and D1/21) source relation and reports the observed value next to the
 * source-derived expectation, WITHOUT deciding anything. This exists so a pair-gate question can
 * be answered from evidence instead of inference: every clause is reported independently, so a
 * false pair verdict can be attributed to a specific clause (or shown not to be caused by one).
 *
 * It changes no contract semantics: nothing here is used to gate contraction.
 */
export function diagnoseSurfaceCorrelation(p) {
  const surface = p.surface;
  const sel = p.provenance ? p.provenance.selectedEmotion : null;
  const dom = p.dom || {};
  const particle = (p.provenance && p.provenance.particle) || {};
  const byClass = particle.created_count_by_class || {};
  const out = {
    surface,
    selectedEmotion: sel,
    selected_in_autolife_pool: Array.isArray(p.autolifePool)
      ? p.autolifePool.includes(sel) : null,
    activeEmotion: dom.activeEmotion ?? null,
    active_portrait: dom.visible_portrait_src ?? null,
    emotionTitle: dom.random_emotion_title ?? null,
    emotionLine: dom.emotion_line ?? null,
    logText: dom.log_text ?? null,
  };
  const r = resolveCorrelations({ selectedEmotion: sel, sourceContract: p.sourceContract });
  out.correlation_resolved = r.ok;
  /* ROUND6G: the changed-emotion requirement is per contract, and a no-op tick is reported
   * explicitly rather than inferred. */
  out.require_changed_emotion = p.requireChangedEmotion === true;
  out.preEmotion = p.preEmotion ?? null;
  out.selected_equals_pre = r.ok ? (sel === p.preEmotion) : null;
  out.noop_tick_allowed = r.ok ? !(p.requireChangedEmotion === true) : null;
  if (r.ok) {
    out.expected_emotion_title = r.meta.title;
    out.emotion_title_matches = String(out.emotionTitle || '').trim() === r.meta.title;
    out.emotion_line_matches = String(out.emotionLine || '').replace(/\s+/g, ' ').trim()
      === `“${r.meta.line}”`;
    out.log_matches = String(out.logText || '').toUpperCase().includes(r.meta.title.toUpperCase());
    out.active_emotion_matches = out.activeEmotion === r.selectedEmotion;
    out.active_portrait_matches = portraitCorrespondsTo(out.active_portrait, r.selectedEmotion);
  } else {
    out.expected_emotion_title = null;
    out.emotion_title_matches = null;
    out.emotion_line_matches = null;
    out.log_matches = null;
    out.active_emotion_matches = null;
    out.active_portrait_matches = null;
  }

  /* The per-surface particle relation: expectations come from the frozen triggers only. */
  const exp = expectedParticleLifecycle({
    selectedEmotion: sel,
    userTriggered: p.userTriggered === true,
    sourceContract: p.sourceContract,
  });
  out.particle_relation_resolved = exp.ok;
  if (exp.ok) {
    out.expected_base_petals = exp.counts.petal;
    out.observed_base_petals = byClass.petal || 0;
    out.petal_count_matches = out.observed_base_petals === out.expected_base_petals;
    out.expected_base_notes = exp.counts.note;
    out.observed_base_notes = byClass.note || 0;
    out.note_count_matches = out.observed_base_notes === out.expected_base_notes;
    out.expected_v2_fx = exp.fx.family ? exp.fx.count : 0;
    const fxKeys = Object.keys(byClass).filter((k) => k === 'fx' || k.startsWith('fx-') || k.startsWith('fx '));
    out.observed_v2_fx = fxKeys.reduce((a, k) => a + (byClass[k] || 0), 0);
    out.v2_fx_matches = out.expected_v2_fx === out.observed_v2_fx;
    /* The observed petal dx list against the authored range, per surface. */
    const range = (p.sourceContract.particleCounts || {}).petalDxRange || null;
    const parsed = p.petalDx === null || p.petalDx === undefined || p.petalDx === ''
      ? [] : String(p.petalDx).split('|').map((s) => Number.parseFloat(s.trim())).filter(Number.isFinite);
    out.observed_petal_dx_values = parsed.length;
    out.expected_petal_dx_values = exp.counts.petal;
    out.petal_dx_value_count_matches = parsed.length === exp.counts.petal;
    out.petal_dx_range = range;
    out.petal_dx_range_matches = range
      ? parsed.every((v) => v >= range.min && v <= range.max)
      : null;
  } else {
    out.expected_base_petals = null;
    out.observed_base_petals = null;
    out.petal_count_matches = null;
    out.expected_base_notes = null;
    out.observed_base_notes = null;
    out.note_count_matches = null;
    out.expected_v2_fx = null;
    out.observed_v2_fx = null;
    out.v2_fx_matches = null;
    out.observed_petal_dx_values = null;
    out.expected_petal_dx_values = null;
    out.petal_dx_value_count_matches = null;
    out.petal_dx_range = null;
    out.petal_dx_range_matches = null;
  }

  /* The surface's own contract verdict, reported from the real evaluators.
   * ROUND6G: the changed-emotion clause participates only when THIS contract requires it, so an
   * Auto Life no-op tick is judged on every other relation exactly as before. */
  out.surface_contract = !!(out.correlation_resolved
    && out.active_emotion_matches && out.active_portrait_matches
    && out.emotion_title_matches && out.emotion_line_matches && out.log_matches
    && out.petal_count_matches && out.note_count_matches && out.v2_fx_matches
    && out.petal_dx_value_count_matches && out.petal_dx_range_matches
    && (p.requireChangedEmotion !== true || out.selected_equals_pre === false));
  return out;
}
export function pairCorrelation(originalResult, splitResult) {
  const o = originalResult || null;
  const s = splitResult || null;
  const harnessErrors = [
    ...(o ? o.harnessErrors : []),
    ...(s ? s.harnessErrors : []),
  ];
  if (!o || !s) {
    return {
      valid: false, contract: false, harnessErrors,
      violations: [...(o ? o.violations : []), ...(s ? s.violations : [])],
      violated: (o ? o.violated : 0) + (s ? s.violated : 0),
    };
  }
  const violations = [...o.violations, ...s.violations];
  const valid = o.valid && s.valid;
  return {
    valid,
    contract: valid && violations.length === 0,
    harnessErrors,
    violations,
    violated: o.violated + s.violated,
  };
}

/** The semantic fields the correlated contract owns once the pair is proven clean. */
export const CORRELATED_FIELDS = [
  'dom.activeEmotion', 'dom.random_emotion_title',
  'dom.emotion_line', 'dom.random_log', 'dom.log_text', 'dom.log',
  'dom.portraitA_src', 'dom.portraitB_src', 'dom.visible_portrait_src',
  'dom.lubt_pose_src', 'dom.random_speech', 'dom.random_lubt_bubble',
];

/** Every collector field this evaluator reads. A name that the collector does not define would
 *  silently compare `undefined` and fail, so this list is checked against the collector. */
export const CORRELATED_READ_FIELDS = [
  'activeEmotion', 'random_emotion_title', 'emotion_line', 'log_text',
  'visible_portrait_src', 'lubt_pose_src', 'speechVisible', 'random_speech',
  'random_lubt_bubble',
];