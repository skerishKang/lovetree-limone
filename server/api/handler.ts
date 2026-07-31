import { getDb } from "../../db";
import { json, errorResponse, matchRoute, parseBody, stripTrailingSlash } from "./http";
import { treesRouter } from "./trees";
import { memoriesRouter } from "./memories";
import { commentsRouter } from "./comments";
import { socialRouter } from "./social";

export interface ApiContext {
  request: Request;
  env: { DATABASE_URL: string; FIREBASE_PROJECT_ID?: string };
  db: ReturnType<typeof getDb>;
  url: URL;
  method: string;
  path: string;
  params: Record<string, string>;
}

export async function handleApiRequest(
  request: Request,
  env: { DATABASE_URL: string; FIREBASE_PROJECT_ID?: string }
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = stripTrailingSlash(url.pathname);

  if (!path.startsWith("/api/")) return null;

  const db = getDb(env.DATABASE_URL);
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

export { json, errorResponse, matchRoute, parseBody, stripTrailingSlash, getAuthorizationToken } from "./http";
