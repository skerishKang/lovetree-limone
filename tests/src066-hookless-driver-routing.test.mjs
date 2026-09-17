/**
 * SRC066 hook-less driver — harness routing contract (local only, no browser).
 *
 * Proves, without executing a browser:
 *  - T1/T2  the bounded driver exists, exports captureSRC66Baseline, reads zero
 *            window.__* hooks (observer-only), and is imported exactly once by
 *            EACH harness: the baseline harness for S2 capture, the parity
 *            harness for the S4 original/split replay.
 *  - T3      routing sets: the baseline harness routes the legacy per-source
 *            set {047,057,058,060,062,064,071} plus SRC066; the parity harness
 *            routes its driver six {047,057,058,060,062,064} plus SRC066 (parity
 *            never grew an SRC071 route) — nothing added, removed, or renamed
 *            for any other Source. Both sets equal origin/main.
 *  - T4      harness runtime scope is identical to origin/main for the surfaces
 *            this S4 lane deliberately did not touch: the baseline harness and
 *            the driver. The parity harness is intentionally changed here (the
 *            S3 SRC066 not-claimed SKIP is replaced by a real SRC066 parity
 *            route), so asserting runtime identity there would be a PR-time
 *            property rather than a durable invariant.
 *  - T5      fail-closed preserved: both harnesses still gate the generic path
 *            on the legacy window.__lt contract, so a Source with NEITHER a
 *            hook NOR a driver still trips the unchanged generic expectation
 *            (fail-closed regression, static proof; the generic regions are
 *            covered by T4's unchanged proof for the baseline harness and by
 *            T7's scoped parity diff).
 *  - T6      both harnesses capture/replay SRC066 at the S2 viewports
 *            (1440x900, 430x932, 390x844) — parity reuses the S2 recipe, it
 *            does not invent its own.
 *  - T7      the S4 harness change is bounded: no other Source route, viewport,
 *            skip disposition, or generic comparison moved; the SRC066
 *            not-claimed SKIP is gone; the parity harness still runs the
 *            original-vs-split pair through the SRC066 driver and asserts
 *            state, interaction, and screenshot digests per state.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { captureSRC66Baseline } from '../src/08_harness/source066-driver.mjs';

const REPO_ROOT = path.join(import.meta.dirname, '..');
const BASELINE = 'src/08_harness/capture-source-baseline.mjs';
const PARITY = 'src/08_harness/capture-source-parity.mjs';
const LEGACY_ROUTED = ['SRC047', 'SRC057', 'SRC058', 'SRC060', 'SRC062', 'SRC064', 'SRC071'];
const EXPECTED_BASELINE_ROUTED = [...LEGACY_ROUTED, 'SRC066'].sort();
// The parity harness never grew an SRC071 route (SRC071 holds accepted parity,
// so line-276 skips it before dispatch); its legacy set is the driver six.
const EXPECTED_PARITY_ROUTED = ['SRC047', 'SRC057', 'SRC058', 'SRC060', 'SRC062', 'SRC064', 'SRC066'].sort();

const readWorktree = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const gitShowMain = (rel) => {
  try {
    return execFileSync('git', ['show', `origin/main:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(`routing proof requires git history (origin/main): ${error.message}`);
  }
};
const routingSet = (text) => [...new Set([...text.matchAll(/sourceId === '(SRC\d+)'/g)].map((m) => m[1]))].sort();

test('T1 driver exists, exports the baseline entry, reads zero hooks', () => {
  assert.equal(typeof captureSRC66Baseline, 'function', 'captureSRC66Baseline is exported');
  const src = readWorktree('src/08_harness/source066-driver.mjs');
  assert.ok(!/window\.__[A-Za-z0-9_]/.test(src), 'driver reads zero window.__* hooks (observer-only)');
  assert.ok(src.includes('sessionStorage'), 'driver observes sessionStorage out-of-band');
  assert.ok(src.includes('getBoundingClientRect'), 'driver observes geometry out-of-band');
});

test('T2 baseline and parity harness each import the driver exactly once', () => {
  for (const [rel, label] of [[BASELINE, 'baseline'], [PARITY, 'parity']]) {
    const text = readWorktree(rel);
    const imports = text.match(/from '\.\/source066-driver\.mjs'/g) || [];
    assert.equal(imports.length, 1, `exactly one source066-driver import in the ${label} harness`);
    assert.ok(text.includes('captureSRC66Baseline'), `${label} harness names the driver entry`);
  }
});

test('T3 routing sets are the legacy set plus SRC066 in both harnesses', () => {
  assert.deepEqual(routingSet(readWorktree(BASELINE)), EXPECTED_BASELINE_ROUTED, 'baseline routes legacy set + SRC066');
  assert.deepEqual(routingSet(readWorktree(PARITY)), EXPECTED_PARITY_ROUTED, 'parity routes driver six + SRC066');
  assert.deepEqual(routingSet(gitShowMain(BASELINE)), EXPECTED_BASELINE_ROUTED, 'origin/main baseline routing equals worktree');
  assert.deepEqual(routingSet(gitShowMain(PARITY)), EXPECTED_PARITY_ROUTED, 'origin/main parity routing set is unchanged by the S4 release');
});

test('T4 baseline harness and driver runtime are identical to origin/main', () => {
  let diff;
  try {
    diff = execFileSync(
      'git',
      ['diff', 'origin/main', '--', BASELINE, 'src/08_harness/source066-driver.mjs'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
  } catch (error) {
    throw new Error(`routing proof requires git history: ${error.message}`);
  }
  assert.equal(diff.trim(), '', `baseline harness and driver must not differ from origin/main (got: ${diff.slice(0, 300)})`);
});

test('T5 fail-closed generic hook gate is preserved in both harnesses', () => {
  for (const [rel, label] of [[BASELINE, 'baseline'], [PARITY, 'parity']]) {
    const text = readWorktree(rel);
    assert.ok(text.includes('window.__lt && window.__lovetreeStats'), `${label}: generic __lt gate still present`);
    assert.ok(text.includes('#focusFirst'), `${label}: generic #focusFirst expectation still present`);
    assert.ok(text.includes('ORIGIN_REVEAL'), `${label}: generic ORIGIN_REVEAL expectation still present`);
  }
  // T4 proves harness scope is identical to origin/main, so the generic
  // fallback a hookless, driver-less Source falls into is the reviewed shared
  // behavior: it still fails closed on the hook expectation instead of passing
  // vaguely.
});

test('T6 both harnesses capture SRC066 at the S2 viewports', () => {
  for (const [rel, label] of [[BASELINE, 'baseline'], [PARITY, 'parity']]) {
    const text = readWorktree(rel);
    const at = text.indexOf('SRC066: [');
    assert.ok(at >= 0, `${label}: SRC066 viewport entry exists in sourceViewports`);
    const window_ = text.slice(at, at + 300);
    for (const [w, h] of [[1440, 900], [430, 932], [390, 844]]) {
      assert.ok(window_.includes(`width: ${w},`) && window_.includes(`height: ${h}`), `${label}: SRC066 viewport ${w}x${h} listed`);
    }
  }
});

// Extract `if (sourceId === '<id>') { ... }` from a harness file (brace matched)
// so assertions target the SRC066 region and cannot be satisfied by another
// Source's block.
function sourceBlock(text, sourceId) {
  const open = text.indexOf(`if (sourceId === '${sourceId}') {`);
  assert.ok(open >= 0, `${sourceId} block not found`);
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  assert.ok(end > open, `${sourceId} block is not brace-closed`);
  return text.slice(open, end);
}

test('T7 the S4 release is bounded to the SRC066 route', () => {
  const parity = readWorktree(PARITY);
  const matches = [...parity.matchAll(/if \(sourceId === 'SRC066'\)/g)];
  assert.equal(matches.length, 1, 'exactly one SRC066 dispatch site in the parity harness');
  const block = sourceBlock(parity, 'SRC066');
  assert.ok(block.includes('${sourceId}/original.html'), 'SRC066 parity replays the original surface');
  assert.ok(block.includes('${sourceId}/split/index.html'), 'SRC066 parity replays the split surface');
  assert.ok(block.includes('captureSRC66Baseline'), 'SRC066 parity uses its bounded driver, not the generic hook path');
  assert.ok(block.includes('captured state set drift'), 'SRC066 parity asserts state-set equality');
  assert.ok(block.includes('state drift'), 'SRC066 parity asserts per-state equality');
  assert.ok(block.includes('interaction drift'), 'SRC066 parity asserts interaction equality');
  assert.ok(block.includes('_screenshot_sha_equal'), 'SRC066 parity records per-state screenshot digests');
  assert.ok(!/window\.__[A-Za-z0-9_]/.test(block), 'SRC066 parity route reads zero window.__* hooks');
  assert.ok(!/captureVariant\(/.test(block), 'SRC066 parity route does not fall through to the generic hook path');

  assert.equal(parity.match(/S4_PARITY_NOT_CLAIMED/g)?.length ?? 0, 0, 'the S3 SRC066 not-claimed SKIP reason is removed');
  assert.equal(parity.match(/s4_hold_respected/g)?.length ?? 0, 1, 'the only remaining s4_hold_respected is the unchanged dual-variant SKIP');
  // Unchanged neighbors: the capture gate, the dual-variant skip, the
  // context-aware skip, and every other Source's dispatch site all remain.
  assert.ok(parity.includes('manifest.stages?.source_split_parity_pass !== false'), 'capture gate is unchanged');
  assert.ok(parity.includes('DUAL_VARIANT_S4_HOLD'), 'dual-variant SKIP disposition is unchanged');
  assert.ok(parity.includes('getCaptureSurfaceDisposition'), 'capture-surface SKIP disposition is unchanged');
  for (const id of ['SRC047', 'SRC057', 'SRC058', 'SRC060', 'SRC062', 'SRC064']) {
    assert.equal([...parity.matchAll(new RegExp(`if \\(sourceId === '${id}'\\)`, 'g'))].length, 1, `${id} keeps exactly one parity dispatch site`);
  }
  assert.equal([...parity.matchAll(/if \(sourceId === 'SRC071'\)/g)].length, 0, 'parity still has no SRC071 route');
});
