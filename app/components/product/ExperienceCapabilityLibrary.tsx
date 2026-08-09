import {
  EXPERIENCE_CAPABILITIES,
  type ExperienceCapabilityStatus,
} from "@/lib/experience-capabilities";

const STATUS_LABELS: Record<ExperienceCapabilityStatus, string> = {
  observed: "관찰됨",
  mapped: "분류됨",
  "prototype-requested": "프로토타입 예정",
  prototyped: "프로토타입",
  validated: "검증됨",
  adopted: "채택",
  rejected: "보류/반려",
};

export default function ExperienceCapabilityLibrary() {
  const sourceProjects = new Set(
    EXPERIENCE_CAPABILITIES.flatMap((capability) => capability.evidence.map((evidence) => evidence.project)),
  );

  return (
    <section className="lt-capabilities" id="experience-capabilities" aria-labelledby="experience-capabilities-title">
      <div className="lt-capabilities__heading">
        <div>
          <p className="lt-lab__eyebrow">CROSS-PROJECT R&amp;D</p>
          <h2 id="experience-capabilities-title">Experience Capability Library</h2>
          <p>
            Variant가 “어떤 화면을 고를지”를 비교한다면, Capability는 “어떤 인터랙션 기술을 여러 화면에서
            재사용할지”를 관리합니다. LoveTree 밖에서 검증된 동생 작업도 제품 전체를 복제하지 않고 메커니즘만 추출합니다.
          </p>
        </div>
        <div className="lt-capabilities__stats" aria-label="Capability registry 요약">
          <span><b>{EXPERIENCE_CAPABILITIES.length}</b>capabilities</span>
          <span><b>{sourceProjects.size}</b>source projects</span>
        </div>
      </div>

      <div className="lt-capabilities__grid">
        {EXPERIENCE_CAPABILITIES.map((capability) => (
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
                {capability.applicableScenarios.map((scenario) => <span key={scenario}>{scenario}</span>)}
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

            {capability.issue ? (
              <a className="lt-capability__issue" href={`https://github.com/skerishKang/lovetree-limone/issues/${capability.issue}`}>
                Prototype / research issue #{capability.issue} ↗
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
