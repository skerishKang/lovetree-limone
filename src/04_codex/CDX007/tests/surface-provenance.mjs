/**
 * MST106 / CDX007 - S4 ROUND6B surface-specific provenance evaluation (Node side).
 *
 * Each surface is evaluated INDEPENDENTLY and the two results are paired:
 *
 *   original.valid === true AND split.valid === true   -> the field may be CONTRACTED
 *   anything else                                      -> the field is not contracted
 *
 * ROUND6B replaces the old "final text looks like it came from some pool" guess with PROVENANCE:
 *
 *   (6) A later lubtTalk.idle write is allowed ONLY when the trace actually proves the ordering
 *       target-owned write -> later idle write. Being in the idle pool is never sufficient.
 *   (7) When the target does not own a Lubt write, the retained preState text is allowed, or a
 *       PROVEN later authored write. This is not a generic pool union.
 *   (8) The final captured bubble text must equal the LAST observed write, or - when the target
 *       wrote nothing - the recorded preState text.
 *   (9) Pair success requires BOTH surfaces valid.
 *
 * The governing rule:
 *   missing instrumentation != parity defect  =  harness contract error
 */

import { actionPool, resolveDynamicBubblePath, stateOwnsLubtWrite, IDLE_POOL } from './bubble-provenance.mjs';

/**
 * Evaluate one surface's bubble provenance against the state contract.
 *
 * @param {object} p
 * @param {string} p.surface            'original' | 'split'
 * @param {object} p.provenance         the read-back provenance report, or null/undefined
 * @param {object} p.contract           the state RANDOM_CONTRACTS entry (may be null)
 * @param {string} p.state              bare state name, e.g. '24_lubt_click'
 * @param {string} p.finalBubbleText    retained hidden #lubtBubble text on THIS surface
 * @param {string} p.preBubbleText      recorded preState bubble text on THIS surface
 * @param {string} p.selectedEmotion    THIS surface's actual selected emotion (D1/21, D1/29)
 * @param {string} p.preEmotion         THIS surface's pre-action emotion
 * @param {object} p.sourceContract     the extracted SOURCE_CONTRACT authority
 */
