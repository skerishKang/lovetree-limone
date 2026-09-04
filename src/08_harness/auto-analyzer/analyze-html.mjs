/**
 * auto-analyzer/analyze-html.mjs
 *
 * Pure, read-only static analyzer core for CLEAN-108 Slice 1 (#611).
 *
 * - No filesystem writes. No network. No browser. No eval.
 * - Input: an authoritative single-HTML string + descriptor.
 * - Output: a deterministic analysis object (candidates only, never mandates).
 *
 * The analyzer NEVER selects a canonical authority, NEVER approves states,
 * and NEVER falls back to `window.__lt` (or any hook) for unknown sources.
 * Unknown shapes are reported via `disposition.holds` (fail-closed).
 *
 * Runtime-hook DISCOVERY is informational (`scripts.windowHooks`); runtime-hook
 * TRUST is source-bound only: SOURCE IDENTITY + EXPECTED HOOK + EXPLICIT
 * REGISTRY (see SOURCE_HOOK_REGISTRY). A familiar global name never implies
 * that an arbitrary Source is understood.
 *
 * Runtime: Node built-ins only.
 */

import crypto from 'node:crypto';

export const ANALYZER_VERSION = '1.0.0';
export const ANALYSIS_SCHEMA_VERSION = 'clean108-analysis-v1';

const MAX_UNIQUE_IDS = 10000;
const MAX_UNIQUE_CLASSES = 5000;
const MAX_UNIQUE_ATTRS = 1000;
const MAX_URLS = 200;
const MAX_HOOKS = 100;
const MAX_IMAGE_REFS = 200;

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, pos);
    if (idx < 0) return count;
    count += 1;
    pos = idx + needle.length;
  }
}

function countRegex(html, pattern, flags = 'g') {
  const re = new RegExp(pattern, flags);
  let count = 0;
  let match;
  re.lastIndex = 0;
  while ((match = re.exec(html)) !== null) {
    count += 1;
    if (match[0].length === 0) re.lastIndex += 1;
    if (count > 1000000) break;
  }
  return count;
}

function collectUnique(html, pattern, flags, transform, cap) {
  const re = new RegExp(pattern, flags);
  const seen = new Set();
  const out = [];
  let match;
  re.lastIndex = 0;
  while ((match = re.exec(html)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const value = transform(match);
    if (value === null || value === undefined || value === '') continue;
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
      if (out.length >= cap) break;
    }
  }
  out.sort();
  return { values: out, truncated: seen.size >= cap || out.length >= cap };
}

function signalPresent(html, patterns) {
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    if (re.test(html)) return { present: true, evidence: name };
  }
  return { present: false, evidence: null };
}

/**
 * Explicit v1 Source -> expected runtime-hook registry, built ONLY from
 * already-verified authorities. Trust is granted only when the discovered
 * hook set includes the registered expectation for that exact Source ID.
 * A familiar name (e.g. `window.__lt`) NEVER implies a Source is understood.
 *
 * SRC068 is DUAL_VARIANT: no single runtime driver is registered, so no hook
 * match can remove its AUTO_SPLIT_REQUIRES_PLUGIN / HOLD semantics.
 */
export const SOURCE_HOOK_REGISTRY = Object.freeze({
  SRC056: Object.freeze({ expectedHooks: Object.freeze(['__lt']), notes: 'verified SIMPLE single-executable authority' }),
  SRC060: Object.freeze({ expectedHooks: Object.freeze(['__LT60__', '__LT60_V12__']), notes: 'verified COMPLEX runtime authority' }),
  SRC062: Object.freeze({ expectedHooks: Object.freeze(['__track62']), notes: 'accepted CLEAN_COMPLETE authority (read-only reference)' }),
  SRC064: Object.freeze({ expectedHooks: Object.freeze(['__TRACK64__']), notes: 'verified portal runtime authority' }),
  SRC068: Object.freeze({ variant: 'DUAL_VARIANT', expectedHooks: Object.freeze([]), notes: 'no generic hook trust; mechanical split requires plugin' }),
});

