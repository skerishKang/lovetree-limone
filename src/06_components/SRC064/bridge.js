/**
 * SRC064 reusable companion bridge (consumer-neutral canonical layer, #674 S5 candidate).
 *
 * Source-side companion of the frozen SRC064 surface. Classic script,
 * self-contained (no imports — file:// compatible). Installed after the
 * source script and driven by an explicit consumer bootstrap call; it never
 * parses URL query parameters and never assumes a specific consumer.
 *
 * Fixed canonical contract (NOT caller-configurable):
 *   protocol       = 'lovetree.mvp.bridge'
 *   protocolVersion = 1
 *   sourceId       = 'SRC064'
 *
 * Injected consumer config:
 *   consumerId  - consumer identity (wire key `mvpId` carries this value)
 *   sessionId   - session identity (wire key `frameSessionId` carries this value)
 *   allowedOrigin - exact origin of the trusted parent
 *   parent      - trusted parent window (default: the hosting window's parent)
 *   environment - optional test/DOM injection { window, document, parent }
 *
 * No config, or an invalid config => fail closed with zero Source behavior
 * mutation: no DOM neutralization, no listeners, no messages.
 *
 * Authorized Product-only deltas (authority: #673 comment 6014271766):
 *   1. pre-paint fixture-card neutralization;
 *   2. hiding Story Book / tree controls inert under Product ownership;
 *   3. canonical selection emission through the declared __TRACK64_SELECT__ seam.
 *
 * Read-only: no fetch, no write, no auth, no backend.
 */
