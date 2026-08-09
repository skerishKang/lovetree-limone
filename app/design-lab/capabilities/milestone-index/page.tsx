"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MILESTONE_UNITS,
  milestoneProgress,
  parseMilestoneUnit,
  serializeMilestoneUnit,
  type MilestoneUnit,
} from "@/lib/capability-prototypes-core";
import "@/app/styles/capability-prototypes-core.css";

const DEFAULT_UNIT = MILESTONE_UNITS.find((unit) => unit.status === "current")!;

export default function MilestoneIndexPrototypePage() {
  const [selectedId, setSelectedId] = useState(DEFAULT_UNIT.id);
  const [filter, setFilter] = useState<"all" | "complete" | "available">("all");
  const progress = milestoneProgress();
  const selected = MILESTONE_UNITS.find((unit) => unit.id === selectedId) ?? DEFAULT_UNIT;

  useEffect(() => {
    const restore = () => {
      const unit = parseMilestoneUnit(window.location.search);
      setSelectedId(unit.id);
    };
    const frame = window.requestAnimationFrame(restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", restore);
    };
  }, []);

  const visible = useMemo(() => MILESTONE_UNITS.filter((unit) => {
    if (filter === "complete") return unit.status === "complete";
    if (filter === "available") return unit.status !== "pending";
    return true;
  }), [filter]);

  const select = (unit: MilestoneUnit) => {
    if (unit.status === "pending") return;
    setSelectedId(unit.id);
    const query = serializeMilestoneUnit(unit.id);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  };

  return (
    <main className="lt-cap-proto lt-cap-proto--milestones">
      <header className="lt-cap-proto__header">
        <div>
          <Link href="/design-lab">← Design Lab</Link>
          <p className="lt-cap-proto__eyebrow">ISSUE #84 · LONG-FORM CHAPTER / MILESTONE NAVIGATION</p>
          <h1>수십·수백 Moment를<br />길을 잃지 않고 다시 찾습니다.</h1>
          <p>Guided Reader의 문학 콘텐츠는 가져오지 않고, 큰 인덱스 · 완료/대기 상태 · deep link · 장기 progress grammar만 LoveTree Season/Milestone에 적용합니다.</p>
        </div>
        <span className="lt-cap-proto__badge">INTERNAL PROTOTYPE</span>
      </header>

      <section className="lt-cap-proto__progress-card" aria-label="장기 진행 요약">
        <div>
          <p className="lt-cap-proto__section-label">LONG-RUN PROGRESS</p>
          <h2>{progress.completed}개의 계절을 지나왔습니다.</h2>
          <p>현재 열 수 있는 단위 {progress.available} / 전체 {progress.total}</p>
        </div>
        <div className="lt-cap-proto__progress-meter" aria-label={`완료 ${progress.percent}%`}>
          <span style={{ width: `${progress.percent}%` }} />
        </div>
      </section>

      <div className="lt-cap-proto__milestone-filters" aria-label="Milestone 필터">
        {(["all", "available", "complete"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === "all" ? "전체" : value === "available" ? "열 수 있음" : "완료"}
          </button>
        ))}
      </div>

      <section className="lt-cap-proto__milestone-shell">
        <nav className="lt-cap-proto__milestone-index" aria-label="Season milestone index">
          {visible.map((unit) => (
            <button
              type="button"
              key={unit.id}
              className={`is-${unit.status}`}
              aria-current={unit.id === selectedId ? "page" : undefined}
              disabled={unit.status === "pending"}
              onClick={() => select(unit)}
            >
              <span>{String(unit.index).padStart(2, "0")}</span>
              <div><strong>{unit.label}</strong><small>{unit.period}</small></div>
              <em>{unit.status === "complete" ? "완료" : unit.status === "current" ? "현재" : "대기"}</em>
            </button>
          ))}
        </nav>

        <article className="lt-cap-proto__milestone-detail" aria-live="polite">
          <p className="lt-cap-proto__section-label">DEEPLINKED UNIT</p>
          <span>{String(selected.index).padStart(2, "0")} · {selected.period}</span>
          <h2>{selected.label}</h2>
          <p>{selected.momentCount} Moments가 이 구간에 연결되어 있습니다.</p>
          <div className="lt-cap-proto__milestone-moments">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index}>Moment {selected.index}.{index + 1}</span>
            ))}
          </div>
          <code>?{serializeMilestoneUnit(selected.id)}</code>
        </article>
      </section>

      <footer className="lt-cap-proto__footer">
        Source evidence: `ODYSSEY_Guided_Reader.html` · Drive 1ux7If502gyrfMi4nsa_Y3FFYBzfydjvp · 6,616 bytes · SHA256 487173a9cf4629fb793e773b5c762a75b2894d43fc589140f8a4f827e52d506f · source has 24 deep-linked book cards and complete/pending states; LoveTree adds explicit URL state and reduced-motion-safe presentation as its own integration contract.
      </footer>
    </main>
  );
}
