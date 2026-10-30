// Giả lập backend REST. lib/api.ts gọi handleMock() khi NEXT_PUBLIC_USE_MOCK=true.
// Mỗi route trả dữ liệu hoặc ném ApiError(status, code, ...) giống backend thật sẽ làm,
// nhờ vậy khi đổi sang backend thật, giao diện không phải sửa.
//
// Mã OTP demo luôn là 123456 (hiệu lực 10 phút, gửi lại sau 60 giây, sai tối đa 5 lần).

import { ApiError } from "@/shared/lib/api";
import type { HttpMethod } from "@/shared/lib/api";
import { EMAIL_RE } from "@/shared/lib/email";
import { passwordError } from "@/shared/lib/password";
import { defaultNotify, defaultPermissions, normalizePermissions, notifyLock, PERMISSIONS, ROLE_LABEL } from "@/shared/lib/permissions";
import { clearSession, readSession, writeSession } from "@/shared/lib/session";
import { audit, getDb, saveDb, toPublic } from "@/shared/mock/db";
import type { Db, OtpPurpose, OtpRecord } from "@/shared/mock/db";
import type { Account, NotifyKey, PermissionKey, PermissionMap, Role } from "@/shared/types/auth";
import { buildMockProfile, getMockMedicalStore, saveMockMedicalStore } from "@/shared/mock/medicalData";
import {
  getStoredHorses,
  addStoredHorse,
  saveStoredHorses,
  horseStatusOf,
  getDeletedHorses,
  saveDeletedHorses,
  getStoredLocks,
  placeHorseTrainingLock,
  liftHorseTrainingLock,
  extendHorseTrainingLock,
  getInjuriesForHorse,
  saveInjuriesForHorse,
  getStoredPreventiveCatalogs,
  saveStoredPreventiveCatalogs,
  getStoredPreventiveSchedules,
  saveStoredPreventiveSchedules,
  getStoredHorseCatalog,
  saveStoredHorseCatalog,
} from "@/shared/mock/horsesData";
import type { FollowUpItem, MedicalRecord, PrescriptionItem, TreatmentPhase } from "@/features/health/types";
import {
  getStoredPlans,
  saveStoredPlans,
  getStoredWorkouts,
  saveStoredWorkouts,
  type MockPlan,
  type MockWorkout,
} from "@/shared/mock/trainingData";
import {
  getStoredSupplies,
  saveStoredSupplies,
  getStoredShifts,
  saveStoredShifts,
  getStoredRosters,
  saveStoredRosters,
  getStoredNutritionPlans,
  saveStoredNutritionPlans,
  getStoredDailyTasks,
  saveStoredDailyTasks,
  getStoredIncidents,
  saveStoredIncidents,
  getStoredStocks,
  saveStoredStocks,
  getStoredRestockRequests,
  saveStoredRestockRequests,
} from "@/shared/mock/stableData";
import type { SupplyCatalogItem, ShiftCatalogItem } from "@/features/master-data/types/supplies";
import type { ShiftRosterItem } from "@/features/stable/types/shiftRoster";
import { mockNotificationsFor, updateMockNotifications } from "./notificationsData";
import { getStoredTournaments, saveStoredTournaments } from "@/shared/mock/racingData";
import type { Tournament, TournamentRegistration } from "@/features/racing/types";
import { getStoredInvoices, saveStoredInvoices } from "@/shared/mock/financialData";
import type { FinancialInvoice } from "@/features/financial/types";

function getInitialTournaments(): Tournament[] {
  const base: Tournament[] = JSON.parse(JSON.stringify(getStoredTournaments()));
  return base.map((t) => {
    if (t.id === "tourney-01") {
      return {
        ...t,
        status: "OPEN_REGISTRATION" as const,
        registrations: (t.registrations || []).map((r) => ({
          ...r,
          status: "REGISTERED" as const,
        })),
      };
    }
    if (t.id === "tourney-02") return { ...t, status: "COMPLETED" as const };
    if (t.id === "tourney-03") return { ...t, status: "UPCOMING" as const };
    if (t.id === "tourney-04") return { ...t, status: "CANCELLED" as const };
    return { ...t };
  });
}

function getTournamentsWithFixtures(): Tournament[] {
  let list: Tournament[];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("equiflow_mock_tournaments") : null;
    if (raw) {
      list = JSON.parse(raw);
    } else {
      list = getInitialTournaments();
    }
  } catch {
    list = getInitialTournaments();
  }
  if (!list.some((t) => t.id === "tourney-closed-01")) {
    const closedFixture: Tournament = {
      id: "tourney-closed-01",
      name: "Mekong Autumn Stakes 2026",
      raceDate: "2026-10-20T08:00:00Z",
      location: "Can Tho Equestrian Center",
      distanceMeters: 1400,
      trackType: "TURF",
      prizePool: 90000000,
      registrationDeadline: "2026-10-15T23:59:59Z",
      status: "CLOSED_REGISTRATION",
      createdAt: "2026-09-01T09:00:00Z",
      updatedAt: "2026-10-16T10:00:00Z",
      registeredCount: 2,
      registrations: [
        {
          id: "reg-closed-01",
          tournamentId: "tourney-closed-01",
          horseId: "h-01",
          horse: {
            id: "h-01",
            name: "Thunder Bolt",
            horseCode: "HRS-001",
            breed: "Thoroughbred",
            status: "ACTIVE",
            isMedicalLocked: false,
            owner: { id: "u-owner-01", fullName: "Ha Ly", email: "ha.ly@gmail.com" },
          },
          registeredByTrainerId: "u-trainer-01",
          registeredByTrainer: { id: "u-trainer-01", fullName: "Nam Tran", email: "nam.tran@gmail.com" },
          status: "REGISTERED",
          registrationDate: "2026-10-10T10:00:00Z",
          notes: "Sprint pacing",
        },
        {
          id: "reg-closed-02",
          tournamentId: "tourney-closed-01",
          horseId: "h-02",
          horse: {
            id: "h-02",
            name: "Golden Pegasus",
            horseCode: "HRS-002",
            breed: "Arabian",
            status: "ACTIVE",
            isMedicalLocked: false,
            owner: { id: "u-owner-02", fullName: "Minh Vu", email: "minh.vu@gmail.com" },
          },
          registeredByTrainerId: "u-trainer-01",
          registeredByTrainer: { id: "u-trainer-01", fullName: "Nam Tran", email: "nam.tran@gmail.com" },
          status: "REGISTERED",
          registrationDate: "2026-10-11T11:00:00Z",
          notes: "Endurance pacing",
        },
      ],
    };
    list.push(closedFixture);
    saveStoredTournaments(list);
  }
  return list;
}

const OTP_CODE = "123456";
const OTP_TTL = 10 * 60 * 1000;
const INVITE_TTL = 48 * 3600 * 1000; // mã mời nhân viên còn hạn 48 giờ
const OTP_COOLDOWN = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK = 15 * 60 * 1000;
const PASSWORD_MAX_AGE_DAYS = 180;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (email: unknown) => String(email ?? "").trim().toLowerCase();

interface Ctx {
  db: Db;
  url: URL;
  body: Record<string, unknown>;
  params: string[];
}

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  handler: (ctx: Ctx) => unknown | Promise<unknown>;
}

// ------------------------------------------------------------------ tiện ích dùng chung

function currentUser(db: Db): Account {
  const session = readSession();
  const user = session ? db.accounts.find((a) => a.id === session.accountId) : undefined;
  // Tài khoản bị khóa/vô hiệu giữa chừng => phiên coi như hết hạn ngay.
  if (!user || user.status !== "ACTIVE") {
    clearSession();
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired");
  }
  return user;
}

function requirePermission(user: Account, key: PermissionKey): void {
  if (!user.permissions[key]) throw new ApiError(403, "FORBIDDEN", "Not allowed");
}

function notificationList(role: Role) {
  const notifications = mockNotificationsFor(role)
    .map(({ targetRoles: _roles, ...n }) => n)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
}

function findAccount(db: Db, id: string): Account {
  const account = db.accounts.find((a) => a.id === id);
  if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found");
  return account;
}

function issueOtp(db: Db, email: string, purpose: OtpPurpose): OtpRecord {
  const now = Date.now();
  const record: OtpRecord = {
    email, purpose, code: OTP_CODE, sentAt: now, expiresAt: now + (purpose === "invite" ? INVITE_TTL : OTP_TTL),
    resendAt: now + OTP_COOLDOWN, attempts: 0,
  };
  db.otps = db.otps.filter((o) => !(o.email === email && o.purpose === purpose));
  db.otps.push(record);
  return record;
}

function otpTimes(r: OtpRecord) {
  return { sentAt: r.sentAt, expiresAt: r.expiresAt, resendAt: r.resendAt };
}

// `valid` = false khi email không tồn tại: vẫn trả lỗi y như nhập sai mã (không lộ email có tồn tại hay không).
function checkOtp(db: Db, email: string, purpose: OtpPurpose, code: string, valid = true): void {
  const record = db.otps.find((o) => o.email === email && o.purpose === purpose);
  if (!record) throw new ApiError(404, "OTP_NOT_FOUND", "No code");
  if (Date.now() > record.expiresAt) throw new ApiError(400, "OTP_EXPIRED", "Code expired");
  if (record.attempts >= OTP_MAX_ATTEMPTS) throw new ApiError(429, "OTP_ATTEMPTS_EXCEEDED", "Too many attempts");
  if (!valid || code !== record.code) {
    record.attempts += 1;
    saveDb(db);
    const left = OTP_MAX_ATTEMPTS - record.attempts;
    if (left <= 0) throw new ApiError(429, "OTP_ATTEMPTS_EXCEEDED", "Too many attempts");
    throw new ApiError(400, "OTP_INVALID", "Wrong code", { attemptsLeft: left });
  }
  db.otps = db.otps.filter((o) => o !== record);
}

function requestCode(db: Db): string {
  const now = new Date();
  db.seq += 1;
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `REQ-${yy}${mm}-${String(db.seq).padStart(3, "0")}`;
}

function purposeOf(value: unknown): OtpPurpose {
  return value === "signup" || value === "invite" ? value : "reset";
}

const REASON_MAX = 300;

function reasonOf(body: Record<string, unknown>): string | null {
  const reason = String(body.reason ?? "").trim();
  if (reason.length > REASON_MAX) throw new ApiError(400, "VALIDATION", `Reason must be at most ${REASON_MAX} characters.`, { field: "reason" });
  return reason || null;
}

// Không tự khóa / vô hiệu hóa chính mình; CLB luôn còn ít nhất 1 Club Manager hoạt động.
function assertCanRemove(db: Db, actor: Account, target: Account, selfCode: string): void {
  if (target.id === actor.id) throw new ApiError(409, selfCode, "Not allowed on your own account");
  const activeManagers = db.accounts.filter((a) => a.role === "CLUB_MANAGER" && a.status === "ACTIVE");
  if (target.role === "CLUB_MANAGER" && target.status === "ACTIVE" && activeManagers.length <= 1) {
    throw new ApiError(409, "LAST_MANAGER", "Last manager");
  }
}

// Chỉ xóa hẳn tài khoản chưa từng hoạt động; tài khoản đã dùng thì vô hiệu hóa.
const DELETABLE: Account["status"][] = ["INVITED", "PENDING_EMAIL", "REJECTED"];

// ------------------------------------------------------------------ các route

