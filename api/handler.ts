import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message: string, status: number): Response {
  return json({ error: message }, status);
}

export interface ApiContext {
  request: Request;
  env: { DB: D1Database };
  db: ReturnType<typeof drizzle<typeof schema>>;
  url: URL;
  method: string;
  path: string;
  params: Record<string, string>;
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

export { stripTrailingSlash };

import { treesRouter } from "./trees";
import { memoriesRouter } from "./memories";
import { commentsRouter } from "./comments";
import { socialRouter } from "./social";

export async function handleApiRequest(
  request: Request,
  env: { DB: D1Database }
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = stripTrailingSlash(url.pathname);

  if (!path.startsWith("/api/")) return null;

  const db = drizzle(env.DB, { schema }) as ReturnType<typeof drizzle<typeof schema>>;
  const ctx: ApiContext = {
    request,
    env: env as ApiContext["env"],
    db: db as ApiContext["db"],
    url,
    method,
    path,
    params: {},
  };

  let resp: Response | null;
  resp = await treesRouter(ctx);
  if (resp) return resp;
  resp = await memoriesRouter(ctx);
  if (resp) return resp;
  resp = await commentsRouter(ctx);
  if (resp) return resp;
  resp = await socialRouter(ctx);
  if (resp) return resp;

  return errorResponse("Route not found", 404);
}
