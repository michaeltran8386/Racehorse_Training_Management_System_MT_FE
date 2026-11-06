import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
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
import { messageFor } from "@/shared/lib/messages";
import { useAppLanguage } from "@/shared/lib/language";
import { downloadXlsx } from "@/shared/lib/xlsx";
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

const actionGroups = [
  ["Bảo mật & Phiên làm việc", "Security & Sessions", "neutral", [
    ["AUTH_LOGIN", "Đăng nhập", "Sign in", "ok"],
    ["AUTH_LOGOUT", "Đăng xuất", "Sign out"],
    ["LOGIN_FAILED", "Đăng nhập thất bại", "Failed sign-in"],
    ["LOGIN_LOCKED_OUT", "Tạm chặn đăng nhập", "Sign-in temporarily blocked"],
    ["REFRESH_TOKEN_REUSED", "Phát hiện dùng lại mã phiên", "Session token reuse detected"],
    ["PASSWORD_CHANGED", "Đổi mật khẩu", "Change password"],
    ["PASSWORD_RESET", "Đặt lại mật khẩu", "Reset password"],
    ["PASSWORD_RESET_REQUESTED", "Yêu cầu đặt lại mật khẩu", "Request a password reset"],
    ["ACCESS_DENIED", "Truy cập bị từ chối", "Access denied"],
  ]],
  ["Quản lý tài khoản & Phân quyền", "Accounts & Permissions", "info", [
    ["ACCOUNT_CREATED", "Tạo tài khoản", "Create account"],
    ["ACCOUNT_INVITED", "Mời tạo tài khoản", "Invite staff member"],
    ["REGISTER", "Đăng ký tài khoản", "Register account"],
    ["EMAIL_VERIFIED", "Xác minh email", "Verify email"],
    ["INVITE_ACCEPTED", "Chấp nhận lời mời", "Accept invitation"],
    ["INVITE_SENT", "Gửi lời mời kích hoạt", "Send invitation"],
    ["INVITE_RESENT", "Gửi lại lời mời kích hoạt", "Resend invitation"],
    ["ACCOUNT_EDITED", "Cập nhật tài khoản", "Update account"],
    ["PROFILE_UPDATED", "Cập nhật hồ sơ cá nhân", "Update profile"],
    ["NAME_CHANGED", "Đổi họ tên", "Change full name"],
    ["ACCOUNT_LOCK", "Khóa tài khoản", "Lock account"],
    ["ACCOUNT_UNLOCK", "Mở khóa tài khoản", "Unlock account"],
    ["ACCOUNT_APPROVE", "Duyệt tài khoản", "Approve account"],
    ["ACCOUNT_DECLINE", "Từ chối tài khoản", "Decline account"],
    ["ACCOUNT_DEACTIVATE", "Vô hiệu hóa tài khoản", "Deactivate account"],
    ["ACCOUNT_REACTIVATE", "Kích hoạt lại tài khoản", "Reactivate account"],
    ["ACCOUNT_DELETED", "Xóa tài khoản", "Delete account"],
    ["PERMISSIONS_CHANGED", "Phân quyền truy cập", "Change permissions"],
    ["PERMISSION_REQUESTED", "Yêu cầu cấp quyền", "Request access"],
    ["PERMISSION_REQUEST_GRANTED", "Đánh dấu yêu cầu đã xử lý", "Mark access request as handled"],
    ["PERMISSION_REQUEST_DISMISSED", "Từ chối yêu cầu cấp quyền", "Dismiss access request"],
  ]],
  ["Tài chính & Hóa đơn", "Finance & Invoices", "warn", [
    ["MONTHLY_INVOICES_GENERATED", "Tạo hóa đơn tháng", "Generate monthly invoices"],
    ["INVOICE_CREATED", "Tạo hóa đơn", "Create invoice"],
    ["INVOICE_UPDATED", "Cập nhật hóa đơn", "Update invoice"],
    ["INVOICE_PAID", "Cập nhật thanh toán hóa đơn", "Record invoice payment"],
    ["INVOICE_STATUS_CHANGED", "Cập nhật trạng thái hóa đơn", "Change invoice status"],
    ["INVOICE_CANCELLED", "Hủy hóa đơn", "Cancel invoice"],
  ]],
  ["Giải đua & Thi đấu", "Racing & Tournaments", "violet", [
    ["TOURNAMENT_CREATED", "Tạo giải đua", "Create tournament"],
    ["TOURNAMENT_UPDATED", "Cập nhật giải đua", "Update tournament"],
    ["TOURNAMENT_STATUS_CHANGED", "Đổi trạng thái giải đua", "Change tournament status"],
    ["TOURNAMENT_DELETED", "Xóa giải đua", "Delete tournament"],
    ["TOURNAMENT_REGISTERED", "Đăng ký thi đấu", "Register for tournament"],
    ["TOURNAMENT_SCRATCHED", "Rút khỏi giải đua", "Withdraw from tournament"],
    ["TOURNAMENT_RESULTS_RECORDED", "Nhập kết quả thi đấu", "Record race results"],
    ["TOURNAMENT_RESULTS_LOCKED", "Chốt kết quả thi đấu", "Finalize race results"],
  ]],
  ["Quản lý ngựa & Huấn luyện", "Horses & Training", "ok", [
    ["HORSE_CREATED", "Tạo hồ sơ ngựa", "Create horse profile"],
    ["HORSE_UPDATED", "Cập nhật hồ sơ ngựa", "Update horse profile"],
    ["HORSE_STATUS_CHANGED", "Cập nhật trạng thái ngựa", "Change horse status"],
    ["HORSE_OWNERSHIP_TRANSFERRED", "Chuyển quyền sở hữu ngựa", "Transfer horse ownership"],
    ["HORSE_DELETED", "Xóa hồ sơ ngựa", "Delete horse profile"],
    ["HORSE_RESTORED", "Khôi phục hồ sơ ngựa", "Restore horse profile"],
    ["CREATE_TRAINING_PLAN", "Tạo giáo án huấn luyện", "Create training plan"],
    ["UPDATE_TRAINING_PLAN", "Cập nhật giáo án huấn luyện", "Update training plan"],
    ["CREATE_WORKOUT_SESSION", "Lên lịch bài tập", "Schedule workout"],
    ["RECORD_WORKOUT_RESULT", "Ghi nhận bài tập", "Record workout result"],
    ["UPDATE_WORKOUT_RESULT", "Cập nhật kết quả bài tập", "Update workout result"],
  ]],
  ["Vật tư & Kho", "Supplies & Inventory", "neutral", [
    ["RESTOCK_REQUEST_CREATED", "Đề xuất vật tư", "Request supplies"],
    ["RESTOCK_DIRECT_CREATED", "Tạo phiếu bổ sung vật tư", "Create restock order"],
    ["RESTOCK_APPROVED", "Duyệt đề xuất vật tư", "Approve restock request"],
    ["RESTOCK_REJECTED", "Từ chối đề xuất vật tư", "Reject restock request"],
    ["RESTOCK_DELIVERED", "Giao vật tư", "Deliver supplies"],
    ["STOCK_ADJUSTED", "Điều chỉnh tồn kho", "Adjust inventory"],
    ["STOCK_RESTOCKED", "Xác nhận nhập kho", "Confirm restock"],
    ["SUPPLY_CONSUMED", "Ghi nhận sử dụng vật tư", "Record supply usage"],
    ["TRANSFER_HORSE", "Điều chuyển ô chuồng", "Transfer between stalls"],
  ]],
  ["Y tế & Thú y", "Health & Veterinary Care", "danger", [
    ["CREATE_MEDICAL_RECORD", "Ghi nhận bệnh án", "Create medical record"],
    ["CREATE_MEDICAL_RECORD_DRAFT", "Lưu nháp bệnh án", "Save medical record draft"],
    ["UPDATE_MEDICAL_RECORD", "Cập nhật bệnh án", "Update medical record"],
    ["FINALIZE_MEDICAL_RECORD", "Hoàn tất bệnh án", "Finalize medical record"],
    ["CLOSE_MEDICAL_RECORD", "Đóng bệnh án", "Close medical record"],
    ["HORSE_ISOLATED", "Cách ly y tế", "Isolate horse"],
    ["CREATE_MEDICAL_LOCK", "Đặt khóa huấn luyện", "Place training lock"],
    ["RELEASE_MEDICAL_LOCK", "Gỡ khóa huấn luyện", "Lift training lock"],
    ["EXTEND_MEDICAL_LOCK", "Gia hạn khóa huấn luyện", "Extend training lock"],
    ["RECORD_PREVENTIVE_CARE", "Ghi nhận chăm sóc phòng bệnh", "Record preventive care"],
  ]],
] satisfies [string, string, string, [string, string, string, string?][]][];

