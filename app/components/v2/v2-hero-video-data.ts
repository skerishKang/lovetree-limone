export interface HeroVideoData {
  key: string;
  artist: string;
  channel: string;
  videoTitle: string;
  videoId: string;
  momentTime: string;
  relationLabel: string;
  memoryTitle: string;
  memoryMemo: string;
}

/**
 * LoveTree V2 hero demo dataset. Four fixed official music videos chosen by
 * LoveTree (not member data, not the community API). Every URL is derived
 * only from these allowlisted videoIds.
 */
export const HERO_VIDEOS: HeroVideoData[] = [
  {
    key: "bts",
    artist: "BTS",
    channel: "HYBE LABELS",
    videoTitle: "NORMAL",
    videoId: "GEk4jHwfFTA",
    momentTime: "01:30",
    relationLabel: "처음 발견한 순간",
    memoryTitle: "처음 마음이 멈춘 장면",
    memoryMemo: "짧은 영상 하나가 이상하게 오래 마음에 남았어요.",
  },
  {
    key: "blackpink",
    artist: "BLACKPINK",
    channel: "BLACKPINK",
    videoTitle: "GO",
    videoId: "2GJfWMYCWY0",
    momentTime: "03:12",
    relationLabel: "팬의 추천",
    memoryTitle: "다시 찾은 노래",
    memoryMemo: "이 장면을 보면 계속 생각나는 곡이에요.",
  },
  {
    key: "cortis",
    artist: "CORTIS",
    channel: "BIGHIT MUSIC",
    videoTitle: "REDRED",
    videoId: "U6BDbXIah-Y",
    momentTime: "07:48",
    relationLabel: "내가 고른 다음 순간",
    memoryTitle: "오래 간직할 문장",
    memoryMemo: "오늘의 마음을 잊지 않게 적어 두었어요.",
  },
  {
    key: "rescene",
    artist: "RESCENE",
    channel: "RESCENE",
    videoTitle: "LOVE ATTACK",
    videoId: "9XttLI0oH0I",
    momentTime: "05:24",
    relationLabel: "새로 자란 가지",
    memoryTitle: "다음 가지로 자란 순간",
    memoryMemo: "우연히 만난 장면이 이어져 새 가지가 됐어요.",
  },
];

export const DEMO_LABEL = "DEMO";

export function heroThumbPrimary(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function heroThumbFallback(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function heroWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function heroEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}
