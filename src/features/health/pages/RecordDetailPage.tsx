import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Icon } from "@/shared/components/ui/Icon";
import { Tabs } from "@/shared/components/ui/Tabs";
import { useAuth } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import {
  addFollowUp,
  addPrescription,
  addTreatmentPhase,
  closeRecord,
  deleteDraftRecord,
  finalizeRecord,
  getRecordDetail,
  reopenRecord,
  stopPrescription,
} from "../api";
import { AddFollowUpModal } from "../components/AddFollowUpModal";
import { AddPrescriptionModal } from "../components/AddPrescriptionModal";
import { AddTreatmentPhaseModal } from "../components/AddTreatmentPhaseModal";
import { CloseRecordModal } from "../components/CloseRecordModal";
import { FinalizeRecordModal } from "../components/FinalizeRecordModal";
import { StopPrescriptionModal } from "../components/StopPrescriptionModal";
import { VitalsDisplay } from "../components/VitalsDisplay";
import type { MedicalRecord, PrescriptionItem } from "../types";
import styles from "./MedicalRecordPage.module.css";
import { capitalize, formatDate, formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { todayClub } from "@/features/training/api";

import { tr } from "@/shared/i18n/tr";
const RECORD_TABS = [
  { id: "diagnosis", label: "Exam & Diagnosis" },
  { id: "phases", label: "Treatment Protocol" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "followups", label: "Follow-ups" },
];

function prescribedTotal(rx: PrescriptionItem): string {
  const values = [rx.dosage, rx.frequencyPerDay, rx.daysCount];
  if (values.some((value) => value == null || (typeof value === "string" && !value.trim()) || !Number.isFinite(Number(value)))) return "—";
  return `${Number(rx.dosage) * rx.frequencyPerDay * rx.daysCount} ${tr(rx.unit)}`;
}

export default function RecordDetailPage() {
  useScreenTranslation();
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Modals state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [stoppingPrescription, setStoppingPrescription] = useState<PrescriptionItem | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isVet = user?.role === "VETERINARIAN";
  const isOwner = user?.role === "HORSE_OWNER";
  const availableTabs = isOwner ? RECORD_TABS.filter((tab) => tab.id !== "prescriptions") : RECORD_TABS;
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab) ? requestedTab! : "diagnosis";

  const fetchDetail = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setError(null);
    if (!id) { setRecord(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getRecordDetail(id);
      if (currentRequest !== requestId.current) return;
      setRecord(res.record);
    } catch (err: unknown) {
      if (currentRequest !== requestId.current) return;
      setRecord(null);
      setError(messageFor(err));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
    return () => { requestId.current += 1; };
  }, [fetchDetail]);

  // Đến từ nút "Save & Finalize" của form: mở ngay hộp thoại Chốt cho bản nháp vừa lưu.
  const finalizeRequested = searchParams.get("finalize") === "1";
  const lockRequested = searchParams.get("lock") === "1";
  const finalizeOpen =
    showFinalizeModal || (finalizeRequested && isVet && record?.status === "DRAFT");

  function closeFinalizeModal() {
    setShowFinalizeModal(false);
    if (finalizeRequested) {
      const next = new URLSearchParams(searchParams);
      next.delete("finalize");
      next.delete("lock");
      setSearchParams(next, { replace: true });
    }
  }

  async function handleDeleteDraft() {
    if (!record || deleting) return;
    setDeleting(true);
    try {
      await deleteDraftRecord(record.id);
      toast.show(tr("Draft medical record deleted."), "ok");
      navigate(`/medical/horses/${record.horseId}`);
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          {tr("Loading medical record details...")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert tone="danger" title={tr("Unable to load medical record details.")}
          action={<Button tone="secondary" onClick={() => void fetchDetail()}>{tr("Try again")}</Button>}>
          {error}
        </Alert>
        <div><Button tone="ghost" onClick={() => navigate(-1)}>{tr("Go Back")}</Button></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className={styles.container}>
        <EmptyState
          title={tr("Medical record not found")}
          description={tr("This record does not exist or you lack permission to view it.")}
          action={
            <Button tone="primary" onClick={() => navigate(-1)}>
              {tr("Go Back")}
            </Button>
          }
        />
      </div>
    );
  }

  const isDraft = record.status === "DRAFT";
  const isOpen = record.status === "OPEN";
  const isClosed = record.status === "CLOSED";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1 className={styles.horseTitle}>{tr("Medical Record")}{" "}{record.recordNumber}</h1>
              <Badge
                tone={isOpen ? "info" : isClosed ? "ok" : "neutral"}
                dot
              >
                {isOpen ? tr("In Treatment") : isClosed ? tr("Closed") : tr("Draft")}
              </Badge>
              {record.severity && (
                <Badge
                  tone={
                    record.severity === "CRITICAL" || record.severity === "SEVERE"
                      ? "danger"
                      : record.severity === "MODERATE"
                      ? "warn"
                      : "ok"
                  }
                >
                  {tr("Severity:")}{" "}{tr(capitalize(record.severity))}
                </Badge>
              )}
            </div>

            <div className={styles.horseMeta}>
              <span className={styles.metaItem}>
                <Icon name="horse" size={14} /> {tr("Horse:")}{" "}
                <Link to={`/medical/horses/${record.horseId}`} style={{ color: "var(--brand-700)", fontWeight: 600 }}>
                  {record.horseName || record.horseId}
                </Link>
              </span>
              <span className={styles.metaItem}>
                <Icon name="calendar" size={14} /> {tr("Exam Date:")}{" "}
                <strong>{formatDate(record.examinationDate)}</strong>
              </span>
              <span className={styles.metaItem}>
                <Icon name="user" size={14} /> {tr("Attending Vet:")}{" "}<strong>{record.vetName || "—"}</strong>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            {isVet && isDraft && (
              <>
                <Button tone="ghost" icon="edit" onClick={() => navigate(`/medical/records/${record.id}/edit`)}>
                  {tr("Edit Record")}
                </Button>
                <Button tone="danger" icon="trash" onClick={() => setShowDeleteModal(true)}>
                  {tr("Delete Draft")}
                </Button>
                <Button tone="primary" icon="checkCircle" onClick={() => setShowFinalizeModal(true)}>
                  {tr("Finalize Record")}
                </Button>
              </>
            )}

            {isVet && isOpen && (
              <>
                <Button tone="primary" icon="checkCircle" onClick={() => setShowCloseModal(true)}>
                  {tr("Conclude Treatment")}
                </Button>
              </>
            )}

            {isVet && isClosed && (
              <Button tone="ghost" icon="refresh" onClick={() => setShowCloseModal(true)}>
                {tr("Reopen Record")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        items={availableTabs.map((t) => ({
          ...t,
          label: tr(t.label),
        }))}
        active={activeTab}
        onChange={(tabId) => setSearchParams({ tab: tabId })}
      />

      {/* Tab 1: Exam & Diagnosis */}
      {activeTab === "diagnosis" && (
        <div className={styles.tabContent}>
          {/* Exam info */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="clipboard" size={18} />
              {tr("Clinical Examination Information")}
            </h2>
            <div className={styles.examGrid}>
              <div>
                <span style={{ color: "var(--muted)" }}>{tr("Exam Type:")}</span> <strong>{tr(record.examinationType)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>{tr("Discovery Source:")}</span>{" "}
                <strong>{tr(record.discoverySource || "Not recorded")}</strong>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Reason for Examination:")}</span>{" "}
                <div className={styles.examNote}>
                  {record.examinationReason || tr("Not recorded")}
                </div>
              </div>
              {record.symptoms && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)" }}>{tr("Clinical Symptoms:")}</span>{" "}
                  <div className={styles.examNote}>
                    {record.symptoms}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vitals at exam */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="pulse" size={18} />
              {tr("Vital Signs at Examination")}
            </h2>
            <VitalsDisplay vitals={record.vitals} />
          </div>

          {/* Diagnostics / Lab tests */}
          {record.labTests && record.labTests.length > 0 && (
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>
                <Icon name="file" size={18} />
                {tr("Diagnostic & Lab Test Results (Imaging & Pathology)")}
              </h2>
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Test Modality")}</th>
                      <th>{tr("Date Administered")}</th>
                      <th>{tr("Findings")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.labTests.map((t, idx) => (
                      <tr key={idx}>
                        <td><strong>{tr(t.testType)}</strong></td>
                        <td>{formatDate(t.testDate)}</td>
                        <td>{t.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diagnosis & Prognosis */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="stethoscope" size={18} />
              {tr("Definitive Diagnosis & Prognosis")}
            </h2>
            <div style={{ fontSize: "var(--fs-body)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "12px", background: "var(--surface-2)", borderRadius: "var(--r-sm)", fontSize: "var(--fs-body)" }}>
                <strong>{tr("Diagnosis:")}</strong> {record.diagnosis || tr("No detailed diagnosis recorded")}
              </div>

              {record.conclusion && (
                <div style={{ padding: "12px", background: "var(--ok-bg)", border: "1px solid var(--ok)", borderRadius: "var(--r-sm)" }}>
                  <strong style={{ color: "var(--ok)" }}>{tr("Treatment Conclusion:")}</strong> {record.conclusion}
                  {record.treatmentResult && (
                    <div style={{ marginTop: 6 }}>
                      {tr("Outcome:")}{" "}<strong>{tr(record.treatmentResult)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Treatment Protocol */}
      {activeTab === "phases" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="activity" size={18} />
                {tr("Treatment Phases & Protocol")}
              </h2>
              {isVet && isOpen && (
                <Button size="sm" tone="primary" icon="plus" onClick={() => setShowPhaseModal(true)}>
                  {tr("Add Phase")}
                </Button>
              )}
            </div>

            {!record.treatmentPhases || record.treatmentPhases.length === 0 ? (
              <EmptyState
                title={tr("No treatment protocol established")}
                description={tr("No rehabilitation phases have been configured for this medical record.")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {record.treatmentPhases.map((phase, idx) => {
                  // Giai đoạn đang áp dụng theo ngày CLB, để thấy ngay ngựa đang ở bước nào của phác đồ hồi phục.
                  const today = todayClub();
                  const isCurrent = record.status !== "CLOSED" && phase.startDate.slice(0, 10) <= today && today <= phase.endDate.slice(0, 10);
                  return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid var(--border)",
                      borderColor: isCurrent ? "var(--brand)" : "var(--border)",
                      borderRadius: "var(--r)",
                      padding: "16px",
                      background: isCurrent ? "var(--brand-50)" : "var(--surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          {tr("Phase {{index}}", { index: idx + 1 })}
                        </span>
                        <strong>{phase.phaseName}</strong>
                        {isCurrent && <Badge tone="brand" dot>{tr("Current phase")}</Badge>}
                      </span>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
                        {formatDate(phase.startDate)} —{" "}
                        {formatDate(phase.endDate)}
                      </span>
                    </div>

                    <div style={{ fontSize: "var(--fs-body)" }}>
                      {tr("Activity:")}{" "}<Badge tone="brand">{phase.allowedActivity}</Badge> · {tr("Objective:")} {phase.target}
                    </div>

                    {phase.careInstructions && phase.careInstructions.length > 0 && (
                      <div style={{ fontSize: "var(--fs-body)", marginTop: 4 }}>
                        <span style={{ color: "var(--muted)" }}>{tr("Care Directives:")}</span>
                        <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                          {phase.careInstructions.map((c: any, i: number) => (
                            <li key={i}>
                              {typeof c === "string" ? (
                                <strong>{c}</strong>
                              ) : (
                                <>
                                  <strong>{c.activity}</strong> {c.frequency ? `(${c.frequency})` : ""}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Prescriptions */}
      {activeTab === "prescriptions" && !isOwner && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="pill" size={18} />
                {tr("Prescriptions & Medication Schedule")}
              </h2>
              {isVet && isOpen && (
                <Button size="sm" tone="primary" icon="plus" onClick={() => setShowPrescriptionModal(true)}>
                  {tr("Prescribe Medication")}
                </Button>
              )}
            </div>

            {!record.prescriptions || record.prescriptions.length === 0 ? (
              <EmptyState title={tr("No prescriptions recorded")} description={tr("No medications prescribed in this record.")} />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{tr("Medication")}</th>
                      <th>{tr("Dosage")}</th>
                      <th>{tr("Route")}</th>
                      <th>{tr("Frequency")}</th>
                      <th>{tr("Duration")}</th>
                      <th>{tr("Total Dispensed")}</th>
                      <th>{tr("Pre-Race Withdrawal")}</th>
                      <th>{tr("Status")}</th>
                      {isVet && <th>{tr("Actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {record.prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td><strong>{rx.medicationName}</strong></td>
                        <td>{rx.dosage} {tr(rx.unit)}</td>
                        <td>{tr(rx.route)}</td>
                        <td>{rx.frequencyPerDay} {tr("times/day")}</td>
                        <td>{rx.daysCount} {tr("days")}</td>
                        <td>{prescribedTotal(rx)}</td>
                        <td>
                          {rx.withdrawalDays == null ? "—" : tr(`${rx.withdrawalDays} days`)}
                        </td>
                        <td>
                          <Badge tone={rx.status === "ACTIVE" ? "info" : rx.status === "COMPLETED" ? "ok" : "neutral"} dot>
                            {rx.status === "ACTIVE" ? tr("Active") : rx.status === "COMPLETED" ? tr("Completed") : tr("Discontinued")}
                          </Badge>
                        </td>
                        {isVet && (
                          <td>
                            {rx.status === "ACTIVE" && (
                              <Button
                                size="sm"
                                tone="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStoppingPrescription(rx);
                                }}
                              >
                                {tr("Discontinue")}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Follow-ups */}
      {activeTab === "followups" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.sectionTitle}>
                <Icon name="clock" size={18} />
                {tr("Follow-up Examination History")}
              </h2>
              {isVet && isOpen && (
                <Button size="sm" tone="primary" icon="plus" onClick={() => setShowFollowUpModal(true)}>
                  {tr("Add Follow-up")}
                </Button>
              )}
            </div>

            {!record.followUps || record.followUps.length === 0 ? (
              <EmptyState title={tr("No follow-up exams recorded")} description={tr("Record follow-up examinations to track healing progression.")} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {record.followUps.map((fu, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "14px 16px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r)",
                      background: "var(--surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{tr("Follow-up Exam #{{num}}", { num: idx + 1 })}</span>
                      <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
                        {formatDateTime(fu.followUpDate)}
                      </span>
                    </div>

                    <div style={{ fontSize: "var(--fs-body)", color: "var(--text-2)" }}>
                      {tr("Temperature:")}{" "}<strong>{fu.temperature == null ? "—" : `${fu.temperature} °C`}</strong> {tr("· Heart Rate:")}{" "}<strong>{fu.restingHeartRate == null ? "—" : `${fu.restingHeartRate} ${tr("bpm")}`}</strong> {tr("· Respiratory Rate:")}{" "}<strong>{fu.respiratoryRate == null ? "—" : `${fu.respiratoryRate} ${tr("breaths/min")}`}</strong>
                    </div>

                    <div style={{ fontSize: "var(--fs-body)" }}>
                      <strong>{tr("Clinical Progress:")}</strong> {fu.progressNotes}
                    </div>

                    {fu.adjustments && (
                      <div style={{ fontSize: "var(--fs-body)", color: "var(--brand-700)" }}>
                        <strong>{tr("Protocol Adjustments:")}</strong> {fu.adjustments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showDeleteModal && (
        <ConfirmModal
          title={tr("Delete Draft")}
          tone="danger"
          confirmLabel={tr("Delete Draft")}
          cancelLabel={tr("Cancel")}
          busy={deleting}
          onConfirm={() => void handleDeleteDraft()}
          onCancel={() => { if (!deleting) setShowDeleteModal(false); }}
        >
          {tr("Delete draft medical record {{recordNumber}}? This action cannot be undone.", { recordNumber: record.recordNumber })}
        </ConfirmModal>
      )}

      {finalizeOpen && (
        <FinalizeRecordModal
          recordNumber={record.recordNumber}
          proposedStatus={record.proposedStatus}
          initialProposeLock={record.proposeMedicalLock || lockRequested}
          onClose={closeFinalizeModal}
          onFinalize={async (input) => {
            await finalizeRecord(record.id, input);
            toast.show(tr("Medical record finalized and transitioned to In Treatment status."), "ok");
            await fetchDetail();
          }}
        />
      )}

      {showPhaseModal && (
        <AddTreatmentPhaseModal
          onClose={() => setShowPhaseModal(false)}
          onSubmit={async (input) => {
            await addTreatmentPhase(record.id, input);
            toast.show(tr("Treatment phase added successfully."), "ok");
            await fetchDetail();
          }}
        />
      )}

      {showPrescriptionModal && (
        <AddPrescriptionModal
          onClose={() => setShowPrescriptionModal(false)}
          onSubmit={async (input) => {
            await addPrescription(record.id, input);
            toast.show(tr("Prescription added successfully."), "ok");
            await fetchDetail();
          }}
        />
      )}

      {stoppingPrescription && (
        <StopPrescriptionModal
          medicationName={stoppingPrescription.medicationName}
          onClose={() => setStoppingPrescription(null)}
          onSubmit={async (input) => {
            await stopPrescription(record.id, stoppingPrescription.id!, input);
            toast.show(tr("Medication discontinued successfully."), "ok");
            await fetchDetail();
          }}
        />
      )}

      {showFollowUpModal && (
        <AddFollowUpModal
          onClose={() => setShowFollowUpModal(false)}
          onSubmit={async (input) => {
            await addFollowUp(record.id, input);
            toast.show(tr("Follow-up examination recorded successfully."), "ok");
            await fetchDetail();
          }}
        />
      )}

      {showCloseModal && (
        <CloseRecordModal
          recordNumber={record.recordNumber}
          isClosed={isClosed}
          onClose={() => setShowCloseModal(false)}
          onConfirmClose={async (conclusion, treatmentResult) => {
            await closeRecord(record.id, { conclusion, treatmentResult });
            toast.show(tr("Treatment concluded and record closed successfully."), "ok");
            await fetchDetail();
          }}
          onConfirmReopen={async (reopenReason) => {
            await reopenRecord(record.id, { reopenReason });
            toast.show(tr("Medical record reopened successfully."), "ok");
            await fetchDetail();
          }}
        />
      )}
    </div>
  );
}
