/**
 * MST106 / CDX007 - S4 SOURCE CONTRACT.
 *
 * The authored pools (characterLines, lubtTalk, poseForEmotion, fxMap, allEmotionNames) are
 * `const` bindings INSIDE the frozen external `living-world-v2.js` IIFE. A separate
 * page.evaluate() cannot reach them, and exposing them through a window global would be source
 * mutation. So the contract is read from the frozen BYTES with the TypeScript compiler API that
 * this repository already depends on - no new dependency, no source change.
 *
 * The literal evaluator is fail-closed: only the node shapes a frozen literal needs are
 * accepted. A spread, computed key, call, duplicate key, missing declaration or unknown shape
 * raises, so an unresolvable contract can never be silently treated as satisfied.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { authoredParticleRanges } from './particle-range.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPSULE = path.resolve(HERE, '..');

/** Raised when the frozen source does not have the exact literal shape the contract expects. */
export class SourceContractError extends Error {}

/* ------------------------------- literal evaluator ------------------------------- */

function evaluateLiteral(node, where) {
  const fail = (msg) => { throw new SourceContractError(`${where}: ${msg}`); };
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return node.text;
    case ts.SyntaxKind.NumericLiteral:
      return Number(node.text);
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.PrefixUnaryExpression: {
      // Only a unary minus over a numeric literal is ever needed by these frozen objects.
      if (node.operator !== ts.SyntaxKind.MinusToken) fail(`unsupported operator ${node.operator}`);
      return -evaluateLiteral(node.operand, where);
    }
    case ts.SyntaxKind.ArrayLiteralExpression: {
      const out = [];
      for (const el of node.elements) {
        if (el.kind === ts.SyntaxKind.SpreadElement) fail('array spread is not a literal');
        out.push(evaluateLiteral(el, where));
      }
      return out;
    }
    case ts.SyntaxKind.ObjectLiteralExpression: {
      const out = {};
      for (const prop of node.properties) {
        if (prop.kind !== ts.SyntaxKind.PropertyAssignment) {
          fail(`unsupported object member kind ${ts.SyntaxKind[prop.kind]}`);
        }
        const key = prop.name;
        if (!key || (key.kind !== ts.SyntaxKind.Identifier && key.kind !== ts.SyntaxKind.StringLiteral)) {
          fail('computed or non-literal property key');
        }
        const k = key.text ?? key.escapedText;
        if (Object.prototype.hasOwnProperty.call(out, k)) fail(`duplicate key ${k}`);
        out[k] = evaluateLiteral(prop.initializer, where);
      }
      return out;
    }
    default:
      return fail(`unsupported node kind ${ts.SyntaxKind[node.kind]}`);
  }
}

/* ------------------------------- declaration finder ------------------------------- */

/**
 * Find `const <name> = <literal>` at the top level of the file OR inside any IIFE, and return the
 * evaluated literal. The frozen V2 script wraps its whole body in an IIFE, so a top-level-only
 * walk would find nothing; this walks every variable statement in the tree.
 */
