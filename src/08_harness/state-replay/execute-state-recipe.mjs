/**
 * Declarative CLEAN-108 state-recipe executor — M1 Slice 2 (#611).
 *
 * This module intentionally has no Playwright import. It consumes a narrow
 * page-like interface so contract tests can run without adding browser-test
 * inventory. Production callers may pass a Playwright Page.
 *
 * Recipe-provided strings are never evaluated as JavaScript. Every browser
 * evaluate/waitForFunction callback below is fixed code owned by this module;
 * recipe values are passed only as data arguments.
 */

import { validateExecutableStateRecipe } from './validate-executable-state-recipe.mjs';

const FORBIDDEN_RUNTIME_SEGMENTS = new Set(['constructor', 'prototype', '__proto__']);

function stripWindowPrefix(value) {
  return value.startsWith('window.') ? value.slice('window.'.length) : value;
}

function runtimeSegments(value, { allowNumeric = false } = {}) {
  const normalized = stripWindowPrefix(value);
  const segments = normalized.split('.');
  if (
    !segments.length
    || segments.some((segment) => {
      const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);
      const numericIndex = allowNumeric && /^(0|[1-9][0-9]*)$/.test(segment);
      return (!identifier && !numericIndex) || FORBIDDEN_RUNTIME_SEGMENTS.has(segment);
    })
  ) {
    throw new Error(`EXEC_RUNTIME_PATH_INVALID:${value}`);
  }
  return segments;
}

function resolveGoto(actionUrl, baseUrl) {
  const target = new URL(actionUrl, baseUrl);
  const base = new URL(baseUrl);
  if (target.origin !== base.origin) throw new Error(`EXEC_GOTO_CROSS_ORIGIN_REJECTED:${target.origin}`);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error(`EXEC_GOTO_PROTOCOL_FORBIDDEN:${target.protocol}`);
  return target.href;
}

async function callHook(page, hook, arg) {
  const segments = runtimeSegments(hook);
  return page.evaluate(({ segments: names, arg: value }) => {
    let parent = window;
    let current = window;
    for (const name of names) {
      if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), name)) {
        throw new Error(`trusted runtime hook own-property missing: ${names.join('.')}`);
      }
      parent = current;
      current = current[name];
    }
    if (typeof current !== 'function') {
      throw new Error(`trusted runtime hook is not callable: ${names.join('.')}`);
    }
    return current.call(parent, value);
  }, { segments, arg });
}

async function setRuntime(page, action) {
  const destination = runtimeSegments(action.path);
  const source = action.fromPath ? runtimeSegments(action.fromPath, { allowNumeric: true }) : null;
  const hasLiteral = Object.prototype.hasOwnProperty.call(action, 'value');
  await page.evaluate(({ destination: to, source: from, hasLiteral: literal, value }) => {
    const readOwnPath = (names) => {
      let current = window;
      for (const name of names) {
        if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), name)) {
          throw new Error(`trusted runtime source own-property missing: ${names.join('.')}`);
        }
        current = current[name];
      }
      return current;
    };

    let parent = window;
    for (const name of to.slice(0, -1)) {
      if (parent == null || !Object.prototype.hasOwnProperty.call(Object(parent), name)) {
        throw new Error(`trusted runtime destination parent missing: ${to.join('.')}`);
      }
      parent = parent[name];
    }
    const key = to.at(-1);
    if (parent == null || !Object.prototype.hasOwnProperty.call(Object(parent), key)) {
      throw new Error(`trusted runtime destination own-property missing: ${to.join('.')}`);
    }

    const next = literal ? value : readOwnPath(from);
    const type = typeof next;
    if (next !== null && !['string', 'number', 'boolean'].includes(type)) {
      throw new Error(`trusted runtime assignment is not primitive: ${to.join('.')}`);
    }
    if (type === 'number' && !Number.isFinite(next)) {
      throw new Error(`trusted runtime assignment is not finite: ${to.join('.')}`);
    }
    parent[key] = next;
  }, {
    destination,
    source,
    hasLiteral,
    value: action.value,
  });
}

async function waitForRuntime(page, action) {
  const segments = runtimeSegments(action.path);
  const hasEquals = Object.prototype.hasOwnProperty.call(action, 'equals');
  await page.waitForFunction(
    ({ segments: names, hasEquals: compare, equals }) => {
      let current = window;
      for (const name of names) {
        if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), name)) return false;
        current = current[name];
      }
      return compare ? Object.is(current, equals) : Boolean(current);
    },
    { segments, hasEquals, equals: action.equals },
    { timeout: action.timeoutMs ?? 8000 },
  );
}

