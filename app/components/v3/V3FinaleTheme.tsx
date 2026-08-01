"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";

interface V3FinaleThemeProps {
  total: number;
  memories: V3PreviewMemory[];
}

const MOOD_COLORS = [
  "#df708f",
  "#69c9b1",
  "#e5b65f",
  "#a875df",
  "#7ea6e2",
  "#ed9b74",
  "#d88fc3",
  "#80b96f",
];

function seededValue(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function V3FinaleTheme({ total, memories }: V3FinaleThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [completed, setCompleted] = useState(false);

  const particles = useMemo(() => {
    const count = 60;
    return Array.from({ length: count }, (_, index) => {
      const seed = index + 7;
      return {
        x: seededValue(seed, 1) * 600 - 300,
        y: seededValue(seed, 2) * 400 - 200,
        z: seededValue(seed, 3) * 200,
        color: MOOD_COLORS[index % MOOD_COLORS.length],
        angle: seededValue(seed, 4) * Math.PI * 2,
        radius: 60 + seededValue(seed, 5) * 140,
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const reducer = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // dark stage with radial glow
      const grad = ctx.createRadialGradient(300, 240, 10, 300, 240, 320);
      grad.addColorStop(0, "rgba(168, 117, 223, 0.35)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const assembled = Math.min(frame / 180, 1);
      particles.forEach((p, index) => {
        const a = p.angle + frame * 0.002 * (index % 2 === 0 ? 1 : -1);
        const reach = 1 - assembled;
        const x = 300 + Math.cos(a) * p.radius * reach + p.x * 0.1;
        const y = 240 + Math.sin(a) * p.radius * reach * 0.6 + p.y * 0.1;
        ctx.beginPath();
        ctx.arc(x, y, 3 + (index % 3), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (assembled >= 1 && !completed) {
        setCompleted(true);
      }
      if (reducer.matches) return;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [particles, completed]);

  return (
    <div aria-label="완성 트리 성장 연출">
      <canvas
        ref={canvasRef}
        width={600}
        height={420}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <span
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "rgba(242,233,248,0.85)",
          fontSize: "0.72rem",
        }}
      >
        {completed ? "러브트리 완성 ✦" : `${total}개의 기억이 모이는 중…`}
      </span>
      <span
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          color: "rgba(242,233,248,0.7)",
          fontSize: "0.66rem",
        }}
      >
        {memories.length}개 순간 · 8 감정의 색 · 1 나만의 트리
      </span>
    </div>
  );
}
