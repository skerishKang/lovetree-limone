"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatTreeDate, type TreeRecord } from "@/lib/tree-types";

interface ApiError {
  error?: string;
}

export default function MyTreesPage() {
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrees = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/trees?limit=100");
      const data = (await response.json().catch(() => [])) as TreeRecord[] | ApiError;
      if (!response.ok) {
        setError(response.status === 401
          ? "로그인 세션이 만료됐어요. 다시 로그인해 주세요."
          : data && "error" in data && data.error
            ? data.error
            : "러브트리를 불러오지 못했어요.");
        return;
      }
      setTrees(Array.isArray(data) ? data : []);
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const timer = window.setTimeout(() => void loadTrees(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadTrees, user]);

  if (authLoading) {
    return <TreePageShell><div className="tree-page-state" aria-busy="true">로그인 상태를 확인하고 있어요…</div></TreePageShell>;
  }

  if (!user) {
    return (
      <TreePageShell>
        <div className="tree-page-state">
          <span className="tree-page-symbol" aria-hidden="true">✦</span>
          <h1>내 러브트리는 로그인 후 열려요.</h1>
          <p>저장한 순간을 안전하게 다시 만나려면 로그인해 주세요.</p>
          <button className="button button-primary" type="button" onClick={() => void login()} disabled={loginPending}>
            {loginPending ? "로그인 중…" : "Google로 로그인"}
          </button>
        </div>
      </TreePageShell>
    );
  }

  return (
    <TreePageShell userLabel={user.displayName || user.email || "내 계정"}>
      <section className="tree-page-content" aria-labelledby="my-trees-title">
        <div className="tree-page-heading">
          <div>
            <p className="eyebrow">my love garden</p>
            <h1 id="my-trees-title">내 러브트리</h1>
            <p>마음이 멈춘 순간들이 한 그루씩 자라고 있어요.</p>
          </div>
          <Link className="button button-primary" href="/?start=tree">+ 새 러브트리</Link>
        </div>

        {loading ? (
          <div className="tree-card-grid" aria-busy="true" aria-label="내 러브트리를 불러오는 중">
            {Array.from({ length: 3 }, (_, index) => <div className="owned-tree-card tree-card-skeleton" key={index} aria-hidden="true" />)}
          </div>
        ) : error ? (
          <div className="tree-page-state compact">
            <span className="tree-page-symbol" aria-hidden="true">!</span>
            <p role="alert">{error}</p>
            <button className="button button-quiet" type="button" onClick={() => void loadTrees()}>다시 시도 →</button>
          </div>
        ) : trees.length === 0 ? (
          <div className="tree-page-state compact">
            <span className="tree-page-symbol" aria-hidden="true">✦</span>
            <h2>아직 심은 러브트리가 없어요.</h2>
            <p>처음 마음이 멈춘 순간을 한 그루로 시작해 보세요.</p>
            <Link className="button button-primary" href="/?start=tree">첫 순간 심기</Link>
          </div>
        ) : (
          <div className="tree-card-grid">
            {trees.map((tree, index) => (
              <Link className={`owned-tree-card tilt-${index % 3}`} href={`/trees/${tree.id}`} key={tree.id}>
                <div className={`owned-tree-art tree-art-${index % 4}`} aria-hidden="true"><span>✦</span></div>
                <div className="owned-tree-body">
                  <span className="tree-card-kicker">{tree.visibility === "private" ? "나만 보는 나무" : "내가 가꾸는 나무"}</span>
                  <h2>{tree.title}</h2>
                  {tree.memo ? <p>{tree.memo}</p> : <p>처음 마음이 자라기 시작한 러브트리</p>}
                  {tree.keywords && tree.keywords.length > 0 ? <div className="tree-keywords">{tree.keywords.slice(0, 3).map((keyword) => <span key={keyword}>#{keyword}</span>)}</div> : null}
                </div>
                <div className="owned-tree-footer">
                  <span>{formatTreeDate(tree.updatedAt || tree.createdAt)}</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </TreePageShell>
  );
}

function TreePageShell({ children, userLabel }: { children: React.ReactNode; userLabel?: string }) {
  return (
    <main className="tree-page">
      <header className="tree-page-topbar">
        <Link className="tree-page-brand" href="/" aria-label="LoveTree 처음 화면으로">LoveTree</Link>
        <nav className="tree-page-nav" aria-label="러브트리 메뉴">
          <Link href="/">처음 화면</Link>
          <Link href="/?view=browse">둘러보기</Link>
          {userLabel ? <span>{userLabel}</span> : null}
        </nav>
      </header>
      {children}
    </main>
  );
}
