import type { Role } from "@/shared/types/enums";
import { api } from "@/shared/lib/api";
import { isVietnamese, localizeServerText, tr } from "@/shared/i18n/tr";
import { formatShortDate } from "./format";

// Thông báo trong ứng dụng (C-01): dữ liệu từ BE GET /notifications, giữ trong bộ nhớ và hỏi lại mỗi 30 giây.
// Các màn hình đọc bản sao trong bộ nhớ (getNotifications) và đăng ký nghe thay đổi (subscribeNotifications).
/**
 * Trả về URL điều hướng đầy đủ kèm tham số ?highlight=<targetId>
 * để trang đích tự động cuộn tới và "Gây chú ý" (Attention glow) đúng mục tiêu.
 */
export function getNotificationTargetUrl(n: AppNotification): string {
  const baseLink = n.link || "/";

  if (baseLink.includes("highlight=")) {
    return baseLink;
  }

  const p = n.params || {};
  const candidateId =
    p.incidentId ||
    p.requestId ||
    p.invoiceId ||
    p.lockId ||
    p.horseId ||
    p.userId ||
    p.planId ||
    p.workoutId ||
    p.id ||
    p.incidentNumber ||
    p.requestNumber ||
    p.requestCode ||
    p.code ||
    p.reference;

  if (!candidateId) {
    return baseLink;
  }

  const separator = baseLink.includes("?") ? "&" : "?";
  return `${baseLink}${separator}highlight=${encodeURIComponent(String(candidateId))}`;
}

export interface AppNotification {
  id: string;
  type?: string; // mã sự kiện từ BE (VD LOCK_PLACED) — dùng để dịch
  params?: Record<string, string | number>;
  title: string;
  message: string;
  category: "LOCK" | "MEDICAL" | "TRAINING" | "ACCOUNT" | "HORSE" | "SYSTEM";
  createdAt: string;
  read: boolean;
  link?: string;
  senderName?: string;
}

interface NotificationList {
  notifications: AppNotification[];
  unreadCount: number;
}

const POLL_MS = 30_000;
const NOTIFICATIONS_EVENT = "equiflow:notifications_updated";

let items: AppNotification[] = [];
let pollTimer: number | undefined;
let sessionVersion = 0;

function apply(res: NotificationList): void {
  if (!Array.isArray(res?.notifications) || !res.notifications.every((n) =>
    n && typeof n.id === "string" && typeof n.title === "string" && typeof n.message === "string" &&
    typeof n.category === "string" && typeof n.createdAt === "string" && typeof n.read === "boolean"
  )) throw new Error("Invalid notification response");
  items = res.notifications;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
}

export async function refreshNotifications(): Promise<boolean> {
  const version = sessionVersion;
  try {
    const response = await api<NotificationList>("GET", "/notifications");
    if (version !== sessionVersion) return false;
    apply(response);
    return true;
  } catch {
    // Lỗi mạng/hết phiên: giữ danh sách cũ, lần hỏi sau thử lại (401 đã được api.ts xử lý chung).
    return false;
  }
}

// Gọi khi đã đăng nhập; trả về hàm dừng (gọi khi đăng xuất / rời app).
export function startNotificationPolling(): () => void {
  const version = ++sessionVersion;
  void refreshNotifications();
  window.clearInterval(pollTimer);
  const timer = window.setInterval(() => void refreshNotifications(), POLL_MS);
  pollTimer = timer;
  return () => {
    window.clearInterval(timer);
    if (version === sessionVersion) {
      sessionVersion += 1;
      pollTimer = undefined;
      items = [];
    }
  };
}

export function getNotifications(): AppNotification[] {
  return items;
}

export function getUnreadNotificationsCount(): number {
  return items.filter((n) => !n.read).length;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const version = sessionVersion;
  items = items.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
  try {
    const response = await api<NotificationList>("POST", "/notifications/read", { ids });
    if (version === sessionVersion) apply(response);
  } catch {
    if (version === sessionVersion) void refreshNotifications();
  }
}

export function markNotificationAsRead(id: string): Promise<void> {
  return markNotificationsRead([id]);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const version = sessionVersion;
  try {
    const response = await api<NotificationList>("POST", "/notifications/read-all");
    if (version === sessionVersion) apply(response);
  } catch {
    if (version === sessionVersion) void refreshNotifications();
  }
}

