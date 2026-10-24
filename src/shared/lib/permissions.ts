// NGUỒN SỰ THẬT DUY NHẤT về phân quyền. Sidebar, RoleGuard, trang Permissions đều đọc từ đây.
// Muốn đổi "vai trò nào được làm gì" thì chỉ sửa file này.

import { ROLES } from "@/shared/types/auth";
import type { NotifyKey, NotifyMap, PermissionKey, PermissionMap, Role } from "@/shared/types/auth";

export const ROLE_LABEL: Record<Role, string> = {
  HEAD_TRAINER: "Head Trainer",
  VETERINARIAN: "Veterinarian",
  GROOM: "Groom / Stable Hand",
  HORSE_OWNER: "Horse Owner",
  CLUB_MANAGER: "Club Manager",
};

// Tên "không gian" hiện ở breadcrumb (mục đầu tiên).
export const ROLE_WORKSPACE: Record<Role, string> = {
  HEAD_TRAINER: "Training workspace",
  VETERINARIAN: "Medical workspace",
  GROOM: "Stable workspace",
  HORSE_OWNER: "Owner workspace",
  CLUB_MANAGER: "Management workspace",
};

// ---------------------------------------------------------------- Quyền chức năng

export type PermissionGroup = "HORSE PROFILES" | "TRAINING" | "MEDICAL" | "ADMINISTRATION";
export const PERMISSION_GROUPS: PermissionGroup[] = ["HORSE PROFILES", "TRAINING", "MEDICAL", "ADMINISTRATION"];

export interface PermissionMeta {
  key: PermissionKey;
  group: PermissionGroup;
  name: string;
  note: string;
  // Quyền cốt lõi: luôn bật với mọi vai trò, không thu hồi được.
  core?: boolean;
  // Quyền thuộc về vai trò nào. Vai trò khác thấy công tắc bị khóa (disable + giải thích), không ẩn.
  ownerRoles?: Role[];
  ownerReason?: string;
  // Với các vai trò này quyền luôn bật (tránh Club Manager tự khóa mình).
  alwaysOnFor?: { roles: Role[]; reason: string };
  // Hậu quả khi thu hồi — nêu bằng số trong hộp xác nhận.
  revokeEffect: string;
}