const routes: Route[] = [
  // ---- Flow 5: Giải đua & Đăng ký thi đấu (SC-5.01 -> SC-5.04)
  {
    method: "GET",
    pattern: /^\/tournaments$/,
    handler: ({ url }) => {
      const status = url.searchParams.get("status");
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const page = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 20);

      let list = getTournamentsWithFixtures();
      if (status && status !== "ALL") {
        list = list.filter((t) => t.status === status);
      }
      if (search) {
        list = list.filter((t) => t.name.toLowerCase().includes(search) || t.location.toLowerCase().includes(search));
      }
      const total = list.length;
      const skip = (page - 1) * limit;
      const items = list.slice(skip, skip + limit).map((t) => ({
        ...t,
        registeredCount: t.registrations?.length ?? 0,
      }));
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  },
  {
    method: "GET",
    pattern: /^\/tournaments\/([^/]+)\/eligibility$/,
    handler: ({ params }) => {
      const [id] = params;
      const tourney = getTournamentsWithFixtures().find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      const horses = getStoredHorses();
      const registeredIds = new Set((tourney.registrations ?? []).map((r) => r.horseId));

      const eligible: any[] = [];
      const ineligible: any[] = [];

      for (const h of horses) {
        const reasons: string[] = [];
        if (h.isLocked) {
          reasons.push("Horse is currently under Veterinary Medical Lock");
        }
        if (h.status === "SICK" || h.status === "INJURED") {
          reasons.push(`Horse health status is ${h.status}`);
        }
        const item = {
          id: h.id,
          name: h.name,
          horseCode: h.code,
          breed: h.breed,
          avatarUrl: (h as any).avatarUrl ?? null,
          status: horseStatusOf(h),
          isMedicalLocked: h.isLocked,
          completedWorkouts: 6,
          owner: { id: "u-owner", fullName: h.ownerName || "Club Owner" },
          isRegistered: registeredIds.has(h.id),
          registrationId: tourney.registrations?.find((r) => r.horseId === h.id)?.id,
        };
        if (reasons.length === 0) {
          eligible.push(item);
        } else {
          ineligible.push({ ...item, ineligibleReasons: reasons });
        }
      }
      return {
        tournament: {
          id: tourney.id,
          name: tourney.name,
          raceDate: tourney.raceDate,
          distanceMeters: tourney.distanceMeters,
          trackType: tourney.trackType,
          status: tourney.status,
          registrationDeadline: tourney.registrationDeadline,
        },
        eligible,
        ineligible,
        totalEligible: eligible.length,
        totalIneligible: ineligible.length,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/tournaments\/([^/]+)$/,
    handler: ({ params }) => {
      const [id] = params;
      const tourney = getTournamentsWithFixtures().find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      return tourney;
    },
  },
  {
    method: "POST",
    pattern: /^\/tournaments$/,
    handler: ({ body, db }) => {
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can create tournaments");
      if (body.status === "COMPLETED") {
        throw new ApiError(400, "INVALID_STATUS_TRANSITION", "Tournaments cannot be directly created as COMPLETED. Use lockResults after recording all race results.");
      }
      if (body.status === "CANCELLED" || body.status === "CLOSED_REGISTRATION") {
        throw new ApiError(400, "INVALID_STATUS_TRANSITION", `Cannot create a tournament directly in ${body.status} status.`);
      }
      if (body.status === "OPEN_REGISTRATION" && body.registrationDeadline && new Date(String(body.registrationDeadline)) < new Date()) {
        throw new ApiError(400, "INVALID_DEADLINE", "Cannot set Open for Registration when registration deadline is in the past");
      }
      const list = getTournamentsWithFixtures();
      const newTourney: Tournament = {
        id: `tourney-${Date.now()}`,
        name: String(body.name ?? "New Tournament"),
        raceDate: String(body.raceDate),
        location: String(body.location ?? "Racetrack"),
        distanceMeters: Number(body.distanceMeters ?? 1600),
        trackType: (body.trackType as any) ?? "TURF",
        prizePool: Number(body.prizePool ?? 0),
        registrationDeadline: String(body.registrationDeadline),
        status: (body.status as any) ?? "UPCOMING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        registeredCount: 0,
        registrations: [],
      };
      list.unshift(newTourney);
      saveStoredTournaments(list);
      return newTourney;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/tournaments\/([^/]+)\/status$/,
    handler: ({ params, body, db }) => {
      const [id] = params;
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can change status");
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      if (tourney.status === body.status) return tourney;
      if (tourney.status === "COMPLETED") {
        throw new ApiError(400, "CANNOT_CHANGE_COMPLETED", "Completed tournaments cannot have their status altered");
      }
      if (body.status === "COMPLETED") {
        throw new ApiError(400, "INVALID_STATUS_TRANSITION", "Tournaments cannot be directly marked as COMPLETED. Use lockResults after recording all race results.");
      }
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        UPCOMING: ["OPEN_REGISTRATION", "CANCELLED"],
        OPEN_REGISTRATION: ["CLOSED_REGISTRATION", "CANCELLED"],
        CLOSED_REGISTRATION: ["CANCELLED"],
        CANCELLED: [],
        COMPLETED: [],
      };
      const allowed = ALLOWED_TRANSITIONS[tourney.status] || [];
      if (!allowed.includes(String(body.status))) {
        throw new ApiError(400, "INVALID_STATUS_TRANSITION", `Cannot transition tournament status from ${tourney.status} to ${body.status}`);
      }
      if (body.status === "OPEN_REGISTRATION" && tourney.registrationDeadline && new Date(tourney.registrationDeadline) < new Date()) {
        throw new ApiError(400, "INVALID_DEADLINE", "Cannot set Open for Registration when registration deadline is in the past");
      }
      tourney.status = body.status as any;
      tourney.updatedAt = new Date().toISOString();
      saveStoredTournaments(list);
      return tourney;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/tournaments\/([^/]+)$/,
    handler: ({ params, body, db }) => {
      const [id] = params;
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can edit tournament");
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      if (tourney.status === "COMPLETED" || tourney.status === "CANCELLED") {
        throw new ApiError(400, "TOURNAMENT_LOCKED", `Cannot edit tournament that is already ${tourney.status}`);
      }
      if (body.status && body.status !== tourney.status) {
        if (body.status === "COMPLETED") {
          throw new ApiError(400, "INVALID_STATUS_TRANSITION", "Tournaments cannot be directly marked as COMPLETED. Use lockResults after recording all race results.");
        }
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
          UPCOMING: ["OPEN_REGISTRATION", "CANCELLED"],
          OPEN_REGISTRATION: ["CLOSED_REGISTRATION", "CANCELLED"],
          CLOSED_REGISTRATION: ["CANCELLED"],
          CANCELLED: [],
          COMPLETED: [],
        };
        const allowed = ALLOWED_TRANSITIONS[tourney.status] || [];
        if (!allowed.includes(String(body.status))) {
          throw new ApiError(400, "INVALID_STATUS_TRANSITION", `Cannot transition tournament status from ${tourney.status} to ${body.status}`);
        }
        if (body.status === "OPEN_REGISTRATION") {
          const deadline = body.registrationDeadline ? new Date(String(body.registrationDeadline)) : new Date(tourney.registrationDeadline);
          if (deadline < new Date()) {
            throw new ApiError(400, "INVALID_DEADLINE", "Cannot set Open for Registration when registration deadline is in the past");
          }
        }
      }
      Object.assign(tourney, body, { updatedAt: new Date().toISOString() });
      saveStoredTournaments(list);
      return tourney;
    },
  },
  {
    method: "DELETE",
    pattern: /^\/tournaments\/([^/]+)$/,
    handler: ({ params, db }) => {
      const [id] = params;
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can delete tournament");
      let list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      const regCount = Math.max(tourney.registeredCount ?? 0, tourney.registrations?.length ?? 0);
      if (regCount > 0) {
        throw new ApiError(400, "HAS_REGISTRATIONS", "Cannot delete tournament with existing horse registrations. Cancel the tournament instead.");
      }
      if (tourney.status === "COMPLETED") {
        throw new ApiError(400, "CANNOT_DELETE_COMPLETED", "Cannot delete a completed tournament");
      }
      if (tourney.status === "CANCELLED") {
        throw new ApiError(400, "CANNOT_DELETE_CANCELLED", "Cannot delete a cancelled tournament. Cancelled tournaments must be preserved for audit history.");
      }
      if (tourney.status === "CLOSED_REGISTRATION") {
        throw new ApiError(400, "CANNOT_DELETE_CLOSED", "Cannot delete a closed tournament. Cancel the tournament if it will not proceed.");
      }
      list = list.filter((t) => t.id !== id);
      saveStoredTournaments(list);
      return { success: true };
    },
  },
  {
    method: "POST",
    pattern: /^\/tournaments\/([^/]+)\/registrations$/,
    handler: ({ params, body, db }) => {
      const [id] = params;
      const actor = currentUser(db);
      const horseId = String(body.horseId);
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");

      if (tourney.status !== "OPEN_REGISTRATION") {
        throw new ApiError(
          400,
          "REGISTRATION_NOT_OPEN",
          `Tournament is not open for registration (status: ${tourney.status})`,
        );
      }
      if (tourney.registrationDeadline && new Date(tourney.registrationDeadline) < new Date()) {
        throw new ApiError(400, "DEADLINE_PASSED", "Hạn đăng ký giải đấu đã kết thúc");
      }

      const horse = getStoredHorses().find((h) => h.id === horseId);
      if (!horse) throw new ApiError(404, "NOT_FOUND", "Horse not found");
      if (horse.isLocked) {
        throw new ApiError(400, "MEDICAL_LOCK_ACTIVE", "Ngựa đang chịu Khóa y tế bởi Bác sĩ");
      }

      tourney.registrations = tourney.registrations ?? [];
      const newReg: TournamentRegistration = {
        id: `reg-${Date.now()}`,
        tournamentId: id,
        horseId,
        horse: {
          id: horse.id,
          name: horse.name ?? "Horse",
          horseCode: horse.code,
          breed: horse.breed ?? "Thoroughbred",
          avatarUrl: (horse as any).avatarUrl ?? null,
          status: horseStatusOf(horse),
          isMedicalLocked: horse.isLocked,
          owner: { id: "u-owner", fullName: horse.ownerName || "Owner", email: "owner@gmail.com" },
        },
        registeredByTrainerId: actor.id,
        registeredByTrainer: { id: actor.id, fullName: actor.fullName, email: actor.email },
        status: "REGISTERED",
        registrationDate: new Date().toISOString(),
        notes: body.notes ? String(body.notes) : null,
      };
      tourney.registrations.push(newReg);
      tourney.registeredCount = tourney.registrations.length;
      saveStoredTournaments(list);
      return newReg;
    },
  },
  {
    method: "DELETE",
    pattern: /^\/tournaments\/([^/]+)\/registrations\/([^/]+)$/,
    handler: ({ params, body, url }) => {
      const [id, regId] = params;
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");
      if (tourney.status === "COMPLETED" || tourney.status === "CANCELLED") {
        throw new ApiError(400, "TOURNAMENT_LOCKED", `Cannot scratch horse from a tournament that is ${tourney.status}`);
      }
      if (tourney.status === "UPCOMING") {
        throw new ApiError(400, "REGISTRATION_NOT_OPEN", "Không thể rút ngựa khi giải đấu chưa mở đăng ký");
      }
      const reason = String(body?.reason || url.searchParams.get("reason") || "").trim();
      if (!reason) {
        throw new ApiError(400, "REASON_REQUIRED", "Lý do rút ngựa là bắt buộc");
      }
      if (!tourney.registrations) {
        throw new ApiError(404, "NOT_FOUND", "Registration not found");
      }
      const reg = tourney.registrations.find((r) => r.id === regId);
      if (!reg) throw new ApiError(404, "NOT_FOUND", "Registration not found");
      if (reg.status === "SCRATCHED_MEDICAL") {
        throw new ApiError(400, "ALREADY_SCRATCHED", "Horse has already been scratched");
      }
      reg.status = "SCRATCHED_MEDICAL";
      (reg as any).scratchReason = reason;
      saveStoredTournaments(list);
      return { success: true, message: "Rút ngựa thành công", registration: reg };
    },
  },
  {
    method: "POST",
    pattern: /^\/tournaments\/([^/]+)\/results$/,
    handler: ({ params, body, db }) => {
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only the Club Manager has the authority to record or edit tournament results.");
      }
      const [id] = params;
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");

      if (tourney.status !== "CLOSED_REGISTRATION") {
        throw new ApiError(
          400,
          "INVALID_STATUS_TRANSITION",
          `Cannot record results for tournament with status ${tourney.status}. Results can only be recorded when status is CLOSED_REGISTRATION.`,
        );
      }
      if (new Date() < new Date(tourney.raceDate)) {
        throw new ApiError(
          400,
          "RACE_NOT_FINISHED",
          "Cannot record or lock results before raceDate has arrived.",
        );
      }

      if (body.lockResults) {
        const activeRegs = (tourney.registrations || []).filter(
          (r) => r.status === "REGISTERED" || r.status === "CONFIRMED",
        );
        if (activeRegs.length === 0) {
          throw new ApiError(400, "NO_REGISTRATIONS", "Cannot lock tournament with no active registrations");
        }
        const submittedRegIds = new Set(((body.results as any[]) || []).map((i) => i.registrationId));
        const missingResults = activeRegs.some((r) => !r.result && !submittedRegIds.has(r.id));
        if (missingResults) {
          throw new ApiError(
            400,
            "RESULTS_INCOMPLETE",
            "Cannot lock tournament results until all registered horses have official race times and ranks",
          );
        }
      }

      const items = (body.results as any[]) ?? [];
      for (const item of items) {
        const reg = tourney.registrations?.find((r) => r.id === item.registrationId);
        if (reg) {
          const speed =
            item.avgSpeedKmh ||
            Math.round(((tourney.distanceMeters / item.finishTimeSeconds) * 3.6) * 100) / 100;
          reg.result = {
            id: `res-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            registrationId: item.registrationId,
            finalRank: item.finalRank,
            finishTimeSeconds: item.finishTimeSeconds,
            avgSpeedKmh: speed,
            prizeMoneyWon: item.prizeMoneyWon ?? 0,
            officialNotes: item.officialNotes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }
      if (body.lockResults) {
        tourney.status = "COMPLETED";
      }
      saveStoredTournaments(list);
      return { success: true };
    },
  },
  {
    method: "POST",
    pattern: /^\/tournaments\/([^/]+)\/lock-results$/,
    handler: ({ params, db }) => {
      const [id] = params;
      const actor = currentUser(db);
      if (actor.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only the Club Manager has the authority to lock tournament results");
      }
      const list = getTournamentsWithFixtures();
      const tourney = list.find((t) => t.id === id);
      if (!tourney) throw new ApiError(404, "NOT_FOUND", "Tournament not found");

      if (tourney.status !== "CLOSED_REGISTRATION") {
        throw new ApiError(
          400,
          "INVALID_STATUS_TRANSITION",
          `Cannot lock results for tournament with status ${tourney.status}. Results can only be locked when status is CLOSED_REGISTRATION.`,
        );
      }
      if (new Date() < new Date(tourney.raceDate)) {
        throw new ApiError(
          400,
          "RACE_NOT_FINISHED",
          "Cannot lock results before raceDate has arrived.",
        );
      }

      const activeRegs = (tourney.registrations || []).filter(
        (r) => r.status === "REGISTERED" || r.status === "CONFIRMED",
      );
      if (activeRegs.length === 0) {
        throw new ApiError(400, "NO_REGISTRATIONS", "Cannot lock tournament with no active registrations");
      }
      const missingResults = activeRegs.some((r) => !r.result);
      if (missingResults) {
        throw new ApiError(
          400,
          "RESULTS_INCOMPLETE",
          "Cannot lock tournament results until all registered horses have official race times and ranks",
        );
      }

      tourney.status = "COMPLETED";
      tourney.updatedAt = new Date().toISOString();
      saveStoredTournaments(list);
      return tourney;
    },
  },
  // ---- Flow 5: Sổ tài chính & Báo cáo Chủ ngựa (SC-5.05 & SC-5.06)
  {
    method: "GET",
    pattern: /^\/invoices\/owner-summary$/,
    handler: ({ url, db }) => {
      const user = currentUser(db);
      const targetOwnerId = user.role === "HORSE_OWNER" ? user.id : (url.searchParams.get("ownerId") || user.id);
      const invoices = getStoredInvoices().filter((inv) => inv.ownerId === targetOwnerId);

      let totalBoarding = 0;
      let totalMedical = 0;
      let totalTraining = 0;
      let totalPrizeCredit = 0;
      let totalNet = 0;

      for (const inv of invoices) {
        totalBoarding += Number(inv.boardingFee);
        totalMedical += Number(inv.medicalFee);
        totalTraining += Number(inv.trainingFee);
        totalPrizeCredit += Number(inv.prizeCredit);
        totalNet += Number(inv.netAmount);
      }

      return {
        totalBoarding,
        totalMedical,
        totalTraining,
        totalExpense: totalBoarding + totalMedical + totalTraining,
        totalPrizeCredit,
        totalNet,
        invoiceCount: invoices.length,
        invoices,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/invoices$/,
    handler: ({ url, db }) => {
      const user = currentUser(db);
      const ownerParam = url.searchParams.get("ownerId");
      const targetOwnerId = user.role === "HORSE_OWNER" ? user.id : ownerParam;
      const billingPeriod = url.searchParams.get("billingPeriod");
      const status = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 20);

      let list = getStoredInvoices();
      if (targetOwnerId) {
        list = list.filter((inv) => inv.ownerId === targetOwnerId);
      }
      if (billingPeriod && billingPeriod !== "ALL") {
        list = list.filter((inv) => inv.billingPeriod === billingPeriod);
      }
      if (status && status !== "ALL") {
        list = list.filter((inv) => inv.status === status);
      }

      const total = list.length;
      const skip = (page - 1) * limit;
      const items = list.slice(skip, skip + limit);
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  },
  {
    method: "GET",
    pattern: /^\/invoices\/([^/]+)$/,
    handler: ({ params, db }) => {
      const [id] = params;
      const user = currentUser(db);
      const inv = getStoredInvoices().find((i) => i.id === id);
      if (!inv) throw new ApiError(404, "NOT_FOUND", "Invoice not found");
      if (user.role === "HORSE_OWNER" && inv.ownerId !== user.id) {
        throw new ApiError(403, "FORBIDDEN", "You can only view your own invoices");
      }
      return inv;
    },
  },
  {
    method: "POST",
    pattern: /^\/invoices$/,
    handler: ({ body, db }) => {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can create invoices");
      const list = getStoredInvoices();
      const boardingFee = Number(body.boardingFee ?? 0);
      const medicalFee = Number(body.medicalFee ?? 0);
      const trainingFee = Number(body.trainingFee ?? 0);
      const prizeCredit = Number(body.prizeCredit ?? 0);
      const netAmount = boardingFee + medicalFee + trainingFee - prizeCredit;

      const newInv: FinancialInvoice = {
        id: `inv-${Date.now()}`,
        horseId: String(body.horseId),
        horse: {
          id: String(body.horseId),
          name: "Thunder Bolt",
          horseCode: "HRS-001",
          breed: "Thoroughbred",
        },
        ownerId: String(body.ownerId),
        owner: {
          id: String(body.ownerId),
          fullName: "Ha Ly",
          email: "ha.ly@gmail.com",
        },
        billingPeriod: String(body.billingPeriod ?? "2026-10"),
        boardingFee,
        medicalFee,
        trainingFee,
        prizeCredit,
        netAmount,
        status: (body.status as any) ?? "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newInv);
      saveStoredInvoices(list);
      return newInv;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/invoices\/([^/]+)\/status$/,
    handler: ({ params, body, db }) => {
      const [id] = params;
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can update status");
      const list = getStoredInvoices();
      const inv = list.find((i) => i.id === id);
      if (!inv) throw new ApiError(404, "NOT_FOUND", "Invoice not found");
      inv.status = body.status as any;
      inv.updatedAt = new Date().toISOString();
      saveStoredInvoices(list);
      return inv;
    },
  },
  {
    method: "GET",
    pattern: /^\/stalls\/grooms$/,
    handler: ({ db }) =>
      db.accounts
        .filter((a) => a.role === "GROOM" && a.status === "ACTIVE")
        .map((a) => ({ id: a.id, fullName: a.fullName, email: a.email, horseCount: getStoredHorses().filter((h) => h.assignedGroomId === a.id).length })),
  },
  { method: "GET", pattern: /^\/stalls$/, handler: ({ db, url }) => mockStalls(db, url) },
  { method: "GET", pattern: /^\/stalls\/zones$/, handler: () => mockZones() },
  // Đăng ký ô chuồng cho ngựa (Allocate Stall)
  {
    method: "POST",
    pattern: /^\/stalls\/([^/]+)\/allocations$/,
    handler: ({ db, params, body }) => {
      const [stallId] = params;
      const horseId = String(body.horseId ?? "");
      const groomId = body.assignedGroomUserId ? String(body.assignedGroomUserId) : undefined;
      const horses = getStoredHorses();
      const horse = horses.find((h) => h.id === horseId);
      if (!horse) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse not found");
      const stalls = mockStallList(db);
      const stall = stalls.find(
        (s) =>
          s.id === stallId ||
          s.code === stallId ||
          s.id.toLowerCase() === stallId.toLowerCase() ||
          s.code.toLowerCase() === stallId.toLowerCase(),
      );
      if (!stall) throw new ApiError(404, "STALL_NOT_FOUND", "Stall not found");
      horse.stall = stall.code;
      if (groomId) horse.assignedGroomId = groomId;
      saveStoredHorses(horses);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("horsesUpdated"));
      return { stallCode: stall.code, horseName: horse.name };
    },
  },
  // Di chuyển ô chuồng (Transfer Stall)
  {
    method: "PUT",
    pattern: /^\/stalls\/allocations\/([^/]+)\/transfer$/,
    handler: ({ db, params, body }) => {
      const [allocId] = params;
      const toStallId = String(body.newStallId ?? body.toStallId ?? "");
      const groomId = body.newGroomId ? String(body.newGroomId) : body.assignedGroomUserId ? String(body.assignedGroomUserId) : undefined;
      const stalls = mockStallList(db);
      const toStall = stalls.find(
        (s) =>
          s.id === toStallId ||
          s.code === toStallId ||
          s.id.toLowerCase() === toStallId.toLowerCase() ||
          s.code.toLowerCase() === toStallId.toLowerCase(),
      );
      if (!toStall) throw new ApiError(404, "TARGET_STALL_NOT_FOUND", "Target stall not found");
      const horses = getStoredHorses();
      const horse = horses.find(
        (h) => h.id === allocId || `alloc-${h.id}` === allocId,
      );
      if (!horse) throw new ApiError(404, "ALLOCATION_NOT_FOUND", "Allocation not found");
      const fromStallCode = horse.stall || "";
      horse.stall = toStall.code;
      if (groomId) horse.assignedGroomId = groomId;
      saveStoredHorses(horses);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("horsesUpdated"));
      return { fromStallCode, stallCode: toStall.code, horseName: horse.name };
    },
  },
  // Trả ô chuồng (Return Stall)
  {
    method: "PUT",
    pattern: /^\/stalls\/allocations\/([^/]+)\/return$/,
    handler: ({ params }) => {
      const [allocId] = params;
      const horses = getStoredHorses();
      const horse = horses.find(
        (h) => h.id === allocId || `alloc-${h.id}` === allocId,
      );
      if (!horse) throw new ApiError(404, "ALLOCATION_NOT_FOUND", "Allocation not found");
      const stallCode = horse.stall || "";
      horse.stall = "";
      saveStoredHorses(horses);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("horsesUpdated"));
      return { stallCode, horseName: horse.name };
    },
  },
  {
    method: "GET", pattern: /^\/audit-logs$/,
    handler: ({ db, url }) => {
      requirePermission(currentUser(db), "viewAudit");
      const q = url.searchParams;
      const page = Number(q.get("page") ?? 1), pageSize = Number(q.get("pageSize") ?? 20);
      const from = q.get("from"), to = q.get("to");
      if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
          (from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) ||
          (from && to && Date.parse(from) > Date.parse(to))) throw new ApiError(400, "VALIDATION", "Invalid audit filters");
      const logs = db.audit.map((entry, index) => {
        const user = db.accounts.find(a => a.fullName === entry.actor || (entry.actor.includes("Tran") && a.id === "viet"));
        return {
          id: `demo-${entry.at}-${db.audit.length - index}`,
          userId: user?.id ?? null,
          actor: entry.actor,
          action: entry.action,
          entityName: "Account / System",
          entityId: null,
          oldValuesJson: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValuesJson: entry.newValues ? JSON.stringify(entry.newValues) : JSON.stringify({ actor: entry.actor, detail: entry.detail }),
          ipAddress: null,
          userAgent: null,
          timestamp: entry.at,
          user: user ? { id: user.id, fullName: user.fullName } : null,
          detail: entry.detail,
        };
      }).filter(entry => {
        const actorFilter = q.get("actor")?.toLowerCase().trim();
        if (actorFilter) {
          const nameMatch = entry.user?.fullName.toLowerCase().includes(actorFilter);
          const rawActorMatch = entry.actor.toLowerCase().includes(actorFilter);
          const legacyMatch = (actorFilter === "việt" || actorFilter === "viet") && (entry.user?.id === "viet" || entry.actor.toLowerCase().includes("tran"));
          if (!nameMatch && !rawActorMatch && !legacyMatch) return false;
        }
        if (q.get("userId") && entry.userId !== q.get("userId")) return false;
        if (q.get("action") && entry.action !== q.get("action")) return false;
        if (q.get("entityName") && entry.entityName !== q.get("entityName")) return false;
        if (from && Date.parse(entry.timestamp) < Date.parse(from)) return false;
        if (to && Date.parse(entry.timestamp) > Date.parse(to)) return false;
        return true;
      })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id));
      return { logs: logs.slice((page - 1) * pageSize, page * pageSize), total: logs.length, page, pageSize };
    },
  },
  // ----- đăng nhập / phiên -----
  {
    method: "POST",
    pattern: /^\/auth\/login$/,
    async handler({ db, body }) {
      await sleep(650); // để thấy trạng thái "Signing in…" (design 0.2)
      const email = norm(body.email);
      const password = String(body.password ?? "");
      const now = Date.now();
      const attempt = db.loginFails[email] ?? { fails: 0, lockedUntil: 0 };

      if (attempt.lockedUntil > now) {
        throw new ApiError(429, "ATTEMPTS_EXCEEDED", "Too many attempts", { retryAt: new Date(attempt.lockedUntil).toISOString() });
      }

      const account = db.accounts.find((a) => a.email.toLowerCase() === email);
      if (!account || account.password !== password) {
        attempt.fails += 1;
        if (attempt.fails >= LOGIN_MAX_FAILS) {
          db.loginFails[email] = { fails: 0, lockedUntil: now + LOGIN_LOCK };
          audit(db, email || "anonymous", "LOGIN_LOCKED_OUT", "Too many wrong passwords");
          saveDb(db);
          throw new ApiError(429, "ATTEMPTS_EXCEEDED", "Too many attempts", { retryAt: new Date(now + LOGIN_LOCK).toISOString() });
        }
        db.loginFails[email] = attempt;
        audit(db, email || "anonymous", "LOGIN_FAILED", "Wrong email or password");
        saveDb(db);
        throw new ApiError(401, "INVALID_CREDENTIALS", "Wrong credentials", { attemptsLeft: LOGIN_MAX_FAILS - attempt.fails });
      }

      delete db.loginFails[email];
      const info = {
        fullName: account.fullName,
        roleLabel: ROLE_LABEL[account.role],
        lockedAt: account.lockedAt,
        requestedAt: account.requestedAt,
        requestCode: account.requestCode,
        reason: account.statusReason,
      };
      const blocked: Partial<Record<Account["status"], [number, string]>> = {
        LOCKED: [423, "ACCOUNT_LOCKED"],
        PENDING_APPROVAL: [403, "ACCOUNT_PENDING"],
        PENDING_EMAIL: [403, "EMAIL_NOT_VERIFIED"],
        INVITED: [403, "ACCOUNT_INVITED"],
        INACTIVE: [403, "ACCOUNT_INACTIVE"],
        REJECTED: [403, "ACCOUNT_REJECTED"],
      };
      const block = blocked[account.status];
      if (block) {
        saveDb(db);
        throw new ApiError(block[0], block[1], "Account cannot sign in", info);
      }

      account.lastActive = new Date().toISOString();
      audit(db, account.fullName, "AUTH_LOGIN", "Signed in");
      saveDb(db);
      writeSession(account.id, Boolean(body.remember));
      return { user: toPublic(account) };
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/logout$/,
    handler({ db }) {
      const session = readSession();
      const user = session ? db.accounts.find((a) => a.id === session.accountId) : undefined;
      if (user) {
        audit(db, user.fullName, "AUTH_LOGOUT", "Signed out");
        saveDb(db);
      }
      clearSession();
      return { ok: true };
    },
  },
  {
    method: "GET",
    pattern: /^\/auth\/me$/,
    handler({ db }) {
      return { user: toPublic(currentUser(db)) };
    },
  },

  // ----- đăng ký + xác minh email bằng OTP -----
  {
    method: "POST",
    pattern: /^\/auth\/register$/,
    handler({ db, body }) {
      const email = norm(body.email);
      const fullName = String(body.fullName ?? "").trim();
      const role = body.role as Role;
      if (role !== "HORSE_OWNER") throw new ApiError(403, "ROLE_NOT_ALLOWED", "Only Horse Owner can self-register");
      if (!fullName || !EMAIL_RE.test(email) || passwordError(String(body.password ?? ""))) {
        throw new ApiError(400, "VALIDATION", "Invalid input");
      }
      const existing = db.accounts.find((a) => a.email.toLowerCase() === email);
      // Giống BE: cho đăng ký lại khi đăng ký dở (PENDING_EMAIL) hoặc đã bị từ chối (REJECTED).
      const canReapply = existing?.status === "PENDING_EMAIL" || existing?.status === "REJECTED";
      if (existing && !canReapply) throw new ApiError(409, "EMAIL_TAKEN", "Email taken");

      const account: Account = existing ?? {
        id: `u${Date.now()}`, fullName, email, role, status: "PENDING_EMAIL", password: "",
        phone: "", createdAt: new Date().toISOString(), lastActive: null, requestedAt: null, requestCode: null, lockedAt: null,
        invitedBy: null, statusReason: null, statusChangedAt: null, statusChangedBy: null,
        permissions: defaultPermissions(role), permissionsChangedAt: null,
        permissionsChangedBy: null, notify: defaultNotify(role),
      };
      const wasRejected = existing?.status === "REJECTED";
      account.fullName = fullName;
      account.password = String(body.password);
      account.status = "PENDING_EMAIL";
      account.statusReason = null;
      account.requestedAt = null;
      // Yêu cầu bị từ chối đã đóng => yêu cầu mới có mã mới.
      account.requestCode = wasRejected || !account.requestCode ? requestCode(db) : account.requestCode;
      if (!existing) db.accounts.push(account);

      const record = issueOtp(db, email, "signup");
      audit(db, fullName, "REGISTER", `Sign-up request ${account.requestCode}`);
      saveDb(db);
      return { email, ...otpTimes(record) };
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/verify-email$/,
    handler({ db, body }) {
      const email = norm(body.email);
      const account = db.accounts.find((a) => a.email.toLowerCase() === email && a.status === "PENDING_EMAIL");
      checkOtp(db, email, "signup", String(body.code ?? ""), Boolean(account));
      if (!account) throw new ApiError(404, "OTP_NOT_FOUND", "No code");
      account.status = "PENDING_APPROVAL";
      account.requestedAt = new Date().toISOString();
      audit(db, account.fullName, "EMAIL_VERIFIED", `Request ${account.requestCode} sent for approval`);
      saveDb(db);
      const reviewer = db.accounts.find((a) => a.role === "CLUB_MANAGER" && a.status === "ACTIVE");
      return {
        email: account.email, fullName: account.fullName, role: account.role,
        requestCode: account.requestCode, requestedAt: account.requestedAt, reviewer: reviewer?.fullName ?? "the Club Manager",
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/auth\/otp$/,
    handler({ db, url }) {
      const email = norm(url.searchParams.get("email"));
      const purpose = purposeOf(url.searchParams.get("purpose"));
      const record = db.otps.find((o) => o.email === email && o.purpose === purpose);
      if (!record) throw new ApiError(404, "OTP_NOT_FOUND", "No code");
      return otpTimes(record);
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/otp\/resend$/,
    handler({ db, body }) {
      const email = norm(body.email);
      const purpose = purposeOf(body.purpose);
      const existing = db.otps.find((o) => o.email === email && o.purpose === purpose);
      if (existing && existing.resendAt > Date.now()) {
        throw new ApiError(429, "OTP_COOLDOWN", "Wait before requesting a new code", { resendAt: existing.resendAt });
      }
      const record = issueOtp(db, email, purpose);
      saveDb(db);
      return otpTimes(record);
    },
  },

  // ----- quên mật khẩu bằng OTP -----
  {
    method: "POST",
    pattern: /^\/auth\/forgot-password$/,
    handler({ db, body }) {
      const email = norm(body.email);
      if (!EMAIL_RE.test(email)) throw new ApiError(400, "INVALID_EMAIL", "Invalid email");
      // Luôn trả kết quả giống nhau dù email có tồn tại hay không (thông báo trung tính).
      const existing = db.otps.find((o) => o.email === email && o.purpose === "reset" && o.resendAt > Date.now());
      const record = existing ?? issueOtp(db, email, "reset");
      if (!existing) {
        const account = db.accounts.find((a) => a.email.toLowerCase() === email);
        audit(db, account?.fullName ?? "anonymous", "PASSWORD_RESET_REQUESTED", "OTP issued");
        saveDb(db);
      }
      return { sent: true, ...otpTimes(record) };
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/reset-password\/verify$/,
    handler({ db, body }) {
      const email = norm(body.email);
      const account = db.accounts.find((a) => a.email.toLowerCase() === email);
      checkOtp(db, email, "reset", String(body.code ?? ""), Boolean(account));
      const token = `rt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const expiresAt = Date.now() + OTP_TTL;
      db.resetTokens[token] = { email, expiresAt };
      saveDb(db);
      return { resetToken: token, expiresAt };
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/reset-password$/,
    handler({ db, body }) {
      const entry = db.resetTokens[String(body.resetToken ?? "")];
      if (!entry || entry.expiresAt < Date.now()) throw new ApiError(400, "RESET_EXPIRED", "Reset expired");
      const weak = passwordError(String(body.password ?? ""));
      if (weak) throw new ApiError(400, "WEAK_PASSWORD", weak);
      const account = db.accounts.find((a) => a.email.toLowerCase() === entry.email);
      if (!account) throw new ApiError(400, "RESET_EXPIRED", "Reset expired");
      account.password = String(body.password);
      delete db.resetTokens[String(body.resetToken)];
      db.loginFails[entry.email] = { fails: 0, lockedUntil: 0 };
      // Nhân viên được mời đặt mật khẩu lần đầu => kích hoạt tài khoản.
      const accepting = account.status === "INVITED";
      if (accepting) {
        account.status = "ACTIVE";
        account.statusReason = null;
        db.otps = db.otps.filter((o) => !(o.email === entry.email && o.purpose === "invite"));
        audit(db, account.fullName, "INVITE_ACCEPTED", "Password set; account is active");
      } else {
        audit(db, account.fullName, "PASSWORD_RESET", "Password changed with OTP");
      }
      saveDb(db);
      return { ok: true, activated: accepting };
    },
  },

  // ----- nhận lời mời (nhân viên): mã trong email mời → vé đặt mật khẩu -----
  {
    method: "POST",
    pattern: /^\/auth\/accept-invite\/verify$/,
    handler({ db, body }) {
      const email = norm(body.email);
      const invited = db.accounts.find((a) => a.email.toLowerCase() === email && a.status === "INVITED");
      checkOtp(db, email, "invite", String(body.code ?? ""), Boolean(invited));
      const token = `rt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const expiresAt = Date.now() + OTP_TTL;
      db.resetTokens[token] = { email, expiresAt };
      saveDb(db);
      return { resetToken: token, expiresAt, fullName: invited?.fullName ?? "", role: invited?.role ?? null };
    },
  },

  // ----- quản lý tài khoản (chỉ ai có quyền manageAccounts) -----
  {
    method: "GET",
    pattern: /^\/accounts$/,
    handler({ db }) {
      requirePermission(currentUser(db), "manageAccounts");
      // Thêm ?mockError=1 vào URL trang để xem trạng thái lỗi tải danh sách (design 1.9f).
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mockError")) {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Service did not answer");
      }
      return { accounts: db.accounts.map(toPublic) };
    },
  },
  {
    method: "POST",
    pattern: /^\/accounts$/,
    handler({ db, body }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const email = norm(body.email);
      const fullName = String(body.fullName ?? "").trim();
      const role = body.role as Role;
      if (!fullName || !EMAIL_RE.test(email) || !ROLE_LABEL[role] || role === "HORSE_OWNER") throw new ApiError(400, "VALIDATION", "Invalid input");
      if (db.accounts.some((a) => a.email.toLowerCase() === email)) throw new ApiError(409, "EMAIL_TAKEN", "Email taken");
      const account: Account = {
        id: `u${Date.now()}`, fullName, email, role, status: "INVITED", password: "", phone: "",
        createdAt: new Date().toISOString(), lastActive: null, requestedAt: null, requestCode: null, lockedAt: null,
        invitedBy: actor.fullName, statusReason: null, statusChangedAt: null, statusChangedBy: null,
        permissions: defaultPermissions(role), permissionsChangedAt: null, permissionsChangedBy: null,
        notify: defaultNotify(role),
      };
      db.accounts.push(account);
      issueOtp(db, email, "invite"); // backend thật gửi email kèm mã mời
      audit(db, actor.fullName, "ACCOUNT_INVITED", `${fullName} invited as ${ROLE_LABEL[role]}`);
      saveDb(db);
      return { account: toPublic(account) };
    },
  },
  {
    method: "GET",
    pattern: /^\/accounts\/([^/]+)$/,
    handler({ db, params }) {
      requirePermission(currentUser(db), "manageAccounts");
      return { account: toPublic(findAccount(db, params[0])) };
    },
  },
  {
    method: "POST",
    pattern: /^\/accounts\/([^/]+)\/(approve|decline|lock|unlock|deactivate|reactivate)$/,
    handler({ db, params, body }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const target = findAccount(db, params[0]);
      const action = params[1];
      const reason = reasonOf(body);

      if (action === "approve" || action === "decline") {
        if (target.status !== "PENDING_APPROVAL") throw new ApiError(409, "INVALID_STATE", "Not waiting for approval");
        target.status = action === "approve" ? "ACTIVE" : "REJECTED";
        target.statusReason = action === "approve" ? null : reason;
      } else if (action === "lock") {
        if (target.status !== "ACTIVE") throw new ApiError(409, "INVALID_STATE", "Only an active account can be locked");
        assertCanRemove(db, actor, target, "CANNOT_LOCK_SELF");
        target.status = "LOCKED";
        target.lockedAt = new Date().toISOString();
        target.statusReason = reason;
      } else if (action === "unlock") {
        if (target.status !== "LOCKED") throw new ApiError(409, "INVALID_STATE", "Not locked");
        target.status = "ACTIVE";
        target.lockedAt = null;
        target.statusReason = null;
      } else if (action === "deactivate") {
        if (target.status !== "ACTIVE" && target.status !== "LOCKED") throw new ApiError(409, "INVALID_STATE", "Cannot deactivate");
        assertCanRemove(db, actor, target, "CANNOT_CHANGE_SELF");
        target.status = "INACTIVE";
        target.lockedAt = null;
        target.statusReason = reason;
      } else {
        if (target.status !== "INACTIVE") throw new ApiError(409, "INVALID_STATE", "Not inactive");
        target.status = "ACTIVE";
        target.statusReason = null;
      }
      target.statusChangedAt = new Date().toISOString();
      target.statusChangedBy = actor.fullName;
      audit(db, actor.fullName, `ACCOUNT_${action.toUpperCase()}`, reason ? `${target.fullName} — ${reason}` : target.fullName);
      saveDb(db);
      return { account: toPublic(target) };
    },
  },
  {
    method: "POST",
    pattern: /^\/accounts\/([^/]+)\/resend-invite$/,
    handler({ db, params }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const target = findAccount(db, params[0]);
      if (target.status !== "INVITED") throw new ApiError(409, "INVALID_STATE", "Not an open invitation");
      const email = target.email.toLowerCase();
      const existing = db.otps.find((o) => o.email === email && o.purpose === "invite");
      if (existing && existing.resendAt > Date.now()) {
        throw new ApiError(429, "OTP_COOLDOWN", "Wait before requesting a new code", { resendAt: existing.resendAt });
      }
      const record = issueOtp(db, email, "invite");
      audit(db, actor.fullName, "INVITE_RESENT", target.fullName);
      saveDb(db);
      return { account: toPublic(target), ...otpTimes(record) };
    },
  },
  {
    method: "PUT",
    pattern: /^\/accounts\/([^/]+)$/,
    handler({ db, params, body }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const target = findAccount(db, params[0]);
      const fullName = String(body.fullName ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!fullName) throw new ApiError(400, "VALIDATION", "Full name is required.", { field: "fullName" });
      const cleanPhone = phone.replace(/[\s-]/g, "");
      const VN_PHONE_RE = /^0[35789]\d{8}$/;
      if (cleanPhone && !VN_PHONE_RE.test(cleanPhone)) {
        throw new ApiError(400, "VALIDATION", "Số điện thoại phải gồm 10 chữ số hợp lệ (bắt đầu bằng 03, 05, 07, 08, 09).", { field: "phone" });
      }
      const changes: string[] = [];
      const oldVals: Record<string, any> = {};
      const newVals: Record<string, any> = {};
      if (fullName !== target.fullName) {
        changes.push(`họ tên: ${target.fullName} → ${fullName}`);
        oldVals.fullName = target.fullName;
        newVals.fullName = fullName;
      }
      if (phone !== target.phone) {
        changes.push(`số điện thoại: ${target.phone || "—"} → ${phone || "—"}`);
        oldVals.phone = target.phone || "—";
        newVals.phone = phone || "—";
      }
      if (changes.length > 0) {
        audit(db, actor.fullName, "ACCOUNT_EDITED", `${target.fullName}: ${changes.join(", ")}`, oldVals, newVals);
        target.fullName = fullName;
        target.phone = phone;
        saveDb(db);
      }
      return { account: toPublic(target) };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/accounts\/([^/]+)$/,
    handler({ db, params }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const target = findAccount(db, params[0]);
      if (target.id === actor.id) throw new ApiError(409, "CANNOT_CHANGE_SELF", "Not allowed on your own account");
      if (!DELETABLE.includes(target.status)) throw new ApiError(409, "CANNOT_DELETE_USED", "Deactivate it instead");
      const email = target.email.toLowerCase();
      db.accounts = db.accounts.filter((a) => a.id !== target.id);
      db.otps = db.otps.filter((o) => o.email !== email);
      delete db.loginFails[email];
      audit(db, actor.fullName, "ACCOUNT_DELETED", `${target.fullName} (${target.email}, ${target.status})`);
      saveDb(db);
      return { ok: true };
    },
  },
  {
    method: "PUT",
    pattern: /^\/accounts\/([^/]+)\/permissions$/,
    handler({ db, params, body }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const target = findAccount(db, params[0]);
      const next = normalizePermissions(target.role, { ...target.permissions, ...(body.permissions as Partial<PermissionMap>) });
      let granted = 0;
      let revoked = 0;
      for (const p of PERMISSIONS) {
        if (next[p.key] && !target.permissions[p.key]) granted += 1;
        if (!next[p.key] && target.permissions[p.key]) revoked += 1;
      }
      target.permissions = next;
      target.permissionsChangedAt = new Date().toISOString();
      target.permissionsChangedBy = actor.fullName;
      audit(db, actor.fullName, "PERMISSIONS_CHANGED", `${target.fullName}: ${granted} granted, ${revoked} revoked`);
      saveDb(db);
      return { account: toPublic(target), granted, revoked };
    },
  },

  // ----- hồ sơ cá nhân -----
  {
    method: "PUT",
    pattern: /^\/me\/profile$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const fullName = String(body.fullName ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!fullName) throw new ApiError(400, "VALIDATION", "Full name is required.", { field: "fullName" });
      const cleanPhone = phone.replace(/[\s-]/g, "");
      const VN_PHONE_RE = /^0[35789]\d{8}$/;
      if (cleanPhone && !VN_PHONE_RE.test(cleanPhone)) {
        throw new ApiError(400, "VALIDATION", "Số điện thoại phải gồm 10 chữ số hợp lệ (bắt đầu bằng 03, 05, 07, 08, 09).", { field: "phone" });
      }
      const oldVals: Record<string, any> = {};
      const newVals: Record<string, any> = {};
      const changes: string[] = [];
      if (fullName !== user.fullName) {
        changes.push(`họ tên: ${user.fullName} → ${fullName}`);
        oldVals.fullName = user.fullName;
        newVals.fullName = fullName;
      }
      if (phone !== user.phone) {
        changes.push(`số điện thoại: ${user.phone || "—"} → ${phone || "—"}`);
        oldVals.phone = user.phone || "—";
        newVals.phone = phone || "—";
      }
      if (changes.length > 0) {
        audit(db, user.fullName, "PROFILE_UPDATED", `${user.fullName}: ${changes.join(", ")}`, oldVals, newVals);
      }
      user.fullName = fullName;
      user.phone = phone;
      saveDb(db);
      return { user: toPublic(user) };
    },
  },
  {
    method: "PUT",
    pattern: /^\/me\/notifications$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const key = body.key as NotifyKey;
      if (!(key in user.notify)) throw new ApiError(400, "VALIDATION", "Unknown notification");
      if (notifyLock(user.role, key).locked) throw new ApiError(409, "LOCKED", "This notification cannot be changed");
      user.notify[key] = Boolean(body.value);
      saveDb(db);
      return { user: toPublic(user) };
    },
  },
  // ---------------------------------------------------------------- Thông báo (C-01), giống BE /notifications
  {
    method: "GET",
    pattern: /^\/notifications$/,
    handler({ db }) {
      return notificationList(currentUser(db).role);
    },
  },
  {
    method: "POST",
    pattern: /^\/notifications\/read$/,
    handler({ db, body }) {
      const role = currentUser(db).role;
      const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
      updateMockNotifications(role, (n) => (ids.includes(n.id) ? { ...n, read: true } : n));
      return notificationList(role);
    },
  },
  {
    method: "POST",
    pattern: /^\/notifications\/read-all$/,
    handler({ db }) {
      const role = currentUser(db).role;
      updateMockNotifications(role, (n) => ({ ...n, read: true }));
      return notificationList(role);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/notifications$/,
    handler({ db }) {
      const role = currentUser(db).role;
      updateMockNotifications(role, () => null);
      return notificationList(role);
    },
  },
  {
    method: "POST",
    pattern: /^\/me\/password$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const current = String(body.current ?? "");
      const next = String(body.next ?? "");
      if (user.password !== current) throw new ApiError(400, "WRONG_PASSWORD", "Current password is wrong");
      if (next === current) throw new ApiError(400, "SAME_PASSWORD", "Same password");
      const weak = passwordError(next);
      if (weak) throw new ApiError(400, "WEAK_PASSWORD", weak);
      user.password = next;
      audit(db, user.fullName, "PASSWORD_CHANGED", "Changed in My Profile");
      saveDb(db);
      const due = new Date(Date.now() + PASSWORD_MAX_AGE_DAYS * 24 * 3600 * 1000).toISOString();
      return { nextChangeDue: due };
    },
  },

  // ----- 403: ghi nhật ký + xin cấp quyền -----
  {
    method: "POST",
    pattern: /^\/audit\/forbidden$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const now = new Date();
      const reference = `403-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(72 + db.audit.length).padStart(4, "0")}`;
      audit(db, user.fullName, "ACCESS_DENIED", `${String(body.screen ?? "")} (${reference})`);
      saveDb(db);
      const manager = db.accounts.find((a) => a.role === "CLUB_MANAGER" && a.status === "ACTIVE");
      return { reference, managerName: manager?.fullName ?? "the Club Manager" };
    },
  },
  {
    method: "POST",
    pattern: /^\/permission-requests$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const screen = String(body.screen ?? "");
      const reference = String(body.reference ?? "");
      // Đã có yêu cầu đang chờ cho cùng màn hình => cập nhật lại, không tạo trùng.
      const open = db.requests.find((r) => r.accountId === user.id && r.screen === screen && r.status === "OPEN");
      if (open) {
        open.reference = reference;
        open.at = new Date().toISOString();
      } else {
        const id = db.requests.reduce((max, r) => Math.max(max, r.id), 0) + 1;
        db.requests.unshift({ id, at: new Date().toISOString(), accountId: user.id, screen, reference, status: "OPEN", resolvedAt: null, resolvedBy: null });
      }
      audit(db, user.fullName, "PERMISSION_REQUESTED", screen);
      saveDb(db);
      return { ok: true };
    },
  },

  // ----- danh sách chờ của Club Manager -----
  {
    method: "GET",
    pattern: /^\/permission-requests$/,
    handler({ db, url }) {
      requirePermission(currentUser(db), "manageAccounts");
      const all = url.searchParams.get("status") === "ALL";
      const requests = db.requests
        .filter((r) => all || r.status === "OPEN")
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((r) => withAccount(db, r));
      return { requests };
    },
  },
  {
    method: "POST",
    pattern: /^\/permission-requests\/(\d+)\/resolve$/,
    handler({ db, params, body }) {
      const actor = currentUser(db);
      requirePermission(actor, "manageAccounts");
      const status = body.status;
      if (status !== "GRANTED" && status !== "DISMISSED") throw new ApiError(400, "VALIDATION", "Status must be GRANTED or DISMISSED");
      const request = db.requests.find((r) => r.id === Number(params[0]));
      if (!request) throw new ApiError(404, "NOT_FOUND", "Request not found");
      if (request.status !== "OPEN") throw new ApiError(409, "INVALID_STATE", "Request already handled");
      request.status = status;
      request.resolvedAt = new Date().toISOString();
      request.resolvedBy = actor.fullName;
      const who = db.accounts.find((a) => a.id === request.accountId)?.fullName ?? "unknown";
      audit(db, actor.fullName, `PERMISSION_REQUEST_${status}`, `${who}: ${request.screen} (${request.reference})`);
      saveDb(db);
      return { request: withAccount(db, request) };
    },
  },

  // ===== FLOW 3: MEDICAL & HEALTH ROUTES =====
  {
    method: "GET",
    pattern: /^\/medical\/horses\/([^/]+)\/injuries$/,
    handler({ params, url }) {
      const horseId = params[0];
      const list = getInjuriesForHorse(horseId);
      const viewSide = url.searchParams.get("viewSide");
      const layer = url.searchParams.get("layer");

      let filtered = list;
      if (viewSide) {
        filtered = filtered.filter((inj) => (inj.viewSide || inj.view) === viewSide);
      }
      if (layer) {
        filtered = filtered.filter((inj) => inj.layer === layer);
      }

      return filtered.map((inj) => ({
        id: inj.id,
        horseId: inj.horseId,
        coordinateX: inj.coordinateX !== undefined ? inj.coordinateX : (inj.x > 1 ? Number((inj.x / 100).toFixed(4)) : inj.x),
        coordinateY: inj.coordinateY !== undefined ? inj.coordinateY : (inj.y > 1 ? Number((inj.y / 100).toFixed(4)) : inj.y),
        viewSide: inj.viewSide || inj.view || "LEFT",
        layer: inj.layer || "MUSCLE",
        anatomicalZone: inj.anatomicalZone || inj.region || "Superficial Digital Flexor Tendon (SDFT)",
        bodySide: inj.bodySide || inj.view || "LEFT",
        injuryType: inj.injuryType || "Tendon Strain",
        severity: inj.severity || "MODERATE",
        stage: inj.stage || "ACUTE",
        status: inj.stage === "HEALED" ? "RESOLVED" : "ACTIVE",
        description: inj.description || inj.notes || null,
        discoveryDate: inj.discoveryDate || inj.detectedDate || new Date().toISOString(),
        recoveryHistory: inj.recoveryHistory || inj.recoveryTimeline || [],
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/injuries$/,
    handler({ body }) {
      const b = (body as any) || {};
      const horseId = String(b.horseId);
      const rawX = Number(b.coordinateX ?? 0.5);
      const rawY = Number(b.coordinateY ?? 0.5);
      const normX = rawX > 1 ? Number((rawX / 100).toFixed(4)) : rawX;
      const normY = rawY > 1 ? Number((rawY / 100).toFixed(4)) : rawY;

      const newInj = {
        id: `inj-${Date.now()}`,
        horseId,
        coordinateX: normX,
        coordinateY: normY,
        x: Math.round(normX * 100),
        y: Math.round(normY * 100),
        viewSide: b.viewSide || "LEFT",
        view: b.viewSide || "LEFT",
        layer: b.layer || "MUSCLE",
        anatomicalZone: b.anatomicalZone || "Limb",
        region: b.anatomicalZone || "Limb",
        bodySide: b.bodySide || b.viewSide || "LEFT",
        injuryType: b.injuryType || "Strain",
        severity: b.severity || "MODERATE",
        stage: b.stage || "ACUTE",
        status: b.stage === "HEALED" ? "RESOLVED" : "ACTIVE",
        description: b.description || null,
        notes: b.description || null,
        discoveryDate: b.discoveryDate || new Date().toISOString(),
        recoveryHistory: [
          {
            id: `hist-${Date.now()}`,
            stage: b.stage || "ACUTE",
            evaluationDate: b.discoveryDate || new Date().toISOString(),
            severity: b.severity || "MODERATE",
            notes: b.description || "Ghi nhận vị trí chấn thương ban đầu",
            updatedByName: "Veterinarian",
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const existing = getInjuriesForHorse(horseId);
      saveInjuriesForHorse(horseId, [...existing, newInj]);

      const recommendMedicalLock = newInj.severity === "SEVERE" || newInj.severity === "CRITICAL";
      return {
        ...newInj,
        recommendMedicalLock,
        recommendationMessage: recommendMedicalLock ? "Chấn thương nặng. Cân nhắc đặt Khóa huấn luyện." : null,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/injuries\/([^/]+)$/,
    handler({ params }) {
      const id = params[0];
      const horses = getStoredHorses();
      for (const h of horses) {
        const injs = getInjuriesForHorse(h.id);
        const matched = injs.find((i) => i.id === id);
        if (matched) return matched;
      }
      throw new ApiError(404, "NOT_FOUND", "Injury point not found");
    },
  },
  {
    method: "PUT",
    pattern: /^\/medical\/injuries\/([^/]+)$/,
    handler({ params, body }) {
      const id = params[0];
      const b = (body as any) || {};
      const horses = getStoredHorses();
      for (const h of horses) {
        const injs = getInjuriesForHorse(h.id);
        const idx = injs.findIndex((i) => i.id === id);
        if (idx !== -1) {
          const rawX = b.coordinateX !== undefined ? Number(b.coordinateX) : injs[idx].coordinateX;
          const rawY = b.coordinateY !== undefined ? Number(b.coordinateY) : injs[idx].coordinateY;
          const normX = rawX > 1 ? Number((rawX / 100).toFixed(4)) : rawX;
          const normY = rawY > 1 ? Number((rawY / 100).toFixed(4)) : rawY;

          const updated = {
            ...injs[idx],
            ...b,
            coordinateX: normX,
            coordinateY: normY,
            x: Math.round(normX * 100),
            y: Math.round(normY * 100),
            stage: b.stage || injs[idx].stage,
            status: (b.stage || injs[idx].stage) === "HEALED" ? "RESOLVED" : "ACTIVE",
          };
          injs[idx] = updated;
          saveInjuriesForHorse(h.id, injs);
          return updated;
        }
      }
      throw new ApiError(404, "NOT_FOUND", "Injury point not found");
    },
  },
  {
    method: "DELETE",
    pattern: /^\/medical\/injuries\/([^/]+)$/,
    handler({ params }) {
      const id = params[0];
      const horses = getStoredHorses();
      for (const h of horses) {
        const injs = getInjuriesForHorse(h.id);
        const filtered = injs.filter((i) => i.id !== id);
        if (filtered.length !== injs.length) {
          saveInjuriesForHorse(h.id, filtered);
          return { message: "Đã xóa điểm chấn thương thành công" };
        }
      }
      throw new ApiError(404, "NOT_FOUND", "Injury point not found");
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/injuries\/([^/]+)\/recovery$/,
    handler({ params, body }) {
      const id = params[0];
      const b = (body as any) || {};
      const horses = getStoredHorses();
      for (const h of horses) {
        const injs = getInjuriesForHorse(h.id);
        const idx = injs.findIndex((i) => i.id === id);
        if (idx !== -1) {
          const injury = injs[idx];
          const newStage = b.stage || injury.stage;
          const newSeverity = b.severity || injury.severity;
          const histEntry = {
            id: `hist-${Date.now()}`,
            stage: newStage,
            severity: newSeverity,
            evaluationDate: b.evaluationDate || new Date().toISOString(),
            notes: b.notes || "Tiến trình hồi phục được ghi nhận",
            updatedByName: "Veterinarian",
            createdAt: new Date().toISOString(),
          };
          injury.stage = newStage;
          injury.severity = newSeverity;
          injury.status = newStage === "HEALED" ? "RESOLVED" : "ACTIVE";
          injury.recoveryHistory = [...(injury.recoveryHistory || []), histEntry];
          if (b.notes) {
            injury.description = injury.description ? `${injury.description}\n${b.notes}` : b.notes;
          }
          injs[idx] = injury;
          saveInjuriesForHorse(h.id, injs);
          return { message: "Cập nhật tiến trình hồi phục thành công", injury };
        }
      }
      throw new ApiError(404, "NOT_FOUND", "Injury point not found");
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/horses\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      return buildMockProfile(params[0], user.role);
    },
  },
  {
    method: "GET",
    pattern: /^\/horses\/([^/]+)\/health-board$/,
    handler({ db, params }) {
      const user = currentUser(db);
      return buildMockProfile(params[0], user.role);
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/horses\/([^/]+)\/observations$/,
    handler({ params, url }) {
      const store = getMockMedicalStore();
      const urgency = url.searchParams.get("urgency");
      const list = store.observations.filter(
        (o) => o.horseId === params[0] && (!urgency || o.urgency === urgency),
      );
      return { observations: list };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/records$/,
    handler({ url }) {
      const store = getMockMedicalStore();
      const horseId = url.searchParams.get("horseId");
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search")?.toLowerCase();

      let list = store.records;
      if (horseId) list = list.filter((r) => r.horseId === horseId);
      if (status) list = list.filter((r) => r.status === status);
      if (search) {
        list = list.filter(
          (r) =>
            r.recordNumber.toLowerCase().includes(search) ||
            r.horseName?.toLowerCase().includes(search) ||
            r.diagnosis?.toLowerCase().includes(search),
        );
      }

      return {
        records: list,
        total: list.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/records\/([^/]+)$/,
    handler({ params }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0] || r.recordNumber === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Medical record not found");
      return { record: rec };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const store = getMockMedicalStore();
      const id = `rec-${Date.now()}`;
      const seq = store.records.length + 1;
      const recordNumber = `BA-26${String(seq).padStart(4, "0")}`;

      const newRec: MedicalRecord = {
        id,
        recordNumber,
        horseId: String(body.horseId || "horse-1"),
        horseName: body.horseId === "horse-2" ? "Xích Thố" : "Bạch Long Mã",
        status: body.saveAsDraft ? "DRAFT" : "OPEN",
        examinationDate: String(body.examinationDate || new Date().toISOString()),
        examinationType: String(body.examinationType || "General Examination"),
        examinationReason: String(body.examinationReason || "Routine checkup"),
        symptoms: body.symptoms ? String(body.symptoms) : undefined,
        discoverySource: body.discoverySource ? String(body.discoverySource) : undefined,
        vitals: body.vitals as any,
        labTests: (body.labTests as any) || [],
        diagnosis: body.diagnosis ? String(body.diagnosis) : undefined,
        severity: (body.severity as any) || "MODERATE",
        proposedStatus: body.proposedStatus ? String(body.proposedStatus) : undefined,
        proposeMedicalLock: Boolean(body.proposeMedicalLock),
        treatmentPhases: [],
        prescriptions: [],
        followUps: [],
        createdAt: new Date().toISOString(),
        vetId: user.id,
        vetName: user.fullName,
      };

      store.records.unshift(newRec);
      saveMockMedicalStore(store);
      return { record: newRec };
    },
  },
  {
    method: "PUT",
    pattern: /^\/medical\/records\/([^/]+)$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      if (rec.status !== "DRAFT") throw new ApiError(400, "INVALID_STATE", "Only DRAFT records can be edited");

      Object.assign(rec, {
        examinationDate: body.examinationDate || rec.examinationDate,
        examinationType: body.examinationType || rec.examinationType,
        examinationReason: body.examinationReason || rec.examinationReason,
        symptoms: body.symptoms !== undefined ? body.symptoms : rec.symptoms,
        discoverySource: body.discoverySource || rec.discoverySource,
        vitals: body.vitals || rec.vitals,
        labTests: body.labTests || rec.labTests,
        diagnosis: body.diagnosis !== undefined ? body.diagnosis : rec.diagnosis,
        severity: body.severity || rec.severity,
        proposedStatus: body.proposedStatus || rec.proposedStatus,
        proposeMedicalLock: body.proposeMedicalLock !== undefined ? body.proposeMedicalLock : rec.proposeMedicalLock,
      });

      saveMockMedicalStore(store);
      return { record: rec };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/medical\/records\/([^/]+)$/,
    handler({ params }) {
      const store = getMockMedicalStore();
      const idx = store.records.findIndex((r) => r.id === params[0]);
      if (idx === -1) throw new ApiError(404, "NOT_FOUND", "Record not found");
      store.records.splice(idx, 1);
      saveMockMedicalStore(store);
      return { ok: true };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/finalize$/,
    handler({ params }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      rec.status = "OPEN";
      saveMockMedicalStore(store);
      return { record: rec };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/treatment-phases$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      const phase: TreatmentPhase = {
        id: `phase-${Date.now()}`,
        phaseName: String(body.phaseName || "Phase"),
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        target: String(body.target),
        allowedActivity: String(body.allowedActivity),
        careInstructions: (body.careInstructions as any) || [],
      };
      rec.treatmentPhases = rec.treatmentPhases || [];
      rec.treatmentPhases.push(phase);
      saveMockMedicalStore(store);
      return { phase };
    },
  },
  {
    method: "PUT",
    pattern: /^\/medical\/records\/([^/]+)\/treatment-phases\/([^/]+)$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      const phaseId = params[1];
      const phase = rec.treatmentPhases?.find((p) => p.id === phaseId);
      if (!phase) throw new ApiError(404, "NOT_FOUND", "Treatment phase not found");
      const b = (body as any) || {};
      if (b.phaseName) phase.phaseName = String(b.phaseName);
      if (b.startDate) phase.startDate = String(b.startDate);
      if (b.endDate) phase.endDate = String(b.endDate);
      if (b.target) phase.target = String(b.target);
      if (b.allowedActivity) phase.allowedActivity = String(b.allowedActivity);
      if (b.careInstructions) phase.careInstructions = b.careInstructions;
      saveMockMedicalStore(store);
      return { message: "Đã cập nhật phác đồ điều trị thành công", dto: b, record: rec };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/prescriptions$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      const rx: PrescriptionItem = {
        id: `rx-${Date.now()}`,
        medicationName: String(body.medicationName),
        dosage: Number(body.dosage),
        unit: String(body.unit),
        route: String(body.route),
        frequencyPerDay: Number(body.frequencyPerDay),
        startDate: String(body.startDate),
        daysCount: Number(body.daysCount),
        withdrawalDays: body.withdrawalDays ? Number(body.withdrawalDays) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
        status: "ACTIVE",
      };
      rec.prescriptions = rec.prescriptions || [];
      rec.prescriptions.push(rx);
      saveMockMedicalStore(store);
      return { prescription: rx };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/prescriptions\/([^/]+)\/stop$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      const rx = rec.prescriptions?.find((p) => p.id === params[1]);
      if (!rx) throw new ApiError(404, "NOT_FOUND", "Prescription not found");
      rx.status = "STOPPED";
      rx.stoppedReason = String(body.stoppedReason || "Discontinued");
      rx.stoppedDate = String(body.stoppedDate || new Date().toISOString().split("T")[0]);
      saveMockMedicalStore(store);
      return { prescription: rx };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/follow-ups$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      const fu: FollowUpItem = {
        id: `fu-${Date.now()}`,
        followUpDate: String(body.followUpDate || new Date().toISOString()),
        temperature: Number(body.temperature),
        restingHeartRate: Number(body.restingHeartRate),
        respiratoryRate: Number(body.respiratoryRate),
        progressNotes: String(body.progressNotes),
        adjustments: body.adjustments ? String(body.adjustments) : undefined,
        vetName: user.fullName,
      };
      rec.followUps = rec.followUps || [];
      rec.followUps.unshift(fu);
      saveMockMedicalStore(store);
      return { followUp: fu };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/close$/,
    handler({ params, body }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      rec.status = "CLOSED";
      rec.conclusion = String(body.conclusion);
      rec.treatmentResult = String(body.treatmentResult || "Full Recovery");
      rec.closedAt = new Date().toISOString();
      if (rec.prescriptions) {
        for (const p of rec.prescriptions) {
          if (p.status === "ACTIVE") p.status = "COMPLETED";
        }
      }
      saveMockMedicalStore(store);
      return { record: rec };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/records\/([^/]+)\/reopen$/,
    handler({ params }) {
      const store = getMockMedicalStore();
      const rec = store.records.find((r) => r.id === params[0]);
      if (!rec) throw new ApiError(404, "NOT_FOUND", "Record not found");
      rec.status = "OPEN";
      saveMockMedicalStore(store);
      return { record: rec };
    },
  },

  // ===== TRAINING LOCKS ROUTES (TASK P2-04 / DL-3.01 -> DL-3.03) =====
  {
    method: "GET",
    pattern: /^\/medical\/locks$/,
    handler() {
      const stored = getStoredLocks();
      return stored.map((l) => ({
        id: l.id,
        lockCode: l.lockCode,
        horseId: l.horseId,
        horseName: l.horseName,
        horseCode: l.horseCode,
        appliedMedicalStatus: l.appliedMedicalStatus,
        lockedAt: l.lockedAt,
        lockedBy: l.lockedBy,
        lockReason: l.lockReason,
        reviewDate: l.reviewDate,
        releasedAt: l.releasedAt,
        releasedBy: l.releasedBy,
        releaseReason: l.releaseReason,
        durationDays: l.durationDays,
        status: l.status,
      }));
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/locks$/,
    handler({ body }) {
      const horseId = String(body.horseId);
      const expectedDays = Number(body.expectedRestDays || 7);
      const reviewDate = body.reviewDate ? String(body.reviewDate) : new Date(Date.now() + expectedDays * 86400000).toISOString().split("T")[0];
      const lock = placeHorseTrainingLock(horseId, {
        appliedStatus: String(body.medicalStatus || "INJURED"),
        reviewDate,
        reason: String(body.lockReason || "Under protective clinical training suspension"),
        unlockConditions: body.unlockConditions ? String(body.unlockConditions) : undefined,
      });
      return { ok: true, lock };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/locks\/([^/]+)\/release$/,
    handler({ params, body }) {
      const lockId = params[0];
      const locks = getStoredLocks();
      const matched = locks.find((l) => l.id === lockId || l.horseId === lockId);
      const horseId = matched?.horseId || lockId;
      const releaseReason = String(body.unlockReason || body.releaseReason || "Fit for normal activity");
      const targetStatus = String(body.newHorseStatus || body.targetStatus || "FIT");

      const releasedLock = liftHorseTrainingLock(horseId, {
        restoreStatus: targetStatus,
        reason: releaseReason,
      });
      return { ok: true, lock: releasedLock };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/locks\/([^/]+)\/extend$/,
    handler({ params, body }) {
      const lockId = params[0];
      const locks = getStoredLocks();
      const matched = locks.find((l) => l.id === lockId || l.horseId === lockId);
      const horseId = matched?.horseId || lockId;
      const additionalDays = Number(body.additionalDays || 7);
      const reason = String(body.recheckNotes || body.reason || "Extended recovery needed");
      const currentReview = matched?.reviewDate || new Date().toISOString().split("T")[0];
      const newReviewDate = new Date(new Date(currentReview).getTime() + additionalDays * 86400000).toISOString().split("T")[0];

      const extended = extendHorseTrainingLock(horseId, {
        newReviewDate,
        reason,
      });
      return { ok: true, lock: extended };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/preventive\/catalogs$/,
    handler({ url }) {
      const catalogs = getStoredPreventiveCatalogs();
      const category = url.searchParams.get("category");
      const isActive = url.searchParams.get("isActive");

      let filtered = catalogs;
      if (category) filtered = filtered.filter((c) => c.category === category);
      if (isActive !== null && isActive !== undefined) {
        filtered = filtered.filter((c) => String(c.isActive) === isActive);
      }
      return filtered;
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/preventive\/catalogs$/,
    handler({ body }) {
      const b = (body as any) || {};
      const catalogs = getStoredPreventiveCatalogs();
      const newCat = {
        id: `cat-${Date.now()}`,
        code: String(b.code || "CAT_CUSTOM").toUpperCase(),
        name: String(b.name || "Custom Preventive Care"),
        category: b.category || "VACCINATION",
        intervalDays: Number(b.intervalDays || 90),
        advanceNoticeDays: Number(b.advanceNoticeDays || 7),
        applyToNewHorses: Boolean(b.applyToNewHorses ?? true),
        isActive: true,
        description: b.description || null,
        monitoredHorsesCount: 0,
      };
      saveStoredPreventiveCatalogs([...catalogs, newCat]);
      return newCat;
    },
  },
  {
    method: "PUT",
    pattern: /^\/medical\/preventive\/catalogs\/([^/]+)$/,
    handler({ params, body }) {
      const id = params[0];
      const catalogs = getStoredPreventiveCatalogs();
      const idx = catalogs.findIndex((c) => c.id === id);
      if (idx === -1) throw new ApiError(404, "NOT_FOUND", "Catalog not found");
      const b = (body as any) || {};
      catalogs[idx] = { ...catalogs[idx], ...b };
      saveStoredPreventiveCatalogs(catalogs);
      return catalogs[idx];
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/preventive\/catalogs\/([^/]+)\/toggle-status$/,
    handler({ params }) {
      const id = params[0];
      const catalogs = getStoredPreventiveCatalogs();
      const idx = catalogs.findIndex((c) => c.id === id);
      if (idx === -1) throw new ApiError(404, "NOT_FOUND", "Catalog not found");
      catalogs[idx].isActive = !catalogs[idx].isActive;
      saveStoredPreventiveCatalogs(catalogs);
      return {
        ...catalogs[idx],
        message: catalogs[idx].isActive
          ? `Đã kích hoạt lại loại chăm sóc '${catalogs[idx].name}'`
          : `Đã ngừng sử dụng loại chăm sóc '${catalogs[idx].name}'`,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/preventive\/schedules$/,
    handler({ url }) {
      const schedules = getStoredPreventiveSchedules();
      const catalogs = getStoredPreventiveCatalogs();
      const horses = getStoredHorses();

      const horseId = url.searchParams.get("horseId");
      const category = url.searchParams.get("category");
      const statusFilter = url.searchParams.get("status");
      const search = url.searchParams.get("search")?.toLowerCase().trim();
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);

      const now = new Date();
      let overdueCount = 0;
      let upcoming7DaysCount = 0;
      let upcoming30DaysCount = 0;

      const mapped = schedules.map((sch) => {
        const cat = catalogs.find((c) => c.id === sch.typeCatalogId);
        const horse = horses.find((h) => h.id === sch.horseId);
        const dueDate = new Date(sch.dueDate);
        const isOverdue = dueDate < now;
        const isUpcoming7 = !isOverdue && dueDate <= new Date(now.getTime() + 7 * 86400000);
        const isUpcoming30 = !isOverdue && dueDate <= new Date(now.getTime() + 30 * 86400000);
        const noticeDays = cat?.advanceNoticeDays || 7;
        const isNotice = !isOverdue && dueDate <= new Date(now.getTime() + noticeDays * 86400000);

        if (isOverdue) overdueCount++;
        if (isUpcoming7) upcoming7DaysCount++;
        if (isUpcoming30) upcoming30DaysCount++;

        let statusBadge = "NORMAL";
        if (isOverdue) statusBadge = "OVERDUE";
        else if (isNotice) statusBadge = "UPCOMING";
        else if (!sch.lastCompletedDate && !sch.completedDate) statusBadge = "NODATA";

        return {
          ...sch,
          horse: horse
            ? {
                id: horse.id,
                name: horse.name,
                microchipRfid: horse.microchipRfid || horse.code,
                status: horse.statusText || "ACTIVE",
                stallAllocations: [{ stall: { code: horse.stall, zone: horse.zone } }],
              }
            : null,
          typeCatalog: cat || { id: sch.typeCatalogId, name: sch.scheduleType, category: sch.scheduleType, intervalDays: 90, advanceNoticeDays: 7 },
          stallCode: horse?.stall || null,
          zone: horse?.zone || null,
          statusBadge,
          isOverdue,
          isUpcomingNotice: isNotice,
          daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / 86400000),
        };
      });

      let filtered = mapped;
      if (horseId) filtered = filtered.filter((s) => s.horseId === horseId);
      if (category) filtered = filtered.filter((s) => s.scheduleType === category || s.typeCatalog?.category === category);
      if (statusFilter) {
        if (statusFilter === "OVERDUE") filtered = filtered.filter((s) => s.statusBadge === "OVERDUE");
        else if (statusFilter === "UPCOMING") filtered = filtered.filter((s) => s.statusBadge === "UPCOMING");
        else if (statusFilter === "NORMAL") filtered = filtered.filter((s) => s.statusBadge === "NORMAL");
        else if (statusFilter === "NODATA") filtered = filtered.filter((s) => s.statusBadge === "NODATA");
        else if (statusFilter === "UPCOMING_7") filtered = filtered.filter((s) => s.isUpcomingNotice);
      }
      if (search) {
        filtered = filtered.filter(
          (s) =>
            s.horse?.name.toLowerCase().includes(search) ||
            s.horse?.microchipRfid.toLowerCase().includes(search) ||
            s.typeCatalog?.name.toLowerCase().includes(search),
        );
      }

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginated = filtered.slice(skip, skip + limit);

      return {
        counts: {
          overdue: overdueCount,
          upcoming7Days: upcoming7DaysCount,
          upcoming30Days: upcoming30DaysCount,
          total: schedules.length,
        },
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/preventive\/record$/,
    handler({ body }) {
      const b = (body as any) || {};
      const schedules = getStoredPreventiveSchedules();
      const scheduleId = b.scheduleId;
      const matchedIdx = schedules.findIndex((s) => s.id === scheduleId || (b.horseId && s.horseId === b.horseId && b.typeCatalogId && s.typeCatalogId === b.typeCatalogId));

      const performedDate = b.performedDate || new Date().toISOString();
      const nextDue = b.customNextDueDate || new Date(Date.now() + 90 * 86400000).toISOString();

      if (matchedIdx !== -1) {
        const sch = schedules[matchedIdx];
        sch.status = "COMPLETED";
        sch.lastCompletedDate = performedDate;
        sch.completedDate = performedDate;
        sch.dueDate = nextDue;
        sch.performedByName = b.performedByName || "Veterinarian";
        sch.productAdministered = b.productAdministered || "Equi-Standard Formulation";
        sch.notes = b.notes || sch.notes;
        schedules[matchedIdx] = sch;
        saveStoredPreventiveSchedules(schedules);
        return { message: "Ghi nhận hoàn thành định kỳ thành công", schedule: sch };
      }

      return { message: "Ghi nhận thành công", body };
    },
  },
  {
    method: "POST",
    pattern: /^\/medical\/preventive\/schedules$/,
    handler({ body }) {
      const b = (body as any) || {};
      const schedules = getStoredPreventiveSchedules();
      const catalogs = getStoredPreventiveCatalogs();
      const horses = getStoredHorses();
      const horse = horses.find((h) => h.id === b.horseId);
      const catalog = catalogs.find((c) => c.id === b.typeCatalogId);

      const id = `sch-${Date.now()}`;
      const newSchedule = {
        id,
        horseId: b.horseId,
        typeCatalogId: b.typeCatalogId || catalogs[0]?.id || "cat-1",
        scheduleType: b.category || catalog?.category || "VACCINATION",
        dueDate: b.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        status: "PENDING",
        notes: b.notes || null,
        horse: horse ? { id: horse.id, name: horse.name, microchipRfid: horse.code || horse.microchip } : null,
        typeCatalog: catalog || { id: "cat-1", name: b.type || "Routine Care", category: b.category || "VACCINATION", intervalDays: 90, advanceNoticeDays: 7 },
      };
      schedules.unshift(newSchedule as any);
      saveStoredPreventiveSchedules(schedules);
      return newSchedule;
    },
  },
  {
    method: "GET",
    pattern: /^\/horse-catalogs$/,
    handler({ db, url }) {
      currentUser(db);
      const type = url.searchParams.get("type");
      const status = url.searchParams.get("status") ?? "ALL";
      const q = (url.searchParams.get("search") ?? "").toLowerCase();
      const horses = getStoredHorses() as Array<{ breed?: string; color?: string }>;
      return getStoredHorseCatalog()
        .filter(
          (i) =>
            (!type || i.type === type) &&
            (status === "ALL" || (status === "ACTIVE") === i.isActive) &&
            (!q || i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((i) => ({
          ...i,
          horseCount: horses.filter(
            (h) => (i.type === "BREED" ? h.breed : h.color)?.toLowerCase() === i.name.toLowerCase(),
          ).length,
        }));
    },
  },
  {
    method: "POST",
    pattern: /^\/horse-catalogs$/,
    handler({ db, body }) {
      if (currentUser(db).role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Forbidden");
      const items = getStoredHorseCatalog();
      const type = String(body.type) as "BREED" | "COLOR";
      const code = String(body.code ?? "").toUpperCase();
      const name = String(body.name ?? "").trim();
      if (items.some((i) => i.type === type && i.code === code)) throw new ApiError(409, "DUPLICATE_CATALOG_CODE", "Mã đã tồn tại.");
      if (items.some((i) => i.type === type && i.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError(409, "DUPLICATE_CATALOG_NAME", "Tên đã tồn tại.");
      }
      const item = {
        id: `${type.toLowerCase()}-${Date.now()}`,
        type,
        code,
        name,
        description: (body.description as string) || null,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: true,
      };
      saveStoredHorseCatalog([...items, item]);
      return item;
    },
  },
  {
    method: "PUT",
    pattern: /^\/horse-catalogs\/([^/]+)$/,
    handler({ db, params, body }) {
      if (currentUser(db).role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Forbidden");
      const items = getStoredHorseCatalog();
      const item = items.find((i) => i.id === params[0]);
      if (!item) throw new ApiError(404, "CATALOG_ITEM_NOT_FOUND", "Không tìm thấy mục danh mục.");
      Object.assign(item, {
        ...(body.name !== undefined && { name: String(body.name).trim() }),
        ...(body.description !== undefined && { description: (body.description as string) || null }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
      });
      saveStoredHorseCatalog(items);
      return item;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/horse-catalogs\/([^/]+)\/status$/,
    handler({ db, params, body }) {
      if (currentUser(db).role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Forbidden");
      const items = getStoredHorseCatalog();
      const item = items.find((i) => i.id === params[0]);
      if (!item) throw new ApiError(404, "CATALOG_ITEM_NOT_FOUND", "Không tìm thấy mục danh mục.");
      item.isActive = Boolean(body.isActive);
      saveStoredHorseCatalog(items);
      return item;
    },
  },

  // ---- SC-3.01 Sơ đồ sức khỏe (bản giả của GET /medical/health-board, dựng từ kho ngựa giả)
  {
    method: "POST",
    pattern: /^\/simulator\/horses\/([^/]+)\/exams\/start$/,
    handler({ db, params }) {
      currentUser(db);
      return {
        sessionId: `exam-${params[0]}`,
        status: "PENDING",
        launchUrl: `http://localhost:5175/?sessionId=exam-${params[0]}`,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/simulator\/horses\/([^/]+)\/exams\/latest$/,
    handler({ db, params }) {
      currentUser(db);
      return {
        sessionId: `exam-${params[0]}`,
        status: "COMPLETED",
        resultDraft: {
          temperature: 38.3,
          restingHeartRate: 39,
          respiratoryRate: 14,
          weightKg: 487,
          capturedAt: "2026-10-23T01:00:00.000Z",
          modelVersion: "equiflow-sim-v3",
          source: "EQUIFLOW_SIMULATOR",
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/medical\/health-board$/,
    handler({ db }) {
      currentUser(db);
      const GROUP: Record<string, "QUALIFIED" | "OBSERVATION" | "INJURED" | "ISOLATED"> = {
        UNDER_OBSERVATION: "OBSERVATION",
        INJURED: "INJURED",
        ISOLATED: "ISOLATED",
      };
      const data = getStoredHorses()
        .filter((h) => horseStatusOf(h) !== "RETIRED")
        .map((h) => {
          const status = horseStatusOf(h);
          return {
            id: h.id,
            name: h.name,
            horseCode: h.horseCode ?? h.code,
            microchipRfid: h.microchipRfid ?? h.code,
            status,
            healthGroup: GROUP[status] ?? "QUALIFIED",
            isMedicalLocked: h.isLocked,
            lock: h.isLocked ? { lockedAt: new Date().toISOString(), recheckDate: null, veterinarianName: null } : null,
            stallCode: h.stall || null,
            zone: h.zone ?? null,
            openInjuries: [],
            latestRecord: null,
            preventiveDue: [],
            hasOverduePreventive: false,
            latestObservation: null,
          };
        });
      const count = (g: string) => data.filter((h) => h.healthGroup === g).length;
      return {
        summary: {
          qualifiedCount: count("QUALIFIED"),
          observationCount: count("OBSERVATION"),
          injuredCount: count("INJURED"),
          isolatedCount: count("ISOLATED"),
          lockedCount: data.filter((h) => h.isMedicalLocked).length,
          overdueCount: 0,
          total: data.length,
        },
        data,
      };
    },
  },

  // ---- Flow 1: Horse Profile Mock Routes (P1-07)
  {
    method: "GET",
    pattern: /^\/horses$/,
    handler({ db, url }) {
      const user = currentUser(db);
      const stored = getStoredHorses();
      const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
      const status = url.searchParams.get("status") || "ALL";
      const isLocked = url.searchParams.get("isMedicalLocked");
      const breed = url.searchParams.get("breed");
      const gender = url.searchParams.get("gender");
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      let list = stored.map((h: any) => {
        const st = horseStatusOf(h);

        let microchip = h.microchip || h.code;
        let microchipRfid = h.code || h.microchip || "985141002341001";
        if (user.role === "GROOM") {
          if (microchip && microchip.length > 4) {
            microchip = "*".repeat(microchip.length - 4) + microchip.slice(-4);
          }
          if (microchipRfid && microchipRfid.length > 4) {
            microchipRfid = "*".repeat(microchipRfid.length - 4) + microchipRfid.slice(-4);
          }
        }

        return {
          id: h.id,
          horseCode: h.horseCode || (h.id.startsWith("horse-") ? `HR-${h.id.slice(-6)}` : `HR-000001`),
          name: h.name,
          microchip,
          microchipRfid,
          breed: h.breed || "Thoroughbred",
          dob: h.dob || "2021-04-12",
          gender: h.gender || "Colt",
          color: h.color || "Bay Dark",
          weightKg: h.weightKg || 485,
          status: st,
          isMedicalLocked: Boolean(h.isLocked),
          ownerId: h.ownerId || "owner-1",
          ownerName: h.ownerName || "Phan Đức Long",
          owner: { id: h.ownerId || "owner-1", fullName: h.ownerName || "Phan Đức Long", email: "owner@gmail.com" },
          stallCode: user.role === "HORSE_OWNER" ? null : (h.stall || "STALL-A01"),
          zone: user.role === "HORSE_OWNER" ? null : "Zone A - Barn 1",
          primaryGroom: user.role === "HORSE_OWNER" ? null : "Lê Văn Phúc",
          createdAt: h.createdAt || new Date().toISOString(),
          updatedAt: h.updatedAt || new Date().toISOString(),
        };
      });

      // Role scoping: Owner chỉ xem ngựa sở hữu
      if (user.role === "HORSE_OWNER") {
        list = list.filter((h) => h.ownerId === user.id);
      }

      if (status && status !== "ALL") {
        list = list.filter((h) => h.status === status);
      }
      if (isLocked !== null && isLocked !== undefined && isLocked !== "") {
        const lockBool = isLocked === "true";
        list = list.filter((h) => h.isMedicalLocked === lockBool);
      }
      if (breed && breed !== "ALL") {
        list = list.filter((h) => h.breed.toLowerCase() === breed.toLowerCase());
      }
      if (gender && gender !== "ALL") {
        list = list.filter((h) => h.gender.toLowerCase() === gender.toLowerCase());
      }
      if (search) {
        list = list.filter(
          (h) =>
            h.name.toLowerCase().includes(search) ||
            (h.horseCode && h.horseCode.toLowerCase().includes(search)) ||
            (h.microchip && h.microchip.toLowerCase().includes(search)) ||
            h.breed.toLowerCase().includes(search),
        );
      }

      const total = list.length;
      const skip = (page - 1) * limit;
      const items = list.slice(skip, skip + limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/horses\/deleted$/,
    handler({ db, url }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Only Club Manager can view deleted horses.");
      const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      let list = getDeletedHorses().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
      if (search) {
        list = list.filter(
          (h) =>
            h.name.toLowerCase().includes(search) ||
            (h.horseCode || "").toLowerCase().includes(search) ||
            (h.microchip || h.code || "").includes(search),
        );
      }
      if (from) list = list.filter((h) => h.deletedAt.slice(0, 10) >= from);
      if (to) list = list.filter((h) => h.deletedAt.slice(0, 10) <= to);
      const total = list.length;
      return {
        items: list.slice((page - 1) * limit, page * limit).map((h) => ({
          id: h.id,
          horseCode: h.horseCode || null,
          name: h.name,
          microchip: h.microchip || h.code,
          status: horseStatusOf(h),
          deletedAt: h.deletedAt,
          deletedBy: h.deletedBy,
          deleteReason: h.deleteReason,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/horses\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const stored = getStoredHorses();
      const h: any = stored.find((item) => item.id === params[0]);
      if (!h) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found or permission denied.");

      if (user.role === "HORSE_OWNER" && h.ownerId && h.ownerId !== user.id) {
        throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found or permission denied.");
      }

      const st = horseStatusOf(h);

      let microchip = h.microchip || h.code;
      let microchipRfid = h.code || h.microchip || "985141002341001";
      if (user.role === "GROOM") {
        if (microchip && microchip.length > 4) {
          microchip = "*".repeat(microchip.length - 4) + microchip.slice(-4);
        }
        if (microchipRfid && microchipRfid.length > 4) {
          microchipRfid = "*".repeat(microchipRfid.length - 4) + microchipRfid.slice(-4);
        }
      }

      return {
        id: h.id,
        horseCode: h.horseCode || (h.id.startsWith("horse-") ? `HR-${h.id.slice(-6)}` : `HR-000001`),
        name: h.name,
        microchip,
        microchipRfid,
        breed: h.breed || "Thoroughbred",
        dob: h.dob || "2021-04-12",
        gender: h.gender || "Colt",
        color: h.color || "Bay Dark",
        weightKg: h.weightKg || 485,
        status: st,
        retireReason: h.retireReason ?? null,
        isMedicalLocked: Boolean(h.isLocked),
        ownerId: h.ownerId || "owner-1",
        ownerName: h.ownerName || "Phan Đức Long",
        owner: { id: h.ownerId || "owner-1", fullName: h.ownerName || "Phan Đức Long", email: "owner@gmail.com" },
        stallCode: user.role === "HORSE_OWNER" ? null : (h.stall || "STALL-A01"),
        zone: user.role === "HORSE_OWNER" ? null : "Zone A - Barn 1",
        primaryGroom: user.role === "HORSE_OWNER" ? null : "Lê Văn Phúc",
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: h.updatedAt || new Date().toISOString(),
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/horses\/([^/]+)\/history$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const stored = getStoredHorses();
      const h: any = stored.find((item) => item.id === params[0]);
      if (!h) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found or permission denied.");

      if (user.role === "HORSE_OWNER" && h.ownerId && h.ownerId !== user.id) {
        throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found or permission denied.");
      }

      const st = horseStatusOf(h);

      const horse = {
        id: h.id,
        horseCode: h.horseCode || (h.id.startsWith("horse-") ? `HR-${h.id.slice(-6)}` : `HR-000001`),
        name: h.name,
        breed: h.breed || "Thoroughbred",
        dob: h.dob || "2021-04-12",
        gender: h.gender || "Colt",
        color: h.color || "Bay Dark",
        status: st,
        isMedicalLocked: Boolean(h.isLocked),
        stallCode: user.role === "HORSE_OWNER" ? null : (h.stall || "STALL-A01"),
        zone: user.role === "HORSE_OWNER" ? null : "Zone A - Barn 1",
        primaryGroom: user.role === "HORSE_OWNER" ? null : "Lê Văn Phúc",
      };

      const statusHistory = [
        {
          id: `sh-${h.id}-1`,
          timestamp: h.updatedAt || new Date().toISOString(),
          changedBy: "Dr. Võ Thanh Hải",
          action: "HORSE_STATUS_CHANGED",
          oldStatus: "RESTING",
          newStatus: st,
        },
      ];

      const ownershipHistory = [
        {
          id: `oh-${h.id}-1`,
          timestamp: h.createdAt || new Date(Date.now() - 60 * 86400000).toISOString(),
          previousOwner: "EquiFlow Racing Stable",
          newOwner: h.ownerName || "Phan Đức Long",
          reason: "Purchased at Autumn Yearling Auction",
          transferredBy: "Hoàng Văn Sơn",
        },
      ];

      const stallHistory = user.role === "HORSE_OWNER" ? [] : [
        {
          id: `stall-${h.id}-1`,
          stallCode: h.stall || "STALL-A01",
          zone: "Zone A - Barn 1",
          groomName: "Lê Văn Phúc",
          startDate: h.createdAt || new Date(Date.now() - 30 * 86400000).toISOString(),
          endDate: null,
          isActive: true,
        },
      ];

      const medicalHistory = {
        records: [
          {
            id: `mr-${h.id}-1`,
            examinationDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            veterinarianName: "Dr. Lê Minh Châu",
            symptoms: h.isLocked ? (h.lockReason || "Left forelimb swelling and lameness") : "Routine pre-training health screening",
            clinicalDiagnosis: h.isLocked ? "Acute desmitis of suspensory ligament" : "Clinically sound, fit for regular conditioning",
            treatmentProtocol: h.isLocked ? "Cryotherapy, bandage support, rest" : "Routine maintenance",
          },
        ],
        injuries: h.isLocked ? [
          {
            id: `inj-${h.id}-1`,
            discoveryDate: new Date(Date.now() - 5 * 86400000).toISOString(),
            anatomicalZone: "Superficial Digital Flexor Tendon (SDFT)",
            layer: "MUSCLE",
            viewSide: "LEFT",
            injuryType: "Tendon Strain & Mild Synovitis",
            severity: "MODERATE",
            stage: "ACUTE",
            status: "ACTIVE",
          },
        ] : [],
        locks: h.isLocked ? [
          {
            id: `lock-${h.id}-1`,
            lockCode: "KH-000001",
            lockedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            lockReason: h.lockReason || "Suspensory ligament acute desmitis during intense trial run",
            veterinarianName: "Dr. Lê Minh Châu",
            isLocked: true,
          },
        ] : [],
      };

      const trainingHistory = [
        {
          id: `tp-${h.id}-1`,
          phaseName: "Endurance & Speed Conditioning",
          targetSpeed: 45,
          targetDistance: 1600,
          trackSurface: "TURF",
          startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
          status: h.isLocked ? "SUSPENDED" : "ACTIVE",
          trainerName: "Đinh Quang Trung",
          totalWorkouts: 8,
          completedWorkouts: 6,
        },
      ];

      const timeline = [
        {
          id: `tl-${h.id}-1`,
          category: "IDENTITY" as const,
          title: "Horse identity profile created",
          description: `Registered as ${h.name} (${horse.horseCode}), breed ${horse.breed}.`,
          timestamp: h.createdAt || new Date(Date.now() - 60 * 86400000).toISOString(),
          badgeTone: "info" as const,
        },
        ...(h.isLocked ? [
          {
            id: `tl-${h.id}-lock`,
            category: "MEDICAL" as const,
            title: "Veterinary Medical Lock enforced (KH-000001)",
            description: `Reason: ${h.lockReason || "Acute desmitis"}. Issued by Dr. Lê Minh Châu.`,
            timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
            badgeTone: "danger" as const,
          },
        ] : []),
        {
          id: `tl-${h.id}-plan`,
          category: "TRAINING" as const,
          title: "Training plan issued: Endurance & Speed Conditioning",
          description: `Status: ${h.isLocked ? "SUSPENDED" : "ACTIVE"}. Surface: TURF. Trainer: Trần Văn Nam.`,
          timestamp: new Date(Date.now() - 20 * 86400000).toISOString(),
          badgeTone: "ok" as const,
        },
        {
          id: `tl-${h.id}-med`,
          category: "MEDICAL" as const,
          title: "Clinical examination completed",
          description: `Diagnosis: ${h.isLocked ? "Acute desmitis" : "Clinically sound"}. Examined by Dr. Lê Minh Châu.`,
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
          badgeTone: "warn" as const,
        },
      ];

      return {
        horse,
        statusHistory,
        ownershipHistory,
        stallHistory,
        medicalHistory,
        trainingHistory,
        timeline,
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/horses$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only Club Manager can create horse profiles.");
      }

      const name = String(body.name || "").trim();
      const microchip = String(body.microchip || "").trim();

      if (!name) throw new ApiError(400, "VALIDATION", "Horse name is required.");
      if (!microchip || !/^\d{15}$/.test(microchip)) {
        throw new ApiError(400, "VALIDATION", "Microchip must be exactly 15 digits.");
      }

      const stored = getStoredHorses();
      if (stored.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError(409, "DUPLICATE_NAME", "A horse with this name already exists in the system.");
      }
      if (stored.some((h) => (h as any).microchip === microchip || h.code === microchip)) {
        throw new ApiError(409, "DUPLICATE_MICROCHIP", "Microchip number is already registered to another horse.");
      }

      const id = `horse-${Date.now()}`;
      const horseCode = `HR-${String(stored.length + 1).padStart(6, "0")}`;
      const newHorse: any = {
        id,
        horseCode,
        name,
        code: microchip,
        microchip,
        stall: body.stallCode || "STALL-A01",
        healthGroup: "FIT",
        status: "RESTING",
        statusText: "RESTING",
        isLocked: false,
        restingHeartRate: 38,
        temp: 38.0,
        breed: body.breed || "Thoroughbred",
        dob: body.dob || "2021-04-12",
        gender: body.gender || "Colt",
        color: body.color || "Bay Dark",
        weightKg: body.weightKg ? Number(body.weightKg) : 485,
        ownerId: body.ownerId || null,
      };

      addStoredHorse(newHorse);
      audit(db, user.fullName, "HORSE_CREATED", `Created horse profile ${name} (${horseCode})`);
      return newHorse;
    },
  },
  {
    method: "PUT",
    pattern: /^\/horses\/([^/]+)$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only Club Manager can update horse profiles.");
      }

      const stored = getStoredHorses();
      const existing = stored.find((h) => h.id === params[0]);
      if (!existing) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found.");

      if ((existing as any).status === "RETIRED") {
        throw new ApiError(400, "HORSE_RETIRED", "Horse is retired. Reactivate horse before modifying.");
      }

      if (body.name) {
        const name = String(body.name).trim();
        if (stored.some((h) => h.id !== params[0] && h.name.toLowerCase() === name.toLowerCase())) {
          throw new ApiError(409, "DUPLICATE_NAME", "A horse with this name already exists in the system.");
        }
        existing.name = name;
      }
      if (body.microchip) {
        const chip = String(body.microchip).trim();
        if (stored.some((h) => h.id !== params[0] && ((h as any).microchip === chip || h.code === chip))) {
          throw new ApiError(409, "DUPLICATE_MICROCHIP", "Microchip number is already registered to another horse.");
        }
        (existing as any).microchip = chip;
        existing.code = chip;
      }
      if (body.breed) existing.breed = String(body.breed);
      if (body.dob) existing.dob = String(body.dob);
      if (body.gender) existing.gender = String(body.gender);
      if (body.color) existing.color = String(body.color);
      if (body.weightKg !== undefined) (existing as any).weightKg = Number(body.weightKg);

      saveStoredHorses(stored);
      audit(db, user.fullName, "HORSE_UPDATED", `Updated horse profile ${existing.name}`);
      return existing;
    },
  },
  {
    // DL-1.10 Xóa mềm: chuyển hồ sơ sang kho "đã xóa" (giống BE: deletedAt + lý do), khôi phục được.
    method: "DELETE",
    pattern: /^\/horses\/([^/]+)$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only Club Manager can delete horse profiles.");
      }
      const reason = String(body.reason || "").trim();
      if (reason.length < 10 || reason.length > 500) {
        throw new ApiError(400, "VALIDATION", "Reason must be 10 to 500 characters.");
      }
      const stored = getStoredHorses();
      const existing = stored.find((h) => h.id === params[0]);
      if (!existing) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found.");
      const typed = String(body.confirmName || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (typed !== existing.name.toLowerCase()) {
        throw new ApiError(400, "CONFIRM_NAME_MISMATCH", "The name does not match.");
      }
      if (existing.isLocked) {
        throw new ApiError(400, "HORSE_LOCKED", "Cannot delete horse profile while an active Medical Lock is in effect.");
      }

      saveStoredHorses(stored.filter((h) => h.id !== existing.id));
      saveDeletedHorses([
        {
          ...existing,
          status: horseStatusOf(existing),
          deletedAt: new Date().toISOString(),
          deletedBy: { id: user.id, fullName: user.fullName },
          deletedById: user.id,
          deleteReason: reason,
        },
        ...getDeletedHorses().filter((h) => h.id !== existing.id),
      ]);
      audit(db, user.fullName, "HORSE_DELETED", `Soft-deleted horse profile ${existing.name}. Reason: ${reason}`);
      return { success: true, id: existing.id, name: existing.name, message: `Đã xóa hồ sơ ngựa ${existing.name}.` };
    },
  },
  {
    // DL-1.11 Khôi phục (lý do 10-500) hoặc Hoàn tác trong 60 giây (undo = true).
    method: "POST",
    pattern: /^\/horses\/([^/]+)\/restore$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only Club Manager can restore horse profiles.");
      }
      const deleted = getDeletedHorses();
      const target = deleted.find((h) => h.id === params[0]);
      if (!target) throw new ApiError(404, "HORSE_NOT_FOUND", "Không tìm thấy hồ sơ đã xóa.");

      let reason: string;
      if (body.undo) {
        const expired = Date.now() - new Date(target.deletedAt).getTime() > 60_000;
        if (expired || target.deletedById !== user.id) {
          throw new ApiError(400, "UNDO_EXPIRED", "Đã hết thời gian hoàn tác.");
        }
        reason = "Hoàn tác thao tác xóa";
      } else {
        reason = String(body.reason || "").trim();
        if (reason.length < 10 || reason.length > 500) {
          throw new ApiError(400, "REASON_REQUIRED", "Lý do phải từ 10 đến 500 ký tự.");
        }
      }

      const stored = getStoredHorses();
      if (stored.some((h) => h.name.toLowerCase() === target.name.toLowerCase())) {
        throw new ApiError(409, "RESTORE_CONFLICT", `Tên ngựa ${target.name} đã được dùng cho ngựa khác.`, { field: "name" });
      }

      // Bỏ các trường xóa; ngựa về trạng thái lúc bị xóa, chưa có ô chuồng.
      const { deletedAt: _a, deletedBy: _b, deletedById: _c, deleteReason: _d, ...horse } = target;
      saveStoredHorses([{ ...horse, stall: "" }, ...stored]);
      saveDeletedHorses(deleted.filter((h) => h.id !== target.id));
      audit(db, user.fullName, "HORSE_RESTORED", `Restored horse profile ${target.name}. Reason: ${reason}`);
      return { success: true, message: `Đã khôi phục hồ sơ ngựa ${target.name}.` };
    },
  },
  {
    method: "PATCH",
    pattern: /^\/horses\/([^/]+)\/transfer-owner$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Only Club Manager can transfer horse ownership.");
      }
      const stored = getStoredHorses();
      const existing = stored.find((h) => h.id === params[0]);
      if (!existing) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found.");
      if ((existing as any).status === "RETIRED") {
        throw new ApiError(400, "HORSE_RETIRED", "Cannot transfer ownership of a retired horse.");
      }

      const newOwnerId = String(body.newOwnerId || "");
      if (!newOwnerId) throw new ApiError(400, "VALIDATION", "New owner ID is required.");
      if (existing.ownerId === newOwnerId) {
        throw new ApiError(400, "ALREADY_OWNED", "Horse is already assigned to this owner.");
      }

      const accounts = db.accounts;
      const newOwner = accounts.find((a) => a.id === newOwnerId) || {
        id: newOwnerId,
        fullName: newOwnerId === "usr-owner-002" ? "Alexander Hamilton (Equine Syndicate)" : "Phan Đức Long",
        email: "owner@gmail.com",
      };

      existing.ownerId = newOwner.id;
      existing.ownerName = newOwner.fullName;
      saveStoredHorses(stored);
      audit(db, user.fullName, "HORSE_OWNERSHIP_TRANSFERRED", `Transferred ownership of ${existing.name} to ${newOwner.fullName}. Reason: ${body.reason || "None"}`);
      return {
        ...existing,
        owner: { id: newOwner.id, fullName: newOwner.fullName, email: newOwner.email },
      };
    },
  },
  {
    // Bảng chuyển trạng thái Flow 1 §4.2 (bản giả của src/horses/horse-rules.ts ở BE).
    method: "PATCH",
    pattern: /^\/horses\/([^/]+)\/status$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      const stored = getStoredHorses();
      const existing = stored.find((h) => h.id === params[0]);
      if (!existing) throw new ApiError(404, "HORSE_NOT_FOUND", "Horse profile not found.");

      const OPERATIONAL = ["RESTING", "IN_TRAINING", "ACTIVE"];
      const MEDICAL = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];
      const from = horseStatusOf(existing);
      const to = String(body.status);
      const reason = String(body.reason || "").trim();
      const locked = Boolean(existing.isLocked);
      const retireReason = body.retireReason ? String(body.retireReason) : "";
      const deny = (code: string, msg: string): never => {
        throw new ApiError(403, code, msg);
      };
      const needReason = () => {
        if (reason.length < 10) throw new ApiError(400, "REASON_REQUIRED", "Lý do phải từ 10 đến 500 ký tự.");
      };

      if (from === to) throw new ApiError(400, "SAME_STATUS", `Horse is already in status ${to}.`);
      if (from === "RETIRED") {
        if (user.role !== "CLUB_MANAGER" || to !== "RESTING") deny("HORSE_RETIRED", "Horse is no longer managed.");
        if (existing.retireReason === "DECEASED") {
          throw new ApiError(400, "HORSE_DECEASED", "Không thể kích hoạt lại hồ sơ ngựa đã chết.");
        }
        needReason();
      } else if (user.role === "CLUB_MANAGER") {
        if (to !== "RETIRED") deny("ROLE_RESTRICTION", "Club Manager can only stop managing or reactivate.");
        if (!retireReason) throw new ApiError(400, "RETIRE_REASON_REQUIRED", "Vui lòng chọn lý do ngừng quản lý.");
        if (locked && retireReason !== "DECEASED") deny("MEDICAL_LOCK_ACTIVE", "Locked: only Deceased is allowed.");
        needReason();
      } else if (user.role === "HEAD_TRAINER") {
        if (!OPERATIONAL.includes(from) || !OPERATIONAL.includes(to)) deny("ROLE_RESTRICTION", "Head Trainer: operational statuses only.");
        if (locked) deny("MEDICAL_LOCK_ACTIVE", "Horse is under a Training Lock.");
      } else if (user.role === "VETERINARIAN") {
        const toMedical = MEDICAL.includes(to);
        const backToWork = MEDICAL.includes(from) && (to === "RESTING" || to === "IN_TRAINING");
        if (!toMedical && !backToWork) deny("ROLE_RESTRICTION", "Veterinarian: medical statuses only.");
        if (backToWork && locked) deny("MEDICAL_LOCK_ACTIVE", "Horse is under a Training Lock.");
        needReason();
      } else {
        deny("ROLE_RESTRICTION", "Your role cannot change horse status.");
      }

      const effects: string[] = [];
      existing.status = to;
      if (to === "RETIRED") {
        existing.retireReason = retireReason;
        if (existing.stall) effects.push(`Trả ô chuồng ${existing.stall}`);
        existing.stall = "";
        if (locked) {
          existing.isLocked = false;
          existing.lockReason = undefined;
          effects.push("Kết thúc Khóa huấn luyện");
        }
        if ((retireReason === "SOLD" || retireReason === "TRANSFERRED") && existing.ownerId) {
          existing.ownerId = undefined;
          existing.ownerName = undefined;
          effects.push("Kết thúc sở hữu của 1 chủ sở hữu");
        }
      } else if (from === "RETIRED") {
        existing.retireReason = null;
      }

      saveStoredHorses(stored);
      audit(db, user.fullName, "HORSE_STATUS_CHANGED", `Changed status of ${existing.name} from ${from} to ${to}. Reason: ${reason || "None"}`);
      return { success: true, message: `Status updated to ${to}`, data: { ...existing, status: to }, effects };
    },
  },
  // ===== FLOW 2: TRAINING (mô phỏng src/training của BE, cùng mã lỗi) =====
  {
    method: "GET",
    pattern: /^\/training\/plans$/,
    handler({ db, url }) {
      const user = currentUser(db);
      trainingRole(user, ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN", "HORSE_OWNER"]);
      sweepTraining();
      const horseId = url.searchParams.get("horseId");
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search")?.toLowerCase();
      let plans = getStoredPlans().map(decoratePlan);
      if (user.role === "HORSE_OWNER") plans = plans.filter((p) => p.horseOwnerId === user.id);
      if (horseId) plans = plans.filter((p) => p.horseId === horseId);
      if (status) plans = plans.filter((p) => p.status === status);
      if (search) {
        plans = plans.filter(
          (p) => p.phaseName.toLowerCase().includes(search) || (p.horse?.name ?? "").toLowerCase().includes(search),
        );
      }
      plans.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items: plans, total: plans.length, page: 1, pageSize: 100, totalPages: 1 };
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/plans\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      trainingRole(user, ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN", "HORSE_OWNER"]);
      const plan = getStoredPlans().find((p) => p.id === params[0]);
      const p = plan ? decoratePlan(plan) : null;
      if (!p || (user.role === "HORSE_OWNER" && p.horseOwnerId !== user.id)) {
        throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      }
      const lockedHorse = getStoredHorses().find((h) => h.id === p.horseId);
      if (p.horse && lockedHorse?.isLocked) {
        (p.horse as Record<string, unknown>).medicalLocks = [
          { lockedAt: lockedHorse.lockDate ?? new Date().toISOString(), lockReason: lockedHorse.lockReason ?? "" },
        ];
      }
      const workoutSessions = getStoredWorkouts()
        .filter((w) => w.trainingPlanId === p.id)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .map(decorateWorkout);
      return { ...p, workoutSessions };
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/plans$/,
    handler({ db, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const horse = mockHorse(String(body.horseId));
      if (horse.status === "RETIRED") throw new ApiError(400, "HORSE_RETIRED", "Ngựa đã ngừng quản lý.");
      if (!Array.isArray(body.phases) || body.phases.length === 0) {
        throw new ApiError(400, "PHASES_REQUIRED", "Giáo án phải có ít nhất 1 giai đoạn.");
      }
      if (String(body.startDate) > String(body.endDate)) {
        throw new ApiError(400, "INVALID_DATE_RANGE", "Plan start date cannot be later than end date.");
      }
      if (String(body.objective ?? "").trim().length < 10) {
        throw new ApiError(400, "VALIDATION", "Mục tiêu phải từ 10 đến 1000 ký tự.");
      }
      const plan: MockPlan = {
        id: `plan-${Date.now()}`,
        planCode: `GA-${String(getStoredPlans().length + 1).padStart(6, "0")}`,
        horseId: horse.id,
        trainerUserId: user.id,
        phaseName: String(body.phaseName),
        objective: String(body.objective).trim(),
        notes: body.notes ? String(body.notes) : null,
        phases: (body.phases as Record<string, unknown>[]).map((ph, i) => ({ ...ph, id: ph.id || `ph-${Date.now()}-${i}` })),
        targetDistance: body.targetDistance as number | undefined,
        targetSpeed: body.targetSpeed as number | undefined,
        startDate: new Date(String(body.startDate)).toISOString(),
        endDate: new Date(String(body.endDate)).toISOString(),
        status: "DRAFT",
        cancelReason: null,
        completionSummary: null,
        createdAt: new Date().toISOString(),
      };
      saveStoredPlans([plan, ...getStoredPlans()]);
      audit(db, user.fullName, "CREATE_TRAINING_PLAN", `Created training plan "${plan.phaseName}" for ${horse.name}`);
      return decoratePlan(plan);
    },
  },
  {
    method: "PUT",
    pattern: /^\/training\/plans\/([^/]+)$/,
    handler({ db, params, body }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const plans = getStoredPlans();
      const p = plans.find((x) => x.id === params[0]);
      if (!p) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      if (p.status !== "DRAFT" && p.status !== "ACTIVE") {
        throw new ApiError(400, "PLAN_CLOSED", "Giáo án đã hoàn thành hoặc đã hủy nên không sửa được.");
      }
      if (body.phaseName) p.phaseName = String(body.phaseName);
      if (body.objective !== undefined) p.objective = String(body.objective);
      if (body.notes !== undefined) p.notes = body.notes ? String(body.notes) : null;
      if (body.phases) {
        p.phases = (body.phases as Record<string, unknown>[]).map((ph, i) => ({ ...ph, id: ph.id || `ph-${Date.now()}-${i}` }));
      }
      if (body.startDate) p.startDate = new Date(String(body.startDate)).toISOString();
      if (body.endDate) p.endDate = new Date(String(body.endDate)).toISOString();
      saveStoredPlans(plans);
      return decoratePlan(p);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/training\/plans\/([^/]+)\/status$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const plans = getStoredPlans();
      const plan = plans.find((x) => x.id === params[0]);
      if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      const to = String(body.status);
      const workouts = getStoredWorkouts();
      const mine = workouts.filter((w) => w.trainingPlanId === plan.id);

      if (to === "ACTIVE") {
        if (plan.status !== "DRAFT") throw new ApiError(400, "INVALID_PLAN_TRANSITION", "Chỉ kích hoạt được giáo án đang ở Nháp.");
        const horse = mockHorse(plan.horseId);
        if (horse.isLocked) throw new ApiError(409, "MEDICAL_LOCK_ACTIVE", "Ngựa đang bị Khóa huấn luyện y tế. Không thể kích hoạt giáo án.");
        if (horse.status === "RETIRED") throw new ApiError(400, "HORSE_RETIRED", "Ngựa đã ngừng quản lý.");
        const other = plans.find((x) => x.horseId === plan.horseId && x.status === "ACTIVE" && x.id !== plan.id);
        if (other) throw new ApiError(409, "HORSE_HAS_ACTIVE_PLAN", `Ngựa đang áp dụng giáo án ${other.phaseName}.`, { planId: other.id });
        if (mine.filter((w) => w.status !== "CANCELLED").length === 0) {
          throw new ApiError(400, "PLAN_HAS_NO_WORKOUTS", "Giáo án phải có ít nhất 1 buổi tập trước khi kích hoạt.");
        }
        if (plan.endDate.slice(0, 10) < todayIso()) throw new ApiError(400, "PLAN_ENDED", "Ngày kết thúc của giáo án đã qua.");
        if (MEDICAL.includes(horse.status) && !body.vetConsulted) {
          throw new ApiError(409, "VET_CONFIRMATION_REQUIRED", `Ngựa đang ở trạng thái ${horse.status}.`, { horseStatus: horse.status });
        }
        if (body.moveHorseToTraining && horse.status === "RESTING") {
          const horses = getStoredHorses();
          const h = horses.find((x) => x.id === horse.id);
          if (h) h.status = "IN_TRAINING";
          saveStoredHorses(horses);
        }
      } else if (to === "COMPLETED" || to === "CANCELLED") {
        const from = to === "COMPLETED" ? ["ACTIVE"] : ["DRAFT", "ACTIVE"];
        if (!from.includes(plan.status)) throw new ApiError(400, "INVALID_PLAN_TRANSITION", "Trạng thái giáo án không cho phép thao tác này.");
        if (to === "COMPLETED") {
          if (String(body.summary ?? "").trim().length < 10) throw new ApiError(400, "SUMMARY_REQUIRED", "Nhận xét phải từ 10 đến 2000 ký tự.");
          plan.completionSummary = String(body.summary).trim();
        } else {
          if (String(body.reason ?? "").trim().length < 10) throw new ApiError(400, "REASON_REQUIRED", "Lý do phải từ 10 đến 500 ký tự.");
          plan.cancelReason = String(body.reason).trim();
        }
        for (const w of mine) {
          if (PENDING.includes(w.status)) {
            w.status = "CANCELLED";
            w.statusReason = "Giáo án đã kết thúc";
          }
        }
        saveStoredWorkouts(workouts);
      } else {
        throw new ApiError(400, "VALIDATION", "Trạng thái không hợp lệ.");
      }
      plan.status = to as MockPlan["status"];
      saveStoredPlans(plans);
      audit(db, user.fullName, `TRAINING_PLAN_${to}`, `Training plan "${plan.phaseName}" -> ${to}`);
      return decoratePlan(plan);
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/plans\/([^/]+)\/clone$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const source = getStoredPlans().find((x) => x.id === params[0]);
      if (!source) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      const horse = mockHorse(String(body.targetHorseId));
      if (horse.status === "RETIRED") throw new ApiError(400, "HORSE_RETIRED", "Ngựa đã ngừng quản lý.");
      const start = body.startDate ? new Date(String(body.startDate)) : new Date(`${todayIso()}T00:00:00+07:00`);
      if (start.toISOString().slice(0, 10) < todayIso()) {
        throw new ApiError(400, "START_DATE_IN_PAST", "Ngày bắt đầu không được trước ngày hiện tại.");
      }
      const shift = start.getTime() - new Date(source.startDate).getTime();
      const plan: MockPlan = {
        ...source,
        id: `plan-${Date.now()}`,
        horseId: horse.id,
        trainerUserId: user.id,
        phaseName: body.name ? String(body.name) : `${source.phaseName} (bản sao)`,
        startDate: start.toISOString(),
        endDate: new Date(new Date(source.endDate).getTime() + shift).toISOString(),
        status: "DRAFT",
        cancelReason: null,
        completionSummary: null,
        createdAt: new Date().toISOString(),
      };
      if (body.copyWorkouts !== false) {
        const copies = getStoredWorkouts()
          .filter((w) => w.trainingPlanId === source.id && w.status !== "CANCELLED")
          .map((w) => ({ ...w, date: new Date(new Date(w.scheduledDate).getTime() + shift) }))
          .filter(({ date }) => date.getTime() >= Date.now())
          .map(({ date, ...w }, i) => {
            const blocked = horse.isLocked && isHeavyMock(w);
            return {
              ...w,
              id: `w-${Date.now()}-${i}`,
              trainingPlanId: plan.id,
              horseId: horse.id,
              scheduledDate: date.toISOString(),
              status: (blocked ? "BLOCKED" : "SCHEDULED") as MockWorkout["status"],
              statusReason: blocked ? "Ngựa đang bị Khóa huấn luyện y tế" : null,
              actualTimeSeconds: null,
              heartRatePeak: null,
              heartRateRecovery: null,
              averageSpeedKmh: null,
              topSpeedKmh: null,
              performanceScore: null,
              resultRecordedAt: null,
              abnormalSigns: false,
              abnormalNotes: null,
            };
          });
        saveStoredWorkouts([...getStoredWorkouts(), ...copies]);
      }
      saveStoredPlans([plan, ...getStoredPlans()]);
      return decoratePlan(plan);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/training\/plans\/([^/]+)$/,
    handler({ db, params }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const plan = getStoredPlans().find((x) => x.id === params[0]);
      if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      const done = getStoredWorkouts().some((w) => w.trainingPlanId === plan.id && w.status === "COMPLETED");
      if (plan.status !== "DRAFT" || done) {
        throw new ApiError(409, "PLAN_NOT_DELETABLE", "Chỉ xóa được giáo án Nháp chưa có buổi tập hoàn thành.");
      }
      saveStoredPlans(getStoredPlans().filter((x) => x.id !== plan.id));
      saveStoredWorkouts(getStoredWorkouts().filter((w) => w.trainingPlanId !== plan.id));
      return { message: "Training plan deleted successfully." };
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/workouts$/,
    handler({ db, url }) {
      const user = currentUser(db);
      sweepTraining();
      return listWorkouts(user, url);
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/trial-runs$/,
    handler({ db, url }) {
      const user = currentUser(db);
      trainingRole(user, ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN"]);
      return listWorkouts(user, url).filter((w) => w.workoutType === "TRIAL");
    },
  },
  {
    method: "POST",
    pattern: /^\/simulator\/workouts\/([^/]+)\/start$/,
    handler({ db, params }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const workout = getStoredWorkouts().find((w) => w.id === params[0]);
      if (!workout) throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      if (workout.status !== "SCHEDULED") {
        throw new ApiError(409, "WORKOUT_NOT_SIMULATABLE", "Only scheduled workouts can be simulated.");
      }
      if (new Date(workout.scheduledDate) > new Date()) {
        throw new ApiError(409, "WORKOUT_NOT_STARTED", "The workout has not reached its scheduled start time.");
      }
      const horse = mockHorse(workout.horseId);
      if (horse.isLocked && isHeavyMock(workout)) {
        throw new ApiError(409, "MEDICAL_LOCK_ACTIVE", "A medical lock prevents this high-intensity workout.");
      }
      const sessionId = `mock-sim-${workout.id}`;
      return { sessionId, status: "PENDING", launchUrl: `http://localhost:5175/?sessionId=${sessionId}` };
    },
  },
  {
    method: "GET",
    pattern: /^\/simulator\/sessions$/,
    handler({ db, url }) {
      trainingRole(currentUser(db), ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN"]);
      if (url.searchParams.get("status") !== "RUNNING") return { active: [], recent: [] };
      return {
        active: [],
        recent: [
          {
            id: "mock-live-session",
            status: "RUNNING",
            horseIds: ["horse-1"],
            updatedAt: "2026-10-23T01:00:00.000Z",
            lastSnapshot: {
              event: "sim:telemetry_tick",
              session_id: "mock-live-session",
              sim_time_s: 42,
              horse: { horse_id: "horse-1", microchip_id: "MICROCHIP-LIVE-001" },
              track: { surface: "TURF", target_distance_m: 1200, covered_distance_m: 600, track_condition: "GOOD" },
              metrics: { velocity_mps: 12, heart_rate_bpm: 156, stamina_pct: 74, body_temp_c: 38.4 },
              alerts: { overload_warning: false, limp_detected: false, heat_stress: false },
            },
          },
          {
            id: "mock-live-waiting",
            status: "RUNNING",
            horseIds: ["horse-2"],
            updatedAt: "2026-10-23T01:00:01.000Z",
            lastSnapshot: null,
          },
        ],
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/simulator\/workouts\/([^/]+)\/latest$/,
    handler({ db, params }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      if (params[0] !== "w-106") throw new ApiError(404, "SIMULATOR_RESULT_NOT_FOUND", "No simulation result exists.");
      return {
        sessionId: "mock-sim-w-106",
        status: "ABORTED_INJURY",
        resultDraft: {
          actualTimeSeconds: 72.4,
          actualDistanceMeters: 1187,
          heartRatePeak: 195,
          heartRateRecovery: 86,
          topSpeedKmh: 65.5,
          actualSurface: "TURF",
          trackCondition: "SOFT",
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/grooms$/,
    handler({ db }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      return db.accounts
        .filter((a) => a.role === "GROOM" && a.status === "ACTIVE")
        .map((a) => ({ id: a.id, fullName: a.fullName, email: a.email }));
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/workouts\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const w = getStoredWorkouts().find((x) => x.id === params[0]);
      if (!w || (user.role === "GROOM" && w.assignedStaffUserId !== user.id)) {
        throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      }
      return decorateWorkout(w);
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/plans\/([^/]+)\/workouts$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const plan = getStoredPlans().find((x) => x.id === params[0]);
      if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      const type = String(body.workoutType);
      const draft: MockWorkout = {
        id: `w-${Date.now()}`,
        trainingPlanId: plan.id,
        horseId: plan.horseId,
        phaseId: body.phaseId ? String(body.phaseId) : null,
        scheduledDate: new Date(String(body.scheduledDate)).toISOString(),
        workoutType: type,
        intensity: type === "BREEZE" || type === "TRIAL" ? "HEAVY" : String(body.intensity),
        trackSurface: type === "SWIM" || type === "TREADMILL" ? "NONE" : String(body.trackSurface),
        distanceMeters: Number(body.distanceMeters),
        repetitions: Number(body.repetitions ?? 1),
        targetSpeedKmh: body.targetSpeedKmh == null ? null : Number(body.targetSpeedKmh),
        jockeyName: body.jockeyName ? String(body.jockeyName) : null,
        assignedStaffUserId: String(body.assignedStaffUserId ?? ""),
        trainerNotes: body.trainerNotes ? String(body.trainerNotes) : null,
        status: "SCHEDULED",
        statusReason: null,
        medicalOverride: false,
        abnormalSigns: false,
      };
      draft.medicalOverride = assertWorkoutAllowedMock(db, plan, draft, Boolean(body.vetConsulted));
      assertWarningsMock(db, plan, draft, Boolean(body.acknowledgeWarnings));
      saveStoredWorkouts([...getStoredWorkouts(), draft]);
      audit(db, user.fullName, "CREATE_WORKOUT_SESSION", `Scheduled ${type} for plan "${plan.phaseName}"`);
      return decorateWorkout(draft);
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/workouts\/([^/]+)\/cancel$/,
    handler({ db, params, body }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const rows = getStoredWorkouts();
      const w = rows.find((x) => x.id === params[0]);
      if (!w) throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      if (!PENDING.includes(w.status)) throw new ApiError(400, "WORKOUT_NOT_CANCELLABLE", "Buổi tập đã hoàn thành hoặc đã hủy.");
      if (!body.reason) throw new ApiError(400, "VALIDATION", "Vui lòng chọn lý do.");
      if (body.reason === "OTHER" && String(body.note ?? "").trim().length < 10) {
        throw new ApiError(400, "NOTE_REQUIRED", "Ghi chú phải từ 10 đến 500 ký tự.");
      }
      w.status = "CANCELLED";
      w.statusReason = [String(body.reason), body.note ? String(body.note) : ""].filter(Boolean).join(": ");
      saveStoredWorkouts(rows);
      return decorateWorkout(w);
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/workouts\/([^/]+)\/restore$/,
    handler({ db, params, body }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const rows = getStoredWorkouts();
      const w = rows.find((x) => x.id === params[0]);
      if (!w) throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      if (w.status !== "BLOCKED") throw new ApiError(400, "WORKOUT_NOT_BLOCKED", "Chỉ khôi phục được buổi tập Bị chặn.");
      const plan = getStoredPlans().find((x) => x.id === w.trainingPlanId)!;
      const draft = { ...w, scheduledDate: body.scheduledDate ? new Date(String(body.scheduledDate)).toISOString() : w.scheduledDate };
      assertWorkoutAllowedMock(db, plan, draft, Boolean(w.medicalOverride), w.id);
      w.status = "SCHEDULED";
      w.scheduledDate = draft.scheduledDate;
      w.statusReason = null;
      saveStoredWorkouts(rows);
      return decorateWorkout(w);
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/workouts\/([^/]+)\/result$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const rows = getStoredWorkouts();
      const w = rows.find((x) => x.id === params[0]);
      if (!w) throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      if (w.status === "SCHEDULED" && new Date(w.scheduledDate).getTime() > Date.now()) {
        throw new ApiError(400, "WORKOUT_NOT_STARTED", "Chỉ ghi kết quả khi buổi tập đã tới giờ bắt đầu.");
      }
      if (w.status === "BLOCKED" || w.status === "CANCELLED") {
        throw new ApiError(400, "WORKOUT_NOT_RECORDABLE", "Buổi tập bị chặn hoặc đã hủy nên không ghi kết quả.");
      }
      if (w.status === "MISSED" && Date.now() - new Date(w.scheduledDate).getTime() > 8 * 24 * 3600_000) {
        throw new ApiError(400, "LATE_RESULT_EXPIRED", "Đã quá 7 ngày, không thể ghi kết quả cho buổi tập bỏ lỡ.");
      }
      const editing = w.status === "COMPLETED";
      if (editing && w.resultRecordedAt && Date.now() - new Date(w.resultRecordedAt).getTime() > 48 * 3600_000) {
        throw new ApiError(400, "RESULT_EDIT_EXPIRED", "Chỉ sửa được kết quả trong 48 giờ sau khi ghi.");
      }
      const noTime = ["WALK", "SWIM", "TREADMILL"].includes(String(w.workoutType));
      if (body.actualTimeSeconds == null && !noTime) throw new ApiError(400, "TIME_REQUIRED", "Thời gian chạy là bắt buộc.");
      if (body.heartRatePeak != null && body.heartRateRecovery != null && Number(body.heartRateRecovery) > Number(body.heartRatePeak)) {
        throw new ApiError(400, "RECOVERY_ABOVE_PEAK", "Nhịp tim sau 10 phút không được lớn hơn nhịp tim tối đa.");
      }
      const signs = Array.isArray(body.abnormalSignTypes) ? (body.abnormalSignTypes as string[]) : [];
      if (signs.length > 0 && String(body.abnormalNotes ?? "").trim().length < 10) {
        throw new ApiError(400, "ABNORMAL_NOTES_REQUIRED", "Vui lòng mô tả dấu hiệu bất thường.");
      }
      const distance = Number(body.actualDistanceMeters);
      const time = body.actualTimeSeconds == null ? null : Number(body.actualTimeSeconds);
      const nowIso = new Date().toISOString();
      Object.assign(w, {
        status: "COMPLETED",
        actualDistanceMeters: distance,
        actualTimeSeconds: time,
        averageSpeedKmh: time ? Math.round((distance / time) * 3.6 * 10) / 10 : null,
        actualSurface: body.actualSurface ?? w.trackSurface,
        trackCondition: body.trackCondition ?? null,
        heartRatePeak: body.heartRatePeak ?? null,
        heartRateRecovery: body.heartRateRecovery ?? null,
        topSpeedKmh: body.topSpeedKmh ?? null,
        performanceScore: Number(body.performanceScore),
        completionLevel: String(body.completionLevel),
        resultNotes: String(body.trainerNotes ?? ""),
        abnormalSignTypes: signs,
        abnormalSigns: signs.length > 0,
        abnormalNotes: signs.length > 0 ? String(body.abnormalNotes) : null,
        ...(editing
          ? { resultUpdatedAt: nowIso, resultUpdatedById: user.id }
          : { resultRecordedAt: nowIso, resultRecordedById: user.id }),
      });
      saveStoredWorkouts(rows);
      audit(db, user.fullName, "RECORD_WORKOUT_RESULT", `Recorded result for workout ${w.id}`);
      return decorateWorkout(w);
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/horses\/([^/]+)\/fitness-metrics$/,
    handler({ db, params, url }) {
      const user = currentUser(db);
      const h = mockHorse(params[0]);
      const weeks = [4, 12, 26].includes(Number(url.searchParams.get("weeks"))) ? Number(url.searchParams.get("weeks")) : 12;
      const from = Date.now() - weeks * 7 * 24 * 3600_000;
      const done = getStoredWorkouts()
        .filter((w) => w.horseId === h.id && w.status === "COMPLETED")
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      const points = done
        .filter((w) => new Date(w.scheduledDate).getTime() >= from)
        .map((w) => ({
          workoutId: w.id,
          date: w.scheduledDate,
          workoutType: w.workoutType,
          distanceMeters: w.actualDistanceMeters ?? w.distanceMeters * (w.repetitions ?? 1),
          timeSeconds: w.actualTimeSeconds ?? null,
          avgSpeedKmh: ["CANTER", "BREEZE", "TRIAL"].includes(String(w.workoutType)) ? (w.averageSpeedKmh ?? null) : null,
          maxHeartRate: w.heartRatePeak ?? null,
          recoveryHeartRate: w.heartRateRecovery ?? null,
          performanceScore: user.role === "GROOM" ? null : (w.performanceScore ?? null),
          load: loadMock(w),
          hasAlert: Boolean(w.abnormalSigns),
        }));
      const weekly = new Map<string, number>();
      for (const pt of points) {
        const key = mondayOf(pt.date);
        weekly.set(key, Math.round(((weekly.get(key) ?? 0) + pt.load) * 10) / 10);
      }
      const load7d = sumLoadMock(done, 7, 0);
      const avg4w = sumLoadMock(done, 35, 7) / 4;
      const last4 = points.slice(-4);
      const avg = (xs: (number | null)[]) => {
        const v = xs.filter((x): x is number => x != null);
        return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
      };
      const best = points.reduce<{ value: number; date: string } | null>(
        (m, pt) => (pt.avgSpeedKmh != null && (!m || pt.avgSpeedKmh > m.value) ? { value: pt.avgSpeedKmh, date: pt.date } : m),
        null,
      );
      const stored = getStoredHorses().find((x) => x.id === h.id);
      return {
        horse: { id: h.id, name: h.name, horseCode: h.horseCode, status: h.status, isMedicalLocked: h.isLocked },
        points,
        weeklyLoad: [...weekly.entries()].map(([weekStart, load]) => ({ weekStart, load })),
        lockPeriods: stored?.isLocked ? [{ from: stored.lockDate ?? new Date().toISOString(), to: null }] : [],
        summary: {
          bestAvgSpeed: best,
          avgScoreLast4: avg(last4.map((pt) => pt.performanceScore)),
          avgRecoveryLast4: avg(last4.map((pt) => pt.recoveryHeartRate)),
          load7d,
          loadChangePct: avg4w > 0 ? Math.round(((load7d - avg4w) / avg4w) * 100) : null,
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/overview$/,
    handler({ db }) {
      trainingRole(currentUser(db), ["CLUB_MANAGER", "HEAD_TRAINER", "VETERINARIAN"]);
      sweepTraining();
      const today = todayIso();
      const horses = getStoredHorses().filter((h) => horseStatusOf(h) !== "RETIRED");
      const plans = getStoredPlans().filter((p) => p.status === "ACTIVE");
      const all = getStoredWorkouts();
      const rows = horses.map((h) => {
        const plan = plans.find((p) => p.horseId === h.id);
        const phases = (plan && Array.isArray(plan.phases) ? plan.phases : []) as { name: string; startDate: string; endDate: string }[];
        const ph = phases.find((x) => x.startDate <= today && today <= x.endDate);
        const done = all.filter((w) => w.horseId === h.id && w.status === "COMPLETED").sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        const scored = done.filter((w) => w.performanceScore != null);
        const prev3 = scored.slice(-4, -1).map((w) => w.performanceScore as number);
        const load7d = sumLoadMock(done, 7, 0);
        const avg4w = sumLoadMock(done, 35, 7) / 4;
        const next = all
          .filter((w) => w.horseId === h.id && w.status === "SCHEDULED" && new Date(w.scheduledDate).getTime() >= Date.now())
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
        const dayMs = 24 * 3600_000;
        return {
          horse: { id: h.id, name: h.name, horseCode: h.horseCode ?? h.code, status: horseStatusOf(h), isMedicalLocked: Boolean(h.isLocked) },
          plan: plan ? { id: plan.id, planCode: plan.planCode, name: plan.phaseName } : null,
          currentPhase: ph
            ? {
                name: ph.name,
                week: Math.floor((Date.parse(today) - Date.parse(ph.startDate)) / (7 * dayMs)) + 1,
                weeks: Math.ceil((Date.parse(ph.endDate) - Date.parse(ph.startDate) + dayMs) / (7 * dayMs)),
              }
            : null,
          progress: plan ? progressMock(plan.id) : null,
          latestScore: scored[scored.length - 1]?.performanceScore ?? null,
          previousAvgScore: prev3.length ? Math.round((prev3.reduce((a, b) => a + b, 0) / prev3.length) * 10) / 10 : null,
          load7d,
          loadSpike: avg4w > 0 && load7d > avg4w * 1.3,
          nextWorkout: next ? { date: next.scheduledDate, workoutType: next.workoutType } : null,
        };
      });
      const todays = all.filter((w) => clubDay(w.scheduledDate) === today && w.status !== "CANCELLED");
      const in7 = new Date(Date.now() + 8 * 24 * 3600_000).toISOString().slice(0, 10);
      return {
        kpis: {
          activePlans: plans.length,
          managedHorses: horses.length,
          todayCompleted: todays.filter((w) => w.status === "COMPLETED").length,
          todayTotal: todays.length,
          blockedNext7Days: all.filter((w) => w.status === "BLOCKED" && clubDay(w.scheduledDate) >= today && clubDay(w.scheduledDate) < in7).length,
          loadSpikeHorses: rows.filter((r) => r.loadSpike).length,
        },
        rows,
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/training\/plans\/([^/]+)\/workouts\/repeat$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      trainingRole(user, ["HEAD_TRAINER"]);
      const plan = getStoredPlans().find((x) => x.id === params[0]);
      if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Training plan not found.");
      const weekdays = Array.isArray(body.weekdays) ? (body.weekdays as number[]) : [];
      if (weekdays.length === 0) throw new ApiError(400, "VALIDATION", "Vui lòng chọn ít nhất 1 thứ trong tuần.");
      const first = new Date(String(body.scheduledDate));
      const time = new Date(first.getTime() + 7 * 3600_000).toISOString().slice(11, 16);
      const until = String(body.until).slice(0, 10);
      const dates: string[] = [];
      for (let d = clubDay(first.toISOString()); d <= until; d = new Date(Date.parse(`${d}T00:00:00Z`) + 24 * 3600_000).toISOString().slice(0, 10)) {
        const weekday = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
        if (weekdays.includes(weekday)) dates.push(d);
      }
      if (dates.length > 60) throw new ApiError(400, "TOO_MANY_REPEATS", "Mỗi lần chỉ tạo tối đa 60 buổi tập.");
      const skippable = ["MEDICAL_LOCK_ACTIVE", "HORSE_RETIRED", "TRIAL_SLOT_TAKEN", "MAX_WORKOUTS_PER_DAY", "DATE_IN_PAST", "OUTSIDE_PHASE_DATES", "OUTSIDE_PLAN_DATES"];
      let created = 0;
      const skipped: { date: string; reason: string }[] = [];
      dates.forEach((d, i) => {
        const type = String(body.workoutType);
        const draft: MockWorkout = {
          id: `w-${Date.now()}-${i}`,
          trainingPlanId: plan.id,
          horseId: plan.horseId,
          phaseId: String(body.phaseId),
          scheduledDate: new Date(`${d}T${time}:00+07:00`).toISOString(),
          workoutType: type,
          intensity: type === "BREEZE" || type === "TRIAL" ? "HEAVY" : String(body.intensity),
          trackSurface: type === "SWIM" || type === "TREADMILL" ? "NONE" : String(body.trackSurface),
          distanceMeters: Number(body.distanceMeters),
          repetitions: Number(body.repetitions ?? 1),
          targetSpeedKmh: body.targetSpeedKmh == null ? null : Number(body.targetSpeedKmh),
          jockeyName: body.jockeyName ? String(body.jockeyName) : null,
          assignedStaffUserId: String(body.assignedStaffUserId ?? ""),
          trainerNotes: body.trainerNotes ? String(body.trainerNotes) : null,
          status: "SCHEDULED",
          statusReason: null,
          medicalOverride: false,
          abnormalSigns: false,
          abnormalSignTypes: [],
        };
        try {
          draft.medicalOverride = assertWorkoutAllowedMock(db, plan, draft, Boolean(body.vetConsulted));
          saveStoredWorkouts([...getStoredWorkouts(), draft]);
          created += 1;
        } catch (e) {
          if (!(e instanceof ApiError) || !skippable.includes(e.code)) throw e;
          skipped.push({ date: d, reason: e.message });
        }
      });
      return { created, skipped };
    },
  },
  {
    method: "PATCH",
    pattern: /^\/training\/workouts\/([^/]+)$/,
    handler({ db, params, body }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER"]);
      const rows = getStoredWorkouts();
      const w = rows.find((x) => x.id === params[0]);
      if (!w) throw new ApiError(404, "WORKOUT_NOT_FOUND", "Workout session not found.");
      if (w.status !== "SCHEDULED" || new Date(w.scheduledDate).getTime() <= Date.now()) {
        throw new ApiError(400, "WORKOUT_NOT_EDITABLE", "Chỉ sửa được buổi tập Đã lên lịch và chưa tới giờ bắt đầu.");
      }
      const plan = getStoredPlans().find((x) => x.id === w.trainingPlanId)!;
      const type = String(body.workoutType ?? w.workoutType);
      const next: MockWorkout = {
        ...w,
        ...(body.scheduledDate ? { scheduledDate: new Date(String(body.scheduledDate)).toISOString() } : {}),
        phaseId: body.phaseId ? String(body.phaseId) : w.phaseId,
        workoutType: type,
        intensity: type === "BREEZE" || type === "TRIAL" ? "HEAVY" : String(body.intensity ?? w.intensity),
        trackSurface: type === "SWIM" || type === "TREADMILL" ? "NONE" : String(body.trackSurface ?? w.trackSurface),
        distanceMeters: Number(body.distanceMeters ?? w.distanceMeters),
        repetitions: Number(body.repetitions ?? w.repetitions ?? 1),
        targetSpeedKmh: body.targetSpeedKmh === undefined ? w.targetSpeedKmh : body.targetSpeedKmh == null ? null : Number(body.targetSpeedKmh),
        jockeyName: body.jockeyName === undefined ? w.jockeyName : body.jockeyName ? String(body.jockeyName) : null,
        assignedStaffUserId: String(body.assignedStaffUserId ?? w.assignedStaffUserId ?? ""),
        trainerNotes: body.trainerNotes === undefined ? w.trainerNotes : String(body.trainerNotes),
      };
      next.medicalOverride = assertWorkoutAllowedMock(db, plan, next, Boolean(body.vetConsulted ?? w.medicalOverride), w.id);
      assertWarningsMock(db, plan, next, Boolean(body.acknowledgeWarnings), w.id);
      Object.assign(w, next);
      saveStoredWorkouts(rows);
      return decorateWorkout(w);
    },
  },
  {
    method: "GET",
    pattern: /^\/training\/alerts$/,
    handler({ db }) {
      trainingRole(currentUser(db), ["HEAD_TRAINER", "VETERINARIAN"]);
      return getStoredWorkouts()
        .filter((w) => w.abnormalSigns)
        .sort((a, b) => String(b.resultRecordedAt).localeCompare(String(a.resultRecordedAt)))
        .map(decorateWorkout);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/training\/alerts\/([^/]+)$/,
    handler({ db, params, body }) {
      trainingRole(currentUser(db), ["VETERINARIAN"]);
      const rows = getStoredWorkouts();
      const w = rows.find((x) => x.id === params[0] && x.abnormalSigns);
      if (!w) throw new ApiError(404, "ALERT_NOT_FOUND", "Training alert not found.");
      w.vetAcknowledgedAt = new Date().toISOString();
      w.vetNotes = String(body.vetNotes ?? "");
      saveStoredWorkouts(rows);
      return decorateWorkout(w);
    },
  },

  // ===== FLOW 4 PHASE 1: SUPPLIES CATALOG (SC-4.10, DL-4.15) =====
  {
    method: "GET",
    pattern: /^\/supplies$/,
    handler({ db, url }) {
      const user = currentUser(db);
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const category = url.searchParams.get("category");
      const isActiveParam = url.searchParams.get("isActive");

      let items = getStoredSupplies();
      if (search) {
        items = items.filter(
          (s) => s.name.toLowerCase().includes(search) || s.code.toLowerCase().includes(search) || (s.description ?? "").toLowerCase().includes(search),
        );
      }
      if (category) {
        items = items.filter((s) => s.category === category);
      }
      if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
        const active = isActiveParam === "true";
        items = items.filter((s) => s.isActive === active);
      }

      // Rule Q-4.11 / DL-4.15: Data masking for unitPrice
      if (user.role !== "CLUB_MANAGER") {
        items = items.map((s) => ({ ...s, unitPrice: null }));
      }
      return items;
    },
  },
  {
    method: "GET",
    pattern: /^\/supplies\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const [id] = params;
      const item = getStoredSupplies().find((s) => s.id === id);
      if (!item) throw new ApiError(404, "SUPPLY_NOT_FOUND", "Vật tư không tồn tại.");
      if (user.role !== "CLUB_MANAGER") {
        return { ...item, unitPrice: null };
      }
      return item;
    },
  },
  {
    method: "POST",
    pattern: /^\/supplies$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền tạo vật tư.");
      const items = getStoredSupplies();
      const code = String(body.code ?? "").trim().toUpperCase();
      if (items.some((s) => s.code === code)) {
        throw new ApiError(409, "SUPPLY_CODE_EXISTS", `Mã vật tư '${code}' đã tồn tại.`);
      }
      const newItem: SupplyCatalogItem = {
        id: `sup-${Date.now()}`,
        code,
        name: String(body.name ?? "").trim(),
        category: body.category as SupplyCatalogItem["category"],
        unit: body.unit as SupplyCatalogItem["unit"],
        unitPrice: body.unitPrice != null ? Number(body.unitPrice) : null,
        withdrawalDays: body.withdrawalDays != null ? Number(body.withdrawalDays) : null,
        description: body.description ? String(body.description) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      items.push(newItem);
      saveStoredSupplies(items);
      return newItem;
    },
  },
  {
    method: "PUT",
    pattern: /^\/supplies\/([^/]+)$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền sửa vật tư.");
      const [id] = params;
      const items = getStoredSupplies();
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) throw new ApiError(404, "SUPPLY_NOT_FOUND", "Vật tư không tồn tại.");
      if (body.code) {
        const code = String(body.code).trim().toUpperCase();
        if (items.some((s) => s.code === code && s.id !== id)) {
          throw new ApiError(409, "SUPPLY_CODE_EXISTS", `Mã vật tư '${code}' đã tồn tại.`);
        }
        items[idx].code = code;
      }
      if (body.name) items[idx].name = String(body.name).trim();
      if (body.category) items[idx].category = body.category as SupplyCatalogItem["category"];
      if (body.unit) items[idx].unit = body.unit as SupplyCatalogItem["unit"];
      if (body.unitPrice !== undefined) items[idx].unitPrice = body.unitPrice != null ? Number(body.unitPrice) : null;
      if (body.withdrawalDays !== undefined) items[idx].withdrawalDays = body.withdrawalDays != null ? Number(body.withdrawalDays) : null;
      if (body.description !== undefined) items[idx].description = body.description ? String(body.description) : null;
      if (body.isActive !== undefined) items[idx].isActive = Boolean(body.isActive);
      items[idx].updatedAt = new Date().toISOString();
      saveStoredSupplies(items);
      return items[idx];
    },
  },
  {
    method: "PATCH",
    pattern: /^\/supplies\/([^/]+)\/status$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền đổi trạng thái vật tư.");
      const [id] = params;
      const items = getStoredSupplies();
      const item = items.find((s) => s.id === id);
      if (!item) throw new ApiError(404, "SUPPLY_NOT_FOUND", "Vật tư không tồn tại.");
      item.isActive = Boolean(body.isActive);
      item.updatedAt = new Date().toISOString();
      saveStoredSupplies(items);
      return item;
    },
  },

  // ===== FLOW 4 PHASE 1: SHIFT CATALOG (SC-4.11, DL-4.16) =====
  {
    method: "GET",
    pattern: /^\/shifts$/,
    handler({ url }) {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const isActiveParam = url.searchParams.get("isActive");

      let items = getStoredShifts();
      if (search) {
        items = items.filter(
          (s) => s.name.toLowerCase().includes(search) || s.code.toLowerCase().includes(search) || (s.description ?? "").toLowerCase().includes(search),
        );
      }
      if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
        const active = isActiveParam === "true";
        items = items.filter((s) => s.isActive === active);
      }
      return items;
    },
  },
  {
    method: "GET",
    pattern: /^\/shifts\/([^/]+)$/,
    handler({ params }) {
      const [id] = params;
      const item = getStoredShifts().find((s) => s.id === id);
      if (!item) throw new ApiError(404, "SHIFT_NOT_FOUND", "Ca làm việc không tồn tại.");
      return item;
    },
  },
  {
    method: "POST",
    pattern: /^\/shifts$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền tạo ca làm việc.");
      const items = getStoredShifts();
      const code = String(body.code ?? "").trim().toUpperCase();
      if (items.some((s) => s.code === code)) {
        throw new ApiError(409, "SHIFT_CODE_EXISTS", `Mã ca '${code}' đã tồn tại.`);
      }
      const newItem: ShiftCatalogItem = {
        id: `shift-${Date.now()}`,
        code,
        name: String(body.name ?? "").trim(),
        startTime: String(body.startTime ?? "").trim(),
        endTime: String(body.endTime ?? "").trim(),
        isOvernight: Boolean(body.isOvernight),
        sortOrder: Number(body.sortOrder ?? items.length + 1),
        description: body.description ? String(body.description) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      items.push(newItem);
      saveStoredShifts(items);
      return newItem;
    },
  },
  {
    method: "PUT",
    pattern: /^\/shifts\/([^/]+)$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền sửa ca làm việc.");
      const [id] = params;
      const items = getStoredShifts();
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) throw new ApiError(404, "SHIFT_NOT_FOUND", "Ca làm việc không tồn tại.");
      if (body.code) {
        const code = String(body.code).trim().toUpperCase();
        if (items.some((s) => s.code === code && s.id !== id)) {
          throw new ApiError(409, "SHIFT_CODE_EXISTS", `Mã ca '${code}' đã tồn tại.`);
        }
        items[idx].code = code;
      }
      if (body.name) items[idx].name = String(body.name).trim();
      if (body.startTime) items[idx].startTime = String(body.startTime).trim();
      if (body.endTime) items[idx].endTime = String(body.endTime).trim();
      if (body.isOvernight !== undefined) items[idx].isOvernight = Boolean(body.isOvernight);
      if (body.sortOrder !== undefined) items[idx].sortOrder = Number(body.sortOrder);
      if (body.description !== undefined) items[idx].description = body.description ? String(body.description) : null;
      if (body.isActive !== undefined) items[idx].isActive = Boolean(body.isActive);
      items[idx].updatedAt = new Date().toISOString();
      saveStoredShifts(items);
      return items[idx];
    },
  },
  {
    method: "PATCH",
    pattern: /^\/shifts\/([^/]+)\/status$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền đổi trạng thái ca.");
      const [id] = params;
      const items = getStoredShifts();
      const item = items.find((s) => s.id === id);
      if (!item) throw new ApiError(404, "SHIFT_NOT_FOUND", "Ca làm việc không tồn tại.");
      item.isActive = Boolean(body.isActive);
      item.updatedAt = new Date().toISOString();
      saveStoredShifts(items);
      return item;
    },
  },

  // ===== FLOW 4 PHASE 1: SHIFT ROSTER (SC-4.01, DL-4.01, DL-4.02) =====
  {
    method: "GET",
    pattern: /^\/shift-rosters\/my$/,
    handler({ db, url }) {
      const user = currentUser(db);
      const startDate = url.searchParams.get("startDate")?.slice(0, 10);
      const endDate = url.searchParams.get("endDate")?.slice(0, 10);
      const zoneId = url.searchParams.get("zoneId");
      const rosters = getStoredRosters();
      const shifts = getStoredShifts();
      let userRosters = rosters.filter((r) => r.groomUserId === user.id);
      if (zoneId) {
        userRosters = userRosters.filter((r) => r.zoneId === zoneId);
      }
      if (startDate) {
        userRosters = userRosters.filter((r) => r.date.slice(0, 10) >= startDate);
      }
      if (endDate) {
        userRosters = userRosters.filter((r) => r.date.slice(0, 10) <= endDate);
      }

      return userRosters.map((r) => {
        const shift = shifts.find((s) => s.id === r.shiftId) ?? r.shift;
        const zone = MOCK_ZONES.find((z) => z.id === r.zoneId) ?? r.zone;
        return {
          ...r,
          shift,
          zone: { id: zone.id, code: zone.code, name: zone.name, rows: zone.rows, cols: zone.cols, sortOrder: zone.sortOrder, isActive: true },
        };
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/shift-rosters$/,
    handler({ db, url }) {
      const weekStart = url.searchParams.get("weekStart");
      const zoneId = url.searchParams.get("zoneId");
      const groomUserId = url.searchParams.get("groomUserId");

      let rosters = getStoredRosters();
      const shifts = getStoredShifts();

      if (weekStart) {
        const start = weekStart.slice(0, 10);
        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        const end = endDate.toISOString().slice(0, 10);
        rosters = rosters.filter((r) => {
          const d = r.date.slice(0, 10);
          return d >= start && d < end;
        });
      }
      if (zoneId) {
        rosters = rosters.filter((r) => r.zoneId === zoneId);
      }
      if (groomUserId) {
        rosters = rosters.filter((r) => r.groomUserId === groomUserId);
      }

      return rosters.map((r) => {
        const shift = shifts.find((s) => s.id === r.shiftId) ?? r.shift;
        const zone = MOCK_ZONES.find((z) => z.id === r.zoneId) ?? r.zone;
        const groom = db.accounts.find((a) => a.id === r.groomUserId);
        return {
          ...r,
          shift,
          zone: { id: zone.id, code: zone.code, name: zone.name, rows: zone.rows, cols: zone.cols, sortOrder: zone.sortOrder, isActive: true },
          groom: groom
            ? { id: groom.id, fullName: groom.fullName, email: groom.email, status: groom.status, role: groom.role }
            : r.groom,
        };
      });
    },
  },
  {
    method: "POST",
    pattern: /^\/shift-rosters$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền phân ca trực.");
      const shiftId = String(body.shiftId);
      const zoneId = String(body.zoneId);
      const groomUserId = String(body.groomUserId ?? (Array.isArray(body.groomUserIds) ? body.groomUserIds[0] : ""));
      const date = String(body.date ?? body.workDate ?? "").slice(0, 10);
      const notes = body.notes ? String(body.notes) : null;

      const shifts = getStoredShifts();
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift || !shift.isActive) throw new ApiError(400, "INVALID_SHIFT", "Ca làm việc không tồn tại hoặc đã ngừng hoạt động.");

      const zone = MOCK_ZONES.find((z) => z.id === zoneId);
      if (!zone) throw new ApiError(400, "INVALID_ZONE", "Khu chuồng không tồn tại.");

      const groom = db.accounts.find((a) => a.id === groomUserId && a.role === "GROOM" && a.status === "ACTIVE");
      if (!groom) throw new ApiError(400, "INVALID_GROOM", "Nhân viên chăm sóc không tồn tại hoặc không còn hoạt động.");

      const rosters = getStoredRosters();
      const existingIdx = rosters.findIndex((r) => r.shiftId === shiftId && r.zoneId === zoneId && r.date.slice(0, 10) === date);

      const zoneObj = { id: zone.id, code: zone.code, name: zone.name, rows: zone.rows, cols: zone.cols, sortOrder: zone.sortOrder, isActive: true };
      const groomObj = { id: groom.id, fullName: groom.fullName, email: groom.email, status: groom.status, role: groom.role };

      if (existingIdx >= 0) {
        rosters[existingIdx].groomUserId = groomUserId;
        rosters[existingIdx].notes = notes;
        rosters[existingIdx].groom = groomObj;
        saveStoredRosters(rosters);
        return rosters[existingIdx];
      }

      const newRoster: ShiftRosterItem = {
        id: `roster-${Date.now()}`,
        shiftId,
        zoneId,
        groomUserId,
        date,
        notes,
        shift,
        zone: zoneObj,
        groom: groomObj,
      };
      rosters.push(newRoster);
      saveStoredRosters(rosters);
      return newRoster;
    },
  },
  {
    method: "POST",
    pattern: /^\/shift-rosters\/copy-week$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền sao chép lịch trực.");
      const sourceWeekStart = String(body.sourceWeekStart).slice(0, 10);
      const targetWeekStart = String(body.targetWeekStart).slice(0, 10);

      const sourceMonday = new Date(sourceWeekStart);
      const targetMonday = new Date(targetWeekStart);

      const diffMs = targetMonday.getTime() - sourceMonday.getTime();
      const dayOffset = Math.round(diffMs / (24 * 60 * 60 * 1000));

      const rosters = getStoredRosters();
      const sourceEnd = new Date(sourceMonday);
      sourceEnd.setDate(sourceEnd.getDate() + 7);
      const sourceEndStr = sourceEnd.toISOString().slice(0, 10);

      const targetEnd = new Date(targetMonday);
      targetEnd.setDate(targetEnd.getDate() + 7);
      const targetEndStr = targetEnd.toISOString().slice(0, 10);

      const sourceItems = rosters.filter((r) => {
        const d = r.date.slice(0, 10);
        return d >= sourceWeekStart && d < sourceEndStr;
      });

      if (sourceItems.length === 0) {
        throw new ApiError(400, "NO_SOURCE_ROSTER", "Tuần nguồn không có dữ liệu phân ca.");
      }

      // Xóa các ca ở tuần đích trước khi ghi đè
      const remaining = rosters.filter((r) => {
        const d = r.date.slice(0, 10);
        return !(d >= targetWeekStart && d < targetEndStr);
      });

      const shifts = getStoredShifts();
      let copiedCount = 0;

      for (const item of sourceItems) {
        const groom = db.accounts.find((a) => a.id === item.groomUserId && a.role === "GROOM" && a.status === "ACTIVE");
        if (!groom) continue; // Bỏ qua groom bị khóa hoặc không còn hoạt động

        const originalDate = new Date(item.date);
        originalDate.setDate(originalDate.getDate() + dayOffset);
        const newDateStr = originalDate.toISOString().slice(0, 10);

        const shift = shifts.find((s) => s.id === item.shiftId) ?? item.shift;
        const zone = MOCK_ZONES.find((z) => z.id === item.zoneId) ?? item.zone;

        remaining.push({
          id: `roster-${Date.now()}-${copiedCount}`,
          shiftId: item.shiftId,
          zoneId: item.zoneId,
          groomUserId: item.groomUserId,
          date: newDateStr,
          notes: item.notes,
          shift,
          zone: { id: zone.id, code: zone.code, name: zone.name, rows: zone.rows, cols: zone.cols, sortOrder: zone.sortOrder, isActive: true },
          groom: { id: groom.id, fullName: groom.fullName, email: groom.email, status: groom.status, role: groom.role },
        });
        copiedCount++;
      }

      saveStoredRosters(remaining);
      return { copiedCount };
    },
  },
  {
    method: "DELETE",
    pattern: /^\/shift-rosters\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý CLB mới có quyền xóa ca trực.");
      const [id] = params;
      const rosters = getStoredRosters();
      const idx = rosters.findIndex((r) => r.id === id);
      if (idx === -1) throw new ApiError(404, "ROSTER_NOT_FOUND", "Ca trực không tồn tại.");
      rosters.splice(idx, 1);
      saveStoredRosters(rosters);
      return { success: true };
    },
  },
  // ---- Flow 4 Phase 2: Khẩu phần dinh dưỡng (Nutrition & Meal Rations)
  {
    method: "GET",
    pattern: /^\/nutrition-plans$/,
    handler({ db, url }) {
      const user = currentUser(db);
      let plans = getStoredNutritionPlans();
      const horses = getStoredHorses();

      // RBAC
      if (user.role === "GROOM") {
        plans = plans.filter((p) => p.status === "APPROVED");
      } else if (user.role === "HORSE_OWNER") {
        const myHorseIds = new Set(horses.filter((h) => h.ownerId === user.id).map((h) => h.id));
        plans = plans.filter((p) => p.status === "APPROVED" && myHorseIds.has(p.horseId));
      } else {
        const st = url.searchParams.get("status");
        if (st && st !== "ALL") {
          plans = plans.filter((p) => p.status === st);
        }
      }

      const horseId = url.searchParams.get("horseId");
      if (horseId) {
        plans = plans.filter((p) => p.horseId === horseId);
      }

      const zoneId = url.searchParams.get("zoneId");
      if (zoneId && zoneId !== "ALL") {
        plans = plans.filter((p) => {
          const h = horses.find((x) => x.id === p.horseId);
          if (!h || !h.stall) return false;
          return h.stall.toUpperCase().includes(zoneId.toUpperCase());
        });
      }

      const search = (url.searchParams.get("search") || "").trim().toLowerCase();
      if (search) {
        plans = plans.filter((p) => {
          const h = horses.find((x) => x.id === p.horseId);
          return (
            p.planCode.toLowerCase().includes(search) ||
            (h?.name && h.name.toLowerCase().includes(search)) ||
            (h?.horseCode && h.horseCode.toLowerCase().includes(search))
          );
        });
      }

      const items = plans.map((p) => {
        const h = horses.find((x) => x.id === p.horseId);
        const stallCode = h?.stall || null;
        let currentZone: { id: string; name: string; code: string } | null = null;
        if (stallCode) {
          const zChar = stallCode.replace("STALL-", "").charAt(0);
          const z = MOCK_ZONES.find((zn) => zn.code === zChar);
          if (z) currentZone = { id: z.id, name: z.name, code: z.code };
        }
        return {
          ...p,
          horse: h
            ? {
                id: h.id,
                name: h.name,
                horseCode: h.horseCode ?? h.code,
                microchipRfid: h.microchipRfid ?? h.microchip,
                avatarUrl: (h as any)?.avatarUrl,
                status: horseStatusOf(h),
                isMedicalLocked: Boolean(h.isLocked),
              }
            : undefined,
          horseWeight: p.horseWeightSnapshot || 500,
          currentZone,
          currentStallCode: stallCode,
          isWithinSafeRange: p.targetWeightRatioPct >= 1.5 && p.targetWeightRatioPct <= 3.0,
        };
      });

      return {
        items,
        pagination: {
          page: 1,
          limit: items.length,
          total: items.length,
          totalPages: 1,
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/nutrition-plans\/horses\/([^/]+)\/active$/,
    handler({ params }) {
      const [horseId] = params;
      const plans = getStoredNutritionPlans();
      const active = plans.find((p) => p.horseId === horseId && p.status === "APPROVED");
      return active || null;
    },
  },
  {
    method: "POST",
    pattern: /^\/nutrition-plans\/calculate-metrics$/,
    handler({ body }) {
      const { horseId, meals } = body as { horseId: string; meals: Array<{ items: Array<{ amount: number; unit: string }> }> };
      const horses = getStoredHorses();
      const h = horses.find((x) => x.id === horseId);
      const horseWeightKg = (h as unknown as { weight?: number })?.weight || 500;

      let totalKg = 0;
      for (const m of meals || []) {
        for (const it of m.items || []) {
          const u = (it.unit || "").toUpperCase();
          if (u === "KG") totalKg += Number(it.amount);
          else if (u === "G") totalKg += Number(it.amount) / 1000;
          else if (u === "LITER") totalKg += Number(it.amount);
          else if (u === "ML") totalKg += Number(it.amount) / 1000;
        }
      }

      const dailyFeedWeightKg = Math.round(totalKg * 100) / 100;
      const targetWeightRatioPct = Math.round((dailyFeedWeightKg / horseWeightKg) * 1000) / 10;
      let evaluation: "OPTIMAL" | "UNDER_MINIMUM" | "EXCEEDS_MAXIMUM" = "OPTIMAL";
      let warningMessage: string | undefined;

      if (targetWeightRatioPct < 1.5) {
        evaluation = "UNDER_MINIMUM";
        warningMessage = `Khẩu phần ăn (${targetWeightRatioPct}%) dưới ngưỡng khuyến nghị 1.5% khối lượng cơ thể (nguy cơ thiếu hụt dinh dưỡng).`;
      } else if (targetWeightRatioPct > 3.0) {
        evaluation = "EXCEEDS_MAXIMUM";
        warningMessage = `Khẩu phần ăn (${targetWeightRatioPct}%) vượt quá ngưỡng tối đa 3.0% khối lượng cơ thể (nguy cơ bội thực / đau bụng colic).`;
      }

      return {
        dailyFeedWeightKg,
        horseWeightKg,
        targetWeightRatioPct,
        isWithinSafeRange: evaluation === "OPTIMAL",
        evaluation,
        warningMessage,
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/nutrition-plans\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const [id] = params;
      const plans = getStoredNutritionPlans();
      const plan = plans.find((p) => p.id === id);
      if (!plan) throw new ApiError(404, "NOT_FOUND", "Khẩu phần ăn không tồn tại.");

      if (user.role === "GROOM" && plan.status !== "APPROVED") {
        throw new ApiError(403, "FORBIDDEN", "Groom chỉ được xem khẩu phần đã duyệt.");
      }

      const horses = getStoredHorses();
      const h = horses.find((x) => x.id === plan.horseId);
      return {
        ...plan,
        horse: h
          ? {
              id: h.id,
              name: h.name,
              horseCode: h.horseCode ?? h.code,
              avatarUrl: (h as any)?.avatarUrl,
              status: horseStatusOf(h),
              isMedicalLocked: Boolean(h.isLocked),
            }
          : undefined,
        horseWeight: plan.horseWeightSnapshot || 500,
        isWithinSafeRange: plan.targetWeightRatioPct >= 1.5 && plan.targetWeightRatioPct <= 3.0,
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/nutrition-plans$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "HEAD_TRAINER" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Huấn luyện viên trưởng hoặc Quản lý được tạo khẩu phần.");
      }
      const b = body as Record<string, unknown>;
      const plans = getStoredNutritionPlans();
      const planCode = `NP-2610-${String(plans.length + 1).padStart(3, "0")}`;
      const meals = (b.meals ?? []) as Array<{ items: Array<{ amount: number; unit: string }> }>;

      let totalKg = 0;
      for (const m of meals) {
        for (const it of m.items || []) {
          const u = (it.unit || "").toUpperCase();
          if (u === "KG") totalKg += Number(it.amount);
          else if (u === "G") totalKg += Number(it.amount) / 1000;
        }
      }
      const dailyFeedWeightKg = Math.round(totalKg * 100) / 100;
      const targetWeightRatioPct = Math.round((dailyFeedWeightKg / 500) * 1000) / 10;
      const status = b.submitImmediately ? "PENDING_APPROVAL" : "DRAFT";

      const newPlan = {
        id: `np-${Date.now()}`,
        planCode,
        horseId: String(b.horseId),
        status,
        dailyFeedWeightKg,
        targetWeightRatioPct,
        horseWeightSnapshot: 500,
        horseWeight: 500,
        isWithinSafeRange: targetWeightRatioPct >= 1.5 && targetWeightRatioPct <= 3.0,
        mealsJson: meals as any,
        specialInstructions: String(b.specialInstructions || ""),
        createdById: user.id,
        createdBy: { id: user.id, fullName: user.fullName, role: user.role },
        validFrom: String(b.validFrom || new Date().toISOString()),
        validTo: b.validTo ? String(b.validTo) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      plans.unshift(newPlan as any);
      saveStoredNutritionPlans(plans);
      return newPlan;
    },
  },
  {
    method: "PUT",
    pattern: /^\/nutrition-plans\/([^/]+)$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "HEAD_TRAINER" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Huấn luyện viên hoặc Quản lý được sửa khẩu phần.");
      }
      const [id] = params;
      const plans = getStoredNutritionPlans();
      const plan = plans.find((p) => p.id === id);
      if (!plan) throw new ApiError(404, "NOT_FOUND", "Khẩu phần không tồn tại.");
      if (plan.status !== "DRAFT" && plan.status !== "REJECTED") {
        throw new ApiError(400, "CANNOT_EDIT", "Chỉ sửa được bản nháp hoặc bản bị từ chối.");
      }

      const b = body as Record<string, unknown>;
      if (b.meals) plan.mealsJson = b.meals as any;
      if (b.specialInstructions !== undefined) plan.specialInstructions = String(b.specialInstructions);
      plan.updatedAt = new Date().toISOString();

      saveStoredNutritionPlans(plans);
      return plan;
    },
  },
  {
    method: "POST",
    pattern: /^\/nutrition-plans\/([^/]+)\/submit$/,
    handler({ db, params }) {
      const user = currentUser(db);
      if (user.role !== "HEAD_TRAINER" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Huấn luyện viên hoặc Quản lý được gửi duyệt.");
      }
      const [id] = params;
      const plans = getStoredNutritionPlans();
      const plan = plans.find((p) => p.id === id);
      if (!plan) throw new ApiError(404, "NOT_FOUND", "Khẩu phần không tồn tại.");
      plan.status = "PENDING_APPROVAL";
      plan.rejectionReason = undefined;
      plan.updatedAt = new Date().toISOString();
      saveStoredNutritionPlans(plans);
      return plan;
    },
  },
  {
    method: "POST",
    pattern: /^\/nutrition-plans\/([^/]+)\/review$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "VETERINARIAN" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Bác sĩ thú y hoặc Quản lý được duyệt khẩu phần.");
      }
      const [id] = params;
      const { action, rejectionReason, vetNotes } = body as { action: "APPROVE" | "REJECT"; rejectionReason?: string; vetNotes?: string };
      const plans = getStoredNutritionPlans();
      const plan = plans.find((p) => p.id === id);
      if (!plan) throw new ApiError(404, "NOT_FOUND", "Khẩu phần không tồn tại.");

      if (action === "APPROVE") {
        // Lưu trữ các bản approved cũ của ngựa này
        for (const p of plans) {
          if (p.horseId === plan.horseId && p.id !== id && p.status === "APPROVED") {
            p.status = "ARCHIVED";
          }
        }
        plan.status = "APPROVED";
        plan.approvedById = user.id;
        plan.approvedBy = { id: user.id, fullName: user.fullName, role: user.role };
        plan.approvedAt = new Date().toISOString();
        if (vetNotes) plan.vetNotes = vetNotes;
      } else {
        if (!rejectionReason?.trim()) {
          throw new ApiError(400, "REJECTION_REASON_REQUIRED", "Vui lòng nhập lý do từ chối.");
        }
        plan.status = "REJECTED";
        plan.rejectionReason = rejectionReason.trim();
        plan.approvedById = user.id;
        plan.approvedBy = { id: user.id, fullName: user.fullName, role: user.role };
        if (vetNotes) plan.vetNotes = vetNotes;
      }

      plan.updatedAt = new Date().toISOString();
      saveStoredNutritionPlans(plans);
      return plan;
    },
  },
  {
    method: "DELETE",
    pattern: /^\/nutrition-plans\/([^/]+)$/,
    handler({ db, params }) {
      const user = currentUser(db);
      if (user.role !== "HEAD_TRAINER" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Huấn luyện viên hoặc Quản lý được xóa khẩu phần.");
      }
      const [id] = params;
      const plans = getStoredNutritionPlans();
      const idx = plans.findIndex((p) => p.id === id);
      if (idx === -1) throw new ApiError(404, "NOT_FOUND", "Khẩu phần không tồn tại.");
      if (plans[idx].status !== "DRAFT" && plans[idx].status !== "REJECTED") {
        throw new ApiError(400, "CANNOT_DELETE", "Chỉ xóa được bản nháp hoặc bản bị từ chối.");
      }
      plans.splice(idx, 1);
      saveStoredNutritionPlans(plans);
      return { success: true, message: "Đã xóa khẩu phần." };
    },
  },
  // --- Phase 3: Daily Care Tasks & Incidents ---
  {
    method: "GET",
    pattern: /^\/daily-tasks$/,
    handler({ db, url }) {
      const user = currentUser(db);
      const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
      const zoneId = url.searchParams.get("zoneId");
      const horseId = url.searchParams.get("horseId");
      const isCompletedStr = url.searchParams.get("isCompleted");
      const onlyMyTasksParam = url.searchParams.get("onlyMyTasks") ?? url.searchParams.get("onlyMine");
      const onlyMyTasks = onlyMyTasksParam !== null
        ? (onlyMyTasksParam === "true")
        : (user.role === "GROOM");

      const rosters = getStoredRosters();
      const myRosters = rosters.filter((r) => r.groomUserId === user.id && r.date.slice(0, 10) === date);
      const myZoneIds = myRosters.map((r) => r.zoneId);

      const allTasks = getStoredDailyTasks();
      const items = allTasks.filter((t) => {
        if (t.date !== date) return false;
        if (zoneId && zoneId !== "ALL" && t.stallZoneId !== zoneId) return false;
        if (horseId && t.horseId !== horseId) return false;
        if (isCompletedStr !== null && isCompletedStr !== undefined && isCompletedStr !== "") {
          const isComp = isCompletedStr === "true";
          if (t.isCompleted !== isComp) return false;
        }
        if (onlyMyTasks) {
          const isAssigned =
            t.assignedGroomUserId === user.id ||
            t.completedById === user.id ||
            (user.role === "GROOM" && (t.assignedGroomUserId === "acc-groom" || t.assignedGroomUserId === "seed-groom"));
          const isInMyZone = Boolean(t.stallZoneId && myZoneIds.includes(t.stallZoneId));
          if (myZoneIds.length > 0) {
            if (!isInMyZone && !isAssigned) return false;
          } else {
            if (!isAssigned) return false;
          }
        }
        return true;
      });

      const total = items.length;
      const completed = items.filter((t) => t.isCompleted).length;
      const pending = total - completed;
      const medicalLockedCount = items.filter((t) => t.isMedicalLocked).length;

      return {
        items,
        summary: { total, completed, pending, medicalLockedCount },
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/daily-tasks\/generate$/,
    handler({ db, body }) {
      currentUser(db);
      const b = body as { date?: string; zoneId?: string };
      const targetDate = b.date || new Date().toISOString().slice(0, 10);
      const allTasks = getStoredDailyTasks();
      const existing = allTasks.filter((t) => t.date === targetDate);
      return {
        message: `Đã hoàn tất kiểm tra và khởi tạo danh sách việc cần làm cho ngày ${targetDate}.`,
        tasksCount: existing.length,
        createdCount: 0,
        skippedCount: existing.length,
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/daily-tasks\/([^/]+)\/complete$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      const [id] = params;
      const b = body as { notes?: string };
      const tasks = getStoredDailyTasks();
      const task = tasks.find((t) => t.id === id);
      if (!task) throw new ApiError(404, "NOT_FOUND", "Nhiệm vụ không tồn tại.");

      const now = new Date();
      const undoUntil = new Date(now.getTime() + 15 * 60 * 1000);

      task.isCompleted = true;
      task.completedById = user.id;
      task.completedBy = { id: user.id, fullName: user.fullName, role: user.role };
      task.completedAt = now.toISOString();
      task.undoUntil = undoUntil.toISOString();
      if (b.notes !== undefined) task.notes = b.notes;

      saveStoredDailyTasks(tasks);
      return task;
    },
  },
  {
    method: "POST",
    pattern: /^\/daily-tasks\/([^/]+)\/uncomplete$/,
    handler({ db, params }) {
      const user = currentUser(db);
      const [id] = params;
      const tasks = getStoredDailyTasks();
      const task = tasks.find((t) => t.id === id);
      if (!task) throw new ApiError(404, "NOT_FOUND", "Nhiệm vụ không tồn tại.");
      if (!task.isCompleted) throw new ApiError(400, "NOT_COMPLETED", "Nhiệm vụ chưa được đánh dấu hoàn thành.");

      const now = new Date();
      const isWindowValid = task.undoUntil && new Date(task.undoUntil) > now;
      if (!isWindowValid && user.role !== "CLUB_MANAGER") {
        throw new ApiError(400, "UNDO_WINDOW_EXPIRED", "Thời hạn hoàn tác 15 phút đã kết thúc. Vui lòng liên hệ Quản lý chuồng.");
      }

      task.isCompleted = false;
      task.completedById = undefined;
      task.completedBy = undefined;
      task.completedAt = undefined;
      task.undoUntil = undefined;

      saveStoredDailyTasks(tasks);
      return task;
    },
  },
  {
    method: "GET",
    pattern: /^\/incidents$/,
    handler({ db, url }) {
      currentUser(db);
      const horseId = url.searchParams.get("horseId");
      const severity = url.searchParams.get("severity");
      const status = url.searchParams.get("status");
      const zoneId = url.searchParams.get("zoneId");
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      let incidents = getStoredIncidents();
      if (horseId) incidents = incidents.filter((i) => i.horseId === horseId);
      if (severity) incidents = incidents.filter((i) => i.severity === severity);
      if (status) incidents = incidents.filter((i) => i.status === status);
      if (zoneId) incidents = incidents.filter((i) => i.stallZoneId === zoneId);
      if (search) {
        incidents = incidents.filter(
          (i) =>
            (i.incidentNumber || '').toLowerCase().includes(search) ||
            (i.description || '').toLowerCase().includes(search) ||
            (i.horse?.name || '').toLowerCase().includes(search) ||
            (i.horse?.horseCode || '').toLowerCase().includes(search),
        );
      }

      const total = incidents.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = incidents.slice((page - 1) * limit, page * limit);

      return {
        items: paginated,
        pagination: { page, limit, total, totalPages },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/incidents\/([^/]+)$/,
    handler({ db, params }) {
      currentUser(db);
      const [id] = params;
      const incidents = getStoredIncidents();
      const inc = incidents.find((i) => i.id === id);
      if (!inc) throw new ApiError(404, "NOT_FOUND", "Báo cáo sự cố không tồn tại.");
      return inc;
    },
  },
  {
    method: "POST",
    pattern: /^\/incidents$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const b = body as {
        horseId: string;
        stallZoneId?: string;
        severity: "MILD" | "MODERATE" | "CRITICAL";
        symptoms?: string[];
        symptomsJson?: string[];
        description: string;
      };

      if (!b.horseId || !b.severity || !b.description) {
        throw new ApiError(400, "MISSING_REQUIRED_FIELDS", "Vui lòng nhập đầy đủ thông tin sự cố.");
      }

      const horses = getStoredHorses();
      const horse = horses.find((h) => h.id === b.horseId);
      if (!horse) throw new ApiError(404, "HORSE_NOT_FOUND", "Ngựa không tồn tại.");

      const incidents = getStoredIncidents();
      const now = new Date();
      const count = incidents.length + 1;
      const incidentNumber = `INC-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, "0")}-${count.toString().padStart(4, "0")}`;

      const newInc: any = {
        id: `inc-${Date.now()}`,
        incidentNumber,
        horseId: b.horseId,
        horse: {
          id: horse.id,
          name: horse.name,
          horseCode: horse.horseCode ?? horse.code,
          avatarUrl: undefined,
          status: horseStatusOf(horse),
          isMedicalLocked: Boolean(horse.isLocked),
          stallAllocations: [],
        },
        stallZoneId: b.stallZoneId,
        reportedById: user.id,
        reportedBy: { id: user.id, fullName: user.fullName, role: user.role },
        severity: b.severity,
        symptomsJson: b.symptoms || b.symptomsJson || ['OTHER'],
        description: b.description,
        status: "REPORTED",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      incidents.unshift(newInc);
      saveStoredIncidents(incidents);
      return newInc;
    },
  },
  {
    method: "POST",
    pattern: /^\/incidents\/([^/]+)\/review$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "VETERINARIAN" && user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Bác sĩ thú y hoặc Quản lý CLB được duyệt sự cố.");
      }
      const [id] = params;
      const b = body as { status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED"; vetNotes?: string };
      const incidents = getStoredIncidents();
      const inc = incidents.find((i) => i.id === id);
      if (!inc) throw new ApiError(404, "NOT_FOUND", "Báo cáo sự cố không tồn tại.");

      const now = new Date();
      inc.status = b.status;
      if (b.vetNotes !== undefined) inc.vetNotes = b.vetNotes;
      inc.reviewedById = user.id;
      inc.reviewedBy = { id: user.id, fullName: user.fullName, role: user.role };
      inc.reviewedAt = now.toISOString();
      inc.updatedAt = now.toISOString();

      saveStoredIncidents(incidents);
      return inc;
    },
  },
  // --- Phase 4: Inventory & Supply Restock Management ---
  {
    method: "GET",
    pattern: /^\/inventory$/,
    handler({ db, url }) {
      currentUser(db);
      const zoneId = url.searchParams.get("zoneId");
      const category = url.searchParams.get("category");
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const lowStockOnly = url.searchParams.get("lowStockOnly") === "true";

      let items = getStoredStocks();
      if (zoneId) items = items.filter((s) => s.zoneId === zoneId);
      if (category) {
        const cat = category.toUpperCase().trim();
        if (cat === "FEED") {
          items = items.filter((s) => {
            const c = s.category as string;
            return c === "FEED" || c.startsWith("FEED_");
          });
        } else if (cat === "MEDICINE") {
          items = items.filter((s) => {
            const c = s.category as string;
            return (
              c === "MEDICINE" ||
              c.startsWith("SUPPLEMENT") ||
              c === "VACCINE" ||
              c === "DEWORMER" ||
              c === "CARE"
            );
          });
        } else if (cat === "EQUIPMENT") {
          items = items.filter((s) => {
            const c = s.category as string;
            return c === "EQUIPMENT" || c.startsWith("TOOL") || c.startsWith("CLEANING");
          });
        } else {
          items = items.filter((s) => (s.category as string) === category);
        }
      }
      if (search) {
        items = items.filter(
          (s) =>
            s.supplyName.toLowerCase().includes(search) ||
            s.supplyCode.toLowerCase().includes(search) ||
            s.zoneName.toLowerCase().includes(search),
        );
      }

      // Re-evaluate health statuses
      items = items.map((it) => {
        let status: "SUFFICIENT" | "LOW_STOCK" | "OUT_OF_STOCK" = "SUFFICIENT";
        if (it.quantity <= 0) status = "OUT_OF_STOCK";
        else if (it.quantity <= it.minThreshold) status = "LOW_STOCK";
        return { ...it, status };
      });

      const total = items.length;
      const lowStockCount = items.filter((i) => i.status === "LOW_STOCK").length;
      const outOfStockCount = items.filter((i) => i.status === "OUT_OF_STOCK").length;

      if (lowStockOnly) {
        items = items.filter((i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK");
      }

      return {
        items,
        total,
        lowStockCount,
        outOfStockCount,
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/inventory\/adjust$/,
    handler({ db, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý chuồng mới có quyền kiểm kê và điều chỉnh kho.");
      }
      const b = body as { zoneId: string; supplyId: string; actualQuantity: number; reason: string; minThreshold?: number };
      if (!b.zoneId || !b.supplyId || b.actualQuantity === undefined || !b.reason) {
        throw new ApiError(400, "VALIDATION", "Vui lòng nhập đầy đủ Khu chuồng, Vật tư, Số lượng thực tế và Lý do điều chỉnh.");
      }

      const stocks = getStoredStocks();
      let stock = stocks.find((s) => s.zoneId === b.zoneId && s.supplyId === b.supplyId);
      const now = new Date().toISOString();

      if (!stock) {
        const supplies = getStoredSupplies();
        const sup = supplies.find((s) => s.id === b.supplyId);
        const zone = MOCK_ZONES.find((z) => z.id === b.zoneId);
        stock = {
          id: `${b.zoneId}_${b.supplyId}`,
          zoneId: b.zoneId,
          zoneCode: zone?.code || "ZN",
          zoneName: zone?.name || b.zoneId,
          supplyId: b.supplyId,
          supplyCode: sup?.code || "SUP",
          supplyName: sup?.name || b.supplyId,
          category: (sup?.category?.startsWith("FEED") ? "FEED" : sup?.category?.startsWith("MED") ? "MEDICINE" : "CARE") as any,
          unit: sup?.unit || "KG",
          quantity: b.actualQuantity,
          minThreshold: b.minThreshold ?? 10,
          status: b.actualQuantity <= 0 ? "OUT_OF_STOCK" : b.actualQuantity <= (b.minThreshold ?? 10) ? "LOW_STOCK" : "SUFFICIENT",
          lastInventoryDate: now,
          lastAdjustedBy: { id: user.id, fullName: user.fullName, role: user.role },
          notes: b.reason,
        };
        stocks.push(stock);
      } else {
        stock.quantity = Number(b.actualQuantity);
        if (b.minThreshold !== undefined) stock.minThreshold = Number(b.minThreshold);
        stock.notes = b.reason;
        stock.lastInventoryDate = now;
        stock.lastAdjustedBy = { id: user.id, fullName: user.fullName, role: user.role };
        stock.status = stock.quantity <= 0 ? "OUT_OF_STOCK" : stock.quantity <= stock.minThreshold ? "LOW_STOCK" : "SUFFICIENT";
      }

      saveStoredStocks(stocks);
      return stock;
    },
  },
  {
    method: "GET",
    pattern: /^\/inventory\/requests$/,
    handler({ db, url }) {
      currentUser(db);
      const status = url.searchParams.get("status");
      const zoneId = url.searchParams.get("zoneId");
      const supplyId = url.searchParams.get("supplyId");
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      let requests = getStoredRestockRequests();
      if (status) requests = requests.filter((r) => r.status === status);
      if (zoneId) requests = requests.filter((r) => r.zoneId === zoneId);
      if (supplyId) requests = requests.filter((r) => r.supplyId === supplyId);
      if (search) {
        requests = requests.filter(
          (r) =>
            r.requestNumber.toLowerCase().includes(search) ||
            r.supply.name.toLowerCase().includes(search) ||
            r.supply.code.toLowerCase().includes(search) ||
            r.zone.name.toLowerCase().includes(search) ||
            r.requestedBy.fullName.toLowerCase().includes(search) ||
            r.urgencyReason.toLowerCase().includes(search),
        );
      }

      const total = requests.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = requests.slice((page - 1) * limit, page * limit);

      return {
        items: paginated,
        pagination: { page, limit, total, totalPages },
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/inventory\/requests$/,
    handler({ db, body }) {
      const user = currentUser(db);
      const b = body as { zoneId: string; supplyId: string; requestedQuantity: number; urgencyReason: string };
      if (!b.zoneId || !b.supplyId || !b.requestedQuantity || !b.urgencyReason) {
        throw new ApiError(400, "VALIDATION", "Vui lòng nhập đầy đủ Khu chuồng, Vật tư, Số lượng và Lý do cấp bách.");
      }

      const supplies = getStoredSupplies();
      const sup = supplies.find((s) => s.id === b.supplyId);
      const zone = MOCK_ZONES.find((z) => z.id === b.zoneId);
      const requests = getStoredRestockRequests();
      const now = new Date().toISOString();
      const num = String(requests.length + 1).padStart(4, "0");
      const requestNumber = `REQ-2610-${num}`;

      const newReq = {
        id: `req-${Date.now()}`,
        requestNumber,
        zoneId: b.zoneId,
        zone: { id: b.zoneId, code: zone?.code || "ZN", name: zone?.name || b.zoneId },
        supplyId: b.supplyId,
        supply: {
          id: b.supplyId,
          code: sup?.code || "SUP",
          name: sup?.name || b.supplyId,
          category: (sup?.category?.startsWith("FEED") ? "FEED" : sup?.category?.startsWith("MED") ? "MEDICINE" : "CARE") as any,
          unit: sup?.unit || "KG",
        },
        requestedQuantity: Number(b.requestedQuantity),
        approvedQuantity: null,
        status: "PENDING" as const,
        urgencyReason: b.urgencyReason,
        rejectionReason: null,
        deliveryNotes: null,
        requestedById: user.id,
        requestedBy: { id: user.id, fullName: user.fullName, role: user.role },
        reviewedById: null,
        reviewedBy: null,
        deliveredById: null,
        deliveredBy: null,
        createdAt: now,
        updatedAt: now,
        reviewedAt: null,
        deliveredAt: null,
      };

      requests.unshift(newReq);
      saveStoredRestockRequests(requests);
      return newReq;
    },
  },
  {
    method: "POST",
    pattern: /^\/inventory\/requests\/([^/]+)\/review$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      if (user.role !== "CLUB_MANAGER") {
        throw new ApiError(403, "FORBIDDEN", "Chỉ Quản lý chuồng mới có quyền duyệt phiếu đề xuất.");
      }
      const [id] = params;
      const b = body as { action: "APPROVE" | "REJECT"; approvedQuantity?: number; rejectionReason?: string };
      const requests = getStoredRestockRequests();
      const req = requests.find((r) => r.id === id);
      if (!req) throw new ApiError(404, "NOT_FOUND", "Phiếu đề xuất không tồn tại.");
      if (req.status !== "PENDING") {
        throw new ApiError(400, "INVALID_STATE", `Chỉ có thể duyệt phiếu ở trạng thái PENDING. Trạng thái hiện tại: ${req.status}`);
      }

      const now = new Date().toISOString();
      if (b.action === "APPROVE") {
        req.status = "APPROVED";
        req.approvedQuantity = b.approvedQuantity ? Number(b.approvedQuantity) : req.requestedQuantity;
        req.rejectionReason = null;
      } else {
        req.status = "REJECTED";
        req.approvedQuantity = null;
        req.rejectionReason = b.rejectionReason || "Không phê duyệt";
      }

      req.reviewedById = user.id;
      req.reviewedBy = { id: user.id, fullName: user.fullName, role: user.role };
      req.reviewedAt = now;
      req.updatedAt = now;

      saveStoredRestockRequests(requests);
      return req;
    },
  },
  {
    method: "POST",
    pattern: /^\/inventory\/requests\/([^/]+)\/deliver$/,
    handler({ db, params, body }) {
      const user = currentUser(db);
      const [id] = params;
      const b = body as { receivedQuantity?: number; deliveryNotes?: string };
      const requests = getStoredRestockRequests();
      const req = requests.find((r) => r.id === id);
      if (!req) throw new ApiError(404, "NOT_FOUND", "Phiếu đề xuất không tồn tại.");
      if (req.status !== "APPROVED") {
        throw new ApiError(400, "INVALID_STATE", `Chỉ phiếu đã DUYỆT (APPROVED) mới có thể xác nhận nhập kho.`);
      }

      const amount = b.receivedQuantity ? Number(b.receivedQuantity) : (req.approvedQuantity ?? req.requestedQuantity);
      const now = new Date().toISOString();

      req.status = "DELIVERED";
      req.deliveredById = user.id;
      req.deliveredBy = { id: user.id, fullName: user.fullName, role: user.role };
      req.deliveredAt = now;
      req.deliveryNotes = b.deliveryNotes || `Xác nhận nhận đủ ${amount} ${req.supply.unit}`;
      req.updatedAt = now;

      saveStoredRestockRequests(requests);

      // Tự động cộng tồn kho
      const stocks = getStoredStocks();
      let stock = stocks.find((s) => s.zoneId === req.zoneId && s.supplyId === req.supplyId);
      if (!stock) {
        stock = {
          id: `${req.zoneId}_${req.supplyId}`,
          zoneId: req.zoneId,
          zoneCode: req.zone.code,
          zoneName: req.zone.name,
          supplyId: req.supplyId,
          supplyCode: req.supply.code,
          supplyName: req.supply.name,
          category: req.supply.category,
          unit: req.supply.unit,
          quantity: amount,
          minThreshold: 10,
          status: "SUFFICIENT",
          lastInventoryDate: now,
          lastAdjustedBy: { id: user.id, fullName: user.fullName, role: user.role },
          notes: `Nhập kho từ phiếu đề xuất ${req.requestNumber}`,
        };
        stocks.push(stock);
      } else {
        stock.quantity += amount;
        stock.lastInventoryDate = now;
        stock.lastAdjustedBy = { id: user.id, fullName: user.fullName, role: user.role };
        stock.notes = `Nhập kho từ phiếu đề xuất ${req.requestNumber}`;
        stock.status = stock.quantity <= 0 ? "OUT_OF_STOCK" : stock.quantity <= stock.minThreshold ? "LOW_STOCK" : "SUFFICIENT";
      }
      saveStoredStocks(stocks);

      return req;
    },
  },
];

// ------------------------------------------------------------------ Flow 2: hàm phụ của mock huấn luyện

const MEDICAL = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];
const PENDING = ["SCHEDULED", "BLOCKED", "MISSED"];

function todayIso(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clubDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function trainingRole(user: Account, roles: string[]): void {
  if (!roles.includes(user.role)) throw new ApiError(403, "FORBIDDEN", "This action is not part of your permissions.");
}

function isHeavyMock(w: Pick<MockWorkout, "workoutType" | "intensity">): boolean {
  return w.intensity === "HEAVY" || w.workoutType === "BREEZE" || w.workoutType === "TRIAL";
}

function mockHorse(id: string) {
  const h = getStoredHorses().find((x) => x.id === id);
  if (!h) throw new ApiError(404, "HORSE_NOT_FOUND", "Target horse not found.");
  return { id: h.id, name: h.name, horseCode: h.horseCode ?? h.code, status: horseStatusOf(h), isLocked: Boolean(h.isLocked), ownerId: h.ownerId };
}

function decoratePlan(p: MockPlan) {
  const h = getStoredHorses().find((x) => x.id === p.horseId);
  return {
    ...p,
    horseOwnerId: h?.ownerId,
    horse: h ? { id: h.id, name: h.name, horseCode: h.horseCode ?? h.code, status: horseStatusOf(h), isMedicalLocked: Boolean(h.isLocked) } : undefined,
    trainer: { fullName: "Đinh Quang Trung" },
    _count: { workoutSessions: getStoredWorkouts().filter((w) => w.trainingPlanId === p.id).length },
    progress: progressMock(p.id),
  };
}

function decorateWorkout(w: MockWorkout) {
  const h = getStoredHorses().find((x) => x.id === w.horseId);
  const plan = getStoredPlans().find((x) => x.id === w.trainingPlanId);
  const groom = getDb().accounts.find((a) => a.id === w.assignedStaffUserId);
  return {
    ...w,
    horse: h
      ? {
          id: h.id,
          name: h.name,
          horseCode: h.horseCode ?? h.code,
          status: horseStatusOf(h),
          isMedicalLocked: Boolean(h.isLocked),
          stallAllocations: h.stall ? [{ stall: { code: h.stall } }] : [],
        }
      : undefined,
    assignedStaff: groom ? { id: groom.id, fullName: groom.fullName } : null,
    trainingPlan: plan ? { id: plan.id, phaseName: plan.phaseName, status: plan.status, phases: plan.phases } : null,
    resultRecordedBy: nameOf(w.resultRecordedById),
    resultUpdatedBy: nameOf(w.resultUpdatedById),
  };
}

function listWorkouts(user: Account, url: URL) {
  const q = (k: string) => url.searchParams.get(k);
  let rows = getStoredWorkouts();
  if (q("planId")) rows = rows.filter((w) => w.trainingPlanId === q("planId"));
  if (q("horseId")) rows = rows.filter((w) => w.horseId === q("horseId"));
  if (q("status")) rows = rows.filter((w) => w.status === q("status"));
  if (q("date")) rows = rows.filter((w) => clubDay(w.scheduledDate) === q("date"));
  if (q("from")) rows = rows.filter((w) => clubDay(w.scheduledDate) >= String(q("from")));
  if (q("to")) rows = rows.filter((w) => clubDay(w.scheduledDate) <= String(q("to")));
  if (user.role === "GROOM") rows = rows.filter((w) => w.assignedStaffUserId === user.id);
  if (user.role === "HORSE_OWNER") {
    const mine = new Set(getStoredHorses().filter((h) => h.ownerId === user.id).map((h) => h.id));
    rows = rows.filter((w) => mine.has(w.horseId));
  }
  return rows
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((w) => ({ ...decorateWorkout(w), ...(user.role === "GROOM" ? { performanceScore: null } : {}) }));
}

function nameOf(userId?: string | null) {
  if (!userId) return null;
  const a = getDb().accounts.find((x) => x.id === userId);
  return a ? { fullName: a.fullName } : null;
}

/** Hoàn thành / đã đến hạn (không tính buổi đã hủy). */
function progressMock(planId: string) {
  const due = getStoredWorkouts().filter(
    (w) => w.trainingPlanId === planId && w.status !== "CANCELLED" && new Date(w.scheduledDate).getTime() <= Date.now(),
  );
  return { completed: due.filter((w) => w.status === "COMPLETED").length, due: due.length };
}

/** Điểm tải = km × số hiệp × hệ số cường độ (1/2/3). */
function loadMock(w: MockWorkout): number {
  const factor = w.intensity === "HEAVY" ? 3 : w.intensity === "LIGHT" ? 1 : 2;
  const km = w.actualDistanceMeters ? w.actualDistanceMeters / 1000 : (w.distanceMeters * (w.repetitions ?? 1)) / 1000;
  return Math.round(km * factor * 10) / 10;
}

/** Tổng tải các buổi trong khoảng (fromDaysAgo, toDaysAgo]. */
function sumLoadMock(rows: MockWorkout[], fromDaysAgo: number, toDaysAgo: number): number {
  const from = Date.now() - fromDaysAgo * 24 * 3600_000;
  const to = Date.now() - toDaysAgo * 24 * 3600_000;
  const total = rows
    .filter((w) => new Date(w.scheduledDate).getTime() > from && new Date(w.scheduledDate).getTime() <= to)
    .reduce((sum, w) => sum + loadMock(w), 0);
  return Math.round(total * 10) / 10;
}

/** Thứ Hai (YYYY-MM-DD, giờ câu lạc bộ) của tuần chứa thời điểm iso. */
function mondayOf(iso: string): string {
  const day = clubDay(iso);
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Cảnh báo không chặn (DL-2.01 mục 6): vượt định mức tuần, nhân viên trùng giờ. */
function assertWarningsMock(db: Db, plan: MockPlan, w: MockWorkout, acknowledged: boolean, selfId?: string): void {
  const warnings: string[] = [];
  const phases = (Array.isArray(plan.phases) ? plan.phases : []) as { id: string; maxWeeklyDistance: number }[];
  const ph = phases.find((x) => x.id === w.phaseId);
  const others = getStoredWorkouts().filter((x) => x.id !== selfId && x.status !== "CANCELLED");
  if (ph) {
    const monday = mondayOf(w.scheduledDate);
    const total =
      others
        .filter((x) => x.horseId === w.horseId && mondayOf(x.scheduledDate) === monday)
        .reduce((sum, x) => sum + x.distanceMeters * (x.repetitions ?? 1), 0) +
      w.distanceMeters * (w.repetitions ?? 1);
    if (total > ph.maxWeeklyDistance) warnings.push(`Tổng cự ly tuần ${total} m vượt định mức ${ph.maxWeeklyDistance} m.`);
  }
  const t = new Date(w.scheduledDate).getTime();
  const busy = others.find(
    (x) => x.assignedStaffUserId === w.assignedStaffUserId && Math.abs(new Date(x.scheduledDate).getTime() - t) < 30 * 60_000,
  );
  if (busy) {
    const groom = db.accounts.find((a) => a.id === w.assignedStaffUserId);
    warnings.push(`Nhân viên ${groom?.fullName ?? ""} đã có buổi tập trùng giờ.`);
  }
  if (warnings.length > 0 && !acknowledged) {
    throw new ApiError(409, "WARNINGS_NEED_CONFIRMATION", warnings.join(" "), { warnings });
  }
}

/** Buổi Đã lên lịch quá hết ngày hôm sau -> Bỏ lỡ (giống sweepOverdue của BE). */
function sweepTraining(): void {
  const rows = getStoredWorkouts();
  const yesterday = new Date(Date.now() + 7 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let changed = false;
  for (const w of rows) {
    if (w.status === "SCHEDULED" && clubDay(w.scheduledDate) < yesterday) {
      w.status = "MISSED";
      changed = true;
    }
  }
  if (changed) saveStoredWorkouts(rows);
}

/** Kiểm tra DL-2.01 theo thứ tự của BE. Trả về medicalOverride. */
function assertWorkoutAllowedMock(db: Db, plan: MockPlan, w: MockWorkout, vetConsulted: boolean, selfId?: string): boolean {
  if (plan.status !== "DRAFT" && plan.status !== "ACTIVE") {
    throw new ApiError(400, "PLAN_CLOSED", "Giáo án đã hoàn thành hoặc đã hủy nên không xếp thêm buổi tập.");
  }
  const horse = mockHorse(plan.horseId);
  const heavy = isHeavyMock(w);
  if (horse.isLocked && heavy) {
    throw new ApiError(409, "MEDICAL_LOCK_ACTIVE", "Ngựa đang bị Khóa huấn luyện y tế. Không thể xếp bài tập nặng.");
  }
  if (horse.status === "RETIRED") throw new ApiError(400, "HORSE_RETIRED", "Ngựa đã ngừng quản lý.");
  const day = clubDay(w.scheduledDate);
  if (day < todayIso()) throw new ApiError(400, "DATE_IN_PAST", "Không thể xếp buổi tập vào ngày đã qua.");
  const hhmm = new Date(new Date(w.scheduledDate).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(11, 16);
  if (hhmm < "04:00" || hhmm > "20:00") throw new ApiError(400, "OUTSIDE_TRAINING_HOURS", "Giờ bắt đầu phải từ 04:00 đến 20:00.");
  if (day < clubDay(plan.startDate) || day > clubDay(plan.endDate)) {
    throw new ApiError(400, "OUTSIDE_PLAN_DATES", "Ngày tập phải nằm trong thời gian của giáo án.");
  }
  if (w.workoutType === "BREEZE" || w.workoutType === "TRIAL") {
    if (w.targetSpeedKmh == null) throw new ApiError(400, "TARGET_SPEED_REQUIRED", "Tốc độ mục tiêu là bắt buộc với bài chạy tốc độ và chạy thử.");
    if (!w.jockeyName) throw new ApiError(400, "JOCKEY_REQUIRED", "Vui lòng nhập tên nài ngựa.");
  }
  const phases = (Array.isArray(plan.phases) ? plan.phases : []) as { id: string; name: string; startDate: string; endDate: string }[];
  if (phases.length > 0) {
    const ph = phases.find((x) => x.id === w.phaseId);
    if (!ph) throw new ApiError(400, "PHASE_REQUIRED", "Vui lòng chọn giai đoạn.");
    if (day < ph.startDate || day > ph.endDate) {
      throw new ApiError(400, "OUTSIDE_PHASE_DATES", `Ngày tập phải nằm trong giai đoạn ${ph.name}.`);
    }
  }
  const groom = db.accounts.find((a) => a.id === w.assignedStaffUserId);
  if (!groom || groom.role !== "GROOM" || groom.status !== "ACTIVE") {
    throw new ApiError(400, "INVALID_GROOM", "Vui lòng chọn nhân viên chăm sóc đang hoạt động.");
  }
  const others = getStoredWorkouts().filter((x) => x.id !== selfId && x.status !== "CANCELLED");
  if (w.workoutType === "TRIAL") {
    const slot = 15 * 60 * 1000;
    const t = new Date(w.scheduledDate).getTime();
    const clash = others.find(
      (x) => x.workoutType === "TRIAL" && x.trackSurface === w.trackSurface && Math.abs(new Date(x.scheduledDate).getTime() - t) < slot,
    );
    if (clash) throw new ApiError(409, "TRIAL_SLOT_TAKEN", "Mặt sân đã có lượt chạy thử trong khung 15 phút này.");
  }
  if (others.filter((x) => x.horseId === plan.horseId && clubDay(x.scheduledDate) === day).length >= 3) {
    throw new ApiError(409, "MAX_WORKOUTS_PER_DAY", "Mỗi ngựa tối đa 3 buổi tập mỗi ngày.");
  }
  const medical = MEDICAL.includes(horse.status) && heavy;
  if (medical && !vetConsulted) {
    throw new ApiError(409, "VET_CONFIRMATION_REQUIRED", `Ngựa đang ở trạng thái ${horse.status}.`, { horseStatus: horse.status });
  }
  return medical;
}

// Yêu cầu cấp quyền kèm thông tin người gửi (giống `include: { account }` của backend).
function withAccount(db: Db, r: Db["requests"][number]) {
  const a = db.accounts.find((x) => x.id === r.accountId);
  return { ...r, account: a ? { id: a.id, fullName: a.fullName, email: a.email, role: a.role } : null };
}

// ------------------------------------------------------------------ chuồng trại (mock chỉ đọc)

const MOCK_ZONES = [
  { id: "zone-a", code: "A", name: "Barn A", rows: 2, cols: 4, sortOrder: 1 },
  { id: "zone-b", code: "B", name: "Barn B", rows: 2, cols: 4, sortOrder: 2 },
  { id: "zone-c", code: "C", name: "Isolation barn", rows: 1, cols: 3, sortOrder: 3 },
];

function mockStallList(db: Db) {
  const horses = getStoredHorses();
  return MOCK_ZONES.flatMap((z) =>
    Array.from({ length: z.rows * z.cols }, (_, i) => {
      const code = `STALL-${z.code}${String(i + 1).padStart(2, "0")}`;
      const horse = horses.find((h) => h.stall === code);
      const groom = horse?.assignedGroomId ? db.accounts.find((a) => a.id === horse.assignedGroomId) : undefined;
      return {
        id: `stall-${z.code}${i + 1}`,
        code,
        zone: z.code,
        zoneId: z.id,
        row: Math.floor(i / z.cols) + 1,
        col: (i % z.cols) + 1,
        status: horse ? "OCCUPIED" : z.code === "B" && i === 7 ? "MAINTENANCE" : "AVAILABLE",
        notes: null,
        zoneRef: { id: z.id, code: z.code, name: z.name, rows: z.rows, cols: z.cols, isActive: true },
        allocations: horse
          ? [
              {
                id: `alloc-${horse.id}`,
                stallId: `stall-${z.code}${i + 1}`,
                horseId: horse.id,
                assignedGroomUserId: groom?.id ?? null,
                startDate: "2026-09-01T00:00:00.000Z",
                endDate: null,
                isActive: true,
                horse: { id: horse.id, horseCode: horse.code, name: horse.name, status: horseStatusOf(horse), isMedicalLocked: horse.isLocked },
                assignedGroom: groom ? { id: groom.id, fullName: groom.fullName, email: groom.email } : null,
              },
            ]
          : [],
      };
    }),
  );
}

function mockZones() {
  const stalls = mockStallList(getDb());
  return MOCK_ZONES.map((z) => ({
    ...z,
    description: null,
    isActive: true,
    stallCount: stalls.filter((s) => s.zoneId === z.id).length,
    occupiedCount: stalls.filter((s) => s.zoneId === z.id && s.allocations.length > 0).length,
  }));
}

function mockStalls(db: Db, url: URL) {
  const zoneId = url.searchParams.get("zoneId");
  const search = (url.searchParams.get("search") ?? "").toLowerCase();
  return mockStallList(db).filter(
    (s) =>
      (!zoneId || s.zoneId === zoneId) &&
      (!search || s.code.toLowerCase().includes(search) || s.allocations.some((a) => a.horse.name.toLowerCase().includes(search))),
  );
}

// ------------------------------------------------------------------ điểm vào

export async function handleMock(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  await sleep(180 + Math.random() * 220);
  const url = new URL(path, "http://mock.local");
  const db = getDb();

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;
    const result = await route.handler({ db, url, body: (body ?? {}) as Record<string, unknown>, params: match.slice(1) });
    return JSON.parse(JSON.stringify(result ?? null)); // tách khỏi đối tượng nội bộ, giống dữ liệu qua mạng
  }
  throw new ApiError(404, "NOT_FOUND", `No mock route for ${method} ${url.pathname}`);
}


