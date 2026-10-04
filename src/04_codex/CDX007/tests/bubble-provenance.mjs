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
  /* ROUND6D (FIX 2) The authored CHARACTER GUIDE pool.
   *
   * selectChar() writes `callLubt('guide', `${c.name}의 표정을 만나볼까?`)`, which is authored but
   * DYNAMIC - no static lubtTalk pool contains it. Membership here is CLASSIFICATION only: it says
   * the text is an authored guide line. It never says WHICH character the state selected, so it is
   * never sufficient on its own. The character-switch states prove the exact correlation against
   * their own selected character separately (see resolveCharacterGuide).
   *
   * Classification is scoped: a guide line is only accepted where the state's own contract asks
   * for it. There is no global waiver - an unauthored text is still a violation. */
  if (contract.characterGuideByName) {
    const name = characterNameForGuide(text, contract);
    if (name) out.push(`characterGuide.${name}`);
  }
  return out;
}

/**
 * ROUND6D (FIX 2) The character a rendered guide line belongs to, or null.
 * Matching is EXACT against the derived per-character lines, never a substring guess, so a guide
 * line for one character can never satisfy the contract of another.
 */
export function characterNameForGuide(text, contract = DEFAULT_CONTRACT) {
  if (typeof text !== 'string' || text === '') return null;
  const byName = contract.characterGuideByName;
  if (!byName || typeof byName !== 'object') return null;
  for (const [name, line] of Object.entries(byName)) {
    if (line === text) return name;
  }
  return null;
}

/**
 * ROUND6D (FIX 2) Resolve the guide line this state OWNS, per surface.
 *
 * The character is a PER-SURFACE runtime value read from the DOM (#castName), never a literal.
 * The resolved line must then appear in the surface's own trace, so M02 selected + F01 guide is a
 * violation, not a pass. An unknown character is a HARNESS CONTRACT ERROR.
 *
 * @returns {{ok:boolean, path:string|null, expectedText:string|null, error:string|null}}
 */
export function resolveCharacterGuide({ selectedCharacter, sourceContract }) {
  const byName = (sourceContract && sourceContract.characterGuideByName) || null;
  if (!byName) {
    return { ok: false, path: null, expectedText: null, error: 'CHARACTER_GUIDE_CONTRACT_MISSING' };
  }
  if (typeof selectedCharacter !== 'string' || selectedCharacter === '') {
    return { ok: false, path: null, expectedText: null, error: 'CHARACTER_GUIDE_SELECTION_MISSING' };
  }
  if (!Object.prototype.hasOwnProperty.call(byName, selectedCharacter)) {
    return { ok: false, path: null, expectedText: null, error: `CHARACTER_GUIDE_UNKNOWN_CHARACTER:${selectedCharacter}` };
  }
  return {
    ok: true,
    path: `characterGuide.${selectedCharacter}`,
    expectedText: byName[selectedCharacter],
    error: null,
  };
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
    /* ROUND6D (FIX 2) The character-switch states OWN a real Lubt write: selectChar() calls
     * callLubt('guide', `${c.name}의 표정을 만나볼까?`). The pool cannot be named statically
     * because it depends on the character the user selected, so it is resolved per surface by
     * resolveCharacterGuide. These states must NOT fall through to the DEFAULT no-Lubt-write
     * policy, which would let the real write go unproven. */
    case '02_character_M02':
    case '03_character_F01':
    case '04_character_F02':
    case '03_tablet_character':
    case '04_mobile_character':
      return CHARACTER_GUIDE_POOL;
    /* D1/21 is dynamic: the owned pool is lubtTalk.emotion.<selectedEmotion>, which cannot be
     * named statically. It is resolved per surface by resolveDynamicBubblePath instead. */
    default: return null;
  }
}

/** The dynamic character-guide pool marker. */
export const CHARACTER_GUIDE_POOL = 'characterGuide';

export const CHARACTER_GUIDE_STATES = [
  '02_character_M02', '03_character_F01', '04_character_F02',
  '03_tablet_character', '04_mobile_character',
];

/** Whether the state OWNS a Lubt bubble write at all (statically decidable). */
export function stateOwnsLubtWrite(state) {
  return state === '21_face_click_random'
    || CHARACTER_GUIDE_STATES.includes(state)
    || actionPool(DEFAULT_CONTRACT, state) !== null;
}

/** The background idle write, which may legitimately follow an action's own write. */
export const IDLE_POOL = 'lubtTalk.idle';