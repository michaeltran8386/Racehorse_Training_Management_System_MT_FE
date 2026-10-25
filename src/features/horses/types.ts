import type { HorseStatus } from "@/shared/types/enums";

/** Lý do Ngừng quản lý (DL-1.08). DECEASED không được kích hoạt lại. */
export type RetireReason = "RETIRED" | "SOLD" | "DECEASED" | "TRANSFERRED";

export const RETIRE_REASON_LABEL: Record<RetireReason, string> = {
  RETIRED: "Retired from racing",
  SOLD: "Sold",
  DECEASED: "Deceased",
  TRANSFERRED: "Transferred to another club",
};

export interface Horse {
  id: string;
  horseCode?: string;
  name: string;
  microchip?: string;
  microchipRfid: string;
  breed: string;
  dob: string;
  gender: string;
  color: string;
  weightKg?: number | null;
  avatarUrl?: string;
  status: HorseStatus;
  isMedicalLocked: boolean;
  retireReason?: RetireReason | null;
  ownerId?: string;
  owner?: { id: string; fullName: string; email: string };
  ownerName?: string;
  stallCode?: string | null;
  zone?: string | null;
  /** Phân bổ ô đang hiệu lực (Tab 2: Chuyển / Trả ô). */
  allocationId?: string | null;
  stallId?: string | null;
  stallSince?: string | null;
  primaryGroom?: string | null;
  groomName?: string;
  medicalLocks?: Array<{
    id: string;
    isLocked: boolean;
    lockReason: string;
    lockedAt: string;
    veterinarian?: { fullName: string };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface HorseListFilter {
  search?: string;
  status?: HorseStatus | "ALL";
  isMedicalLocked?: string;
  breed?: string;
  gender?: string;
  ownerId?: string;
  /** "true" = chỉ ngựa chưa có ô chuồng (DL-1.02). */
  noStall?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface HorseListResponse {
  items: Horse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateHorsePayload {
  name: string;
  breed: string;
  dob: string;
  gender: string;
  color: string;
  weightKg?: number | null;
  microchip: string;
  ownerId?: string;
  avatarUrl?: string;
  stallId?: string;
}

export interface UpdateHorsePayload {
  name?: string;
  breed?: string;
  dob?: string;
  gender?: string;
  color?: string;
  weightKg?: number | null;
  microchip?: string;
  ownerId?: string;
  avatarUrl?: string;
}

export interface HorseHistoryResponse {
  horse: Horse;
  statusHistory: Array<{
    id: string;
    timestamp: string;
    changedBy: string;
    action: string;
    /** MANUAL / MEDICAL_LOCK / SYSTEM (Tab 4 cột Nguồn). */
    source?: string;
    notes?: string | null;
    oldStatus?: string | null;
    newStatus?: string | null;
  }>;
  ownershipHistory: Array<{
    id: string;
    timestamp: string;
    previousOwner: string;
    newOwner: string;
    reason?: string;
    transferredBy?: string;
  }>;
  stallHistory: Array<{
    id: string;
    stallCode: string;
    zone: string;
    groomName: string;
    startDate: string;
    endDate?: string | null;
    isActive: boolean;
  }>;
  medicalHistory: {
    records: Array<{
      id: string;
      examinationDate: string;
      veterinarianName: string;
      symptoms: string;
      clinicalDiagnosis: string;
      treatmentProtocol: string;
    }>;
    injuries: Array<{
      id: string;
      discoveryDate: string;
      anatomicalZone: string;
      layer: string;
      viewSide: string;
      injuryType: string;
      severity: string;
      stage: string;
      status: string;
    }>;
    locks: Array<{
      id: string;
      lockCode?: string;
      lockedAt: string;
      lockReason: string;
      veterinarianName?: string;
      isLocked: boolean;
      unlockedAt?: string | null;
      unlockReason?: string | null;
    }>;
  };
  trainingHistory: Array<{
    id: string;
    phaseName: string;
    targetSpeed?: number | null;
    targetDistance?: number | null;
    trackSurface: string;
    startDate: string;
    endDate: string;
    status: string;
    trainerName?: string;
    totalWorkouts: number;
    completedWorkouts: number;
  }>;
  timeline: TimelineEvent[];
}

export type TimelineCategory =
  | "IDENTITY"
  | "STATUS"
  | "STALL"
  | "CARE"
  | "OWNERSHIP"
  | "MEDICAL"
  | "TRAINING"
  | "TOURNAMENT";

/** Một mục ở Tab 6 Dòng thời gian. */
export interface TimelineEvent {
  id: string;
  category: TimelineCategory;
  title: string;
  description: string;
  timestamp: string;
  actor?: string | null;
  /** Link sang màn chi tiết của Flow 2/3. */
  link?: string | null;
  badgeTone?: "ok" | "warn" | "danger" | "info" | "neutral";
}

/** Một dòng ở SC-1.05 Hồ sơ đã xóa. */
export interface DeletedHorse {
  id: string;
  horseCode?: string | null;
  name: string;
  microchip?: string | null;
  status: HorseStatus;
  deletedAt: string;
  deletedBy?: { id: string; fullName: string } | null;
  deleteReason?: string | null;
}

export interface DeletedHorseFilter {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface DeletedHorseListResponse {
  items: DeletedHorse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChangeHorseStatusPayload {
  status: HorseStatus;
  reason?: string;
  retireReason?: RetireReason;
}

/** SC-1.06 Danh mục Giống & Màu lông. Horse.breed / Horse.color lưu Tên của mục. */
export type HorseCatalogType = "BREED" | "COLOR";

export interface HorseCatalogItem {
  id: string;
  type: HorseCatalogType;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  horseCount?: number;
}
