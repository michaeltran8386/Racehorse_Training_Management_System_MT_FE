import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { registerApiHandlers } from "@/shared/lib/api";
import { fetchMe, login, loginWithGoogle, logout } from "@/shared/lib/auth";
import type { AuthUser } from "@/shared/types/auth";

// Không thao tác trong 30 phút => phiên hết hạn (design 1.14).
const IDLE_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["click", "keydown", "pointerdown", "scroll"] as const;

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  expired: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<AuthUser>;
  signInWithGoogle: (credential: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  markExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [expired, setExpired] = useState(false);
  const sessionVersion = useRef(0);

  // Ref để callback (đăng ký một lần) luôn đọc được trạng thái mới nhất.
  const statusRef = useRef<AuthStatus>("loading");
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const markExpired = useCallback(() => {
    // Chỉ khi đang đăng nhập mới có chuyện "hết phiên".
    if (statusRef.current === "authenticated") setExpired(true);
  }, []);

  // 401 → Session Expired, 403 → trang Forbidden403.
  useEffect(() => {
    registerApiHandlers({ onUnauthorized: markExpired, onForbidden: () => navigate("/forbidden") });
  }, [markExpired, navigate]);

  // Lúc mở trang: hỏi "tôi là ai" để khôi phục phiên.
  useEffect(() => {
    let cancelled = false;
    const version = sessionVersion.current;
    fetchMe(true)
      .then((u) => {
        if (cancelled || version !== sessionVersion.current) return;
        setUserState(u);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled && version === sessionVersion.current) setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hết phiên do không thao tác.
  useEffect(() => {
    if (status !== "authenticated" || expired) return;
    let timer = window.setTimeout(markExpired, IDLE_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(markExpired, IDLE_MS);
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, expired, markExpired]);

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const version = ++sessionVersion.current;
    try {
      const u = await login(email, password, remember);
      if (version !== sessionVersion.current) throw new Error("Session changed");
      setUserState(u);
      setStatus("authenticated");
      setExpired(false);
      return u;
    } catch (error) {
      if (version === sessionVersion.current && statusRef.current === "loading") setStatus("anonymous");
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const version = ++sessionVersion.current;
    try {
      const u = await loginWithGoogle(credential);
      if (version !== sessionVersion.current) throw new Error("Session changed");
      setUserState(u);
      setStatus("authenticated");
      setExpired(false);
      return u;
    } catch (error) {
      if (version === sessionVersion.current && statusRef.current === "loading") setStatus("anonymous");
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const version = ++sessionVersion.current;
    try {
      await logout();
    } catch {
      // Dù server không trả lời vẫn đăng xuất ở phía giao diện.
    }
    if (version === sessionVersion.current) {
      setUserState(null);
      setStatus("anonymous");
      setExpired(false);
    }
  }, []);

  // Hỏi lại server giữa phiên: quyền/trạng thái có thể vừa bị Club Manager đổi.
  const refresh = useCallback(async () => {
    const version = sessionVersion.current;
    try {
      const u = await fetchMe(false);
      if (version === sessionVersion.current) setUserState((prev) => (JSON.stringify(prev) === JSON.stringify(u) ? prev : u));
    } catch {
      // 401 đã được xử lý chung (mở Session Expired).
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, expired, signIn, signInWithGoogle, signOut, refresh, setUser: setUserState, markExpired }),
    [status, user, expired, signIn, signInWithGoogle, signOut, refresh, markExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Dùng trong các trang nằm SAU AppShell (đã chắc chắn có người đăng nhập).
export function useCurrentUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser needs a signed-in user");
  return user;
}
