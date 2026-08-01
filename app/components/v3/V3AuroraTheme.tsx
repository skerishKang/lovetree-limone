"use client";

import { useEffect, useRef, useState } from "react";

interface V3AuroraThemeProps {
  total: number;
}

const PALETTES = [
  ["#63d7bc", "#73cbea", "#f1c36a"],
  ["#ef8f83", "#f1c36a", "#63d7bc"],
  ["#a875df", "#63d7bc", "#ef8f83"],
];

export default function V3AuroraTheme({ total }: V3AuroraThemeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [energy, setEnergy] = useState(72);
  const [paletteIndex, setPaletteIndex] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = PALETTES[paletteIndex % PALETTES.length];
    const particles = Array.from({ length: 90 }, (_, index) => ({
      angle: (index / 90) * Math.PI * 2,
      radius: 30 + (index % 6) * 26,
      size: 2 + (index % 3),
      speed: 0.01 + (index % 5) * 0.004,
      color: palette[index % palette.length],
    }));

    let frame = 0;
    let raf = 0;
    const reducer = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(300, 240, 8, 300, 240, 300);
      grad.addColorStop(0, "rgba(11, 39, 33, 0.95)");
      grad.addColorStop(1, "rgba(3, 8, 7, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pulse = 1 + Math.sin(frame * 0.01) * (energy / 100) * 0.2;
      particles.forEach((p) => {
        const a = p.angle + frame * p.speed * (energy / 50);
        const r = p.radius * pulse;
        const x = 300 + Math.cos(a) * r;
        const y = 240 + Math.sin(a) * r * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (reducer.matches) return;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [energy, paletteIndex]);

  return (
    <div aria-label="오로라 하트 입자 연출">
      <canvas
        ref={canvasRef}
        width={600}
        height={420}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 70,
          color: "rgba(242,233,248,0.85)",
          fontSize: "0.72rem",
        }}
      >
        CURRENT FEELING · 두근거리는 끌림
      </div>
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 16,
          color: "rgba(242,233,248,0.7)",
          fontSize: "0.66rem",
        }}
      >
        {total}개의 빛나는 순간
      </div>
      <label
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          color: "rgba(242,233,248,0.8)",
          fontSize: "0.66rem",
          display: "grid",
          gap: 4,
        }}
        htmlFor="v3-aurora-energy"
      >
        마음의 에너지 {energy}%
        <input
          id="v3-aurora-energy"
          type="range"
          min={20}
          max={100}
          value={energy}
          onChange={(event) => setEnergy(Number(event.target.value))}
        />
      </label>
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 70,
          display: "flex",
          gap: 6,
        }}
        role="group"
        aria-label="입자 색상 선택"
      >
        {PALETTES.map((palette, index) => (
          <button
            key={palette.join("-")}
            type="button"
            aria-label={`${index + 1}번째 팔레트`}
            aria-pressed={paletteIndex === index}
            onClick={() => setPaletteIndex(index)}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: paletteIndex === index ? "2px solid #fff" : "1px solid rgba(255,255,255,0.4)",
              background: `linear-gradient(140deg, ${palette[0]}, ${palette[2]})`,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
