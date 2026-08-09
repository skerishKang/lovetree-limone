"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DESIGN_CANDIDATES,
  DESIGN_SCENARIOS,
  type DesignCandidate,
  type DesignCandidateStatus,
  type DesignScenarioId,
  type DesignVariantKind,
} from "@/lib/design-lab";

const STATUS_LABELS: Record<DesignCandidateStatus, string> = {
  received: "접수",
  mapped: "분류됨",
  implemented: "구현됨",
  validated: "검증됨",
  shortlisted: "최종후보",
  selected: "채택",
  superseded: "보관",
};

const KIND_LABELS: Record<DesignVariantKind, string> = {
  screen: "화면",
  mechanic: "메커니즘",
  experience: "경험",
  historical: "과거 기준",
};

type ScenarioFilter = "all" | DesignScenarioId;
type StatusFilter = "all" | DesignCandidateStatus;
type KindFilter = "all" | DesignVariantKind;

function matchesSearch(candidate: DesignCandidate, search: string) {
  if (!search) return true;
  const haystack = [
    candidate.id,
    candidate.label,
    candidate.lineageId,
    candidate.revisionId,
    candidate.sourceFile,
    candidate.role,
    candidate.notes,
    ...(candidate.preserve ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ko-KR");
  return haystack.includes(search);
}

export default function DesignVariantExplorer() {
  const [query, setQuery] = useState("");
  const [scenario, setScenario] = useState<ScenarioFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const filtered = useMemo(
    () => DESIGN_CANDIDATES.filter((candidate) => (
      matchesSearch(candidate, normalizedQuery)
      && (scenario === "all" || candidate.scenarioId === scenario)
      && (status === "all" || candidate.status === status)
      && (kind === "all" || candidate.kind === kind)
    )),
    [kind, normalizedQuery, scenario, status],
  );

  const visibleScenarios = DESIGN_SCENARIOS.filter((item) => (
    scenario === "all" ? filtered.some((candidate) => candidate.scenarioId === item.id) : item.id === scenario
  ));

  const reset = () => {
    setQuery("");
    setScenario("all");
    setStatus("all");
    setKind("all");
  };

  return (
    <section className="lt-variant-explorer" id="scenario-variants" aria-labelledby="scenario-variants-title">
      <div className="lt-variant-explorer__heading">
        <div>
          <p className="lt-lab__eyebrow">SCENARIO VARIANTS</p>
          <h2 id="scenario-variants-title">실제 화면 후보를 시나리오별로 비교합니다.</h2>
        </div>
        <p><b>{filtered.length}</b> / {DESIGN_CANDIDATES.length} 후보 표시</p>
      </div>

      <div className="lt-variant-filters" role="search" aria-label="디자인 후보 검색과 필터">
        <label className="lt-variant-search">
          <span>검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="후보명, 계보, 원본 파일, 인터랙션 검색"
          />
        </label>

        <label>
          <span>시나리오</span>
          <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioFilter)}>
            <option value="all">전체</option>
            {DESIGN_SCENARIOS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>

        <label>
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">전체</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>

        <label>
          <span>종류</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as KindFilter)}>
            <option value="all">전체</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>

        <button type="button" onClick={reset}>필터 초기화</button>
      </div>

      {filtered.length === 0 ? (
        <div className="lt-variant-empty">
          <strong>조건에 맞는 후보가 없습니다.</strong>
          <button type="button" onClick={reset}>전체 후보 다시 보기</button>
        </div>
      ) : (
        <div className="lt-lab__scenarios">
          {visibleScenarios.map((item) => {
            const candidates = filtered.filter((candidate) => candidate.scenarioId === item.id);
            if (candidates.length === 0) return null;
            return (
              <section className="lt-lab__scenario" id={item.id} key={item.id}>
                <div className="lt-lab__scenario-heading">
                  <div>
                    <span>{String(item.order).padStart(2, "0")}</span>
                    <h2>{item.label}</h2>
                  </div>
                  <p>{item.description} · <b>{candidates.length}개 후보</b></p>
                </div>

                <div className="lt-lab__grid">
                  {candidates.map((candidate) => (
                    <article className="lt-lab__card" key={candidate.id}>
                      <div className="lt-lab__card-topline">
                        <span className={`lt-lab__status lt-lab__status--${candidate.status}`}>
                          {STATUS_LABELS[candidate.status]}
                        </span>
                        <span className="lt-lab__kind">{KIND_LABELS[candidate.kind]}</span>
                      </div>
                      <h3>{candidate.label}</h3>
                      {candidate.lineageId && candidate.revisionId ? (
                        <p className="lt-lab__lineage-link">{candidate.lineageId} · {candidate.revisionId}</p>
                      ) : null}
                      {candidate.sourceFile ? <code>{candidate.sourceFile}</code> : null}
                      {candidate.notes ? <p>{candidate.notes}</p> : null}
                      {candidate.preserve && candidate.preserve.length > 0 ? (
                        <ul>
                          {candidate.preserve.slice(0, 4).map((itemToPreserve) => <li key={itemToPreserve}>{itemToPreserve}</li>)}
                        </ul>
                      ) : null}
                      {candidate.route ? (
                        <Link className="lt-lab__open" href={candidate.route}>
                          실제 구현 보기 <span aria-hidden="true">↗</span>
                        </Link>
                      ) : (
                        <span className="lt-lab__open lt-lab__open--pending">React 포팅 대기 <span aria-hidden="true">○</span></span>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