export const PERMISSIONS: PermissionMeta[] = [
  {
    key: "viewHorses", group: "HORSE PROFILES", name: "View Horse Profiles", note: "Core permission for every role",
    core: true, revokeEffect: "",
  },
  {
    key: "editHorses", group: "HORSE PROFILES", name: "Create and edit a Horse Profile", note: "Name, breed, foaling date, stall",
    ownerRoles: ["CLUB_MANAGER"], ownerReason: "Only the Club Manager can create or edit a Horse Profile.",
    revokeEffect: "Horse Profiles stay visible but can no longer be created or edited by this account.",
  },
  {
    key: "deleteHorses", group: "HORSE PROFILES", name: "Delete or deactivate a Horse Profile", note: "Club Manager decision",
    ownerRoles: ["CLUB_MANAGER"], ownerReason: "Only the Club Manager can remove a Horse Profile.",
    revokeEffect: "This account can no longer delete or deactivate Horse Profiles.",
  },
  {
    key: "createPlan", group: "TRAINING", name: "Create and edit Training Plans", note: "Phases, distance, volume, surface",
    ownerRoles: ["HEAD_TRAINER"], ownerReason: "Only a Head Trainer plans training.",
    revokeEffect: "Two active Training Plans stay in place but can no longer be edited by this account.",
  },
  {
    key: "assignSchedule", group: "TRAINING", name: "Assign the daily schedule", note: "Sessions, horses and the care team",
    ownerRoles: ["HEAD_TRAINER"], ownerReason: "Only a Head Trainer schedules workouts.",
    revokeEffect: "Four sessions already scheduled this week stay in place; new sessions can no longer be assigned.",
  },
  {
    key: "recordMetrics", group: "TRAINING", name: "Record session metrics", note: "Heart rate, speed, actual distance",
    ownerRoles: ["HEAD_TRAINER"], ownerReason: "Only a Head Trainer records workout results.",
    revokeEffect: "Metrics already recorded stay in place; new session metrics can no longer be entered.",
  },
  {
    key: "ackAlerts", group: "TRAINING", name: "Acknowledge Threshold Alerts", note: "Required to clear a red alert",
    ownerRoles: ["VETERINARIAN"], ownerReason: "Only a Veterinarian reviews abnormal-sign alerts.",
    revokeEffect: "Open Threshold Alerts stay red until another account acknowledges them.",
  },
  {
    key: "viewMedical", group: "MEDICAL", name: "View medical records", note: "Read-only for a Head Trainer",
    revokeEffect: "Medical records disappear from the screens of this account.",
  },
  {
    key: "placeLock", group: "MEDICAL", name: "Place a Training Lock", note: "Veterinarian decision",
    ownerRoles: ["VETERINARIAN"], ownerReason: "Only a Veterinarian can place a Training Lock.",
    revokeEffect: "Training Locks already in force stay in place; this account can no longer place a new one.",
  },
  {
    key: "liftLock", group: "MEDICAL", name: "Lift a Training Lock", note: "Veterinarian decision",
    ownerRoles: ["VETERINARIAN"], ownerReason: "Only a Veterinarian can lift a Training Lock.",
    revokeEffect: "Locks in force can then be lifted only by another Veterinarian.",
  },
  {
    key: "manageAccounts", group: "ADMINISTRATION", name: "Manage accounts and permissions", note: "Club Manager decision",
    ownerRoles: ["CLUB_MANAGER"], ownerReason: "Only the Club Manager can manage accounts.",
    alwaysOnFor: { roles: ["CLUB_MANAGER"], reason: "The Club Manager always keeps account management." },
    revokeEffect: "This account can no longer approve, lock or edit accounts and permissions.",
  },
  {
    key: "viewAudit", group: "ADMINISTRATION", name: "View the Audit Log", note: "Read-only history of every change",
    revokeEffect: "The Audit Log is no longer readable by this account.",
  },
];

export function permissionMeta(key: PermissionKey): PermissionMeta {
  return PERMISSIONS.find((p) => p.key === key) as PermissionMeta;
}

export interface PermissionLock {
  locked: boolean;
  value?: boolean; // giá trị bị ép khi locked
  reason?: string;
}

// Công tắc của một quyền, xét theo vai trò của tài khoản đang xem.
export function permissionLock(role: Role, meta: PermissionMeta): PermissionLock {
  if (meta.core) return { locked: true, value: true, reason: "Core permission for every role; it cannot be revoked." };
  if (meta.alwaysOnFor?.roles.includes(role)) return { locked: true, value: true, reason: meta.alwaysOnFor.reason };
  if (meta.ownerRoles && !meta.ownerRoles.includes(role)) return { locked: true, value: false, reason: meta.ownerReason };
  return { locked: false };
}

const DEFAULT_ON: Record<Role, PermissionKey[]> = {
  HEAD_TRAINER: ["viewHorses", "createPlan", "assignSchedule", "recordMetrics", "viewMedical"],
  VETERINARIAN: ["viewHorses", "viewMedical", "placeLock", "liftLock", "ackAlerts"],
  // Cấp quyền xem hồ sơ y tế (viewMedical) cho GROOM và HORSE_OWNER (phạm vi theo ngựa được giao chăm sóc hoặc sở hữu)
  GROOM: ["viewHorses", "viewMedical"],
  HORSE_OWNER: ["viewHorses", "viewMedical"],
  CLUB_MANAGER: ["viewHorses", "editHorses", "deleteHorses", "viewMedical", "manageAccounts", "viewAudit"],
};

export function defaultPermissions(role: Role): PermissionMap {
  const on = new Set(DEFAULT_ON[role]);
  return Object.fromEntries(PERMISSIONS.map((p) => [p.key, on.has(p.key)])) as PermissionMap;
}

// Ép các quyền bị khóa về đúng giá trị (dùng khi backend/mock nhận dữ liệu từ client).
export function normalizePermissions(role: Role, map: PermissionMap): PermissionMap {
  const out = { ...map };
  for (const meta of PERMISSIONS) {
    const lock = permissionLock(role, meta);
    if (lock.locked) out[meta.key] = !!lock.value;
  }
  return out;
}