(function (global) {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var PROTOCOL_VERSION = 1;
  var SOURCE_ID = 'SRC064';
  var RUNTIME_HOOK = '__TRACK64__';
  var SELECT_SEAM = '__TRACK64_SELECT__';
  var DIAGNOSTIC_SEAM = '__TRACK64_BRIDGE__';

  function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
  }

  // Fail-closed config gate. Missing/invalid config never touches the Source.
  function validConfig(config) {
    if (!isPlainObject(config)) return false;
    if (!isNonEmptyString(config.consumerId)) return false;
    if (!isNonEmptyString(config.sessionId)) return false;
    if (!isNonEmptyString(config.allowedOrigin)) return false;
    return true;
  }

  function createBridge(config) {
    var env = config.environment && isPlainObject(config.environment) ? config.environment : null;
    var win = env ? env.window : null;
    var doc = env ? env.document : null;
    if (!win || typeof win.addEventListener !== 'function' || !doc || typeof doc.getElementById !== 'function') return null;
    var track = win[RUNTIME_HOOK];
    if (!track) return null; // fail closed without runtime hooks
    var parent = (config.parent && typeof config.parent === 'object' && typeof config.parent.postMessage === 'function')
      ? config.parent
      : (env && env.parent && typeof env.parent.postMessage === 'function' ? env.parent : win.parent);
    if (!parent || typeof parent.postMessage !== 'function') return null;

    var revision = 0;
    var msgSeq = 0;

    function post(type, payload) {
      try {
        parent.postMessage({
          protocol: PROTOCOL,
          protocolVersion: PROTOCOL_VERSION,
          mvpId: config.consumerId,
          sourceId: SOURCE_ID,
          frameSessionId: config.sessionId,
          messageId: 'src064-' + Date.now() + '-' + (msgSeq += 1),
          type: type,
          contextRevision: revision,
          payload: payload,
        }, config.allowedOrigin);
      } catch (e) {}
    }

    // Trusted control envelope from the parent. Any sibling window dispatching
    // synthetic events must not hydrate or dispose the Source.
    // INIT additionally requires a monotonic integer contextRevision; DISPOSE
    // is a teardown signal bound to the session identity.
    function validControl(event, type) {
      if (!event || event.source !== parent) return null;
      if (event.origin !== config.allowedOrigin) return null;
      var data = event.data;
      if (!data || typeof data !== 'object') return null;
      if (data.protocol !== PROTOCOL || data.protocolVersion !== PROTOCOL_VERSION) return null;
      if (data.sourceId !== SOURCE_ID) return null;
      if (data.mvpId !== config.consumerId) return null;
      if (data.frameSessionId !== config.sessionId || data.type !== type) return null;
      if (type === 'SOURCE_INIT' && (!Number.isInteger(data.contextRevision) || data.contextRevision < 0)) return null;
      return data;
    }

    function validInit(data) {
      if (!data || typeof data !== 'object') return null;
      var payload = data.payload;
      if (!payload || typeof payload !== 'object') return null;
      if (!payload.context || typeof payload.context !== 'object') return null;
      if (!payload.projection || typeof payload.projection !== 'object') return null;
      if (!payload.permissions || payload.permissions.canRead !== true) return null;
      return payload;
    }

    // Authorized delta 1: pre-paint fixture neutralization — remove fixture
    // card DOM before first paint so Product data replaces the native fixture.
    try {
      var world = doc.getElementById('world');
      if (world) {
        Array.prototype.forEach.call(world.querySelectorAll('.card'), function (el) { el.remove(); });
      }
    } catch (e) {}

    // Authorized delta 2: Product mode hides historical/navigation controls
    // inert under Product ownership. The moment index itself is rebuilt from
    // canonical cards and stays available.
    function hideProductInertControls() {
      try {
        var ids = ['storyBook'];
        ids.forEach(function (id) {
          var el = doc.getElementById(id);
          if (el) el.style.display = 'none';
        });
        Array.prototype.forEach.call(doc.querySelectorAll('[data-menu="book"],[data-menu="tree"],[data-action="tree"]'), function (el) {
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
        if (event.data && event.data.type === 'SOURCE_DISPOSE') {
          if (!validControl(event, 'SOURCE_DISPOSE')) return;
          teardown();
          return;
        }
        var envelope = validControl(event, 'SOURCE_INIT');
        if (!envelope) return;
        // Read-only diagnostics observe trusted envelopes only. A validated
        // canRead:false INIT (fail-closed hydration) is still counted.
        initCount += 1;
        lastInitCanRead = !!(envelope.payload && envelope.payload.permissions && envelope.payload.permissions.canRead === true);
        payload = validInit(envelope);
        if (!payload) return;
        // Monotonic revision guard: an older INIT must never overwrite a newer
        // applied projection. Same-revision re-INIT stays allowed.
        if (envelope.contextRevision < revision) return;
        revision = envelope.contextRevision;
        try {
          applyProjection(payload.projection, payload.context);
        } catch (e) {
          lastError = String((e && e.message) || e);
        }
      } catch (e) {
        return;
      }
    }

    function teardown() {
      try { win.removeEventListener('message', onMessage); } catch (e) {}
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
      // Seam-provided rebuild (source runtime): replaces card DOM + re-keys
      // the runtime map.
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

    // Authorized delta 3: canonical selection emission. The source calls the
    // seam with the runtime card id; in Product mode that is always a
    // canonical Memory id (fixture cards are gone).
    win[SELECT_SEAM] = function (focusIdOrNull) {
      if (!focusIdOrNull) return;
      post('MEMORY_SELECTED', { memoryId: String(focusIdOrNull), selectionReason: 'user' });
    };

    win.addEventListener('message', onMessage);
    // Read-only diagnostics (no DOM side effects): last apply error, null = clean.
    win[DIAGNOSTIC_SEAM] = {
      get lastError() { return lastError; },
      get initCount() { return initCount; },
      get lastInitCanRead() { return lastInitCanRead; },
      get cards() { try { return track.getCards().map(function (c) { return c.id; }); } catch (e) { return []; } },
    };
    post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src064-bridge/1' });

    return {
      dispose: teardown,
      diagnostics: win[DIAGNOSTIC_SEAM],
    };
  }

  var api = {
    PROTOCOL: PROTOCOL,
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    SOURCE_ID: SOURCE_ID,
    bootstrap: function (config) {
      if (!validConfig(config)) return null; // no config / invalid config => zero Source behavior mutation
      return createBridge(config);
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.LTV_SRC064_BRIDGE = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
