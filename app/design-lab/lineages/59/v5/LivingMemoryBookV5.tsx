"use client";

import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Moment,
  Connection,
  Branch,
} from "@/lib/lineage-59/living-memory-book-data";
import {
  MOMENTS,
  CONNECTIONS,
  BRANCHES,
  BRANCH_MOMENTS,
  BRANCH_CONNECTIONS,
  BRANCH_ALTERNATE_CONNECTIONS,
  LONG_PATH_MOMENTS,
  LONG_PATH_CONNECTIONS,
} from "@/lib/lineage-59/living-memory-book-data";
import type { SelectionState } from "@/lib/lineage-59/selection-authority";
import {
  createSelection,
  selectNext,
  selectPrevious,
  selectByIndex,
  hasNext,
  hasPrevious,
  isAtEnd,
} from "@/lib/lineage-59/selection-authority";
import type { StoryState } from "@/lib/lineage-59/story-transport";
import {
  createStoryState,
  startStory,
  pauseStory,
  resumeStory,
  stopStory,
  setStorySpeed,
  advanceStoryPhase,
  getStoryPhaseDurations,
  cycleSpeed,
} from "@/lib/lineage-59/story-transport";
import type { BranchChoice } from "@/lib/lineage-59/branch-authority";
import { createBranchState, selectBranchChoice } from "@/lib/lineage-59/branch-authority";
import type { CurlState } from "@/lib/lineage-59/page-physics";
import {
  createCurlState,
  updateCurlProgress,
  shouldCommit,
  completePageTurn,
  cancelPageTurn,
  startFastFlip,
  stopFastFlip,
  computeCurlTransform,
} from "@/lib/lineage-59/page-physics";
import type { EditState } from "@/lib/lineage-59/edit-authority";
import { openEdit, closeEdit, updateEditField, getEditData } from "@/lib/lineage-59/edit-authority";

import "@/app/styles/lineage-59-living-memory-book.css";

export type DataSetKey = "default" | "long-path" | "branch";

export interface DataSet {
  moments: readonly Moment[];
  connections: readonly Connection[];
  branches: readonly Branch[];
  label: string;
}

const DATA_SETS: Record<DataSetKey, DataSet> = {
  default: {
    moments: MOMENTS,
    connections: CONNECTIONS,
    branches: [],
    label: "Default path",
  },
  "long-path": {
    moments: LONG_PATH_MOMENTS,
    connections: LONG_PATH_CONNECTIONS,
    branches: [],
    label: "Long path + English copy",
  },
  branch: {
    moments: BRANCH_MOMENTS,
    connections: [...BRANCH_CONNECTIONS, ...BRANCH_ALTERNATE_CONNECTIONS],
    branches: BRANCHES,
    label: "Branch path",
  },
};

