"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  SOURCE_TRACK_38_CANONICAL_DISCOVER,
  SOURCE_TRACK_38_CANONICAL_PUBLIC_TREE_PREFIX,
  SOURCE_TRACK_38_DISPOSITION,
  SOURCE_TRACK_38_EXISTING_MAP_COMPARATOR,
} from "@/lib/source-track-38/donor";
import styles from "./track38-discover-donor.module.css";

interface PublicTree {
  id: string;
  title?: string | null;
  artist?: string | null;
  memo?: string | null;
  groupName?: string | null;
  keywords?: string[] | null;
  likeCount?: number | null;
  viewCount?: number | null;
}

interface PublicMemory {
  id: string;
  treeId: string;
  parentId?: string | null;
  title?: string | null;
  memo?: string | null;
  emotionTags?: string[] | null;
  timestamp?: string | null;
  createdAt?: string | Date | null;
  sortOrder?: number | null;
}

type LayoutMode = "constellation" | "radial" | "timeline";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Public discovery request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function treeLabel(tree: PublicTree): string {
  return tree.title?.trim() || "이름 없는 공개 러브트리";
}

function memoryLabel(memory: PublicMemory): string {
  return memory.title?.trim() || memory.memo?.trim() || "공개 순간";
}

function memoryEmotion(memory: PublicMemory): string {
  return memory.emotionTags?.find(Boolean) || "기록";
}

function mapPosition(index: number, total: number, layout: LayoutMode) {
  const safeTotal = Math.max(total, 1);
  if (layout === "radial") {
    const angle = (index / safeTotal) * Math.PI * 2 - Math.PI / 2;
    const ring = 205 + (index % 3) * 42;
    return { x: 500 + Math.cos(angle) * ring, y: 325 + Math.sin(angle) * ring * 0.76 };
  }
  if (layout === "timeline") {
    const span = Math.max(safeTotal - 1, 1);
    return { x: 92 + (index / span) * 816, y: 325 + Math.sin(index * 1.43) * 118 };
  }
  const columns = 5;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 115 + column * 190 + (row % 2) * 38 + Math.sin(index * 1.7) * 28,
    y: 105 + row * 165 + (index % 3) * 25,
  };
}

