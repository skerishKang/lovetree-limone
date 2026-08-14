import type {
  CardTransform3D,
  Track63Moment,
  Track63ViewDefinition,
  Track63ViewParameters,
  ViewFamily,
} from "./types";

export const DEFAULT_VIEW_PARAMETERS: Track63ViewParameters = {
  // 24 Range Controls
  cameraDistance: 1200,
  fov: 60,
  spread: 220,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  cardScale: 1.0,
  cardDepth: 120,
  itemTilt: 0,
  elevation: 0,
  curvature: 45,
  connectionOpacity: 65,
  spacingX: 110,
  spacingY: 130,
  spacingZ: 100,
  glowIntensity: 40,
  blurFalloff: 20,
  speed: 1.0,
  waveAmplitude: 60,
  waveFrequency: 1.2,
  verticalOffset: 0,
  orbitTilt: 12,
  cardGap: 18,
  arcAngle: 360,

  // 12 Toggle Controls
  showConnections: true,
  showLabels: true,
  autoRotate: false,
  depthCue: true,
  darkBackdrop: true,
  cardShadow: true,
  showBadges: true,
  cardReflection: false,
  highlightMainPath: true,
  wireframeGuides: false,
  soundIndicators: true,
  compactCards: false,

  // 4 Select Controls
  sortOrder: "chronological",
  cardAspectRatio: "source",
  themePalette: "midnight-violet",
  connectionStyle: "curved-arc",

  // 8 Segmented Controls
  mediaFilter: "all",
  seedSet: "mixed-54",
  viewFamily: "all",
  projectionMode: "perspective-3d",
  loopPolicy: "continuous-loop",
  layoutAlignment: "center-anchored",
  focusLevel: "standard-focus",
  renderQuality: "ultra-fidelity",
};

/**
 * 44 Complete View Definitions across 8 Spatial Families:
 * Orbit (6), Wall (6), Stack (5), Cascade (6), Flow (6), Symbolic (6), Timeline (5), Cluster (4).
 */
