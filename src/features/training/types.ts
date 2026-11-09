// Flow 2 – kiểu dữ liệu màn hình. api.ts chuyển dữ liệu BE (TrainingPlan / WorkoutSession) sang các kiểu này.
// Bộ trạng thái theo quyết định Q14 = A (Flow 2 §4.1, §4.2).

export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type SessionStatus = "SCHEDULED" | "COMPLETED" | "BLOCKED" | "MISSED" | "CANCELLED";
export interface WorkoutSimulationStart {
  sessionId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "ABORTED_INJURY";
  launchUrl: string;
}
export interface WorkoutSimulationResultDraft {
  actualTimeSeconds?: number;
  actualDistanceMeters?: number;
  heartRatePeak?: number;
  heartRateRecovery?: number;
  topSpeedKmh?: number;
  actualSurface?: TrackType;
  trackCondition?: TrackCondition;
}
export interface WorkoutSimulationResult {
  sessionId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "ABORTED_INJURY";
  resultDraft: WorkoutSimulationResultDraft | null;
}
export interface SimulatorTelemetrySnapshot {
  event: "sim:telemetry_tick";
  session_id: string;
  sim_time_s: number;
  horse: { horse_id: string; microchip_id?: string };
  track: {
    surface: string;
    target_distance_m: number;
    covered_distance_m: number;
    track_condition: string;
  };
  metrics: {
    velocity_mps: number;
    heart_rate_bpm: number;
    stamina_pct: number;
    body_temp_c: number;
  };
  alerts: { overload_warning: boolean; limp_detected: boolean; heat_stress: boolean };
}
export interface LiveSimulatorSession {
  id: string;
  status: "RUNNING";
  horseIds: string[];
  lastSnapshot: SimulatorTelemetrySnapshot | null;
  updatedAt: string;
}
export type ExerciseType = "WALK" | "TROT" | "CANTER" | "BREEZE" | "TRIAL" | "SWIM" | "TREADMILL";
export type ExerciseIntensity = "LIGHT" | "MEDIUM" | "HEAVY";
export type TrackType = "TURF" | "DIRT" | "SYNTHETIC" | "NONE";
export type CancelWorkoutReason = "WEATHER" | "TRACK_CONDITION" | "HORSE_HEALTH" | "PLAN_CHANGE" | "OTHER";

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  DRAFT: "Pending Activation",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export type Tone = "ok" | "warn" | "danger" | "neutral" | "info";

export const PLAN_STATUS_TONE: Record<PlanStatus, Tone> = {
  DRAFT: "info",
  ACTIVE: "ok",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export const SESSION_STATUS_TONE: Record<SessionStatus, Tone> = {
  SCHEDULED: "info",
  COMPLETED: "ok",
  BLOCKED: "danger",
  MISSED: "warn",
  CANCELLED: "neutral",
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  BLOCKED: "Blocked – Training Lock",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
};

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  WALK: "Walk",
  TROT: "Trot",
  CANTER: "Light canter",
  BREEZE: "Breeze (speed work)",
  TRIAL: "Trial run",
  SWIM: "Recovery swim",
  TREADMILL: "Treadmill",
};

export const INTENSITY_LABEL: Record<ExerciseIntensity, string> = {
  LIGHT: "Light",
  MEDIUM: "Medium",
  HEAVY: "Heavy",
};

export const TRACK_LABEL: Record<TrackType, string> = {
  TURF: "Turf",
  DIRT: "Dirt",
  SYNTHETIC: "Synthetic",
  NONE: "Not applicable",
};

export const CANCEL_REASON_LABEL: Record<CancelWorkoutReason, string> = {
  WEATHER: "Weather",
  TRACK_CONDITION: "Track not safe",
  HORSE_HEALTH: "Horse health",
  PLAN_CHANGE: "Plan change",
  OTHER: "Other",
};

/** Chạy tốc độ và Chạy thử luôn là bài nặng (giống BE training-rules.ts). */
export const ALWAYS_HEAVY: ExerciseType[] = ["BREEZE", "TRIAL"];
export const NO_SURFACE: ExerciseType[] = ["SWIM", "TREADMILL"];
export function isHeavy(type: ExerciseType, intensity: ExerciseIntensity): boolean {
  return intensity === "HEAVY" || ALWAYS_HEAVY.includes(type);
}

export type PhaseType = "BASE" | "BUILD" | "SPEED" | "PRE_RACE" | "RECOVERY";
export type PhaseSurface = "TURF" | "DIRT" | "SYNTHETIC";

