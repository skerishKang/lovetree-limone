"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { TreeRecord } from "@/lib/tree-types";
import V2TreeCreateFlow from "./V2TreeCreateFlow";

export default function V2Home() {
  const { user, login, logout, loginPending, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const [isStartOpen, setIsStartOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("start") === "tree";
  });
  const [communityTrees, setCommunityTrees] = useState<TreeRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsStartOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadCommunityTrees = useCallback(async () => {
    try {
      const response = await apiFetch("/api/community/trees?limit=6&sort=latest");
      const data = await response.json().catch(() => []);
      if (response.ok) setCommunityTrees(Array.isArray(data) ? data : []);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => { loadCommunityTrees(); }, [loadCommunityTrees]);

  function handleCreated(treeId: string) {
    setIsStartOpen(false);
    setToast("러브트리의 첫 자리를 만들었어요.");
    router.push(`/v2/trees/${treeId}`);
  }

  return (
    <div className="v2-home">
      <div className="v2-ambient v2-ambient-one" />
      <div className="v2-ambient v2-ambient-two" />
      {authError && (
        <div className="v2-auth-feedback" role="alert" aria-live="polite">
          <span>{authError}</span>
          <button type="button" onClick={clearAuthError} aria-label="로그인 오류 닫기">×</button>
        </div>
      )}

      <header className="v2-topbar">
        <a className="v2-brand" href="#top">
          <span className="v2-brand-mark" aria-hidden="true"><i /><b /></span>
          LoveTree
        </a>
        <nav className="v2-topnav" aria-label="러브트리 메뉴">
          <Link href="/v2/my-trees">내 러브트리</Link>
          <Link href="/v2/community">둘러보기</Link>
          {user ? (
            <span className="v2-nav-user">
              <span className="v2-nav-user-name">{user.displayName || user.email || "내 계정"}</span>
              <button className="v2-nav-login" type="button" onClick={() => void logout()}>로그아웃</button>
            </span>
          ) : (
            <button
              className="v2-nav-login"
              type="button"
              onClick={() => void login()}
              disabled={loginPending}
            >
              {loginPending ? "로그인 중…" : "로그인"}
            </button>
          )}
        </nav>
      </header>

      <section className="v2-hero-section" id="top" aria-label="LoveTree 소개">
        <div className="v2-hero-copy">
          <p className="v2-eyebrow">for every feeling</p>
          <h1>
            사랑에 빠지는 <span>순간을 하나의</span>
            <em>러브트리로</em>
            <strong>이어 보세요</strong>
          </h1>
          <p className="v2-hero-description">
            처음 발견한 영상, 다시 찾은 장면, 그때의 마음과 다음 순간을 한 그루의 나무처럼 이어 보세요.
          </p>
          <div className="v2-hero-actions">
            <button
              className="v2-button v2-button-primary"
              type="button"
              onClick={() => setIsStartOpen(true)}
            >
              <span aria-hidden="true">+</span>첫 순간 심기
            </button>
            <Link className="v2-button v2-button-quiet" href="/v2/community">
              러브트리 둘러보기<span aria-hidden="true"> →</span>
            </Link>
          </div>
          <p className="v2-hero-note">
            <span aria-hidden="true">✦</span> 처음에는 단 하나의 순간만 있어도 충분해요.
          </p>
          <div className="v2-growth-proof" id="story">
            <div className="v2-proof-label">러브트리는 이렇게 자라요</div>
            <div className="v2-proof-line" aria-label="발견, 기록, 연결, 성장">
              <span className="v2-proof-item active"><b>01</b> 발견</span>
              <i aria-hidden="true" />
              <span className="v2-proof-item"><b>02</b> 기록</span>
              <i aria-hidden="true" />
              <span className="v2-proof-item"><b>03</b> 연결</span>
              <i aria-hidden="true" />
              <span className="v2-proof-item"><b>04</b> 성장</span>
            </div>
          </div>
        </div>

        <div className="v2-tree-stage" aria-label="첫 순간에서 러브트리가 자라는 예시">
          <div className="v2-stage-topline">
            <span><i className="v2-live-dot" /> 러브트리 미리보기</span>
            <span className="v2-stage-season">season 01</span>
          </div>
          <div className="v2-tree-canvas">
            <div className="v2-sun-orbit v2-orbit-one" />
            <div className="v2-sun-orbit v2-orbit-two" />
            <div className="v2-trunk" />
            <div className="v2-branch v2-branch-left" />
            <div className="v2-branch v2-branch-right" />
            <div className="v2-leaf v2-leaf-one" />
            <div className="v2-leaf v2-leaf-two" />
            <div className="v2-leaf v2-leaf-three" />
            <div className="v2-moment-card v2-moment-root">
              <div className="v2-moment-media v2-media-root"><small>01:30</small></div>
              <div className="v2-moment-body">
                <span className="v2-moment-tag">처음 발견한 순간</span>
                <h2>처음 마음이 멈춘 장면</h2>
                <p>짧은 영상 하나가 이상하게 오래 마음에 남았어요.</p>
              </div>
            </div>
            <div className="v2-moment-card v2-branch-card-a">
              <div className="v2-moment-media v2-media-a"><small>03:12</small></div>
              <div className="v2-moment-body">
                <span className="v2-moment-tag">팬의 추천</span>
                <h2>다시 찾은 노래</h2>
                <p>이 장면을 보면 계속 생각나는 곡이에요.</p>
              </div>
            </div>
            <div className="v2-moment-card v2-branch-card-b">
              <div className="v2-moment-media v2-media-b"><small>07:48</small></div>
              <div className="v2-moment-body">
                <span className="v2-moment-tag">내가 고른 다음 순간</span>
                <h2>오래 간직할 문장</h2>
                <p>오늘의 마음을 잊지 않게 적어 두었어요.</p>
              </div>
            </div>
            <div className="v2-pip v2-pip-left"><span>♥</span> 팬의 추천</div>
            <div className="v2-pip v2-pip-right"><span>✦</span> 내가 고른 다음 순간</div>
            <div className="v2-stage-seed" aria-hidden="true">✦</div>
          </div>
          <div className="v2-stage-caption">
            <span className="caption-rule" />
            <p>한 장면에서 시작한 마음이<br /><b>다음 장면과 연결되어 자라나요.</b></p>
          </div>
        </div>
      </section>

      <section className="v2-story-strip" id="browse" aria-label="러브트리 특징">
        <div className="v2-strip-card">
          <span>01</span>
          <strong>첫 순간</strong>
          <p>마음이 멈춘 정확한 장면을 심어 보세요.</p>
        </div>
        <div className="v2-strip-card">
          <span>02</span>
          <strong>감정 메모</strong>
          <p>그때의 말과 감정을 짧게 기록해요.</p>
        </div>
        <div className="v2-strip-card">
          <span>03</span>
          <strong>다음 가지</strong>
          <p>팬의 추천으로 이야기의 흐름을 이어가요.</p>
        </div>
      </section>

      <section className="v2-story-strip" style={{ paddingTop: "40px", borderTop: "1px solid var(--v2-line)" }} aria-label="공개 러브트리">
        <div className="v2-strip-card" style={{ borderTop: "none" }}>
          <p className="v2-eyebrow">PUBLIC LOVE TREES</p>
          <strong style={{ fontSize: "1.4rem" }}>마음이 닿은 트리들</strong>
          <p>다른 팬들이 가꾼 따뜻한 트리를 만나보세요.</p>
          <Link className="v2-button v2-button-quiet" href="/v2/community" style={{ marginTop: "16px", display: "inline-flex" }}>
            천천히 둘러보기 <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {communityTrees.slice(0, 2).map((tree) => (
          <Link className="v2-strip-card" href={`/v2/trees/${tree.id}`} key={tree.id} style={{ textDecoration: "none", display: "block" }}>
            <span>✦</span>
            <strong>{tree.title}</strong>
            <p>{tree.memo || "마음이 자라기 시작한 러브트리"}</p>
            <small style={{ color: "var(--v2-muted)", fontSize: ".6rem", marginTop: "8px", display: "block" }}>
              ♡ {tree.likeCount ?? 0}
            </small>
          </Link>
        ))}
      </section>

      <footer className="v2-site-footer">
        <span>LoveTree</span>
        <span>마음이 시작된 순간을 오래 간직하는 법</span>
      </footer>

      {isStartOpen && (
        <V2TreeCreateFlow
          onClose={() => {
            setIsStartOpen(false);
            router.replace("/v2");
          }}
          onCreated={handleCreated}
        />
      )}

      {toast && (
        <div className="v2-toast" role="status">
          <span>✿</span> {toast}
          <button type="button" onClick={() => setToast(null)} aria-label="알림 닫기">×</button>
        </div>
      )}
    </div>
  );
}
