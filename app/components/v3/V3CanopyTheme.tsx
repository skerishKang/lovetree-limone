"use client";

import { useEffect, useRef, useState } from "react";

interface V3CanopyThemeProps {
  total: number;
}

const BRANCH_COLORS = [
  "#ef7786",
  "#f0af54",
  "#e5d75d",
  "#6ec59a",
  "#5fb8c7",
  "#6f90df",
  "#a27be0",
  "#dc7cb7",
];

const BRANCH_NAMES = [
  "첫 설렘",
  "무대의 빛",
  "웃음의 날",
  "위로가 된 밤",
  "기억의 파도",
  "같은 마음",
  "꿈의 색",
  "우리의 계절",
];

export default function V3CanopyTheme({ total }: V3CanopyThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
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

      const grad = ctx.createRadialGradient(300, 300, 10, 300, 300, 340);
      grad.addColorStop(0, "rgba(25, 32, 42, 0.9)");
      grad.addColorStop(1, "rgba(9, 11, 17, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // root seed
      ctx.beginPath();
      ctx.arc(300, 300, 8 + Math.sin(frame * 0.02) * 2, 0, Math.PI * 2);
      ctx.fillStyle = "#e5d75d";
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      const growth = Math.min(frame / 240, 1);
      BRANCH_COLORS.forEach((color, index) => {
        const angle = (index / BRANCH_COLORS.length) * Math.PI * 2 - Math.PI / 2;
        const active = selectedBranch === null || selectedBranch === index;
        const length = 90 + (index % 3) * 26;
        const curve = Math.sin(index) * 40;
        const reach = length * growth;
        const x1 = 300;
        const y1 = 300;
        const x2 = 300 + Math.cos(angle) * reach;
        const y2 = 300 + Math.sin(angle) * reach;
        const cx = x1 + Math.cos(angle + 0.5) * curve * growth;
        const cy = y1 + Math.sin(angle + 0.5) * curve * growth;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = active ? 0.85 : 0.16;
        ctx.lineWidth = active ? 2.4 : 1.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // leaves along branch
        const leafCount = 8;
        for (let leaf = 1; leaf <= leafCount; leaf += 1) {
          const t = leaf / leafCount;
          const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
          const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
          const tw = Math.sin(leaf * 1.7 + frame * 0.02);
          ctx.beginPath();
          ctx.arc(px + tw * 3, py + tw * 3, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = active ? 0.55 : 0.12;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      if (reducer.matches) return;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selectedBranch, playing]);

  return (
    <div aria-label="무지개 수관 성장 연출">
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
        {total}개의 기억이 감정의 색으로 자라요
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
        aria-label="감정 가지 선택"
      >
        {BRANCH_NAMES.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-pressed={selectedBranch === index}
            onClick={() => setSelectedBranch(selectedBranch === index ? null : index)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.25)",
              background: selectedBranch === index ? BRANCH_COLORS[index] : "transparent",
              color: selectedBranch === index ? "#fff" : "rgba(242,233,248,0.8)",
              fontSize: "0.62rem",
              cursor: "pointer",
            }}
          >
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: BRANCH_COLORS[index] }} />
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
        {selectedBranch === null
          ? "전체 감정의 수관"
          : `NOW FOLLOWING · ${BRANCH_NAMES[selectedBranch]}의 가지`}
      </div>
    </div>
  );
}
