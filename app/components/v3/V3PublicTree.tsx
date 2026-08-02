"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { V3PreviewTree } from "./v3-types";
import { v3MemoriesByTree, v3TreesById } from "./fixtures/v3-fixtures";
import V3TimelineView from "./V3TimelineView";
import V3AlbumView from "./V3AlbumView";

export default function V3PublicTree({ treeId }: { treeId: string }) {
  const [view, setView] = useState<"tree" | "timeline" | "album">("tree");
  const tree: V3PreviewTree | undefined = v3TreesById(treeId);
  const memories = useMemo(() => (tree ? v3MemoriesByTree(tree.id) : []), [tree]);

  if (!tree) {
    return (
      <div className="v3-page">
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          찾을 수 없는 공개 트리예요.
        </div>
        <div className="v3-milestone-back">
          <Link className="v3-btn v3-btn-quiet" href="/v3/community">
            ← 공개 정원으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="v3-public-tree">
      <div className="v3-onboarding-actions">
        <Link className="v3-btn v3-btn-ghost" href="/v3/community">
          ← 공개 정원으로
        </Link>
        <span className="v3-public-readonly-note">읽기 전용 · 편집할 수 없어요</span>
      </div>
      <header className="v3-public-tree-header">
        <p className="v3-eyebrow">public tree</p>
        <h1>{tree.title}</h1>
        {tree.memo && <p>{tree.memo}</p>}
        <div className="v3-public-meta">
          <span>작성자 · 예시 이용자</span>
          <span>공개 범위 · {tree.visibility}</span>
          <span>{memories.length}개 순간</span>
          <span>공감 {tree.likeCount ?? 0}</span>
        </div>
      </header>
      <div className="v3-view-tabs" role="group" aria-label="공개 트리 보기 모드">
        {(
          [
            { id: "tree", label: "성장 트리" },
            { id: "timeline", label: "연혁" },
            { id: "album", label: "앨범" },
          ] as const
        ).map((mode) => (
          <button
            className="v3-chip"
            type="button"
            key={mode.id}
            aria-pressed={view === mode.id}
            onClick={() => setView(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {view === "tree" && (
        <div className="v3-growth-canvas" aria-label="공개 트리 성장 트리">
          <div className="v3-growth-node" style={{ left: 40, top: 40 }}>
            {memories[0]?.thumbnailUrl ? (
              <img src={memories[0].thumbnailUrl} alt="" />
            ) : null}
            <div className="v3-growth-node-meta">
              <span className="v3-growth-node-tag">첫 순간</span>
              <span className="v3-growth-node-title">{memories[0]?.title}</span>
            </div>
          </div>
          <div className="v3-growth-node" style={{ left: 250, top: 140 }}>
            {memories[1]?.thumbnailUrl ? (
              <img src={memories[1].thumbnailUrl} alt="" />
            ) : null}
            <div className="v3-growth-node-meta">
              <span className="v3-growth-node-tag">이어진 순간</span>
              <span className="v3-growth-node-title">
                {memories[1]?.relationLabel ?? "다음 순간"}
              </span>
            </div>
          </div>
          <div className="v3-growth-node" style={{ left: 470, top: 90 }}>
            {memories[2]?.thumbnailUrl ? (
              <img src={memories[2].thumbnailUrl} alt="" />
            ) : null}
            <div className="v3-growth-node-meta">
              <span className="v3-growth-node-tag">이어진 순간</span>
              <span className="v3-growth-node-title">{memories[2]?.title}</span>
            </div>
          </div>
          <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <path
              d="M 124 110 C 180 150, 220 170, 268 170"
              fill="none"
              stroke="#c86e79"
              strokeWidth={2}
            />
            <path
              d="M 268 170 C 340 170, 400 130, 470 128"
              fill="none"
              stroke="#8a9a75"
              strokeWidth={2}
            />
          </svg>
        </div>
      )}
      {view === "timeline" && <V3TimelineView memories={memories} />}
      {view === "album" && <V3AlbumView memories={memories} />}

      {memories[0]?.sourceUrl && (
        <div>
          <h2 className="v3-workspace-heading">실제 출처</h2>
          <div className="v3-community-actions" style={{ marginTop: 10 }}>
            <a
              className="v3-public-source-link"
              href={memories[0].sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              원본 영상에서 보기
              <span aria-hidden="true">↗</span>
            </a>
            <span className="v3-public-reaction">
              ♥ 공감 {tree.likeCount ?? 0}
            </span>
          </div>
        </div>
      )}
      <p className="v3-seed-note">
        이 화면에는 편집 버튼이 없어요. V3 예시 데이터 · 실제 사용자 데이터가
        아닙니다.
      </p>
    </div>
  );
}
