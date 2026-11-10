import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/components/ui/Icon";
import { useToast } from "@/shared/components/ui/Toast";
import { capitalize } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import type { ScreenAccess } from "@/shared/lib/permissions";
import { logForbidden, requestPermission } from "../api";
import type { ForbiddenInfo } from "../types";
import styles from "./Forbidden403Page.module.css";

import { tr } from "@/shared/i18n/tr";
interface Forbidden403PageProps {
  // Có `access` khi RoleGuard chặn một route; không có khi vào thẳng /forbidden (API trả 403).
  access?: ScreenAccess;
}

// Design 1.13: khung app vẫn hiện để người dùng không bị "bỏ rơi".
export default function Forbidden403Page({ access }: Forbidden403PageProps) {
  useScreenTranslation();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [info, setInfo] = useState<ForbiddenInfo | null>(null);
  const [requested, setRequested] = useState(false);

  const screen = access?.label ? `${capitalize(access.group ?? "")} / ${access.label}` : "Unknown screen";

  // Ghi nhật ký lần bị chặn + lấy mã tham chiếu để truy vết nếu quyền bị thu hồi nhầm.
  useEffect(() => {
    let cancelled = false;
    logForbidden(screen)
      .then((res) => {
        if (!cancelled) setInfo(res);
      })
      .catch(() => {
        // Không lấy được mã tham chiếu cũng không sao: trang vẫn giải thích được.
      });
    return () => {
      cancelled = true;
    };
  }, [screen]);

  const manager = info?.managerName ?? tr("the Club Manager");

  let reason = tr("An action was refused because it is not part of your permissions.");
  if (access?.label) {
    reason = access.inOwnRole
      ? tr("{{label}} needs a permission that is not granted to this account.", { label: tr(access.label) })
      : tr("{{label}} belongs to the {{roles}}.", {
          label: tr(access.label),
          roles: access.ownerRoles.map((r) => tr(ROLE_LABEL[r])).join(tr(" and ")),
        });
  }

  async function onRequest() {
    if (!info) return;
    try {
      await requestPermission(screen, info.reference);
      setRequested(true);
      toast.show(tr("Permission request sent to {{manager}}.", { manager }), "ok");
    } catch (err) {
      toast.show(messageFor(err), "danger");
    }
  }

  return (
    <Card>
      <div className={styles.wrap}>
        <span className={styles.icon}>
          <Icon name="ban" size={24} />
        </span>
        <div>
          <p className={styles.eyebrow}>{tr("403 · ACCESS DENIED")}</p>
          <h1 className={styles.title}>{tr("This screen is not part of your permissions.")}</h1>
          <p className={styles.text}>
            {reason}{" "}
            {tr("Ask {{manager}} to grant the permission if the work requires it.", { manager })}
          </p>
        </div>
        <div className={styles.actions}>
          <Button icon="home" onClick={() => navigate("/dashboard")}>
            {tr("Back to my workspace")}
          </Button>
          <Button
            tone="secondary"
            icon="mail"
            onClick={onRequest}
            blockedReason={requested ? tr("The request was already sent to the Club Manager.") : !info ? tr("Preparing the request…") : undefined}
          >
            {tr("Request the permission")}
          </Button>
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>{tr("Screen")}</dt>
            <dd>{access?.label ? `${tr(capitalize(access.group ?? ""))} / ${tr(access.label)}` : tr("Unknown screen")}</dd>
          </div>
          <div>
            <dt>{tr("Signed in as")}</dt>
            <dd>
              {user.fullName}, {tr(ROLE_LABEL[user.role])}
            </dd>
          </div>
          <div>
            <dt>{tr("Reference")}</dt>
            <dd>{info?.reference ?? "…"}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