export const PHASE_TYPE_LABEL: Record<PhaseType, string> = {
  BASE: "Base fitness",
  BUILD: "Build-up",
  SPEED: "Speed",
  PRE_RACE: "Pre-race maintenance",
  RECOVERY: "Recovery",
};

/** Một giai đoạn của giáo án (SC-2.03). Ngày dạng YYYY-MM-DD theo giờ câu lạc bộ. */
export interface TrainingPhase {
  id: string;
  name: string;
  type: PhaseType;
  startDate: string;
  endDate: string;
  goal?: string;
  sessionsPerWeek: number;
  maxWeeklyDistance: number;
  surface: PhaseSurface;
  targetSpeedKmh?: number;
}

export type CompletionLevel = "ACHIEVED" | "PARTIAL" | "NOT_ACHIEVED";
export type TrackCondition = "GOOD" | "SOFT" | "HEAVY" | "FIRM";
export type AbnormalSign = "LAMENESS" | "PROLONGED_BREATHING" | "NOSEBLEED" | "LEG_SWELLING" | "OFF_FEED" | "OTHER";

export const COMPLETION_LABEL: Record<CompletionLevel, string> = {
  ACHIEVED: "Achieved",
  PARTIAL: "Partly achieved",
  NOT_ACHIEVED: "Not achieved",
};
export const TRACK_CONDITION_LABEL: Record<TrackCondition, string> = {
  GOOD: "Good",
  SOFT: "Soft",
  HEAVY: "Heavy",
  FIRM: "Firm",
};
export const ABNORMAL_SIGN_LABEL: Record<AbnormalSign, string> = {
  LAMENESS: "Lameness",
  PROLONGED_BREATHING: "Prolonged heavy breathing",
  NOSEBLEED: "Nosebleed",
  LEG_SWELLING: "Swollen / hot leg",
  OFF_FEED: "Off feed after work",
  OTHER: "Other",
};
/** Không bắt buộc thời gian chạy với các loại này (SC-2.06). */
export const NO_TIME_TYPES: ExerciseType[] = ["WALK", "SWIM", "TREADMILL"];

export interface TrainingPlan {
  id: string;
  planCode: string;
  name: string;
  horseId: string;
  horseName: string;
  horseCode: string;
  horseStatus?: string;
  targetDistanceMeters?: number | null;
  targetSpeedKmh?: number | null;
  objective?: string | null;
  notes?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: PlanStatus;
  phases: TrainingPhase[];
  headTrainerName: string;
  workoutCount: number;
  /** Tiến độ giáo án: completed, total, due, overdue (T1). */
  progress: { completed: number; total?: number; due: number; overdue?: number };
  lockedSince?: string | null;
  cancelledReason?: string | null;
  completionSummary?: string | null;
  createdAt: string;
  isLockedByMedical: boolean;
  isDebtImpounded?: boolean;
}

export interface SessionResult {
  actualDistanceMeters?: number | null;
  actualSurface?: TrackType | null;
  trackCondition?: TrackCondition | null;
  completionLevel?: CompletionLevel | null;
  abnormalSignTypes: AbnormalSign[];
  recordedBy?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  actualDurationSeconds?: number | null;
  avgSpeedKmh?: number | null;
  maxSpeedKmh?: number | null;
  maxHeartRate?: number | null;
  recoveryHeartRate?: number | null;
  performanceScore?: number | null;
  hasAbnormalSigns: boolean;
  abnormalSignsDescription?: string | null;
  headTrainerFeedback?: string | null;
  recordedAt?: string | null;
}

export interface ExerciseSession {
  id: string;
  planId: string;
  planName?: string;
  planStatus?: PlanStatus;
  phaseId?: string | null;
  phaseName?: string | null;
  horseId: string;
  horseStatus?: string;
  stallCode?: string | null;
  horseName: string;
  horseCode?: string;
  isHorseLocked: boolean;
  isDebtImpounded?: boolean;
  scheduledAt: string; // ISO
  sessionDate: string; // YYYY-MM-DD (giờ câu lạc bộ)
  startTime: string; // HH:mm (giờ câu lạc bộ)
  sessionType: ExerciseType;
  intensity: ExerciseIntensity;
  status: SessionStatus;
  groomId?: string | null;
  groomName?: string | null;
  jockeyName?: string | null;
  trackType: TrackType;
  targetDistanceMeters: number;
  repetitions: number;
  targetSpeedKmh?: number | null;
  notes?: string | null;
  statusReason?: string | null;
  medicalOverride: boolean;
  /** Trạng thái lần mô phỏng của buổi tập (null = chưa mô phỏng). */
  simulationStatus?: SimulationStatus | null;
  result?: SessionResult;
}

