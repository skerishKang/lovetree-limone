# LoveTree 52 V3 Reference Earth Orbit — Source Analysis

Date: 2026-08-09
Issue: #93
Stacked base: PR #76 / `feat/product-families-design-lab-20260809`

## Exact source identity

Drive source file: `lovetree-52-v3-reference-earth-orbit.html`

- byte size: `1,140,569`
- SHA256: `f8c017f964338a77b4286cc7fe3baed2675e8f6117aff0b83f943c071bf4f45b`
- HTML language: Korean metadata / mostly self-contained JavaScript
- runtime duration: `20.0s`
- external 3D library: **none observed**
- renderer: browser raw WebGL (`canvas.getContext('webgl', { alpha:false, antialias:true, preserveDrawingBuffer:true })`)

The large file size is mainly caused by three embedded textures rather than a framework bundle.

### Embedded texture fingerprints

1. `SURFACE`
   - JPEG
   - 188,686 bytes
   - SHA256 `27109a5602eb60d1fd87a136769fd9f364013d489cba8e993d3aae9b0da7cafa`
2. `LIGHTS`
   - JPEG
   - 159,473 bytes
   - SHA256 `f458169a4e54f81e452e71e33648a8a794331e0a9bf3034e41166dbb0fc76663`
3. `CLOUDS`
   - PNG
   - 489,907 bytes
   - SHA256 `6b9d053414199890c6b75f9ced1e756dd5ccd99a353b90d77e7b97ca5d2a3669`

Do not silently replace these textures and still call the result a source-faithful runner.

## Source architecture

The source is a compact, hand-written WebGL scene rather than a Three.js/React scene.

Observed layers:

- custom vertex/fragment shaders for Earth, cloud, atmosphere, solid objects, lines and points;
- custom matrix functions: identity, multiply, translate, scale, X/Y/Z rotation, perspective and look-at;
- custom sphere geometry;
- custom box geometry for orbit objects;
- explicit WebGL buffers and texture upload;
- Earth day/night/cloud/atmosphere rendering;
- point-star field;
- generated 3D route tubes + center lines;
- moving route pulse drawn as a point along a Bezier route;
- Moment nodes drawn on the Earth surface;
- orbiting foreground/rear objects;
- depth testing and blend-mode changes to create actual front/back occlusion.

## Scene data

### Moment nodes

Ten latitude/longitude seeds are hard-coded in source:

```text
[38,-122]
[20,-95]
[51,-15]
[5,-30]
[-25,-60]
[10,-80]
[-6,20]
[34,50]
[15,-40]
[-30,130]
```

These should become a data adapter in a native extraction rather than remain hard-coded coordinates.

### Connection routes

Twelve route definitions are generated from Moment-node pairs and a route height/color index.

The source creates both:

- a narrow tube;
- a wider additive glow tube;
- a center line;
- a moving point pulse.

This is the core reusable `spatial-orbit-3d` capability primitive.

### Timeline

The 20-second scene contains timed route events with descriptive phases including:

- quiet globe/orbit;
- first connection wave;
- lower sweep;
- primary climax;
- reset/camera drift;
- second wave;
- Moment activation;
- final LoveTree orbit.

A native extraction should externalize this event schedule rather than couple it permanently to the renderer.

## Camera and responsive behavior

Automatic camera drift:

- slow yaw/orbit throughout the scene;
- small vertical and depth oscillation;
- end-state camera depth change.

User controls:

- `pointerdown`
- `pointermove`
- `pointerup`
- `pointercancel`
- pointer capture when available
- horizontal movement updates `userYaw`
- vertical movement updates bounded `userPitch`

Because Pointer Events are used, the same input path supports mouse and touch-capable browsers without a separate touch event implementation.

Responsive behavior:

- source uses `100dvh`;
- portrait threshold is based on canvas aspect ratio `< .72`;
- portrait camera uses a larger Z distance and FOV adjustment;
- source includes a mobile CSS breakpoint at 600px for overlay UI.

## Runtime controls / test API

Visible controls:

- Pause / Play
- Restart
- progress bar

Source exposes:

```text
window.__ORBIT3.duration
window.__ORBIT3.seek(t)
window.__ORBIT3.pause()
window.__ORBIT3.play()
window.__ORBIT3.capture(v)
window.__ORBIT3.state()
```

It also exposes `window.__V3_READY=true` once all three textures are uploaded.

This API should be preserved by the source-runner and can be used by browser QA to make deterministic screenshots at specific scene times.

## Source-runner strategy

Phase 1 should preserve the exact supplied HTML bytes as an internal Design Lab source asset and load them in a same-site sandboxed iframe route.

Recommended route:

`/design-lab/lineages/52/v3`

The wrapper must label the execution mode clearly as:

`SOURCE RUNNER — NOT NATIVE NEXT IMPLEMENTATION`

The runner is for visual/interaction comparison. It is not canonical product code.

## Native extraction strategy

Do not paste the entire IIFE into canonical V4 components.

Extract in this order:

1. `OrbitMath`
   - matrix/vector operations
   - lat/lon projection
   - Bezier route math
2. `OrbitWebGLRenderer`
   - shader/program lifecycle
   - reusable buffers
   - resize/device-pixel-ratio handling
   - cleanup/dispose
3. `EarthOrbitVariant`
   - Earth-specific surface/light/cloud textures
   - Earth/atmosphere rendering
   - orbit-object visual language
4. `SpatialConnectionCapability`
   - Moment-node adapter
   - Connection route adapter
   - route growth/pulse
   - activation state
   - camera interaction
5. `TimelineController`
   - play/pause/restart/seek
   - event schedule
   - deterministic capture hooks
6. React client adapter
   - canvas lifecycle
   - effect cleanup
   - route integration
   - responsive/fallback UI

## Product-data adapter target

The native capability should accept conceptual inputs similar to:

```text
MomentNode {
  id
  position / derived spatial coordinate
  color/emotion token
  activation state
  optional preview reference
}

ConnectionRoute {
  id
  fromMomentId
  toMomentId
  intensity / height
  color token
  reveal window
}
```

Do not hard-wire a social graph. `Connection` remains emotional causality between Moments.

## Mandatory differences between source runner and native implementation

### Source runner

- exact visual source;
- exact embedded textures;
- exact timeline;
- exact source JS;
- iframe isolation;
- no product-data integration required.

### Native implementation

- React lifecycle-safe;
- reusable renderer/capability modules;
- actual LoveTree Moment/Connection adapters;
- cleanup on unmount;
- accessibility fallback;
- reduced-motion strategy;
- performance instrumentation;
- no requirement that Earth remain the universal spatial visual.

## QA targets

See #94. Minimum validation:

- desktop 1280×800;
- mobile 390×844;
- WebGL available/unavailable behavior;
- texture readiness;
- deterministic seek at key event times;
- pointer drag/swipe;
- pause/restart;
- route pulse and depth occlusion;
- portrait camera;
- reduced-motion/fallback for native extraction;
- no outer-page scroll/focus regression.
