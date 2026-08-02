"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";

interface GraphNode {
  id: string;
  title: string;
  note: string;
  date: string;
  time: string;
  emotion: string;
  videoId: string;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
}

const GRAPH_NODES: GraphNode[] = [
  { id: "n1", title: "처음 마음이 멈춘 장면", note: "이 장면에서 모든 기록이 시작됐어요.", date: "2026.04.22", time: "01:30", emotion: "설렘", videoId: "dQw4w9WgXcQ", x: 90, y: 295 },
  { id: "n2", title: "다시 찾아본 무대", note: "같은 날 다른 무대까지 찾아봤어요.", date: "2026.04.23", time: "00:42", emotion: "궁금함", videoId: "ysz5S6PUM-U", x: 330, y: 125 },
  { id: "n3", title: "오래 남은 인터뷰", note: "무대 밖의 말투가 궁금해졌어요.", date: "2026.04.24", time: "03:18", emotion: "따뜻함", videoId: "M7lc1UVf-VE", x: 340, y: 440 },
  { id: "n4", title: "팬들이 추천한 노래", note: "댓글을 따라가다 이 노래를 만났어요.", date: "2026.04.27", time: "02:11", emotion: "벅참", videoId: "aqz-KE-bpKQ", x: 610, y: 65 },
  { id: "n5", title: "문득 다시 생각난 밤", note: "며칠 뒤에도 같은 문장이 떠올랐어요.", date: "2026.05.02", time: "04:06", emotion: "그리움", videoId: "ScMzIvxBSi4", x: 625, y: 470 },
  { id: "n6", title: "처음 함께 본 라이브", note: "실시간으로 본 마음은 다른 결로 남았어요.", date: "2026.05.13", time: "18:20", emotion: "벅참", videoId: "jNQXAC9IVRw", x: 865, y: 205 },
  { id: "n7", title: "오래 간직할 문장", note: "이 문장을 나무의 중심에 남기고 싶었어요.", date: "2026.06.01", time: "05:31", emotion: "위로", videoId: "aqz-KE-bpKQ", x: 875, y: 505 },
];

const GRAPH_EDGES: GraphEdge[] = [
  { id: "e1", from: "n1", to: "n2", relation: "이 장면이 궁금해서" },
  { id: "e2", from: "n1", to: "n3", relation: "같은 사람이 나와서" },
  { id: "e3", from: "n2", to: "n4", relation: "추천을 따라가다가" },
  { id: "e4", from: "n3", to: "n5", relation: "문득 다시 생각나서" },
  { id: "e5", from: "n4", to: "n6", relation: "비슷한 감정이 이어져서" },
  { id: "e6", from: "n5", to: "n7", relation: "오래 간직하고 싶어서" },
  { id: "e7", from: "n3", to: "n6", relation: "같은 계절의 마음" },
];

function graphPath(a: GraphNode, b: GraphNode) {
  const ax = a.x + 168;
  const ay = a.y + 55;
  const bx = b.x;
  const by = b.y + 55;
  const bend = Math.max(80, Math.abs(bx - ax) * 0.46);
  return `M ${ax} ${ay} C ${ax + bend} ${ay}, ${bx - bend} ${by}, ${bx} ${by}`;
}

