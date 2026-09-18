/**
 * auto-analyzer/validate-state-recipe.mjs
 *
 * Narrow deterministic validator for CLEAN-108 state recipes v1 (#611).
 *
 * Companions `src/08_harness/state-recipe.schema.json` (declarative shape).
 * This module enforces the semantic rules no bare JSON Schema draft can
 * express alone without a validator dependency:
 *
 * - per-action required fields
 * - runtime-hook allowlist (unknown hooks are SCHEMA INVALID)
 * - global-tolerance prohibition (tolerance is per-recipe/source only)
 * - arbitrary-code field prohibition (no shell/eval/code payloads)
 *
 * LAYERING NOTE (CENTRAL Blocker B): this validator enforces SYNTAX only.
 * `SYNTAX VALID` (a `__`-prefixed name passes the allowlist) is deliberately
 * DISTINCT from `SOURCE-BOUND TRUSTED`. Trust is decided solely by the
 * analyzer's SOURCE_HOOK_REGISTRY binding (analyze-html.mjs
 * `runtimeHookBinding`), never by this allowlist. "__foo is syntactically
 * valid" must never imply "therefore it is trusted for this Source".
 *
 * No dependencies. No filesystem access. No eval. Deterministic.
 */

export const RECIPE_SCHEMA_VERSION = 'clean108-state-recipe-v1';
export const RECIPE_SCHEMA_ID = 'clean108-state-recipe-v1';

export const ALLOWED_ACTION_TYPES = Object.freeze([
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
  'waitForFunction',
  'waitForRuntime',
  'waitForSelectorState',
  'settle',
  'evaluateHook',
  'setRuntime',
]);

/**
 * Allowlisted runtime-hook name shape.
 * Hooks must be explicit source-owned debug/QA handles (`__`-prefixed,
 * optionally under `window.`) or the declared DUAL_VARIANT selector
 * `mediaVariant`. Anything else (notably a bare generic assumption such as
 * an undeclared global) is rejected as UNKNOWN_HOOK.
 */
const HOOK_ALLOWLIST = /^(window\.)?(__[A-Za-z0-9_.$]+|mediaVariant)$/;

const FORBIDDEN_CODE_KEYS = new Set([
  'code',
  'script',
  'eval',
  'shell',
  'command',
  '__proto__',
  'constructor',
  'prototype',
]);

const GLOBAL_TOLERANCE_KEY_PATTERN = /^(ALL_|GLOBAL_|global|default)/;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkHook(name) {
  return typeof name === 'string' && HOOK_ALLOWLIST.test(name);
}

function deepScanForbidden(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => deepScanForbidden(entry, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_CODE_KEYS.has(key)) {
      errors.push(`ARBITRARY_CODE:${path}.${key} is forbidden in state recipes`);
    }
    deepScanForbidden(value[key], `${path}.${key}`, errors);
  }
}

