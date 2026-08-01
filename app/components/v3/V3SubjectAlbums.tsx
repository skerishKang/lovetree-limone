"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { V3SubjectAlbum } from "./v3-types";
import { v3MemoriesByTree, v3SubjectAlbums } from "./fixtures/v3-fixtures";
import V3ShelfView from "./V3ShelfView";

export default function V3SubjectAlbums() {
  const [view, setView] = useState<"grid" | "shelf">("grid");
  const [openAlbum, setOpenAlbum] = useState<V3SubjectAlbum | null>(null);
  const [albumIndex, setAlbumIndex] = useState(0);

  function openShelf(album: V3SubjectAlbum, index: number) {
    setOpenAlbum(album);
    setAlbumIndex(index);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!openAlbum) return;
      if (event.key === "Escape") {
        setOpenAlbum(null);
      }
      if (event.key === "ArrowLeft") {
        setAlbumIndex((prev) => {
          const next = (prev - 1 + v3SubjectAlbums.length) % v3SubjectAlbums.length;
          setOpenAlbum(v3SubjectAlbums[next]);
          return next;
        });
      }
      if (event.key === "ArrowRight") {
        setAlbumIndex((prev) => {
          const next = (prev + 1) % v3SubjectAlbums.length;
          setOpenAlbum(v3SubjectAlbums[next]);
          return next;
        });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openAlbum]);

  const relatedTrees = openAlbum
    ? openAlbum.treeIds.map((treeId) => ({
        treeId,
        count: v3MemoriesByTree(treeId).length,
      }))
    : [];

  return (
    <div className="v3-page">
      <header className="v3-garden-header">
        <div>
          <p className="v3-eyebrow">subject albums</p>
          <h1>사람·주제 앨범</h1>
          <p>대상과 주제별로 묶인 트리를 앨범처럼 둘러봐요.</p>
        </div>
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
            3D 선반 보기
          </button>
        </div>
      </header>

      {view === "grid" ? (
        <>
          <div className="v3-subject-grid">
            {v3SubjectAlbums.map((album, index) => (
              <button
                className="v3-subject-card"
                type="button"
                key={album.id}
                onClick={() => openShelf(album, index)}
                aria-haspopup="dialog"
              >
                <div className="v3-subject-cover">
                  <span aria-hidden="true">{album.kind === "person" ? "♥" : "✦"}</span>
                </div>
                <h2>{album.name}</h2>
                {album.groupName && <p>{album.groupName}</p>}
                <small>
                  {album.treeIds.length}개 트리 · 대표 감정 {album.mood ?? "없음"}
                </small>
              </button>
            ))}
          </div>
          <div className="v3-onboarding-actions">
            <Link className="v3-btn v3-btn-quiet" href="/v3/my-trees">
              ← 내 정원으로
            </Link>
          </div>
        </>
      ) : (
        <V3ShelfView
          albumIndex={albumIndex}
          setAlbumIndex={setAlbumIndex}
          openAlbum={openAlbum}
          onOpenAlbum={setOpenAlbum}
        />
      )}

      {openAlbum && view === "grid" && (
        <div
          className="v3-backdrop"
          role="presentation"
          onClick={() => setOpenAlbum(null)}
        >
          <div
            className="v3-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v3-subject-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="v3-modal-close"
              type="button"
              onClick={() => setOpenAlbum(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <p className="v3-eyebrow">subject album</p>
            <h2 id="v3-subject-modal-title">{openAlbum.name}</h2>
            {openAlbum.groupName && <p className="v3-muted">{openAlbum.groupName}</p>}
            <div className="v3-diary-view">
              {relatedTrees.map(({ treeId, count }) => (
                <Link
                  className="v3-diary-item"
                  href={`/v3/trees/${treeId}`}
                  key={treeId}
                >
                  <strong>관련 트리 열기</strong>
                  <small>{count}개 순간이 담긴 트리</small>
                </Link>
              ))}
            </div>
            <div className="v3-onboarding-actions">
              <button className="v3-btn v3-btn-quiet" type="button" onClick={() => setOpenAlbum(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="v3-seed-note">
        기본 보기는 접근 가능한 그리드예요. 3D 선반은 선택형 보기입니다.
        V3 예시 데이터 · 실제 사용자 데이터가 아닙니다.
      </p>
    </div>
  );
}
