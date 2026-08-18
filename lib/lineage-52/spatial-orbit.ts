export type Vec3 = readonly [number, number, number];
export type Mat4 = readonly number[];

export interface OrbitCameraLimits {
  readonly minPitch: number;
  readonly maxPitch: number;
  readonly minDistance: number;
  readonly maxDistance: number;
}

export interface OrbitCameraState {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
}

export interface OrbitCameraInput {
  readonly yawDelta?: number;
  readonly pitchDelta?: number;
  readonly distanceDelta?: number;
}

export interface OrbitViewportPolicy {
  readonly portrait: boolean;
  readonly fieldOfViewRadians: number;
  readonly baseDistance: number;
  readonly maxDevicePixelRatio: number;
}

export interface SpatialMomentInput {
  readonly id: string;
  readonly label: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly active?: boolean;
}

export interface SpatialMomentProjection extends SpatialMomentInput {
  readonly position: Vec3;
  readonly active: boolean;
}

export interface SpatialConnectionInput {
  readonly id: string;
  readonly sourceMomentId: string;
  readonly targetMomentId: string;
  readonly height?: number;
}

export interface SpatialConnectionProjection extends SpatialConnectionInput {
  readonly source: SpatialMomentProjection;
  readonly target: SpatialMomentProjection;
  readonly points: readonly Vec3[];
  readonly height: number;
}

export interface ConnectionMotionSample {
  readonly reveal: number;
  readonly pulse: number;
  readonly residual: number;
}

export interface PrimitiveTransportEvent {
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

export interface PrimitiveTransportSample {
  readonly progress: number;
  readonly activeEventId: string | null;
  readonly activeEventProgress: number;
}

export interface NativeMotionPolicy {
  readonly prefersReducedMotion: boolean;
  readonly continuousOrbit: boolean;
  readonly animatedPulse: boolean;
  readonly transitionScale: number;
}

export interface CanvasBackingSize {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly devicePixelRatio: number;
}

export const DEFAULT_CAMERA_LIMITS: OrbitCameraLimits = Object.freeze({
  minPitch: -1.05,
  maxPitch: 1.05,
  minDistance: 2.4,
  maxDistance: 7.5,
});

const DEG_TO_RAD = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new TypeError("clamp requires finite numbers");
  }
  if (min > max) throw new RangeError("clamp min must be <= max");
  return Math.min(max, Math.max(min, value));
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaleVec3(v: Vec3, scale: number): Vec3 {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function lengthVec3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function normalizeVec3(v: Vec3): Vec3 {
  const length = lengthVec3(v);
  if (length <= Number.EPSILON) return [0, 0, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const tt = clamp(t, 0, 1);
  return [
    a[0] + (b[0] - a[0]) * tt,
    a[1] + (b[1] - a[1]) * tt,
    a[2] + (b[2] - a[2]) * tt,
  ];
}

export function latLonToSphere(
  latitude: number,
  longitude: number,
  radius = 1,
): Vec3 {
  if (![latitude, longitude, radius].every(Number.isFinite)) {
    throw new TypeError("latLonToSphere requires finite inputs");
  }
  if (radius <= 0) throw new RangeError("sphere radius must be positive");
  const lat = latitude * DEG_TO_RAD;
  const lon = longitude * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return [
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  ];
}

export function perspectiveMatrix(
  fieldOfViewRadians: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  if (
    ![fieldOfViewRadians, aspect, near, far].every(Number.isFinite) ||
    fieldOfViewRadians <= 0 ||
    fieldOfViewRadians >= Math.PI ||
    aspect <= 0 ||
    near <= 0 ||
    far <= near
  ) {
    throw new RangeError("invalid perspective parameters");
  }
  const f = 1 / Math.tan(fieldOfViewRadians / 2);
  const rangeInv = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ];
}

export function lookAtMatrix(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const z = normalizeVec3(subtractVec3(eye, target));
  const x = normalizeVec3(crossVec3(up, z));
  const y = crossVec3(z, x);
  if (lengthVec3(x) <= Number.EPSILON || lengthVec3(y) <= Number.EPSILON) {
    throw new RangeError("lookAt vectors must not be collinear");
  }
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dotVec3(x, eye), -dotVec3(y, eye), -dotVec3(z, eye), 1,
  ];
}

