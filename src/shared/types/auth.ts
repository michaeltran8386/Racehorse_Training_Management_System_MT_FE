// Kiểu dữ liệu dùng chung cho tài khoản, vai trò và quyền (khớp bảng users/roles/permissions ở backend).

// Role và ROLES nằm ở types/enums.ts (nơi giữ mọi enum khớp SRS). Xuất lại ở đây cho tiện dùng.
export type { Role } from "./enums";
export { ROLES } from "./enums";
import type { Role } from "./enums";

// Trạng thái tài khoản. PENDING_APPROVAL là trạng thái "Pending Approval" trong design
// (chờ Club Manager duyệt), các trạng thái còn lại theo quy tắc dự án.
export type AccountStatus =
  | "PENDING_EMAIL"
  | "PENDING_APPROVAL"
  | "INVITED"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED"
  | "LOCKED";

export type PermissionKey =
  | "viewHorses"
  | "editHorses"
  | "deleteHorses"
  | "createPlan"
  | "assignSchedule"
  | "recordMetrics"
  | "ackAlerts"
  | "viewMedical"
  | "placeLock"
  | "liftLock"
  | "manageAccounts"
  | "viewAudit";

export type PermissionMap = Record<PermissionKey, boolean>;

export type NotifyKey = "thresholdAlert" | "lockLifted" | "dailyDigest" | "raceResults";
export type NotifyMap = Record<NotifyKey, boolean>;

// Bản ghi đầy đủ (chỉ backend mới có `password`).
export interface Account {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  password: string;
  createdAt: string; // ISO
  lastActive: string | null; // ISO
  requestedAt: string | null; // ISO — lúc gửi yêu cầu đăng ký
  requestCode: string | null; // REQ-2609-014
  lockedAt: string | null; // ISO
  invitedBy: string | null; // tên Club Manager đã mời (tài khoản nhân viên)
  // Lần đổi trạng thái gần nhất do Club Manager làm (duyệt / từ chối / khóa / vô hiệu hóa…), kèm lý do nếu có.
  statusReason: string | null;
  statusChangedAt: string | null; // ISO
  statusChangedBy: string | null;
  permissions: PermissionMap;
  permissionsChangedAt: string | null;
  permissionsChangedBy: string | null;
  notify: NotifyMap;
  updatedAt?: string; // ISO — backend thật trả về; mock không cần
}

// Bản gửi xuống trình duyệt: không bao giờ có mật khẩu.
export type PublicAccount = Omit<Account, "password">;

// Người đang đăng nhập.
export type AuthUser = PublicAccount;
