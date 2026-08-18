export interface Track18NavigationAuthority {
  treeId: string;
  persistedMemoryId: string;
}

function validAuthorityPart(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 256 && !/[\u0000-\u001f\u007f]/.test(trimmed);
}

export function normalizeTrack18Authority(input: {
  treeId?: string | null;
  persistedMemoryId?: string | null;
}): Track18NavigationAuthority | null {
  const treeId = input.treeId?.trim() ?? "";
  const persistedMemoryId = input.persistedMemoryId?.trim() ?? "";
  if (!validAuthorityPart(treeId) || !validAuthorityPart(persistedMemoryId)) return null;
  return { treeId, persistedMemoryId };
}

export function buildTrack18CanonicalDestination(
  authority: Track18NavigationAuthority,
): string {
  return `/trees/${encodeURIComponent(authority.treeId)}?highlight=${encodeURIComponent(authority.persistedMemoryId)}`;
}
