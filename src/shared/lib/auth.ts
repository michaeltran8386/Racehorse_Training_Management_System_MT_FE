// Hàm gọi API đăng nhập/đăng xuất và hỏi "tôi là ai". Trạng thái phiên nằm ở AuthProvider.

import { api, withGoogleSessionLock } from "@/shared/lib/api";
import { clearTokens, getTokens, saveTokens, type TokenPair } from "@/shared/lib/tokens";
import type { AuthUser } from "@/shared/types/auth";

// Backend thật trả kèm cặp JWT; mock chỉ trả { user }.
type LoginResponse = { user: AuthUser } & Partial<TokenPair>;

// Server không trả lời trong 15 giây => báo "Cannot reach the server" thay vì để nút quay mãi.
const LOGIN_TIMEOUT_MS = 15_000;

export async function login(email: string, password: string, remember: boolean): Promise<AuthUser> {
  const res = await api<LoginResponse>("POST", "/auth/login", { email, password, remember }, { timeoutMs: LOGIN_TIMEOUT_MS });
  await withGoogleSessionLock(async () => {
    await api<unknown>("POST", "/auth/google/logout", {}, { silent: true, skipRefresh: true, timeoutMs: 3000 }).catch(() => undefined);
    if (res.accessToken && res.refreshToken) {
      saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken }, remember);
    }
  });
  return res.user;
}

export async function loginWithGoogle(credential: string): Promise<AuthUser> {
  return withGoogleSessionLock(async () => {
    const res = await api<{ user: AuthUser }>("POST", "/auth/google", { credential }, { silent: true, skipRefresh: true, timeoutMs: LOGIN_TIMEOUT_MS });
    clearTokens();
    return res.user;
  });
}

export async function logout(): Promise<void> {
  const refreshToken = getTokens()?.refreshToken;
  return withGoogleSessionLock(async () => {
    try {
      // Thu hồi refresh token ở backend (mock bỏ qua body).
      await api<unknown>("POST", "/auth/logout", { refreshToken }, { silent: true, skipRefresh: true, timeoutMs: 3000 });
    } finally {
      try {
        await api<unknown>("POST", "/auth/google/logout", {}, { silent: true, skipRefresh: true, timeoutMs: 3000 });
      } finally {
        if (getTokens()?.refreshToken === refreshToken) clearTokens();
      }
    }
  });
}

// silent = true: lúc mở trang mà chưa đăng nhập thì 401 là bình thường, không mở Session Expired.
// silent = false: kiểm tra lại giữa phiên; 401 nghĩa là phiên đã hết (hoặc tài khoản vừa bị khóa).
export async function fetchMe(silent = false): Promise<AuthUser> {
  // Backend thật trả thẳng hồ sơ; mock trả { user }.
  const res = await api<AuthUser | { user: AuthUser }>("GET", "/auth/me", undefined, { silent });
  return "user" in res ? res.user : res;
}
