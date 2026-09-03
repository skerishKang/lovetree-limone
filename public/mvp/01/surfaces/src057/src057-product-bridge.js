/**
 * SRC057 Product bridge (Productized Alpha read-only companion).
 *
 * Source-side companion: classic script after script.js, self-contained.
 * STANDALONE (no ?mvpSession): returns immediately, zero behavior change.
 * PRODUCT mode: clears fixture collection pre-paint, READY -> INIT hydration
 * via the seam-provided setProductMoments (canonical moments replace m1/m2/m3;
 * collection DOM is rebuilt by the Source renderer itself), canonical selection
 * emission.
 *
 * Read-only: edit/media submit entries are inert in Product mode. Positional
 * prev/next paging is UI traversal only, never a relationship claim.
 */
(function () {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var VERSION = 1;
  var MVP = 'MVP001';
  var SOURCE = 'SRC057';

  function bootParams() {
    try {
      return new URLSearchParams(location.search);
    } catch (e) {
      return null;
    }
  }

  var params = bootParams();
  var SESSION = params ? params.get('mvpSession') : null;
  var SOURCE_PARAM = params ? params.get('mvpSource') : null;
  if (!SESSION || SOURCE_PARAM !== SOURCE) return;
  if (!window.__LT57__ || typeof window.__LT57__.setProductMoments !== 'function') return;

  var hook = window.__LT57__;
  var revision = 0;
  var msgSeq = 0;
  // Canonical id set from the last applied INIT projection. Only these ids
  // may enter shell state.
  var canonicalIds = {};
  // Re-entrancy guard: setProductMoments rebuilds and the INIT-select echoes
  // the context selection; neither is a user gesture. Emitting either would
  // refresh-loop the shell (accept -> refresh -> re-INIT -> emit ...).
  var applying = false;
  try {
    window.__LT57_PRODUCT__ = true; // read-only Product mode: edit submit inert
  } catch (e) {}

  function post(type, payload) {
    try {
      parent.postMessage({
        protocol: PROTOCOL,
        protocolVersion: VERSION,
        mvpId: MVP,
        sourceId: SOURCE,
        frameSessionId: SESSION,
        messageId: 'msg-57-' + Date.now() + '-' + (msgSeq += 1),
        type: type,
        contextRevision: revision,
        payload: payload,
      }, location.origin);
    } catch (e) {}
  }

  function validInit(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.protocol !== PROTOCOL || data.protocolVersion !== VERSION) return null;
    if (data.mvpId !== MVP || data.sourceId !== SOURCE) return null;
    if (data.frameSessionId !== SESSION || data.type !== 'SOURCE_INIT') return null;
    var payload = data.payload;
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.context || typeof payload.context !== 'object') return null;
    if (!payload.projection || typeof payload.projection !== 'object') return null;
    if (!payload.permissions || payload.permissions.canRead !== true) return null;
    if (!Number.isInteger(data.contextRevision) || data.contextRevision < 0) return null;
    return payload;
  }

  // Pre-paint fixture neutralization: drop fixture cards before first paint.
  // The seam-provided setProductMoments rebuilds from canonical data on INIT.
  // Clear the runtime moment list too so readiness probes cannot mistake the
  // standalone fixtures for hydrated Product data.
  try {
    var collection = document.getElementById('collection');
    if (collection) collection.innerHTML = '';
    if (hook && Array.isArray(hook.moments)) hook.moments.length = 0;
  } catch (e) {}

  function hideEditEntries() {
    ['editMedia', 'mediaForm'].forEach(function (id) {
      try {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      } catch (e) {}
    });
  }

  function onMessage(event) {
    var payload;
    try {
      if (event.origin !== location.origin) return;
      if (event.data && event.data.type === 'SOURCE_DISPOSE') {
        if (event.data.frameSessionId !== SESSION) return;
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        return;
      }
      payload = validInit(event.data);
      if (!payload) return;
    } catch (e) {
      return;
    }
    revision = event.data.contextRevision;
    try {
      applyProjection(payload.projection, payload.context);
    } catch (e) {}
  }

  // The SRC057 adapter already emits fixture-shaped moments (id/label/title/date/
  // emotion/tone/mediaKind/thumbnailUrl/sourceUrl/note/next/why/privacy). The
  // companion only normalizes the memo alias and drops NOTHING canonical.
  function toFixtureShape(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      id: m.id,
      label: typeof m.label === 'string' ? m.label : '',
      title: m.title || '',
      date: m.date || '',
      emotion: m.emotion || '',
      tone: m.tone || '#8a7f8c',
      mediaKind: m.mediaKind || 'note',
      thumbnailUrl: m.thumbnailUrl || '',
      sourceUrl: m.sourceUrl || '',
      mediaUrl: m.mediaUrl || m.sourceUrl || '',
      sourceLabel: m.sourceLabel || '',
      startSeconds: typeof m.startSeconds === 'number' ? m.startSeconds : 0,
      memo: m.note || m.memo || '',
      note: m.note || m.memo || '',
      privacy: m.privacy || '',
      next: m.next || null,
      why: m.why || '',
      posterProvenance: 'PRODUCT MEDIA',
    };
  }

  function applyProjection(projection, context) {
    var moments = Array.isArray(projection.moments) ? projection.moments : [];
    var selectedId = context && context.selectedMemoryId;
    var standalone = null;
    if (projection.selectedMoment && projection.selectedMoment.id !== undefined) {
      var listed = moments.some(function (m) { return m && m.id === projection.selectedMoment.id; });
      if (!listed) standalone = projection.selectedMoment;
    }
    canonicalIds = {};
    moments.forEach(function (m) { if (m && typeof m.id === 'string') canonicalIds[m.id] = true; });
    if (standalone && typeof standalone.id === 'string') canonicalIds[standalone.id] = true;
    applying = true;
    try {
      hook.setProductMoments(moments.map(toFixtureShape).filter(function (m) { return m && m.id; }), standalone ? toFixtureShape(standalone) : null);
    } finally {
      applying = false;
    }
    hideEditEntries();
    if (selectedId) {
      var present = moments.some(function (m) { return m && m.id === selectedId; });
      if (present && typeof hook.selectMoment === 'function') {
        applying = true;
        try {
          hook.selectMoment(selectedId);
        } catch (e) {} finally {
          applying = false;
        }
      }
    }
  }

  // Canonical selection emission. The seam calls __LT57_SELECT__(id) from the
  // authoritative selectMoment path with the runtime card id. Only INIT-listed
  // canonical ids outside hydration are forwarded, so no fixture id can enter
  // shell state and the shell refresh loop stays user-driven.
  window.__LT57_SELECT__ = function (id) {
    if (!id || applying) return;
    if (!canonicalIds[String(id)]) return;
    post('MEMORY_SELECTED', { memoryId: String(id), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src057-product-bridge/1' });
})();
