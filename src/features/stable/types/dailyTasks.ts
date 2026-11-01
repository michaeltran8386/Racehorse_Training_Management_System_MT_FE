export type DailyTaskType =
  | 'FEEDING'
  | 'CLEANING'
  | 'GROOMING'
  | 'ICE_BOOT_REST'
  | 'WALKING'
  | 'MEDICATION'
  | 'OTHER';

export interface DailyCareTask {
  id: string;
  taskCode?: string;
  date: string;
  horseId: string;
  horse?: {
    id: string;
    name: string;
    horseCode?: string;
    avatarUrl?: string;
    status: string;
    isMedicalLocked: boolean;
    stallAllocations?: Array<{
      stall?: { code: string; zone: string };
    }>;
  };
  stallZoneId?: string;
  stallZone?: {
    id: string;
    code: string;
    name: string;
  };
  stallId?: string;
  stall?: {
    id: string;
    code: string;
    zone: string;
  };
  taskType: DailyTaskType;
  title: string;
  description?: string;
  notes?: string | null;
  mealType?: string | null;
  scheduledTime: string;
  shiftId?: string;
  shift?: { id: string; name: string; startTime: string; endTime: string; sortOrder: number } | null;
  nutritionPlanId?: string;
  isMedicalLocked: boolean;
  medicalLockNotes?: string;
  itemsSnapshotJson?: any;
  isCompleted: boolean;
  completedAt?: string | null;
  completedById?: string | null;
  completedBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  assignedGroomUserId?: string | null;
  assignedGroom?: {
    id: string;
    fullName: string;
  } | null;
  undoUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummaryStats {
  total: number;
  completed: number;
  pending: number;
  completionRatePct: number;
  medicalLockedCount: number;
}

export type DailyTaskSummary = TaskSummaryStats;

export interface DailyTasksResponse {
  date: string;
  items: DailyCareTask[];
  total: number;
  stats: TaskSummaryStats;
  summary?: TaskSummaryStats;
}

export interface QueryDailyTasksFilter {
  date?: string;
  zoneId?: string;
  horseId?: string;
  taskType?: DailyTaskType;
  isCompleted?: boolean;
  onlyMine?: boolean;
  onlyMyTasks?: boolean;
  page?: number;
  limit?: number;
}
