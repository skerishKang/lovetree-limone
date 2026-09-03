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
 * Slice J: title/memo Product edit via UPDATE_MEMORY_REQUEST. Media fixture
 * submit stays inert in Product mode. Positional prev/next paging is UI
 * traversal only, never a relationship claim.
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

  // Pre-paint fixture neutralization: drop fixture cards before first paint.
  // The seam-provided setProductMoments rebuilds from canonical data on INIT.
  // Clear the runtime moment list too so readiness probes cannot mistake the
  // standalone fixtures for hydrated Product data.
  try {
    var collection = document.getElementById('collection');
    if (collection) collection.innerHTML = '';
    if (hook && Array.isArray(hook.moments)) hook.moments.length = 0;
  } catch (e) {}

  var lastSelectedId = null;
  var lastMomentsById = {};

  function currentSelectedId() {
    if (lastSelectedId && canonicalIds[lastSelectedId]) return lastSelectedId;
    try {
      var sel = document.querySelector('.card-wrap.is-selected');
      if (sel && sel.dataset && sel.dataset.id && canonicalIds[sel.dataset.id]) return sel.dataset.id;
    } catch (e) {}
    return null;
  }

  function findMoment(id) {
    if (!id) return null;
    if (lastMomentsById[id]) return lastMomentsById[id];
    try {
      var list = hook && Array.isArray(hook.moments) ? hook.moments : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i];
      }
    } catch (e) {}
    return null;
  }

  function ensureProductEditFields() {
    try {
      var form = document.getElementById('mediaForm');
      if (!form || document.getElementById('mvpTitleInput')) return;
      var mediaKindRow = document.getElementById('mediaKindInput');
      var mediaUrlRow = document.getElementById('mediaUrlInput');
      var sourceLabelRow = document.getElementById('sourceLabelInput');
      var startRow = document.getElementById('startInput');
      var preview = document.getElementById('editLivePreview');
      [mediaKindRow, mediaUrlRow, sourceLabelRow, startRow].forEach(function (input) {
        try {
          if (!input) return;
          var row = input.closest('.edit-row') || input.closest('.field') || input;
          if (row) row.style.display = 'none';
        } catch (e) {}
      });
      try { if (preview) preview.style.display = 'none'; } catch (e) {}
      var wrap = document.createElement('div');
      wrap.className = 'edit-row';
      wrap.innerHTML = '<div class="field"><label for="mvpTitleInput">Title</label>'
        + '<input id="mvpTitleInput" type="text" maxlength="120" autocomplete="off"></div>'
        + '<div class="field"><label for="mvpMemoInput">Memo</label>'
        + '<textarea id="mvpMemoInput" rows="3" maxlength="2000"></textarea></div>';
      var actions = form.querySelector('.edit-actions');
      if (actions) form.insertBefore(wrap, actions);
      else form.appendChild(wrap);
    } catch (e) {}
  }

  function prefillProductEditFields() {
    try {
      var id = currentSelectedId();
      var m = findMoment(id);
      var titleEl = document.getElementById('mvpTitleInput');
      var memoEl = document.getElementById('mvpMemoInput');
      var errEl = document.getElementById('editError');
      if (errEl) errEl.textContent = '';
      if (titleEl) titleEl.value = m && typeof m.title === 'string' ? m.title : '';
      if (memoEl) memoEl.value = m && (typeof m.note === 'string' ? m.note : (typeof m.memo === 'string' ? m.memo : '')) || '';
    } catch (e) {}
  }

  function makeWriteOperationId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return 'wop-' + window.crypto.randomUUID();
    } catch (e) {}
    return 'wop-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  function onProductFormSubmitCapture(event) {
    try {
      var target = event && event.target;
      if (!target || target.id !== 'mediaForm') return;
      event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      var id = currentSelectedId();
      var titleEl = document.getElementById('mvpTitleInput');
      var memoEl = document.getElementById('mvpMemoInput');
      var errEl = document.getElementById('editError');
      var title = titleEl ? String(titleEl.value || '').trim() : '';
      var memo = memoEl ? String(memoEl.value || '').trim() : '';
      var fields = {};
      if (title) fields.title = title.slice(0, 120);
      if (memo) fields.memo = memo.slice(0, 2000);
      if (!id || !canonicalIds[id]) {
        if (errEl) errEl.textContent = 'Select a canonical Memory before saving.';
        return;
      }
      if (!fields.title && !fields.memo) {
        if (errEl) errEl.textContent = 'Enter a title and/or memo to save.';
        return;
      }
      if (errEl) errEl.textContent = '';
      post('UPDATE_MEMORY_REQUEST', {
        memoryId: String(id),
        fields: fields,
        writeOperationId: makeWriteOperationId(),
      });
    } catch (e) {}
  }

  function observeEditModal() {
    try {
      var modal = document.getElementById('editModal');
      if (!modal || typeof MutationObserver !== 'function') return;
      var observer = new MutationObserver(function () {
        try {
          if (modal.classList.contains('open')) prefillProductEditFields();
        } catch (e) {}
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
  }

  function hideEditEntries() {
    try {
      ensureProductEditFields();
      observeEditModal();
      try {
        document.addEventListener('submit', onProductFormSubmitCapture, true);
      } catch (e) {}
    } catch (e) {}
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
    lastMomentsById = {};
    moments.forEach(function (m) {
      if (m && typeof m.id === 'string') {
        canonicalIds[m.id] = true;
        lastMomentsById[m.id] = m;
      }
    });
    if (standalone && typeof standalone.id === 'string') {
      canonicalIds[standalone.id] = true;
      lastMomentsById[standalone.id] = standalone;
    }
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
    lastSelectedId = String(id);
    post('MEMORY_SELECTED', { memoryId: String(id), selectionReason: 'user' });
  };

  window.addEventListener('message', onMessage);
  post('SOURCE_READY', { capabilities: ['hydrate', 'select', 'update-title-memo'], sourceRuntimeVersion: 'src057-product-bridge/2' });
})();
