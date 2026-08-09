import type { DesignScenarioId } from "./design-lab";
import type { ExperienceCapabilityStatus } from "./experience-capabilities";

export type AuditedExperienceCapabilityBatch2Id = "narrative-to-structured-moment-assembly";
export type AuditedExperienceCapabilityBatch2SourceProject = "사실로";

export interface AuditedExperienceCapabilityBatch2Evidence {
  project: AuditedExperienceCapabilityBatch2SourceProject;
  artifact: string;
  observed: readonly string[];
}

export interface AuditedExperienceCapabilityBatch2 {
  id: AuditedExperienceCapabilityBatch2Id;
  label: string;
  status: ExperienceCapabilityStatus;
  summary: string;
  applicableScenarios: readonly DesignScenarioId[];
  dataNeeds: readonly string[];
  integrationRule: string;
  risks: readonly string[];
  evidence: readonly AuditedExperienceCapabilityBatch2Evidence[];
  issue: number;
}

export const AUDITED_EXPERIENCE_CAPABILITIES_BATCH2 = [
  {
    id: "narrative-to-structured-moment-assembly",
    label: "Narrative-to-Structured Moment Assembly",
    status: "prototyped",
    summary: "자유 서술을 원문 그대로 보존하면서 날짜·장소·사람·요약·미디어 힌트가 있는 Moment 초안으로 투영하고, 사용자가 교정·확인한 뒤 다음 단계로 넘기는 재사용 메커니즘입니다.",
    applicableScenarios: ["entry-onboarding", "tree-workspace", "people-archive"],
    dataNeeds: [
      "original freeform narrative",
      "derived date/time hint",
      "derived place hint",
      "derived people hints",
      "derived summary",
      "derived media hints",
      "user-edited draft fields",
      "explicit confirmation state",
    ],
    integrationRule: "사실로의 법률·사건·기관 의미론은 가져오지 않습니다. LoveTree에서는 원문 기억을 보존한 채 파생 Moment 후보를 별도 draft로 만들고, 미확인 값은 발명하지 않으며 사용자의 교정·확인 전에는 사실로 취급하지 않는 구조만 추출합니다.",
    risks: [
      "derived fields can be mistaken for facts",
      "unknown values must stay explicit",
      "original narrative must never be overwritten by draft edits",
      "automatic extraction needs inspectable confidence/recovery before product adoption",
      "source lacks reduced-motion and focus/live-region contracts",
    ],
    evidence: [
      {
        project: "사실로",
        artifact: "10.SASILRO_시민사건원장_CINEMATIC_PREMIUM_v1.html · Drive 15cwP3_0T6inN0Z0vazaQyWL6_Kp6SrvE · 75,174 bytes · SHA256 e0c82fb5548ad5fa0f5bb8a5660086c3992c929d5e35d917bf3d9f76e03355e0",
        observed: [
          "voice and text entry converge on one narrative state",
          "freeform narrative is parsed into time, place, person, summary and other candidate fields",
          "media/evidence words are surfaced as live hints while narrative text changes",
          "derived fields are copied into an editable structured board",
          "editing structured fields updates draft state while the original narrative remains separately visible",
          "explicit user confirmation changes pending board state before the persistent workspace",
          "responsive layout collapses multi-column assembly and workspace areas for smaller viewports",
          "no prefers-reduced-motion, explicit focus-transfer or aria-live contract was found in the source",
        ],
      },
    ],
    issue: 107,
  },
] as const satisfies readonly AuditedExperienceCapabilityBatch2[];
