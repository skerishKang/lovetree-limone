import { getDb } from "../../db";
import { json, errorResponse, stripTrailingSlash } from "./http";
import { logApiError } from "./errors";
import { treesRouter } from "./trees";
import { memoriesRouter } from "./memories";
import { commentsRouter } from "./comments";
import { socialRouter } from "./social";
import { e2eHealthIdentity, evaluateMutationGate } from "./e2e-safety";

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

export type ApiRouter = (ctx: ApiContext) => Promise<Response | null>;

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function areMutationsEnabled(env: ApiEnv): boolean {
  if (env.API_MUTATIONS_ENABLED !== "true") return false;
  return evaluateMutationGate(env).enabled;
}

export async function handleApiRequest(
  request: Request,
  env: ApiEnv,
  router: ApiRouter = routeApiRequest
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = stripTrailingSlash(url.pathname);

  if (!path.startsWith("/api/")) return null;

  const requestId = crypto.randomUUID();

  try {
    if (path === "/api/health" && method === "GET") {
      const base = { status: "ok", env: env.APP_ENV ?? "unknown" };
      const e2eIdentity = e2eHealthIdentity(env);
      return json(e2eIdentity ? { ...base, e2e: e2eIdentity } : base);
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

    const response = await router(ctx);
    return response ?? errorResponse("Route not found", 404);
  } catch (error) {
    logApiError({ requestId, method, path }, error);
    return json({ error: "Internal server error", requestId }, 500);
  }
}

async function routeApiRequest(ctx: ApiContext): Promise<Response | null> {
  let resp = await treesRouter(ctx);
  if (resp) return resp;
  resp = await memoriesRouter(ctx);
  if (resp) return resp;
  resp = await commentsRouter(ctx);
  if (resp) return resp;
  resp = await socialRouter(ctx);
  if (resp) return resp;
  return null;
}

export {
  json,
  errorResponse,
  matchRoute,
  parseBody,
  stripTrailingSlash,
  getAuthorizationToken,
} from "./http";
