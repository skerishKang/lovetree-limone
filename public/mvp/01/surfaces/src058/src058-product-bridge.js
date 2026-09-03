/**
 * SRC058 Product bridge (Productized Alpha read-only companion).
 *
 * Source-side companion: classic script after script.js, self-contained.
 * STANDALONE (no ?mvpSession): returns immediately, zero behavior change.
 * PRODUCT mode: clears fixture layers pre-paint, READY -> INIT hydration from
 * the SRC058 adapter projection (canonical moments; connections stay empty —
 * board threads are fixture-only by adapter contract), canonical selection emission.
 *
 * Read-only: add/composer/edit/save entries are unwired and hidden in Product
 * mode. Cinema entries are hidden until empty-replayPath behavior is verified.
 */
(function () {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var VERSION = 1;
  var MVP = 'MVP001';
  var SOURCE = 'SRC058';

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
  if (!window.__LT58V12 || !window.__LT58V12.render) return;

  var hook = window.__LT58V12.render;
  var revision = 0;
  var msgSeq = 0;
  // Canonical id set from the last applied INIT projection. Only these ids
  // may enter shell state. Fixture ids (e.g. the standalone default 'm1')
  // re-emitted by render-time reselects are dropped here.
  var canonicalIds = {};
  // Re-entrancy guard: hydration re-renders reselect the stale runtime
  // selection and INIT-select echoes the context selection; neither is a
  // user gesture and emitting either would corrupt shell revision flow.
  var applying = false;
  try {
    window.__LT58_PRODUCT__ = true; // read-only Product mode: add/edit guarded
  } catch (e) {}

  function post(type, payload) {
    try {
      parent.postMessage({
        protocol: PROTOCOL,
        protocolVersion: VERSION,
        mvpId: MVP,
        sourceId: SOURCE,
        frameSessionId: SESSION,
        messageId: 'msg-58-' + Date.now() + '-' + (msgSeq += 1),
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

  // Pre-paint fixture neutralization.
  try {
    ['cardLayer', 'threadLayer'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  } catch (e) {}

  function hideWriteEntries() {
    ['addBtn', 'confirmAdd', 'editMomentBtn', 'editSave', 'cinemaBtn', 'toolCinema', 'cinemaFromMoment'].forEach(function (id) {
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

  function applyProjection(projection, context) {
    var moments = Array.isArray(projection.moments) ? projection.moments : [];
    canonicalIds = {};
    moments.forEach(function (m) { if (m && typeof m.id === 'string') canonicalIds[m.id] = true; });
    applying = true;
    try {
      var store = window.__LT58 || {};
      if (Array.isArray(store.moments)) {
        store.moments.length = 0;
        moments.forEach(function (m) { if (m && typeof m.id === 'string') store.moments.push(m); });
      }
      var conns = Array.isArray(store.connections) ? store.connections : null;
      if (conns) conns.length = 0; // board threads are fixture-only by adapter contract
      hook.cards();
      hook.threads();
      if (typeof hook.filter === 'function') hook.filter();
    } catch (e) {
      applying = false;
      return;
    }
    applying = false;
    hideWriteEntries();
    try {
      if (typeof hook.fit === 'function') hook.fit(false);
    } catch (e) {}
    var selectedId = context && context.selectedMemoryId;
    if (selectedId && moments.some(function (m) { return m && m.id === selectedId; })) {
      applying = true;
      try {
        if (typeof hook.select === 'function') hook.select(selectedId, false);
      } catch (e) {} finally {
        applying = false;
      }
    }
  }

  // Canonical selection emission. The seam calls __LT58_SELECT__(id) from the
  // authoritative selectMoment path with the runtime card id. Only INIT-listed
  // canonical ids outside hydration are forwarded: render-time reselects of
  // the stale standalone selection and INIT echoes are dropped so no fixture
  // id can enter shell state and shell revision flow stays user-driven.
  window.__LT58_SELECT__ = function (id) {
    if (!id || applying) return;
    if (!canonicalIds[String(id)]) return;
    post('MEMORY_SELECTED', { memoryId: String(id), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src058-product-bridge/1' });
})();
