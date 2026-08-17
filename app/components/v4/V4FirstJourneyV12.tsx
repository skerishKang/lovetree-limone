"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EmailAuthForm from "@/app/components/EmailAuthForm";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { createFirstTree, type FirstCreateTransport } from "@/lib/first-tree-create-client";

const STORAGE_KEY = "lovetree-first-journey-unified";
const SECOND_PENDING_KEY = "lovetree-v12-second-moment-client-key";
const EMOTIONS = ["설렘", "웃음", "위로", "놀람", "존경", "애틋함"] as const;
const RELATIONS = [
  "댓글을 따라 찾아봤어요",
  "팬이 추천해 줬어요",
  "같은 사람의 다른 모습을 더 보고 싶었어요",
  "같은 무대와 노래를 더 찾아봤어요",
  "내가 직접 다시 검색했어요",
] as const;

type CanonicalRefs = { treeId: string; firstMemoryId: string; secondMemoryId?: string };
type FirstMomentDraft = { url: string; title: string; note: string; discoveryDate: string };
type MemoryDraft = { emotion: string; note: string };
type SecondMomentDraft = { url: string; title: string; note: string; relation: string; whyNext: string };
type DraftState = {
  treeName: string;
  firstMoment: FirstMomentDraft;
  memory: MemoryDraft;
  secondMoment: SecondMomentDraft;
};
type StoredDraftSnapshot = DraftState & { version: 2 };
type JsonRecord = Record<string, unknown>;
type PathChoice = "MAIN" | "BRANCH" | null;

const today = () => new Date().toISOString().slice(0, 10);

function defaultDraft(): DraftState {
  return {
    treeName: "",
    firstMoment: { url: "", title: "", note: "", discoveryDate: today() },
    memory: { emotion: "설렘", note: "" },
    secondMoment: { url: "", title: "", note: "", relation: RELATIONS[0], whyNext: "" },
  };
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function readString(record: JsonRecord | null, key: string, fallback: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : fallback;
}

function youtubeId(value: string): string | null {
  const match = value.trim().match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/,
  );
  return match?.[1] ?? null;
}

function thumbnailFor(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function persistDraftSnapshot(storageKey: string, draft: DraftState): void {
  const snapshot: StoredDraftSnapshot = {
    version: 2,
    treeName: draft.treeName,
    firstMoment: {
      url: draft.firstMoment.url,
      title: draft.firstMoment.title,
      note: draft.firstMoment.note,
      discoveryDate: draft.firstMoment.discoveryDate,
    },
    memory: { emotion: draft.memory.emotion, note: draft.memory.note },
    secondMoment: {
      url: draft.secondMoment.url,
      title: draft.secondMoment.title,
      note: draft.secondMoment.note,
      relation: draft.secondMoment.relation,
      whyNext: draft.secondMoment.whyNext,
    },
  };
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function loadDraftSnapshot(storageKey: string): DraftState {
  const base = defaultDraft();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return base;
    const parsed = asRecord(JSON.parse(raw));
    if (!parsed) throw new Error("malformed journey draft");
    const first = asRecord(parsed.firstMoment);
    const memory = asRecord(parsed.memory);
    const second = asRecord(parsed.secondMoment);
    return {
      treeName: readString(parsed, "treeName", base.treeName),
      firstMoment: {
        url: readString(first, "url", base.firstMoment.url),
        title: readString(first, "title", base.firstMoment.title),
        note: readString(first, "note", base.firstMoment.note),
        discoveryDate: readString(first, "discoveryDate", base.firstMoment.discoveryDate),
      },
      memory: {
        emotion: readString(memory, "emotion", base.memory.emotion),
        note: readString(memory, "note", base.memory.note),
      },
      secondMoment: {
        url: readString(second, "url", base.secondMoment.url),
        title: readString(second, "title", base.secondMoment.title),
        note: readString(second, "note", base.secondMoment.note),
        relation: readString(second, "relation", base.secondMoment.relation),
        whyNext: readString(second, "whyNext", base.secondMoment.whyNext),
      },
    };
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Optional draft storage only.
    }
    return base;
  }
}

