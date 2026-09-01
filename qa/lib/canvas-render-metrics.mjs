// Shared canvas render measurement for Source60 (3D Moment Cluster Explorer).
//
// Reason this exists: the previous Source60 QA only asserted that a <canvas>
// element existed. That assertion passed while the canvas backing buffer sat at
// the 300x150 HTML default and every cluster/node/edge was clipped outside it —
// a silent visual failure with zero console/page errors.
//
// These gates assert what the user actually needs to see:
//   1. the backing buffer is sized to the CSS box (not the 300x150 default)
//   2. the surface carries rendered content (not a flat background fill)
//
// Deliberately NOT a pixel-perfect golden test. Thresholds are content-presence
// floors, so legitimate visual polish cannot break CI.

import assert from "node:assert/strict";

// explore canvas paints its background with fillStyle "#08090d".
const BACKGROUND = { r: 8, g: 9, b: 13 };
const BACKGROUND_TOLERANCE = 6;

// The stride adapts so the census samples ~TARGET_SAMPLES pixels regardless of
// canvas size. That keeps the non-background count comparable across the 1440,
// 430 and 390 viewports instead of scaling with resolution.
const TARGET_SAMPLES = 40000;

export async function readCanvasRenderMetrics(page, selector = "canvas") {
  return page.evaluate(({ selector, bg, tol, targetSamples }) => {
    const canvas = document.querySelector(selector);
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let distinctColors = 0;
    let nonBgSamples = 0;
    let sampled = 0;
    let stride = 1;
    let readable = false;

    try {
      const ctx = canvas.getContext("2d");
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const totalPixels = data.length / 4;
        stride = Math.max(1, Math.floor(totalPixels / targetSamples));
        const seen = new Set();
        for (let i = 0; i < data.length; i += 4 * stride) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          seen.add(`${r},${g},${b}`);
          sampled += 1;
          const isBackground =
            Math.abs(r - bg.r) <= tol &&
            Math.abs(g - bg.g) <= tol &&
            Math.abs(b - bg.b) <= tol;
          if (!isBackground) nonBgSamples += 1;
        }
        distinctColors = seen.size;
        readable = true;
      }
    } catch {
      // A tainted canvas cannot be sampled; reported as unreadable below.
      readable = false;
    }

    return {
      cssWidth: Math.round(rect.width),
      cssHeight: Math.round(rect.height),
      nativeWidth: canvas.width,
      nativeHeight: canvas.height,
      inlineHeight: canvas.style.height || null,
      dpr,
      readable,
      stride,
      distinctColors,
      nonBgSamples,
      sampled,
    };
  }, { selector, bg: BACKGROUND, tol: BACKGROUND_TOLERANCE, targetSamples: TARGET_SAMPLES });
}

export function assertCanvasSized(metrics, label, options = {}) {
  const {
    tolerancePx = 8,
  } = options;

  assert.ok(metrics, `${label}: Source60 canvas not found`);

  // The HTML default backing buffer is 300x150. If sizing never ran, both match
  // that default exactly — the precise signature of the regression. We assert
  // against that signature directly instead of a CSS-minimum that would
  // produce false positives on the narrowest supported viewports.
  assert.ok(
    !(metrics.nativeWidth === 300 && metrics.nativeHeight === 150),
    `${label}: canvas backing buffer stuck at the 300x150 HTML default ` +
      `(resize setup did not run after mount)`,
  );

  // The CSS box must also have been measured — the 0x0 signature would mean
  // ResizeObserver registered against an un-rendered stage.
  assert.ok(
    metrics.cssWidth > 0 && metrics.cssHeight > 0,
    `${label}: canvas CSS box is ${metrics.cssWidth}x${metrics.cssHeight} — stage never measured`,
  );

  const expectedWidth = metrics.cssWidth * metrics.dpr;
  const expectedHeight = metrics.cssHeight * metrics.dpr;
  const widthTolerance = Math.max(tolerancePx, expectedWidth * 0.05);
  const heightTolerance = Math.max(tolerancePx, expectedHeight * 0.05);

  assert.ok(
    Math.abs(metrics.nativeWidth - expectedWidth) <= widthTolerance,
    `${label}: canvas.width ${metrics.nativeWidth} does not correspond to ` +
      `CSS width ${metrics.cssWidth} * dpr ${metrics.dpr} (expected ~${Math.round(expectedWidth)})`,
  );
  assert.ok(
    Math.abs(metrics.nativeHeight - expectedHeight) <= heightTolerance,
    `${label}: canvas.height ${metrics.nativeHeight} does not correspond to ` +
      `CSS height ${metrics.cssHeight} * dpr ${metrics.dpr} (expected ~${Math.round(expectedHeight)})`,
  );

  return metrics;
}

export function assertCanvasNonBlank(metrics, label, options = {}) {
  const {
    minDistinctColors = 20,
    minNonBgSamples = 500,
  } = options;

  assert.ok(metrics, `${label}: Source60 canvas not found`);
  assert.ok(metrics.readable, `${label}: Source60 canvas pixel data is not readable`);

  assert.ok(
    metrics.distinctColors > minDistinctColors,
    `${label}: canvas rendered only ${metrics.distinctColors} distinct colors ` +
      `(must exceed ${minDistinctColors}) — the 3D surface is effectively blank`,
  );
  assert.ok(
    metrics.nonBgSamples > minNonBgSamples,
    `${label}: canvas rendered only ${metrics.nonBgSamples} non-background samples ` +
      `(must exceed ${minNonBgSamples}) — no clusters/nodes/edges are visible`,
  );

  return metrics;
}

export async function assertCanvasRendered(page, label, options = {}) {
  const metrics = await readCanvasRenderMetrics(page, options.selector ?? "canvas");
  assertCanvasSized(metrics, label, options);
  assertCanvasNonBlank(metrics, label, options);
  return metrics;
}

// Cluster palette from app/trees/[id]/explore/page.tsx, plus the bridge stroke
// colour. Matching is done on normalised chroma (cosine similarity) rather than
// absolute RGB, because cluster halos are drawn as low-alpha radial gradients
// over the near-black background while nodes are drawn at full opacity.
export const CLUSTER_PALETTE = {
  roots: "#ff9bb3",
  visual: "#7ec8ff",
  stories: "#ffd27e",
  notes: "#a6f0c6",
  bridge: "#c9b6ff",
};

export async function readClusterPaletteHits(page, selector = "canvas") {
  return page.evaluate(({ selector, palette }) => {
    const canvas = document.querySelector(selector);
    if (!canvas) return null;

    const hexToRgb = (hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    const unit = (rgb) => {
      const n = Math.hypot(rgb[0], rgb[1], rgb[2]) || 1;
      return [rgb[0] / n, rgb[1] / n, rgb[2] / n];
    };

    const entries = Object.entries(palette).map(([key, hex]) => [key, unit(hexToRgb(hex))]);
    const hits = Object.fromEntries(Object.keys(palette).map((key) => [key, 0]));

    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return null;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.floor((data.length / 4) / 40000));
    for (let i = 0; i < data.length; i += 4 * stride) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r + g + b < 60) continue; // too close to the background to carry chroma
      const n = Math.hypot(r, g, b) || 1;
      const ur = r / n;
      const ug = g / n;
      const ub = b / n;
      for (const [key, target] of entries) {
        const cosine = ur * target[0] + ug * target[1] + ub * target[2];
        if (cosine > 0.99) { hits[key] += 1; break; }
      }
    }
    return hits;
  }, { selector, palette: CLUSTER_PALETTE });
}
