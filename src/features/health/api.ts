import { api } from "@/shared/lib/api";
import type {
  CloseRecordInput,
  CreateMedicalRecordInput,
  FinalizeRecordInput,
  FollowUpInput,
  FollowUpItem,
  HorseMedicalProfile,
  MedicalRecord,
  ObservationNote,
  PrescriptionInput,
  PrescriptionItem,
  ReopenRecordInput,
  StopPrescriptionInput,
  TreatmentPhase,
  TreatmentPhaseInput,
  UpdateMedicalRecordInput,
  ExamSimulationResult,
} from "./types";

export interface ListRecordsParams {
  horseId?: string;
  status?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ListRecordsResponse {
  records: MedicalRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthBoardHorse {
  id: string;
  name: string;
  horseCode?: string | null;
  microchipRfid: string;
  status: string;
  healthGroup: "QUALIFIED" | "OBSERVATION" | "INJURED" | "ISOLATED";
  isMedicalLocked: boolean;
  lock: { lockCode?: string | null; lockedAt: string; recheckDate?: string | null; veterinarianName?: string | null } | null;
  stallId?: string | null;
  stallCode?: string | null;
  zone?: string | null;
  zoneId?: string | null;
  row?: number | null;
  col?: number | null;
  openInjuries: Array<{ zone: string; stage: string }>;
  latestRecord: { id: string; examinationDate: string; diagnosis: string } | null;
  preventiveDue: Array<{ name: string; dueDate: string; overdue: boolean }>;
  hasOverduePreventive: boolean;
  latestObservation: { text: string; at: string; groomName?: string | null } | null;
}

export interface HealthBoardResponse {
  summary: {
    qualifiedCount: number;
    observationCount: number;
    injuredCount: number;
    isolatedCount: number;
    lockedCount: number;
    overdueCount: number;
    total: number;
  };
  data: HealthBoardHorse[];
  generatedAt?: string;
}

// P1-14: Sơ đồ sức khỏe đàn ngựa (SC-3.01). Bộ lọc áp ở trình duyệt để thẻ đếm luôn tính cả đàn.
export const getHealthBoard = () => api<HealthBoardResponse>("GET", "/medical/health-board");

export const startExamSimulation = (horseId: string, medicalRecordId?: string) =>
  api<{ sessionId: string; status: string; launchUrl: string }>(
    "POST",
    `/simulator/horses/${horseId}/exams/start`,
    medicalRecordId ? { medicalRecordId } : {},
  );

export const getLatestExamSimulation = (horseId: string) =>
  api<ExamSimulationResult>("GET", `/simulator/horses/${horseId}/exams/latest`);

// P2-01: Hồ sơ y tế ngựa 6 tab (SC-3.02, API-004)
export const getHorseMedicalProfile = (horseId: string) =>
  api<HorseMedicalProfile>("GET", `/medical/horses/${horseId}`);

// P2-01: Ghi chú quan sát sức khỏe của Groom (FR-3.17)
export const getHorseObservations = (
  horseId: string,
  params?: { fromDate?: string; toDate?: string; urgency?: string },
) => {
  const query = new URLSearchParams();
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.urgency) query.set("urgency", params.urgency);
  const qStr = query.toString();
  return api<{ observations: ObservationNote[] }>(
    "GET",
    `/medical/horses/${horseId}/observations${qStr ? `?${qStr}` : ""}`,
  );
};

// P2-03: Chấn thương 2D (API-007)
export const getHorseInjuries = (horseId: string) =>
  api<{ injuries: any[] } | any[]>("GET", `/medical/horses/${horseId}/injuries`);

export const createInjury = (payload: any) =>
  api("POST", "/medical/injuries", payload);

export const getInjuryDetail = (id: string) =>
  api("GET", `/medical/injuries/${id}`);

export const updateInjury = (id: string, payload: any) =>
  api("PUT", `/medical/injuries/${id}`, payload);

export const deleteInjury = (id: string) =>
  api("DELETE", `/medical/injuries/${id}`);

export const updateRecoveryProgress = (id: string, payload: any) =>
  api("POST", `/medical/injuries/${id}/recovery`, payload);

// P2-02: Danh sách bệnh án (FR-3.03)
export const listRecords = async (params?: ListRecordsParams): Promise<ListRecordsResponse> => {
  const query = new URLSearchParams();
  if (params?.horseId) query.set("horseId", params.horseId);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qStr = query.toString();
  const res = await api<any>("GET", `/medical/records${qStr ? `?${qStr}` : ""}`);

  if (res && Array.isArray(res.data)) {
    return {
      records: res.data.map((item: any) => ({
        ...item,
        horseName: item.horseName || item.horse?.name || null,
        horseCode: item.horseCode || item.horse?.horseCode || null,
      })),
      total: typeof res.total === "number" ? res.total : res.data.length,
      page: typeof res.page === "number" ? res.page : 1,
      limit: typeof res.limit === "number" ? res.limit : 15,
      totalPages: typeof res.totalPages === "number" ? res.totalPages : 1,
    };
  }
  if (res && Array.isArray(res.records)) {
    return res as ListRecordsResponse;
  }
  if (Array.isArray(res)) {
    return {
      records: res,
      total: res.length,
      page: 1,
      limit: res.length,
      totalPages: 1,
    };
  }
  return { records: [], total: 0, page: 1, limit: 15, totalPages: 1 };
};

// P2-02: Chi tiết bệnh án
export const getRecordDetail = async (recordId: string): Promise<{ record: MedicalRecord }> => {
  const res = await api<any>("GET", `/medical/records/${recordId}`);
  if (res && res.record) {
    return res as { record: MedicalRecord };
  }
  if (res && (res.id || res.recordNumber || res.horseId)) {
    return { record: res as MedicalRecord };
  }
  return { record: res };
};

// P2-02: Tạo mới bệnh án (FR-3.04)
export const createRecord = async (input: CreateMedicalRecordInput): Promise<{ record: MedicalRecord }> => {
  const trimmedReason = input.examinationReason?.trim();
  const reason = trimmedReason && trimmedReason.length >= 5
    ? trimmedReason
    : (input.saveAsDraft ? "Routine Clinical Examination" : (trimmedReason || "Routine Clinical Examination"));

  const trimmedDiagnosis = input.diagnosis?.trim();
  const diagnosis = trimmedDiagnosis && trimmedDiagnosis.length >= 5 ? trimmedDiagnosis : undefined;

  const bePayload: Record<string, unknown> = {
    horseId: input.horseId,
    examinationDate: input.examinationDate || new Date().toISOString(),
    examinationType: input.examinationType || "Routine Clinical",
    reason,
    symptoms: input.symptoms?.trim() || undefined,
    discoverySource: input.discoverySource,
    diagnosis,
    severity: input.severity,
    recommendedHorseStatus: input.proposedStatus,
    isDraft: Boolean(input.saveAsDraft),
  };

  if (input.vitals) {
    const notes = input.vitals.clinicalNotes?.trim();
    const symptoms = input.symptoms?.trim();
    let clinicalExamination = "Normal clinical examination findings";
    if (notes && notes.length >= 10) {
      clinicalExamination = notes;
    } else if (symptoms && symptoms.length >= 10) {
      clinicalExamination = symptoms;
    }

    bePayload.vitals = {
      temperature: Number(input.vitals.temperature ?? 38.0),
      restingHeartRate: Number(input.vitals.restingHeartRate ?? 36),
      respiratoryRate: Number(input.vitals.respiratoryRate ?? 12),
      weightKg: input.vitals.weightKg ? Number(input.vitals.weightKg) : undefined,
      clinicalExamination,
    };
  }

  if (input.labTests && input.labTests.length > 0) {
    const validLabTests = input.labTests
      .filter((t) => t.result && t.result.trim().length >= 5)
      .map((t) => ({
        testType: t.testType || "Blood Test",
        datePerformed: t.testDate || new Date().toISOString().split("T")[0],
        result: t.result.trim(),
      }));
    if (validLabTests.length > 0) {
      bePayload.labTests = validLabTests;
    }
  }

  const res = await api<any>("POST", "/medical/records", bePayload);
  if (res && res.record) return res as { record: MedicalRecord };
  if (res && (res.id || res.horseId)) return { record: res as MedicalRecord };
  return { record: res };
};

// P2-02: Sửa bệnh án Nháp (FR-3.04)
export const updateRecord = async (recordId: string, input: UpdateMedicalRecordInput): Promise<{ record: MedicalRecord }> => {
  const trimmedReason = input.examinationReason?.trim();
  const reason = trimmedReason && trimmedReason.length >= 5 ? trimmedReason : undefined;

  const trimmedDiagnosis = input.diagnosis?.trim();
  const diagnosis = trimmedDiagnosis && trimmedDiagnosis.length >= 5 ? trimmedDiagnosis : undefined;

  const bePayload: Record<string, unknown> = {
    examinationDate: input.examinationDate,
    examinationType: input.examinationType,
    reason,
    symptoms: input.symptoms?.trim() || undefined,
    discoverySource: input.discoverySource,
    diagnosis,
    severity: input.severity,
    recommendedHorseStatus: input.proposedStatus,
  };

  if (input.vitals) {
    const notes = input.vitals.clinicalNotes?.trim();
    const symptoms = input.symptoms?.trim();
    let clinicalExamination = "Normal clinical examination findings";
    if (notes && notes.length >= 10) {
      clinicalExamination = notes;
    } else if (symptoms && symptoms.length >= 10) {
      clinicalExamination = symptoms;
    }

    bePayload.vitals = {
      temperature: Number(input.vitals.temperature ?? 38.0),
      restingHeartRate: Number(input.vitals.restingHeartRate ?? 36),
      respiratoryRate: Number(input.vitals.respiratoryRate ?? 12),
      weightKg: input.vitals.weightKg ? Number(input.vitals.weightKg) : undefined,
      clinicalExamination,
    };
  }

  const res = await api<any>("PUT", `/medical/records/${recordId}`, bePayload);
  if (res && res.record) return res as { record: MedicalRecord };
  if (res && (res.id || res.horseId)) return { record: res as MedicalRecord };
  return { record: res };
};

// P2-02: Xóa bản nháp bệnh án
export const deleteDraftRecord = (recordId: string) =>
  api<{ ok: true }>("DELETE", `/medical/records/${recordId}`);

// P2-02: Chốt bệnh án (FR-3.05)
export const finalizeRecord = async (recordId: string, input: FinalizeRecordInput): Promise<{ record: MedicalRecord }> => {
  const res = await api<any>("POST", `/medical/records/${recordId}/finalize`, input);
  if (res && res.record) return res as { record: MedicalRecord };
  if (res && res.id) return { record: res as MedicalRecord };
  return { record: res };
};

// P2-02: Thêm giai đoạn điều trị (FR-3.06)
export const addTreatmentPhase = async (recordId: string, input: TreatmentPhaseInput): Promise<{ phase: TreatmentPhase; record?: MedicalRecord }> => {
  const res = await api<any>("POST", `/medical/records/${recordId}/treatment-phases`, input);
  const phase: TreatmentPhase = res?.phase || {
    id: `phase-${Date.now()}`,
    phaseName: input.phaseName,
    startDate: input.startDate,
    endDate: input.endDate,
    target: input.target,
    allowedActivity: input.allowedActivity,
    careInstructions: input.careInstructions || [],
  };
  return { phase, record: res?.record };
};

// P2-02: Cập nhật giai đoạn điều trị (FR-3.06)
export const updateTreatmentPhase = async (
  recordId: string,
  phaseId: string,
  input: Partial<TreatmentPhaseInput>,
): Promise<{ message: string; dto: any; record?: MedicalRecord }> => {
  return api("PUT", `/medical/records/${recordId}/treatment-phases/${phaseId}`, input);
};

// P2-02: Kê đơn thuốc (FR-3.07)
export const addPrescription = async (recordId: string, input: PrescriptionInput): Promise<{ prescription: PrescriptionItem; record?: MedicalRecord }> => {
  const startD = new Date(input.startDate || Date.now());
  const days = Number(input.daysCount) > 0 ? Number(input.daysCount) : 1;
  const calculatedEndDate =
    input.endDate ||
    (!isNaN(startD.getTime())
      ? new Date(startD.getTime() + (days - 1) * 86400000).toISOString().split("T")[0]
      : input.startDate);

  const payload = {
    ...input,
    dosage: String(input.dosage ?? 1),
    endDate: calculatedEndDate,
    route: input.route,
    administrationRoute: input.route,
    frequencyPerDay: Number(input.frequencyPerDay || 1),
    frequency: `${Number(input.frequencyPerDay || 1)} lần/ngày`,
    daysCount: Number(input.daysCount || 1),
    withdrawalDays: Number(input.withdrawalDays || 0),
  };

  const res = await api<any>("POST", `/medical/records/${recordId}/prescriptions`, payload);
  const prescription: PrescriptionItem = res?.prescription || {
    id: `rx-${Date.now()}`,
    medicationName: input.medicationName,
    dosage: input.dosage,
    unit: input.unit,
    route: input.route,
    frequencyPerDay: input.frequencyPerDay,
    startDate: input.startDate,
    endDate: calculatedEndDate,
    daysCount: input.daysCount,
    withdrawalDays: input.withdrawalDays || 0,
    status: "ACTIVE",
    notes: input.notes,
  };
  return { prescription, record: res?.record };
};

// P2-02: Dừng thuốc (FR-3.07)
export const stopPrescription = async (
  recordId: string,
  prescriptionId: string,
  input: StopPrescriptionInput,
): Promise<{ prescription: PrescriptionItem }> => {
  const payload = {
    ...input,
    reason: input.stoppedReason || input.reason || "Bác sĩ yêu cầu dừng thuốc",
    stoppedReason: input.stoppedReason,
    stopNotes: input.stopNotes,
    stoppedDate: input.stoppedDate,
  };
  const res = await api<any>(
    "POST",
    `/medical/records/${recordId}/prescriptions/${prescriptionId}/stop`,
    payload,
  );
  return { prescription: res?.prescription || res };
};

// P2-02: Thêm tái khám (FR-3.05)
export const addFollowUp = async (recordId: string, input: FollowUpInput): Promise<{ followUp: FollowUpItem; record?: MedicalRecord }> => {
  const res = await api<any>("POST", `/medical/records/${recordId}/follow-ups`, input);
  const followUp: FollowUpItem = res?.followUp || {
    id: `fu-${Date.now()}`,
    followUpDate: input.followUpDate || new Date().toISOString().split("T")[0],
    temperature: input.temperature,
    restingHeartRate: input.restingHeartRate,
    respiratoryRate: input.respiratoryRate,
    progressNotes: input.progressNotes,
    adjustments: input.adjustments,
    vetName: "Veterinarian",
  };
  return { followUp, record: res?.record };
};


// P2-02: Kết thúc điều trị (FR-3.05)
export const closeRecord = async (recordId: string, input: CloseRecordInput): Promise<{ record: MedicalRecord }> => {
  const res = await api<any>("POST", `/medical/records/${recordId}/close`, input);
  if (res && res.record) return res as { record: MedicalRecord };
  if (res && res.id) return { record: res as MedicalRecord };
  return { record: res };
};

// P2-02: Mở lại bệnh án (FR-3.05)
export const reopenRecord = async (recordId: string, input: ReopenRecordInput): Promise<{ record: MedicalRecord }> => {
  const reason = (input.reason || input.reopenReason || "").trim();
  const res = await api<any>("POST", `/medical/records/${recordId}/reopen`, { reason, reopenReason: reason });
  if (res && res.record) return res as { record: MedicalRecord };
  if (res && res.id) return { record: res as MedicalRecord };
  return { record: res };
};


// P2-04: Khóa huấn luyện (SC-3.06, FR-3.10, FR-3.11, FR-3.12, FR-3.19)
// 1. Lấy danh sách khóa huấn luyện (getLocks): GET /api/medical/locks
export const getLocks = async (): Promise<import("./types").TrainingLockHistoryItem[]> => {
  const res = await api<any>("GET", "/medical/locks");
  const rawList = Array.isArray(res) ? res : (res?.data || res?.items || res?.locks || []);
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: any) => ({
    id: item.id,
    lockCode: item.lockCode || `LOCK-${item.id.slice(0, 6)}`,
    horseId: item.horseId,
    horseName: item.horse?.name || item.horseName || "Horse",
    horseCode: item.horse?.microchipRfid || item.horse?.code || item.horseCode || "",
    appliedMedicalStatus: item.appliedMedicalStatus || item.medicalStatus || "INJURED",
    lockedAt: item.lockedAt || item.createdAt,
    lockedBy: item.veterinarian?.fullName || item.lockedBy || "Veterinarian",
    lockReason: item.lockReason || "",
    reviewDate: item.recheckDate || item.reviewDate || "",
    releasedAt: item.unlockedAt || item.releasedAt,
    releasedBy: item.unlockVet?.fullName || item.releasedBy,
    releaseReason: item.unlockReason || item.releaseReason,
    durationDays: item.lockDurationDays ?? item.expectedRestDays ?? item.durationDays,
    status: item.isLocked === false ? "RELEASED" : (item.status || (item.isLocked ? "ACTIVE" : "RELEASED")),
  }));
};

