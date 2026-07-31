"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { formatTreeDate, type MemoryRecord, type TreeRecord } from "@/lib/tree-types";
import V2GrowthTree from "./V2GrowthTree";
import V2DiaryView from "./V2DiaryView";
import V2StoryView from "./V2StoryView";
import V2AlbumView from "./V2AlbumView";
import V2MomentEditor, { type MomentFormState } from "./V2MomentEditor";

type ViewMode = "tree" | "diary" | "story" | "album";

const viewModes: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: "tree", label: "성장 트리", icon: "⌘" },
  { id: "diary", label: "마음 다이어리", icon: "▤" },
  { id: "story", label: "스토리", icon: "◫" },
  { id: "album", label: "앨범 보드", icon: "▦" },
];

export default function V2TreeDetail() {
  const params = useParams<{ id: string | string[] }>();
  const { user, loading: authLoading, login, loginPending } = useAuth();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState(() => crypto.randomUUID());
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  const loadTree = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    setError(null);
    try {
      const [treeResponse, memoryResponse] = await Promise.all([
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}`),
        apiFetch(`/api/trees/${encodeURIComponent(treeId)}/memories`),
      ]);
      const treeData = (await treeResponse.json().catch(() => ({}))) as TreeRecord & { error?: string };
      const memoryData = (await memoryResponse.json().catch(() => [])) as MemoryRecord[] | { error?: string };
      if (!treeResponse.ok) {
        setError(treeResponse.status === 404 ? "이 러브트리를 찾을 수 없어요." : "러브트리를 불러오지 못했어요.");
        return;
      }
      if (!memoryResponse.ok) {
        setError("러브트리의 순간을 불러오지 못했어요.");
        return;
      }
      setTree(treeData);
      setMemories(Array.isArray(memoryData) ? memoryData : []);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void loadTree(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadTree]);

  const isOwner = Boolean(tree && user && tree.ownerId === user.uid);
  const parentOptions = useMemo(
    () => memories.filter((m) => m.id !== editingId),
    [editingId, memories]
  );

  function beginEdit(memory: MemoryRecord) {
    setEditingId(memory.id);
  }

  function resetForm() {
    setEditingId(null);
    setFormError(null);
  }

  async function saveMemory(form: MomentFormState) {
    if (!treeId) return;
    setSaving(true);
    setFormError(null);
    try {
      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `/api/memories/${encodeURIComponent(editingId!)}`
        : `/api/trees/${encodeURIComponent(treeId)}/memories`;
      const response = await apiFetch(url, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          title: form.title,
          memo: form.memo,
          source: form.source,
          sourceUrl: form.sourceUrl,
          sourceType: form.sourceType,
          timestamp: form.timestamp,
          emotionTags: form.emotionTags.split(",").map((t) => t.trim()).filter(Boolean),
          parentId: form.parentId || undefined,
          clientKey: isEditing ? undefined : clientKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFormError(data?.error || "저장하지 못했어요.");
        return;
      }
      resetForm();
      setClientKey(crypto.randomUUID());
      await loadTree();
    } catch {
      setFormError("네트워크 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory(memoryId: string) {
    if (!confirm("이 순간을 삭제할까요?")) return;
    setRemovingId(memoryId);
    try {
      const response = await apiFetch(`/api/memories/${encodeURIComponent(memoryId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFormError(data?.error || "삭제하지 못했어요.");
        return;
      }
      await loadTree();
    } catch {
      setFormError("네트워크 오류가 발생했어요.");
    } finally {
      setRemovingId(null);
    }
  }

  async function toggleVisibility() {
    if (!tree) return;
    const newVisibility = tree.visibility === "public" ? "private" : "public";
    try {
      const response = await apiFetch(`/api/trees/${encodeURIComponent(treeId)}`, {
        method: "PUT",
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (response.ok) {
        setTree((prev) => prev ? { ...prev, visibility: newVisibility } : prev);
      }
    } catch { /* ignore */ }
  }

  if (authLoading || loading) {
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar">
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">러브트리를 불러오는 중…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar">
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">
          <span className="v2-state-symbol" aria-hidden="true">✦</span>
          <h1>로그인이 필요해요.</h1>
          <p>러브트리를 보려면 로그인해 주세요.</p>
          <button className="v2-button v2-button-primary" type="button" onClick={() => void login()} disabled={loginPending}>
            {loginPending ? "로그인 중…" : "Google로 로그인"}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar">
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">
          <p role="alert">{error}</p>
          <button className="v2-button v2-button-quiet" type="button" onClick={() => void loadTree()}>다시 시도 →</button>
        </div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="v2-tree-page">
        <div className="v2-topbar">
          <Link className="v2-brand" href="/v2">LoveTree</Link>
          <nav className="v2-topnav"><Link href="/v2">처음 화면</Link></nav>
        </div>
        <div className="v2-state">
          <span className="v2-state-symbol" aria-hidden="true">!</span>
          <h1>러브트리를 찾을 수 없어요.</h1>
          <Link className="v2-button v2-button-primary" href="/v2">처음으로</Link>
        </div>
      </div>
    );
  }

  const editingMemory = editingId ? memories.find((m) => m.id === editingId) : null;

  return (
    <div className="v2-tree-page">
      <div className="v2-topbar">
        <Link className="v2-brand" href="/v2" aria-label="LoveTree 처음 화면으로">
          <span className="v2-brand-mark"><i /><b /></span>
          LoveTree
        </Link>
        <nav className="v2-topnav" aria-label="러브트리 메뉴">
          <Link href="/v2/my-trees">내 러브트리</Link>
          <Link href="/v2/community">둘러보기</Link>
          {user ? <span className="v2-nav-user-name">{user.displayName || user.email || "내 계정"}</span> : null}
        </nav>
      </div>

      <div className="v2-tree-content">
        <div className="v2-tree-heading">
          <div>
            <p className="v2-eyebrow">{tree.visibility === "private" ? "비공개 트리" : "공개 트리"}</p>
            <h1>{tree.title}</h1>
            {tree.memo ? <p>{tree.memo}</p> : null}
          </div>
        </div>

        <div className="v2-tree-detail-meta">
          <div className="v2-tree-meta-item">
            <strong>생성일</strong>
            <span>{formatTreeDate(tree.createdAt)}</span>
          </div>
          <div className="v2-tree-meta-item">
            <strong>순간</strong>
            <span>{memories.length}개</span>
          </div>
          {isOwner && (
            <div className="v2-tree-action-row">
              <button className="v2-button v2-button-quiet" type="button" onClick={toggleVisibility}>
                {tree.visibility === "public" ? "비공개로 전환" : "공개로 전환"}
              </button>
            </div>
          )}
        </div>

        <div className="v2-view-mode-tabs" role="tablist" aria-label="보기 모드">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              className={`v2-view-mode-tab ${viewMode === mode.id ? "active" : ""}`}
              onClick={() => setViewMode(mode.id)}
              role="tab"
              aria-selected={viewMode === mode.id}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        <div className="v2-tree-detail-layout">
          <div>
            {viewMode === "tree" && (
              <V2GrowthTree
                memories={memories}
                treeName={tree.title}
                onSelect={(id) => {
                  const memory = memories.find((m) => m.id === id);
                  if (memory) beginEdit(memory);
                }}
                readOnly={!isOwner}
              />
            )}
            {viewMode === "diary" && <V2DiaryView memories={memories} />}
            {viewMode === "story" && <V2StoryView memories={memories} />}
            {viewMode === "album" && <V2AlbumView memories={memories} />}

            {memories.length > 0 && viewMode === "tree" && (
              <div className="v2-memory-list">
                {memories.map((memory, index) => (
                  <div className="v2-memory-record" key={memory.id}>
                    <span className="v2-memory-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="v2-memory-media">
                      <span>✦</span>
                    </div>
                    <div className="v2-memory-body">
                      <div className="v2-memory-kicker">
                        <small>{memory.sourceType || "기록"}</small>
                        <time>{memory.timestamp ? memory.timestamp.replace(/-/g, ". ") : "-"}</time>
                      </div>
                      <h3>{memory.title || "제목 없는 순간"}</h3>
                      {memory.memo ? <p>{memory.memo}</p> : null}
                      {memory.emotionTags && memory.emotionTags.length > 0 && (
                        <div className="v2-memory-tags">
                          {memory.emotionTags.map((tag) => <span key={tag}>{tag}</span>)}
                        </div>
                      )}
                      {memory.sourceUrl && (
                        <span className="v2-memory-source">
                          {memory.sourceUrl.slice(0, 40)}…
                        </span>
                      )}
                      {isOwner && (
                        <div className="v2-memory-tools">
                          <button type="button" onClick={() => beginEdit(memory)}>수정</button>
                          <button
                            type="button"
                            onClick={() => void deleteMemory(memory.id)}
                            disabled={removingId === memory.id}
                          >
                            {removingId === memory.id ? "삭제 중…" : "삭제"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isOwner && (
            <V2MomentEditor
              editingMemory={editingMemory}
              parentOptions={parentOptions}
              saving={saving}
              error={formError}
              onSave={saveMemory}
              onCancel={resetForm}
            />
          )}
        </div>
      </div>
    </div>
  );
}
