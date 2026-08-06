/**
 * Rebuilds the active tree view URL after a query mutation while preserving
 * the current pathname (tree / timeline / album) and any unrelated query
 * parameters. Pure, so the URL contract is unit-testable without React.
 */
export function replaceTreeViewQuery(
  pathname: string,
  current: URLSearchParams,
  mutate: (next: URLSearchParams) => void
): string {
  const next = new URLSearchParams(current);
  mutate(next);
  const qs = next.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}
