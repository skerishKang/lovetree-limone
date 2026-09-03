import { ProductOrchestrator } from './product-orchestrator.js';
import { buildSurfaceUrl, projectAlphaContext, mapAlphaReadError } from './productized-alpha.js';
import { createMvp001ReadClient } from './read-client.js';
import { loadMvp001ReadContext } from './read-context.js';

const STEPS = [
  { id: 'entry', label: '입장 포털', srcId: 'SRC064', surface: '/mvp/01/surfaces/src064/index.html' },
  { id: 'board', label: '리빙 보드', srcId: 'SRC058', surface: '/mvp/01/surfaces/src058/index.html' },
  { id: 'relationships', label: '관계망', srcId: 'SRC056', surface: '/mvp/01/surfaces/src056/index.html' },
  { id: 'memory', label: '모먼트 상세', srcId: 'SRC057', surface: '/mvp/01/surfaces/src057/index.html' },
  { id: 'explore', label: '심층 탐색', srcId: 'SRC060', surface: '/mvp/01/surfaces/src060/index.html' },
];

const container = document.getElementById('surface-container');
const titleDisplay = document.getElementById('step-title-display');
const stepCounter = document.getElementById('step-counter');
const stepsSelector = document.getElementById('steps-selector');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const toggleBtn = document.getElementById('toggle-nav-btn');
const navContainer = document.getElementById('mvp-shell-nav');
const navPanel = document.getElementById('nav-panel');

let currentStepIndex = 0;

const IDLE_AUTO_COLLAPSE_MS = 4000;
const DEFERRED_COLLAPSE_RETRY_MS = 1000;

let collapseTimer = null;
let pointerOverNav = false;
let focusInsideNav = false;

function isNavCollapsed() {
  return navContainer.classList.contains('collapsed');
}

function clearAutoCollapse() {
  if (collapseTimer !== null) {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }
}

function scheduleAutoCollapse() {
  clearAutoCollapse();
  if (!isNavCollapsed()) {
    collapseTimer = setTimeout(autoCollapseTick, IDLE_AUTO_COLLAPSE_MS);
  }
}

function autoCollapseTick() {
  collapseTimer = null;
  if (isNavCollapsed()) return;
  if (pointerOverNav || focusInsideNav) {
    collapseTimer = setTimeout(autoCollapseTick, DEFERRED_COLLAPSE_RETRY_MS);
    return;
  }
  setCollapsed(true);
}

function setCollapsed(collapsed) {
  navContainer.classList.toggle('collapsed', collapsed);
  toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  if (collapsed) {
    clearAutoCollapse();
  } else {
    scheduleAutoCollapse();
  }
}

