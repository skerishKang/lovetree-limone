"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanonicalMoment } from "@/lib/moment-model";
import {
  deriveElectricAuroraFieldStatus,
  projectElectricAuroraMoments,
} from "@/lib/drive-track-18-electric-aurora/authority";
import styles from "./drive-track-18-electric-aurora.module.css";

type Props = { moments: CanonicalMoment[] };

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function DriveTrack18ElectricAurora({ moments }: Props) {
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(moments[0]?.id ?? null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const projected = useMemo(
    () => projectElectricAuroraMoments(moments, selectedMomentId),
    [moments, selectedMomentId],
  );
  const status = useMemo(
    () => deriveElectricAuroraFieldStatus(projected, selectedMomentId),
    [projected, selectedMomentId],
  );
  const selected = projected.find((moment) => moment.isSelected) ?? projected[0] ?? null;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) {
      canvas.dataset.renderer = "css-fallback";
      return;
    }

    const vertex = compileShader(
      gl,
      gl.VERTEX_SHADER,
      `attribute vec3 a_seed;
       uniform float u_time;
       uniform float u_selected;
       uniform float u_reduced;
       uniform float u_aspect;
       varying float v_glow;
       void main(){
         float t = mix(u_time, 0.0, u_reduced);
         float angle = a_seed.x + t * (0.08 + a_seed.z * 0.04);
         float radius = a_seed.y + 0.025 * sin(t * 0.7 + a_seed.z * 8.0);
         float selectedLift = 0.025 * sin(u_selected * 0.7 + a_seed.z * 5.0);
         vec2 p = vec2(cos(angle), sin(angle)) * (radius + selectedLift);
         p.x /= max(u_aspect, 0.6);
         gl_Position = vec4(p, 0.0, 1.0);
         gl_PointSize = 2.0 + 4.0 * (0.5 + 0.5 * sin(a_seed.z * 17.0 + u_selected));
         v_glow = 0.55 + 0.45 * sin(a_seed.z * 11.0 + u_selected);
       }`,
    );
    const fragment = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      `precision mediump float;
       varying float v_glow;
       void main(){
         vec2 q = gl_PointCoord - vec2(0.5);
         if(length(q) > 0.5) discard;
         vec3 cyan = vec3(0.0, 0.90, 1.0);
         vec3 violet = vec3(0.62, 0.36, 1.0);
         gl_FragColor = vec4(mix(cyan, violet, v_glow), 0.78);
       }`,
    );
    if (!vertex || !fragment) {
      canvas.dataset.renderer = "css-fallback";
      return;
    }
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.renderer = "css-fallback";
      return;
    }

    const seeds = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i += 1) {
      const unit = i / 240;
      seeds[i * 3] = unit * Math.PI * 2 * 5.0;
      seeds[i * 3 + 1] = 0.18 + (i % 31) / 31 * 0.62;
      seeds[i * 3 + 2] = ((i * 37) % 101) / 101;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const seedLoc = gl.getAttribLocation(program, "a_seed");
    const timeLoc = gl.getUniformLocation(program, "u_time");
    const selectedLoc = gl.getUniformLocation(program, "u_selected");
    const reducedLoc = gl.getUniformLocation(program, "u_reduced");
    const aspectLoc = gl.getUniformLocation(program, "u_aspect");
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 3, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    canvas.dataset.renderer = "webgl";

    let frame = 0;
    const draw = (now: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, now / 1000);
      gl.uniform1f(selectedLoc, Math.max(0, status.selectedOrdinal ?? 0));
      gl.uniform1f(reducedLoc, reducedMotion ? 1 : 0);
      gl.uniform1f(aspectLoc, width / height);
      gl.drawArrays(gl.POINTS, 0, 240);
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };
    draw(0);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [reducedMotion, status.selectedOrdinal]);

  const moveSelection = (from: number, delta: number) => {
    if (!projected.length) return;
    const next = (from + delta + projected.length) % projected.length;
    const nextMoment = projected[next];
    setSelectedMomentId(nextMoment.id);
    buttonRefs.current[next]?.focus();
  };

  return (
    <main className={styles.shell} data-reduced-motion={reducedMotion ? "true" : "false"}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MYTREE · VISUAL FUNCTION DONOR</p>
          <h1>Memory Core · Electric Aurora</h1>
          <p className={styles.lede}>기존 Tree/Moment를 바꾸지 않고, 같은 기억을 전기 오로라 코어로 바라보는 시각 렌즈입니다.</p>
        </div>
        <div className={styles.truth} aria-label="데이터 권위">
          <strong>Canonical truth</strong>
          <span>Tree / Moment</span>
          <small>새 energy · importance · status 필드 없음</small>
        </div>
      </header>

      <section className={styles.console} aria-labelledby="aurora-field-title">
        <div className={styles.statusRow}>
          <div><span>MEMORIES</span><strong>{status.totalMoments}</strong></div>
          <div><span>SELECTED</span><strong>{status.selectedOrdinal ?? "—"}</strong></div>
          <div><span>MOTION</span><strong>{reducedMotion ? "MANUAL" : "AMBIENT"}</strong></div>
        </div>

        <div className={styles.field}>
          <div className={styles.aurora} aria-hidden="true" />
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" data-testid="electric-aurora-canvas" />
          <div className={styles.core} aria-hidden="true"><span /><i /></div>
          <div className={styles.nodes} aria-label="기억 코어 선택">
            {projected.map((moment, index) => (
              <button
                key={moment.id}
                ref={(node) => { buttonRefs.current[index] = node; }}
                type="button"
                className={styles.node}
                data-slot={index % 8}
                aria-pressed={moment.isSelected}
                aria-label={`${moment.title || `순간 ${index + 1}`} 선택`}
                onClick={() => setSelectedMomentId(moment.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    moveSelection(index, 1);
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    moveSelection(index, -1);
                  }
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <div className={styles.fieldLabel}>
            <span id="aurora-field-title">LIVING MEMORY FIELD</span>
            <strong>{selected?.title || "기억을 선택하세요"}</strong>
          </div>
        </div>

        <section className={styles.inspector} aria-live="polite" aria-atomic="true">
          <div>
            <p className={styles.eyebrow}>SELECTED MOMENT</p>
            <h2>{selected?.title || "기억 없음"}</h2>
            <p>{selected?.memo || "이 Tree에는 아직 표시할 Moment가 없습니다."}</p>
          </div>
          <dl>
            <div><dt>type</dt><dd>{selected?.sourceType || "—"}</dd></div>
            <div><dt>position</dt><dd>{status.selectedOrdinal ? `${status.selectedOrdinal} / ${status.totalMoments}` : "—"}</dd></div>
            <div><dt>root</dt><dd>{selected?.isRoot ? "FIRST" : "CONNECTED"}</dd></div>
          </dl>
        </section>
      </section>
    </main>
  );
}
