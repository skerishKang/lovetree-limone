/**
 * SRC056 Product bridge (Productized Alpha read-only companion).
 *
 * Source-side companion: classic script after script.js, self-contained.
 * STANDALONE (no ?mvpSession): returns immediately, zero behavior change.
 * PRODUCT mode: neutralizes fixture graph pre-paint (single neutral cluster,
 * empty nodes/edges/paths, rebuilt neutral ribbon), READY -> INIT hydration
 * from the SRC056 adapter projection. Canonical parent chains become renderer
 * chain-paths; canonical edges use the renderer's route vocabulary. The adapter
 * output truth (kind 'parent') is never rewritten — translation is documented
 * and covered by roundtrip tests.
 *
 * Read-only: origin/first entries are hidden in Product mode; playback runs on
 * real canonical chains only.
 */
(function () {
  'use strict';

  var PROTOCOL = 'lovetree.mvp.bridge';
  var VERSION = 1;
  var MVP = 'MVP001';
  var SOURCE = 'SRC056';

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
  // NOTE: the audited hook name is window.__lt (double underscore + lt).
  var lt = window.__lt;
  if (!lt || !lt.state) return; // fail closed without runtime hooks

  var revision = 0;
  var msgSeq = 0;
  // Canonical id set from the last applied INIT projection. Only these ids
  // may enter shell state.
  var canonicalIds = {};
  // Re-entrancy guard: hydration rebuilds and INIT-select echo programmatic
  // selectMoment calls; neither is a user gesture. Emitting either would
  // refresh-loop the shell (accept -> refresh -> re-INIT -> emit ...).
  var applying = false;

  var NEUTRAL_CLUSTER = {
    index: 0, name: '', sub: '', color: '#8a7f8c',
    x: 0, y: 0, hubR: 20, spread: 600, branchAngles: [], count: 0,
  };

  function post(type, payload) {
    try {
      parent.postMessage({
        protocol: PROTOCOL,
        protocolVersion: VERSION,
        mvpId: MVP,
        sourceId: SOURCE,
        frameSessionId: SESSION,
        messageId: 'msg-56-' + Date.now() + '-' + (msgSeq += 1),
        type: type,
        contextRevision: revision,
        payload: payload,
      }, location.origin);
    } catch (e) {}
  }

  // Trusted control envelope from the shell parent. Any same-origin sibling
  // window dispatching synthetic events must not hydrate or dispose the Source.
  // INIT additionally requires a monotonic integer contextRevision (checked by
  // the caller); DISPOSE is a teardown signal bound to the session identity.
  function validControl(event, type) {
    if (!event || event.source !== parent) return null;
    if (event.origin !== location.origin) return null;
    var data = event.data;
    if (!data || typeof data !== 'object') return null;
    if (data.protocol !== PROTOCOL || data.protocolVersion !== VERSION) return null;
    if (data.mvpId !== MVP || data.sourceId !== SOURCE) return null;
    if (data.frameSessionId !== SESSION || data.type !== type) return null;
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

  function clearArray(a) {
    try {
      if (Array.isArray(a)) a.length = 0;
    } catch (e) {}
  }

  function rebuildById(nodes) {
    try {
      var map = {};
      nodes.forEach(function (n) { map[n.id] = n; });
      window.byId = map;
    } catch (e) {}
  }

  // Pre-paint fixture neutralization (synchronous, before first rAF paint).
  try {
    window.__LT56_COPY__ = {
      initialToast: '관계망을 불러오는 중입니다.',
      overviewToast: '전체 관계망에서 Moment를 선택하세요.',
      detailClusterText: '관계 Moment',
    };
    clearArray(lt.nodes);
    clearArray(lt.edges);
    clearArray(lt.paths);
    if (lt.pathById && typeof lt.pathById === 'object') {
      Object.keys(lt.pathById).forEach(function (k) { delete lt.pathById[k]; });
    }
    if (Array.isArray(lt.CLUSTERS)) {
      lt.CLUSTERS.length = 0;
      lt.CLUSTERS.push(NEUTRAL_CLUSTER);
    }
    if (Array.isArray(lt.anchors)) lt.anchors.length = 0;
    rebuildById([]);
    var ribbon = document.getElementById('mobileRibbon');
    if (ribbon) ribbon.innerHTML = '';
    var focusFirst = document.getElementById('focusFirst');
    if (focusFirst) focusFirst.style.display = 'none';
  } catch (e) {}

  // Decompose canonical parent edges into maximal root->leaf chains.
  // Each chain becomes one renderer path object (positional label only).
  function buildChains(nodes, edges) {
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });
    var childrenOf = {};
    var hasParent = {};
    edges.forEach(function (e) {
      if (!byId[e.from] || !byId[e.to]) return;
      (childrenOf[e.from] = childrenOf[e.from] || []).push(e.to);
      hasParent[e.to] = true;
    });
    Object.keys(childrenOf).forEach(function (k) { childrenOf[k].sort(); });
    var roots = nodes.map(function (n) { return n.id; }).filter(function (id) { return !hasParent[id]; }).sort();
    var paths = [];
    var edgePath = {};
    var chainSeq = 0;
    function walk(startId) {
      var myIndex = chainSeq++;
      var seq = [startId];
      var cur = startId;
      while (childrenOf[cur] && childrenOf[cur].length > 0) {
        var parent = cur;
        var next = childrenOf[cur][0];
        var edgeId = 'rel:' + cur + '::' + next;
        edgePath[edgeId] = 'chain-' + myIndex;
        seq.push(next);
        cur = next;
        (childrenOf[parent] || []).slice(1).forEach(function (sib) {
          // Sibling subtrees start new chains, but the parent->sibling edge
          // belongs to the sibling chain taking the next sequence number.
          edgePath['rel:' + parent + '::' + sib] = 'chain-' + chainSeq;
          walk(sib);
        });
      }
      paths.push({ id: 'chain-' + myIndex, cluster: 0, label: '경로 ' + (myIndex + 1), tone: 0, kind: 'primary', nodes: seq, parent: null, children: [] });
    }
    roots.forEach(function (r) { walk(r); });
    // Orphan cycles with no root: emit each residual node as its own chain.
    var covered = {};
    paths.forEach(function (p) { p.nodes.forEach(function (id) { covered[id] = true; }); });
    nodes.forEach(function (n) {
      if (!covered[n.id]) {
        paths.push({ id: 'chain-' + paths.length, cluster: 0, label: '경로 ' + (paths.length + 1), tone: 0, kind: 'primary', nodes: [n.id], parent: null, children: [] });
      }
    });
    return { paths: paths, edgePath: edgePath };
  }

  function onMessage(event) {
    var payload;
    try {
      if (event.data && event.data.type === 'SOURCE_DISPOSE') {
        if (!validControl(event, 'SOURCE_DISPOSE')) return;
        try { window.removeEventListener('message', onMessage); } catch (e) {}
        return;
      }
      var envelope = validControl(event, 'SOURCE_INIT');
      if (!envelope) return;
      payload = validInit(envelope);
      if (!payload) return;
      // Monotonic revision guard: an older INIT must never overwrite a newer
      // applied projection. Same-revision re-INIT stays allowed (orchestrator
      // re-sends the current revision on refresh/reload deterministically).
      if (envelope.contextRevision < revision) return;
      revision = envelope.contextRevision;
      try {
        applyProjection(payload.projection, payload.context);
      } catch (e) {}
    } catch (e) {
      return;
    }
  }

  function applyProjection(projection, context) {
    var moments = Array.isArray(projection.nodes) ? projection.nodes : [];
    var edges = Array.isArray(projection.edges) ? projection.edges : [];
    canonicalIds = {};
    moments.forEach(function (m) { if (m && typeof m.id === 'string') canonicalIds[m.id] = true; });
    applying = true;
    try {
      // Idempotent re-INIT: the shell re-sends INIT on every refresh, so
      // reset runtime collections instead of appending duplicates.
      clearArray(lt.nodes);
      clearArray(lt.edges);
      clearArray(lt.paths);
      if (lt.pathById && typeof lt.pathById === 'object') {
        Object.keys(lt.pathById).forEach(function (k) { delete lt.pathById[k]; });
      }
      if (Array.isArray(lt.CLUSTERS)) {
        lt.CLUSTERS.length = 0;
        lt.CLUSTERS.push(NEUTRAL_CLUSTER);
      }
      var built = buildChains(moments, edges.filter(function (e) { return e && e.canonical; }));
    var pathOf = {};
    built.paths.forEach(function (p) {
      p.nodes.forEach(function (id, i) { pathOf[id] = { path: p, index: i }; });
    });
    moments.forEach(function (m) {
      var slot = pathOf[m.id];
      var node = {
        id: m.id,
        kind: 'moment',
        cluster: 0,
        x: m.x,
        y: m.y,
        r: m.r || 6,
        color: m.color || '#8a7f8c',
        title: m.title || '',
        date: m.date || '',
        emotion: Array.isArray(m.emotionTags) && m.emotionTags.length > 0 ? String(m.emotionTags[0]) : '',
        note: m.memo || '',
        why: m.whyNext || '',
        level: 0,
        pathId: slot ? slot.path.id : null,
        indexInPath: slot ? slot.index : -1,
        first: false,
      };
      lt.nodes.push(node);
    });
    // INIT-selected (or first listed) node carries the overview view-anchor flag.
    var anchorId = context && context.selectedMemoryId;
    var anchor = lt.nodes.filter(function (n) { return n.id === anchorId; })[0] || lt.nodes[0] || null;
    if (anchor) anchor.first = true;
    built.paths.forEach(function (p) { lt.paths.push(p); try { lt.pathById[p.id] = p; } catch (e) {} });
    edges.forEach(function (e, i) {
      if (!e || !e.canonical) return;
      var pid = built.edgePath[e.id];
      if (!pid) return;
      lt.edges.push({ id: e.id, a: e.from, b: e.to, cluster: 0, kind: 'primary', pathId: pid, order: i });
    });
    rebuildById(lt.nodes);
    rebuildRibbon(built.paths);
    if (anchor && typeof lt.selectMoment === 'function') {
      try { lt.selectMoment(anchor, false); } catch (e) {}
    }
    } finally {
      applying = false;
    }
  }

  function rebuildRibbon(paths) {
    try {
      var ribbon = document.getElementById('mobileRibbon');
      if (!ribbon) return;
      ribbon.innerHTML = '';
      var o = document.createElement('button');
      o.textContent = '전체 관계';
      o.className = 'origin';
      o.onclick = function () { try { lt.overview(); } catch (e) {} };
      ribbon.appendChild(o);
      paths.forEach(function (p, i) {
        var b = document.createElement('button');
        b.textContent = '경로 ' + (i + 1);
        b.onclick = (function (path) {
          return function () {
            try {
              var node = lt.nodes.filter(function (n) { return n.id === path.nodes[0]; })[0];
              if (node) lt.selectMoment(node, false);
            } catch (e) {}
          };
        })(p);
        ribbon.appendChild(b);
      });
    } catch (e) {}
  }

  // Canonical selection emission. The seam calls __LT56_SELECT__('moment', id)
  // from the authoritative selectMoment/playback sites with the runtime node id.
  // Only INIT-listed canonical ids outside hydration are forwarded: ribbon
  // rebuilds and INIT-select echoes are dropped so the shell refresh loop
  // stays user-driven and no non-canonical id enters shell state.
  window.__LT56_SELECT__ = function (kind, id) {
    if (kind !== 'moment' || !id || applying) return;
    if (!canonicalIds[String(id)]) return;
    post('MEMORY_SELECTED', { memoryId: String(id), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  post('SOURCE_READY', { capabilities: ['hydrate', 'select'], sourceRuntimeVersion: 'src056-product-bridge/1' });
})();
