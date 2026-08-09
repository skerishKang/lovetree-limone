import type { DesignScenarioId } from "./design-lab";

export type ExperienceCapabilityId =
  | "spatial-orbit-3d"
  | "cinematic-scene-transition"
  | "memory-fragment-convergence"
  | "relationship-spatial-map"
  | "temporal-version-history"
  | "physical-object-navigation"
  | "spatial-document-exploration"
  | "longform-milestone-navigation";

export type ExperienceCapabilityStatus =
  | "observed"
  | "mapped"
  | "prototype-requested"
  | "prototyped"
  | "validated"
  | "adopted"
  | "rejected";

export type ExperienceCapabilitySourceProject =
  | "LoveTree"
  | "이어온"
  | "사실로"
  | "또다른우주"
  | "아스테리브"
  | "Guided Reader";

export interface ExperienceCapabilityEvidence {
  project: ExperienceCapabilitySourceProject;
  artifact: string;
  observed: readonly string[];
}

export interface ExperienceCapability {
  id: ExperienceCapabilityId;
  label: string;
  status: ExperienceCapabilityStatus;
  summary: string;
  applicableScenarios: readonly DesignScenarioId[];
  dataNeeds: readonly string[];
  integrationRule: string;
  risks: readonly string[];
  evidence: readonly ExperienceCapabilityEvidence[];
  issue?: number;
}

