"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  V24_CHUNK_RAW,
  V24_CHUNK_TRIGGER,
  V24_Q_OFFSET,
  V24_RIBBON_HEIGHT,
  computeQ,
  clampTravel,
  v24InitState,
  v24MakeSample,
  v24AppendSample,
  v24RecordHistory,
  v24RewindStep,
  v24RayFromPointer,
  v24RibbonHitTest,
  type V24SimState,
  type V24Chunk,
} from "@/lib/lineage-67-v24/engine";
import {
  perspective,
  viewMatrix,
  multiply,
  project,
  type Mat4,
  RIBBON_VERTEX_SHADER,
  RIBBON_FRAGMENT_SHADER,
} from "@/lib/lineage-67-v24/webgl";
import { LINEAGE_67_V24_WORKS_V242_OWNER_SET } from "@/lib/lineage-67-v24/source";

// ---------------------------------------------------------------------------
// Source-faithful camera (V2.4.2 "works" build).
//
// The source renders AND hit-tests from a FIXED overhead vantage looking at the
// world origin; the ribbon is drawn in absolute world coordinates near origin.
//   camera(): eye=(orbit||proofCam)?spherical:[0,10.4,12.8]; tar=[0,0,0];
//            P=persp(38*PI/180, aspect, .1, 80); V=look(eye,tar,UP); VP=P*V.
// This is the EXACT VP rebuilt by getHitCandidates / onPointerDown, so the
// reported expected surface identity is native truth — the same pipeline.
// ---------------------------------------------------------------------------
const V24_CAMERA_EYE: readonly [number, number, number] = [0, 10.4, 12.8];
const V24_CAMERA_TARGET: readonly [number, number, number] = [0, 0, 0];
const V24_CAMERA_FOV = (38 * Math.PI) / 180;
const V24_CAMERA_NEAR = 0.1;
const V24_CAMERA_FAR = 80;

function v24CameraForward(): [number, number, number] {
  return [
    V24_CAMERA_TARGET[0] - V24_CAMERA_EYE[0],
    V24_CAMERA_TARGET[1] - V24_CAMERA_EYE[1],
    V24_CAMERA_TARGET[2] - V24_CAMERA_EYE[2],
  ];
}

function v24ViewProjection(aspect: number): Mat4 {
  return multiply(
    perspective(V24_CAMERA_FOV, aspect, V24_CAMERA_NEAR, V24_CAMERA_FAR),
    viewMatrix(V24_CAMERA_EYE, v24CameraForward()),
  );
}

// ---------------------------------------------------------------------------
// High-res Moment asset mapping — authoritative source from V2.4.2 package.
// ---------------------------------------------------------------------------

const MOMENT_SEG_LEN = 3.15;
const MOMENT_CYCLE = MOMENT_SEG_LEN * 16;

