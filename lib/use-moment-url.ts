"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MemoryRecord } from "./tree-types";

/**
 * Keeps the selected moment id in the URL as ?moment=<id> so selection
 * survives view switches and refreshes. Invalid or deleted ids are cleared.
 */
export function useMomentUrlState(opts: {
  treeId: string;
  moments: MemoryRecord[];
  loading: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { treeId, moments, loading, onSelect } = opts;
  const router = useRouter();
  const searchParams = useSearchParams();
  const momentParam = searchParams.get("moment");
  const highlightParam = searchParams.get("highlight");

  useEffect(() => {
    if (loading) return;
    if (momentParam && !moments.some((m) => m.id === momentParam)) {
      const next = new URLSearchParams(searchParams);
      next.delete("moment");
      const qs = next.toString();
      const timer = window.setTimeout(() => {
        router.replace(`/trees/${encodeURIComponent(treeId)}${qs ? `?${qs}` : ""}`, { scroll: false });
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [loading, momentParam, moments, router, searchParams, treeId]);

  useEffect(() => {
    if (highlightParam && moments.length > 0) {
      const next = new URLSearchParams(searchParams);
      next.delete("highlight");
      const qs = next.toString();
      const timer = window.setTimeout(() => {
        router.replace(`/trees/${encodeURIComponent(treeId)}${qs ? `?${qs}` : ""}`, { scroll: false });
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [highlightParam, moments.length, router, searchParams, treeId]);

  const handleSelectMoment = useCallback((id: string | null) => {
    onSelect(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("moment", id);
    else next.delete("moment");
    next.delete("highlight");
    const qs = next.toString();
    router.replace(`/trees/${encodeURIComponent(treeId)}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [onSelect, router, searchParams, treeId]);

  return { handleSelectMoment, momentParam };
}
