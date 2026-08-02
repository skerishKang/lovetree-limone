"use client";

import { useEffect, useRef, useState } from "react";

interface V3BloomThemeProps {
  total: number;
}

const PETAL_COLORS = [
  "#b36dff",
  "#a875df",
  "#d88fc3",
  "#e276aa",
  "#c48ab0",
  "#9f7ac5",
  "#bd76ff",
  "#8f5fd8",
];

const PETAL_NAMES = [
  "첫 설렘",
  "무대의 빛",
  "웃음의 날",
  "위로가 된 밤",
  "같은 마음",
  "꿈의 색",
  "기억의 파도",
  "우리의 계절",
];

export default function V3BloomTheme({ total }: V3BloomThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPetal, setSelectedPetal] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!playing) return;

    let frame = 0;
    let raf = 0;
    const reducer = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(300, 260, 8, 300, 260, 320);
      grad.addColorStop(0, "rgba(38, 22, 49, 0.95)");
      grad.addColorStop(1, "rgba(16, 12, 24, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // heart core
      const heartPulse = 1 + Math.sin(frame * 0.03) * 0.08;
      ctx.save();
      ctx.translate(300, 260);
      ctx.scale(heartPulse, heartPulse);
      ctx.beginPath();
      ctx.arc(-10, -6, 9, 0, Math.PI * 2);
      ctx.arc(10, -6, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#e276aa";
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;

      const bloom = Math.min(frame / 300, 1);
      PETAL_COLORS.forEach((color, index) => {
        const angle = (index / PETAL_COLORS.length) * Math.PI * 2 - Math.PI / 2;
        const active = selectedPetal === null || selectedPetal === index;
        const length = (130 + (index % 3) * 34) * bloom;

        // petal ellipse rotated around core
        ctx.save();
        ctx.translate(300, 260);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(length * 0.55, 0, length * 0.52, length * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = active ? 0.5 : 0.12;
        ctx.fill();
        ctx.restore();

        // petals' node dots
        for (let node = 0; node < 10; node += 1) {
          const t = node / 10;
          const px = 300 + Math.cos(angle) * length * t;
          const py = 260 + Math.sin(angle) * length * t;
          const tw = Math.sin(node * 2 + frame * 0.02) * 2;
          ctx.beginPath();
          ctx.arc(px + tw, py + tw, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = active ? 0.7 : 0.14;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      if (reducer.matches) return;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selectedPetal, playing]);

  return (
    <div aria-label="마음꽃 개화 연출">
      <canvas
        ref={canvasRef}
        width={600}
        height={420}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          color: "rgba(242,233,248,0.7)",
          fontSize: "0.66rem",
        }}
      >
        {total}개의 순간이 8개의 꽃잎으로 피어나요
      </div>
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 70,
          display: "grid",
          gridTemplateColumns: "repeat(4, auto)",
          gap: 6,
        }}
        role="group"
        aria-label="꽃잎 선택"
      >
        {PETAL_NAMES.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-pressed={selectedPetal === index}
            onClick={() => setSelectedPetal(selectedPetal === index ? null : index)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.25)",
              background: selectedPetal === index ? PETAL_COLORS[index] : "transparent",
              color: selectedPetal === index ? "#fff" : "rgba(242,233,248,0.8)",
              fontSize: "0.62rem",
              cursor: "pointer",
            }}
          >
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: PETAL_COLORS[index] }} />
            {name}
          </button>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 70,
          color: "rgba(242,233,248,0.8)",
          fontSize: "0.66rem",
        }}
      >
        {selectedPetal === null
          ? "마음꽃 전체"
          : `이어진 순간 162 · 받은 마음 3,842 · ${PETAL_NAMES[selectedPetal]}`}
      </div>
    </div>
  );
}
