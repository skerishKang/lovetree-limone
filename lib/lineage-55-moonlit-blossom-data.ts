export const LINEAGE_55_TIMING = {
  autoIntervalMs: 2100,
  wheelThrottleMs: 700,
  bloomPetalCount: 36,
  petalMinDistancePx: 90,
  petalMaxDistancePx: 380,
  petalMaxDelayMs: 180,
} as const;

export const LINEAGE_55_ASSET_BASE = "/old/reference/lineage-55-moonlit-blossom-v1/assets";

export const LINEAGE_55_FLOWER_IMAGE = {
  src: `${LINEAGE_55_ASSET_BASE}/flowers/lovetree-memory-blossom-hero-v1.png`,
  alt: "LoveTree memory blossom",
} as const;

export const LINEAGE_55_STATES = [
  { step: "01 · SEED", title: "A feeling begins." },
  { step: "02 · FEELING", title: "It starts to grow." },
  { step: "03 · MOMENTS", title: "Memories gather." },
  { step: "04 · BLOOM", title: "Love becomes visible." },
] as const;

export const LINEAGE_55_TIMELINE = ["SEED", "FEELING", "MOMENTS", "BLOOM"] as const;

export const LINEAGE_55_MEMORY_FLOATS = [
  {
    className: "m1",
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-a.png`,
    title: "THE FIRST MOMENT",
    caption: "처음 마음이 멈춘 순간.",
  },
  {
    className: "m2",
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-b.png`,
    title: "A QUIET LIGHT",
    caption: "조용히 오래 남은 기억.",
  },
  {
    className: "m3",
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-c.png`,
    title: "LOVE BLOOMS",
    caption: "기억이 한 송이의 꽃이 되는 장면.",
  },
] as const;

export const LINEAGE_55_MEMORY_CARDS = [
  {
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-a.png`,
    title: "First Spark",
    caption: "설렘의 시작이 된 장면",
    jumpTo: 1,
  },
  {
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-b.png`,
    title: "Quiet Light",
    caption: "마음을 오래 밝힌 순간",
    jumpTo: 2,
  },
  {
    image: `${LINEAGE_55_ASSET_BASE}/portraits/memory-cast-c.png`,
    title: "Full Bloom",
    caption: "모든 기억이 연결된 장면",
    jumpTo: 3,
  },
] as const;

export const LINEAGE_55_HEADER_ACTIONS = [
  { label: "MOMENTS", kind: "jump", target: 2 } ,
  { label: "BLOSSOM", kind: "jump", target: 3 },
  { label: "INVITATION", kind: "idle" },
  { label: "ENTER MY TREE", kind: "primary" },
] as const;

export const LINEAGE_55_SIDEBAR = {
  logo: "LT",
  navDots: [
    { glyph: "✦", title: "Home", active: true },
    { glyph: "◫", title: "Memories", active: false },
    { glyph: "❀", title: "Blossom", active: false },
    { glyph: "↗", title: "Share", active: false },
  ],
  settingsDot: { glyph: "⚙", title: "Settings" },
} as const;

export const LINEAGE_55_BRAND = {
  name: "LOVETREE",
  sub: "MEMORY BLOSSOM · HERO V1",
} as const;

export const LINEAGE_55_PANEL = {
  eyebrow: "A MEMORY BECOMES A FLOWER",
  headingLines: ["Your moments", "bloom together."],
  description:
    "좋아했던 순간, 오래 남은 표정, 다시 꺼내 보고 싶은 장면이 하나의 꽃으로 자랍니다. LoveTree는 기억의 개수를 보여주는 곳이 아니라, 감정이 어떻게 하나의 형태가 되었는지를 다시 만나는 공간입니다.",
  progressSectionTitle: "BLOSSOM PROGRESS",
  progressLabel: "127 / 150 MOMENTS",
  progressPercentLabel: "85%",
  progressPercentValue: 85,
  castSectionTitle: "MEMORY CAST",
} as const;

export const LINEAGE_55_PLAY_LABELS = {
  play: "PLAY THE BLOOM",
  pause: "PAUSE BLOOM",
  playIcon: "▶",
  pauseIcon: "Ⅱ",
} as const;

export const LINEAGE_55_HINT = {
  text: "CLICK FLOWER ·",
  key: "SPACE",
  tail: "SCROLL",
} as const;
