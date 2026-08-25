"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { AlbumMomentView, CanonicalMoment } from "@/lib/moment-model";
import {
  SOURCE_58_BOARD_THEMES,
  SOURCE_TRACK_58_STAGING,
  source58BoardSlot,
  source58SafeExternalUrl,
  source58YouTubeEmbedUrl,
  type Source58BoardTheme,
} from "@/lib/source-track-58-living-memory-pinboard";
import { useTreeMoments } from "@/lib/use-tree-moments";
import styles from "./source-track-58-living-memory-board.module.css";

type BoardMoment = CanonicalMoment & { album: AlbumMomentView };

type BoardPoint = ReturnType<typeof source58BoardSlot>;

function formatMomentDate(moment: BoardMoment) {
  const value = moment.discoveryDate || moment.timestamp || moment.createdAt;
  if (!value) return "날짜 미정";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replaceAll("-", ".");
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function sourceTypeLabel(sourceType: string) {
  const normalized = sourceType.toLowerCase();
  if (normalized.includes("youtube")) return "YOUTUBE";
  if (normalized.includes("video")) return "VIDEO";
  if (normalized.includes("song")) return "SONG";
  if (normalized.includes("book")) return "BOOK";
  if (normalized.includes("travel")) return "TRAVEL";
  return sourceType ? sourceType.toUpperCase() : "MOMENT";
}

function threadPath(from: BoardPoint, to: BoardPoint) {
  const x1 = from.x + 9;
  const y1 = from.y + 10;
  const x2 = to.x + 9;
  const y2 = to.y + 10;
  const bend = Math.max(4, Math.min(15, Math.abs(x2 - x1) * 0.24));
  const direction = x2 >= x1 ? 1 : -1;
  return `M ${x1} ${y1} C ${x1 + bend * direction} ${y1 + 3}, ${x2 - bend * direction} ${y2 - 3}, ${x2} ${y2}`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export default function SourceTrack58LivingMemoryBoard({ treeId }: { treeId: string }) {
  const {
    tree,
    canonicalMoments,
    albumMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectMoment,
    updateMoment,
    refresh,
  } = useTreeMoments(treeId);
  const reducedMotion = useReducedMotion();
  const [theme, setTheme] = useState<Source58BoardTheme>("pearl");
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [cinemaIndex, setCinemaIndex] = useState(0);
  const [cinemaPlaying, setCinemaPlaying] = useState(false);
  const [embedRequested, setEmbedRequested] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  const moments = useMemo<BoardMoment[]>(() => {
    const canonicalById = new Map(canonicalMoments.map((moment) => [moment.id, moment]));
    return albumMoments.flatMap((album) => {
      const canonical = canonicalById.get(album.id);
      return canonical ? [{ ...canonical, album }] : [];
    });
  }, [albumMoments, canonicalMoments]);

  const momentById = useMemo(() => new Map(moments.map((moment) => [moment.id, moment])), [moments]);
  const slotById = useMemo(
    () => new Map(moments.map((moment, index) => [moment.id, source58BoardSlot(index)])),
    [moments],
  );
  const selected = selectedMomentId ? momentById.get(selectedMomentId) ?? null : null;
  const selectedIndex = selected ? moments.findIndex((moment) => moment.id === selected.id) : -1;

  const children = useMemo(() => {
    if (!selected) return [];
    return moments.filter((moment) => moment.parentId === selected.id);
  }, [moments, selected]);

  const parent = selected?.parentId ? momentById.get(selected.parentId) ?? null : null;

  const connections = useMemo(
    () =>
      moments.flatMap((moment) => {
        if (!moment.parentId) return [];
        const parentMoment = momentById.get(moment.parentId);
        const from = parentMoment ? slotById.get(parentMoment.id) : null;
        const to = slotById.get(moment.id);
        return from && to ? [{ id: `${moment.parentId}->${moment.id}`, from, to }] : [];
      }),
    [momentById, moments, slotById],
  );

  useEffect(() => {
    if (!selectedMomentId && moments[0]) selectMoment(moments[0].id);
  }, [moments, selectMoment, selectedMomentId]);

  useEffect(() => {
    if (!selected) return;
    setDraftTitle(selected.title);
    setDraftMemo(selected.memo);
    setEditOpen(false);
    setSaveState("idle");
  }, [selected?.id, selected?.memo, selected?.title]);

  useEffect(() => {
    setEmbedRequested(false);
  }, [cinemaIndex]);

  useEffect(() => {
    if (reducedMotion) setCinemaPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!cinemaOpen || !cinemaPlaying || reducedMotion || moments.length < 2) return;
    const timer = window.setInterval(() => {
      setCinemaIndex((current) => (current + 1) % moments.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [cinemaOpen, cinemaPlaying, moments.length, reducedMotion]);

  useEffect(() => {
    if (!cinemaOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCinemaOpen(false);
        const active = moments[cinemaIndex];
        if (active) selectMoment(active.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cinemaIndex, cinemaOpen, moments, selectMoment]);

  const chooseMoment = useCallback(
    (id: string, moveFocus = false) => {
      selectMoment(id);
      if (moveFocus) window.requestAnimationFrame(() => cardRefs.current.get(id)?.focus());
    },
    [selectMoment],
  );

  const chooseRelativeMoment = useCallback(
    (direction: -1 | 1) => {
      if (moments.length === 0) return;
      const current = selectedIndex >= 0 ? selectedIndex : 0;
      const next = (current + direction + moments.length) % moments.length;
      chooseMoment(moments[next].id, true);
    },
    [chooseMoment, moments, selectedIndex],
  );

  const onBoardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      chooseRelativeMoment(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      chooseRelativeMoment(-1);
    }
  };

  const openCinema = (startId?: string) => {
    const start = startId ? moments.findIndex((moment) => moment.id === startId) : selectedIndex;
    setCinemaIndex(start >= 0 ? start : 0);
    setCinemaPlaying(!reducedMotion);
    setEmbedRequested(false);
    setCinemaOpen(true);
  };

  const exitCinema = () => {
    const active = moments[cinemaIndex];
    if (active) selectMoment(active.id);
    setCinemaPlaying(false);
    setCinemaOpen(false);
    window.requestAnimationFrame(() => active && cardRefs.current.get(active.id)?.focus());
  };

  const saveMoment = async () => {
    if (!selected || !isOwner || saveState === "saving") return;
    setSaveState("saving");
    const updated = await updateMoment(selected.id, { title: draftTitle, memo: draftMemo });
    setSaveState(updated ? "saved" : "error");
    if (updated) setEditOpen(false);
  };

  if (!treeId) {
    return (
      <main className={styles.shell} data-source-track="58" data-reduced-motion={String(reducedMotion)}>
        <section className={styles.gate} aria-labelledby="source58-gate-heading">
          <p className={styles.eyebrow}>SOURCE 58 · NATIVE STAGING</p>
          <h1 id="source58-gate-heading">Living Memory Pinboard</h1>
          <p>
            이 staging route는 샘플 Moment를 만들지 않습니다. 실제 Tree의 canonical Moment / Connection을 보려면 URL에
            <code>?treeId=&lt;tree-id&gt;</code>를 지정하세요.
          </p>
          <dl className={styles.gateMeta}>
            <div><dt>Source</dt><dd>{SOURCE_TRACK_58_STAGING.stableId}</dd></div>
            <div><dt>Revision</dt><dd>{SOURCE_TRACK_58_STAGING.revision}</dd></div>
            <div><dt>Persistence</dt><dd>Board / theme / cinema = VIEW_DERIVED</dd></div>
          </dl>
        </section>
      </main>
    );
  }

  return (
    <main
      className={styles.shell}
      data-source-track="58"
      data-reduced-motion={String(reducedMotion)}
      data-theme={theme}
    >
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LOVETREE · SOURCE 58 NATIVE CANDIDATE</p>
          <h1>Living Memory Pinboard</h1>
          <p className={styles.subtitle}>{tree?.title || "MYTREE canonical workspace"}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()} disabled={loading}>
            {loading ? "LOADING" : "REFRESH"}
          </button>
          <button type="button" className={styles.cinemaButton} onClick={() => openCinema()} disabled={moments.length === 0}>
            CINEMA REPLAY
          </button>
        </div>
      </header>

      <section className={styles.truthStrip} aria-label="데이터 권위">
        <strong>CANONICAL TRUTH</strong>
        <span>Moment · parentId / connectionReason · sourceType / sourceUrl / thumbnail</span>
        <span>Board position · theme · selection · cinema = VIEW_DERIVED</span>
        <span>새 DB / API / Auth / schema 없음</span>
      </section>

      {error ? (
        <section className={styles.statusCard} role="alert">
          <strong>Canonical Tree를 불러오지 못했습니다.</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()}>다시 시도</button>
        </section>
      ) : null}

      {!error && loading ? <section className={styles.statusCard} aria-live="polite">Moment board를 불러오는 중…</section> : null}

      {!error && !loading ? (
        <div className={styles.workspace}>
          <section className={styles.boardSection} aria-label="Living Memory Board">
            <div className={styles.boardChrome}>
              <div
                className={styles.board}
                data-testid="source58-board"
                onKeyDown={onBoardKeyDown}
                tabIndex={0}
                aria-label="Moment 핀보드. 방향키로 Moment를 이동할 수 있습니다."
              >
                <div className={styles.boardTexture} aria-hidden="true" />
                <svg className={styles.thread} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Canonical Connection living thread">
                  {connections.map((connection) => (
                    <g key={connection.id}>
                      <path className={styles.threadShadow} d={threadPath(connection.from, connection.to)} />
                      <path className={styles.threadMain} d={threadPath(connection.from, connection.to)} />
                    </g>
                  ))}
                </svg>

                {moments.length === 0 ? (
                  <div className={styles.emptyBoard}>
                    <span className={styles.emptyPin} aria-hidden="true" />
                    <h2>아직 pinned Moment가 없습니다.</h2>
                    <p>이 화면은 Source58 demo card를 대신 만들지 않습니다.</p>
                  </div>
                ) : null}

                {moments.map((moment, index) => {
                  const slot = slotById.get(moment.id) ?? source58BoardSlot(index);
                  const selectedCard = selected?.id === moment.id;
                  return (
                    <button
                      key={moment.id}
                      ref={(node) => {
                        if (node) cardRefs.current.set(moment.id, node);
                        else cardRefs.current.delete(moment.id);
                      }}
                      type="button"
                      className={styles.card}
                      data-card-style={slot.style}
                      data-selected={String(selectedCard)}
                      aria-pressed={selectedCard}
                      aria-label={`${moment.title || "제목 없는 Moment"} 선택`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        "--card-rotate": `${slot.rotate}deg`,
                      } as React.CSSProperties}
                      onClick={() => chooseMoment(moment.id)}
                      onDoubleClick={() => openCinema(moment.id)}
                    >
                      <span className={styles.pin} data-pin={index % 6} aria-hidden="true" />
                      {moment.album.thumbnail ? (
                        <span className={styles.cardMedia}>
                          {/* Canonical thumbnail URLs are runtime data; a native img avoids inventing an image proxy contract. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={moment.album.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        </span>
                      ) : (
                        <span className={styles.mediaFallback}>{sourceTypeLabel(moment.sourceType)}</span>
                      )}
                      <span className={styles.cardType}>{sourceTypeLabel(moment.sourceType)}</span>
                      <strong>{moment.title || "제목 없는 Moment"}</strong>
                      <span className={styles.cardDate}>{formatMomentDate(moment)}</span>
                      {moment.connectionReason ? <span className={styles.cardReason}>{moment.connectionReason}</span> : null}
                    </button>
                  );
                })}
              </div>

              <nav className={styles.themeRail} aria-label="Board theme">
                <span>BOARD THEME · LOCAL VIEW</span>
                <div>
                  {SOURCE_58_BOARD_THEMES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={theme === item.id}
                      onClick={() => setTheme(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </section>

          <aside className={styles.inspector} aria-label="Selected Moment inspector">
            {selected ? (
              <>
                <div className={styles.inspectorTopline}>
                  <span>SELECTED MOMENT</span>
                  <span>{selectedIndex + 1} / {moments.length}</span>
                </div>

                {selected.album.thumbnail ? (
                  <div className={styles.inspectorMedia}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.album.thumbnail} alt="" referrerPolicy="no-referrer" />
                    <button type="button" onClick={() => openCinema(selected.id)}>REPLAY IN CINEMA</button>
                  </div>
                ) : null}

                {!editOpen ? (
                  <div className={styles.momentCopy}>
                    <p className={styles.momentSource}>{sourceTypeLabel(selected.sourceType)} · {formatMomentDate(selected)}</p>
                    <h2>{selected.title || "제목 없는 Moment"}</h2>
                    <p>{selected.memo || "메모가 없습니다."}</p>
                    <button type="button" className={styles.editButton} onClick={() => setEditOpen(true)} disabled={!isOwner}>
                      {isOwner ? "EDIT CANONICAL MOMENT" : "READ ONLY · OWNER EDIT"}
                    </button>
                  </div>
                ) : (
                  <form
                    className={styles.editForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveMoment();
                    }}
                  >
                    <label>
                      TITLE
                      <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={160} />
                    </label>
                    <label>
                      MEMO
                      <textarea value={draftMemo} onChange={(event) => setDraftMemo(event.target.value)} rows={5} />
                    </label>
                    <div className={styles.editActions}>
                      <button type="button" onClick={() => setEditOpen(false)}>CANCEL</button>
                      <button type="submit" disabled={saveState === "saving"}>{saveState === "saving" ? "SAVING…" : "SAVE"}</button>
                    </div>
                    {saveState === "error" ? <p role="alert">Canonical Moment 저장에 실패했습니다.</p> : null}
                  </form>
                )}

                <section className={styles.connectionPanel} aria-labelledby="source58-why-next">
                  <div className={styles.connectionHeading}>
                    <span>CONNECTION</span>
                    <strong id="source58-why-next">WHY NEXT</strong>
                  </div>
                  {selected.parentId ? (
                    <div className={styles.incomingConnection}>
                      <small>이 Moment가 이어진 이유</small>
                      <p>{selected.connectionReason || "connectionReason이 비어 있습니다."}</p>
                      {parent ? <button type="button" onClick={() => chooseMoment(parent.id, true)}>← {parent.title || "이전 Moment"}</button> : null}
                    </div>
                  ) : (
                    <p className={styles.rootMoment}>ROOT MOMENT · parentId 없음</p>
                  )}

                  <div className={styles.nextChoices}>
                    <small>{children.length > 1 ? `NEXT MOMENT · ${children.length} CHOICES` : "NEXT MOMENT"}</small>
                    {children.length > 0 ? (
                      children.map((child) => (
                        <button key={child.id} type="button" onClick={() => chooseMoment(child.id, true)}>
                          <span>{child.title || "제목 없는 Moment"}</span>
                          <em>{child.connectionReason || "WHY NEXT 미기록"}</em>
                        </button>
                      ))
                    ) : moments.length > 1 ? (
                      <button type="button" onClick={() => chooseRelativeMoment(1)}>
                        <span>시간 순서의 다음 Moment</span>
                        <em>직접 child Connection 없음</em>
                      </button>
                    ) : (
                      <p>연결된 다음 Moment가 없습니다.</p>
                    )}
                  </div>
                </section>

                {source58SafeExternalUrl(selected.sourceUrl) ? (
                  <a className={styles.sourceLink} href={selected.sourceUrl} target="_blank" rel="noreferrer">OPEN CANONICAL MEDIA SOURCE ↗</a>
                ) : null}
              </>
            ) : (
              <div className={styles.noSelection}><h2>Select a Moment</h2><p>핀보드의 카드를 선택하세요.</p></div>
            )}
          </aside>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <span>{SOURCE_TRACK_58_STAGING.revision}</span>
        <span>Source SHA256 · {SOURCE_TRACK_58_STAGING.sha256.slice(0, 12)}…</span>
        <span>STAGING ONLY · NOT LINEAGE 58</span>
      </footer>

      {cinemaOpen && moments.length > 0 ? (
        <CinemaReplay
          moments={moments}
          index={Math.min(cinemaIndex, moments.length - 1)}
          playing={cinemaPlaying}
          reducedMotion={reducedMotion}
          embedRequested={embedRequested}
          onIndex={(index) => setCinemaIndex(index)}
          onPlaying={(playing) => setCinemaPlaying(playing)}
          onEmbedRequested={setEmbedRequested}
          onExit={exitCinema}
        />
      ) : null}
    </main>
  );
}

function CinemaReplay({
  moments,
  index,
  playing,
  reducedMotion,
  embedRequested,
  onIndex,
  onPlaying,
  onEmbedRequested,
  onExit,
}: {
  moments: BoardMoment[];
  index: number;
  playing: boolean;
  reducedMotion: boolean;
  embedRequested: boolean;
  onIndex: (index: number) => void;
  onPlaying: (playing: boolean) => void;
  onEmbedRequested: (requested: boolean) => void;
  onExit: () => void;
}) {
  const moment = moments[index];
  const embedUrl = source58YouTubeEmbedUrl(moment.sourceUrl, moment.videoOffsetSeconds ?? 0);
  const sourceUrl = source58SafeExternalUrl(moment.sourceUrl);
  const progress = moments.length <= 1 ? 100 : (index / (moments.length - 1)) * 100;

  return (
    <div className={styles.cinema} role="dialog" aria-modal="true" aria-labelledby="source58-cinema-heading">
      <div className={styles.cinemaAmbient} aria-hidden="true" />
      <header className={styles.cinemaHeader}>
        <div>
          <p>LOVETREE · LIVING MEMORY</p>
          <h2 id="source58-cinema-heading">Cinema Replay — Moments</h2>
        </div>
        <button type="button" onClick={onExit}>BOARD ↗</button>
      </header>

      <div className={styles.cinemaProgress} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

      <section className={styles.cinemaStage} aria-live="polite">
        <div className={styles.cinemaMedia}>
          {embedRequested && embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${moment.title || "Moment"} YouTube player`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : moment.album.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={moment.album.thumbnail} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.cinemaMediaFallback}>{sourceTypeLabel(moment.sourceType)}</div>
          )}
          {embedUrl && !embedRequested ? (
            <button className={styles.playOverlay} type="button" onClick={() => onEmbedRequested(true)}>PLAY CANONICAL YOUTUBE</button>
          ) : null}
        </div>
        <div className={styles.cinemaCopy}>
          <p>{String(index + 1).padStart(2, "0")} / {String(moments.length).padStart(2, "0")} · {formatMomentDate(moment)}</p>
          <h3>{moment.title || "제목 없는 Moment"}</h3>
          <blockquote>{moment.memo || moment.connectionReason || "기록된 메모가 없습니다."}</blockquote>
          {moment.connectionReason ? <span className={styles.cinemaReason}>WHY NEXT · {moment.connectionReason}</span> : null}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">{embedUrl ? "YouTube에서 재생 ↗" : "원본 미디어 열기 ↗"}</a> : null}
          {embedUrl ? <small>Embed playback은 실행 환경 정책에 따라 차단될 수 있습니다. 원본 링크 fallback을 항상 유지합니다.</small> : null}
        </div>
      </section>

      <footer className={styles.cinemaControls}>
        <button type="button" onClick={() => onPlaying(!playing)} disabled={reducedMotion}>
          {reducedMotion ? "REDUCED MOTION" : playing ? "PAUSE" : "RESUME"}
        </button>
        <button type="button" onClick={() => onIndex((index - 1 + moments.length) % moments.length)}>PREV</button>
        <label>
          <span>SCRUB</span>
          <input
            aria-label="Cinema Moment scrubber"
            type="range"
            min={0}
            max={Math.max(0, moments.length - 1)}
            step={1}
            value={index}
            onChange={(event) => onIndex(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={() => onIndex((index + 1) % moments.length)}>NEXT</button>
        <button type="button" onClick={onExit}>EXIT TO BOARD</button>
      </footer>
    </div>
  );
}
