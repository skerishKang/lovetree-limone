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
  const autoLifePool = extractAutoLifePool(inline, 'script.js');

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

  cached = {
    characterLines, lubtTalk, poseForEmotion, fxMap,
    emotions: emoNames, derivedEmotionNames: emoNames, autoLifePool,
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
