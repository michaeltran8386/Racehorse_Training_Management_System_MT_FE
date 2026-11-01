import { api } from "@/shared/lib/api";
import { saveTokens, type TokenPair } from "@/shared/lib/tokens";
import type { AuthUser, NotifyKey } from "@/shared/types/auth";
import type { ForbiddenInfo, InviteVerifyResult, OtpPurpose, OtpTimes, RegisterInput, RegistrationResult, ResetVerifyResult } from "./types";

// ---- đăng ký + xác minh email (OTP) ----
export const register = (input: RegisterInput) => api<{ email: string } & OtpTimes>("POST", "/auth/register", input);

// Đăng ký bằng Google: email đã được Google xác minh nên đi thẳng tới bước chờ Club Manager duyệt.
export const registerWithGoogle = (credential: string) =>
  api<RegistrationResult>("POST", "/auth/google/register", { credential });

export const verifyEmail = (email: string, code: string) =>
  api<RegistrationResult>("POST", "/auth/verify-email", { email, code });

export const otpStatus = (email: string, purpose: OtpPurpose) =>
  api<OtpTimes>("GET", `/auth/otp?email=${encodeURIComponent(email)}&purpose=${purpose}`);

export const resendOtp = (email: string, purpose: OtpPurpose) =>
  api<OtpTimes>("POST", "/auth/otp/resend", { email, purpose });

// ---- quên mật khẩu: email → OTP → mật khẩu mới ----
export const forgotPassword = (email: string) =>
  api<{ sent: true } & OtpTimes>("POST", "/auth/forgot-password", { email });

export const verifyResetOtp = (email: string, code: string) =>
  api<ResetVerifyResult>("POST", "/auth/reset-password/verify", { email, code });

// Dùng chung cho quên mật khẩu và nhận lời mời (tài khoản INVITED được kích hoạt: activated = true).
export const resetPassword = (resetToken: string, password: string) =>
  api<{ ok: true; activated?: boolean }>("POST", "/auth/reset-password", { resetToken, password });

// ---- nhận lời mời (nhân viên): email + mã mời → đặt mật khẩu ----
export const verifyInviteOtp = (email: string, code: string) =>
  api<InviteVerifyResult>("POST", "/auth/accept-invite/verify", { email, code });

// ---- hồ sơ cá nhân ----
export const updateProfile = (input: { fullName: string; phone: string }) =>
  api<{ user: AuthUser }>("PUT", "/me/profile", input);

export const updateNotification = (key: NotifyKey, value: boolean) =>
  api<{ user: AuthUser }>("PUT", "/me/notifications", { key, value });

// Backend đăng xuất mọi thiết bị khác và trả cặp token mới cho thiết bị này (mock không trả token).
export async function changePassword(current: string, next: string) {
  const res = await api<{ nextChangeDue: string } & Partial<TokenPair>>("POST", "/me/password", { current, next });
  if (res.accessToken && res.refreshToken) {
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  }
  return { nextChangeDue: res.nextChangeDue };
}

// ---- 403 ----
export const logForbidden = (screen: string) => api<ForbiddenInfo>("POST", "/audit/forbidden", { screen });

export const requestPermission = (screen: string, reference: string) =>
  api<{ ok: true }>("POST", "/permission-requests", { screen, reference });
