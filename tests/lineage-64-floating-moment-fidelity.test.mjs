import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../app/design-lab/lineages/64/v1-2-1/Lineage64FloatingMomentPortal.tsx", import.meta.url);
const pagePath = new URL("../app/design-lab/lineages/64/v1-2-1/page.tsx", import.meta.url);
const cssPath = new URL("../app/design-lab/lineages/64/v1-2-1/lineage-64.module.css", import.meta.url);

const [component, page, css] = await Promise.all([
  readFile(componentPath, "utf8"),
  readFile(pagePath, "utf8"),
  readFile(cssPath, "utf8"),
]);

test("Lineage 64 keeps source media as poster/preview instead of inventing a playback subsystem", () => {
  assert.doesNotMatch(component, /<video\b/i);
  assert.doesNotMatch(component, /<audio\b/i);
  // css3d-dom only — no WebGL/canvas/THREE conversion
  assert.doesNotMatch(component, /canvas|THREE|WebGL/i);
  assert.match(component, /css3d-dom/);
  assert.match(component, /POSTER \/ PREVIEW ONLY/);
  assert.match(component, /실제 재생 없음/);
});

test("no P4 orbit-index geometry, P2 ordered-frame, or P3 transport is imported", () => {
  assert.doesNotMatch(component, /v4-orbit-selection|design-runtime\/selection|videofigure-turntable/);
  assert.doesNotMatch(component, /ordered-frame|p3-transport/);
});

test("gesture and accessibility boundaries are represented explicitly", () => {
  assert.match(component, /onPointerCancel=\{handlePointerCancel\}/);
  assert.match(component, /onLostPointerCapture=\{handleLostPointerCapture\}/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /aria-labelledby/);
  assert.match(component, /e\.key === "Escape"/);
  assert.match(component, /e\.key !== "Tab"/);
  assert.match(component, /triggerRef\.current\?\.focus/);
  assert.match(component, /aria-live="polite"/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("fake external Link URL is never invented and Link surfaces stay honest", () => {
  assert.doesNotMatch(component, /https?:\/\//);
  assert.match(component, /연결된 소스 없음 \(데모\) · URL 발명 금지/);
});

test("per-Moment fitting metadata is projected onto card and viewer surfaces", () => {
  assert.match(component, /data-fit-mode/);
  assert.match(component, /data-viewer-fit-mode/);
  assert.match(component, /viewerFitMode/);
});

test("responsive fidelity surface covers required and narrow mobile viewports without horizontal overflow", () => {
  assert.match(css, /@media \(max-width:\s*720px\)/);
  assert.match(css, /@media \(max-width:\s*390px\)/);
  assert.match(css, /@media \(max-width:\s*330px\)/);
  assert.match(page, /overflowX: "clip"/);
});
