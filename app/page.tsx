"use client";

import Image from "next/image";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

const galleryCards = [
  {
    title: "보랏빛 순간",
    description: "함께 만든 기억의 조각들",
    image: "/moment-purple.jpg",
    stat: "1,024",
    tone: "violet",
  },
  {
    title: "빛나던 무대",
    description: "우리가 빛나던 그 계절",
    image: "/moment-stage.jpg",
    stat: "2,318",
    tone: "gold",
  },
  {
    title: "우리가 사랑한 계절",
    description: "봄, 여름, 가을, 그리고 너",
    image: "/moment-spring.jpg",
    stat: "1,587",
    tone: "coral",
  },
];

type PrivacyChoice = "private" | "later" | "public";
type ViewMode = "tree" | "diary" | "story" | "album";
type Moment = {
  id: number;
  title: string;
  memo: string;
  relation: string;
  emotion: string;
  date: string;
  image: string;
  time: string;
  sourceUrl?: string;
  publicMemo?: boolean;
  kind?: "video" | "note";
};

const viewModes: Array<{ id: ViewMode; label: string; caption: string; icon: string }> = [
  { id: "tree", label: "성장 트리", caption: "움직이는 카드와 빛나는 가지", icon: "⌘" },
  { id: "diary", label: "마음 다이어리", caption: "글과 테이프로 꾸미는 기록", icon: "▤" },
  { id: "story", label: "스토리", caption: "앨범처럼 한 장씩 감상", icon: "◫" },
  { id: "album", label: "앨범 보드", caption: "사진과 영상을 한눈에", icon: "▦" },
];

const sampleMoments: Moment[] = [
  {
    id: 1,
    title: "처음 마음이 멈춘 장면",
    memo: "우연히 보게 됐는데, 하루 종일 이 장면이 생각났어.",
    relation: "첫 발견",
    emotion: "설렘",
    date: "2026.07.30",
    image: "/moment-purple.jpg",
    time: "01:30",
  },
  {
    id: 2,
    title: "댓글을 따라 찾은 무대",
    memo: "팬들이 꼭 보라고 한 장면을 찾아보다 더 좋아졌어.",
    relation: "댓글 따라감",
    emotion: "벅참",
    date: "2026.08.02",
    image: "/moment-stage.jpg",
    time: "00:48",
  },
  {
    id: 3,
    title: "우리의 계절이 피던 날",
    memo: "그날의 공기와 색을 오래 기억하고 싶어.",
    relation: "같은 계절",
    emotion: "추억",
    date: "2026.08.18",
    image: "/moment-spring.jpg",
    time: "02:12",
  },
  {
    id: 4,
    title: "함께여서 더 빛났던 시간",
    memo: "좋아하는 마음을 나누니 기억이 더 선명해졌어.",
    relation: "팬의 추천",
    emotion: "응원",
    date: "2026.09.03",
    image: "/moment-friends.jpg",
    time: "00:44",
  },
  {
    id: 5,
    title: "다시 꺼내 본 보랏빛 밤",
    memo: "시간이 지나도 그날의 환호는 마음에 남아 있어.",
    relation: "직접 검색",
    emotion: "여운",
    date: "2026.09.21",
    image: "/moment-purple.jpg",
    time: "01:08",
  },
  {
    id: 6,
    title: "오래 함께 걷고 싶은 마음",
    memo: "좋아한 시간이 쌓여 이제는 한 그루의 이야기가 됐어.",
    relation: "다른 모습",
    emotion: "사랑",
    date: "2026.10.11",
    image: "/moment-stage.jpg",
    time: "03:18",
  },
  {
    id: 7,
    title: "다시 찾은 다정한 인터뷰",
    memo: "무대와는 다른 조용한 말투가 오래 마음에 남았어.",
    relation: "댓글 따라감",
    emotion: "위로",
    date: "2026.10.24",
    image: "/moment-friends.jpg",
    time: "02:26",
  },
  {
    id: 8,
    title: "우리만 아는 마지막 앙코르",
    memo: "좋아한 순간들이 이어져 이제는 나만의 길이 되었어.",
    relation: "같은 무대",
    emotion: "벅참",
    date: "2026.11.07",
    image: "/moment-purple.jpg",
    time: "04:07",
  },
];

const communityTrees = [
  {
    title: "주연이가 웃던 장면만 모았어",
    artist: "THE BOYZ · 주연",
    owner: "주연이만보는밤",
    fandom: "더비의 공개 트리",
    description: "무대 위 표정에서 다정한 인터뷰까지, 주연을 좋아하게 된 순간을 여덟 갈래로 이어 봤어요.",
    image: "/moment-purple.jpg",
    count: 8,
    emotion: "응원",
    likes: 2814,
    comments: 126,
    published: "2026-07-29",
  },
  {
    title: "건호의 무대 밖 말투가 좋아",
    artist: "CORTIS · 건호",
    owner: "건호편집실",
    fandom: "팬이 만든 공개 트리",
    description: "처음 본 무대와 예능의 한마디가 어떻게 마음에 남았는지 차근차근 붙인 기록이에요.",
    image: "/moment-friends.jpg",
    count: 6,
    emotion: "위로",
    likes: 1640,
    comments: 72,
    published: "2026-07-28",
  },
  {
    title: "재현의 낮은 목소리를 따라",
    artist: "NCT · 재현",
    owner: "복숭아구름",
    fandom: "시즈니의 공개 트리",
    description: "노래, 인터뷰, 무대를 따라가며 오래 좋아하게 된 이유를 한 장씩 모았어요.",
    image: "/moment-stage.jpg",
    count: 7,
    emotion: "설렘",
    likes: 3426,
    comments: 201,
    published: "2026-07-30",
  },
  {
    title: "미나미의 반짝이는 순간들",
    artist: "RESCENE · 미나미",
    owner: "리본묶은하루",
    fandom: "리마인 팬의 공개 트리",
    description: "무대의 눈빛과 팬에게 건넨 말들을 꽃잎 편지처럼 이어 붙인 러브트리예요.",
    image: "/moment-spring.jpg",
    count: 6,
    emotion: "추억",
    likes: 2420,
    comments: 94,
    published: "2026-07-27",
  },
  {
    title: "원희가 웃으면 봄이 되는 날",
    artist: "ILLIT · 원희",
    owner: "체리소다원희",
    fandom: "GLLIT의 공개 트리",
    description: "짧은 직캠에서 시작해 예능과 무대까지 찾아간 귀여운 마음의 경로를 담았어요.",
    image: "/moment-spring.jpg",
    count: 5,
    emotion: "응원",
    likes: 2918,
    comments: 148,
    published: "2026-07-31",
  },
  {
    title: "카리나의 푸른 밤을 저장해",
    artist: "aespa · 카리나",
    owner: "푸른빛민트",
    fandom: "MY의 공개 트리",
    description: "강렬한 무대와 조용한 말투 사이, 좋아하는 반전의 순간을 보랏빛 가지로 연결했어요.",
    image: "/moment-stage.jpg",
    count: 8,
    emotion: "벅참",
    likes: 4382,
    comments: 264,
    published: "2026-07-30",
  },
  {
    title: "원영의 다정함은 계속 이어져",
    artist: "IVE · 장원영",
    owner: "럭키비키데이",
    fandom: "DIVE의 공개 트리",
    description: "무대 위 장면과 오래 남은 문장을 함께 모아 나만의 응원 트리로 키웠어요.",
    image: "/moment-friends.jpg",
    count: 7,
    emotion: "응원",
    likes: 3977,
    comments: 221,
    published: "2026-07-26",
  },
  {
    title: "엔하이픈 무대를 따라 걷는 밤",
    artist: "ENHYPEN",
    owner: "달빛엔진",
    fandom: "ENGENE의 공개 트리",
    description: "첫 발견부터 앙코르까지, 멤버들이 함께 빛난 무대를 시간순으로 이어 둔 트리예요.",
    image: "/moment-purple.jpg",
    count: 8,
    emotion: "벅참",
    likes: 3655,
    comments: 193,
    published: "2026-07-25",
  },
  {
    title: "투바투의 청춘을 다시 재생해",
    artist: "TOMORROW X TOGETHER",
    owner: "별을쫓는모아",
    fandom: "MOA의 공개 트리",
    description: "노래의 한 소절에서 시작해 같은 계절의 무대와 이야기를 한 앨범처럼 모았어요.",
    image: "/moment-stage.jpg",
    count: 6,
    emotion: "추억",
    likes: 3310,
    comments: 177,
    published: "2026-07-24",
  },
  {
    title: "BTS와 함께 자란 보랏빛 시간",
    artist: "BTS",
    owner: "보라해기록장",
    fandom: "ARMY의 공개 트리",
    description: "처음 본 영상부터 오래 힘이 되어준 말까지, 함께 자란 시간을 여덟 장면에 담았어요.",
    image: "/moment-purple.jpg",
    count: 8,
    emotion: "위로",
    likes: 5278,
    comments: 346,
    published: "2026-07-23",
  },
  {
    title: "블랙핑크의 무대는 아직 뜨거워",
    artist: "BLACKPINK",
    owner: "핑크베놈노트",
    fandom: "BLINK의 공개 트리",
    description: "강렬했던 첫 무대와 멤버별 솔로 순간을 사진 앨범처럼 시원하게 이어 놓았어요.",
    image: "/moment-friends.jpg",
    count: 7,
    emotion: "벅참",
    likes: 4890,
    comments: 278,
    published: "2026-07-21",
  },
];

function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button className="brand brand-button" type="button" onClick={onHome} aria-label="러브트리 첫 화면">
      <span className="brand-tree" aria-hidden="true">
        <i />
        <b />
        <em />
      </span>
      <span className="brand-copy">
        <strong>러브트리</strong>
        <small>LoveTree</small>
      </span>
    </button>
  );
}

const growthStages = [
  { count: 1, label: "첫 순간", copy: "마음의 씨앗" },
  { count: 2, label: "두 장면", copy: "첫 가지" },
  { count: 4, label: "피어난 가지", copy: "첫 꽃" },
  { count: 8, label: "이어지는 숲", copy: "여덟 갈래의 흐름" },
  { count: 20, label: "감정의 지도", copy: "취향별 작은 가지" },
  { count: 50, label: "마음의 숲", copy: "넓게 펼친 마인드맵" },
  { count: 100, label: "나만의 세계", copy: "백 개의 순간" },
];

type FlowPosition = { x: number; y: number };
type FlowLayout = "radial" | "emotion";

const initialFlowPositions: FlowPosition[] = [
  { x: -309, y: -199 },
  { x: 309, y: -193 },
  { x: -336, y: 29 },
  { x: 339, y: 35 },
  { x: -186, y: 229 },
  { x: 199, y: 234 },
  { x: -81, y: -209 },
  { x: 54, y: 254 },
];

function flowCanvasSize(count: number) {
  const extraRings = Math.max(0, Math.ceil((count - 8) / 12));
  return {
    width: 920 + extraRings * 480,
    height: 660 + extraRings * 380,
  };
}