// 2. Apply training lock (POST /api/medical/locks)
export const applyTrainingLock = async (
  horseId: string,
  input: { appliedMedicalStatus: string; lockReason: string; reviewDate: string; unlockConditions?: string },
) => {
  const restDays = Math.max(1, Math.ceil((new Date(input.reviewDate).getTime() - Date.now()) / 86400000));

  return await api("POST", "/medical/locks", {
    horseId,
    expectedRestDays: restDays,
    recheckDate: input.reviewDate,
    reviewDate: input.reviewDate,
    lockReason: input.lockReason,
    unlockConditions: input.unlockConditions || "Full clinical recovery confirmed",
    medicalStatus: input.appliedMedicalStatus,
    appliedMedicalStatus: input.appliedMedicalStatus,
  });
};

// 3. Release training lock (POST /api/medical/locks/:id/release)
export const releaseTrainingLock = async (
  lockId: string,
  input: { releaseReason: string; targetStatus?: string; horseId?: string },
) => {
  return await api("POST", `/medical/locks/${lockId}/release`, {
    unlockReason: input.releaseReason,
    newHorseStatus: input.targetStatus,
  });
};

// 4. Extend training lock (POST /api/medical/locks/:id/extend)
export const extendTrainingLock = async (
  lockId: string,
  input: { additionalDays?: number; newReviewDate?: string; reason: string; horseId?: string },
) => {
  return await api("POST", `/medical/locks/${lockId}/extend`, {
    recheckDate: input.newReviewDate,
    newReviewDate: input.newReviewDate,
    additionalDays: input.additionalDays,
    recheckNotes: input.reason,
    extendReason: input.reason,
  });
};

