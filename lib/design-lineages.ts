import type { DesignScenarioId } from "./design-lab";

export type DesignLineageStatus = "active" | "closed" | "hold" | "incoming";
export type DesignRevisionDecision =
  | "baseline"
  | "candidate"
  | "approved-plan"
  | "rejected"
  | "reference";

export interface DesignRevision {
  id: string;
  label: string;
  decision: DesignRevisionDecision;
  executable: boolean;
  notes?: string;
}

export interface DesignLineage {
  id: string;
  number: number;
  label: string;
  status: DesignLineageStatus;
  summary: string;
  scenarios: readonly DesignScenarioId[];
  currentDecision: string;
  sourceLabel: string;
  revisions: readonly DesignRevision[];
}

export const DESIGN_LINEAGES: readonly DesignLineage[] = [
  {
    id: "lt-48-neon-pilot",
    number: 48,
    label: "Idol LoveTree Neon Pilot",
    status: "closed",
    summary: "공격적인 리듬과 예측 불가능한 시각 충격을 탐색한 시네마틱 계보입니다.",
    scenarios: ["cinematic-brand", "entry-onboarding"],
    currentDecision: "추가 revision 제작 중단. 01 V1을 기준 후보로 보존하고 10은 비교/반려 이력으로 유지합니다.",
    sourceLabel: "LoveTree 48 네온파일럿 버전목록 / 차기 설계팀장 인수인계",
    revisions: [
      { id: "48-01", label: "V1 최초 시네마틱 원형", decision: "baseline", executable: true, notes: "현재 fallback/기준 후보" },
      { id: "48-02", label: "V2 시네마틱 리듬 강화", decision: "reference", executable: true },
      { id: "48-03", label: "V3 스토리보드 마스터 복귀", decision: "reference", executable: true },
      { id: "48-04", label: "V4 V2 리듬 + V3 구조 통합", decision: "reference", executable: true },
      { id: "48-05", label: "V4.1 품질 수정 최종 검토", decision: "reference", executable: true },
      { id: "48-06", label: "V4.2 Storyboard 1", decision: "rejected", executable: false },
      { id: "48-07", label: "V4.2 Storyboard 2", decision: "approved-plan", executable: false },
      { id: "48-08", label: "V4.2 참고영상 리셋", decision: "reference", executable: true },
      { id: "48-09", label: "V4.2b 인물 분석 복귀", decision: "reference", executable: true },
      { id: "48-10", label: "FINAL GATE V1 정밀복원 인물분석 티저", decision: "rejected", executable: true, notes: "01보다 약하면 반려한다는 Final Gate 원칙에 따라 비교본으로 보존" },
    ],
  },
  {
    id: "lt-49-moment-reveal-portal",
    number: 49,
    label: "Idol Moment Reveal Portal",
    status: "active",
    summary: "남성 fictional idol cast와 portal/glass/liquid 계열을 이용한 Moment reveal 시네마틱입니다.",
    scenarios: ["cinematic-brand", "entry-onboarding"],
    currentDecision: "NCT 127 Superhuman teaser를 주원본으로 shot-by-shot 대응하는 독립 계보로 진행합니다.",
    sourceLabel: "LoveTree 차기 설계팀장 인수인계 49",
    revisions: [],
  },
  {
    id: "lt-50-dream-memory-cinematic",
    number: 50,
    label: "Dream Memory Cinematic",
    status: "active",
    summary: "여성 fictional idol cast와 고해상도 scene-specific asset을 이용한 cinematic entry 연구입니다.",
    scenarios: ["cinematic-brand", "relationship-retrospective"],
    currentDecision: "기존 v1.5 visual은 반려. aespa Supernova teaser의 shot structure를 기준으로 새 계보를 진행합니다.",
    sourceLabel: "LoveTree 차기 설계팀장 인수인계 50",
    revisions: [],
  },
  {
    id: "lt-51-neon-human-analysis",
    number: 51,
    label: "Neon Human Analysis Interactive Promo",
    status: "active",
    summary: "48에서 분리된 interactive promo 연구로, 시네마틱 계보와 독립적으로 인터랙션을 평가합니다.",
    scenarios: ["cinematic-brand", "relationship-retrospective"],
    currentDecision: "48 Neon Pilot과 별도 계보로 보존하고 독립 비교합니다.",
    sourceLabel: "LoveTree 차기 설계팀장 인수인계 51",
    revisions: [],
  },
  {
    id: "lt-52-global-moment-orbit",
    number: 52,
    label: "Global Moment Orbit / 3D Network",
    status: "incoming",
    summary: "Moment seed와 Connection growth를 WebGL orbit 공간에서 탐색하는 신규 3D 계보입니다.",
    scenarios: ["relationship-retrospective", "growth-milestones", "cinematic-brand"],
    currentDecision: "Cosmic core POC를 전체 제품으로 승격하지 않고 Spatial 3D Capability와 시각 Variant 양쪽에서 평가합니다.",
    sourceLabel: "52 글로벌모먼트오빗 / V2_COSMIC_LOVETREE_CORE_POC",
    revisions: [
      { id: "52-v2-cosmic-core", label: "V2 Cosmic LoveTree Core POC", decision: "candidate", executable: true },
    ],
  },
] as const;

export function validateDesignLineages(lineages: readonly DesignLineage[] = DESIGN_LINEAGES): readonly string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const numbers = new Set<number>();

  for (const lineage of lineages) {
    if (ids.has(lineage.id)) problems.push(`duplicate lineage id: ${lineage.id}`);
    ids.add(lineage.id);
    if (numbers.has(lineage.number)) problems.push(`duplicate lineage number: ${lineage.number}`);
    numbers.add(lineage.number);
    if (lineage.scenarios.length === 0) problems.push(`lineage has no scenario: ${lineage.id}`);

    const revisionIds = new Set<string>();
    for (const revision of lineage.revisions) {
      if (revisionIds.has(revision.id)) problems.push(`duplicate revision id in ${lineage.id}: ${revision.id}`);
      revisionIds.add(revision.id);
    }
  }

  return problems;
}
