import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useToast } from "@/shared/components/ui/Toast";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import { listPermissionRequests, resolvePermissionRequest } from "../api";
import type { PermissionRequest } from "../types";
import styles from "./PermissionRequestsPanel.module.css";

import { tr } from "@/shared/i18n/tr";
// WorkFlow 1 §7.4: yêu cầu "Request the permission" gửi từ màn 403 hiện ở đây cho Club Manager.
// Mở màn Permissions của người gửi để bật quyền, rồi đánh dấu Granted — hoặc Dismiss nếu không cấp.
// Không có yêu cầu nào đang chờ => panel ẩn (bảng tài khoản bên dưới vẫn là nội dung chính của trang).
export function PermissionRequestsPanel() {
  const toast = useToast();
  const [requests, setRequests] = useState<PermissionRequest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setRequests((await listPermissionRequests()).requests);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(request: PermissionRequest, status: "GRANTED" | "DISMISSED") {
    setBusyId(request.id);
    try {
      await resolvePermissionRequest(request.id, status);
      setRequests((list) => (list ? list.filter((r) => r.id !== request.id) : list));
      const who = request.account?.fullName ?? "The request";
      toast.show(status === "GRANTED" ? `${who}: request marked as granted.` : `${who}: request dismissed.`, status === "GRANTED" ? "ok" : "warn");
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setBusyId(null);
    }
  }

  if (failed) {
    return (
      <div className={styles.panel}>
        <Alert
          tone="warn"
          icon="alert"
          title={tr("Permission requests could not be loaded")}
          action={
            <Button tone="secondary" size="sm" icon="refresh" onClick={load}>
              Try again
            </Button>
          }
        >
          {tr("Requests sent from the access-denied page are safe; they appear here once the service answers.")}
        </Alert>
      </div>
    );
  }
  if (!requests || requests.length === 0) return null;

  return (
    <Card
      pad={0}
      className={styles.panel}
      title={tr(`Permission requests · ${requests.length}`)}
      subtitle={tr("Sent from the access-denied page. Open the permissions, switch on what the work needs, then mark it granted.")}
    >
      <ul className={styles.list}>
        {requests.map((r) => (
          <li key={r.id} className={styles.item}>
            <div className={styles.who}>
              <strong>{r.account?.fullName ?? tr("Deleted account")}</strong>
              {r.account ? ` · ${tr(ROLE_LABEL[r.account.role])}` : ""} {tr("asks for")}{" "}
              <strong>{tr(r.screen) !== r.screen ? tr(r.screen) : r.screen.split(" / ").map((p) => tr(p.trim())).join(" / ")}</strong>
              <span className={styles.meta}>
                {formatDateTime(r.at)} {tr("· reference")}{" "}{r.reference}
              </span>
            </div>
            <div className={styles.actions}>
              {r.account && (
                <Link to={`/accounts/${r.account.id}/permissions`} className={styles.link}>
                  {tr("Open permissions")}
                </Link>
              )}
              <Button size="sm" icon="check" disabled={busyId === r.id} onClick={() => resolve(r, "GRANTED")}>
                {tr("Mark granted")}
              </Button>
              <Button tone="ghost" size="sm" disabled={busyId === r.id} onClick={() => resolve(r, "DISMISSED")}>
                {tr("Dismiss")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