// P2-05: Preventive care & catalogue (SC-3.07, SC-3.08, FR-3.13 -> FR-3.16)
export interface PreventiveCatalogItem {
  id: string;
  code: string;
  name: string;
  category: "VACCINATION" | "DEWORMING" | "FARRIER_HOOF_CARE" | "DENTAL";
  intervalDays: number;
  advanceNoticeDays: number;
  applyToNewHorses: boolean;
  isActive: boolean;
  description?: string;
  monitoredHorsesCount?: number;
}

export const getPreventiveCatalogs = async (params?: { category?: string; isActive?: string }): Promise<PreventiveCatalogItem[]> => {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.isActive !== undefined) query.set("isActive", params.isActive);
  const qStr = query.toString();
  return api<PreventiveCatalogItem[]>("GET", `/medical/preventive/catalogs${qStr ? `?${qStr}` : ""}`);
};

export const createPreventiveCatalog = async (payload: Partial<PreventiveCatalogItem>) => {
  return api<PreventiveCatalogItem>("POST", "/medical/preventive/catalogs", payload);
};

export const updatePreventiveCatalog = async (id: string, payload: Partial<PreventiveCatalogItem>) => {
  return api<PreventiveCatalogItem>("PUT", `/medical/preventive/catalogs/${id}`, payload);
};

