"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { replaceTreeViewQuery } from "./moment-url";
import type { MemoryRecord } from "./tree-types";

/**
 * Keeps the selected moment id in the URL as ?moment=<id> so selection
 * survives view switches and refreshes. Invalid or deleted ids are cleared.
 *
 * The active view path (/trees/:id, /trees/:id/timeline, /trees/:id/album)
 * is always preserved — only query parameters change, so selecting or
 * clearing a moment never kicks the user out of the current view.
 */
export function useMomentUrlState(opts: {
  treeId: string;
  moments: MemoryRecord[];
  loading: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { moments, loading, onSelect } = opts;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const momentParam = searchParams.get("moment");
  const highlightParam = searchParams.get("highlight");

  const pushState = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      router.replace(replaceTreeViewQuery(pathname, searchParams, mutate), {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  // Clear invalid or deleted moment ids from the URL once data has loaded.
  useEffect(() => {
    if (loading) return;
    if (momentParam && !moments.some((m) => m.id === momentParam)) {
      const timer = window.setTimeout(() => {
        pushState((next) => next.delete("moment"));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [loading, momentParam, moments, pushState]);

  // The ?highlight= URL parameter is transient: it is removed as soon as the
  // tree data has loaded (the visual highlight itself expires via the
  // useTreeMoments timer, ~3.2s). Removal keeps the active view and the
  // ?moment= selection.
  useEffect(() => {
    if (!highlightParam || loading) return;
    const timer = window.setTimeout(() => {
      pushState((next) => next.delete("highlight"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [highlightParam, loading, pushState]);

  const handleSelectMoment = useCallback(
    (id: string | null) => {
      onSelect(id);
      pushState((next) => {
        if (id) next.set("moment", id);
        else next.delete("moment");
        next.delete("highlight");
      });
    },
    [onSelect, pushState]
  );

  return { handleSelectMoment, momentParam };
}
