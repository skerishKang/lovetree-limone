export const V4_SUBJECT_ARCHIVE_ROUTES = {
  motion: "/v4/subjects/demo/motion",
  orbit: "/v4/subjects/demo/orbit",
  accordion: "/v4/subjects/demo/accordion",
  folding: "/v4/subjects/demo/folding",
} as const;

export type V4SubjectArchiveKey = keyof typeof V4_SUBJECT_ARCHIVE_ROUTES;

export interface V4SubjectAlbum {
  id: string;
  name: string;
  group: string;
  moments: number;
  trees: number;
  archive: V4SubjectArchiveKey;
  color: string;
  videoId: string;
  note: string;
}

export const V4_SUBJECT_ALBUMS: readonly V4SubjectAlbum[] = [
  { id: "juyeon", name: "주연", group: "사람", moments: 84, trees: 3, archive: "motion", color: "#b75f72", videoId: "dQw4w9WgXcQ", note: "처음 마음이 멈춘 장면부터 오래 간직할 문장까지" },
  { id: "summer", name: "여름의 여행", group: "여행", moments: 42, trees: 2, archive: "orbit", color: "#658f8a", videoId: "ysz5S6PUM-U", note: "바다와 기차, 밤 산책이 이어진 계절의 앨범" },
  { id: "music", name: "다시 찾은 노래", group: "작품", moments: 61, trees: 4, archive: "accordion", color: "#856aa9", videoId: "M7lc1UVf-VE", note: "추천을 따라가며 발견한 음악과 마음의 순서" },
  { id: "family", name: "우리 가족", group: "사람", moments: 116, trees: 5, archive: "folding", color: "#a47d55", videoId: "aqz-KE-bpKQ", note: "사진과 영상, 함께 나눈 문장을 사람별 책으로 보관" },
  { id: "books", name: "문장이 남은 책", group: "작품", moments: 37, trees: 2, archive: "accordion", color: "#7f8d67", videoId: "ScMzIvxBSi4", note: "오래 밑줄 친 문장과 다시 펼친 페이지" },
  { id: "friends", name: "친구들과 보낸 밤", group: "사람", moments: 53, trees: 3, archive: "motion", color: "#b96f8b", videoId: "jNQXAC9IVRw", note: "짧은 영상과 웃음이 물결처럼 이어지는 기록" },
  { id: "places", name: "다시 가고 싶은 장소", group: "여행", moments: 28, trees: 2, archive: "orbit", color: "#5f8998", videoId: "aqz-KE-bpKQ", note: "지도보다 먼저 마음에 남은 장소의 순간들" },
  { id: "season", name: "첫 번째 계절", group: "계절", moments: 76, trees: 1, archive: "folding", color: "#a87367", videoId: "dQw4w9WgXcQ", note: "하나의 나무 안에서 완성한 첫 시즌의 대표 기억" },
];

export function v4SubjectPosterUrl(subject: V4SubjectAlbum) {
  return `https://img.youtube.com/vi/${subject.videoId}/hqdefault.jpg`;
}
