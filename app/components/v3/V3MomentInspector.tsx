"use client";

import type { V3PreviewMemory } from "./v3-types";

interface V3MomentInspectorProps {
  memory: V3PreviewMemory;
  relationLabel: string | null;
  childCount: number;
}

const VISIBILITY_LABEL: Record<string, string> = {
  private: "나만 보기",
  tree: "트리 안에서만",
  public: "공개",
};

export default function V3MomentInspector({
  memory,
  relationLabel,
  childCount,
}: V3MomentInspectorProps) {
  return (
    <div className="v3-inspector-section" aria-label="선택한 순간 상세">
      <h2 className="v3-workspace-heading">{memory.title}</h2>
      <span className="v3-inspector-label">부모 순간</span>
      <span className="v3-inspector-value">
        {memory.parentId ? "트리에 연결된 순간" : "첫 순간 (루트)"}
      </span>
      <span className="v3-inspector-label">관계 이유</span>
      <span className="v3-inspector-value">{relationLabel ?? "관계 없음"}</span>
      <span className="v3-inspector-label">감정</span>
      <div className="v3-emotion-tags">
        {(memory.emotionTags?.length ? memory.emotionTags : []).map((tag) => (
          <span className="v3-emotion-tag" key={tag}>
            #{tag}
          </span>
        ))}
      </div>
      <span className="v3-inspector-label">메모</span>
      <span className="v3-inspector-value">{memory.memo ?? "남긴 메모가 없어요."}</span>
      <span className="v3-inspector-label">메모 공개 범위</span>
      <span className="v3-inspector-value">
        {VISIBILITY_LABEL[memory.memoVisibility] ?? memory.memoVisibility}
      </span>
      <span className="v3-inspector-label">기록 날짜</span>
      <span className="v3-inspector-value">{memory.recordDate}</span>
      <span className="v3-inspector-label">이어진 순간</span>
      <span className="v3-inspector-value">{childCount}개</span>
    </div>
  );
}
