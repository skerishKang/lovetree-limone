/**
 * SRC069 S4 context-aware original/split parity runner (Source-local).
 *
 * SRC069 is path-context-sensitive: its own `../../` portal URLs only resolve
 * from the canonical selected-D directory depth. This runner therefore serves
 * BOTH the frozen original and the mechanical split from two isolated virtual
 * roots that reproduce that exact hierarchy, and compares them state by state.
 *
 * It deliberately does NOT serve either surface from its repository path, does
 * NOT rewrite any Source URL, and does NOT vendor the ~35.7 MB sibling context
 * corpus. The context is staged outside Git by the S4 hydration step.
 *
 * Channels compared per matched state:
 *   identity/provenance, state name, viewport, body DOM inventory, important
 *   text, visibility/geometry, Source runtime state, console errors, page
 *   errors, failed requests, screenshot bytes/SHA.
 *
 * Raw whole-document DOM equality is intentionally NOT required: the mechanical
 * split changes only the <head> glue (<style> -> <link>, inline script ->
 * external script). document.body and everything derived from it compare
 * strictly.
 *
 * Screenshot determinism is a fixed harness-owned freeze, applied identically to
 * both surfaces: the shell background video is proven healthy first, then every
 * HTMLMediaElement in the document (and in same-origin iframes) is paused and
 * the shell video is seeked to one fixed timestamp, and every Web Animation is
 * paused. No Source code is modified.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { chromium } from 'playwright';

export const SOURCE_ID = 'SRC069';

export const VIEWPORTS = Object.freeze([
  { key: '1440x900', width: 1440, height: 900, class: 'desktop' },
  { key: '430x932', width: 430, height: 932, class: 'mobile' },
  { key: '390x844', width: 390, height: 844, class: 'mobile' },
]);

export const STATE_MATRIX = Object.freeze({
  desktop: Object.freeze(['INITIAL', 'WORKS_OPEN', 'VIEWER_TRACK02', 'VIEWER_TRACK59', 'ESC_FROM_VIEWER']),
  mobile: Object.freeze(['INITIAL', 'MENU_OPEN', 'WORKS_OPEN', 'VIEWER_TRACK02', 'VIEWER_TRACK59']),
});

export const EXPECTED_STATE_COUNT = 15;

// Fixed harness-owned media freeze. Both surfaces seek the shell background
// video to this timestamp and pause it before any screenshot is taken.
export const SHOT_FREEZE_TIMESTAMP = 1.0;

// Identical settle window for both surfaces after every state-entry action.
export const SETTLE_MS = 1200;

export const BROWSER_CHANNEL = 'chrome';

// Collapses every animation and transition to zero duration in every same-origin
// document. With a zero duration there is no time-dependent phase left, so two
// independently captured runs of the same state can no longer land on different
// frames of an in-flight transition. This is what makes the screenshot channel
// byte-reproducible instead of settling for sub-LSB rounding noise; it is applied
// identically to both surfaces and does not touch any Source file.
export const ZERO_MOTION_STYLE = ['*', '*::before', '*::after']
  .map(
    (selector) =>
      `${selector}{animation-duration:0s !important;animation-delay:0s !important;transition-duration:0s !important;transition-delay:0s !important;scroll-behavior:auto !important}`,
  )
  .join('');

// The screenshot channel is two-part. `screenshot_sha_equal` is the strict
// bytes-plus-SHA equality. `screenshot_equal` additionally accepts a measured
// pixel difference inside this tolerance, because headless Chrome does not
// rasterise backdrop-filter and gradient regions bit-reproducibly.
//
// That is measured, not assumed: the SAME surface, captured twice in two
// contexts of one browser, differed by 9,683 pixels at maxDeltaSum 11, which is
// more than the original-versus-split difference. So byte equality is not
// achievable for this Source and demanding it would make the channel flaky
// rather than more truthful. The tolerance is ~3 per channel summed over RGBA
// plus 0.5% of the frame, and every measurement that falls inside it is
// recorded in full in the evidence.
export const SCREENSHOT_TOLERANCE = Object.freeze({
  max_channel_delta_sum: 12,
  max_differing_pixel_ratio: 0.005,
});

// The mechanical split changes exactly one thing in <head>: the inline <style>
// becomes <link rel="stylesheet" href="styles.css">, and the inline script becomes
// <script src="script.js">. These five inventory fields are the observable
// consequence of that transformation and are the ONLY document-level differences
// the comparison is allowed to accept. Anything else in the document inventory is
// compared strictly.
export const HEAD_GLUE_DIFF_FIELDS = Object.freeze([
  'document.style_tag_count',
  'document.link_count',
  'document.script_tag_count',
  'document.external_script_src',
  'document.external_link_href',
]);

export const KEY_IDS = Object.freeze([
  'homeLogo',
  'menuOpen',
  'menuClose',
  'menuOverlay',
  'menuNav',
  'worksOverlay',
  'worksTitle',
  'worksClose',
  'worksList',
  'previewNo',
  'previewTitle',
  'previewCopy',
  'viewer',
  'viewerIndex',
  'viewerTitle',
  'viewerSource',
  'viewerOpenExternal',
  'viewerClose',
  'viewerFrame',
  'viewerLoading',
]);

export const KEY_SELECTORS = Object.freeze([
  'video.bg-video',
  '.navbar',
  '.desktop-nav',
  '.mobile-menu-btn',
  '.menu-overlay',
  '.portal-hint',
  '.works-overlay',
  '.viewer',
  '.viewer-stage',
  '.hero',
  '.footer',
]);

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
});

/**
 * Static server rooted at a virtual root directory. URL path segments are
 * percent-decoded so the canonical Drive hierarchy (brackets, Hangul, ★, ·)
 * maps onto the filesystem verbatim. No URL is rewritten by the runner.
 */
export function startVirtualRootServer(rootDir, portHint = 0) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    } catch {
      res.statusCode = 400;
      res.end('bad request');
      return;
    }
    if (pathname === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      res.statusCode = 400;
      res.end('bad encoding');
      return;
    }
    const segments = decoded.split('/').filter((segment) => segment.length > 0 && segment !== '.');
    const target = path.resolve(root, ...segments);
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    if (stat.isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const type = MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
    const range = req.headers.range;
    if (range && (type.startsWith('video/') || type.startsWith('audio/'))) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : stat.size - 1;
        res.statusCode = 206;
        res.setHeader('accept-ranges', 'bytes');
        res.setHeader('content-range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('content-type', type);
        res.setHeader('content-length', end - start + 1);
        fs.createReadStream(target, { start, end }).pipe(res);
        return;
      }
    }
    res.statusCode = 200;
    res.setHeader('content-type', type);
    res.setHeader('accept-ranges', 'bytes');
    res.setHeader('content-length', stat.size);
    res.end(fs.readFileSync(target));
  });

  const SAFE_PORT_CANDIDATES = [8231, 8241, 8251, 8261, 8271, 8281, 8291, 8301];
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      const port = portHint ? portHint : (i < SAFE_PORT_CANDIDATES.length ? SAFE_PORT_CANDIDATES[i++] : 0);
      const onError = (error) => {
        server.removeListener('error', onError);
        if (error.code === 'EADDRINUSE' && i <= SAFE_PORT_CANDIDATES.length) return tryNext();
        return reject(error);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError);
        resolve(server);
      });
    };
    tryNext();
  });
}