export default function LivingMemoryBookV5() {
  const [dataSetKey, setDataSetKey] = useState<DataSetKey>("default");
  const dataSet = DATA_SETS[dataSetKey];
  const [moments, setMoments] = useState<Record<string, Moment>>(() => {
    const map: Record<string, Moment> = {};
    for (const m of dataSet.moments) map[m.id] = { ...m };
    return map;
  });
  const [whyNextOverrides, setWhyNextOverrides] = useState<Record<string, string>>({});

  const pathMomentIds = useMemo(() => dataSet.moments.map((m) => m.id), [dataSet]);
  const connectionsMap = useMemo(() => {
    const map = new Map(dataSet.connections.map((c) => [c.fromId, c]));
    return map;
  }, [dataSet]);
  const branchesMap = useMemo(() => {
    const map = new Map(dataSet.branches.map((b) => [b.fromMomentId, b]));
    return map;
  }, [dataSet]);

  const [selection, setSelection] = useState<SelectionState>(() => createSelection(pathMomentIds[0], pathMomentIds));
  const [story, setStory] = useState<StoryState>(() => createStoryState());
  const [branchState, setBranchState] = useState<ReturnType<typeof createBranchState> | null>(null);
  const [curl, setCurl] = useState<CurlState>(() => createCurlState());
  const [edit, setEdit] = useState<EditState>({ active: false, momentId: null, fields: [], dirty: false });
  const [view, setView] = useState<"book" | "index" | "detail" | "magnifier">("book");
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [fastFlipTimer, setFastFlipTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const prevDragRef = useRef<{ x: number; time: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion !== false) return;
    const initial = setTimeout(() => {
      setView("book");
    }, 300);
    return () => clearTimeout(initial);
  }, [reducedMotion]);

  const switchDataSet = useCallback((key: DataSetKey) => {
    setDataSetKey(key);
    const ds = DATA_SETS[key];
    const map: Record<string, Moment> = {};
    for (const m of ds.moments) map[m.id] = { ...m };
    setMoments(map);
    setWhyNextOverrides({});
    const ids = ds.moments.map((m) => m.id);
    setSelection(createSelection(ids[0], ids));
    setStory(createStoryState());
    setBranchState(null);
    setCurl(createCurlState());
    setEdit({ active: false, momentId: null, fields: [], dirty: false });
    setView("book");
    if (fastFlipTimer) clearInterval(fastFlipTimer);
    setFastFlipTimer(null);
  }, [fastFlipTimer]);

  const currentMoment = moments[selection.currentMomentId];
  const currentWhyNext = useMemo(() => {
    if (!currentMoment) return null;
    const override = whyNextOverrides[currentMoment.id];
    if (override) return override;
    const conn = connectionsMap.get(currentMoment.id);
    return conn?.whyNext ?? null;
  }, [currentMoment, whyNextOverrides, connectionsMap]);

  const hasCurrentBranch = useMemo(() => {
    if (!currentMoment) return false;
    return branchesMap.has(currentMoment.id);
  }, [currentMoment, branchesMap]);

  const storyDurations = useMemo(() => getStoryPhaseDurations(story), [story]);

  useEffect(() => {
    if (!story.playing || story.paused) return;
    if (story.phase === "ended") return;
    if (branchState?.active || branchState?.resolved) return;

    let duration = 0;
    switch (story.phase) {
      case "holding": duration = storyDurations.hold; break;
      case "why-next": duration = storyDurations.whyNext; break;
      case "page-turn": duration = storyDurations.pageTurn; break;
      case "landing": duration = storyDurations.landing; break;
      default: return;
    }
    storyTimerRef.current = setTimeout(() => {
      switch (story.phase) {
        case "holding":
          setStory((s) => advanceStoryPhase(s, "why-next"));
          break;
        case "why-next":
          setStory((s) => advanceStoryPhase(s, "page-turn"));
          break;
        case "page-turn":
          setCurl(completePageTurn);
          setStory((s) => advanceStoryPhase(s, "landing"));
          break;
        case "landing": {
          const nextIdx = selection.pathIndex + 1;
          if (nextIdx >= pathMomentIds.length) {
            setStory((s) => advanceStoryPhase(s, "ended"));
            return;
          }
          if (hasCurrentBranch && !branchState?.resolved) {
            const branch = branchesMap.get(currentMoment!.id);
            if (branch) {
              const choices: BranchChoice[] = branch.choices.map((ch) => {
                const conn = connectionsMap.get(ch.connectionId);
                return {
                  id: ch.id,
                  label: ch.label,
                  description: ch.description,
                  continuationMomentId: conn?.toId ?? "",
                };
              });
              setBranchState(createBranchState(currentMoment!.id, choices));
              setStory((s) => ({ ...s, phase: "branch-pause", playing: false, paused: true }));
              return;
            }
          }
          setSelection(selectNext);
          setCurl(createCurlState);
          setStory((s) => advanceStoryPhase(s, "holding"));
          break;
        }
      }
    }, duration);
    return () => { if (storyTimerRef.current) clearTimeout(storyTimerRef.current); };
  }, [story.phase, story.playing, story.paused, story.speed, selection, pathMomentIds, branchState, hasCurrentBranch, currentMoment, branchesMap, connectionsMap, storyDurations]);

  const handleStoryPlay = useCallback(() => {
    if (story.phase === "ended") {
      setStory(createStoryState);
      setSelection((s) => selectByIndex(s, 0));
      setCurl(createCurlState);
      return;
    }
    if (story.paused) {
      setStory(resumeStory);
      return;
    }
    setStory(startStory);
  }, [story]);

  const handleStoryPause = useCallback(() => {
    setStory(pauseStory);
  }, []);

  const handleStorySpeed = useCallback(() => {
    setStory((s) => setStorySpeed(s, cycleSpeed(s.speed)));
  }, []);

  const handlePrev = useCallback(() => {
    setCurl(createCurlState);
    setSelection(selectPrevious);
    setStory(stopStory);
  }, []);

  const handleNext = useCallback(() => {
    if (isAtEnd(selection)) return;
    setCurl(createCurlState);
    setSelection(selectNext);
    setStory(stopStory);
  }, [selection]);

  const handleIndexJump = useCallback((index: number) => {
    setCurl(createCurlState);
    setSelection((s) => selectByIndex(s, index));
    setStory(stopStory);
    setView("book");
  }, []);

  const handleBranchSelect = useCallback((choiceId: string) => {
    if (!branchState) return;
    const updated = selectBranchChoice(branchState, choiceId);
    setBranchState(updated);
    const choice = branchState.choices.find((c) => c.id === choiceId);
    if (choice) {
      setSelection((s) => {
        const idx = pathMomentIds.indexOf(choice.continuationMomentId);
        return { ...s, currentMomentId: choice.continuationMomentId, pathIndex: idx >= 0 ? idx : s.pathIndex };
      });
    }
    setTimeout(() => {
      setStory((s) => resumeStory(s));
    }, 400);
  }, [branchState, pathMomentIds]);

  const handleEditOpen = useCallback(() => {
    if (!currentMoment) return;
    setEdit(openEdit(currentMoment.id, currentMoment));
    setStory(pauseStory);
  }, [currentMoment]);

  const handleEditClose = useCallback(() => {
    setEdit(closeEdit);
  }, []);

  const handleEditSave = useCallback(() => {
    const editData = getEditData(edit);
    setMoments((prev) => {
      const updated = { ...prev };
      const existing = updated[edit.momentId!];
      if (existing) {
        updated[edit.momentId!] = {
          ...existing,
          id: existing.id,
          capturedAt: existing.capturedAt,
          provenance: existing.provenance,
          title: editData.title ?? existing.title,
          body: editData.body ?? existing.body,
          primaryEmotion: editData.primaryEmotion ?? existing.primaryEmotion,
          keywords: editData.keywords ?? existing.keywords,
          link: editData.linkUrl
            ? { url: editData.linkUrl, title: editData.linkTitle ?? existing.link?.title ?? "" }
            : existing.link,
        };
      }
      return updated;
    });
    if (editData.whyNext !== undefined && edit.momentId) {
      setWhyNextOverrides((prev) => ({ ...prev, [edit.momentId!]: editData.whyNext! }));
    }
    setEdit(closeEdit);
  }, [edit]);

  const handleUpdateField = useCallback((key: string, value: string) => {
    setEdit((s) => updateEditField(s, key, value));
  }, []);

  const [isDragging, setIsDragging] = useState(false);

  const reduced = reducedMotion === true;

  const transform = useMemo(() => computeCurlTransform(curl.curlProgress), [curl.curlProgress]);

  const handlePointerDown = useCallback((clientX: number) => {
    prevDragRef.current = { x: clientX, time: Date.now() };
    setTouchStartX(clientX);
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((clientX: number) => {
    if (!bookRef.current || prevDragRef.current === null) return;
    const rect = bookRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, relX));
    setCurl((s) => updateCurlProgress(s, clamped));
  }, []);

  const handlePointerUp = useCallback(() => {
    prevDragRef.current = null;
    setTouchStartX(null);
    setIsDragging(false);
    if (shouldCommit(curl)) {
      handleNext();
    } else {
      setCurl(cancelPageTurn);
    }
  }, [curl, handleNext]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (reduced) return;
    handlePointerDown(e.clientX);
  }, [reduced, handlePointerDown]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prevDragRef.current === null) return;
    handlePointerMove(e.clientX);
  }, [handlePointerMove]);

  const handleMouseUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (reduced) { handleNext(); return; }
    const touch = e.touches[0];
    handlePointerDown(touch.clientX);
  }, [reduced, handlePointerDown, handleNext]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touch = e.touches[0];
    handlePointerMove(touch.clientX);
  }, [touchStartX, handlePointerMove]);

  const handleTouchEnd = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  const startFastFlipMode = useCallback((direction: "forward" | "backward") => {
    setCurl((s) => startFastFlip(s, direction));
    const interval = setInterval(() => {
      if (direction === "forward") {
        setSelection((s) => (hasNext(s) ? selectNext(s) : s));
      } else {
        setSelection((s) => (hasPrevious(s) ? selectPrevious(s) : s));
      }
    }, 200);
    setFastFlipTimer(interval);
  }, []);

  const stopFastFlipMode = useCallback(() => {
    if (fastFlipTimer) {
      clearInterval(fastFlipTimer);
      setFastFlipTimer(null);
    }
    setCurl(stopFastFlip);
  }, [fastFlipTimer]);

  useEffect(() => {
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
      if (fastFlipTimer) clearInterval(fastFlipTimer);
    };
  }, [fastFlipTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (edit.active) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case " ":
          e.preventDefault();
          if (branchState?.active && !branchState.resolved) break;
          if (story.playing) handleStoryPause();
          else handleStoryPlay();
          break;
        case "Escape":
          if (view !== "book") { setView("book"); return; }
          if (edit.active) { handleEditClose(); return; }
          if (branchState?.active) {
            setBranchState(null);
            setStory(resumeStory);
          }
          break;
        case "i":
        case "I":
          if (!edit.active) setView(view === "index" ? "book" : "index");
          break;
        case "e":
        case "E":
          if (!edit.active && view === "book") handleEditOpen();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, handleStoryPlay, handleStoryPause, handleEditOpen, handleEditClose, story, branchState, view, edit.active]);

  if (!currentMoment) {
    return <div className="lt59-book__empty" role="status">No moments to display</div>;
  }

  const curlStyle: CSSProperties = reduced ? {} : {
    transform: `perspective(1200px) rotateY(${-transform.frontRotation}deg)`,
    transformOrigin: "left center",
    transition: isDragging ? "none" : "transform 0.3s ease, box-shadow 0.3s ease",
    boxShadow: `4px 0 ${12 + transform.shadowOpacity * 20}px rgba(0,0,0,${0.15 + transform.shadowOpacity * 0.35})`,
  };

  const backStyle: CSSProperties = reduced ? {} : {
    transform: `perspective(1200px) rotateY(${transform.backRotation}deg)`,
    transformOrigin: "left center",
    backfaceVisibility: "hidden",
    position: "absolute" as const,
    inset: 0,
  };

  const renderPageContent = (moment: Moment) => (
    <>
      {moment.media && (
        <div className="lt59-book__page-media">
          {moment.media.type === "video" ? (
            <video
              src={moment.media.src}
              poster={moment.media.posterSrc}
              controls
              aria-label={moment.media.alt}
              className="lt59-book__media-video"
              style={{ aspectRatio: `${moment.media.width}/${moment.media.height}` }}
            />
          ) : (
            <img
              src={moment.media.src}
              alt={moment.media.alt}
              className="lt59-book__media-img"
              style={{ aspectRatio: `${moment.media.width}/${moment.media.height}` }}
              loading="lazy"
            />
          )}
        </div>
      )}
      <div className="lt59-book__page-text">
        <span className="lt59-book__emotion" style={{ "--emotion-color": getEmotionColor(moment.primaryEmotion) } as CSSProperties}>
          {moment.primaryEmotion}
        </span>
        <h2 className="lt59-book__page-title">{moment.title}</h2>
        <p className="lt59-book__page-body">{moment.body}</p>
        {moment.keywords.length > 0 && (
          <div className="lt59-book__keywords">
            {moment.keywords.map((kw) => (
              <span key={kw} className="lt59-book__keyword">{kw}</span>
            ))}
          </div>
        )}
        {moment.link && (
          <a href={moment.link.url} className="lt59-book__link" target="_blank" rel="noopener noreferrer">
            {moment.link.title}
          </a>
        )}
      </div>
    </>
  );

  const renderOverlay = (role: string, label: string, children: React.ReactNode, onClose?: () => void) => (
    <div
      className="lt59-overlay"
      role={role}
      aria-modal="true"
      aria-label={label}
      onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}
    >
      <div className="lt59-overlay__backdrop" onClick={onClose} />
      <div className="lt59-overlay__panel">
        {onClose && (
          <button type="button" className="lt59-overlay__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return (
    <div
      ref={bookRef}
      className={`lt59-book${reduced ? " is-reduced-motion" : ""}${view !== "book" ? " has-overlay" : ""}`}
      data-viewport="desktop"
      role="application"
      aria-label="Living Memory Book"
      aria-live="polite"
    >
      <div className="lt59-book__env" aria-hidden="true" />

      <header className="lt59-book__toolbar" role="toolbar" aria-label="Book controls">
        <div className="lt59-book__toolbar-left">
          <span className="lt59-book__page-num">{selection.pathIndex + 1} / {pathMomentIds.length}</span>
          <button type="button" onClick={() => setView("index")} aria-label="Open index" className="lt59-book__tool-btn">
            Index
          </button>
        </div>
        <div className="lt59-book__toolbar-center">
          <span className="lt59-book__ds-label">{DATA_SETS[dataSetKey].label}</span>
          <select
            className="lt59-book__ds-select"
            value={dataSetKey}
            onChange={(e) => switchDataSet(e.target.value as DataSetKey)}
            aria-label="Select data variant"
          >
            {Object.entries(DATA_SETS).map(([key, ds]) => (
              <option key={key} value={key}>{ds.label}</option>
            ))}
          </select>
        </div>
        <div className="lt59-book__toolbar-right">
          {!story.playing && story.phase !== "holding" && (
            <button type="button" className="lt59-book__tool-btn is-story" onClick={handleStoryPlay} aria-label={story.phase === "ended" ? "Replay Story" : story.paused ? "Resume Story" : "Play Story"}>
              {story.phase === "ended" ? "Replay" : story.paused ? "Resume" : "Story ON"}
            </button>
          )}
          {story.playing && !story.paused && story.phase !== "ended" && story.phase !== "branch-pause" && (
            <button type="button" className="lt59-book__tool-btn" onClick={handleStoryPause} aria-label="Pause Story">
              Pause
            </button>
          )}
          <button type="button" className="lt59-book__tool-btn" onClick={handleStorySpeed} aria-label={`Speed ${story.speed}×`}>
            {story.speed}×
          </button>
          {view === "book" && !edit.active && (
            <button type="button" className="lt59-book__tool-btn" onClick={handleEditOpen} aria-label="Edit moment">
              Edit
            </button>
          )}
        </div>
      </header>

      {story.phase !== "idle" && story.phase !== "ended" && (
        <div className="lt59-book__story-status" role="status" aria-live="assertive">
          {story.phase === "holding" && <span>Reading moment...</span>}
          {story.phase === "why-next" && currentWhyNext && <span className="lt59-book__why-next-display">WHY NEXT: {currentWhyNext}</span>}
          {story.phase === "page-turn" && <span>Turning page...</span>}
          {story.phase === "landing" && <span>Arriving...</span>}
          {story.phase === "branch-pause" && <span>Branch reached — make a choice</span>}
        </div>
      )}
      {story.phase === "ended" && (
        <div className="lt59-book__story-status is-end" role="status" aria-live="assertive">
          <span>Story complete — all moments visited</span>
        </div>
      )}

      <div className="lt59-book__spread">
        <div
          className="lt59-book__page"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={curlStyle}
        >
          <div className="lt59-book__page-front">
            {renderPageContent(currentMoment)}
            {!reduced && curl.curlProgress > 0 && (
              <div className="lt59-book__curl-shadow" style={{ opacity: transform.shadowOpacity }} />
            )}
          </div>
          {!reduced && curl.curlProgress > 0 && (
            <div className="lt59-book__page-back" style={backStyle}>
              <div className="lt59-book__page-back-inner" />
            </div>
          )}
        </div>

        {!reduced && curl.curlProgress > 0.3 && hasNext(selection) && (
          <div className="lt59-book__next-pre-reveal" style={{ opacity: transform.nextPageReveal }}>
            {(() => {
              const nextId = pathMomentIds[selection.pathIndex + 1];
              const nextM = nextId ? moments[nextId] : null;
              return nextM ? (
                <div className="lt59-book__next-teaser">
                  {nextM.media && (
                    <img src={nextM.media.src} alt="" className="lt59-book__next-teaser-media" />
                  )}
                  <span className="lt59-book__next-teaser-title">{nextM.title}</span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        <div className="lt59-book__binding" aria-hidden="true" />
      </div>

      <div className="lt59-book__nav" role="group" aria-label="Page navigation">
        <button type="button" className="lt59-book__nav-btn" onClick={handlePrev} disabled={!hasPrevious(selection)} aria-label="Previous page">
          ◀ Prev
        </button>
        {!reduced && (
          <>
            <button
              type="button"
              className="lt59-book__nav-btn lt59-book__fast-flip"
              onMouseDown={() => startFastFlipMode("backward")}
              onMouseUp={stopFastFlipMode}
              onMouseLeave={stopFastFlipMode}
              onTouchStart={() => startFastFlipMode("backward")}
              onTouchEnd={stopFastFlipMode}
              aria-label="Fast flip backward"
            >
              ◀◀
            </button>
            <button
              type="button"
              className="lt59-book__nav-btn lt59-book__fast-flip"
              onMouseDown={() => startFastFlipMode("forward")}
              onMouseUp={stopFastFlipMode}
              onMouseLeave={stopFastFlipMode}
              onTouchStart={() => startFastFlipMode("forward")}
              onTouchEnd={stopFastFlipMode}
              aria-label="Fast flip forward"
            >
              ▶▶
            </button>
          </>
        )}
        <button type="button" className="lt59-book__nav-btn" onClick={handleNext} disabled={!hasNext(selection)} aria-label="Next page">
          Next ▶
        </button>
      </div>

      <div className="lt59-book__why-next" aria-label="Connection">
        {currentWhyNext && <span className="lt59-book__why-next-text">“{currentWhyNext}”</span>}
      </div>

      {branchState?.active && !branchState.resolved && renderOverlay(
        "dialog",
        "Branch choice",
        <div className="lt59-branch">
          <h2 className="lt59-branch__title">Choose your path</h2>
          <p className="lt59-branch__desc">The story branches here. Your choice determines what comes next.</p>
          <div className="lt59-branch__choices">
            {branchState.choices.map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                className="lt59-branch__choice"
                onClick={() => handleBranchSelect(choice.id)}
                aria-label={`Choice ${i + 1}: ${choice.label}`}
                autoFocus={i === 0}
              >
                <strong>{choice.label}</strong>
                <span>{choice.description}</span>
              </button>
            ))}
          </div>
        </div>,
        undefined,
      )}

      {branchState?.resolved && (
        <div className="lt59-branch__resolved" role="status" aria-live="assertive">
          Continuing your chosen path...
        </div>
      )}

      {edit.active && renderOverlay(
        "dialog",
        "Edit moment",
        <div className="lt59-edit">
          <h2 className="lt59-edit__title">Edit Moment</h2>
          <div className="lt59-edit__fields">
            {edit.fields.map((field) => (
              <label key={field.key} className="lt59-edit__field">
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea value={field.value} onChange={(e) => handleUpdateField(field.key, e.target.value)} rows={3} />
                ) : (
                  <input type={field.type === "url" ? "url" : "text"} value={field.value} onChange={(e) => handleUpdateField(field.key, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <div className="lt59-edit__actions">
            <button type="button" className="lt59-edit__btn is-primary" onClick={handleEditSave} disabled={!edit.dirty}>
              Save
            </button>
            <button type="button" className="lt59-edit__btn" onClick={handleEditClose}>
              Cancel
            </button>
          </div>
        </div>,
        handleEditClose,
      )}

      {view === "index" && renderOverlay(
        "dialog",
        "Moment Index",
        <div className="lt59-index">
          <h2 className="lt59-index__title">Memory Path Index</h2>
          <div className="lt59-index__list" role="list" aria-label="Moment list">
            {pathMomentIds.map((id, i) => {
              const m = moments[id];
              if (!m) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={`lt59-index__item${i === selection.pathIndex ? " is-current" : ""}`}
                  onClick={() => handleIndexJump(i)}
                  role="listitem"
                  aria-current={i === selection.pathIndex ? "true" : undefined}
                >
                  <span className="lt59-index__num">{i + 1}</span>
                  <div className="lt59-index__content">
                    <strong>{m.title}</strong>
                    <span className="lt59-index__emotion">{m.primaryEmotion}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>,
        () => setView("book"),
      )}

      {view === "detail" && currentMoment && renderOverlay(
        "dialog",
        "Moment Detail",
        <div className="lt59-detail">
          <h2 className="lt59-detail__title">{currentMoment.title}</h2>
          {currentMoment.media && (
            <div className="lt59-detail__media">
              {currentMoment.media.type === "video" ? (
                <video src={currentMoment.media.src} poster={currentMoment.media.posterSrc} controls aria-label={currentMoment.media.alt} style={{ maxWidth: "100%", maxHeight: "50vh" }} />
              ) : (
                <img src={currentMoment.media.src} alt={currentMoment.media.alt} style={{ maxWidth: "100%", maxHeight: "50vh" }} onClick={() => setView("magnifier")} className="lt59-detail__media-img" />
              )}
            </div>
          )}
          <div className="lt59-detail__body">
            <span className="lt59-detail__emotion">{currentMoment.primaryEmotion}</span>
            <p>{currentMoment.body}</p>
            <div className="lt59-detail__meta">
              <span>Captured: {new Date(currentMoment.capturedAt).toLocaleString()}</span>
              {currentMoment.keywords.length > 0 && (
                <div className="lt59-detail__keywords">
                  {currentMoment.keywords.map((kw) => <span key={kw} className="lt59-detail__keyword">{kw}</span>)}
                </div>
              )}
              {currentMoment.link && (
                <a href={currentMoment.link.url} target="_blank" rel="noopener noreferrer">{currentMoment.link.title}</a>
              )}
            </div>
          </div>
        </div>,
        () => setView("book"),
      )}

      {view === "magnifier" && currentMoment?.media && renderOverlay(
        "dialog",
        "Magnifier View",
        <div className="lt59-magnifier">
          <h2 className="lt59-magnifier__title">Magnifier</h2>
          <div className="lt59-magnifier__frame">
            {currentMoment.media.type === "photo" ? (
              <img src={currentMoment.media.src} alt={currentMoment.media.alt} className="lt59-magnifier__img" />
            ) : null}
          </div>
          <div className="lt59-magnifier__controls">
            <button type="button" className="lt59-magnifier__btn" onClick={() => setView("book")} aria-label="Close magnifier">
              Close
            </button>
          </div>
        </div>,
        () => setView("book"),
      )}

      {reduced && (
        <div className="lt59-book__reduced-notice" role="status">
          <span>Reduced motion active — page navigation uses buttons only</span>
        </div>
      )}
    </div>
  );
}

function getEmotionColor(emotion: string): string {
  const palette: Record<string, string> = {
    궁금함: "#38E8FF",
    호기심: "#418CFF",
    매력: "#8B5CFF",
    설렘: "#FF4FA3",
    놀람: "#FFD36A",
    몰입: "#A56BFF",
    회상: "#FFB347",
    wonder: "#7B68EE",
    nostalgia: "#DDA0DD",
  };
  return palette[emotion] ?? "#FFD36A";
}