/**
 * Compute the source-bound runtime hook binding.
 *
 * Status vocabulary:
 *   BOUND                 - registered source, expected hook discovered
 *   NO_EXPECTED_HOOK      - registered source with no single runtime-driver
 *                           expectation (e.g. DUAL_VARIANT); nothing to bind
 *   EXPECTED_HOOK_MISSING - registered source, expected hook NOT discovered
 *   UNREGISTERED_SOURCE   - sourceId valid but absent from the registry
 *   AMBIGUOUS             - document exposes hooks registered to other
 *                           sources alongside its own; binding not trusted
 *
 * @param {string|null} sourceId normalized SRCxxx id (or null when unknown)
 * @param {string[]} customHooks discovered `__`-style runtime hook names
 * @returns {{sourceId: string|null, discovered: string[], expected: string[], matched: boolean, status: string}}
 */
function computeRuntimeHookBinding(sourceId, customHooks) {
  const discovered = [...customHooks];
  const entry = sourceId ? SOURCE_HOOK_REGISTRY[sourceId] : undefined;
  if (!entry) {
    return { sourceId, discovered, expected: [], matched: false, status: 'UNREGISTERED_SOURCE' };
  }
  const expected = [...entry.expectedHooks];
  if (entry.variant === 'DUAL_VARIANT' || expected.length === 0) {
    return { sourceId, discovered, expected, matched: false, status: 'NO_EXPECTED_HOOK' };
  }
  const matchedHooks = discovered.filter((h) => expected.includes(h));
  const foreignHooks = discovered.filter(
    (h) => !expected.includes(h) && Object.values(SOURCE_HOOK_REGISTRY).some((e) => e.expectedHooks.includes(h)),
  );
  if (matchedHooks.length > 0 && foreignHooks.length > 0) {
    return { sourceId, discovered, expected, matched: false, status: 'AMBIGUOUS' };
  }
  if (matchedHooks.length > 0) {
    return { sourceId, discovered, expected, matched: true, status: 'BOUND' };
  }
  return { sourceId, discovered, expected, matched: false, status: 'EXPECTED_HOOK_MISSING' };
}

/**
 * Analyze one authoritative HTML document.
 *
 * @param {object} args
 * @param {string} args.html - full UTF-8 HTML text (read-only input)
 * @param {Buffer|Uint8Array} [args.bytes] - raw bytes (for byte/sha pinning)
 * @param {string} [args.sourceId] - e.g. 'SRC056' (optional; unknown when absent)
 * @param {string} [args.authorityPath] - display path of the frozen authority
 * @param {object|null} [args.manifest] - parsed manifest.json when available (dual detection)
 * @returns {object} deterministic analysis object
 */