export const canonicalVirtualPath = (url) => new URL(url).pathname;

/**
 * Proves the shell background video is healthy and playing, then applies the
 * fixed deterministic freeze. Returns the health record and the freeze record.
 */
export async function captureVideoHealthAndFreeze(page, viewportKey) {
  const health = await page.evaluate(() => {
    const video = document.querySelector('video.bg-video');
    if (!video) return { present: false };
    return {
      present: true,
      src_host: new URL(video.currentSrc || video.src).host,
      networkState: video.networkState,
      readyState: video.readyState,
      paused: video.paused,
      muted: video.muted,
      autoplay: video.autoplay,
      loop: video.loop,
      duration: video.duration,
      naturalWidth: video.naturalWidth,
      naturalHeight: video.naturalHeight,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      currentTime: video.currentTime,
      error: video.error ? video.error.code : null,
    };
  });

  const freeze = await page.evaluate(async ({ timestamp, zeroMotionStyle }) => {
    // Same-origin documents, nested iframes included. Adopted templates embed
    // their own iframes, and a video inside a nested frame would otherwise be
    // frozen neither for media nor for animations.
    const documents = [];
    const seen = new Set();
    const visit = (doc, depth) => {
      if (!doc || seen.has(doc) || depth > 4) return;
      seen.add(doc);
      documents.push(doc);
      for (const frame of [...doc.querySelectorAll('iframe')]) {
        let inner = null;
        try { inner = frame.contentDocument; } catch { /* cross-origin: not reachable */ }
        if (inner) visit(inner, depth + 1);
      }
    };
    visit(document, 0);

    // Primary lever: collapse every animation and transition to zero duration in
    // every document before anything else is measured. With a zero duration there
    // is no time-dependent phase left, so an in-flight transition cannot be
    // captured at a different fraction on each side. Without this the screenshot
    // channel settles for 1-2 per 255 rounding noise on blurred or semi
    // transparent regions.
    let zeroMotionDocuments = 0;
    for (const doc of documents) {
      const style = doc.createElement('style');
      style.textContent = zeroMotionStyle;
      doc.documentElement.appendChild(style);
      zeroMotionDocuments += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    const runningCount = () => {
      let running = 0;
      for (const doc of documents) {
        try {
          for (const animation of doc.getAnimations({ subtree: true })) {
            if (animation.playState === 'running') running += 1;
          }
        } catch { /* ignore */ }
      }
      return running;
    };

    // Pausing a media element keeps whatever frame it had already decoded, which
    // depends on wall-clock. Seeking to one fixed timestamp does not, so every
    // media element in every same-origin document is paused AND seeked.
    const pauseAndSeekMedia = async () => {
      const records = [];
      for (const doc of documents) {
        for (const element of doc.querySelectorAll('video,audio')) {
          let host = null;
          try { host = new URL(element.currentSrc || element.src || 'http://none').host; } catch { host = null; }
          try { element.pause(); } catch { /* ignore */ }
          try { element.muted = true; } catch { /* ignore */ }
          const duration = Number.isFinite(element.duration) ? element.duration : null;
          const record = {
            host,
            in_iframe: doc !== document,
            is_shell_background: doc === document && Boolean(element.classList.contains('bg-video')),
            readyState: element.readyState,
            duration,
            naturalWidth: element.naturalWidth || null,
            error: element.error ? element.error.code : null,
            seek: null,
          };
          if (element.readyState >= 1) {
            const target = duration !== null ? Math.min(timestamp, Math.max(0, duration - 0.05)) : timestamp;
            const seeked = await new Promise((resolve) => {
              element.addEventListener('seeked', () => resolve(true), { once: true });
              setTimeout(() => resolve(false), 20000);
            });
            element.currentTime = target;
            await new Promise((resolve) => setTimeout(resolve, 250));
            try { element.pause(); } catch { /* ignore */ }
            record.seek = {
              requested: timestamp,
              target,
              currentTime: element.currentTime,
              seeked_event: seeked,
              readyState: element.readyState,
            };
          }
          record.paused = element.paused;
          records.push(record);
        }
      }
      return records;
    };

    // A paused @keyframes animation still renders whatever phase it was in, and a
    // paused transition still renders whatever fraction it had completed. Both are
    // pinned to one fixed instant before pausing: the settled end of their own
    // time line, so the captured frame shows revealed content rather than the
    // pre-reveal state.
    const pinAnimations = () => {
      const perDocument = [];
      for (let index = 0; index < documents.length; index++) {
        const doc = documents[index];
        let animations = 0;
        let keyframes = 0;
        let transitions = 0;
        try {
          for (const animation of doc.getAnimations({ subtree: true })) {
            try {
              const timing = animation.effect && typeof animation.effect.getComputedTiming === 'function'
                ? animation.effect.getComputedTiming()
                : null;
              const isKeyframe = Boolean(animation.animationName && animation.animationName !== 'none');
              // Pin to the settled end of the animation's own time line, never to
              // phase 0. Phase 0 of a fade-in reveal is opacity:0, which would
              // render the pre-reveal state instead of the revealed content.
              const duration = timing && Number.isFinite(timing.duration) && timing.duration > 0
                ? timing.duration
                : 1000;
              const offset = timing && Number.isFinite(timing.offset) ? timing.offset : 0;
              const target = timing && Number.isFinite(timing.endTime) ? timing.endTime : offset + duration;
              animation.currentTime = Math.max(0, target);
              if (isKeyframe) keyframes += 1;
              else transitions += 1;
              animation.pause();
            } catch {
              try { animation.pause(); } catch { /* ignore */ }
            }
            animations += 1;
          }
        } catch { /* ignore */ }
        let rafBlocked = false;
        if (index > 0) {
          const win = doc.defaultView;
          try {
            if (win && typeof win.requestAnimationFrame === 'function') {
              win.requestAnimationFrame = () => 0;
              win.cancelAnimationFrame = () => {};
              rafBlocked = true;
            }
          } catch { /* ignore */ }
        }
        perDocument.push({
          animations_paused: animations,
          keyframe_animations_pinned: keyframes,
          transitions_pinned: transitions,
          raf_blocked: rafBlocked,
        });
      }
      return perDocument;
    };

    const media = await pauseAndSeekMedia();
    // A late scroll or intersection observer can create a transition after the
    // media pass. Wait until the animation set has stopped changing before the
    // final pin, so both surfaces pin the same set.
    let stableRounds = 0;
    for (let attempt = 0; attempt < 40 && stableRounds < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      stableRounds = runningCount() === 0 ? stableRounds + 1 : 0;
    }
    const animationsRunningBeforePin = runningCount();
    const perDocument = pinAnimations();
    return {
      method: 'ZERO_MOTION_DURATIONS_PAUSE_AND_SEEK_ALL_MEDIA_PIN_W3C_ANIMATIONS_BLOCK_IFRAME_RAF',
      shell_video_timestamp: timestamp,
      media,
      documents_frozen: documents.length,
      zero_motion_style_injected: zeroMotionDocuments,
      per_document: perDocument,
      animations_running_before_pin: animationsRunningBeforePin,
    };
  }, { timestamp: SHOT_FREEZE_TIMESTAMP, zeroMotionStyle: ZERO_MOTION_STYLE });

  // A callback that is already pending can still fire once, and the override only
  // stops the re-registration. Letting the shell run a few frames lets every
  // iframe loop take that last pass and stop instead of scheduling another. Both
  // surfaces get the identical settle.
  for (let settleFrame = 0; settleFrame < 4; settleFrame += 1) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    await page.waitForTimeout(60);
  }
  return { viewport: viewportKey, health, freeze };
}