export const togglePreventiveCatalogStatus = async (id: string) => {
  return api<{ message: string; isActive: boolean }>("POST", `/medical/preventive/catalogs/${id}/toggle-status`);
};

export const getCareSchedules = async (): Promise<import("./types").PreventiveCareItem[]> => {
  const res = await api<any>("GET", "/medical/preventive/schedules");
  const rawList = Array.isArray(res) ? res : (res?.data || res?.items || []);
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: any) => {
    let cat: "VACCINATION" | "DEWORMING" | "FARRIER" | "DENTAL" | "GENERAL" = "VACCINATION";
    const rawCat = item.scheduleType || item.category || item.typeCatalog?.category;
    if (rawCat === "DEWORMING") cat = "DEWORMING";
    else if (rawCat === "FARRIER_HOOF_CARE" || rawCat === "FARRIER") cat = "FARRIER";
    else if (rawCat === "DENTAL") cat = "DENTAL";
    else if (rawCat === "GENERAL") cat = "GENERAL";

    let st: import("./types").PreventiveStatus = "UP_TO_DATE";
    if (item.statusBadge === "OVERDUE" || item.isOverdue) st = "OVERDUE";
    else if (item.statusBadge === "UPCOMING" || item.isUpcomingNotice) st = "DUE_SOON";
    else if (item.statusBadge === "NODATA") st = "NO_DATA";

    const horseNameDisplay = item.horse?.name
      ? `${item.horse.name} (${item.horse.microchipRfid || item.horse.id.slice(0, 6)})`
      : item.horseId;

    return {
      id: item.id,
      horseId: horseNameDisplay,
      realHorseId: item.horse?.id || item.horseId,
      typeCatalogId: item.typeCatalogId,
      type: item.typeCatalog?.name || item.productAdministered || item.type || "Routine Care",
      category: cat,
      lastAdministeredDate: item.lastCompletedDate ? String(item.lastCompletedDate).split("T")[0] : undefined,
      administeredBy: item.performedByName || item.veterinarian?.fullName || "Veterinarian",
      dueDate: item.dueDate ? String(item.dueDate).split("T")[0] : new Date().toISOString().split("T")[0],
      status: st,
      notes: item.notes || item.typeCatalog?.description,
    };
  });
};

