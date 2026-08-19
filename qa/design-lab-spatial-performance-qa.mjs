// Issue #79 — bounded Design Lab spatial performance evidence harness.
//
// This is deliberately characterization-only QA. It does NOT encode an FPS,
// heap-size, or leak threshold. It records factual frame-interval and post-GC
// memory/resource observations for representative current routes so later
// regressions can be compared against evidence rather than invented limits.
//
// Output: qa-artifacts/design-lab-spatial-performance/qa-results.json

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.DESIGN_LAB_PERF_QA_URL || "http://127.0.0.1:3000";
const OUT = path.resolve(process.cwd(), "qa-artifacts/design-lab-spatial-performance");
const FRAME_SAMPLE_MS = Number(process.env.DESIGN_LAB_PERF_FRAME_SAMPLE_MS || 3500);
const INTERACTION_CYCLES = Number(process.env.DESIGN_LAB_PERF_INTERACTION_CYCLES || 5);
const NAVIGATION_CYCLES = Number(process.env.DESIGN_LAB_PERF_NAVIGATION_CYCLES || 3);

const ROUTES = [
  { id: "lineage-52-v3", path: "/design-lab/lineages/52/v3", tier: "webgl-source-runner" },
  { id: "track67-v2-4-native", path: "/design-lab/lineages/67/v2-4/native", tier: "webgl-native" },
  { id: "v4-orbit", path: "/v4/subjects/demo/orbit", tier: "spatial-product" },
  { id: "track66-v1-2", path: "/v4/journey?v12=1", tier: "journey-product" },
];

fs.mkdirSync(OUT, { recursive: true });

function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function summarizeFrameIntervals(intervals) {
  const finite = intervals.filter((value) => Number.isFinite(value) && value >= 0);
  const p50 = quantile(finite, 0.5);
  const p95 = quantile(finite, 0.95);
  const max = finite.length ? Math.max(...finite) : null;
  return {
    samples: finite.length,
    p50IntervalMs: round(p50),
    p95IntervalMs: round(p95),
    maxIntervalMs: round(max),
    medianDerivedFps: p50 && p50 > 0 ? round(1000 / p50, 2) : null,
    intervalsOver50Ms: finite.filter((value) => value > 50).length,
  };
}

async function sampleFrameIntervals(page, durationMs) {
  return page.evaluate(
    (sampleMs) =>
      new Promise((resolve) => {
        const intervals = [];
        const start = performance.now();
        let previous = null;

        function frame(now) {
          if (previous !== null) intervals.push(now - previous);
          previous = now;
          if (now - start >= sampleMs) {
            resolve(intervals);
            return;
          }
          requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
      }),
    durationMs,
  );
}

async function exerciseViewport(page) {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const points = [
    [0.2, 0.3],
    [0.5, 0.25],
    [0.8, 0.35],
    [0.75, 0.65],
    [0.5, 0.75],
    [0.25, 0.65],
    [0.5, 0.5],
  ];

  for (const [xRatio, yRatio] of points) {
    await page.mouse.move(viewport.width * xRatio, viewport.height * yRatio, { steps: 8 });
    await page.waitForTimeout(45);
  }

  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(120);
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(120);
}

async function sampleDuringInteraction(page) {
  const framePromise = sampleFrameIntervals(page, FRAME_SAMPLE_MS);
  const deadline = Date.now() + FRAME_SAMPLE_MS - 150;
  while (Date.now() < deadline) {
    await exerciseViewport(page);
  }
  return framePromise;
}

async function readPerformanceMetrics(session) {
  const response = await session.send("Performance.getMetrics");
  return Object.fromEntries(response.metrics.map((metric) => [metric.name, metric.value]));
}

function selectMemoryMetrics(metrics) {
  const names = [
    "JSHeapUsedSize",
    "JSHeapTotalSize",
    "Nodes",
    "Documents",
    "Frames",
    "JSEventListeners",
    "LayoutCount",
    "RecalcStyleCount",
  ];
  return Object.fromEntries(names.map((name) => [name, Number.isFinite(metrics[name]) ? metrics[name] : null]));
}

async function collectPostGcMetrics(session) {
  await session.send("HeapProfiler.collectGarbage").catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 120));
  return selectMemoryMetrics(await readPerformanceMetrics(session));
}

function metricDelta(samples, key) {
  const values = samples.map((sample) => sample[key]).filter(Number.isFinite);
  if (values.length < 2) return null;
  return values[values.length - 1] - values[0];
}

function summarizeMemory(samples) {
  const heapValues = samples.map((sample) => sample.JSHeapUsedSize).filter(Number.isFinite);
  return {
    samples: samples.length,
    firstPostGcHeapBytes: heapValues.length ? heapValues[0] : null,
    lastPostGcHeapBytes: heapValues.length ? heapValues[heapValues.length - 1] : null,
    maxPostGcHeapBytes: heapValues.length ? Math.max(...heapValues) : null,
    postGcHeapDeltaBytes: metricDelta(samples, "JSHeapUsedSize"),
    nodeDelta: metricDelta(samples, "Nodes"),
    documentDelta: metricDelta(samples, "Documents"),
    frameDelta: metricDelta(samples, "Frames"),
    listenerDelta: metricDelta(samples, "JSEventListeners"),
  };
}

