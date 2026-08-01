"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { TreeRecord } from "@/lib/tree-types";

export default function V2CommunityView() {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<string>("latest");

  const loadTrees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/community/trees?limit=50&sort=${sort}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setError("트리를 불러오지 못했어요.");
        return;
      }
      setTrees(Array.isArray(data) ? data : []);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTrees(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTrees]);

  return (
    <div className="v2-community-screen">
      <div className="v2-topbar" style={{ width: "min(1160px, 100%)", margin: "0 auto" }}>
        <Link className="v2-brand" href="/v2" aria-label="LoveTree 처음 화면으로">
          <span className="v2-brand-mark"><i /><b /></span>
          LoveTree
        </Link>
        <nav className="v2-topnav" aria-label="러브트리 메뉴">
          <Link href="/v2">처음 화면</Link>
          <Link href="/v2/my-trees">내 러브트리</Link>
        </nav>
      </div>

      <div style={{ width: "min(1160px, 100%)", margin: "0 auto", paddingTop: "60px" }}>
        <div className="v2-community-header">
          <div>
            <p className="v2-eyebrow">PUBLIC LOVE TREES</p>
            <h1>마음이 닿은 트리들</h1>
            <p style={{ color: "var(--v2-muted)", fontSize: ".88rem", margin: "18px 0 0" }}>
              다른 팬들이 가꾼 따뜻한 트리를 만나보세요.
            </p>
          </div>
        </div>

        <div className="v2-community-toolbar">
          {["latest", "popular", "views"].map((s) => (
            <button
              key={s}
              className={`v2-button ${sort === s ? "v2-button-primary" : "v2-button-quiet"}`}
              onClick={() => setSort(s)}
            >
              {s === "latest" ? "최신순" : s === "popular" ? "인기순" : "조회순"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="v2-community-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="v2-community-card" style={{ minHeight: "240px" }}>
                <div className="v2-skeleton" style={{ height: "130px" }} />
                <div className="v2-skeleton" style={{ height: "16px", margin: "16px" }} />
                <div className="v2-skeleton" style={{ height: "12px", margin: "0 16px" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="v2-community-empty">
            <p role="alert">{error}</p>
            <button className="v2-button v2-button-primary" onClick={() => loadTrees()}>
              다시 시도
            </button>
          </div>
        ) : trees.length === 0 ? (
          <div className="v2-community-empty">
            <span style={{ fontSize: "1.6rem", color: "var(--v2-rose)" }}>✦</span>
            <p style={{ margin: "12px 0 4px" }}>아직 공개된 러브트리가 없어요.</p>
            <p className="v2-community-empty-sub" style={{ color: "var(--v2-muted)", fontSize: ".82rem" }}>
              첫 번째 트리의 주인이 되어보세요.
            </p>
          </div>
        ) : (
          <div className="v2-community-grid">
            {trees.map((tree) => (
              <Link
                className="v2-community-card"
                href={`/v2/trees/${tree.id}`}
                key={tree.id}
              >
                <div className="v2-community-card-image">
                  <span>✦</span>
                </div>
                <div className="v2-community-card-body">
                  <h2>{tree.title}</h2>
                  {tree.memo ? <p>{tree.memo}</p> : null}
                  {tree.keywords && tree.keywords.length > 0 ? (
                    <div className="v2-memory-tags" style={{ marginTop: "10px" }}>
                      {tree.keywords.slice(0, 3).map((kw) => <span key={kw}>#{kw}</span>)}
                    </div>
                  ) : null}
                </div>
                <div className="v2-community-card-foot">
                  <span>♡ {tree.likeCount ?? 0}</span>
                  <span>조회 {tree.viewCount ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
