"use client";

import { useEffect, useRef } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    label: "시작",
    links: [
      ["랜딩·첫 발견", "/v4"],
      ["첫 여정 통합", "/v4/journey"],
      ["마음 남기기", "/v4/trees/demo/onboarding/emotion"],
      ["다음 순간 연결", "/v4/trees/demo/onboarding/connect"],
    ],
  },
  {
    label: "성장",
    links: [
      ["3열 성장 트리", "/v4/trees/demo"],
      ["잠시 쉬기·돌아오기", "/v4/trees/demo/rest"],
      ["상태·공개 범위", "/v4/trees/demo/state"],
    ],
  },
  {
    label: "탐색",
    links: [
      ["자유 노드 그래프", "/v4/trees/demo/graph"],
      ["100개의 순간", "/v4/trees/demo/graph/100-moments"],
      ["관계 지도", "/v4/trees/demo/map"],
      ["감정 성운", "/v4/trees/demo/nebula"],
      ["날짜 타임라인", "/v4/trees/demo/timeline"],
      ["커뮤니티", "/v4/community"],
    ],
  },
  {
    label: "앨범",
    links: [
      ["사람·대상 앨범", "/v4/subjects"],
      ["Motion Archive", "/v4/subjects/demo/motion"],
      ["Liquid Orbit", "/v4/subjects/demo/orbit"],
      ["Accordion Album", "/v4/subjects/demo/accordion"],
      ["Folding Person Book", "/v4/subjects/demo/folding"],
      ["Bookshelf V1", "/v4/subjects/bookshelf/v1"],
      ["Bookshelf V2-1", "/v4/subjects/bookshelf/v2-1"],
      ["Bookshelf V2-3D", "/v4/subjects/bookshelf/v2-3d"],
      ["Bookshelf V2A-2", "/v4/subjects/bookshelf/v2a-2"],
    ],
  },
  {
    label: "300과 이후",
    links: [
      ["300번째 완성", "/v4/trees/demo/celebrate/300"],
      ["오로라 심장", "/v4/trees/demo/celebrate/aurora"],
      ["무지개 수관", "/v4/trees/demo/celebrate/canopy"],
      ["보라 마음꽃", "/v4/trees/demo/celebrate/bloom"],
      ["301+ 계속 성장", "/v4/trees/demo/growth/300-plus"],
      ["여러 시즌 아카이브", "/v4/trees/demo/seasons"],
    ],
  },
  {
    label: "실험실 · 4 designs",
    links: [
      ["Memory Pulse", "/v4/labs/memory/pulse"],
      ["Scene Recipes", "/v4/labs/memory/recipes"],
      ["Polish Lab", "/v4/labs/memory/polish-lab"],
      ["Window Composer", "/v4/labs/memory/window-composer"],
    ],
  },
] as const;

export default function V4JourneyDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeDock = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDock();
      }
      if (event.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          "a[href], button",
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // The cinematic experience is full-screen immersive. Suppress the dock
  // only on /v4/cinematic so it never overlaps the film.
  if (pathname === "/v4/cinematic") {
    return null;
  }

  return (
    <aside className={`v4-journey-dock${open ? " is-open" : ""}`} aria-label="V4 전체 사용자 여정">
      <button
        ref={toggleRef}
        className="v4-journey-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="v4-journey-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">✦</span>
        <strong>V4 여정</strong>
        <small>29 official + 4 lab designs</small>
      </button>
      {open ? (
        <div className="v4-journey-panel" id="v4-journey-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="LoveTree V4 전체 화면">
          <div className="v4-journey-head">
            <div><small>SOURCE-FAITHFUL NAVIGATION</small><strong>LoveTree V4 전체 화면</strong></div>
            <button ref={closeRef} type="button" aria-label="여정 도크 닫기" onClick={closeDock}>×</button>
          </div>
          <div className="v4-journey-groups">
            {GROUPS.map((group) => (
              <section key={group.label}>
                <h2>{group.label}</h2>
                <div>
                  {group.links.map(([label, href]) => (
                    <Link className={pathname === href ? "is-current" : ""} href={href} key={href} onClick={closeDock}>
                      <span>{label}</span><b aria-hidden="true">→</b>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
