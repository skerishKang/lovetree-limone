/**
 * core/runtime/worker/mvp-router.ts
 *
 * Generic static namespace adapter for /mvp/NN routes.
 * Maps /mvp/NN and /mvp/NN/ to /mvp/NN/index.html,
 * and preserves exact subpaths for static assets beneath /mvp/NN/*.
 */

export function resolveMvpStaticAssetPath(pathname: string): string | null {
  const mvpMatch = pathname.match(/^\/mvp\/(\d{2})(\/.*)?$/);
  if (!mvpMatch) return null;
  const slot = mvpMatch[1];
  const rest = mvpMatch[2];
  if (!rest || rest === "/") {
    return `/mvp/${slot}/index.html`;
  }
  return pathname;
}
