import type { DesignScenarioId } from "./design-lab";
import type { ExperienceCapabilityStatus } from "./experience-capabilities";

export type AuditedExperienceCapabilityId =
  | "intent-to-path-navigation"
  | "source-media-inspection-deck"
  | "question-lens-recomposition";

export type AuditedExperienceCapabilitySourceProject =
  | "광주 북구 AI Navigator"
  | "사실로"
  | "이어온";

export interface AuditedExperienceCapabilityEvidence {
  project: AuditedExperienceCapabilitySourceProject;
  artifact: string;
  observed: readonly string[];
}

export interface AuditedExperienceCapability {
  id: AuditedExperienceCapabilityId;
  label: string;
  status: ExperienceCapabilityStatus;
  summary: string;
  applicableScenarios: readonly DesignScenarioId[];
  dataNeeds: readonly string[];
  integrationRule: string;
  risks: readonly string[];
  evidence: readonly AuditedExperienceCapabilityEvidence[];
  issue?: number;
}

export const AUDITED_EXPERIENCE_CAPABILITIES_BATCH1 = [
  {
    id: "intent-to-path-navigation",
    label: "Intent-to-Path Navigation",
    status: "prototyped",
    summary: "자유 질문이나 추천 질문을 명시적인 경로 상태로 바꾸고, 그 경로를 단계적으로 설명한 뒤 다음 행동까지 연결하는 재사용 탐색 메커니즘입니다.",
    applicableScenarios: ["entry-onboarding", "relationship-retrospective", "community"],
    dataNeeds: [
      "query or suggested intent",
      "inspectable intent/path registry",
      "path tokens/nodes",
      "staged result model",
      "next-action adapter",
    ],
    integrationRule: "광주 북구 행정 의미론과 스타일은 가져오지 않습니다. LoveTree에서는 질문 → deterministic/inspectable path → Moment/Tree result → next action 상태 머신과 reduced-motion contract만 추출합니다.",
    risks: [
      "classifier ambiguity",
      "wrong-path recovery",
      "sticky/cinematic cost on mobile",
      "path explanation required",
      "keyboard and reduced-motion fallback required",
    ],
    evidence: [
      {
        project: "광주 북구 AI Navigator",
        artifact: "02_광주북구_AI내비게이터_시네마틱홈_v1.html · Drive 1jqUERqZ8DIZku441gmMQcDAA-UTXh-IP",
        observed: [
          "free-text and suggestion inputs share the same scenario runner",
          "findScenario(q) scores registered match terms",
          "selected scenario reconfigures tokens, route nodes and staged result content",
          "route theater progresses from question to next action",
          "mobile layout collapses and horizontally scrolls dense discovery areas",
          "prefers-reduced-motion removes boot/transition motion and converts route content to a static readable layout",
        ],
      },
    ],
    issue: 78,
  },
  {
    id: "source-media-inspection-deck",
    label: "Source / Media Inspection Deck",
    status: "prototyped",
    summary: "하나의 상세 검사 shell 안에서 media type별 viewer와 control adapter를 교체하면서 공통 Moment 문맥과 메타데이터를 유지하는 패턴입니다.",
    applicableScenarios: ["tree-workspace", "relationship-retrospective", "people-archive"],
    dataNeeds: [
      "media type",
      "source URL or local asset reference",
      "capture/created timestamps",
      "source/edit metadata",
      "optional checksum",
      "related Moment ids",
      "type-specific inspection adapter",
    ],
    integrationRule: "사실로의 법률·증거 의미론은 가져오지 않습니다. LoveTree에서는 image/video/audio/document/message/link를 같은 Moment detail shell에서 다루는 adapter architecture와 focus/live-region/mobile disclosure 계약만 재사용합니다.",
    risks: [
      "multi-player implementation surface",
      "large media memory/startup cost",
      "cross-origin frame limitations",
      "provenance fields must not imply legal validity",
      "small viewport control density",
    ],
    evidence: [
      {
        project: "사실로",
        artifact: "01_사실로_증거검사실_v1.html · Drive 1bxgbIAlS4zyu1765ZsbyXZUukQNCqMkl",
        observed: [
          "message, audio, CCTV, document, photo and video views swap type-specific controls inside one inspection shell",
          "all types retain previous/next and zoom controls",
          "selection replaces metadata/context without leaving the shell",
          "selection moves focus to the stage title and announces the new item through a live region",
          "mobile turns the type rail into sticky horizontal chips and metadata into an aria-expanded disclosure",
          "prefers-reduced-motion collapses animation and transition duration",
        ],
      },
    ],
    issue: 78,
  },
  {
    id: "question-lens-recomposition",
    label: "Question-Lens Recomposition",
    status: "observed",
    summary: "하나의 canonical data space를 여러 사용자 질문 렌즈로 재구성해 hero, issue, entity, timeline과 next-action 초점을 함께 바꾸는 패턴입니다.",
    applicableScenarios: ["tree-workspace", "relationship-retrospective", "growth-milestones"],
    dataNeeds: [
      "canonical Tree/Moment dataset",
      "explicit lens definitions",
      "lens-to-focus mapping",
      "shareable/deep-linkable lens state",
    ],
    integrationRule: "이어온의 경영 대시보드 의미론은 가져오지 않습니다. LoveTree에서는 하나의 데이터 그래프를 복제하지 않고 처음/최근/연결/다시보기 같은 렌즈가 같은 상태를 재투영하는 구조만 검토합니다.",
    risks: [
      "large simultaneous UI recomposition can disorient users",
      "lens state must remain deep-linkable",
      "desktop/mobile controls need one state source",
      "source has no prefers-reduced-motion contract",
    ],
    evidence: [
      {
        project: "이어온",
        artifact: "01_이어온_오늘의회사_v1_기능형.html · Drive 1BBMWVJlZOSdNkb2ZHuQIigcAjCX7fnh8",
        observed: [
          "four question lenses coordinate issue, entity and timeline state",
          "setQuestion(key) changes dependent focus state and re-renders the same workspace",
          "timeline and search interactions can infer or move the active question lens",
          "mobile bottom navigation controls the same question state as the desktop rail",
          "three-column desktop layout collapses to two and then one column",
          "no prefers-reduced-motion handling was found in the source",
        ],
      },
    ],
    issue: 78,
  },
] as const satisfies readonly AuditedExperienceCapability[];
