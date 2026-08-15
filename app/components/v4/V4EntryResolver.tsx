"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  TREES_CARDINALITY_PATH,
  classifyTreesResponse,
  isCurrentResolverRequest,
  resolveEntryRoute,
  resolveEntryStage,
} from "@/lib/entry-resolver";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function V4EntryResolver({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const resolvedUidRef = useRef<string | null>(null);
  const inflightUidRef = useRef<string | null>(null);
  // Current rendered principal. It is refreshed inside a layout effect (which
  // runs synchronously during commit, before any passive effect or
  // resolved-promise microtask) so a stale response resolving after an A->B
  // principal change is rejected before any redirect/state authority.
  const principalRef = useRef<string | null>(uid);
  // Monotonic request-generation token. Every runResolver call advances it, and
  // any in-flight request whose captured token no longer matches is discarded.
  const requestSeqRef = useRef(0);
  // Live mount flag. After unmount, no redirect or state update is ever allowed.
  const mountedRef = useRef(true);

  useIsomorphicLayoutEffect(() => {
    principalRef.current = uid;
  }, [uid]);

  const [resolverError, setResolverError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const runResolver = useCallback(
    async (forUid: string) => {
      const capturedSeq = ++requestSeqRef.current;
      inflightUidRef.current = forUid;
      setResolverError(false);
      setRetrying(true);

      const isCurrent = () =>
        isCurrentResolverRequest({
          authority: {
            mounted: mountedRef.current,
            currentPrincipal: principalRef.current,
            requestSeq: requestSeqRef.current,
          },
          forUid,
          capturedSeq,
        });

      let result = classifyTreesResponse({
        responseOk: false,
        data: null,
        networkError: true,
      });

      try {
        const response = await apiFetch(TREES_CARDINALITY_PATH);
        if (!isCurrent()) return;
        const data = response.ok ? await response.json().catch(() => null) : null;
        if (!isCurrent()) return;
        result = classifyTreesResponse({
          responseOk: response.ok,
          data,
          networkError: false,
        });
      } catch {
        if (!isCurrent()) return;
        result = classifyTreesResponse({
          responseOk: false,
          data: null,
          networkError: true,
        });
      }

      if (!isCurrent()) return;
      setRetrying(false);

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
      if (resolution.kind === "redirect" && isCurrent()) {
        router.replace(resolution.path);
      }
    },
    [router]
  );

  // Mount tracking: invalidate any in-flight request on unmount and never allow
  // a resolved response to redirect or mutate state after the resolver is gone.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      // Unauthenticated: drop principal-scoped resolution refs. The error/retry
      // UI is naturally gated on `uid`, so no synchronous setState is required
      // here; re-authentication resets state through the runResolver transition.
      resolvedUidRef.current = null;
      inflightUidRef.current = null;
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
