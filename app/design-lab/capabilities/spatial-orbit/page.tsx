"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import {
  DEFAULT_ORBIT_CAMERA,
  ORBIT_CONNECTIONS,
  ORBIT_MOMENTS,
  projectOrbitNode,
  updateOrbitCamera,
  type OrbitCameraState,
} from "@/lib/capability-prototypes-core";
import "@/app/styles/capability-prototypes-core.css";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function StarfieldCanvas({ onUnavailable }: { onUnavailable: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) {
      onUnavailable();
      return;
    }

    const vertexSource = `
      attribute vec2 position;
      attribute float size;
      varying float alpha;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = size;
        alpha = 0.35 + size * 0.08;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying float alpha;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        if (length(center) > 0.5) discard;
        gl_FragColor = vec4(0.89, 0.94, 1.0, alpha);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      onUnavailable();
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      onUnavailable();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onUnavailable();
      return;
    }
    gl.useProgram(program);

    let seed = 52;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
    const stars: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      stars.push(random() * 2 - 1, random() * 2 - 1, 1 + random() * 2.4);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    const size = gl.getAttribLocation(program, "size");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(size);
    gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 12, 8);

    const draw = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, stars.length / 3);
    };
    draw();
    const resize = () => draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [onUnavailable]);

  return <canvas ref={ref} className="lt-cap-proto__webgl" aria-hidden="true" />;
}

export default function SpatialOrbitPrototypePage() {
  const reducedMotion = useReducedMotion();
  const [camera, setCamera] = useState<OrbitCameraState>(DEFAULT_ORBIT_CAMERA);
  const [selected, setSelected] = useState(ORBIT_MOMENTS[0].id);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setCamera((current) => ({ ...current, reducedMotion }));
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(32, now - previous);
      previous = now;
      setCamera((current) => ({ ...current, yaw: current.yaw + elapsed * 0.004 }));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const viewport = typeof window !== "undefined" && window.innerWidth < 700 ? "mobile" : "desktop";
  const positions = useMemo(
    () => new Map(ORBIT_MOMENTS.map((node) => [node.id, projectOrbitNode(node, camera, viewport)])),
    [camera, viewport],
  );

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setCamera((current) => updateOrbitCamera(current, { deltaX, deltaY }));
  };
  const pointerEnd = () => { drag.current = null; };
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setCamera((current) => updateOrbitCamera(current, { wheel: event.deltaY }));
  };

  const active = ORBIT_MOMENTS.find((node) => node.id === selected) ?? ORBIT_MOMENTS[0];

  return (
    <main className="lt-cap-proto lt-cap-proto--orbit">
      <header className="lt-cap-proto__header">
        <div>
          <Link href="/design-lab">← Design Lab</Link>
          <p className="lt-cap-proto__eyebrow">ISSUE #81 · SPATIAL ORBIT / 3D CONNECTION ARCS</p>
          <h1>Moment 관계를 평면 목록이 아니라<br />깊이가 있는 공간으로 탐색합니다.</h1>
          <p>52 V3의 Earth 미감은 복사하지 않고, orbit · depth · route · pulse · gesture 계약만 synthetic Moment에 적용합니다.</p>
        </div>
        <span className="lt-cap-proto__badge">INTERNAL PROTOTYPE</span>
      </header>

      <section className="lt-cap-proto__orbit-shell">
        <div
          className="lt-cap-proto__orbit-stage"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
          onWheel={wheel}
          tabIndex={0}
          aria-label="Spatial orbit prototype. Drag to rotate and use wheel to change distance."
        >
          {!webglUnavailable ? <StarfieldCanvas onUnavailable={() => setWebglUnavailable(true)} /> : null}
          <div className="lt-cap-proto__orbit-core" aria-hidden="true" />
          <svg className="lt-cap-proto__orbit-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {ORBIT_CONNECTIONS.map((route) => {
              const from = positions.get(route.from)!;
              const to = positions.get(route.to)!;
              const midpointY = Math.max(4, Math.min(from.y, to.y) - 10 - route.intensity * 9);
              return (
                <path
                  key={route.id}
                  d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${midpointY} ${to.x} ${to.y}`}
                  opacity={0.25 + route.intensity * 0.55}
                />
              );
            })}
          </svg>
          {ORBIT_MOMENTS.map((node) => {
            const projected = positions.get(node.id)!;
            return (
              <button
                key={node.id}
                className="lt-cap-proto__orbit-node"
                style={{
                  left: `${projected.x}%`,
                  top: `${projected.y}%`,
                  opacity: projected.opacity,
                  transform: `translate(-50%, -50%) scale(${projected.scale})`,
                  zIndex: Math.round((projected.depth + 1) * 20),
                }}
                aria-pressed={node.id === selected}
                onClick={(event) => { event.stopPropagation(); setSelected(node.id); }}
              >
                <i />
                <span>{node.label}</span>
              </button>
            );
          })}
          {webglUnavailable ? (
            <div className="lt-cap-proto__fallback">WebGL 배경을 사용할 수 없어 DOM/SVG 안전보기로 유지 중입니다.</div>
          ) : null}
        </div>

        <aside className="lt-cap-proto__panel" aria-live="polite">
          <p className="lt-cap-proto__section-label">SELECTED MOMENT</p>
          <h2>{active.label}</h2>
          <dl>
            <div><dt>Media</dt><dd>{active.mediaType}</dd></div>
            <div><dt>Yaw</dt><dd>{camera.yaw.toFixed(1)}°</dd></div>
            <div><dt>Pitch</dt><dd>{camera.pitch.toFixed(1)}°</dd></div>
            <div><dt>Distance</dt><dd>{camera.distance.toFixed(2)}</dd></div>
          </dl>
          <p>드래그/스와이프는 하나의 pointer 경로를 사용하고, wheel은 dolly로만 해석합니다.</p>
          <button type="button" onClick={() => setCamera({ ...DEFAULT_ORBIT_CAMERA, reducedMotion })}>카메라 초기화</button>
        </aside>
      </section>

      <footer className="lt-cap-proto__footer">
        Source evidence: Lineage 52 V2/V3 · #81 · reduced motion={reducedMotion ? "on" : "off"} · no Auth/API/DB
      </footer>
    </main>
  );
}