export async function clearAllNotifications(): Promise<void> {
  const version = sessionVersion;
  try {
    const response = await api<NotificationList>("DELETE", "/notifications");
    if (version === sessionVersion) apply(response);
  } catch {
    if (version === sessionVersion) void refreshNotifications();
  }
}

export function subscribeNotifications(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOTIFICATIONS_EVENT, onChange);
  return () => window.removeEventListener(NOTIFICATIONS_EVENT, onChange);
}

export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const vi = isVietnamese();
    if (diffSec < 60) return vi ? "Vừa xong" : "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return vi ? `${diffMin} phút trước` : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return vi ? `${diffHour} giờ trước` : `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return vi ? "Hôm qua" : "Yesterday";
    if (diffDay < 7) return vi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
    return formatShortDate(isoString);
  } catch {
    return isVietnamese() ? "Gần đây" : "Recently";
  }
}

export function isToday(isoString: string): boolean {
  try {
    const date = new Date(isoString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- Facebook-style Notification Settings
export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultPush: boolean;
  defaultEmail: boolean;
  defaultSms: boolean;
  alwaysOnFor?: Role[];
  alwaysOnReason?: string;
}

export const NOTIFICATION_CATEGORIES: CategoryConfig[] = [
  {
    id: "medical",
    name: "Medical & Clinical Alerts",
    description: "Emergency health alarms, abnormal vital signs, injury updates, and medication administration reminders.",
    icon: "stethoscope",
    defaultPush: true,
    defaultEmail: true,
    defaultSms: true,
    alwaysOnFor: ["VETERINARIAN"],
    alwaysOnReason: "Veterinarians must receive real-time medical updates.",
  },
  {
    id: "locks",
    name: "Training Locks & Resumptions",
    description: "Veterinary medical holds placed on horses, review date extension notices, and fit-for-training release orders.",
    icon: "lock",
    defaultPush: true,
    defaultEmail: true,
    defaultSms: false,
    alwaysOnFor: ["VETERINARIAN", "HEAD_TRAINER"],
    alwaysOnReason: "Core safety protocol. Cannot be muted by clinical and training leaders.",
  },
  {
    id: "training",
    name: "Training Plans & Workouts",
    description: "Daily training schedule publications, workout session metrics, heart rate recovery warnings, and track sensor alerts.",
    icon: "activity",
    defaultPush: true,
    defaultEmail: false,
    defaultSms: false,
    alwaysOnFor: ["HEAD_TRAINER"],
    alwaysOnReason: "Head Trainers require ongoing workout updates.",
  },
  {
    id: "barn",
    name: "Barn & Stable Operations",
    description: "Stall reassignments, quarantine zone updates, barn maintenance notices, and daily groom observations.",
    icon: "home",
    defaultPush: true,
    defaultEmail: false,
    defaultSms: false,
  },
  {
    id: "accounts",
    name: "Account & Access Requests",
    description: "New membership applications, access permission requests for restricted screens, and staff onboarding alerts.",
    icon: "users",
    defaultPush: true,
    defaultEmail: true,
    defaultSms: false,
    alwaysOnFor: ["CLUB_MANAGER"],
    alwaysOnReason: "Club Managers are responsible for membership intake.",
  },
  {
    id: "compliance",
    name: "Audits & Compliance Reports",
    description: "Quarterly equine welfare audits, pharmaceutical inventory reconciliation, and facility inspection reports.",
    icon: "clipboard",
    defaultPush: true,
    defaultEmail: true,
    defaultSms: false,
    alwaysOnFor: ["CLUB_MANAGER"],
    alwaysOnReason: "Club Managers oversee compliance auditing.",
  },
];

export interface ChannelSettings {
  desktopPush: boolean;
  badgeCounter: boolean;
  sound: boolean;
  emailEnabled: boolean;
  emailFrequency: "INSTANT" | "DAILY_DIGEST" | "IMPORTANT_ONLY";
  smsEnabled: boolean;
  smsEmergencyOnly: boolean;
}

export interface UserNotificationSettings {
  categories: Record<string, { enabled: boolean; push: boolean; email: boolean; sms: boolean }>;
  channels: ChannelSettings;
}

const SETTINGS_STORAGE_KEY = "equiflow.notification_settings.v1";
const SETTINGS_EVENT = "equiflow:notification_settings_updated";

export function getDefaultNotificationSettings(userRole?: Role): UserNotificationSettings {
  const categories: UserNotificationSettings["categories"] = {};

  NOTIFICATION_CATEGORIES.forEach((cat) => {
    const isAlwaysOn = userRole && cat.alwaysOnFor?.includes(userRole);
    categories[cat.id] = {
      enabled: isAlwaysOn ? true : true,
      push: cat.defaultPush,
      email: isAlwaysOn ? true : cat.defaultEmail,
      sms: cat.defaultSms,
    };
  });

  return {
    categories,
    channels: {
      desktopPush: true,
      badgeCounter: true,
      sound: true,
      emailEnabled: true,
      emailFrequency: "INSTANT",
      smsEnabled: false,
      smsEmergencyOnly: true,
    },
  };
}

export function getStoredNotificationSettings(userRole?: Role): UserNotificationSettings {
  const defaults = getDefaultNotificationSettings(userRole);
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UserNotificationSettings>;
    return {
      categories: { ...defaults.categories, ...(parsed.categories || {}) },
      channels: { ...defaults.channels, ...(parsed.channels || {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveStoredNotificationSettings(settings: UserNotificationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  } catch {
    // ignore
  }
}

export function subscribeNotificationSettings(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(SETTINGS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export interface LocalizedNotification {
  title: string;
  message: string;
  categoryLabel: string;
  senderName?: string;
}

export function localizeNotification(n: AppNotification, isVi: boolean): LocalizedNotification {
  const CATEGORY_MAP_VI: Record<string, string> = {
    LOCK: "Khóa huấn luyện",
    MEDICAL: "Hồ sơ y tế",
    TRAINING: "Huấn luyện & Buổi tập",
    ACCOUNT: "Tài khoản & vai trò",
    HORSE: "Hồ sơ ngựa",
    SYSTEM: "Hệ thống",
  };

  const CATEGORY_MAP_EN: Record<string, string> = {
    LOCK: "Training Lock",
    MEDICAL: "Health & Medical",
    TRAINING: "Training & Workouts",
    ACCOUNT: "Accounts & Roles",
    HORSE: "Horse Profiles",
    SYSTEM: "System Notification",
  };

  const categoryLabel = isVi
    ? CATEGORY_MAP_VI[n.category] || "Thông báo"
    : CATEGORY_MAP_EN[n.category] || "Notification";

  if (!isVi) {
    return {
      title: localizeServerText(n.title),
      message: localizeServerText(n.message),
      categoryLabel,
      senderName: n.senderName,
    };
  }

  // 1. Dịch tên người gửi (Sender Name)
  let senderName = n.senderName;
  if (senderName) {
    if (/Membership Intake/i.test(senderName)) {
      senderName = "Bộ phận Tiếp nhận Thành viên";
    } else if (/Barn Operations/i.test(senderName)) {
      senderName = "Ban Vận hành Chuồng trại";
    } else if (/Track Sensor Station/i.test(senderName)) {
      senderName = "Trạm Cảm biến Đường đua";
    } else if (/EquiFlow Veterinary Station/i.test(senderName)) {
      senderName = "Trạm Thú y TMEC";
    } else if (/Dr\.\s*L[êe]\s*Minh\s*Ch[âa]u\s*\(Lead\s*Vet\)/i.test(senderName)) {
      senderName = "Dr. Lê Minh Châu (BSTY Trưởng)";
    } else if (/Phạm\s*Thị\s*Bình\s*\(Equine\s*Groom\)/i.test(senderName)) {
      senderName = "Phạm Thị Bình (NV Chăm sóc)";
    }
  }

  // 2. Dịch tiêu đề thông báo (Title)
  let title = n.title;
  if (/New Account Registration Request/i.test(n.title)) {
    title = "Yêu cầu đăng ký tài khoản mới";
  } else if (/Permission Access Request/i.test(n.title)) {
    title = "Yêu cầu cấp quyền truy cập";
  } else if (/Monthly Facility Compliance Report/i.test(n.title)) {
    title = "Báo cáo tuân thủ cơ sở hàng tháng";
  } else if (/Active Medical Training Lock in Force/i.test(n.title)) {
    title = "Lệnh Khóa Huấn luyện Y tế đang có hiệu lực";
  } else if (/Clinical Observation Recorded/i.test(n.title)) {
    title = "Ghi nhận quan sát lâm sàng";
  } else if (/Ultrasound Re-evaluation Reminder/i.test(n.title)) {
    title = "Nhắc nhở siêu âm tái khám";
  } else if (/Medical Training Lock Alert/i.test(n.title)) {
    title = "Cảnh báo Khóa Huấn luyện Y tế";
  } else if (/Workout Session Metrics Uploaded/i.test(n.title)) {
    title = "Đã tải lên chỉ số buổi tập";
  } else if (/Horse Status Update/i.test(n.title)) {
    title = "Cập nhật trạng thái y tế ngựa";
  } else if (/New Account Pending Approval/i.test(n.title)) {
    title = "Tài khoản mới chờ phê duyệt";
  } else if (/Care Schedule Overdue/i.test(n.title)) {
    title = "Lịch chăm sóc sức khỏe quá hạn";
  } else if (/New Stall Allocation/i.test(n.title)) {
    title = "Phân bổ vị trí chuồng mới";
  } else if (/Workout Completed/i.test(n.title)) {
    title = "Hoàn thành buổi tập luyện";
  } else if (/^Training Lock Placed:\s*(.*)$/i.test(n.title)) {
    const m = n.title.match(/^Training Lock Placed:\s*(.*)$/i);
    title = `Áp đặt Lệnh Khóa Huấn luyện: ${m ? m[1] : ""}`;
  } else if (/^Lock Review Date Extended:\s*(.*)$/i.test(n.title)) {
    const m = n.title.match(/^Lock Review Date Extended:\s*(.*)$/i);
    title = `Gia hạn ngày tái khám khóa y tế: ${m ? m[1] : ""}`;
  } else if (/^Training Lock Lifted:\s*(.*)$/i.test(n.title)) {
    const m = n.title.match(/^Training Lock Lifted:\s*(.*)$/i);
    title = `Đã gỡ Lệnh Khóa Huấn luyện: ${m ? m[1] : ""}`;
  } else if (/Training Lock Placed/i.test(n.title)) {
    title = "Áp đặt lệnh khóa huấn luyện y tế";
  }

  // 3. Dịch nội dung thông báo (Message)
  let message = n.message;

  // Pattern: User (ROLE) submitted membership application (REQ-XXX)
  const memberRegMatch = n.message.match(/^(.*?)\s*\((HORSE_OWNER|HEAD_TRAINER|VETERINARIAN|GROOM|CLUB_MANAGER)\)\s*submitted membership application\s*\((.*?)\)\.?$/i);
  if (memberRegMatch) {
    const [, name, role, code] = memberRegMatch;
    const roleMap: Record<string, string> = {
      HORSE_OWNER: "Chủ ngựa",
      HEAD_TRAINER: "HLV Trưởng",
      VETERINARIAN: "Bác sĩ thú y",
      GROOM: "Nhân viên chăm sóc",
      CLUB_MANAGER: "Quản lý câu lạc bộ",
    };
    const roleVi = roleMap[role.toUpperCase()] || role;
    message = `${name} (${roleVi}) đã nộp hồ sơ xin gia nhập thành viên (Mã: ${code}).`;
  }

  // Pattern: User requested access permission to screen: Screen Name (Ref: XXX)
  const permMatch = n.message.match(/^(.*?)\s*requested access permission to screen:\s*(.*?)\s*\(Ref:\s*(.*?)\)\.?$/i);
  if (permMatch) {
    const [, name, screen, ref] = permMatch;
    const screenMap: Record<string, string> = {
      "Audit Log": "Nhật ký kiểm toán",
      "Medical Records": "Bệnh án y tế",
      "Training Plans": "Giáo án huấn luyện",
      "Weekly Calendar": "Lịch huấn luyện tuần",
      "Financial Reports": "Báo cáo tài chính",
      "Accounts": "Quản lý tài khoản",
    };
    const screenVi = screenMap[screen.trim()] || screen;
    message = `${name} đã gửi yêu cầu cấp quyền truy cập màn hình: ${screenVi} (Mã: ${ref}).`;
  }

  // Pattern: User asked for access to screen (ref XXX).
  const askedAccessMatch = n.message.match(/^(.*?)\s*asked for access to\s*(.*?)\s*\(ref\s*(.*?)\)\.?$/i);
  if (askedAccessMatch) {
    const [, name, scr, ref] = askedAccessMatch;
    const scrTrim = scr.trim();
    const scrVi = tr(scrTrim) !== scrTrim ? tr(scrTrim) : scrTrim.split(" / ").map((p) => tr(p.trim())).join(" / ");
    message = `${name} đã xin quyền truy cập ${scrVi} (mã ${ref}).`;
  }

  // Pattern: QX Equine health audit and medication stock verification report ready for sign-off.
  const auditReportMatch = n.message.match(/Q(\d+)\s*Equine health audit and medication stock verification report ready for sign-off\.?/i);
  if (auditReportMatch) {
    message = `Báo cáo kiểm toán sức khỏe đàn ngựa và đối soát kho dược phẩm Quý ${auditReportMatch[1]} đã sẵn sàng để phê duyệt.`;
  }

  // Pattern: Superficial digital flexor tendon desmitis protocol active for Northern Dancer Legacy (EQ-002).
  const tendonMatch = n.message.match(/Superficial digital flexor tendon desmitis protocol active for (.*?)\.?$/i);
  if (tendonMatch) {
    message = `Phác đồ điều trị viêm dây chằng gập ngón nông đang kích hoạt cho ${tendonMatch[1]}.`;
  }

  // Pattern: Groom reported slight warmth at left fetlock during morning stall walk for Northern Dancer Legacy.
  const groomWarmthMatch = n.message.match(/Groom reported slight warmth at left fetlock during morning stall walk for (.*?)\.?$/i);
  if (groomWarmthMatch) {
    message = `Nhân viên chăm sóc ghi nhận khớp cổ chân trái hơi ấm nhẹ khi dắt ngựa ${groomWarmthMatch[1]} buổi sáng.`;
  }

  // Pattern: 7-day post-injury ultrasound follow-up scheduled to evaluate lock release criteria.
  if (/7-day post-injury ultrasound follow-up scheduled to evaluate lock release criteria/i.test(n.message)) {
    message = "Lịch siêu âm tái khám 7 ngày sau chấn thương đã lên lịch để đánh giá tiêu chuẩn gỡ khóa y tế.";
  }

  // Pattern: Northern Dancer Legacy is medically locked by Vet. Fast-work and gallop sessions are suspended.
  const medSuspendedMatch = n.message.match(/^(.*?)\s*is medically locked by Vet\.\s*Fast-work and gallop sessions are suspended\.?$/i);
  if (medSuspendedMatch) {
    message = `Ngựa ${medSuspendedMatch[1]} đã bị bác sĩ thú y khóa y tế. Các buổi tập nước rút và phi nước đại bị tạm dừng.`;
  }

  // Pattern: Sensor metrics uploaded for Thunderbolt Swift: Avg HR 118 bpm, Recovery 6 mins.
  const sensorMatch = n.message.match(/^Sensor metrics uploaded for (.*?):\s*Avg HR (\d+) bpm,\s*Recovery (\d+) mins\.?$/i);
  if (sensorMatch) {
    message = `Đã tải lên chỉ số cảm biến của ${sensorMatch[1]}: Nhịp tim TB ${sensorMatch[2]} bpm, Hồi phục ${sensorMatch[3]} phút.`;
  }

  // Pattern: Medical protection hold (Injured) active. Review date: 2026-10-28. Clinical rationale: ...
  const lockHoldMatch = n.message.match(/^Medical protection hold \((.*?)\) active\.\s*Review date:\s*(.*?)\.\s*Clinical rationale:\s*(.*?)$/i);
  if (lockHoldMatch) {
    const [, status, reviewDate, rationale] = lockHoldMatch;
    const statusMap: Record<string, string> = {
      Injured: "Chấn thương",
      Quarantined: "Cách ly",
      "Under Observation": "Cần theo dõi",
    };
    const statusVi = statusMap[status.trim()] || status;
    message = `Lệnh bảo vệ y tế (${statusVi}) đang hiệu lực. Ngày tái khám: ${reviewDate}. Lý do lâm sàng: ${rationale}`;
  }

  // Pattern: Review date rescheduled to 2026-11-05. Clinical reason: ...
  const reschedMatch = n.message.match(/^Review date rescheduled to (.*?)\.\s*Clinical reason:\s*(.*?)$/i);
  if (reschedMatch) {
    message = `Ngày tái khám dời sang ${reschedMatch[1]}. Lý do lâm sàng: ${reschedMatch[2]}`;
  }

  // Pattern: Medical training hold released. Status restored to Fit for Training. Clinical notes: ...
  const releaseHoldMatch = n.message.match(/^Medical training hold released\.\s*Status restored to (.*?)\.\s*Clinical notes:\s*(.*?)$/i);
  if (releaseHoldMatch) {
    const [, restored, notes] = releaseHoldMatch;
    const restoredMap: Record<string, string> = {
      "Fit for Training": "Đủ điều kiện tập luyện",
      "Under Observation (Light exercise)": "Theo dõi (chỉ tập nhẹ)",
    };
    const restoredVi = restoredMap[restored.trim()] || restored;
    message = `Lệnh dừng tập y tế đã được gỡ bỏ. Trạng thái khôi phục: ${restoredVi}. Ghi chú lâm sàng: ${notes}`;
  }

  const lockMatch = n.message.match(/^(.*?) was placed on Medical Lock due to (.*?)\.?$/i);
  if (lockMatch) {
    const [, horse, reason] = lockMatch;
    message = `Ngựa ${horse} đã bị bác sĩ thú y áp đặt Lệnh Khóa Y Tế do ${reason}.`;
  }

  const regMatch = n.message.match(/^(.*?) has registered for (.*?) role and is pending approval\.?$/i);
  if (regMatch) {
    const [, name, role] = regMatch;
    const roleMap: Record<string, string> = {
      "Groom Hand": "Nhân viên chăm sóc (Groom)",
      "Head Trainer": "Huấn luyện viên trưởng",
      "Veterinarian": "Bác sĩ thú y",
      "Horse Owner": "Chủ ngựa",
      "Club Manager": "Quản lý câu lạc bộ",
    };
    const roleVi = roleMap[role.trim()] || role;
    message = `${name} đã đăng ký tài khoản vai trò ${roleVi} và đang chờ phê duyệt.`;
  }

  if (/Medical Lock (.*?) placed on (.*?)\. Heavy workouts blocked\./i.test(n.message)) {
    const m = n.message.match(/Medical Lock (.*?) placed on (.*?)\. Heavy workouts blocked\./i);
    if (m) message = `Lệnh khóa y tế ${m[1]} đã áp dụng cho ngựa ${m[2]}. Các buổi tập nặng đã tạm dừng.`;
  }

  if (/Farrier Hoof Care schedule for (.*?) is overdue by (\d+) days/i.test(n.message)) {
    const m = n.message.match(/Farrier Hoof Care schedule for (.*?) is overdue by (\d+) days/i);
    if (m) message = `Lịch đóng móng & chăm sóc móng cho ngựa ${m[1]} đã quá hạn ${m[2]} ngày.`;
  }

  if (/You have been assigned as primary groom for (.*?) at (.*?)\./i.test(n.message)) {
    const m = n.message.match(/You have been assigned as primary groom for (.*?) at (.*?)\./i);
    if (m) message = `Bạn được phân công làm người chăm sóc chính cho ngựa ${m[1]} tại chuồng ${m[2]}.`;
  }

  if (/(.*?) completed a trial workout session with score (.*?)\./i.test(n.message)) {
    const m = n.message.match(/(.*?) completed a trial workout session with score (.*?)\./i);
    if (m) message = `Ngựa ${m[1]} đã hoàn thành buổi tập với điểm số đạt được là ${m[2]}.`;
  }

  // Câu chưa có mẫu riêng ở trên: dịch theo bảng chung (giữ nguyên tên, mã).
  if (title === n.title) title = localizeServerText(n.title);
  if (message === n.message) message = localizeServerText(n.message);
  return { title, message, categoryLabel, senderName };
}