export function V4FreeGraph() {
  const [nodes, setNodes] = useState(GRAPH_NODES);
  const [edges, setEdges] = useState(GRAPH_EDGES);
  const [selectedId, setSelectedId] = useState("n1");
  const [selectedEdge, setSelectedEdge] = useState("e1");
  const [zoom, setZoom] = useState(0.92);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  function startDrag(event: ReactPointerEvent<HTMLElement>, node: GraphNode) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y };
    setSelectedId(node.id);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = Math.max(15, Math.min(1030, drag.originX + (event.clientX - drag.startX) / zoom));
    const y = Math.max(15, Math.min(610, drag.originY + (event.clientY - drag.startY) / zoom));
    setNodes((current) => current.map((node) => node.id === drag.id ? { ...node, x, y } : node));
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function handleConnect(nodeId: string, kind: "from" | "to") {
    if (kind === "from") {
      setConnectFrom(nodeId);
      return;
    }
    if (!connectFrom || connectFrom === nodeId) return;
    const id = `edge-${Date.now()}`;
    setEdges((current) => [...current, { id, from: connectFrom, to: nodeId, relation: "직접 연결한 순간" }]);
    setSelectedEdge(id);
    setConnectFrom(null);
  }

  function autoLayout() {
    setNodes((current) => current.map((node, index) => ({
      ...node,
      x: 90 + (index % 4) * 255,
      y: 70 + Math.floor(index / 4) * 320 + (index % 2) * 55,
    })));
  }

  return (
    <main className="v4-freegraph-page">
      <div className="v4-freegraph-app">
        <header className="v4-freegraph-toolbar">
          <Link href="/v4/trees/demo">← 성장 트리</Link>
          <div className="v4-freegraph-heading"><strong>자유 연결 그래프</strong><small>NODE GRAPH PROTOTYPE · DRAG · CONNECT · INSPECT</small></div>
          <button className={`v4-freegraph-button${connectFrom ? " is-active" : ""}`} type="button" onClick={() => setConnectFrom(connectFrom ? null : selectedId)}>{connectFrom ? "연결할 노드 선택" : "연결 모드"}</button>
          <button className="v4-freegraph-button" type="button" onClick={autoLayout}>자동 정리</button>
          <button className="v4-freegraph-button" type="button" onClick={() => setZoom((value) => Math.max(.55, value - .1))}>−</button>
          <span style={{ minWidth: 38, textAlign: "center", color: "#98505e", fontSize: ".55rem" }}>{Math.round(zoom * 100)}%</span>
          <button className="v4-freegraph-button" type="button" onClick={() => setZoom((value) => Math.min(1.3, value + .1))}>＋</button>
          <button className="v4-freegraph-button is-primary" type="button" onClick={() => setModalOpen(true)}>영상 보기</button>
        </header>

        <div className="v4-freegraph-layout">
          <section className="v4-freegraph-board" aria-label="자유 노드 그래프">
            <div className="v4-freegraph-stage" style={{ transform: `scale(${zoom})` }}>
              <svg className="v4-freegraph-lines" viewBox="0 0 1250 760" aria-hidden="true">
                {edges.map((edge) => {
                  const from = nodes.find((node) => node.id === edge.from);
                  const to = nodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;
                  return <path className={`v4-freegraph-edge${selectedEdge === edge.id ? " is-selected" : ""}`} d={graphPath(from, to)} key={edge.id} onClick={() => setSelectedEdge(edge.id)} style={{ pointerEvents: "stroke" }} />;
                })}
              </svg>

              {nodes.map((node) => (
                <article
                  className={`v4-freegraph-node${selectedId === node.id ? " is-selected" : ""}`}
                  key={node.id}
                  style={{ left: node.x, top: node.y }}
                  tabIndex={0}
                  onPointerDown={(event) => startDrag(event, node)}
                  onPointerMove={moveDrag}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onClick={() => setSelectedId(node.id)}
                  onDoubleClick={() => { setSelectedId(node.id); setModalOpen(true); }}
                >
                  <button className="v4-node-handle in" type="button" aria-label={`${node.title}에 연결`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleConnect(node.id, "to"); }} />
                  <button className="v4-node-handle out" type="button" aria-label={`${node.title}에서 연결 시작`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleConnect(node.id, "from"); }} />
                  <small>{node.date} · {node.time} · {node.emotion}</small>
                  <strong>{node.title}</strong>
                  <p>{node.note}</p>
                </article>
              ))}
            </div>
            <aside className="v4-minimap" aria-label="미니맵">
              {nodes.map((node) => <span className="v4-minimap-dot" key={node.id} style={{ left: `${node.x / 7.2}px`, top: `${node.y / 7}px` }} />)}
            </aside>
          </section>

          <aside className="v4-freegraph-inspector">
            <p style={{ color: "#98505e", fontSize: ".48rem", fontWeight: 700, letterSpacing: ".1em" }}>SELECTED MOMENT</p>
            <h2>{selected.title}</h2>
            <p>{selected.note}</p>
            <div className="v4-inspector-media" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.03),rgba(49,34,36,.25)),url(https://img.youtube.com/vi/${selected.videoId}/hqdefault.jpg)` }} />
            <div className="v4-inspector-row"><small>DATE & SCENE</small><strong>{selected.date} · {selected.time}</strong></div>
            <div className="v4-inspector-row"><small>EMOTION</small><strong>{selected.emotion}</strong></div>
            <div className="v4-inspector-row"><small>SELECTED CONNECTION</small><p>{edges.find((edge) => edge.id === selectedEdge)?.relation ?? "연결을 선택해 주세요."}</p></div>
            <button className="v4-freegraph-button is-primary" style={{ width: "100%", marginTop: 17 }} type="button" onClick={() => setModalOpen(true)}>이 순간 영상 열기</button>
          </aside>
        </div>
      </div>

      {modalOpen ? (
        <div className="v4-video-modal" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setModalOpen(false); }}>
          <section className="v4-video-dialog" role="dialog" aria-modal="true" aria-label="선택 영상">
            <div className="v4-video-dialog-media" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.03),rgba(18,12,16,.45)),url(https://img.youtube.com/vi/${selected.videoId}/hqdefault.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }}>▶</div>
            <div className="v4-video-dialog-copy"><div><strong>{selected.title}</strong><small>{selected.date} · {selected.time} · {selected.emotion}</small></div><button className="v4-graph-button" type="button" onClick={() => setModalOpen(false)}>닫기</button></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

interface MapNode extends GraphNode { group: string; }
const MAP_NODES: MapNode[] = GRAPH_NODES.map((node, index) => ({ ...node, group: ["무대", "인터뷰", "노래"][index % 3] }));

function mapPosition(index: number, layout: "organic" | "radial" | "timeline") {
  if (layout === "timeline") return { x: 110 + index * 125, y: 320 + Math.sin(index * 1.7) * 75 };
  if (layout === "radial") {
    const angle = (index / MAP_NODES.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 470 + Math.cos(angle) * 260, y: 330 + Math.sin(angle) * 230 };
  }
  return { x: [125, 330, 290, 560, 610, 790, 850][index], y: [320, 150, 485, 100, 480, 245, 500][index] };
}

export function V4ObsidianMap() {
  const [query, setQuery] = useState("");
  const [emotion, setEmotion] = useState("전체");
  const [layout, setLayout] = useState<"organic" | "radial" | "timeline">("organic");
  const [selectedId, setSelectedId] = useState("n2");
  const selected = MAP_NODES.find((node) => node.id === selectedId) ?? MAP_NODES[0];
  const emotions = ["전체", ...new Set(MAP_NODES.map((node) => node.emotion))];
  const visible = (node: MapNode) => (emotion === "전체" || node.emotion === emotion) && (!query.trim() || `${node.title} ${node.note}`.includes(query.trim()));

  return (
    <main className="v4-graph-page">
      <div className="v4-graph-shell">
        <header className="v4-graph-topbar">
          <Link className="v4-graph-back" href="/v4/trees/demo">← 성장 트리</Link>
          <Link className="v4-graph-brand" href="/v4">LoveTree</Link>
          <div className="v4-graph-title"><strong>관계 지도</strong><small>OBSIDIAN GRAPH · SEARCH · FILTER · LAYOUT</small></div>
          <Link className="v4-graph-nav" href="/v4/trees/demo/graph">자유 그래프</Link>
          <Link className="v4-graph-nav is-active" href="/v4/trees/demo/map">관계 지도</Link>
          <Link className="v4-graph-nav" href="/v4/trees/demo/nebula">성운</Link>
          <Link className="v4-graph-nav" href="/v4/trees/demo/timeline">타임라인</Link>
        </header>

        <div className="v4-obsidian-layout">
          <aside className="v4-dark-panel">
            <div className="v4-dark-panel-head"><h2>탐색 조건</h2><p>검색과 감정 필터로 관계를 좁혀 봅니다.</p></div>
            <div className="v4-dark-controls">
              <input className="v4-dark-input" type="search" placeholder="순간과 문장 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
              <span className="v4-filter-title">EMOTION</span>
              {emotions.map((item) => <button className={`v4-filter-chip${emotion === item ? " is-selected" : ""}`} type="button" key={item} onClick={() => setEmotion(item)}>{item}</button>)}
              <span className="v4-filter-title">LAYOUT</span>
              {(["organic", "radial", "timeline"] as const).map((item) => <button className={`v4-filter-chip${layout === item ? " is-selected" : ""}`} type="button" key={item} onClick={() => setLayout(item)}>{item}</button>)}
              <div className="v4-dark-stat"><div><b>{MAP_NODES.filter(visible).length}</b><span>VISIBLE NODES</span></div><div><b>{GRAPH_EDGES.length}</b><span>CONNECTIONS</span></div></div>
            </div>
          </aside>

          <section className="v4-dark-panel v4-obsidian-canvas" aria-label="어두운 관계 지도">
            <svg className="v4-obsidian-svg" viewBox="0 0 1000 760" aria-hidden="true">
              {GRAPH_EDGES.map((edge) => {
                const aIndex = MAP_NODES.findIndex((node) => node.id === edge.from);
                const bIndex = MAP_NODES.findIndex((node) => node.id === edge.to);
                const a = mapPosition(aIndex, layout);
                const b = mapPosition(bIndex, layout);
                return <line className="v4-obsidian-edge" key={edge.id} x1={a.x + 38} y1={a.y + 38} x2={b.x + 38} y2={b.y + 38} opacity={visible(MAP_NODES[aIndex]) && visible(MAP_NODES[bIndex]) ? 1 : .08} />;
              })}
            </svg>
            {MAP_NODES.map((node, index) => {
              const position = mapPosition(index, layout);
              return (
                <button
                  className={`v4-obsidian-node${selectedId === node.id ? " is-selected" : ""}${visible(node) ? "" : " is-hidden"}`}
                  type="button"
                  key={node.id}
                  style={{ left: position.x, top: position.y }}
                  onClick={() => setSelectedId(node.id)}
                >
                  {node.title.split(" ").slice(0, 2).join(" ")}
                </button>
              );
            })}
          </section>

          <aside className="v4-dark-panel v4-inspector-dark">
            <p style={{ color: "#d5b7ee", fontSize: ".46rem", fontWeight: 700, letterSpacing: ".1em" }}>INSPECTOR</p>
            <h2 style={{ margin: "7px 0 0", font: "400 1.35rem 'Gowun Batang',serif" }}>{selected.title}</h2>
            <p style={{ color: "#8f8886", fontSize: ".57rem", lineHeight: 1.65 }}>{selected.note}</p>
            <div className="v4-inspector-media" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.03),rgba(8,7,12,.38)),url(https://img.youtube.com/vi/${selected.videoId}/hqdefault.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="v4-inspector-row"><small>GROUP</small><strong style={{ color: "#eee" }}>{selected.group}</strong></div>
            <div className="v4-inspector-row"><small>EMOTION</small><strong style={{ color: "#eee" }}>{selected.emotion}</strong></div>
            <div className="v4-inspector-row"><small>DATE</small><strong style={{ color: "#eee" }}>{selected.date} · {selected.time}</strong></div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const CLUSTERS = [
  { id: "설렘", color: "#ef8f9f", x: 32, y: 37 },
  { id: "위로", color: "#63d7bc", x: 65, y: 32 },
  { id: "그리움", color: "#a875df", x: 57, y: 67 },
  { id: "벅참", color: "#f1c36a", x: 27, y: 70 },
] as const;

export function V4LoveNebula() {
  const [density, setDensity] = useState<100 | 300 | 1000>(300);
  const [cluster, setCluster] = useState("전체");
  const [selectedIndex, setSelectedIndex] = useState(17);

  const points = useMemo(() => Array.from({ length: density }, (_, index) => {
    const group = CLUSTERS[index % CLUSTERS.length];
    const angle = index * 2.399963;
    const radius = 5 + (index % 59) * .28 + Math.sin(index * 1.73) * 3.5;
    const x = group.x + Math.cos(angle) * radius;
    const y = group.y + Math.sin(angle) * radius * .68;
    return { index, group, x: Math.max(2, Math.min(98, x)), y: Math.max(5, Math.min(94, y)), size: 2 + (index % 5), opacity: .28 + (index % 7) * .09 };
  }), [density]);

  const selected = points[Math.min(selectedIndex, points.length - 1)] ?? points[0];

  return (
    <main className="v4-nebula-page">
      <header className="v4-nebula-header">
        <Link href="/v4/trees/demo">← 성장 트리</Link>
        <h1>Love Nebula · 감정이 쌓인 전체 풍경</h1>
        {([100, 300, 1000] as const).map((value) => <button className={`v4-nebula-mode${density === value ? " is-selected" : ""}`} type="button" key={value} onClick={() => { setDensity(value); setSelectedIndex(17); }}>{value} moments</button>)}
      </header>
      <section className="v4-nebula-stage" aria-label={`${density}개 순간의 감정 성운`}>
        {[1,2,3,4].map((ring) => <span className="v4-nebula-ring" key={ring} style={{ width: `${ring * 210}px`, height: `${ring * 115}px`, "--ring-rotate": `${ring * 14 - 35}deg` } as CSSProperties} />)}
        {CLUSTERS.map((item) => <span className="v4-nebula-cluster-label" key={item.id} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.id}의 성운</span>)}
        {points.map((point) => (
          <button
            className={`v4-nebula-point${selected?.index === point.index ? " is-selected" : ""}`}
            type="button"
            aria-label={`${point.group.id} 순간 ${point.index + 1}`}
            key={point.index}
            style={{ left: `${point.x}%`, top: `${point.y}%`, "--point-size": `${point.size}px`, "--point-color": point.group.color, "--point-opacity": cluster === "전체" || cluster === point.group.id ? point.opacity : .06 } as CSSProperties}
            onClick={() => setSelectedIndex(point.index)}
          />
        ))}
        <aside className="v4-nebula-detail">
          <small>{selected?.group.id.toUpperCase()} CLUSTER · MOMENT {selected ? selected.index + 1 : 1}</small>
          <h2>{selected?.group.id}이 가장 선명했던 순간</h2>
          <p>전체 나무에서는 작은 빛 하나지만, 선택하면 날짜·영상·문장과 이어진 가지를 다시 펼칠 수 있습니다.</p>
          <div className="v4-dark-stat"><div><b>{density}</b><span>TOTAL MOMENTS</span></div><div><b>{Math.floor(density / 4)}</b><span>IN THIS CLUSTER</span></div></div>
        </aside>
        <div className="v4-nebula-legend">
          <button className={cluster === "전체" ? "is-selected" : ""} type="button" style={{ "--legend-color": "#fff" } as CSSProperties} onClick={() => setCluster("전체")}>전체 감정</button>
          {CLUSTERS.map((item) => <button className={cluster === item.id ? "is-selected" : ""} type="button" key={item.id} style={{ "--legend-color": item.color } as CSSProperties} onClick={() => setCluster(item.id)}>{item.id}</button>)}
        </div>
      </section>
    </main>
  );
}

const TIMELINE = [
  { id: "t1", date: "2026.04.22", short: "04.22", chapter: "처음 발견", title: "마음이 멈춘 첫 장면", note: "우연히 본 한 장면이 하루 종일 머물렀어요.", relation: "이 순간이 모든 가지의 뿌리가 됐어요.", videoId: "dQw4w9WgXcQ" },
  { id: "t2", date: "2026.04.23", short: "04.23", chapter: "첫 가지", title: "다시 찾아본 무대", note: "같은 날 다른 무대를 찾아보며 마음이 이어졌어요.", relation: "첫 장면이 궁금해서 다음 영상으로 이동했어요.", videoId: "ysz5S6PUM-U" },
  { id: "t3", date: "2026.04.24", short: "04.24", chapter: "사람을 알기", title: "오래 남은 인터뷰", note: "무대 밖에서 건넨 문장이 따뜻하게 남았어요.", relation: "같은 사람이 나오는 인터뷰를 찾아봤어요.", videoId: "M7lc1UVf-VE" },
  { id: "t4", date: "2026.04.27", short: "04.27", chapter: "추천을 따라", title: "팬들이 추천한 노래", note: "댓글의 추천이 새로운 감정의 가지가 됐어요.", relation: "추천을 따라가다 이 노래를 만났어요.", videoId: "aqz-KE-bpKQ" },
  { id: "t5", date: "2026.05.02", short: "05.02", chapter: "다시 돌아옴", title: "문득 다시 생각난 밤", note: "며칠이 지나도 같은 장면이 떠올랐어요.", relation: "기억이 되돌아와 같은 나무에 새 가지를 냈어요.", videoId: "ScMzIvxBSi4" },
  { id: "t6", date: "2026.06.01", short: "06.01", chapter: "첫 계절", title: "오래 간직할 문장", note: "한 달 동안 쌓인 마음을 문장으로 정리했어요.", relation: "이 문장이 첫 계절의 대표 기억이 됐어요.", videoId: "jNQXAC9IVRw" },
];

export function V4JuyeonTimeline() {
  const [selectedId, setSelectedId] = useState("t3");
  const selected = TIMELINE.find((item) => item.id === selectedId) ?? TIMELINE[0];

  return (
    <main className="v4-timeline-page">
      <div className="v4-timeline-shell">
        <header className="v4-timeline-header"><Link href="/v4/trees/demo">← 성장 트리</Link><strong>LoveTree</strong><span>JUYEON · DATE TIMELINE</span></header>
        <section className="v4-timeline-hero">
          <h1>날짜를 따라 펼치는<br /><em>마음의 연혁</em></h1>
          <p>트리의 공간적 관계를 시간의 흐름으로 다시 읽습니다. 날짜를 선택하면 연혁 카드, 영상 장면과 그다음으로 이어진 이유가 함께 움직입니다.</p>
        </section>
        <div className="v4-date-strip" aria-label="날짜 챕터 선택">
          {TIMELINE.map((item) => <button className={`v4-date-chip${selectedId === item.id ? " is-selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><small>{item.short}</small><strong>{item.chapter}</strong></button>)}
        </div>
        <div className="v4-timeline-layout">
          <section className="v4-timeline-paper" aria-label="날짜별 러브트리 연혁">
            {TIMELINE.map((item) => (
              <button className={`v4-timeline-chapter${selectedId === item.id ? " is-selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedId(item.id)}>
                <time>{item.date} · {item.chapter}</time>
                <h2>{item.title}</h2>
                <p>{item.note}</p>
              </button>
            ))}
          </section>
          <aside className="v4-timeline-detail">
            <div className="v4-timeline-video" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.03),rgba(50,35,37,.27)),url(https://img.youtube.com/vi/${selected.videoId}/hqdefault.jpg)` }} />
            <div className="v4-timeline-detail-copy">
              <small>{selected.date} · {selected.chapter.toUpperCase()}</small>
              <h2>{selected.title}</h2>
              <p>{selected.note}</p>
              <div className="v4-timeline-relation">↳ {selected.relation}</div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
