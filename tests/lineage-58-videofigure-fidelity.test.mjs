import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../app/design-lab/lineages/58/v2/Lineage58VideoFigure.tsx", import.meta.url);
const cssPath = new URL("../app/styles/lineage-58-videofigure.css", import.meta.url);

const [component, css] = await Promise.all([
  readFile(componentPath, "utf8"),
  readFile(cssPath, "utf8"),
]);

test("Lineage 58 keeps source video as provenance instead of inventing a playback subsystem", () => {
  assert.doesNotMatch(component, /<video\b/i);
  assert.doesNotMatch(component, /<audio\b/i);
  assert.match(component, /VIEW SOURCE MOMENT · ADAPTER CONTRACT/);
  assert.match(component, /SOURCE MOMENT/);
  assert.match(component, /sourceMediaId/);
});

test("fake extraction source labels are visibly bounded as simulation", () => {
  assert.match(component, /SOURCE DEMO \/ NON-PERSISTENT \/ SIMULATED/);
  assert.match(component, /SCENE CUT/);
  assert.match(component, /FACE LOCK/);
  assert.match(component, /OUTFIT LOCK/);
  assert.match(component, /8-VIEW BUILD/);
  assert.match(component, /파일을 선택해도 업로드·분석·저장하지 않습니다/);
});

test("gesture and accessibility boundaries are represented explicitly", () => {
  assert.match(component, /onPointerCancel=\{releasePointer\}/);
  assert.match(component, /onLostPointerCapture=/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /aria-pressed=\{saved\.has\(look\.id\)\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /event\.key !== "Tab"/);
  assert.match(component, /triggerRef\.current\?\.focus/);
  assert.match(css, /touch-action:pan-y/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("responsive fidelity surface covers required and narrow mobile viewports without hiding provenance", () => {
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(max-width:330px\)/);
  assert.match(css, /\.lt58-videofigure__provenance\{position:relative/);
  assert.doesNotMatch(css, /\.lt58-videofigure__provenance[^}]*display:none/);
});

test("exact-source image failure renders a hold instead of an approximate substitute", () => {
  assert.match(component, /EXACT SOURCE FRAME HOLD/);
  assert.match(component, /Approximate\/generated substitute is intentionally blocked/);
  assert.match(component, /EXACT_VIDEOFIGURE_ASSET_TRANSFER_HOLD|LINEAGE_58_VIDEOFIGURE_ASSET_HOLD/);
});
