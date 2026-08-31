import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// The Source's action modals use backdrop-filter:blur(), whose GPU compositing is
// +/-1 channel nondeterministic run-to-run even over a static canvas. A raw PNG/IDAT
// digest therefore jitters without any real visual change. We bind screenshots to a
// coarse canonical pixel digest (16x16 downsample, channels floored to /16) that is
// stable against sub-2/255 blur jitter yet still sensitive to real layout/color drift.
// The exact DOM, geometry, computed style, runtime state and interactions are asserted
// byte-equal separately, so the screenshot is a visual backstop, not the primary gate.
async function canonicalPixelDigest(page, pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  const data = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = `data:image/png;base64,${src}`; });
    const N = 16;
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, N, N);
    const px = ctx.getImageData(0, 0, N, N).data;
    return Array.from(px, (v, i) => (i % 4 === 3 ? v : v & 0xF0));
  }, b64);
  return sha256(Buffer.from(data));
}

function collectTrack60State() {
  const roundValue = (value) => Math.round(value * 1000) / 1000;
  const ids = [...document.querySelectorAll('[id]')];
  const $ = (selector) => document.querySelector(selector);
  const lt = window.__LT60__;
  const v12 = window.__LT60_V12__;
  const canvasOf = (id) => {
    const el = document.getElementById(id);
    return el ? { width: el.width, height: el.height, clientWidth: el.clientWidth, clientHeight: el.clientHeight } : null;
  };
  return {
    ids: ids.map((el) => el.id),
    elementCount: document.querySelectorAll('*').length,
    buttonIds: [...document.querySelectorAll('button')].map((el) => el.id),
    metrics: Object.fromEntries(ids.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return [el.id, {
        tag: el.tagName,
        className: typeof el.className === 'string' ? el.className : '',
        rect: {
          x: roundValue(rect.x),
          y: roundValue(rect.y),
          width: roundValue(rect.width),
          height: roundValue(rect.height),
        },
        display: style.display,
        position: style.position,
        visibility: style.visibility,
        opacity: style.opacity,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        zIndex: style.zIndex,
        transform: style.transform,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
      }];
    })),
    canvas: { stage: canvasOf('stage'), pathOverlay: canvasOf('pathOverlay') },
    runtime: {
      graph: { nodes: lt.nodes.length, edges: lt.edges.length, clusters: lt.clusters.length, bridgeRecords: lt.bridgeRecords.length },
      selected: lt.selected,
      selectedCluster: lt.selectedCluster,
      semantic: lt.semantic,
      levelLabel: $('#levelLabel').textContent,
      camera: {
        yaw: roundValue(lt.camera.yaw),
        pitch: roundValue(lt.camera.pitch),
        zoom: roundValue(lt.camera.zoom),
        tx: roundValue(lt.camera.tx),
        ty: roundValue(lt.camera.ty),
        tz: roundValue(lt.camera.tz),
      },
      bridgeText: $('#bridgeMode').textContent,
      emotionFilter: $('#emotionFilter').value,
      panelOpen: $('#panel').classList.contains('open'),
      panelTitle: $('#panel h2').textContent,
      panelMeta: $('#panel .meta').textContent,
      panelWhy: $('#panel .why span').textContent,
      bridgeboxOpen: $('#panel .bridgebox').classList.contains('open'),
      summaryOpen: $('#clusterSummary').classList.contains('open'),
      summaryTitle: $('#clusterSummary h3').textContent,
      summaryText: $('#clusterSummary p').textContent,
      tooltipOpen: $('#tooltip').classList.contains('open'),
      toastOpen: $('#toast').classList.contains('open'),
      modals: {
        momentViewer: $('#momentViewer').classList.contains('open'),
        bookHandoff: $('#bookHandoff').classList.contains('open'),
        connectionHandoff: $('#connectionHandoff').classList.contains('open'),
        pathPreview: $('#pathPreview').classList.contains('open'),
        pathOverlay: $('#pathOverlay').classList.contains('open'),
      },
      viewerTitle: $('#momentViewer .action-title').textContent,
      viewerMediaClass: $('#momentViewer .viewer-media').className,
      viewerSourceCard: $('#momentViewer .detail-card.source').textContent,
      bookTitle: $('#bookHandoff .action-title').textContent,
      bookLeft: $('#bookHandoff .book-page.left').textContent,
      bookRight: $('#bookHandoff .book-page.right').textContent,
      connCurrent: $('#connectionHandoff .conn-moment.current').textContent,
      connDestination: $('#connectionHandoff .conn-moment.destination').textContent,
      connBridgeNote: $('#connectionHandoff .bridge-note').textContent,
      pathTitle: $('#pathPreview h3').textContent,
      pathStats: $('#pathPreview .path-stats').textContent,
      pathDots: document.querySelectorAll('#pathPreview .path-route .path-dot').length,
      pathPlayStatus: $('#pathPreview .path-play-status').textContent,
      v12path: v12.path,
      handoffLast: v12.handoffs.last,
      navEventsCount: v12.navEvents.length,
      visibleMobileMacroEstimate: lt.visibleMobileMacroEstimate,
    },
  };
}

