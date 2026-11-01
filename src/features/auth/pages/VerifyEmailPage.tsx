import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout, HERO_TEAM } from "@/shared/components/layout/AuthLayout";
import { formatDateTime, formatTime } from "@/shared/lib/format";
import { useQueryParams } from "@/shared/lib/hooks";
import { verifyEmail } from "../api";
import { signupFlow } from "../flow";
import { OtpVerifyForm } from "../components/OtpVerifyForm";

import { tr } from "@/shared/i18n/tr";
// Bước 2 của đăng ký: nhập mã OTP gửi về email. Đúng mã => yêu cầu chuyển tới Club Manager.
export default function VerifyEmailPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const params = useQueryParams();
  const email = params?.get("email") ?? "";

  useEffect(() => {
    if (params && !email) navigate("/sign-up", { replace: true });
  }, [params, email, navigate]);

  if (!email) return null;

  return (
    <AuthLayout
      hero={HERO_TEAM}
      title={tr("Verify your email.")}
      description={tr(`Enter the 6-digit code sent to ${email}. It confirms that the address is yours.`)}
    >
      <OtpVerifyForm
        email={email}
        purpose="signup"
        sentTitle="Code sent"
        sentBody={(t) => `Sent at ${formatDateTime(t.sentAt)}. The code can be used once and expires at ${formatTime(t.expiresAt)}.`}
        submitLabel="Verify email"
        onVerify={async (code) => {
          const result = await verifyEmail(email, code);
          signupFlow.set(result);
          navigate("/sign-up/pending");
        }}
        footer={
          <>
            {tr("Wrong address?")} <Link to="/sign-up">{tr("Start over")}</Link>
          </>
        }
      />
    </AuthLayout>
  );
}
