import type { CinematicEffect } from "./cinematic-data";

export const CINEMATIC_V6_SOURCE = "lovetree-cinematic-v6-international.html";
export const CINEMATIC_V6_SOURCE_SHA256 =
  "9a97ce9ee0c0f00fea57add2dbbd55f5d7f50b7ea9cf7d663ca642c879f3d17b";

export const V6_MENU_DESCRIPTION =
  "Each pear opens a different memory. Choose any chapter to jump directly into that cinematic moment.";

export const V6_SKY_COPY = [
  {
    title: "Dates turn memory\ninto a flow.",
    body: "The sky becomes a gentle pause between golden scenes, letting time itself feel visible and beautifully arranged.",
  },
  {
    title: "Yesterday’s heart\nbecomes today’s branch.",
    body: "Even this clear blue space stays warm: soft clouds, faint orchard traces, and lines of feeling drifting downward through time.",
  },
] as const;

export const V6_QUESTIONS = [
  { text: "Why did it last?", note: "the staying reason" },
  { text: "What warmth remained?", note: "the temperature of memory" },
  { text: "What made the next scene follow?", note: "the reason it connected" },
  { text: "What do you still keep?", note: "the feeling that remained" },
] as const;

export const V6_QUESTION_TITLE = "What made this moment stay?";
export const V6_QUESTION_KICKER = "13 · ASK BEFORE CONNECTING";

export const V6_CONSTELLATION_TITLE = "Every connection\nbecomes a map.";
export const V6_CONSTELLATION_BODY =
  "Each star remembers a moment. Each line remembers why it led onward. Step back, and a whole person begins to appear.";

export const V6_FINAL = {
  strap: "A PRIVATE PARADISE OF MEMORY",
  title: "LoveTree",
  subtitle: "Your brightest memories grow into a living tree.",
  note: "From a first feeling, to connection, to a world you can return to — LoveTree keeps the heart in a form elegant enough to revisit forever.",
  cta: "Begin My LoveTree",
} as const;

/**
 * Relative pointer-depth values from the exact v6 source. The enhancer maps
 * the source's percentage-based image offsets onto wrapper pixel offsets so it
 * composes with (rather than overwrites) the validated v5.1 scroll transforms.
 */
export const V6_POINTER_DEPTH: Record<CinematicEffect, number> = {
  polish: 0.75,
  seed: 0.68,
  pearzoom: 0.25,
  graft: 0.56,
  growth: 0.48,
  pick: 0.62,
  behold: 0.72,
  cut: 0.48,
  share: 0.44,
  sky: 0.44,
  blueprint: 0.38,
  workshop: 0.36,
  prune: 0.6,
  questions: 0.42,
  constellation: 0.3,
  final: 0.26,
};
