import {
  LINEAGE_57_EXPRESSIONS,
  type Lineage57Expression,
} from "./lineage-57-living-character-source";

export type LubtPose = "idle" | "heart" | "scan" | "guide" | "magic" | "bloom";
export interface CharacterReactionState {
  expression: Lineage57Expression;
  speech: string;
  special: boolean;
  lubtPose: LubtPose;
  lubtMessage: string;
}

export const LINEAGE_57_AUTO_LIFE_POOL: readonly Lineage57Expression[] = [
  "neutral", "smile", "wink", "shy", "touched", "sleepy",
];
export const LINEAGE_57_SING_SEQUENCE: readonly Lineage57Expression[] = [
  "sing", "touched", "sing", "smile",
];

export const CHARACTER_LINES: Record<Lineage57Expression, readonly string[]> = {
  neutral: ["잠깐, 네 이야기를 듣고 있어.", "편하게 있어도 괜찮아."],
  smile: ["네가 와서 조금 기분 좋아졌어.", "이 표정은 네가 만든 거야."],
  laugh: ["아, 정말 웃겨!", "이 순간은 꼭 저장해 줘."],
  wink: ["이건 우리끼리 비밀이야.", "방금 봤지?"],
  shy: ["너무 오래 바라보면 부끄러워.", "조금만 천천히 다가와 줘."],
  surprise: ["어? 정말?", "그건 생각하지 못했어!"],
  angry: ["잠깐, 지금은 조금 화났어.", "내 마음도 들어줄래?"],
  sing: ["이 부분은 너를 위해 부를게.", "우리의 순간을 노래로 남기자."],
  talk: ["하고 싶은 이야기가 있어.", "오늘 있었던 일을 들려줄게."],
  cry: ["조금 울어도 곁에 있어 줘.", "이 눈물도 언젠가 기억이 될 거야."],
  touched: ["이 순간은 오래 기억할게.", "마음이 따뜻해졌어."],
  sleepy: ["조금만 더 곁에 있어 줘.", "꿈에서도 다시 만나자."],
};

export const LUBT_RESPONSES: Record<Lineage57Expression, { pose: LubtPose; lines: readonly string[] }> = {
  neutral: { pose: "idle", lines: ["럽트가 조용히 감정을 지켜보고 있어."] },
  smile: { pose: "heart", lines: ["웃음의 빛이 조금 커졌어."] },
  laugh: { pose: "bloom", lines: ["이 웃음은 꽃처럼 기억하기 좋아."] },
  wink: { pose: "magic", lines: ["비밀 신호를 받았어."] },
  shy: { pose: "heart", lines: ["수줍은 마음도 잘 보관할게."] },
  surprise: { pose: "scan", lines: ["새로운 감정 신호를 발견했어."] },
  angry: { pose: "magic", lines: ["화난 마음도 소중히 들어 줘."] },
  sing: { pose: "guide", lines: ["노래의 파동도 Moment가 될 수 있어."] },
  talk: { pose: "guide", lines: ["캐릭터의 말을 기억 가지에 연결해 볼게."] },
  cry: { pose: "heart", lines: ["눈물도 기억을 반짝이게 해."] },
  touched: { pose: "bloom", lines: ["아주 깊은 감정이 피어났어."] },
  sleepy: { pose: "idle", lines: ["편안한 기억 속으로 들어가 볼까?"] },
};

const choose = <T,>(items: readonly T[], random = Math.random): T =>
  items[Math.floor(random() * items.length)] ?? items[0];

export function randomExpression(
  current: Lineage57Expression,
  random = Math.random,
): Lineage57Expression {
  const pool = LINEAGE_57_EXPRESSIONS.filter((item) => item !== current);
  return choose(pool, random);
}

export function reactionFor(
  expression: Lineage57Expression,
  random = Math.random,
): CharacterReactionState {
  const guide = LUBT_RESPONSES[expression];
  return {
    expression,
    speech: choose(CHARACTER_LINES[expression], random),
    special: false,
    lubtPose: guide.pose,
    lubtMessage: choose(guide.lines, random),
  };
}

export function primaryReaction(
  current: Lineage57Expression,
  random = Math.random,
): CharacterReactionState {
  return reactionFor(randomExpression(current, random), random);
}

export function specialReaction(): CharacterReactionState {
  return {
    expression: "touched",
    speech: "SECRET MOMENT — source interaction label",
    special: true,
    lubtPose: "bloom",
    lubtMessage: "비밀 순간을 발견했어. 아주 깊은 감정이 피어났어.",
  };
}

export function sayReaction(text: string): CharacterReactionState {
  const speech = text.trim() || "오늘도 네 순간을 기억할게.";
  return {
    expression: "talk",
    speech,
    special: false,
    lubtPose: "guide",
    lubtMessage: "그 말을 기억 가지에 연결해 둘게.",
  };
}

export function clampLubtPosition(
  clientX: number,
  clientY: number,
  offsetX: number,
  offsetY: number,
  viewportWidth: number,
  viewportHeight: number,
  width = 116,
  height = 116,
) {
  return {
    left: Math.max(0, Math.min(viewportWidth - width, clientX - offsetX)),
    top: Math.max(74, Math.min(viewportHeight - height, clientY - offsetY)),
  };
}