const orchestrator = new ProductOrchestrator({
  createFrame(surfaceUrl, sessionId, sourceId) {
    const iframe = document.createElement('iframe');
    iframe.className = 'mvp-surface-frame';
    iframe.title = `${sourceId} — ${STEPS.find((step) => step.srcId === sourceId)?.label || ''}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.dataset.mvpSourceId = sourceId;
    iframe.dataset.mvpFrameSessionId = sessionId;
    // Bootstrap carries ONLY the bridge session + source identity. Canonical
    // data flows exclusively through validated SOURCE_INIT.
    iframe.src = buildSurfaceUrl(surfaceUrl, sessionId, sourceId);
    container.appendChild(iframe);
    return iframe;
  },
  removeFrame(frame) {
    try {
      frame.src = 'about:blank';
    } catch {}
    frame.remove();
  },
  emitError(payload) {
    showAlphaState('error', alphaErrorText(payload));
  },
  getProjection(sourceId) {
    const entry = alphaProjections.get(sourceId);
    if (!entry || entry.revision !== orchestrator.contextRevision) return null;
    return entry.projection;
  },
});

// ---- Read-only Productized Alpha read flow (shell-owned) ----
// No fixture fallback: any read failure surfaces as an explicit Product state
// and frames receive a context-only INIT with canRead:false.

const alphaStateOverlay = document.createElement('div');
alphaStateOverlay.id = 'mvp-alpha-state';
alphaStateOverlay.setAttribute('role', 'status');
alphaStateOverlay.hidden = true;
document.body.appendChild(alphaStateOverlay);

let alphaLoadSeq = 0;
const alphaProjections = new Map();

function alphaErrorText(payload) {
  const code = payload && payload.code ? String(payload.code) : 'UNKNOWN';
  return `MVP01 read unavailable (${code}). No demo content is shown.`;
}

function showAlphaState(status, text) {
  if (!text) {
    alphaStateOverlay.hidden = true;
    alphaStateOverlay.textContent = '';
    return;
  }
  alphaStateOverlay.hidden = false;
  alphaStateOverlay.dataset.status = status;
  alphaStateOverlay.textContent = text;
}

function createAlphaClient() {
  const getAccessToken = typeof window.__MVP01_GET_ACCESS_TOKEN__ === 'function'
    ? window.__MVP01_GET_ACCESS_TOKEN__
    : undefined;
  return createMvp001ReadClient({ fetchImpl: window.fetch.bind(window), getAccessToken });
}

async function refreshAlphaProjections() {
  const seq = ++alphaLoadSeq;
  const context = orchestrator.getContext();
  if (!context || !context.treeId) {
    alphaProjections.clear();
    showAlphaState('hint', 'Select a Tree to begin the Productized Alpha journey.');
    return { ok: false, code: 'NO_TREE' };
  }
  showAlphaState('loading', 'Loading canonical Tree…');
  let readContext;
  try {
    const client = createAlphaClient();
    readContext = await loadMvp001ReadContext({
      client,
      treeId: context.treeId,
      selectedMemoryId: context.selectedMemoryId,
    });
  } catch (error) {
    if (seq !== alphaLoadSeq) return { ok: false, code: 'STALE_LOAD' };
    alphaProjections.clear();
    const mapped = mapAlphaReadError(error);
    showAlphaState(mapped.status, mapped.text);
    return { ok: false, code: mapped.status };
  }
  if (seq !== alphaLoadSeq) return { ok: false, code: 'STALE_LOAD' };
  alphaProjections.clear();
  for (const step of STEPS) {
    try {
      const { projection } = projectAlphaContext(step.srcId, readContext);
      alphaProjections.set(step.srcId, { revision: orchestrator.contextRevision, projection });
    } catch {
      // Per-source projection failure fails closed for that source only.
    }
  }
  if (readContext.memories.length === 0) {
    showAlphaState('empty', 'This Tree has no Memories yet. Nothing fixture-generated is shown.');
  } else {
    showAlphaState(null, null);
  }
  orchestrator.reinitActiveFrame();
  return { ok: true, context: readContext };
}

orchestrator.init();

function renderStepsNav() {
  stepsSelector.innerHTML = '';
  STEPS.forEach((step, idx) => {
    const chip = document.createElement('button');
    chip.className = 'step-chip' + (idx === currentStepIndex ? ' active' : '');
    chip.textContent = `${idx + 1}. ${step.label}`;
    chip.setAttribute('type', 'button');
    chip.setAttribute('data-step-id', step.id);
    chip.addEventListener('click', () => {
      goToStep(idx);
      scheduleAutoCollapse();
    });
    stepsSelector.appendChild(chip);
  });
}

function updateStepChrome(stepIndex) {
  const step = STEPS[stepIndex];
  currentStepIndex = stepIndex;
  titleDisplay.textContent = `${step.label} (${step.srcId})`;
  stepCounter.textContent = `${currentStepIndex + 1} / ${STEPS.length}`;
  prevBtn.disabled = currentStepIndex === 0;
  nextBtn.disabled = currentStepIndex === STEPS.length - 1;

  const chips = stepsSelector.querySelectorAll('.step-chip');
  chips.forEach((chip, idx) => {
    chip.classList.toggle('active', idx === currentStepIndex);
  });
}

function mountStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= STEPS.length) return false;
  const step = STEPS[stepIndex];

  orchestrator.unmountFrame();
  const mounted = orchestrator.mountFrame(step.id, step.surface);
  if (!mounted) return false;

  updateStepChrome(stepIndex);
  // Frame boots neutral (companion clears fixture pre-paint); projections
  // follow async and re-INIT the active frame when ready.
  void refreshAlphaProjections();
  return true;
}

function goToStep(index) {
  if (index < 0 || index >= STEPS.length || index === currentStepIndex) return;
  const result = orchestrator.navigateFromShell(STEPS[index].id);
  if (!result.accepted) return;
  mountStep(index);
}

function handleBridgeMessage(event) {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.protocol !== 'lovetree.mvp.bridge') return;

  const result = orchestrator.handleBridgeMessage(event);
  if (!result.accepted) return;

  if (
    result.type === 'TREE_SELECTED'
    || result.type === 'MEMORY_SELECTED'
    || (result.type === 'NAVIGATE' && result.changed)
  ) {
    void refreshAlphaProjections();
  }
  if (result.type === 'NAVIGATE' && typeof result.stepIndex === 'number' && result.changed) {
    mountStep(result.stepIndex);
  }
}

window.addEventListener('message', handleBridgeMessage);

window.addEventListener('popstate', () => {
  const previousStepIndex = currentStepIndex;
  const restored = orchestrator.onPopState();

  if (restored.stepIndex !== previousStepIndex) {
    mountStep(restored.stepIndex);
  } else {
    orchestrator.reinitActiveFrame();
    updateStepChrome(restored.stepIndex);
  }

  scheduleAutoCollapse();
});

prevBtn.addEventListener('click', () => {
  if (currentStepIndex > 0) {
    goToStep(currentStepIndex - 1);
    scheduleAutoCollapse();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentStepIndex < STEPS.length - 1) {
    goToStep(currentStepIndex + 1);
    scheduleAutoCollapse();
  }
});

toggleBtn.addEventListener('click', () => {
  setCollapsed(!isNavCollapsed());
});

navContainer.addEventListener('pointerenter', () => {
  pointerOverNav = true;
});

navContainer.addEventListener('pointerleave', () => {
  pointerOverNav = false;
  scheduleAutoCollapse();
});

navContainer.addEventListener('pointerdown', () => {
  scheduleAutoCollapse();
});

navContainer.addEventListener('keydown', () => {
  scheduleAutoCollapse();
});

navContainer.addEventListener('focusin', (event) => {
  focusInsideNav = navPanel.contains(event.target);
});

navContainer.addEventListener('focusout', (event) => {
  focusInsideNav = navPanel.contains(event.relatedTarget);
  if (!focusInsideNav) {
    scheduleAutoCollapse();
  }
});

renderStepsNav();
const initialContext = orchestrator.getContext();
const initialIndex = STEPS.findIndex((step) => step.id === initialContext.currentStep);
mountStep(initialIndex >= 0 ? initialIndex : 0);
setCollapsed(true);
