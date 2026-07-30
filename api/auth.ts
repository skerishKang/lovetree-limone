import type { ApiContext } from "./handler";

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization")
    || request.headers.get("Authorization");
  if (!auth) return null;
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return auth;
}

export async function requireAuthUser(ctx: ApiContext): Promise<AuthUser | null> {
  const token = extractBearerToken(ctx.request);
  if (!token) return null;
  try {
    const user = await verifyFirebaseToken(token);
    return user;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(token: string): Promise<AuthUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0))
      )
    );
    if (payload.aud !== "relovetree") return null;
    if (payload.iss !== "https://securetoken.google.com/relovetree") return null;
    if (payload.exp * 1000 < Date.now()) return null;

    return {
      uid: payload.sub || payload.user_id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}
