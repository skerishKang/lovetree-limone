"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { localDateValue } from "@/lib/tree-types";
import EmailAuthForm from "./components/EmailAuthForm";
import "./styles/email-auth.css";

const cards = [
  { tag: "처음 발견한 순간", title: "처음 마음이 멈춘 장면", time: "01:30", note: "짧은 영상 하나가 이상하게 오래 마음에 남았어요." },
  { tag: "팬의 추천", title: "다시 찾은 노래", time: "03:12", note: "이 장면을 보면 계속 생각나는 곡이에요." },
  { tag: "내가 고른 다음 순간", title: "오래 간직할 문장", time: "07:48", note: "오늘의 마음을 잊지 않게 적어 두었어요." },
];

const KIND_TO_SOURCE_TYPE: Record<string, string> = {
  영상: "youtube",
  노래: "song",
  책: "book",
  사람: "person",
  여행: "travel",
  기타: "other",
};

const BROWSE_SORTS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "views", label: "조회순" },
] as const;

type BrowseSort = (typeof BROWSE_SORTS)[number]["value"];

interface CommunityTree {
  id: string;
  title: string;
  artist?: string;
  memo?: string;
  groupName?: string | null;
  keywords?: string[];
  likeCount?: number;
  viewCount?: number;
}

function AuthFeedback({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;

  return (
    <div className="auth-feedback" role="alert" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="로그인 오류 닫기">×</button>
    </div>
  );
}

export default function Home() {
  const { user, loading, login, logout, loginPending, authError, clearAuthError } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"home" | "discovery" | "browse">(() => {
    if (typeof window === "undefined") return "home";
    return new URLSearchParams(window.location.search).get("view") === "browse" ? "browse" : "home";
  });
  const [isStartOpen, setIsStartOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("start") === "tree";
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [treeName, setTreeName] = useState("건호에게 입덕한 3일");
  const [selectedKind, setSelectedKind] = useState("영상");
  const [note, setNote] = useState("");
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [plantError, setPlantError] = useState<string | null>(null);
  const [treeClientKey] = useState<string>(() => crypto.randomUUID());
  const [memoryClientKey, setMemoryClientKey] = useState<string>(() => crypto.randomUUID());
  const [momentDate, setMomentDate] = useState(localDateValue);
  const [browseSort, setBrowseSort] = useState<BrowseSort>("latest");
  const [communityTrees, setCommunityTrees] = useState<CommunityTree[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStartOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("view") !== "browse") return;
    const timer = window.setTimeout(() => void loadCommunityTrees("latest"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function loadCommunityTrees(sort: BrowseSort) {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const res = await apiFetch(`/api/community/trees?view=summary&sort=${sort}&limit=24`);
      const data = (await res.json().catch(() => [])) as CommunityTree[] | { error?: string };
      if (!res.ok) {
        setBrowseError("러브트리를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setCommunityTrees(Array.isArray(data) ? data : []);
    } catch {
      setBrowseError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setBrowseLoading(false);
    }
  }

  function openBrowse() {
    setView("browse");
    window.scrollTo({ top: 0 });
    void loadCommunityTrees(browseSort);
  }

  async function startTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!treeName.trim()) return;
    if (!user) {
      await login();
      return;
    }
    setSaving(true);
    setTreeError(null);
    try {
      const res = await apiFetch("/api/trees", {
        method: "POST",
        body: JSON.stringify({ title: treeName, clientKey: treeClientKey }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setTreeError(data.error || "러브트리를 만들지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setCurrentTreeId(data.id);
      setMemoryClientKey(crypto.randomUUID());
      setIsStartOpen(false);
      setView("discovery");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setTreeError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function plantMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!note.trim()) return;
    if (!user) {
      await login();
      return;
    }
    if (!currentTreeId) {
      setPlantError("아직 러브트리가 없어요. 처음 화면에서 러브트리를 먼저 만들어 주세요.");
      return;
    }
    setSaving(true);
    setPlantError(null);
    try {
      const res = await apiFetch(`/api/trees/${currentTreeId}/memories`, {
        method: "POST",
        body: JSON.stringify({
          sourceType: KIND_TO_SOURCE_TYPE[selectedKind] ?? "other",
          memo: note,
          clientKey: memoryClientKey,
          timestamp: momentDate,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setPlantError(data.error || "이 순간을 심지 못했어요. 다시 시도해 주세요.");
        return;
      }
      router.push(`/trees/${currentTreeId}`);
    } catch {
      setPlantError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (view === "discovery") {
    return (
      <section className="flow-screen" aria-labelledby="discovery-title">
        <AuthFeedback message={authError} onDismiss={clearAuthError} />
        <div className="flow-shell">
          <div className="flow-top"><button className="flow-back" type="button" onClick={() => setView("home")}>← 처음 화면으로</button><span className="flow-step">plant your first moment</span></div>
          <div className="flow-progress" aria-label="러브트리 만들기 진행률"><span /></div>
          <div className="discovery-grid">
            <div className="discovery-copy">
              <p className="eyebrow">01 · 처음 발견</p>
              <h1 id="discovery-title">마음이 처음 멈춘<br /><em>그 순간을 심어볼까요?</em></h1>
              <p>완벽하게 설명하지 않아도 괜찮아요. 어디서 발견했는지, 어떤 감정이었는지만 남겨 두면 러브트리의 첫 가지가 자라기 시작해요.</p>
              <form className="discovery-form" onSubmit={plantMoment}>
                <span className="field-label">어디에서 발견했나요?</span>
                <div className="kind-list" role="group" aria-label="발견한 곳 선택">
                  {["영상", "노래", "책", "사람", "여행", "기타"].map((kind) => <button className={`kind${selectedKind === kind ? " selected" : ""}`} type="button" key={kind} onClick={() => setSelectedKind(kind)}>{kind}</button>)}
                </div>
                <label className="field-label" htmlFor="discovery-note">그때 어떤 마음이었나요?</label>
                <textarea id="discovery-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="예: 우연히 보게 됐는데, 하루 종일 이 장면이 생각났어." />
                <input type="date" aria-label="발견한 날짜" value={momentDate} onChange={(event) => setMomentDate(event.target.value)} />
                <div className="discovery-actions"><button className="button button-primary" type="submit" disabled={saving || loginPending} aria-busy={loginPending}>{loginPending ? "로그인 중…" : saving ? "심는 중…" : "이 순간 심기"} <span aria-hidden="true">→</span></button><span className="discovery-hint">나중에 다시 수정할 수 있어요.</span></div>
                {plantError && <p className="flow-error" role="alert">{plantError}</p>}
              </form>
            </div>
            <aside className="seed-preview" aria-label="첫 순간 미리보기"><div className="seed-window"><div className="seed-glow" /><div className="seed-orb">✦</div><div className="seed-preview-copy"><span>your first seed</span><strong>{treeName}</strong><p>지금 적은 순간이 러브트리의 뿌리가 됩니다.</p></div></div></aside>
          </div>
        </div>
      </section>
    );
  }

  if (view === "browse") {
    return (
      <section className="browse-screen" aria-labelledby="browse-title">
        <AuthFeedback message={authError} onDismiss={clearAuthError} />
        <div className="browse-shell">
          <div className="flow-top"><button className="flow-back" type="button" onClick={() => { setView("home"); window.scrollTo({ top: 0 }); }}>← 처음 화면으로</button><span className="flow-step">community garden</span></div>
          <header className="browse-header">
            <div className="browse-heading">
              <p className="eyebrow">02 · 함께 자라는 정원</p>
              <h1 id="browse-title">마음이 자라는<br /><em>이웃의 러브트리</em></h1>
              <p>공개된 러브트리를 둘러보세요. 누군가의 첫 순간이 당신의 다음 순간이 될지도 몰라요.</p>
            </div>
            {!browseLoading && communityTrees.length > 0 && <div className="browse-meta"><span className="browse-count"><b>{communityTrees.length}</b>그루의 러브트리</span></div>}
          </header>
          <div className="browse-toolbar"><div className="browse-sorts" role="group" aria-label="러브트리 정렬">{BROWSE_SORTS.map((s) => <button className={`kind${browseSort === s.value ? " selected" : ""}`} type="button" key={s.value} onClick={() => { setBrowseSort(s.value); void loadCommunityTrees(s.value); }}>{s.label}</button>)}</div></div>
          {browseError ? (
            <div className="browse-empty"><span aria-hidden="true">✦</span><p role="alert">{browseError}</p><button className="button button-quiet" type="button" onClick={() => void loadCommunityTrees(browseSort)}>다시 시도 <span aria-hidden="true">→</span></button></div>
          ) : browseLoading && communityTrees.length === 0 ? (
            <div className="browse-grid" aria-busy="true" aria-label="러브트리를 불러오는 중">{Array.from({ length: 8 }, (_, i) => <div className="tree-card tree-skeleton" key={i} aria-hidden="true"><div className="sk-media" /><div className="sk-line w70" /><div className="sk-line w90" /><div className="sk-line w45" /></div>)}</div>
          ) : communityTrees.length === 0 ? (
            <div className="browse-empty"><span aria-hidden="true">✦</span><p>아직 공개된 러브트리가 없어요.</p><p className="browse-empty-sub">첫 번째 러브트리를 심어 정원을 시작해 보세요.</p><button className="button button-primary" type="button" onClick={() => { setView("home"); setIsStartOpen(true); window.scrollTo({ top: 0 }); }}><span aria-hidden="true">+</span>첫 순간 심기</button></div>
          ) : (
            <div className="browse-grid">{communityTrees.map((tree, index) => <Link className={`tree-card tilt-${index % 3}`} href={`/trees/${tree.id}`} key={tree.id} style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}><div className={`tree-card-media tmedia-${index % 4}`}><span className="tree-glyph" aria-hidden="true">✦</span>{tree.groupName ? <span className="tree-group">{tree.groupName}</span> : null}</div><div className="tree-card-body"><h2>{tree.title}</h2>{tree.artist ? <p className="tree-artist">{tree.artist}</p> : null}{tree.memo ? <p className="tree-memo">{tree.memo}</p> : null}{tree.keywords && tree.keywords.length > 0 ? <div className="tree-keywords">{tree.keywords.slice(0, 3).map((k) => <span key={k}>#{k}</span>)}</div> : null}</div><div className="tree-card-foot"><span className="tree-like"><span aria-hidden="true">♥</span> {tree.likeCount ?? 0}</span><span className="tree-views">{tree.viewCount ?? 0}번 봤어요</span></div></Link>)}</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
      <header className="topbar"><a className="brand" href="#top" aria-label="LoveTree 홈"><span className="brand-mark" aria-hidden="true"><i /><b /></span><span>LoveTree</span></a><nav className="topnav" aria-label="주요 메뉴"><a href="#story">러브트리 소개</a><button className="nav-link" type="button" onClick={openBrowse}>둘러보기</button><Link href="/v4/journey" className="v4-preview-btn" aria-label="V4 미리보기 화면 보기">V4 미리보기</Link>{loading ? null : user ? <span className="nav-user"><Link className="nav-link" href="/my-trees">내 러브트리</Link><span className="nav-user-name">{user.displayName || user.email}</span><button className="nav-login" type="button" onClick={() => void logout()}>로그아웃</button></span> : <button className="nav-login" type="button" onClick={() => setIsAuthOpen(true)} aria-haspopup="dialog">로그인</button>}</nav></header>
      <AuthFeedback message={authError} onDismiss={clearAuthError} />
      <main id="top"><section className="hero-section" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">A little garden for every feeling</p><h1 id="hero-title">사랑에 빠지는 <span>순간을 하나의</span><em>러브트리로</em><strong>이어 보세요</strong></h1><p className="hero-description">처음 발견한 영상, 다시 찾은 장면, 그때의 마음과 다음 순간을 한 그루의 나무처럼 이어 보세요.</p><div className="hero-actions"><button className="button button-primary" type="button" onClick={() => setIsStartOpen(true)}><span aria-hidden="true">+</span>첫 순간 심기</button><button className="button button-quiet" type="button" onClick={openBrowse}>러브트리 둘러보기<span aria-hidden="true">→</span></button></div><p className="hero-note"><span aria-hidden="true">✦</span> 처음에는 단 하나의 순간만 있어도 충분해요.</p><div className="growth-proof" id="story"><div className="proof-label">러브트리는 이렇게 자라요</div><div className="proof-line" aria-label="발견, 기록, 연결, 성장"><span className="proof-item active"><b>01</b> 발견</span><i aria-hidden="true" /><span className="proof-item"><b>02</b> 기록</span><i aria-hidden="true" /><span className="proof-item"><b>03</b> 연결</span><i aria-hidden="true" /><span className="proof-item"><b>04</b> 성장</span></div></div></div>
        <div className="tree-stage" aria-label="첫 순간에서 러브트리가 자라는 예시"><div className="stage-topline"><span><i className="live-dot" /> 러브트리 미리보기</span><span className="stage-season">season 01</span></div><div className="tree-canvas"><div className="sun-orbit orbit-one" /><div className="sun-orbit orbit-two" /><div className="trunk" /><div className="branch branch-left" /><div className="branch branch-right" /><div className="leaf leaf-one" /><div className="leaf leaf-two" /><div className="leaf leaf-three" />{cards.map((card, index) => <article className={`moment-card ${index === 0 ? "moment-root" : index === 1 ? "branch-card-a" : "branch-card-b"}`} key={card.tag}><div className={`moment-media media-${index === 0 ? "root" : index === 1 ? "a" : "b"}`}><span aria-hidden="true">{index === 0 ? "▶" : index === 1 ? "▶" : "↗"}</span><small>{card.time}</small></div><div className="moment-body"><span className="moment-tag">{card.tag}</span><h2>{card.title}</h2><p>{card.note}</p>{index === 0 && <span className="moment-source">YouTube · 나의 기록</span>}</div></article>)}<div className="recommend-pip pip-left"><span>♥</span> 팬의 추천</div><div className="recommend-pip pip-right"><span>✦</span> 내가 고른 다음 순간</div><div className="stage-seed" aria-hidden="true"><span>✦</span></div></div><div className="stage-caption"><span className="caption-rule" /><p>한 장면에서 시작한 마음이<br /><b>다음 장면과 연결되어 자라나요.</b></p></div></div>
      </section><section className="story-strip" id="browse" aria-label="러브트리 특징"><div className="strip-card"><span>01</span><strong>첫 순간</strong><p>마음이 멈춘 정확한 장면을 심어 보세요.</p></div><div className="strip-card"><span>02</span><strong>감정 메모</strong><p>그때의 말과 감정을 짧게 기록해요.</p></div><div className="strip-card"><span>03</span><strong>다음 가지</strong><p>팬의 추천으로 이야기의 흐름을 이어가요.</p></div></section></main>
      {isStartOpen && <div className="modal-backdrop" role="presentation" onClick={() => setIsStartOpen(false)}><div className="seed-modal" role="dialog" aria-modal="true" aria-labelledby="seed-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setIsStartOpen(false)} aria-label="닫기">×</button><p className="eyebrow">plant your first moment</p><h2 id="seed-title">어떤 러브트리를<br /><em>처음 심어볼까요?</em></h2><p>최애, 작품, 여행, 공부. 마음이 자란 주제라면 무엇이든 좋아요.</p><form onSubmit={startTree}><label htmlFor="tree-name">러브트리 이름</label><input id="tree-name" value={treeName} onChange={(event) => setTreeName(event.target.value)} required /><button className="button button-primary" type="submit" disabled={saving || loginPending} aria-busy={loginPending}>{loginPending ? "로그인 중…" : saving ? "시작 중…" : "이 이름으로 시작하기"} <span aria-hidden="true">→</span></button></form>{treeError && <p className="flow-error" role="alert">{treeError}</p>}</div></div>}
      <EmailAuthForm open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <footer className="site-footer"><span>LoveTree</span><span>마음이 시작된 순간을 오래 간직하는 법</span></footer>
    </div>
  );
}
