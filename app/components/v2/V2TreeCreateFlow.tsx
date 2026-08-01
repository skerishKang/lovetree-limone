"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface V2TreeCreateFlowProps {
  onClose: () => void;
  onCreated: (treeId: string) => void;
  onRequireAuth?: () => void;
}

export default function V2TreeCreateFlow({ onClose, onCreated, onRequireAuth }: V2TreeCreateFlowProps) {
  const { user, loginPending } = useAuth();
  const [treeName, setTreeName] = useState("");
  const [treeMemo, setTreeMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientKey] = useState(() => crypto.randomUUID());
  const [pendingIntent, setPendingIntent] = useState(false);
  const submitTreeRef = useRef<() => Promise<void>>(async () => {});

  async function submitTree() {
    if (!user) {
      setPendingIntent(true);
      onRequireAuth?.();
      return;
    }
    if (!treeName.trim()) {
      setError("러브트리 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch("/api/trees", {
        method: "POST",
        body: JSON.stringify({
          title: treeName.trim(),
          memo: treeMemo.trim(),
          visibility: "public",
          clientKey,
        }),
      });
      const data = (await response.json()) as { id: string; error?: string };
      if (!response.ok) {
        setError(data?.error || "러브트리를 만들지 못했어요.");
        return;
      }
      onCreated(data.id);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    submitTreeRef.current = submitTree;
  });

  useEffect(() => {
    if (!pendingIntent || !user) return;
    const timer = window.setTimeout(() => {
      setPendingIntent(false);
      void submitTreeRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingIntent, user]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    void submitTree();
  }

  return (
    <div className="v2-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="v2-seed-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="v2-seed-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="v2-modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <p className="v2-eyebrow">plant your love tree</p>
        <h2 id="v2-seed-title">
          어떤 러브트리를<br /><em>처음 심어볼까요?</em>
        </h2>
        <p>최애, 작품, 여행, 공부. 마음이 자란 주제라면 무엇이든 좋아요.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="v2-tree-name">러브트리 이름</label>
          <input
            id="v2-tree-name"
            value={treeName}
            onChange={(e) => setTreeName(e.target.value)}
            placeholder="예: 건호에게 입덕한 3일"
            required
          />
          <label htmlFor="v2-tree-memo">짧은 설명 (선택)</label>
          <textarea
            id="v2-tree-memo"
            value={treeMemo}
            onChange={(e) => setTreeMemo(e.target.value)}
            placeholder="이 트리에 대한 짧은 소개를 적어보세요."
            rows={3}
          />
          <button
            className="v2-button v2-button-primary"
            type="submit"
            disabled={saving || loginPending}
            aria-busy={loginPending}
          >
            {!user ? "로그인하고 시작하기" : saving ? "시작 중…" : "이 이름으로 시작하기"}
            <span aria-hidden="true"> →</span>
          </button>
        </form>
        {error ? <p className="v2-flow-error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
