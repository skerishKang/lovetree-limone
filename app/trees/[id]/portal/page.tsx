"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type WheelEvent } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ViewSwitcher } from "@/app/components/ViewSwitcher";
import { useTreeMoments } from "@/lib/use-tree-moments";
import styles from "./portal.module.css";

const ORBIT_LIMIT = 16;
const ACCENTS = ["#9b6fc0", "#d06f9e", "#d99a6a", "#718fc8", "#8baa8e"];

export default function TreePortalPage() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const {
    tree,
    treeMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectMoment,
  } = useTreeMoments(treeId, undefined, momentId ?? undefined);

  const [listOpen, setListOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);

  const orbitMoments = useMemo(() => treeMoments.slice(0, ORBIT_LIMIT), [treeMoments]);
  const byId = useMemo(() => new Map(treeMoments.map((moment) => [moment.id, moment])), [treeMoments]);
  const selected = selectedMomentId ? byId.get(selectedMomentId) ?? null : null;
  const children = selected ? treeMoments.filter((moment) => moment.parentId === selected.id) : [];

  const syncMomentToUrl = useCallback((nextMomentId: string | null) => {
    selectMoment(nextMomentId);
    const next = new URLSearchParams(searchParams.toString());
    if (nextMomentId) next.set("moment", nextMomentId);
    else next.delete("moment");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectMoment]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reducedMotion && !selectedMomentId) angleRef.current += dt * .008;
      if (worldRef.current) worldRef.current.style.transform = `rotateY(${angleRef.current.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, selectedMomentId]);

  const rotate = (delta: number) => {
    angleRef.current += delta;
    if (worldRef.current) worldRef.current.style.transform = `rotateY(${angleRef.current.toFixed(3)}deg)`;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    rotate(event.deltaY * .035);
  };

  const encodedTreeId = encodeURIComponent(treeId);
  const selectedSuffix = selected ? `?moment=${encodeURIComponent(selected.id)}` : "";

  return (
    <div className="tree-page" data-mvp-source="64" data-tree-id={treeId}>
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active="portal" momentId={selectedMomentId} isOwner={isOwner} />
      </div>

      <main className={styles.stage} onWheel={onWheel}>
        <div className={styles.ambient} aria-hidden="true" />
        <div className={styles.truth} aria-label="포털 사용 안내">
          <span>Moment를 선택해 이어보기</span>
          <span>휠 또는 버튼으로 궤도 돌리기</span>
          <span>선택한 순간에서 다른 보기 열기</span>
          <span>Esc 또는 닫기로 돌아가기</span>
        </div>
        <header className={styles.welcome}>
          <small>WELCOME BACK</small>
          <h1>{tree?.title || "나의 LoveTree"}</h1>
          <p>다시 돌아온 러브트리에서 떠 있는 Moment를 천천히 둘러보세요. 마음이 머무는 순간을 고르면 그 기억부터 자연스럽게 이어갈 수 있습니다.</p>
        </header>

        {loading ? <div className={styles.state} aria-busy="true">기억을 불러오는 중…</div> : null}
        {!loading && error ? <div className={styles.state} role="alert">{error}</div> : null}

        {!loading && !error ? (
          <section className={styles.scene} aria-label="떠 있는 Moment 포털">
            <div className={styles.world} ref={worldRef} data-rendering="css3d-dom" data-reduced-motion={String(reducedMotion)}>
              {orbitMoments.map((moment, index) => {
                const count = Math.max(orbitMoments.length, 1);
                const angle = (index / count) * 360;
                const radius = count < 5 ? 280 : 380;
                const y = ((index % 3) - 1) * 48;
                const accent = ACCENTS[index % ACCENTS.length];
                const transform = `rotateY(${angle}deg) translateZ(${radius}px) rotateY(${-angle}deg) translateY(${y}px)`;
                return (
                  <button
                    key={moment.id}
                    type="button"
                    className={`${styles.card}${selectedMomentId === moment.id ? ` ${styles.cardSelected}` : ""}`}
                    style={{ transform, "--accent": accent } as CSSProperties}
                    aria-pressed={selectedMomentId === moment.id}
                    onClick={() => syncMomentToUrl(moment.id)}
                  >
                    <span className={styles.media}>
                      {moment.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={moment.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : <span className={styles.mediaFallback}>{moment.sourceType.toUpperCase()}</span>}
                    </span>
                    <span className={styles.cardCopy}>
                      <small>{moment.emotionTags[0] ?? "MOMENT"}</small>
                      <strong>{moment.title || "제목 없는 Moment"}</strong>
                      <p>{moment.memo || moment.connectionReason || "기억이 이곳에 머물러 있습니다."}</p>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={`${styles.control} ${styles.semanticToggle}`}
              aria-expanded={listOpen}
              onClick={() => setListOpen((open) => !open)}
            >
              MOMENT INDEX
            </button>

            {listOpen ? (
              <div className={styles.list} role="listbox" aria-label="포털 Moment 목록">
                {treeMoments.map((moment) => (
                  <button
                    key={moment.id}
                    type="button"
                    role="option"
                    aria-selected={selectedMomentId === moment.id}
                    aria-pressed={selectedMomentId === moment.id}
                    onClick={() => { syncMomentToUrl(moment.id); setListOpen(false); }}
                  >
                    {moment.title || "제목 없는 Moment"}
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.controls} aria-label="포털 궤도 조작">
              <button className={styles.control} type="button" onClick={() => rotate(-24)}>← 돌리기</button>
              <button className={styles.control} type="button" onClick={() => rotate(24)}>돌리기 →</button>
              {selectedMomentId ? <button className={styles.control} type="button" onClick={() => syncMomentToUrl(null)}>선택 닫기</button> : null}
            </div>
          </section>
        ) : null}

        {selected ? (
          <div className={styles.viewerBackdrop} role="presentation" onClick={() => syncMomentToUrl(null)}>
            <section
              className={styles.viewer}
              role="dialog"
              aria-modal="true"
              aria-labelledby="source64-viewer-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  syncMomentToUrl(null);
                }
              }}
            >
              <button className={styles.viewerClose} type="button" onClick={() => syncMomentToUrl(null)} aria-label="Moment 포털 닫기">×</button>
              <div className={styles.viewerMedia}>
                {selected.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.thumbnail} alt="" referrerPolicy="no-referrer" />
                ) : <span className={styles.mediaFallback}>{selected.sourceType.toUpperCase()}</span>}
              </div>
              <div className={styles.viewerBody}>
                <small>선택한 순간 · {selected.emotionTags.join(" · ") || "기억"}</small>
                <h2 id="source64-viewer-title">{selected.title || "제목 없는 Moment"}</h2>
                <p>{selected.memo || "이 순간에 남긴 마음"}</p>
                <div className={styles.why}>
                  <strong>이어진 이유</strong>
                  <p>{selected.connectionReason || (selected.parentId ? "이전 Moment와 연결되어 있습니다." : "이 Moment에서 LoveTree가 시작됩니다.")}</p>
                </div>
                {children.length > 0 ? (
                  <div className={styles.why}>
                    <strong>다음으로 이어진 순간</strong>
                    {children.map((child) => (
                      <button key={child.id} type="button" className={styles.control} onClick={() => syncMomentToUrl(child.id)}>
                        {child.title || "다음 Moment"} →
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className={styles.viewerActions}>
                  <Link href={`/trees/${encodedTreeId}${selectedSuffix}`}>Moment 상세</Link>
                  <Link href={`/trees/${encodedTreeId}/board${selectedSuffix}`}>Living Board</Link>
                  <Link href={`/trees/${encodedTreeId}/relationships${selectedSuffix}`}>관계 보기</Link>
                  <Link href={`/trees/${encodedTreeId}/explore${selectedSuffix}`}>3D 탐색</Link>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