function radialFlowOffset(index: number) {
  if (initialFlowPositions[index]) return initialFlowPositions[index];
  const extraIndex = index - initialFlowPositions.length;
  const ring = Math.floor(extraIndex / 12) + 1;
  const slot = extraIndex % 12;
  const angle = -Math.PI / 2 + slot * (Math.PI * 2 / 12) + ring * 0.11;
  return {
    x: Math.cos(angle) * (420 + (ring - 1) * 225),
    y: Math.sin(angle) * (285 + (ring - 1) * 155),
  };
}

function emotionGroups(moments: Moment[]) {
  return Array.from(new Set(moments.map((moment) => moment.emotion || "기타")));
}

function emotionHubOffset(groupIndex: number, groupCount: number) {
  const angle = -Math.PI / 2 + groupIndex * (Math.PI * 2 / Math.max(1, groupCount));
  return {
    x: Math.cos(angle) * 290,
    y: Math.sin(angle) * 205,
  };
}

function emotionFlowOffset(moments: Moment[], index: number) {
  const groups = emotionGroups(moments);
  const emotion = moments[index]?.emotion || "기타";
  const groupIndex = Math.max(0, groups.indexOf(emotion));
  const members = moments
    .map((moment, momentIndex) => ({ emotion: moment.emotion || "기타", momentIndex }))
    .filter((item) => item.emotion === emotion);
  const memberIndex = Math.max(0, members.findIndex((item) => item.momentIndex === index));
  const ring = Math.floor(memberIndex / 8);
  const slot = memberIndex % 8;
  const localAngle = -Math.PI / 2 + slot * (Math.PI * 2 / 8) + ring * 0.16;
  const hub = emotionHubOffset(groupIndex, groups.length);
  return {
    x: hub.x + Math.cos(localAngle) * (135 + ring * 150),
    y: hub.y + Math.sin(localAngle) * (105 + ring * 112),
  };
}

function defaultFlowOffset(moments: Moment[], index: number, layout: FlowLayout) {
  return layout === "emotion" ? emotionFlowOffset(moments, index) : radialFlowOffset(index);
}

function flowCopy(count: number) {
  if (count <= 1) {
    return {
      eyebrow: "01 · 첫 순간이 심어진 단계",
      lines: ["첫 순간이", "조용히", "심어졌어요."],
      description: "영상과 그때의 감상이 첫 마음 일기에 함께 남았습니다.",
    };
  }
  if (count === 2) {
    return {
      eyebrow: "03 · 첫 가지를 이어가는 시간",
      lines: ["첫 마음이", "다음 장면을", "찾아갔어요."],
      description: "첫 영상과 다음 영상 사이에 어떤 마음이 있었는지 남기면, 좋아하게 된 첫 경로가 보여요.",
    };
  }
  if (count === 3) {
    return {
      eyebrow: "04 · 작은 나무의 모양이 생기는 단계",
      lines: ["작은 가지가", "겹치며", "한 그루가 됐어요."],
      description: "세 번째 순간부터 흩어진 영상이 작은 나무의 모습으로 모이고 전체 경로가 한눈에 보이기 시작해요.",
    };
  }
  if (count === 4) {
    return {
      eyebrow: "05 · 이어진 마음에서 꽃이 피는 단계",
      lines: ["이어진 마음이", "겹겹이 자라", "꽃이 피기 시작했어요."],
      description: "네 번째 장면부터 가지 사이에 감정의 꽃이 피고, 추천과 검색을 따라온 길도 더 선명해져요.",
    };
  }
  if (count <= 6) {
    return {
      eyebrow: "06 · 오래 남은 마음이 열매가 되는 단계",
      lines: ["좋아한 시간이", "쌓여서", "열매를 맺고 있어요."],
      description: "장면, 댓글, 추천과 검색이 한 흐름으로 연결되며 오래 남은 마음이 열매가 됩니다.",
    };
  }
  return {
    eyebrow: `07 · ${count}개의 순간이 마음의 지도가 되는 단계`,
    lines: ["취향의 가지가", "사방으로 뻗어", "무성하게 자라고 있어요."],
    description: "영상이 더 쌓여도 첫 순간부터 지금까지의 흐름을 잃지 않고, 나만의 좋아함을 한눈에 볼 수 있어요.",
  };
}

function parseMomentTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatMomentTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function youtubeId(value: string) {
  return value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/)?.[1] ?? "";
}

function FlowCanvas({
  moments,
  treeName,
  layout = "radial",
  activeId,
  newId,
  positions,
  onSelect,
  onOpen,
  onMove,
  onMoveEnd,
  onAdd,
  onDelete,
  likedIds = [],
  onLike,
  readOnly = false,
}: {
  moments: typeof sampleMoments;
  treeName: string;
  layout?: FlowLayout;
  activeId: number;
  newId: number;
  positions: FlowPosition[];
  onSelect: (id: number) => void;
  onOpen?: (id: number) => void;
  onMove?: (id: number, position: FlowPosition) => void;
  onMoveEnd?: () => void;
  onAdd?: () => void;
  onDelete?: (id: number) => void;
  likedIds?: number[];
  onLike?: (id: number) => void;
  readOnly?: boolean;
}) {
  const drag = useRef<{
    id: number;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  const canvasSize = flowCanvasSize(moments.length);
  const root = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  const groups = emotionGroups(moments);

  function startDrag(event: ReactPointerEvent<HTMLElement>, id: number, offset: FlowPosition) {
    if (readOnly || !onMove) return;
    drag.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || !onMove) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) current.moved = true;
    onMove(current.id, {
      x: Math.max(-root.x + 110, Math.min(root.x - 110, current.originX + dx)),
      y: Math.max(-root.y + 95, Math.min(root.y - 95, current.originY + dy)),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    if (event.currentTarget.hasPointerCapture(drag.current.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.current.pointerId);
    }
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) {
      ignoreClick.current = true;
      window.setTimeout(() => {
        ignoreClick.current = false;
      }, 0);
      onMoveEnd?.();
    }
  }

  return (
    <div className={`flow-canvas flow-layout-${layout}`} style={{ width: canvasSize.width, height: canvasSize.height }}>
      <span
        className="flow-orbit flow-orbit-one"
        style={{ left: root.x - 390, top: root.y - 235 }}
        aria-hidden="true"
      />
      <span
        className="flow-orbit flow-orbit-two"
        style={{ left: root.x - 300, top: root.y - 205 }}
        aria-hidden="true"
      />
      {layout === "emotion" && groups.map((group, groupIndex) => {
        const hub = emotionHubOffset(groupIndex, groups.length);
        const hubPoint = { x: root.x + hub.x, y: root.y + hub.y };
        const length = Math.hypot(hub.x, hub.y);
        const angle = Math.atan2(hub.y, hub.x) * 180 / Math.PI;
        return (
          <span key={`emotion-hub-${group}`}>
            <i
              className={`emotion-hub-line flow-branch-tone-${(groupIndex % 5) + 1}`}
              style={{ left: root.x, top: root.y, width: length, transform: `rotate(${angle}deg)` }}
              aria-hidden="true"
            />
            <b className={`emotion-hub emotion-hub-${(groupIndex % 5) + 1}`} style={{ left: hubPoint.x, top: hubPoint.y }}>
              {group}
            </b>
          </span>
        );
      })}
      {moments.map((moment, index) => {
        const offset = positions[index] ?? defaultFlowOffset(moments, index, layout);
        const position = { x: root.x + offset.x - 84, y: root.y + offset.y - 76 };
        const target = { x: position.x + 84, y: position.y + 76 };
        const hub = layout === "emotion"
          ? emotionHubOffset(Math.max(0, groups.indexOf(moment.emotion || "기타")), groups.length)
          : { x: 0, y: 0 };
        const branchRoot = { x: root.x + hub.x, y: root.y + hub.y };
        const dx = target.x - branchRoot.x;
        const dy = target.y - branchRoot.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const isNew = moment.id === newId;
        return (
          <span key={`branch-${moment.id}`}>
            <i
              className={`flow-branch-line flow-branch-tone-${(index % 5) + 1} ${isNew ? "new" : ""}`}
              style={{
                left: branchRoot.x,
                top: branchRoot.y,
                width: length,
                transform: `rotate(${angle}deg)`,
              }}
              aria-hidden="true"
            />
            <span
              className={`flow-branch-heart flow-branch-heart-${(index % 4) + 1} ${isNew ? "new" : ""}`}
              style={{ left: branchRoot.x + dx * 0.48, top: branchRoot.y + dy * 0.48 }}
              aria-hidden="true"
            >
              ♥
            </span>
            {index >= 2 && (
              <span
                className={`flow-branch-flower ${isNew ? "new" : ""}`}
                style={{ left: branchRoot.x + dx * 0.72, top: branchRoot.y + dy * 0.72 }}
                aria-hidden="true"
              >
                ✿
              </span>
            )}
            {index >= 4 && (
              <span
                className={`flow-branch-fruit ${isNew ? "new" : ""}`}
                style={{ left: branchRoot.x + dx * 0.61, top: branchRoot.y + dy * 0.61 }}
                aria-hidden="true"
              >
                ●
              </span>
            )}
            {index > 0 && (
              <span
                className="flow-relation"
                style={{ left: branchRoot.x + dx * 0.68, top: branchRoot.y + dy * 0.68 }}
              >
                {moment.relation}
              </span>
            )}
          </span>
        );
      })}

      <article
        className={`flow-root ${newId ? "sparkle" : ""}`}
        style={{ left: root.x - 70, top: root.y - 66 }}
      >
        <span aria-hidden="true">♥</span>
        <small>MY LOVE TREE</small>
        <strong>{treeName}</strong>
        <em>{moments.length} moments</em>
      </article>

      {moments.map((moment, index) => {
        const offset = positions[index] ?? defaultFlowOffset(moments, index, layout);
        const position = { x: root.x + offset.x - 84, y: root.y + offset.y - 76 };
        const videoId = youtubeId(moment.sourceUrl ?? "");
        return (
          <article
            className={`flow-node ${activeId === moment.id ? "active" : ""} ${newId === moment.id ? "new" : ""}`}
            style={{ left: position.x, top: position.y }}
            key={moment.id}
            onPointerDown={(event) => startDrag(event, moment.id, offset)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <button
              className="flow-node-select"
              type="button"
              onClick={() => {
                if (ignoreClick.current) return;
                onSelect(moment.id);
                onOpen?.(moment.id);
              }}
            >
              <span
                className={`flow-node-photo ${videoId ? "youtube-thumbnail" : ""}`}
                style={videoId ? { backgroundImage: `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)` } : undefined}
              >
                {!videoId && <Image src={moment.image} alt="" fill sizes="175px" draggable={false} />}
                <b>{String(index + 1).padStart(2, "0")}</b>
                <i aria-hidden="true">▶</i>
              </span>
              <span className="flow-node-copy">
                <strong>{moment.memo}</strong>
                <small>{moment.date}{readOnly ? "" : " · 끌어서 위치 바꾸기"}</small>
              </span>
            </button>
            {!readOnly && onDelete && (
              <button
                className="flow-node-delete"
                type="button"
                disabled={moments.length <= 1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(moment.id);
                }}
                aria-label={`${moment.title} 삭제`}
              >
                ×
              </button>
            )}
            {readOnly && onLike && (
              <button
                className={`flow-node-like ${likedIds.includes(moment.id) ? "active" : ""}`}
                type="button"
                aria-pressed={likedIds.includes(moment.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  onLike(moment.id);
                }}
                aria-label={`${moment.title} 좋아요`}
              >
                ♥ <span>{24 + index * 7 + (likedIds.includes(moment.id) ? 1 : 0)}</span>
              </button>
            )}
          </article>
        );
      })}

      {onAdd && (
        <button className="flow-add-end" type="button" onClick={onAdd} aria-label="새 영상 추가">
          ＋
        </button>
      )}
    </div>
  );
}

