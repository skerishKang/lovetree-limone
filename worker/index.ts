import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleApiRequest } from "../server/api";

interface Env {
  ASSETS: Fetcher;
  DATABASE_URL: string;
  FIREBASE_PROJECT_ID?: string;
  API_MUTATIONS_ENABLED?: string;
  APP_ENV?: string;
  [key: string]: unknown;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const DEFAULT_DYNAMIC_CACHE_CONTROL = "private, max-age=0, must-revalidate";

function withDefaultDynamicCachePolicy(response: Response): Response {
  if (response.headers.has("cache-control")) return response;

  const headers = new Headers(response.headers);
  headers.set("cache-control", DEFAULT_DYNAMIC_CACHE_CONTROL);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    const appResponse = await handler.fetch(request, env, ctx);
    return withDefaultDynamicCachePolicy(appResponse);
  },
};

export default worker;