// ---------------------------------------------------------------- Thông báo

export interface NotifyMeta {
  key: NotifyKey;
  name: string;
  note: string;
}

export const NOTIFY_META: NotifyMeta[] = [
  { key: "thresholdAlert", name: "Threshold Alerts", note: "Heart rate or speed over the plan limit" },
  { key: "lockLifted", name: "Training Lock lifted", note: "A Veterinarian releases a horse back to work" },
  { key: "dailyDigest", name: "Daily summary at 18:00", note: "Completed sessions and tomorrow’s schedule" },
  { key: "raceResults", name: "Race results", note: "A result is recorded for a club horse" },
];

export function defaultNotify(role: Role): NotifyMap {
  return { thresholdAlert: role === "VETERINARIAN", lockLifted: true, dailyDigest: false, raceResults: true };
}

// Threshold Alert (Q-0.04): bắt buộc bật với Bác sĩ thú y, các vai trò khác không nhận.
export function notifyLock(role: Role, key: NotifyKey): PermissionLock {
  if (key !== "thresholdAlert") return { locked: false };
  return role === "VETERINARIAN"
    ? { locked: true, value: true, reason: "Mandatory for a Veterinarian; it cannot be switched off." }
    : { locked: true, value: false, reason: "Threshold Alerts go to the Veterinarian only." };
}

// ---------------------------------------------------------------- Điều hướng (Sidebar)

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  i18nKey?: string;
  requires?: PermissionKey; // thiếu quyền này => mục không hiện trên sidebar và route trả 403
  alert?: boolean; // chấm đỏ: có việc đang chờ
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

function item(id: string, label: string, icon: string, extra: { i18nKey?: string; requires?: PermissionKey; alert?: boolean } = {}): NavItem {
  const href = id === "dashboard" ? "/dashboard" : `/${id}`;
  return { id, label, icon, href, ...extra };
}

