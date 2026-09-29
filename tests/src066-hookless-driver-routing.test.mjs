/**
 * SRC066 hook-less driver — harness routing contract (local only, no browser).
 *
 * Proves, without executing a browser:
 *  - T1/T2  the bounded driver exists, exports captureSRC66Baseline, reads zero
 *            window.__* hooks (observer-only), and is imported exactly once by
 *            EACH harness: the baseline harness for S2 capture, the parity
 *            harness for the S4 original/split replay.
 *  - T3      routing truth, as a POST-SRC051 durable invariant: the worktree routing and
 *            current origin/main routing are identical, and both equal the absolute truth
 *            {047,051,057,058,060,062,064,066,071} baseline / {047,051,057,058,060,062,
 *            064,066} parity. SRC066 and SRC051 are present in both; SRC071 stays
 *            baseline-only. This replaced a PR-time assertion that origin/main was still
 *            pre-SRC051, which stopped being true when #659 merged.
 *  - T4      harness runtime identity: the SRC066 driver AND both harnesses are identical
 *            to current origin/main. The old bounded-diff allowance (baseline may differ by
 *            exactly the SRC051 route and its viewport-label plumbing) is REMOVED, not
 *            kept, so the invariant is now strictly stronger than before the merge. The
 *            routes are also proven present so the test cannot pass on a stub.
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
// POST-SRC051 DURABLE ROUTING TRUTH.
//
// This file used to encode a PR-time assumption that has since become false: it treated
// origin/main as the pre-SRC051 baseline and asserted that SRC051 existed only as a
// pending worktree diff. The SRC051 S3/S4 lane (#589, PR #659) has since been merged, so
// SRC051 is now durable in BOTH harnesses on main. T3/T4 are rewritten as post-SRC051
// durable invariants: the worktree must equal current origin/main, and both must equal
// the absolute routing truth below. Changing routing is now a deliberate, separately
// reviewed act that must update these constants in the same commit as the harness change.
//
// The parity harness never grew an SRC071 route (SRC071 holds accepted parity, so the
// stage gate skips it before dispatch); its legacy set is the driver six.
const EXPECTED_BASELINE_ROUTED = [...LEGACY_ROUTED, 'SRC066', 'SRC051'].sort();
const EXPECTED_PARITY_ROUTED = ['SRC047', 'SRC051', 'SRC057', 'SRC058', 'SRC060', 'SRC062', 'SRC064', 'SRC066'].sort();

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

test('T3 post-SRC051 durable routing: worktree equals origin/main, and both carry SRC051 and SRC066', () => {
  const worktreeBaseline = routingSet(readWorktree(BASELINE));
  const worktreeParity = routingSet(readWorktree(PARITY));
  const mainBaseline = routingSet(gitShowMain(BASELINE));
  const mainParity = routingSet(gitShowMain(PARITY));

  assert.deepEqual(worktreeBaseline, EXPECTED_BASELINE_ROUTED, 'baseline routes legacy seven + SRC066 + SRC051');
  assert.deepEqual(worktreeParity, EXPECTED_PARITY_ROUTED, 'parity routes driver six + SRC066 + SRC051');
  assert.deepEqual(mainBaseline, EXPECTED_BASELINE_ROUTED, 'origin/main baseline routing carries the merged SRC051 lane');
  assert.deepEqual(mainParity, EXPECTED_PARITY_ROUTED, 'origin/main parity routing carries the merged SRC051 lane');

  // The durable invariant: this lane introduces no routing drift of its own. The worktree
  // and current main must be byte-identical in routing, so a PR cannot quietly add or drop
  // a route without the absolute expectations above failing too.
  assert.deepEqual(worktreeBaseline, mainBaseline, 'worktree baseline routing is identical to origin/main');
  assert.deepEqual(worktreeParity, mainParity, 'worktree parity routing is identical to origin/main');

  // The SRC066 invariants this whole file exists to protect are unchanged by the SRC051 lane.
  for (const [label, set] of [['baseline', worktreeBaseline], ['parity', worktreeParity]]) {
    assert.ok(set.includes('SRC066'), `${label}: SRC066 route still present`);
    assert.ok(set.includes('SRC051'), `${label}: SRC051 route still present after merge`);
  }
  // SRC071 remains baseline-only: it holds accepted parity, so the parity stage gate skips
  // it before dispatch and it must never appear in the parity route list.
  assert.ok(worktreeBaseline.includes('SRC071'), 'baseline still routes SRC071');
  assert.ok(!worktreeParity.includes('SRC071'), 'parity still does not route SRC071');
});

test('T4 post-SRC051 durable harness identity: the driver and both harnesses are identical to origin/main', () => {
  // Before the SRC051 merge this test had to tolerate a baseline-harness diff and prove it was
  // bounded to the SRC051 route and its viewport-label plumbing. That lane is merged, so the
  // allowance is removed rather than kept: the invariant is now strictly stronger, because no
  // reviewed harness may differ from main without a deliberate, separately reviewed lane that
  // updates these assertions in the same commit.
  for (const [rel, label] of [
    ['src/08_harness/source066-driver.mjs', 'SRC066 driver'],
    [BASELINE, 'baseline harness'],
    [PARITY, 'parity harness'],
  ]) {
    let diff;
    try {
      diff = execFileSync('git', ['diff', 'origin/main', '--', rel], { cwd: REPO_ROOT, encoding: 'utf8' });
    } catch (error) {
      throw new Error(`routing proof requires git history: ${error.message}`);
    }
    assert.equal(diff.trim(), '', `the ${label} must not differ from origin/main (got: ${diff.slice(0, 300)})`);
  }
  // The routes themselves are proven present, not merely unchanged, so this test cannot be
  // satisfied by an empty or stubbed harness.
  assert.ok(
    readWorktree(BASELINE).includes("if (sourceId === 'SRC051')"),
    'the baseline harness still carries the SRC051 route itself',
  );
  assert.ok(
    readWorktree(BASELINE).includes('import { captureSRC051Baseline }'),
    'the baseline harness still imports the SRC051 driver',
  );
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
