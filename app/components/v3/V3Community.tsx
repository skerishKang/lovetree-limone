"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { v3Trees } from "./fixtures/v3-fixtures";
import V3CommunityPreview from "./V3CommunityPreview";

const SORTS = [
  { id: "recent", label: "최신순" },
  { id: "popular", label: "인기순" },
  { id: "views", label: "조회순" },
  { id: "moments", label: "순간 수순" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const EMOTION_FILTERS = ["전체", "설렘", "위로", "존경", "그리움", "웃음", "애틋함"];

export default function V3Community() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("recent");
  const [emotion, setEmotion] = useState("전체");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>("community-demo");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likeIds, setLikeIds] = useState<Set<string>>(new Set());

  const publicTrees = useMemo(
    () => v3Trees.filter((tree) => tree.visibility === "public"),
    [],
  );

  const filtered = useMemo(() => {
    return [...publicTrees]
      .filter((tree) => {
        if (emotion !== "전체" && !`${tree.title} ${tree.memo ?? ""}`.includes(emotion)) {
          return false;
        }
        const haystack = `${tree.title} ${tree.subjectName ?? ""} ${tree.memo ?? ""}`;
        return !query.trim() || haystack.toLowerCase().includes(query.trim().toLowerCase());
      })
      .sort((a, b) => {
        if (sort === "recent") return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
        if (sort === "popular") return (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (sort === "views") return (b.viewCount ?? 0) - (a.viewCount ?? 0);
        return (b.momentCount ?? 0) - (a.momentCount ?? 0);
      });
  }, [publicTrees, query, sort, emotion]);

  const selectedTree =
    publicTrees.find((tree) => tree.id === selectedTreeId) ?? filtered[0] ?? null;

  return (
    <div className="v3-page">
      <header className="v3-garden-header">
        <div>
          <p className="v3-eyebrow">community garden</p>
          <h1>공개 정원</h1>
          <p>이웃이 공개한 사랑 연혁 트리를 둘러봐요.</p>
        </div>
      </header>
      <div className="v3-community-toolbar">
        <input
          className="v3-input v3-community-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="인물, 트리 제목, 감정으로 찾아보세요"
          aria-label="커뮤니티 검색"
        />
        <div className="v3-chip-group" role="group" aria-label="감정 필터">
          {EMOTION_FILTERS.map((label) => (
            <button
              className="v3-chip"
              type="button"
              key={label}
              aria-pressed={emotion === label}
              onClick={() => setEmotion(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="v3-chip-group" role="group" aria-label="정렬">
          {SORTS.map((item) => (
            <button
              className="v3-chip"
              type="button"
              key={item.id}
              aria-pressed={sort === item.id}
              onClick={() => setSort(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          찾는 마음의 트리가 아직 없어요.
        </div>
      ) : (
        <>
          <div className="v3-community-grid">
            {filtered.map((tree) => (
              <div
                className="v3-community-card"
                key={tree.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedTreeId === tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTreeId(tree.id);
                  }
                }}
              >
                <div className="v3-community-cover">
                  <span aria-hidden="true">✦</span>
                </div>
                <h2>{tree.title}</h2>
                {tree.memo && <p>{tree.memo}</p>}
                <div className="v3-community-meta">
                  <span>{tree.momentCount ?? 0}개 순간</span>
                  <span>공감 {tree.likeCount ?? 0}</span>
                  <span>조회 {tree.viewCount ?? 0}</span>
                  <span>저장 {tree.savedCount ?? 0}</span>
                </div>
                <div className="v3-community-actions">
                  <button
                    className="v3-btn v3-btn-quiet"
                    type="button"
                    aria-pressed={savedIds.has(tree.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSavedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(tree.id)) next.delete(tree.id);
                        else next.add(tree.id);
                        return next;
                      });
                    }}
                  >
                    {savedIds.has(tree.id) ? "저장됨 ♥" : "저장"}
                  </button>
                  <button
                    className="v3-btn v3-btn-ghost"
                    type="button"
                    aria-pressed={likeIds.has(tree.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setLikeIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(tree.id)) next.delete(tree.id);
                        else next.add(tree.id);
                        return next;
                      });
                    }}
                  >
                    {likeIds.has(tree.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedTree && <V3CommunityPreview tree={selectedTree} />}
        </>
      )}
      <p className="v3-seed-note">
        좋아요·저장은 시각 상태만 표현해요. 실제 서버 변경은 하지 않습니다.
        V3 예시 데이터 · 실제 사용자 데이터가 아닙니다.
      </p>
    </div>
  );
}