/**
 * Proves remote dependency health for fonts, and that every one of the 11
 * source-native `../../` portal paths resolves from the canonical virtual depth.
 */
async function captureRemoteAndPortalEvidence(page, ledgerTargets) {
  return page.evaluate(async (targets) => {
    const styleSheets = [...document.styleSheets].map((sheet) => {
      let href = null;
      try { href = sheet.href; } catch { /* ignore */ }
      return href;
    }).filter(Boolean);
    const fontFaces = [];
    try {
      for (const face of document.fonts) fontFaces.push({ family: face.family, status: face.status });
    } catch { /* ignore */ }

    const portal = [];
    for (const target of targets) {
      let resolved;
      try { resolved = new URL(target.path, location.href).href; } catch (error) { portal.push({ key: target.key, path: target.path, resolve_error: String(error) }); continue; }
      const response = await fetch(resolved, { credentials: 'omit' });
      const buffer = await response.arrayBuffer();
      portal.push({
        key: target.key,
        track: target.track,
        source_native_path: target.path,
        resolved_absolute_url: resolved,
        status: response.status,
        content_length_header: response.headers.get('content-length'),
        body_bytes: buffer.byteLength,
        ledger_bytes: target.ledger_bytes,
        bytes_match_ledger: buffer.byteLength === target.ledger_bytes,
      });
    }
    return {
      stylesheet_hrefs: styleSheets,
      google_fonts_loaded: styleSheets.some((h) => h.includes('fonts.googleapis.com')),
      onlinewebfonts_loaded: styleSheets.some((h) => h.includes('onlinewebfonts.com')),
      document_fonts_status: document.fonts.status,
      font_faces: fontFaces.slice(0, 40),
      portal_targets: portal,
    };
  }, ledgerTargets);
}

/**
 * Captures the comparison payload for the current state. Body-only DOM
 * inventory plus Source runtime state; the <head> glue difference is out of
 * scope by construction.
 */
export async function captureStateData(page) {
  return page.evaluate(({ keyIds, keySelectors }) => {
    const metrics = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        rect: {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        hidden: element.hasAttribute('hidden'),
        ariaHidden: element.getAttribute('aria-hidden'),
      };
    };
    const byId = {};
    for (const id of keyIds) {
      const element = document.getElementById(id);
      byId[id] = element ? metrics(element) : null;
    }
    const bySelector = {};
    for (const selector of keySelectors) {
      const element = document.querySelector(selector);
      bySelector[selector] = element ? metrics(element) : null;
    }

    const portal = window.lovetreePortal || null;
    const viewer = document.getElementById('viewer');
    const viewerFrame = document.getElementById('viewerFrame');
    const worksOverlay = document.getElementById('worksOverlay');
    const menuOverlay = document.getElementById('menuOverlay');
    let iframeProbe = null;
    try {
      if (viewerFrame && !viewer.hidden && viewerFrame.contentDocument) {
        const doc = viewerFrame.contentDocument;
        iframeProbe = {
          accessible: true,
          readyState: doc.readyState,
          title: doc.title,
          body_child_count: doc.body ? doc.body.children.length : null,
          body_html_length: doc.body ? doc.body.innerHTML.length : null,
          element_count: doc.querySelectorAll('*').length,
        };
      } else {
        iframeProbe = { accessible: false, viewer_hidden: viewer.hidden, readyState: viewerFrame ? null : 'no-frame' };
      }
    } catch (error) {
      iframeProbe = { accessible: false, error: String(error) };
    }

    return {
      url: location.href,
      canonical_virtual_path: new URL(location.href).pathname,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        title: document.title,
        html_lang: document.documentElement.getAttribute('lang'),
        element_count: document.querySelectorAll('*').length,
        body_element_count: document.body.querySelectorAll('*').length,
        ids: [...document.querySelectorAll('[id]')].map((element) => element.id),
        classes: [...new Set([...document.querySelectorAll('[class]')].flatMap((element) => (typeof element.className === 'string' ? element.className.split(/\s+/).filter(Boolean) : [])))].sort(),
        data_attributes: [...new Set([...document.querySelectorAll('*')].flatMap((element) => [...element.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`)))].sort(),
        style_tag_count: document.querySelectorAll('style').length,
        link_count: document.querySelectorAll('link').length,
        script_tag_count: document.querySelectorAll('script').length,
        external_script_src: [...document.querySelectorAll('script[src]')].map((element) => element.getAttribute('src')),
        external_link_href: [...document.querySelectorAll('link[href]')].map((element) => element.getAttribute('href')),
        iframe_count: document.querySelectorAll('iframe').length,
        video_count: document.querySelectorAll('video').length,
      },
      body_text: document.body.innerText,
      important_text: {
        title_h1: document.querySelector('h1.hero')?.innerText ?? null,
        meta_blurb: document.querySelector('.blurb')?.innerText ?? null,
        portal_hint: document.querySelector('.portal-hint')?.innerText ?? null,
        preview_no: document.getElementById('previewNo')?.innerText ?? null,
        preview_title: document.getElementById('previewTitle')?.innerText ?? null,
        preview_copy: document.getElementById('previewCopy')?.innerText ?? null,
        viewer_index: document.getElementById('viewerIndex')?.innerText ?? null,
        viewer_title: document.getElementById('viewerTitle')?.innerText ?? null,
        viewer_source: document.getElementById('viewerSource')?.innerText ?? null,
        works_title: document.getElementById('worksTitle')?.innerText ?? null,
        works_row_count: document.querySelectorAll('#worksList .works-row').length,
        works_rows: [...document.querySelectorAll('#worksList .works-row')].map((row) => row.innerText.replace(/\s+/g, ' ').trim()),
      },
      geometry: { by_id: byId, by_selector: bySelector },
      runtime: {
        portal_exposed: Boolean(portal),
        portal_target_count: portal ? portal.targets().length : null,
        portal_keys: portal ? portal.targets().map((target) => target.key) : null,
        portal_tracks: portal ? portal.targets().map((target) => target.track) : null,
        portal_paths: portal ? portal.targets().map((target) => target.path) : null,
        menu_open: menuOverlay.classList.contains('open'),
        menu_aria_hidden: menuOverlay.getAttribute('aria-hidden'),
        works_hidden: worksOverlay.hidden,
        works_aria_modal: worksOverlay.getAttribute('aria-modal'),
        viewer_hidden: viewer.hidden,
        viewer_frame_src: viewerFrame ? viewerFrame.src : null,
        viewer_loading_done: document.getElementById('viewerLoading')?.classList.contains('done') ?? null,
        active_element: (() => {
          const el = document.activeElement;
          return { tag: el ? el.tagName.toLowerCase() : null, id: el?.id ?? null, hidden_ancestor: el ? Boolean(el.closest('[hidden]')) : null };
        })(),
        body_scroll: { width: document.body.scrollWidth, height: document.body.scrollHeight },
        html_scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      },
      iframe: iframeProbe,
    };
  }, { keyIds: KEY_IDS, keySelectors: KEY_SELECTORS });
}

function collectPageHooks(page, sink) {
  page.on('console', (message) => { if (message.type() === 'error') sink.console_errors.push(message.text()); });
  page.on('pageerror', (error) => sink.page_errors.push(String(error && error.message ? error.message : error)));
  page.on('response', (response) => sink.responses.push({ url: response.url(), status: response.status() }));
  page.on('requestfailed', (request) => sink.failed_requests.push({ url: request.url(), error_text: request.failure()?.errorText ?? null }));
}

function classifyRequests(sink) {
  const benignAbort = (entry) => entry.error_text === 'net::ERR_ABORTED';
  return {
    console_errors: sink.console_errors,
    page_errors: sink.page_errors,
    failed_responses: sink.responses.filter((response) => response.status >= 400),
    failed_requests_total: sink.failed_requests.length,
    failed_requests_benign_aborted: sink.failed_requests.filter(benignAbort).length,
    unexpected_failed_requests: sink.failed_requests.filter((entry) => !benignAbort(entry)),
    responses_total: sink.responses.length,
  };
}

async function captureScreenshot(page, outDir, surface, viewportKey, stateName) {
  const dir = path.join(outDir, 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${surface}_${viewportKey}_${stateName}.png`);
  const buffer = await page.screenshot({ path: file, type: 'png' });
  return { file: path.relative(outDir, file), bytes: buffer.length, sha256: sha256(buffer) };
}

/**
 * Measures the pixel-level difference between two screenshot files. Only used
 * for states whose SHA comparison already failed, so the strict byte result is
 * never weakened silently: both numbers are reported.
 *
 * Decoded in a throwaway browser page rather than with an image library, so the
 * runner stays on Playwright and Node built-ins only. Data URLs are same origin,
 * so the canvases are not tainted and getImageData is allowed.
 */
export async function compareScreenshots(fileA, fileB) {
  const urlA = 'data:image/png;base64,' + fs.readFileSync(fileA).toString('base64');
  const urlB = 'data:image/png;base64,' + fs.readFileSync(fileB).toString('base64');

  const browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL, timeout: 60000 });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    const result = await page.evaluate(async ({ urlA, urlB, tolerance }) => {
      const load = (url) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('screenshot decode failed'));
          image.src = url;
        });
      const [imageA, imageB] = await Promise.all([load(urlA), load(urlB)]);
      const pixels = (image) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          data: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data,
        };
      };
      const a = pixels(imageA);
      const b = pixels(imageB);
      if (a.width !== b.width || a.height !== b.height) {
        return {
          size_mismatch: { a: [a.width, a.height], b: [b.width, b.height] },
          differing_pixels: null,
          differing_pixel_ratio: null,
          max_channel_delta_sum: null,
          max_channel_delta: null,
          bbox: null,
          within_tolerance: false,
        };
      }
      let differing = 0;
      let maxSum = 0;
      let maxChannel = 0;
      let minX = a.width;
      let minY = a.height;
      let maxX = -1;
      let maxY = -1;
      for (let i = 0; i < a.data.length; i += 4) {
        let sum = 0;
        for (let channel = 0; channel < 4; channel += 1) {
          const delta = Math.abs(a.data[i + channel] - b.data[i + channel]);
          if (delta > maxChannel) maxChannel = delta;
          sum += delta;
        }
        if (sum > 0) {
          differing += 1;
          if (sum > maxSum) maxSum = sum;
          const x = (i / 4) % a.width;
          const y = Math.floor(i / 4 / a.width);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      const total = a.width * a.height;
      const ratio = total > 0 ? differing / total : 0;
      return {
        size_mismatch: null,
        frame: { width: a.width, height: a.height },
        differing_pixels: differing,
        differing_pixel_ratio: ratio,
        max_channel_delta_sum: maxSum,
        max_channel_delta: maxChannel,
        bbox: maxX >= 0 ? { x: [minX, maxX], y: [minY, maxY] } : null,
        within_tolerance: ratio <= tolerance.max_differing_pixel_ratio && maxSum <= tolerance.max_channel_delta_sum,
      };
    }, { urlA, urlB, tolerance: SCREENSHOT_TOLERANCE });
    await context.close();
    return result;
  } finally {
    await browser.close().catch(() => {});
  }
}


