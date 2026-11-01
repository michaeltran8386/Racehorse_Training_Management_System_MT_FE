import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect } from "react";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";

import { tr } from "@/shared/i18n/tr";
export default function SessionExpiredPage() {
  useScreenTranslation();
  const { markExpired, status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") markExpired();
  }, [status, markExpired]);

  return (
    <>
      <PageHeader title={tr("The session has expired.")} showDate />
      <Card>
        <p style={{ margin: 0, fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
          {tr("Your session has ended. Please sign in again to continue.")}
        </p>
      </Card>
    </>
  );
}