function extractLiteral(sourceText, fileName, name) {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let result = null;
  let found = 0;
  const visit = (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name && decl.initializer) {
          found += 1;
          result = evaluateLiteral(decl.initializer, `${fileName}:${name}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (found === 0) throw new SourceContractError(`${fileName}: declaration ${name} not found`);
  if (found > 1) throw new SourceContractError(`${fileName}: declaration ${name} is ambiguous`);
  return result;
}

/**
 * ROUND6C (FIX C) The authored `lubtPoses` pose-asset mapping.
 *
 * `poseForEmotion` names a POSE ('bloom','heart',...), but the parity contract compares the
 * concrete #lubtImg asset. The pose->asset mapping lives in the frozen inline layer as a
 * top-level `const lubtPoses` object literal, so it is extracted from those frozen bytes with
 * the same fail-closed literal evaluator - never a hard-coded duplicate truth table.
 */
function extractLubtPoses(sourceText, fileName) {
  const poses = extractLiteral(sourceText, fileName, 'lubtPoses');
  if (!poses || typeof poses !== 'object' || Array.isArray(poses)) {
    throw new SourceContractError(`${fileName}: lubtPoses is not an authored pose mapping`);
  }
  for (const [pose, asset] of Object.entries(poses)) {
    if (typeof asset !== 'string' || asset === '') {
      throw new SourceContractError(`${fileName}: lubtPoses.${pose} is not an authored asset name`);
    }
  }
  return poses;
}

/**
 * ROUND6D (FIX 2) The authored CHARACTER GUIDE lines.
 *
 * `selectChar(i)` owns a real Lubt write:
 *
 *     callLubt('guide', `${c.name}의 표정을 만나볼까?`)
 *
 * The text is authored but DYNAMIC - it is rendered from the selected character's name - so it is
 * in no static `lubtTalk` pool. Without this the classifier correctly reported it as an
 * unclassified write, and the whole character-switch family could never be evaluated.
 *
 * Both halves are taken from the frozen bytes with the fail-closed literal evaluator:
 *   - `chars` gives the source-derived {id, name} authority,
 *   - the `selectChar()` template gives the exact rendered suffix.
 * The rendered line is then DERIVED per character by substituting that name into that template.
 * There is no second hard-coded guide table anywhere.
 */
function extractChars(sourceText, fileName) {
  const chars = extractLiteral(sourceText, fileName, 'chars');
  if (!Array.isArray(chars) || chars.length === 0) {
    throw new SourceContractError(`${fileName}: chars is not an authored character list`);
  }
  const out = {};
  for (const c of chars) {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || typeof c.name !== 'string') {
      throw new SourceContractError(`${fileName}: a chars row is not the authored {id,name} shape`);
    }
    if (Object.prototype.hasOwnProperty.call(out, c.name)) {
      throw new SourceContractError(`${fileName}: duplicate character name ${c.name}`);
    }
    out[c.name] = { id: c.id, name: c.name };
  }
  return out;
}

/** Find the authored `${c.name}...` template inside selectChar's callLubt call. Fail-closed. */
function extractCharacterGuideTemplate(sourceText, fileName) {
  const bodyMatch = /function\s+selectChar\s*\([^)]*\)\s*\{([\s\S]*?)\n/.exec(sourceText);
  if (!bodyMatch) throw new SourceContractError(`${fileName}: selectChar() not found`);
  const callMatch = /callLubt\(\s*'guide'\s*,\s*`([^`]*)`\s*\)/.exec(bodyMatch[1]);
  if (!callMatch) {
    throw new SourceContractError(`${fileName}: selectChar() has no authored guide callLubt template`);
  }
  const tpl = callMatch[1];
  /* The template MUST interpolate the character name, otherwise it is not the dynamic guide. */
  if (!/\$\{c\.name\}/.test(tpl)) {
    throw new SourceContractError(`${fileName}: the guide template does not interpolate c.name`);
  }
  return tpl;
}

/**
 * ROUND6D (FIX 3/FIX 4) The base particle triggers authored inside `setEmotion()`:
 *
 *     if(name==='sing')notes();
 *     if(name==='touched'||name==='laugh')petals();
 *
 * Read from the frozen bytes so the per-surface expected particle lifecycle is DERIVED, not
 * restated. Fail-closed on any other shape.
 */
function extractBaseParticleTriggers(sourceText, fileName) {
  const fn = /function\s+setEmotion\s*\([^)]*\)\s*\{([\s\S]*?)\n[a-z]/i.exec(sourceText);
  if (!fn) throw new SourceContractError(`${fileName}: setEmotion() body not found`);
  const body = fn[1];
  const out = {};
  const re = /if\s*\(\s*name\s*===\s*'([a-z]+)'\s*(?:\|\|\s*name\s*===\s*'([a-z]+)'\s*)?\)\s*(\w+)\s*\(\s*\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const emotions = [m[1], m[2]].filter(Boolean);
    for (const e of emotions) {
      if (out[e] && out[e] !== m[3]) {
        throw new SourceContractError(`${fileName}: emotion ${e} triggers two different families`);
      }
      out[e] = m[3];
    }
  }
  if (!Object.values(out).includes('notes') || !Object.values(out).includes('petals')) {
    throw new SourceContractError(`${fileFileGuard(fileName)}: base particle triggers not fully authored`);
  }
  return out;
}

function fileFileGuard(name) { return name; }

/** The authored particle COUNTS, derived from the frozen loop bounds in notes()/petals(). */
function extractParticleCounts(counts, fileName) {
  if (!counts || !counts.notes || !counts.petals) {
    throw new SourceContractError(`${fileName}: authored particle counts were not derived`);
  }
  const notes = counts.notes.count;
  const petals = counts.petals.count;
  if (!Number.isFinite(notes) || !Number.isFinite(petals)
    || notes <= 0 || petals <= 0) {
    throw new SourceContractError(`${fileName}: an authored particle count is not positive`);
  }
  return {
    notes, petals,
    noteDxRange: { min: counts.notes.min, max: counts.notes.max },
    petalDxRange: { min: counts.petals.min, max: counts.petals.max },
  };
}

/**
 * ROUND6D (FIX 3/FIX 4) Whether the V2 `setEmotion` wrapper bursts on a user-triggered call:
 *
 *     setEmotion = function livingSetEmotion(name, user) { ...; if (user) burstEmotion(name); }
 *
 * An Auto Life tick calls setEmotion(selected) with NO user flag, so no V2 FX is expected there.
 * Read from the frozen bytes, fail-closed.
 */
function extractBurstOnUser(v2Text, fileName) {
  const re = /setEmotion\s*=\s*function[\s\S]{0,400}?if\s*\(\s*user\s*\)\s*(\w+)\s*\(/;
  const m = re.exec(v2Text);
  if (!m) {
    throw new SourceContractError(`${fileName}: the V2 setEmotion wrapper has no authored user burst`);
  }
  return m[1];
}

/** The authored Auto Life pool lives inside resetAuto(); read it from that function body. */
function extractAutoLifePool(sourceText, fileName) {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let pool = null;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'resetAuto') {
      const walk = (n) => {
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'pool'
          && n.initializer) {
          pool = evaluateLiteral(n.initializer, `${fileName}:resetAuto.pool`);
        }
        ts.forEachChild(n, walk);
      };
      walk(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!pool) throw new SourceContractError(`${fileName}: resetAuto() auto Life pool not found`);
  return pool;
}

/* --------------------------------- single truth --------------------------------- */

let cached = null;

/**
 * Build the one source contract every random-state check reads. Derived from the frozen bytes
 * only; there is no second hard-coded pool truth anywhere in the harness.
 */
export function sourceContract() {
  if (cached) return cached;
  const v2Path = path.join(CAPSULE, 'original', 'living-world-v2.js');
  const inlinePath = path.join(CAPSULE, 'split', 'script.js');
  const v2 = fs.readFileSync(v2Path, 'utf8');
  const inline = fs.readFileSync(inlinePath, 'utf8');

  const characterLines = extractLiteral(v2, 'living-world-v2.js', 'characterLines');
  const lubtTalk = extractLiteral(v2, 'living-world-v2.js', 'lubtTalk');
  const poseForEmotion = extractLiteral(v2, 'living-world-v2.js', 'poseForEmotion');
  const fxMap = extractLiteral(v2, 'living-world-v2.js', 'fxMap');
  const emos = extractLiteral(inline, 'script.js', 'emos');
  const lubtPoses = extractLubtPoses(inline, 'script.js');
  const autoLifePool = extractAutoLifePool(inline, 'script.js');
  const chars = extractChars(inline, 'script.js');
  const characterGuideTemplate = extractCharacterGuideTemplate(inline, 'script.js');

  /* ROUND6D (FIX 2) The rendered guide line per authored character, DERIVED from the template. */
  const characterGuideByName = {};
  for (const [name, ch] of Object.entries(chars)) {
    characterGuideByName[name] = characterGuideTemplate.replace('${c.name}', name);
  }

  /* ROUND6D (FIX 3/FIX 4) The authored particle counts and --dx ranges, derived from the frozen
   * loop bounds in notes()/petals() by the shared fail-closed parser. */
  const authoredParticleCounts = authoredParticleRanges(inline);

  /* ROUND6C (FIX C) The per-emotion metadata the relational contract compares against. `emos` is
   * the authored row shape [name, glyph, title, line]; deriving the per-emotion view HERE keeps a
   * single extracted truth instead of a second copy in the harness. */
  const emoMeta = {};
  for (const row of emos) {
    if (!Array.isArray(row) || row.length < 4) {
      throw new SourceContractError('script.js: an emos row is not the authored [name,glyph,title,line]');
    }
    emoMeta[row[0]] = { name: row[0], glyph: row[1], title: row[2], line: row[3] };
  }

  // The emotion vocabulary the harness exercises is the authored `emos` array, read from the
  // frozen inline layer, and must agree with the external layer's allEmotionNames.
  /* The frozen source derives allEmotionNames as emos.map(item => item[0]). A call expression is
   * deliberately NOT evaluated - the literal evaluator rejects it - so the same derivation is
   * applied here from the frozen `emos` literal. */
  const emoNames = emos.map((e) => (Array.isArray(e) ? e[0] : null)).filter(Boolean);
  if (!emoNames.length) throw new SourceContractError('emos produced no authored emotion names');
  for (const key of ['greeting', 'idle', 'drag', 'save', 'scan', 'special', 'reply', 'emotion']) {
    if (!Object.prototype.hasOwnProperty.call(lubtTalk, key)) {
      throw new SourceContractError(`lubtTalk.${key} is missing from the frozen source`);
    }
  }

  /* ROUND6C (FIX C) Every emotion the relational contracts name must resolve through ALL the
   * authored maps it is compared against. An emotion missing from poseForEmotion / fxMap /
   * characterLines would make a relation silently unprovable, so it fails closed here instead. */
  for (const name of emoNames) {
    for (const [label, map] of [['poseForEmotion', poseForEmotion], ['fxMap', fxMap],
      ['characterLines', characterLines]]) {
      if (!Object.prototype.hasOwnProperty.call(map, name)) {
        throw new SourceContractError(`${label}.${name} is missing from the frozen source`);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(lubtTalk.emotion, name)) {
      throw new SourceContractError(`lubtTalk.emotion.${name} is missing from the frozen source`);
    }
  }

  cached = {
    characterLines, lubtTalk, poseForEmotion, fxMap, lubtPoses, emoMeta,
    emotions: emoNames, derivedEmotionNames: emoNames, autoLifePool,
    chars, characterGuideTemplate, characterGuideByName,
    baseParticleTriggers: extractBaseParticleTriggers(inline, 'script.js'),
    burstOnUser: extractBurstOnUser(v2, 'living-world-v2.js'),
    particleCounts: extractParticleCounts(authoredParticleCounts, 'script.js'),
  };
  return cached;
}

/** Resolve a dotted authored path. Returns null ONLY when the path is not in the contract. */
export function poolFor(contract, path) {
  let cur = contract;
  for (const part of String(path).split('.')) {
    if (cur === null || cur === undefined) return null;
    if (!Object.prototype.hasOwnProperty.call(cur, part)) return null;
    cur = cur[part];
  }
  return cur;
}
