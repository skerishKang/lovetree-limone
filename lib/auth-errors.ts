const CONFIG_MISSING_MESSAGE = "로그인 설정을 불러오지 못했어요.";
const GENERIC_AUTH_ERROR_MESSAGE = "로그인 중 문제가 발생했어요. 다시 시도해 주세요.";

export type AuthMethod = "google" | "email";

export function getAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function getAuthErrorMessage(error: unknown, configured = true, method: AuthMethod = "google"): string | null {
  if (!configured) return CONFIG_MISSING_MESSAGE;

  switch (getAuthErrorCode(error)) {
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일 주소입니다.";
    case "auth/invalid-email":
      return "유효하지 않은 이메일 주소입니다.";
    case "auth/weak-password":
      return "비밀번호가 너무 짧아요. 8자 이상으로 설정해 주세요.";
    case "auth/user-disabled":
      return "비활성화된 계정입니다. 관리자에게 문의해 주세요.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return method === "email"
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : GENERIC_AUTH_ERROR_MESSAGE;
    case "auth/too-many-requests":
      return "시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인해 주세요.";
    case "auth/popup-closed-by-user":
      return null;
    case "auth/popup-blocked":
      return "로그인 창이 차단됐어요. 팝업을 허용한 뒤 다시 시도해 주세요.";
    case "auth/unauthorized-domain":
      return "현재 주소는 로그인 허용 도메인에 등록되지 않았어요.";
    case "auth/operation-not-allowed":
      return method === "email"
        ? "이메일 로그인이 아직 활성화되지 않았어요."
        : "Google 로그인이 아직 활성화되지 않았어요.";
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
