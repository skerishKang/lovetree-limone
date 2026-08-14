import type { DesignScenarioId } from "./design-lab";

export type DesignLineageStatus = "active" | "closed" | "hold" | "incoming";
export type DesignRevisionDecision =
  | "baseline"
  | "candidate"
  | "approved-plan"
  | "rejected"
  | "reference"
  | "superseded";

export interface DesignRevision {
  id: string;
  label: string;
  decision: DesignRevisionDecision;
  executable: boolean;
  route?: string;
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
      { id: "48-10", label: "FINAL GATE V1 정밀복원 인물분석 티저", decision: "rejected", executable: true, notes: "01보다 약해 비교/반려본으로 보존" },
    ],
  },
  {
    id: "lt-49-moment-reveal-portal",
    number: 49,
    label: "Idol Moment Reveal Portal",
    status: "active",
    summary: "한 PRIMARY의 여러 Moment가 감정적 Connection을 거쳐 Tree로 누적되는 남성 아이돌 시네마틱 계보입니다.",
    scenarios: ["cinematic-brand", "entry-onboarding", "relationship-retrospective"],
    currentDecision: "V2 Storyboard와 PRIMARY identity를 LOCK. 영상 복원을 먼저 하고 Full HTML은 승인 이후로 HOLD합니다.",
    sourceLabel: "49 4-3기 V2 PRIMARY 승인 / STORYBOARD LOCK 최종 실행지시",
    revisions: [
      { id: "49-v1-v1.1", label: "V1 / V1.1 visual & product concept", decision: "rejected", executable: true, notes: "최신 지시에서 신규 V2의 코드·시각 베이스로 사용 금지" },
      { id: "49-v2-locked-storyboard", label: "V2 Semantic Master / Locked Storyboard + PRIMARY", decision: "approved-plan", executable: false, notes: "STORYBOARD IS THE SPEC · VIDEO FIRST · HTML LAST" },
    ],
  },
  {
    id: "lt-50-dream-memory-cinematic",
    number: 50,
    label: "Dream Memory Cinematic",
    status: "active",
    summary: "여성 cast의 서로 다른 Moment Scene이 빛과 Connection으로 수렴해 Tree bloom으로 이어지는 시네마틱 계보입니다.",
    scenarios: ["cinematic-brand", "relationship-retrospective", "growth-milestones"],
    currentDecision: "기존 Supernova Storyboard를 최종 Visual Master로 LOCK. 새 캐스팅·새 콘티 없이 영상 복원부터 진행하고 Full HTML은 HOLD합니다.",
    sourceLabel: "50 4-2기 Existing Supernova Storyboard LOCK 최종 실행지시",
    revisions: [
      { id: "50-v1-v1.1", label: "V1 / V1.1 HTML visual implementation", decision: "rejected", executable: true, notes: "REJECTED_VISUAL_IMPLEMENTATION" },
      { id: "50-existing-supernova-storyboard", label: "Existing Supernova Storyboard Master", decision: "approved-plan", executable: false, notes: "Visual Master LOCK · video production next · Full HTML hold" },
    ],
  },
  {
    id: "lt-51-neon-human-analysis",
    number: 51,
    label: "Neon Human Analysis Interactive Promo",
    status: "hold",
    summary: "48에서 분리된 interactive promo 연구 계보입니다. 독립 계보는 유지하되 현재 분류대기 폴더에 직접 실행 자산이 없어 구현 상태를 과장하지 않습니다.",
    scenarios: ["cinematic-brand", "relationship-retrospective"],
    currentDecision: "48 Neon Pilot과 별도 계보로 보존. 현재 분류대기 폴더가 비어 있으므로 새 실행 자산/지시가 들어올 때까지 HOLD합니다.",
    sourceLabel: "LoveTree 차기 설계팀장 인수인계 51 / 51 분류대기 폴더 2026-08-09 확인",
    revisions: [],
  },
  {
    id: "lt-52-global-moment-orbit",
    number: 52,
    label: "Global Moment Orbit / 3D Network",
    status: "active",
    summary: "Earth, Moment node와 luminous Connection arc를 느리고 거대한 3D orbit 공간에서 탐색하는 계보입니다.",
    scenarios: ["relationship-retrospective", "growth-milestones", "cinematic-brand"],
    currentDecision: "V2/V2.1의 LoveTree Core 재해석을 중단하고 V3 Reference Earth Orbit을 현재 기준으로 진행합니다.",
    sourceLabel: "52 4-1기 V3 REFERENCE-FIRST EARTH ORBIT 최종 방향정정",
    revisions: [
      { id: "52-v2-cosmic-core", label: "V2 Cosmic LoveTree Core POC", decision: "superseded", executable: true, notes: "LoveTree Core/Crystal/Seed Heart 중심 재해석 방향 중단" },
      { id: "52-v3-reference-earth-orbit", label: "V3 Reference Earth Orbit", decision: "candidate", executable: true, notes: "Reference fidelity build · Earth 유지 · Moment node/Connection arc 의미만 최소 치환" },
    ],
  },
  {
    id: "lt-53-emotional-path-replay",
    number: 53,
    label: "Moment Node Light Flow / Emotional Path Replay",
    status: "active",
    summary: "선택한 Moment에서 시작해 directed Connection을 따라 perimeter light와 path travel을 순차 재생하고, 지나온 관계를 빛의 기억으로 남기는 2D SVG 계보입니다.",
    scenarios: ["relationship-retrospective", "tree-workspace"],
    currentDecision: "V1 motion engine을 보존한 V2를 현재 design-review 후보로 진행합니다. V2는 Connection skeleton을 항상 보이게 하고 색·광량·arrival impact·Living Tree climax를 강화합니다. CAP-14의 재사용 mechanic과 V2 시각 Revision의 제품 채택은 별도 검증합니다.",
    sourceLabel: "53 V2 Drive intake 2026-08-10 / Issue #80 continuous intake · V1 source review #119",
    revisions: [
      {
        id: "53-v1-node-light-flow",
        label: "V1 Moment Node Light Flow",
        decision: "superseded",
        executable: true,
        notes: "초기 replay-motion 기준 · 31,131 B · SHA256 ed3701b33e5a3afc96c9210162f664bbc32d0d800907bf7f8f702cc6a8021519",
      },
      {
        id: "53-v2-node-light-flow",
        label: "V2 Connection Skeleton + Saturated Living Tree",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/53/v2",
        notes: "V1 engine preserved · visible Connection skeleton · saturated energy · Living Tree climax · 39,162 B · SHA256 9dff1d204b6d09bb7198b5f61965c2bd81e08d04dec8b6b59d4c07807d07b847",
      },
    ],
  },
  {
    id: "lt-54-petal-runner-love-journey",
    number: 54,
    label: "Petal Runner / Love Journey",
    status: "active",
    summary: "첫 Moment가 감정으로 자라고 Connection path를 따라 Petal Runner가 이동해 LoveTree에 도착하는 4-stage cinematic memory journey 계보입니다.",
    scenarios: ["relationship-retrospective", "growth-milestones", "cinematic-brand"],
    currentDecision: "V4를 현재 source-fidelity candidate로 구현합니다. Source runtime과 fingerprints는 검증됐고 exact background + vehicle PNG 5개도 Git transfer/hash-verify를 완료했습니다. Source-fidelity 검증과 canonical product adoption은 별도 결정으로 유지합니다.",
    sourceLabel: "Lineage 54 sibling Drive intake 2026-08-10 · Issue #129 · README-V4 / index-v4.html",
    revisions: [
      {
        id: "54-v2-petal-runner-love-journey",
        label: "V2 Petal Runner Love Journey",
        decision: "reference",
        executable: false,
        notes: "prior source evidence · 21,011 B · retained in sibling Drive",
      },
      {
        id: "54-v3-petal-runner-love-journey",
        label: "V3 Petal Runner Love Journey",
        decision: "superseded",
        executable: false,
        notes: "preserved prior staging · 19,647 B · V4 redesigns vehicle/travel staging",
      },
      {
        id: "54-v4-petal-runner-love-journey",
        label: "V4 Petal Runner Travel + Arrival Staging",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/54/v4",
        notes: "source runtime 21,337 B · SHA256 ea9295e8d8a9fb14d6a0df8ec16e294a13df666770e285a2bbbf69807e38ebd9 · exact PNG transfer gate closed · product adoption remains separate",
      },
    ],
  },
  {
    id: "lt-56-crystal-memory-atelier",
    number: 56,
    label: "Crystal Memory Atelier",
    status: "active",
    summary: "누적 Moments를 하나의 premium living Memory Relic으로 기념·감상하고 재질·표정·각인으로 개인화하는 reward/collectible 계보입니다.",
    scenarios: ["growth-milestones", "people-archive"],
    currentDecision: "V1 collectible viewer와 V2 living premium Moment relic을 revision history로 보존하고, V3 direct expression + discrete rotation을 Design Lab source-fidelity candidate로 검토합니다. 100/200/365와 148/200은 source demo value이며 canonical V4 policy가 아닙니다.",
    sourceLabel: "08_LoveTree_Crystal_Memory_Atelier_V3 Drive intake 2026-08-11 / Issue #137",
    revisions: [
      {
        id: "56-v1-collectible-viewer",
        label: "V1 Crystal Collectible Viewer",
        decision: "superseded",
        executable: true,
        notes: "4 neutral angle stills · drag/wheel/auto turntable · material/light/inscription/Bloom",
      },
      {
        id: "56-v2-living-premium-relic",
        label: "V2 Living Premium Moment Relic",
        decision: "superseded",
        executable: true,
        notes: "expression awakening · heart light · on-crystal engraving · 100/200/365 source-demo reward framing",
      },
      {
        id: "56-v3-direct-expression-rotation",
        label: "V3 Direct Expression + Rotation Living Relic",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/56/v3",
        notes: "19,262 B · SHA256 9a7bb3415dade7d6fd04cecfe1be6ae04595d3b46d326f2b596dab819633a66c · 4 neutral angles + 4 frontal expression frames · no 16-state mesh",
      },
    ],
  },
  {
    id: "lt-57-living-character-world",
    number: 57,
    label: "Living Character World",
    status: "active",
    summary: "사람의 Moment를 분절된 창이 아니라 하나의 live/touchable character world에서 연속적으로 탐색하는 R&D 계보입니다.",
    scenarios: ["people-archive", "relationship-retrospective"],
    currentDecision: "V2 source를 provenance-anchored PARTIAL IMPLEMENT 후보로 보존합니다. route shell·world panorama·overlay·desktop interactions는 구현됐고, exact 54-PNG mirror가 repo에 들어오기 전까지 source-fidelity FULL PASS는 HOLD합니다.",
    sourceLabel: "Issue #147 Track A source intake / R&D_PRODUCTS_SPEC §7.8 / exact V2 source SHA256 6990160d186cdd66fdd7a8d05ed2ae2440dae355169bee577656560309bc5158",
    revisions: [
      {
        id: "57-v1-living-character-world",
        label: "V1 Source Baseline",
        decision: "baseline",
        executable: false,
        notes: "exact source SHA256 e29121f05a99d2071ad1f7c9807a81755a382b1d07c806335add140af5ad2f6b · provenance only",
      },
      {
        id: "57-v2-reactive-character-lubt",
        label: "V2 Interactive World Panorama",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/57/v2",
        notes: "PARTIAL IMPLEMENT · exact source SHA256 6990160d186cdd66fdd7a8d05ed2ae2440dae355169bee577656560309bc5158 · exact 54-PNG mirror required before source-fidelity FULL PASS",
      },
    ],
  },
  {
    id: "lt-58-videofigure-atelier",
    number: 58,
    label: "VideoFigure Atelier",
    status: "active",
    summary: "source video의 Moment를 Person과 분리된 DerivedFigure/Look으로 투영하고 8방향 회전형 Figure Memory로 탐색하는 people/archive 계보입니다.",
    scenarios: ["people-archive"],
    currentDecision: "V1을 baseline으로 보존하고 V2를 current Revision으로 Design Lab에서 PARTIAL IMPLEMENT합니다. canonical /v4 채택은 승인되지 않았고 exact 80-frame gate 전에는 source-fidelity PASS를 주장하지 않습니다.",
    sourceLabel: "Issue #145 · 05_LoveTree_VideoFigure_Atelier_V2 / LoveTree_VideoFigure_Atelier_V1",
    revisions: [
      {
        id: "58-v1-videofigure-atelier",
        label: "V1 Video Moment → curated Look → Figure Memory baseline",
        decision: "baseline",
        executable: true,
        notes: "30,604 B · SHA256 cbb981c2796944b2c8988949ae9bc2249480fe2cd566616ee702cd5363c85953 · Drive 1eqNaaDsEKSFLIKCddee4rNGyGW6y5v15",
      },
      {
        id: "58-v2-videofigure-atelier",
        label: "V2 Complete 8-view Cinematic Figure Archive",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/58/v2",
        notes: "27,918 B · SHA256 ac30f2abfc88e99e1ce7829f270c4cc76a5eae93b5f1b1e3a56dac1654c5b466 · PARTIAL IMPLEMENT · exact asset gate fail-closed",
      },
    ],
  },
  {
    id: "lt-61-guided-next-moment-builder",
    number: 61,
    label: "Guided Next Moment LoveTree Builder V1.7",
    status: "incoming",
    summary: "Guided discovery of plausible next Moments, editable WHY NEXT, Main/Branch growth and continuing Story Path. Native interaction candidate is implemented; exact source visual fidelity and canonical /v4 adoption remain separate HOLD decisions.",
    scenarios: ["tree-workspace"],
    currentDecision: "V1.7 is the current native Design Lab proving candidate. Central interaction-contract QA is required; P8 exact visual/source fidelity, owner local file navigation and receiver same-Moment focus remain HOLD.",
    sourceLabel: "Track61 V1.7 / Issue #158 / Design Intake Factory #157",
    revisions: [
      {
        id: "61-v1-7",
        label: "Guided Next Moment LoveTree Builder V1.7",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/61/61-v1-7",
        notes: "native interaction candidate; interaction-contract proving only; source fidelity/P8 not claimed",
      },
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
      if (revision.route && !revision.route.startsWith("/")) problems.push(`revision route must start with '/': ${revision.id}`);
    }
  }

  return problems;
}