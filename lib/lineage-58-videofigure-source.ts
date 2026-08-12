import { VIDEOFIGURE_ANGLES, type VideoFigureAngle } from "./videofigure-turntable";

export const LINEAGE_58_VIDEOFIGURE_SOURCE = {
  lineageId: "lt-58-videofigure-atelier",
  revisionId: "58-v2-videofigure-atelier",
  baselineRevisionId: "58-v1-videofigure-atelier",
  scenarioId: "people-archive",
  route: "/design-lab/lineages/58/v2",
  v2FolderId: "1pmg0xuLEaYafMnhfM9ZJyQUc0qAqkXlr",
  v2RuntimeFile: "lovetree-video-figure-atelier-v2.html",
  v2RuntimeDriveId: "1iC6IyJBy86UhIANts6nDm414WnBUU66p",
  v2RuntimeBytes: 27_918,
  v2RuntimeSha256: "ac30f2abfc88e99e1ce7829f270c4cc76a5eae93b5f1b1e3a56dac1654c5b466",
  v1FolderId: "1Z7yZmFMGaIWwaK0msBBQNtmXWMUDh9uh",
  v1RuntimeFile: "lovetree-video-figure-atelier-v1.html",
  v1RuntimeDriveId: "1eqNaaDsEKSFLIKCddee4rNGyGW6y5v15",
  v1RuntimeBytes: 30_604,
  v1RuntimeSha256: "cbb981c2796944b2c8988949ae9bc2249480fe2cd566616ee702cd5363c85953",
  assetHoldMarker: "EXACT_VIDEOFIGURE_ASSET_TRANSFER_HOLD",
  renderingTier: "sprite-2.5d",
  implementationMode: "design-lab-native-react-source-fidelity-candidate",
} as const;

export interface VideoFigurePersonProjection {
  id: string;
  displayName: string;
  rightsStatus: "design-fixture-only" | "approved-for-product";
}

export interface VideoFigureMomentProjection {
  id: string;
  personId: string;
  sourceMediaId: string;
  sourceLabel: string;
  startSeconds: number;
  endSeconds: number;
}

export interface VideoFigureAngleAssetProjection {
  angle: VideoFigureAngle;
  path: string;
}

export interface VideoFigureDerivedLookProjection {
  id: string;
  personId: string;
  sourceMomentId: string;
  gender: "male" | "female";
  name: string;
  title: string;
  kind: string;
  kicker: string;
  description: string;
  lookLabel: string;
  sourceDisplay: string;
  accent: string;
  accentRgb: string;
  identityScore: number;
  outfitScore: number;
  background: string;
  angleAssets: readonly VideoFigureAngleAssetProjection[];
}

export const VIDEOFIGURE_PERSONS: readonly VideoFigurePersonProjection[] = Array.from({ length: 10 }, (_, index) => ({
  id: `person-${String.fromCharCode(65 + index).toLowerCase()}`,
  displayName: `Source Fixture ${String.fromCharCode(65 + index)}`,
  rightsStatus: "design-fixture-only" as const,
}));

