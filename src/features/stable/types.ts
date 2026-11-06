/** OCCUPIED do hệ thống đặt khi gán ngựa; CM chọn Hoạt động / Bảo trì / Ngừng dùng (SC-1.07). */
export type StallStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
export type SettableStallStatus = "AVAILABLE" | "MAINTENANCE" | "INACTIVE";

export const STALL_STATUS_OPTIONS: Array<{ value: SettableStallStatus; label: string }> = [
  { value: "AVAILABLE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

export interface StallAllocation {
  id: string;
  stallId: string;
  horseId: string;
  assignedGroomUserId?: string | null;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  horse: {
    id: string;
    horseCode?: string | null;
    name: string;
    status: string;
    isMedicalLocked?: boolean;
  };
  assignedGroom?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  rows: number;
  cols: number;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  stallCount?: number;
  occupiedCount?: number;
}

export interface Stall {
  id: string;
  code: string;
  zone: string;
  zoneId?: string | null;
  row?: number | null;
  col?: number | null;
  status: StallStatus;
  notes?: string | null;
  zoneRef?: Pick<Zone, "id" | "code" | "name" | "rows" | "cols" | "isActive"> | null;
  allocations: StallAllocation[];
}

export interface ZoneInput {
  code?: string;
  name: string;
  rows: number;
  cols: number;
  description?: string;
  sortOrder?: number;
  autoCreateStalls?: boolean;
}

export interface CreateStallDto {
  zoneId: string;
  code: string;
  row: number;
  col: number;
  status?: SettableStallStatus;
  notes?: string;
}

export interface UpdateStallDto {
  code?: string;
  row?: number;
  col?: number;
  status?: SettableStallStatus;
  notes?: string;
}

export interface AssignHorseDto {
  horseId: string;
  assignedGroomUserId?: string;
  notes?: string;
}

export interface TransferHorseDto {
  newStallId: string;
  assignedGroomUserId?: string;
  notes?: string;
}

export interface ReturnStallDto {
  notes?: string;
}

export const STALL_STATUS_LABEL: Record<StallStatus, string> = {
  AVAILABLE: "Active",
  OCCUPIED: "Active",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};
