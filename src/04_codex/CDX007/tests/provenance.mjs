/* ============================================================================
 * (5)(6)(7)(8)(19) HARNESS-ONLY PROVENANCE OBSERVERS.
 *
 * The retained hidden #lubtBubble text is an authored random draw, so exact text equality is
 * meaningless; but an unconditional ignore is equally wrong. Instead the harness RECORDS which
 * authored pool each write came from, so the final text must equal the last traced write and the
 * action that owns the Lubt must actually appear in the trace.
 *
 * Pool classification happens NODE-side against SOURCE_CONTRACT (see source-contract.mjs), because
 * the authored pools are IIFE-lexical and unreadable from the page. The page only records the raw
 * writes; Node decides which authored pool each text belongs to.
 *
 * These observers run in the page but are test instrumentation: they create nothing in the DOM,
 * patch no timer, and mutate no source value.
 * ==========================================================================*/

export const PROVENANCE_INSTALL = () => {
  window.__cdx007 = {
    bubble: [],
    particles: { created: [], removed: [] },
    preState: null,
    armed: false,
    seq: 0,
    t0: Date.now(),
  };
  const el = document.getElementById('lubtBubble');
  if (!el) return false;
  let last = el.textContent;
  const push = () => {
    const cur = el.textContent;
    if (cur === last) return;
    last = cur;
    const lubt = document.getElementById('lubt');
    const img = document.getElementById('lubtImg');
    window.__cdx007.bubble.push({
      seq: (window.__cdx007.seq += 1),
      t: Date.now() - window.__cdx007.t0,
      text: cur,
      talk: !!(lubt && lubt.classList.contains('talk')),
      follow: !!(lubt && lubt.classList.contains('follow')),
      pose: img ? (img.getAttribute('src') || '').split('/').pop() : null,
      left: lubt ? lubt.style.left : null,
      top: lubt ? lubt.style.top : null,
    });
  };
  const mo = new MutationObserver(push);
  mo.observe(el, { childList: true, characterData: true, subtree: true });
  window.__cdx007BubbleObserver = mo;
  // Catch the very first assignment the startup greeting makes.
  push();

  /* (19) Particle trace is state-scoped: the buffer is cleared at arm time, so the report covers
   * only what the TARGET action emitted, not everything since page load. */
  const sel = '#notes *, #petals *, [class*="fx-"]';
  const pmo = new MutationObserver((muts) => {
    const st = window.__cdx007.particles;
    if (!st || !window.__cdx007.armed) return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.matches(sel)) {
          st.created.push({ class: String(n.className || ''), parent: n.parentElement ? n.parentElement.id : 'unknown' });
        }
      }
      for (const n of m.removedNodes) {
        if (n.nodeType === 1 && n.matches(sel)) {
          st.removed.push({ class: String(n.className || ''), parent: n.parentElement ? n.parentElement.id : 'unknown' });
        }
      }
    }
  });
  pmo.observe(document.body, { childList: true, subtree: true });
  window.__cdx007ParticleObserver = pmo;
  return true;
};

/**
 * (4) Clear the trace buffers immediately BEFORE the target action, snapshot the preState, and
 * report afterwards. The preState snapshot is what lets the evaluator distinguish "the target
 * never wrote a Lubt bubble" from "the target wrote one we failed to observe", and it keeps
 * startup/background history out of the target provenance.
 */
export const PROVENANCE_ARM = () => {
  if (!window.__cdx007) return false;
  const lubt = document.getElementById('lubt');
  const img = document.getElementById('lubtImg');
  const bub = document.getElementById('lubtBubble');
  const emoOn = document.querySelector('#emotions button.emo.on');
  const speech = document.getElementById('speech');
  window.__cdx007.preState = {
    bubbleText: bub ? bub.textContent : null,
    emotion: emoOn ? emoOn.dataset.emo : null,
    speechVisible: !!(speech && speech.classList.contains('show')),
    speechText: speech ? speech.textContent : null,
    lubtPose: img ? (img.getAttribute('src') || '').split('/').pop() : null,
    lubtTalk: !!(lubt && lubt.classList.contains('talk')),
    lubtFollow: !!(lubt && lubt.classList.contains('follow')),
    lubtLeft: lubt ? lubt.style.left : null,
    lubtTop: lubt ? lubt.style.top : null,
  };
  window.__cdx007.bubble = [];
  window.__cdx007.particles = { created: [], removed: [] };
  window.__cdx007.armed = true;
  return true;
};

export const PROVENANCE_REPORT = () => {
  const st = window.__cdx007;
  if (!st) return null;
  st.armed = false;
  const created = st.particles.created;
  const removed = st.particles.removed;
  const live = document.querySelectorAll('#notes *, #petals *, [class*="fx-"]');
  const emoOn = document.querySelector('#emotions button.emo.on');
  return {
    bubble: st.bubble.slice(),
    preState: st.preState,
    selectedEmotion: emoOn ? emoOn.dataset.emo : null,
    particle: {
      created_count: created.length,
      removed_count: removed.length,
      created_by_class: [...new Set(created.map((c) => c.class))].sort(),
      removed_by_class: [...new Set(removed.map((c) => c.class))].sort(),
      still_present_count: live.length,
      still_present_classes: [...new Set(Array.from(live).map((n) => String(n.className || '')))].sort(),
    },
  };
};
