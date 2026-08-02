"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { V3PreviewMemory, V3SubjectAlbum } from "./v3-types";
import { v3MotionArchiveMemories, v3SubjectAlbums } from "./fixtures/v3-fixtures";
import {
  normalizeArchiveQuery,
  serializeArchiveQuery,
  withArchiveState,
  type ArchiveLayout,
  type ArchiveQueryState,
  type ArchiveView,
} from "./v3-archive-state";
import V3ArchiveModeDock from "./V3ArchiveModeDock";
import V3VideoViewer from "./V3VideoViewer";

const V3AlbumStage = dynamic(() => import("./V3AlbumStage"), {
  ssr: false,
  loading: () => <p className="v3-seed-note">순간 갤러리를 준비하고 있어요...</p>,
});

const V3ShelfView = dynamic(() => import("./V3ShelfView"), {
  ssr: false,
  loading: () => <p className="v3-seed-note">앨범 서가를 준비하고 있어요...</p>,
});

const V3AlbumFolding = dynamic(() => import("./V3AlbumFolding"), {
  ssr: false,
  loading: () => <p className="v3-seed-note">펼쳐보는 앨범을 준비하고 있어요...</p>,
});

export default function V3ArchiveExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const subjects = useMemo<V3SubjectAlbum[]>(() => v3SubjectAlbums, []);
  const memories = useMemo<V3PreviewMemory[]>(() => v3MotionArchiveMemories, []);

  const subjectIds = useMemo(() => subjects.map((subject) => subject.id), [subjects]);
  const momentIds = useMemo(() => memories.map((memory) => memory.id), [memories]);

  const [viewerMemory, setViewerMemory] = useState<V3PreviewMemory | null>(null);

  const state = useMemo<ArchiveQueryState>(
    () =>
      normalizeArchiveQuery(
        new URLSearchParams(searchParams?.toString() ?? ""),
        subjectIds,
        momentIds,
      ),
    [searchParams, subjectIds, momentIds],
  );

  const navigate = useCallback(
    (method: "push" | "replace", next: ArchiveQueryState) => {
      const params = serializeArchiveQuery(next);
      const query = params.toString();
      router[method](query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname],
  );

  const rawQuery = searchParams?.toString() ?? "";
  const normalizedQuery = serializeArchiveQuery(state).toString();
  useEffect(() => {
    if (rawQuery !== normalizedQuery) {
      router.replace(normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname);
    }
  }, [rawQuery, normalizedQuery, router, pathname]);

  const viewMemories = useMemo(() => {
    if (!state.subjectId) return memories;
    const album = subjects.find((subject) => subject.id === state.subjectId);
    if (!album) return memories;
    return memories.filter((memory) => album.treeIds.includes(memory.treeId));
  }, [memories, subjects, state.subjectId]);

  const activeMoment = useMemo(
    () => memories.find((memory) => memory.id === state.momentId) ?? null,
    [memories, state.momentId],
  );

  const setView = useCallback(
    (view: ArchiveView) => {
      navigate("push", withArchiveState(state, { view }));
    },
    [navigate, state],
  );

  const setLayout = useCallback(
    (layout: ArchiveLayout) => {
      navigate("push", withArchiveState(state, { layout }));
    },
    [navigate, state],
  );

  const setSubject = useCallback(
    (subjectId: string) => {
      const album = subjects.find((subject) => subject.id === subjectId);
      const scoped = album
        ? memories.filter((memory) => album.treeIds.includes(memory.treeId))
        : memories;
      const next = withArchiveState(state, { subjectId });
      if (next.momentId && !scoped.some((memory) => memory.id === next.momentId)) {
        next.momentId = null;
      }
      navigate("push", next);
    },
    [navigate, state, subjects, memories],
  );

  const setMoment = useCallback(
    (momentId: string) => {
      navigate("replace", withArchiveState(state, { momentId }));
    },
    [navigate, state],
  );

  const openViewer = useCallback(
    (momentId: string) => {
      const memory = memories.find((item) => item.id === momentId);
      if (memory) setViewerMemory(memory);
    },
    [memories],
  );

  const closeViewer = useCallback(() => setViewerMemory(null), []);

  return (
    <div className="v3-page">
      <header className="v3-garden-header">
        <div>
          <p className="v3-eyebrow">switchable archive</p>
          <h1>사람·주제 앨범</h1>
          <p>같은 순간 데이터를 여러 방식으로 둘러보는 아카이브예요.</p>
        </div>
      </header>

      <V3ArchiveModeDock
        view={state.view}
        layout={state.layout}
        onViewChange={setView}
        onLayoutChange={setLayout}
      />

      {state.view === "stage" && (
        <V3AlbumStage
          memories={viewMemories}
          layout={state.layout}
          selectedMomentId={activeMoment?.id ?? null}
          onSelectMoment={setMoment}
          onOpenViewer={openViewer}
        />
      )}
      {state.view === "shelf" && (
        <V3ShelfView
          subjects={subjects}
          memories={memories}
          selectedSubjectId={state.subjectId}
          onSelectSubject={setSubject}
          selectedMomentId={activeMoment?.id ?? null}
          onSelectMoment={setMoment}
          onOpenViewer={openViewer}
        />
      )}
      {state.view === "folding" && (
        <V3AlbumFolding
          memories={viewMemories}
          selectedMomentId={activeMoment?.id ?? null}
          onSelectMoment={setMoment}
          onOpenViewer={openViewer}
        />
      )}

      {viewerMemory && (
        <V3VideoViewer memory={viewerMemory} onClose={closeViewer} label="선택한 순간" />
      )}

      <p className="v3-seed-note">
        V3 예시 데이터 · 실제 저장은 되지 않아요. URL에 보기·배치·순간이 담겨요.
      </p>
    </div>
  );
}
