/**
 * Executable-state-recipe gate for CLEAN-108 M1 (#611).
 *
 * The existing state-recipe validator is the syntax layer. This module is the
 * stricter execution layer used before any browser action is dispatched.
 *
 * Security / fidelity rules:
 * - source identity must match the source-bound runtime-hook binding
 * - binding expectations must exactly match the analyzer's immutable registry
 * - only hooks both expected AND actually discovered are executable
 * - only a BOUND runtime-hook result is executable in this v1 slice
 * - prototype-chain segments are forbidden (`constructor`, `prototype`,
 *   `__proto__`) so a trusted root cannot tunnel into language intrinsics
 * - free-form waitForFunction/fn strings are syntax-valid legacy input but are
 *   NOT executable here (no recipe-provided JavaScript execution path)
 * - setRuntime may assign only a primitive literal or a primitive read through
 *   another source-bound own-property path; no expression/code evaluation exists
 * - navigation is same-origin to the supplied baseline origin
 * - DUAL_VARIANT / NO_EXPECTED_HOOK remains explicit-driver/plugin territory
 */

import {
  SOURCE_HOOK_REGISTRY,
} from '../auto-analyzer/analyze-html.mjs';
import { validateStateRecipe } from '../auto-analyzer/validate-state-recipe.mjs';

export const EXECUTABLE_RECIPE_VERSION = 'clean108-executable-recipe-v1';

const EXECUTABLE_ACTION_TYPES = new Set([
  'goto',
  'click',
  'fill',
  'select',
  'press',
  'wheel',
  'drag',
  'scrollTo',
  'seekHook',
  'setPhaseHook',
  'waitForRuntime',
  'waitForSelectorState',
  'settle',
  'evaluateHook',
  'setRuntime',
]);

const FORBIDDEN_RUNTIME_SEGMENTS = new Set(['constructor', 'prototype', '__proto__']);

function runtimePathSegments(value, { allowNumeric = false } = {}) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const normalized = value.startsWith('window.') ? value.slice('window.'.length) : value;
  const segments = normalized.split('.');
  if (!segments.length) return null;
  for (const segment of segments) {
    const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment);
    const numericIndex = allowNumeric && /^(0|[1-9][0-9]*)$/.test(segment);
    if ((!identifier && !numericIndex) || FORBIDDEN_RUNTIME_SEGMENTS.has(segment)) return null;
  }
  return segments;
}

