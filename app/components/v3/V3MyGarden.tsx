"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { V3PreviewTree } from "./v3-types";
import { v3Trees } from "./fixtures/v3-fixtures";

const VISIBILITY_LABEL: Record<string, string> = {
  private: "비공개",
  unlisted: "링크 공개",
  public: "공개",
};

export default function V3MyGarden() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "shelf">("grid");

  const filtered = useMemo(() => {
    return v3Trees.filter((tree) => {
      const haystack = `${tree.title} ${tree.subjectName ?? ""} ${tree.memo ?? ""}`;
      return !query.trim() || haystack.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [query]);

  return (
    <div className="v3-page">
      <header className="v3-garden-header">
        <div>
          <p className="v3-eyebrow">my garden</p>
          <h1>내 정원</h1>
          <p>심은 트리와 사람·주제 앨범을 한곳에서 둘러봐요.</p>
        </div>
        <Link className="v3-btn v3-btn-primary" href="/v3/trees/new">
          <span aria-hidden="true">+</span>
          새 트리 심기
        </Link>
      </header>
      <div className="v3-garden-toolbar">
        <input
          className="v3-input v3-community-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="트리 이름·사람·주제로 찾기"
          aria-label="내 정원 검색"
        />
        <div className="v3-chip-group" role="group" aria-label="보기 전환">
          <button
            className="v3-chip"
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            그리드 보기
          </button>
          <button
            className="v3-chip"
            type="button"
            aria-pressed={view === "shelf"}
            onClick={() => setView("shelf")}
          >
            선반 보기
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          찾는 트리가 없어요.
        </div>
      ) : view === "grid" ? (
        <div className="v3-garden-grid">
          {filtered.map((tree) => (
            <Link className="v3-garden-card" href={`/v3/trees/${tree.id}`} key={tree.id}>
              <div className="v3-garden-cover">
                <span aria-hidden="true">{tree.subjectType === "person" ? "♥" : "✦"}</span>
              </div>
              <h2>{tree.title}</h2>
              {tree.memo && <p>{tree.memo}</p>}
              <div className="v3-garden-meta">
                <span className={`v3-visibility-tag v3-visibility-${tree.visibility}`}>
                  {VISIBILITY_LABEL[tree.visibility]}
                </span>
                {tree.subjectName && <span>{tree.subjectName}</span>}
                <span>{tree.momentCount ?? 0}개 순간</span>
                {tree.updatedAt && <span>최근 편집 {tree.updatedAt}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="v3-shelf-wrap" aria-label="내 정원 선반 보기">
          <div className="v3-shelf">
            {filtered.map((tree, index) => (
              <Link
                className={`v3-shelf-book${index === 1 ? " v3-shelf-center" : ""}`}
                href={`/v3/trees/${tree.id}`}
                key={tree.id}
                style={{ animationDelay: `${index * 60}ms` }}
                aria-label={`${tree.title} 트리 열기`}
              >
                <span className="v3-shelf-book-title">{tree.title}</span>
              </Link>
            ))}
          </div>
          <div className="v3-shelf-floor" aria-hidden="true" />
          <p className="v3-shelf-hint">선반 보기는 데스크톱에서 즐기기 좋아요.</p>
        </div>
      )}
      <div className="v3-garden-toolbar">
        <Link className="v3-btn v3-btn-quiet" href="/v3/subjects/demo">
          사람·주제 앨범 보기
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="v3-seed-note">V3 예시 데이터 · 실제 사용자 데이터가 아닙니다.</p>
    </div>
  );
}
