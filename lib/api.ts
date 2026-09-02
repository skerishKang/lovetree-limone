import { auth } from "./firebase";
import {
  getAuthTokenProvider,
  getBoundAccessToken,
  type AuthTokenProvider,
} from "./auth-token-provider";

const firebaseAuthTokenProvider: AuthTokenProvider = {
  getCurrentPrincipal() {
    const user = auth?.currentUser;
    if (!user?.uid) return null;
    return { id: user.uid, provider: "firebase" };
  },
  async getAccessToken() {
    const user = auth?.currentUser;
    if (!user?.uid) return null;
    const token = await user.getIdToken();
    if (!token) return null;
    return { token, principalId: user.uid };
  },
};

function bodyIsJsonString(body: BodyInit | null | undefined): body is string {
  if (typeof body !== "string") return false;
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

export function buildApiHeaders(options: RequestInit = {}, token: string | null = null): Headers {
  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && bodyIsJsonString(options.body)) {
    headers.set("content-type", "application/json");
  }
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getBoundAccessToken(getAuthTokenProvider(firebaseAuthTokenProvider));
  const headers = buildApiHeaders(options, token);
  return fetch(path, { ...options, headers });
}
