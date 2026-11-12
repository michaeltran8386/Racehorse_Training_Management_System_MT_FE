import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FloatingField } from "@/shared/components/form/FloatingField";
import { SpringCheck } from "@/shared/components/motion/SpringCheck";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { AuthLayout } from "@/shared/components/layout/AuthLayout";
import { Alert } from "@/shared/components/ui/Alert";
import type { AlertTone } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { formatCountdown } from "@/shared/lib/format";
import { useCountdown, useQueryParams } from "@/shared/lib/hooks";
import { useAppLanguage } from "@/shared/lib/language";
import { googleFailure, loginFailure } from "@/shared/lib/messages";
import type { LoginFailure } from "@/shared/lib/messages";
import { EMAIL_MAX, EMAIL_RE } from "@/shared/lib/email";
import { PASSWORD_MAX } from "@/shared/lib/password";
import { ApiError } from "@/shared/lib/api";
import { registerWithGoogle } from "../api";
import { safeNext, signupFlow } from "../flow";
import styles from "./AuthPages.module.css";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { PillButton } from "../components/PillButton";
import { tr } from "@/shared/i18n/tr";

interface AlertState {
  tone: AlertTone;
  icon: string;
  title: string;
  body: string;
}

// Mốc khóa tạm theo email, giữ trong tab để F5 vẫn thấy đồng hồ đếm ngược (server vẫn là nơi quyết định).
const LOCK_KEY = "equiflow.loginLocks";

