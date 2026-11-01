import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FloatingField } from "@/shared/components/form/FloatingField";
import { AuthLayout } from "@/shared/components/layout/AuthLayout";
import { Alert } from "@/shared/components/ui/Alert";
import { PillButton } from "../components/PillButton";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import { forgotPassword } from "../api";
import styles from "./AuthPages.module.css";

import { tr } from "@/shared/i18n/tr";
import { EMAIL_RE } from "@/shared/lib/email";

// Bước 1 quên mật khẩu: nhập email để nhận mã OTP.
// Kết quả LUÔN giống nhau dù email có tồn tại hay không (thông báo trung tính).
export default function ForgotPasswordPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim().toLowerCase();
    if (!mail) return setError("Club email is required.");
    if (!EMAIL_RE.test(mail)) return setError("Email must be a @gmail.com address.");

    setBusy(true);
    setError("");
    setFailure("");
    try {
      await forgotPassword(mail);
      navigate(`/forgot-password/verify?email=${encodeURIComponent(mail)}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_EMAIL") setError("Email must be a @gmail.com address.");
      else setFailure(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={tr("Forgot password")}
      description={tr("Enter your email to receive a 6-digit password reset code.")}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "contents" }}>
        {failure && (
          <Alert tone="danger" icon="xCircle" title={tr("The code could not be sent")}>
            {failure}
          </Alert>
        )}
        <FloatingField
          label={tr("Club email")}
          type="email"
          required
          autoComplete="username"
          value={email}
          disabled={busy}
          error={error}
          isValid={EMAIL_RE.test(email.trim().toLowerCase())}
          onChange={(value) => {
            setEmail(value);
            setError("");
          }}
        />
        <PillButton type="submit" loading={busy} loadingLabel={tr("Sending…")}>
          {tr("Send OTP")}
        </PillButton>
        <Link to="/login" className={styles.centerLink}>
          {tr("Back to sign in")}
        </Link>
      </form>
    </AuthLayout>
  );
}