export const recordCareCompletion = async (
  careId: string,
  input: {
    administeredDate: string;
    administeredBy: string;
    nextDueDate: string;
    notes?: string;
    typeCatalogId?: string;
    horseId?: string;
    performedByMode?: string;
    productAdministered?: string;
    batchNumber?: string;
  },
) => {
  return await api("POST", "/medical/preventive/record", {
    scheduleId: careId,
    horseId: input.horseId || undefined,
    typeCatalogId: input.typeCatalogId || undefined,
    performedDate: input.administeredDate,
    performedByMode: input.performedByMode || (input.administeredBy ? "EXTERNAL" : "SELF"),
    performedByName: input.administeredBy,
    productAdministered: input.productAdministered || undefined,
    batchNumber: input.batchNumber || undefined,
    customNextDueDate: input.nextDueDate,
    notes: input.notes,
  });
};

export const createCareSchedule = async (input: {
  horseId: string;
  typeCatalogId?: string;
  category: "VACCINATION" | "DEWORMING" | "FARRIER" | "DENTAL" | "GENERAL";
  type: string;
  dueDate: string;
  notes?: string;
}) => {
  return await api("POST", "/medical/preventive/schedules", input);
};

export const healthApi = {
  getHealthBoard,
  getHorseMedicalProfile,
  getHorseObservations,
  getHorseInjuries,
  getInjuryDetail,
  createInjury,
  updateInjury,
  deleteInjury,
  updateRecoveryProgress,
  listRecords,
  getRecordDetail,
  createRecord,
  updateRecord,
  deleteDraftRecord,
  finalizeRecord,
  addTreatmentPhase,
  updateTreatmentPhase,
  addPrescription,
  stopPrescription,
  addFollowUp,
  closeRecord,
  reopenRecord,
  getLocks,
  applyTrainingLock,
  releaseTrainingLock,
  extendTrainingLock,
  getPreventiveCatalogs,
  createPreventiveCatalog,
  updatePreventiveCatalog,
  togglePreventiveCatalogStatus,
  getCareSchedules,
  createCareSchedule,
  recordCareCompletion,
};