/**
 * Validate a state recipe object.
 * @param {unknown} recipe parsed JSON value
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStateRecipe(recipe) {
  const errors = [];
  if (!isRecord(recipe)) return { valid: false, errors: ['RECIPE_MUST_BE_OBJECT'] };
  deepScanForbidden(recipe, 'recipe', errors);

  if (typeof recipe.sourceId !== 'string' || !/^SRC\d{3}$/.test(recipe.sourceId)) {
    errors.push('SOURCE_ID must match ^SRC[0-9]{3}$ (unknown sources cannot use a generic fallback)');
  }
  if (typeof recipe.recipeVersion !== 'string' || recipe.recipeVersion.length === 0) {
    errors.push('RECIPE_VERSION must be a non-empty string');
  }

  const viewport = recipe.viewport;
  if (!isRecord(viewport)) {
    errors.push('VIEWPORT must be an object');
  } else {
    if (!Number.isInteger(viewport.width) || viewport.width < 200 || viewport.width > 7680) {
      errors.push('VIEWPORT_MISSING: viewport.width must be an integer 200..7680');
    }
    if (!Number.isInteger(viewport.height) || viewport.height < 200 || viewport.height > 4320) {
      errors.push('VIEWPORT_MISSING: viewport.height must be an integer 200..4320');
    }
    if (viewport.deviceScaleFactor !== undefined && (typeof viewport.deviceScaleFactor !== 'number' || viewport.deviceScaleFactor < 0.5 || viewport.deviceScaleFactor > 4)) {
      errors.push('VIEWPORT deviceScaleFactor must be 0.5..4');
    }
    if (viewport.reducedMotion !== undefined && viewport.reducedMotion !== 'reduce' && viewport.reducedMotion !== 'no-preference') {
      errors.push('VIEWPORT reducedMotion must be reduce|no-preference');
    }
  }

  if (typeof recipe.stateId !== 'string' || recipe.stateId.length === 0) {
    errors.push('STATE_ID must be a non-empty string');
  }
  if (!Array.isArray(recipe.preconditions)) errors.push('PRECONDITIONS must be an array');

  if (!Array.isArray(recipe.actions) || recipe.actions.length === 0) {
    errors.push('ACTIONS must be a non-empty array');
  } else if (recipe.actions.length > 64) {
    errors.push('ACTIONS must contain at most 64 steps');
  } else {
    recipe.actions.forEach((action, index) => {
      const where = `actions[${index}]`;
      if (!isRecord(action)) {
        errors.push(`${where} must be an object`);
        return;
      }
      if (!ALLOWED_ACTION_TYPES.includes(action.type)) {
        errors.push(`UNKNOWN_ACTION:${where}.type ${JSON.stringify(action.type)} is not an allowed primitive`);
        return;
      }
      switch (action.type) {
        case 'goto':
          if (typeof action.url !== 'string' || !action.url) errors.push(`${where} goto requires url`);
          break;
        case 'click':
        case 'fill':
        case 'select':
          if (typeof action.selector !== 'string' || !action.selector) errors.push(`${where} ${action.type} requires selector`);
          if (action.type === 'fill' && (typeof action.value !== 'string' || !action.value)) errors.push(`${where} fill requires value`);
          if (action.type === 'select' && action.value === undefined) errors.push(`${where} select requires value`);
          break;
        case 'press':
          if (typeof action.key !== 'string' || !action.key) errors.push(`${where} press requires key`);
          break;
        case 'wheel':
          if (typeof action.deltaY !== 'number' && typeof action.deltaX !== 'number') errors.push(`${where} wheel requires deltaY and/or deltaX`);
          break;
        case 'drag':
          if (!Array.isArray(action.fromFraction) || !Array.isArray(action.toFraction)) errors.push(`${where} drag requires fromFraction/toFraction`);
          break;
        case 'scrollTo':
          if (action.x === undefined && action.y === undefined) errors.push(`${where} scrollTo requires x and/or y`);
          break;
        case 'seekHook':
        case 'setPhaseHook':
        case 'evaluateHook':
          if (typeof action.hook !== 'string' || !checkHook(action.hook)) {
            errors.push(`UNKNOWN_HOOK:${where}.hook ${JSON.stringify(action.hook)} is not allowlisted (must be __-prefixed or mediaVariant)`);
          }
          break;
        case 'waitForFunction':
          if (typeof action.fn !== 'string' || !action.fn) errors.push(`${where} waitForFunction requires fn`);
          break;
        case 'waitForRuntime':
          if (typeof action.path !== 'string' || !action.path) errors.push(`${where} waitForRuntime requires path`);
          break;
        case 'waitForSelectorState':
          if (typeof action.selector !== 'string' || !action.selector) errors.push(`${where} waitForSelectorState requires selector`);
          break;
        case 'setRuntime': {
          if (typeof action.path !== 'string' || !action.path) errors.push(`${where} setRuntime requires path`);
          const hasValue = Object.prototype.hasOwnProperty.call(action, 'value');
          const hasFromPath = Object.prototype.hasOwnProperty.call(action, 'fromPath');
          if (hasValue === hasFromPath) errors.push(`${where} setRuntime requires exactly one of value/fromPath`);
          if (hasFromPath && (typeof action.fromPath !== 'string' || !action.fromPath)) errors.push(`${where} setRuntime fromPath must be non-empty`);
          break;
        }
        case 'settle':
          break;
        default:
          break;
      }
    });
  }

  if (!isRecord(recipe.settleCondition)) errors.push('SETTLE_CONDITION must be an object');
  if (!Array.isArray(recipe.assertions)) errors.push('ASSERTIONS must be an array');
  if (!Array.isArray(recipe.screenshots)) {
    errors.push('SCREENSHOTS must be an array');
  } else {
    recipe.screenshots.forEach((shot, index) => {
      if (!isRecord(shot) || typeof shot.name !== 'string' || !shot.name) errors.push(`screenshots[${index}].name must be non-empty`);
      if (shot.digest !== undefined && !['canonical16', 'idat', 'raw'].includes(shot.digest)) {
        errors.push(`screenshots[${index}].digest must be canonical16|idat|raw`);
      }
    });
  }

  if (!isRecord(recipe.runtimeHook) || typeof recipe.runtimeHook.name !== 'string' || !checkHook(recipe.runtimeHook.name)) {
    errors.push(`UNKNOWN_HOOK:runtimeHook.name ${JSON.stringify(recipe.runtimeHook?.name)} is not allowlisted (must be __-prefixed or mediaVariant)`);
  }

  const tolerance = recipe.allowedTolerance;
  if (!isRecord(tolerance)) {
    errors.push('ALLOWED_TOLERANCE must be an object (per-recipe scope; global defaults forbidden)');
  } else {
    for (const key of Object.keys(tolerance)) {
      if (!['geometryEpsPx', 'floatDecimals', 'canonicalHammingMax', 'screenshot'].includes(key)) {
        if (GLOBAL_TOLERANCE_KEY_PATTERN.test(key) || key.includes('global') || key.includes('default')) {
          errors.push(`GLOBAL_TOLERANCE:${key} is forbidden; tolerance is per-recipe/source only`);
        } else {
          errors.push(`UNKNOWN_TOLERANCE_KEY:${key}`);
        }
      }
    }
    if (tolerance.geometryEpsPx !== undefined && (typeof tolerance.geometryEpsPx !== 'number' || tolerance.geometryEpsPx < 0 || tolerance.geometryEpsPx > 16)) {
      errors.push('ALLOWED_TOLERANCE geometryEpsPx must be 0..16');
    }
    if (tolerance.floatDecimals !== undefined && (!Number.isInteger(tolerance.floatDecimals) || tolerance.floatDecimals < 0 || tolerance.floatDecimals > 6)) {
      errors.push('ALLOWED_TOLERANCE floatDecimals must be 0..6');
    }
    if (tolerance.canonicalHammingMax !== undefined && (!Number.isInteger(tolerance.canonicalHammingMax) || tolerance.canonicalHammingMax < 0 || tolerance.canonicalHammingMax > 32)) {
      errors.push('ALLOWED_TOLERANCE canonicalHammingMax must be 0..32');
    }
    if (tolerance.screenshot !== undefined && !['EXACT', 'HAMMING', 'INFO_ONLY'].includes(tolerance.screenshot)) {
      errors.push('ALLOWED_TOLERANCE screenshot must be EXACT|HAMMING|INFO_ONLY');
    }
  }

  // Explicit top-level global-tolerance tripwire (defense in depth: even if a
  // future schema edit loosened additionalProperties, the validator holds).
  for (const key of Object.keys(recipe)) {
    if (GLOBAL_TOLERANCE_KEY_PATTERN.test(key)) {
      errors.push(`GLOBAL_TOLERANCE:${key} is forbidden at recipe top level`);
    }
  }

  const timeouts = recipe.timeouts;
  if (!isRecord(timeouts) || !Number.isInteger(timeouts.actionMs) || !Number.isInteger(timeouts.recipeMs)) {
    errors.push('TIMEOUTS must be { actionMs, recipeMs } integers');
  }

  return { valid: errors.length === 0, errors };
}
