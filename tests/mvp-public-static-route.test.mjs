/**
 * tests/mvp-public-static-route.test.mjs
 *
 * Route contract and resolution test for /mvp/NN static namespace adapter.
 * Verifies:
 * 1. Worker source contains /mvp/NN static namespace adapter wired to env.ASSETS
 * 2. resolveMvpStaticAssetPath correctly maps /mvp/01 and /mvp/01/ to /mvp/01/index.html
 * 3. resolveMvpStaticAssetPath preserves exact subpaths for static assets
 * 4. Non-MVP routes return null (fallthrough to existing App/API handlers)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveMvpStaticAssetPath } from '../core/runtime/worker/mvp-router.ts';

test('1. Worker source contains /mvp/NN static namespace adapter wired to env.ASSETS', async () => {
  const workerSrc = await readFile(new URL('../core/runtime/worker/index.ts', import.meta.url), 'utf8');
  assert.ok(workerSrc.includes('resolveMvpStaticAssetPath'), 'Worker must call resolveMvpStaticAssetPath');
  assert.ok(workerSrc.includes('env.ASSETS'), 'Worker must check env.ASSETS');
  assert.ok(workerSrc.includes('env.ASSETS.fetch(assetReq)'), 'Worker must delegate asset fetching to env.ASSETS');
});

test('2. resolveMvpStaticAssetPath maps root slots to index.html', () => {
  assert.equal(resolveMvpStaticAssetPath('/mvp/01'), '/mvp/01/index.html');
  assert.equal(resolveMvpStaticAssetPath('/mvp/01/'), '/mvp/01/index.html');
  assert.equal(resolveMvpStaticAssetPath('/mvp/02'), '/mvp/02/index.html');
  assert.equal(resolveMvpStaticAssetPath('/mvp/99'), '/mvp/99/index.html');
});

test('3. resolveMvpStaticAssetPath preserves exact subpaths for assets and surfaces', () => {
  assert.equal(resolveMvpStaticAssetPath('/mvp/01/shell.css'), '/mvp/01/shell.css');
  assert.equal(resolveMvpStaticAssetPath('/mvp/01/shell.js'), '/mvp/01/shell.js');
  assert.equal(
    resolveMvpStaticAssetPath('/mvp/01/surfaces/src064/index.html'),
    '/mvp/01/surfaces/src064/index.html'
  );
  assert.equal(
    resolveMvpStaticAssetPath('/mvp/01/surfaces/src058/styles.css'),
    '/mvp/01/surfaces/src058/styles.css'
  );
});

test('4. Non-MVP routes return null and do not trigger adapter', () => {
  assert.equal(resolveMvpStaticAssetPath('/'), null);
  assert.equal(resolveMvpStaticAssetPath('/v4'), null);
  assert.equal(resolveMvpStaticAssetPath('/v4/entry'), null);
  assert.equal(resolveMvpStaticAssetPath('/trees/demo'), null);
  assert.equal(resolveMvpStaticAssetPath('/api/trees'), null);
  assert.equal(resolveMvpStaticAssetPath('/design-lab'), null);
  assert.equal(resolveMvpStaticAssetPath('/mvp'), null); // Reserved index / selector
  assert.equal(resolveMvpStaticAssetPath('/mvpx/01'), null);
});
