import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/shared/components/layout/AuthLayout";
import { formatDateTime, formatTime } from "@/shared/lib/format";
import { useQueryParams } from "@/shared/lib/hooks";
import { verifyResetOtp } from "../api";
import { resetFlow } from "../flow";
import { OtpVerifyForm } from "../components/OtpVerifyForm";

import { tr } from "@/shared/i18n/tr";
// Bước 2 quên mật khẩu (design 1.5, đã đổi từ "link" sang "mã OTP"): nhập mã nhận được qua email.
export default function ResetOtpPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const params = useQueryParams();
  const email = params?.get("email") ?? "";

  useEffect(() => {
    if (params && !email) navigate("/forgot-password", { replace: true });
  }, [params, email, navigate]);

  if (!email) return null;

  return (
    <AuthLayout title={tr("Check the club mailbox.")} description={tr(`If ${email} belongs to an account, a 6-digit code was sent to it. Enter the code below.`)}>
      <OtpVerifyForm
        email={email}
        purpose="reset"
        sentTitle="Code sent"
        // Câu trung tính: không khẳng định email có tài khoản hay không.
        sentBody={(t) => `If the address is registered, the code was sent at ${formatDateTime(t.sentAt)}. It can be used once and expires at ${formatTime(t.expiresAt)}.`}
        submitLabel="Verify code"
        onVerify={async (code) => {
          const result = await verifyResetOtp(email, code);
          resetFlow.set({ email, token: result.resetToken, expiresAt: result.expiresAt });
          navigate("/reset-password");
        }}
        footer={
          <>
            {tr("Wrong address?")} <Link to="/forgot-password">{tr("Enter a different email")}</Link>
          </>
        }
      />
    </AuthLayout>
  );
}