function hookRoot(value, options = {}) {
  const segments = runtimePathSegments(value, options);
  if (!segments) return null;
  const [root] = segments;
  return /^__[A-Za-z0-9_$]+$/.test(root) ? root : null;
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function validateBinding(recipe, runtimeHookBinding, errors) {
  if (!runtimeHookBinding || typeof runtimeHookBinding !== 'object') {
    errors.push('EXEC_RUNTIME_BINDING_REQUIRED');
    return;
  }
  if (runtimeHookBinding.sourceId !== recipe.sourceId) {
    errors.push(`EXEC_SOURCE_BINDING_MISMATCH:${recipe.sourceId}:${runtimeHookBinding.sourceId ?? 'UNKNOWN'}`);
  }
  if (runtimeHookBinding.status !== 'BOUND' || runtimeHookBinding.matched !== true) {
    errors.push(`EXEC_RUNTIME_BINDING_NOT_BOUND:${runtimeHookBinding.status ?? 'UNKNOWN'}`);
  }

  const registryEntry = SOURCE_HOOK_REGISTRY[recipe.sourceId];
  if (!registryEntry || registryEntry.variant === 'DUAL_VARIANT' || registryEntry.expectedHooks.length === 0) {
    errors.push(`EXEC_SOURCE_NOT_EXECUTABLE_BY_GENERIC_REPLAY:${recipe.sourceId}`);
    return;
  }

  const registeredExpected = [...registryEntry.expectedHooks];
  if (!sameStringSet(runtimeHookBinding.expected, registeredExpected)) {
    errors.push(`EXEC_RUNTIME_BINDING_REGISTRY_MISMATCH:${recipe.sourceId}`);
    return;
  }
  if (!Array.isArray(runtimeHookBinding.discovered)) {
    errors.push('EXEC_RUNTIME_DISCOVERY_REQUIRED');
    return;
  }

  const expected = new Set(registeredExpected);
  const discovered = new Set(runtimeHookBinding.discovered);
  const trusted = new Set(registeredExpected.filter((hook) => discovered.has(hook)));
  if (trusted.size === 0) {
    errors.push(`EXEC_RUNTIME_NO_DISCOVERED_EXPECTED_HOOK:${recipe.sourceId}`);
    return;
  }

  const topLevelPath = runtimePathSegments(recipe.runtimeHook?.name);
  const topLevelRoot = hookRoot(recipe.runtimeHook?.name);
  if (!topLevelPath) {
    errors.push(`EXEC_RUNTIME_PATH_FORBIDDEN:${recipe.runtimeHook?.name ?? 'UNKNOWN'}`);
  } else if (!topLevelRoot || !expected.has(topLevelRoot)) {
    errors.push(`EXEC_RUNTIME_HOOK_NOT_SOURCE_BOUND:${recipe.runtimeHook?.name ?? 'UNKNOWN'}`);
  } else if (!trusted.has(topLevelRoot)) {
    errors.push(`EXEC_RUNTIME_HOOK_NOT_DISCOVERED:${recipe.runtimeHook?.name ?? 'UNKNOWN'}`);
  }

  for (const [index, action] of recipe.actions.entries()) {
    const candidate = action?.hook ?? action?.path;
    if (candidate) {
      const segments = runtimePathSegments(candidate);
      const root = hookRoot(candidate);
      if (!segments) {
        errors.push(`EXEC_ACTION_RUNTIME_PATH_FORBIDDEN:actions[${index}]:${candidate}`);
      } else if (!root || !expected.has(root)) {
        errors.push(`EXEC_ACTION_HOOK_NOT_SOURCE_BOUND:actions[${index}]:${candidate}`);
      } else if (!trusted.has(root)) {
        errors.push(`EXEC_ACTION_HOOK_NOT_DISCOVERED:actions[${index}]:${candidate}`);
      }
    }

    if (action?.fromPath) {
      const segments = runtimePathSegments(action.fromPath, { allowNumeric: true });
      const root = hookRoot(action.fromPath, { allowNumeric: true });
      if (!segments) {
        errors.push(`EXEC_ACTION_RUNTIME_PATH_FORBIDDEN:actions[${index}].fromPath:${action.fromPath}`);
      } else if (!root || !expected.has(root)) {
        errors.push(`EXEC_ACTION_HOOK_NOT_SOURCE_BOUND:actions[${index}].fromPath:${action.fromPath}`);
      } else if (!trusted.has(root)) {
        errors.push(`EXEC_ACTION_HOOK_NOT_DISCOVERED:actions[${index}].fromPath:${action.fromPath}`);
      }
    }
  }
}

function validateNavigation(recipe, baseUrl, errors) {
  let parsedBase = null;
  if (baseUrl !== undefined && baseUrl !== null) {
    try {
      parsedBase = new URL(baseUrl);
      if (!['http:', 'https:'].includes(parsedBase.protocol)) {
        errors.push(`EXEC_BASE_URL_PROTOCOL_FORBIDDEN:${parsedBase.protocol}`);
      }
    } catch {
      errors.push('EXEC_BASE_URL_INVALID');
    }
  }

  recipe.actions.forEach((action, index) => {
    if (action.type !== 'goto') return;
    try {
      if (!parsedBase && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(action.url)) {
        errors.push(`EXEC_GOTO_ABSOLUTE_REQUIRES_BASE:actions[${index}]`);
        return;
      }
      if (parsedBase) {
        const target = new URL(action.url, parsedBase);
        if (!['http:', 'https:'].includes(target.protocol)) {
          errors.push(`EXEC_GOTO_PROTOCOL_FORBIDDEN:actions[${index}]:${target.protocol}`);
        } else if (target.origin !== parsedBase.origin) {
          errors.push(`EXEC_GOTO_CROSS_ORIGIN_REJECTED:actions[${index}]:${target.origin}`);
        }
      }
    } catch {
      errors.push(`EXEC_GOTO_INVALID_URL:actions[${index}]`);
    }
  });
}

function validateActionShapes(recipe, errors) {
  recipe.actions.forEach((action, index) => {
    if (!EXECUTABLE_ACTION_TYPES.has(action.type)) {
      if (action.type === 'waitForFunction') {
        errors.push(`EXEC_UNSAFE_FREEFORM_FUNCTION_REJECTED:actions[${index}]`);
      } else {
        errors.push(`EXEC_ACTION_NOT_SUPPORTED:actions[${index}]:${action.type}`);
      }
      return;
    }

    if (action.type === 'drag') {
      for (const [name, point] of [['fromFraction', action.fromFraction], ['toFraction', action.toFraction]]) {
        if (!Array.isArray(point) || point.length !== 2 || point.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1)) {
          errors.push(`EXEC_DRAG_FRACTION_INVALID:actions[${index}].${name}`);
        }
      }
    }

    if (action.type === 'scrollTo') {
      const validCoordinate = (value, axis) => {
        if (value === undefined) return true;
        if (typeof value === 'number' && Number.isFinite(value)) return true;
        if (axis === 'y' && (value === 'top' || value === 'bottom')) return true;
        if (axis === 'x' && (value === 'left' || value === 'right')) return true;
        return false;
      };
      if (!validCoordinate(action.x, 'x') || !validCoordinate(action.y, 'y')) {
        errors.push(`EXEC_SCROLL_COORDINATE_INVALID:actions[${index}]`);
      }
    }

    if (action.type === 'waitForSelectorState' && action.state !== undefined) {
      if (!['attached', 'detached', 'visible', 'hidden'].includes(action.state)) {
        errors.push(`EXEC_SELECTOR_STATE_INVALID:actions[${index}]:${action.state}`);
      }
    }

    if (action.type === 'setRuntime') {
      if (typeof action.path !== 'string' || action.path.length === 0) {
        errors.push(`EXEC_SET_RUNTIME_PATH_REQUIRED:actions[${index}]`);
      }
      const hasValue = Object.prototype.hasOwnProperty.call(action, 'value');
      const hasFromPath = Object.prototype.hasOwnProperty.call(action, 'fromPath');
      if (hasValue === hasFromPath) {
        errors.push(`EXEC_SET_RUNTIME_EXACTLY_ONE_SOURCE_REQUIRED:actions[${index}]`);
      }
      if (hasValue) {
        const valueType = typeof action.value;
        if (action.value !== null && !['string', 'number', 'boolean'].includes(valueType)) {
          errors.push(`EXEC_SET_RUNTIME_LITERAL_NOT_PRIMITIVE:actions[${index}]`);
        } else if (valueType === 'number' && !Number.isFinite(action.value)) {
          errors.push(`EXEC_SET_RUNTIME_LITERAL_NOT_FINITE:actions[${index}]`);
        }
      }
      if (hasFromPath && (typeof action.fromPath !== 'string' || action.fromPath.length === 0)) {
        errors.push(`EXEC_SET_RUNTIME_FROM_PATH_REQUIRED:actions[${index}]`);
      }
    }
  });
}

/**
 * @param {unknown} recipe
 * @param {{runtimeHookBinding?: object|null, baseUrl?: string|null}} [options]
 * @returns {{valid: boolean, errors: string[], executableVersion: string}}
 */
export function validateExecutableStateRecipe(recipe, { runtimeHookBinding = null, baseUrl = null } = {}) {
  const syntax = validateStateRecipe(recipe);
  const errors = syntax.errors.map((error) => `SYNTAX:${error}`);
  if (!syntax.valid) {
    return { valid: false, errors, executableVersion: EXECUTABLE_RECIPE_VERSION };
  }

  validateBinding(recipe, runtimeHookBinding, errors);
  validateNavigation(recipe, baseUrl, errors);
  validateActionShapes(recipe, errors);

  return {
    valid: errors.length === 0,
    errors,
    executableVersion: EXECUTABLE_RECIPE_VERSION,
  };
}

export function getExecutableHookRoot(value) {
  return hookRoot(value);
}
