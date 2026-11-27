import { api } from "@/shared/lib/api";
import type { PermissionMap, PublicAccount } from "@/shared/types/auth";
import type { CreateAccountInput, PermissionRequest, SavePermissionsResult, UpdateAccountInput } from "./types";

export const listAccounts = () => api<{ accounts: PublicAccount[] }>("GET", "/accounts");

export const getAccount = (id: string) => api<{ account: PublicAccount }>("GET", `/accounts/${id}`);

// Tạo tài khoản nhân viên: trạng thái INVITED, người được mời nhận email kèm mã để đặt mật khẩu.
export const createAccount = (input: CreateAccountInput) => api<{ account: PublicAccount }>("POST", "/accounts", input);

// Club Manager sửa họ tên + số điện thoại (email và vai trò không đổi ở đây).
export const updateAccount = (id: string, input: UpdateAccountInput) =>
  api<{ account: PublicAccount }>("PUT", `/accounts/${id}`, input);

// Xóa hẳn: chỉ tài khoản chưa từng hoạt động (INVITED, PENDING_EMAIL, REJECTED).
export const deleteAccount = (id: string) => api<{ ok: true }>("DELETE", `/accounts/${id}`);

export type AccountAction = "approve" | "decline" | "lock" | "unlock" | "deactivate" | "reactivate";

export interface ActiveAssignmentsResponse {
  userId: string;
  hasAssignments: boolean;
  stalls: Array<{
    id: string;
    stall: { id: string; code: string; zone: string };
    horse: { id: string; name: string; horseCode: string };
  }>;
  workouts: Array<{
    id: string;
    scheduledDate: string;
    workoutType: string;
    intensity: string;
    horse: { id: string; name: string; horseCode?: string };
  }>;
  shifts: Array<{
    id: string;
    date: string;
    shift: { id: string; name: string; startTime?: string; endTime?: string };
    zone: { id: string; name: string };
  }>;
  plans: Array<{
    id: string;
    planCode?: string | null;
    phaseName: string;
    startDate: string;
    endDate: string;
    horse: { id: string; name: string; horseCode?: string };
  }>;
}

// Kiểm tra công việc/ô chuồng/ca trực/giáo án nhân viên đang phụ trách.
export const getActiveAssignments = (id: string) =>
  api<ActiveAssignmentsResponse>("GET", `/accounts/${id}/active-assignments`);

// `reason` (không bắt buộc) được lưu kèm khi từ chối / khóa / vô hiệu hóa;
// `confirmedActiveAssignments` cho phép tiếp tục khóa dù đang có công việc dở dang.
export const runAccountAction = (
  id: string,
  action: AccountAction,
  reason?: string,
  confirmedActiveAssignments?: boolean,
) =>
  api<{ account: PublicAccount }>("POST", `/accounts/${id}/${action}`, {
    ...(reason ? { reason } : {}),
    ...(confirmedActiveAssignments !== undefined ? { confirmedActiveAssignments } : {}),
  });

export const resendInvite = (id: string) => api<{ account: PublicAccount }>("POST", `/accounts/${id}/resend-invite`);

// Danh sách chờ: yêu cầu cấp quyền người dùng gửi từ màn 403 (mặc định chỉ yêu cầu đang chờ).
export const listPermissionRequests = () => api<{ requests: PermissionRequest[] }>("GET", "/permission-requests");

// Đánh dấu đã xử lý. GRANTED chỉ ghi nhận — quyền thật bật ở màn Permissions của tài khoản.
export const resolvePermissionRequest = (id: number, status: "GRANTED" | "DISMISSED") =>
  api<{ request: PermissionRequest }>("POST", `/permission-requests/${id}/resolve`, { status });

export const savePermissions = (id: string, permissions: PermissionMap) =>
  api<SavePermissionsResult>("PUT", `/accounts/${id}/permissions`, { permissions });

export interface BarnGroomItem {
  id: string;
  fullName: string;
  email: string;
  status?: "ACTIVE" | "INVITED" | string;
  createdAt?: string;
  currentLoad?: number;
  maxCapacity?: number;
}

export interface BarnStaffingItem {
  id: string;
  name: string;
  code: string;
  trainersCount: number;
  maxTrainers: number;
  isFull: boolean;
  trainers: Array<{
    id: string;
    fullName: string;
    email: string;
    status?: "ACTIVE" | "INVITED" | string;
    createdAt?: string;
    currentLoad?: number;
    maxCapacity?: number;
  }>;
  groomsCount?: number;
  maxGrooms?: number;
  isGroomFull?: boolean;
  grooms?: BarnGroomItem[];
}

export const getBarnStaffing = () =>
  api<{ barns: BarnStaffingItem[] }>("GET", "/accounts/barn-staffing", undefined, { silent: true });

export interface OrphanedHorseItem {
  horseId: string;
  horseName: string;
  horseCode: string;
  avatarUrl: string | null;
  status: string;
  isMedicalLocked: boolean;
  stallCode: string;
  zoneName: string;
  zoneId: string | null;
  latestPlan: { id: string; planCode: string; phaseName: string; status: string } | null;
}

export const getOrphanedHorses = () =>
  api<{ items: OrphanedHorseItem[] }>("GET", "/accounts/orphaned-horses");

export const assignTrainerBarn = (
  id: string,
  input: { targetBarnId: string; handoverTrainerId?: string },
) =>
  api<{ success: true; message: string; account: PublicAccount }>(
    "POST",
    `/accounts/${id}/assign-barn`,
    input,
  );