/**
 * Opens the WORKS navigator from a real Source control. On mobile the menu has
 * to be open first, because the desktop nav is hidden there.
 */
async function openWorksFromNav(page, mobile) {
  if (mobile) {
    const open = await page.evaluate(() => document.getElementById('menuOverlay').classList.contains('open'));
    if (!open) {
      await page.locator('#menuOpen').click();
      await page.waitForFunction(() => document.getElementById('menuOverlay').classList.contains('open'), null, { timeout: 8000 });
    }
    await page.locator('#menuNav [data-open-works]').click();
  } else {
    await page.locator('.desktop-nav [data-open-works]').click();
  }
  await page.waitForFunction(() => document.getElementById('worksOverlay').hidden === false, null, { timeout: 8000 });
}

async function enterState(page, { viewport, state }) {
  const mobile = viewport.class === 'mobile';
  if (state === 'INITIAL') return;

  if (state === 'MENU_OPEN') {
    if (!mobile) throw new Error(`MENU_OPEN is not part of the ${viewport.key} matrix`);
    await page.locator('#menuOpen').click();
    await page.waitForFunction(() => document.getElementById('menuOverlay').classList.contains('open'), null, { timeout: 8000 });
    return;
  }

  if (state === 'WORKS_OPEN') {
    await openWorksFromNav(page, mobile);
    return;
  }

  if (state === 'VIEWER_TRACK02' || state === 'VIEWER_TRACK59') {
    // Portal key 01 -> adopted Track 02, portal key 09 -> adopted Track 59.
    // The previous viewer is closed first so the WORKS row that opens the next
    // template is always hit by a real unobstructed click on both surfaces.
    const portalKey = state === 'VIEWER_TRACK02' ? '01' : '09';
    const expectedTrack = state === 'VIEWER_TRACK02' ? '02' : '59';
    const viewerOpen = await page.evaluate(() => document.getElementById('viewer').hidden === false);
    if (viewerOpen) {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('viewer').hidden === true, null, { timeout: 8000 });
    }
    const worksOpen = await page.evaluate(() => document.getElementById('worksOverlay').hidden === false);
    if (!worksOpen) await openWorksFromNav(page, mobile);
    await page.locator(`#worksList [data-template="${portalKey}"]`).click();
    await page.waitForFunction((track) => document.getElementById('viewerIndex').textContent === track, expectedTrack, { timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('viewer').hidden === false, null, { timeout: 8000 });
    await page.waitForFunction(() => document.getElementById('viewerLoading').classList.contains('done'), null, { timeout: 180000 });
    return;
  }

  if (state === 'ESC_FROM_VIEWER') {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('viewer').hidden === true, null, { timeout: 8000 });
    return;
  }

  throw new Error(`unknown state ${state}`);
}

