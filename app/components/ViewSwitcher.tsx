"use client";

import Link from "next/link";

export type ViewKind = "tree" | "portal" | "board" | "relationships" | "explore" | "overview" | "timeline" | "album" | "story" | "graph" | "replay" | "studio";

interface ViewSwitcherProps {
  treeId: string;
  active: ViewKind;
  momentId?: string | null;
  isOwner?: boolean;
}

const VIEWS: { kind: ViewKind; label: string; path: string; ownerOnly?: boolean }[] = [
  { kind: "tree", label: "트리", path: "" },
  { kind: "portal", label: "포털", path: "/portal" },
  { kind: "board", label: "보드", path: "/board" },
  { kind: "relationships", label: "관계", path: "/relationships" },
  { kind: "explore", label: "탐색", path: "/explore" },
  { kind: "overview", label: "한눈에", path: "/overview" },
  { kind: "timeline", label: "타임라인", path: "/timeline" },
  { kind: "album", label: "앨범", path: "/album" },
  { kind: "story", label: "스토리", path: "/story" },
  { kind: "graph", label: "그래프", path: "/graph" },
  { kind: "replay", label: "리플레이", path: "/replay" },
  { kind: "studio", label: "스튜디오", path: "/studio", ownerOnly: true },
];

export function ViewSwitcher({ treeId, active, momentId, isOwner = false }: ViewSwitcherProps) {
  const encodedId = encodeURIComponent(treeId);
  const suffix = momentId ? `?moment=${encodeURIComponent(momentId)}` : "";
  return (
    <nav
      className="view-switcher"
      aria-label="보기 전환"
      data-narrow-scroll-container="true"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
        justifyContent: "flex-start",
      }}
    >
      {VIEWS.filter((view) => !view.ownerOnly || isOwner).map((view) => (
        <Link
          key={view.kind}
          href={`/trees/${encodedId}${view.path}${suffix}`}
          className={`view-tab${active === view.kind ? " view-tab-active" : ""}`}
          aria-current={active === view.kind ? "page" : undefined}
          style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