function requireFirstInput(draft: DraftState): { videoId: string } {
  if (!draft.treeName.trim()) throw new Error("러브트리 이름을 입력해 주세요.");
  if (!draft.firstMoment.title.trim()) throw new Error("첫 순간의 제목을 입력해 주세요.");
  const videoId = youtubeId(draft.firstMoment.url);
  if (!videoId) throw new Error("유효한 YouTube 주소를 입력해 주세요.");
  return { videoId };
}

function requireSecondInput(draft: DraftState): { videoId: string; whyNext: string } {
  if (!draft.secondMoment.title.trim()) throw new Error("다음 순간의 제목을 입력해 주세요.");
  const videoId = youtubeId(draft.secondMoment.url);
  if (!videoId) throw new Error("다음 순간의 유효한 YouTube 주소를 입력해 주세요.");
  const whyNext = draft.secondMoment.whyNext.trim();
  if (!whyNext) throw new Error("WHY NEXT를 직접 입력해 주세요.");
  return { videoId, whyNext };
}

export default function V4FirstJourneyV12({
  onActivate,
  storageKey = STORAGE_KEY,
  fetchFn,
}: {
  onActivate?: () => void;
  storageKey?: string;
  fetchFn?: FirstCreateTransport;
}) {
  const router = useRouter();
  const { user, authError, clearAuthError } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => defaultDraft());
  const [canonical, setCanonical] = useState<CanonicalRefs | null>(null);
  const [firstSaved, setFirstSaved] = useState(false);
  const [memorySaved, setMemorySaved] = useState(false);
  const [secondSaved, setSecondSaved] = useState(false);
  const [pathChoice, setPathChoice] = useState<PathChoice>(null);
  const [v12Step, setV12Step] = useState(0);
  const [toast, setToast] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingFirstSave, setPendingFirstSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSecondKey = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const hydrated = loadDraftSnapshot(storageKey);
      setDraft(hydrated);
      try {
        // Rewrites only the approved draft schema. Any stale canonical IDs,
        // saved flags, connection memoryIds, and completion claims disappear.
        persistDraftSnapshot(storageKey, hydrated);
      } catch {
        // localStorage is not required for canonical writes.
      }
      setMounted(true);
      onActivate?.();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [onActivate, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    const element = scrollRef.current;
    if (!element) return;
    const handleScroll = () => {
      const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
      const step = Math.max(0, Math.min(4, Math.round((element.scrollTop / maxScroll) * 4)));
      setV12Step(step);
    };
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2000);
  }, []);

  const updateDraft = useCallback((updater: (previous: DraftState) => DraftState) => {
    setDraft((previous) => {
      const next = updater(previous);
      try {
        persistDraftSnapshot(storageKey, next);
      } catch {
        // Draft persistence is best-effort and never canonical authority.
      }
      return next;
    });
  }, [storageKey]);

  const setFirstDraft = useCallback(<K extends keyof FirstMomentDraft>(key: K, value: FirstMomentDraft[K]) => {
    updateDraft((previous) => ({ ...previous, firstMoment: { ...previous.firstMoment, [key]: value } }));
  }, [updateDraft]);

  const setMemoryDraft = useCallback(<K extends keyof MemoryDraft>(key: K, value: MemoryDraft[K]) => {
    updateDraft((previous) => ({ ...previous, memory: { ...previous.memory, [key]: value } }));
  }, [updateDraft]);

  const setSecondDraft = useCallback(<K extends keyof SecondMomentDraft>(key: K, value: SecondMomentDraft[K]) => {
    updateDraft((previous) => ({ ...previous, secondMoment: { ...previous.secondMoment, [key]: value } }));
  }, [updateDraft]);

  const ensureSecondClientKey = useCallback((): string => {
    if (pendingSecondKey.current) return pendingSecondKey.current;
    try {
      const stored = localStorage.getItem(SECOND_PENDING_KEY);
      if (stored) {
        pendingSecondKey.current = stored;
        return stored;
      }
    } catch {
      // Continue with an in-memory retry key.
    }
    const generated = `v12-second-${crypto.randomUUID()}`;
    pendingSecondKey.current = generated;
    try {
      localStorage.setItem(SECOND_PENDING_KEY, generated);
    } catch {
      // In-memory key remains stable for this session.
    }
    return generated;
  }, []);

  const retireSecondClientKey = useCallback(() => {
    pendingSecondKey.current = null;
    try {
      localStorage.removeItem(SECOND_PENDING_KEY);
    } catch {
      // noop
    }
  }, []);

  const performFirstSave = useCallback(async () => {
    let videoId: string;
    try {
      ({ videoId } = requireFirstInput(draft));
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "첫 순간 입력을 확인해 주세요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    clearAuthError();
    try {
      const sourceUrl = draft.firstMoment.url.trim();
      const title = draft.firstMoment.title.trim();
      const note = draft.firstMoment.note.trim();
      const { treeId, memoryId } = await createFirstTree({
        payload: {
          title: draft.treeName.trim(),
          visibility: "public",
          memory: {
            title,
            memo: note,
            source: "YouTube",
            sourceUrl,
            sourceType: "youtube",
            thumbnail: thumbnailFor(videoId),
            emotionTags: [],
            timestamp: draft.firstMoment.discoveryDate,
            visibility: "public",
          },
        },
        fetchFn: fetchFn ?? apiFetch,
      });
      setCanonical({ treeId, firstMemoryId: memoryId });
      setFirstSaved(true);
      setV12Step(1);
      showToast("첫 순간이 저장되었습니다.");
    } catch (cause) {
      setFirstSaved(false);
      setCanonical(null);
      const message = cause instanceof Error ? cause.message : "첫 순간을 저장하지 못했어요.";
      setSaveError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  }, [clearAuthError, draft, fetchFn, showToast]);

  const submitFirstMoment = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setPendingFirstSave(true);
      setAuthOpen(true);
      return;
    }
    await performFirstSave();
  }, [performFirstSave, user]);

  useEffect(() => {
    if (!pendingFirstSave || !user || saving) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setPendingFirstSave(false);
      setAuthOpen(false);
      void performFirstSave();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pendingFirstSave, performFirstSave, saving, user]);

  const submitMemory = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canonical) {
      setSaveError("먼저 첫 순간을 저장해 주세요.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    clearAuthError();
    try {
      const payload: Record<string, unknown> = { emotionTags: [draft.memory.emotion] };
      const memo = draft.memory.note.trim();
      if (memo) payload.memo = memo;
      const response = await (fetchFn ?? apiFetch)(
        `/api/memories/${encodeURIComponent(canonical.firstMemoryId)}`,
        { method: "PUT", body: JSON.stringify(payload) },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "마음을 기록하지 못했어요.");
      }
      setMemorySaved(true);
      setV12Step(2);
      showToast("첫 마음이 기록되었습니다.");
    } catch (cause) {
      setMemorySaved(false);
      const message = cause instanceof Error ? cause.message : "마음을 기록하지 못했어요.";
      setSaveError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  }, [canonical, clearAuthError, draft.memory, fetchFn, showToast]);

  const submitSecondMoment = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canonical) {
      setSaveError("먼저 첫 순간을 저장해 주세요.");
      return;
    }
    let input: { videoId: string; whyNext: string };
    try {
      input = requireSecondInput(draft);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "다음 순간 입력을 확인해 주세요.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    clearAuthError();
    const clientKey = ensureSecondClientKey();
    try {
      const response = await (fetchFn ?? apiFetch)(
        `/api/trees/${encodeURIComponent(canonical.treeId)}/memories`,
        {
          method: "POST",
          body: JSON.stringify({
            clientKey,
            parentId: canonical.firstMemoryId,
            title: draft.secondMoment.title.trim(),
            memo: draft.secondMoment.note.trim(),
            source: "YouTube",
            sourceUrl: draft.secondMoment.url.trim(),
            sourceType: "youtube",
            thumbnail: thumbnailFor(input.videoId),
            connectionReason: input.whyNext,
            emotionTags: [],
            visibility: "public",
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error || "다음 순간을 저장하지 못했어요.");
      retireSecondClientKey();
      setCanonical((previous) => previous ? { ...previous, secondMemoryId: data.id } : previous);
      setSecondSaved(true);
      setV12Step(3);
      showToast("다음 순간이 연결되었습니다.");
    } catch (cause) {
      setSecondSaved(false);
      const message = cause instanceof Error ? cause.message : "다음 순간을 저장하지 못했어요.";
      setSaveError(message);
      showToast(message);
    } finally {
      setSaving(false);
    }
  }, [canonical, clearAuthError, draft, ensureSecondClientKey, fetchFn, retireSecondClientKey, showToast]);

  const completeJourney = useCallback(() => {
    if (!canonical?.treeId || !canonical.secondMemoryId) {
      setSaveError("실제로 저장된 두 번째 순간이 있어야 러브트리를 열 수 있어요.");
      return;
    }
    const destination = `/trees/${encodeURIComponent(canonical.treeId)}?highlight=${encodeURIComponent(canonical.secondMemoryId)}`;
    router.push(destination);
  }, [canonical, router]);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem("lovetree-v4-product-spine-create-client-key");
      localStorage.removeItem(SECOND_PENDING_KEY);
    } catch {
      // noop
    }
    pendingSecondKey.current = null;
    setDraft(defaultDraft());
    setCanonical(null);
    setFirstSaved(false);
    setMemorySaved(false);
    setSecondSaved(false);
    setPathChoice(null);
    setV12Step(0);
    setSaveError(null);
    setPendingFirstSave(false);
    setAuthOpen(false);
  }, [storageKey]);

  if (!mounted) return null;

  const firstVideoId = youtubeId(draft.firstMoment.url);
  const secondVideoId = youtubeId(draft.secondMoment.url);
  const progressPct = Math.min(100, (v12Step / 4) * 100);

  return (
    <div className="v4-j-v12" data-testid="canonical-first-journey-v12">
      <div className="v4-j-v12-progress" role="progressbar" aria-valuenow={v12Step} aria-valuemin={0} aria-valuemax={4}>
        <div className="v4-j-v12-progress-bar" style={{ width: `${progressPct}%` }} />
        <span className="v4-j-v12-step-label">
          {v12Step === 0 && "첫 순간 발견"}
          {v12Step === 1 && "마음 남기기"}
          {v12Step === 2 && "WHY NEXT"}
          {v12Step === 3 && "MAIN / BRANCH"}
          {v12Step >= 4 && "완성!"}
        </span>
      </div>

      {saveError ? <p className="v4-j-v12-error" role="alert">{saveError}</p> : null}
      {authError ? <p className="v4-j-v12-error" role="alert">{authError}</p> : null}

      <div className="v4-j-v12-scroll" ref={scrollRef} data-testid="v12-scroll-container">
        <section className={`v4-j-v12-section ${v12Step === 0 ? "v4-j-v12-active" : ""}`} data-step="first-moment">
          <div className="v4-j-v12-sticky">
            <div className="v4-j-v12-hero">
              <div className="v4-j-v12-miniature">
                <div
                  className="v4-j-v12-mini-card"
                  style={firstVideoId ? { backgroundImage: `url(${thumbnailFor(firstVideoId)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  <span className="v4-j-v12-mini-icon">✦</span>
                </div>
              </div>
              <div className="v4-j-v12-hero-content">
                <h1 className="v4-j-v12-title">
                  <span className="v4-j-v12-eyebrow">00 — First Moment</span>
                  <em>{draft.firstMoment.title.trim() || "나의 첫 순간"}</em>
                </h1>
                <p className="v4-j-v12-note">직접 입력한 순간이 실제 러브트리의 첫 뿌리가 됩니다.</p>
                {!firstSaved ? (
                  <form onSubmit={submitFirstMoment} className="v4-j-v12-form" data-testid="first-moment-form">
                    <input className="v4-j-v12-why-input" type="text" placeholder="러브트리 이름" value={draft.treeName} onChange={(event) => updateDraft((previous) => ({ ...previous, treeName: event.target.value }))} data-testid="tree-name-input" />
                    <input className="v4-j-v12-why-input" type="url" placeholder="YouTube 주소" value={draft.firstMoment.url} onChange={(event) => setFirstDraft("url", event.target.value)} data-testid="first-url-input" />
                    <input className="v4-j-v12-why-input" type="text" placeholder="첫 순간 제목" value={draft.firstMoment.title} onChange={(event) => setFirstDraft("title", event.target.value)} data-testid="first-title-input" />
                    <textarea className="v4-j-v12-textarea" placeholder="이 순간에 남기고 싶은 메모" rows={3} value={draft.firstMoment.note} onChange={(event) => setFirstDraft("note", event.target.value)} data-testid="first-note-input" />
                    <input className="v4-j-v12-why-input" type="date" value={draft.firstMoment.discoveryDate} onChange={(event) => setFirstDraft("discoveryDate", event.target.value)} data-testid="first-date-input" />
                    <button type="submit" className="v4-j-v12-cta" data-testid="save-first-moment" disabled={saving}>{saving ? "저장 중…" : "이 순간을 첫 뿌리로 심기"}</button>
                  </form>
                ) : <p className="v4-j-v12-done" data-testid="first-saved">✦ 서버에 첫 순간이 저장되었습니다</p>}
              </div>
            </div>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 1 ? "v4-j-v12-active" : ""}`} data-step="memory">
          <div className="v4-j-v12-sticky">
            <div className="v4-j-v12-step-content">
              <span className="v4-j-v12-eyebrow">01 — 마음 남기기</span>
              <h2>이 순간이 왜 마음에 남았나요?</h2>
              {!memorySaved ? (
                <form onSubmit={submitMemory} className="v4-j-v12-form">
                  <div className="v4-j-v12-chip-group">
                    {EMOTIONS.map((emotion) => (
                      <label key={emotion} className="v4-j-v12-chip">
                        <input type="radio" name="emotion" value={emotion} checked={draft.memory.emotion === emotion} onChange={(event) => setMemoryDraft("emotion", event.target.value)} />
                        <span>{emotion}</span>
                      </label>
                    ))}
                  </div>
                  <textarea className="v4-j-v12-textarea" placeholder="선택 사항: 첫 순간의 메모를 보강할 수 있어요." rows={3} value={draft.memory.note} onChange={(event) => setMemoryDraft("note", event.target.value)} data-testid="memory-note-input" />
                  <button type="submit" className="v4-j-v12-cta" data-testid="save-memory" disabled={saving || !canonical}>마음 남기기</button>
                  <button type="button" className="v4-j-v12-secondary" onClick={() => setV12Step(2)} disabled={!canonical}>WHY NEXT로 계속</button>
                </form>
              ) : <p className="v4-j-v12-done" data-testid="memory-saved">✦ 첫 마음이 서버에 기록되었습니다</p>}
            </div>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 2 ? "v4-j-v12-active" : ""}`} data-step="why-next">
          <div className="v4-j-v12-sticky">
            <span className="v4-j-v12-eyebrow">02 — WHY NEXT</span>
            <h2>그다음 마음이 향한 순간을 직접 적어 주세요.</h2>
            <form onSubmit={submitSecondMoment} className="v4-j-v12-form" data-testid="second-moment-form">
              <div className="v4-j-v12-candidate-visual" style={secondVideoId ? { backgroundImage: `url(${thumbnailFor(secondVideoId)})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span className="v4-j-v12-candidate-icon">▶</span></div>
              <input className="v4-j-v12-why-input" type="url" placeholder="다음 YouTube 주소" value={draft.secondMoment.url} onChange={(event) => setSecondDraft("url", event.target.value)} data-testid="second-url-input" />
              <input className="v4-j-v12-why-input" type="text" placeholder="다음 순간 제목" value={draft.secondMoment.title} onChange={(event) => setSecondDraft("title", event.target.value)} data-testid="second-title-input" />
              <textarea className="v4-j-v12-textarea" placeholder="다음 순간에 남길 메모" rows={3} value={draft.secondMoment.note} onChange={(event) => setSecondDraft("note", event.target.value)} data-testid="second-note-input" />
              <label className="v4-j-v12-relation">
                <span className="v4-j-v12-relation-label">연결 맥락</span>
                <select className="v4-j-v12-select" value={draft.secondMoment.relation} onChange={(event) => setSecondDraft("relation", event.target.value)} data-testid="second-relation-input">
                  {RELATIONS.map((relation) => <option key={relation} value={relation}>{relation}</option>)}
                </select>
              </label>
              <label>
                <small>WHY NEXT</small>
                <input type="text" className="v4-j-v12-why-input" placeholder="왜 이 순간을 다음으로 찾아보게 됐나요?" value={draft.secondMoment.whyNext} onChange={(event) => setSecondDraft("whyNext", event.target.value)} data-testid="why-next-input" />
              </label>
              <button type="submit" className="v4-j-v12-connect-btn" data-testid="save-second-moment" disabled={saving || !canonical || secondSaved}>{secondSaved ? "연결됨" : "실제 다음 순간 저장하기"}</button>
            </form>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step === 3 ? "v4-j-v12-active" : ""}`} data-step="main-branch">
          <div className="v4-j-v12-sticky">
            <span className="v4-j-v12-eyebrow">03 — MAIN / BRANCH</span>
            <h2>이 순간을 어떤 모습으로 보고 싶나요?</h2>
            <p className="v4-j-v12-note">이 선택은 presentation pointer일 뿐이며 Tree/Moment/Connection 저장 모델을 바꾸지 않습니다.</p>
            <div className="v4-j-v12-path-group">
              <div className="v4-j-v12-path-row">
                <span className="v4-j-v12-path-title">{draft.secondMoment.title || "다음 순간"}</span>
                <div className="v4-j-v12-path-buttons">
                  <button type="button" className={`v4-j-v12-path-btn ${pathChoice === "MAIN" ? "v4-j-v12-path-selected" : ""}`} onClick={() => setPathChoice("MAIN")} data-testid="main-path">MAIN</button>
                  <button type="button" className={`v4-j-v12-path-btn ${pathChoice === "BRANCH" ? "v4-j-v12-path-selected" : ""}`} onClick={() => setPathChoice("BRANCH")} data-testid="branch-path">BRANCH</button>
                </div>
              </div>
            </div>
            <button type="button" className="v4-j-v12-cta" onClick={() => setV12Step(4)} disabled={!secondSaved || !pathChoice} data-testid="show-complete">완성 화면 보기</button>
          </div>
        </section>

        <section className={`v4-j-v12-section ${v12Step >= 4 ? "v4-j-v12-active" : ""}`} data-step="complete">
          <div className="v4-j-v12-sticky v4-j-v12-complete">
            <div className="v4-j-v12-complete-icon" aria-hidden="true">🌳</div>
            <h2 className="v4-j-v12-complete-title">YOUR FIRST TREE</h2>
            <p className="v4-j-v12-complete-sub">{draft.treeName || "나의 러브트리"}</p>
            <div className="v4-j-v12-tree-preview">
              <div className="v4-j-v12-tree-main">
                <span className="v4-j-v12-tree-label">ROOT</span>
                <div className="v4-j-v12-tree-card"><span>{draft.firstMoment.title || "첫 순간"}</span>{secondSaved ? <span className="v4-j-v12-tree-sub">└ {draft.secondMoment.title}</span> : null}</div>
              </div>
            </div>
            <div className="v4-j-v12-complete-actions">
              <button type="button" className="v4-j-v12-cta" data-testid="complete-journey" onClick={completeJourney} disabled={!canonical?.secondMemoryId}>실제 러브트리 열기</button>
              <button type="button" className="v4-j-v12-secondary" onClick={resetAll}>처음부터 다시 시작</button>
            </div>
          </div>
        </section>
      </div>

      <EmailAuthForm open={authOpen} onClose={() => setAuthOpen(false)} />
      {toast ? <div className="v4-j-v12-toast" role="status" aria-live="polite">{toast}</div> : null}
    </div>
  );
}