export function evaluateSurfaceProvenance(p) {
  const surface = p.surface;
  const contract = p.contract || null;
  const src = p.provenance;

  const base = {
    surface,
    resolved: 0,
    satisfied: 0,
    violated: 0,
    unclassifiedWrites: 0,
    observerErrors: [],
    harnessErrors: [],
    families: [],
    violations: [],
    fx: { resolved: 0, satisfied: 0, violated: 0 },
    valid: false,
  };

  /* CASE D/E - required instrumentation missing. This is a HARNESS CONTRACT ERROR, never a parity
   * verdict and never a partial pass. Evaluation does not proceed. */
  if (!src || typeof src !== 'object') {
    base.harnessErrors.push(`PROVENANCE_REPORT_FAILED:${surface}`);
    return base;
  }
  if (!Array.isArray(src.bubble)) {
    base.harnessErrors.push(`PROVENANCE_BUBBLE_TRACE_MISSING:${surface}`);
    return base;
  }
  if (!src.particle || typeof src.particle !== 'object') {
    base.harnessErrors.push(`PROVENANCE_PARTICLE_LIFECYCLE_MISSING:${surface}`);
    return base;
  }
  if (!src.preState || typeof src.preState !== 'object') {
    base.harnessErrors.push(`PROVENANCE_PRESTATE_MISSING:${surface}`);
    return base;
  }

  /* Particle families, derived from the OBSERVED lifecycle, on this surface. */
  const created = Array.isArray(src.particle.created_by_class) ? src.particle.created_by_class : [];
  const removed = Array.isArray(src.particle.removed_by_class) ? src.particle.removed_by_class : [];
  const live = Array.isArray(src.particle.still_present_classes) ? src.particle.still_present_classes : [];
  base.families = [...new Set([...created, ...removed, ...live].map(String))].sort();

  if (!contract) {
    // No contract on this state: there is nothing to prove, and nothing is contracted.
    base.valid = true;
    return base;
  }

  const trace = src.bubble;

  /* An unclassified write is a real finding: the text came from somewhere the frozen contract
   * does not describe, so the contract cannot be proven. */
  const unclassified = trace.filter((w) => !w.sourcePoolCandidates || w.sourcePoolCandidates.length === 0);
  if (unclassified.length) {
    base.unclassifiedWrites += unclassified.length;
    base.violations.push({
      path: 'semanticContract.bubble_unclassified_write',
      surface,
      a: unclassified.map((w) => w.text).slice(0, 2),
      b: unclassified.length,
    });
  }

  /* ---- (2) Resolve the pool this action OWNS on THIS surface. ---- */
  let owned = null;
  if (contract.dynamicBubble) {
    const dyn = resolveDynamicBubblePath({
      selectedEmotion: p.selectedEmotion,
      preEmotion: p.preEmotion,
      sourceContract: p.sourceContract,
    });
    if (!dyn.ok) {
      base.harnessErrors.push(`${dyn.error}:${surface}`);
      return base;
    }
    owned = dyn.path;
  } else if (contract.bubbleOwned) {
    owned = actionPool(p.sourceContract, p.state);
    if (!owned) {
      base.harnessErrors.push(`UNMAPPED_BUBBLE_ACTION_POOL:${surface}:${p.state}`);
      return base;
    }
  }
  const ownsLubtWrite = stateOwnsLubtWrite(p.state) && (contract.bubbleOwned || contract.dynamicBubble);

  /* ---- (5) A target-owned write MUST appear in the trace. ---- */
  if (ownsLubtWrite) {
    base.resolved += 1;
    const ownedIdx = trace.findIndex((w) => (w.sourcePoolCandidates || []).includes(owned));
    if (ownedIdx >= 0) {
      base.satisfied += 1;
      base.ownedWriteIndex = ownedIdx;
      base.ownedPool = owned;
    } else {
      base.violated += 1;
      base.violations.push({
        path: 'semanticContract.bubble_action_write_missing',
        surface,
        a: owned,
        b: trace.map((w) => w.text).slice(0, 2),
      });
      // A missing owned write is a PARITY finding, not an instrumentation failure, so evaluation
      // continues and the surface stays instrument-valid.
      base.valid = base.harnessErrors.length === 0;
      return base;
    }
  }

  /* ---- (6) A later idle write is allowed ONLY with proven ordering. ----
   * The final write may legitimately BE the idle write, but only when the trace proves an idle
   * write occurred at a LATER index than the owned write. When the owned write is itself an idle
   * write (e.g. the lubt click's own idle line), it is the owned write, not a background
   * overwrite, so it needs no second idle write. */
  const lastWrite = trace.length ? trace[trace.length - 1] : null;
  const lastIdx = trace.length - 1;
  const lastCandidates = lastWrite ? (lastWrite.sourcePoolCandidates || []) : [];
  const isIdleFinal = lastCandidates.includes(IDLE_POOL);
  if (ownsLubtWrite && isIdleFinal && lastIdx !== base.ownedWriteIndex) {
    base.resolved += 1;
    const idleAfter = trace.some((w, i) => i > base.ownedWriteIndex
      && (w.sourcePoolCandidates || []).includes(IDLE_POOL));
    if (idleAfter) {
      base.satisfied += 1;
    } else {
      base.violated += 1;
      base.violations.push({
        path: 'semanticContract.bubble_idle_without_proven_ordering',
        surface,
        a: 'idle is final but no later idle write follows an owned write',
        b: trace.map((w) => w.text).slice(0, 2),
      });
    }
  }

  /* ---- (7) When the target owns NO Lubt write, the retained preState text is allowed. ---- */
  if (!ownsLubtWrite) {
    base.resolved += 1;
    const classified = trace.length === 0 || trace.every((w) => (w.sourcePoolCandidates || []).length > 0);
    if (!classified) {
      base.violated += 1;
      base.violations.push({
        path: 'semanticContract.bubble_unowned_unclassified',
        surface,
        a: p.state,
        b: trace.map((w) => w.text).slice(0, 2),
      });
    } else if (trace.length > 0) {
      // A proven authored write exists; the final text must be that write (checked below).
      base.satisfied += 1;
    } else {
      // No write at all: the retained preState text must be exactly what the preState recorded.
      base.satisfied += 1;
    }
  }

  /* ---- (8) FINAL INVARIANT: final text == last observed write, else the preState text. ---- */
  base.resolved += 1;
  const finalText = p.finalBubbleText === undefined ? null : p.finalBubbleText;
  const preText = p.preBubbleText === undefined ? null : p.preBubbleText;
  let finalOk = false;
  if (trace.length > 0) {
    finalOk = lastWrite && finalText === lastWrite.text;
    if (!finalOk) {
      base.violations.push({
        path: 'semanticContract.bubble_final_text',
        surface,
        a: lastWrite ? lastWrite.text : null,
        b: finalText,
      });
    }
  } else {
    // No write was observed: the retained text must equal the recorded preState text.
    finalOk = finalText === preText;
    if (!finalOk) {
      base.violations.push({
        path: 'semanticContract.bubble_final_text',
        surface,
        a: `preState:${preText}`,
        b: finalText,
      });
    }
  }
  if (finalOk) base.satisfied += 1;
  else base.violated += 1;

  /* ---- The fx lifecycle is proven on this surface too. ---- */
  if (contract.fx) {
    base.resolved += 1;
    base.fx.resolved += 1;
    const emotionKey = contract.fx.emotion;
    const fxPool = resolveFxPool(p.sourceContract, emotionKey);
    if (fxPool === null) {
      base.harnessErrors.push(`UNRESOLVED_FX_POOL:${surface}:fxMap.${emotionKey}`);
      return base;
    }
    const wanted = `fx-${fxPool[0]}`;
    if (base.families.some((c) => c.includes(wanted))) {
      base.satisfied += 1;
      base.fx.satisfied += 1;
    } else {
      base.violated += 1;
      base.fx.violated += 1;
      base.violations.push({
        path: 'contract.fx_emitted',
        surface,
        a: wanted,
        b: base.families,
      });
    }
  }

  /* `valid` reports INSTRUMENTATION validity only: a harness contract error makes it false, but a
   * parity violation does not. Keeping the two separate is what lets a caller tell "the observer
   * did not work" (harness error, abort) from "the observer worked and the source disagreed"
   * (a real parity violation). */
  base.valid = base.harnessErrors.length === 0;
  return base;
}

