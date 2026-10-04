/**
 * MST106 / CDX007 - S4 ROUND6C authored particle range contract (FIX E).
 *
 * The frozen inline layer authors two particle families with a per-particle random horizontal
 * displacement:
 *
 *   notes()   8 notes    --dx = Math.random()*140 - 70   =>  [-70, 70]   px
 *   petals() 20 petals  --dx = Math.random()*500 - 250  =>  [-250, 250] px
 *
 * Both surfaces load the same frozen layer, so the authored COUNT and the authored RANGE are the
 * same on both surfaces; only the drawn value differs. That is proved here per surface, and the
 * `--dx` field is contracted only after the proof holds.
 *
 * The ranges are DERIVED, not restated: they come from the authored constants in the frozen
 * bytes. A generator shape the parser does not recognise fails closed rather than falling back to
 * a hard-coded range, so the contract can never drift from the source it describes.
 */

/**
 * Extract every authored `<name>()` function whose body assigns `--dx` from a
 * `Math.random() * SPAN - OFFSET` expression, and return its proven {count, min, max}.
 *
 * Fails closed on any other shape.
 */
export function authoredParticleRanges(sourceText) {
  const out = {};
  const fnRe = /function\s+(notes|petals)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = fnRe.exec(sourceText)) !== null) {
    const name = m[1];
    const body = extractBody(sourceText, m.index + m[0].length - 1);
    if (!body) throw new Error(`PARTICLE_FUNCTION_BODY_UNRESOLVED:${name}`);
    if (out[name]) throw new Error(`PARTICLE_FUNCTION_AMBIGUOUS:${name}`);

    const countMatch = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*(\d+)\s*;/.exec(body);
    if (!countMatch) throw new Error(`PARTICLE_COUNT_NOT_LITERAL:${name}`);
    const count = Number(countMatch[1]);

    const dxMatch = /--dx['"]?\s*,\s*\(?\s*Math\.random\(\)\s*\*\s*([0-9.]+)\s*-\s*([0-9.]+)\s*\)?/.exec(body);
    if (!dxMatch) throw new Error(`PARTICLE_DX_RANGE_NOT_LITERAL:${name}`);
    const span = Number(dxMatch[1]);
    const offset = Number(dxMatch[2]);

    out[name] = { count, min: -offset, max: span - offset, span, offset };
  }
  for (const required of ['notes', 'petals']) {
    if (!out[required]) throw new Error(`PARTICLE_FUNCTION_MISSING:${required}`);
  }
  return out;
}

/** Read a brace-balanced function body starting at the `{` index. */
function extractBody(src, braceIndex) {
  if (src[braceIndex] !== '{') return null;
  let depth = 0;
  for (let i = braceIndex; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(braceIndex + 1, i);
    }
  }
  return null;
}

/**
 * Parse one `--dx` list, exactly as the semantic collector joins it: a '|' separated list of
 * authored px values.
 *
 * @returns {{ok:boolean, values:number[], errors:string[]}}
 */
export function parseDxList(joined) {
  const errors = [];
  if (joined === null || joined === undefined || joined === '') return { ok: true, values: [], errors };
  const raw = String(joined).split('|').map((s) => s.trim()).filter((s) => s !== '');
  const values = [];
  for (const token of raw) {
    const n = Number.parseFloat(token);
    if (!Number.isFinite(n)) {
      errors.push(`PARTICLE_DX_UNPARSED:${token}`);
      return { ok: false, values: [], errors };
    }
    values.push(n);
  }
  return { ok: true, values, errors };
}

/**
 * Prove one surface's authored particle emission against the frozen contract.
 *
 * @param {object} p
 * @param {string} p.surface
 * @param {object} p.provenance     the surface's provenance report (observed lifecycle)
 * @param {string} p.noteDx         collected `random_note_dx`
 * @param {string} p.petalDx        collected `random_petal_dx`
 * @param {object} p.ranges         authoredParticleRanges() output
 * @param {Array<string>} p.expect   which families this state must emit, e.g. ['petals']
 * @returns {{surface,valid,violations:Array,resolved,satisfied,violated}}
 */
export function evaluateParticleRanges(p) {
  const out = { surface: p.surface, valid: true, violations: [], resolved: 0, satisfied: 0, violated: 0 };
  const fail = (path, a, b) => {
    out.valid = false;
    out.violations.push({ path, surface: p.surface, a, b });
    out.violated += 1;
  };
  const particle = (p.provenance && p.provenance.particle) || {};
  const observedClasses = [
    ...(particle.created_by_class || []),
    ...(particle.still_present_classes || []),
  ].map((c) => String(c).split(/\s+/)[0]);
  /* The lifecycle observer records the class of every created node. A family counts as EMITTED
   * when a node of that family was actually created - a `created_count` alone is not enough,
   * because it also counts fx particles, which are not notes or petals. */
  const emittedNotes = observedClasses.includes('note');
  const emittedPetals = observedClasses.includes('petal');

  for (const family of p.expect || []) {
    const spec = p.ranges[family];
    if (!spec) { fail(`contract.${p.surface}.${family}_range`, 'AUTHORED_RANGE_MISSING', family); continue; }
    out.resolved += 1;

    const joined = family === 'notes' ? p.noteDx : p.petalDx;
    const parsed = parseDxList(joined);
    if (!parsed.ok) { fail(`contract.${p.surface}.${family}_dx_unparsed`, parsed.errors, joined); continue; }

    /* The lifecycle observer proof: the family must actually have been emitted. An un-emitted
     * family proves nothing about its range, so it is never treated as satisfied by default. */
    const emitted = family === 'notes' ? emittedNotes : emittedPetals;
    if (!emitted) {
      fail(`contract.${p.surface}.${family}_not_emitted`, 'EXPECTED_EMISSION', observedClasses);
      continue;
    }

    /* Every live dx must be finite and inside the AUTHORED range. Never widened. */
    const outOfRange = parsed.values.filter((v) => v < spec.min || v > spec.max);
    if (outOfRange.length > 0) {
      fail(`contract.${p.surface}.${family}_dx_range`, [spec.min, spec.max],
        outOfRange.slice(0, 3));
      continue;
    }
    out.satisfied += 1;
  }
  return out;
}