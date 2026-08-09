import type { DesignScenarioId } from "./design-lab";
import type { ExperienceCapabilityStatus } from "./experience-capabilities";

export type AuditedExperienceCapabilityBatch4Id = "directed-connection-path-replay";
export type AuditedExperienceCapabilityBatch4SourceProject = "LoveTree";

export interface AuditedExperienceCapabilityBatch4Evidence {
  project: AuditedExperienceCapabilityBatch4SourceProject;
  artifact: string;
  observed: readonly string[];
}

export interface AuditedExperienceCapabilityBatch4 {
  id: AuditedExperienceCapabilityBatch4Id;
  label: string;
  status: ExperienceCapabilityStatus;
  summary: string;
  applicableScenarios: readonly DesignScenarioId[];
  dataNeeds: readonly string[];
  integrationRule: string;
  risks: readonly string[];
  evidence: readonly AuditedExperienceCapabilityBatch4Evidence[];
  issue: number;
}

export const AUDITED_EXPERIENCE_CAPABILITIES_BATCH4 = [
  {
    id: "directed-connection-path-replay",
    label: "Directed Connection Path Replay",
    status: "prototyped",
    summary: "선택한 Moment에서 시작해 실제 directed Connection 순서를 따라가며 Moment와 Connection을 번갈아 재생하고, 이미 지난 경로를 traversed memory로 남기는 회고 메커니즘입니다.",
    applicableScenarios: ["tree-workspace", "relationship-retrospective"],
    dataNeeds: [
      "Moment ids and labels",
      "directed Connection from/to ids",
      "deterministic outgoing Connection order",
      "selected start Moment",
      "ordered replay steps",
      "active replay step",
      "traversed step memory",
      "replay termination reason",
    ],
    integrationRule: "Lineage 53의 검은 화면, 노드 카드 모양, 발광 강도, benchmark/debug panel을 공통 제품 UI로 복제하지 않습니다. LoveTree에서는 실제 Moment/Connection graph에서 시작점을 고르고 directed subpath를 안전하게 도출한 뒤 active step과 traversed memory를 분리하는 재생 계약만 추출합니다.",
    risks: [
      "branching graphs require an explicit deterministic path-selection rule",
      "cycles must terminate instead of replaying forever",
      "broken Connection targets must fail visibly and safely",
      "animation must not imply Connections that are absent from canonical data",
      "large graphs need bounded traversal and progressive rendering",
      "reduced-motion must preserve step semantics without travel animation",
    ],
    evidence: [
      {
        project: "LoveTree",
        artifact: "53_LOVETREE_NODE_LIGHT_FLOW_v1.html · Drive 1TwqJox-xpBSC-I3nbroxGee7v4HCC9E- · 31,131 bytes · SHA256 ed3701b33e5a3afc96c9210162f664bbc32d0d800907bf7f8f702cc6a8021519",
        observed: [
          "seven Moment nodes and six directed Connections are rendered as one replayable path",
          "selecting any Moment starts replay from that node rather than always from the root",
          "replay alternates node impact/perimeter pulse and Connection path travel",
          "completed node and edge strokes remain visible as low-opacity path memory",
          "progress is derived from completed alternating node and edge steps",
          "pause/resume, replay and speed controls operate on one replay state",
          "ResizeObserver recomputes SVG geometry without changing the underlying Moment/Connection identities",
          "prefers-reduced-motion disables default autoplay and removes decorative transitions/bloom",
        ],
      },
    ],
    issue: 120,
  },
] as const satisfies readonly AuditedExperienceCapabilityBatch4[];