export default function Track38DiscoverDonor() {
  const [trees, setTrees] = useState<PublicTree[]>([]);
  const [treeId, setTreeId] = useState("");
  const [memories, setMemories] = useState<PublicMemory[]>([]);
  const [query, setQuery] = useState("");
  const [emotion, setEmotion] = useState("전체");
  const [layout, setLayout] = useState<LayoutMode>("constellation");
  const [selectedMemoryId, setSelectedMemoryId] = useState("");
  const [zoom, setZoom] = useState(0.92);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [treeLoading, setTreeLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    let active = true;
    async function loadTrees() {
      setTreeLoading(true);
      setError(null);
      try {
        const rows = await readJson<PublicTree[]>(
          await apiFetch("/api/community/trees?view=summary&sort=latest&limit=24"),
        );
        if (!active) return;
        setTrees(rows);
        setTreeId((current) => current || rows[0]?.id || "");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "공개 러브트리를 불러오지 못했습니다.");
      } finally {
        if (active) setTreeLoading(false);
      }
    }
    void loadTrees();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!treeId) return;
    let active = true;
    async function loadMemories() {
      setMemoryLoading(true);
      setError(null);
      try {
        const rows = await readJson<PublicMemory[]>(
          await apiFetch(`/api/community/memories?treeId=${encodeURIComponent(treeId)}&limit=200`),
        );
        if (!active) return;
        setMemories(rows);
        setSelectedMemoryId(rows[0]?.id || "");
        setQuery("");
        setEmotion("전체");
        setZoom(0.92);
        setOffset({ x: 0, y: 0 });
      } catch (loadError) {
        if (active) {
          setMemories([]);
          setError(loadError instanceof Error ? loadError.message : "공개 순간을 불러오지 못했습니다.");
        }
      } finally {
        if (active) setMemoryLoading(false);
      }
    }
    void loadMemories();
    return () => { active = false; };
  }, [treeId]);

  const currentTree = trees.find((tree) => tree.id === treeId) ?? null;
  const emotions = useMemo(
    () => ["전체", ...Array.from(new Set(memories.map(memoryEmotion).filter((item) => item !== "기록")))],
    [memories],
  );
  const visibleMemories = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko-KR");
    return memories.filter((memory) => {
      const matchesEmotion = emotion === "전체" || memoryEmotion(memory) === emotion;
      const haystack = `${memoryLabel(memory)} ${memory.memo || ""}`.toLocaleLowerCase("ko-KR");
      return matchesEmotion && (!needle || haystack.includes(needle));
    });
  }, [emotion, memories, query]);
  const visibleIds = useMemo(() => new Set(visibleMemories.map((memory) => memory.id)), [visibleMemories]);
  const positions = useMemo(
    () => new Map(memories.map((memory, index) => [memory.id, mapPosition(index, memories.length, layout)])),
    [layout, memories],
  );
  const selectedMemory = memories.find((memory) => memory.id === selectedMemoryId) ?? visibleMemories[0] ?? memories[0] ?? null;
  const edges = useMemo(() => memories.flatMap((memory) => {
    if (!memory.parentId || !visibleIds.has(memory.id) || !visibleIds.has(memory.parentId)) return [];
    const from = positions.get(memory.parentId);
    const to = positions.get(memory.id);
    return from && to ? [{ id: `${memory.parentId}-${memory.id}`, from, to }] : [];
  }), [memories, positions, visibleIds]);

  function focusSibling(currentId: string, direction: -1 | 1) {
    const currentIndex = visibleMemories.findIndex((memory) => memory.id === currentId);
    if (currentIndex < 0 || visibleMemories.length < 2) return;
    const nextIndex = (currentIndex + direction + visibleMemories.length) % visibleMemories.length;
    const next = visibleMemories[nextIndex];
    setSelectedMemoryId(next.id);
    window.requestAnimationFrame(() => nodeRefs.current.get(next.id)?.focus());
  }

  function handleNodeKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, memoryId: string) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusSibling(memoryId, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusSibling(memoryId, -1);
    }
  }

  const planeStyle = {
    "--track38-zoom": zoom,
    "--track38-x": `${offset.x}px`,
    "--track38-y": `${offset.y}px`,
  } as CSSProperties;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href={SOURCE_TRACK_38_CANONICAL_DISCOVER}>← canonical Discover</Link>
        <div className={styles.brand}>
          <strong>Voyager Memory Map</strong>
          <small>TRACK38 · DISCOVER VISUAL/FUNCTION DONOR · {SOURCE_TRACK_38_DISPOSITION}</small>
        </div>
        <Link href={SOURCE_TRACK_38_EXISTING_MAP_COMPARATOR}>현재 V4 관계 지도 비교</Link>
      </header>

      <section className={styles.intro}>
        <div>
          <p>TRACK38 · BOUNDED DONOR PROOF</p>
          <h1>보이저의 우주는,<br /><em>공개 기억을 다시 읽는 렌즈</em>입니다.</h1>
        </div>
        <p>
          별도 제품·백엔드를 만들지 않습니다. 기존 <b>/v4/community</b>의 공개 Tree/Memory 데이터를 그대로 읽고,
          Track38의 어두운 우주장·공간 배치·연결선·선택 inspector만 격리해 검증합니다.
        </p>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.treePanel} aria-label="공개 러브트리 선택">
          <div className={styles.panelHead}>
            <small>PUBLIC TREES</small>
            <strong>{treeLoading ? "불러오는 중" : `${trees.length} trees`}</strong>
          </div>
          <div className={styles.treeList}>
            {trees.map((tree) => (
              <button
                className={`${styles.treeButton}${tree.id === treeId ? ` ${styles.selected}` : ""}`}
                type="button"
                key={tree.id}
                onClick={() => setTreeId(tree.id)}
              >
                <strong>{treeLabel(tree)}</strong>
                <small>{tree.artist || tree.groupName || "LoveTree"} · ♥ {Number(tree.likeCount || 0)}</small>
              </button>
            ))}
            {!treeLoading && !trees.length ? <p className={styles.empty}>공개 러브트리가 없습니다.</p> : null}
          </div>
        </aside>

        <section className={styles.mapCard} aria-label="Track38 공개 기억 우주 지도">
          <div className={styles.mapToolbar}>
            <input
              aria-label="공개 기억 검색"
              type="search"
              placeholder="순간과 문장 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className={styles.chips} aria-label="감정 필터">
              {emotions.map((item) => (
                <button
                  className={emotion === item ? styles.activeChip : ""}
                  type="button"
                  key={item}
                  onClick={() => setEmotion(item)}
                >{item}</button>
              ))}
            </div>
          </div>

          <div className={styles.layoutBar}>
            <span>{currentTree ? treeLabel(currentTree) : "공개 러브트리"} · {visibleMemories.length}/{memories.length} moments</span>
            {(["constellation", "radial", "timeline"] as LayoutMode[]).map((item) => (
              <button className={layout === item ? styles.activeControl : ""} type="button" key={item} onClick={() => setLayout(item)}>{item}</button>
            ))}
            <button type="button" aria-label="지도 축소" onClick={() => setZoom((value) => Math.max(0.62, value - 0.1))}>−</button>
            <button type="button" aria-label="지도 확대" onClick={() => setZoom((value) => Math.min(1.28, value + 0.1))}>＋</button>
            <button type="button" aria-label="지도 왼쪽 이동" onClick={() => setOffset((value) => ({ ...value, x: value.x - 36 }))}>←</button>
            <button type="button" aria-label="지도 오른쪽 이동" onClick={() => setOffset((value) => ({ ...value, x: value.x + 36 }))}>→</button>
            <button type="button" aria-label="지도 위 이동" onClick={() => setOffset((value) => ({ ...value, y: value.y - 28 }))}>↑</button>
            <button type="button" aria-label="지도 아래 이동" onClick={() => setOffset((value) => ({ ...value, y: value.y + 28 }))}>↓</button>
            <button type="button" onClick={() => { setZoom(0.92); setOffset({ x: 0, y: 0 }); }}>맞춤</button>
          </div>

          <div className={styles.stage}>
            <div className={styles.spaceDust} aria-hidden="true" />
            <div className={styles.mapPlane} style={planeStyle}>
              <svg className={styles.edges} viewBox="0 0 1000 650" aria-hidden="true">
                {edges.map((edge) => (
                  <line key={edge.id} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} />
                ))}
              </svg>
              {memories.map((memory, index) => {
                const position = positions.get(memory.id) ?? mapPosition(index, memories.length, layout);
                const isVisible = visibleIds.has(memory.id);
                const isSelected = selectedMemory?.id === memory.id;
                return (
                  <button
                    className={`${styles.memoryNode}${isSelected ? ` ${styles.selectedNode}` : ""}${isVisible ? "" : ` ${styles.hiddenNode}`}`}
                    type="button"
                    key={memory.id}
                    ref={(element) => { if (element) nodeRefs.current.set(memory.id, element); else nodeRefs.current.delete(memory.id); }}
                    style={{ left: `${position.x / 10}%`, top: `${position.y / 6.5}%`, "--node-index": index } as CSSProperties}
                    aria-label={`${memoryLabel(memory)} · ${memoryEmotion(memory)}${isSelected ? " · 선택됨" : ""}`}
                    aria-pressed={isSelected}
                    disabled={!isVisible}
                    onClick={() => setSelectedMemoryId(memory.id)}
                    onKeyDown={(event) => handleNodeKeyDown(event, memory.id)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{memoryLabel(memory)}</strong>
                    <small>{memoryEmotion(memory)}</small>
                  </button>
                );
              })}
            </div>
            {memoryLoading ? <div className={styles.stageState} aria-live="polite">공개 순간을 불러오는 중입니다.</div> : null}
            {!memoryLoading && currentTree && !memories.length ? <div className={styles.stageState}>공개된 순간이 없습니다.</div> : null}
          </div>
        </section>

        <aside className={styles.inspector} aria-live="polite">
          <div className={styles.panelHead}>
            <small>SELECTED PUBLIC MOMENT</small>
            <strong>{selectedMemory ? memoryEmotion(selectedMemory) : "선택 없음"}</strong>
          </div>
          {selectedMemory ? (
            <>
              <div className={styles.orbitMark} aria-hidden="true"><i /><i /><i /><span>✦</span></div>
              <h2>{memoryLabel(selectedMemory)}</h2>
              <p>{selectedMemory.memo?.trim() || "이 공개 순간에는 별도의 설명이 없습니다."}</p>
              <dl>
                <div><dt>EMOTION</dt><dd>{memoryEmotion(selectedMemory)}</dd></div>
                <div><dt>TIMESTAMP</dt><dd>{selectedMemory.timestamp || "—"}</dd></div>
                <div><dt>CONNECTION</dt><dd>{selectedMemory.parentId ? "공개 parent 연결" : "루트 순간"}</dd></div>
              </dl>
              {currentTree ? (
                <Link className={styles.primaryLink} href={`${SOURCE_TRACK_38_CANONICAL_PUBLIC_TREE_PREFIX}${encodeURIComponent(currentTree.id)}`}>
                  canonical 전체 트리 열기 →
                </Link>
              ) : null}
            </>
          ) : <p className={styles.empty}>지도에서 공개 순간을 선택해 주세요.</p>}
          <div className={styles.boundaryNote}>
            <strong>DONOR BOUNDARY</strong>
            <p>원본의 synthetic 인물/YouTube fixture, iframe player, 자동 orbit는 제품 진실로 승격하지 않습니다. DOM 버튼·공개 API·정적 공간 렌즈만 사용합니다.</p>
          </div>
        </aside>
      </div>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
    </main>
  );
}
