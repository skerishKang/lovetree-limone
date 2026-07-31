import { getDb } from "../../db";
import { json, errorResponse, matchRoute, parseBody, stripTrailingSlash } from "./http";
import { treesRouter } from "./trees";
import { memoriesRouter } from "./memories";
import { commentsRouter } from "./comments";
import { socialRouter } from "./social";

export interface ApiEnv {
  DATABASE_URL: string;
  FIREBASE_PROJECT_ID?: string;
  API_MUTATIONS_ENABLED?: string;
  APP_ENV?: string;
  [key: string]: unknown;
}

export interface ApiContext {
  request: Request;
  env: ApiEnv;
  db: ReturnType<typeof getDb>;
  url: URL;
  method: string;
  path: string;
  params: Record<string, string>;
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function areMutationsEnabled(env: ApiEnv): boolean {
  return env.API_MUTATIONS_ENABLED === "true";
}

export async function handleApiRequest(
  request: Request,
  env: ApiEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = stripTrailingSlash(url.pathname);

  if (!path.startsWith("/api/")) return null;

  if (path === "/api/health" && method === "GET") {
    return json({ status: "ok", env: env.APP_ENV ?? "unknown" });
  }

  if (MUTATION_METHODS.has(method) && !areMutationsEnabled(env)) {
    return json(
      { error: "Mutations are temporarily disabled in this staging preview" },
      503
    );
  }

  const db = getDb(env.DATABASE_URL);
  const ctx: ApiContext = {
    request,
    env,
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
