import Link from "next/link";
import DesignLineageOverview from "@/app/components/product/DesignLineageOverview";
import ExperienceCapabilityLibrary from "@/app/components/product/ExperienceCapabilityLibrary";
import {
  DESIGN_CANDIDATES,
  DESIGN_SCENARIOS,
  candidatesByScenario,
} from "@/lib/design-lab";
import { DESIGN_LINEAGES } from "@/lib/design-lineages";
import "@/app/styles/design-lab.css";
import "@/app/styles/design-lineages.css";
import "@/app/styles/experience-capabilities.css";

const STATUS_LABELS = {
  received: "접수",
  mapped: "분류됨",
  implemented: "구현됨",
  validated: "검증됨",
  shortlisted: "최종후보",
  selected: "채택",
  superseded: "보관",
} as const;

export default function DesignLabPage() {
  const grouped = candidatesByScenario();
  const sourceCount = DESIGN_CANDIDATES.filter((candidate) => candidate.origin === "sibling-html").length;
  const implementedCount = DESIGN_CANDIDATES.filter((candidate) => candidate.status === "implemented").length;

  return (
    <main className="lt-lab">
      <header className="lt-lab__header">
        <div>
          <Link className="lt-lab__back" href="/">← Product Gateway</Link>
          <p className="lt-lab__eyebrow">LOVE TREE · DESIGN LAB</p>
          <h1>제품을 복제하지 않고,<br />디자인 후보를 전부 비교합니다.</h1>
          <p className="lt-lab__lede">
            제품은 Legacy와 Next 두 계열만 유지합니다. 번호가 붙은 디자인 작업은 Lineage로, 그 안의 V1/V2/V3는 Revision으로,
            실제 화면 선택지는 Scenario Variant로, 여러 화면에 재사용할 인터랙션은 Experience Capability로 분리합니다.
          </p>
        </div>
        <div className="lt-lab__summary" aria-label="Design Lab 후보 요약">
          <span><b>{DESIGN_LINEAGES.length}</b>디자인 계보</span>
          <span><b>{sourceCount}</b>구현 원본</span>
          <span><b>{implementedCount}</b>구현 후보</span>
        </div>
      </header>

      <nav className="lt-lab__jump" aria-label="Design Lab 바로가기">
        <a href="#design-lineages">Design Lineages</a>
        {DESIGN_SCENARIOS.map((scenario) => (
          <a key={scenario.id} href={`#${scenario.id}`}>{scenario.label}</a>
        ))}
        <a href="#experience-capabilities">Experience Capabilities</a>
      </nav>

      <DesignLineageOverview />

      <div className="lt-lab__scenarios">
        {DESIGN_SCENARIOS.map((scenario) => {
          const candidates = grouped.get(scenario.id) ?? [];
          return (
            <section className="lt-lab__scenario" id={scenario.id} key={scenario.id}>
              <div className="lt-lab__scenario-heading">
                <div>
                  <span>{String(scenario.order).padStart(2, "0")}</span>
                  <h2>{scenario.label}</h2>
                </div>
                <p>{scenario.description}</p>
              </div>

              <div className="lt-lab__grid">
                {candidates.map((candidate) => (
                  <article className="lt-lab__card" key={candidate.id}>
                    <div className="lt-lab__card-topline">
                      <span className={`lt-lab__status lt-lab__status--${candidate.status}`}>
                        {STATUS_LABELS[candidate.status]}
                      </span>
                      <span className="lt-lab__kind">{candidate.kind}</span>
                    </div>
                    <h3>{candidate.label}</h3>
                    {candidate.sourceFile ? <code>{candidate.sourceFile}</code> : null}
                    {candidate.notes ? <p>{candidate.notes}</p> : null}
                    {candidate.preserve && candidate.preserve.length > 0 ? (
                      <ul>
                        {candidate.preserve.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                    <Link className="lt-lab__open" href={candidate.route}>
                      실제 구현 보기 <span aria-hidden="true">↗</span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <ExperienceCapabilityLibrary />

      <footer className="lt-lab__footer">
        <p>새 디자인은 새 제품 버전을 만드는 대신 Lineage → Revision → Scenario Variant와 재사용 Capability로 분류합니다.</p>
        <Link href="/v4">현재 Next LoveTree 열기 →</Link>
      </footer>
    </main>
  );
}
