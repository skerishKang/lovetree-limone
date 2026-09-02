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
  const navPanel = document.getElementById('nav-panel');

  let currentStepIndex = 0;
  let activeFrame = null;

  // Autohide chrome: the shell starts collapsed so Source surfaces remain
  // unobstructed. It opens only on explicit toggle and returns to collapsed
  // after bounded idle time, never while the pointer or keyboard focus is inside.
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
        scheduleAutoCollapse();
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

  // Focus guard covers the panel only: the always-visible toggle may keep
  // focus after a mouse click without blocking auto-collapse forever.
  navContainer.addEventListener('focusin', (event) => {
    focusInsideNav = navPanel.contains(event.target);
  });

  navContainer.addEventListener('focusout', (event) => {
    focusInsideNav = navPanel.contains(event.relatedTarget);
    if (!focusInsideNav) {
      scheduleAutoCollapse();
    }
  });

  window.addEventListener('popstate', () => {
    const idx = parseStepFromUrl();
    setStep(idx, false);
    scheduleAutoCollapse();
  });

  // Initial load
  renderStepsNav();
  const initialIndex = parseStepFromUrl();
  setStep(initialIndex, false);
  setCollapsed(true);
})();