export type SimulationStatus = "PENDING" | "RUNNING" | "COMPLETED" | "ABORTED_INJURY";

/** Dữ liệu gửi khi thêm / sửa buổi tập (DL-2.01). */
export interface SessionInput {
  scheduledDate: string; // ISO kèm +07:00
  phaseId: string;
  acknowledgeWarnings?: boolean;
  workoutType: ExerciseType;
  intensity: ExerciseIntensity;
  distanceMeters: number;
  repetitions?: number;
  targetSpeedKmh?: number;
  trackSurface: TrackType;
  jockeyName?: string;
  assignedStaffUserId: string;
  trainerNotes?: string;
  vetConsulted?: boolean;
}

export interface ResultInput {
  actualDistanceMeters: number;
  actualTimeSeconds?: number;
  actualSurface?: TrackType;
  trackCondition?: TrackCondition;
  heartRatePeak?: number;
  heartRateRecovery?: number;
  topSpeedKmh?: number;
  performanceScore: number;
  completionLevel: CompletionLevel;
  trainerNotes: string;
  abnormalSignTypes?: AbnormalSign[];
  abnormalNotes?: string;
}

export interface FitnessMetricPoint {
  workoutId: string;
  date: string;
  workoutType: ExerciseType;
  distanceMeters: number;
  timeSeconds: number | null;
  avgSpeedKmh: number | null;
  maxHeartRate: number | null;
  recoveryHeartRate: number | null;
  performanceScore: number | null;
  load: number;
  hasAlert: boolean;
}

/** SC-2.07 dữ liệu biểu đồ thể lực. */
export interface FitnessData {
  horse: { id: string; name: string; horseCode?: string | null; status: string; isMedicalLocked: boolean };
  points: FitnessMetricPoint[];
  weeklyLoad: { weekStart: string; load: number }[];
  lockPeriods: { from: string; to: string | null }[];
  summary: {
    bestAvgSpeed: { value: number; date: string } | null;
    avgScoreLast4: number | null;
    avgRecoveryLast4: number | null;
    load7d: number;
    loadChangePct: number | null;
  };
}

/** SC-2.01 tổng quan huấn luyện. */
export interface OverviewRow {
  horse: {
    id: string;
    name: string;
    horseCode?: string | null;
    status: string;
    isMedicalLocked: boolean;
    avatarUrl?: string | null;
    breed?: string | null;
    gender?: string | null;
    stallCode?: string | null;
  };
  plan: {
    id: string;
    planCode?: string | null;
    name: string;
    status?: PlanStatus;
    /** HLV phụ trách giáo án. */
    trainerName?: string | null;
  } | null;
  currentPhase: { name: string; week: number; weeks: number } | null;
  progress: { completed: number; total?: number; due: number; overdue?: number } | null;
  latestScore: number | null;
  previousAvgScore: number | null;
  load7d: number;
  loadSpike: boolean;
  nextWorkout: { date: string; workoutType: ExerciseType } | null;
}

export interface TrainingOverview {
  nextWorkout: NextWorkoutInfo | null;
  latestPlan: LatestPlanInfo | null;
  kpis: {
    activePlans: number;
    managedHorses: number;
    todayCompleted: number;
    todayTotal: number;
    blockedNext7Days: number;
    loadSpikeHorses: number;
    horsesInTraining?: number;
    horsesWithoutPlan?: number;
    horsesDraftPlan?: number;
    horsesInjuredOrLocked?: number;
  };
  rows: OverviewRow[];
}

export interface NextWorkoutInfo {
  id: string;
  planId: string;
  horseId: string;
  horseName: string;
  horseCode: string | null;
  workoutType: string | null;
  scheduledDate: string;
  intensity: string | null;
  surface: string | null;
  status: SessionStatus;
}

export interface LatestPlanInfo {
  id: string;
  planCode: string | null;
  name: string;
  horseId: string;
  horseName: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  currentPhaseName: string | null;
}

/** Kết quả lặp hằng tuần (DL-2.01). */
export interface RepeatResult {
  created: number;
  skipped: { date: string; reason: string }[];
}

/** Cảnh báo dấu hiệu bất thường sau buổi tập (FR-2.14) = một buổi tập có abnormalSigns. */
export interface TrainingAlert {
  id: string; // id buổi tập
  horseId: string;
  horseName: string;
  sessionDate: string;
  sessionType: ExerciseType;
  message: string;
  createdAt: string;
  acknowledgedByVet: boolean;
  vetNotes?: string | null;
}

export interface Groom {
  id: string;
  fullName: string;
}
