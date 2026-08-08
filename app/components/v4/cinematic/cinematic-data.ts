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
 * Engine/source lineage:
 * - v5.1 base: lovetree-cinematic-reference-motion-v5-1-refined.html
 * - v6 evolution: lovetree-cinematic-v6-international.html
 *
 * The validated v5.1 16-scene architecture, asset/effect order and motion
 * engine remain authoritative. v6 contributes the International English copy
 * and selective presentation/motion deltas without creating a second route.
 */
export const SCENES: CinematicScene[] = [
  {
    n: "01",
    title: "Memory wakes in gold.",
    eyebrow: "OPENING · THE FIRST GLOW",
    body: "A paradise of memory appears at once: luminous, elegant, and warm enough to understand LoveTree in a single breath.",
    asset: "polish",
    effect: "polish",
    pos: "66% 48%",
    mpos: "65% 48%",
    tone: "dark",
  },
  {
    n: "02",
    title: "Plant\nthe first moment.",
    eyebrow: "01 · PLANT THE BEGINNING",
    body: "One small moment is planted first. From that first feeling, the whole tree quietly begins to grow.",
    asset: "sapling",
    effect: "seed",
    pos: "50% 52%",
    mpos: "52% 50%",
    tone: "dark",
  },
  {
    n: "03",
    title: "Enter the fruit\nof memory.",
    eyebrow: "02 · STEP INSIDE THE PEAR",
    body: "The golden pear is not just a symbol — it opens like a portal, inviting the viewer into the memory itself.",
    asset: "a23",
    effect: "pearzoom",
    pos: "50% 50%",
    mpos: "50% 50%",
    tone: "dark",
  },
  {
    n: "04",
    title: "Tie the reason\nto the branch.",
    eyebrow: "03 · CONNECT THE WHY",
    body: "A moment becomes stronger when the reason is tied to it. This is where memory turns into connection.",
    asset: "a21",
    effect: "graft",
    pos: "50% 52%",
    mpos: "56% 50%",
    tone: "light",
  },
  {
    n: "05",
    title: "Branches rise.\nPears begin to glow.",
    eyebrow: "04 · LET THE TREE GROW",
    body: "Linked memories reach upward like branches, and the moments that matter start shining like fruit.",
    asset: "a01",
    effect: "growth",
    pos: "50% 50%",
    mpos: "50% 50%",
    tone: "dark",
  },
  {
    n: "06",
    title: "Choose the fruit\nthat still glimmers.",
    eyebrow: "05 · SELECT THE MOMENT",
    body: "Among many memories, one still shines brighter. The hand reaches for the fruit that wants to be kept.",
    asset: "a14",
    effect: "pick",
    pos: "52% 50%",
    mpos: "55% 50%",
    tone: "dark",
  },
  {
    n: "07",
    title: "Read the feeling\nit kept.",
    eyebrow: "06 · FEEL THE MEANING",
    body: "The chosen scene carries its own warmth. A short line of feeling can stay beside it, like a note saved with care.",
    asset: "a08",
    effect: "behold",
    pos: "58% 48%",
    mpos: "65% 46%",
    tone: "dark",
  },
  {
    n: "08",
    title: "One moment\nsplits in two.",
    eyebrow: "07 · DIVIDE THE MEMORY",
    body: "The same scene can open into two hearts, two readings, two futures. One memory branches without losing its center.",
    asset: "cut",
    effect: "cut",
    pos: "50% 50%",
    mpos: "52% 48%",
    tone: "light",
  },
  {
    n: "09",
    title: "Share the meaning.",
    eyebrow: "08 · SHARE THE MEMORY",
    body: "A shared moment does not lose its meaning. It multiplies, leaving a different branch in each person who keeps it.",
    asset: "a09",
    effect: "share",
    pos: "50% 50%",
    mpos: "50% 50%",
    tone: "light",
  },
  {
    n: "10",
    title: "Time lets memory breathe.",
    eyebrow: "09 · LET TIME FLOW",
    body: "Dates, pauses, and seasons become part of the story. Even the open sky still belongs to the golden orchard.",
    asset: null,
    effect: "sky",
    pos: "50% 50%",
    mpos: "50% 50%",
    tone: "dark",
  },
  {
    n: "11",
    title: "Draw the hidden\nstructure.",
    eyebrow: "10 · REVEAL THE BLUEPRINT",
    body: "Moments, reasons, feelings, and dates can be seen together — not as fragments, but as a designed system of memory.",
    asset: "blueprint",
    effect: "blueprint",
    pos: "48% 50%",
    mpos: "36% 52%",
    tone: "dark",
  },
  {
    n: "12",
    title: "The blueprint\nbecomes a world.",
    eyebrow: "11 · BUILD THE ARCHIVE",
    body: "The design expands into a living archive, where many saved images and linked moments start to feel like a place.",
    asset: "workshop",
    effect: "workshop",
    pos: "50% 50%",
    mpos: "52% 50%",
    tone: "dark",
  },
  {
    n: "13",
    title: "Gold leaves fall.\nThe chosen fruit stays.",
    eyebrow: "12 · PRUNE WITH CARE",
    body: "When the unnecessary parts fall away, the precious fruit becomes clearer — and the transition itself glitters with gold.",
    asset: "prune",
    effect: "prune",
    pos: "48% 50%",
    mpos: "40% 50%",
    tone: "dark",
  },
  {
    n: "14",
    title: "Ask what made\nit stay.",
    eyebrow: "13 · ASK BEFORE CONNECTING",
    body: "Before the next line is drawn, LoveTree pauses and asks what made this memory meaningful enough to keep.",
    asset: "a10",
    effect: "questions",
    pos: "50% 48%",
    mpos: "50% 50%",
    tone: "dark",
  },
  {
    n: "15",
    title: "Every connection\nbecomes a map.",
    eyebrow: "14 · TRACE THE CONSTELLATION",
    body: "Each star is a moment. Each line is the quiet reason one scene led to the next. Together they reveal a living pattern.",
    asset: "a15",
    effect: "constellation",
    pos: "55% 50%",
    mpos: "58% 50%",
    tone: "dark",
  },
  {
    n: "16",
    title: "Your memory grows\ninto LoveTree.",
    eyebrow: "15 · COMPLETE THE LEGACY",
    body: "What began as one shining feeling becomes a tree you can return to — beautiful, intimate, and alive.",
    asset: "a16",
    effect: "final",
    pos: "50% 50%",
    mpos: "50% 50%",
    tone: "dark",
  },
];

/** Effects that overlay the same artwork again as a masked motion layer. */
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
