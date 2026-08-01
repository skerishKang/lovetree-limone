"use client";

import Link from "next/link";
import { useState } from "react";
import type { V3PreviewMemory } from "./v3-types";
import { v3MemoriesByTree } from "./fixtures/v3-fixtures";
import V3FinaleTheme from "./V3FinaleTheme";
import V3AuroraTheme from "./V3AuroraTheme";
import V3CanopyTheme from "./V3CanopyTheme";
import V3BloomTheme from "./V3BloomTheme";

export type V3MilestoneThemeId = "finale" | "aurora" | "canopy" | "bloom";

const THEMES: {
  id: V3MilestoneThemeId;
  title: string;
  description: string;
}[] = [
  {
    id: "finale",
    title: "완성 트리",
    description: "300개의 기억이 모여 한 그루의 러브트리로 완성돼요.",
  },
  {
    id: "aurora",
    title: "오로라 하트",
    description: "하나의 마음이 청록빛 입자로 빛나는 회고 모드예요.",
  },
  {
    id: "canopy",
    title: "무지개 수관",
    description: "감정별로 색이 다른 가지가 피어나는 수관이에요.",
  },
  {
    id: "bloom",
    title: "마음꽃",
    description: "8개의 감정 꽃잎이 한 송이의 마음꽃으로 피어나요.",
  },
];

export default function V3Milestone() {
  const [selectedTheme, setSelectedTheme] = useState<V3MilestoneThemeId>("finale");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const memories: V3PreviewMemory[] = v3MemoriesByTree("demo");
  const milestoneTotal = 300;

  return (
    <div className="v3-milestone">
      <header className="v3-milestone-header">
        <p className="v3-eyebrow">milestone · 300 moments</p>
        <h1>
          <em>300번째 순간</em>을 맞이했어요
        </h1>
        <p>
          쌓인 순간을 하나의 테마로 되감아 보는 축하·회고 화면이에요. 여기서 재생은
          미디어 재생이 아니라 <b>성장 연출 재생</b>입니다.
        </p>
      </header>

      <div className="v3-milestone-themes" role="group" aria-label="회고 테마 선택">
        {THEMES.map((theme) => (
          <button
            className="v3-milestone-theme"
            type="button"
            key={theme.id}
            aria-pressed={selectedTheme === theme.id}
            onClick={() => setSelectedTheme(theme.id)}
          >
            <div className={`v3-theme-visual v3-theme-${theme.id}`} aria-hidden="true">
              {theme.id === "finale" ? "♧" : theme.id === "aurora" ? "♥" : theme.id === "canopy" ? "✽" : "✿"}
            </div>
            <strong>{theme.title}</strong>
            <p>{theme.description}</p>
          </button>
        ))}
      </div>

      <div className="v3-milestone-stage" aria-label={`${THEMES.find((t) => t.id === selectedTheme)?.title} 성장 연출`}>
        {selectedTheme === "finale" && (
          <V3FinaleTheme total={milestoneTotal} memories={memories} />
        )}
        {selectedTheme === "aurora" && <V3AuroraTheme total={milestoneTotal} />}
        {selectedTheme === "canopy" && <V3CanopyTheme total={milestoneTotal} />}
        {selectedTheme === "bloom" && <V3BloomTheme total={milestoneTotal} />}

        <div className="v3-milestone-controls">
          <button
            className="v3-btn v3-btn-icon"
            type="button"
            aria-label={isPlaying ? "성장 연출 일시정지" : "성장 연출 재생"}
            onClick={() => setIsPlaying((value) => !value)}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <div className="v3-milestone-progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </div>
          <span className="v3-milestone-label">
            {selectedTheme === "finale" ? "완성 트리" : THEMES.find((t) => t.id === selectedTheme)?.title} ·{" "}
            {Math.round(progress)}%
          </span>
          <button
            className="v3-btn v3-btn-icon"
            type="button"
            aria-label="처음부터 다시 재생"
            onClick={() => {
              setProgress(0);
              setIsPlaying(true);
            }}
          >
            ↺
          </button>
        </div>
      </div>

      {memories.length > 0 && selectedTheme === "finale" && (
        <div className="v3-milestone-popover" role="dialog" aria-label="마지막 순간">
          <small>MOMENT 300 · {memories[memories.length - 1].recordDate}</small>
          <strong>{memories[memories.length - 1].title}</strong>
          <p>{memories[memories.length - 1].memo ?? "남긴 메모가 없어요."}</p>
          <button
            className="v3-btn v3-btn-quiet"
            type="button"
            onClick={() => setProgress(100)}
          >
            완성 장면 보기
          </button>
        </div>
      )}

      <div className="v3-milestone-back">
        <Link className="v3-btn v3-btn-primary" href="/v3/trees/demo">
          일반 트리로 돌아가기
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="v3-seed-note" style={{ textAlign: "center" }}>
        V3 예시 데이터 · 300개 순간을 가정한 축하 연출이며 실제 저장되지 않아요.
      </p>
    </div>
  );
}
