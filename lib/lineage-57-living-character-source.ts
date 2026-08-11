export const LINEAGE_57 = {
  lineageId: "lt-57-living-character-world",
  revisionV1: "57-v1-living-character-world",
  revisionV2: "57-v2-reactive-character-lubt",
  route: "/design-lab/lineages/57/v2",
  driveFolderV2: "1Ui-0V0KWhJyAIq-JEkswKLA0VpUxC6BH",
  driveFolderV1: "1xRwrB3GA8qfyhpDhPid0LIL3mRkPzf3F",
  assetHold: "EXACT_CHARACTER_ASSET_TRANSFER_HOLD",
  assetTransferComplete: false,
} as const;

export const LINEAGE_57_SOURCES = {
  v1Index: {
    driveId: "1X2TXWCXCe8wFIf7NsQk5jMiOw7T2JmAQ",
    bytes: 22_218,
    sha256: "d71197cf97db913a7498e8ce732acf4f094e13d83fde06129d04c265fd1b6710",
    gitArchivePath: "reference/lineage-57-living-character-world-v1/source/index.html.xz.b64",
  },
  v2Index: {
    driveId: "1vUMhdOXGo586GnJCnl8o_9zGizF_jYMI",
    bytes: 22_310,
    sha256: "4f28f1671146a36c53e88e0645c6dbe29076b1db526e21adb40794617a36223b",
    gitArchivePath: "reference/lineage-57-living-character-world-v2/source/index.html.xz.b64",
  },
  v2Js: {
    driveId: "1fd42ni1Y287_v1yHGjhc5zdw2Pn_CQTc",
    bytes: 14_449,
    sha256: "6c0d33c96fc507d2732bb92d4d0b0a65e66014fb5ede159d5862e359b51e1838",
    gitArchivePath: "reference/lineage-57-living-character-world-v2/source/living-world-v2.js.xz.b64",
  },
  v2Css: {
    driveId: "1_ajrjUZby-689e8qblcyawX-BT3xfHqy",
    bytes: 2_736,
    sha256: "b8c3a829ebeef1432ef01edf633bb6b2da184bf0147eed0047489cfe9b0f2214",
    gitArchivePath: "reference/lineage-57-living-character-world-v2/source/living-world-v2.css.xz.b64",
  },
} as const;

export const LINEAGE_57_EXPRESSIONS = [
  "neutral", "smile", "laugh", "wink", "shy", "surprise",
  "angry", "sing", "talk", "cry", "touched", "sleepy",
] as const;
export type Lineage57Expression = (typeof LINEAGE_57_EXPRESSIONS)[number];

export const LINEAGE_57_CHARACTERS = [
  { id: "M01", name: "NOAH", type: "CENTER / QUIET FIRE", gender: "M", accent: "#f074b3" },
  { id: "M02", name: "YUL", type: "DREAMER / SOFT LIGHT", gender: "M", accent: "#74d7ef" },
  { id: "F01", name: "ARIA", type: "STORY / SPRING GAZE", gender: "F", accent: "#ff8eb7" },
  { id: "F02", name: "SENA", type: "MUSE / MOONLIGHT", gender: "F", accent: "#b98dff" },
] as const;

export const LINEAGE_57_TIMING = {
  hoverSmileMs: 280,
  singleClickDelayMs: 220,
  doubleClickWindowMs: 360,
  longPressMs: 680,
  specialCleanupMs: 1_800,
  sayGuideReplyMs: 850,
  lubtReturnMs: 2_400,
  autoLifeMs: 4_800,
  talkLoopMs: 520,
  singLoopMs: 760,
  lubtIdleMs: 12_000,
} as const;

export const LINEAGE_57_SOURCE_BOUNDARIES = {
  productJob: "Person/Subject representation → Character emotional reaction → Lubt contextual response → optional symbolic Moment capture",
  capabilityCandidate: "Reactive Character + Memory Guide",
  specialLabel: "SECRET MOMENT — source interaction label, not canonical V4 taxonomy",
  saveBoundary: "SOURCE DEMO / NON-PERSISTENT",
  excluded: [
    "WebGL", "Three.js", "camera", "portal", "hotspot", "node graph",
    "Tree navigation", "Connection traversal", "canonical cast", "domain 120-state taxonomy",
  ],
} as const;

export const LINEAGE_57_ASSET_ROOT = "/reference/lineage-57-living-character-world-v2/assets";
export const lineage57CharacterAssetPath = (id: string, expression: string) =>
  `${LINEAGE_57_ASSET_ROOT}/characters/${id}/${id}-${expression}.webp`;
export const lineage57LubtAssetPath = (pose: string) =>
  `${LINEAGE_57_ASSET_ROOT}/lubt/lubt-${pose}.png`;