const actionLabels = new Map(actionGroups.flatMap(([, , tone, actions]) =>
  actions.map(([code, vi, en, override]) => [code, { vi, en, tone: override ?? tone }] as const),
));

const historicalActions = new Map([
  ["ACCOUNT_LOCKED", "ACCOUNT_LOCK"],
  ["ACCOUNT_UNLOCKED", "ACCOUNT_UNLOCK"],
  ["ACCOUNT_DEACTIVATED", "ACCOUNT_DEACTIVATE"],
  ["ACCOUNT_ACTIVATED", "ACCOUNT_REACTIVATE"],
  ["RACE_RESULT_ENTERED", "TOURNAMENT_RESULTS_RECORDED"],
  ["TRAINING_PLAN_CREATED", "CREATE_TRAINING_PLAN"],
  ["WORKOUT_LOGGED", "RECORD_WORKOUT_RESULT"],
  ["MEDICAL_RECORD_CREATED", "CREATE_MEDICAL_RECORD"],
  ["TRAINING_LOCK_PLACED", "CREATE_MEDICAL_LOCK"],
]);

const entityLabels: Record<string, [string, string]> = {
  User: ["Tài khoản nhân viên", "Staff account"],
  FinancialInvoice: ["Hóa đơn", "Invoice"],
  Tournament: ["Giải đua", "Tournament"],
  TournamentRegistration: ["Đăng ký thi đấu", "Race registration"],
  TournamentResult: ["Kết quả thi đấu", "Race result"],
  Horse: ["Hồ sơ ngựa", "Horse profile"],
  TrainingPlan: ["Giáo án huấn luyện", "Training plan"],
  WorkoutSession: ["Bài tập", "Workout"],
  MedicalRecord: ["Hồ sơ bệnh án", "Medical record"],
  MedicalLock: ["Khóa huấn luyện", "Training lock"],
  InjuryLog: ["Hồ sơ chấn thương", "Injury log"],
  Supply: ["Vật tư", "Supply"],
  SupplyCatalog: ["Danh mục vật tư", "Supply catalog"],
  RestockRequest: ["Phiếu đề xuất vật tư", "Restock request"],
  StockBalance: ["Tồn kho", "Inventory balance"],
  StallAllocation: ["Phân ô chuồng", "Stall allocation"],
  Stall: ["Ô chuồng", "Stall"],
  IncidentReport: ["Biên bản sự cố", "Incident report"],
  NutritionPlan: ["Khẩu phần ăn", "Meal plan"],
  ShiftRoster: ["Lịch trực", "Shift roster"],
};