async function settle(page, action) {
  if (action.clearToast) {
    const target = page.locator(action.clearToast);
    if (typeof target.evaluate === 'function') {
      await target.evaluate((element) => {
        element.classList.remove('show');
        element.classList.remove('open');
      });
    }
  }
  if (action.pauseMedia) {
    await page.evaluate(() => {
      for (const media of document.querySelectorAll('video,audio')) media.pause?.();
    });
  }
  if (action.awaitFonts) {
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
  }
  const frames = Number.isInteger(action.rAF) ? action.rAF : 0;
  if (frames > 0) {
    await page.evaluate(async (count) => {
      for (let i = 0; i < count; i += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }, frames);
  }
  if (action.waitMs) await page.waitForTimeout(action.waitMs);
}

function resolveScrollCoordinate(value, axis) {
  if (typeof value === 'number') return value;
  if (axis === 'x' && value === 'left') return 0;
  if (axis === 'y' && value === 'top') return 0;
  return value;
}

async function executeAction(page, action, baseUrl) {
  switch (action.type) {
    case 'goto': {
      const url = resolveGoto(action.url, baseUrl);
      const response = await page.goto(url, { waitUntil: 'load', timeout: action.timeoutMs ?? 30000 });
      if (response && typeof response.ok === 'function' && !response.ok()) {
        throw new Error(`EXEC_GOTO_HTTP_${response.status?.() ?? 'ERROR'}:${url}`);
      }
      return { type: action.type, url };
    }
    case 'click':
      await page.locator(action.selector).click({ timeout: action.timeoutMs });
      return { type: action.type, selector: action.selector };
    case 'fill':
      await page.locator(action.selector).fill(action.value, { timeout: action.timeoutMs });
      return { type: action.type, selector: action.selector };
    case 'select':
      await page.locator(action.selector).selectOption(action.value, { timeout: action.timeoutMs });
      return { type: action.type, selector: action.selector };
    case 'press':
      await page.keyboard.press(action.key);
      return { type: action.type, key: action.key };
    case 'wheel': {
      const repeat = Number.isInteger(action.repeat) ? action.repeat : 1;
      for (let i = 0; i < repeat; i += 1) {
        await page.mouse.wheel(action.deltaX ?? 0, action.deltaY ?? 0);
      }
      return { type: action.type, repeat };
    }
    case 'drag': {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('EXEC_DRAG_VIEWPORT_REQUIRED');
      const [fx, fy] = action.fromFraction;
      const [tx, ty] = action.toFraction;
      const steps = Number.isInteger(action.steps) ? action.steps : 8;
      await page.mouse.move(viewport.width * fx, viewport.height * fy);
      await page.mouse.down();
      await page.mouse.move(viewport.width * tx, viewport.height * ty, { steps });
      await page.mouse.up();
      return { type: action.type, steps };
    }
    case 'scrollTo': {
      const x = resolveScrollCoordinate(action.x ?? 0, 'x');
      const y = resolveScrollCoordinate(action.y ?? 0, 'y');
      await page.evaluate(({ x: targetX, y: targetY }) => {
        const resolvedX = targetX === 'right' ? document.documentElement.scrollWidth : targetX;
        const resolvedY = targetY === 'bottom' ? document.documentElement.scrollHeight : targetY;
        window.scrollTo(resolvedX, resolvedY);
      }, { x, y });
      return { type: action.type, x, y };
    }
    case 'seekHook':
    case 'setPhaseHook':
    case 'evaluateHook':
      await callHook(page, action.hook, action.arg);
      return { type: action.type, hook: action.hook };
    case 'setRuntime':
      await setRuntime(page, action);
      return { type: action.type, path: action.path, fromPath: action.fromPath ?? null };
    case 'waitForRuntime':
      await waitForRuntime(page, action);
      return { type: action.type, path: action.path };
    case 'waitForSelectorState':
      await page.locator(action.selector).waitFor({
        state: action.state ?? 'visible',
        timeout: action.timeoutMs ?? 8000,
      });
      return { type: action.type, selector: action.selector, state: action.state ?? 'visible' };
    case 'settle':
      await settle(page, action);
      return { type: action.type };
    default:
      throw new Error(`EXEC_ACTION_NOT_SUPPORTED:${action.type}`);
  }
}

/**
 * Execute one already-approved state recipe against one page.
 *
 * @param {object} options
 * @param {object} options.page Playwright Page or compatible fake-page
 * @param {object} options.recipe state recipe
 * @param {object} options.runtimeHookBinding analyzer source-bound binding
 * @param {string} options.baseUrl same-origin baseline/parity server URL
 * @returns {Promise<{sourceId: string, stateId: string, actionsExecuted: number, trace: object[]} >}
 */
export async function executeStateRecipe({ page, recipe, runtimeHookBinding, baseUrl }) {
  if (!page || typeof page !== 'object') throw new Error('EXEC_PAGE_REQUIRED');
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) throw new Error('EXEC_BASE_URL_REQUIRED');

  const validation = validateExecutableStateRecipe(recipe, { runtimeHookBinding, baseUrl });
  if (!validation.valid) {
    throw new Error(`EXEC_RECIPE_REJECTED:${validation.errors.join('|')}`);
  }

  const trace = [];
  for (const action of recipe.actions) {
    trace.push(await executeAction(page, action, baseUrl));
  }

  return {
    sourceId: recipe.sourceId,
    stateId: recipe.stateId,
    actionsExecuted: trace.length,
    trace,
  };
}
