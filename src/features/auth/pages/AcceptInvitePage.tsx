import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { AuthLayout } from "@/shared/components/layout/AuthLayout";
import { Button } from "@/shared/components/ui/Button";
import { EMAIL_PLACEHOLDER } from "@/shared/lib/brand";
import { formatDateTime } from "@/shared/lib/format";
import { verifyInviteOtp } from "../api";
import { resetFlow } from "../flow";
import { OtpVerifyForm } from "../components/OtpVerifyForm";
import styles from "./AuthPages.module.css";

import { tr } from "@/shared/i18n/tr";
import { EMAIL_RE } from "@/shared/lib/email";

// Accept Invite: nhân viên được Club Manager mời nhập mã trong email mời (OTP, không dùng link),
// rồi sang /reset-password để đặt mật khẩu lần đầu — tài khoản chuyển INVITED → ACTIVE.
// Link trong email có sẵn ?email=...; mở trang không có email thì hỏi email trước.
export default function AcceptInvitePage() {
  useScreenTranslation();
  const navigate = useNavigate();
  // useSearchParams (không dùng useQueryParams): cập nhật khi URL đổi ?email= mà vẫn ở trang này.
  const [params] = useSearchParams();
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const codeParam = (params.get("code") ?? "").trim();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  function onEmail(e: FormEvent) {
    e.preventDefault();
    const mail = typed.trim().toLowerCase();
    if (!mail) return setError("Club email is required.");
    if (!EMAIL_RE.test(mail)) return setError("Email must be a @gmail.com address.");
    navigate(`/accept-invite?email=${encodeURIComponent(mail)}`);
  }

  if (!email) {
    return (
      <AuthLayout title={tr("Accept your invitation.")} description={tr("Enter the email the Club Manager invited. The invitation email holds a 6-digit code.")}>
        <form onSubmit={onEmail} noValidate style={{ display: "contents" }}>
          <Field label={tr("Club email")} required error={error}>
            <Input
              type="email"
              icon="mail"
              placeholder={EMAIL_PLACEHOLDER}
              autoComplete="email"
              value={typed}
              data-autofocus
              onChange={(e) => {
                setTyped(e.target.value);
                setError("");
              }}
            />
          </Field>
          <Button type="submit" size="lg" block iconAfter="arrowRight">
            {tr("Continue")}
          </Button>
          <p className={styles.foot}>
            {tr("Already set a password?")}{" "}<Link to="/login">{tr("Sign in")}</Link>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={tr("Accept your invitation.")} description={tr(`Enter the 6-digit code from the invitation sent to ${email}. Then choose your password.`)}>
      <OtpVerifyForm
        key={`${email}_${codeParam}`}
        email={email}
        initialCode={codeParam}
        purpose="invite"
        sentTitle="Invitation code sent"
        sentBody={(t) => `Sent at ${formatDateTime(t.sentAt)}. The code can be used once and stays valid until ${formatDateTime(t.expiresAt)}.`}
        submitLabel="Verify invitation"
        onVerify={async (code) => {
          const result = await verifyInviteOtp(email, code);
          resetFlow.set({ email, token: result.resetToken, expiresAt: result.expiresAt, kind: "invite", fullName: result.fullName });
          navigate("/reset-password");
        }}
        footer={
          <>
            {tr("Wrong address?")} <Link to="/accept-invite">{tr("Enter a different email")}</Link>
          </>
        }
      />
    </AuthLayout>
  );
}
