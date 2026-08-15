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
