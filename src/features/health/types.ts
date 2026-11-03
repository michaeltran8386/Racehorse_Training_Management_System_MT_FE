import type { HealthStatus } from "@/shared/types/enums";

export type MedicalRecordStatus = "DRAFT" | "OPEN" | "CLOSED";
export type SeverityLevel = "MILD" | "MODERATE" | "SEVERE" | "CRITICAL";
export type ObservationUrgency = "NORMAL" | "ATTENTION" | "URGENT";
export type AllowedActivity = "Strict stall rest" | "Hand walk 10-15 mins" | "Light exercise" | "Full training" | string;
export type PrescriptionStatus = "ACTIVE" | "STOPPED" | "COMPLETED";
export type PreventiveStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE" | "NO_DATA";
export type InjuryStage = "ACUTE" | "SUBACUTE" | "RECOVERING" | "HEALED";

export interface VitalSigns {
  temperature?: number; // °C (35.0 - 43.0, normal 37.2 - 38.6)
  restingHeartRate?: number; // bpm (20 - 120, normal 28 - 44)
  respiratoryRate?: number; // lần/phút (4 - 60, normal 8 - 16)
  weightKg?: number; // kg (200 - 800)
  clinicalNotes?: string;
}

export interface LabTestItem {
  id?: string;
  testType: string;
  testDate: string;
  result: string;
}

export interface CareInstructionItem {
  id?: string;
  activity: string;
  frequency: string;
}

export interface TreatmentPhase {
  id?: string;
  phaseName: string;
  startDate: string;
  endDate: string;
  target: string;
  allowedActivity: AllowedActivity | string;
  careInstructions: CareInstructionItem[];
}

export interface PrescriptionItem {
  id?: string;
  medicationName: string;
  dosage: number | string;
  unit: string;
  route: string;
  frequencyPerDay: number;
  startDate: string;
  endDate?: string;
  daysCount: number;
  withdrawalDays?: number;
  withdrawalUntil?: string;
  notes?: string;
  status: PrescriptionStatus;
  stoppedReason?: string;
  stoppedDate?: string;
}

export interface FollowUpItem {
  id?: string;
  followUpDate: string;
  temperature: number | null;
  restingHeartRate: number | null;
  respiratoryRate: number | null;
  progressNotes: string;
  adjustments?: string;
  vetName?: string;
}

export interface MedicalRecord {
  id: string;
  recordNumber: string;
  horseId: string;
  horseName?: string;
  horseCode?: string;
  stallCode?: string;
  status: MedicalRecordStatus;
  examinationDate: string;
  examinationType: string;
  examinationReason: string;
  symptoms?: string;
  discoverySource?: string;
  vitals?: VitalSigns;
  labTests?: LabTestItem[];
  diagnosis?: string;
  severity?: SeverityLevel;
  proposedStatus?: HealthStatus | string;
  proposeMedicalLock?: boolean;
  treatmentPhases?: TreatmentPhase[];
  prescriptions?: PrescriptionItem[];
  followUps?: FollowUpItem[];
  conclusion?: string;
  treatmentResult?: string;
  closedAt?: string;
  createdAt?: string;
  vetId?: string;
  vetName?: string;
}

export interface ObservationNote {
  id: string;
  horseId: string;
  shift: string;
  observedAt: string;
  groomId: string;
  groomName: string;
  urgency: ObservationUrgency;
  content: string;
}

export interface InjuryItem {
  id: string;
  horseId: string;
  region: string;
  view: "LEFT" | "RIGHT";
  layer: "MUSCLE" | "SKELETON";
  injuryType: string;
  severity: SeverityLevel;
  stage: InjuryStage;
  detectedDate: string;
  updatedDate?: string;
  recordId?: string;
  notes?: string;
}

