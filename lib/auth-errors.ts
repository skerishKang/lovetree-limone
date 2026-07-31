const CONFIG_MISSING_MESSAGE = "로그인 설정을 불러오지 못했어요.";
const GENERIC_AUTH_ERROR_MESSAGE = "로그인 중 문제가 발생했어요. 다시 시도해 주세요.";

export function getAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function getAuthErrorMessage(error: unknown, configured = true): string | null {
  if (!configured) return CONFIG_MISSING_MESSAGE;

  switch (getAuthErrorCode(error)) {
    case "auth/popup-closed-by-user":
      return null;
    case "auth/popup-blocked":
      return "로그인 창이 차단됐어요. 팝업을 허용한 뒤 다시 시도해 주세요.";
    case "auth/unauthorized-domain":
      return "현재 주소는 로그인 허용 도메인에 등록되지 않았어요.";
    case "auth/operation-not-allowed":
      return "Google 로그인이 아직 활성화되지 않았어요.";
    default:
      return GENERIC_AUTH_ERROR_MESSAGE;
  }
}

export function createSingleFlightAction<T>(action: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (inFlight) return inFlight;
    inFlight = action().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}