async function captureInteractions(page, viewport) {
  const mobile = viewport.class === 'mobile';
  const worksTrigger = mobile ? '#menuNav [data-open-works]' : '.desktop-nav [data-open-works]';

  const openWorks = async () => {
    if (mobile) {
      const open = await page.evaluate(() => document.getElementById('menuOverlay').classList.contains('open'));
      if (!open) {
        await page.locator('#menuOpen').click();
        await page.waitForFunction(() => document.getElementById('menuOverlay').classList.contains('open'), null, { timeout: 8000 });
      }
    }
    await page.locator(worksTrigger).click();
    await page.waitForFunction(() => document.getElementById('worksOverlay').hidden === false, null, { timeout: 8000 });
  };

  const reset = async () => {
    await page.evaluate(() => {
      window.lovetreePortal.closeViewer();
      window.lovetreePortal.closeWorks();
      document.getElementById('menuOverlay').classList.remove('open');
      document.getElementById('menuOverlay').setAttribute('aria-hidden', 'true');
    });
    await page.waitForTimeout(200);
  };

  const result = {
    works_close_button: null,
    viewer_close_button: null,
    esc_priority: null,
    home_logo_reset: null,
    mobile_menu_close: null,
  };

  // captureInteractions runs after the state matrix, which leaves the viewer and
  // WORKS overlay open. Every overlay sits above the z-index:10 navbar, so the
  // first real click would be intercepted. Both surfaces are reset to INITIAL
  // first so every probe starts from the identical baseline.
  await reset();

  // The Source restores focus to its module-level last-focus element from a
  // focus/blur-driven path rather than synchronously inside the close handler,
  // so an immediately-read activeElement catches the pre-restore state and the
  // recorded focus target ends up depending on frame scheduling. Both surfaces
  // get the identical settle: two painted frames plus a fixed 50ms.
  const settleFocus = async () => {
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }),
    );
    await page.waitForTimeout(50);
  };

  // WORKS close via the dedicated close button.
  await openWorks();
  const focusBeforeWorksClose = await page.evaluate(() => document.activeElement?.id ?? null);
  await page.locator('#worksClose').click();
  await settleFocus();
  result.works_close_button = await page.evaluate((focusBefore) => ({
    works_hidden_after: document.getElementById('worksOverlay').hidden,
    viewer_hidden_after: document.getElementById('viewer').hidden,
    focus_id_after: document.activeElement?.id ?? null,
    focus_before: focusBefore,
  }), focusBeforeWorksClose);
  await reset();

  // Viewer close via the dedicated close button.
  await openWorks();
  await page.locator('#worksList [data-template="01"]').click();
  await page.waitForFunction(() => document.getElementById('viewerLoading').classList.contains('done'), null, { timeout: 120000 });
  const viewerSrcBefore = await page.evaluate(() => document.getElementById('viewerFrame').src);
  await page.locator('#viewerClose').click();
  result.viewer_close_button = await page.evaluate((before) => ({
    viewer_hidden_after: document.getElementById('viewer').hidden,
    viewer_frame_src_after: document.getElementById('viewerFrame').src,
    frame_reset_to_blank: document.getElementById('viewerFrame').src === 'about:blank',
    viewer_src_before: before,
  }), viewerSrcBefore);
  await reset();

  // ESC priority: the Source checks viewer, then WORKS, then the mobile menu.
  // openTemplate() hides WORKS, so both overlays are re-opened through the
  // Source's own QA hook (manifest qa_hook = window.lovetreePortal) before the
  // escape chain is exercised. Identical on both surfaces.
  await openWorks();
  await page.locator('#worksList [data-template="01"]').click();
  await page.waitForFunction(() => document.getElementById('viewerLoading').classList.contains('done'), null, { timeout: 180000 });
  await page.evaluate(() => window.lovetreePortal.openWorks());
  await page.waitForFunction(() => document.getElementById('worksOverlay').hidden === false, null, { timeout: 8000 });
  const bothOpen = await page.evaluate(() => ({
    viewer_hidden: document.getElementById('viewer').hidden,
    works_hidden: document.getElementById('worksOverlay').hidden,
    menu_open: document.getElementById('menuOverlay').classList.contains('open'),
  }));
  await page.keyboard.press('Escape');
  const afterFirstEscape = await page.evaluate(() => ({
    viewer_hidden: document.getElementById('viewer').hidden,
    works_hidden: document.getElementById('worksOverlay').hidden,
    menu_open: document.getElementById('menuOverlay').classList.contains('open'),
  }));
  await page.keyboard.press('Escape');
  const afterSecondEscape = await page.evaluate(() => ({
    viewer_hidden: document.getElementById('viewer').hidden,
    works_hidden: document.getElementById('worksOverlay').hidden,
  }));
  result.esc_priority = {
    both_overlays_open_before_escape: bothOpen,
    after_first_escape: afterFirstEscape,
    viewer_closed_before_works: afterFirstEscape.viewer_hidden === true && afterFirstEscape.works_hidden === false,
    after_second_escape: afterSecondEscape,
    works_closed_before_menu: afterSecondEscape.works_hidden === true,
  };
  await reset();

  // Home logo reset: the Source handler runs closeViewer + closeWorks +
  // setMenu(false). The logo lives in the z-index:10 navbar, below the menu
  // (z-50), WORKS (z-90) and viewer (z-120) overlays, so no overlay state can be
  // reached by a pointer click on the logo. The overlays are therefore opened
  // through the Source QA hook and the handler is driven with a real DOM click on
  // the element itself. Both surfaces get the identical treatment and the
  // dispatch method is recorded.
  await page.evaluate(() => {
    // Anchor focus on the logo itself first. closeViewer() and closeWorks() both
    // restore the same module-level lastFocus, so the recorded focus target after
    // the click is only meaningful when it starts from a fixed, focusable element
    // rather than from whatever the previous probe left active.
    document.getElementById('homeLogo').focus();
    window.lovetreePortal.openTemplate('01');
    window.lovetreePortal.openWorks();
  });
  await page.waitForFunction(
    () => document.getElementById('viewer').hidden === false && document.getElementById('worksOverlay').hidden === false,
    null,
    { timeout: 20000 },
  );
  const openBeforeHome = await page.evaluate(() => ({
    viewer_hidden: document.getElementById('viewer').hidden,
    works_hidden: document.getElementById('worksOverlay').hidden,
    menu_open: document.getElementById('menuOverlay').classList.contains('open'),
  }));
  await page.evaluate(() => document.getElementById('homeLogo').click());
  await page.waitForFunction(
    () => document.getElementById('viewer').hidden === true && document.getElementById('worksOverlay').hidden === true,
    null,
    { timeout: 20000 },
  );
  await settleFocus();
  result.home_logo_reset = await page.evaluate((before) => ({
    dispatch: 'element.click()',
    before: before,
    viewer_hidden: document.getElementById('viewer').hidden,
    works_hidden: document.getElementById('worksOverlay').hidden,
    menu_open: document.getElementById('menuOverlay').classList.contains('open'),
    focus_id_after: document.activeElement?.id ?? null,
  }), openBeforeHome);
  await reset();

  if (mobile) {
    // D2 probe: closing the mobile menu leaves focus on the now-hidden close
    // button. Accepted source defect, must be identical on both surfaces.
    await page.locator('#menuOpen').click();
    await page.waitForFunction(() => document.getElementById('menuOverlay').classList.contains('open'), null, { timeout: 8000 });
    const focusWhenOpen = await page.evaluate(() => document.activeElement?.id ?? null);
    await page.locator('#menuClose').click();
    await settleFocus();
    result.mobile_menu_close = await page.evaluate((focusOpen) => ({
      menu_open_after: document.getElementById('menuOverlay').classList.contains('open'),
      aria_hidden_after: document.getElementById('menuOverlay').getAttribute('aria-hidden'),
      focus_id_after: document.activeElement?.id ?? null,
      focus_id_when_open: focusOpen,
      focus_element_hidden: Boolean(document.activeElement?.closest('[hidden]')) || document.activeElement?.id === 'menuClose',
    }), focusWhenOpen);
  }

  return result;
}

