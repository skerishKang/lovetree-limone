"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { V3SubjectAlbum } from "./v3-types";
import {
  v3MotionArchiveMemories,
  v3SubjectAlbums,
} from "./fixtures/v3-fixtures";
import V3ShelfView from "./V3ShelfView";
import V3AlbumStage from "./V3AlbumStage";
import V3AlbumAccordion from "./V3AlbumAccordion";

export default function V3SubjectAlbums() {
  const [view, setView] = useState<"grid" | "shelf" | "motion">("grid");
  const [openAlbum, setOpenAlbum] = useState<V3SubjectAlbum | null>(null);
  const [accordionAlbum, setAccordionAlbum] = useState<V3SubjectAlbum | null>(null);
  const [albumIndex, setAlbumIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (openAlbum && event.key === "Escape") {
        setOpenAlbum(null);
      }
      if (accordionAlbum && event.key === "Escape") {
        setAccordionAlbum(null);
      }
      if (!openAlbum) return;
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
  }, [openAlbum, accordionAlbum]);

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
          <button
            className="v3-chip"
            type="button"
            aria-pressed={view === "motion"}
            onClick={() => setView("motion")}
          >
            모션 아카이브
          </button>
        </div>
      </header>

      {view === "grid" ? (
        <>
          <div className="v3-subject-grid">
            {v3SubjectAlbums.map((album) => (
              <button
                className="v3-subject-card"
                type="button"
                key={album.id}
                onClick={() => setAccordionAlbum(album)}
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
      ) : view === "motion" ? (
        <V3AlbumStage memories={v3MotionArchiveMemories} />
      ) : (
        <V3ShelfView
          albumIndex={albumIndex}
          setAlbumIndex={setAlbumIndex}
          openAlbum={openAlbum}
          onOpenAlbum={setOpenAlbum}
        />
      )}

      {accordionAlbum && view === "grid" && (
        <div
          className="v3-backdrop"
          role="presentation"
          onClick={() => setAccordionAlbum(null)}
        >
          <div
            className="v3-modal v3-accordion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v3-accordion-title"
            onClick={(event) => event.stopPropagation()}
          >
            <V3AlbumAccordion
              album={accordionAlbum}
              onBack={() => setAccordionAlbum(null)}
            />
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