const fieldLabels = new Map([
  ["fullname", ["Họ và tên", "Full name"]],
  ["họ và tên", ["Họ và tên", "Full name"]],
  ["họ tên", ["Họ và tên", "Full name"]],
  ["name", ["Tên", "Name"]],
  ["phone", ["Số điện thoại", "Phone number"]],
  ["phonenumber", ["Số điện thoại", "Phone number"]],
  ["số điện thoại", ["Số điện thoại", "Phone number"]],
  ["email", ["Email liên hệ", "Email address"]],
  ["role", ["Vai trò người dùng", "User role"]],
  ["status", ["Trạng thái", "Status"]],
  ["statusreason", ["Lý do thay đổi trạng thái", "Reason for status change"]],
  ["stallcode", ["Mã ô chuồng", "Stall code"]],
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readSnapshot(json: string | null) {
  try {
    return json ? asRecord(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function periodLabel(period: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  return match ? match[2] + "/" + match[1] : "";
}

const viDateTime = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function auditTime(timestamp: string, isVi: boolean) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  if (!isVi) return formatDateTime(date);
  const parts = Object.fromEntries(viDateTime.formatToParts(date).map(({ type, value }) => [type, value]));
  return "Ngày " + parts.day + "/" + parts.month + "/" + parts.year + ", " + parts.hour + ":" + parts.minute;
}

function shortId(id: string | null) {
  return id ? "#…" + id.slice(-4) : "";
}

function translateDetail(detail: string, isVi: boolean) {
  if (!isVi) return detail;
  return detail
    .replace(/^Generated (\d+) unissued invoices for billing period (\d{4}-\d{2})$/, (_, count: string, period: string) =>
      "Đã tự động tạo " + count + " hóa đơn chờ gửi cho kỳ thanh toán tháng " + (periodLabel(period) || period))
    .replace(/^Invoice \S+ \((\d{4}-\d{2})\) for horse (.+) was paid via (.+)$/, (_, period: string, horse: string, method: string) =>
      "Đã ghi nhận thanh toán hóa đơn kỳ " + (periodLabel(period) || period) + " của ngựa " + horse + " qua " + method)
    .replace(/^Created tournament (.+) \((\d+)m\)$/, "Đã tạo giải đua $1 (cự ly $2 m)")
    .replace(/^Updated tournament (.+)$/, "Đã cập nhật giải đua $1")
    .replace(/^Changed tournament (.+) status from (\S+) to (\S+)(.*)$/, "Đã đổi trạng thái giải đua $1 từ $2 sang $3$4")
    .replace(/^Changed invoice \S+ status from (\S+) to (\S+)$/, "Đã đổi trạng thái hóa đơn từ $1 sang $2")
    .replace(/^Updated invoice \S+ \((\d{4})-(\d{2})\)$/, "Đã cập nhật hóa đơn kỳ $2/$1")
    .replace(/^(.+): (\d+) granted, (\d+) revoked$/, "$1 · Đã cấp $2 quyền và thu hồi $3 quyền")
    .replace(/^Recorded (\d+) results for tournament (.+)$/, "Đã nhập $1 kết quả cho giải đua $2")
    .replace(/^Moved horse (.+) from stall (.+) to (.+)$/, "Đã chuyển ngựa $1 từ ô chuồng $2 sang ô $3")
    .replace(/^Medical record created for horse \S+$/, "Đã tạo hồ sơ bệnh án cho ngựa")
    .replace(/^Medical lock (.+) created for horse \S+$/, "Đã đặt khóa huấn luyện $1")
    .replace(/^Password changed with OTP$/, "Đã đổi mật khẩu bằng mã OTP")
    .replace(/^Changed in My Profile$/, "Đã đổi mật khẩu trong hồ sơ cá nhân")
    .replace(/^OTP issued$/, "Đã gửi mã OTP");
}

function snapshotValues(snapshot: Record<string, unknown> | null) {
  // AuditService wraps new snapshots in values. Older entries store fields at the top level.
  return snapshot && Object.hasOwn(snapshot, "values") ? asRecord(snapshot.values) : snapshot;
}

function auditActionCode(log: AuditLog, newValues: Record<string, unknown> | null) {
  if (log.action === "INVOICE_STATUS_CHANGED" && newValues?.status === "CANCELLED") return "INVOICE_CANCELLED";
  if (log.action === "HORSE_STATUS_CHANGED" && (newValues?.newStatus ?? newValues?.status) === "ISOLATED") return "HORSE_ISOLATED";
  return historicalActions.get(log.action) ?? log.action;
}

function describeAudit(log: AuditLog, isVi: boolean) {
  const oldValues = readSnapshot(log.oldValuesJson);
  const snapshot = readSnapshot(log.newValuesJson);
  const newValues = snapshotValues(snapshot);
  const original = textValue(snapshot?.detail);
  const readField = (key: string) => textValue(newValues?.[key]) || textValue(oldValues?.[key]);
  const action = actionLabels.get(auditActionCode(log, newValues));
  const label = (isVi ? action?.vi : action?.en) ?? (isVi ? "Hoạt động hệ thống" : "System activity");
  const actor = log.user?.fullName || textValue(snapshot?.actor) || shortId(log.userId) ||
    (isVi ? "Hệ thống / Không xác định" : "System / unavailable");

  let identifier = shortId(log.entityId);
  if (log.entityName === "User") {
    identifier = readField("fullName") || readField("name") ||
      (log.entityId && log.entityId === log.userId ? log.user?.fullName || textValue(snapshot?.actor) : "") ||
      identifier;
  } else if (log.entityName === "FinancialInvoice") {
    const period = periodLabel(readField("billingPeriod")) || periodLabel(log.entityId ?? "") ||
      periodLabel(original.match(/\b\d{4}-\d{2}\b/)?.[0] ?? "");
    if (period) identifier = (isVi ? "kỳ " : "period ") + period;
  } else if (log.entityName === "Tournament") {
    identifier = readField("code") || readField("tournamentCode") || readField("name") || identifier;
  } else if (log.entityName === "Horse") {
    identifier = readField("name") || readField("horseCode") || identifier;
  }
  const names = Object.hasOwn(entityLabels, log.entityName) ? entityLabels[log.entityName] : undefined;
  const entity = [names?.[isVi ? 0 : 1] ?? (isVi ? "Bản ghi hệ thống" : "System record"), identifier].filter(Boolean).join(" ");

  const changes: ChangeItem[] = [];
  if (oldValues && newValues) {
    for (const key of new Set([...Object.keys(oldValues), ...Object.keys(newValues)])) {
      if (key === "actor" || key === "detail") continue;
      const before = displayValue(oldValues[key]);
      const after = displayValue(newValues[key]);
      if (before === after) continue;
      const field = log.entityName === "User" && key === "name" ? "fullname" : key.toLowerCase();
      changes.push({ field: fieldLabels.get(field)?.[isVi ? 0 : 1] ?? key, before, after });
    }
  }
  if (changes.length === 0) {
    for (const part of original.split(/,\s*/)) {
      const match = part.match(/(?:.*:\s*)?([a-zA-ZÀ-ỹ\s]+?)\s+([^\s→-]+(?:\s+[^\s→-]+)*)\s*(?:->|→)\s*(.+)$/);
      if (!match) continue;
      const field = match[1].trim();
      changes.push({ field: fieldLabels.get(field.toLowerCase())?.[isVi ? 0 : 1] ?? field, before: match[2].trim(), after: match[3].trim() });
    }
  }
  return { label, tone: action?.tone ?? "neutral", actor, entity, changes, original, summary: translateDetail(original, isVi) || label };
}

function displayValue(value: unknown) {
  if (value == null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function ActionBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={styles.badge} data-tone={tone}>{label}</span>;
}

const emptyFilters = { actor: "", action: "", from: "", to: "" };

function auditQuery(filters: typeof emptyFilters) {
  const query = new URLSearchParams();
  if (filters.actor.trim()) query.set("actor", filters.actor.trim());
  if (filters.action.trim()) query.set("action", filters.action.trim());
  if (filters.from) query.set("from", new Date(filters.from).toISOString());
  if (filters.to) query.set("to", new Date(filters.to).toISOString());
  return query;
}

const statusFilterSources = new Map([
  ["INVOICE_CANCELLED", "INVOICE_STATUS_CHANGED"],
  ["HORSE_ISOLATED", "HORSE_STATUS_CHANGED"],
]);

const batchSize = 100;

function fetchAuditPage(query: URLSearchParams, page: number, pageSize: number) {
  const params = new URLSearchParams(query);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return api<Result>("GET", "/audit-logs?" + params);
}

async function* auditBatches(query: URLSearchParams) {
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page++) {
    const data = await fetchAuditPage(query, page, batchSize);
    if (page === 1) lastPage = Math.ceil(data.total / batchSize);
    yield data;
  }
}

// The API can filter by action code. The status-specific options also match status snapshots.
async function readStatusEvents(query: URLSearchParams, code: string, source: string) {
  const logs: AuditLog[] = [];
  for (const action of [code, source]) {
    const params = new URLSearchParams(query);
    params.set("action", action);
    for await (const batch of auditBatches(params)) {
      for (const log of batch.logs) {
        if (auditActionCode(log, snapshotValues(readSnapshot(log.newValuesJson))) === code) logs.push(log);
      }
    }
  }
  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id));
}

async function listAudit(query: URLSearchParams, page: number, pageSize: number) {
  const code = query.get("action") ?? "";
  const source = statusFilterSources.get(code);
  if (!source) return fetchAuditPage(query, page, pageSize);
  const logs = await readStatusEvents(query, code, source);
  return { logs: logs.slice((page - 1) * pageSize, page * pageSize), total: logs.length, page, pageSize };
}

export default function AuditLogPage() {
  useScreenTranslation();
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const invalidDates = Boolean(draft.from && draft.to && draft.from > draft.to);

  useEffect(() => {
    let active = true;
    listAudit(auditQuery(filters), page, 10).then(data => {
      if (active) setResponse({ key: requestKey, result: data, error: false });
    }).catch(() => { if (active) setResponse({ key: requestKey, result: null, error: true }); });
    return () => { active = false; };
  }, [filters, page, requestKey]);

  async function exportExcel() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const query = auditQuery(filters);
      const startedAt = new Date().toISOString();
      const requestedEnd = query.get("to");
      const requestedStart = query.get("from");
      if ((!requestedStart || requestedStart <= startedAt) && (!requestedEnd || requestedEnd > startedAt)) {
        query.set("to", startedAt);
      }
      const limit = 25_000;
      const rows = [isVietnamese
        ? ["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Nội dung chi tiết"]
        : ["Time", "Actor", "Action", "Target", "Details"]];
      const seen = new Set<string>();
      const appendRows = (logs: AuditLog[]) => {
        for (const log of logs) {
          if (seen.has(log.id)) continue;
          seen.add(log.id);
          const { actor, label, entity, summary, changes } = describeAudit(log, isVietnamese);
          const content = [summary, ...changes.map(({ field, before, after }) => field + " · " + before + " → " + after)];
          rows.push([auditTime(log.timestamp, isVietnamese), actor, label, entity, content.join("\n")]);
        }
      };
      const source = statusFilterSources.get(filters.action);
      if (source) {
        const logs = await readStatusEvents(query, filters.action, source);
        if (logs.length > limit) {
          setExportError(isVietnamese
            ? "Hãy thu hẹp bộ lọc để xuất tối đa 25.000 sự kiện."
            : "Narrow the filters to export up to 25,000 events.");
          return;
        }
        appendRows(logs);
      } else {
        // shortcut: use the paginated read API up to the existing export limit; larger histories need a server export.
        for await (const data of auditBatches(query)) {
          if (data.total > limit) {
            setExportError(isVietnamese
              ? "Hãy thu hẹp bộ lọc để xuất tối đa 25.000 sự kiện."
              : "Narrow the filters to export up to 25,000 events.");
            return;
          }
          appendRows(data.logs);
        }
      }
      downloadXlsx("equiflow-audit-log.xlsx", [{ name: isVietnamese ? "Nhật ký hệ thống" : "Audit Log", rows }]);
    } catch (err) {
      setExportError(messageFor(err));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<AuditLog>[] = [
    { key: "time", header: isVietnamese ? "Thời gian" : "Time", render: row => auditTime(row.timestamp, isVietnamese) },
    { key: "actor", header: isVietnamese ? "Người thực hiện" : "Actor", render: row => describeAudit(row, isVietnamese).actor },
    { key: "action", header: isVietnamese ? "Hành động" : "Action", render: row => <ActionBadge {...describeAudit(row, isVietnamese)} /> },
    { key: "entity", header: isVietnamese ? "Đối tượng" : "Entity", render: row => <span className={styles.wrap}>{describeAudit(row, isVietnamese).entity}</span> },
    {
      key: "detail",
      header: isVietnamese ? "Chi tiết" : "Details",
      align: "right",
      render: row => (
        <Button
          tone="ghost"
          size="sm"
          onClick={() => setDetail(row)}
          aria-label={(isVietnamese ? "Xem chi tiết · " : "View details · ") + describeAudit(row, isVietnamese).label}
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
      action={<Button icon="download" tone="secondary" disabled={exporting || !result?.total} onClick={() => void exportExcel()}>
        {exporting ? (isVietnamese ? "Đang xuất…" : "Exporting…") : (isVietnamese ? "Xuất Excel" : "Export Excel")}
      </Button>}
    />
    {exportError && <Alert tone="danger" onDismiss={() => setExportError("")}>{exportError}</Alert>}
    <Card pad={0}>
      <form className={styles.filters} onSubmit={event => { event.preventDefault(); if (!invalidDates) { setFilters({ ...draft }); setPage(1); } }}>
        <label>{isVietnamese ? "Người thực hiện" : tr("Actor")}<Input value={draft.actor} maxLength={200} onChange={e => setDraft({ ...draft, actor: e.target.value })} placeholder={isVietnamese ? "Tìm kiếm tên người thực hiện" : tr("Search actor name")} /></label>
        <label>{isVietnamese ? "Hành động" : tr("Action")}
          <select className={styles.actionSelect} value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value })}>
            <option value="">{isVietnamese ? "Tất cả hành động" : "All actions"}</option>
            {actionGroups.map(([vi, en, , actions]) => (
              <optgroup key={en} label={isVietnamese ? vi : en}>
                {actions.map(([code, labelVi, labelEn]) => (
                  <option key={code} value={code}>{isVietnamese ? labelVi : labelEn}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
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
      const presentation = describeAudit(detail, isVietnamese);
      const { summary, original, changes, actor, entity } = presentation;
      return (
        <Modal
          title={isVietnamese ? "Chi tiết sự kiện nhật ký" : tr("Audit Event Details")}
          width={720}
          onClose={() => setDetail(null)}
        >
          <dl className={styles.metadata}>
            <div>
              <dt>{isVietnamese ? "Người thực hiện" : tr("Actor")}</dt>
              <dd>{actor}</dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Hành động" : tr("Action")}</dt>
              <dd><ActionBadge {...presentation} /></dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Đối tượng thao tác" : tr("Target Entity")}</dt>
              <dd>{entity}</dd>
            </div>
            <div>
              <dt>{isVietnamese ? "Thời gian" : tr("Time")}</dt>
              <dd>{auditTime(detail.timestamp, isVietnamese)}</dd>
            </div>
          </dl>

          <div className={styles.changeSection}>
            <div className={styles.changeTitle}>{isVietnamese ? "Nội dung thay đổi chi tiết" : tr("Detailed Changes")}</div>
            <p className={styles.detailSummary}>{summary}</p>
            {changes.length > 0 && (
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
                        <td><span className={styles.valPillNew}><Icon name="arrowRight" inline size={12} /> {c.after}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <details className={styles.technical}>
            <summary>{isVietnamese ? "Thông tin kỹ thuật & Giám sát bảo mật" : "Technical information & security monitoring"}</summary>
            <dl className={styles.metadata}>
              {([
                [isVietnamese ? "Mã sự kiện" : "Event ID", detail.id],
                [isVietnamese ? "Mã người thực hiện" : "Actor ID", detail.userId],
                [isVietnamese ? "Mã đối tượng" : "Target ID", detail.entityId],
                [isVietnamese ? "Loại đối tượng" : "Target type", detail.entityName],
                [isVietnamese ? "Mã hành động" : "Action code", detail.action],
                [isVietnamese ? "Địa chỉ IP" : "IP address", detail.ipAddress],
                ["User-Agent", detail.userAgent],
                [isVietnamese ? "Nội dung gốc" : "Original details", original],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || (isVietnamese ? "Không ghi nhận" : "Not recorded")}</dd>
                </div>
              ))}
            </dl>
          </details>
        </Modal>
      );
    })()}
  </>;
}
