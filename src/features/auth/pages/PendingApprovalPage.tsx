import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/shared/components/layout/AuthLayout";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { formatDateTime } from "@/shared/lib/format";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import type { Role } from "@/shared/types/auth";
import { signupFlow } from "../flow";
import type { RegistrationResult } from "../types";
import styles from "./AuthPages.module.css";

import { tr } from "@/shared/i18n/tr";
// Design 1.3: yêu cầu đã tới Club Manager, chưa đăng nhập được cho tới khi được duyệt.
export default function PendingApprovalPage() {
  useScreenTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<RegistrationResult | null | undefined>(undefined);

  useEffect(() => {
    setData(signupFlow.get());
  }, []);

  if (data === undefined) return null;

  return (
    <AuthLayout
      title={tr("The request is with the Club Manager.")}
      description={tr("Sign-in opens as soon as the account is approved and the role is granted.")}
    >
      {data ? (
        <>
          <Alert tone="warn" icon="clock" title={tr("Pending Approval")}>
            {tr("Sent to {{reviewer}} · Club Manager at {{time}}. Requests are usually reviewed within one working day.", {
              reviewer: data.reviewer?.trim() || `Trần Quang Minh (${tr("Club Manager")})`,
              time: data.requestedAt ? formatDateTime(data.requestedAt) : formatDateTime(new Date()),
            })}
          </Alert>
          <dl className={styles.summary}>
            <div>
              <dt>{tr("Full name")}</dt>
              <dd>{data.fullName}</dd>
            </div>
            <div>
              <dt>{tr("Club email")}</dt>
              <dd>{data.email}</dd>
            </div>
            <div>
              <dt>{tr("Role requested")}</dt>
              <dd>{tr(ROLE_LABEL[data.role as Role] ?? data.role)}</dd>
            </div>
            <div>
              <dt>{tr("Request code")}</dt>
              <dd className={styles.mono}>{data.requestCode}</dd>
            </div>
          </dl>
          <p className={styles.paragraph}>
            {tr("An email goes to {{email}} once the decision is made. Signing in before then shows the pending notice instead of the workspace.", {
              email: data.email,
            })}
          </p>
        </>
      ) : (
        <Alert tone="info" icon="info" title={tr("No request to show")}>
          {tr("Send a request first, or sign in if the account already exists.")}
        </Alert>
      )}
      <Button tone="secondary" size="lg" block icon="arrowRight" onClick={() => navigate("/login")}>
        {tr("Back to sign in")}
      </Button>
      <p className={styles.foot}>
        {tr("Wrong details?")}{" "}
        <Link
          to="/sign-up"
          onClick={() => {
            signupFlow.clear();
          }}
        >
          {tr("Send a new request")}
        </Link>
      </p>
    </AuthLayout>
  );
}
