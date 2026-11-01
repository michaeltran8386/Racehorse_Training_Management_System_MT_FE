import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FloatingField } from "@/shared/components/form/FloatingField";
import { SpringCheck } from "@/shared/components/motion/SpringCheck";
import { AuthLayout, HERO_TEAM } from "@/shared/components/layout/AuthLayout";
import { Alert } from "@/shared/components/ui/Alert";
import { PillButton } from "../components/PillButton";
import { ApiError } from "@/shared/lib/api";
import { googleFailure, messageFor } from "@/shared/lib/messages";
import type { AlertSpec } from "@/shared/lib/messages";
import { passwordError } from "@/shared/lib/password";
import { register, registerWithGoogle } from "../api";
import { signupFlow } from "../flow";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { EMAIL_PLACEHOLDER } from "@/shared/lib/brand";
import styles from "./AuthPages.module.css";
import { fullNameError } from "@/shared/lib/name";

import { tr } from "@/shared/i18n/tr";
import { EMAIL_RE } from "@/shared/lib/email";

// Trang này CHỈ để Horse Owner tự đăng ký (không có ô chọn vai trò); nhân viên do Club Manager mời.

type Errors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

export default function SignUpPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [alertBody, setAlertBody] = useState("");
  const [googleAlert, setGoogleAlert] = useState<AlertSpec | null>(null);
  const [busy, setBusy] = useState(false);

  function clearError(key: keyof Errors) {
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function fail(next: Errors) {
    setErrors(next);
    const count = Object.values(next).filter(Boolean).length;
    setAlertBody(
      count === 1
        ? "One field needs attention before the request can go to the Club Manager."
        : `${count} fields need attention before the request can go to the Club Manager.`,
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const mail = email.trim().toLowerCase();
    const next: Errors = {};
    if (fullNameError(name)) next.name = fullNameError(name);
    if (!mail) next.email = "Club email is required.";
    else if (!EMAIL_RE.test(mail)) next.email = "Email must be a @gmail.com address.";
    if (!password) next.password = "Password is required.";
    else if (passwordError(password)) next.password = passwordError(password);
    if (confirm !== password) next.confirm = "The two passwords do not match.";
    if (Object.keys(next).length > 0) return fail(next);

    setBusy(true);
    setErrors({});
    setAlertBody("");
    try {
      await register({ fullName: name.trim(), email: mail, role: "HORSE_OWNER", password });
      // Bước kế tiếp: nhập mã OTP gửi về email.
      navigate(`/sign-up/verify?email=${encodeURIComponent(mail)}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") fail({ email: messageFor(err) });
      else {
        setErrors({});
        setAlertBody(messageFor(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    if (busy) return;
    setErrors({});
    if (!agree) {
      setAlertBody(tr("Accept the club rules to send the request."));
      return;
    }
    setBusy(true);
    setAlertBody("");
    setGoogleAlert(null);
    try {
      signupFlow.set(await registerWithGoogle(credential));
      navigate("/sign-up/pending");
    } catch (err) {
      setGoogleAlert(googleFailure(err).alert);
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <AuthLayout
      compact
      hero={HERO_TEAM}
      title={tr("Request a Horse Owner account")}
      description={tr("Account requests are reviewed and approved by the Club Manager.")}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "contents" }}>
        {alertBody && (
          <Alert tone="danger" icon="alert" title={tr("Request not sent")}>
            {alertBody}
          </Alert>
        )}
        {googleAlert && (
          <Alert
            tone={googleAlert.tone}
            icon={googleAlert.icon}
            title={googleAlert.title}
            action={googleAlert.tone === "info" ? <Link to="/login">{tr("Sign in")}</Link> : undefined}
          >
            {googleAlert.body}
          </Alert>
        )}

        <FloatingField
          label={tr("Full name")}
          required
          autoComplete="name"
          value={name}
          error={errors.name}
          isValid={name.trim().length > 0 && !fullNameError(name)}
          onChange={(value) => {
            setName(value);
            clearError("name");
          }}
        />

        <FloatingField
          label={tr("Club email")}
          type="email"
          required
          autoComplete="email"
          value={email}
          error={errors.email}
          hint={tr(`For example ${EMAIL_PLACEHOLDER}`)}
          isValid={EMAIL_RE.test(email.trim().toLowerCase())}
          onChange={(value) => {
            setEmail(value);
            clearError("email");
          }}
        />

        <FloatingField
          label={tr("Password")}
          type="password"
          required
          autoComplete="new-password"
          value={password}
          error={errors.password}
          hint={tr("At least 8 characters")}
          isValid={password.length > 0 && !passwordError(password)}
          onChange={(value) => {
            setPassword(value);
            clearError("password");
          }}
        />

        <FloatingField
          label={tr("Confirm password")}
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          isValid={confirm.length > 0 && confirm === password}
          onChange={(value) => {
            setConfirm(value);
            clearError("confirm");
          }}
        />

        <SpringCheck label={tr("I accept the club data and stable safety rules")} checked={agree} onChange={setAgree} />

        <PillButton
          type="submit"
          loading={busy}
          loadingLabel={tr("Sending…")}
          blockedReason={!agree ? tr("Accept the club rules to send the request.") : undefined}
        >
          {tr("Send request to Club Manager")}
        </PillButton>

        <GoogleSignIn mode="signup" onCredential={onGoogleCredential} />

        <Link to="/login" className={styles.outlineLink}>
          {tr("Already have an account?")} {tr("Sign in")}
        </Link>
        {hasErrors && <span className="sr-only" role="status">{tr("The form has errors.")}</span>}
      </form>
    </AuthLayout>
  );
}
