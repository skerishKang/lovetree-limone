"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DESIGN_SCENARIOS, type DesignScenarioId } from "@/lib/design-lab";
import { type ExperienceCapabilityStatus } from "@/lib/experience-capabilities";
import {
  EXPERIENCE_CAPABILITY_REGISTRY as EXPERIENCE_CAPABILITIES,
  type ExperienceCapabilityRegistrySourceProject as ExperienceCapabilitySourceProject,
} from "@/lib/experience-capability-registry";

const STATUS_LABELS: Record<ExperienceCapabilityStatus, string> = {
  observed: "관찰됨",
  mapped: "분류됨",
  "prototype-requested": "프로토타입 예정",
  prototyped: "프로토타입",
  validated: "검증됨",
  adopted: "채택",
  rejected: "보류/반려",
};

const PROTOTYPE_ROUTES: Readonly<Record<string, string>> = {
  "spatial-orbit-3d": "/design-lab/capabilities/spatial-orbit",
  "cinematic-scene-transition": "/design-lab/capabilities/cinematic-convergence",
  "memory-fragment-convergence": "/design-lab/capabilities/cinematic-convergence",
  "relationship-spatial-map": "/design-lab/capabilities/relationship-history",
  "temporal-version-history": "/design-lab/capabilities/relationship-history",
  "physical-object-navigation": "/design-lab/capabilities/spatial-archive",
  "spatial-document-exploration": "/design-lab/capabilities/spatial-archive",
  "longform-milestone-navigation": "/design-lab/capabilities/milestone-index",
  "intent-to-path-navigation": "/design-lab/capabilities/intent-to-path",
  "source-media-inspection-deck": "/design-lab/capabilities/media-inspection",
  "question-lens-recomposition": "/design-lab/capabilities/question-lens",
  "narrative-to-structured-moment-assembly": "/design-lab/capabilities/narrative-assembly",
};

type ScenarioFilter = "all" | DesignScenarioId;
type ProjectFilter = "all" | ExperienceCapabilitySourceProject;

export default function ExperienceCapabilityLibrary() {
  const sourceProjects = useMemo(() => Array.from(new Set(
    EXPERIENCE_CAPABILITIES.flatMap((capability) => capability.evidence.map((evidence) => evidence.project)),
  )), []);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<ProjectFilter>("all");
  const [scenario, setScenario] = useState<ScenarioFilter>("all");

  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const filtered = useMemo(() => EXPERIENCE_CAPABILITIES.filter((capability) => {
    const searchable = [
      capability.id,
      capability.label,
      capability.summary,
      capability.integrationRule,
      ...capability.dataNeeds,
      ...capability.risks,
      ...capability.evidence.flatMap((evidence) => [evidence.project, evidence.artifact, ...evidence.observed]),
    ].join(" ").toLocaleLowerCase("ko-KR");

    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (project === "all" || capability.evidence.some((evidence) => evidence.project === project))
      && (scenario === "all" || capability.applicableScenarios.includes(scenario));
  }), [normalizedQuery, project, scenario]);

  const reset = () => {
    setQuery("");
    setProject("all");
    setScenario("all");
  };

  const scenarioLabel = (id: DesignScenarioId) => DESIGN_SCENARIOS.find((item) => item.id === id)?.label ?? id;

  return (
    <section className="lt-capabilities" id="experience-capabilities" aria-labelledby="experience-capabilities-title">
      <div className="lt-capabilities__heading">
        <div>
          <p className="lt-lab__eyebrow">CROSS-PROJECT R&amp;D</p>
          <h2 id="experience-capabilities-title">Experience Capability Library</h2>
          <p>
            Variant가 “어떤 화면을 고를지”를 비교한다면, Capability는 “어떤 인터랙션 기술을 여러 화면에서
            재사용할지”를 관리합니다. 다른 프로젝트에서 검증된 디자인 연구도 제품 전체를 복제하지 않고 메커니즘만 추출합니다.
          </p>
        </div>
        <div className="lt-capabilities__stats" aria-label="Capability registry 요약">
          <span><b>{filtered.length}</b>shown</span>
          <span><b>{sourceProjects.length}</b>source projects</span>
        </div>
      </div>

      <div className="lt-capability-filters" role="search" aria-label="Experience Capability 검색과 필터">
        <label>
          <span>검색</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Orbit, book, 관계, motion…" />
        </label>
        <label>
          <span>출처 프로젝트</span>
          <select value={project} onChange={(event) => setProject(event.target.value as ProjectFilter)}>
            <option value="all">전체</option>
            {sourceProjects.map((sourceProject) => <option value={sourceProject} key={sourceProject}>{sourceProject}</option>)}
          </select>
        </label>
        <label>
          <span>적용 시나리오</span>
          <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioFilter)}>
            <option value="all">전체</option>
            {DESIGN_SCENARIOS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={reset}>필터 초기화</button>
      </div>

      {filtered.length === 0 ? (
        <div className="lt-capability-empty">
          <strong>조건에 맞는 Capability가 없습니다.</strong>
          <button type="button" onClick={reset}>전체 다시 보기</button>
        </div>
      ) : (
        <div className="lt-capabilities__grid">
          {filtered.map((capability) => {
            const prototypeRoute = PROTOTYPE_ROUTES[capability.id];
            return (
              <article className="lt-capability" key={capability.id}>
                <div className="lt-capability__topline">
                  <span className={`lt-capability__status lt-capability__status--${capability.status}`}>
                    {STATUS_LABELS[capability.status]}
                  </span>
                  <code>{capability.id}</code>
                </div>

                <h3>{capability.label}</h3>
                <p className="lt-capability__summary">{capability.summary}</p>

                <div className="lt-capability__section">
                  <strong>LoveTree 적용 후보</strong>
                  <div className="lt-capability__chips">
                    {capability.applicableScenarios.map((scenarioId) => <span key={scenarioId}>{scenarioLabel(scenarioId)}</span>)}
                  </div>
                </div>

                <div className="lt-capability__section">
                  <strong>필요 데이터</strong>
                  <ul>
                    {capability.dataNeeds.map((need) => <li key={need}>{need}</li>)}
                  </ul>
                </div>

                <div className="lt-capability__section">
                  <strong>추출 원칙</strong>
                  <p>{capability.integrationRule}</p>
                </div>

                <details className="lt-capability__evidence">
                  <summary>출처와 관찰 증거</summary>
                  {capability.evidence.map((evidence) => (
                    <div key={`${capability.id}:${evidence.project}:${evidence.artifact}`}>
                      <b>{evidence.project}</b>
                      <code>{evidence.artifact}</code>
                      <ul>{evidence.observed.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  ))}
                </details>

                <div className="lt-capability__risks">
                  <strong>검증 포인트</strong>
                  <p>{capability.risks.join(" · ")}</p>
                </div>

                {prototypeRoute ? (
                  <Link className="lt-capability__issue" href={prototypeRoute}>
                    Internal prototype 열기 →
                  </Link>
                ) : null}

                {capability.issue ? (
                  <a className="lt-capability__issue" href={`https://github.com/skerishKang/lovetree-limone/issues/${capability.issue}`}>
                    Prototype / research issue #{capability.issue} ↗
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
