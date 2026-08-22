import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CAMERA_LIMITS,
  applyOrbitCameraInput,
  buildArcPoints,
  computeCanvasBackingSize,
  createOrbitCamera,
  latLonToSphere,
  lookAtMatrix,
  orbitViewportPolicy,
  perspectiveMatrix,
  projectConnection,
  projectMoment,
  resolveNativeMotionPolicy,
  sampleConnectionMotion,
  samplePrimitiveTransport,
} from "../lib/lineage-52/spatial-orbit.ts";
import { createWebGLResourceRegistry } from "../lib/lineage-52/spatial-webgl.ts";

const almostEqual = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ~= ${expected}`);
};

test("lat/lon projection is deterministic and remains on requested sphere radius", () => {
  const first = latLonToSphere(37.5, 127.1, 2.25);
  const second = latLonToSphere(37.5, 127.1, 2.25);
  assert.deepEqual(first, second);
  almostEqual(Math.hypot(...first), 2.25);

  const equator = latLonToSphere(0, 0, 1);
  almostEqual(equator[0], 1);
  almostEqual(equator[1], 0);
  almostEqual(equator[2], 0);
});

test("perspective and lookAt matrices are stable finite 4x4 primitives", () => {
  const projection = perspectiveMatrix(Math.PI / 3, 16 / 9, 0.1, 40);
  const view = lookAtMatrix([0, 0, 4], [0, 0, 0], [0, 1, 0]);
  assert.equal(projection.length, 16);
  assert.equal(view.length, 16);
  assert.ok(projection.every(Number.isFinite));
  assert.ok(view.every(Number.isFinite));
  assert.deepEqual(view, lookAtMatrix([0, 0, 4], [0, 0, 0], [0, 1, 0]));
});

test("arc generation is stable and preserves exact source/target endpoints", () => {
  const source = latLonToSphere(24, -70, 1.035);
  const target = latLonToSphere(-18, 118, 1.035);
  const first = buildArcPoints(source, target, { segments: 24, height: 0.63 });
  const second = buildArcPoints(source, target, { segments: 24, height: 0.63 });
  assert.equal(first.length, 25);
  assert.deepEqual(first, second);
  assert.deepEqual(first[0], source);
  assert.deepEqual(first.at(-1), target);
  assert.ok(Math.max(...first.map((point) => Math.hypot(...point))) > 1.035);
});

test("Moment and Connection projections retain canonical/synthetic identities", () => {
  const moments = [
    projectMoment({ id: "m-a", label: "A", latitude: 15, longitude: 20 }),
    projectMoment({ id: "m-b", label: "B", latitude: -22, longitude: 104 }),
  ];
  const connection = projectConnection(
    { id: "c-a-b", sourceMomentId: "m-a", targetMomentId: "m-b", height: 0.48 },
    moments,
    16,
  );
  assert.equal(connection.id, "c-a-b");
  assert.equal(connection.sourceMomentId, "m-a");
  assert.equal(connection.targetMomentId, "m-b");
  assert.equal(connection.source.id, "m-a");
  assert.equal(connection.target.id, "m-b");
  assert.deepEqual(connection.points[0], moments[0].position);
  assert.deepEqual(connection.points.at(-1), moments[1].position);
});

test("camera input clamps pitch and dolly distance without constraining yaw", () => {
  const initial = createOrbitCamera({ yaw: 0, pitch: 0, distance: 4 });
  const upper = applyOrbitCameraInput(initial, {
    yawDelta: 9,
    pitchDelta: 100,
    distanceDelta: 100,
  });
  assert.equal(upper.yaw, 9);
  assert.equal(upper.pitch, DEFAULT_CAMERA_LIMITS.maxPitch);
  assert.equal(upper.distance, DEFAULT_CAMERA_LIMITS.maxDistance);

  const lower = applyOrbitCameraInput(initial, {
    pitchDelta: -100,
    distanceDelta: -100,
  });
  assert.equal(lower.pitch, DEFAULT_CAMERA_LIMITS.minPitch);
  assert.equal(lower.distance, DEFAULT_CAMERA_LIMITS.minDistance);
});

test("portrait policy and DPR sizing are deterministic and bounded", () => {
  const portrait = orbitViewportPolicy(390, 844);
  const landscape = orbitViewportPolicy(1280, 800);
  assert.equal(portrait.portrait, true);
  assert.equal(landscape.portrait, false);
  assert.ok(portrait.baseDistance > landscape.baseDistance);

  assert.deepEqual(computeCanvasBackingSize(390, 844, 3, 2), {
    cssWidth: 390,
    cssHeight: 844,
    pixelWidth: 780,
    pixelHeight: 1688,
    devicePixelRatio: 2,
  });
});

test("Connection reveal/pulse and deterministic transport sampling remain bounded", () => {
  assert.deepEqual(sampleConnectionMotion(-1), { reveal: 0, pulse: 0, residual: 0 });
  assert.deepEqual(sampleConnectionMotion(2), { reveal: 1, pulse: 1, residual: 1 });
  const middle = sampleConnectionMotion(0.5);
  assert.ok(middle.reveal > 0 && middle.reveal < 1);
  assert.ok(middle.pulse > 0 && middle.pulse < 1);

  const events = [
    { id: "first", start: 0.1, end: 0.3 },
    { id: "second", start: 0.55, end: 0.8 },
  ];
  assert.deepEqual(samplePrimitiveTransport(0, events), {
    progress: 0,
    activeEventId: null,
    activeEventProgress: 0,
  });
  const active = samplePrimitiveTransport(0.2, events);
  assert.equal(active.activeEventId, "first");
  almostEqual(active.activeEventProgress, 0.5);
  assert.deepEqual(active, samplePrimitiveTransport(0.2, events));
});

test("native reduced-motion policy removes continuous nonessential motion only", () => {
  assert.deepEqual(resolveNativeMotionPolicy(false), {
    prefersReducedMotion: false,
    continuousOrbit: true,
    animatedPulse: true,
    transitionScale: 1,
  });
  assert.deepEqual(resolveNativeMotionPolicy(true), {
    prefersReducedMotion: true,
    continuousOrbit: false,
    animatedPulse: false,
    transitionScale: 0,
  });
});

test("WebGL registry owns and disposes buffer/texture/program/shader resources exactly once", () => {
  const deleted = { buffer: 0, texture: 0, program: 0, shader: 0 };
  const gl = {
    deleteBuffer() { deleted.buffer += 1; },
    deleteTexture() { deleted.texture += 1; },
    deleteProgram() { deleted.program += 1; },
    deleteShader() { deleted.shader += 1; },
  };
  const registry = createWebGLResourceRegistry(gl);
  registry.trackBuffer({ kind: "buffer" });
  registry.trackTexture({ kind: "texture" });
  registry.trackProgram({ kind: "program" });
  registry.trackShader({ kind: "shader" });
  assert.deepEqual(registry.snapshot(), {
    buffers: 1,
    textures: 1,
    programs: 1,
    shaders: 1,
    disposed: false,
  });
  registry.dispose();
  registry.dispose();
  assert.deepEqual(deleted, { buffer: 1, texture: 1, program: 1, shader: 1 });
  assert.deepEqual(registry.snapshot(), {
    buffers: 0,
    textures: 0,
    programs: 0,
    shaders: 0,
    disposed: true,
  });
});
