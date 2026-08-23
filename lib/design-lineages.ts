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
      {
        id: "52-v3-reference-earth-orbit",
        label: "V3 Reference Earth Orbit · Exact Source Runner",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/52/v3",
        notes: "Reference fidelity build · Earth 유지 · Moment node/Connection arc 의미만 최소 치환 · exact source 1,140,569 B · SHA256 f8c017f964338a77b4286cc7fe3baed2675e8f6117aff0b83f943c071bf4f45b · fail-closed source runner · NOT a native Next implementation",
      },
      {
        id: "52-phase-2-spatial-primitive-proof",
        label: "Phase 2 Native Spatial Primitive Proof (COMMON_PRIMITIVE_SPLIT)",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/52/phase-2",
        notes: "bounded native proof of mechanics common to Lineage52 source evolution (raw WebGL lifecycle · orbit camera · spatial Moment/Connection projection · shared depth authority) · not the V3 source runner · no V6.1 native fidelity or product adoption claim · browser QA gate qa/lineage-52-phase2-native-browser-qa.mjs",
      },
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
    id: "lt-55-moonlit-blossom-hero",
    number: 55,
    label: "Moonlit Blossom Hero",
    status: "active",
    summary: "Memory Blossom Hero를 SEED → FEELING → MOMENTS → BLOOM 상태 흐름으로 재현하는 hero 계보입니다. 역사 source provenance는 미해결로 fail-closed 보존합니다.",
    scenarios: ["cinematic-brand"],
    currentDecision: "V1 fixture의 native 재구현을 Design Lab 검수면으로 유지합니다. source provenance가 해결되기 전까지 어떤 source-fidelity PASS도 주장하지 않으며 canonical /v4 채택은 별도 결정(HOLD)입니다.",
    sourceLabel: "Issue #134 · 14_LoveTree_Moonlit_Blossom_Hero_V1 / Drive 151yoYBj7rVaQbZuKvSbt8D5_LZC6vpqs · PROVENANCE_UNRESOLVED",
    revisions: [
      {
        id: "55-v1-moonlit-blossom-hero",
        label: "V1 Moonlit Blossom Hero · Native Reimplementation",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/55",
        notes: "native reimplementation of the v1 fixture (SEED/FEELING/MOMENTS/BLOOM) · historical recorded fingerprint 22,260 B · SHA256 1c682715… stays UNVERIFIED · SOURCE_REFERENCE_ONLY_MEDIA · HISTORICAL_ASSET_SOURCE_UNRESOLVED_PROVENANCE_HOLD · browser QA gate qa/lineage55-native-browser-qa.mjs · canonical /v4 adoption HOLD",
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
    id: "lt-59-living-memory-book",
    number: 59,
    label: "Living Memory Book / Memory Sketchbook Journey",
    status: "active",
    summary: "기존 Moment/Connection 경로를 물리적 추억책으로 경험하고 Story 재생, Branch 선택, 문맥 검수·편집까지 하나의 책 화면에서 처리하는 계보입니다.",
    scenarios: ["relationship-retrospective", "tree-workspace"],
    currentDecision: "V5 Story ON + inline edit + fast page turn + cinematic background를 현재 design-review 후보로 진행합니다. 접근성 remediation과 자산 출처 확정이 native gate입니다.",
    sourceLabel: "59 V5 Drive intake 2026-08-11 / Issue #161 intake + Web CTO release comment 5306408967",
    revisions: [
      {
        id: "59-v5-living-memory-book",
        label: "V5 Story ON · Inline Edit · Fast Page Turn · Cinematic Background",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/59/v5",
        notes: "17,192,064 B · SHA256 763f8a2f…e71 · ORIGIN_RIGHTS_PROVENANCE_HOLD · NATIVE_MEDIA_BINDING=EXACT_SMALL_PINNED_TRANSPORT_HOLD — 5 Web CTO-verified small exact assets committed + bound (review 4947154845); 3 large environment PNGs transport HOLD; synthetic demo placeholders retained",
      },
    ],
  },
  {
    id: "lt-60-3d-moment-cluster-explorer",
    number: 60,
    label: "3D Moment Cluster Explorer",
    status: "active",
    summary: "하나의 Tree 안에서 형성된 대형 memory cluster와 cluster들을 잇는 Bridge Moment를 발견하는 Cluster/Depth/Bridge 탐색 계보입니다. Cluster와 Bridge Moment는 VIEW_DERIVED이며 persistent entity가 아닙니다.",
    scenarios: ["relationship-retrospective"],
    currentDecision: "V1.2를 Design Lab source-fidelity candidate로 구현합니다. software-projected canvas 3D 렌더링을 유지하고 Cluster/Bridge는 뷰 파생 속성으로만 다루며 cross-track navigation은 해결된 repository target으로만 연결합니다. canonical /v4 채택은 별도 결정(HOLD)입니다.",
    sourceLabel: "Track60 V1.2 ★_현재후보_Track60_V1.2_REAL_NAVIGATION.html / Drive 1Pu6hSbIfW9X70jJCtRTs0WQyWaZvy_3M · Issue #142 · CTO_VERIFIED",
    revisions: [
      {
        id: "60-v1-2-3d-moment-cluster-explorer",
        label: "V1.2 3D Moment Cluster Deep Explorer",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/60/v1-2",
        notes: "source 55,260 B · SHA256 c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf · SOURCE_FINGERPRINT=PASS CTO_VERIFIED · VIEW_DERIVED cluster/bridge (no DB entity) · browser QA gate qa/lineage-60-v12-native-browser-qa.mjs · canonical /v4 adoption HOLD",
      },
    ],
  },
  {
    id: "lt-61-guided-next-moment-builder",
    number: 61,
    label: "Guided Next Moment LoveTree Builder V1.9",
    status: "incoming",
    summary: "Guided discovery of plausible next Moments, editable WHY NEXT, Main/Branch growth and continuing Story Path. Native interaction candidate is implemented; exact source visual fidelity and canonical /v4 adoption remain separate HOLD decisions.",
    scenarios: ["tree-workspace"],
    currentDecision: "V1.9 source reconciled (prior V1.7 pin was stale: current Drive root '현재후보.html' = V1.9, SHA-256 834fb634…). Native interaction candidate reuses the V1.7 implementation; V1.9 scale (progressive disclosure / Memory Cluster / branch scaling / disclosure actions) and Memory Glass visual deltas are NOT yet reimplemented in code — HOLD pending the actual V1.9 Drive source. Central interaction-contract QA is required; P8 exact visual/source fidelity, owner local file navigation and receiver same-Moment focus remain HOLD.",
    sourceLabel: "Track61 V1.9 / Drive 1U7gUbIZ71oT5amvhvpGf-Hazx_dhLTZe / Issue #158 reintake",
    revisions: [
      {
        id: "61-v1-9",
        label: "Guided Next Moment LoveTree Builder V1.9",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/61/61-v1-9",
        notes: "native interaction candidate reuses V1.7 implementation; V1.9 source reconciled; V1.9 scale/visual deltas and source fidelity/P8 not yet claimed",
      },
    ],
  },
  {
    id: "lt-63-moment-field-view-studio",
    number: 63,
    label: "Moment Field 3D View Studio",
    status: "active",
    summary: "하나의 canonical Moment+Connection dataset을 복수의 spatial presentation lens로 조망하고 View geometry/motion parameter를 실시간 조정하며 재사용 View preset을 저장·복원하는 view-preset studio 계보입니다.",
    scenarios: ["people-archive"],
    currentDecision: "PR #191로 병합된 V1 native proving candidate(CSS3D DOM · 54 Moments · 44 View Presets · 48 Inspector Controls)를 Design Lab 검수면으로 유지합니다. source authority는 V1.3 지시(EXECUTABLE_PENDING)가 current이며 View preset은 presentation state지 canonical data 변경이 아닙니다. canonical /v4 채택은 별도 결정(HOLD)입니다.",
    sourceLabel: "Issue #164 · 63_모먼트필드_3D뷰스튜디오 / Drive 1ReLPsimI10csOD-Mi2MT_ccXcWxcroFI · native proving merged via PR #191",
    revisions: [
      {
        id: "63-v1",
        label: "V1 Moment Field 3D View Studio · Native Proving Candidate",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/63",
        notes: "native proving candidate merged via PR #191 (Issue #164) · css3d-dom · 54 Moments · 44 View Presets · 48 bound Inspector Controls · V1 historical pin EXECUTABLE_PENDING · V1.3 instruction authority current (adoption UNDECIDED) · browser QA gate tests/lineage-63-route-browser-qa.mjs · canonical /v4 adoption HOLD",
      },
    ],
  },
  {
    id: "lt-67-memory-tape-persistent-world",
    number: 67,
    label: "Memory Tape Interactive Roll / Persistent World",
    status: "active",
    summary: "사용자가 그리는 memory tape이 정적 chunk(MEMORY)로 누적되고, 경계 있는 memory tail이 흔적을 남기며, ribbon hit/inspect와 Space rewind로 기억을 재방문하는 persistent world 계보입니다. V2.4.2는 WORKS_ 아카이브 내비게이션을 포함합니다.",
    scenarios: ["relationship-retrospective", "tree-workspace", "growth-milestones"],
    currentDecision: "V2.4 engine/texture/inspect/rewind 로직을 보존한 V2.4.2를 source-fidelity candidate로 구현합니다. 시작 직전 Drive freshness 재확인에서 V2.4.1·V2.4.2 정식 revision이 발견되어 배정된 V2.4 authority 대신 V2.4.2로 재핀했습니다. exact source는 RAW_WEBGL2 / CUSTOM_WEBGL입니다. canonical /v4 채택은 별도 결정(HOLD)이며 DB/API/Auth/Firebase/Neon/Worker는 변경하지 않습니다.",
    sourceLabel: "Track 67 V2.4.2 / Drive 18krSKEJ1QLA0bGFBh1MDg5Q261fJ-r5A (SHA256 85210be6…) · Issue #231",
    revisions: [
      {
        id: "67-v2-4-2-persistent-world-works-navigation-source",
        label: "V2.4.2 Persistent World + Works Navigation (Compare Menu) · Exact Source Runner",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/67/v2-4/source",
        notes: "exact source bytes 12,265,511 B · SHA256 85210be6a3368edd8e5e2d55c94721d91cd031c2cabca1c6698ffabf1e65ae6f · fail-closed source runner · supersedes V2.4/V2.4.1 ladder · canonical /v4 adoption HOLD",
      },
      {
        id: "67-v2-4-2-persistent-world-works-navigation-native",
        label: "V2.4.2 Persistent World + Works Navigation (Compare Menu) · Native Proving Candidate",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/67/v2-4/native",
        notes: "bounded native WebGL2 candidate over locked V2.4.2 mechanics · INSPECT/touch/browser-QA evidence per #258-D/E · WORKS menu mapping identical to source · canonical /v4 adoption HOLD",
      },
    ],
  },
  {
    id: "lt-64-floating-moment-entry-portal",
    number: 64,
    label: "Floating Moment Welcome Orbit",
    status: "active",
    summary: "복귀 사용자가 LoveTree / My Tree로 들어와 recent / important / First Moments가 하나의 연속된 부유 3D 카드 우주에 살아있음을 보고 하나의 Moment를 선택해 그 기억의 경로로 재진입하는 returning-user Memory Entry Portal 계보입니다.",
    scenarios: ["entry-onboarding"],
    currentDecision: "V1.2.1을 Design Lab source-fidelity candidate로 구현합니다. css3d-dom 렌더링을 faithful native React/CSS로 재구현하고, one selectedMomentId 권위·제스처 중재·Viewer 접근성·reduced-motion 수동 패리티를 보강합니다. canonical /v4 채택은 별도 결정(HOLD)이며 DB/API/Auth/Firebase/Neon/Worker는 변경하지 않습니다.",
    sourceLabel: "Issue #165 · 64_부유모먼트_웰컴오빗_입장포털 / Track64 V1.2.1 (Drive 1clob29lQZuKdaWF3KFGiPblKNsmqZ7k6)",
    revisions: [
      {
        id: "64-v1-floating-moment-entry-portal",
        label: "V1 reference / pre-executable proving snapshot",
        decision: "reference",
        executable: false,
        notes: "Issue #165 intake pin · Drive folder 1j792x7zyBJtMXm5KYdNNQJgPgatbQlN-",
      },
      {
        id: "64-v1-2-1-floating-moment-entry-portal",
        label: "V1.2.1 Floating Moment Welcome Orbit (Direct Card Open + Curated Media)",
        decision: "candidate",
        executable: true,
        route: "/design-lab/lineages/64/v1-2-1",
        notes: "1,565,313 B · SHA256 80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d · css3d-dom · V1.2 → V1.2.1 delta = Track59 cross-track local navigation path correction only · canonical /v4 adoption HOLD",
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