/**
 * SRC066 hook-less driver — harness routing contract (local only, no browser).
 *
 * Proves, without executing a browser:
 *  - T1/T2  the bounded driver exists, exports captureSRC66Baseline, reads zero
 *            window.__* hooks (observer-only), and is imported exactly once by
 *            the baseline harness (the parity SKIP needs no import).
 *  - T3      routing sets: the baseline harness routes the legacy per-source
 *            set {047,057,058,060,062,064,071} plus SRC066; the parity harness
 *            routes its driver six {047,057,058,060,062,064} plus the SRC066
 *            SKIP (parity never grew an SRC071 route) — nothing added, removed,
 *            or renamed for any other Source. Both sets equal origin/main
 *            (the merge-forward changed nothing).
 *  - T4      harness runtime scope is identical to origin/main: `git diff
 *            origin/main` over the driver and the two routed harnesses is empty.
 *            (This test file itself is branch-owned and excluded from the
 *            identity check. Pre-merge this same test proved the #634 diff was
 *            pure SRC066-anchored additions with zero removed lines; after the
 *            #634 merge that proof is subsumed by runtime identity with main, so
 *            the assertion now guards the merged steady state against edits.)
 *  - T5      fail-closed preserved: both harnesses still gate the generic path
 *            on the legacy window.__lt contract, so a Source with NEITHER a
 *            hook NOR a driver still trips the unchanged generic expectation
 *            (fail-closed regression, static proof; the generic regions are
 *            covered by T4's unchanged proof).
 *  - T6      the baseline harness captures SRC066 at the S2 viewports
 *            (1440x900, 430x932, 390x844).
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

test('T2 baseline harness imports the driver exactly once; parity needs no import', () => {
  const baseline = readWorktree(BASELINE);
  const imports = baseline.match(/from '\.\/source066-driver\.mjs'/g) || [];
  assert.equal(imports.length, 1, 'exactly one source066-driver import in the baseline harness');
  assert.ok(baseline.includes('captureSRC66Baseline'), 'baseline harness names the driver entry');
  const parity = readWorktree(PARITY);
  assert.equal(parity.match(/source066-driver/g)?.length ?? 0, 0, 'parity SKIP needs no driver import');
});

test('T3 routing sets are the legacy set plus SRC066 in both harnesses', () => {
  assert.deepEqual(routingSet(readWorktree(BASELINE)), EXPECTED_BASELINE_ROUTED, 'baseline routes legacy set + SRC066');
  assert.deepEqual(routingSet(readWorktree(PARITY)), EXPECTED_PARITY_ROUTED, 'parity routes driver six + SRC066 skip');
  assert.deepEqual(routingSet(gitShowMain(BASELINE)), EXPECTED_BASELINE_ROUTED, 'origin/main baseline routing equals worktree (merge changed nothing)');
  assert.deepEqual(routingSet(gitShowMain(PARITY)), EXPECTED_PARITY_ROUTED, 'origin/main parity routing equals worktree (merge changed nothing)');
});

test('T4 harness runtime scope is identical to origin/main (merge changed nothing)', () => {
  let diff;
  try {
    diff = execFileSync(
      'git',
      ['diff', 'origin/main', '--', BASELINE, PARITY, 'src/08_harness/source066-driver.mjs'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
  } catch (error) {
    throw new Error(`routing proof requires git history: ${error.message}`);
  }
  assert.equal(diff.trim(), '', `harness runtime must not differ from origin/main (got: ${diff.slice(0, 300)})`);
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

test('T6 baseline harness captures SRC066 at the S2 viewports', () => {
  const text = readWorktree(BASELINE);
  const at = text.indexOf('SRC066: [');
  assert.ok(at >= 0, 'SRC066 viewport entry exists in sourceViewports');
  const window_ = text.slice(at, at + 300);
  for (const [w, h] of [[1440, 900], [430, 932], [390, 844]]) {
    assert.ok(window_.includes(`width: ${w},`) && window_.includes(`height: ${h}`), `SRC066 viewport ${w}x${h} listed`);
  }
});
