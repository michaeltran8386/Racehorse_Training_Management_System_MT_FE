import { useEffect, useState } from "react";
import { Input } from "@/shared/components/form/Input";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { DataTable, type Column } from "@/shared/components/ui/DataTable";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import { api } from "@/shared/lib/api";
import { formatDateTime } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import styles from "./AuditLogPage.module.css";


import { tr } from "@/shared/i18n/tr";
interface AuditLog {
  id: string; userId: string | null; action: string; entityName: string; entityId: string | null;
  oldValuesJson: string | null; newValuesJson: string | null; ipAddress: string | null;
  userAgent: string | null; timestamp: string; user: { id: string; fullName: string } | null;
}
interface Result { logs: AuditLog[]; total: number; page: number; pageSize: number }
interface ChangeItem {
  field: string;
  before: string;
  after: string;
}

function parseAuditChanges(log: AuditLog, isVi: boolean): { summary: string; recorded: string | null; changes: ChangeItem[] } {
  const changes: ChangeItem[] = [];
  let summary = "";

  let oldObj: Record<string, any> | null = null;
  let newObj: Record<string, any> | null = null;
  try { if (log.oldValuesJson) oldObj = JSON.parse(log.oldValuesJson); } catch {}
  try { if (log.newValuesJson) newObj = JSON.parse(log.newValuesJson); } catch {}

  const fieldNameMapVi: Record<string, string> = {
    fullName: "Họ và tên",
    name: "Họ và tên",
    phone: "Số điện thoại",
    phoneNumber: "Số điện thoại",
    email: "Email liên hệ",
    role: "Vai trò người dùng",
    status: "Trạng thái",
    stall: "Ô chuồng",
  };

  const fieldNameMapEn: Record<string, string> = {
    fullName: "Full Name",
    name: "Full Name",
    phone: "Phone Number",
    phoneNumber: "Phone Number",
    email: "Email Address",
    role: "User Role",
    status: "Status",
    stall: "Stall",
  };

  const fieldMap = isVi ? fieldNameMapVi : fieldNameMapEn;

  const fieldAliases: Record<string, string> = {
    "họ và tên": "fullName",
    "họ tên": "fullName",
    "số điện thoại": "phone",
  };

  if (oldObj && newObj) {
    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
    for (const k of keys) {
      if (k === "actor" || k === "detail") continue;
      const before = String(oldObj[k] ?? "—");
      const after = String(newObj[k] ?? "—");
      const canonical = fieldAliases[k.toLowerCase()] ?? k;
      if (before !== after) {
        changes.push({
          field: fieldMap[canonical] ?? fieldMap[k] ?? k,
          before,
          after,
        });
      }
    }
  }

  if (changes.length === 0 && newObj && typeof newObj.detail === "string") {
    summary = newObj.detail;
    const parts = newObj.detail.split(/,\s*/);
    for (const part of parts) {
      const match = part.match(/(?:.*:\s*)?([a-zA-ZÀ-ỹ\s]+?)\s+([^\s→-]+(?:\s+[^\s→-]+)*)\s*(?:->|→)\s*(.+)$/);
      if (match) {
        const rawField = match[1].trim().toLowerCase();
        const before = match[2].trim();
        const after = match[3].trim();
        changes.push({
          field: fieldMap[rawField] ?? (rawField === "phone" ? (isVi ? "Số điện thoại" : "Phone Number") : rawField === "name" ? (isVi ? "Họ và tên" : "Full Name") : match[1].trim()),
          before,
          after,
        });
      }
    }
  }

  const actionDescriptionsVi: Record<string, string> = {
    AUTH_LOGIN: "Đăng nhập thành công vào hệ thống",
    AUTH_LOGOUT: "Đăng xuất khỏi phiên làm việc",
    ACCOUNT_EDITED: "Cập nhật thông tin tài khoản người dùng",
    PROFILE_UPDATED: "Cập nhật hồ sơ cá nhân",
    NAME_CHANGED: "Thay đổi họ và tên tài khoản",
    ACCOUNT_CREATED: "Tạo mới tài khoản nhân sự",
    ACCOUNT_DEACTIVATED: "Vô hiệu hóa tài khoản người dùng",
    ACCOUNT_LOCKED: "Khóa tài khoản do vi phạm hoặc cảnh báo",
    ACCOUNT_ACTIVATED: "Kích hoạt lại tài khoản người dùng",
    PERMISSIONS_CHANGED: "Cập nhật phân quyền truy cập",
    INVITE_SENT: "Gửi thư mời kích hoạt tài khoản",
    INVITE_RESENT: "Gửi lại mã OTP kích hoạt tài khoản",
  };

  const actionDescriptionsEn: Record<string, string> = {
    AUTH_LOGIN: "User signed in successfully",
    AUTH_LOGOUT: "User signed out",
    ACCOUNT_EDITED: "User account information updated",
    PROFILE_UPDATED: "Personal profile updated",
    NAME_CHANGED: "Full name changed",
    ACCOUNT_CREATED: "New staff account created",
    ACCOUNT_DEACTIVATED: "Account deactivated",
    ACCOUNT_LOCKED: "Account locked",
    ACCOUNT_ACTIVATED: "Account reactivated",
    PERMISSIONS_CHANGED: "Access permissions updated",
    INVITE_SENT: "Invitation email sent",
    INVITE_RESENT: "Invitation verification code resent",
  };

  const actionDescriptions = isVi ? actionDescriptionsVi : actionDescriptionsEn;
  const fallback = summary || (isVi ? `Thao tác hệ thống (${log.action})` : `System action (${log.action})`);
  const actionText = actionDescriptions[log.action] ?? fallback;
  // Nội dung gốc đã ghi trong nhật ký: luôn giữ lại, câu mô tả ở trên chỉ để dễ đọc.
  const recorded = newObj && typeof newObj.detail === "string" && newObj.detail !== actionText ? newObj.detail : null;
  return { summary: changes.length > 0 ? "" : actionText, recorded, changes };
}