export const EXPERIENCE_CAPABILITIES: readonly ExperienceCapability[] = [
  {
    id: "spatial-orbit-3d",
    label: "Spatial Orbit / 3D Connection Arcs",
    status: "prototype-requested",
    summary: "Moment node와 Connection route를 깊이·occlusion·camera orbit이 있는 3D 공간에서 탐색하는 재사용 메커니즘입니다.",
    applicableScenarios: ["relationship-retrospective", "growth-milestones", "cinematic-brand"],
    dataNeeds: ["Moment node identity", "parent/relationship edges", "creation/discovery time", "activation state", "optional detail overlay adapter"],
    integrationRule: "재사용 대상은 camera orbit, node activation, 3D route/arc, pulse, occlusion과 depth입니다. Earth/Crystal 같은 중심 오브젝트 미감은 각 Variant의 표현으로 남기고 공통 Capability에 강제하지 않습니다.",
    risks: ["WebGL/browser support", "GPU/mobile performance", "touch gesture conflict", "large graph density", "reduced-motion/fallback required"],
    evidence: [
      {
        project: "LoveTree",
        artifact: "52 / lovetree-52-v2-cosmic-core-poc.html (superseded visual direction, retained interaction evidence)",
        observed: ["WebGL canvas", "drag/swipe orbit", "wheel dolly", "Moment seeds", "connection growth events", "particle field", "glass/emissive material experiments"],
      },
      {
        project: "LoveTree",
        artifact: "52 / lovetree-52-v3-reference-earth-orbit.html",
        observed: ["large Earth spatial anchor", "slow camera orbit/yaw/dolly", "foreground/rear 3D objects", "front/back luminous arc occlusion", "moving route pulse", "surface Moment node activation", "desktop drag", "mobile swipe"],
      },
    ],
    issue: 81,
  },
  {
    id: "cinematic-scene-transition",
    label: "Cinematic Scene Transition",
    status: "prototype-requested",
    summary: "제품 상태를 단순 route 전환이 아니라 연속적인 장면 변화로 전달하는 시네마틱 전환 문법입니다.",
    applicableScenarios: ["entry-onboarding", "relationship-retrospective", "growth-milestones", "cinematic-brand"],
    dataNeeds: ["scene state", "transition direction", "optional progress index"],
    integrationRule: "scene lifecycle과 product navigation을 분리하고 opacity/scale/depth/blur 전환을 공통 motion primitive로 제공합니다.",
    risks: ["motion sickness", "focus continuity", "route/history synchronization", "reduced-motion required"],
    evidence: [
      {
        project: "이어온",
        artifact: "03_회사기억추적_v1_시네마틱통합시연.html",
        observed: ["perspective stage", "scene active/leaving lifecycle", "depth/blur transition", "scene progress navigation"],
      },
    ],
    issue: 82,
  },
  {
    id: "memory-fragment-convergence",
    label: "Memory Fragment Convergence",
    status: "prototype-requested",
    summary: "흩어진 기억 조각이 사용자 동작을 계기로 중심축과 관계 구조로 응집되는 연출 메커니즘입니다.",
    applicableScenarios: ["entry-onboarding", "relationship-retrospective", "cinematic-brand"],
    dataNeeds: ["Moment snippets", "person/date/media labels", "target relationship axis"],
    integrationRule: "무작위 floating card 장식이 아니라 실제 Moment/Relation 데이터를 공간 조각으로 투영하고, 수렴 이후 canonical product view로 자연스럽게 연결합니다.",
    risks: ["decorative-only drift", "small-screen clutter", "animation duration", "readability during motion"],
    evidence: [
      {
        project: "이어온",
        artifact: "03_회사기억추적_v1_시네마틱통합시연.html",
        observed: ["scattered fragment field", "gather state", "memory-axis reveal", "fragment depth/reposition animation"],
      },
    ],
    issue: 82,
  },
  {
    id: "relationship-spatial-map",
    label: "Relationship Spatial Map",
    status: "prototype-requested",
    summary: "사람·시간·장소·자료처럼 서로 다른 객체를 보드 위에 배치하고 연결선으로 관계를 설명하는 패턴입니다.",
    applicableScenarios: ["relationship-retrospective", "people-archive"],
    dataNeeds: ["Moment", "Person", "date/time", "media/evidence-like attachments", "relationship edges"],
    integrationRule: "사실로의 사건 의미론은 가져오지 않고, LoveTree의 Person/Moment/Relation 타입으로 node schema를 교체합니다.",
    risks: ["dense graph overlap", "mobile layout", "edge-label accessibility", "large-tree virtualization"],
    evidence: [
      {
        project: "사실로",
        artifact: "01_사실로_시민사건원장_고소인중심_v1_GATE3.html",
        observed: ["spatial cards", "typed nodes", "connecting lines", "overview-to-detail relationship reading"],
      },
    ],
    issue: 82,
  },
  {
    id: "temporal-version-history",
    label: "Memory Evolution / Version History",
    status: "prototype-requested",
    summary: "최초 기록을 덮어쓰지 않고 이후 보완·회고·관계 변화가 시간순으로 누적되는 기록 패턴입니다.",
    applicableScenarios: ["tree-workspace", "relationship-retrospective", "people-archive"],
    dataNeeds: ["original Moment payload", "subsequent annotations/edits", "timestamps", "actor/source metadata"],
    integrationRule: "기존 Moment CRUD를 무조건 이벤트소싱으로 재작성하지 않습니다. 먼저 read-model/annotation layer로 가치와 비용을 검증한 뒤 backend 확장을 판단합니다.",
    risks: ["schema expansion", "privacy implications", "edit semantics", "migration cost"],
    evidence: [
      {
        project: "사실로",
        artifact: "01_사실로_시민사건원장_고소인중심_v1_GATE3.html",
        observed: ["original record preserved", "later statements/records accumulated", "version/status labels", "timeline presentation"],
      },
    ],
    issue: 82,
  },
  {
    id: "physical-object-navigation",
    label: "Physical Book / Object Navigation",
    status: "observed",
    summary: "사람·시즌·아카이브를 평면 메뉴가 아니라 책/오브젝트처럼 집고 열고 닫는 공간 탐색 문법입니다.",
    applicableScenarios: ["people-archive", "growth-milestones"],
    dataNeeds: ["Person or Season identity", "cover/preview media", "item count", "archive metadata"],
    integrationRule: "책이라는 비주얼을 강제하지 않고 select → focus → open → return이라는 물리적 navigation grammar를 재사용합니다.",
    risks: ["3D transform complexity", "touch affordance", "deep-link state", "accessibility fallback"],
    evidence: [
      {
        project: "또다른우주",
        artifact: "CSS3D 서가 / 책 오브젝트 모션 / WebGL 책읽기 / 서가형책읽기 후보군",
        observed: ["CSS3D shelf", "book-object motion experiments", "WebGL reading experiments", "final bookshelf reading candidates"],
      },
    ],
    issue: 83,
  },
  {
    id: "spatial-document-exploration",
    label: "Spatial Archive Exploration",
    status: "observed",
    summary: "깊은 자료 계층을 사용자가 위치감각을 잃지 않고 공간적으로 탐색하도록 만드는 통합 탐색 패턴입니다.",
    applicableScenarios: ["people-archive", "relationship-retrospective"],
    dataNeeds: ["hierarchical archive nodes", "breadcrumbs/parent context", "preview metadata"],
    integrationRule: "LoveTree에서는 Person → Season → Moment의 계층 탐색에만 적용하고 일반 문서관리 의미론은 가져오지 않습니다.",
    risks: ["navigation disorientation", "mobile depth navigation", "back-button semantics"],
    evidence: [
      {
        project: "아스테리브",
        artifact: "서가형문서탐색 / 물리책읽기 / 통합탐색UI 후보군",
        observed: ["shelf document exploration", "physical reading concept", "integrated exploration UI"],
      },
    ],
    issue: 83,
  },
  {
    id: "longform-milestone-navigation",
    label: "Long-form Chapter / Milestone Navigation",
    status: "observed",
    summary: "수십~수백 개 단위를 완료/대기 상태와 함께 한눈에 탐색하는 장기 콘텐츠 인덱스 패턴입니다.",
    applicableScenarios: ["people-archive", "growth-milestones"],
    dataNeeds: ["ordered units", "completion state", "deep link", "progress summary"],
    integrationRule: "문학 콘텐츠는 가져오지 않고, 100/300+ Moments·Season·장기 Archive의 progress/index grammar로만 재사용합니다.",
    risks: ["large index density", "mobile scanning", "progress semantics"],
    evidence: [
      {
        project: "Guided Reader",
        artifact: "ILIAD / ODYSSEY / AENEID / DIVINE_COMEDY Guided Reader",
        observed: ["large chapter index", "complete/pending state", "deep-linked units", "long-running content progress"],
      },
    ],
    issue: 84,
  },
] as const;

export function validateExperienceCapabilities(
  capabilities: readonly ExperienceCapability[] = EXPERIENCE_CAPABILITIES,
): readonly string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const capability of capabilities) {
    if (ids.has(capability.id)) problems.push(`duplicate capability id: ${capability.id}`);
    ids.add(capability.id);
    if (capability.applicableScenarios.length === 0) problems.push(`capability has no scenario: ${capability.id}`);
    if (capability.evidence.length === 0) problems.push(`capability has no evidence: ${capability.id}`);
    if (capability.dataNeeds.length === 0) problems.push(`capability has no data contract: ${capability.id}`);
    for (const evidence of capability.evidence) {
      if (!evidence.artifact.trim()) problems.push(`capability evidence has no artifact: ${capability.id}`);
      if (evidence.observed.length === 0) problems.push(`capability evidence has no observations: ${capability.id}`);
    }
  }

  return problems;
}

export function capabilitiesForScenario(
  scenarioId: DesignScenarioId,
  capabilities: readonly ExperienceCapability[] = EXPERIENCE_CAPABILITIES,
): readonly ExperienceCapability[] {
  return capabilities.filter((capability) => capability.applicableScenarios.includes(scenarioId));
}
