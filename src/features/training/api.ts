import { api } from "@/shared/lib/api";
import type {
  CancelWorkoutReason,
  ExerciseIntensity,
  ExerciseSession,
  ExerciseType,
  FitnessData,
  Groom,
  LiveSimulatorSession,
  PlanStatus,
  RepeatResult,
  ResultInput,
  SessionInput,
  SessionResult,
  SessionStatus,
  SimulationStatus,
  TrackType,
  TrainingAlert,
  TrainingOverview,
  TrainingPhase,
  TrainingPlan,
  WorkoutSimulationStart,
  WorkoutSimulationResult,
} from "./types";

// Mọi lỗi từ BE đi thẳng ra màn hình (không còn "lưu tạm vào trình duyệt rồi báo thành công").

// ------------------------------------------------------------ Giờ câu lạc bộ (UTC+7)

const CLUB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** ISO -> ngày + giờ theo giờ câu lạc bộ. */
export function clubParts(iso: string): { date: string; time: string } {
  const local = new Date(new Date(iso).getTime() + CLUB_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Ngày (YYYY-MM-DD) + giờ (HH:mm) theo giờ câu lạc bộ -> ISO gửi BE. */
export function clubIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

export function todayClub(): string {
  return clubParts(new Date().toISOString()).date;
}

/** Ngày mai theo giờ câu lạc bộ: giáo án chỉ được bắt đầu từ ngày này. */
export function tomorrowClub(): string {
  const d = new Date(`${todayClub()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------ Dạng dữ liệu BE

interface BeHorse {
  id: string;
  name: string;
  horseCode?: string | null;
  status?: string;
  isMedicalLocked?: boolean;
  medicalLocks?: { lockedAt?: string; lockReason?: string }[];
  stallAllocations?: { stall: { code: string } }[];
}

export interface BePlan {
  id: string;
  planCode?: string | null;
  horseId: string;
  phaseName: string;
  objective?: string | null;
  notes?: string | null;
  progress?: { completed: number; total?: number; due: number; overdue?: number };
  phases?: unknown;
  targetSpeed?: number | null;
  targetDistance?: number | null;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  cancelReason?: string | null;
  completionSummary?: string | null;
  createdAt: string;
  horse?: BeHorse;
  simulatorSession?: { status: SimulationStatus } | null;
  trainer?: { fullName: string } | null;
  _count?: { workoutSessions: number };
}

export interface BeWorkout {
  id: string;
  trainingPlanId: string;
  horseId: string;
  phaseId?: string | null;
  scheduledDate: string;
  actualDistanceMeters?: number | null;
  actualSurface?: string | null;
  trackCondition?: string | null;
  completionLevel?: string | null;
  resultNotes?: string | null;
  abnormalSignTypes?: string[];
  resultRecordedBy?: { fullName: string } | null;
  resultUpdatedBy?: { fullName: string } | null;
  resultUpdatedAt?: string | null;
  workoutType?: string | null;
  intensity?: string | null;
  trackSurface?: string | null;
  distanceMeters: number;
  repetitions?: number;
  targetSpeedKmh?: number | null;
  jockeyName?: string | null;
  assignedStaffUserId?: string | null;
  assignedStaff?: { id: string; fullName: string } | null;
  trainerNotes?: string | null;
  status: SessionStatus;
  statusReason?: string | null;
  medicalOverride?: boolean;
  actualTimeSeconds?: number | null;
  heartRatePeak?: number | null;
  heartRateRecovery?: number | null;
  averageSpeedKmh?: number | null;
  topSpeedKmh?: number | null;
  performanceScore?: number | null;
  resultRecordedAt?: string | null;
  abnormalSigns?: boolean;
  abnormalNotes?: string | null;
  vetAcknowledgedAt?: string | null;
  vetNotes?: string | null;
  horse?: BeHorse;
  simulatorSession?: { status: SimulationStatus } | null;
  trainingPlan?: { id: string; phaseName: string; status?: PlanStatus; phases?: unknown } | null;
}

// ------------------------------------------------------------ Chuyển đổi BE -> màn hình

export function toPlan(p: BePlan): TrainingPlan {
  return {
    id: p.id,
    planCode: p.planCode ?? "—",
    name: p.phaseName,
    objective: p.objective,
    notes: p.notes,
    progress: p.progress ?? { completed: 0, total: 0, due: 0, overdue: 0 },
    lockedSince: p.horse?.medicalLocks?.[0]?.lockedAt ?? null,
    horseId: p.horseId,
    horseName: p.horse?.name ?? "—",
    horseCode: p.horse?.horseCode ?? "",
    horseStatus: p.horse?.status,
    targetDistanceMeters: p.targetDistance,
    targetSpeedKmh: p.targetSpeed,
    startDate: p.startDate.slice(0, 10),
    endDate: p.endDate.slice(0, 10),
    status: p.status,
    phases: Array.isArray(p.phases) ? (p.phases as TrainingPhase[]) : [],
    headTrainerName: p.trainer?.fullName ?? "—",
    workoutCount: p._count?.workoutSessions ?? 0,
    cancelledReason: p.cancelReason,
    completionSummary: p.completionSummary,
    createdAt: p.createdAt,
    isLockedByMedical: Boolean(p.horse?.isMedicalLocked),
  };
}

export function toSession(w: BeWorkout, planPhases?: TrainingPhase[]): ExerciseSession {
  const { date, time } = clubParts(w.scheduledDate);
  const phases = planPhases ?? (Array.isArray(w.trainingPlan?.phases) ? (w.trainingPlan?.phases as TrainingPhase[]) : []);
  return {
    id: w.id,
    planId: w.trainingPlanId,
    planName: w.trainingPlan?.phaseName,
    planStatus: w.trainingPlan?.status,
    phaseId: w.phaseId,
    phaseName: phases.find((p) => p.id === w.phaseId)?.name ?? null,
    horseStatus: w.horse?.status,
    stallCode: w.horse?.stallAllocations?.[0]?.stall.code ?? null,
    horseId: w.horseId,
    horseName: w.horse?.name ?? "—",
    horseCode: w.horse?.horseCode ?? undefined,
    isHorseLocked: Boolean(w.horse?.isMedicalLocked || w.horse?.medicalLocks?.length),
    scheduledAt: w.scheduledDate,
    sessionDate: date,
    startTime: time,
    sessionType: (w.workoutType ?? "CANTER") as ExerciseType,
    intensity: (w.intensity ?? "MEDIUM") as ExerciseIntensity,
    status: w.status,
    groomId: w.assignedStaffUserId,
    groomName: w.assignedStaff?.fullName,
    jockeyName: w.jockeyName,
    trackType: (w.trackSurface ?? "TURF") as TrackType,
    targetDistanceMeters: w.distanceMeters,
    repetitions: w.repetitions ?? 1,
    targetSpeedKmh: w.targetSpeedKmh,
    notes: w.trainerNotes,
    statusReason: w.statusReason,
    medicalOverride: Boolean(w.medicalOverride),
    simulationStatus: w.simulatorSession?.status ?? null,
    result:
      w.status === "COMPLETED"
        ? {
            actualDistanceMeters: w.actualDistanceMeters,
            actualSurface: (w.actualSurface ?? null) as TrackType | null,
            trackCondition: (w.trackCondition ?? null) as SessionResult["trackCondition"],
            completionLevel: (w.completionLevel ?? null) as SessionResult["completionLevel"],
            abnormalSignTypes: (w.abnormalSignTypes ?? []) as SessionResult["abnormalSignTypes"],
            recordedBy: w.resultRecordedBy?.fullName ?? null,
            updatedBy: w.resultUpdatedBy?.fullName ?? null,
            updatedAt: w.resultUpdatedAt ?? null,
            actualDurationSeconds: w.actualTimeSeconds,
            avgSpeedKmh: w.averageSpeedKmh,
            maxSpeedKmh: w.topSpeedKmh,
            maxHeartRate: w.heartRatePeak,
            recoveryHeartRate: w.heartRateRecovery,
            performanceScore: w.performanceScore,
            hasAbnormalSigns: Boolean(w.abnormalSigns),
            abnormalSignsDescription: w.abnormalNotes,
            headTrainerFeedback: w.resultNotes ?? null,
            recordedAt: w.resultRecordedAt,
          }
        : undefined,
  };
}

function toAlert(w: BeWorkout): TrainingAlert {
  return {
    id: w.id,
    horseId: w.horseId,
    horseName: w.horse?.name ?? "—",
    sessionDate: clubParts(w.scheduledDate).date,
    sessionType: (w.workoutType ?? "CANTER") as ExerciseType,
    message: w.abnormalNotes ?? "",
    createdAt: w.resultRecordedAt ?? w.scheduledDate,
    acknowledgedByVet: Boolean(w.vetAcknowledgedAt),
    vetNotes: w.vetNotes,
  };
}

// ------------------------------------------------------------ Gọi API

export interface PlanInput {
  horseId: string;
  phaseName: string;
  objective: string;
  notes?: string;
  targetDistance?: number;
  targetSpeed?: number;
  startDate: string;
  endDate: string;
  phases: TrainingPhase[];
}

export interface ActivateOptions {
  moveHorseToTraining?: boolean;
  vetConsulted?: boolean;
}

export const trainingApi = {
  // Giáo án
  async getPlans(query?: { horseId?: string; status?: PlanStatus | string; search?: string }): Promise<TrainingPlan[]> {
    const params = new URLSearchParams({ pageSize: "100" });
    if (query?.horseId) params.set("horseId", query.horseId);
    if (query?.status) params.set("status", query.status);
    if (query?.search) params.set("search", query.search);
    const res = await api<{ items: BePlan[] }>("GET", `/training/plans?${params.toString()}`);
    return res.items.map(toPlan);
  },

  async getPlanById(id: string): Promise<TrainingPlan & { sessions: ExerciseSession[] }> {
    const res = await api<BePlan & { workoutSessions?: BeWorkout[] }>("GET", `/training/plans/${id}`);
    const plan = toPlan(res);
    const horse = res.horse;
    const sessions = (res.workoutSessions ?? []).map((w) =>
      toSession({ ...w, horse, trainingPlan: { id: plan.id, phaseName: plan.name, status: plan.status } }, plan.phases),
    );
    return { ...plan, sessions };
  },

  async getOverview(): Promise<TrainingOverview> {
    return api<TrainingOverview>("GET", "/training/overview");
  },

  /** Luôn tạo ở Nháp (SC-2.03); kích hoạt qua activatePlan sau khi có buổi tập. */
  async createPlan(data: PlanInput): Promise<TrainingPlan> {
    return toPlan(await api<BePlan>("POST", "/training/plans", data));
  },

  async updatePlan(id: string, data: Partial<PlanInput>): Promise<TrainingPlan> {
    const { horseId: _ignored, ...rest } = data;
    return toPlan(await api<BePlan>("PUT", `/training/plans/${id}`, rest));
  },

  async activatePlan(id: string, options: ActivateOptions = {}): Promise<TrainingPlan> {
    return toPlan(await api<BePlan>("PATCH", `/training/plans/${id}/status`, { status: "ACTIVE", ...options }));
  },

  async cancelPlan(id: string, reason: string): Promise<TrainingPlan> {
    return toPlan(await api<BePlan>("PATCH", `/training/plans/${id}/status`, { status: "CANCELLED", reason }));
  },

  async completePlan(id: string, summary: string): Promise<TrainingPlan> {
    return toPlan(await api<BePlan>("PATCH", `/training/plans/${id}/status`, { status: "COMPLETED", summary }));
  },

  async clonePlan(
    id: string,
    input: { targetHorseId: string; name?: string; startDate?: string; copyWorkouts?: boolean },
  ): Promise<TrainingPlan> {
    return toPlan(await api<BePlan>("POST", `/training/plans/${id}/clone`, input));
  },

  async deletePlan(id: string): Promise<void> {
    await api<{ message: string }>("DELETE", `/training/plans/${id}`);
  },

  // Buổi tập
  async getSessions(filter?: {
    date?: string;
    from?: string;
    to?: string;
    horseId?: string;
    planId?: string;
  }): Promise<ExerciseSession[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filter ?? {})) if (v) params.set(k, v);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await api<BeWorkout[]>("GET", `/training/workouts${qs}`);
    return res.map((w) => toSession(w));
  },

  async createSession(planId: string, input: SessionInput): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("POST", `/training/plans/${planId}/workouts`, input));
  },

  /** DL-2.01 Lặp lại hằng tuần (weekdays: 1 = Thứ Hai ... 7 = Chủ nhật). */
  async createRepeatSessions(
    planId: string,
    input: SessionInput & { weekdays: number[]; until: string },
  ): Promise<RepeatResult> {
    return api<RepeatResult>("POST", `/training/plans/${planId}/workouts/repeat`, input);
  },

  async updateSession(id: string, input: Partial<SessionInput>): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("PATCH", `/training/workouts/${id}`, input));
  },

  async getSession(id: string): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("GET", `/training/workouts/${id}`));
  },

  async cancelSession(id: string, reason: CancelWorkoutReason, note?: string): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("POST", `/training/workouts/${id}/cancel`, { reason, note: note || undefined }));
  },

  /** DL-2.07: khôi phục buổi bị chặn (có thể dời ngày giờ). */
  async restoreBlockedSession(id: string, scheduledDate?: string): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("POST", `/training/workouts/${id}/restore`, { scheduledDate }));
  },

  async saveSessionResult(id: string, input: ResultInput): Promise<ExerciseSession> {
    return toSession(await api<BeWorkout>("POST", `/training/workouts/${id}/result`, input));
  },

  async getGrooms(horseId?: string, date?: string, time?: string): Promise<Groom[]> {
    const params = new URLSearchParams();
    if (horseId) params.set("horseId", horseId);
    if (date) params.set("date", date);
    if (time) params.set("time", time);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return api<Groom[]>("GET", `/training/grooms${qs}`);
  },

  // Lượt chạy thử = buổi tập loại TRIAL
  async getTrialRuns(range?: { from?: string; to?: string }): Promise<ExerciseSession[]> {
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return (await api<BeWorkout[]>("GET", `/training/trial-runs${qs}`)).map((w) => toSession(w));
  },

  async getSimulatorConfig(): Promise<{ allowEarlyStart: boolean }> {
    return api<{ allowEarlyStart: boolean }>("GET", "/simulator/config");
  },

  async startSimulation(workoutId: string): Promise<WorkoutSimulationStart> {
    return api<WorkoutSimulationStart>("POST", `/simulator/workouts/${workoutId}/start`);
  },

  async getLatestSimulationResult(workoutId: string): Promise<WorkoutSimulationResult> {
    return api<WorkoutSimulationResult>("GET", `/simulator/workouts/${workoutId}/latest`);
  },

  async getLiveSimulatorSessions(): Promise<LiveSimulatorSession[]> {
    const response = await api<{
      active: Array<Omit<LiveSimulatorSession, "id"> & { sessionId: string }>;
      recent: LiveSimulatorSession[];
    }>("GET", "/simulator/sessions?status=RUNNING");
    const sessions = [
      ...response.active.map(({ sessionId, ...session }) => ({ id: sessionId, ...session })),
      ...response.recent,
    ];
    return [...new Map(sessions.map((session) => [session.id, session])).values()];
  },

  // Thể lực & cảnh báo
  async getFitness(horseId: string, weeks = 12): Promise<FitnessData> {
    return api<FitnessData>("GET", `/training/horses/${horseId}/fitness-metrics?weeks=${weeks}`);
  },

  async getAlerts(): Promise<TrainingAlert[]> {
    return (await api<BeWorkout[]>("GET", "/training/alerts")).map(toAlert);
  },

  async acknowledgeAlert(alertId: string, vetNotes: string): Promise<TrainingAlert> {
    return toAlert(await api<BeWorkout>("PATCH", `/training/alerts/${alertId}`, { vetNotes }));
  },
};