const MOMENTS_ASSETS = [
  { id: 1, title: "FIRST CLUE STAIRS", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M01_FIRST_CLUE_STAIRS.png", dim: "1536x1024" },
  { id: 2, title: "FAN-A MAIN", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M02_FAN_A_MAIN.png", dim: "1024x1536" },
  { id: 3, title: "EYE MACRO", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M03_EYE_MACRO.png", dim: "1448x1086" },
  { id: 4, title: "PURPLE STAGE", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M04_PURPLE_STAGE.png", dim: "1024x1536" },
  { id: 5, title: "MICROPHONE", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M05_MICROPHONE.png", dim: "1024x1536" },
  { id: 6, title: "INTERVIEW CANDID", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M06_INTERVIEW_CANDID.png", dim: "1024x1536" },
  { id: 7, title: "B/W EDITORIAL", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M07_BW_EDITORIAL.png", dim: "1122x1402" },
  { id: 8, title: "BLUE NOIR", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M08_BLUE_NOIR.png", dim: "1024x1536" },
  { id: 9, title: "CAMERA MOMENT", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M09_CAMERA_MOMENT.png", dim: "1024x1536" },
  { id: 10, title: "POLAROID PORTRAIT", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M10_POLAROID_PORTRAIT.png", dim: "1024x1536" },
  { id: 11, title: "FIRST CLUE KEYFRAME", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M11_FIRST_CLUE_KEYFRAME.jpg", dim: "1536x2562" },
  { id: 12, title: "MY LOVETREE", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M12_MY_LOVETREE.jpg", dim: "1536x2553" },
  { id: 13, title: "FILM STRIP", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M13_FILM_STRIP.png", dim: "2172x724" },
  { id: 14, title: "WARM CANDID", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M14_WARM_CANDID.png", dim: "1024x1536" },
  { id: 15, title: "NATURAL PORTRAIT", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M15_NATURAL_PORTRAIT.png", dim: "1024x1536" },
  { id: 16, title: "WIDE FINAL", src: "/design-lab-assets/lineages/67/v2-4/01_Assets/M16_WIDE_FINAL.png", dim: "1672x941" },
] as const;

function momentFromQ(q: number): number {
  const qw = ((q % MOMENT_CYCLE) + MOMENT_CYCLE) % MOMENT_CYCLE;
  return Math.floor(qw / MOMENT_SEG_LEN) % 16 + 1;
}

// ---------------------------------------------------------------------------
// Read-only native observability for fail-closed acceptance QA (Issue #258).
//
// Why this is native observability, not a test hook:
//  - It does NOT mutate simulation state, it does NOT open/close inspect, and
//    it does NOT inject or fabricate hits.
//  - getHitCandidates() rebuilds the EXACT view-projection matrix the renderer
//    draws with (perspective + viewMatrix, same fov/aspect/eye) and then runs
//    the EXACT ray + v24RibbonHitTest authority that onPointerDown uses, so the
//    reported expected surface identity is native truth — the same pipeline.
//  - It only exists so genuine touchscreen taps can be aimed at real rendered
//    ribbon geometry (deterministic screen coordinates) instead of blind
//    mouse-grid scanning. The actual selection is still performed by the real
//    production pointer handler on the genuine tap.
// ---------------------------------------------------------------------------
interface Track67NativeCandidate {
  x: number;
  y: number;
  expectedKind: "chunk" | "tail";
  expectedSurfaceId: number;
  candidateCount: number;
  candidates: string;
}

interface Track67NativeSnapshot {
  travel: number;
  chunks: number;
  raw: number;
  q: number;
  oldestChunkId: number | null;
  chunkIds: string;
  frozen: boolean;
}

interface Track67NativeDiagnostic {
  getSimSnapshot: () => Track67NativeSnapshot;
  getHitCandidates: () => Track67NativeCandidate[];
}

declare global {
  interface Window {
    __track67Native?: Track67NativeDiagnostic;
  }
}


function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function makeProgram(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

/** Build the vertical ribbon-wall triangles for a polyline — identical to the geometry v24RibbonHitTest intersects. */
function ribbonWallVerts(samples: readonly { x: number; z: number }[], height: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const ax = a.x;
    const az = a.z;
    const bx = b.x;
    const bz = b.z;
    const y0 = 0;
    const y1 = height;
    // triangle 1: (a,0)(b,0)(b,1)
    out.push(ax, y0, az, bx, y0, bz, bx, y1, bz);
    // triangle 2: (a,0)(b,1)(a,1)
    out.push(ax, y0, az, bx, y1, bz, ax, y1, az);
  }
  return out;
}

const HIT_NONE = {
  kind: "none" as const,
  surfaceId: null,
  distance: null,
  candidateCount: 0,
  candidates: "",
  pointerType: null,
};

export default function NativeRenderer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<V24SimState>(v24InitState());
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programsRef = useRef<{ ribbon: WebGLProgram | null }>({
    ribbon: null,
  });
  const [motion, setMotion] = useState<"checking" | "full" | "reduced">("checking");
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<V24Chunk | null>(null);
  const inspectFrozenRef = useRef(false);
  const previousFocusRef = useRef<Element | null>(null);
  const inspectCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  // Bounded, truthful observable of the LAST actual pointer hit. Derived directly
  // from v24RibbonHitTest (the same surface the renderer draws), so a real browser
  // click on the rendered active tail produces a positive "tail" observable and an
  // empty-space click produces "none" — without inventing any new product behavior.
  const [hitInfo, setHitInfo] = useState<{
    kind: "chunk" | "tail" | "none";
    surfaceId: number | null;
    distance: number | null;
    candidateCount: number;
    candidates: string;
    pointerType: string | null;
  }>({ ...HIT_NONE });
  const [hud, setHud] = useState({ travel: 0, chunks: 0, tail: 0, raw: 0, q: 0, oldest: null as number | null });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMotion(query.matches ? "reduced" : "full");
      if (query.matches) setPlaying(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // --- Inspect open / close helpers ---

  const closeInspect = useCallback(() => {
    setInspect(null);
    setHitInfo(HIT_NONE);
    inspectFrozenRef.current = false;
    const prev = previousFocusRef.current;
    if (prev && typeof (prev as HTMLElement).focus === 'function') {
      (prev as HTMLElement).focus();
    } else {
      canvasRef.current?.focus();
    }
  }, []);

  const openInspect = useCallback((chunk: V24Chunk, trigger: Element | null) => {
    previousFocusRef.current = trigger;
    inspectFrozenRef.current = true;
    setInspect(chunk);
  }, []);

  // --- Focus entry into the dialog when it opens ---
  // Deterministic: runs synchronously after React commits the dialog DOM, so the
  // close button receives focus on open with no arbitrary timeout.
  useEffect(() => {
    if (inspect) {
      inspectCloseBtnRef.current?.focus();
    }
  }, [inspect]);

  // --- Read-only native observability (Issue #258) ---

  const getSimSnapshot = useCallback((): Track67NativeSnapshot => {
    const s = simRef.current;
    return {
      travel: s.travel,
      chunks: s.chunks.length,
      raw: s.raw.length,
      q: Number(computeQ(s.travel).toFixed(4)),
      oldestChunkId: s.chunks.length > 0 ? s.chunks[0].id : null,
      chunkIds: s.chunks.map((c) => c.id).join(","),
      frozen: inspectFrozenRef.current,
    };
  }, []);

  const getHitCandidates = useCallback((): Track67NativeCandidate[] => {
    const canvas = canvasRef.current;
    const s = simRef.current;
    if (!canvas) return [];
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return [];
    const aspect = w / h;
    const eye: [number, number, number] = [...V24_CAMERA_EYE];
    const fwd: [number, number, number] = v24CameraForward();
    // Rebuild the EXACT VP matrix used to draw, so projected coordinates describe
    // what is actually rendered (and therefore what the real pointer hit test sees).
    const vp = v24ViewProjection(aspect);
    const out: Track67NativeCandidate[] = [];
    const STRIDE = 6;
    const MAX = 64;
    const segs: Array<{ ax: number; az: number; bx: number; bz: number }> = [];
    for (const c of s.chunks) {
      for (let i = 0; i + 1 < c.samples.length; i += STRIDE) {
        const a = c.samples[i];
        const b = c.samples[i + 1];
        segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
      }
    }
    for (let i = 0; i + 1 < s.raw.length; i += 1) {
      const a = s.raw[i];
      const b = s.raw[i + 1];
      segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
    }
    for (const seg of segs) {
      if (out.length >= MAX) break;
      const mx = (seg.ax + seg.bx) / 2;
      const mz = (seg.az + seg.bz) / 2;
      const proj = project(vp, [mx, V24_RIBBON_HEIGHT / 2, mz]);
      const ndcX = proj[0];
      const ndcY = proj[1];
      const cw = proj[2];
      if (!(cw > 0)) continue; // behind the camera: not a valid tap target
      const sx = ((ndcX + 1) / 2) * w + rect.left;
      const sy = ((1 - ndcY) / 2) * h + rect.top;
      if (sx < rect.left + 6 || sx > rect.right - 6 || sy < rect.top + 6 || sy > rect.bottom - 6) continue;
      // Reconstruct the exact client-space point and run the real hit authority.
      const px = ((sx - rect.left) / w) * 2 - 1;
      const py = 1 - ((sy - rect.top) / h) * 2;
      const ray = v24RayFromPointer(px, py, eye, fwd, V24_CAMERA_FOV, aspect);
      const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT, [s.raw]);
      if (!hit) continue;
      out.push({
        x: sx,
        y: sy,
        expectedKind: hit.kind,
        expectedSurfaceId: hit.chunkId,
        candidateCount: hit.candidates ? hit.candidates.length : 1,
        candidates: hit.candidates
          ? hit.candidates.map((cc) => `${cc.id}:${cc.t.toFixed(3)}`).join(",")
          : `${hit.chunkId}:${hit.t.toFixed(3)}`,
      });
    }
    return out;
  }, []);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.__track67Native = { getSimSnapshot, getHitCandidates };
    return () => {
      delete win.__track67Native;
    };
  }, [getSimSnapshot, getHitCandidates]);

  // Temporary debug: project EVERY strided sample to NDC/screen with raw cw.
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.__track67NativeDebug = () => {
      const canvas = canvasRef.current;
      const s = simRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return { eye: [...V24_CAMERA_EYE], dir: v24CameraForward(), cw: 0 };
      const aspect = w / h;
      const eye: [number, number, number] = [...V24_CAMERA_EYE];
      const fwd: [number, number, number] = v24CameraForward();
      const vp = v24ViewProjection(aspect);
      let inFront = 0, onScreen = 0;
      const samplePt = (sm: { x: number; z: number }) => {
        const proj = project(vp, [sm.x, V24_RIBBON_HEIGHT / 2, sm.z]);
        const cw = proj[2];
        if (cw > 0) inFront++;
        if (cw > 0) {
          const sx = ((proj[0] + 1) / 2) * w + rect.left;
          const sy = ((1 - proj[1]) / 2) * h + rect.top;
          if (sx >= rect.left && sx <= rect.right && sy >= rect.top && sy <= rect.bottom) onScreen++;
        }
      };
      for (const c of s.chunks) {
        for (let i = 0; i < c.samples.length; i += 1) samplePt(c.samples[i]);
      }
      for (let i = 0; i < s.raw.length; i += 1) samplePt(s.raw[i]);
      return { eye, dir: fwd, aspect, inFront, onScreen, canvasW: w, canvasH: h };
    };
    return () => {
      delete win.__track67NativeDebug;
    };
  }, []);

  // --- Escape + Tab containment ---

  useEffect(() => {
    if (!inspect) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeInspect();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = [inspectCloseBtnRef.current].filter(Boolean) as HTMLElement[];
        if (focusable.length === 0) return;
        const current = document.activeElement;
        const idx = focusable.indexOf(current as HTMLElement);
        if (e.shiftKey) {
          const next = idx <= 0 ? focusable.length - 1 : idx - 1;
          e.preventDefault();
          focusable[next].focus();
        } else {
          const next = idx >= focusable.length - 1 ? 0 : idx + 1;
          e.preventDefault();
          focusable[next].focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [inspect, closeInspect]);

  const stepSim = useCallback((dt: number) => {
    const s = simRef.current;
    const speed = 6;
    const stepLen = speed * Math.min(dt, 0.05);
    const spin = s.spin + stepLen * 0.6;
    const a = spin;
    const dir: [number, number, number] = [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6];
    const travel = clampTravel(s.travel + stepLen);
    const np: [number, number, number] = [
      s.pos[0] + dir[0] * stepLen,
      s.pos[1],
      s.pos[2] + dir[2] * stepLen,
    ];
    const sample = v24MakeSample({
      order: s.nextOrder,
      travel,
      x: np[0],
      y: np[1],
      z: np[2],
      spin,
      dir,
    });
    let next = v24AppendSample(s, sample);
    next = v24RecordHistory(next);
    simRef.current = next;
  }, []);

  const renderSim = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;
    const w = canvas.clientWidth || 960;
    const h = canvas.clientHeight || 540;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.84, 0.835, 0.82, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const s = simRef.current;
    const aspect = w / h;
    const vp = v24ViewProjection(aspect);

    const ribbonProg = programsRef.current.ribbon;
    if (!ribbonProg) return;

    gl.useProgram(ribbonProg);
    const uVP = gl.getUniformLocation(ribbonProg, "uVP");
    const uColor = gl.getUniformLocation(ribbonProg, "uColor");
    gl.uniformMatrix4fv(uVP, false, new Float32Array(vp));
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);

    // Static chunk ribbons — the SAME wall geometry used by the hit-test.
    const chunkVerts: number[] = [];
    for (const c of s.chunks) chunkVerts.push(...ribbonWallVerts(c.samples, V24_RIBBON_HEIGHT));
    if (chunkVerts.length > 0) {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunkVerts), gl.DYNAMIC_DRAW);
      gl.uniform3f(uColor, 0.42, 0.55, 0.78);
      gl.drawArrays(gl.TRIANGLES, 0, chunkVerts.length / 3);
      gl.deleteBuffer(vbo);
    }

    // Active raw tail ribbon — the SAME wall geometry used by the hit-test.
    const tailVerts = ribbonWallVerts(s.raw, V24_RIBBON_HEIGHT);
    if (tailVerts.length > 0) {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tailVerts), gl.DYNAMIC_DRAW);
      gl.uniform3f(uColor, 0.95, 0.62, 0.3);
      gl.drawArrays(gl.TRIANGLES, 0, tailVerts.length / 3);
      gl.deleteBuffer(vbo);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      setError("WebGL2 context unavailable in this environment.");
      setMotion("reduced");
      setPlaying(false);
      return;
    }
    glRef.current = gl;
    programsRef.current = {
      ribbon: makeProgram(gl, RIBBON_VERTEX_SHADER, RIBBON_FRAGMENT_SHADER),
    };
    if (!programsRef.current.ribbon) {
      setError("WebGL2 shader program failed to compile/link.");
      return;
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing && motion !== "reduced" && !inspectFrozenRef.current) {
        stepSim(dt);
      }
      renderSim();
      const s = simRef.current;
      setHud({
        travel: Math.round(s.travel),
        chunks: s.chunks.length,
        tail: s.raw.length,
        raw: s.raw.length,
        q: Number(computeQ(s.travel).toFixed(2)),
        // Read-only retention observable: the FIRST-EVER baked chunk must stay
        // present forever (no oldest-chunk eviction).
        oldest: s.chunks.length > 0 ? s.chunks[0].id : null,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, motion, stepSim, renderSim]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    const canvas = canvasRef.current;
    if (e.button !== 0 || !canvas) return;
    if (inspectFrozenRef.current) return;
    // Prevent the canvas from taking focus on pointerdown so the dialog's close
    // button (focused by the open effect) is the stable active element. The
    // canvas is still restored as the trigger on close via previousFocusRef.
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    const eye: [number, number, number] = [...V24_CAMERA_EYE];
    const ray = v24RayFromPointer(ndcX, ndcY, eye, v24CameraForward(), V24_CAMERA_FOV, rect.width / rect.height);
    // Hit-test the SAME rendered ribbon surface: static chunks AND the live active tail.
    const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT, [s.raw]);
    if (hit && hit.kind === 'chunk') {
      const chunk = s.chunks.find((c) => c.id === hit.chunkId) ?? null;
      if (chunk) {
        openInspect(chunk, e.target as Element);
      }
    }
    // Surface the actual hit result as a bounded observable (chunk / tail / none)
    // so the active tail is provably hittable in a real browser, not silently dropped.
    // Read-only observability of the ACTUAL hit computation: selected surface +
    // distance + every positive candidate (ascending t). candidates[0] === the
    // selected nearest hit — nothing is fabricated or injected here.
    setHitInfo(
      hit
        ? {
            kind: hit.kind,
            surfaceId: hit.chunkId,
            distance: Number(hit.t.toFixed(4)),
            candidateCount: hit.candidates ? hit.candidates.length : 1,
            candidates: hit.candidates
              ? hit.candidates.map((c) => `${c.id}:${c.t.toFixed(3)}`).join(",")
              : `${hit.chunkId}:${hit.t.toFixed(3)}`,
            pointerType: e.pointerType ?? null,
          }
        : { kind: "none", surfaceId: null, distance: null, candidateCount: 0, candidates: "", pointerType: e.pointerType ?? null },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (e.key === " ") {
      e.preventDefault();
      simRef.current = v24RewindStep(s);
      setInspect(null);
      setHitInfo(HIT_NONE);
      inspectFrozenRef.current = false;
    } else if (e.key === "Tab") {
      e.preventDefault();
      const next = { ...simRef.current };
      (next as V24SimState & { orbit?: boolean }).orbit = !(next as V24SimState & { orbit?: boolean }).orbit;
      simRef.current = next;
    }
  };

  const worksTargets = LINEAGE_67_V24_WORKS_V242_OWNER_SET;

  return (
    <main className="lt67-native">
      <header className="lt67-native__header">
        <a className="lt67-native__back" href="/design-lab/lineages/67/v2-4/source">
          ← V2.4.2 exact source
        </a>
        <p className="lt67-native__eyebrow">LINEAGE 67 · REVISION V2.4.2 · NATIVE CANDIDATE</p>
        <h1>Persistent World (native WebGL2, source-faithful)</h1>
        <p className="lt67-native__lede">
          V2.4.2 원본의 STATIC CHUNKS + ACTIVE TAIL 구조를 보존합니다. 정적 chunk는 개수 상한 없이
          누적되고 가장 오래된 ribbon도 사라지지 않습니다(112는 bake당 raw sample 수). 활성 tail은
          bake 주기에 의해 자연스럽게 bounding되며, Space rewind는 위치·방향·spin·travel을 과거 상태로
          되돌리고 origin까지 도달합니다. 포인터는 실제 카메라 ray → chunk AABB → ribbon triangle
          교차로 가장 가까운 표면을 선택합니다.
        </p>
      </header>

      <section className="lt67-native__hud" aria-label="runtime state">
        <div><span>travel</span><strong>{hud.travel}</strong></div>
        <div><span>q</span><strong>{hud.q}</strong></div>
        <div><span>static chunks</span><strong>{hud.chunks}</strong></div>
        <div><span>active tail (raw)</span><strong>{hud.tail}</strong></div>
        <div><span>oldest chunk</span><strong>{hud.oldest === null ? "—" : `#${hud.oldest}`}</strong></div>
        <div><span>bake</span><strong>{hud.raw} / {V24_CHUNK_TRIGGER} → {V24_CHUNK_RAW}</strong></div>
        <div>
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? "일시정지" : "재생"}
          </button>
          <button type="button" onClick={() => stepSim(0.05)} disabled={inspect !== null || (motion === "reduced" && playing)}>
            한 걸음
          </button>
        </div>
      </section>

      <div className="lt67-native__stage">
        <canvas
          ref={canvasRef}
          className="lt67-native__canvas"
          tabIndex={inspect ? -1 : 0}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          aria-label="Track 67 V2.4.2 persistent world canvas"
          data-hit-kind={hitInfo.kind}
          data-hit-surface-id={hitInfo.surfaceId ?? ""}
          data-hit-distance={hitInfo.distance ?? ""}
          data-hit-candidate-count={hitInfo.candidateCount}
          data-hit-candidates={hitInfo.candidates}
          data-hit-pointer-type={hitInfo.pointerType ?? ""}
        />
        <p className="lt67-native__hit-status" role="status" aria-live="polite">
          {hitInfo.kind === "chunk"
            ? `static chunk #${hitInfo.surfaceId} selected`
            : hitInfo.kind === "tail"
              ? `active tail (surface ${hitInfo.surfaceId}) selected`
              : "no ribbon surface hit"}
        </p>
        {error && (
          <div className="lt67-native__fallback" role="status">
            {error} (정적 프레임은 표시되지 않습니다. reduced-motion 폴백을 사용하세요.)
          </div>
        )}
        {inspect && (
          <div
            className="lt67-native__inspect"
            role="dialog"
            aria-modal="true"
            aria-label="inspect memory chunk"
            data-inspect-open="true"
            data-inspect-chunk-id={inspect.id}
            data-inspect-q0={inspect.q0}
          >
            <h2>Inspect MEMORY #{inspect.id}</h2>
            <dl>
              <div><dt>order</dt><dd>{inspect.order}</dd></div>
              <div><dt>samples</dt><dd>{inspect.samples.length}</dd></div>
              <div><dt>committed</dt><dd>{inspect.committed}</dd></div>
              <div><dt>travel</dt><dd>{inspect.travel0.toFixed(1)} – {inspect.travel1.toFixed(1)}</dd></div>
              <div><dt>q</dt><dd>{inspect.q0.toFixed(2)} – {inspect.q1.toFixed(2)}</dd></div>
              <div><dt>q offset</dt><dd>{V24_Q_OFFSET}</dd></div>
              {(() => {
                const momentIdx = momentFromQ(inspect.q0);
                const m = MOMENTS_ASSETS[momentIdx - 1];
                if (!m) return null;
                return (
                  <>
                    <div><dt>moment</dt><dd>MOMENT {String(m.id).padStart(2, "0")} — {m.title}</dd></div>
                    <div><dt>source asset</dt><dd>{m.dim}</dd></div>
                  </>
                );
              })()}
            </dl>
            {(() => {
              const momentIdx = momentFromQ(inspect.q0);
              const m = MOMENTS_ASSETS[momentIdx - 1];
              if (!m) return null;
              return (
                <figure className="lt67-native__inspect-asset" data-moment-id={m.id}>
                  <a
                    href={m.src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`원본 고해상도 Moment ${String(m.id).padStart(2, "0")} — ${m.title} 보기 (새 창)`}
                  >
                    <img
                      src={m.src}
                      alt={`Moment ${String(m.id).padStart(2, "0")} — ${m.title} — original high-resolution source asset`}
                      loading="eager"
                      decoding="async"
                    />
                    <figcaption>original high-res copy · {m.dim}</figcaption>
                  </a>
                </figure>
              );
            })()}
            <button
              ref={inspectCloseBtnRef}
              type="button"
              autoFocus
              aria-label="Close Moment inspection"
              onClick={closeInspect}
            >
              닫기
            </button>
          </div>
        )}
      </div>

      <section className="lt67-native__works" aria-label="WORKS — V2.4.2 owner set">
        <p className="lt67-native__works-kicker">WORKS_ · V2.4.2 owner-selected set</p>
        <ul>
          {worksTargets.map((t) => (
            <li key={t.id} className="lt67-native__works-item">
              <span className={`lt67-native__badge lt67-native__badge--${t.status.toLowerCase()}`}>
                {t.status}
              </span>
              <span className="lt67-native__works-label">{t.label}</span>
              <span className="lt67-native__works-sub">{t.sub}</span>
              {t.href ? (
                <a className="lt67-native__works-open" href={t.href}>OPEN WORK ↗</a>
              ) : (
                <button type="button" className="lt67-native__works-open" disabled>
                  OPEN WORK
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="lt67-native__works-note">
          V2.4.2는 61·60을 메뉴에서 제거하고 62 V1.1 / Track 13 Atlas / Living Video Graph를 추가했습니다.
          ENABLED/INTERNAL_STABLE만 실제 route로 연결되며, HOLD/REFERENCE는 href 없이 비활성화됩니다
          (fabricated href 금지).
        </p>
      </section>
    </main>
  );
}
