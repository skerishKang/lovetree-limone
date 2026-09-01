#!/usr/bin/env node
/**
 * qa/mvp001-browser-qa.mjs
 *
 * Final Central-Grade Runtime Parity & Browser QA Suite for MVP001.
 *
 * Enforces:
 * 1. BLOCKER A: Post-interaction error fail-closed gate
 *    - pageErrors === 0 and consoleErrors === 0 asserted BEFORE interaction
 *    - deterministic postcondition waited and verified
 *    - pageErrors === 0 and consoleErrors === 0 asserted AGAIN AFTER interaction
 * 2. BLOCKER B: True observable postconditions (no matched no-op PASS)
 *    - SRC064: #menuBtn opens #menuPanel (classList.contains('open') === true)
 *    - SRC058: #plusBtn changes zoom; #fitBtn restores view to exact fit scale and updates #zoomLabel
 *    - SRC056: #helpBtn displays #toast with guidance text (classList.contains('show') === true)
 *    - SRC057: clicking card m2 updates selectedId === 'm2', adds is-selected class, opens #detailPanel
 *    - SRC060: #bridgeMode updates button text to 'Bridge ON', activates toast, and sets bridgeMode state
 * 3. BLOCKER C: Real iframe input gates
 *    - IFRAME_POINTER: Real mouse click at bounding box coordinate inside iframe
 *    - IFRAME_TOUCH: Real touchscreen tap at target coordinate in hasTouch context
 *    - IFRAME_WHEEL: Real mouse wheel event dispatch modifying SRC058 zoom view
 *    - IFRAME_KEYBOARD_FOCUS: Keyboard focus and Space key activation on SRC057 card
 * 4. BLOCKER D: Matched A/B screenshot generation saved to evidence/mvp001/a-b-parity/
 *    - 40 deterministic matched PNG files
 */

import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = join(import.meta.dirname, '..');
const EVIDENCE_DIR = process.env.MVP001_EVIDENCE_DIR || join(ROOT, 'evidence/mvp001/a-b-parity');
mkdirSync(EVIDENCE_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Static server simulating Cloudflare Worker static adapter:
// /mvp/01 and /mvp/01/ -> /mvp/01/index.html
function createStaticServer() {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(u.pathname);

    const mvpMatch = pathname.match(/^\/mvp\/(\d{2})(\/.*)?$/);
    if (mvpMatch) {
      const slot = mvpMatch[1];
      const rest = mvpMatch[2];
      if (!rest || rest === '/') {
        pathname = `/mvp/${slot}/index.html`;
      }
    }

    let filePath;
    if (pathname.startsWith('/src/03_sources/')) {
      filePath = join(ROOT, pathname);
    } else {
      filePath = join(ROOT, 'public', pathname);
    }

    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.end(readFileSync(filePath));
  });
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, isDesktop: true, hasTouch: false },
  { name: '430x932', width: 430, height: 932, isDesktop: false, hasTouch: true },
  { name: '390x844', width: 390, height: 844, isDesktop: false, hasTouch: true },
];