async function captureSurface({ label, url, ports }, ledgerTargets, outDir, head, manifest, splitFingerprints) {
  const results = {
    surface: label,
    url,
    canonical_virtual_path: canonicalVirtualPath(url),
    ports,
    viewports: [],
    interactions: {},
    remote: null,
    portal: null,
  };

  const allSinks = [];
  for (const viewport of VIEWPORTS) {
    const sink = { console_errors: [], page_errors: [], responses: [], failed_requests: [] };
    allSinks.push(sink);

    // One dedicated browser PROCESS per viewport. Reusing a single browser
    // across contexts leaves shared GPU/compositor state behind, which shows up
    // as a 1-3 per 255 rasterisation shift on soft-gradient and backdrop-filter
    // regions. Measured directly: the same surface captured twice in two
    // contexts of one browser differed by 9,683 pixels (maxDeltaSum 11) while
    // the same capture in two fresh processes was byte-identical. A dedicated
    // process per viewport removes that axis entirely.
    const viewportBrowser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL, timeout: 60000 });
    const stateContext = await viewportBrowser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'no-preference' });
    const statePage = await stateContext.newPage();
    collectPageHooks(statePage, sink);

    try {
      const response = await statePage.goto(url, { waitUntil: 'load', timeout: 60000 });
      if (!response || response.status() !== 200) throw new Error(`${label} ${viewport.key}: HTTP ${response?.status()}`);
      await statePage.waitForFunction(() => Boolean(window.lovetreePortal), null, { timeout: 20000 });
      await statePage.evaluate(() => document.fonts.ready);
      await statePage.waitForTimeout(1500);

      const states = [];
      for (const stateName of STATE_MATRIX[viewport.class]) {
        await enterState(statePage, { viewport, state: stateName });
        await statePage.waitForTimeout(SETTLE_MS);
        await statePage.evaluate(() => document.fonts.ready);
        const { health, freeze } = await captureVideoHealthAndFreeze(statePage, viewport.key);
        const data = await captureStateData(statePage);
        const screenshot = await captureScreenshot(statePage, outDir, label, viewport.key, stateName);
        states.push({ state: stateName, url: data.url, data, video: { health, freeze }, screenshot });
      }

      // Portal + remote evidence comes from a clean INITIAL document. The 11
      // portal fetches are viewport-independent, so one probe per surface is
      // enough and keeps the run bounded.
      if (viewport.key === VIEWPORTS[0].key) {
        const probeContext = await viewportBrowser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'no-preference' });
        const probePage = await probeContext.newPage();
        collectPageHooks(probePage, sink);
        try {
          const probeResponse = await probePage.goto(url, { waitUntil: 'load', timeout: 60000 });
          if (!probeResponse || probeResponse.status() !== 200) throw new Error(`${label} portal probe: HTTP ${probeResponse?.status()}`);
          await probePage.waitForFunction(() => Boolean(window.lovetreePortal), null, { timeout: 20000 });
          await probePage.evaluate(() => document.fonts.ready);
          await probePage.waitForTimeout(1500);
          const remoteAndPortal = await captureRemoteAndPortalEvidence(probePage, ledgerTargets);
          results.remote = remoteAndPortal;
          results.portal = remoteAndPortal.portal_targets;
        } finally {
          await probeContext.close();
        }
      }

      results.interactions[viewport.key] = await captureInteractions(statePage, viewport);
      results.viewports.push({
        viewport,
        states,
        requests: classifyRequests(sink),
      });
    } finally {
      await stateContext.close().catch(() => {});
      await viewportBrowser.close().catch(() => {});
    }
  }

  results.requests = classifyRequests({
    console_errors: allSinks.flatMap((sink) => sink.console_errors),
    page_errors: allSinks.flatMap((sink) => sink.page_errors),
    responses: allSinks.flatMap((sink) => sink.responses),
    failed_requests: allSinks.flatMap((sink) => sink.failed_requests),
  });
  results.provenance = {
    source_id: SOURCE_ID,
    surface: label,
    exact_head: head,
    authority_sha256: manifest.authority.sha256,
    authority_bytes: manifest.authority.bytes,
    split_fingerprints: splitFingerprints,
    capture_surface_mode: manifest.capture_surface?.mode,
    required_serving: manifest.capture_surface?.required_serving,
    browser_channel: BROWSER_CHANNEL,
    browser_processes_per_viewport: 1,
    reduced_motion: 'no-preference',
    viewport_order: VIEWPORTS.map((v) => v.key),
    state_matrix: STATE_MATRIX,
    settle_ms: SETTLE_MS,
    shot_freeze_timestamp: SHOT_FREEZE_TIMESTAMP,
    state_count: results.viewports.reduce((total, viewport) => total + viewport.states.length, 0),
  };
  return results;
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a), bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function diffPaths(a, b, prefix = '') {
  const out = [];
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    if (!Object.is(a, b)) out.push(prefix || '(root)');
    return out;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!Object.prototype.hasOwnProperty.call(a, key) || !Object.prototype.hasOwnProperty.call(b, key)) {
      out.push(`${path} (missing side: ${Object.prototype.hasOwnProperty.call(a, key) ? 'split' : 'original'})`);
      continue;
    }
    if (!deepEqual(a[key], b[key])) {
      if (typeof a[key] === 'object' && typeof b[key] === 'object' && a[key] !== null && b[key] !== null) out.push(...diffPaths(a[key], b[key], path));
      else out.push(path);
    }
  }
  return out;
}

const LOOPBACK_ORIGIN = /^https?:\/\/127\.0\.0\.1:\d+/;

/**
 * The two surfaces must be served from different ports, so every absolute URL the
 * Source builds from its own relative `../../` path carries a different origin on
 * each side. That is a harness property, not a Source difference. Origins are
 * normalised for comparison only; the raw values stay in the per-surface capture
 * files.
 */
export function stripOrigins(value) {
  if (typeof value === 'string') return value.replace(LOOPBACK_ORIGIN, '<origin>');
  if (Array.isArray(value)) return value.map(stripOrigins);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [key, other] of Object.entries(value)) out[key] = stripOrigins(other);
    return out;
  }
  return value;
}

export function isHeadGlueDiff(entry) {
  return HEAD_GLUE_DIFF_FIELDS.some((field) => entry === field || entry.startsWith(`${field}.`) || entry.startsWith(`${field} `));
}

