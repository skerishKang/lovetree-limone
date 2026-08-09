import type { DesignScenarioId } from "./design-lab";
import type { ExperienceCapabilityStatus } from "./experience-capabilities";

export type AuditedExperienceCapabilityBatch3Id = "interruptible-cinematic-story-playback";
export type AuditedExperienceCapabilityBatch3SourceProject = "LoveTree";

export interface AuditedExperienceCapabilityBatch3Evidence {
  project: AuditedExperienceCapabilityBatch3SourceProject;
  artifact: string;
  observed: readonly string[];
}

export interface AuditedExperienceCapabilityBatch3 {
  id: AuditedExperienceCapabilityBatch3Id;
  label: string;
  status: ExperienceCapabilityStatus;
  summary: string;
  applicableScenarios: readonly DesignScenarioId[];
  dataNeeds: readonly string[];
  integrationRule: string;
  risks: readonly string[];
  evidence: readonly AuditedExperienceCapabilityBatch3Evidence[];
  issue: number;
}

export const AUDITED_EXPERIENCE_CAPABILITIES_BATCH3 = [
  {
    id: "interruptible-cinematic-story-playback",
    label: "Interruptible Cinematic Story Playback",
    status: "observed",
    summary: "긴 Moment 서사를 하나의 시간축 재생으로 안내하되 chapter·progress·time을 같은 위치 상태에서 계산하고, wheel/touch/seek 같은 수동 입력이 들어오면 자동재생권을 즉시 사용자에게 넘기는 메커니즘입니다.",
    applicableScenarios: ["entry-onboarding", "tree-workspace", "relationship-retrospective", "growth-milestones"],
    dataNeeds: [
      "ordered story chapters",
      "chapter start progress",
      "total playback duration",
      "current elapsed time",
      "normalized progress",
      "active chapter",
      "playback mode",
      "manual takeover state",
    ],
    integrationRule: "Editorial Memory Home V3의 특정 인물·색감·chapter copy를 제품 표준으로 복제하지 않습니다. LoveTree에서는 하나의 ordered Moment story를 시간축 transport에 매핑하고, 자연 스크롤/수동 탐색/자동재생이 모두 동일한 progress→chapter 파생 경로를 공유하며 수동 입력이 항상 autoplay보다 우선하는 구조만 추출합니다.",
    risks: [
      "auto-scroll can fight user intent if manual takeover is delayed",
      "scroll distance is device-dependent and must not become canonical time data",
      "reduced-motion must preserve navigation semantics without forced movement",
      "background playback must stop cleanly when the page loses relevance",
      "chapter boundaries need deterministic clamping for short or malformed stories",
    ],
    evidence: [
      {
        project: "LoveTree",
        artifact: "lovetree-editorial-memory-home-v3.html · Drive 1ZKbV9dClSpf4R3cqoU3Xz8VzYcjrKxvR · 29,743 bytes · SHA256 a5f462c4ff9a541531cef0f0b010a2189622a97085e171cef83bc94b500239dc",
        observed: [
          "one 80-second story duration is mapped to the full document scroll extent",
          "requestAnimationFrame advances scroll position using document height divided by story duration",
          "one updatePlayer path derives progress bar, chapter label and elapsed time from current scroll position",
          "IntersectionObserver separately marks reveal visibility and active chapter navigation state",
          "wheel and touch input outside the transport immediately pause guided playback",
          "Space toggles playback while natural scrolling continues to update the same player state",
          "end-of-story playback becomes an explicit ended state and replay starts from the beginning",
          "prefers-reduced-motion suppresses decorative petal animation",
        ],
      },
    ],
    issue: 116,
  },
] as const satisfies readonly AuditedExperienceCapabilityBatch3[];