const baseLooks = [
  { id: "A", gender: "male", name: "Crystal Night", title: "CRYSTAL NIGHT", kind: "STAGE", kicker: "검은 무대 위, 은빛으로 남은 순간", description: "크리스털 자수 수트와 무대의 긴장을 동일 인물 8방향 피규어로 잠급니다.", lookLabel: "BLACK CRYSTAL SUIT", sourceDisplay: "VIDEO 01 · 00:14.8 — 00:17.2", sourceMediaId: "video-01", startSeconds: 14.8, endSeconds: 17.2, accent: "#ff5c8f", accentRgb: "255,92,143", identityScore: 98, outfitScore: 98, background: "radial-gradient(circle at 62% 55%,#48142d 0%,#171020 28%,#06070b 65%,#020307 100%)" },
  { id: "B", gender: "male", name: "Cobalt Rush", title: "COBALT RUSH", kind: "PERFORMANCE", kicker: "푸른 재킷과 함께 빨라진 심장", description: "코발트 모토 재킷의 지퍼와 실루엣을 모든 각도에서 이어지는 하나의 룩으로 만듭니다.", lookLabel: "COBALT MOTO", sourceDisplay: "VIDEO 12 · 01:02.1 — 01:04.4", sourceMediaId: "video-12", startSeconds: 62.1, endSeconds: 64.4, accent: "#4ba7ff", accentRgb: "75,167,255", identityScore: 97, outfitScore: 99, background: "radial-gradient(circle at 64% 53%,#123f73 0%,#0b172b 32%,#05070c 67%,#020308 100%)" },
  { id: "C", gender: "male", name: "Ivory Pause", title: "IVORY PAUSE", kind: "AIRPORT", kicker: "잠시 멈춘 시간의 아이보리 온도", description: "공항 영상 속 니트와 자연스러운 자세를 조용한 프리미엄 피규어로 보관합니다.", lookLabel: "IVORY AIRPORT", sourceDisplay: "VIDEO 21 · 02:11.0 — 02:14.6", sourceMediaId: "video-21", startSeconds: 131, endSeconds: 134.6, accent: "#f2d9ae", accentRgb: "242,217,174", identityScore: 98, outfitScore: 96, background: "radial-gradient(circle at 64% 48%,#67523e 0%,#231d1c 30%,#09090b 66%,#030305 100%)" },
  { id: "D", gender: "male", name: "Rose Velvet", title: "ROSE VELVET", kind: "STAGE", kicker: "로즈 벨벳으로 선명해진 실루엣", description: "크롭 재킷의 길이와 검은 라펠까지 후면에서도 끊기지 않도록 고정했습니다.", lookLabel: "ROSE VELVET SUIT", sourceDisplay: "VIDEO 37 · 03:44.2 — 03:46.0", sourceMediaId: "video-37", startSeconds: 224.2, endSeconds: 226, accent: "#e88aaa", accentRgb: "232,138,170", identityScore: 96, outfitScore: 99, background: "radial-gradient(circle at 63% 52%,#5c203c 0%,#21111f 32%,#08070b 66%,#030206 100%)" },
  { id: "E", gender: "male", name: "Silver Replay", title: "SILVER REPLAY", kind: "REHEARSAL", kicker: "연습실에서 발견한 가장 편한 모습", description: "실버 데님과 움직임의 여유를 영상 속 리허설 순간 그대로 회전 컬렉션에 넣었습니다.", lookLabel: "SILVER DENIM", sourceDisplay: "VIDEO 44 · 04:19.7 — 04:22.5", sourceMediaId: "video-44", startSeconds: 259.7, endSeconds: 262.5, accent: "#a8c5d8", accentRgb: "168,197,216", identityScore: 97, outfitScore: 97, background: "radial-gradient(circle at 64% 51%,#29414d 0%,#141d23 31%,#07090d 66%,#020307 100%)" },
  { id: "F", gender: "female", name: "Black Spark", title: "BLACK SPARK", kind: "STAGE", kicker: "검은 드레스 위로 번진 은빛 불꽃", description: "드레스의 크리스털 장식과 부츠를 유지한 채 여성 피규어도 완전한 8방향으로 확장했습니다.", lookLabel: "BLACK SILVER DRESS", sourceDisplay: "VIDEO 53 · 05:08.0 — 05:10.8", sourceMediaId: "video-53", startSeconds: 308, endSeconds: 310.8, accent: "#ff7eb2", accentRgb: "255,126,178", identityScore: 98, outfitScore: 99, background: "radial-gradient(circle at 64% 52%,#5e193b 0%,#241020 32%,#08070c 67%,#020307 100%)" },
  { id: "G", gender: "female", name: "Ivory Bloom", title: "IVORY BLOOM", kind: "VLOG", kicker: "햇살처럼 조용히 피어난 기억", description: "아이보리 니트와 플리츠의 움직임을 부드러운 360도 룩으로 보존했습니다.", lookLabel: "IVORY KNIT", sourceDisplay: "VIDEO 62 · 06:22.4 — 06:25.1", sourceMediaId: "video-62", startSeconds: 382.4, endSeconds: 385.1, accent: "#ffd7b7", accentRgb: "255,215,183", identityScore: 99, outfitScore: 97, background: "radial-gradient(circle at 64% 50%,#74503f 0%,#2b1d1c 31%,#0c090c 66%,#030306 100%)" },
  { id: "H", gender: "female", name: "Cobalt Beat", title: "COBALT BEAT", kind: "PERFORMANCE", kicker: "코발트 블루가 리듬을 기억하는 방식", description: "재킷의 블루와 체인 장식을 앞뒤 모든 각도에서 하나의 퍼포먼스 룩으로 연결합니다.", lookLabel: "COBALT STAGE", sourceDisplay: "VIDEO 71 · 07:17.3 — 07:19.9", sourceMediaId: "video-71", startSeconds: 437.3, endSeconds: 439.9, accent: "#4a8cff", accentRgb: "74,140,255", identityScore: 97, outfitScore: 99, background: "radial-gradient(circle at 63% 50%,#163d78 0%,#101932 31%,#06070d 67%,#020307 100%)" },
  { id: "I", gender: "female", name: "Rose Tempo", title: "ROSE TEMPO", kind: "STAGE", kicker: "핑크 조명과 검은 리듬의 교차", description: "로즈 재킷과 팬츠의 옆선을 8개 시점으로 이어 영상의 템포를 입체로 재현했습니다.", lookLabel: "ROSE BLACK SUIT", sourceDisplay: "VIDEO 89 · 08:09.1 — 08:11.6", sourceMediaId: "video-89", startSeconds: 489.1, endSeconds: 491.6, accent: "#f06d9f", accentRgb: "240,109,159", identityScore: 98, outfitScore: 99, background: "radial-gradient(circle at 63% 51%,#68213f 0%,#251020 32%,#09070c 67%,#020306 100%)" },
  { id: "J", gender: "female", name: "Denim Echo", title: "DENIM ECHO", kind: "REHEARSAL", kicker: "꾸미지 않은 순간이 오래 남을 때", description: "데님 재킷의 자연스러운 드레이프와 짧은 단발을 회전 중에도 동일하게 유지했습니다.", lookLabel: "DENIM REHEARSAL", sourceDisplay: "VIDEO 100 · 09:33.6 — 09:36.1", sourceMediaId: "video-100", startSeconds: 573.6, endSeconds: 576.1, accent: "#78bde3", accentRgb: "120,189,227", identityScore: 99, outfitScore: 98, background: "radial-gradient(circle at 64% 51%,#214b64 0%,#11212d 31%,#06090d 67%,#020307 100%)" },
] as const;