export async function runContextParity(options) {
  const { repoRoot, originalRoot, splitRoot, outDir, head, manifest, ledgerTargets, splitFingerprints } = options;
  fs.mkdirSync(outDir, { recursive: true });
  // The review bundle must be reproducible from one run: a previous run's
  // difference copies would otherwise survive inside diffs/ and be mistaken for
  // this run's result.
  fs.rmSync(path.join(outDir, 'diffs'), { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'diffs'), { recursive: true });

  const servers = [];
  const originalServer = await startVirtualRootServer(originalRoot);
  const splitServer = await startVirtualRootServer(splitRoot);
  servers.push(originalServer, splitServer);
  const originalPort = originalServer.address().port;
  const splitPort = splitServer.address().port;
  // The ledger stores the virtual document path without a leading slash. A document
  // URL needs one, and [ ] must be percent-encoded or the URL parser reads them as
  // an IPv6 host. Both surfaces are therefore compared on the URL pathname form
  // (leading slash, percent-encoded), which is what location.pathname reports.
  const canonicalPath = new URL("/" + String(ledgerTargets.virtual_document_path).replace(/^\/+/, ""), "http://127.0.0.1").pathname;
  const originalUrl = new URL(canonicalPath, `http://127.0.0.1:${originalPort}`).toString();
  const splitUrl = new URL(canonicalPath, `http://127.0.0.1:${splitPort}`).toString();



  // captureSurface() launches a dedicated browser process per viewport, so there
  // is no shared browser to hold here.
  let original = null;
  let split = null;
  let comparison = null;
  try {
    original = await captureSurface({ label: 'original', url: originalUrl, ports: { original: originalPort, split: splitPort } }, ledgerTargets.targets, outDir, head, manifest, splitFingerprints);
    split = await captureSurface({ label: 'split', url: splitUrl, ports: { original: originalPort, split: splitPort } }, ledgerTargets.targets, outDir, head, manifest, splitFingerprints);
    comparison = await compareSurfaces(original, split, { canonicalPath, head, originalRoot, splitRoot, outDir });
  } finally {
    for (const server of servers) await new Promise((resolve) => server.close(resolve));
  }

  fs.writeFileSync(path.join(outDir, 'comparison.json'), JSON.stringify({ schema_version: '1.0', source_id: SOURCE_ID, generated_at: new Date().toISOString(), exact_head: head, repo_root: repoRoot, original_root: originalRoot, split_root: splitRoot, comparison }, null, 2));
  fs.writeFileSync(path.join(outDir, 'runtime-health.json'), JSON.stringify({
    schema_version: '1.0',
    source_id: SOURCE_ID,
    generated_at: new Date().toISOString(),
    exact_head: head,
    remote_video_and_fonts: { original: original.remote, split: split.remote },
    portal_resolution: { original: original.portal, split: split.portal },
    video_freeze_records: {
      original: original.viewports.flatMap((v) => v.states.map((s) => ({ viewport: v.viewport.key, state: s.state, health: s.video.health, freeze: s.video.freeze }))),
      split: split.viewports.flatMap((v) => v.states.map((s) => ({ viewport: v.viewport.key, state: s.state, health: s.video.health, freeze: s.video.freeze }))),
    },
    interactions: { original: original.interactions, split: split.interactions },
    requests: { original: original.requests, split: split.requests },
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'original-capture.json'), JSON.stringify(original, null, 2));
  fs.writeFileSync(path.join(outDir, 'split-capture.json'), JSON.stringify(split, null, 2));

  for (const stateComparison of comparison.states) {
    // SHA mismatch is the review trigger; the tolerance only decides whether it
    // blocks, so a within-tolerance difference still gets copied for the eye.
    if (stateComparison.screenshot_sha_equal) continue;
    const base = path.join(outDir, 'diffs');
    for (const surface of ['original', 'split']) {
      const src = path.join(outDir, stateComparison.screenshots[surface].file);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(base, path.basename(src)));
    }
  }

  return comparison;
}

/** D2 is a mobile-only defect; read the first mobile viewport that ran it. */
function firstMobileMenuClose(interactions) {
  for (const entry of Object.values(interactions || {})) {
    if (entry && entry.mobile_menu_close !== null && entry.mobile_menu_close !== undefined) return entry.mobile_menu_close;
  }
  return null;
}

