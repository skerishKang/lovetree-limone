export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

export function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function matchRoute(
  path: string,
  pattern: string
): Record<string, string> | null {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

  if (pathParts.length !== patternParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getAuthorizationToken(request: Request): string | null {
  const auth = request.headers.get("authorization")
    || request.headers.get("Authorization");
  if (!auth) return null;
  return auth.startsWith("Bearer ") ? auth.slice(7) : auth;
}
