(function () {
  'use strict';

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

  let currentStepIndex = 0;
  let activeFrame = null;

  function parseStepFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      if (!stepParam) return 0;
      const idx = STEPS.findIndex((s) => s.id === stepParam);
      return idx >= 0 ? idx : 0; // Fail safe to 0 (entry)
    } catch {
      return 0;
    }
  }

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
      });
      stepsSelector.appendChild(chip);
    });
  }

  function setStep(index, updateUrl) {
    if (index < 0 || index >= STEPS.length) return;
    currentStepIndex = index;
    const step = STEPS[currentStepIndex];

    // Update UI controls
    titleDisplay.textContent = `${step.label} (${step.srcId})`;
    stepCounter.textContent = `${currentStepIndex + 1} / ${STEPS.length}`;
    prevBtn.disabled = currentStepIndex === 0;
    nextBtn.disabled = currentStepIndex === STEPS.length - 1;

    // Update active chip
    const chips = stepsSelector.querySelectorAll('.step-chip');
    chips.forEach((c, idx) => {
      c.classList.toggle('active', idx === currentStepIndex);
    });

    // Cleanly unmount old active iframe to completely kill timers, rAF loops, audio/video
    if (activeFrame) {
      try {
        activeFrame.src = 'about:blank';
      } catch {}
      activeFrame.remove();
      activeFrame = null;
    }

    // Mount fresh isolated iframe for the active surface
    const iframe = document.createElement('iframe');
    iframe.className = 'mvp-surface-frame';
    iframe.title = `${step.srcId} — ${step.label}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.src = step.surface;
    container.appendChild(iframe);
    activeFrame = iframe;

    // Update URL query state
    if (updateUrl) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('step', step.id);
        window.history.pushState({ step: step.id, index: currentStepIndex }, '', url.toString());
      } catch {}
    }
  }

  function goToStep(index, updateUrl) {
    if (index === currentStepIndex) return;
    setStep(index, updateUrl);
  }

  prevBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1, true);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStepIndex < STEPS.length - 1) {
      goToStep(currentStepIndex + 1, true);
    }
  });

  toggleBtn.addEventListener('click', () => {
    navContainer.classList.toggle('collapsed');
  });

  window.addEventListener('popstate', () => {
    const idx = parseStepFromUrl();
    setStep(idx, false);
  });

  // Initial load
  renderStepsNav();
  const initialIndex = parseStepFromUrl();
  setStep(initialIndex, false);
})();
