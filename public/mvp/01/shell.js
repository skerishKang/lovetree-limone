import { ProductOrchestrator } from './product-orchestrator.js';

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
let activeFrame = null;

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
    iframe.title = `${sourceId} — ${STEPS.find((s) => s.srcId === sourceId)?.label || ''}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.dataset.mvpSourceId = sourceId;
    iframe.dataset.mvpFrameSessionId = sessionId;
    iframe.src = surfaceUrl;
    container.appendChild(iframe);
    return iframe;
  },
  removeFrame(frame) {
    try {
      frame.src = 'about:blank';
    } catch {}
    frame.remove();
  },
  updateUrl(url) {
    try {
      window.history.pushState({ ...orchestrator.getContext() }, '', url);
    } catch {}
  },
});

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
      goToStep(idx, true);
      scheduleAutoCollapse();
    });
    stepsSelector.appendChild(chip);
  });
}

function mountStep(stepIndex, updateUrl = true) {
  if (stepIndex < 0 || stepIndex >= STEPS.length) return;
  const step = STEPS[stepIndex];

  orchestrator.unmountFrame();

  if (activeFrame) {
    try {
      activeFrame.src = 'about:blank';
    } catch {}
    activeFrame.remove();
    activeFrame = null;
  }

  const { frame } = orchestrator.mountFrame(step.id, step.surface);
  activeFrame = frame;

  currentStepIndex = stepIndex;

  titleDisplay.textContent = `${step.label} (${step.srcId})`;
  stepCounter.textContent = `${currentStepIndex + 1} / ${STEPS.length}`;
  prevBtn.disabled = currentStepIndex === 0;
  nextBtn.disabled = currentStepIndex === STEPS.length - 1;

  const chips = stepsSelector.querySelectorAll('.step-chip');
  chips.forEach((c, idx) => {
    c.classList.toggle('active', idx === currentStepIndex);
  });

  if (updateUrl) {
    orchestrator.updateUrl(serializeMvp001UrlState(orchestrator.getContext()));
  }
}

function goToStep(index, updateUrl) {
  if (index === currentStepIndex) return;
  mountStep(index, updateUrl);
}

function handleBridgeMessage(event) {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.protocol !== 'lovetree.mvp.bridge') return;

  const result = orchestrator.handleBridgeMessage(event);
  if (!result.accepted) return;

  if (result.type === 'NAVIGATE' && typeof result.stepIndex === 'number') {
    mountStep(result.stepIndex, true);
  }
}

window.addEventListener('message', handleBridgeMessage);

window.addEventListener('popstate', () => {
  const restored = orchestrator.onPopState();
  mountStep(restored.stepIndex, false);
  scheduleAutoCollapse();
});

prevBtn.addEventListener('click', () => {
  if (currentStepIndex > 0) {
    goToStep(currentStepIndex - 1, true);
    scheduleAutoCollapse();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentStepIndex < STEPS.length - 1) {
    goToStep(currentStepIndex + 1, true);
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
const initialIndex = MVP001_STEPS.indexOf(initialContext.currentStep);
mountStep(initialIndex >= 0 ? initialIndex : 0, false);
setCollapsed(true);
