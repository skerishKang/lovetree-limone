/**
 * SRC060 Product bridge (Productized Alpha read-only companion).
 *
 * Source-side companion: classic script after script.js, self-contained.
 * STANDALONE (no ?mvpSession): returns immediately, zero behavior change.
 * PRODUCT mode: neutralizes fixture graph pre-paint (single neutral cluster,
 * empty nodes/edges/bridges), READY -> INIT hydration from the SRC060 adapter
 * projection. The renderer requires numeric array indices, so the companion
 * builds an explicit canonical<->index map from the SAME projection (the only
 * allowed index translation) and emits canonical ids on selection.
 *
 * Read-only: historical Track59/55/56 handoffs stay excluded; bridge/person/
 * keyword fixture taxonomies are not rebuilt (Source search/filter operate on
 * neutral canonical title/emotion only, default-all).
 */
(function () {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var VERSION = 1;
  var MVP = 'MVP001';
  var SOURCE = 'SRC060';

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
  if (!window.__LT60__) return;

  var lt = window.__LT60__;
  var revision = 0;
  var msgSeq = 0;
  var idToIndex = {};
  var indexToId = {};
  // Re-entrancy guard: hydration rebuilds and the INIT-select echoes a
  // programmatic selectNode; neither is a user gesture. Emitting either would
  // refresh-loop the shell (accept -> refresh -> re-INIT -> emit ...).
  var applying = false;

  function post(type, payload) {
    try {
      parent.postMessage({
        protocol: PROTOCOL,
        protocolVersion: VERSION,
        mvpId: MVP,
        sourceId: SOURCE,
        frameSessionId: SESSION,
        messageId: 'msg-60-' + Date.now() + '-' + (msgSeq += 1),
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

  // Pre-paint fixture neutralization (synchronous, before first rAF paint).
  try {
    if (Array.isArray(lt.nodes)) lt.nodes.length = 0;
    if (Array.isArray(lt.edges)) lt.edges.length = 0;
    if (Array.isArray(lt.bridgeRecords)) lt.bridgeRecords.length = 0;
    if (Array.isArray(lt.clusters)) {
      lt.clusters.length = 0;
      lt.clusters.push({ ci: 0, name: '', c: [0, 0, 0], n: 0, anchors: [], start: 0, end: -1 });
    }
  } catch (e) {}

  function firstTag(m) {
    var tags = Array.isArray(m.emotionTags) ? m.emotionTags : [];
    for (var i = 0; i < tags.length; i++) {
      if (typeof tags[i] === 'string' && tags[i].length > 0) return tags[i];
    }
    return '';
  }

  function onMessage(event) {
    var payload;
    try {
      if (event.origin !== location.origin) return;
      if (event.data && event.data.type === 'SOURCE_DISPOSE') {
        if (event.data.frameSessionId !== SESSION) return;
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        idToIndex = {};
        indexToId = {};
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
    var moments = Array.isArray(projection.nodes) ? projection.nodes : [];
    var edges = Array.isArray(projection.edges) ? projection.edges : [];
    applying = true;
    try {
      // Idempotent re-INIT: the shell re-sends INIT on every refresh, so
      // reset runtime collections instead of appending duplicates.
      if (Array.isArray(lt.nodes)) lt.nodes.length = 0;
      if (Array.isArray(lt.edges)) lt.edges.length = 0;
      if (Array.isArray(lt.bridgeRecords)) lt.bridgeRecords.length = 0;
      if (Array.isArray(lt.clusters)) {
        lt.clusters.length = 0;
        lt.clusters.push({ ci: 0, name: '', c: [0, 0, 0], n: 0, anchors: [], start: 0, end: -1 });
      }
      idToIndex = {};
      indexToId = {};
    moments.forEach(function (m, idx) {
      if (!m || typeof m.id !== 'string') return;
      idToIndex[m.id] = idx;
      indexToId[idx] = m.id;
      lt.nodes.push({
        id: idx,
        ci: 0,
        x: typeof m.x === 'number' ? m.x : 0,
        y: typeof m.y === 'number' ? m.y : 0,
        z: typeof m.z === 'number' ? m.z : 0,
        importance: 2,
        emotion: firstTag(m),
        type: m.media || 'note',
        person: m.source || '',
        date: m.date || '',
        title: m.title || '',
        memo: m.memo || '',
        keyword: '',
        bridge: false,
      });
    });
    edges.forEach(function (e) {
      if (!e || !e.canonical) return;
      var a = idToIndex[e.from];
      var b = idToIndex[e.to];
      if (a === undefined || b === undefined) return;
      lt.edges.push({ a: a, b: b, type: 'parent', why: e.reason || '' });
    });
    var selectedId = context && context.selectedMemoryId;
    if (selectedId !== undefined && selectedId !== null && idToIndex[selectedId] !== undefined) {
      try {
        if (typeof lt.selectNode === 'function') lt.selectNode(idToIndex[selectedId], false);
      } catch (e) {}
    }
    } finally {
      applying = false;
    }
  }

  // Canonical selection emission. The seam calls __LT60_SELECT__(runtimeIndex)
  // from the authoritative selectNode path; the companion maps the renderer
  // index back to the canonical Memory id via the INIT-built map. Unknown
  // indices and hydration-time echoes are dropped (fail closed), never guessed.
  window.__LT60_SELECT__ = function (runtimeIndex) {
    if (applying) return;
    var id = indexToId[runtimeIndex];
    if (id === undefined) return;
    post('MEMORY_SELECTED', { memoryId: String(id), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src060-product-bridge/1' });
})();