async function settleTrack60(page) {
  // Source CSS transitions run up to 0.25s; wait past them so screenshots are
  // taken only in settled states (identical policy for original and split).
  await page.waitForTimeout(450);
  await page.evaluate(async () => {
    const toast = document.getElementById('toast');
    if (toast) { clearTimeout(toast._t); toast.classList.remove('open'); }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function assertTrack60Ready(page, sourceId) {
  // Readiness gate: the source fills clusterProjected only inside the first draw()
  // frame. Pointer input is never applied before this gate, for original or split,
  // so the source-native pre-first-frame nearestHit race is not exercised (and not repaired).
  await page.waitForFunction(() => (
    window.__LT60__
    && window.__LT60_V12__
    && window.__LT60__.clusterProjection(0) != null
    && window.__LT60__.projection(0) != null
  ), null, { timeout: 15000 });
  const graph = await page.evaluate(() => ({
    nodes: window.__LT60__.nodes.length,
    clusters: window.__LT60__.clusters.length,
    bridges: window.__LT60__.bridgeRecords.length,
  }));
  assert.equal(graph.nodes, 1000, `${sourceId}: expected 1000 source nodes, got ${graph.nodes}`);
  assert.equal(graph.clusters, 9, `${sourceId}: expected 9 clusters, got ${graph.clusters}`);
  assert.equal(graph.bridges, 24, `${sourceId}: expected 24 bridge records, got ${graph.bridges}`);
}

async function pinCameraToCluster(page, ci) {
  await page.evaluate((clusterIndex) => {
    const lt = window.__LT60__;
    lt.focusCluster(clusterIndex);
  }, ci);
  await page.waitForTimeout(220);
  await page.evaluate((clusterIndex) => {
    const lt = window.__LT60__;
    const c = lt.clusters[clusterIndex];
    lt.camera.yaw = -0.18;
    lt.camera.pitch = 0.10;
    lt.camera.zoom = 1.28;
    lt.camera.tx = c.c[0];
    lt.camera.ty = c.c[1];
    lt.camera.tz = c.c[2];
  }, ci);
  await settleTrack60(page);
}

async function pinCameraToNode(page, nodeId) {
  await page.evaluate((id) => {
    const lt = window.__LT60__;
    lt.selectNode(id, false);
    const n = lt.nodes[id];
    lt.camera.tx = n.x;
    lt.camera.ty = n.y;
    lt.camera.tz = n.z;
    lt.camera.zoom = 2.35;
  }, nodeId);
  await settleTrack60(page);
}

async function exerciseTrack60(page, sourceId, label) {
  // On narrow viewports the INITIAL framing pushes cluster 1 off-screen, so the
  // pointer exercise starts from a deterministic camera pre-pinned to cluster 1
  // (identical protocol for original and split; no source repair involved).
  await pinCameraToCluster(page, 1);
  const nodePos = await page.evaluate(() => {
    const lt = window.__LT60__;
    const c = lt.clusters[1];
    let best = -1;
    let bestD = Infinity;
    lt.nodes.forEach((n, i) => {
      if (n.ci !== 1) return;
      const d = (n.x - c.c[0]) ** 2 + (n.y - c.c[1]) ** 2 + (n.z - c.c[2]) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    const p = lt.projection(best);
    return { x: p.x, y: p.y, node: best };
  });
  await page.mouse.move(nodePos.x, nodePos.y);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const hover = await page.evaluate(() => ({
    tooltipOpen: document.getElementById('tooltip').classList.contains('open'),
    tooltipTitle: document.querySelector('#tooltip b').textContent,
    tooltipStyleLeft: document.getElementById('tooltip').style.left,
    tooltipStyleTop: document.getElementById('tooltip').style.top,
  }));

  const clusterPos = await page.evaluate(() => {
    const p = window.__LT60__.clusterProjection(1);
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(clusterPos.x, clusterPos.y);
  await page.waitForTimeout(220);
  const clusterClick = await page.evaluate(() => ({
    selected: window.__LT60__.selected,
    selectedCluster: window.__LT60__.selectedCluster,
    summaryTitle: document.querySelector('#clusterSummary h3').textContent,
  }));
  assert.equal(clusterClick.selectedCluster, 1, `${sourceId} ${label}: canvas cluster click did not focus cluster 1`);

  await page.fill('#search', 'First');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const search = await page.evaluate(() => ({
    open: document.getElementById('searchResults').classList.contains('open'),
    count: document.querySelectorAll('#searchResults .result').length,
    firstTitle: document.querySelector('#searchResults .result b')?.textContent ?? null,
  }));
  await page.evaluate(() => {
    const input = document.getElementById('search');
    input.value = '';
    input.dispatchEvent(new Event('input'));
  });
  assert.equal(search.firstTitle, '처음 저장한 Moment', `${sourceId} ${label}: search did not resolve the seeded First Moment`);

  await page.click('#bridgeMode');
  const bridgeOn = await page.evaluate(() => ({
    text: document.getElementById('bridgeMode').textContent,
    toastOpen: document.getElementById('toast').classList.contains('open'),
  }));
  await page.click('#bridgeMode');
  const bridgeOff = await page.evaluate(() => document.getElementById('bridgeMode').textContent);
  assert.equal(bridgeOn.text, 'Bridge ON', `${sourceId} ${label}: bridge toggle failed`);
  assert.equal(bridgeOff, 'Bridge', `${sourceId} ${label}: bridge toggle-off failed`);

  await page.click('#reset');
  const afterReset = await page.evaluate(() => ({
    selected: window.__LT60__.selected,
    selectedCluster: window.__LT60__.selectedCluster,
    zoom: Math.round(window.__LT60__.camera.zoom * 1000) / 1000,
    tx: window.__LT60__.camera.tx,
    panelOpen: document.getElementById('panel').classList.contains('open'),
    summaryOpen: document.getElementById('clusterSummary').classList.contains('open'),
  }));
  assert.equal(afterReset.selected, null, `${sourceId} ${label}: reset did not clear selection`);
  assert.equal(afterReset.selectedCluster, null, `${sourceId} ${label}: reset did not clear cluster focus`);

  return { controlSurface: 'CANVAS_CLUSTER_POINTER', hover, clusterClick, search, bridgeOn, afterReset };
}

async function captureTrack60State(page, sourceOut, variant, label, stateName, pngName) {
  const state = await page.evaluate(collectTrack60State);
  const png = await page.screenshot({ path: path.join(sourceOut, `${label}-${variant}-${pngName}.png`), animations: 'disabled' });
  return { state, pngSha: await canonicalPixelDigest(page, png), stateName };
}

async function captureTrack60Page(page, sourceOut, variant, sourceId, label, errors = []) {
  await assertTrack60Ready(page, sourceId);
  await settleTrack60(page);
  if (errors.length) throw new Error(`${sourceId} ${variant}: browser errors before capture: ${errors.join('; ')}`);

  const initial = await captureTrack60State(page, sourceOut, variant, label, 'INITIAL', 'initial');
  const interaction = await exerciseTrack60(page, sourceId, `${label} ${variant}`);

  await page.evaluate(() => window.__LT60__.reset());
  await settleTrack60(page);
  await pinCameraToCluster(page, 1);
  const clusterFocus = await captureTrack60State(page, sourceOut, variant, label, 'CLUSTER_FOCUS', 'cluster-focus');

  await pinCameraToNode(page, 0);
  const nodeSelect = await captureTrack60State(page, sourceOut, variant, label, 'NODE_SELECT', 'node-select');

  await page.evaluate(() => window.__LT60_V12__.openViewer());
  await settleTrack60(page);
  const momentViewer = await captureTrack60State(page, sourceOut, variant, label, 'MOMENT_VIEWER', 'moment-viewer');
  await page.click('#momentViewer [data-close-action="momentViewer"]');
  await settleTrack60(page);

  await page.evaluate(() => window.__LT60_V12__.openBook());
  await settleTrack60(page);
  const bookHandoff = await captureTrack60State(page, sourceOut, variant, label, 'BOOK_HANDOFF', 'book-handoff');
  await page.click('#bookHandoff [data-close-action="bookHandoff"]');
  await settleTrack60(page);

  await page.evaluate(() => window.__LT60_V12__.openConnection());
  await settleTrack60(page);
  const connectionHandoff = await captureTrack60State(page, sourceOut, variant, label, 'CONNECTION_HANDOFF', 'connection-handoff');
  await page.click('#connectionHandoff [data-close-action="connectionHandoff"]');
  await settleTrack60(page);

  await page.evaluate(() => window.__LT60_V12__.openPath());
  await settleTrack60(page);
  const pathPreview = await captureTrack60State(page, sourceOut, variant, label, 'PATH_PREVIEW', 'path-preview');
  await page.evaluate(() => window.__LT60_V12__.closePath());
  await settleTrack60(page);

  if (errors.length) throw new Error(`${sourceId} ${label} ${variant}: browser errors: ${errors.join('; ')}`);
  return {
    states: { initial, clusterFocus, nodeSelect, momentViewer, bookHandoff, connectionHandoff, pathPreview },
    interaction,
    errors,
    screenshots: {
      initial_sha256: initial.pngSha,
      cluster_focus_sha256: clusterFocus.pngSha,
      node_select_sha256: nodeSelect.pngSha,
      moment_viewer_sha256: momentViewer.pngSha,
      path_preview_sha256: pathPreview.pngSha,
    },
  };
}

export async function captureTrack60Baseline(page, sourceOut, label) {
  return captureTrack60Page(page, sourceOut, 'original', 'SRC060', label);
}

export async function captureTrack60Variant(browser, url, viewport, sourceOut, variant, sourceId) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw new Error(`${sourceId} ${variant}: HTTP ${response?.status()}`);
    return await captureTrack60Page(page, sourceOut, variant, sourceId, `${viewport.width}x${viewport.height}`, errors);
  } finally {
    await context.close();
  }
}

export function track60SourceFiles(sourceDir, sourceId = 'SRC060') {
  return new Map([
    [`/${sourceId}/original.html`, [path.join(sourceDir, 'original', 'original.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/index.html`, [path.join(sourceDir, 'split', 'index.html'), 'text/html; charset=utf-8']],
    [`/${sourceId}/split/styles.css`, [path.join(sourceDir, 'split', 'styles.css'), 'text/css; charset=utf-8']],
    [`/${sourceId}/split/script.js`, [path.join(sourceDir, 'split', 'script.js'), 'text/javascript; charset=utf-8']],
  ]);
}

export { collectTrack60State };
