"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ComposerNode {
  id: string;
  type: "root" | "moment" | "emotion" | "cluster" | "season" | "note" | "media";
  x: number;
  y: number;
  w: number;
  h: number;
  eyebrow: string;
  title: string;
  sub: string;
}

interface ComposerEdge {
  from: string;
  to: string;
  label: string;
  curve: number;
}

interface TemplateSpec {
  label: string;
  title: string;
  kicker: string;
  copy: string;
  body: string;
  nodes: ComposerNode[];
  edges: ComposerEdge[];
}

const SVG_VIEW = { x: -600, y: -370, w: 1200, h: 740 };

const TEMPLATES: Record<string, TemplateSpec> = {
  basic: {
    label: "LOVE UNFOLDS",
    title: "A tree of moments",
    kicker: "FROM SEED TO MEMORY",
    copy: "기억이 트리로 열립니다",
    body: "첫 순간에서 시작해 감정의 인과관계가 가지와 노드로 차분히 맺힙니다.",
    nodes: [
      { id: "root", type: "root", x: 0, y: 0, w: 224, h: 112, eyebrow: "LOVE TREE", title: "First spark", sub: "the moment that started everything" },
      { id: "m1", type: "moment", x: -360, y: -155, w: 178, h: 82, eyebrow: "MOMENT 01", title: "The first song", sub: "2:14 · wonder" },
      { id: "m2", type: "moment", x: 350, y: -178, w: 190, h: 84, eyebrow: "MOMENT 02", title: "Stayed a little longer", sub: "late summer · warmth" },
      { id: "m3", type: "moment", x: -385, y: 180, w: 188, h: 84, eyebrow: "MOMENT 03", title: "Found my way back", sub: "a quiet return" },
      { id: "m4", type: "moment", x: 365, y: 185, w: 190, h: 84, eyebrow: "MOMENT 04", title: "Shared it with someone", sub: "the memory grew" },
      { id: "e1", type: "emotion", x: -520, y: -280, w: 126, h: 56, eyebrow: "EMOTION", title: "Wonder", sub: "" },
      { id: "e2", type: "emotion", x: 510, y: -295, w: 132, h: 56, eyebrow: "EMOTION", title: "Comfort", sub: "" },
      { id: "e3", type: "emotion", x: -535, y: 305, w: 128, h: 56, eyebrow: "EMOTION", title: "Courage", sub: "" },
      { id: "n1", type: "note", x: 520, y: 306, w: 150, h: 62, eyebrow: "NOTE", title: "“Keep this.”", sub: "private reflection" },
    ],
    edges: [
      { from: "root", to: "m1", label: "made me look closer", curve: -20 },
      { from: "root", to: "m2", label: "felt unexpectedly warm", curve: 24 },
      { from: "root", to: "m3", label: "I returned because", curve: 22 },
      { from: "root", to: "m4", label: "became ours", curve: -24 },
      { from: "m1", to: "e1", label: "before → after", curve: 18 },
      { from: "m2", to: "e2", label: "stayed with me", curve: -15 },
      { from: "m3", to: "e3", label: "a little braver", curve: -16 },
      { from: "m4", to: "n1", label: "held in words", curve: 16 },
    ],
  },
  person: {
    label: "PERSON MEMORY",
    title: "One person, many seasons",
    kicker: "A LIVING MEMORY SHELF",
    copy: "한 사람의 계절이 펼쳐집니다",
    body: "같은 사람을 향한 여러 순간과 감정이 하나의 경로로 이어집니다.",
    nodes: [
      { id: "root", type: "root", x: 0, y: 0, w: 230, h: 112, eyebrow: "PERSON TREE", title: "Mina", sub: "one person · four seasons" },
      { id: "s1", type: "season", x: -360, y: -205, w: 176, h: 78, eyebrow: "SEASON 01", title: "First light", sub: "when I first noticed" },
      { id: "s2", type: "season", x: 360, y: -210, w: 176, h: 78, eyebrow: "SEASON 02", title: "Closer days", sub: "small things became dear" },
      { id: "s3", type: "season", x: -365, y: 205, w: 176, h: 78, eyebrow: "SEASON 03", title: "Quiet winter", sub: "distance and return" },
      { id: "s4", type: "season", x: 365, y: 205, w: 176, h: 78, eyebrow: "SEASON 04", title: "New chapter", sub: "the feeling stayed" },
      { id: "m1", type: "moment", x: -540, y: -305, w: 160, h: 68, eyebrow: "MOMENT", title: "A passing smile", sub: "curiosity" },
      { id: "m2", type: "moment", x: -520, y: -95, w: 164, h: 68, eyebrow: "MOMENT", title: "The long message", sub: "trust" },
      { id: "m3", type: "moment", x: 540, y: -315, w: 164, h: 68, eyebrow: "MOMENT", title: "Shared playlist", sub: "belonging" },
      { id: "m4", type: "moment", x: 535, y: -90, w: 164, h: 68, eyebrow: "MOMENT", title: "Sunday walk", sub: "ease" },
      { id: "m5", type: "moment", x: -540, y: 305, w: 164, h: 68, eyebrow: "MOMENT", title: "Silence between us", sub: "uncertain" },
      { id: "e1", type: "emotion", x: -520, y: 92, w: 124, h: 54, eyebrow: "EMOTION", title: "Missing", sub: "" },
      { id: "m6", type: "moment", x: 540, y: 310, w: 164, h: 68, eyebrow: "MOMENT", title: "We met again", sub: "relief" },
      { id: "n1", type: "note", x: 525, y: 92, w: 150, h: 60, eyebrow: "NOTE", title: "Still here", sub: "a private line" },
    ],
    edges: [
      { from: "root", to: "s1", label: "the beginning", curve: -28 },
      { from: "root", to: "s2", label: "grew closer", curve: 26 },
      { from: "root", to: "s3", label: "a quiet distance", curve: 26 },
      { from: "root", to: "s4", label: "returned gently", curve: -26 },
      { from: "s1", to: "m1", label: "first noticed", curve: 12 },
      { from: "s1", to: "m2", label: "wanted to know more", curve: -16 },
      { from: "s2", to: "m3", label: "shared worlds", curve: -14 },
      { from: "s2", to: "m4", label: "felt ordinary and rare", curve: 14 },
      { from: "s3", to: "m5", label: "could not say", curve: -12 },
      { from: "s3", to: "e1", label: "became longing", curve: 13 },
      { from: "s4", to: "m6", label: "found each other", curve: 12 },
      { from: "s4", to: "n1", label: "kept the feeling", curve: -12 },
    ],
  },
  emotion: {
    label: "EMOTIONAL MAP",
    title: "From feeling to connection",
    kicker: "THE PATH BENEATH A MEMORY",
    copy: "감정의 인과가 길이 됩니다",
    body: "첫 순간이 기록되고, 연결되고, 다시 돌아오는 감정 경로를 보여줍니다.",
    nodes: [
      { id: "root", type: "root", x: -410, y: 0, w: 214, h: 108, eyebrow: "FIRST MOMENT", title: "I noticed", sub: "a small movement of the heart" },
      { id: "a1", type: "moment", x: -165, y: -185, w: 168, h: 76, eyebrow: "CAPTURE", title: "Saved the moment", sub: "time · source · note" },
      { id: "a2", type: "emotion", x: 90, y: -205, w: 144, h: 58, eyebrow: "EMOTION", title: "Wonder", sub: "" },
      { id: "a3", type: "cluster", x: 320, y: -105, w: 172, h: 76, eyebrow: "CONNECTION", title: "Why it led onward", sub: "emotion before → after" },
      { id: "a4", type: "moment", x: 390, y: 145, w: 170, h: 76, eyebrow: "NEXT MOMENT", title: "Looked again", sub: "the path continued" },
      { id: "a5", type: "emotion", x: 130, y: 220, w: 146, h: 58, eyebrow: "EMOTION", title: "Belonging", sub: "" },
      { id: "a6", type: "note", x: -150, y: 195, w: 164, h: 66, eyebrow: "REFLECTION", title: "“This changed me.”", sub: "private note" },
      { id: "a7", type: "season", x: 560, y: -260, w: 158, h: 68, eyebrow: "EXPANSION", title: "New branch", sub: "a derived path" },
      { id: "a8", type: "media", x: 565, y: 285, w: 156, h: 68, eyebrow: "RETURN", title: "Played again", sub: "the feeling revives" },
    ],
    edges: [
      { from: "root", to: "a1", label: "first saved", curve: -18 },
      { from: "a1", to: "a2", label: "named the feeling", curve: 17 },
      { from: "a2", to: "a3", label: "made me curious", curve: -16 },
      { from: "a3", to: "a4", label: "led to the next moment", curve: 23 },
      { from: "a4", to: "a5", label: "changed into", curve: 18 },
      { from: "a5", to: "a6", label: "held as words", curve: -18 },
      { from: "a3", to: "a7", label: "another route opened", curve: -22 },
      { from: "a4", to: "a8", label: "returned through replay", curve: 20 },
      { from: "a6", to: "root", label: "the path can begin again", curve: 58 },
    ],
  },
  season: {
    label: "SEASON MAP",
    title: "A season becomes a living archive",
    kicker: "ONE TREE · MANY CHAPTERS",
    copy: "한 시즌의 전체 구조가 피어납니다",
    body: "오프닝, 전환점, 깊어짐, 여운이 같은 나무 안의 장으로 정리됩니다.",
    nodes: [
      { id: "root", type: "root", x: 0, y: 0, w: 234, h: 112, eyebrow: "SEASON 03", title: "The season we stayed", sub: "18 moments · 4 emotional clusters" },
      { id: "c1", type: "cluster", x: -380, y: -210, w: 176, h: 78, eyebrow: "CHAPTER 01", title: "Opening", sub: "the first three moments" },
      { id: "c2", type: "cluster", x: 380, y: -215, w: 182, h: 78, eyebrow: "CHAPTER 02", title: "Turning point", sub: "the moment the path changed" },
      { id: "c3", type: "cluster", x: -385, y: 205, w: 178, h: 78, eyebrow: "CHAPTER 03", title: "Deepening", sub: "returning became staying" },
      { id: "c4", type: "cluster", x: 385, y: 205, w: 182, h: 78, eyebrow: "CHAPTER 04", title: "Afterglow", sub: "the season held its shape" },
      { id: "m1", type: "moment", x: -560, y: -300, w: 150, h: 66, eyebrow: "MOMENT", title: "First light", sub: "wonder" },
      { id: "m2", type: "moment", x: 560, y: -310, w: 152, h: 66, eyebrow: "MOMENT", title: "The shift", sub: "curiosity → warmth" },
      { id: "m3", type: "moment", x: -555, y: 300, w: 152, h: 66, eyebrow: "MOMENT", title: "Came back", sub: "return → staying" },
      { id: "m4", type: "moment", x: 560, y: 305, w: 152, h: 66, eyebrow: "MOMENT", title: "Kept close", sub: "the season took root" },
      { id: "n1", type: "note", x: 0, y: 300, w: 150, h: 60, eyebrow: "NOTE", title: "“We stayed.”", sub: "a quiet line" },
    ],
    edges: [
      { from: "root", to: "c1", label: "where it began", curve: -24 },
      { from: "root", to: "c2", label: "where it turned", curve: 24 },
      { from: "root", to: "c3", label: "where it deepened", curve: 24 },
      { from: "root", to: "c4", label: "where it settled", curve: -24 },
      { from: "c1", to: "m1", label: "the first spark", curve: 10 },
      { from: "c2", to: "m2", label: "the turning", curve: 12 },
      { from: "c3", to: "m3", label: "the return", curve: -12 },
      { from: "c4", to: "m4", label: "the close", curve: 12 },
      { from: "c4", to: "n1", label: "held in a line", curve: -14 },
    ],
  },
};