export const VIDEOFIGURE_MOMENTS: readonly VideoFigureMomentProjection[] = baseLooks.map((look, index) => ({
  id: `moment-${look.id.toLowerCase()}`,
  personId: `person-${look.id.toLowerCase()}`,
  sourceMediaId: look.sourceMediaId,
  sourceLabel: look.sourceDisplay,
  startSeconds: look.startSeconds,
  endSeconds: look.endSeconds,
}));

export const VIDEOFIGURE_LOOKS: readonly VideoFigureDerivedLookProjection[] = baseLooks.map((look) => ({
  id: look.id,
  personId: `person-${look.id.toLowerCase()}`,
  sourceMomentId: `moment-${look.id.toLowerCase()}`,
  gender: look.gender,
  name: look.name,
  title: look.title,
  kind: look.kind,
  kicker: look.kicker,
  description: look.description,
  lookLabel: look.lookLabel,
  sourceDisplay: look.sourceDisplay,
  accent: look.accent,
  accentRgb: look.accentRgb,
  identityScore: look.identityScore,
  outfitScore: look.outfitScore,
  background: look.background,
  angleAssets: VIDEOFIGURE_ANGLES.map((angle) => ({
    angle,
    path: `/design-lab/lineages/58/videofigure/frames/${look.id}_${angle}.png`,
  })),
}));

export const LINEAGE_58_TEMPLATE_EVIDENCE = {
  candidateTemplateFamily: "figure-memory-viewer",
  userBindable: ["Person/Subject", "source Moment", "source media/time provenance", "ordered Figure frames", "note/title"],
  userConfigurable: ["autoplay preference", "validated archive/filter options"],
  templateLocked: ["complete ordered-angle grammar", "selected Figure/Look/provenance synchronization", "manual takeover semantics", "source traceability"],
  productPolicy: ["persistence/save semantics", "rights eligibility", "derived Figure generation availability", "media-processing availability"],
  sourceReferenceOnly: ["benchmark assets", "turnaround generation sheets", "fake extraction progress/counts", "unverified concrete human identities"],
} as const;