const diaryBoardPositions: FlowPosition[] = [
  { x: 36, y: 72 },
  { x: 300, y: 104 },
  { x: 570, y: 64 },
  { x: 130, y: 360 },
  { x: 410, y: 388 },
  { x: 650, y: 345 },
  { x: 54, y: 615 },
  { x: 360, y: 640 },
];

function diaryBoardPosition(index: number) {
  if (diaryBoardPositions[index]) return diaryBoardPositions[index];
  const extraIndex = index - diaryBoardPositions.length;
  return {
    x: 54 + (extraIndex % 3) * 285,
    y: 890 + Math.floor(extraIndex / 3) * 275,
  };
}

function diaryBoardHeight(count: number) {
  return Math.max(900, 920 + Math.ceil(Math.max(0, count - diaryBoardPositions.length) / 3) * 275);
}

function DiaryBoard({
  moments,
  activeId,
  newId,
  paper,
  onSelect,
  onAdd,
}: {
  moments: typeof sampleMoments;
  activeId: number;
  newId: number;
  paper: "blush" | "letter" | "sage";
  onSelect: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div
      className={`diary-flow-board diary-paper-${paper}`}
      style={{ height: diaryBoardHeight(moments.length) }}
    >
      <span className="diary-board-title">순간을 이어가는 중 ♡</span>
      <span className="diary-board-date">2026 — 지금</span>
      <span className="diary-sprig diary-sprig-one" aria-hidden="true" />
      <span className="diary-sprig diary-sprig-two" aria-hidden="true" />

      {moments.slice(0, -1).map((moment, index) => {
        const from = diaryBoardPosition(index);
        const to = diaryBoardPosition(index + 1);
        const x1 = from.x + 102;
        const y1 = from.y + 105;
        const x2 = to.x + 102;
        const y2 = to.y + 105;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const nextMoment = moments[index + 1];
        return (
          <span key={`diary-wire-${moment.id}`}>
            <i
              className={`diary-wire ${nextMoment.id === newId ? "new" : ""}`}
              style={{ left: x1, top: y1, width: length, transform: `rotate(${angle}deg)` }}
              aria-hidden="true"
            />
            <span className="diary-wire-label" style={{ left: x1 + dx / 2, top: y1 + dy / 2 }}>
              {nextMoment.relation}
            </span>
          </span>
        );
      })}

      {moments.map((moment, index) => {
        const position = diaryBoardPosition(index);
        return (
          <article
            className={`diary-memory ${activeId === moment.id ? "active" : ""} ${newId === moment.id ? "new" : ""}`}
            style={{ left: position.x, top: position.y }}
            key={moment.id}
          >
            <span className={`diary-tape diary-tape-${(index % 4) + 1}`} aria-hidden="true" />
            <b>{String(index + 1).padStart(2, "0")}</b>
            <button type="button" onClick={() => onSelect(moment.id)}>
              {moment.kind === "note" ? (
                <span className="diary-note-paper">
                  <i aria-hidden="true">❝</i>
                  <strong>{moment.memo}</strong>
                  <small>오늘의 마음 한 줄</small>
                </span>
              ) : (
                <span className="diary-memory-photo">
                  <Image src={moment.image} alt="" fill sizes="210px" />
                  <i aria-hidden="true">▶</i>
                </span>
              )}
              <span className="diary-memory-body">
                <span><em>{moment.emotion}</em><small>{moment.date}</small></span>
                <strong>{moment.title}</strong>
                <p>{moment.memo}</p>
                <small>↝ {moment.relation}</small>
              </span>
            </button>
          </article>
        );
      })}
      <button className="diary-add-here" type="button" onClick={onAdd}>⊕ 이 다음 순간 이어가기</button>
    </div>
  );
}

