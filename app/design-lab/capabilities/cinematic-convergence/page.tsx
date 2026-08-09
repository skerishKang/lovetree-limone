"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CINEMATIC_SCENES,
  fragmentLayout,
  type CinematicSceneId,
} from "@/lib/capability-prototypes-core";
import "@/app/styles/capability-prototypes-core.css";

export default function CinematicConvergencePrototypePage() {
  const [scene, setScene] = useState<CinematicSceneId>("fragments");
  const activeIndex = CINEMATIC_SCENES.findIndex((item) => item.id === scene);
  const active = CINEMATIC_SCENES[activeIndex];
  const fragments = fragmentLayout(scene);

  const move = (direction: number) => {
    const next = Math.max(0, Math.min(CINEMATIC_SCENES.length - 1, activeIndex + direction));
    setScene(CINEMATIC_SCENES[next].id);
  };

  return (
    <main className="lt-cap-proto lt-cap-proto--cinematic">
      <header className="lt-cap-proto__header">
        <div>
          <Link href="/design-lab">← Design Lab</Link>
          <p className="lt-cap-proto__eyebrow">ISSUE #82 · CINEMATIC SCENE + MEMORY CONVERGENCE</p>
          <h1>흩어진 Moment가 모이고,<br />제품의 관계축으로 이어집니다.</h1>
          <p>이어온의 회사 의미론이나 화면을 복제하지 않고 scene lifecycle과 fragment convergence만 LoveTree synthetic data로 검증합니다.</p>
        </div>
        <span className="lt-cap-proto__badge">INTERNAL PROTOTYPE</span>
      </header>

      <section className="lt-cap-proto__cinematic-stage" data-scene={scene} aria-live="polite">
        <div className="lt-cap-proto__scene-copy">
          <span>{active.label}</span>
          <h2>{active.title}</h2>
          <p>{active.description}</p>
        </div>

        <div className={`lt-cap-proto__fragment-field ${scene !== "fragments" ? "is-gathered" : ""}`} aria-label="Memory fragment field">
          <div className={`lt-cap-proto__memory-axis ${scene === "axis" || scene === "tree" ? "is-visible" : ""}`} aria-hidden="true" />
          {fragments.map((fragment) => (
            <article
              key={fragment.id}
              className="lt-cap-proto__fragment"
              style={{
                left: `${fragment.position.x}%`,
                top: `${fragment.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${fragment.position.rotate}deg)`,
              }}
            >
              <span>{fragment.year}</span>
              <strong>{fragment.title}</strong>
              <small>{fragment.person}</small>
            </article>
          ))}
          {scene === "tree" ? (
            <div className="lt-cap-proto__canonical-destination">
              <span>CANONICAL PRODUCT VIEW</span>
              <strong>Tree / Timeline</strong>
              <p>연출의 끝은 실제 탐색 화면입니다.</p>
            </div>
          ) : null}
        </div>
      </section>

      <nav className="lt-cap-proto__scene-nav" aria-label="시네마틱 장면 선택">
        {CINEMATIC_SCENES.map((item) => (
          <button key={item.id} type="button" aria-pressed={scene === item.id} onClick={() => setScene(item.id)}>
            <span>{item.label}</span>{item.title}
          </button>
        ))}
      </nav>

      <div className="lt-cap-proto__transport">
        <button type="button" onClick={() => move(-1)} disabled={activeIndex === 0}>← 이전 장면</button>
        <span>{activeIndex + 1} / {CINEMATIC_SCENES.length}</span>
        <button type="button" onClick={() => move(1)} disabled={activeIndex === CINEMATIC_SCENES.length - 1}>다음 장면 →</button>
      </div>

      <footer className="lt-cap-proto__footer">
        Source evidence: 이어온 `03_회사기억추적_v1_시네마틱통합시연.html` · Drive 1WXvu841JgJevYFXTi04YRVxIcCLmD49D · 67,949 bytes · SHA256 846f0b7ec102861862bb3ad77c91a87de81072e3a7a59fb2dd7d939c676911be
      </footer>
    </main>
  );
}