async function characterizeRoute(browser, route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const startedAt = new Date().toISOString();
  let response = null;
  let evidenceComplete = false;
  let error = null;
  let result = null;

  try {
    response = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);

    const session = await context.newCDPSession(page);
    await session.send("Performance.enable");

    const initialPostGc = await collectPostGcMetrics(session);
    const idleIntervals = await sampleFrameIntervals(page, FRAME_SAMPLE_MS);
    const interactionIntervals = await sampleDuringInteraction(page);

    const interactionPostGc = [initialPostGc];
    for (let cycle = 0; cycle < INTERACTION_CYCLES; cycle += 1) {
      await exerciseViewport(page);
      interactionPostGc.push(await collectPostGcMetrics(session));
    }

    const navigationPostGc = [];
    for (let cycle = 0; cycle < NAVIGATION_CYCLES; cycle += 1) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(900);
      navigationPostGc.push(await collectPostGcMetrics(session));
    }

    const idleFramePacing = summarizeFrameIntervals(idleIntervals);
    const interactionFramePacing = summarizeFrameIntervals(interactionIntervals);
    const interactionMemory = summarizeMemory(interactionPostGc);
    const navigationMemory = summarizeMemory(navigationPostGc);

    evidenceComplete = Boolean(
      response &&
        response.ok() &&
        idleFramePacing.samples > 0 &&
        interactionFramePacing.samples > 0 &&
        interactionMemory.samples === INTERACTION_CYCLES + 1 &&
        navigationMemory.samples === NAVIGATION_CYCLES &&
        Number.isFinite(interactionMemory.firstPostGcHeapBytes),
    );

    result = {
      route,
      startedAt,
      finishedAt: new Date().toISOString(),
      httpStatus: response?.status() ?? null,
      evidenceComplete,
      characterizationPolicy: {
        passThresholdsApplied: false,
        frameSampleMs: FRAME_SAMPLE_MS,
        interactionCycles: INTERACTION_CYCLES,
        navigationCycles: NAVIGATION_CYCLES,
        memoryObservation: "Chromium CDP Performance metrics after best-effort HeapProfiler.collectGarbage",
      },
      framePacing: {
        idle: idleFramePacing,
        interaction: interactionFramePacing,
      },
      memoryPressure: {
        interactionCycles: {
          summary: interactionMemory,
          samples: interactionPostGc,
        },
        navigationReloadCycles: {
          summary: navigationMemory,
          samples: navigationPostGc,
        },
      },
      runtimeErrors: {
        console: consoleErrors,
        page: pageErrors,
      },
    };
  } catch (caught) {
    error = caught instanceof Error ? caught.stack || caught.message : String(caught);
    result = {
      route,
      startedAt,
      finishedAt: new Date().toISOString(),
      httpStatus: response?.status() ?? null,
      evidenceComplete: false,
      error,
      runtimeErrors: {
        console: consoleErrors,
        page: pageErrors,
      },
    };
  } finally {
    await context.close();
  }

  return result;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-precise-memory-info", "--js-flags=--expose-gc"],
});

const results = [];
try {
  for (const route of ROUTES) {
    // Serial route isolation keeps memory observations attributable to one
    // target instead of mixing multiple live pages in the same context.
    // eslint-disable-next-line no-await-in-loop
    results.push(await characterizeRoute(browser, route));
  }
} finally {
  await browser.close();
}

const report = {
  issue: 79,
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  viewport: { width: 1280, height: 800 },
  policy: {
    purpose: "factual frame pacing and memory-pressure characterization",
    fpsPassThreshold: null,
    memoryPassThreshold: null,
    productBehaviorMutation: false,
  },
  routes: results,
  complete: results.every((result) => result.evidenceComplete),
};

fs.writeFileSync(path.join(OUT, "qa-results.json"), `${JSON.stringify(report, null, 2)}\n`);

const summaryLines = [
  "# Issue #79 spatial performance characterization",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "No FPS or memory pass threshold is applied. Values below are factual evidence only.",
  "",
  "| Route | Idle p50 ms | Idle p95 ms | Interaction p50 ms | Interaction p95 ms | Interaction post-GC heap delta | Reload post-GC heap delta | Evidence |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
];

for (const routeResult of results) {
  const idle = routeResult.framePacing?.idle ?? {};
  const active = routeResult.framePacing?.interaction ?? {};
  const interactionMemory = routeResult.memoryPressure?.interactionCycles?.summary ?? {};
  const navigationMemory = routeResult.memoryPressure?.navigationReloadCycles?.summary ?? {};
  summaryLines.push(
    `| ${routeResult.route.path} | ${idle.p50IntervalMs ?? "n/a"} | ${idle.p95IntervalMs ?? "n/a"} | ${active.p50IntervalMs ?? "n/a"} | ${active.p95IntervalMs ?? "n/a"} | ${interactionMemory.postGcHeapDeltaBytes ?? "n/a"} | ${navigationMemory.postGcHeapDeltaBytes ?? "n/a"} | ${routeResult.evidenceComplete ? "complete" : "incomplete"} |`,
  );
}

fs.writeFileSync(path.join(OUT, "summary.md"), `${summaryLines.join("\n")}\n`);

for (const routeResult of results) {
  console.log(
    JSON.stringify({
      route: routeResult.route.path,
      evidenceComplete: routeResult.evidenceComplete,
      idle: routeResult.framePacing?.idle ?? null,
      interaction: routeResult.framePacing?.interaction ?? null,
      interactionMemory: routeResult.memoryPressure?.interactionCycles?.summary ?? null,
      navigationMemory: routeResult.memoryPressure?.navigationReloadCycles?.summary ?? null,
      pageErrors: routeResult.runtimeErrors?.page?.length ?? 0,
      consoleErrors: routeResult.runtimeErrors?.console?.length ?? 0,
      error: routeResult.error ?? null,
    }),
  );
}

if (!report.complete) {
  process.exitCode = 1;
}