export const ROLE_NAV: Record<Role, NavGroup[]> = {
  HEAD_TRAINER: [
    {
      label: "WORKSPACE",
      items: [
        item("dashboard", "Dashboard", "home"),
        item("horses", "Horses", "horse", { requires: "viewHorses" }),
        item("stalls", "Stall Map", "grid"),
        item("stable/shifts", "Shift Roster", "calendar", { i18nKey: "shiftRoster" }),
        item("rations", "Meal Rations", "wheat", { i18nKey: "rations" }),
        item("catalog", "Supplies Catalog", "package"),
      ],
    },
    {
      label: "TRAINING",
      items: [
        item("training", "Training Overview", "chart", { i18nKey: "trainingOverview" }),
        item("plans", "Training Plans", "clipboard", { i18nKey: "trainingPlans", requires: "createPlan" }),
        item("calendar", "Weekly Calendar", "calendar", { requires: "assignSchedule" }),
        item("trials", "Trial Runs", "play", { requires: "assignSchedule" }),
        item("metrics", "Session Metrics", "pulse", { requires: "recordMetrics" }),
      ],
    },
    {
      label: "MONITORING",
      items: [item("monitor", "Session Telemetry", "activity"), item("alerts", "Threshold Alerts", "alert", { alert: true })],
    },
    { label: "RACING", items: [item("races", "Race Entries", "trophy")] },
    {
      label: "MEDICAL",
      items: [
        item("herd", "Herd Health", "stethoscope", { requires: "viewMedical" }),
        item("records", "Medical Records", "file", { requires: "viewMedical" }),
        item("locks", "Training Locks", "lock", { requires: "viewMedical" }),
        item("vaccine", "Preventive Care", "syringe", { requires: "viewMedical" }),
      ],
    },
    {
      label: "SUPPLIES",
      items: [
        item("supplies/inventory", "Zone Inventory", "layers", { i18nKey: "zoneInventory" }),
        item("supplies/requests", "Restock Requests", "clipboard", { i18nKey: "restockRequests" }),
        item("catalog", "Supplies Catalog", "package"),
      ],
    },
    { label: "REPORTS", items: [item("progress", "Training Progress", "chart")] },
    { label: "OTHER", items: [item("profile", "My Profile", "user")] },
  ],
  VETERINARIAN: [
    {
      label: "WORKSPACE",
      items: [
        item("dashboard", "Dashboard", "home"),
        item("horses", "Horses", "horse", { requires: "viewHorses" }),
        item("stalls", "Stall Map", "grid"),
        item("stable/shifts", "Shift Roster", "calendar", { i18nKey: "shiftRoster" }),
        item("rations", "Meal Rations", "wheat", { i18nKey: "rations" }),
        item("supplies/inventory", "Zone Inventory", "layers", { i18nKey: "zoneInventory" }),
        item("supplies/requests", "Restock Requests", "clipboard", { i18nKey: "restockRequests" }),
        item("catalog", "Supplies Catalog", "package"),
      ],
    },
    {
      label: "MEDICAL",
      items: [
        item("herd", "Herd Health", "stethoscope", { requires: "viewMedical" }),
        item("records", "Medical Records", "file", { requires: "viewMedical" }),
        // Danh sách khóa huấn luyện (Training Locks) yêu cầu quyền viewMedical
        item("locks", "Training Locks", "lock", { requires: "viewMedical" }),
        item("alerts", "Biomechanical Alerts", "alert", { i18nKey: "biomechanicalAlerts", alert: true }),
        item("vaccine", "Preventive Care", "syringe", { i18nKey: "preventiveCare", requires: "viewMedical" }),
        item("incidents", "Incident Reports", "camera", { requires: "viewMedical" }),
      ],
    },
    { label: "REPORTS", items: [item("health-report", "Health Reports", "chart", { requires: "viewMedical" })] },
    { label: "OTHER", items: [item("profile", "My Profile", "user")] },
  ],
  GROOM: [
    { label: "WORKSPACE", items: [item("dashboard", "Dashboard", "home"), item("horses", "Horses", "horse", { requires: "viewHorses" })] },
    {
      label: "DAILY",
      items: [
        item("tasks", "Today's Tasks", "check", { alert: true }),
        item("stable/shifts", "Shift Roster", "calendar", { i18nKey: "shiftRoster" }),
        item("my-training", "My Training", "calendar"),
        item("stalls", "Stall Map", "grid"),
        item("rations", "Meal Rations", "wheat", { i18nKey: "rations" }),
        item("incidents", "Incident Reports", "camera"),
      ],
    },
    {
      label: "SUPPLIES",
      items: [
        item("supplies/inventory", "Zone Inventory", "layers", { i18nKey: "zoneInventory" }),
        item("supplies/requests", "Restock Requests", "clipboard", { i18nKey: "restockRequests" }),
        item("catalog", "Supplies Catalog", "package"),
      ],
    },
    { label: "OTHER", items: [item("profile", "My Profile", "user")] },
  ],
  HORSE_OWNER: [
    { label: "WORKSPACE", items: [item("dashboard", "Dashboard", "home"), item("my-horses", "My Horses", "horse", { requires: "viewHorses" })] },
    { label: "MONITORING", items: [item("progress", "Training Progress", "activity"), item("health", "Health Status", "stethoscope")] },
    {
      label: "REPORTS",
      items: [
        item("financial-reports", "Financial Reports", "dollar", { i18nKey: "financialReports" }),
        item("costs", "Cost Report", "dollar", { i18nKey: "costReport" }),
        item("race-record", "Race Record", "trophy"),
      ],
    },
    { label: "RACING", items: [item("races", "Race Entries", "trophy")] },
    { label: "OTHER", items: [item("profile", "My Profile", "user")] },
  ],
  CLUB_MANAGER: [
    { label: "WORKSPACE", items: [item("dashboard", "Dashboard", "home")] },
    {
      label: "ADMINISTRATION",
      items: [
        // Chấm đỏ của Accounts tính lúc chạy (yêu cầu đăng ký mới), xem useSidebarInfo.
        item("accounts", "Accounts", "users", { requires: "manageAccounts" }),
        item("staff", "Staff Directory", "user", { requires: "manageAccounts" }),
        item("catalogs/shifts", "Shift Catalog", "calendar", { i18nKey: "shiftCatalog", requires: "manageAccounts" }),
      ],
    },
    {
      label: "MASTER DATA",
      items: [
        item("horses", "Horses", "horse", { requires: "viewHorses" }),
        item("stalls", "Stall Map", "grid"),
        item("stable/shifts", "Shift Roster", "calendar", { i18nKey: "shiftRoster" }),
      ],
    },
    {
      label: "SUPPLIES",
      items: [
        item("catalog", "Supplies Catalog", "package", { requires: "manageAccounts" }),
        item("supplies/inventory", "Zone Inventory", "layers", { i18nKey: "zoneInventory" }),
        item("supplies/requests", "Restock Requests", "clipboard", { i18nKey: "restockRequests" }),
      ],
    },
    {
      label: "TRAINING",
      items: [
        item("training", "Training Overview", "chart", { i18nKey: "trainingOverview" }),
        item("plans", "Training Plans", "clipboard", { i18nKey: "trainingPlans" }),
        item("calendar", "Weekly Calendar", "calendar"),
      ],
    },
    {
      label: "MEDICAL",
      items: [
        item("herd", "Herd Health", "stethoscope", { requires: "viewMedical" }),
        item("records", "Medical Records", "file", { requires: "viewMedical" }),
        item("locks", "Training Locks", "lock", { requires: "viewMedical" }),
        item("vaccine", "Preventive Care", "syringe", { requires: "viewMedical" }),
        item("incidents", "Incident Reports", "camera", { requires: "viewMedical" }),
      ],
    },
    {
      label: "REPORTS",
      items: [
        item("performance", "Performance", "chart"),
        item("financial-reports", "Financial Reports", "dollar", { i18nKey: "financialReports" }),
        item("costs", "Operating Costs", "dollar", { i18nKey: "operatingCosts" }),
        item("audit", "Audit Log", "history", { requires: "viewAudit" }),
      ],
    },
    { label: "RACING", items: [item("races", "Race Entries", "trophy")] },
    { label: "OTHER", items: [item("profile", "My Profile", "user")] },
  ],
};

