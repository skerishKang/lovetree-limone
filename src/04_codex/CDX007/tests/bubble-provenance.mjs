/**
 * MST106 / CDX007 - S4 ROUND6B bubble provenance classification (Node side).
 *
 * The page records RAW writes. Which authored pool a text belongs to is decided here, against
 * SOURCE_CONTRACT, because the authored pools are IIFE-lexical in the frozen external file and are
 * unreachable from page.evaluate(). An unclassified text is a FAILURE, never a silent pass.
 *
 * ROUND6B: the `.selectedEmotion` placeholder is NEVER resolved as a source path. The actual
 * per-surface selected emotion is substituted, and the resulting path must resolve.
 */

import { sourceContract, poolFor } from './source-contract.mjs';

/** The single extracted source truth. */
const DEFAULT_CONTRACT = sourceContract();

/** Enumerate every authored lubtTalk path, including one per emotion. */
export function lubtTalkPoolPaths(contract = DEFAULT_CONTRACT) {
  const paths = Object.keys(contract.lubtTalk).map((k) => `lubtTalk.${k}`);
  for (const e of contract.emotions) paths.push(`lubtTalk.emotion.${e}`);
  return paths;
}

/** Every authored path whose pool contains `text`. */
export function classifyBubbleText(text, contract = DEFAULT_CONTRACT) {
  if (typeof text !== 'string' || text === '') return [];
  const out = [];
  for (const path of lubtTalkPoolPaths(contract)) {
    const pool = poolFor(contract, path);
    if (Array.isArray(pool) && pool.includes(text)) out.push(path);
  }
  return out;
}

/**
 * Classify one recorded write. A write is unclassified when no authored pool contains its text,
 * which is a real finding: the text came from somewhere the frozen contract does not describe.
 */
export function classifyWrite(write, contract = DEFAULT_CONTRACT) {
  return { ...write, sourcePoolCandidates: classifyBubbleText(write.text, contract) };
}

export function classifyTrace(writes, contract = DEFAULT_CONTRACT) {
  return (writes || []).map((w) => classifyWrite(w, contract));
}

/**
 * ROUND6B (2) Resolve a DYNAMIC bubble contract for ONE surface.
 *
 * `selectedEmotion` is a per-surface runtime value, never a literal source path. We prove it is an
 * authored emotion and differs from the pre-click emotion BEFORE building the real path, and the
 * real path must then resolve to an array.
 *
 * @returns {{ok:boolean, path:string|null, error:string|null}}
 */
export function resolveDynamicBubblePath({ selectedEmotion, preEmotion, contract = DEFAULT_CONTRACT }) {
  if (typeof selectedEmotion !== 'string' || selectedEmotion === '') {
    return { ok: false, path: null, error: 'DYNAMIC_SELECTED_EMOTION_MISSING' };
  }
  if (!contract.emotions.includes(selectedEmotion)) {
    return { ok: false, path: null, error: `DYNAMIC_EMOTION_NOT_AUTHORED:${selectedEmotion}` };
  }
  if (selectedEmotion === preEmotion) {
    return { ok: false, path: null, error: `DYNAMIC_EMOTION_UNCHANGED:${selectedEmotion}` };
  }
  const path = `lubtTalk.emotion.${selectedEmotion}`;
  const pool = poolFor(contract, path);
  if (!Array.isArray(pool)) {
    return { ok: false, path, error: `DYNAMIC_POOL_UNRESOLVED:${path}` };
  }
  return { ok: true, path, error: null };
}

/** The authored pool an action owns, when it owns one at all. */
export function actionPool(contract, state) {
  switch (state) {
    case '16_heart_action': return 'lubtTalk.emotion.touched';
    case '17_surprise_action': return 'lubtTalk.emotion.surprise';
    case '19_call_lubt': return 'lubtTalk.scan';
    case '20_save_transient': return 'lubtTalk.save';
    case '20b_save_fault_terminal': return 'lubtTalk.save';
    case '24_lubt_click': return 'lubtTalk.idle';
    case '25_lubt_drag': return 'lubtTalk.drag';
    case '18_say_phrase': return 'lubtTalk.reply';
    case '22_face_special_moment': return 'lubtTalk.special';
    case '23_face_hold_special': return 'lubtTalk.special';
    /* D1/21 is dynamic: the owned pool is lubtTalk.emotion.<selectedEmotion>, which cannot be
     * named statically. It is resolved per surface by resolveDynamicBubblePath instead. */
    default: return null;
  }
}

/** Whether the state OWNS a Lubt bubble write at all (statically decidable). */
export function stateOwnsLubtWrite(state) {
  return state === '21_face_click_random' || actionPool(DEFAULT_CONTRACT, state) !== null;
}

/** The background idle write, which may legitimately follow an action's own write. */
export const IDLE_POOL = 'lubtTalk.idle';