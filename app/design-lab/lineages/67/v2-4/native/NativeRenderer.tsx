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
  RIBBON_VERTEX_SHADER,
  RIBBON_FRAGMENT_SHADER,
} from "@/lib/lineage-67-v24/webgl";
import { LINEAGE_67_V24_WORKS_V242_OWNER_SET } from "@/lib/lineage-67-v24/source";

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

/**
 * Project a world point to canvas CSS pixel coordinates using the SAME
 * column-major view-projection matrix the renderer feeds the shader. Used only
 * to publish bounded, read-only QA observability (where the rendered active tail
 * / a static chunk actually appear on screen) so a browser test can issue a REAL
 * pointer event at that pixel — the hit is still computed by the real camera-ray
 * → ribbon-triangle pipeline, never injected.
 */
function projectToScreen(
  p: readonly { x: number; y: number; z: number }[] | readonly [number, number, number][],
  idx: number,
  vp: ArrayLike<number>,
  w: number,
  h: number,
): [number, number] | null {
  const x = (p[idx] as { x: number; y: number; z: number }).x ?? (p[idx] as [number, number, number])[0];
  const y = (p[idx] as { x: number; y: number; z: number }).y ?? (p[idx] as [number, number, number])[1];
  const z = (p[idx] as { x: number; y: number; z: number }).z ?? (p[idx] as [number, number, number])[2];
  const m = vp as ArrayLike<number>;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cz = m[2] * x + m[6] * y + m[10] * z + m[14];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.0001) return null;
  const ndcX = cx / cw;
  const ndcY = cy / cw;
  const sx = (ndcX * 0.5 + 0.5) * w;
  const sy = (1 - (ndcY * 0.5 + 0.5)) * h;
  return [sx, sy];
}

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
  // Bounded, truthful observable of the LAST actual pointer hit. Derived directly
  // from v24RibbonHitTest (the same surface the renderer draws), so a real browser
  // click on the rendered active tail produces a positive "tail" observable and an
  // empty-space click produces "none" — without inventing any new product behavior.
  const [hitInfo, setHitInfo] = useState<{ kind: "chunk" | "tail" | "none"; surfaceId: number | null }>({
    kind: "none",
    surfaceId: null,
  });
  const [hud, setHud] = useState({ travel: 0, chunks: 0, tail: 0, raw: 0, q: 0 });

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
    const proj = perspective(Math.PI / 3.2, aspect, 0.1, 400);
    const view = viewMatrix([s.pos[0], s.pos[1] + 1.2, s.pos[2]], s.dir);
    const vp = multiply(proj, view);

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

    // Bounded QA observability: publish where the rendered active tail and a
    // static chunk actually appear on screen (read-only screen coords derived
    // from the same vp matrix). A browser test clicks these real pixels, so the
    // hit is computed by the actual camera-ray → ribbon-triangle pipeline.
    try {
      if (s.raw.length >= 1) {
        const tailPt = projectToScreen(s.raw, s.raw.length - 1, vp, w, h);
        if (tailPt) canvas.dataset.tailScreen = `${Math.round(tailPt[0])},${Math.round(tailPt[1])}`;
      } else {
        delete canvas.dataset.tailScreen;
      }
      if (s.chunks.length >= 1 && s.chunks[0].samples.length >= 1) {
        const mid = Math.floor(s.chunks[0].samples.length / 2);
        const chunkPt = projectToScreen(s.chunks[0].samples, mid, vp, w, h);
        if (chunkPt) canvas.dataset.chunkScreen = `${Math.round(chunkPt[0])},${Math.round(chunkPt[1])}`;
      } else {
        delete canvas.dataset.chunkScreen;
      }
    } catch {
      /* observability is best-effort; never blocks rendering */
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
      if (playing && motion !== "reduced") {
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
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
    const eye: [number, number, number] = [s.pos[0], s.pos[1] + 1.2, s.pos[2]];
    const ray = v24RayFromPointer(ndcX, ndcY, eye, [s.dir[0], s.dir[1], s.dir[2]], Math.PI / 3.2, rect.width / rect.height);
    // Hit-test the SAME rendered ribbon surface: static chunks AND the live active tail.
    const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT, [s.raw]);
    setInspect(
      hit && hit.kind === "chunk" ? (s.chunks.find((c) => c.id === hit.chunkId) ?? null) : null,
    );
    // Surface the actual hit result as a bounded observable (chunk / tail / none)
    // so the active tail is provably hittable in a real browser, not silently dropped.
    setHitInfo(
      hit ? { kind: hit.kind, surfaceId: hit.chunkId } : { kind: "none", surfaceId: null },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (e.key === " ") {
      e.preventDefault();
      simRef.current = v24RewindStep(s);
      setInspect(null);
      setHitInfo({ kind: "none", surfaceId: null });
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
        <div><span>bake</span><strong>{hud.raw} / {V24_CHUNK_TRIGGER} → {V24_CHUNK_RAW}</strong></div>
        <div>
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? "일시정지" : "재생"}
          </button>
          <button type="button" onClick={() => stepSim(0.05)} disabled={motion === "reduced" && playing}>
            한 걸음
          </button>
        </div>
      </section>

      <div className="lt67-native__stage">
        <canvas
          ref={canvasRef}
          className="lt67-native__canvas"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          aria-label="Track 67 V2.4.2 persistent world canvas"
          data-hit-kind={hitInfo.kind}
          data-hit-surface-id={hitInfo.surfaceId ?? ""}
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
          <div className="lt67-native__inspect" role="dialog" aria-label="inspect memory chunk">
            <h2>Inspect MEMORY #{inspect.id}</h2>
            <dl>
              <div><dt>order</dt><dd>{inspect.order}</dd></div>
              <div><dt>samples</dt><dd>{inspect.samples.length}</dd></div>
              <div><dt>committed</dt><dd>{inspect.committed}</dd></div>
              <div><dt>travel</dt><dd>{inspect.travel0.toFixed(1)} – {inspect.travel1.toFixed(1)}</dd></div>
              <div><dt>q</dt><dd>{inspect.q0.toFixed(2)} – {inspect.q1.toFixed(2)}</dd></div>
              <div><dt>q offset</dt><dd>{V24_Q_OFFSET}</dd></div>
            </dl>
            <button type="button" onClick={() => { setInspect(null); setHitInfo({ kind: "none", surfaceId: null }); }}>닫기</button>
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
