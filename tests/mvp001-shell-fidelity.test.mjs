/**
 * tests/mvp001-shell-fidelity.test.mjs
 *
 * Regression contract for the MVP001 floating shell fidelity repair.
 *
 * Enforces:
 * CASE 1: initial shell state is collapsed (SOURCE_INTRUSION = NONE)
 * CASE 2: toggle click expands the navigation panel
 * CASE 3: toggle click again collapses it
 * CASE 4: step navigation (prev/next/chips) remains functional
 * CASE 5: collapsed panel is removed from layout/hit-testing (display:none contract)
 * CASE 6: URL ?step= state and pushState/popstate history remain functional
 * CASE 7: open + bounded idle auto-collapses the panel
 * CASE 8: pointer over nav or keyboard focus inside nav defers auto-collapse
 *
 * Runs the real shell.js inside a vm sandbox with a minimal fake DOM and a
 * deterministic fake clock. Deliberately contains no Playwright usage so it
 * stays in the CI non-browser test bucket.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(import.meta.dirname, '..');
const SHELL_JS = readFileSync(join(ROOT, 'public/mvp/01/shell.js'), 'utf8');
const SHELL_CSS = readFileSync(join(ROOT, 'public/mvp/01/shell.css'), 'utf8');
const SHELL_HTML = readFileSync(join(ROOT, 'public/mvp/01/index.html'), 'utf8');

function makeElement(id, tag) {
  const listeners = {};
  const classes = new Set();
  const el = {
    id,
    tagName: (tag || 'div').toUpperCase(),
    children: [],
    attrs: {},
    textContent: '',
    disabled: false,
    src: '',
    title: '',
    allow: '',
    className: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
    },
    setAttribute: (k, v) => { el.attrs[k] = String(v); },
    getAttribute: (k) => (k in el.attrs ? el.attrs[k] : null),
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    appendChild: (child) => { child.parent = el; el.children.push(child); return child; },
    remove: () => {
      if (el.parent) {
        const i = el.parent.children.indexOf(el);
        if (i >= 0) el.parent.children.splice(i, 1);
        el.parent = null;
      }
    },
    contains: (other) => {
      if (!other) return false;
      if (other === el) return true;
      return el.children.some((c) => (c.contains ? c.contains(other) : false));
    },
    querySelectorAll: (sel) => {
      const cls = sel.replace(/^\./, '');
      return el.children.filter((c) => c.classList.contains(cls));
    },
    __fire: (type, event) => {
      (listeners[type] || []).forEach((fn) => fn(event || { type }));
    },
    __classes: classes,
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => '',
    set: (v) => { if (v === '') el.children.length = 0; },
  });
  Object.defineProperty(el, 'className', {
    get: () => [...classes].join(' '),
    set: (v) => { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
  });
  return el;
}

function createHarness(initialSearch = '') {
  const ids = [
    'surface-container', 'step-title-display', 'step-counter', 'steps-selector',
    'prev-btn', 'next-btn', 'toggle-nav-btn', 'mvp-shell-nav', 'nav-panel',
  ];
  const elements = {};
  ids.forEach((id) => { elements[id] = makeElement(id, id === 'toggle-nav-btn' || id === 'prev-btn' || id === 'next-btn' ? 'button' : 'div'); });

  // Connect a minimal containment tree mirroring index.html markup
  elements['mvp-shell-nav'].appendChild(elements['nav-panel']);
  elements['mvp-shell-nav'].appendChild(elements['toggle-nav-btn']);
  elements['nav-panel'].appendChild(elements['steps-selector']);
  elements['nav-panel'].appendChild(elements['prev-btn']);
  elements['nav-panel'].appendChild(elements['next-btn']);

  const winListeners = {};
  const historyEntries = [];
  const location = {
    search: initialSearch,
    get href() { return `https://local.test/mvp/01/${this.search}`; },
  };

  let now = 0;
  let seq = 0;
  const timers = new Map();

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    URL,
    URLSearchParams,
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: now + (ms || 0) }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    document: {
      getElementById: (id) => elements[id] || null,
      createElement: (tag) => makeElement('', tag),
      activeElement: null,
    },
    window: {
      location,
      history: { pushState: (_s, _t, url) => { historyEntries.push(url); } },
      addEventListener: (type, fn) => { (winListeners[type] ||= []).push(fn); },
    },
  };

  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SHELL_JS, sandbox);

  const api = {
    el: elements,
    historyEntries,
    activeFrames: () => elements['surface-container'].children,
    currentFrameSrc: () => {
      const frames = elements['surface-container'].children;
      return frames.length ? frames[frames.length - 1].src : null;
    },
    advance(ms) {
      const target = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) {
          if (t.at <= target && (next === null || t.at < next[1].at)) next = [id, t];
        }
        if (!next) break;
        timers.delete(next[0]);
        now = Math.max(now, next[1].at);
        next[1].fn();
      }
      now = target;
    },
    firePopstate() { (winListeners.popstate || []).forEach((fn) => fn({ type: 'popstate' })); },
    setLocation(search) { location.search = search; },
  };
  return api;
}

test('CASE 1: shell starts collapsed and markup pre-declares collapsed state', () => {
  assert.ok(/id="mvp-shell-nav"[^>]*class="[^"]*collapsed/.test(SHELL_HTML), 'index.html must ship nav with collapsed class (no pre-JS flash)');
  assert.ok(/id="toggle-nav-btn"[^>]*aria-expanded="false"/.test(SHELL_HTML), 'toggle must start aria-expanded=false');

  const h = createHarness();
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'initial nav state must be collapsed');
  assert.equal(h.el['toggle-nav-btn'].getAttribute('aria-expanded'), 'false');
});

test('CASE 2 & 3: toggle click expands, toggle click again collapses', () => {
  const h = createHarness();
  h.el['toggle-nav-btn'].__fire('click');
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'toggle must expand the panel');
  assert.equal(h.el['toggle-nav-btn'].getAttribute('aria-expanded'), 'true');

  h.el['toggle-nav-btn'].__fire('click');
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'toggle must collapse the panel');
  assert.equal(h.el['toggle-nav-btn'].getAttribute('aria-expanded'), 'false');
});

test('CASE 4: step navigation remains functional through prev/next/chips', () => {
  const h = createHarness();
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src064/index.html', 'entry mounts SRC064 surface');
  assert.equal(h.el['prev-btn'].disabled, true, 'prev disabled at first step');
  assert.equal(h.el['next-btn'].disabled, false);

  h.el['next-btn'].__fire('click');
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src058/index.html', 'next mounts board surface');
  assert.equal(h.el['step-counter'].textContent, '2 / 5');
  assert.equal(h.el['prev-btn'].disabled, false);
  assert.equal(h.activeFrames().length, 1, 'exactly one mounted frame after transition');

  h.el['prev-btn'].__fire('click');
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src064/index.html', 'prev returns to entry');
  assert.equal(h.el['step-counter'].textContent, '1 / 5');

  const chips = h.el['steps-selector'].querySelectorAll('.step-chip');
  assert.equal(chips.length, 5, 'five step chips rendered');
  chips[4].__fire('click');
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src060/index.html', 'chip jump mounts explore surface');
  assert.equal(chips[4].classList.contains('active'), true);
});

test('CASE 5: collapsed panel is removed from layout and hit-testing', () => {
  assert.ok(
    /\.mvp-nav\.collapsed\s+\.mvp-nav-panel\s*\{[^}]*display:\s*none/i.test(SHELL_CSS),
    'collapsed panel must be display:none so it cannot intercept pointer events',
  );
  assert.ok(
    !/\.mvp-nav\.collapsed\s+\.mvp-nav-panel\s*\{[^}]*(opacity:\s*0|visibility:\s*hidden|pointer-events:\s*none)/.test(SHELL_CSS.replace(/display:\s*none/g, '')),
    'collapsed panel must not rely on invisible-but-present hit areas',
  );
});

test('CASE 6: URL ?step= parse, pushState and popstate remain functional', () => {
  const h = createHarness('?step=memory');
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src057/index.html', 'direct ?step=memory deep link mounts memory surface');

  h.el['next-btn'].__fire('click');
  assert.equal(h.historyEntries.length, 1, 'step transition pushes history entry');
  assert.ok(h.historyEntries[0].includes('step=explore'), 'pushed URL carries new step id');

  h.setLocation('?step=board');
  h.firePopstate();
  assert.equal(h.currentFrameSrc(), '/mvp/01/surfaces/src058/index.html', 'popstate restores board surface from URL');
  assert.equal(h.el['step-counter'].textContent, '2 / 5');

  const h2 = createHarness('?step=bogus');
  assert.equal(h2.currentFrameSrc(), '/mvp/01/surfaces/src064/index.html', 'invalid step fails safe to entry');
});

test('CASE 7: open + bounded idle auto-collapses; interaction resets the timer', () => {
  const h = createHarness();
  h.el['toggle-nav-btn'].__fire('click');
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false);

  h.advance(3900);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'must not collapse before idle window');

  // Interaction resets the idle window
  h.el['mvp-shell-nav'].__fire('pointerdown');
  h.advance(3900);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'timer reset must extend openness');

  h.advance(200);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'idle expiry must auto-collapse');
  assert.equal(h.el['toggle-nav-btn'].getAttribute('aria-expanded'), 'false');
});

test('CASE 7b: step navigation while open resets the idle timer', () => {
  const h = createHarness();
  h.el['toggle-nav-btn'].__fire('click');
  h.advance(3900);
  h.el['next-btn'].__fire('click');
  h.advance(3900);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'step nav must keep panel open and reset timer');
  h.advance(200);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true);
});

test('CASE 8: pointer over nav or focus inside nav defers auto-collapse', () => {
  const h = createHarness();
  h.el['toggle-nav-btn'].__fire('click');

  h.el['mvp-shell-nav'].__fire('pointerenter');
  h.advance(10000);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'pointer resting over nav must block auto-collapse');

  h.el['mvp-shell-nav'].__fire('pointerleave');
  h.advance(4100);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'collapse resumes after the idle window once pointer leaves');

  // Keyboard focus path: focus inside the panel blocks auto-collapse
  h.el['toggle-nav-btn'].__fire('click');
  h.el['mvp-shell-nav'].__fire('focusin', { target: h.el['next-btn'] });
  h.advance(10000);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), false, 'keyboard focus inside panel must block auto-collapse');

  h.el['mvp-shell-nav'].__fire('focusout', { relatedTarget: null });
  h.advance(4100);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'collapse resumes after focus leaves panel');

  // Focus on the always-visible toggle must NOT block auto-collapse (mouse-click case)
  h.el['toggle-nav-btn'].__fire('click');
  h.el['mvp-shell-nav'].__fire('focusin', { target: h.el['toggle-nav-btn'] });
  h.advance(4100);
  assert.equal(h.el['mvp-shell-nav'].classList.contains('collapsed'), true, 'toggle-button focus must not veto autohide');
});

test('repair preserves the isolated-iframe surface lifecycle contracts', () => {
  assert.ok(SHELL_JS.includes("document.createElement('iframe')"), 'shell must keep iframe isolation');
  assert.ok(SHELL_JS.includes('.src = step.surface'), 'shell must keep surface src wiring');
  assert.ok(SHELL_JS.includes("activeFrame.src = 'about:blank'"), 'shell must keep iframe flush on unmount');
  assert.ok(SHELL_JS.includes('return idx >= 0 ? idx : 0'), 'shell must keep invalid-step fail-safe');
});
