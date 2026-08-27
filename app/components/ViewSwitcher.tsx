"use client";

import Link from "next/link";

export type ViewKind =
  | "tree"
  | "portal"
  | "board"
  | "relationships"
  | "explore"
  | "overview"
  | "timeline"
  | "album"
  | "story"
  | "graph"
  | "replay"
  | "studio";

interface ViewSwitcherProps {
  treeId: string;
  active: ViewKind;
  momentId?: string | null;
  isOwner?: boolean;
}

type ViewItem = {
  kind: ViewKind;
  label: string;
  path: string;
  ownerOnly?: boolean;
};

const PRIMARY_VIEWS: ViewItem[] = [
  { kind: "tree", label: "기억", path: "" },
  { kind: "board", label: "보드", path: "/board" },
  { kind: "relationships", label: "관계", path: "/relationships" },
  { kind: "explore", label: "탐색", path: "/explore" },
];

const PORTAL_VIEW: ViewItem = { kind: "portal", label: "포털", path: "/portal" };

const SECONDARY_VIEWS: ViewItem[] = [
  { kind: "overview", label: "한눈에", path: "/overview" },
  { kind: "timeline", label: "타임라인", path: "/timeline" },
  { kind: "story", label: "공개 스토리", path: "/story" },
  { kind: "studio", label: "Memory Film Studio", path: "/studio", ownerOnly: true },
];

// Legacy compatibility routes remain addressable but are intentionally removed
// from primary product navigation after Five-Source semantic consolidation:
// album -> Board, graph -> Relationships/Explore, replay -> Board Cinema.
const LEGACY_COMPATIBILITY_VIEWS: ViewKind[] = ["album", "graph", "replay"];
void LEGACY_COMPATIBILITY_VIEWS;

export function ViewSwitcher({ treeId, active, momentId, isOwner = false }: ViewSwitcherProps) {
  const encodedId = encodeURIComponent(treeId);
  const suffix = momentId ? `?moment=${encodeURIComponent(momentId)}` : "";
  const hrefFor = (view: ViewItem) => `/trees/${encodedId}${view.path}${suffix}`;
  const secondaryActive = SECONDARY_VIEWS.some((view) => view.kind === active);

  return (
    <nav
      className="view-switcher"
      aria-label="보기 전환"
      data-narrow-scroll-container="true"
      data-semantic-navigation="true"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      {PRIMARY_VIEWS.map((view) => (
        <Link
          key={view.kind}
          href={hrefFor(view)}
          className={`view-tab${active === view.kind ? " view-tab-active" : ""}`}
          aria-current={active === view.kind ? "page" : undefined}
          data-view-tier="primary"
          style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
        >
          {view.label}
        </Link>
      ))}

      <Link
        href={hrefFor(PORTAL_VIEW)}
        className={`view-tab${active === "portal" ? " view-tab-active" : ""}`}
        aria-current={active === "portal" ? "page" : undefined}
        data-view-tier="return"
        style={{
          flex: "0 0 auto",
          whiteSpace: "nowrap",
          marginInlineStart: 8,
          borderInlineStart: "1px solid currentColor",
          paddingInlineStart: 14,
        }}
      >
        포털
      </Link>

      <details
        data-view-tier="secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          flex: "0 0 auto",
          marginInlineStart: 4,
          whiteSpace: "nowrap",
        }}
      >
        <summary
          className={`view-tab${secondaryActive ? " view-tab-active" : ""}`}
          aria-current={secondaryActive ? "page" : undefined}
          style={{ cursor: "pointer", whiteSpace: "nowrap", listStyle: "none" }}
        >
          더보기
        </summary>
        <div
          role="group"
          aria-label="보조 보기"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {SECONDARY_VIEWS.filter((view) => !view.ownerOnly || isOwner).map((view) => (
            <Link
              key={view.kind}
              href={hrefFor(view)}
              className={`view-tab${active === view.kind ? " view-tab-active" : ""}`}
              aria-current={active === view.kind ? "page" : undefined}
              style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
            >
              {view.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
