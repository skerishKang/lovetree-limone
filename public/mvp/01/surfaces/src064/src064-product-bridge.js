/**
 * SRC064 Product bridge (Productized Alpha read-only companion).
 *
 * Source-side companion: ships with the surface, runs as a classic script
 * after script.js, self-contained (no imports — file:// compatible).
 *
 * STANDALONE (no ?mvpSession): returns immediately, zero behavior change.
 * PRODUCT mode: clears fixture cards pre-paint, READY -> INIT hydration from
 * the SRC064 adapter projection, canonical-id selection emission.
 *
 * Read-only: Story Book / tree actions that imply persistence or historical
 * navigation are hidden in Product mode. Positional orbit slots, FIRST mark on
 * the first listed card, and adapter-provided next links are presentation-only.
 */
(function () {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var VERSION = 1;
  var MVP = 'MVP001';
  var SOURCE = 'SRC064';

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
  if (!SESSION || SOURCE_PARAM !== SOURCE) return; // standalone fidelity preserved
  if (!window.__TRACK64__) return; // fail closed without runtime hooks

  var track = window.__TRACK64__;
  var revision = 0;
  var msgSeq = 0;

  function post(type, payload) {
    try {
      parent.postMessage({
        protocol: PROTOCOL,
        protocolVersion: VERSION,
        mvpId: MVP,
        sourceId: SOURCE,
        frameSessionId: SESSION,
        messageId: 'msg-64-' + Date.now() + '-' + (msgSeq += 1),
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

  // Pre-paint fixture neutralization: remove fixture card DOM before first paint.
  try {
    var world = document.getElementById('world');
    if (world) {
      Array.prototype.forEach.call(world.querySelectorAll('.card'), function (el) { el.remove(); });
    }
  } catch (e) {}

  // Product mode hides historical/non-MVP entries. The moment index itself is
  // rebuilt from canonical cards and stays available.
  function hideProductInertControls() {
    try {
      var ids = ['storyBook'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-menu="book"],[data-menu="tree"],[data-action="tree"]'), function (el) {
        el.style.display = 'none';
      });
    } catch (e) {}
  }

  var lastError = null;
  var initCount = 0;
  var lastInitCanRead = null;

  function onMessage(event) {
    var payload;
    try {
      if (event.origin !== location.origin) return;
      if (event.data && event.data.type === 'SOURCE_DISPOSE') {
        if (event.data.frameSessionId !== SESSION) return;
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        return;
      }
      if (event.data && event.data.type === 'SOURCE_INIT' && event.data.frameSessionId === SESSION) {
        initCount += 1;
        lastInitCanRead = !!(event.data.payload && event.data.payload.permissions && event.data.payload.permissions.canRead === true);
      }
      payload = validInit(event.data);
      if (!payload) return;
    } catch (e) {
      return;
    }
    revision = event.data.contextRevision;
    try {
      applyProjection(payload.projection, payload.context);
    } catch (e) {
      lastError = String((e && e.message) || e);
    }
  }

  function applyProjection(projection, context) {
    var cards = Array.isArray(projection.cards) ? projection.cards : [];
    var list = cards.map(function (c) {
      return {
        id: c.id,
        type: c.type,
        mediaType: c.mediaType,
        title: c.title || '',
        image: c.image || '',
        ring: c.ring,
        baseAngle: c.baseAngle,
        phaseOffset: c.phaseOffset,
        zOffset: c.zOffset,
        tiltX: c.tiltX,
        tiltY: c.tiltY,
        tiltZ: c.tiltZ,
        sizeClass: c.sizeClass,
        date: c.date || '',
        emotion: c.emotion || '',
        whyNext: c.whyNext || '',
        first: !!c.first,
        important: false,
        source: c.source || '',
        duration: '',
        memo: c.memo || '',
        next: c.next || null,
        branch: null,
        fitMode: c.fitMode,
        objectPosition: c.objectPosition,
        externalUrl: c.type === 'link' ? (c.externalUrl || null) : null,
        curated: false,
      };
    });
    // Seam-provided rebuild (script.js): replaces card DOM + re-keys runtime map.
    if (typeof track.rebuild !== 'function') { lastError = 'track.rebuild missing'; return; }
    try {
      track.rebuild(list);
      hideProductInertControls();
    } catch (e) {
      lastError = String((e && e.message) || e);
      return;
    }
    var selectedId = context && context.selectedMemoryId;
    if (selectedId && list.some(function (c) { return c.id === selectedId; })) {
      try { track.focus(selectedId); } catch (e) {}
    }
  }

  // Canonical selection emission. The seam calls __TRACK64_SELECT__(focusIdOrNull)
  // from the authoritative focus/close sites with the RUNTIME card id, which in
  // Product mode is always a canonical Memory id (fixture cards are gone).
  window.__TRACK64_SELECT__ = function (focusIdOrNull) {
    if (!focusIdOrNull) return;
    post('MEMORY_SELECTED', { memoryId: String(focusIdOrNull), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  // Read-only diagnostic (no DOM side effects): last apply error, null = clean.
  window.__TRACK64_BRIDGE__ = {
    get lastError() { return lastError; },
    get initCount() { return initCount; },
    get lastInitCanRead() { return lastInitCanRead; },
    get cards() { try { return track.getCards().map(function (c) { return c.id; }); } catch (e) { return []; } },
  };
  post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src064-product-bridge/1' });
})();