export function analyzeAuthorityHtml({ html, bytes = null, sourceId = null, authorityPath = null, manifest = null }) {
  if (typeof html !== 'string') throw new Error('analyzeAuthorityHtml: html must be a string');
  const text = html;
  const rawBytes = bytes ?? Buffer.from(text, 'utf8');

  const normalizedSourceId = typeof sourceId === 'string' && /^SRC\d{3}$/.test(sourceId) ? sourceId : null;

  const holds = [];
  const warnings = [];

  const looksLikeHtml = /<html[\s>]/i.test(text) || /<!doctype html/i.test(text);
  if (!looksLikeHtml) {
    holds.push('UNSUPPORTED_SHAPE_HOLD');
    warnings.push('input does not look like an HTML document (<html>/doctype missing)');
  }
  if (!normalizedSourceId) {
    holds.push('UNKNOWN_SOURCE_HOLD');
    warnings.push('sourceId missing or not SRCxxx; no generic runtime assumption applied');
  }

  // ---- document inventory ----
  const titleMatch = /<title[^>]*>([\s\S]{0,500})<\/title>/i.exec(text);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 300) : '';
  const elementCount = countRegex(text, '<[a-zA-Z][a-zA-Z0-9-]*(?=[\\s/>])');
  const ids = collectUnique(text, '\\bid\\s*=\\s*"([^"]{1,128})"', 'g', (m) => m[1], MAX_UNIQUE_IDS);
  const idsSingle = collectUnique(text, "\\bid\\s*=\\s*'([^']{1,128})'", 'g', (m) => m[1], MAX_UNIQUE_IDS);
  const idSet = new Set([...ids.values, ...idsSingle.values]);
  const idValues = [...idSet].sort().slice(0, MAX_UNIQUE_IDS);
  const classes = collectUnique(text, '\\bclass\\s*=\\s*"([^"]{1,512})"', 'g', (m) => m[1], MAX_UNIQUE_CLASSES);
  const classTokens = new Set();
  for (const chunk of classes.values) {
    for (const token of chunk.split(/\s+/)) {
      if (token) classTokens.add(token);
      if (classTokens.size >= MAX_UNIQUE_CLASSES) break;
    }
    if (classTokens.size >= MAX_UNIQUE_CLASSES) break;
  }
  const dataAttributes = collectUnique(text, '\\b(data-[a-zA-Z0-9_-]+)\\s*=', 'g', (m) => m[1].toLowerCase(), MAX_UNIQUE_ATTRS);
  const buttons = countRegex(text, '<button[\\s>]', 'gi');
  const links = countRegex(text, '<a[\\s>]', 'gi');
  const forms = countRegex(text, '<form[\\s>]', 'gi');
  const landmarks = {
    header: countRegex(text, '<header[\\s>]', 'gi'),
    nav: countRegex(text, '<nav[\\s>]', 'gi'),
    main: countRegex(text, '<main[\\s>]', 'gi'),
    aside: countRegex(text, '<aside[\\s>]', 'gi'),
    footer: countRegex(text, '<footer[\\s>]', 'gi'),
    dialog: countRegex(text, '<dialog[\\s>]', 'gi'),
    roleAttributes: countRegex(text, '\\brole\\s*=\\s*["\'][^"\']{1,64}["\']', 'gi'),
  };

  // ---- styles ----
  const styleOpens = [...text.matchAll(/<style(\s[^>]*)?>/gi)];
  const inlineBlockCount = styleOpens.length;
  const styleCloses = countOccurrences(text.toLowerCase(), '</style>');
  const externalLinks = countRegex(text, '<link\\b[^>]*rel\\s*=\\s*["\']stylesheet["\'][^>]*>', 'gi');
  const mediaQueries = countRegex(text, '@media\\b');
  const keyframes = countRegex(text, '@keyframes\\b');
  const animations = countRegex(text, '(?<![a-zA-Z0-9_-])animation\\s*:', 'g');
  const customProps = collectUnique(text, '(--[a-zA-Z0-9_-]{1,80})\\s*:', 'g', (m) => m[1], MAX_UNIQUE_ATTRS);

  // ---- scripts ----
  const scriptTags = [...text.matchAll(/<script\b([^>]*)>/gi)];
  let inlineBare = 0;
  let attributedInline = 0;
  let externalScriptCount = 0;
  let moduleScriptCount = 0;
  for (const tag of scriptTags) {
    const attrs = tag[1] ?? '';
    const hasSrc = /\bsrc\s*=/i.test(attrs);
    const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
    if (isModule) moduleScriptCount += 1;
    if (hasSrc) {
      externalScriptCount += 1;
    } else if (attrs.trim() === '') {
      inlineBare += 1;
    } else {
      attributedInline += 1;
    }
  }
  const scriptCloses = countOccurrences(text.toLowerCase(), '</script>');
  const iifeCandidates =
    countRegex(text, '\\(function\\s*\\(') +
    countRegex(text, '!function\\s*\\(') +
    countRegex(text, '\\(\\(\\)\\s*=>') +
    countRegex(text, '\\(async\\s*\\(\\)\\s*=>');
  const windowHooks = collectUnique(text, 'window\\.([A-Za-z_$][\\w$]{0,63})', 'g', (m) => m[1], MAX_HOOKS);

  // ---- interaction candidates ----
  const has = (patterns) => signalPresent(text, patterns.map((p, i) => ({ name: p.name ?? `p${i}`, re: new RegExp(p.re, p.flags ?? 'i') })));
  const click = has([{ name: "addEventListener('click')", re: `addEventListener\\(\\s*['"]click['"]` }, { name: 'onclick=', re: `\\bonclick\\s*=` }]);
  const pointerDown = /pointerdown/i.test(text);
  const pointerMove = /pointermove/i.test(text);
  const pointerUp = /pointerup|pointercancel/i.test(text);
  const pointer = { present: pointerDown || pointerMove || pointerUp || /onpointer/i.test(text), evidence: pointerDown ? 'pointerdown' : pointerMove ? 'pointermove' : pointerUp ? 'pointerup' : null };
  const wheel = has([{ name: "addEventListener('wheel')", re: `addEventListener\\(\\s*['"]wheel['"]` }, { name: 'onwheel=', re: `\\bonwheel\\s*=` }, { name: 'deltaY', re: `deltaY` }]);
  const touch = has([{ name: 'touchstart', re: `touchstart` }, { name: 'touchmove', re: `touchmove` }, { name: 'touchend', re: `touchend` }, { name: 'ontouch', re: `ontouch` }]);
  const keyboard = has([{ name: 'keydown', re: `keydown` }, { name: 'keyup', re: `keyup` }, { name: 'keypress', re: `keypress` }, { name: 'onkey', re: `\\bonkey(down|up|press)\\s*=` }]);
  const dragSignals = {
    present: /dragstart|dragend/i.test(text) || (/mousedown/i.test(text) && /mousemove/i.test(text)) || (pointerDown && pointerMove),
    evidence: /dragstart/i.test(text) ? 'dragstart' : /mousedown/i.test(text) && /mousemove/i.test(text) ? 'mousedown+mousemove' : pointerDown && pointerMove ? 'pointerdown+pointermove' : null,
  };
  const hover = has([{ name: 'mouseover', re: `mouseover` }, { name: 'mouseenter', re: `mouseenter` }, { name: ':hover', re: `:hover` }]);
  const modal = has([{ name: 'modal class/id', re: `modal` }, { name: 'showModal', re: `showModal` }, { name: 'aria-modal', re: `aria-modal` }]);
  const dialog = has([{ name: '<dialog', re: `<dialog[\\s>]` }, { name: 'showModal', re: `showModal` }, { name: 'role=dialog', re: `role\\s*=\\s*["']dialog["']` }]);
  const panel = has([{ name: 'panel', re: `panel` }]);
  const menu = has([{ name: 'menu', re: `menu` }]);
  const viewer = has([{ name: 'viewer', re: `viewer` }]);

  // ---- runtime candidates ----
  const runtimeCandidates = {
    requestAnimationFrame: /requestAnimationFrame/i.test(text),
    setTimeout: /setTimeout\s*\(/i.test(text),
    setInterval: /setInterval\s*\(/i.test(text),
    localStorage: /localStorage/i.test(text),
    sessionStorage: /sessionStorage/i.test(text),
    fetch: /fetch\s*\(/i.test(text),
    xhr: /XMLHttpRequest/i.test(text),
    canvas: /<canvas[\s>]/i.test(text),
    iframe: /<iframe[\s>]/i.test(text),
    video: /<video[\s>]/i.test(text),
    audio: /<audio[\s>]/i.test(text),
  };

  // ---- media inventory ----
  const dataImages = [...text.matchAll(/data:image\/[a-zA-Z0-9.+-]+;base64,/gi)];
  let dataImageBytes = 0;
  const dataImageRe = /data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/gi;
  let dm;
  dataImageRe.lastIndex = 0;
  while ((dm = dataImageRe.exec(text)) !== null) {
    dataImageBytes += dm[1].length;
    if (dm[0].length === 0) dataImageRe.lastIndex += 1;
  }
  const dataVideoCount = countRegex(text, 'data:video\\/[a-zA-Z0-9.+-]+;base64,', 'gi');
  const dataAudioCount = countRegex(text, 'data:audio\\/[a-zA-Z0-9.+-]+;base64,', 'gi');
  const normalImageRefs = collectUnique(text, '<img\\b[^>]*\\bsrc\\s*=\\s*"([^"]{1,512})"', 'gi', (m) => m[1], MAX_IMAGE_REFS);
  const videoRefs = countRegex(text, '<video[\\s>]|<source[\\s>]', 'gi');
  const audioRefs = countRegex(text, '<audio[\\s>]', 'gi');
  const externalUrls = collectUnique(text, 'https?://[^"\'()\\s<>]{1,256}', 'g', (m) => m[0], MAX_URLS);
  const domains = [...new Set(externalUrls.values.map((u) => {
    try {
      return new URL(u).hostname;
    } catch {
      return null;
    }
  }).filter(Boolean))].sort();
  const assetPathCandidates = collectUnique(
    text,
    '["\']((?:\\.\\./|\\./)?(?:assets|images)/[^"\'()]{1,256})["\']',
    'g',
    (m) => m[1],
    MAX_URLS,
  );

  // ---- dual-variant indicators ----
  const hasMediaVariant = /mediaVariant/i.test(text);
  const hasVariantSentinel = /SRC068_VARIANT_TITLE|variant-(A|B)\.json|__SRC068_COMMON_JS_FOLLOWS__/.test(text);
  const manifestSaysDual = manifest?.authority_mode === 'DUAL_VARIANT';
  const dualIndicators = manifestSaysDual || (hasMediaVariant && (hasVariantSentinel || manifestSaysDual));

  // ---- S3 classification (fail-closed) ----
  let s3Classification;
  const s3Reasons = [];
  if (manifestSaysDual || (hasMediaVariant && hasVariantSentinel)) {
    s3Classification = 'AUTO_SPLIT_REQUIRES_PLUGIN';
    s3Reasons.push('dual-variant mechanical contract detected (mediaVariant + variant boundary); generic single-executable split must not run');
  } else if (moduleScriptCount > 0) {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push(`module scripts detected (${moduleScriptCount}); outside mechanical extraction scope`);
    holds.push('UNSUPPORTED_SHAPE_HOLD');
  } else if (externalScriptCount > 0) {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push(`external src scripts detected (${externalScriptCount}); extraction would rewrite execution sourcing`);
    holds.push('UNSUPPORTED_SHAPE_HOLD');
  } else if (attributedInline > 0) {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push(`attributed inline scripts detected (${attributedInline}); outside bare-extraction scope, no silent rewrite`);
    holds.push('UNSUPPORTED_SHAPE_HOLD');
  } else if (externalLinks > 0) {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push(`external stylesheet links detected (${externalLinks}); byte-safe contract does not cover link upgrades`);
    holds.push('UNSUPPORTED_SHAPE_HOLD');
  } else if (inlineBlockCount > 1) {
    s3Classification = 'AUTO_SPLIT_REQUIRES_PLUGIN';
    s3Reasons.push(`multiple inline style blocks (${inlineBlockCount}); interleaved style/script order needs dedicated sorted-block mechanics`);
  } else if (inlineBlockCount === 1 && inlineBare >= 1 && scriptCloses >= inlineBare) {
    s3Classification = 'AUTO_SPLIT_SUPPORTED';
    s3Reasons.push(
      inlineBare === 1
        ? 'single style + single bare inline script: exact extraction with round-trip proof'
        : `single style + ${inlineBare} bare inline scripts: exact multi-block extraction with preserved gaps`,
    );
  } else if (!looksLikeHtml) {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push('not a recognizable HTML document');
  } else {
    s3Classification = 'AUTO_SPLIT_HOLD';
    s3Reasons.push(`unrecognized style/script shape (styles=${inlineBlockCount}, bareScripts=${inlineBare}, closes=${scriptCloses}); fail closed`);
    if (!holds.includes('UNSUPPORTED_SHAPE_HOLD')) holds.push('UNSUPPORTED_SHAPE_HOLD');
  }

  if (dataImageBytes > 1024 * 1024) {
    warnings.push(`large inline data-URI image payload (~${Math.round(dataImageBytes / 1024 / 1024)} MB); keep inline per contract, never externalize for size`);
  }

  // ---- candidate state families (proposals only) ----
  const families = [];
  const propose = (family, triggers) => {
    if (triggers.length) families.push({ family, triggers });
  };
  propose('INITIAL', ['authority baseline entry state (always captured)']);
  if (click.present || pointer.present || /data-id=|card-wrap|#cardLayer/i.test(text)) {
    propose('SELECTED', [...(click.present ? [`click signal (${click.evidence})`] : []), ...(/card/i.test(text) ? ['card/select surface'] : [])].slice(0, 4));
  }
  if (modal.present) propose('MODAL', [`modal signal (${modal.evidence})`]);
  if (viewer.present) propose('VIEWER', [`viewer signal (${viewer.evidence})`]);
  if (panel.present) propose('PANEL', [`panel signal (${panel.evidence})`]);
  if (menu.present) propose('MENU', [`menu signal (${menu.evidence})`]);
  if (/aria-expanded|is-open|\bopen\b.{0,40}class|classList.(add|toggle)/i.test(text) && (panel.present || menu.present || modal.present)) {
    propose('EXPANDED', ['open/expanded class toggle with overlay surface']);
  }
  if (hover.present) propose('HOVER', [`hover signal (${hover.evidence})`]);
  if (wheel.present) propose('WHEEL_TRAVEL', [`wheel signal (${wheel.evidence})`]);
  if (dragSignals.present) propose('DRAG_TRAVEL', [`drag signal (${dragSignals.evidence})`]);
  if (touch.present) propose('SWIPE_TRAVEL', [`touch signal (${touch.evidence ?? 'touch'})`]);
  if (runtimeCandidates.video || runtimeCandidates.audio || /seek\(|currentTime|play\(\)|pause\(\)/i.test(text)) {
    propose('PLAYBACK', ['media/playback surface']);
  }
  if (runtimeCandidates.video || /poster=|<video/i.test(text)) propose('MEDIA_STATE', ['video/poster surface']);
  // Discovery stays informational: list every exposed window global-looking
  // hook (`__`-prefixed or historically known names). Familiarity NEVER
  // grants trust — binding below is source-bound.
  const KNOWN_HOOKS = new Set(['__lt', '__LT57__', '__LT58__', '__LT60__', '__LT60_V12__', '__track62', '__TRACK64__', '__TRACK68__', '__lovetreeQA', '__lovetreeStats', '__LT60_V12__']);
  const customHooks = windowHooks.values.filter((h) => h.startsWith('__') || KNOWN_HOOKS.has(h));
  if (customHooks.length) {
    propose('CUSTOM_RUNTIME_HOOK', customHooks.slice(0, 8).map((h) => `window.${h}`));
  }

  // Source-bound runtime hook binding: trust requires SOURCE IDENTITY +
  // EXPECTED HOOK + EXPLICIT REGISTRY, never "the global name looks familiar".
  const runtimeHookBinding = computeRuntimeHookBinding(normalizedSourceId, customHooks);
  const richInteraction = click.present || wheel.present || dragSignals.present || touch.present;
  if (runtimeHookBinding.status === 'BOUND') {
    // Registered source with its expected hook present => binding trusted.
    // Other HOLD conditions (unknown source, unsupported shape) still apply.
  } else if (runtimeHookBinding.status === 'NO_EXPECTED_HOOK') {
    // Registered source with no single runtime-driver expectation (e.g.
    // DUAL_VARIANT): plugin/dual semantics govern; a hook match can never
    // override that. Rich interaction with no driver still holds.
    if (richInteraction) {
      holds.push('UNKNOWN_RUNTIME_HOOK_HOLD');
      warnings.push('rich interaction surface with no source-bound runtime hook driver; journey needs a source-specific driver');
    }
  } else {
    // UNREGISTERED_SOURCE | EXPECTED_HOOK_MISSING | AMBIGUOUS => fail closed.
    holds.push('UNBOUND_RUNTIME_HOOK_HOLD');
    warnings.push(`no source-bound runtime hook binding (${runtimeHookBinding.status}); no generic fallback applied for ${normalizedSourceId ?? 'unknown source'}`);
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: ANALYZER_VERSION,
    sourceId: normalizedSourceId,
    authority: {
      path: authorityPath,
      bytes: rawBytes.length,
      sha256: crypto.createHash('sha256').update(rawBytes).digest('hex'),
    },
    document: {
      title,
      elementCount,
      idCount: idValues.length,
      ids: idValues.slice(0, 2000),
      idsTruncated: idValues.length > 2000,
      classCount: classTokens.size,
      classes: [...classTokens].sort().slice(0, 2000),
      dataAttributes: dataAttributes.values,
      buttons,
      links,
      forms,
      landmarks,
    },
    styles: {
      inlineBlockCount,
      inlineCloseCount: styleCloses,
      externalLinks,
      mediaQueries,
      keyframes,
      animations,
      customPropertyCount: customProps.values.length,
      customProperties: customProps.values.slice(0, 200),
    },
    scripts: {
      openTagCount: scriptTags.length,
      inlineBlockCount: inlineBare,
      attributedScriptCount: attributedInline,
      externalScriptCount,
      moduleScriptCount,
      closeTagCount: scriptCloses,
      iifeCandidates,
      windowHooks: windowHooks.values,
    },
    interactionCandidates: {
      click: { present: click.present, evidence: click.evidence },
      pointer: { present: pointer.present, evidence: pointer.evidence },
      wheel: { present: wheel.present, evidence: wheel.evidence },
      touch: { present: touch.present, evidence: touch.evidence },
      keyboard: { present: keyboard.present, evidence: keyboard.evidence },
      dragSignals: { present: dragSignals.present, evidence: dragSignals.evidence },
      hover: { present: hover.present, evidence: hover.evidence },
      modal: { present: modal.present, evidence: modal.evidence },
      dialog: { present: dialog.present, evidence: dialog.evidence },
      panel: { present: panel.present, evidence: panel.evidence },
      menu: { present: menu.present, evidence: menu.evidence },
      viewer: { present: viewer.present, evidence: viewer.evidence },
    },
    runtimeCandidates,
    media: {
      dataImageCount: dataImages.length,
      dataImageBytes,
      dataVideoCount,
      dataAudioCount,
      normalImageRefCount: normalImageRefs.values.length,
      normalImageRefs: normalImageRefs.values.slice(0, 100),
      videoRefs,
      audioRefs,
      externalUrlCount: externalUrls.values.length,
      externalUrls: externalUrls.values.slice(0, 100),
      externalDomains: domains.slice(0, 100),
      assetPathCandidates: assetPathCandidates.values,
    },
    dualVariant: {
      manifestSaysDual,
      mediaVariantSignal: hasMediaVariant,
      variantSentinel: hasVariantSentinel,
      dualIndicators,
    },
    runtimeHookBinding,
    s3Classification,
    s3Reasons,
    candidateStateFamilies: families,
    warnings,
    disposition: {
      status: holds.length ? 'HOLD' : 'OK',
      holds: [...new Set(holds)],
    },
  };
}