function smoothStep(t: number) {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

function edgePath(a: ComposerNode, b: ComposerNode, bend: number) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const side = bend >= 0 ? 1 : -1;
  const m = Math.max(55, Math.min(180, Math.hypot(dx, dy) * 0.26));
  const c1x = ax + dx * 0.34 - dy / Math.max(1, Math.hypot(dx, dy)) * m * side;
  const c1y = ay + dy * 0.34 + dx / Math.max(1, Math.hypot(dx, dy)) * m * side;
  const c2x = ax + dx * 0.68 - dy / Math.max(1, Math.hypot(dx, dy)) * m * side;
  const c2y = ay + dy * 0.68 + dx / Math.max(1, Math.hypot(dx, dy)) * m * side;
  return `M ${ax} ${ay} C ${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`;
}

/** Parse a YouTube URL / ID into a video id, or null. */
function youtubeIdFromUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  const m = text.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

interface MediaState {
  kind: "image" | "video" | "audio" | "youtube" | null;
  objectUrl?: string;
  youtubeId?: string;
}

export default function V4IncomingTemplateComposer() {
  const [templateId, setTemplateId] = useState<keyof typeof TEMPLATES>("basic");
  const template = TEMPLATES[templateId];
  const [nodes, setNodes] = useState<ComposerNode[]>(template.nodes);
  const [edges, setEdges] = useState<ComposerEdge[]>(template.edges);
  const [selectedId, setSelectedId] = useState<string | null>("root");
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  const [drawerView, setDrawerView] = useState<"closed" | "library" | "node" | "edge">("closed");
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [media, setMedia] = useState<Record<string, MediaState>>({});
  const [editDraft, setEditDraft] = useState<{ title: string; sub: string; message: string; youtube: string }>({
    title: "",
    sub: "",
    message: "",
    youtube: "",
  });
  const [edgeDraft, setEdgeDraft] = useState("");

  const startRef = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const templateDndRef = useRef<string | null>(null);

  const duration = 4200;

  // Unfold animation loop
  useEffect(() => {
    if (!playing) return;
    if (startRef.current === 0) startRef.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = ((now - startRef.current) / 1000) * speed;
      setPhase(((elapsed % duration) + duration) % duration / duration);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration]);

  // reset template
  const applyTemplate = (id: keyof typeof TEMPLATES) => {
    setTemplateId(id);
    const t = TEMPLATES[id];
    setNodes(t.nodes);
    setEdges(t.edges);
    setSelectedId("root");
    setSelectedEdgeIndex(null);
    setMedia({});
    setDrawerView("closed");
    setToast(`${TEMPLATES[id].title} 템플릿을 불러왔습니다.`);
  };

  const replay = () => {
    startRef.current = performance.now();
    setPhase(0);
    setPlaying(true);
    setToast("다시 펼치기");
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    setSelectedEdgeIndex(null);
    const node = nodes.find((n) => n.id === id);
    if (node) {
      const m = media[id];
      setEditDraft({
        title: node.title,
        sub: node.sub,
        message: "",
        youtube: m?.youtubeId ?? "",
      });
      setDrawerView("node");
    }
  };

  const selectEdge = (index: number) => {
    setSelectedEdgeIndex(index);
    setSelectedId(null);
    setEdgeDraft(edges[index].label);
    setDrawerView("edge");
  };

  const saveNode = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedId) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, title: editDraft.title, sub: editDraft.sub } : n)));
    if (editDraft.youtube.trim()) {
      const vid = youtubeIdFromUrl(editDraft.youtube);
      if (vid) {
        setMedia((prev) => ({ ...prev, [selectedId]: { kind: "youtube", youtubeId: vid } }));
        setToast("YouTube 미리보기가 노드에 적용되었습니다.");
      } else {
        setToast("YouTube 링크를 인식하지 못했습니다.");
      }
    }
    setDrawerView("closed");
  };

  const saveEdge = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (selectedEdgeIndex === null) return;
    setEdges((prev) => prev.map((e, i) => (i === selectedEdgeIndex ? { ...e, label: edgeDraft } : e)));
    setDrawerView("closed");
  };

  const onMediaFile = (file: File) => {
    if (!selectedId) return;
    const objectUrl = URL.createObjectURL(file);
    const kind = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
    setMedia((prev) => ({ ...prev, [selectedId]: { kind, objectUrl } }));
    setToast("로컬 미디어가 노드에 표시됩니다.");
  };

  // Stage pan
  const onStageDown = (e: ReactPointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, .incoming-node-click, .incoming-edge-hit, .incoming-connection-label")) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onStageMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  };
  const onStageUp = () => {
    dragRef.current = null;
  };

  // template drag (desktop)
  const onTemplateDragStart = (key: keyof typeof TEMPLATES) => (e: React.DragEvent) => {
    templateDndRef.current = key;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", key);
  };
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const key = (e.dataTransfer.getData("text/plain") || templateDndRef.current) as keyof typeof TEMPLATES | null;
    if (key && TEMPLATES[key]) {
      applyTemplate(key);
    }
  };

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeParts = useMemo(
    () =>
      edges.map((e, i) => {
        const a = nodeById.get(e.from);
        const b = nodeById.get(e.to);
        if (!a || !b) return null;
        return { index: i, a, b, path: edgePath(a, b, e.curve), label: e.label };
      }),
    [edges, nodeById],
  );

  const selectedMedia = selectedId ? media[selectedId] : undefined;

  return (
    <div className="incoming-composer" data-testid="incoming-composer">
      <header className="incoming-composer-topbar">
        <div className="incoming-brand" aria-label="LoveTree Structure Unfold">
          <div className="incoming-brand-mark" aria-hidden="true"></div>
          <div>
            <strong>LoveTree Template Composer</strong>
            <span>Drag · unfold · fill your moments</span>
          </div>
        </div>

        <nav className="incoming-template-tabs" aria-label="전개 템플릿">
          {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
            <button
              key={key}
              className={`incoming-template-tab${templateId === key ? " active" : ""}`}
              data-template={key}
              type="button"
              onClick={() => applyTemplate(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </nav>

        <div className="incoming-toolbar" aria-label="애니메이션 조작">
          <button
            className="incoming-tool-btn incoming-tool-primary"
            id="replayBtn"
            type="button"
            aria-label="다시 펼치기"
            onClick={replay}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66" /><path d="M20 4v7h-7" /></svg>
            <span>다시 펼치기</span>
          </button>
          <select
            className="incoming-speed-select"
            aria-label="전개 속도"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={0.72}>0.7×</option>
            <option value={1}>1.0×</option>
            <option value={1.35}>1.35×</option>
          </select>
          <button className="incoming-tool-btn" type="button" aria-label="축소" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M16 16l5 5" /></svg>
          </button>
          <button className="incoming-tool-btn" type="button" aria-label="확대" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M11 8v6M16 16l5 5" /></svg>
          </button>
          <button className="incoming-tool-btn" type="button" aria-label="화면 맞춤" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
          </button>
        </div>
      </header>

      <main
        className="incoming-stage-shell"
        id="stageShell"
        onPointerDown={onStageDown}
        onPointerMove={onStageMove}
        onPointerUp={onStageUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onCanvasDrop}
      >
        <div className="incoming-mode-caption">
          <div className="incoming-mode-label">{template.label}</div>
          <div className="incoming-mode-title">{template.title}</div>
        </div>

        <svg
          className="incoming-map-svg"
          viewBox={`${SVG_VIEW.x} ${SVG_VIEW.y} ${SVG_VIEW.w} ${SVG_VIEW.h}`}
          role="img"
          aria-label="LoveTree 자동 전개 마인드맵"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
        >
          <defs>
            <filter id="incomingSoftLine" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.18" /></filter>
            <filter id="incomingNodeBlur" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="7" /></filter>
            <filter id="incomingRootShadow" x="-30%" y="-40%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#6e5148" flood-opacity="0.13" /></filter>
          </defs>
          <g className="incoming-petals" aria-hidden="true" />
          <g className="incoming-edge-layer">
            {edgeParts.filter(Boolean).map((part) => {
              const p = part!;
              const appear = smoothStep(phase * 6 - p.index * 0.5);
              const active = selectedEdgeIndex === p.index;
              return (
                <g key={`${p.a.id}-${p.b.id}`} className={`incoming-edge-group${active ? " active" : ""}`}>
                  <path className="incoming-edge-path" d={p.path} style={{ opacity: appear * 0.83 }} />
                  <path
                    className="incoming-edge-trail"
                    d={p.path}
                    style={{ opacity: appear > 0.9 ? 0.4 * Math.sin(phase * Math.PI * 8) * (active ? 1 : 0) : 0 }}
                  />
                  <path
                    className="incoming-edge-hit"
                    d={p.path}
                    onClick={(e) => { e.stopPropagation(); selectEdge(p.index); }}
                    aria-label={p.label}
                  />
                  <g
                    className={`incoming-connection-label${appear > 0.8 ? " visible" : ""}`}
                    onClick={(e) => { e.stopPropagation(); selectEdge(p.index); }}
                  >
                    <rect x={-40} y={-10} width={80} height={20} rx={8} />
                    <text textAnchor="middle" dominantBaseline="central">{p.label}</text>
                  </g>
                </g>
              );
            })}
          </g>
          <g className="incoming-node-layer">
            {nodes.map((node, idx) => {
              const appear = smoothStep(phase * 5 - idx * 0.4);
              const selected = selectedId === node.id;
              const nodeMedia = media[node.id];
              return (
                <g
                  key={node.id}
                  className={`incoming-node ${node.type}${selected ? " selected" : ""}`}
                  style={{ opacity: appear, transform: `translate(${node.x}px, ${node.y}px)`, transformOrigin: "0 0" }}
                >
                  <ellipse className="incoming-node-shadow" cx={node.w / 2} cy={node.h / 2 + 8} rx={node.w / 2} ry={node.h / 2} />
                  <rect className="incoming-node-card" width={node.w} height={node.h} rx={node.type === "root" ? 24 : 15} />
                  {nodeMedia?.kind === "youtube" && nodeMedia.youtubeId ? (
                    <g transform={`translate(8,8)`}>
                      <rect width={node.w - 16} height={node.h - 16} rx={10} fill="#1b1412" />
                      <rect width={node.w - 16} height={node.h - 16} rx={10} fill="none" stroke="rgba(215,173,101,0.4)" />
                      <text x={(node.w - 16) / 2} y={node.h / 2 - 4} textAnchor="middle" fontSize={9} fill="#e9d9a8">▶ YouTube</text>
                      <text x={(node.w - 16) / 2} y={node.h / 2 + 10} textAnchor="middle" fontSize={7} fill="#9c8d87">{nodeMedia.youtubeId}</text>
                    </g>
                  ) : nodeMedia?.kind && nodeMedia.objectUrl ? (
                    <g transform={`translate(8,8)`}>
                      <rect width={node.w - 16} height={node.h - 16} rx={10} fill="#241b19" />
                      <text x={(node.w - 16) / 2} y={node.h / 2} textAnchor="middle" fontSize={8} fill="#e9d9a8">
                        {nodeMedia.kind === "video" ? "▶ video" : nodeMedia.kind === "audio" ? "♪ audio" : "◨ image"}
                      </text>
                    </g>
                  ) : null}
                  <circle className="incoming-node-dot" cx={14} cy={14} r={4} />
                  <text className="incoming-eyebrow" x={24} y={16}>{node.eyebrow}</text>
                  <text className="incoming-node-title" x={node.w / 2} y={node.h / 2 - 4} textAnchor="middle">{node.title}</text>
                  {node.sub ? <text className="incoming-node-subtitle" x={node.w / 2} y={node.h / 2 + 13} textAnchor="middle">{node.sub}</text> : null}
                  <rect className="incoming-node-click" width={node.w} height={node.h} rx={15} fill="transparent" onClick={(e) => { e.stopPropagation(); selectNode(node.id); }} />
                </g>
              );
            })}
          </g>
        </svg>

        <section className="incoming-intro-copy" aria-live="polite">
          <div className="incoming-kicker">{template.kicker}</div>
          <h1>{template.copy}</h1>
          <p>{template.body}</p>
        </section>

        <div className="incoming-progress-rail" aria-hidden="true">
          <div className="incoming-progress-meta"><strong>{Math.round(phase * 100) < 30 ? "SEED" : Math.round(phase * 100) < 70 ? "UNFOLD" : "LIVE"}</strong><span>{Math.round(phase * 100)}%</span></div>
          <div className="incoming-progress-track"><div className="incoming-progress-fill" style={{ width: `${phase * 100}%` }} /></div>
        </div>
      </main>

      {drawerView !== "closed" ? (
        <>
          <div className="incoming-drawer-scrim" onClick={() => setDrawerView("closed")} />
          <aside className="incoming-composer-drawer" aria-label="LoveTree 템플릿과 노드 편집기">
            <div className="incoming-drawer-head">
              <div>
                <strong>{drawerView === "library" ? "템플릿 보관함" : drawerView === "node" ? "노드 편집기" : "Connection 편집기"}</strong>
                <span>
                  {drawerView === "library"
                    ? "폼을 캔버스에 끌어놓으세요"
                    : drawerView === "node"
                      ? selectedNodeTitle()
                      : "왜 다음 순간으로 이어졌나요?"}
                </span>
              </div>
              <button className="incoming-drawer-close" type="button" aria-label="닫기" onClick={() => setDrawerView("closed")}>×</button>
            </div>

            <div className="incoming-drawer-body">
              {drawerView === "library" ? (
                <div>
                  <div className="incoming-drawer-section-label">Structure forms</div>
                  {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
                    <div
                      key={key}
                      className="incoming-template-card"
                      draggable
                      onDragStart={onTemplateDragStart(key)}
                      onClick={() => applyTemplate(key)}
                    >
                      <div className="incoming-template-preview" aria-hidden="true">
                        <i className="incoming-preview-node incoming-preview-root" />
                        <i className="incoming-preview-node a" />
                        <i className="incoming-preview-node b" />
                        <i className="incoming-preview-node c" />
                        <i className="incoming-preview-node d" />
                      </div>
                      <div className="incoming-template-meta">
                        <div>
                          <strong>{TEMPLATES[key].title}</strong>
                          <p>{TEMPLATES[key].body}</p>
                        </div>
                        <span className="incoming-drag-chip">끌어놓기</span>
                      </div>
                    </div>
                  ))}
                  <div className="incoming-template-help">데스크톱에서는 폼을 드래그해 캔버스에 놓습니다. 모바일에서는 폼을 누르면 즉시 적용됩니다.</div>
                </div>
              ) : drawerView === "node" ? (
                <form className="incoming-editor-form" onSubmit={saveNode}>
                  <div className="incoming-field"><label htmlFor="incomingNodeTitle">제목</label><input id="incomingNodeTitle" maxLength={80} placeholder="이 순간의 제목" value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} /></div>
                  <div className="incoming-field"><label htmlFor="incomingNodeSub">짧은 설명</label><input id="incomingNodeSub" maxLength={120} placeholder="시간·출처·감정 등" value={editDraft.sub} onChange={(e) => setEditDraft((d) => ({ ...d, sub: e.target.value }))} /></div>
                  <div className="incoming-field"><label htmlFor="incomingNodeMsg">메시지 또는 메모</label><textarea id="incomingNodeMsg" placeholder="이 순간이 왜 중요했는지 적어보세요" value={editDraft.message} onChange={(e) => setEditDraft((d) => ({ ...d, message: e.target.value }))} /></div>
                  <div className="incoming-media-drop">
                    <label className="incoming-media-file">
                      영상·사진·음성 넣기
                      <input type="file" accept="image/*,video/*,audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onMediaFile(f); e.target.value = ""; }} />
                    </label>
                    <small>로컬 파일은 현재 브라우저 세션에서 미리보기 됩니다.</small>
                    <div className="incoming-youtube-row">
                      <input type="url" inputMode="url" placeholder="YouTube 링크 붙여넣기" value={editDraft.youtube} onChange={(e) => setEditDraft((d) => ({ ...d, youtube: e.target.value }))} />
                      <button className="incoming-youtube-apply" type="button" onClick={() => {
                        const vid = youtubeIdFromUrl(editDraft.youtube);
                        if (selectedId && vid) {
                          setMedia((prev) => ({ ...prev, [selectedId]: { kind: "youtube", youtubeId: vid } }));
                          setToast("YouTube 미리보기가 노드에 적용되었습니다.");
                        } else {
                          setToast(vid ? "" : "YouTube 링크를 인식하지 못했습니다.");
                        }
                      }}>링크 적용</button>
                    </div>
                    <span className="incoming-youtube-help">일반 영상, Shorts, youtu.be, Live 링크와 영상 ID를 지원합니다. 링크 적용 즉시 노드에 표시됩니다.</span>
                    <div className="incoming-youtube-status" role="status" aria-live="polite">
                      {selectedMedia?.kind === "youtube" ? `적용됨 · ${selectedMedia.youtubeId}` : ""}
                    </div>
                    {selectedMedia?.kind === "youtube" && selectedMedia.youtubeId ? (
                      <div
                        className="incoming-media-preview"
                        style={{ backgroundImage: `url(https://img.youtube.com/vi/${selectedMedia.youtubeId}/hqdefault.jpg)` }}
                        role="img"
                        aria-label="YouTube 미리보기"
                      />
                    ) : null}
                  </div>
                  <div className="incoming-editor-actions">
                    <button type="button" className="incoming-secondary-btn" onClick={() => setDrawerView("library")}>템플릿</button>
                    <button type="submit" className="incoming-save-btn">노드에 적용</button>
                  </div>
                </form>
              ) : (
                <form className="incoming-editor-form" onSubmit={saveEdge}>
                  <div className="incoming-field"><label htmlFor="incomingEdgeReason">왜 다음 순간으로 이어졌나요?</label><textarea id="incomingEdgeReason" maxLength={180} placeholder="예: 이 장면이 궁금해서 다음 영상을 찾아봤다" value={edgeDraft} onChange={(e) => setEdgeDraft(e.target.value)} /></div>
                  <div className="incoming-editor-actions">
                    <button type="button" className="incoming-secondary-btn" onClick={() => setDrawerView("library")}>템플릿</button>
                    <button type="submit" className="incoming-save-btn">Connection 저장</button>
                  </div>
                </form>
              )}
            </div>
          </aside>
        </>
      ) : null}

      <button className="incoming-library-float" type="button" aria-label="템플릿 보관함 열기" onClick={() => setDrawerView("library")}>
        템플릿
      </button>

      <div className={`incoming-toast${toast ? " show" : ""}`} role="status">{toast ?? ""}</div>
    </div>
  );

  function selectedNodeTitle(): string {
    const node = nodes.find((n) => n.id === selectedId);
    return node ? `${node.eyebrow} · ${node.title}` : "Moment slot";
  }
}
