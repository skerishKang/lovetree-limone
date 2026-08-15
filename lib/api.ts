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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getBoundAccessToken(getAuthTokenProvider(firebaseAuthTokenProvider));
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}
