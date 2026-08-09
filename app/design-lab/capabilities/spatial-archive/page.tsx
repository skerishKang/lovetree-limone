"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import {
  ARCHIVE_ITEMS,
  DEFAULT_ARCHIVE_STATE,
  transitionArchiveState,
} from "@/lib/capability-prototypes-core";
import "@/app/styles/capability-prototypes-core.css";

type ArchiveStyle = CSSProperties & {
  "--archive-offset"?: number;
  "--archive-abs"?: number;
  "--archive-accent"?: string;
};

export default function SpatialArchivePrototypePage() {
  const [state, setState] = useState(DEFAULT_ARCHIVE_STATE);
  const shelfRef = useRef<HTMLDivElement>(null);
  const selected = ARCHIVE_ITEMS.find((item) => item.id === state.selectedId) ?? ARCHIVE_ITEMS[0];
  const detailOpen = state.phase === "open" || state.phase === "reading" || state.phase === "returning";

  const select = (id: string) => {
    setState((current) => transitionArchiveState(current, { type: "select", id }));
  };

  const open = () => {
    setState((current) => transitionArchiveState(current, { type: "open" }));
  };

  const returnToShelf = () => {
    setState((current) => transitionArchiveState(current, { type: "return" }));
    window.setTimeout(() => {
      setState((current) => transitionArchiveState(current, { type: "finish-return" }));
      shelfRef.current?.focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
  };

  return (
    <main className="lt-cap-proto lt-cap-proto--archive">
      <header className="lt-cap-proto__header">
        <div>
          <Link href="/design-lab">← Design Lab</Link>
          <p className="lt-cap-proto__eyebrow">ISSUE #83 · PHYSICAL OBJECT + SPATIAL ARCHIVE NAVIGATION</p>
          <h1>사람과 계절을 선택하고,<br />열고, 읽고, 원래 자리로 돌아갑니다.</h1>
          <p>책 모양 자체보다 select → focus → open → read → return의 공간 navigation grammar와 안전한 모바일 fallback을 추출합니다.</p>
        </div>
        <span className="lt-cap-proto__badge">INTERNAL PROTOTYPE</span>
      </header>

      <section className="lt-cap-proto__archive-shell" data-phase={state.phase}>
        <div
          className="lt-cap-proto__shelf"
          ref={shelfRef}
          tabIndex={-1}
          aria-label="Spatial archive shelf"
          onKeyDown={(event) => {
            const index = ARCHIVE_ITEMS.findIndex((item) => item.id === state.selectedId);
            if (event.key === "ArrowRight") {
              event.preventDefault();
              select(ARCHIVE_ITEMS[(index + 1) % ARCHIVE_ITEMS.length].id);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              select(ARCHIVE_ITEMS[(index - 1 + ARCHIVE_ITEMS.length) % ARCHIVE_ITEMS.length].id);
            }
            if (event.key === "Enter") {
              event.preventDefault();
              open();
            }
          }}
        >
          <div className="lt-cap-proto__shelf-board" aria-hidden="true" />
          {ARCHIVE_ITEMS.map((item, index) => {
            const selectedIndex = ARCHIVE_ITEMS.findIndex((candidate) => candidate.id === state.selectedId);
            const offset = index - selectedIndex;
            const active = item.id === state.selectedId;
            const style: ArchiveStyle = {
              "--archive-offset": offset,
              "--archive-abs": Math.abs(offset),
              "--archive-accent": item.accent,
            };
            return (
              <button
                type="button"
                key={item.id}
                className="lt-cap-proto__archive-object"
                aria-pressed={active}
                onClick={() => active ? open() : select(item.id)}
                style={style}
              >
                <span>{item.subtitle}</span>
                <strong>{item.label}</strong>
                <small>{item.momentCount} Moments</small>
              </button>
            );
          })}
        </div>

        <aside className="lt-cap-proto__panel" aria-live="polite">
          <p className="lt-cap-proto__section-label">{state.phase.toUpperCase()}</p>
          <h2>{selected.label}</h2>
          <p>{selected.subtitle} · {selected.momentCount} Moments</p>
          <button type="button" onClick={open}>선택한 아카이브 열기</button>
        </aside>
      </section>

      {detailOpen ? (
        <section className={`lt-cap-proto__archive-detail ${state.phase === "returning" ? "is-returning" : ""}`} aria-labelledby="archive-detail-title">
          <div className="lt-cap-proto__opened-object" style={{ "--archive-accent": selected.accent } as ArchiveStyle} aria-hidden="true">
            <span>{selected.subtitle}</span><strong>{selected.label}</strong>
          </div>
          <div className="lt-cap-proto__archive-reader">
            <div className="lt-cap-proto__archive-reader-head">
              <div>
                <p className="lt-cap-proto__section-label">OPENED ARCHIVE</p>
                <h2 id="archive-detail-title">{selected.label}</h2>
              </div>
              <button type="button" onClick={returnToShelf} aria-label="아카이브를 원래 서가로 돌려놓기">×</button>
            </div>

            {state.phase === "open" ? (
              <div className="lt-cap-proto__archive-cover">
                <p>선택한 object의 context를 유지한 채 상세 공간으로 들어왔습니다.</p>
                <button type="button" onClick={() => setState((current) => transitionArchiveState(current, { type: "read" }))}>Moment 펼쳐보기 →</button>
              </div>
            ) : state.phase === "reading" ? (
              <div className="lt-cap-proto__archive-pages" aria-live="polite">
                <article>
                  <span>PAGE {state.page + 1}</span>
                  <h3>{selected.label} · Moment {state.page + 1}</h3>
                  <p>실제 제품에서는 이 영역에 동일 canonical Moment data의 archive projection이 들어갑니다.</p>
                </article>
                <div>
                  <button type="button" disabled={state.page === 0} onClick={() => setState((current) => transitionArchiveState(current, { type: "page", delta: -1 }))}>← 이전</button>
                  <strong>{state.page + 1} / 5</strong>
                  <button type="button" disabled={state.page === 4} onClick={() => setState((current) => transitionArchiveState(current, { type: "page", delta: 1 }))}>다음 →</button>
                </div>
              </div>
            ) : (
              <div className="lt-cap-proto__archive-cover"><p>선택한 object를 원래 위치로 되돌리는 중입니다.</p></div>
            )}
          </div>
        </section>
      ) : null}

      <footer className="lt-cap-proto__footer">
        Source evidence: 또다른우주 `01_또다른우주_v1_서가형책읽기.html` · Drive 1lvs2HT-IS6kNo_B0SZvdpX2pzoJLHARn · SHA256 c8d417f9e1dc10f645b17ffb3342a8b5a76a411611e0ac172941b83790375cc6 · 아스테리브 `01_아스테리브_서가형문서탐색_v1.html` · Drive 1mJctk2-zSmeKcFIs6plQbs2h4P76eKZi · SHA256 23c9a667343f648507da8c52524986666bc62dbc796aae520af1b18b819a21ea
      </footer>
    </main>
  );
}