export function createOrbitCamera(
  initial: Partial<OrbitCameraState> = {},
  limits: OrbitCameraLimits = DEFAULT_CAMERA_LIMITS,
): OrbitCameraState {
  return applyOrbitCameraInput(
    {
      yaw: initial.yaw ?? -0.55,
      pitch: initial.pitch ?? 0.22,
      distance: initial.distance ?? 4.15,
    },
    {},
    limits,
  );
}

export function applyOrbitCameraInput(
  state: OrbitCameraState,
  input: OrbitCameraInput,
  limits: OrbitCameraLimits = DEFAULT_CAMERA_LIMITS,
): OrbitCameraState {
  const yawDelta = input.yawDelta ?? 0;
  const pitchDelta = input.pitchDelta ?? 0;
  const distanceDelta = input.distanceDelta ?? 0;
  if (![state.yaw, state.pitch, state.distance, yawDelta, pitchDelta, distanceDelta].every(Number.isFinite)) {
    throw new TypeError("camera state and input must be finite");
  }
  return {
    yaw: state.yaw + yawDelta,
    pitch: clamp(state.pitch + pitchDelta, limits.minPitch, limits.maxPitch),
    distance: clamp(state.distance + distanceDelta, limits.minDistance, limits.maxDistance),
  };
}

export function advanceAutoOrbit(
  state: OrbitCameraState,
  deltaSeconds: number,
  enabled: boolean,
  radiansPerSecond = 0.075,
): OrbitCameraState {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0 || !Number.isFinite(radiansPerSecond)) {
    throw new RangeError("invalid auto-orbit timing");
  }
  if (!enabled || deltaSeconds === 0) return state;
  return { ...state, yaw: state.yaw + deltaSeconds * radiansPerSecond };
}

export function orbitViewportPolicy(width: number, height: number): OrbitViewportPolicy {
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError("viewport dimensions must be positive");
  }
  const portrait = width / height < 0.72;
  return {
    portrait,
    fieldOfViewRadians: (portrait ? 58 : 47) * DEG_TO_RAD,
    baseDistance: portrait ? 4.9 : 4.15,
    maxDevicePixelRatio: 2,
  };
}

export function normalizeDevicePixelRatio(value: number, max = 2): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    throw new RangeError("invalid device pixel ratio");
  }
  return clamp(value || 1, 1, max);
}

export function computeCanvasBackingSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxDevicePixelRatio = 2,
): CanvasBackingSize {
  if (![cssWidth, cssHeight].every(Number.isFinite) || cssWidth <= 0 || cssHeight <= 0) {
    throw new RangeError("canvas CSS dimensions must be positive");
  }
  const dpr = normalizeDevicePixelRatio(devicePixelRatio, maxDevicePixelRatio);
  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * dpr)),
    pixelHeight: Math.max(1, Math.round(cssHeight * dpr)),
    devicePixelRatio: dpr,
  };
}

export function projectMoment(input: SpatialMomentInput, radius = 1.035): SpatialMomentProjection {
  if (!input.id || !input.label) throw new TypeError("Moment projection requires id and label");
  return {
    ...input,
    active: input.active ?? false,
    position: latLonToSphere(input.latitude, input.longitude, radius),
  };
}

export function quadraticBezier(a: Vec3, control: Vec3, b: Vec3, t: number): Vec3 {
  const tt = clamp(t, 0, 1);
  const omt = 1 - tt;
  return [
    omt * omt * a[0] + 2 * omt * tt * control[0] + tt * tt * b[0],
    omt * omt * a[1] + 2 * omt * tt * control[1] + tt * tt * b[1],
    omt * omt * a[2] + 2 * omt * tt * control[2] + tt * tt * b[2],
  ];
}