function Workspace({
  treeName,
  initialMode,
  initialSeed,
  onHome,
  onEdit,
}: {
  treeName: string;
  initialMode: ViewMode;
  initialSeed: Moment | null;
  onHome: () => void;
  onEdit: () => void;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [moments, setMoments] = useState(() => initialSeed ? [initialSeed] : sampleMoments.slice(0, 4));
  const [activeId, setActiveId] = useState(initialSeed ? 1 : 4);
  const [zoom, setZoom] = useState(90);
  const [relation, setRelation] = useState("댓글 따라감");
  const [emotion, setEmotion] = useState("설렘");
  const [customEmotion, setCustomEmotion] = useState("");
  const [memo, setMemo] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [entryKind, setEntryKind] = useState<"video" | "note">("video");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryTime, setEntryTime] = useState("00:00");
  const [entryDate, setEntryDate] = useState("2026-07-30");
  const [publicMemo, setPublicMemo] = useState(false);
  const [newMomentId, setNewMomentId] = useState(0);
  const [growthPulse, setGrowthPulse] = useState(0);
  const [growthNotice, setGrowthNotice] = useState("연결 수에 따라 문장과 나무의 모습이 함께 달라져요.");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [flowExpanded, setFlowExpanded] = useState(false);
  const [flowPositions, setFlowPositions] = useState(initialFlowPositions);
  const [treeLayout, setTreeLayout] = useState<FlowLayout>("radial");
  const [viewerMomentId, setViewerMomentId] = useState<number | null>(null);
  const [diaryPaper, setDiaryPaper] = useState<"blush" | "letter" | "sage">("blush");
  const [notice, setNotice] = useState("같은 순간을 네 가지 모습으로 볼 수 있어요.");

  const momentCount = moments.length;
  const activeMoment = moments.find((moment) => moment.id === activeId) ?? moments[moments.length - 1];
  const activeMode = viewModes.find((item) => item.id === mode) ?? viewModes[0];
  const previewVideoId = youtubeId(videoUrl);
  const standaloneMode = mode === "diary";
  const canvasSize = flowCanvasSize(momentCount);
  const viewerMoment = viewerMomentId === null
    ? null
    : moments.find((moment) => moment.id === viewerMomentId) ?? null;
  const viewerIndex = viewerMoment ? moments.findIndex((moment) => moment.id === viewerMoment.id) : -1;
  const nextViewerMoment = viewerIndex >= 0 ? moments[(viewerIndex + 1) % moments.length] : null;

  function chooseStage(count: number) {
    setMoments(sampleMoments.slice(0, count));
    setActiveId(Math.min(activeId, count));
    setFlowPositions(initialFlowPositions);
    setTreeLayout("radial");
    setNewMomentId(count > momentCount ? count : 0);
    setGrowthPulse((current) => current + 1);
    setGrowthNotice(`${count}개의 영상에 맞춰 “${flowCopy(count).lines.join(" ")}”로 문장이 바뀌었어요.`);
    setNotice(`${count}개의 순간과 성장 단계가 함께 바뀌었어요.`);
  }

  function addMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parseMomentTime(entryTime) === null) {
      setNotice("기억할 시각은 01:30 형식으로 적어 주세요.");
      document.getElementById("moment-entry-time")?.focus();
      return;
    }
    const nextCount = momentCount + 1;
    const template = sampleMoments[momentCount % sampleMoments.length];
    const finalEmotion = customEmotion.trim() || emotion;
    const finalKind = mode === "diary" ? entryKind : "video";
    setMoments((current) => [
      ...current,
      {
        ...template,
        id: nextCount,
        title: entryTitle.trim() || (finalKind === "note" ? "오늘의 한 문장" : `새로 이어진 영상 ${String(nextCount).padStart(2, "0")}`),
        memo: memo.trim() || template.memo,
        relation,
        emotion: finalEmotion,
        date: entryDate.replaceAll("-", "."),
        time: entryTime,
        sourceUrl: videoUrl.trim() || undefined,
        publicMemo,
        kind: finalKind,
      },
    ]);
    setActiveId(nextCount);
    setNewMomentId(nextCount);
    setGrowthPulse((current) => current + 1);
    setGrowthNotice(`새 영상이 이어져 “${flowCopy(nextCount).lines.join(" ")}”로 문장이 바뀌었어요.`);
    setMemo("");
    setVideoUrl("");
    setEntryTitle("");
    setEntryTime("00:00");
    setCustomEmotion("");
    setPublicMemo(false);
    setNotice(`새 가지·카드·하트·꽃${nextCount >= 5 ? "·열매" : ""}가 빛나며 반영됐어요.`);
  }

  function moveFlowNode(id: number, position: FlowPosition) {
    const momentIndex = moments.findIndex((moment) => moment.id === id);
    setFlowPositions((current) => {
      const next = Array.from(
        { length: Math.max(current.length, momentIndex + 1) },
        (_, index) => current[index] ?? defaultFlowOffset(moments, index, treeLayout),
      );
      next[momentIndex] = position;
      return next;
    });
  }

  function centerTree(viewportId: string, nextZoom = zoom) {
    window.setTimeout(() => {
      const viewport = document.getElementById(viewportId);
      if (!viewport) return;
      const scale = nextZoom / 100;
      viewport.scrollTo({
        left: Math.max(0, (canvasSize.width * scale - viewport.clientWidth) / 2),
        top: Math.max(0, (canvasSize.height * scale - viewport.clientHeight) / 2),
        behavior: "smooth",
      });
    }, 60);
  }

  function fitTree(viewportId: string) {
    const viewport = document.getElementById(viewportId);
    const availableWidth = viewport?.clientWidth ?? 820;
    const availableHeight = viewport?.clientHeight ?? 620;
    const nextZoom = Math.max(
      18,
      Math.min(100, Math.floor(Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height) * 92)),
    );
    setZoom(nextZoom);
    centerTree(viewportId, nextZoom);
    setNotice(`${momentCount}개의 순간을 한눈에 보는 ${nextZoom}% 맞춤 화면이에요.`);
  }

  function changeTreeLayout(nextLayout: FlowLayout) {
    setTreeLayout(nextLayout);
    setFlowPositions([]);
    setNotice(nextLayout === "emotion"
      ? "설렘·귀여움·섹시함처럼 감정별 가지로 다시 펼쳤어요."
      : "중앙에서 사방으로 자라는 방사형 트리로 펼쳤어요.");
    centerTree("growth-flow-viewport");
    centerTree("expanded-flow-viewport");
  }

  function openMomentViewer(id: number) {
    setActiveId(id);
    setViewerMomentId(id);
  }

  function moveViewer(direction: -1 | 1) {
    if (viewerMomentId === null) return;
    const currentIndex = moments.findIndex((moment) => moment.id === viewerMomentId);
    const nextIndex = (currentIndex + direction + moments.length) % moments.length;
    setActiveId(moments[nextIndex].id);
    setViewerMomentId(moments[nextIndex].id);
  }

  function adjustEntryTime(delta: number) {
    setEntryTime((current) => formatMomentTime((parseMomentTime(current) ?? 0) + delta));
  }

  function deleteMoment() {
    if (pendingDeleteId === null) return;
    if (moments.length <= 1) {
      setPendingDeleteId(null);
      setNotice("러브트리의 첫 씨앗 한 개는 남겨두어야 해요.");
      return;
    }
    const removedIndex = moments.findIndex((moment) => moment.id === pendingDeleteId);
    const removed = moments[removedIndex];
    const nextMoments = moments
      .filter((moment) => moment.id !== pendingDeleteId)
      .map((moment, index) => ({ ...moment, id: index + 1 }));
    const nextActive = nextMoments[Math.min(Math.max(removedIndex, 0), nextMoments.length - 1)];
    setMoments(nextMoments);
    setActiveId(nextActive.id);
    setFlowPositions(initialFlowPositions);
    setNewMomentId(0);
    if (viewerMomentId === pendingDeleteId) setViewerMomentId(null);
    setPendingDeleteId(null);
    setGrowthPulse((current) => current + 1);
    setGrowthNotice(`순간을 정리해 ${nextMoments.length}개 단계의 문장으로 돌아왔어요.`);
    setNotice(`“${removed.title}”을 삭제하고 연결선과 성장 단계를 다시 정리했어요.`);
  }

  function focusMomentForm() {
    const form = document.getElementById("moment-form");
    form?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(
      () => document.getElementById(mode === "diary" && entryKind === "note" ? "moment-entry-title" : "moment-video-url")?.focus(),
      350,
    );
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }

  useEffect(() => {
    if (!flowExpanded) return;
    const closeExpanded = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFlowExpanded(false);
    };
    window.addEventListener("keydown", closeExpanded);
    return () => window.removeEventListener("keydown", closeExpanded);
  }, [flowExpanded]);

  useEffect(() => {
    if (pendingDeleteId === null) return;
    const closeDelete = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDeleteId(null);
    };
    window.addEventListener("keydown", closeDelete);
    return () => window.removeEventListener("keydown", closeDelete);
  }, [pendingDeleteId]);

  useEffect(() => {
    if (viewerMomentId === null) return;
    const navigateViewer = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerMomentId(null);
      const direction = event.key === "ArrowUp" || event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : 0;
      if (!direction) return;
      const currentIndex = moments.findIndex((moment) => moment.id === viewerMomentId);
      const nextIndex = (currentIndex + direction + moments.length) % moments.length;
      setActiveId(moments[nextIndex].id);
      setViewerMomentId(moments[nextIndex].id);
    };
    window.addEventListener("keydown", navigateViewer);
    return () => window.removeEventListener("keydown", navigateViewer);
  }, [viewerMomentId, moments]);

  return (
    <div className={`workspace-shell workspace-mode-${mode} ${standaloneMode ? "workspace-standalone-mode" : ""}`}>
      <header className="workspace-topbar">
        <Brand onHome={onHome} />
        <nav className="workspace-mode-tabs" aria-label="러브트리 보기 방식">
          {viewModes.map((item) => (
            <button
              className={mode === item.id ? "active" : ""}
              type="button"
              key={item.id}
              aria-pressed={mode === item.id}
              onClick={() => {
                setMode(item.id);
                setNotice(`${item.label} 보기로 바꿨어요. 기록은 그대로 유지됩니다.`);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="workspace-header-actions">
          <button type="button" onClick={onEdit}>트리 설정</button>
          <button className="workspace-profile" type="button" aria-label="프로필 메뉴">
            <span aria-hidden="true">봄</span> 나의 하루
          </button>
        </div>
      </header>

      {standaloneMode && (
        <nav className="standalone-progress" aria-label="러브트리 기록 단계">
          <span className="done"><b>✓</b> 첫 순간</span>
          <span className="active"><b>02</b> 마음 기록</span>
          <span className="done"><b>✓</b> 다음 영상 잇기</span>
          <span><b>04</b> 다이어리 꾸미기</span>
          <span><b>05</b> 꽃·열매 맺기</span>
        </nav>
      )}

      <main className="workspace-layout">
        <aside className="workspace-rail">
          {mode === "diary" ? (
            <>
              <p className="workspace-overline">OUR LOVE DIARY</p>
              <h1>{treeName}<em> 순간들</em></h1>
              <p className="workspace-privacy">▣ 나만 보는 러브트리</p>
              <div className="diary-summary-actions">
                <button type="button" onClick={onEdit}>✎ 제목 수정</button>
                <button type="button">◉ 공개 전환</button>
              </div>
              <p className="workspace-intro diary-summary-copy">
                영상 하나와 그때의 마음을
                <br />
                다이어리 한 장처럼 남겨요.
                <br />
                선은 좋아하게 된 순서만 알려줍니다.
              </p>
              <div className="diary-summary-count">
                <strong>{momentCount}</strong>
                <span>개의 순간이 이어져 있어요</span>
              </div>
              <div className="diary-emotion-cloud">
                {Array.from(new Set(moments.map((moment) => moment.emotion))).map((item) => (
                  <span key={item}>{item} {moments.filter((moment) => moment.emotion === item).length}</span>
                ))}
              </div>
              <div className="diary-summary-bottom">
                <button type="button" onClick={() => setActiveId(moments[moments.length - 1].id)}>❦ 가장 최근 순간 보기</button>
                <button type="button" onClick={() => chooseStage(4)}>↺ 예시 기록으로 되돌리기</button>
              </div>
            </>
          ) : (
            <>
              <p className="workspace-overline">MY LOVE TREE</p>
              <h1>{treeName}</h1>
              <p className="workspace-privacy">♙ 나만 보는 러브트리</p>
              <p className="workspace-intro">
                한 번 남긴 순간은 그대로 두고,
                <br />
                보고 싶은 방식만 바꿔보세요.
              </p>

              <section className="growth-selector" aria-labelledby="growth-title">
                <div>
                  <span id="growth-title">트리의 성장 단계</span>
                  <small>{momentCount} moments</small>
                </div>
                {growthStages.map((stage, index) => {
                  const nextStage = growthStages[index + 1];
                  const isCurrent = momentCount >= stage.count && (!nextStage || momentCount < nextStage.count);
                  return (
                  <button
                    className={`${momentCount >= stage.count ? "reached" : ""} ${isCurrent ? "active" : ""}`}
                    type="button"
                    key={stage.count}
                    disabled
                  >
                    <b>{String(stage.count).padStart(2, "0")}</b>
                    <span><strong>{stage.label}</strong><small>{stage.copy}</small></span>
                    <i aria-hidden="true">{momentCount >= stage.count ? "✓" : "›"}</i>
                  </button>
                  );
                })}
              </section>

              <section className="mode-note">
                <span aria-hidden="true">{activeMode.icon}</span>
                <div>
                  <strong>{activeMode.label}</strong>
                  <p>{activeMode.caption}</p>
                </div>
              </section>
            </>
          )}
        </aside>

        <section className="workspace-stage" aria-label={`${activeMode.label} 화면`}>
          <header className="workspace-stage-head">
            <div>
              <p>WHOLE LOVETREE · 같은 기억, 다른 보기</p>
              <span>{momentCount}개의 순간이 이어져 있어요</span>
            </div>
            <div className="canvas-controls" aria-label="화면 크기 조절">
              {mode === "tree" && (
                <>
                  <span className="tree-layout-toggle" aria-label="트리 펼침 방식">
                    <button
                      className={treeLayout === "radial" ? "active" : ""}
                      type="button"
                      onClick={() => changeTreeLayout("radial")}
                    >
                      방사형
                    </button>
                    <button
                      className={treeLayout === "emotion" ? "active" : ""}
                      type="button"
                      onClick={() => changeTreeLayout("emotion")}
                    >
                      감정별
                    </button>
                  </span>
                  <button type="button" onClick={() => setZoom(Math.max(18, zoom - 10))}>−</button>
                  <span>{zoom}%</span>
                  <button type="button" onClick={() => setZoom(Math.min(160, zoom + 10))}>＋</button>
                  <button type="button" onClick={() => fitTree("growth-flow-viewport")}>한눈에</button>
                  <button type="button" onClick={() => centerTree("growth-flow-viewport")}>중앙</button>
                </>
              )}
              <button
                type="button"
                onClick={mode === "tree"
                  ? () => {
                      setFlowExpanded(true);
                      fitTree("expanded-flow-viewport");
                    }
                  : toggleFullscreen}
              >
                {mode === "tree" ? "크게 펼쳐보기" : "전체 화면"}
              </button>
            </div>
          </header>

          <div className={`workspace-view workspace-view-${mode}`}>
            {mode === "tree" && (
              <div className="growth-tree-view">
                <section className="growth-story-banner" key={`tree-copy-${growthPulse}`}>
                  <div>
                    <p>{flowCopy(momentCount).eyebrow}</p>
                    <h2 className={growthPulse ? "changed" : ""}>
                      <span>{flowCopy(momentCount).lines[0]}</span>
                      <span>{flowCopy(momentCount).lines[1]}</span>
                      <em>{flowCopy(momentCount).lines[2]}</em>
                    </h2>
                  </div>
                  <div>
                    <p>{flowCopy(momentCount).description}</p>
                    <mark><span aria-hidden="true">✦</span> {growthNotice}</mark>
                  </div>
                </section>
                <div className="growth-flow-viewport" id="growth-flow-viewport">
                  <div
                    className="flow-canvas-space"
                    style={{ width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100 }}
                  >
                    <div
                      className="flow-canvas-scale"
                      style={{ width: canvasSize.width, height: canvasSize.height, transform: `scale(${zoom / 100})` }}
                    >
                      <FlowCanvas
                        moments={moments}
                        treeName={treeName}
                        layout={treeLayout}
                        activeId={activeMoment.id}
                        newId={newMomentId}
                        positions={flowPositions}
                        onSelect={setActiveId}
                        onOpen={openMomentViewer}
                        onMove={moveFlowNode}
                        onMoveEnd={() => setNotice("카드를 옮긴 자리까지 빛나는 가지가 따라왔어요.")}
                        onAdd={focusMomentForm}
                        onDelete={setPendingDeleteId}
                      />
                    </div>
                  </div>
                </div>
                <p className="growth-drag-hint">카드 이동 · 18~160% 확대축소 · 방사형/감정별 전환 · 클릭하면 영상 집중 보기</p>
              </div>
            )}

            {mode === "diary" && (
              <div className="diary-view">
                <header>
                  <div>
                    <p>CONNECTED VIDEO DIARY</p>
                    <h2>마음을 이어가는 <em>영상 다이어리</em></h2>
                    <span>영상 아래에 그날의 감상을 적고, 다음 순간까지의 흐름을 가볍게 이어 보세요.</span>
                  </div>
                  <div className="diary-head-actions">
                    <div className="diary-paper-picker" aria-label="다이어리 배경 선택">
                      {[
                        { id: "blush" as const, label: "꽃잎" },
                        { id: "letter" as const, label: "편지지" },
                        { id: "sage" as const, label: "정원" },
                      ].map((paper) => (
                        <button
                          className={diaryPaper === paper.id ? "active" : ""}
                          type="button"
                          key={paper.id}
                          onClick={() => setDiaryPaper(paper.id)}
                        >
                          {paper.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setActiveId(moments[0].id)}>처음부터 보기</button>
                    <button type="button" onClick={focusMomentForm}>＋ 새 순간</button>
                  </div>
                </header>
                <DiaryBoard
                  moments={moments}
                  activeId={activeMoment.id}
                  newId={newMomentId}
                  paper={diaryPaper}
                  onSelect={openMomentViewer}
                  onAdd={focusMomentForm}
                />
              </div>
            )}

            {mode === "story" && (
              <div className="story-view">
                <div className="story-photo">
                  <Image src={activeMoment.image} alt={activeMoment.title} fill sizes="(max-width: 900px) 90vw, 680px" />
                  <span>{String(activeMoment.id).padStart(2, "0")} / {String(momentCount).padStart(2, "0")}</span>
                  <button type="button" onClick={() => openMomentViewer(activeMoment.id)} aria-label="영상 크게 재생">▶</button>
                </div>
                <article>
                  <p>{activeMoment.date} · {activeMoment.emotion}</p>
                  <h2>{activeMoment.title}</h2>
                  <blockquote>{activeMoment.memo}</blockquote>
                  <span>이 순간으로 이어진 길 · {activeMoment.relation}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveId(activeMoment.id === 1 ? momentCount : activeMoment.id - 1)}
                    >
                      ← 이전 순간
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveId(activeMoment.id === momentCount ? 1 : activeMoment.id + 1)}
                    >
                      다음 순간 →
                    </button>
                  </div>
                </article>
              </div>
            )}

            {mode === "album" && (
              <div className="album-view">
                <header>
                  <div>
                    <p>LOVE TREE PHOTO ALBUM</p>
                    <h2>{treeName}의 장면들</h2>
                  </div>
                  <span>메모보다 사진과 영상을 크게 모아보는 감상 보드예요.</span>
                </header>
                <div className="album-grid">
                  {moments.map((moment, index) => (
                    <button
                      className={`album-photo-tile album-photo-tile-${(index % 5) + 1} ${activeMoment.id === moment.id ? "active" : ""} ${newMomentId === moment.id ? "new" : ""}`}
                      type="button"
                      key={moment.id}
                      onClick={() => openMomentViewer(moment.id)}
                    >
                      <span className="album-photo-image">
                        <Image src={moment.image} alt="" fill sizes="(max-width: 900px) 45vw, 260px" />
                        <b>{String(index + 1).padStart(2, "0")}</b>
                        <i aria-hidden="true">▶</i>
                      </span>
                      <span className="album-photo-caption">
                        <strong>{moment.title}</strong>
                        <small>{moment.date} · {moment.emotion}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="workspace-editor">
          {mode === "diary" ? (
            <section className="diary-composer-copy">
              <p>지금 이어가는 순간 ♡</p>
              <h2>오늘의 마음을<br />한 장 더 붙여볼까요?</h2>
              <span>영상 링크와 감상 한 줄만 있으면 충분해요. 짧은 메모도 다이어리의 한 페이지가 됩니다.</span>
            </section>
          ) : (
            <>
              <section className="editor-summary">
                <div>
                  <p>지금 선택한 순간</p>
                  <h2>{activeMoment.title}</h2>
                </div>
                <span>{String(activeMoment.id).padStart(2, "0")}</span>
              </section>
              <div className="editor-stats">
                <span><strong>{momentCount}</strong> 이어진 순간</span>
                <span><strong>{Math.max(0, momentCount - 2)}</strong> 피어난 꽃</span>
                <span><strong>{momentCount >= 6 ? 1 : 0}</strong> 맺힌 열매</span>
              </div>
              <article className="selected-moment-preview">
                <span><Image src={activeMoment.image} alt="" fill sizes="92px" /></span>
                <div><small>{activeMoment.emotion} · {activeMoment.date}</small><p>{activeMoment.memo}</p></div>
              </article>
            </>
          )}

          <div className="selected-moment-actions">
            <span>
              <strong>{activeMoment.time}</strong>
              {activeMoment.publicMemo ? "공개 메모" : "나만 보는 메모"}
            </span>
            <button
              type="button"
              disabled={momentCount <= 1}
              onClick={() => setPendingDeleteId(activeMoment.id)}
            >
              이 순간 삭제
            </button>
          </div>

          <form className="moment-form" id="moment-form" onSubmit={addMoment}>
            <div className="moment-form-heading">
              <div>
                <small>{mode === "diary" ? "NEW DIARY PAGE" : `branch ${String(momentCount + 1).padStart(2, "0")}`}</small>
                <h3>{mode === "diary" ? "이 순간 남기기" : "다음 순간 이어보기"}</h3>
              </div>
              <span aria-hidden="true">❧</span>
            </div>
            {mode === "diary" && (
              <div className="diary-entry-tabs" aria-label="기록 종류 선택">
                <button className={entryKind === "video" ? "active" : ""} type="button" onClick={() => setEntryKind("video")}>▣ 영상으로 남기기</button>
                <button className={entryKind === "note" ? "active" : ""} type="button" onClick={() => setEntryKind("note")}>✎ 글로 남기기</button>
              </div>
            )}
            {(mode !== "diary" || entryKind === "video") && (
              <>
                <label>
                  영상 또는 사진 링크
                  <input
                    id="moment-video-url"
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    required={mode !== "diary" || entryKind === "video"}
                  />
                </label>
                <div
                  className={`moment-link-preview ${previewVideoId ? "ready" : ""}`}
                  style={previewVideoId ? { backgroundImage: `url(https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg)` } : undefined}
                >
                  {previewVideoId ? <><span aria-hidden="true">▶</span><small>새 영상 미리보기</small></> : "링크를 붙여넣으면 영상이 바로 보여요."}
                </div>
              </>
            )}
            <label className="diary-entry-title">
              순간의 제목
              <input
                id="moment-entry-title"
                type="text"
                value={entryTitle}
                maxLength={32}
                onChange={(event) => setEntryTitle(event.target.value)}
                placeholder={entryKind === "video" ? "예: 다시 듣게 된 노래" : "예: 오늘 오래 남은 한 문장"}
              />
            </label>
            <div className="moment-fields">
              <label>
                기억할 시각
                <span className="time-stepper">
                  <button type="button" onClick={() => adjustEntryTime(-5)} aria-label="기억할 시각 5초 줄이기">−5초</button>
                  <input
                    id="moment-entry-time"
                    type="text"
                    value={entryTime}
                    inputMode="numeric"
                    onChange={(event) => setEntryTime(event.target.value)}
                    aria-label="기억할 시각 분 초"
                  />
                  <button type="button" onClick={() => adjustEntryTime(5)} aria-label="기억할 시각 5초 늘리기">＋5초</button>
                </span>
              </label>
              <label>
                기록 날짜
                <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
              </label>
            </div>
            <fieldset>
              <legend>왜 이 순간으로 이어졌나요?</legend>
              <div className="choice-chips">
                {["첫 발견", "댓글 따라감", "팬의 추천", "다른 모습", "직접 검색"].map((item) => (
                  <button
                    className={relation === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => setRelation(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>그때 가장 가까웠던 감정</legend>
              <div className="choice-chips emotion-chips">
                {["설렘", "귀여움", "섹시함", "위로", "벅참", "여운", "추억"].map((item) => (
                  <button
                    className={!customEmotion && emotion === item ? "active" : ""}
                    type="button"
                    key={item}
                    onClick={() => {
                      setEmotion(item);
                      setCustomEmotion("");
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label className="custom-emotion">
                <span>다른 마음</span>
                <input
                  type="text"
                  value={customEmotion}
                  maxLength={10}
                  onChange={(event) => setCustomEmotion(event.target.value)}
                  placeholder="직접 적기"
                />
              </label>
            </fieldset>
            <label>
              이 순간에 남기고 싶은 마음
              <textarea
                value={memo}
                maxLength={140}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="그 장면이 특별했던 이유를 짧게 남겨보세요."
              />
              <small>{memo.length} / 140</small>
            </label>
            <div className="memory-visibility">
              <button
                className={publicMemo ? "active" : ""}
                type="button"
                role="switch"
                aria-checked={publicMemo}
                onClick={() => setPublicMemo((current) => !current)}
              >
                <i aria-hidden="true" />
              </button>
              <span>
                <strong>{publicMemo ? "공개할 때 이 메모도 함께 보여요" : "공개할 때 이 메모는 나만 보여요"}</strong>
                나중에 언제든 바꿀 수 있어요.
              </span>
            </div>
            {(mode !== "diary" || entryKind === "video") && (
              <section className={`next-connection-preview ${previewVideoId ? "ready" : ""}`} aria-label="두 장면 연결 미리보기">
                <article>
                  <span><Image src={activeMoment.image} alt="" fill sizes="76px" /></span>
                  <small>지금 장면</small>
                  <strong>{activeMoment.title}</strong>
                  <em>{activeMoment.time}</em>
                </article>
                <div aria-hidden="true">
                  <i />
                  <b>{relation}</b>
                  <span>→</span>
                </div>
                <article>
                  <span
                    className="next-preview-image"
                    style={previewVideoId ? { backgroundImage: `url(https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg)` } : undefined}
                  >
                    {previewVideoId ? "▶" : "✦"}
                  </span>
                  <small>다음 장면</small>
                  <strong>{entryTitle.trim() || "링크로 찾은 새 순간"}</strong>
                  <em>{entryTime}</em>
                </article>
              </section>
            )}
            <button className="moment-submit" type="submit">
              {mode === "diary"
                ? "이 순간 다이어리에 붙이기"
                : momentCount === 1
                  ? "두 순간을 가지로 잇기"
                  : "새 가지를 피워내기"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </aside>
      </main>

      {flowExpanded && (
        <div className="flow-expanded" role="dialog" aria-modal="true" aria-label="성장 트리 전체 화면">
          <section className="flow-expanded-shell">
            <header>
              <div>
                <p>GROWING LOVETREE · 빛나는 전체 영상 흐름</p>
                <h2>{treeName}</h2>
              </div>
              <div className="flow-expanded-tools">
                <button
                  className={treeLayout === "radial" ? "active" : ""}
                  type="button"
                  onClick={() => changeTreeLayout("radial")}
                >
                  방사형
                </button>
                <button
                  className={treeLayout === "emotion" ? "active" : ""}
                  type="button"
                  onClick={() => changeTreeLayout("emotion")}
                >
                  감정별
                </button>
                <button type="button" onClick={() => setZoom(Math.max(18, zoom - 10))}>−</button>
                <span>{zoom}%</span>
                <button type="button" onClick={() => setZoom(Math.min(160, zoom + 10))}>＋</button>
                <button type="button" onClick={() => fitTree("expanded-flow-viewport")}>한눈에</button>
                <button type="button" onClick={() => centerTree("expanded-flow-viewport")}>중앙</button>
                <button className="flow-expanded-close" type="button" onClick={() => setFlowExpanded(false)}>×</button>
              </div>
            </header>
            <div className="flow-expanded-body">
              <div className="flow-expanded-viewport" id="expanded-flow-viewport">
                <div
                  className="flow-canvas-space"
                  style={{ width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100 }}
                >
                  <div
                    className="flow-canvas-scale"
                    style={{ width: canvasSize.width, height: canvasSize.height, transform: `scale(${zoom / 100})` }}
                  >
                    <FlowCanvas
                      moments={moments}
                      treeName={treeName}
                      layout={treeLayout}
                      activeId={activeMoment.id}
                      newId={newMomentId}
                      positions={flowPositions}
                      onSelect={setActiveId}
                      onOpen={openMomentViewer}
                      onMove={moveFlowNode}
                      onMoveEnd={() => setNotice("전체 화면에서도 카드 위치가 그대로 저장됐어요.")}
                      onAdd={() => document.getElementById("flow-full-url")?.focus()}
                      onDelete={setPendingDeleteId}
                    />
                  </div>
                </div>
              </div>
              <aside className="flow-full-drawer">
                <p>전체 화면에서도 이어보기</p>
                <h3>새 영상과 마음을<br />바로 연결해보세요.</h3>
                <article>
                  <span><Image src={activeMoment.image} alt="" fill sizes="82px" /></span>
                  <div><small>지금 선택한 순간</small><strong>{activeMoment.memo}</strong></div>
                </article>
                <form onSubmit={addMoment}>
                  <label>
                    영상 링크
                    <input
                      id="flow-full-url"
                      type="url"
                      value={videoUrl}
                      onChange={(event) => setVideoUrl(event.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      required
                    />
                  </label>
                  <fieldset>
                    <legend>이어진 이유</legend>
                    <div className="choice-chips">
                      {["댓글 따라감", "팬의 추천", "다른 모습", "같은 무대", "직접 검색"].map((item) => (
                        <button
                          className={relation === item ? "active" : ""}
                          type="button"
                          key={item}
                          onClick={() => setRelation(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    한줄 감상
                    <textarea
                      value={memo}
                      maxLength={140}
                      onChange={(event) => setMemo(event.target.value)}
                      placeholder="이 순간에 남기고 싶은 마음"
                    />
                  </label>
                  <button className="moment-submit" type="submit">새 가지 이어 붙이기 →</button>
                </form>
                <small>추가하면 새 카드와 연결선, 꽃과 하트가 서로 다른 색으로 반짝이며 바로 표시돼요.</small>
              </aside>
            </div>
          </section>
        </div>
      )}

      {viewerMoment && (
        <div
          className="moment-viewer-backdrop"
          role="presentation"
          onWheel={(event) => {
            if (Math.abs(event.deltaY) < 35) return;
            moveViewer(event.deltaY > 0 ? 1 : -1);
          }}
        >
          <section className="moment-viewer" role="dialog" aria-modal="true" aria-label={`${viewerMoment.title} 영상 집중 보기`}>
            <header>
              <div>
                <p>FOCUS MOMENT · {String(viewerIndex + 1).padStart(2, "0")} / {String(momentCount).padStart(2, "0")}</p>
                <h2>{viewerMoment.title}</h2>
              </div>
              <button type="button" onClick={() => setViewerMomentId(null)} aria-label="영상 집중 보기 닫기">×</button>
            </header>
            <div className="moment-viewer-body">
              <div className="moment-viewer-player">
                {youtubeId(viewerMoment.sourceUrl ?? "") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId(viewerMoment.sourceUrl ?? "")}?autoplay=1&rel=0`}
                    title={viewerMoment.title}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <Image src={viewerMoment.image} alt="" fill sizes="(max-width: 900px) 100vw, 950px" />
                    <span aria-hidden="true">▶</span>
                    <small>연결한 영상 링크가 있으면 이 자리에서 바로 재생돼요.</small>
                  </>
                )}
              </div>
              <aside>
                <span className="moment-viewer-emotion">{viewerMoment.emotion}</span>
                <blockquote>{viewerMoment.memo}</blockquote>
                <p>{viewerMoment.date} · {viewerMoment.time} · {viewerMoment.relation}</p>
                <div className="moment-viewer-nav">
                  <button type="button" onClick={() => moveViewer(-1)}>
                    <b>↑</b><span>이전 영상</span>
                  </button>
                  <button type="button" onClick={() => moveViewer(1)}>
                    <b>↓</b><span>다음 영상</span>
                  </button>
                </div>
                {nextViewerMoment && (
                  <article>
                    <small>NEXT MOMENT</small>
                    <strong>{nextViewerMoment.title}</strong>
                    <span>아래 방향키나 마우스 휠로 바로 넘겨보세요.</span>
                  </article>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}

      {pendingDeleteId !== null && (
        <div className="delete-confirm-backdrop" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-moment-title">
            <span aria-hidden="true">✿</span>
            <p>REMOVE THIS MOMENT</p>
            <h2 id="delete-moment-title">이 순간을 트리에서<br />정말 떼어낼까요?</h2>
            <strong>“{moments.find((moment) => moment.id === pendingDeleteId)?.title}”</strong>
            <small>카드와 마음 일기가 함께 사라지고, 남은 가지는 순서에 맞춰 다시 이어집니다.</small>
            <div>
              <button type="button" onClick={() => setPendingDeleteId(null)}>그대로 둘게요</button>
              <button type="button" onClick={deleteMoment}>삭제하고 가지 정리하기</button>
            </div>
          </section>
        </div>
      )}

      <div className="workspace-toast" role="status">
        <span aria-hidden="true">✦</span>
        {notice}
      </div>
    </div>
  );
}

function Community({
  onHome,
  onStart,
}: {
  onHome: () => void;
  onStart: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [sort, setSort] = useState<"popular" | "recent" | "moments">("popular");
  const [favorites, setFavorites] = useState<number[]>([0]);
  const [likedMoments, setLikedMoments] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [activeMomentId, setActiveMomentId] = useState(1);

  const selectedTree = communityTrees[selectedIndex];
  const publicMoments = sampleMoments.slice(0, selectedTree.count);
  const activeMoment = publicMoments.find((moment) => moment.id === activeMomentId) ?? publicMoments[0];
  const filteredTrees = communityTrees
    .filter((tree) => {
      const matchesQuery = `${tree.title} ${tree.artist} ${tree.owner} ${tree.fandom} ${tree.emotion}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (filter === "전체" || tree.emotion === filter);
    })
    .sort((left, right) => {
      if (sort === "recent") return right.published.localeCompare(left.published);
      if (sort === "moments") return right.count - left.count;
      return right.likes - left.likes;
    });

  function selectTree(tree: (typeof communityTrees)[number]) {
    const index = communityTrees.indexOf(tree);
    setSelectedIndex(index);
    setActiveMomentId(1);
  }

  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);

  return (
    <div className="community-shell">
      <header className="community-topbar">
        <Brand onHome={onHome} />
        <nav aria-label="주요 메뉴">
          <button type="button" onClick={onHome}>첫 화면</button>
          <button type="button" onClick={onHome}>LoveTree 소개 보기</button>
          <button className="active" type="button">둘러보기</button>
          <button type="button" onClick={onStart}>내 러브트리 시작하기</button>
        </nav>
        <button className="community-profile" type="button">
          <span aria-hidden="true">봄</span> 오늘도 빛나는 하루 ⌄
        </button>
      </header>

      <main className="community-layout">
        <section className="community-list" aria-labelledby="community-title">
          <div className="community-intro">
            <p>공개 러브트리 둘러보기 ❧</p>
            <h1 id="community-title">마음이 머무는 <em>순간들을</em><br />천천히 감상해보세요</h1>
            <span>다른 팬들이 이어간 첫 순간과 감정의 흐름을 둘러보고, 마음이 닿는 트리를 만나보세요.</span>
            <mark className="community-owner-guide">팬 닉네임과 아티스트 이름을 함께 표시해 누구의 팬트리인지 바로 알 수 있어요.</mark>
          </div>
          <div className="community-controls">
            <label>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="인물, 트리 제목, 감정으로 찾아보세요"
              />
            </label>
            <div>
              {["전체", "응원", "추억", "벅참", "위로"].map((item) => (
                <button
                  className={filter === item ? "active" : ""}
                  type="button"
                  key={item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="community-sort">
              <span>정렬</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="popular">인기순</option>
                <option value="recent">최근 공개순</option>
                <option value="moments">순간 많은순</option>
              </select>
            </label>
          </div>
          <div className="community-grid">
            {filteredTrees.map((tree) => {
              const index = communityTrees.indexOf(tree);
              return (
                <article className={selectedIndex === index ? "active" : ""} key={tree.title}>
                  <button className="community-card-main" type="button" onClick={() => selectTree(tree)}>
                    <span className="community-card-photo">
                      <Image src={tree.image} alt="" fill sizes="150px" />
                      <b>{tree.artist}</b>
                    </span>
                    <span className="community-card-copy">
                      <span className="community-owner-line">
                        <i aria-hidden="true">{tree.owner.slice(0, 1)}</i>
                        <span><b>{tree.owner}</b><small>{tree.fandom}</small></span>
                      </span>
                      <em>{tree.artist}</em>
                      <strong>{tree.title}</strong>
                      <small>순간 {tree.count}개 · {tree.emotion} · ♡ {tree.likes.toLocaleString()}</small>
                    </span>
                  </button>
                  <button
                    className={favorites.includes(index) ? "favorite active" : "favorite"}
                    type="button"
                    aria-label={`${tree.title} 좋아요`}
                    aria-pressed={favorites.includes(index)}
                    onClick={() => setFavorites((current) => (
                      current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
                    ))}
                  >
                    ♥
                  </button>
                </article>
              );
            })}
            {filteredTrees.length === 0 && (
              <p className="community-empty">마음에 맞는 트리를 찾지 못했어요. 검색어나 감정 필터를 바꿔보세요.</p>
            )}
          </div>
          <button className="community-more" type="button">더 많은 공개 러브트리 보기 ⌄</button>
        </section>

        <aside className="community-preview">
          <article className="community-book">
            <header>
              <p>❧ 이 러브트리에 담긴 마음</p>
              <div className="community-tree-owner">
                <i aria-hidden="true">{selectedTree.owner.slice(0, 1)}</i>
                <span><strong>{selectedTree.owner}</strong><small>{selectedTree.fandom}</small></span>
                <em>{selectedTree.artist}</em>
              </div>
              <h2>{selectedTree.title}</h2>
              <span>{selectedTree.description}</span>
            </header>
            <div className="community-collage">
              <span className="community-collage-branch" aria-hidden="true" />
              <article className="community-paper community-hero-paper">
                <b>01</b>
                <span><Image src={publicMoments[0].image} alt="" fill sizes="260px" /></span>
                <strong>{publicMoments[0].title}</strong>
                <small>{publicMoments[0].memo}</small>
              </article>
              <article className="community-paper community-note-paper">
                <b>03</b>
                <p>그날의 떨림이<br />지금의 나를<br />따뜻하게 만들어줘서<br />고마워. ♡</p>
              </article>
              <article className="community-paper community-small-paper">
                <b>02</b>
                <span><Image src={publicMoments[1].image} alt="" fill sizes="190px" /></span>
                <strong>{publicMoments[1].title}</strong>
              </article>
              <article className="community-paper community-memory-paper">
                <b>04</b>
                <strong>오래 남은 마음</strong>
                <p>{publicMoments[Math.min(3, publicMoments.length - 1)].memo}</p>
              </article>
            </div>
            <footer>
              <div><span>대표 순간</span><strong>{selectedTree.count}개</strong><small>♡ {selectedTree.likes.toLocaleString()} · 댓글 {selectedTree.comments}</small></div>
              <div><span>이어진 감정</span><p>♡ 설렘　☾ 위로　✦ {selectedTree.emotion}</p></div>
            </footer>
            <button className="community-open-tree" type="button" onClick={() => setExpanded(true)}>
              전체 러브트리 펼쳐보기 ✣
            </button>
          </article>
          <p className="community-hint">
            <span><strong>왼쪽 카드를 눌러</strong> 다른 트리를 미리 볼 수 있어요.</span>
            <span>펼쳐보기에서는 모든 순간과 이어진 이유를 함께 볼 수 있어요.</span>
          </p>
        </aside>
      </main>

      {expanded && (
        <div className="public-tree-expanded" role="dialog" aria-modal="true" aria-label="공개 러브트리 전체 보기">
          <section>
            <header>
              <div>
                <p>PUBLIC LOVE TREE · {selectedTree.artist}</p>
                <h2>{selectedTree.title}</h2>
                <span className="public-tree-owner"><b>{selectedTree.owner}</b> 님의 트리 · {selectedTree.fandom} · {selectedTree.count} moments</span>
              </div>
              <button type="button" onClick={() => setExpanded(false)} aria-label="펼쳐보기 닫기">×</button>
            </header>
            <div className="public-tree-body">
              <div className="public-tree-canvas">
                <FlowCanvas
                  moments={publicMoments}
                  treeName={selectedTree.title}
                  activeId={activeMoment.id}
                  newId={0}
                  positions={initialFlowPositions}
                  onSelect={setActiveMomentId}
                  likedIds={publicMoments
                    .filter((moment) => likedMoments.includes(`${selectedIndex}-${moment.id}`))
                    .map((moment) => moment.id)}
                  onLike={(id) => {
                    const key = `${selectedIndex}-${id}`;
                    setLikedMoments((current) => (
                      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                    ));
                  }}
                  readOnly
                />
              </div>
              <aside>
                <p>{String(activeMoment.id).padStart(2, "0")} · {activeMoment.emotion}</p>
                <h3>{activeMoment.title}</h3>
                <article>
                  <strong>이 순간에 남긴 마음</strong>
                  <span>{activeMoment.memo}</span>
                </article>
                <article>
                  <strong>이어진 이유</strong>
                  <span>{activeMoment.relation}</span>
                </article>
                <article>
                  <strong>이 순간에 달린 반응</strong>
                  <span className="public-moment-like">
                    {likedMoments.includes(`${selectedIndex}-${activeMoment.id}`) ? "♥ 내가 좋아한 순간" : "♡ 영상 카드의 하트를 눌러 좋아요"}
                  </span>
                  <span>“이 장면을 나도 오래 기억하고 있어요.”</span>
                  <span>“다음 순간으로 이어진 길이 정말 다정해요.”</span>
                </article>
                <button type="button" onClick={onStart}>나도 러브트리 시작하기 →</button>
              </aside>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<"home" | "builder" | "workspace" | "community">("home");
  const [treeName, setTreeName] = useState("우리의 빛나는 순간들");
  const [privacy, setPrivacy] = useState<PrivacyChoice>("private");
  const [selectedFormat, setSelectedFormat] = useState<ViewMode>("tree");
  const [savedTree, setSavedTree] = useState("");
  const [seedUrl, setSeedUrl] = useState("");
  const [seedDate] = useState("2026-07-31");
  const [initialSeed, setInitialSeed] = useState<Moment | null>(null);
  const seedEmotion = "설렘";
  const seedVideoId = youtubeId(seedUrl);

  useEffect(() => {
    const returnHomeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view === "builder") setView("home");
    };
    window.addEventListener("keydown", returnHomeOnEscape);
    return () => window.removeEventListener("keydown", returnHomeOnEscape);
  }, [view]);

  function createTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = treeName.trim();
    const nextUrl = seedUrl.trim();
    if (!nextName || !nextUrl) return;
    setInitialSeed({
      ...sampleMoments[0],
      id: 1,
      title: "처음 마음이 멈춘 장면",
      memo: "처음 발견한 영상에서 러브트리가 시작됐어요.",
      emotion: seedEmotion,
      date: seedDate.replaceAll("-", "."),
      sourceUrl: nextUrl,
      publicMemo: privacy === "public",
    });
    setSavedTree(nextName);
    setView("workspace");
  }

  if (view === "workspace") {
    return (
      <Workspace
        treeName={treeName}
        initialMode={selectedFormat}
        initialSeed={initialSeed}
        onHome={() => setView("home")}
        onEdit={() => setView("builder")}
      />
    );
  }

  if (view === "community") {
    return <Community onHome={() => setView("home")} onStart={() => setView("builder")} />;
  }

  if (view === "builder") {
    return (
      <div className="builder-shell">
        <span className="builder-petal builder-petal-one" aria-hidden="true" />
        <span className="builder-petal builder-petal-two" aria-hidden="true" />
        <span className="builder-petal builder-petal-three" aria-hidden="true" />

        <header className="builder-topbar">
          <Brand onHome={() => setView("home")} />
          <nav className="builder-nav" aria-label="주요 메뉴">
            <button type="button" onClick={() => setView("home")}>첫 화면</button>
            <a href="#builder-preview">LoveTree 소개 보기</a>
            <button type="button" onClick={() => setView("community")}>둘러보기</button>
            <a className="active" href="#builder-form">내 러브트리 시작하기</a>
          </nav>
          <button className="builder-profile" type="button" aria-label="프로필 메뉴">
            <span className="profile-avatar" aria-hidden="true">봄</span>
            <span>오늘도 빛나는 하루</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </header>

        <main className="builder-main">
          <section className="builder-left" aria-labelledby="builder-title">
            <div className="builder-heading">
              <p className="builder-overline"><span aria-hidden="true">✿</span> 영상 하나로 바로 시작하기</p>
              <h1 id="builder-title">
                좋아하는 영상 하나를
                <br />
                첫 <em>러브트리</em>로 심어보세요
              </h1>
              <p>
                제목을 정하고 영상 링크를 붙여넣으면 바로 첫 순간이 만들어져요.
                <br />
                감정 메모와 다음 영상은 트리를 만든 뒤 천천히 이어가면 됩니다.
              </p>
            </div>

            <form className="builder-form" id="builder-form" onSubmit={createTree}>
              <label className="builder-label" htmlFor="builder-tree-name">
                <span aria-hidden="true">✿</span> 러브트리 제목
              </label>
              <input
                id="builder-tree-name"
                value={treeName}
                onChange={(event) => setTreeName(event.target.value)}
                placeholder="예: 보랏빛으로 남은 순간들"
                maxLength={32}
                required
              />
              <div className="name-examples" aria-label="제목 예시">
                <span>예: 우리가 사랑한 계절</span>
                <i aria-hidden="true" />
                <span>예: 오래 곁에 남은 문장들</span>
              </div>

              <section className="seed-builder" aria-labelledby="seed-builder-title">
                <div className="seed-builder-heading">
                  <div>
                    <span>STEP 01 · FIRST VIDEO</span>
                    <h2 id="seed-builder-title">영상 링크를 붙여넣어 주세요</h2>
                  </div>
                  <small>유튜브 링크를 넣으면 오른쪽에 바로 미리 보여요</small>
                </div>
                <div className="seed-builder-grid">
                  <div className="seed-builder-fields">
                    <label>
                      첫 영상 링크
                      <input
                        type="url"
                        value={seedUrl}
                        onChange={(event) => setSeedUrl(event.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        required
                      />
                    </label>
                    <p className="seed-builder-help">
                      링크만 있으면 충분해요. 영상 제목, 감정, 기억할 시각은 트리를 만든 다음 화면에서 더 자세히 적을 수 있어요.
                    </p>
                  </div>
                  <div
                    className={`seed-live-preview ${seedVideoId ? "ready" : ""}`}
                    style={seedVideoId ? { backgroundImage: `url(https://img.youtube.com/vi/${seedVideoId}/hqdefault.jpg)` } : undefined}
                  >
                    <span>{seedVideoId ? "▶" : "✦"}</span>
                    <div>
                      <small>YOUR FIRST SEED</small>
                      <strong>{seedVideoId ? "첫 순간으로 연결할 영상" : "링크를 넣으면 첫 카드가 보여요"}</strong>
                      <p>{seedVideoId ? "이 영상이 내 러브트리의 첫 뿌리가 됩니다." : "좋아하는 영상 링크를 먼저 붙여넣어 주세요."}</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="privacy-block">
                <span className="builder-label"><span aria-hidden="true">✿</span> 공개 범위</span>
                <div className="privacy-options" role="radiogroup" aria-label="공개 범위 선택">
                  <button
                    className={privacy === "private" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "private"}
                    onClick={() => setPrivacy("private")}
                  >
                    <span aria-hidden="true">♙</span>
                    <strong>비공개로 시작하기</strong>
                    <small>나만 볼 수 있어요</small>
                    {privacy === "private" && <b aria-hidden="true">✓</b>}
                  </button>
                  <button
                    className={privacy === "later" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "later"}
                    onClick={() => setPrivacy("later")}
                  >
                    <span aria-hidden="true">❧</span>
                    <strong>나중에 공개할게요</strong>
                    <small>준비되면 열어볼게요</small>
                    {privacy === "later" && <b aria-hidden="true">✓</b>}
                  </button>
                  <button
                    className={privacy === "public" ? "selected" : ""}
                    type="button"
                    role="radio"
                    aria-checked={privacy === "public"}
                    onClick={() => setPrivacy("public")}
                  >
                    <span aria-hidden="true">◎</span>
                    <strong>공개 러브트리로 이어가기</strong>
                    <small>다른 사람과 나눌 수 있어요</small>
                    {privacy === "public" && <b aria-hidden="true">✓</b>}
                  </button>
                </div>
                <p className="privacy-hint">
                  <span aria-hidden="true">✣</span> 처음에는 비공개로 시작해도 괜찮아요. 천천히 쌓인 뒤에 공개해도 늦지 않아요.
                </p>
              </div>

              <div className="format-block">
                <div className="format-label">
                  <span className="builder-label"><span aria-hidden="true">✿</span> 처음 보여줄 방식</span>
                  <small>나중에 언제든 바꿀 수 있어요</small>
                </div>
                <div className="format-options" role="radiogroup" aria-label="러브트리 보기 방식 선택">
                  {viewModes.map((item) => (
                    <button
                      className={selectedFormat === item.id ? "selected" : ""}
                      type="button"
                      role="radio"
                      aria-checked={selectedFormat === item.id}
                      key={item.id}
                      onClick={() => setSelectedFormat(item.id)}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <strong>{item.label}</strong>
                      <small>{item.caption}</small>
                      {selectedFormat === item.id && <b aria-hidden="true">✓</b>}
                    </button>
                  ))}
                </div>
                <p className="format-hint">
                  첫 사진, 두 장면, 여러 장면은 선택한 보기 안에서 트리가 자라는 단계로 이어져요.
                </p>
              </div>

              <div className="builder-actions">
                <button className="builder-submit" type="submit">
                  이 영상으로 내 트리 만들기 <span aria-hidden="true">✣</span>
                </button>
                <button className="builder-browse" type="button" onClick={() => setView("community")}>
                  공개 트리 먼저 둘러보기
                </button>
              </div>
              <p className="builder-form-note"><span aria-hidden="true">❧</span> 공개 범위와 보기 방식은 트리를 만든 뒤에도 언제든 바꿀 수 있어요.</p>
            </form>
          </section>

          <section className="builder-right" aria-label="첫 러브트리 미리보기">
            <div className="builder-vine" aria-hidden="true">
              <i className="vine-main" />
              <i className="vine-top" />
              <i className="vine-bottom" />
              <b className="vine-leaf leaf-a" />
              <b className="vine-leaf leaf-b" />
              <b className="vine-leaf leaf-c" />
              <b className="vine-leaf leaf-d" />
            </div>

            <article className="start-note">
              <span className="builder-tag">시작</span>
              <p>이 마음의<br />시작을<br />남겨둘게.</p>
              <span aria-hidden="true">♡</span>
            </article>

            <article className="first-polaroid">
              <span className="paper-tape tape-left" aria-hidden="true" />
              <span className="paper-tape tape-right" aria-hidden="true" />
              <div
                className={`empty-photo ${seedVideoId ? "seed-ready" : ""}`}
                style={seedVideoId ? { backgroundImage: `url(https://img.youtube.com/vi/${seedVideoId}/hqdefault.jpg)` } : undefined}
              >
                <span aria-hidden="true">{seedVideoId ? "▶" : "✿"}</span>
                <p>{seedVideoId ? "첫 순간 미리보기" : "첫 순간을 기다리는 중"}</p>
              </div>
              <strong>{seedVideoId ? seedEmotion : "첫 순간"}</strong>
            </article>

            <article className="small-note">
              <span className="builder-tag">순간</span>
              <span className="paper-clip" aria-hidden="true">∩</span>
              <p>작은 순간<br />하나로도<br />충분해. ♡</p>
            </article>

            <article className="memory-polaroid">
              <span className="paper-tape" aria-hidden="true" />
              <div className="memory-photo">
                <Image src="/moment-spring.jpg" alt="분홍빛 노을과 봄꽃이 어우러진 첫 순간" fill sizes="190px" priority />
              </div>
              <p>처음의 설렘이<br />오래 머물 수 있도록. ♡</p>
            </article>

            <article className="pressed-memory">
              <span className="builder-tag">기억</span>
              <span className="pressed-stem" aria-hidden="true">✿</span>
              <span className="paper-tape" aria-hidden="true" />
            </article>

            <span className="builder-tag feeling-tag">감정</span>
            <span className="builder-wax" aria-hidden="true">❦</span>

            <article className="growth-card">
              <div>
                <p className="builder-overline"><span aria-hidden="true">✿</span> 이렇게 자라날 수 있어요.</p>
                <strong>당신만의 감정과 기억들이<br />하나의 가지가 되어,<br />아름다운 이야기를 완성해요.</strong>
                <button type="button" onClick={() => setView("community")}>예시 트리 둘러보기 <span aria-hidden="true">→</span></button>
              </div>
              <div className="mini-tree" aria-hidden="true">
                <i />
                <span className="mini-card mini-one"><Image src="/moment-purple.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-two"><Image src="/moment-stage.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-three"><Image src="/moment-spring.jpg" alt="" fill sizes="60px" /></span>
                <span className="mini-card mini-four"><Image src="/moment-friends.jpg" alt="" fill sizes="60px" /></span>
              </div>
            </article>
          </section>

          <section className="builder-preview-strip" id="builder-preview" aria-label="러브트리가 자라는 모습">
            <div className="builder-preview-copy">
              <span>AFTER YOUR FIRST VIDEO</span>
              <h2>첫 영상 다음은<br />천천히 이어가면 돼요</h2>
              <p>트리를 만든 뒤 감정 메모를 쓰고, 다음 영상을 한 장씩 연결해 보세요.</p>
            </div>
            {[
              { image: "/moment-purple.jpg", step: "01", title: "첫 영상을 심어요" },
              { image: "/moment-stage.jpg", step: "02", title: "마음을 한 줄 남겨요" },
              { image: "/moment-friends.jpg", step: "03", title: "다음 영상으로 이어가요" },
            ].map((item) => (
              <article className="builder-preview-card" key={item.step}>
                <div>
                  <Image src={item.image} alt="" fill sizes="220px" />
                  <span>{item.step}</span>
                </div>
                <strong>{item.title}</strong>
              </article>
            ))}
          </section>
        </main>

        {savedTree && (
          <div className="toast" role="status">
            <span>✿</span> ‘{savedTree}’ 러브트리를 만들었어요. 이제 첫 순간을 남겨보세요.
            <button type="button" onClick={() => setSavedTree("")} aria-label="알림 닫기">×</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="site-shell">
      <span className="petal petal-one" aria-hidden="true" />
      <span className="petal petal-two" aria-hidden="true" />
      <span className="petal petal-three" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="러브트리 홈">
          <span className="brand-tree" aria-hidden="true">
            <i />
            <b />
            <em />
          </span>
          <span className="brand-copy">
            <strong>러브트리</strong>
            <small>LoveTree</small>
          </span>
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          <button type="button" onClick={() => setView("community")}>둘러보기</button>
          <a href="#features">내 트리</a>
          <button className="login-button" type="button" onClick={() => setView("builder")}>
            로그인
          </button>
          <button className="nav-start" type="button" onClick={() => setView("builder")}>
            시작하기
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true">✿</span> 마음이 머문 곳에서 시작되는 이야기
            </p>
            <h1 id="hero-title">
              좋아하는 순간을,
              <br />
              <em>러브트리</em>로 키워보세요
            </h1>
            <p className="hero-description">
              사랑한 장면과 노래, 기억과 감정을 차곡차곡 모아 두면,
              <br />
              서로의 결이 이어져 하나의 트리로 자라납니다.
              <br />
              러브트리는 마음속 순간들을 오래 간직하고 천천히 돌볼 수 있는
              <br />
              나만의 감정 정원입니다.
            </p>

            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => setView("builder")}>
                내 트리 시작하기 <span aria-hidden="true">✣</span>
              </button>
              <button className="button button-secondary" type="button" onClick={() => setView("community")}>
                공개 트리 둘러보기 <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="hero-collage" aria-label="러브트리에 담긴 추억 카드 미리보기">
            <span className="collage-glow" aria-hidden="true" />
            <span className="thread thread-one" aria-hidden="true" />
            <span className="thread thread-two" aria-hidden="true" />

            <article className="polaroid polaroid-friends">
              <span className="label label-blush">감정</span>
              <div className="photo-frame">
                <Image src="/moment-friends.jpg" alt="함께 웃고 있는 친구들의 뒷모습" fill sizes="180px" priority />
              </div>
              <p>심장이 뛰던 그 순간</p>
              <small>2024.04.20</small>
            </article>

            <article className="memo-card">
              <span className="tape" aria-hidden="true" />
              <p className="memo-kicker">오늘의 한 줄 ♡</p>
              <p className="memo-copy">
                그날의 떨림이
                <br />
                지금의 나를
                <br />
                따뜻하게
                <br />
                만들어줘서
                <br />
                고마워.
              </p>
              <span className="pressed-flower" aria-hidden="true">❀</span>
            </article>

            <article className="polaroid polaroid-purple">
              <span className="label label-gold">순간</span>
              <div className="photo-frame">
                <Image src="/moment-purple.jpg" alt="보랏빛 조명과 종이 꽃가루가 펼쳐진 공연장" fill sizes="190px" priority />
              </div>
              <p>빛이 가장 가까웠던 날</p>
              <small>2024.06.15</small>
            </article>

            <article className="note-paper">
              <span className="label label-beige">기억</span>
              <p>
                너의 노래가
                <br />
                내 하루의 위로가
                <br />
                되어줘서
                <br />
                정말 고마워.
              </p>
              <span aria-hidden="true">♬</span>
            </article>

            <article className="music-player" aria-label="기억 속 노래 플레이어">
              <div className="album-art">
                <Image src="/moment-stage.jpg" alt="" fill sizes="54px" />
              </div>
              <div>
                <strong>우리의 계절이 지나도</strong>
                <small>LoveTree 플레이리스트</small>
              </div>
              <button type="button" aria-label="일시 정지">Ⅱ</button>
              <span aria-hidden="true">♡</span>
            </article>

            <article className="polaroid polaroid-stage">
              <span className="label label-sage">호흡</span>
              <div className="photo-frame">
                <Image src="/moment-stage.jpg" alt="함께 환호하는 공연장의 사람들" fill sizes="190px" priority />
              </div>
              <p>우리가 함께한 모든 시간</p>
              <small>2024.08.03</small>
            </article>

            <span className="wax-seal" aria-hidden="true">❦</span>
            <span className="heart-pin" aria-hidden="true">♥</span>
          </div>
        </section>

        <section className="feature-band" id="features" aria-label="러브트리 특징">
          <article>
            <span className="feature-icon feature-gold" aria-hidden="true">☆</span>
            <div>
              <h2>대표 순간</h2>
              <p>좋아하는 장면과 감정을 가장 먼저 남겨요</p>
            </div>
          </article>
          <article>
            <span className="feature-icon feature-rose" aria-hidden="true">♡</span>
            <div>
              <h2>이어진 감정</h2>
              <p>순간과 순간이 감정의 흐름으로 연결돼요</p>
            </div>
          </article>
          <article>
            <span className="feature-icon feature-gold" aria-hidden="true">✣</span>
            <div>
              <h2>나만의 트리</h2>
              <p>좋아하는 기억을 하나의 러브트리로 키워가요</p>
            </div>
          </article>
        </section>

        <section className="tree-gallery" id="trees" aria-labelledby="gallery-title">
          <div className="gallery-intro">
            <p className="eyebrow">PUBLIC LOVE TREES</p>
            <h2 id="gallery-title">마음이 닿은 트리들</h2>
            <p>다른 팬들이 가꾼 따뜻한 트리를 만나보세요.</p>
            <button type="button" onClick={() => setView("community")}>천천히 둘러보기 <span aria-hidden="true">↗</span></button>
          </div>
          <div className="gallery-grid">
            {galleryCards.map((card) => (
              <article className="tree-card" key={card.title}>
                <div className="tree-card-image">
                  <Image src={card.image} alt="" fill sizes="(max-width: 700px) 90vw, 300px" />
                  <span className={`card-flower ${card.tone}`} aria-hidden="true">✦</span>
                </div>
                <div className="tree-card-copy">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <small>♡ {card.stat} &nbsp;&nbsp; ○ {Number(card.stat.replace(",", "")) % 227 + 61}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-tree" aria-hidden="true"><i /><b /><em /></span>
          <span className="brand-copy"><strong>러브트리</strong><small>LoveTree</small></span>
        </a>
        <p>마음이 시작된 순간을 오래 간직하는 법</p>
      </footer>

      {savedTree && (
        <div className="toast" role="status">
          <span>✿</span> ‘{savedTree}’ 트리의 첫 자리를 만들었어요.
          <button type="button" onClick={() => setSavedTree("")} aria-label="알림 닫기">×</button>
        </div>
      )}

    </div>
  );
}
