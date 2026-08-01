"use client";

import { useCallback, useState } from "react";

export interface V3SourceDraft {
  sourceType: string;
  sourceUrl: string;
  title: string;
  sourceName: string;
  recordDate: string;
  startSeconds: string;
  endSeconds: string;
}

export interface V3HeartDraft {
  primaryEmotion: string;
  emotionTags: string[];
  memo: string;
  memoVisibility: "private" | "tree" | "public";
}

export interface V3ConnectDraft {
  relationType: string;
  relationLabel: string;
  nextUrl: string;
  nextTitle: string;
  nextMemo: string;
}

const DRAFT_KEY = "v3-onboarding-draft";

function loadDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_KEY}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveDraft<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${DRAFT_KEY}:${key}`, JSON.stringify(value));
  } catch {
    // preview only — failure to persist should not break the flow
  }
}

export function useV3SourceDraft() {
  const [draft, setDraft] = useState<V3SourceDraft>(() => {
    const saved = loadDraft<V3SourceDraft>("source");
    const today = new Date().toISOString().slice(0, 10);
    return (
      saved ?? {
        sourceType: "youtube",
        sourceUrl: "",
        title: "",
        sourceName: "YouTube",
        recordDate: today,
        startSeconds: "",
        endSeconds: "",
      }
    );
  });

  const update = useCallback((patch: Partial<V3SourceDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft("source", next);
      return next;
    });
  }, []);

  return { draft, update };
}

export function useV3HeartDraft() {
  const [draft, setDraft] = useState<V3HeartDraft>(() => {
    const saved = loadDraft<V3HeartDraft>("heart");
    return (
      saved ?? {
        primaryEmotion: "설렘",
        emotionTags: ["설렘"],
        memo: "",
        memoVisibility: "private",
      }
    );
  });

  const update = useCallback((patch: Partial<V3HeartDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft("heart", next);
      return next;
    });
  }, []);

  return { draft, update };
}

export function useV3ConnectDraft() {
  const [draft, setDraft] = useState<V3ConnectDraft>(() => {
    const saved = loadDraft<V3ConnectDraft>("connect");
    return (
      saved ?? {
        relationType: "follow-comment",
        relationLabel: "댓글을 따라갔어요",
        nextUrl: "",
        nextTitle: "",
        nextMemo: "",
      }
    );
  });

  const update = useCallback((patch: Partial<V3ConnectDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft("connect", next);
      return next;
    });
  }, []);

  return { draft, update };
}