/** Resolve fxMap.<emotion> against whichever shape the extracted contract exposes. */
function resolveFxPool(sourceContract, emotionKey) {
  if (!sourceContract) return null;
  const fxMap = sourceContract.fxMap || sourceContract.fx || null;
  if (!fxMap || typeof fxMap !== 'object') return null;
  const v = fxMap[emotionKey];
  return Array.isArray(v) ? v : null;
}

/**
 * Pair the two surface results. A provenance-backed field is CONTRACTED only when BOTH surfaces
 * are valid and neither produced a violation.
 */
export function pairSurfaceProvenance(originalResult, splitResult) {
  const original = originalResult || null;
  const split = splitResult || null;
  const fxOf = (r) => (r && r.fx ? r.fx : { resolved: 0, satisfied: 0, violated: 0 });
  const harnessErrors = [
    ...(original ? original.harnessErrors : []),
    ...(split ? split.harnessErrors : []),
  ];
  const fxSum = {
    resolved: fxOf(original).resolved + fxOf(split).resolved,
    satisfied: fxOf(original).satisfied + fxOf(split).satisfied,
    violated: fxOf(original).violated + fxOf(split).violated,
  };
  const agg = (k) => (original && original[k] ? original[k] : 0) + (split && split[k] ? split[k] : 0);
  if (!original || !split) {
    return {
      valid: false, contract: false, harnessErrors,
      violations: [...(original ? original.violations : []), ...(split ? split.violations : [])],
      unclassifiedWrites: agg('unclassifiedWrites'),
      resolved: agg('resolved'), satisfied: agg('satisfied'), violated: agg('violated'),
      fxResolved: fxSum.resolved, fxSatisfied: fxSum.satisfied, fxViolated: fxSum.violated,
    };
  }
  const violations = [...original.violations, ...split.violations];
  const valid = original.valid && split.valid;
  return {
    valid,
    contract: valid && violations.length === 0 && original.violated === 0 && split.violated === 0,
    harnessErrors,
    violations,
    unclassifiedWrites: original.unclassifiedWrites + split.unclassifiedWrites,
    resolved: original.resolved + split.resolved,
    satisfied: original.satisfied + split.satisfied,
    violated: original.violated + split.violated,
    fxResolved: fxSum.resolved, fxSatisfied: fxSum.satisfied, fxViolated: fxSum.violated,
  };
}

/** Evaluate both surfaces and pair them in one call. */
export function evaluatePairProvenance(p) {
  const shared = { contract: p.contract, state: p.state, sourceContract: p.sourceContract };
  const originalResult = evaluateSurfaceProvenance({
    ...shared, surface: 'original', provenance: p.oProvenance,
    finalBubbleText: p.oFinalText, preBubbleText: p.oPreText,
    selectedEmotion: p.oSelectedEmotion, preEmotion: p.oPreEmotion,
  });
  const splitResult = evaluateSurfaceProvenance({
    ...shared, surface: 'split', provenance: p.sProvenance,
    finalBubbleText: p.sFinalText, preBubbleText: p.sPreText,
    selectedEmotion: p.sSelectedEmotion, preEmotion: p.sPreEmotion,
  });
  const pair = pairSurfaceProvenance(originalResult, splitResult);
  return { originalResult, splitResult, ...pair };
}