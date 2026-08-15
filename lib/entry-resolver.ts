import type { TreeRecord } from "./tree-types";

export const TREES_CARDINALITY_PATH = "/api/trees?limit=2";

export type EntryResolution =
  | { kind: "landing" }
  | { kind: "redirect"; path: string };

export interface ResolveEntryInput {
  start?: string | null;
  authLoading: boolean;
  authed: boolean;
  trees: { id: string }[];
  fetchOk: boolean;
}

export function resolveEntryRoute(input: ResolveEntryInput): EntryResolution {
  if (input.start === "1") return { kind: "landing" };

  if (input.authLoading) return { kind: "landing" };

  if (!input.authed) return { kind: "landing" };

  if (!input.fetchOk) return { kind: "landing" };

  const count = input.trees.length;

  if (count <= 0) {
    return { kind: "redirect", path: "/v4/journey" };
  }

  if (count === 1) {
    const id = input.trees[0]?.id;
    if (!id) return { kind: "landing" };
    return { kind: "redirect", path: `/trees/${encodeURIComponent(id)}` };
  }

  return { kind: "redirect", path: "/my-trees" };
}

export type ResolverStage = "loading" | "anonymous" | "resolved" | "inflight" | "run";

export function resolveEntryStage(input: {
  authLoading: boolean;
  uid: string | null;
  resolvedUid: string | null;
  inflightUid: string | null;
}): ResolverStage {
  if (input.authLoading) return "loading";
  if (!input.uid) return "anonymous";
  if (input.resolvedUid === input.uid) return "resolved";
  if (input.inflightUid === input.uid) return "inflight";
  return "run";
}

export type ResolverFetchResult =
  | { ok: true; trees: TreeRecord[] }
  | { ok: false; reason: "http-error" | "malformed" | "network" };

export function classifyTreesResponse(input: {
  responseOk: boolean;
  data: unknown;
  networkError: boolean;
}): ResolverFetchResult {
  if (input.networkError) return { ok: false, reason: "network" };
  if (!input.responseOk) return { ok: false, reason: "http-error" };
  if (!Array.isArray(input.data)) return { ok: false, reason: "malformed" };
  return { ok: true, trees: input.data as TreeRecord[] };
}
