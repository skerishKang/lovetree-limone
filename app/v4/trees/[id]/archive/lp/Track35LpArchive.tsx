"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AlbumMomentView } from "@/lib/moment-model";
import { useTreeMoments } from "@/lib/use-tree-moments";
import {
  track35AdjacentMomentId,
  track35IndexFromScrubValue,
  track35MediaKind,
  track35ProgressPercent,
  track35ResolveIndex,
  track35YouTubeEmbedUrl,
} from "@/lib/source-track-35/lp-archive";
import styles from "./track35-lp-archive.module.css";

function dateLabel(moment: AlbumMomentView) {
  const value = moment.discoveryDate || moment.timestamp;
  if (!value) return "날짜 없는 기억";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
}

function MomentMedia({ moment }: { moment: AlbumMomentView }) {
  const kind = track35MediaKind(moment.sourceType, moment.sourceUrl);
  const youtubeEmbed = track35YouTubeEmbedUrl(moment.sourceUrl);

  if (kind === "video" && youtubeEmbed) {
    return (
      <iframe
        className={styles.mediaFrame}
        src={youtubeEmbed}
        title={`${moment.title || "기억"} 영상`}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (kind === "video" && moment.sourceUrl) {
    return <video className={styles.nativeMedia} src={moment.sourceUrl} controls playsInline preload="metadata" />;
  }
  if (kind === "audio" && moment.sourceUrl) {
    return <audio className={styles.audio} src={moment.sourceUrl} controls preload="metadata" />;
  }
  if (kind === "image" && (moment.sourceUrl || moment.thumbnail)) {
    return <img className={styles.imageMedia} src={moment.sourceUrl || moment.thumbnail} alt={moment.title || "기억 이미지"} />;
  }
  if (moment.thumbnail) {
    return <img className={styles.imageMedia} src={moment.thumbnail} alt="" />;
  }
  return <div className={styles.mediaFallback}>이 기억에는 내장 미디어 미리보기가 없습니다.</div>;
}

export default function Track35LpArchive({ treeId }: { treeId: string }) {
  const { tree, albumMoments, loading, error, selectedMomentId, selectMoment } = useTreeMoments(treeId);
  const [autoBrowse, setAutoBrowse] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);

  const activeIndex = useMemo(
    () => track35ResolveIndex(albumMoments, selectedMomentId),
    [albumMoments, selectedMomentId],
  );
  const activeMoment = activeIndex >= 0 ? albumMoments[activeIndex] : null;
  const progress = track35ProgressPercent(albumMoments.length, activeIndex);

  useEffect(() => {
    if (albumMoments.length > 0 && !selectedMomentId) selectMoment(albumMoments[0].id);
  }, [albumMoments, selectMoment, selectedMomentId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReducedMotion(media.matches);
      if (media.matches) setAutoBrowse(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const move = useCallback((direction: -1 | 1) => {
    const nextId = track35AdjacentMomentId(albumMoments, selectedMomentId, direction);
    if (nextId) selectMoment(nextId);
  }, [albumMoments, selectMoment, selectedMomentId]);

  useEffect(() => {
    if (!autoBrowse || reducedMotion || albumMoments.length < 2 || inspectorOpen) return;
    const timer = window.setInterval(() => move(1), 4600);
    return () => window.clearInterval(timer);
  }, [albumMoments.length, autoBrowse, inspectorOpen, move, reducedMotion]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (inspectorOpen && !dialog.open) dialog.showModal();
    if (!inspectorOpen && dialog.open) dialog.close();
  }, [inspectorOpen]);

  const restoreInspectorFocus = useCallback(() => {
    window.requestAnimationFrame(() => inspectorTriggerRef.current?.focus());
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    restoreInspectorFocus();
  }, [restoreInspectorFocus]);

  const openInspector = useCallback((trigger: HTMLElement) => {
    inspectorTriggerRef.current = trigger;
    setAutoBrowse(false);
    setInspectorOpen(true);
  }, []);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (inspectorOpen) return;
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    const isTextControl = tag === "input" || tag === "textarea" || tag === "select";
    if (event.key === "ArrowLeft" && !isTextControl) {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight" && !isTextControl) {
      event.preventDefault();
      move(1);
    } else if ((event.key === " " || event.code === "Space") && tag !== "button" && tag !== "a" && !isTextControl) {
      event.preventDefault();
      if (!reducedMotion) setAutoBrowse((value) => !value);
    }
  }, [inspectorOpen, move, reducedMotion]);

  if (loading) {
    return <main className={styles.state}><p>LP 아카이브를 불러오는 중입니다.</p></main>;
  }
  if (error) {
    return <main className={styles.state}><h1>LP 아카이브</h1><p role="alert">{error}</p><Link href="/v4/subjects">사람 앨범으로 돌아가기</Link></main>;
  }
  if (albumMoments.length === 0 || !activeMoment) {
    return <main className={styles.state}><h1>{tree?.title || "LP 아카이브"}</h1><p>아직 재생할 Moment가 없습니다.</p><Link href="/v4/subjects">사람 앨범으로 돌아가기</Link></main>;
  }

  return (
    <main className={styles.page} onKeyDown={onKeyDown} data-track35-native="archive" tabIndex={0}>
      <header className={styles.topbar}>
        <Link href="/v4/subjects" className={styles.back}>← 사람 앨범</Link>
        <div className={styles.brand}>LoveTree <span>ARCHIVE · LP</span></div>
        <div className={styles.count}>{String(activeIndex + 1).padStart(2, "0")} / {String(albumMoments.length).padStart(2, "0")}</div>
      </header>

      <section className={styles.hero} aria-labelledby="track35-title">
        <div>
          <p className={styles.eyebrow}>TRACK 35 · LP PLAYER</p>
          <h1 id="track35-title">{tree?.title || "기억을 한 장의 레코드처럼"}</h1>
          <p className={styles.lead}>Moment 데이터는 그대로 두고, 기록을 골라 듣듯 넘기고 꺼내 보는 아카이브 렌즈입니다.</p>
        </div>
        <p className={styles.help}>← → 트랙 이동 · Space 자동 넘김 · 슬라이더/터치 탐색 · Enter로 선택</p>
      </section>

      <section className={styles.player} aria-label="LP 기억 플레이어">
        <div className={styles.deck}>
          <button
            type="button"
            className={`${styles.platterButton} ${autoBrowse && !reducedMotion ? styles.isPlaying : ""}`}
            aria-pressed={autoBrowse}
            aria-label={reducedMotion ? "모션 감소 설정으로 자동 넘김 사용 안 함" : autoBrowse ? "자동 넘김 일시정지" : "자동 넘김 시작"}
            disabled={reducedMotion}
            onClick={() => setAutoBrowse((value) => !value)}
          >
            <span className={styles.platter} aria-hidden="true" data-track35-platter>
              <span className={styles.label} style={{ backgroundImage: activeMoment.thumbnail ? `url(${activeMoment.thumbnail})` : undefined }} />
              <span className={styles.spindle} />
            </span>
          </button>
          <div className={styles.tonearm} aria-hidden="true"><i /><b /></div>
          <div className={styles.nowPlaying} aria-live="polite">
            <small>NOW ARCHIVING · {activeMoment.emotionTags[0] || "MEMORY"}</small>
            <strong>{activeMoment.title || "제목 없는 기억"}</strong>
            <span>{dateLabel(activeMoment)}</span>
          </div>
          <div className={styles.transport}>
            <button type="button" onClick={() => move(-1)} aria-label="이전 기억">←</button>
            <button
              type="button"
              className={styles.inspectButton}
              onClick={(event) => openInspector(event.currentTarget)}
            >
              기억 열기
            </button>
            <button type="button" onClick={() => move(1)} aria-label="다음 기억">→</button>
          </div>
          <label className={styles.scrubber}>
            <span>ARCHIVE POSITION</span>
            <input
              aria-label="LP 기억 트랙 위치"
              type="range"
              min="0"
              max={Math.max(0, albumMoments.length - 1)}
              step="1"
              value={activeIndex}
              onChange={(event) => {
                const index = track35IndexFromScrubValue(albumMoments.length, Number(event.currentTarget.value));
                const id = albumMoments[index]?.id;
                if (id) selectMoment(id);
              }}
              style={{ "--track35-progress": `${progress}%` } as CSSProperties}
            />
          </label>
        </div>

        <div className={styles.library}>
          <header><span>MEMORY TRACKS</span><small>canonical AlbumMomentView</small></header>
          <ol className={styles.trackList}>
            {albumMoments.map((moment, index) => {
              const selected = index === activeIndex;
              return (
                <li key={moment.id}>
                  <button
                    type="button"
                    className={selected ? styles.selectedTrack : undefined}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => selectMoment(moment.id)}
                  >
                    <span className={styles.trackNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.trackCopy}>
                      <strong>{moment.title || "제목 없는 기억"}</strong>
                      <small>{moment.emotionTags.join(" · ") || dateLabel(moment)}</small>
                    </span>
                    <span className={styles.trackType}>{track35MediaKind(moment.sourceType, moment.sourceUrl).toUpperCase()}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="track35-dialog-title"
        onClose={() => {
          setInspectorOpen(false);
          restoreInspectorFocus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeInspector();
        }}
      >
        <div className={styles.dialogCard}>
          <button type="button" className={styles.close} onClick={closeInspector} aria-label="기억 닫기">×</button>
          <div className={styles.mediaShell}><MomentMedia moment={activeMoment} /></div>
          <div className={styles.detail}>
            <small>{dateLabel(activeMoment)} · {activeMoment.emotionTags.join(" · ") || "MEMORY"}</small>
            <h2 id="track35-dialog-title">{activeMoment.title || "제목 없는 기억"}</h2>
            <p>{activeMoment.memo || "이 Moment에는 아직 메모가 없습니다."}</p>
            {activeMoment.sourceUrl ? <a href={activeMoment.sourceUrl} target="_blank" rel="noreferrer">원본 미디어 열기 ↗</a> : null}
          </div>
        </div>
      </dialog>
    </main>
  );
}