function readLocks(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(LOCK_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function lockOf(mail: string): number | null {
  const until = readLocks()[mail];
  return until && until > Date.now() ? until : null;
}

function saveLock(mail: string, until: number | null) {
  try {
    const locks = readLocks();
    if (until) locks[mail] = until;
    else delete locks[mail];
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(locks));
  } catch {
    // Không lưu được (chế độ riêng tư…): chỉ mất đồng hồ khi tải lại trang.
  }
}

function emailProblem(mail: string): string {
  if (!mail) return "Email is required.";
  if (!EMAIL_RE.test(mail)) return "Enter a valid @gmail.com address.";
  return "";
}

function passwordProblem(password: string): string {
  if (!password) return "Password is required.";
  if (!password.trim()) return "Password cannot be only spaces.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export default function LoginPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const { status, signIn, signInWithGoogle, signOut } = useAuth();
  const { t } = useAppLanguage();
  const params = useQueryParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [checking, setChecking] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [googleError, setGoogleError] = useState(false);
  const [nextStep, setNextStep] = useState<LoginFailure["next"]>();
  // Khóa tạm sau nhiều lần sai: mốc do server trả (retryAt).
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const lockLeft = useCountdown(lockUntil);
  const locked = lockLeft > 0;

  const next = safeNext(params?.get("next"));
  const justReset = params?.get("reset") === "1";
  const justInvited = params?.get("invited") === "1";
  const justLogout = params?.get("logout") === "1";
  const mail = email.trim().toLowerCase();

  useEffect(() => {
    if (justLogout && status === "authenticated") {
      void signOut();
    }
  }, [justLogout, status, signOut]);

  useEffect(() => {
    const prefill = params?.get("email");
    const auto = params?.get("auto") === "1";
    if (prefill) {
      setEmail(prefill);
      setPassword("EquiFlow@2026");
      if (auto) {
        const timer = setTimeout(() => {
          setChecking(true);
          signIn(prefill, "EquiFlow@2026", true)
            .then(() => {
              window.location.replace(next);
            })
            .catch(() => setChecking(false));
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [params, signIn, next, navigate]);

  // Đã đăng nhập rồi mà vào /login thì đưa thẳng vào app.
  useEffect(() => {
    if (status === "authenticated" && params && !isTransitioning && !justLogout) navigate(next, { replace: true });
  }, [status, params, next, navigate, isTransitioning, justLogout]);

  function onEmailChange(value: string) {
    setEmail(value);
    setEmailError("");
    setAlert(null);
    setGoogleError(false);
    setNextStep(undefined);
    // Khóa tạm tính theo email: đổi email thì lấy đồng hồ của email mới (nếu có).
    setLockUntil(lockOf(value.trim().toLowerCase()));
  }

  function onPasswordKey(e: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (checking || locked) return;

    const eErr = emailProblem(mail);
    const pErr = passwordProblem(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setAlert(null);
    setGoogleError(false);
    setNextStep(undefined);
    setChecking(true);
    try {
      setIsTransitioning(true);
      await signIn(mail, password, remember);
      saveLock(mail, null);
      navigate(next, { replace: true });
    } catch (err) {
      setIsTransitioning(false);
      const failure = loginFailure(err);
      setAlert(failure.alert);
      setEmailError(failure.emailError ?? "");
      setPasswordError(failure.passwordError ?? "");
      setNextStep(failure.next);
      if (failure.retryAt) {
        setLockUntil(failure.retryAt);
        saveLock(mail, failure.retryAt);
      }
    } finally {
      setChecking(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    if (checking) return;
    setChecking(true);
    setAlert(null);
    setGoogleError(false);
    setIsTransitioning(true);
    try {
      try {
        await signInWithGoogle(credential);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "GOOGLE_ACCOUNT_NOT_FOUND") throw error;
        signupFlow.set(await registerWithGoogle(credential));
        navigate("/sign-up/pending", { replace: true });
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setIsTransitioning(false);
      setGoogleError(true);
      const failure = googleFailure(err);
      setAlert(failure.alert);
      setNextStep(failure.next);
    } finally {
      setChecking(false);
    }
  }

  // Đang khóa tạm: đồng hồ đếm ngược; hết giờ thì báo có thể đăng nhập lại.
  const lockAlert: AlertState | null =
    lockUntil === null
      ? null
      : locked
        ? { tone: "danger", icon: "clock", title: "Sign-in paused", body: `Try again in ${formatCountdown(lockLeft)} or reset your password.` }
        : { tone: "info", icon: "clock", title: "You can sign in again", body: "" };

  const banner: AlertState | null = (googleError ? alert : lockAlert ?? alert) ?? (justReset
    ? { tone: "ok", icon: "checkCircle", title: "Password changed", body: "Please sign in again." }
    : justInvited
      ? { tone: "ok", icon: "checkCircle", title: "Account activated", body: "Please sign in." }
      : null);

  const action =
    nextStep === "verifyEmail" ? (
      <Button size="sm" tone="secondary" onClick={() => navigate(`/sign-up/verify?email=${encodeURIComponent(mail)}`)}>
        Enter the code
      </Button>
    ) : nextStep === "acceptInvite" ? (
      <Button size="sm" tone="secondary" onClick={() => navigate(`/accept-invite?email=${encodeURIComponent(mail)}`)}>
        Accept invitation
      </Button>
    ) : nextStep === "createAccount" ? (
      <Button size="sm" tone="secondary" onClick={() => navigate("/sign-up")}>
        Create account
      </Button>
    ) : nextStep === "signUp" ? (
      <Button size="sm" tone="secondary" onClick={() => navigate("/sign-up")}>
        Sign up again
      </Button>
    ) : undefined;

  return (
    <AuthLayout title={t("auth.loginTitle", "Sign in")}>
      <form onSubmit={onSubmit} noValidate style={{ display: "contents" }}>
        {banner && (
          <Alert tone={banner.tone} icon={banner.icon} title={banner.title} action={action}>
            {banner.body}
          </Alert>
        )}

        <FloatingField
          label={t("auth.email", "Email")}
          type="email"
          required
          autoComplete="username"
          maxLength={EMAIL_MAX}
          value={email}
          disabled={checking}
          error={emailError}
          isValid={EMAIL_RE.test(mail)}
          onChange={onEmailChange}
          // Chỉ báo sai định dạng khi rời ô; ô trống thì đợi lúc bấm Đăng nhập.
          onBlur={() => setEmailError(mail ? emailProblem(mail) : "")}
        />

        <FloatingField
          label={t("auth.password", "Password")}
          type="password"
          required
          autoComplete="current-password"
          maxLength={PASSWORD_MAX}
          value={password}
          disabled={checking}
          error={passwordError}
          hint={capsLock ? "Caps Lock is on." : undefined}
          onKeyDown={onPasswordKey}
          onKeyUp={onPasswordKey}
          onBlur={() => setCapsLock(false)}
          onChange={(value) => {
            setPassword(value);
            setPasswordError("");
            setAlert(null);
            setGoogleError(false);
          }}
        />

        <SpringCheck label={t("auth.rememberMe", "Remember me")} checked={remember} onChange={setRemember} disabled={checking} />

        <PillButton type="submit" loading={checking} loadingLabel={t("auth.submitting", "Signing in…")} disabled={locked}>
          {t("auth.submitSignIn", "Sign in")}
        </PillButton>

        <Link to="/forgot-password" className={styles.centerLink}>
          {t("auth.forgotPassword", "Forgot password?")}
        </Link>

        <GoogleSignIn onCredential={onGoogleCredential} />

        <Link to="/sign-up" className={styles.outlineLink}>
          {tr("Create new account")}
        </Link>
        <p className={styles.foot}>
          {t("auth.invitedStaff", "Invited as staff?")} <Link to="/accept-invite">{t("auth.acceptInviteLink", "Accept invitation")}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
