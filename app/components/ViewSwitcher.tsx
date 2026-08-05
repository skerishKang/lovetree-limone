"use client";

import Link from "next/link";

export type ViewKind = "tree" | "timeline" | "album";

interface ViewSwitcherProps {
  treeId: string;
  active: ViewKind;
}

const VIEWS: { kind: ViewKind; label: string; path: string }[] = [
  { kind: "tree", label: "트리", path: "" },
  { kind: "timeline", label: "타임라인", path: "/timeline" },
  { kind: "album", label: "앨범", path: "/album" },
];

export function ViewSwitcher({ treeId, active }: ViewSwitcherProps) {
  const encodedId = encodeURIComponent(treeId);
  return (
    <nav className="view-switcher" aria-label="보기 전환">
      {VIEWS.map((view) => (
        <Link
          key={view.kind}
          href={`/trees/${encodedId}${view.path}`}
          className={`view-tab${active === view.kind ? " view-tab-active" : ""}`}
          aria-current={active === view.kind ? "page" : undefined}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}
