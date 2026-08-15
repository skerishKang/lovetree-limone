"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { resolveEntryRoute } from "@/lib/entry-resolver";
import type { TreeRecord } from "@/lib/tree-types";

export default function V4EntryResolver({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (authLoading) return;

    if (!user) {
      attempted.current = false;
      return;
    }

    attempted.current = true;
    let cancelled = false;

    (async () => {
      let trees: TreeRecord[] = [];
      let fetchOk = false;

      try {
        const response = await apiFetch("/api/trees?limit=2");
        if (cancelled) return;
        if (response.ok) {
          const data = (await response
            .json()
            .catch(() => null)) as TreeRecord[] | null;
          if (cancelled) return;
          trees = Array.isArray(data) ? data : [];
          fetchOk = true;
        }
      } catch {
        if (cancelled) return;
      }

      const resolution = resolveEntryRoute({
        start: null,
        authLoading: false,
        authed: true,
        trees,
        fetchOk,
      });

      if (resolution.kind === "redirect") {
        router.replace(resolution.path);
      } else if (!fetchOk) {
        attempted.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  return <>{children}</>;
}
