"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  TREES_CARDINALITY_PATH,
  classifyTreesResponse,
  resolveEntryRoute,
  resolveEntryStage,
} from "@/lib/entry-resolver";

export default function V4EntryResolver({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const resolvedUidRef = useRef<string | null>(null);
  const inflightUidRef = useRef<string | null>(null);
  const [resolverError, setResolverError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const runResolver = useCallback(
    async (forUid: string) => {
      inflightUidRef.current = forUid;
      setResolverError(false);
      setRetrying(true);

      let result = classifyTreesResponse({
        responseOk: false,
        data: null,
        networkError: true,
      });

      try {
        const response = await apiFetch(TREES_CARDINALITY_PATH);
        if (inflightUidRef.current !== forUid) return;
        const data = response.ok ? await response.json().catch(() => null) : null;
        if (inflightUidRef.current !== forUid) return;
        result = classifyTreesResponse({
          responseOk: response.ok,
          data,
          networkError: false,
        });
      } catch {
        if (inflightUidRef.current !== forUid) return;
        result = classifyTreesResponse({
          responseOk: false,
          data: null,
          networkError: true,
        });
      } finally {
        if (inflightUidRef.current === forUid) setRetrying(false);
      }

      if (inflightUidRef.current !== forUid) return;

      if (!result.ok) {
        setResolverError(true);
        return;
      }

      resolvedUidRef.current = forUid;
      const resolution = resolveEntryRoute({
        start: null,
        authLoading: false,
        authed: true,
        trees: result.trees,
        fetchOk: true,
      });
      if (resolution.kind === "redirect") {
        router.replace(resolution.path);
      }
    },
    [router]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      resolvedUidRef.current = null;
      inflightUidRef.current = null;
      setResolverError(false);
      setRetrying(false);
      return;
    }
    const stage = resolveEntryStage({
      authLoading: false,
      uid,
      resolvedUid: resolvedUidRef.current,
      inflightUid: inflightUidRef.current,
    });
    if (stage === "resolved" || stage === "inflight") return;
    void runResolver(uid);
  }, [authLoading, uid, runResolver]);

  const handleRetry = useCallback(() => {
    if (!uid) return;
    resolvedUidRef.current = null;
    void runResolver(uid);
  }, [uid, runResolver]);

  return (
    <>
      {children}
      {resolverError && uid ? (
        <div
          role="alert"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.82)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "12px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            font: "inherit",
            zIndex: 50,
          }}
        >
          <span>러브트리를 불러오지 못했어요.</span>
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            style={{
              border: "1px solid #fff",
              background: "transparent",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {retrying ? "다시 시도하는 중…" : "다시 시도"}
          </button>
        </div>
      ) : null}
    </>
  );
}