async function compareSurfaces(original, split, { canonicalPath, head, originalRoot, splitRoot, outDir }) {
  const states = [];
  for (const [vi, oViewport] of original.viewports.entries()) {
    const sViewport = split.viewports[vi];
    if (!sViewport || !deepEqual(oViewport.viewport, sViewport.viewport)) throw new Error('viewport matrix mismatch');
    for (const [si, oState] of oViewport.states.entries()) {
      const sState = sViewport.states[si];
      if (!sState || oState.state !== sState.state) throw new Error(`state order mismatch at ${oViewport.viewport.key}`);
      const oData = stripOrigins(oState.data);
      const sData = stripOrigins(sState.data);
      const dataDiff = diffPaths(oData, sData);
      const headGlueDiff = dataDiff.filter(isHeadGlueDiff);
      const bodyDiff = dataDiff.filter((entry) => !isHeadGlueDiff(entry));
      const oReq = oViewport.requests, sReq = sViewport.requests;
      const screenshotShaEqual = oState.screenshot.sha256 === sState.screenshot.sha256 && oState.screenshot.bytes === sState.screenshot.bytes;
      // Only states whose bytes already differ get the measured pixel comparison,
      // so the strict result is never weakened silently.
      const screenshotPixelDiff = screenshotShaEqual
        ? null
        : await compareScreenshots(path.join(outDir, oState.screenshot.file), path.join(outDir, sState.screenshot.file));
      const screenshotEqual = screenshotShaEqual || Boolean(screenshotPixelDiff && screenshotPixelDiff.within_tolerance);
      states.push({
        viewport: oViewport.viewport.key,
        state: oState.state,
        surface_urls: { original: oState.url, split: sState.url },
        canonical_virtual_path: { original: oData.canonical_virtual_path, split: sData.canonical_virtual_path, equal: oData.canonical_virtual_path === sData.canonical_virtual_path, expected: canonicalPath },
        body_dom_equal: bodyDiff.length === 0,
        body_dom_diff: bodyDiff.slice(0, 40),
        body_dom_diff_count: bodyDiff.length,
        head_glue_diff: headGlueDiff,
        screenshots: { original: oState.screenshot, split: sState.screenshot },
        screenshot_equal: screenshotEqual,
        screenshot_sha_equal: screenshotShaEqual,
        screenshot_pixel_diff: screenshotPixelDiff,
        screenshot_bytes: { original: oState.screenshot.bytes, split: sState.screenshot.bytes },
        video_freeze_equal: deepEqual(oState.video.freeze, sState.video.freeze),
        runtime_state_equal: deepEqual(oData.runtime, sData.runtime),
        runtime_diff: deepEqual(oData.runtime, sData.runtime) ? [] : diffPaths(oData.runtime, sData.runtime).slice(0, 40),
        geometry_equal: deepEqual(oData.geometry, sData.geometry),
        text_equal: deepEqual(oData.body_text, sData.body_text) && deepEqual(oData.important_text, sData.important_text),
        console_errors: { original: oReq.console_errors, split: sReq.console_errors },
        page_errors: { original: oReq.page_errors, split: sReq.page_errors },
        unexpected_failed_requests: { original: oReq.unexpected_failed_requests, split: sReq.unexpected_failed_requests },
        failed_responses: { original: oReq.failed_responses, split: sReq.failed_responses },
        d1_focus_after_viewer_esc: oState.state === 'ESC_FROM_VIEWER'
          ? { original: oState.data.runtime.active_element, split: sState.data.runtime.active_element, equal: deepEqual(oState.data.runtime.active_element, sState.data.runtime.active_element) }
          : null,
      });
    }
  }

  const channels = {
    identity_provenance_equal: deepEqual(
      { ...original.provenance, surface: undefined },
      { ...split.provenance, surface: undefined },
    ),
    canonical_virtual_path_equal: original.canonical_virtual_path === split.canonical_virtual_path,
    same_canonical_depth: original.canonical_virtual_path === split.canonical_virtual_path && original.canonical_virtual_path === canonicalPath,
    state_count: states.length,
    expected_state_count: EXPECTED_STATE_COUNT,
    body_dom_equal: states.every((s) => s.body_dom_equal),
    runtime_state_equal: states.every((s) => s.runtime_state_equal),
    geometry_equal: states.every((s) => s.geometry_equal),
    text_equal: states.every((s) => s.text_equal),
    screenshot_equal: states.every((s) => s.screenshot_equal),
    screenshot_sha_equal: states.every((s) => s.screenshot_sha_equal),
    screenshot_sha_equal_states: states.filter((s) => s.screenshot_sha_equal).length,
    screenshot_pixel_tolerance: SCREENSHOT_TOLERANCE,
    screenshot_pixel_measured: states
      .filter((s) => !s.screenshot_sha_equal)
      .map((s) => ({
        viewport: s.viewport,
        state: s.state,
        differing_pixels: s.screenshot_pixel_diff?.differing_pixels ?? null,
        differing_pixel_ratio: s.screenshot_pixel_diff?.differing_pixel_ratio ?? null,
        max_channel_delta_sum: s.screenshot_pixel_diff?.max_channel_delta_sum ?? null,
        max_channel_delta: s.screenshot_pixel_diff?.max_channel_delta ?? null,
        within_tolerance: s.screenshot_pixel_diff?.within_tolerance ?? false,
      })),
    video_freeze_equal: states.every((s) => s.video_freeze_equal),
    console_errors_original: original.requests.console_errors.length,
    console_errors_split: split.requests.console_errors.length,
    page_errors_original: original.requests.page_errors.length,
    page_errors_split: split.requests.page_errors.length,
    unexpected_failed_requests_original: original.requests.unexpected_failed_requests.length,
    unexpected_failed_requests_split: split.requests.unexpected_failed_requests.length,
    failed_responses_original: original.requests.failed_responses.length,
    failed_responses_split: split.requests.failed_responses.length,
    interactions_equal: deepEqual(stripOrigins(original.interactions), stripOrigins(split.interactions)),
    interactions_diff: diffPaths(stripOrigins(original.interactions), stripOrigins(split.interactions)).slice(0, 40),
    head_glue_diff_paths: [...new Set(states.flatMap((state) => state.head_glue_diff))].sort(),
    remote_fonts_equal: deepEqual(original.remote && { google: original.remote.google_fonts_loaded, oww: original.remote.onlinewebfonts_loaded, status: original.remote.document_fonts_status }, split.remote && { google: split.remote.google_fonts_loaded, oww: split.remote.onlinewebfonts_loaded, status: split.remote.document_fonts_status }),
    portal_resolution_original: original.portal.filter((p) => p.status === 200 && p.bytes_match_ledger).length,
    portal_resolution_split: split.portal.filter((p) => p.status === 200 && p.bytes_match_ledger).length,
    portal_target_count: original.portal.length,
    portal_paths_equal: deepEqual(original.portal.map((p) => p.source_native_path), split.portal.map((p) => p.source_native_path)),
    d1_original: states.find((s) => s.state === 'ESC_FROM_VIEWER')?.d1_focus_after_viewer_esc?.original ?? null,
    d1_split: states.find((s) => s.state === 'ESC_FROM_VIEWER')?.d1_focus_after_viewer_esc?.split ?? null,
    d1_equal: states.find((s) => s.state === 'ESC_FROM_VIEWER')?.d1_focus_after_viewer_esc?.equal ?? null,
    d2_original: firstMobileMenuClose(original.interactions) ?? null,
    d2_split: firstMobileMenuClose(split.interactions) ?? null,
    d2_equal: deepEqual(firstMobileMenuClose(original.interactions) ?? null, firstMobileMenuClose(split.interactions) ?? null),
  };

  const blockers = [];
  if (channels.state_count !== EXPECTED_STATE_COUNT) blockers.push(`state_count ${channels.state_count} != ${EXPECTED_STATE_COUNT}`);
  if (!channels.body_dom_equal) blockers.push('BODY_DOM_DIFF');
  if (!channels.runtime_state_equal) blockers.push('RUNTIME_STATE_DIFF');
  if (!channels.geometry_equal) blockers.push('GEOMETRY_DIFF');
  if (!channels.text_equal) blockers.push('TEXT_DIFF');
  if (!channels.screenshot_equal) blockers.push('VISUAL_PARITY_DIFF');
  if (!channels.video_freeze_equal) blockers.push('VIDEO_FREEZE_DIFF');
  if (!channels.same_canonical_depth) blockers.push('CANONICAL_DEPTH_MISMATCH');
  if (!channels.interactions_equal) blockers.push('INTERACTION_DIFF');
  if (!channels.d1_equal) blockers.push('D1_FOCUS_DRIFT');
  if (!channels.d2_equal) blockers.push('D2_FOCUS_DRIFT');
  if (channels.console_errors_original || channels.console_errors_split) blockers.push('CONSOLE_ERRORS');
  if (channels.page_errors_original || channels.page_errors_split) blockers.push('PAGE_ERRORS');
  if (channels.unexpected_failed_requests_original || channels.unexpected_failed_requests_split) blockers.push('UNEXPECTED_FAILED_REQUESTS');
  if (channels.failed_responses_original || channels.failed_responses_split) blockers.push('FAILED_RESPONSES');
  if (channels.portal_resolution_original !== channels.portal_target_count) blockers.push('PORTAL_RESOLUTION_ORIGINAL_INCOMPLETE');
  if (channels.portal_resolution_split !== channels.portal_target_count) blockers.push('PORTAL_RESOLUTION_SPLIT_INCOMPLETE');
  if (!channels.portal_paths_equal) blockers.push('PORTAL_PATH_DRIFT');
  if (!channels.remote_fonts_equal) blockers.push('REMOTE_FONT_DRIFT');

  return {
    schema_version: '1.0',
    source_id: SOURCE_ID,
    exact_head: head,
    authority_sha256: original.provenance.authority_sha256,
    original_root: originalRoot,
    split_root: splitRoot,
    original_url: original.url,
    split_url: split.url,
    screenshot_determinism_method: 'ZERO_MOTION_DURATIONS_PAUSE_AND_SEEK_ALL_MEDIA_PIN_W3C_ANIMATIONS_BLOCK_IFRAME_RAF',
    channels,
    blockers,
    verdict: blockers.length === 0 ? 'READY_FOR_CENTRAL_S4_VISUAL_REVIEW' : `HOLD_${blockers.join('+')}`,
    states,
  };
}



