"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";

type SemanticView = "board" | "relationships" | "explore";

type SemanticAction = {
  label: string;
  path: "" | "/board" | "/relationships" | "/explore";
};

const ACTIONS: Record<SemanticView, SemanticAction[]> = {
  board: [
    { label: "Moment 열기", path: "" },
    { label: "관계 보기", path: "/relationships" },
    { label: "공간에서 보기", path: "/explore" },
  ],
  relationships: [
    { label: "Moment 열기", path: "" },
    { label: "보드에서 보기", path: "/board" },
    { label: "공간에서 탐색", path: "/explore" },
  ],
  explore: [
    { label: "Moment 열기", path: "" },
    { label: "보드에서 보기", path: "/board" },
    { label: "관계 자세히 보기", path: "/relationships" },
  ],
};

function semanticView(pathname: string): SemanticView | null {
  if (pathname.endsWith("/board")) return "board";
  if (pathname.endsWith("/relationships")) return "relationships";
  if (pathname.endsWith("/explore")) return "explore";
  return null;
}

export function MomentContextActions() {
  const params = useParams<{ id: string | string[] }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const momentId = searchParams.get("moment");
  const view = semanticView(pathname);

  if (!treeId || !momentId || !view) return null;

  const encodedTreeId = encodeURIComponent(treeId);
  const suffix = `?moment=${encodeURIComponent(momentId)}`;

  return (
    <aside
      aria-label="현재 Moment로 다른 보기 열기"
      data-semantic-moment-actions={view}
      style={{
        position: "fixed",
        insetInlineEnd: 16,
        bottom: 16,
        zIndex: 32,
        display: "flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "calc(100vw - 32px)",
        overflowX: "auto",
        padding: 8,
        border: "1px solid rgba(255,255,255,.16)",
        borderRadius: 18,
        background: "rgba(14, 14, 18, .88)",
        boxShadow: "0 18px 52px rgba(0,0,0,.32)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          paddingInline: 6,
          fontSize: 11,
          opacity: 0.68,
          whiteSpace: "nowrap",
        }}
      >
        이 Moment
      </span>
      {ACTIONS[view].map((action) => (
        <Link
          key={action.path || "moment"}
          href={`/trees/${encodedTreeId}${action.path}${suffix}`}
          className="button button-quiet"
          data-semantic-view-transition="push"
          style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
        >
          {action.label}
        </Link>
      ))}
    </aside>
  );
}