// Mục đã có trong thiết kế nhưng chưa có màn hình (route rơi vào trang "Coming soon").
// Ẩn khỏi sidebar để không có mục chết; đường dẫn vẫn giữ nguyên trong router.
const NOT_BUILT = new Set(["/health-report", "/costs", "/race-record", "/health", "/performance", "/monitor"]);

// Sidebar chỉ hiện mục mà tài khoản được cấp quyền (xây từ danh sách quyền, không chỉ từ tên vai trò).
export function navFor(role: Role, permissions: PermissionMap): NavGroup[] {
  const groups = role !== "CLUB_MANAGER" && permissions.viewAudit
    ? [...ROLE_NAV[role], { label: "AUDIT", items: [item("audit", "Audit Log", "history", { requires: "viewAudit" })] }]
    : ROLE_NAV[role];
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => !NOT_BUILT.has(it.href) && (!it.requires || permissions[it.requires])) }))
    .filter((g) => g.items.length > 0);
}

export function isNavItemActive(navItem: NavItem, pathname: string): boolean {
  if (navItem.href === "/training") {
    return pathname === "/training";
  }
  if (navItem.href === "/plans") {
    return (
      pathname === "/plans" ||
      pathname.startsWith("/plans/") ||
      pathname === "/training/plans" ||
      pathname.startsWith("/training/plans/")
    );
  }
  if (navItem.href === "/calendar") {
    return (
      pathname === "/calendar" ||
      pathname.startsWith("/calendar/") ||
      pathname === "/training/calendar" ||
      pathname.startsWith("/training/calendar/") ||
      pathname === "/training/schedule" ||
      pathname.startsWith("/training/schedule/")
    );
  }
  if (navItem.href === "/trials") {
    return (
      pathname === "/trials" ||
      pathname.startsWith("/trials/") ||
      pathname === "/training/trials" ||
      pathname.startsWith("/training/trials/")
    );
  }
  if (navItem.href === "/metrics") {
    return (
      pathname === "/metrics" ||
      pathname.startsWith("/metrics/") ||
      pathname === "/training/metrics" ||
      pathname.startsWith("/training/metrics/")
    );
  }
  if (navItem.href === "/stalls") {
    return (
      pathname === "/stalls" ||
      pathname.startsWith("/stalls/") ||
      pathname === "/stables/map" ||
      pathname.startsWith("/stables/map/")
    );
  }
  if (navItem.href === "/my-horses") {
    return (
      pathname === "/my-horses" ||
      pathname.startsWith("/my-horses/") ||
      pathname === "/horses" ||
      pathname.startsWith("/horses/")
    );
  }
  if (navItem.href === "/horses") {
    return (
      pathname === "/horses" ||
      pathname.startsWith("/horses/") ||
      pathname === "/my-horses" ||
      pathname.startsWith("/my-horses/")
    );
  }
  return pathname === navItem.href || pathname.startsWith(navItem.href + "/");
}

