"use client";

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
] as const;

export default function V4JourneyDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className={`v4-journey-dock${open ? " is-open" : ""}`} aria-label="V4 전체 사용자 여정">
      <button className="v4-journey-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">✦</span>
        <strong>V4 여정</strong>
        <small>25 designs</small>
      </button>
      {open ? (
        <div className="v4-journey-panel">
          <div className="v4-journey-head">
            <div><small>SOURCE-FAITHFUL NAVIGATION</small><strong>LoveTree V4 전체 화면</strong></div>
            <button type="button" aria-label="여정 도크 닫기" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="v4-journey-groups">
            {GROUPS.map((group) => (
              <section key={group.label}>
                <h2>{group.label}</h2>
                <div>
                  {group.links.map(([label, href]) => (
                    <Link className={pathname === href ? "is-current" : ""} href={href} key={href} onClick={() => setOpen(false)}>
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
