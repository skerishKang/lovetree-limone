export const DEFAULT_DYNAMIC_CACHE_CONTROL = "private, max-age=0, must-revalidate";

export function applyDefaultDynamicCachePolicy(response: Response): Response {
  if (response.headers.has("cache-control")) return response;

  const headers = new Headers(response.headers);
  headers.set("cache-control", DEFAULT_DYNAMIC_CACHE_CONTROL);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
