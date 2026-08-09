import { DESIGN_LINEAGES, type DesignLineageStatus, type DesignRevisionDecision } from "@/lib/design-lineages";

const STATUS_LABELS: Record<DesignLineageStatus, string> = {
  active: "진행 중",
  closed: "종료/보존",
  hold: "보류",
  incoming: "신규/분류 중",
};

const DECISION_LABELS: Record<DesignRevisionDecision, string> = {
  baseline: "기준 후보",
  candidate: "후보",
  "approved-plan": "계획 승인",
  rejected: "반려/보관",
  reference: "비교 자료",
};

export default function DesignLineageOverview() {
  return (
    <section className="lt-lineages" id="design-lineages" aria-labelledby="design-lineages-title">
      <div className="lt-lineages__heading">
        <p className="lt-lab__eyebrow">DESIGN LINEAGES</p>
        <h2 id="design-lineages-title">V1, V2, V3는 제품 버전이 아니라<br />한 디자인 계보 안의 revision입니다.</h2>
        <p>
          번호가 붙은 디자인 트랙을 Lineage로 묶고, 그 안의 반복 제작본은 Revision으로 보존합니다.
          그래서 Next LoveTree 제품은 하나로 유지하면서 모든 실험안·반려안·fallback을 잃지 않고 비교할 수 있습니다.
        </p>
      </div>

      <div className="lt-lineages__grid">
        {DESIGN_LINEAGES.map((lineage) => (
          <article className="lt-lineage" key={lineage.id}>
            <div className="lt-lineage__topline">
              <span className="lt-lineage__number">{String(lineage.number).padStart(2, "0")}</span>
              <span className={`lt-lineage__status lt-lineage__status--${lineage.status}`}>
                {STATUS_LABELS[lineage.status]}
              </span>
            </div>
            <h3>{lineage.label}</h3>
            <p>{lineage.summary}</p>
            <div className="lt-lineage__scenarios">
              {lineage.scenarios.map((scenario) => <code key={scenario}>{scenario}</code>)}
            </div>
            <div className="lt-lineage__decision">
              <strong>현재 판단</strong>
              <p>{lineage.currentDecision}</p>
            </div>

            {lineage.revisions.length > 0 ? (
              <details className="lt-lineage__revisions" open={lineage.status === "closed"}>
                <summary>{lineage.revisions.length}개 revision 보기</summary>
                <div>
                  {lineage.revisions.map((revision) => (
                    <div className="lt-lineage__revision" key={revision.id}>
                      <span>
                        <b>{revision.label}</b>
                        {revision.notes ? <small>{revision.notes}</small> : null}
                      </span>
                      <span className="lt-lineage__revision-meta">
                        <em>{DECISION_LABELS[revision.decision]}</em>
                        <i>{revision.executable ? "HTML/실행본" : "계획/자료"}</i>
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <div className="lt-lineage__revisions lt-lineage__revisions--empty">Revision intake 대기</div>
            )}

            <small className="lt-lineage__source">근거: {lineage.sourceLabel}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