export function buildArcPoints(
  source: Vec3,
  target: Vec3,
  options: { readonly segments?: number; readonly height?: number } = {},
): readonly Vec3[] {
  const segments = options.segments ?? 48;
  const height = options.height ?? 0.55;
  if (!Number.isInteger(segments) || segments < 2 || !Number.isFinite(height) || height < 0) {
    throw new RangeError("invalid arc options");
  }
  const midpointDirection = normalizeVec3(addVec3(normalizeVec3(source), normalizeVec3(target)));
  const fallbackDirection = normalizeVec3(addVec3(source, target));
  const direction = lengthVec3(midpointDirection) > Number.EPSILON ? midpointDirection : fallbackDirection;
  const radius = Math.max(lengthVec3(source), lengthVec3(target));
  const control = scaleVec3(direction, radius + height);
  const points: Vec3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    points.push(quadraticBezier(source, control, target, index / segments));
  }
  return points;
}

export function projectConnection(
  input: SpatialConnectionInput,
  moments: readonly SpatialMomentProjection[],
  segments = 48,
): SpatialConnectionProjection {
  if (!input.id || !input.sourceMomentId || !input.targetMomentId) {
    throw new TypeError("Connection projection requires stable identity fields");
  }
  const source = moments.find((moment) => moment.id === input.sourceMomentId);
  const target = moments.find((moment) => moment.id === input.targetMomentId);
  if (!source || !target) {
    throw new RangeError(`Connection ${input.id} references an unknown Moment`);
  }
  const height = input.height ?? 0.55;
  return {
    ...input,
    source,
    target,
    height,
    points: buildArcPoints(source.position, target.position, { segments, height }),
  };
}

export function sampleConnectionMotion(progress: number, stagger = 0): ConnectionMotionSample {
  if (![progress, stagger].every(Number.isFinite)) throw new TypeError("motion inputs must be finite");
  const shifted = clamp((progress - stagger) / Math.max(0.0001, 1 - stagger), 0, 1);
  const reveal = shifted;
  const pulse = shifted <= 0 ? 0 : shifted >= 1 ? 1 : shifted;
  const residual = clamp((shifted - 0.35) / 0.65, 0, 1);
  return { reveal, pulse, residual };
}

export function samplePrimitiveTransport(
  progress: number,
  events: readonly PrimitiveTransportEvent[],
): PrimitiveTransportSample {
  const normalized = clamp(progress, 0, 1);
  for (const event of events) {
    if (!event.id || !Number.isFinite(event.start) || !Number.isFinite(event.end) || event.start < 0 || event.end > 1 || event.end <= event.start) {
      throw new RangeError("invalid primitive transport event");
    }
    if (normalized >= event.start && normalized <= event.end) {
      return {
        progress: normalized,
        activeEventId: event.id,
        activeEventProgress: clamp((normalized - event.start) / (event.end - event.start), 0, 1),
      };
    }
  }
  return { progress: normalized, activeEventId: null, activeEventProgress: 0 };
}

export function resolveNativeMotionPolicy(prefersReducedMotion: boolean): NativeMotionPolicy {
  return {
    prefersReducedMotion,
    continuousOrbit: !prefersReducedMotion,
    animatedPulse: !prefersReducedMotion,
    transitionScale: prefersReducedMotion ? 0 : 1,
  };
}

export function cycleMomentId(
  moments: readonly SpatialMomentProjection[],
  currentId: string | null,
  direction: 1 | -1,
): string | null {
  if (moments.length === 0) return null;
  const currentIndex = currentId ? moments.findIndex((moment) => moment.id === currentId) : -1;
  const start = currentIndex < 0 ? (direction === 1 ? -1 : 0) : currentIndex;
  const next = (start + direction + moments.length) % moments.length;
  return moments[next]?.id ?? null;
}
