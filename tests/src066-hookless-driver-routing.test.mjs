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
// origin/main carries the SRC066 lane's routing set. The SRC051 S3 correction (#589 PR #659) adds
// exactly one more baseline route, SRC051, for the window.__LT_PROMO baseline replay driver. The
// parity harness is NOT expected to gain an SRC051 route: CENTRAL holds S4 for SRC051, so the
// parity harness skips it at the stage gate before dispatch and never reaches a route list.
const EXPECTED_BASELINE_ROUTED_MAIN = [...LEGACY_ROUTED, 'SRC066'].sort();
const EXPECTED_BASELINE_ROUTED_WORKTREE = [...LEGACY_ROUTED, 'SRC066', 'SRC051'].sort();
// The parity harness never grew an SRC071 route (SRC071 holds accepted parity,
// so line-276 skips it before dispatch); its legacy set is the driver six.
// origin/main has never routed SRC051 in the parity harness: S4 was held for it there.
const EXPECTED_PARITY_ROUTED_MAIN = ['SRC047', 'SRC057', 'SRC058', 'SRC060', 'SRC062', 'SRC064', 'SRC066'].sort();
// The worktree gains the SRC051 parity route because CENTRAL released S4 for SRC051 only
// (#589 comment 5862568703). No other Source's routing is touched by that release.
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

test('T3 routing sets are the legacy set plus SRC066, plus exactly the SRC051 baseline and parity routes', () => {
  assert.deepEqual(routingSet(readWorktree(BASELINE)), EXPECTED_BASELINE_ROUTED_WORKTREE, 'baseline routes legacy set + SRC066 + SRC051');
  assert.deepEqual(routingSet(readWorktree(PARITY)), EXPECTED_PARITY_ROUTED, 'parity routes driver six + SRC066 + SRC051 after the bounded CENTRAL S4 release');
  assert.deepEqual(routingSet(gitShowMain(BASELINE)), EXPECTED_BASELINE_ROUTED_MAIN, 'origin/main baseline routing is the pre-SRC051 set');
  assert.deepEqual(routingSet(gitShowMain(PARITY)), EXPECTED_PARITY_ROUTED_MAIN, 'origin/main parity routing has no SRC051 route: S4 was held there');
  // The bounded release must add SRC051 and ONLY SRC051. Anything else would be scope creep.
  const added = routingSet(readWorktree(PARITY)).filter((id) => !EXPECTED_PARITY_ROUTED_MAIN.includes(id));
  assert.deepEqual(added, ['SRC051'], 'the S4 release adds exactly one parity route');
});

test('T4 the SRC066 driver is identical to origin/main, and the baseline diff is only the SRC051 route', () => {
  let driverDiff;
  try {
    driverDiff = execFileSync('git', ['diff', 'origin/main', '--', 'src/08_harness/source066-driver.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (error) {
    throw new Error(`routing proof requires git history: ${error.message}`);
  }
  assert.equal(driverDiff.trim(), '', `the SRC066 driver must not differ from origin/main (got: ${driverDiff.slice(0, 300)})`);

  // The baseline harness IS legitimately changed by the SRC051 lane. Narrowed from "identical" to
  // "changed by exactly the SRC051 route and its label plumbing", so the SRC066 invariant that no
  // unrelated route or behaviour moved is still enforced rather than dropped.
  let baselineDiff;
  try {
    baselineDiff = execFileSync('git', ['diff', 'origin/main', '--', BASELINE], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (error) {
    throw new Error(`routing proof requires git history: ${error.message}`);
  }
  const added = baselineDiff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const removed = baselineDiff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  // Exactly one existing line is replaced, and only because SRC051 has two authority lanes at the
  // SAME size (1440x900 normal-motion and 1440x900 reduce). Without an explicit label both lanes
  // would produce identical filenames and one would silently overwrite the other, so the label
  // falls back to width x height only when a Source does not declare one. Every other Source is
  // byte-for-byte unaffected: for them width x height is exactly what the old line produced.
  assert.deepEqual(removed, ['-        const label = `${viewport.width}x${viewport.height}`;'], `the only replaced baseline line must be the viewport label, got: ${removed.join(' | ')}`);
  assert.ok(added.length > 0, 'the baseline harness does gain the SRC051 route');
  const SRC051_ROUTE_LINE = /SRC051|source051|captureSRC051|reducedMotion|viewport\.label|dpr|1440x900|const label = viewport\.label \?\?|evidence\.errors|evidence\.failedRequests|firstState|summary\.viewports|sourceOut|outRoot|continue;|const evidence = await|const viewport of viewportsFor|for \(const sourceId of/;
  // The added region is: the source051-driver import, the SRC051 entry in the sourceViewports
  // table, the one replaced viewport-label line, and the body of the SRC051 route block (which
  // follows the established per-source pattern: guard on errors, write the lane JSON, push a
  // summary row, continue). A closing bracket or a `continue;` carries no identifier of its own,
  // so structural punctuation is allowed through, and every other added line must name the SRC051
  // route or one of the shared statements the route block legitimately reuses.
  // entry in the sourceViewports table together with its comment. A closing bracket of a literal
  // block carries no identifier of its own, so the check is made on the whole added code text
  // rather than line by line: every added non-comment line must be short structural punctuation or
  // must name the SRC051 route. That is tight enough to reject any unrelated behaviour, without
  // demanding every bracket quote "SRC051".
  const addedCode = added
    .map((l) => l.slice(1))
    .filter((body) => !/^\s*(\/\/|\*|\/\*)/.test(body))
    .map((body) => body.trim());
  const STRUCTURAL = /^[\]})[,;]*$/;
  for (const line of addedCode) {
    if (STRUCTURAL.test(line)) continue;
    assert.match(
      line,
      SRC051_ROUTE_LINE,
      `every added baseline line must belong to the SRC051 route or its label plumbing, got: ${line}`,
    );
  }
  // The route must actually be present, not merely the label plumbing.
  assert.ok(
    added.some((l) => l.includes("if (sourceId === 'SRC051')")),
    'the baseline harness gains the SRC051 route itself',
  );
  assert.ok(
    added.some((l) => l.includes("import { captureSRC051Baseline }")),
    'the baseline harness imports the SRC051 driver',
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
