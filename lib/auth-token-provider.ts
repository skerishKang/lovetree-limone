export interface AuthPrincipal {
  id: string;
  provider: string;
}

export interface AuthAccessToken {
  token: string;
  principalId: string;
}

export interface AuthTokenProvider {
  getCurrentPrincipal(): AuthPrincipal | null;
  getAccessToken(): Promise<AuthAccessToken | null>;
}

let configuredAuthTokenProvider: AuthTokenProvider | null = null;

function isAuthTokenProvider(provider: AuthTokenProvider | null): provider is AuthTokenProvider {
  return Boolean(
    provider &&
      typeof provider.getCurrentPrincipal === "function" &&
      typeof provider.getAccessToken === "function"
  );
}

function normalizeIdentifier(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function configureAuthTokenProvider(provider: AuthTokenProvider | null): void {
  if (provider !== null && !isAuthTokenProvider(provider)) {
    throw new TypeError("Invalid auth token provider");
  }
  configuredAuthTokenProvider = provider;
}

export function getAuthTokenProvider(fallback: AuthTokenProvider): AuthTokenProvider {
  return configuredAuthTokenProvider ?? fallback;
}

export async function getBoundAccessToken(provider: AuthTokenProvider): Promise<string | null> {
  const principal = provider.getCurrentPrincipal();
  const principalId = normalizeIdentifier(principal?.id);
  if (!principalId) return null;

  const tokenResult = await provider.getAccessToken();
  if (!tokenResult?.token) return null;

  const token = String(tokenResult.token).trim();
  if (!token) return null;

  const tokenPrincipalId = normalizeIdentifier(tokenResult.principalId);
  if (!tokenPrincipalId || tokenPrincipalId !== principalId) {
    throw new Error("Authentication principal mismatch");
  }

  return token;
}
