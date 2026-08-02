"use client";

import Link from "next/link";
import type { V3PreviewTree } from "./v3-types";
import { v3MemoriesByTree } from "./fixtures/v3-fixtures";

export default function V3CommunityPreview({ tree }: { tree: V3PreviewTree }) {
  const memories = v3MemoriesByTree(tree.id);
  const hero = memories[0];

  return (
    <div className="v3-community-preview" aria-label={`${tree.title} 큰 미리보기`}>
      <div className="v3-preview-scrapbook">
        <h2>{tree.title}</h2>
        {tree.memo && <p>{tree.memo}</p>}
        <div className="v3-preview-media-row">
          <div className="v3-preview-media-box">
            {hero?.thumbnailUrl ? (
              <img src={hero.thumbnailUrl} alt="" />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: 130,
                  color: "#fffaf6",
                  fontSize: "1.3rem",
                }}
              >
                ▶
              </span>
            )}
          </div>
          <div className="v3-preview-media-box">
            {memories[1]?.thumbnailUrl ? (
              <img src={memories[1].thumbnailUrl} alt="" />
            ) : null}
          </div>
          <div className="v3-preview-media-box">
            {memories[2]?.thumbnailUrl ? (
              <img src={memories[2].thumbnailUrl} alt="" />
            ) : null}
          </div>
        </div>
        <div className="v3-community-actions">
          <Link
            className="v3-btn v3-btn-primary"
            href={`/v3/community/trees/${tree.id}`}
          >
            전체 러브트리 펼쳐보기
            <span aria-hidden="true">✣</span>
          </Link>
        </div>
      </div>
      <div className="v3-preview-side">
        <h3>오래 남은 마음</h3>
        <p>{hero?.memo ?? "대표 순간의 메모가 여기에 표시돼요."}</p>
        <h3>대표 순간</h3>
        <p>
          {memories.length}개의 순간 · {hero?.primaryEmotion ?? "감정 없음"}
        </p>
        <h3>이어진 감정</h3>
        <div className="v3-chip-group">
          {(hero?.emotionTags ?? []).map((tag) => (
            <span className="v3-emotion-tag" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