// ---------------------------------------------------------------- Chặn route (RoleGuard đọc hàm này)

export interface ScreenAccess {
  allowed: boolean;
  group?: string; // "ADMINISTRATION"
  label?: string; // "Accounts"
  ownerRoles: Role[]; // vai trò sở hữu màn hình này
  inOwnRole: boolean; // màn hình có trong sidebar của vai trò hiện tại (nhưng chưa được cấp quyền)
}

const OPEN_PREFIXES = [
  "/dashboard",
  "/profile",
  "/notifications",
  "/forbidden",
  "/session-expired",
  "/alerts",
  "/training/alerts",
  "/injuries",
  "/tasks",
  "/incidents",
  "/supplies",
  "/inventory",
  "/restock-requests",
];

function findByHref(groups: NavGroup[], href: string): { group: string; item: NavItem } | undefined {
  for (const g of groups) {
    const found = g.items.find((it) => it.href === href);
    if (found) return { group: g.label, item: found };
  }
  return undefined;
}

export function screenAccess(role: Role, permissions: PermissionMap, pathname: string): ScreenAccess {
  const open: ScreenAccess = { allowed: true, ownerRoles: [], inOwnRole: false };
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return open;

  if (pathname === "/audit" || pathname.startsWith("/audit/")) {
    return { allowed: !!permissions.viewAudit, group: "REPORTS", label: "Audit Log", ownerRoles: ["CLUB_MANAGER"], inOwnRole: role === "CLUB_MANAGER" };
  }
  if (pathname === "/accounts" || pathname.startsWith("/accounts/")) {
    return {
      allowed: !!permissions.manageAccounts,
      group: "ADMINISTRATION",
      label: "Accounts",
      ownerRoles: ["CLUB_MANAGER"],
      inOwnRole: role === "CLUB_MANAGER",
    };
  }

  // Flow 2: Tổng quan chỉ CM, HT, VET; "Lịch tập của tôi" chỉ GROOM. Các trang /training/* khác mở cho
  // mọi vai trò vì BE đã giới hạn dữ liệu theo vai trò (OWNER xem giáo án ngựa sở hữu, GROOM xem kết quả buổi được giao).
  if (pathname === "/training") {
    const ok = role === "CLUB_MANAGER" || role === "HEAD_TRAINER" || role === "VETERINARIAN";
    return { allowed: ok, group: "TRAINING", label: "Training Overview", ownerRoles: ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN"], inOwnRole: ok };
  }
  if (pathname === "/my-training" || pathname === "/my/training") {
    return { allowed: role === "GROOM", group: "WORKSPACE", label: "My Training", ownerRoles: ["GROOM"], inOwnRole: role === "GROOM" };
  }
  if (pathname.startsWith("/training/")) {
    const seg2 = pathname.split("/")[2];
    if (seg2 === "plans" && pathname.includes("/new")) {
      const allowed = role === "HEAD_TRAINER" || (role === "CLUB_MANAGER" && !!permissions.createPlan);
      return { allowed, group: "TRAINING", label: "New Plan", ownerRoles: ["HEAD_TRAINER", "CLUB_MANAGER"], inOwnRole: allowed };
    }
    if (seg2 === "monitor") {
      return { allowed: role === "HEAD_TRAINER", group: "TRAINING", label: "Live Monitor", ownerRoles: ["HEAD_TRAINER"], inOwnRole: role === "HEAD_TRAINER" };
    }
    return open;
  }

  // SC-1.05 Hồ sơ ngựa đã xóa: chỉ CM (BE cũng chặn bằng @Roles).
  if (pathname === "/horses/deleted") {
    return { allowed: role === "CLUB_MANAGER", group: "WORKSPACE", label: "Deleted horses", ownerRoles: ["CLUB_MANAGER"], inOwnRole: role === "CLUB_MANAGER" };
  }

  // Tạo hoặc chỉnh sửa hồ sơ gốc ngựa: chỉ duy nhất Club Manager có quyền editHorses
  if (pathname === "/horses/new" || (pathname.startsWith("/horses/") && pathname.endsWith("/edit"))) {
    const allowed = role === "CLUB_MANAGER" && !!permissions.editHorses;
    return { allowed, group: "MASTER DATA", label: "Horse Profile", ownerRoles: ["CLUB_MANAGER"], inOwnRole: role === "CLUB_MANAGER" };
  }

  // Quyền truy cập hồ sơ bệnh án qua chiến mã (FR-3.01 / Flow 1 / Flow 3):
  // Cho phép Vet, Club Manager, Head Trainer, Horse Owner (ngựa của họ) truy cập hồ sơ bệnh án và chấn thương.
  if (
    pathname.startsWith("/medical/horses/") ||
    pathname.startsWith("/records/horse/") ||
    pathname.startsWith("/medical/records/") ||
    pathname.startsWith("/medical/injuries") ||
    pathname.includes("/injuries")
  ) {
    const canAccess =
      role === "VETERINARIAN" ||
      role === "CLUB_MANAGER" ||
      role === "HEAD_TRAINER" ||
      role === "HORSE_OWNER" ||
      !!permissions.viewMedical;
    return {
      allowed: canAccess,
      group: "MEDICAL",
      label: "Medical Records",
      ownerRoles: ["VETERINARIAN", "CLUB_MANAGER", "HEAD_TRAINER"],
      inOwnRole: canAccess,
    };
  }

  let href = "/" + (pathname.split("/")[1] ?? "");
  
  if (href === "/horses" && role === "HORSE_OWNER") {
    href = "/my-horses";
  }
  
  if (href === "/medical") {
    const seg2 = pathname.split("/")[2];
    if (seg2 === "locks") href = "/locks";
    else if (seg2 === "records") href = "/records";
    else if (seg2 === "horses" || seg2 === "herd") href = "/herd";
    else if (seg2 === "preventive") href = "/vaccine";
  } else if (href === "/catalogs") {
    const seg2 = pathname.split("/")[2];
    if (seg2 === "preventive-types") href = "/vaccine";
    else if (seg2 === "stalls") href = "/stalls";
    else if (seg2 === "shifts") href = "/catalogs/shifts";
    else if (seg2 === "supplies") href = "/catalog";
  } else if (href === "/stables") {
    href = "/stalls";
  } else if (href === "/stable") {
    const seg2 = pathname.split("/")[2];
    if (seg2 === "shifts") href = "/stable/shifts";
  } else if (href === "/shifts") {
    href = "/stable/shifts";
  } else if (href === "/records" && pathname.startsWith("/records/horse")) {
    href = "/records"; // keep it as records
  } else if (href === "/racing") {
    href = "/races";
  } else if (href === "/invoices" || pathname.startsWith("/owner/financial-reports")) {
    href = "/financial-reports";
  }

  const own = findByHref(ROLE_NAV[role], href);
  if (own) {
    const need = own.item.requires;
    return { allowed: !need || !!permissions[need], group: own.group, label: own.item.label, ownerRoles: [role], inOwnRole: true };
  }

  const owners = ROLES.filter((r) => r !== role && findByHref(ROLE_NAV[r], href));
  if (owners.length > 0) {
    const first = findByHref(ROLE_NAV[owners[0]], href)!;
    return { allowed: false, group: first.group, label: first.item.label, ownerRoles: owners, inOwnRole: false };
  }

  return open; // đường dẫn không tồn tại: để trang catch-all báo "not found"
}
