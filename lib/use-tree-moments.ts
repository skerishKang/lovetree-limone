"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "./api";
import { useAuth } from "./auth";
import {
  toCanonicalMoment,
  selectTreeMoments,
  selectTimelineMoments,
  selectAlbumMoments,
  type CanonicalMoment,
  type TreeMomentView,
  type TimelineMomentView,
  type AlbumMomentView,
} from "./moment-model";
import {
  youtubeThumbnail,
  type MemoryRecord,
  type TreeRecord,
} from "./tree-types";

export interface CreateMomentInput {
  title?: string;
  memo?: string;
  sourceType?: string;
  source?: string;
  sourceUrl?: string;
  thumbnail?: string;
  timestamp?: string;
  emotionTags?: string[];
  parentId?: string;
  clientKey?: string;
}

export interface UpdateMomentInput {
  title?: string;
  memo?: string;
  sourceType?: string;
  source?: string;
  sourceUrl?: string;
  thumbnail?: string;
  timestamp?: string;
  emotionTags?: string[];
  parentId?: string;
}

export interface TreeMomentsState {
  tree: TreeRecord | null;
  moments: MemoryRecord[];
  canonicalMoments: CanonicalMoment[];
  treeMoments: TreeMomentView[];
  timelineMoments: TimelineMomentView[];
  albumMoments: AlbumMomentView[];
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  selectedMomentId: string | null;
  selectedMoment: MemoryRecord | null;
  selectMoment: (id: string | null) => void;
  refresh: () => Promise<void>;
  createMoment: (input: CreateMomentInput) => Promise<MemoryRecord | null>;
  updateMoment: (id: string, input: UpdateMomentInput) => Promise<MemoryRecord | null>;
  deleteMoment: (id: string) => Promise<boolean>;
  highlightMomentId: string | null;
  clearHighlight: () => void;
}

const HIGHLIGHT_MS = 3200;

export function useTreeMoments(
  treeId: string,
  initialHighlightId?: string,
  initialMomentId?: string
): TreeMomentsState {
  const { user, loading: authLoading } = useAuth();
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [moments, setMoments] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(
    initialMomentId ?? null
  );
  const [highlightMomentId, setHighlightMomentId] = useState<string | null>(
    initialHighlightId ?? null
  );
  const highlightTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
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
        setError("러브트리의 순간을 불러오지 못했어요. 다시 시도해 주세요.");
        return;
      }
      setTree(treeData);
      const rows = Array.isArray(memoryData) ? memoryData : [];
      setMoments(rows);
      setSelectedMomentId((current) => {
        if (current === null) return null;
        return rows.some((m) => m.id === current) ? current : null;
      });
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!highlightMomentId) return;
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightMomentId(null);
    }, HIGHLIGHT_MS);
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, [highlightMomentId]);

  const isOwner = Boolean(tree && user && tree.ownerId === user.uid);
  const ownerId = tree?.ownerId ?? "";

  const canonicalMoments = useMemo(
    () => moments.map((m) => toCanonicalMoment(m, ownerId)),
    [moments, ownerId]
  );

  const treeMoments = useMemo(() => selectTreeMoments(canonicalMoments), [canonicalMoments]);
  const timelineMoments = useMemo(() => selectTimelineMoments(canonicalMoments), [canonicalMoments]);
  const albumMoments = useMemo(() => selectAlbumMoments(canonicalMoments), [canonicalMoments]);

  const selectedMoment = useMemo(
    () => moments.find((m) => m.id === selectedMomentId) ?? null,
    [moments, selectedMomentId]
  );

  const selectMoment = useCallback((id: string | null) => {
    setSelectedMomentId(id);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightMomentId(null);
  }, []);

  const createMoment = useCallback(async (input: CreateMomentInput): Promise<MemoryRecord | null> => {
    if (!tree || !isOwner) return null;
    const sourceUrl = input.sourceUrl?.trim() ?? "";
    const payload: Record<string, unknown> = {
      sourceType: input.sourceType ?? "youtube",
      title: input.title?.trim() ?? "",
      memo: input.memo?.trim() ?? "",
      source: input.source?.trim() ?? "",
      timestamp: input.timestamp ?? "",
      emotionTags: input.emotionTags ?? [],
      parentId: input.parentId || undefined,
    };
    if (sourceUrl) {
      payload.sourceUrl = sourceUrl;
      const thumb = input.thumbnail || youtubeThumbnail(sourceUrl);
      if (thumb) payload.thumbnail = thumb;
    }
    if (input.clientKey) payload.clientKey = input.clientKey;

    try {
      const response = await apiFetch(
        `/api/trees/${encodeURIComponent(tree.id)}/memories`,
        { method: "POST", body: JSON.stringify(payload) }
      );
      const data = (await response.json().catch(() => ({}))) as MemoryRecord & { error?: string };
      if (!response.ok || !data.id) return null;
      setMoments((current) => [...current, data]);
      setSelectedMomentId(data.id);
      setHighlightMomentId(data.id);
      return data;
    } catch {
      return null;
    }
  }, [tree, isOwner]);

  const updateMoment = useCallback(async (id: string, input: UpdateMomentInput): Promise<MemoryRecord | null> => {
    if (!tree || !isOwner) return null;
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.memo !== undefined) payload.memo = input.memo.trim();
    if (input.sourceType !== undefined) payload.sourceType = input.sourceType;
    if (input.source !== undefined) payload.source = input.source.trim();
    if (input.sourceUrl !== undefined) {
      const url = input.sourceUrl.trim();
      if (url) {
        payload.sourceUrl = url;
        const thumb = input.thumbnail || youtubeThumbnail(url);
        if (thumb) payload.thumbnail = thumb;
      }
    }
    if (input.timestamp !== undefined) payload.timestamp = input.timestamp;
    if (input.emotionTags !== undefined) payload.emotionTags = input.emotionTags;
    if (input.parentId !== undefined) payload.parentId = input.parentId || undefined;

    try {
      const response = await apiFetch(
        `/api/memories/${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(payload) }
      );
      const data = (await response.json().catch(() => ({}))) as MemoryRecord & { error?: string };
      if (!response.ok || !data.id) return null;
      setMoments((current) => current.map((m) => (m.id === data.id ? data : m)));
      return data;
    } catch {
      return null;
    }
  }, [tree, isOwner]);

  const deleteMoment = useCallback(async (id: string): Promise<boolean> => {
    if (!tree || !isOwner) return false;
    try {
      const response = await apiFetch(
        `/api/memories/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) return false;
      setMoments((current) => current.filter((m) => m.id !== id));
      setSelectedMomentId((current) => (current === id ? null : current));
      setHighlightMomentId((current) => (current === id ? null : current));
      return true;
    } catch {
      return false;
    }
  }, [tree, isOwner]);

  return {
    tree,
    moments,
    canonicalMoments,
    treeMoments,
    timelineMoments,
    albumMoments,
    loading,
    error,
    isOwner,
    selectedMomentId,
    selectedMoment,
    selectMoment,
    refresh,
    createMoment,
    updateMoment,
    deleteMoment,
    highlightMomentId,
    clearHighlight,
  };
}
