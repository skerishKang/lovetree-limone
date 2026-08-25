"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import "@/app/styles/v4/codex15-memory-biosphere-home-donor.css";

const states = [
  {
    key: "human",
    label: "Human",
    caption: "A feeling before it becomes a record.",
    src: "/v4/memory-biosphere/human-final.webp",
    width: 620,
    height: 775,
  },
  {
    key: "trace",
    label: "Trace",
    caption: "A first signal connects one moment to the next.",
    src: "/v4/memory-biosphere/trace-final.webp",
    width: 620,
    height: 775,
  },
  {
    key: "bloom",
    label: "Bloom",
    caption: "Stored moments begin to grow into a living pattern.",
    src: "/v4/memory-biosphere/bloom-final.webp",
    width: 620,
    height: 776,
  },
  {
    key: "sphere",
    label: "Memory Sphere",
    caption: "A private constellation becomes a world you can return to.",
    src: "/v4/memory-biosphere/sphere-final-v2.webp",
    width: 620,
    height: 775,
  },
] as const;

const memoryCards = [
  { tag: "FIRST ROOT", title: "그 장면을 처음 본 날", offset: "one" },
  { tag: "WHY NEXT", title: "다음 순간으로 이어진 이유", offset: "two" },
  { tag: "RETURN", title: "다시 보고 싶어진 문장", offset: "three" },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function stateWeights(progress: number) {
  const position = clamp(progress) * (states.length - 1);
  const raw = states.map((_, index) => Math.max(0, 1 - Math.abs(position - index)));
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return raw.map((value) => value / total);
}

export default function Codex15MemoryBiosphereHomeDonor() {
  const stageRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0.08);
  const [pointer, setPointer] = useState({ x: 58, y: 42 });
  const weights = useMemo(() => stateWeights(progress), [progress]);
  const activeIndex = Math.round(progress * (states.length - 1));

  const setState = useCallback((index: number) => {
    setProgress(index / (states.length - 1));
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setPointer({ x: x * 100, y: y * 100 });

    const centerX = rect.width * 0.625;
    const centerY = rect.height * 0.39;
    const dx = (event.clientX - rect.left - centerX) / Math.max(rect.width * 0.28, 1);
    const dy = (event.clientY - rect.top - centerY) / Math.max(rect.height * 0.34, 1);
    const ellipticalDistance = Math.sqrt(dx * dx + dy * dy);
    setProgress(clamp(1.08 - ellipticalDistance));
  }, []);

  const progressStyle = {
    "--mb-progress": progress.toFixed(4),
    "--mb-mx": `${pointer.x.toFixed(2)}%`,
    "--mb-my": `${pointer.y.toFixed(2)}%`,
  } as CSSProperties;

  return (
    <main
      ref={stageRef}
      className="mb-stage"
      style={progressStyle}
      onPointerMove={onPointerMove}
      data-testid="memory-biosphere-stage"
    >
      <div className="mb-atmosphere" aria-hidden="true" />
      <div className="mb-grid" aria-hidden="true" />
      <div className="mb-wordmark" aria-hidden="true">
        <span>LOVETREE</span>
        <span className="mb-wordmark-ghost">LOVETREE</span>
      </div>

      <header className="mb-topbar">
        <Link href="/v4" className="mb-brand" aria-label="LoveTree live home">
          <span className="mb-brand-dot" aria-hidden="true" />
          LOVETREE
        </Link>
        <div className="mb-proof-tag">MVP V2 · MEMORY BIOSPHERE</div>
        <Link href="/v4?start=1" className="mb-top-entry">Enter canonical HOME ↗</Link>
      </header>

      <section className="mb-copy" aria-labelledby="memory-biosphere-title">
        <p className="mb-eyebrow">A MEMORY BECOMES A LIVING WORLD</p>
        <h1 id="memory-biosphere-title">
          기억은 저장되는 것이 아니라,
          <br />당신 주위에 <em>하나의 세계</em>로 자랍니다.
        </h1>
        <p className="mb-summary">
          한 장면에서 시작된 감정, 다음으로 이어진 이유, 다시 돌아온 순간이 하나의 생태계처럼 연결됩니다.
          이 화면은 그 세계의 시각 문법만 증명하고, 실제 기록·로그인·저장은 현재 LoveTree가 계속 담당합니다.
        </p>
        <div className="mb-actions">
          <Link href="/v4?start=1" className="mb-primary">첫 순간 심기 <span>→</span></Link>
          <Link href="/v4" className="mb-secondary">현재 LoveTree로 들어가기</Link>
        </div>
        <div className="mb-comparators" aria-label="HOME candidate comparison surfaces">
          <Link href="/design-lab/source-tracks/74/v2/native">Track74 native</Link>
          <span aria-hidden="true">/</span>
          <Link href="/design-lab/source-tracks/36/v3/donor">Track36 donor</Link>
        </div>
      </section>

      <section className="mb-world" aria-label={`Memory Biosphere state: ${states[activeIndex].label}`}>
        <div className="mb-orbit mb-orbit-outer" aria-hidden="true" />
        <div className="mb-orbit mb-orbit-middle" aria-hidden="true" />
        <div className="mb-orbit mb-orbit-inner" aria-hidden="true" />
        <div className="mb-scan" aria-hidden="true" />

        <div className="mb-portrait" data-testid="memory-biosphere-portrait">
          {states.map((state, index) => (
            <Image
              key={state.key}
              src={state.src}
              alt=""
              aria-hidden="true"
              width={state.width}
              height={state.height}
              priority
              sizes="(max-width: 760px) 82vw, 48vw"
              className="mb-portrait-layer"
              style={{ opacity: weights[index] }}
            />
          ))}
          <div className="mb-sphere-glow" aria-hidden="true" />
        </div>

        {memoryCards.map((card) => (
          <article className={`mb-memory-card mb-card-${card.offset}`} key={card.tag}>
            <small>{card.tag}</small>
            <strong>{card.title}</strong>
            <span aria-hidden="true">↗</span>
          </article>
        ))}

        <div className="mb-proximity" aria-hidden="true">
          <i /><i /><i />
          <span>APPROACH TO REVEAL</span>
        </div>
      </section>

      <aside className="mb-state-copy" aria-live="polite">
        <small>{String(activeIndex + 1).padStart(2, "0")} / 04</small>
        <strong>{states[activeIndex].label}</strong>
        <p>{states[activeIndex].caption}</p>
      </aside>

      <nav className="mb-state-nav" aria-label="Memory Biosphere visual states">
        {states.map((state, index) => (
          <button
            key={state.key}
            type="button"
            className={index === activeIndex ? "is-active" : undefined}
            aria-pressed={index === activeIndex}
            onClick={() => setState(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {state.label}
          </button>
        ))}
      </nav>

      <p className="mb-boundary-note">
        VISUAL DONOR PROOF · Auth / API / createFirstTree / persistence / returning-user resolution stay canonical.
      </p>
    </main>
  );
}
