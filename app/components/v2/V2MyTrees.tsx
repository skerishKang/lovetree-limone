"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatTreeDate, type TreeRecord } from "@/lib/tree-types";
import EmailAuthForm from "../EmailAuthForm";

interface ApiError { error?: string }

export default function V2MyTrees() {
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const loadTrees = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/api/trees?limit=100");
      const data = (await response.json().catch(() => [])) as TreeRecord[] | ApiError;
      if (!response.ok) {
        setError("러브트리를 불러오지 못했어요.");
        return;
      }
      setTrees(Array.isArray(data) ? data : []);
    } catch {
      setError("네트워크 오류가 발생했어요.");
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
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar" style={{ width: "min(1160px, 100%)", margin: "0 auto" }}>
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">로그인 상태를 확인하고 있어요…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar" style={{ width: "min(1160px, 100%)", margin: "0 auto" }}>
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">
          <span className="v2-state-symbol" aria-hidden="true">✦</span>
          <h1>내 러브트리는 로그인 후 열려요.</h1>
          <p>저장한 순간을 안전하게 다시 만나려면 로그인해 주세요.</p>
          <div className="v2-state-actions">
            <button className="v2-button v2-button-primary" type="button" onClick={() => void login()} disabled={loginPending}>
              {loginPending ? "로그인 중…" : "Google로 로그인"}
            </button>
            <button className="v2-button v2-button-quiet" type="button" onClick={() => setIsAuthOpen(true)} aria-haspopup="dialog">
              이메일로 로그인
            </button>
          </div>
        </div>
        <EmailAuthForm open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="v2-tree-page">
      <div className="v2-topbar" style={{ width: "min(1160px, 100%)", margin: "0 auto" }}>
        <Link className="v2-brand" href="/v2" aria-label="LoveTree 처음 화면으로">
          <span className="v2-brand-mark"><i /><b /></span>
          LoveTree
        </Link>
        <nav className="v2-topnav" aria-label="러브트리 메뉴">
          <Link href="/v2">처음 화면</Link>
          <Link href="/v2/community">둘러보기</Link>
          <span className="v2-nav-user-name">{user.displayName || user.email || "내 계정"}</span>
        </nav>
      </div>

      <div className="v2-tree-content">
        <div className="v2-tree-heading">
          <div>
            <p className="v2-eyebrow">my love garden</p>
            <h1>내 러브트리</h1>
            <p>마음이 멈춘 순간들이 한 그루씩 자라고 있어요.</p>
          </div>
          <Link className="v2-button v2-button-primary" href="/v2?start=tree">+ 새 러브트리</Link>
        </div>

        {loading ? (
          <div className="v2-community-grid" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="v2-community-card" style={{ minHeight: "260px" }}>
                <div className="v2-skeleton" style={{ height: "96px" }} />
                <div className="v2-skeleton" style={{ height: "14px", margin: "16px" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="v2-state compact">
            <p role="alert">{error}</p>
            <button className="v2-button v2-button-quiet" type="button" onClick={() => void loadTrees()}>다시 시도 →</button>
          </div>
        ) : trees.length === 0 ? (
          <div className="v2-state compact">
            <span className="v2-state-symbol" aria-hidden="true">✦</span>
            <h2>아직 심은 러브트리가 없어요.</h2>
            <p>처음 마음이 멈춘 순간을 한 그루로 시작해 보세요.</p>
            <Link className="v2-button v2-button-primary" href="/v2?start=tree">첫 순간 심기</Link>
          </div>
        ) : (
          <div className="v2-community-grid">
            {trees.map((tree, index) => (
              <Link
                className="v2-community-card"
                href={`/v2/trees/${tree.id}`}
                key={tree.id}
                style={{ transform: `rotate(${index % 3 === 0 ? -1 : index % 3 === 1 ? .8 : -.5}deg)` }}
              >
                <div className="v2-community-card-image">
                  <span>✦</span>
                </div>
                <div className="v2-community-card-body">
                  <span style={{ color: "var(--v2-rose-deep)", fontSize: ".6rem", fontWeight: 700 }}>
                    {tree.visibility === "private" ? "나만 보는 나무" : "내가 가꾸는 나무"}
                  </span>
                  <h2>{tree.title}</h2>
                  {tree.memo ? <p>{tree.memo}</p> : <p>처음 마음이 자라기 시작한 러브트리</p>}
                  {tree.keywords && tree.keywords.length > 0 ? (
                    <div className="v2-memory-tags" style={{ marginTop: "10px" }}>
                      {tree.keywords.slice(0, 3).map((kw) => <span key={kw}>#{kw}</span>)}
                    </div>
                  ) : null}
                </div>
                <div className="v2-community-card-foot">
                  <span>{formatTreeDate(tree.updatedAt || tree.createdAt)}</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