const SOURCES = [
  {
    id: 'SRC064',
    step: 'entry',
    label: '입장 포털',
    splitUrl: '/src/03_sources/SRC064/split/index.html',
    async verifyInitialState(contextHandle) {
      return contextHandle.evaluate(() => {
        const track = window.__TRACK64__;
        return {
          cards: track?.getCards?.()?.length ?? document.querySelectorAll('.card').length,
          hasApp: !!document.getElementById('app'),
          hasMenuBtn: !!document.getElementById('menuBtn'),
          menuPanelOpen: document.getElementById('menuPanel')?.classList.contains('open') ?? false,
        };
      });
    },
    async exerciseInteraction(contextHandle, page, isIframe) {
      // Click #menuBtn
      if (isIframe) {
        // Real pointer coordinate dispatch
        const box = await contextHandle.locator('#menuBtn').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await contextHandle.click('#menuBtn');
      }

      await contextHandle.waitForFunction(() => {
        return document.getElementById('menuPanel')?.classList.contains('open') === true;
      }, null, { timeout: 5000 });

      const state = await contextHandle.evaluate(() => ({
        menuPanelOpen: document.getElementById('menuPanel')?.classList.contains('open') ?? false,
      }));

      // Assert real postcondition (not a no-op)
      assert.equal(state.menuPanelOpen, true, 'SRC064: #menuPanel must transition to OPEN');
      return state;
    },
  },
  {
    id: 'SRC058',
    step: 'board',
    label: '리빙 보드',
    splitUrl: '/src/03_sources/SRC058/split/index.html',
    async verifyInitialState(contextHandle) {
      return contextHandle.evaluate(() => {
        const cards = document.querySelectorAll('#cardLayer [data-id]').length;
        return {
          cards,
          hasApp: !!document.getElementById('app'),
          hasFitBtn: !!document.getElementById('fitBtn'),
          initialZoom: document.getElementById('zoomLabel')?.textContent ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle, page, isIframe) {
      const zoomInitial = await contextHandle.evaluate(() => document.getElementById('zoomLabel')?.textContent);

      // 1. Click #plusBtn to zoom in and prove state change
      if (isIframe) {
        const boxPlus = await contextHandle.locator('#plusBtn').boundingBox();
        await page.mouse.click(boxPlus.x + boxPlus.width / 2, boxPlus.y + boxPlus.height / 2);
      } else {
        await contextHandle.click('#plusBtn');
      }
      await contextHandle.waitForTimeout(250);

      const zoomAfterPlus = await contextHandle.evaluate(() => document.getElementById('zoomLabel')?.textContent);
      assert.notEqual(zoomAfterPlus, zoomInitial, 'SRC058: plusBtn must alter zoom state');

      // 2. Click #fitBtn to restore exact fit scale
      if (isIframe) {
        const boxFit = await contextHandle.locator('#fitBtn').boundingBox();
        await page.mouse.click(boxFit.x + boxFit.width / 2, boxFit.y + boxFit.height / 2);
      } else {
        await contextHandle.click('#fitBtn');
      }
      await contextHandle.waitForTimeout(250);

      const zoomAfterFit = await contextHandle.evaluate(() => document.getElementById('zoomLabel')?.textContent);
      const state = {
        zoomInitial,
        zoomAfterPlus,
        zoomAfterFit,
        fitRestored: zoomAfterFit === zoomInitial,
      };

      // Assert real postcondition
      assert.equal(state.fitRestored, true, 'SRC058: fitBtn must restore exact fit scale');
      return state;
    },
  },
  {
    id: 'SRC056',
    step: 'relationships',
    label: '관계망',
    splitUrl: '/src/03_sources/SRC056/split/index.html',
    async verifyInitialState(contextHandle) {
      return contextHandle.evaluate(() => {
        const canvas = document.getElementById('stage');
        return {
          hasStage: !!canvas,
          canvasWidth: canvas?.width ?? 0,
          canvasHeight: canvas?.height ?? 0,
          hasOverviewBtn: !!document.getElementById('overviewBtn'),
          toastVisible: document.getElementById('toast')?.classList.contains('show') ?? false,
        };
      });
    },
    async exerciseInteraction(contextHandle, page, isIframe) {
      // Click #helpBtn
      if (isIframe) {
        const box = await contextHandle.locator('#helpBtn').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await contextHandle.click('#helpBtn');
      }

      await contextHandle.waitForFunction(() => {
        const toast = document.getElementById('toast');
        return toast?.classList.contains('show') === true;
      }, null, { timeout: 5000 });

      const state = await contextHandle.evaluate(() => {
        const toast = document.getElementById('toast');
        return {
          toastVisible: toast?.classList.contains('show') ?? false,
          toastHasGuidanceText: (toast?.textContent ?? '').includes('First'),
        };
      });

      // Assert real postcondition
      assert.equal(state.toastVisible, true, 'SRC056: toast must be visible after help click');
      assert.equal(state.toastHasGuidanceText, true, 'SRC056: toast must contain guidance text');
      return state;
    },
  },
  {
    id: 'SRC057',
    step: 'memory',
    label: '모먼트 상세',
    splitUrl: '/src/03_sources/SRC057/split/index.html',
    async verifyInitialState(contextHandle) {
      return contextHandle.evaluate(() => {
        const cards = document.querySelectorAll('.card-wrap').length;
        return {
          cards,
          hasCollection: !!document.getElementById('collection'),
          initialSelectedId: window.__LT57__?.selectedId ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle, page, isIframe) {
      // Select card m2 (since m1 is selected on initial load)
      const targetSelector = '[data-id="m2"]';
      if (isIframe) {
        const box = await contextHandle.locator(targetSelector).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await contextHandle.click(targetSelector);
      }

      await contextHandle.waitForFunction(() => {
        return window.__LT57__?.selectedId === 'm2' && document.getElementById('detailPanel')?.classList.contains('open');
      }, null, { timeout: 5000 });

      const state = await contextHandle.evaluate(() => ({
        selectedId: window.__LT57__?.selectedId ?? null,
        cardIsSelected: document.querySelector('[data-id="m2"]')?.classList.contains('is-selected') ?? false,
        detailOpen: document.getElementById('detailPanel')?.classList.contains('open') ?? false,
      }));

      // Assert real postcondition
      assert.equal(state.selectedId, 'm2', 'SRC057: selectedId must transition to m2');
      assert.equal(state.cardIsSelected, true, 'SRC057: card m2 must have is-selected class');
      assert.equal(state.detailOpen, true, 'SRC057: detailPanel must be open');
      return state;
    },
  },
  {
    id: 'SRC060',
    step: 'explore',
    label: '심층 탐색',
    splitUrl: '/src/03_sources/SRC060/split/index.html',
    async verifyInitialState(contextHandle) {
      return contextHandle.evaluate(() => {
        const canvas = document.getElementById('stage');
        return {
          hasStage: !!canvas,
          canvasWidth: canvas?.width ?? 0,
          canvasHeight: canvas?.height ?? 0,
          hasBridgeModeBtn: !!document.getElementById('bridgeMode'),
          initialBridgeText: document.getElementById('bridgeMode')?.textContent?.trim() ?? null,
        };
      });
    },
    async exerciseInteraction(contextHandle, page, isIframe) {
      // Click #bridgeMode
      if (isIframe) {
        const box = await contextHandle.locator('#bridgeMode').boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await contextHandle.click('#bridgeMode');
      }

      await contextHandle.waitForFunction(() => {
        return document.getElementById('bridgeMode')?.textContent?.trim() === 'Bridge ON';
      }, null, { timeout: 5000 });

      const state = await contextHandle.evaluate(() => ({
        bridgeButtonText: document.getElementById('bridgeMode')?.textContent?.trim() ?? '',
        toastOpen: document.getElementById('toast')?.classList.contains('open') ?? false,
      }));

      // Assert real postcondition
      assert.equal(state.bridgeButtonText, 'Bridge ON', 'SRC060: button text must change to Bridge ON');
      assert.equal(state.toastOpen, true, 'SRC060: guidance toast must be open');
      return state;
    },
  },
];

async function runFinalQA() {
  console.log('=== MVP001 Final Central QA: Fail-Closed A/B Parity & Input Gates ===\n');

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Static server running at ${baseUrl}`);
  console.log(`Screenshot evidence directory: ${EVIDENCE_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  let totalAssertions = 0;
  const paritySummary = {};

  try {
    for (const src of SOURCES) {
      console.log(`==================================================`);
      console.log(`Auditing Source: ${src.id} (${src.label})`);
      console.log(`==================================================`);

      for (const vp of VIEWPORTS) {
        console.log(`\n  --- Viewport: ${vp.name} ---`);

        // ============================================================
        // [A] DIRECT SPLIT EXECUTION
        // ============================================================
        const contextA = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          hasTouch: vp.hasTouch,
        });
        const pageA = await contextA.newPage();

        const pageErrorsA = [];
        const consoleErrorsA = [];
        pageA.on('pageerror', (err) => pageErrorsA.push(err.message));
        pageA.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrorsA.push(msg.text());
        });

        await pageA.goto(`${baseUrl}${src.splitUrl}`, { waitUntil: 'load' });
        await pageA.waitForTimeout(500);

        // Pre-interaction fail-closed check
        assert.equal(pageErrorsA.length, 0, `[A initial] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsA.join('; ')}`);
        assert.equal(consoleErrorsA.length, 0, `[A initial] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsA.join('; ')}`);
        totalAssertions += 2;

        const initialStateA = await src.verifyInitialState(pageA);

        // Capture A initial screenshot
        const shotA = join(EVIDENCE_DIR, `${src.id}_${vp.width}_A_direct.png`);
        await pageA.screenshot({ path: shotA });

        let postStateA = null;
        if (vp.isDesktop) {
          // Perform interaction
          postStateA = await src.exerciseInteraction(pageA, pageA, false);

          // Allow any async handlers/rAF loops to settle
          await pageA.waitForTimeout(300);

          // Post-interaction fail-closed check (BLOCKER A)
          assert.equal(pageErrorsA.length, 0, `[A post-interaction] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsA.join('; ')}`);
          assert.equal(consoleErrorsA.length, 0, `[A post-interaction] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsA.join('; ')}`);
          totalAssertions += 2;

          const shotAInteract = join(EVIDENCE_DIR, `${src.id}_${vp.width}_A_interact.png`);
          await pageA.screenshot({ path: shotAInteract });
        }

        await contextA.close();

        // ============================================================
        // [B] ACTUAL /mvp/01 SHELL IFRAME EXECUTION
        // ============================================================
        const contextB = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          hasTouch: vp.hasTouch,
        });
        const pageB = await contextB.newPage();

        const pageErrorsB = [];
        const consoleErrorsB = [];
        pageB.on('pageerror', (err) => pageErrorsB.push(err.message));
        pageB.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrorsB.push(msg.text());
        });

        await pageB.goto(`${baseUrl}/mvp/01?step=${src.step}`, { waitUntil: 'load' });
        await pageB.waitForTimeout(500);

        // Verify single active iframe
        const iframeLocator = pageB.locator('iframe.mvp-surface-frame');
        assert.equal(await iframeLocator.count(), 1, `[B mvp] ${src.id} ${vp.name}: must have exactly 1 active iframe`);
        totalAssertions++;

        // Verify full viewport sizing
        const iframeBox = await iframeLocator.boundingBox();
        assert.ok(iframeBox.width >= vp.width - 16, `[B mvp] ${src.id} ${vp.name}: iframe width must span viewport`);
        assert.equal(iframeBox.height, vp.height, `[B mvp] ${src.id} ${vp.name}: iframe height must span viewport`);
        totalAssertions += 2;

        // Locate iframe frame context
        const frame = pageB.frame({ url: (u) => u.pathname.includes(src.id.toLowerCase()) });
        assert.ok(frame, `[B mvp] ${src.id} ${vp.name}: iframe context not found`);
        totalAssertions++;

        // Pre-interaction fail-closed check
        assert.equal(pageErrorsB.length, 0, `[B initial] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsB.join('; ')}`);
        assert.equal(consoleErrorsB.length, 0, `[B initial] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsB.join('; ')}`);
        totalAssertions += 2;

        const initialStateB = await src.verifyInitialState(frame);
        assert.deepEqual(initialStateB, initialStateA, `[Initial Parity] ${src.id} ${vp.name}: Initial state in iframe must match direct run`);
        totalAssertions++;

        // Capture B initial screenshot
        const shotB = join(EVIDENCE_DIR, `${src.id}_${vp.width}_B_mvp.png`);
        await pageB.screenshot({ path: shotB });

        let postStateB = null;
        if (vp.isDesktop) {
          // Perform interaction inside iframe via real pointer coordinate dispatch (BLOCKER C Pointer)
          postStateB = await src.exerciseInteraction(frame, pageB, true);

          // Allow async handlers/rAF loops to settle
          await pageB.waitForTimeout(300);

          // Post-interaction fail-closed check (BLOCKER A)
          assert.equal(pageErrorsB.length, 0, `[B post-interaction] ${src.id} ${vp.name}: unexpected page errors: ${pageErrorsB.join('; ')}`);
          assert.equal(consoleErrorsB.length, 0, `[B post-interaction] ${src.id} ${vp.name}: unexpected console errors: ${consoleErrorsB.join('; ')}`);
          totalAssertions += 2;

          assert.deepEqual(postStateB, postStateA, `[Post-Interaction Parity] ${src.id} ${vp.name}: Post-interaction state in iframe must match direct run`);
          totalAssertions++;

          const shotBInteract = join(EVIDENCE_DIR, `${src.id}_${vp.width}_B_interact.png`);
          await pageB.screenshot({ path: shotBInteract });
        }

        // Navigation chrome boundary & collapse check
        const navBox = await pageB.locator('#mvp-shell-nav').boundingBox();
        assert.ok(navBox.y + navBox.height <= vp.height, 'Nav chrome stays within viewport boundary');
        await pageB.click('#toggle-nav-btn');
        assert.ok(await pageB.locator('#mvp-shell-nav').evaluate((el) => el.classList.contains('collapsed')), 'Nav collapses');
        await pageB.click('#toggle-nav-btn');
        assert.ok(await pageB.locator('#mvp-shell-nav').evaluate((el) => !el.classList.contains('collapsed')), 'Nav expands');
        totalAssertions += 3;

        await contextB.close();
        console.log(`    ✓ ${vp.name}: Initial & Post-interaction matched, 0 errors, screenshots saved.`);
      }

      paritySummary[src.id] = 'PASS';
    }

    // ============================================================
    // BLOCKER C — DEDICATED INPUT GATES (Pointer, Touch, Wheel, Keyboard)
    // ============================================================
    console.log(`\n==================================================`);
    console.log(`BLOCKER C — EXPLICIT INPUT GATES VERIFICATION`);
    console.log(`==================================================`);

    // 1. TOUCH INPUT GATE: Touchscreen tap in mobile viewport (390x844) on SRC064 menuBtn
    console.log('--- Testing IFRAME_TOUCH Input Gate ---');
    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const touchPage = await touchContext.newPage();
    const touchErrors = [];
    touchPage.on('pageerror', (e) => touchErrors.push(e.message));
    touchPage.on('console', (m) => { if (m.type() === 'error') touchErrors.push(m.text()); });

    await touchPage.goto(`${baseUrl}/mvp/01?step=entry`, { waitUntil: 'load' });
    await touchPage.waitForTimeout(400);

    const touchFrame = touchPage.frame({ url: (u) => u.pathname.includes('src064') });
    assert.ok(touchFrame, 'Touch frame loaded');
    const menuBox = await touchFrame.locator('#menuBtn').boundingBox();
    assert.ok(menuBox, 'Menu button bounding box resolved');

    // Perform actual touchscreen tap
    await touchPage.touchscreen.tap(menuBox.x + menuBox.width / 2, menuBox.y + menuBox.height / 2);
    await touchFrame.waitForFunction(() => document.getElementById('menuPanel')?.classList.contains('open') === true, null, { timeout: 5000 });
    const touchMenuOpen = await touchFrame.evaluate(() => document.getElementById('menuPanel')?.classList.contains('open') === true);
    assert.equal(touchMenuOpen, true, 'IFRAME_TOUCH: touchscreen tap opened menu panel');
    assert.equal(touchErrors.length, 0, `IFRAME_TOUCH: zero errors: ${touchErrors.join('; ')}`);
    totalAssertions += 3;
    await touchContext.close();
    console.log('  ✓ IFRAME_TOUCH: PASS');

    // 2. WHEEL INPUT GATE: Mouse wheel dispatch over SRC058 zoom viewport
    console.log('--- Testing IFRAME_WHEEL Input Gate ---');
    const wheelContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const wheelPage = await wheelContext.newPage();
    const wheelErrors = [];
    wheelPage.on('pageerror', (e) => wheelErrors.push(e.message));
    wheelPage.on('console', (m) => { if (m.type() === 'error') wheelErrors.push(m.text()); });

    await wheelPage.goto(`${baseUrl}/mvp/01?step=board`, { waitUntil: 'load' });
    await wheelPage.waitForTimeout(400);

    const wheelFrame = wheelPage.frame({ url: (u) => u.pathname.includes('src058') });
    assert.ok(wheelFrame, 'Wheel frame loaded');

    const initialWheelZ = await wheelFrame.evaluate(() => window.__LT58.state.view.z);
    // Dispatch real mouse wheel event over center of surface
    await wheelPage.mouse.move(720, 450);
    await wheelPage.mouse.wheel(0, -200);
    await wheelPage.waitForTimeout(300);

    const afterWheelZ = await wheelFrame.evaluate(() => window.__LT58.state.view.z);
    assert.notEqual(afterWheelZ, initialWheelZ, 'IFRAME_WHEEL: wheel dispatch must alter zoom view.z');
    assert.equal(wheelErrors.length, 0, `IFRAME_WHEEL: zero errors: ${wheelErrors.join('; ')}`);
    totalAssertions += 3;
    await wheelContext.close();
    console.log('  ✓ IFRAME_WHEEL: PASS');

    // 3. KEYBOARD / FOCUS GATE: Focus and Space-key activation in SRC057
    console.log('--- Testing IFRAME_KEYBOARD_FOCUS Input Gate ---');
    const keyContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const keyPage = await keyContext.newPage();
    const keyErrors = [];
    keyPage.on('pageerror', (e) => keyErrors.push(e.message));
    keyPage.on('console', (m) => { if (m.type() === 'error') keyErrors.push(m.text()); });

    await keyPage.goto(`${baseUrl}/mvp/01?step=memory`, { waitUntil: 'load' });
    await keyPage.waitForTimeout(400);

    const keyFrame = keyPage.frame({ url: (u) => u.pathname.includes('src057') });
    assert.ok(keyFrame, 'Keyboard frame loaded');

    // Focus card m2 inside iframe
    await keyFrame.locator('[data-id="m2"]').focus();
    const isFocused = await keyFrame.evaluate(() => document.activeElement?.dataset?.id === 'm2');
    assert.equal(isFocused, true, 'IFRAME_KEYBOARD_FOCUS: card m2 received focus inside iframe');

    // Press Space to activate
    await keyPage.keyboard.press('Space');
    await keyFrame.waitForFunction(() => window.__LT57__?.selectedId === 'm2', null, { timeout: 5000 });

    const selectedViaKey = await keyFrame.evaluate(() => window.__LT57__?.selectedId);
    assert.equal(selectedViaKey, 'm2', 'IFRAME_KEYBOARD_FOCUS: Space key activated selection of m2');

    // Focus shell navigation and verify no trapping
    await keyPage.locator('#next-btn').focus();
    const shellBtnFocused = await keyPage.evaluate(() => document.activeElement?.id === 'next-btn');
    assert.equal(shellBtnFocused, true, 'IFRAME_KEYBOARD_FOCUS: focus transitions back to shell without trapping');
    assert.equal(keyErrors.length, 0, `IFRAME_KEYBOARD_FOCUS: zero errors: ${keyErrors.join('; ')}`);
    totalAssertions += 4;
    await keyContext.close();
    console.log('  ✓ IFRAME_KEYBOARD_FOCUS: PASS');

    // ============================================================
    // SHELL LIFECYCLE & MULTI-STEP NAVIGATION
    // ============================================================
    console.log(`\n==================================================`);
    console.log(`SHELL FUNCTIONAL LIFECYCLE & ROUTING AUDIT`);
    console.log(`==================================================`);

    const shellContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const shellPage = await shellContext.newPage();
    const shellErrors = [];
    shellPage.on('pageerror', (e) => shellErrors.push(e.message));
    shellPage.on('console', (m) => { if (m.type() === 'error') shellErrors.push(m.text()); });

    await shellPage.goto(`${baseUrl}/mvp/01`, { waitUntil: 'load' });
    await shellPage.waitForTimeout(400);

    for (let i = 1; i < SOURCES.length; i++) {
      await shellPage.click('#next-btn');
      await shellPage.waitForTimeout(400);
      assert.ok(shellPage.url().includes(`step=${SOURCES[i].step}`), `Shell URL updated to step=${SOURCES[i].step}`);
      assert.equal(await shellPage.locator('iframe.mvp-surface-frame').count(), 1, 'Strictly 1 active iframe on transition');
      totalAssertions += 2;
    }

    for (let i = SOURCES.length - 2; i >= 0; i--) {
      await shellPage.click('#prev-btn');
      await shellPage.waitForTimeout(300);
      assert.ok(shellPage.url().includes(`step=${SOURCES[i].step}`), `Shell URL updated backwards to step=${SOURCES[i].step}`);
      assert.equal(await shellPage.locator('iframe.mvp-surface-frame').count(), 1, 'Strictly 1 active iframe on backwards transition');
      totalAssertions += 2;
    }

    await shellPage.goto(`${baseUrl}/mvp/01?step=bogus_step_id`, { waitUntil: 'load' });
    await shellPage.waitForTimeout(300);
    const fallbackSrc = await shellPage.locator('iframe.mvp-surface-frame').getAttribute('src');
    assert.ok(fallbackSrc.includes('src064'), 'Invalid step param falls back to entry');
    totalAssertions++;

    assert.equal(shellErrors.length, 0, `Shell lifecycle had unexpected errors: ${shellErrors.join('; ')}`);
    totalAssertions++;

    await shellContext.close();

    console.log('\n========================================');
    console.log(`ALL TESTS COMPLETE: ${totalAssertions} assertions PASSED`);
    console.log('Parity Summary:');
    for (const [id, res] of Object.entries(paritySummary)) {
      console.log(`  ${id}_MVP_RUNTIME_PARITY = ${res}`);
    }
    console.log('PAGE_ERRORS_AFTER_INTERACTION = 0');
    console.log('CONSOLE_ERRORS_AFTER_INTERACTION = 0');
    console.log('========================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runFinalQA().catch((err) => {
  console.error('\nFINAL QA EXECUTION FAILED:', err);
  process.exit(1);
});