const emptyFilters = { actor: "", action: "", from: "", to: "" };

export default function AuditLogPage() {
  const { isVietnamese } = useAppLanguage();
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([filters, page, retry]);
  const [response, setResponse] = useState<{ key: string; result: Result | null; error: boolean } | null>(null);
  const result = response && response.key === requestKey ? response.result : null;
  const error = response?.key === requestKey && response?.error;
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const invalidDates = Boolean(draft.from && draft.to && draft.from > draft.to);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.actor.trim()) query.set("actor", filters.actor.trim());
    if (filters.action.trim()) query.set("action", filters.action.trim());
    if (filters.from) query.set("from", new Date(filters.from).toISOString());
    if (filters.to) query.set("to", new Date(filters.to).toISOString());
    api<Result>("GET", `/audit-logs?${query}`).then(data => {
      if (active) setResponse({ key: requestKey, result: data, error: false });
    }).catch(() => { if (active) setResponse({ key: requestKey, result: null, error: true }); });
    return () => { active = false; };
  }, [filters, page, requestKey]);

  const columns: Column<AuditLog>[] = [
    { key: "time", header: isVietnamese ? "Thời gian" : "Time", render: row => formatDateTime(row.timestamp) },
    { key: "actor", header: isVietnamese ? "Người thực hiện" : "Actor", render: row => row.user?.fullName ?? row.userId ?? (isVietnamese ? "Hệ thống / Không xác định" : "System / unavailable") },
    { key: "action", header: isVietnamese ? "Hành động" : "Action", render: row => <span className={styles.wrap}>{row.action}</span> },
    { key: "entity", header: isVietnamese ? "Đối tượng" : "Entity", render: row => <span className={styles.wrap}>{row.entityName}{row.entityId ? ` · ${row.entityId}` : ""}</span> },
    {
      key: "detail",
      header: isVietnamese ? "Chi tiết" : "Details",
      align: "right",
      render: row => (
        <Button
          tone="ghost"
          size="sm"
          onClick={() => setDetail(row)}
          aria-label={isVietnamese ? tr(`Xem chi tiết cho ${row.action}`) : tr(`View details for ${row.action}`)}
        >
          {isVietnamese ? "Xem chi tiết" : tr("View details")}
        </Button>
      ),
    },
  ];

  return <>
    <PageHeader
      title={isVietnamese ? "Nhật ký hệ thống" : tr("Audit Log")}
      description={isVietnamese ? "Theo dõi lịch sử hoạt động và các thay đổi trong hệ thống. Bộ lọc sử dụng múi giờ thiết bị của bạn." : tr("Review recorded activity and changes. Times and date filters use your local timezone.")}
      showDate
    />
    <Card pad={0}>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); if (!invalidDates) { setFilters({ ...draft }); setPage(1); } }}>
        <label>{isVietnamese ? "Người thực hiện" : tr("Actor")}<Input value={draft.actor} maxLength={200} onChange={e => setDraft({ ...draft, actor: e.target.value })} placeholder={isVietnamese ? "Tìm kiếm tên người thực hiện" : tr("Search actor name")} /></label>
        <label>{isVietnamese ? "Hành động" : tr("Action")}<Input value={draft.action} maxLength={100} onChange={e => setDraft({ ...draft, action: e.target.value })} placeholder={isVietnamese ? "Mã hành động, ví dụ AUTH_LOGIN" : tr("Exact action, e.g. AUTH_LOGIN")} /></label>
        <label>{isVietnamese ? "Từ ngày" : tr("From")}<Input type="datetime-local" value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
        <label>{isVietnamese ? "Đến ngày" : tr("To")}<Input type="datetime-local" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
        <div className={styles.actions}>
          <Button type="submit" disabled={invalidDates}>{isVietnamese ? "Áp dụng" : tr("Apply filters")}</Button>
          <Button tone="secondary" type="button" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); }}>{isVietnamese ? "Đặt lại" : tr("Reset")}</Button>
        </div>
        {invalidDates && <p role="alert">{isVietnamese ? "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu." : tr("The end date must be on or after the start date.")}</p>}
      </form>
      {error ? (
        <Alert
          tone="danger"
          title={isVietnamese ? "Không thể tải nhật ký hệ thống" : tr("Audit history could not be loaded")}
          action={<Button tone="secondary" onClick={() => setRetry(n => n + 1)}>{isVietnamese ? "Thử lại" : "Try again"}</Button>}
        >
          {isVietnamese ? "Vui lòng kiểm tra kết nối mạng và thử lại." : tr("Check your connection and try again.")}
        </Alert>
      ) : (
        <div className={styles.table}>
          <DataTable
            columns={columns}
            rows={result?.logs ?? []}
            rowKey={row => row.id}
            loading={!result}
            caption={isVietnamese ? "Lịch sử hoạt động, mới nhất ở trên" : tr("Audit history, newest first")}
            empty={
              <EmptyState
                title={isVietnamese ? "Không có sự kiện nào khớp với bộ lọc." : "No audit events match these filters."}
                description={isVietnamese ? "Hãy điều chỉnh người thực hiện, hành động hoặc khoảng thời gian để xem hoạt động đã ghi nhận." : "Adjust the actor, action or date range to see recorded activity."}
              />
            }
          />
        </div>
      )}
      {result && (
        <div className={styles.pagination}>
          <span role="status">
            {result.total} {isVietnamese ? "sự kiện" : "events"} · {isVietnamese ? "Trang" : tr("Page")} {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}
          </span>
          <div className={styles.actions}>
            <Button tone="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {isVietnamese ? "Trang trước" : tr("Previous page")}
            </Button>
            <Button tone="secondary" disabled={page * result.pageSize >= result.total} onClick={() => setPage(page + 1)}>
              {isVietnamese ? "Trang sau" : tr("Next page")}
            </Button>
          </div>
        </div>
      )}
    </Card>
    {detail && (() => {
      const { summary, recorded, changes } = parseAuditChanges(detail, isVietnamese);
      return (
        <Modal
          title={isVietnamese ? "Chi tiết sự kiện nhật ký" : tr("Audit Event Details")}
          subtitle={`${detail.action} · ${formatDateTime(detail.timestamp)}`}
          width={720}
          onClose={() => setDetail(null)}
        >
          <dl className={styles.metadata}>
            <div>
              <dt>{isVietnamese ? "Người thực hiện" : tr("Actor")}</dt>
              <dd>{detail.user?.fullName ?? detail.userId ?? (isVietnamese ? "Hệ thống" : tr("System"))}</dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Hành động" : tr("Action")}</dt>
              <dd><strong>{detail.action}</strong></dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Đối tượng thao tác" : tr("Target Entity")}</dt>
              <dd>{detail.entityName || (isVietnamese ? "Tài khoản / Hệ thống" : tr("Account / System"))}</dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Thời gian" : tr("Time")}</dt>
              <dd>{formatDateTime(detail.timestamp)}</dd>
            </div>
            {/* Định danh và nguồn thao tác (FR-021: lưu vết user, IP, thời gian). */}
            {([
              [isVietnamese ? "Mã đối tượng" : "Entity ID", detail.entityId],
              [isVietnamese ? "Mã sự kiện" : "Event ID", detail.id],
              [isVietnamese ? "Địa chỉ IP" : "IP address", detail.ipAddress],
              [isVietnamese ? "Trình duyệt" : "User agent", detail.userAgent],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value ?? (isVietnamese ? "Không ghi nhận" : tr("Not recorded"))}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.changeSection}>
            <div className={styles.changeTitle}>{isVietnamese ? "Nội dung thay đổi chi tiết" : tr("Detailed Changes")}</div>
            {changes.length > 0 ? (
              <div className={styles.changeTableWrapper}>
                <table className={styles.changeTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>{isVietnamese ? "Thông tin thay đổi" : tr("Field Name")}</th>
                      <th style={{ width: "35%" }}>{isVietnamese ? "Trước khi sửa (Before)" : tr("Before (Old Value)")}</th>
                      <th style={{ width: "35%" }}>{isVietnamese ? "Sau khi sửa (After)" : tr("After (New Value)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c, i) => (
                      <tr key={i}>
                        <td><strong>{c.field}</strong></td>
                        <td><span className={styles.valPillOld}>{c.before}</span></td>
                        <td><span className={styles.valPillNew}>➔ {c.after}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>📝</div>
                <div className={styles.actionText}>
                  <strong>{summary}</strong>
                  <p>{recorded ?? (isVietnamese ? "Hành động đã được ghi nhận và áp dụng thành công trong hệ thống." : tr("Action was successfully executed and recorded in the audit log."))}</p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      );
    })()}
  </>;
}