export const TRACK63_VIEW_DEFINITIONS: readonly Track63ViewDefinition[] = [
  // ==========================================
  // FAMILY 1: ORBIT (6 Presets)
  // ==========================================
  {
    id: "orbit-ring-3d",
    label: "3D Single Ring Orbit",
    family: "orbit",
    description: "하나의 거대한 원형 궤도 위에 모먼트를 배치하고 회전합니다.",
    defaultParams: { spread: 260, rotationX: 10, orbitTilt: 15 },
    project: (moments, params, i, total, phase) => {
      const radius = params.spread * 2.2 + 250;
      const angle = (i / total) * Math.PI * 2 + phase * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - radius * 0.4;
      const y = Math.sin(angle * 2) * (params.waveAmplitude * 0.4) + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      const rx = params.orbitTilt;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "orbit-double-ring",
    label: "Concentric Double Ring",
    family: "orbit",
    description: "내측과 외측 2중 궤도로 모먼트를 계층 분리하여 회전합니다.",
    defaultParams: { spread: 240, rotationX: 18, orbitTilt: 22 },
    project: (moments, params, i, total, phase) => {
      const isInner = i % 2 === 0;
      const radius = isInner ? params.spread * 1.5 + 160 : params.spread * 2.8 + 320;
      const speedMult = isInner ? 1.0 : -0.7;
      const ringTotal = isInner ? Math.ceil(total / 2) : Math.floor(total / 2);
      const ringIndex = Math.floor(i / 2);
      const angle = (ringIndex / ringTotal) * Math.PI * 2 + phase * Math.PI * 2 * speedMult;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - radius * 0.3;
      const y = isInner ? -60 + params.verticalOffset : 60 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: params.orbitTilt, ry, rz: isInner ? 5 : -5, scale: params.cardScale * (isInner ? 0.95 : 1.05), opacity: 1 };
    },
  },
  {
    id: "orbit-cylinder",
    label: "Vertical Cylinder Carousel",
    family: "orbit",
    description: "수직 원통형 표면에 층층이 모먼트를 감아 올리는 캐러셀입니다.",
    defaultParams: { spread: 220, spacingY: 80, rotationX: 8 },
    project: (moments, params, i, total, phase) => {
      const tiers = 4;
      const perTier = Math.ceil(total / tiers);
      const tier = Math.floor(i / perTier);
      const tierIdx = i % perTier;
      const radius = params.spread * 2.0 + 200;
      const angle = (tierIdx / perTier) * Math.PI * 2 + phase * Math.PI * 2 + (tier * Math.PI) / 4;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - radius * 0.35;
      const y = (tier - tiers / 2 + 0.5) * params.spacingY * 1.4 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "orbit-helix",
    label: "Ascending DNA Helix",
    family: "orbit",
    description: "2중 나선 궤도를 따라 위로 상승하는 입체 헬릭스 구조입니다.",
    defaultParams: { spread: 200, spacingY: 35, rotationY: 20 },
    project: (moments, params, i, total, phase) => {
      const strand = i % 2 === 0 ? 0 : Math.PI;
      const t = i / total;
      const angle = t * Math.PI * 6 + phase * Math.PI * 2 + strand;
      const radius = params.spread * 1.6 + 180;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const y = (t - 0.5) * total * params.spacingY * 0.4 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: -10, ry, rz: (strand > 0 ? 8 : -8), scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "orbit-spiral-sphere",
    label: "Fibonacci Spiral Sphere",
    family: "orbit",
    description: "피보나치 구면 나선을 따라 구체 표면에 모먼트를 고르게 분산합니다.",
    defaultParams: { spread: 280, rotationX: 15, rotationY: 25 },
    project: (moments, params, i, total, phase) => {
      const radius = params.spread * 2.2 + 200;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + phase * Math.PI * 2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) * 0.8 + params.verticalOffset;
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const ry = -(theta * 180) / Math.PI + 90;
      const rx = (phi * 180) / Math.PI - 90;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * 0.85, opacity: 1 };
    },
  },
  {
    id: "orbit-satellites",
    label: "Planetary Satellite Cloud",
    family: "orbit",
    description: "중심점 주위로 서로 다른 기울기의 위성 궤도들이 교차합니다.",
    defaultParams: { spread: 250, orbitTilt: 35 },
    project: (moments, params, i, total, phase) => {
      const orbitId = i % 3;
      const orbitAngle = (orbitId * Math.PI) / 3;
      const indexInOrbit = Math.floor(i / 3);
      const orbitTotal = Math.ceil(total / 3);
      const angle = (indexInOrbit / orbitTotal) * Math.PI * 2 + phase * Math.PI * 2 * (orbitId === 1 ? -1 : 1);
      const r = params.spread * 2.0 + 220;
      const rawX = Math.cos(angle) * r;
      const rawY = Math.sin(angle) * r;
      // Rotate around X-axis by orbitAngle
      const x = rawX;
      const y = rawY * Math.cos(orbitAngle) + params.verticalOffset;
      const z = rawY * Math.sin(orbitAngle);
      return { x, y, z, rx: (orbitAngle * 180) / Math.PI, ry: (angle * 180) / Math.PI, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 2: WALL (6 Presets)
  // ==========================================
  {
    id: "wall-cinema",
    label: "Cinema Curved Wall",
    family: "wall",
    description: "시네마 파노라마 곡면 벽 위에 모먼트들을 정렬합니다.",
    defaultParams: { spread: 210, curvature: 60, spacingX: 120, spacingY: 140 },
    project: (moments, params, i, total) => {
      const cols = 9;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const colOffset = col - (cols - 1) / 2;
      const rowOffset = row - 2.5;
      const curveRad = (colOffset / cols) * (params.curvature / 100) * Math.PI * 0.9;
      const radius = 950;
      const x = Math.sin(curveRad) * radius;
      const z = (1 - Math.cos(curveRad)) * radius - 200;
      const y = rowOffset * params.spacingY * 1.1 + params.verticalOffset;
      const ry = -(curveRad * 180) / Math.PI;
      return { x, y, z, rx: 0, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "wall-mosaic",
    label: "Dynamic Mosaic Grid",
    family: "wall",
    description: "모먼트 미디어 유형에 따라 높낮이가 변하는 다이내믹 모자이크입니다.",
    defaultParams: { spacingX: 130, spacingY: 130, cardGap: 14 },
    project: (moments, params, i) => {
      const cols = 6;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const stagger = (col % 2 === 0 ? 0 : 35);
      const x = (col - (cols - 1) / 2) * (params.spacingX + params.cardGap);
      const y = (row - 4) * (params.spacingY + params.cardGap) + stagger + params.verticalOffset;
      const z = ((i * 17) % 70) - 35;
      return { x, y, z, rx: 0, ry: 0, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "wall-matrix-3d",
    label: "3D Matrix Billboard",
    family: "wall",
    description: "3차원 격자 블록으로 깊이감 있게 전개되는 매트릭스 보드입니다.",
    defaultParams: { spacingX: 140, spacingY: 130, cardDepth: 180 },
    project: (moments, params, i) => {
      const cols = 6;
      const rows = 3;
      const depthLayers = 3;
      const col = i % cols;
      const row = Math.floor((i % (cols * rows)) / cols);
      const layer = Math.floor(i / (cols * rows));
      const x = (col - (cols - 1) / 2) * params.spacingX * 1.1;
      const y = (row - (rows - 1) / 2) * params.spacingY * 1.2 + params.verticalOffset;
      const z = (layer - (depthLayers - 1) / 2) * params.cardDepth * 1.2;
      return { x, y, z, rx: 5, ry: -8, rz: 0, scale: params.cardScale * (1 - layer * 0.08), opacity: 1 - layer * 0.15 };
    },
  },
  {
    id: "wall-honeycomb",
    label: "Hexagonal Honeycomb Lattice",
    family: "wall",
    description: "육각형 벌집 격자 형태로 엇갈리게 배치되는 구조화된 뷰입니다.",
    defaultParams: { spacingX: 115, spacingY: 100, cardGap: 12 },
    project: (moments, params, i) => {
      const cols = 7;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const offsetX = (row % 2 === 1 ? params.spacingX * 0.5 : 0);
      const x = (col - cols / 2) * params.spacingX + offsetX;
      const y = (row - 3.5) * params.spacingY * 0.9 + params.verticalOffset;
      const z = Math.sin(col + row) * 25;
      return { x, y, z, rx: 2, ry: 2, rz: 0, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },
  {
    id: "wall-perspective-corridor",
    label: "Flanking Perspective Walls",
    family: "wall",
    description: "좌우 양측 벽면에 모먼트들이 회랑처럼 마주보며 늘어섭니다.",
    defaultParams: { spread: 260, spacingZ: 140, itemTilt: 25 },
    project: (moments, params, i, total) => {
      const isLeft = i % 2 === 0;
      const pairIdx = Math.floor(i / 2);
      const halfTotal = total / 2;
      const z = (pairIdx - halfTotal / 2) * params.spacingZ * 0.9;
      const x = isLeft ? -params.spread * 1.6 : params.spread * 1.6;
      const y = Math.sin(pairIdx * 0.4) * 30 + params.verticalOffset;
      const ry = isLeft ? 65 : -65;
      return { x, y, z, rx: 0, ry, rz: 0, scale: params.cardScale * 0.95, opacity: 1 };
    },
  },
  {
    id: "wall-gallery",
    label: "Grand Gallery Salon",
    family: "wall",
    description: "미술관 살롱 스타일로 크기와 위치가 자유롭게 변주되는 갤러리입니다.",
    defaultParams: { spacingX: 140, spacingY: 150, cardScale: 1.05 },
    project: (moments, params, i) => {
      const cols = 6;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sizes = [1.2, 0.9, 1.1, 0.85, 1.15, 0.95];
      const scale = sizes[i % sizes.length] * params.cardScale;
      const jitterX = ((i * 23) % 40) - 20;
      const jitterY = ((i * 31) % 40) - 20;
      const x = (col - (cols - 1) / 2) * params.spacingX * 1.15 + jitterX;
      const y = (row - 4) * params.spacingY * 1.1 + jitterY + params.verticalOffset;
      const z = ((i * 13) % 50) - 25;
      return { x, y, z, rx: 0, ry: 0, rz: 0, scale, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 3: STACK (5 Presets)
  // ==========================================
  {
    id: "stack-layered",
    label: "Depth Layered Deck",
    family: "stack",
    description: "앞뒤로 차곡차곡 겹쳐진 카드 덱처럼 깊이축으로 모먼트를 쌓습니다.",
    defaultParams: { cardDepth: 80, spacingY: 15, itemTilt: -8 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const z = -i * (params.cardDepth * 0.45) + 300;
      const y = (i - total / 2) * params.spacingY * 0.3 + params.verticalOffset;
      const x = Math.sin(i * 0.3) * 60;
      const rx = params.itemTilt;
      const ry = ((i % 5) - 2) * 2;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * (1 - t * 0.3), opacity: Math.max(0.15, 1 - t * 0.75) };
    },
  },
  {
    id: "stack-depth-tunnel",
    label: "Converging Depth Tunnel",
    family: "stack",
    description: "시선 안쪽으로 빨려 들어가듯 4면 터널 벽면을 따라 정렬됩니다.",
    defaultParams: { spread: 220, spacingZ: 90, rotationZ: 15 },
    project: (moments, params, i, total) => {
      const side = i % 4; // 0: Top, 1: Right, 2: Bottom, 3: Left
      const ring = Math.floor(i / 4);
      const rings = total / 4;
      const z = (ring - rings / 2) * params.spacingZ * 1.3;
      const offset = params.spread * 1.4;
      let x = 0;
      let y = params.verticalOffset;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      if (side === 0) { y += -offset; rx = 60; }
      else if (side === 1) { x += offset; ry = -60; }
      else if (side === 2) { y += offset; rx = -60; }
      else { x += -offset; ry = 60; }
      return { x, y, z, rx, ry, rz, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "stack-shuffle",
    label: "Fan Deck Shuffle",
    family: "stack",
    description: "부채꼴 모양으로 넓게 펼쳐지는 카드 셔플 덱 뷰입니다.",
    defaultParams: { spread: 260, arcAngle: 120, rotationZ: 0 },
    project: (moments, params, i, total) => {
      const mid = (total - 1) / 2;
      const norm = (i - mid) / mid; // -1..1
      const maxArc = (params.arcAngle * Math.PI) / 180;
      const angle = norm * (maxArc / 2);
      const radius = params.spread * 2.8 + 200;
      const x = Math.sin(angle) * radius;
      const y = -Math.cos(angle) * radius + radius * 0.7 + params.verticalOffset;
      const z = -Math.abs(norm) * 200;
      const rz = -(angle * 180) / Math.PI;
      return { x, y, z, rx: 0, ry: 0, rz, scale: params.cardScale * 0.95, opacity: 1 };
    },
  },
  {
    id: "stack-accordion",
    label: "Isometric Depth Accordion",
    family: "stack",
    description: "아코디언 주름처럼 지그재그 각도로 맞물려 깊어지는 입체 뷰입니다.",
    defaultParams: { spacingX: 60, cardDepth: 90, itemTilt: 28 },
    project: (moments, params, i, total) => {
      const isEven = i % 2 === 0;
      const x = (i - total / 2) * params.spacingX * 0.8;
      const z = (i - total / 2) * (params.cardDepth * 0.35);
      const y = params.verticalOffset;
      const ry = isEven ? params.itemTilt : -params.itemTilt;
      return { x, y, z, rx: 0, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "stack-strata",
    label: "Horizontal Memory Strata",
    family: "stack",
    description: "지층처럼 가로 방향으로 얇게 겹쳐져 전개되는 스트라타 뷰입니다.",
    defaultParams: { spacingY: 35, cardDepth: 70, rotationX: 25 },
    project: (moments, params, i, total) => {
      const y = (i - total / 2) * params.spacingY * 0.7 + params.verticalOffset;
      const z = (i - total / 2) * (params.cardDepth * 0.4);
      const x = Math.sin(i * 0.5) * 80;
      return { x, y, z, rx: params.rotationX, ry: 0, rz: 0, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 4: CASCADE (6 Presets)
  // ==========================================
  {
    id: "cascade-waterfall",
    label: "Gravity Cascade Waterfall",
    family: "cascade",
    description: "폭포수처럼 위에서 아래로 곡선을 그리며 떨어지는 유려한 낙하 뷰입니다.",
    defaultParams: { spread: 220, spacingY: 60, curvature: 70 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const y = (0.5 - t) * total * params.spacingY * 0.5 + params.verticalOffset;
      const x = Math.sin(t * Math.PI * 3) * (params.spread * 0.9);
      const z = Math.cos(t * Math.PI * 2) * 160 - t * 250;
      const rx = -t * 40;
      const ry = Math.cos(t * Math.PI * 3) * 30;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "cascade-diagonal-step",
    label: "Diagonal Stepped Terrace",
    family: "cascade",
    description: "대각선 방향으로 단차를 이루며 계단식으로 하강하는 테라스 구조입니다.",
    defaultParams: { spacingX: 55, spacingY: 45, spacingZ: 65 },
    project: (moments, params, i, total) => {
      const x = (i - total / 2) * params.spacingX * 0.9;
      const y = -(i - total / 2) * params.spacingY * 0.8 + params.verticalOffset;
      const z = (i - total / 2) * params.spacingZ * 0.7;
      return { x, y, z, rx: 12, ry: -18, rz: 0, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },
  {
    id: "cascade-prism-steps",
    label: "Isometric Prism Steps",
    family: "cascade",
    description: "아이소메트릭 투영 각도로 3방향 단차가 정밀하게 맞물린 프리즘 스텝입니다.",
    defaultParams: { spacingX: 70, spacingY: 50, spacingZ: 70, rotationX: 30, rotationY: 45 },
    project: (moments, params, i, total) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = (col - row * 0.5 - 1.5) * params.spacingX * 1.1;
      const y = (row - col * 0.3 - 2) * params.spacingY * 1.1 + params.verticalOffset;
      const z = (col + row - 5) * params.spacingZ * 0.8;
      return { x, y, z, rx: params.rotationX, ry: params.rotationY, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "cascade-floating-island",
    label: "Tiered Floating Terraces",
    family: "cascade",
    description: "공중에 떠 있는 3개의 계단식 테라스 섬 위에 분산 배치됩니다.",
    defaultParams: { spread: 260, elevation: 120 },
    project: (moments, params, i, total) => {
      const island = i % 3;
      const perIsland = Math.ceil(total / 3);
      const islandIdx = Math.floor(i / 3);
      const islandY = (island - 1) * params.elevation * 1.2 + params.verticalOffset;
      const angle = (islandIdx / perIsland) * Math.PI * 2;
      const radius = params.spread * 1.2 + 80;
      const islandCenterX = (island - 1) * params.spread * 1.6;
      const x = islandCenterX + Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return { x, y: islandY, z, rx: 15, ry: -(angle * 180) / Math.PI, rz: 0, scale: params.cardScale * 0.88, opacity: 1 };
    },
  },
  {
    id: "cascade-spiral-stair",
    label: "Spiral Staircase Path",
    family: "cascade",
    description: "나선형 계단을 밟고 내려오듯 중심축을 감싸며 회전하는 입체 뷰입니다.",
    defaultParams: { spread: 200, spacingY: 40, rotationX: 12 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const angle = t * Math.PI * 4;
      const r = params.spread * 1.5 + 140;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = (0.5 - t) * total * params.spacingY * 0.6 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "cascade-amphitheater",
    label: "Stepped Amphitheater",
    family: "cascade",
    description: "고대 원형 극장의 반원형 계단 관람석처럼 중심을 향해 내려앉습니다.",
    defaultParams: { spread: 240, curvature: 80, spacingY: 55 },
    project: (moments, params, i, total) => {
      const tiers = 4;
      const perTier = Math.ceil(total / tiers);
      const tier = Math.floor(i / perTier);
      const idx = i % perTier;
      const arc = (Math.PI * 0.9 * (params.curvature / 100));
      const angle = ((idx - (perTier - 1) / 2) / perTier) * arc;
      const radius = (tier + 2) * (params.spread * 0.7) + 180;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius + radius * 0.4;
      const y = tier * params.spacingY * 0.9 - 80 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI;
      const rx = tier * 6;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * 0.95, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 5: FLOW (6 Presets)
  // ==========================================
  {
    id: "flow-wave-ribbon",
    label: "Harmonic Sine Ribbon",
    family: "flow",
    description: "부드러운 사인파 곡면 리본을 따라 굽이치는 기억의 파동 뷰입니다.",
    defaultParams: { spread: 230, waveAmplitude: 110, waveFrequency: 2.2 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const x = (t - 0.5) * total * 55;
      const y = Math.sin(t * Math.PI * 2 * params.waveFrequency) * params.waveAmplitude + params.verticalOffset;
      const z = Math.cos(t * Math.PI * 2 * params.waveFrequency) * (params.waveAmplitude * 0.8);
      const rz = Math.sin(t * Math.PI * 2 * params.waveFrequency) * 18;
      const ry = -Math.cos(t * Math.PI * 2 * params.waveFrequency) * 22;
      return { x, y, z, rx: 0, ry, rz, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "flow-sine-wave",
    label: "Double Sine Wave Flow",
    family: "flow",
    description: "2개의 위상차가 교차하는 듀얼 사인파로 다채로운 율동감을 선사합니다.",
    defaultParams: { waveAmplitude: 95, waveFrequency: 3.0, spacingX: 50 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const isUpper = i % 2 === 0;
      const phaseOffset = isUpper ? 0 : Math.PI;
      const x = (t - 0.5) * total * params.spacingX;
      const y = Math.sin(t * Math.PI * 2 * params.waveFrequency + phaseOffset) * params.waveAmplitude + params.verticalOffset;
      const z = (isUpper ? -60 : 60);
      const rz = (isUpper ? 10 : -10);
      return { x, y, z, rx: 0, ry: 0, rz, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },
  {
    id: "flow-infinity-loop",
    label: "Figure-8 Infinity Path",
    family: "flow",
    description: "영원함을 상징하는 8자(Infinity) 뫼비우스 루프 궤적을 그립니다.",
    defaultParams: { spread: 260, rotationX: 18, orbitTilt: 20 },
    project: (moments, params, i, total, phase) => {
      const t = (i / total) * Math.PI * 2 + phase * Math.PI * 2;
      const a = params.spread * 2.2 + 200;
      const x = (a * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      const z = (a * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      const y = Math.sin(t * 2) * (params.waveAmplitude * 0.6) + params.verticalOffset;
      const ry = -(Math.atan2(z, x) * 180) / Math.PI + 90;
      return { x, y, z, rx: params.orbitTilt, ry, rz: 0, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },
  {
    id: "flow-mobius-strip",
    label: "Möbius Surface Flow",
    family: "flow",
    description: "안과 밖의 경계가 사라지는 뫼비우스 띠 곡면 위에 회전 배치됩니다.",
    defaultParams: { spread: 250, rotationX: 20, itemTilt: 30 },
    project: (moments, params, i, total, phase) => {
      const u = (i / total) * Math.PI * 2 + phase * Math.PI * 2;
      const v = ((i % 3) - 1) * 60; // strip width
      const r = params.spread * 1.8 + 200;
      const x = (r + v * Math.cos(u / 2)) * Math.cos(u);
      const z = (r + v * Math.cos(u / 2)) * Math.sin(u);
      const y = v * Math.sin(u / 2) + params.verticalOffset;
      const ry = -(u * 180) / Math.PI + 90;
      const rz = ((u / 2) * 180) / Math.PI;
      return { x, y, z, rx: params.rotationX, ry, rz, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "flow-riverbed",
    label: "Meandering Riverbed Path",
    family: "flow",
    description: "자연스러운 강줄기처럼 유유히 굽이쳐 흐르는 기억의 물길 뷰입니다.",
    defaultParams: { spread: 220, spacingZ: 60, curvature: 65 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const z = (0.5 - t) * total * params.spacingZ * 0.8;
      const x = Math.sin(t * Math.PI * 4) * (params.spread * 1.2);
      const y = Math.cos(t * Math.PI * 3) * 40 + params.verticalOffset;
      const ry = -Math.cos(t * Math.PI * 4) * 35;
      return { x, y, z, rx: 8, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "flow-aurora-stream",
    label: "Aurora Wave Stream",
    family: "flow",
    description: "밤하늘에 번지는 오로라 커튼처럼 너울거리며 상승하는 스트림입니다.",
    defaultParams: { spread: 240, waveAmplitude: 140, waveFrequency: 1.8 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const x = (t - 0.5) * total * 52;
      const y = Math.sin(t * Math.PI * params.waveFrequency) * params.waveAmplitude + params.verticalOffset;
      const z = Math.cos(t * Math.PI * params.waveFrequency * 1.5) * 180;
      const rx = Math.sin(t * Math.PI * 2) * 20;
      const ry = Math.cos(t * Math.PI * 2) * 25;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * 0.95, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 6: SYMBOLIC (6 Presets)
  // ==========================================
  {
    id: "symbolic-tree",
    label: "Tree of Moments & Roots",
    family: "symbolic",
    description: "LoveTree의 줄기와 가지, 뿌리 형상으로 상징화된 트리 구조입니다.",
    defaultParams: { spread: 240, spacingY: 65, elevation: 150 },
    project: (moments, params, i, total) => {
      // Trunk (first 12 moments), Branches (middle 30), Canopy/Roots (rest)
      if (i < 12) {
        // Trunk
        const y = (6 - i) * params.spacingY * 0.9 + params.verticalOffset;
        const x = Math.sin(i * 0.6) * 30;
        const z = Math.cos(i * 0.6) * 30;
        return { x, y, z, rx: 0, ry: 0, rz: 0, scale: params.cardScale * 1.1, opacity: 1 };
      } else if (i < 42) {
        // 4 Main Branches
        const branchId = (i - 12) % 4;
        const branchIdx = Math.floor((i - 12) / 4);
        const branchAngle = (branchId * Math.PI) / 2 + Math.PI / 4;
        const r = (branchIdx + 1) * (params.spread * 0.45) + 80;
        const x = Math.cos(branchAngle) * r;
        const z = Math.sin(branchAngle) * r;
        const y = -80 - branchIdx * 35 + params.verticalOffset;
        const ry = -(branchAngle * 180) / Math.PI + 90;
        return { x, y, z, rx: -15, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
      } else {
        // Canopy outer crown
        const crownIdx = i - 42;
        const angle = (crownIdx / 12) * Math.PI * 2;
        const r = params.spread * 1.8 + 100;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = -240 + params.verticalOffset;
        return { x, y, z, rx: -25, ry: -(angle * 180) / Math.PI + 90, rz: 0, scale: params.cardScale * 0.85, opacity: 1 };
      }
    },
  },
  {
    id: "symbolic-canopy",
    label: "Branching LoveTree Canopy",
    family: "symbolic",
    description: "머리 위로 울창하게 펼쳐지는 돔형 나무 캐노피 뷰입니다.",
    defaultParams: { spread: 270, curvature: 75, rotationX: 40 },
    project: (moments, params, i, total) => {
      const ring = i % 4;
      const pos = Math.floor(i / 4);
      const perRing = total / 4;
      const angle = (pos / perRing) * Math.PI * 2;
      const radius = (ring + 1) * (params.spread * 0.55) + 120;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const y = -Math.cos((ring / 4) * Math.PI * 0.5) * 180 - 80 + params.verticalOffset;
      const rx = 35 + ring * 10;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "symbolic-heart",
    label: "Heart Petal Formation",
    family: "symbolic",
    description: "모먼트들이 하트 곡선(Cardioid) 형상을 이루며 감싸 안습니다.",
    defaultParams: { spread: 240, rotationX: 12, cardScale: 0.95 },
    project: (moments, params, i, total) => {
      const t = (i / total) * Math.PI * 2;
      // Mathematical Heart Curve
      const rawX = 16 * Math.pow(Math.sin(t), 3);
      const rawY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const scaleFactor = (params.spread / 240) * 22;
      const x = rawX * scaleFactor;
      const y = rawY * scaleFactor + params.verticalOffset;
      const z = Math.sin(t * 3) * 50;
      const rz = Math.sin(t) * 15;
      return { x, y, z, rx: params.rotationX, ry: 0, rz, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "symbolic-blooming-rose",
    label: "Blooming Rose Geometry",
    family: "symbolic",
    description: "장미 꽃잎이 겹겹이 피어나듯 나선형으로 개화하는 로즈 뷰입니다.",
    defaultParams: { spread: 260, rotationX: 30, rotationZ: 15 },
    project: (moments, params, i, total) => {
      const k = 4; // Rose curve k-value
      const theta = (i / total) * Math.PI * 4;
      const r = (Math.cos(k * theta) * 0.4 + 0.8) * (params.spread * 1.5 + 100) * ((i + 5) / total);
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      const y = (i / total - 0.5) * 120 + params.verticalOffset;
      const rx = 35;
      const ry = -(theta * 180) / Math.PI;
      return { x, y, z, rx, ry, rz: 0, scale: params.cardScale * 0.88, opacity: 1 };
    },
  },
  {
    id: "symbolic-constellation",
    label: "Star Constellation Chart",
    family: "symbolic",
    description: "별자리 성도처럼 주요 모먼트들이 성단 성운 형태로 연결됩니다.",
    defaultParams: { spread: 290, rotationX: 15, rotationY: 20 },
    project: (moments, params, i) => {
      // Semi-deterministic celestial coordinate scattering
      const seed = i * 137.508; // Golden angle
      const r = Math.sqrt(i + 1) * (params.spread * 0.38) + 120;
      const theta = (seed * Math.PI) / 180;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r * 0.7 + params.verticalOffset;
      const z = ((i * 41) % 180) - 90;
      return { x, y, z, rx: params.rotationX, ry: params.rotationY, rz: 0, scale: params.cardScale * 0.85, opacity: 1 };
    },
  },
  {
    id: "symbolic-mandala",
    label: "Sacred Geometry Mandala",
    family: "symbolic",
    description: "완벽한 방사 대칭을 이루는 만다라 성스러운 기하학 배열입니다.",
    defaultParams: { spread: 250, rotationX: 25, rotationZ: 0 },
    project: (moments, params, i, total) => {
      const rings = 4;
      const perRing = Math.ceil(total / rings);
      const ring = Math.floor(i / perRing);
      const idx = i % perRing;
      const angle = (idx / perRing) * Math.PI * 2 + (ring % 2 === 1 ? Math.PI / perRing : 0);
      const radius = (ring + 1) * (params.spread * 0.6) + 100;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const y = params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 7: TIMELINE (5 Presets)
  // ==========================================
  {
    id: "timeline-highway",
    label: "Perspective Memory Highway",
    family: "timeline",
    description: "시간의 고속도로를 달리듯 정면 깊은 곳으로 뻗어나가는 시간선입니다.",
    defaultParams: { spacingZ: 95, spread: 180, itemTilt: 10 },
    project: (moments, params, i, total) => {
      const isLeft = i % 2 === 0;
      const pair = Math.floor(i / 2);
      const z = (pair - total / 4) * params.spacingZ * 1.1;
      const x = isLeft ? -params.spread * 0.9 : params.spread * 0.9;
      const y = -pair * 8 + params.verticalOffset;
      const ry = isLeft ? 20 : -20;
      return { x, y, z, rx: params.itemTilt, ry, rz: 0, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "timeline-milestone-stepper",
    label: "Milestone Arch Stepper",
    family: "timeline",
    description: "아치형 관문을 통과하듯 주요 기념 지점들을 단차 있게 넘나듭니다.",
    defaultParams: { spread: 240, spacingX: 65, waveAmplitude: 120 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const x = (t - 0.5) * total * params.spacingX * 0.9;
      const y = -Math.sin(t * Math.PI) * params.waveAmplitude * 2.0 + 80 + params.verticalOffset;
      const z = (t - 0.5) * 200;
      const rz = -Math.cos(t * Math.PI) * 25;
      return { x, y, z, rx: 0, ry: 0, rz, scale: params.cardScale, opacity: 1 };
    },
  },
  {
    id: "timeline-chrono-helix",
    label: "Time-Warp Chrono Helix",
    family: "timeline",
    description: "시간의 왜곡을 입체 나선으로 시각화한 크로노 헬릭스 시간선입니다.",
    defaultParams: { spread: 210, spacingZ: 70, rotationZ: 25 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const angle = t * Math.PI * 6;
      const r = params.spread * 1.3 + 120;
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r * 0.7 + params.verticalOffset;
      const z = (t - 0.5) * total * params.spacingZ * 0.8;
      const rz = (angle * 180) / Math.PI;
      return { x, y, z, rx: 0, ry: 0, rz, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "timeline-orbit-track",
    label: "Planetary Epoch Track",
    family: "timeline",
    description: "타원형 궤도를 돌며 계절과 시대(Epoch)의 순환을 그립니다.",
    defaultParams: { spread: 270, rotationX: 25, curvature: 60 },
    project: (moments, params, i, total) => {
      const angle = (i / total) * Math.PI * 2;
      const a = params.spread * 2.4 + 200; // Semi-major
      const b = params.spread * 1.4 + 100; // Semi-minor
      const x = Math.sin(angle) * a;
      const z = Math.cos(angle) * b;
      const y = Math.sin(angle * 2) * 30 + params.verticalOffset;
      const ry = -(angle * 180) / Math.PI + 180;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale * 0.92, opacity: 1 };
    },
  },
  {
    id: "timeline-spiral-calendar",
    label: "Spiral Calendar Path",
    family: "timeline",
    description: "연도와 월의 흐름을 중심에서 바깥으로 뻗는 나선 달력으로 펼칩니다.",
    defaultParams: { spread: 260, rotationX: 45 },
    project: (moments, params, i, total) => {
      const t = i / total;
      const angle = t * Math.PI * 8;
      const r = t * (params.spread * 2.2) + 80;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = params.verticalOffset;
      const ry = -(angle * 180) / Math.PI;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale * 0.88, opacity: 1 };
    },
  },

  // ==========================================
  // FAMILY 8: CLUSTER (4 Presets)
  // ==========================================
  {
    id: "cluster-gravity-core",
    label: "Mass Gravity Field",
    family: "cluster",
    description: "인력 중심을 향해 밀도 높게 집적되는 중력장 클러스터 뷰입니다.",
    defaultParams: { spread: 220, rotationX: 15, rotationY: 20 },
    project: (moments, params, i, total) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      const r = Math.pow(i / total, 0.6) * (params.spread * 1.8) + 120;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.8 + params.verticalOffset;
      const z = r * Math.sin(phi) * Math.sin(theta);
      return { x, y, z, rx: 10, ry: 15, rz: 0, scale: params.cardScale * (1.1 - (i / total) * 0.3), opacity: 1 };
    },
  },
  {
    id: "cluster-galaxy-spiral",
    label: "Milky Way Spiral Arms",
    family: "cluster",
    description: "은하의 소용돌이 팔(Spiral Arms) 3개를 따라 성간 물질처럼 분산됩니다.",
    defaultParams: { spread: 260, rotationX: 35, rotationZ: 10 },
    project: (moments, params, i, total) => {
      const arms = 3;
      const arm = i % arms;
      const armIdx = Math.floor(i / arms);
      const perArm = total / arms;
      const t = armIdx / perArm;
      const armAngle = (arm * Math.PI * 2) / arms;
      const spiralAngle = t * Math.PI * 3 + armAngle;
      const r = t * (params.spread * 2.2) + 90;
      const x = Math.cos(spiralAngle) * r;
      const z = Math.sin(spiralAngle) * r;
      const y = Math.sin(t * Math.PI * 2) * 40 + params.verticalOffset;
      const ry = -(spiralAngle * 180) / Math.PI;
      return { x, y, z, rx: params.rotationX, ry, rz: 0, scale: params.cardScale * 0.9, opacity: 1 };
    },
  },
  {
    id: "cluster-semantic-nebula",
    label: "Theme-Clustered Nebula",
    family: "cluster",
    description: "테마별로 공간 내 구역을 나누어 성운처럼 군집을 형성하는 뷰입니다.",
    defaultParams: { spread: 270, rotationX: 18, rotationY: 25 },
    project: (moments, params, i) => {
      const themeClusters = [
        { x: -260, y: -120, z: -100 }, // first-meet
        { x: 260, y: -100, z: -80 },  // daily
        { x: 0, y: 180, z: 140 },     // stage
        { x: -220, y: 140, z: 100 },  // travel
        { x: 240, y: 150, z: 120 },   // celebration
        { x: 0, y: -200, z: -150 },   // intimate/confession
      ];
      const cluster = themeClusters[i % themeClusters.length];
      const scatterX = ((i * 37) % 120) - 60;
      const scatterY = ((i * 53) % 120) - 60;
      const scatterZ = ((i * 71) % 120) - 60;
      const x = cluster.x + scatterX;
      const y = cluster.y + scatterY + params.verticalOffset;
      const z = cluster.z + scatterZ;
      return { x, y, z, rx: params.rotationX, ry: params.rotationY, rz: 0, scale: params.cardScale * 0.88, opacity: 1 };
    },
  },
  {
    id: "cluster-orbiting-moons",
    label: "Central Hero with Orbiting Moons",
    family: "cluster",
    description: "중심 하이라이트 모먼트를 위성 모먼트들이 다양한 궤도로 호위합니다.",
    defaultParams: { spread: 250, orbitTilt: 28 },
    project: (moments, params, i, total, phase) => {
      if (i === 0) {
        // Hero Center
        return { x: 0, y: params.verticalOffset, z: 0, rx: 0, ry: 0, rz: 0, scale: params.cardScale * 1.5, opacity: 1 };
      }
      const moonIdx = i - 1;
      const moonTotal = total - 1;
      const orbitId = moonIdx % 4;
      const tilt = (orbitId * Math.PI) / 4;
      const angle = (moonIdx / moonTotal) * Math.PI * 4 + phase * Math.PI * 2;
      const r = params.spread * 1.6 + (orbitId * 40) + 120;
      const rawX = Math.cos(angle) * r;
      const rawZ = Math.sin(angle) * r;
      const x = rawX;
      const y = rawZ * Math.sin(tilt) + params.verticalOffset;
      const z = rawZ * Math.cos(tilt);
      return { x, y, z, rx: 15, ry: (angle * 180) / Math.PI, rz: 0, scale: params.cardScale * 0.85, opacity: 1 };
    },
  },
];

export const TRACK63_VIEW_BY_ID = new Map(
  TRACK63_VIEW_DEFINITIONS.map((v) => [v.id, v]),
);

/**
 * Compute transform signature string for testing and uniqueness validation.
 */
export function computeLayoutSignature(
  viewDef: Track63ViewDefinition,
  params: Track63ViewParameters,
  moments: readonly Track63Moment[],
): string {
  const transforms = moments.map((_, i) =>
    viewDef.project(moments, params, i, moments.length, 0),
  );
  return transforms
    .map(
      (t) =>
        `${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)},${t.rx.toFixed(1)},${t.ry.toFixed(1)},${t.rz.toFixed(1)}`,
    )
    .join(";");
}