export interface PreventiveCareItem {
  id: string;
  horseId: string;
  horseName?: string;
  horseCode?: string;
  realHorseId?: string;
  typeCatalogId?: string;
  type: string;
  category: "VACCINATION" | "DEWORMING" | "FARRIER" | "DENTAL" | "GENERAL";
  lastAdministeredDate?: string;
  administeredBy?: string;
  dueDate: string;
  status: PreventiveStatus;
  notes?: string;
}

export interface TrainingLockHistoryItem {
  id: string;
  lockCode: string;
  horseId: string;
  horseName?: string;
  horseCode?: string;
  appliedMedicalStatus: string;
  lockedAt: string;
  lockedBy: string;
  lockReason: string;
  reviewDate: string;
  releasedAt?: string;
  releasedBy?: string;
  releaseReason?: string;
  durationDays?: number;
  status: "ACTIVE" | "RELEASED";
}

export interface HorseMedicalProfile {
  horse: {
    id: string;
    name: string;
    microchipRfid: string;
    breed: string;
    dob?: string;
    gender?: string;
    color?: string;
    stallCode?: string;
    healthStatus: HealthStatus;
    isMedicalLocked: boolean;
    activeLock?: TrainingLockHistoryItem | null;
  };
  overview: {
    allowedActivity: string;
    careInstructions: CareInstructionItem[];
    activeMedications: PrescriptionItem[];
    latestVitals?: VitalSigns & { recordedAt?: string };
    vitalsHistory: (VitalSigns & { recordedAt: string })[];
    upcomingPreventive: PreventiveCareItem[];
  };
  records: MedicalRecord[];
  injuries: InjuryItem[];
  locks: TrainingLockHistoryItem[];
  preventive: PreventiveCareItem[];
  observations: ObservationNote[];
}

export interface CreateMedicalRecordInput {
  horseId: string;
  examinationDate?: string;
  examinationType?: string;
  examinationReason?: string;
  symptoms?: string;
  discoverySource?: string;
  vitals?: VitalSigns;
  labTests?: LabTestItem[];
  diagnosis?: string;
  severity?: SeverityLevel;
  proposedStatus?: string;
  proposeMedicalLock?: boolean;
  saveAsDraft?: boolean;
}

export interface ExamSimulationResult {
  sessionId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "ABORTED_INJURY";
  resultDraft: {
    temperature: number;
    restingHeartRate: number;
    respiratoryRate: number;
    weightKg: number;
    capturedAt: string;
    modelVersion: string;
    source: "EQUIFLOW_SIMULATOR";
  } | null;
}

export interface UpdateMedicalRecordInput {
  examinationDate?: string;
  examinationType?: string;
  examinationReason?: string;
  symptoms?: string;
  discoverySource?: string;
  vitals?: VitalSigns;
  labTests?: LabTestItem[];
  diagnosis?: string;
  severity?: SeverityLevel;
  proposedStatus?: string;
  proposeMedicalLock?: boolean;
}

export interface FinalizeRecordInput {
  applyProposedStatus?: boolean;
  proposeMedicalLock?: boolean;
  lockExpectedRestDays?: number;
  lockReason?: string;
  lockUnlockConditions?: string;
}

export interface TreatmentPhaseInput {
  phaseName: string;
  startDate: string;
  endDate: string;
  target: string;
  allowedActivity: string;
  careInstructions: CareInstructionItem[];
}

export interface PrescriptionInput {
  medicationName: string;
  dosage: number | string;
  unit: string;
  route: string;
  frequencyPerDay: number;
  startDate: string;
  endDate?: string;
  daysCount: number;
  withdrawalDays?: number;
  notes?: string;
}

export interface StopPrescriptionInput {
  stoppedReason: string;
  reason?: string;
  stopNotes?: string;
  stoppedDate?: string;
}

export interface FollowUpInput {
  followUpDate: string;
  temperature?: number;
  restingHeartRate?: number;
  respiratoryRate?: number;
  progressNotes: string;
  adjustments?: string;
}

export interface CloseRecordInput {
  conclusion: string;
  treatmentResult: string;
}

export interface ReopenRecordInput {
  reopenReason?: string;
  reason?: string;
}
