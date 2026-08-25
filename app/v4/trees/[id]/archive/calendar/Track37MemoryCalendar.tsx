"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import { isSafeExternalUrl, sourceTypeLabel } from "@/lib/tree-types";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  track37AdjacentDateKey,
  track37DateLabel,
  track37FlattenDays,
  track37ProjectCalendar,
} from "@/lib/source-track-37/memory-calendar";
import styles from "./track37-memory-calendar.module.css";

const SWIPE_THRESHOLD = 56;

function MemoryPreview({ moment }: { moment: AlbumMomentView }) {
  return (
    <article className={styles.memory} data-testid={`calendar-memory-${moment.id}`}>
      {moment.thumbnail ? (
        <img className={styles.thumbnail} src={moment.thumbnail} alt="" />
      ) : (
        <div className={styles.thumbnailFallback} aria-hidden="true">MEMORY</div>
      )}
      <div className={styles.memoryCopy}>
        <span className={styles.source}>{sourceTypeLabel(moment.sourceType)}</span>
        <h3>{moment.title || "제목 없는 Moment"}</h3>
        {moment.memo ? <p>{moment.memo}</p> : null}
        <div className={styles.memoryActions}>
          <Link href={`/trees/${encodeURIComponent(moment.treeId)}?moment=${encodeURIComponent(moment.id)}`}>
            Moment 보기
          </Link>
          {isSafeExternalUrl(moment.sourceUrl) ? (
            <a href={moment.sourceUrl} target="_blank" rel="noreferrer">원본 열기</a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function Track37MemoryCalendar({ treeId }: { treeId: string }) {
  const { tree, albumMoments, loading, error } = useTreeMoments(treeId);
  const months = useMemo(() => track37ProjectCalendar(albumMoments), [albumMoments]);
  const days = useMemo(() => track37FlattenDays(months), [months]);
  const indexedMomentCount = useMemo(
    () => months.reduce((count, month) => count + month.momentCount, 0),
    [months],
  );
  const excludedUndatedCount = Math.max(0, albumMoments.length - indexedMomentCount);
  const [requestedDateKey, setRequestedDateKey] = useState<string | null>(null);
  const [turnDirection, setTurnDirection] = useState<"previous" | "next" | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);

  const activeDateKey = useMemo(() => {
    if (days.length === 0) return null;
    if (requestedDateKey && days.some((day) => day.key === requestedDateKey)) return requestedDateKey;
    return days[days.length - 1].key;
  }, [days, requestedDateKey]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const activeDay = useMemo(
    () => days.find((day) => day.key === activeDateKey) ?? null,
    [activeDateKey, days],
  );
  const activeMonth = useMemo(
    () => months.find((month) => activeDateKey?.startsWith(month.key)) ?? months[months.length - 1] ?? null,
    [activeDateKey, months],
  );

  const selectDate = useCallback((key: string, direction?: "previous" | "next") => {
    if (key === activeDateKey) return;
    setTurnDirection(reducedMotion ? null : direction ?? "next");
    setRequestedDateKey(key);
    if (!reducedMotion) window.setTimeout(() => setTurnDirection(null), 420);
  }, [activeDateKey, reducedMotion]);

  const moveDate = useCallback((direction: -1 | 1) => {
    const next = track37AdjacentDateKey(days, activeDateKey, direction);
    if (next && next !== activeDateKey) selectDate(next, direction < 0 ? "previous" : "next");
  }, [activeDateKey, days, selectDate]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveDate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveDate(1);
    }
  }, [moveDate]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartX.current = event.clientX;
    pointerStartY.current = event.clientY;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic QA pointers and older touch engines can lack an active capture target.
    }
  }, []);

  const clearPointer = useCallback(() => {
    pointerStartX.current = null;
    pointerStartY.current = null;
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const startX = pointerStartX.current;
    const startY = pointerStartY.current;
    clearPointer();
    if (startX === null || startY === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    moveDate(dx < 0 ? 1 : -1);
  }, [clearPointer, moveDate]);

  if (loading) {
    return <main className={styles.state}><p>기억 달력을 불러오는 중입니다.</p></main>;
  }
  if (error) {
    return (
      <main className={styles.state}>
        <h1>Memory Calendar</h1>
        <p role="alert">{error}</p>
        <Link href={`/trees/${encodeURIComponent(treeId)}`}>Tree로 돌아가기</Link>
      </main>
    );
  }
  if (days.length === 0 || !activeDay || !activeMonth) {
    return (
      <main className={styles.state} data-track37-native="archive-calendar">
        <h1>{tree?.title || "Memory Calendar"}</h1>
        <p>저장된 날짜가 있는 Moment가 아직 없습니다.</p>
        <p className={styles.truthNote}>달력은 Moment의 discoveryDate 또는 timestamp만 사용하며 날짜를 임의 생성하지 않습니다.</p>
        <Link href={`/trees/${encodeURIComponent(treeId)}`}>Tree로 돌아가기</Link>
      </main>
    );
  }

  const activeIndex = days.findIndex((day) => day.key === activeDay.key);
  const canPrevious = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < days.length - 1;

  return (
    <main
      className={styles.page}
      data-track37-native="archive-calendar"
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <header className={styles.topbar}>
        <Link href={`/trees/${encodeURIComponent(treeId)}`} className={styles.back}>← Tree</Link>
        <div>
          <p className={styles.eyebrow}>TRACK37 · ARCHIVE DONOR</p>
          <h1>{tree?.title || "Memory Calendar"}</h1>
        </div>
        <p className={styles.truthBadge}>Stored dates only</p>
      </header>

      <section className={styles.layout} aria-label="저장된 날짜별 Memory Archive">
        <aside className={styles.indexPanel}>
          <div className={styles.indexHeading}>
            <span>DATE INDEX</span>
            <strong>{days.length} days · {indexedMomentCount} dated Moments</strong>
          </div>
          <div className={styles.months} aria-label="기억 월 선택">
            {months.map((month) => (
              <button
                key={month.key}
                type="button"
                className={`${styles.monthButton}${month.key === activeMonth.key ? ` ${styles.activeMonth}` : ""}`}
                onClick={() => selectDate(month.days[month.days.length - 1].key)}
                aria-pressed={month.key === activeMonth.key}
              >
                <span>{month.year}.{String(month.month).padStart(2, "0")}</span>
                <small>{month.momentCount} memories</small>
              </button>
            ))}
          </div>
          <div className={styles.days} aria-label={`${activeMonth.year}년 ${activeMonth.month}월 저장 날짜`}>
            {activeMonth.days.map((day) => (
              <button
                key={day.key}
                type="button"
                className={`${styles.dayButton}${day.key === activeDay.key ? ` ${styles.activeDay}` : ""}`}
                onClick={() => selectDate(day.key, day.key < activeDay.key ? "previous" : "next")}
                aria-current={day.key === activeDay.key ? "date" : undefined}
              >
                <strong>{String(day.day).padStart(2, "0")}</strong>
                <span>{day.moments.length}</span>
              </button>
            ))}
          </div>
          <p className={styles.truthNote}>
            없는 날짜, 기념일, 재방문일, 중요도일, Season 날짜는 생성하지 않습니다.
            {excludedUndatedCount > 0 ? ` 명시적 저장 날짜가 없는 ${excludedUndatedCount}개 Moment는 달력에서 제외했습니다.` : ""}
          </p>
        </aside>

        <section className={styles.padStage} aria-live="polite">
          <div className={styles.padShadow} aria-hidden="true" />
          <div className={styles.padStack} aria-hidden="true" />
          <article
            className={`${styles.pad}${turnDirection ? ` ${styles[turnDirection]}` : ""}`}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={clearPointer}
            data-testid="track37-active-pad"
          >
            <div className={styles.binding} aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <header className={styles.padHeader}>
              <div>
                <span>ARCHIVED DATE</span>
                <strong>{track37DateLabel(activeDay.key)}</strong>
              </div>
              <b>{String(activeDay.day).padStart(2, "0")}</b>
            </header>
            <div className={styles.padBody}>
              <div className={styles.dateMeta}>
                <span>{activeDay.moments.length} Moment{activeDay.moments.length === 1 ? "" : "s"}</span>
                <span>{activeIndex + 1} / {days.length} stored days</span>
              </div>
              <div className={styles.memoryList}>
                {activeDay.moments.map((moment) => <MemoryPreview key={moment.id} moment={moment} />)}
              </div>
            </div>
            <footer className={styles.padFooter}>
              <button type="button" onClick={() => moveDate(-1)} disabled={!canPrevious}>← 이전 저장일</button>
              <span>좌우 스와이프 · ← → 키</span>
              <button type="button" onClick={() => moveDate(1)} disabled={!canNext}>다음 저장일 →</button>
            </footer>
          </article>
        </section>
      </section>
    </main>
  );
}
