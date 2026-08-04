export type CinematicEffect =
  | "polish"
  | "seed"
  | "pearzoom"
  | "graft"
  | "growth"
  | "pick"
  | "behold"
  | "cut"
  | "share"
  | "sky"
  | "blueprint"
  | "workshop"
  | "prune"
  | "questions"
  | "constellation"
  | "final";

export interface CinematicScene {
  n: string;
  title: string;
  eyebrow: string;
  body: string;
  asset: string | null;
  effect: CinematicEffect;
  pos: string;
  mpos: string;
  tone: "dark" | "light";
}

/**
 * Source authority: add/lovetree-cinematic-reference-motion-v5-1-refined.html
 * (Telegram B batch, commit 38fb8f9981c3b2e33c73c3106bd2155bbda7881d).
 * The 16-scene sequence, copy and effects are preserved verbatim.
 */
export const SCENES: CinematicScene[] = [
  { n: "01", title: "첫 빛이 기억을 깨웁니다", eyebrow: "A MEMORY · 첫 발견", body: "아직 이름 붙지 않은 순간이 황금빛으로 선명해집니다.", asset: "polish", effect: "polish", pos: "66% 48%", mpos: "65% 48%", tone: "dark" },
  { n: "02", title: "첫 마음을 심습니다", eyebrow: "A SEED · 첫 순간", body: "작은 새싹 하나가 두 사람의 기억을 품고 천천히 올라옵니다.", asset: "sapling", effect: "seed", pos: "50% 52%", mpos: "52% 50%", tone: "dark" },
  { n: "03", title: "한 순간 안으로 더 가까이", eyebrow: "A PROMISE · 황금 열매", body: "빛나는 기억 안으로 들어가면 다음 장면이 조용히 열립니다.", asset: "a23", effect: "pearzoom", pos: "50% 50%", mpos: "50% 50%", tone: "dark" },
  { n: "04", title: "이어진 마음을 단단히 묶습니다", eyebrow: "A CONNECTION · 이어진 이유", body: "왜 이 순간에서 다음 순간으로 갔는지, 마음의 이유를 가지에 남깁니다.", asset: "a21", effect: "graft", pos: "50% 52%", mpos: "56% 50%", tone: "light" },
  { n: "05", title: "연결은 가지가 되고, 기억은 열매가 됩니다", eyebrow: "A GROWTH · 가지와 열매", body: "하나씩 이어진 순간이 자라며 한 사람을 향한 나무의 모양을 만듭니다.", asset: "a01", effect: "growth", pos: "50% 50%", mpos: "50% 50%", tone: "dark" },
  { n: "06", title: "빛나는 순간을 고릅니다", eyebrow: "A DISCOVERY · 선택", body: "수많은 기억 사이에서 지금 가장 오래 바라보고 싶은 순간에 손을 뻗습니다.", asset: "a14", effect: "pick", pos: "52% 50%", mpos: "55% 50%", tone: "dark" },
  { n: "07", title: "그 순간에 남은 마음을 바라봅니다", eyebrow: "A FEELING · 마음 기록", body: "좋았던 이유와 오래 남은 감정을 짧은 문장으로 간직합니다.", asset: "a08", effect: "behold", pos: "58% 48%", mpos: "65% 46%", tone: "dark" },
  { n: "08", title: "같은 순간에도 서로 다른 마음이 열립니다", eyebrow: "A BRANCH · 다른 해석", body: "하나의 기억은 설렘과 그리움, 또 다른 다음 장면으로 나뉘어 자랍니다.", asset: "cut", effect: "cut", pos: "50% 50%", mpos: "52% 48%", tone: "light" },
  { n: "09", title: "나눈 기억은 서로의 안에서 오래 남습니다", eyebrow: "A SHARE · 함께 남기기", body: "같은 순간을 건네받은 두 마음이 각자의 가지에서 이야기를 이어갑니다.", asset: "a09", effect: "share", pos: "50% 50%", mpos: "50% 50%", tone: "light" },
  { n: "10", title: "기억은 날짜를 만나 흐름이 됩니다", eyebrow: "A SKY · 시간의 여백", body: "처음 마음이 움직인 날부터 다음 순간은 조용히 이어집니다.", asset: null, effect: "sky", pos: "50% 50%", mpos: "50% 50%", tone: "dark" },
  { n: "11", title: "흩어진 기억의 구조를 그립니다", eyebrow: "A BLUEPRINT · 구조", body: "순간과 연결, 감정과 날짜가 한눈에 보이는 LoveTree의 설계가 됩니다.", asset: "blueprint", effect: "blueprint", pos: "48% 50%", mpos: "36% 52%", tone: "dark" },
  { n: "12", title: "설계된 기억이 하나의 세계로 세워집니다", eyebrow: "A BUILD · 아카이브", body: "작은 기록과 연결이 모여 오래 돌아볼 수 있는 한 사람의 기억 공간이 됩니다.", asset: "workshop", effect: "workshop", pos: "50% 50%", mpos: "52% 50%", tone: "dark" },
  { n: "13", title: "덜어낸 자리에서 더 선명한 마음이 남습니다", eyebrow: "A CARE · 가지치기", body: "필요 없는 잎은 가볍게 흩어지고, 오래 간직할 열매는 더 밝게 드러납니다.", asset: "prune", effect: "prune", pos: "48% 50%", mpos: "40% 50%", tone: "dark" },
  { n: "14", title: "다음 순간으로 가기 전에 마음에게 묻습니다", eyebrow: "A QUESTION · 이어지기 전", body: "기억을 잇는 이유를 천천히 돌아봅니다.", asset: "a10", effect: "questions", pos: "50% 48%", mpos: "50% 50%", tone: "dark" },
  { n: "15", title: "손끝을 따라 기억의 별들이 이어집니다", eyebrow: "A MAP · 마음의 지도", body: "별 하나는 한 순간이고, 선 하나는 다음 장면으로 이어진 이유입니다.", asset: "a15", effect: "constellation", pos: "55% 50%", mpos: "58% 50%", tone: "dark" },
  { n: "16", title: "함께 가꾼 기억은 하나의 LoveTree가 됩니다", eyebrow: "A LEGACY · 완성", body: "물을 주고 가지를 돌보며, 빛나는 순간이 계속 자라는 나무를 완성합니다.", asset: "a16", effect: "final", pos: "50% 50%", mpos: "50% 50%", tone: "dark" },
];

/** Effects that overlay the same artwork again as a masked "motion mask" layer. */
export const MOTION_MASK_EFFECTS: ReadonlySet<string> = new Set([
  "polish",
  "graft",
  "behold",
  "blueprint",
  "prune",
]);

export const ASSET_PATH = "/v4/cinematic/telegram-b";

export function assetUrl(asset: string | null): string | null {
  if (!asset) return null;
  return `${ASSET_PATH}/${asset}.webp`;
}
