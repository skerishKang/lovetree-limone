"use client";

import { useEffect, useMemo, useRef } from "react";
import type { V3PreviewMemory, V3SubjectAlbum } from "./v3-types";
import V3AlbumAccordion from "./V3AlbumAccordion";

interface V3ShelfViewProps {
  subjects: V3SubjectAlbum[];
  memories: V3PreviewMemory[];
  selectedSubjectId: string | null;
  onSelectSubject: (id: string) => void;
  selectedMomentId: string | null;
  onSelectMoment: (id: string) => void;
  onOpenViewer: (id: string) => void;
}

export default function V3ShelfView({
  subjects,
  memories,
  selectedSubjectId,
  onSelectSubject,
  selectedMomentId,
  onSelectMoment,
  onOpenViewer,
}: V3ShelfViewProps) {
  const selectedIndex = useMemo(() => {
    const index = subjects.findIndex((subject) => subject.id === selectedSubjectId);
    return index === -1 ? 0 : index;
  }, [subjects, selectedSubjectId]);

  const bookRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) {
      bookRefs.current[selectedIndex]?.focus();
    } else {
      mountedRef.current = true;
    }
  }, [selectedIndex]);

  const selectedSubject = subjects[selectedIndex];

  const subjectMemories = useMemo(() => {
    if (!selectedSubject) return [];
    const treeIds = selectedSubject.treeIds;
    return memories.filter((memory) => treeIds.includes(memory.treeId));
  }, [memories, selectedSubject]);

  function focusBook(delta: number) {
    const next = (selectedIndex + delta + subjects.length) % subjects.length;
    bookRefs.current[next]?.focus();
    onSelectSubject(subjects[next].id);
  }

  if (subjects.length === 0) {
    return (
      <section className="v3-view" aria-label="앨범 서가">
        <h2>앨범 서가</h2>
        <div className="v3-empty">
          <span aria-hidden="true">✦</span>
          아직 앨범이 없어요.
        </div>
      </section>
    );
  }

  return (
    <section className="v3-view" aria-label="앨범 서가">
      <h2>앨범 서가</h2>
      <p className="v3-view-note">
        사람·주제별로 묶인 앨범을 서가처럼 둘러봐요. 좌우 방향키로 책을 고르고
        Enter로 펼쳐 보세요.
      </p>
      <div className="v3-shelf-wrap">
        <div
          className="v3-shelf"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusBook(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focusBook(1);
            }
          }}
        >
          {subjects.map((subject, index) => (
            <button
              className={`v3-shelf-book${index === selectedIndex ? " v3-shelf-center" : ""}`}
              type="button"
              key={subject.id}
              ref={(node) => {
                bookRefs.current[index] = node;
              }}
              tabIndex={index === selectedIndex ? 0 : -1}
              onClick={() => onSelectSubject(subject.id)}
              aria-label={`${subject.name} 앨범 펼치기`}
              aria-current={index === selectedIndex ? "true" : undefined}
            >
              <span className="v3-shelf-book-title">{subject.name}</span>
            </button>
          ))}
        </div>
        <div className="v3-shelf-floor" aria-hidden="true" />
        <div className="v3-shelf-nav">
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="이전 앨범"
            onClick={() => focusBook(-1)}
          >
            ←
          </button>
          <button
            className="v3-btn v3-btn-icon v3-btn-ghost"
            type="button"
            aria-label="다음 앨범"
            onClick={() => focusBook(1)}
          >
            →
          </button>
        </div>
        <p className="v3-shelf-hint">
          {selectedSubject.name} 앨범이 선택됨 · 순간 {subjectMemories.length}개
        </p>
      </div>

      {selectedSubject && (
        <div className="v3-shelf-spread" aria-label={`${selectedSubject.name} 앨범 상세`}>
          <V3AlbumAccordion
            subject={selectedSubject}
            memories={subjectMemories}
            selectedMomentId={selectedMomentId}
            onSelectMoment={onSelectMoment}
            onOpenViewer={onOpenViewer}
          />
        </div>
      )}
    </section>
  );
}
