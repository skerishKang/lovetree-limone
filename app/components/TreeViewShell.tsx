"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ViewSwitcher, type ViewKind } from "./ViewSwitcher";

interface TreeViewShellProps {
  treeId: string;
  activeView: ViewKind;
  userLabel?: string;
  momentId?: string | null;
  onAddMoment?: () => void;
  isOwner?: boolean;
  children: ReactNode;
}

export function TreeViewShell({
  treeId,
  activeView,
  userLabel,
  momentId,
  onAddMoment,
  isOwner = false,
  children,
}: TreeViewShellProps) {
  return (
    <main className="tree-page">
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/v4" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/my-trees">내 러브트리</Link>
          <Link href="/v4/community">둘러보기</Link>
          {userLabel ? <span>{userLabel}</span> : null}
        </nav>
      </header>
      <div className="tree-view-switcher-bar">
        <ViewSwitcher treeId={treeId} active={activeView} momentId={momentId} isOwner={isOwner} />
        {isOwner && onAddMoment ? (
          <button className="view-add-moment" type="button" onClick={onAddMoment}>+ 새 순간</button>
        ) : null}
      </div>
      {children}
    </main>
  );
}
