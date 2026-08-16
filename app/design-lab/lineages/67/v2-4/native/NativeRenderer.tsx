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
  CHUNK_VERTEX_SHADER,
  CHUNK_FRAGMENT_SHADER,
  TAIL_VERTEX_SHADER,
  TAIL_FRAGMENT_SHADER,
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

function chunkHeight(id: number): number {
  const r = Math.sin(id * 12.9898) * 43758.5453;
  return 6 + (r - Math.floor(r)) * 30;
}

export default function NativeRenderer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<V24SimState>(v24InitState());
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programsRef = useRef<{ chunk: WebGLProgram | null; tail: WebGLProgram | null }>({
    chunk: null,
    tail: null,
  });
  const [motion, setMotion] = useState<"checking" | "full" | "reduced">("checking");
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<V24Chunk | null>(null);
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

    const chunkProg = programsRef.current.chunk;
    const tailProg = programsRef.current.tail;
    if (!chunkProg || !tailProg) return;

    gl.useProgram(chunkProg);
    const chunkVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, chunkVbo);
    const chunkData: number[] = [];
    for (const c of s.chunks) {
      const cx = (c.minX + c.maxX) / 2;
      const cz = (c.minZ + c.maxZ) / 2;
      chunkData.push(cx, 0, cz, chunkHeight(c.id));
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunkData), gl.DYNAMIC_DRAW);
    const aPosC = 0;
    const aHeightC = 1;
    gl.enableVertexAttribArray(aPosC);
    gl.vertexAttribPointer(aPosC, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aHeightC);
    gl.vertexAttribPointer(aHeightC, 1, gl.FLOAT, false, 16, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(chunkProg, "uVP"), false, new Float32Array(vp));
    gl.drawArrays(gl.POINTS, 0, s.chunks.length);
    gl.disableVertexAttribArray(aPosC);
    gl.disableVertexAttribArray(aHeightC);
    gl.deleteBuffer(chunkVbo);

    gl.useProgram(tailProg);
    const tailVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tailVbo);
    const tailData: number[] = [];
    const n = s.raw.length;
    for (let i = 0; i < n; i += 1) {
      const p = s.raw[i];
      const age = n > 1 ? (n - 1 - i) / (n - 1) : 0;
      tailData.push(p.x, p.y, p.z, age);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tailData), gl.DYNAMIC_DRAW);
    const aPosT = 0;
    const aAgeT = 1;
    gl.enableVertexAttribArray(aPosT);
    gl.vertexAttribPointer(aPosT, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aAgeT);
    gl.vertexAttribPointer(aAgeT, 1, gl.FLOAT, false, 16, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(tailProg, "uVP"), false, new Float32Array(vp));
    if (n > 1) gl.drawArrays(gl.LINE_STRIP, 0, n);
    gl.disableVertexAttribArray(aPosT);
    gl.disableVertexAttribArray(aAgeT);
    gl.deleteBuffer(tailVbo);
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
      chunk: makeProgram(gl, CHUNK_VERTEX_SHADER, CHUNK_FRAGMENT_SHADER),
      tail: makeProgram(gl, TAIL_VERTEX_SHADER, TAIL_FRAGMENT_SHADER),
    };
    if (!programsRef.current.chunk || !programsRef.current.tail) {
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
    const hit = v24RibbonHitTest(ray, s.chunks, V24_RIBBON_HEIGHT);
    setInspect(hit ? (s.chunks.find((c) => c.id === hit.chunkId) ?? null) : null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (e.key === " ") {
      e.preventDefault();
      simRef.current = v24RewindStep(s);
      setInspect(null);
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
        />
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
            <button type="button" onClick={() => setInspect(null)}>닫기</button>
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
