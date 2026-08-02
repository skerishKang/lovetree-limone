"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { V3SubjectAlbum } from "./v3-types";
import { v3MemoriesByTree, v3SubjectAlbums } from "./fixtures/v3-fixtures";

interface V3ShelfViewProps {
  albumIndex: number;
  setAlbumIndex: (index: number) => void;
  openAlbum: V3SubjectAlbum | null;
  onOpenAlbum: (album: V3SubjectAlbum | null) => void;
}

export default function V3ShelfView({
  albumIndex,
  setAlbumIndex,
  openAlbum,
  onOpenAlbum,
}: V3ShelfViewProps) {
  const [focusedIndex, setFocusedIndex] = useState(albumIndex);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (openAlbum) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + v3SubjectAlbums.length) % v3SubjectAlbums.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % v3SubjectAlbums.length);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        setAlbumIndex(focusedIndex);
        onOpenAlbum(v3SubjectAlbums[focusedIndex]);
      }
      if (event.key === "Escape") {
        onOpenAlbum(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openAlbum, focusedIndex, setAlbumIndex, onOpenAlbum]);

  const centerAlbum = v3SubjectAlbums[focusedIndex];
  const tracks = openAlbum
    ? v3MemoriesByTree(openAlbum.treeIds[0] ?? "")
    : [];

  return (
    <div>
      <div className="v3-shelf-wrap" aria-label="사람·주제 앨범 3D 선반">
        <div className="v3-shelf">
          {v3SubjectAlbums.map((album, index) => (
            <button
              className={`v3-shelf-book${index === focusedIndex ? " v3-shelf-center" : ""}`}
              type="button"
              key={album.id}
              onClick={() => {
                setFocusedIndex(index);
                setAlbumIndex(index);
                onOpenAlbum(album);
              }}
              aria-label={`${album.name} 앨범 펼치기`}
            >
              <span className="v3-shelf-book-title">{album.name}</span>
            </button>
          ))}
        </div>
        <div className="v3-shelf-floor" aria-hidden="true" />
        <div className="v3-shelf-nav">
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="이전 앨범"
            onClick={() =>
              setFocusedIndex((prev) => (prev - 1 + v3SubjectAlbums.length) % v3SubjectAlbums.length)
            }
          >
            ←
          </button>
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="다음 앨범"
            onClick={() => setFocusedIndex((prev) => (prev + 1) % v3SubjectAlbums.length)}
          >
            →
          </button>
        </div>
        <p className="v3-shelf-hint">
          좌우 방향키로 이동, Enter로 펼치기, Escape로 닫기 — {centerAlbum.name} 앨범이
          선택됨
        </p>
      </div>

      {openAlbum && (
        <div className="v3-shelf-spread" aria-label={`${openAlbum.name} 앨범 상세`}>
          <div className="v3-shelf-spread-cover">
            <span aria-hidden="true">{openAlbum.kind === "person" ? "♥" : "✦"}</span>
            <div>{openAlbum.name}</div>
            <div style={{ fontSize: "0.72rem", opacity: 0.8 }}>
              {openAlbum.groupName ?? "subject album"}
            </div>
          </div>
          <div>
            <h2 className="v3-workspace-heading">관련 트리</h2>
            <div className="v3-diary-list">
              {openAlbum.treeIds.map((treeId) => (
                <Link
                  className="v3-diary-item"
                  href={`/v3/trees/${treeId}`}
                  key={treeId}
                >
                  <strong>트리 열기</strong>
                  <small>{v3MemoriesByTree(treeId).length}개 순간</small>
                </Link>
              ))}
            </div>
            <h2 className="v3-workspace-heading" style={{ marginTop: 14 }}>
              관련 순간
            </h2>
            <div className="v3-shelf-spread-list">
              {tracks.map((memory) => (
                <button
                  className="v3-shelf-track"
                  type="button"
                  key={memory.id}
                  onClick={() => onOpenAlbum(null)}
                >
                  <strong>{memory.title}</strong>
                  <small>
                    {memory.primaryEmotion ?? ""} · {memory.recordDate}
                  </small>
                </button>
              ))}
            </div>
            <div className="v3-onboarding-actions">
              <button className="v3-btn v3-btn-quiet" type="button" onClick={() => onOpenAlbum(null)}>
                선반으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
