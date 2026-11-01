// Dạng ngựa dùng cho ô tìm kiếm Topbar (map từ HealthBoardHorse của BE).
export interface HerdHorse {
  id: string;
  name: string;
  code: string;
  horseCode?: string;
  microchip?: string;
  microchipRfid?: string;
  stall: string;
  zone?: string;
  healthGroup: "FIT" | "WATCH" | "INJURED" | "QUARANTINED";
  statusText: string;
  // Trạng thái Flow 1 (HorseStatus) do PATCH /horses/:id/status hoặc khóa y tế đặt. Không có thì suy từ healthGroup.
  status?: string;
  retireReason?: string | null;
  isLocked: boolean;
  lockReason?: string;
  primaryDiagnosis?: string;
  restingHeartRate?: number;
  temp?: number;
  breed?: string;
  dob?: string;
  gender?: string;
  color?: string;
  lockDate?: string;
  reviewDate?: string;
  ownerId?: string;
  ownerName?: string;
  assignedGroomId?: string;
  primaryGroom?: string;
  lastExamDate?: string;
  unresolvedInjuriesCount?: number;
  hasOverdueRoutine?: boolean;
}
