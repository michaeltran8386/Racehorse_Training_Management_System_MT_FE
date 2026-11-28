import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { localizeServerText, tr } from "@/shared/i18n/tr";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import {
  cancelAdmission,
  extractAdmissionDocumentPhotos,
  updateOwnerAdmissionSubmission,
} from "../services/admissionService";
import type {
  AdmissionDocumentPhoto,
  AdmissionStatus,
  HorseAdmissionRecord,
} from "../types/admission.types";
import { LegalDocumentsGallery, LegalDocumentsUploader } from "./LegalDocumentsUploader";
import styles from "./OwnerAdmissionDossierCard.module.css";

const STATUS_META: Record<
  AdmissionStatus,
  { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }
> = {
  PENDING_VERIFICATION: { label: "Pending scheduling", tone: "info" },
  APPOINTED: { label: "Appointed", tone: "warn" },
  INSPECTION_IN_PROGRESS: { label: "Inspection in progress", tone: "info" },
  APPROVED: { label: "Approved", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

const STEPS = [
  { key: "SUBMITTED", title: "1. Submitted", sub: "Awaiting club review" },
  { key: "APPOINTED", title: "2. Scheduled", sub: "Time & staff assigned" },
  { key: "INSPECTION", title: "3. On-site Inspection", sub: "Chip · Legal · Vet" },
  { key: "APPROVED", title: "4. Completed", sub: "Stalled & active" },
] as const;

function currentEffectiveTimeMs(): number {
  return effectiveClubNow().getTime();
}

interface Props {
  record: HorseAdmissionRecord;
  horseLink?: boolean;
  onUpdated?: () => void;
}

export function OwnerAdmissionDossierCard({ record, horseLink = false, onUpdated }: Props) {
  useTranslation();
  const toast = useToast();
  const [showHistory, setShowHistory] = useState(false);

  // Edit / supplement modal state (only allowed while PENDING_VERIFICATION)
  const [editOpen, setEditOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState(record.ownerNotes || "");
  const [draftPhotos, setDraftPhotos] = useState<AdmissionDocumentPhoto[]>(() =>
    extractAdmissionDocumentPhotos(record),
  );
  const [uploadBusy, setUploadBusy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const photos = extractAdmissionDocumentPhotos(record);
  const badge = STATUS_META[record.status] ?? { label: record.status, tone: "neutral" as const };
  const canEditSubmission = record.status === "PENDING_VERIFICATION";
  const canCancel =
    record.status === "PENDING_VERIFICATION" || record.status === "APPOINTED";
  const canReapply = record.status === "REJECTED" || record.status === "CANCELLED";

  // Overdue check (aware of DemoMagicToolkit date)
  const nowMs = currentEffectiveTimeMs();
  const apptMs = record.appointmentDate ? Date.parse(record.appointmentDate) : NaN;
  const isPastAppointment =
    record.status === "APPOINTED" && Number.isFinite(apptMs) && nowMs > apptMs;
  const overdueDays = isPastAppointment
    ? Math.floor((nowMs - apptMs) / (24 * 60 * 60 * 1000))
    : 0;

  function stepState(idx: number): "done" | "current" | "error" | "idle" {
    if (record.status === "APPROVED") return "done";
    if (record.status === "PENDING_VERIFICATION") {
      if (idx === 0) return "current";
      return "idle";
    }
    if (record.status === "APPOINTED") {
      if (idx === 0) return "done";
      if (idx === 1) return "current";
      return "idle";
    }
    if (record.status === "INSPECTION_IN_PROGRESS") {
      if (idx < 2) return "done";
      if (idx === 2) return "current";
      return "idle";
    }
    if (record.status === "REJECTED") {
      if (idx < 2) return "done";
      if (idx === 2) return "error";
      return "idle";
    }
    if (record.status === "CANCELLED") {
      if (idx === 0) return "error";
      return "idle";
    }
    return "idle";
  }

  function openEditModal() {
    setDraftNotes(record.ownerNotes || "");
    setDraftPhotos(extractAdmissionDocumentPhotos(record));
    setEditError("");
    setEditOpen(true);
  }

  async function saveSubmissionEdits() {
    if (savingEdit || uploadBusy) return;
    setSavingEdit(true);
    setEditError("");
    try {
      await updateOwnerAdmissionSubmission(record.id, {
        ownerNotes: draftNotes.trim(),
        documentPhotos: draftPhotos,
        documentsUrl: draftPhotos[0]?.url || "",
      });
      toast.show(tr("Updated notes and legal documents for the admission record."), "ok");
      setEditOpen(false);
      onUpdated?.();
    } catch (err) {
      setEditError(messageFor(err));
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmCancel() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelAdmission(record.id, { reason: cancelReason.trim() || undefined });
      toast.show(tr("Admission record withdrawn / cancelled."), "ok");
      setCancelOpen(false);
      setCancelReason("");
      onUpdated?.();
    } catch (err) {
      setCancelError(messageFor(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className={styles.dossier} aria-label={tr("Admission dossier {{code}}", { code: record.admissionCode })}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>
            <Icon name="clipboard" size={14} />
            {tr("Online admission tracking dossier")}
          </span>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>
              {horseLink ? (
                <Link to={`/horses/${record.horseId}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {record.horse?.name || tr("Horse")}
                </Link>
              ) : (
                record.horse?.name || tr("Horse")
              )}
            </h3>
            <span className={styles.codePill}>{record.admissionCode}</span>
            <Badge tone={badge.tone}>{tr(badge.label)}</Badge>
          </div>
          <div className={styles.submittedMeta}>
            <span>{tr("Submitted:")} {formatDateTime(record.createdAt)}</span>
            {(record.declaredMicrochip || record.horse?.microchip) && (
              <span>{tr("Microchip:")} {record.declaredMicrochip || record.horse?.microchip}</span>
            )}
            <span>{tr("Attached documents: {{count}} photo(s)", { count: photos.length })}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {horseLink && (
            <LinkButton to={`/horses/${record.horseId}`} tone="secondary" size="sm" icon="eye">
              {tr("View horse profile")}
            </LinkButton>
          )}
          {canEditSubmission && (
            <Button tone="secondary" size="sm" icon="edit" onClick={openEditModal}>
              {tr("Add documents / Notes")}
            </Button>
          )}
          {canCancel && (
            <Button
              tone="ghost"
              size="sm"
              icon="ban"
              onClick={() => {
                setCancelReason("");
                setCancelError("");
                setCancelOpen(true);
              }}
            >
              {tr("Withdraw dossier")}
            </Button>
          )}
          {canReapply && (
            <LinkButton
              to={`/horses/new?reapply=${encodeURIComponent(record.horseId)}`}
              tone="primary"
              size="sm"
              icon="refresh"
            >
              {tr("Resubmit dossier")}
            </LinkButton>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {/* 4-step progress tracker */}
        <ol className={styles.stepper} aria-label={tr("Admission processing progress")}>
          {STEPS.map((step, idx) => {
            const st = stepState(idx);
            const cls =
              st === "done"
                ? `${styles.step} ${styles.stepDone}`
                : st === "current"
                  ? `${styles.step} ${styles.stepCurrent}`
                  : st === "error"
                    ? `${styles.step} ${styles.stepError}`
                    : styles.step;
            return (
              <li key={step.key} className={cls}>
                <span className={styles.stepNum}>
                  {st === "done" ? <Icon name="check" size={13} /> : idx + 1}
                </span>
                <div className={styles.stepLabel}>
                  <strong>{tr(step.title)}</strong>
                  <span>{tr(step.sub)}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Contextual Alerts */}
        {record.capacityDeferredAt && record.status === "PENDING_VERIFICATION" && (
          <Alert tone="warn" title={tr("Scheduling deferred because all club stalls are full")}>
            {tr("Your priority queue position is preserved since {{time}}. As soon as a stall opens, the Club Manager will contact you to schedule an appointment.", { time: formatDateTime(record.capacityDeferredAt) })}
          </Alert>
        )}

        {isPastAppointment && (
          <Alert
            tone={overdueDays >= 3 ? "danger" : "warn"}
            title={
              overdueDays >= 3
                ? tr("Appointment is {{days}} day(s) overdue", { days: overdueDays })
                : tr("Appointment time has passed")
            }
          >
            {overdueDays >= 3
              ? tr("The appointment is 3 or more days overdue. The Club Manager may cancel overdue dossiers — please contact the club immediately to reschedule or submit a new application.")
              : tr("Your scheduled arrival time has passed. Please contact the Club Manager to reschedule (dossiers overdue by 3+ days may be cancelled).")}
          </Alert>
        )}

        {record.status === "REJECTED" && (
          <Alert tone="danger" title={tr("Dossier did not meet admission requirements")}>
            <strong>{tr("Reason from Club:")}</strong> {localizeServerText(record.rejectionReason) || tr("Did not meet admission standards.")}
            <div style={{ marginTop: "0.45rem" }}>
              {tr("You can update the documents or health status based on this feedback and click")} <strong>{tr("Resubmit dossier")}</strong> {tr("at any time.")}
            </div>
          </Alert>
        )}

        {record.status === "APPROVED" && (
          <Alert tone="ok" title={tr("Horse has officially joined Thien Ma Equestrian Club!")}>
            {tr("Approved at {{time}}. The horse has been admitted and assigned a stall at the club.", { time: record.admittedAt ? formatDateTime(record.admittedAt) : formatDateTime(record.updatedAt) })}
          </Alert>
        )}

        {/* 2-Column Public Service Details */}
        <div className={styles.panels}>
          {/* Left: Club Response & Appointment */}
          <div
            className={`${styles.panel} ${
              record.appointmentDate && (record.status === "APPOINTED" || record.status === "INSPECTION_IN_PROGRESS")
                ? styles.panelHighlight
                : ""
            }`}
          >
            <h4 className={styles.panelTitle}>
              <Icon name="calendar" size={16} />
              {tr("Appointment & Club Feedback")}
            </h4>

            {record.appointmentDate ? (
              <>
                <div className={styles.kvGrid}>
                  <div>
                    <div className={styles.kvLabel}>{tr("Start time")}</div>
                    <div className={styles.kvValue}>{formatDateTime(record.appointmentDate)}</div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>{tr("Estimated end")}</div>
                    <div className={styles.kvValue}>
                      {record.appointmentEndDate ? formatDateTime(record.appointmentEndDate) : tr("After 60 minutes")}
                    </div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>{tr("Assigned Manager")}</div>
                    <div className={styles.kvValue}>
                      {record.manager?.fullName || tr("Club Manager")}
                    </div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>{tr("Examining Veterinarian")}</div>
                    <div className={styles.kvValue}>
                      {record.veterinarian?.fullName || tr("Assigning")}
                    </div>
                  </div>
                </div>
                {record.appointmentNotes && (
                  <div>
                    <div className={styles.kvLabel}>{tr("Club Notes & Reception Guidance")}</div>
                    <p className={styles.noteQuote}>{localizeServerText(record.appointmentNotes)}</p>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.mutedText}>
                {record.status === "PENDING_VERIFICATION"
                  ? tr("The club has received your declaration and attached documents. The Club Manager will review your notes and send an appointment schedule soon.")
                  : tr("No active appointment for this dossier.")}
              </p>
            )}
          </div>

          {/* Right: Owner Notes & Submitted Legal Documents */}
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>
              <Icon name="file" size={16} />
              {tr("Your Submitted Declaration & Preferences")}
            </h4>
            <div>
              <div className={styles.kvLabel}>{tr("Owner notes / preferences")}</div>
              {record.ownerNotes ? (
                <p className={styles.noteQuote}>{record.ownerNotes}</p>
              ) : (
                <p className={styles.mutedText}>
                  {tr("No additional notes.")}{" "}
                  {canEditSubmission && tr("Click \"Add documents / Notes\" if you want to share preferred arrival times or care notes with the club.")}
                </p>
              )}
            </div>
            <div>
              <div className={styles.kvLabel} style={{ marginBottom: 6 }}>
                {tr("Attached legal document photos ({{count}})", { count: photos.length })}
              </div>
              <LegalDocumentsGallery
                photos={photos}
                compact
                emptyText={tr("No legal document photos attached (you still need to bring originals for inspection).")}
              />
            </div>
          </div>
        </div>

        {/* Inline History Trail */}
        {Array.isArray(record.history) && record.history.length > 0 && (
          <div>
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setShowHistory((v) => !v)}
            >
              <Icon name="history" size={14} />
              {showHistory ? tr("Hide dossier audit trail") : tr("View dossier audit trail ({{count}} events)", { count: record.history.length })}
            </button>
            {showHistory && (
              <ol className={styles.historyList}>
                {record.history.map((log) => (
                  <li key={log.id} className={styles.historyItem}>
                    <div>
                      <strong>{tr(STATUS_META[log.toStatus]?.label ?? log.toStatus)}</strong>
                      {log.actorName && <span> · {log.actorName}</span>}
                      {log.note && (
                        <div style={{ color: "var(--ink-muted)", marginTop: 2 }}>{localizeServerText(log.note)}</div>
                      )}
                    </div>
                    <time className={styles.historyTime}>{formatDateTime(log.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Edit / Supplement Modal (PENDING_VERIFICATION only) */}
      {editOpen && (
        <Modal
          title={tr("Supplement Dossier — {{code}}", { code: record.admissionCode })}
          subtitle={tr("Update preferred notes and legal document photos before the club schedules the appointment")}
          width={680}
          onClose={() => !savingEdit && setEditOpen(false)}
        >
          <div className={styles.modalStack}>
            <Field
              label={tr("Notes / Preferences for the Club")}
              hint={tr("e.g., preferred arrival window, horse temperament, nutrition or training goals.")}
            >
              <Textarea
                rows={4}
                maxLength={1000}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder={tr("Enter notes or preferences for the Club Manager...")}
                disabled={savingEdit}
              />
            </Field>
            <Field label={tr("Attached legal document photos (up to 3 photos)")}>
              <LegalDocumentsUploader
                value={draftPhotos}
                onChange={setDraftPhotos}
                disabled={savingEdit}
                onBusyChange={setUploadBusy}
                horseName={record.horse?.name}
                microchip={record.declaredMicrochip || record.horse?.microchip || undefined}
                ownerName={record.owner?.fullName}
              />
            </Field>
            {editError && <Alert tone="danger">{editError}</Alert>}
            <div className={styles.modalActions}>
              <Button tone="secondary" disabled={savingEdit} onClick={() => setEditOpen(false)}>
                {tr("Cancel")}
              </Button>
              <Button
                tone="primary"
                disabled={savingEdit || uploadBusy}
                onClick={() => void saveSubmissionEdits()}
              >
                {savingEdit ? tr("Saving...") : tr("Save dossier updates")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Admission Modal */}
      {cancelOpen && (
        <Modal
          title={tr("Withdraw / Cancel Admission Dossier")}
          subtitle={`${record.horse?.name || ""} · ${record.admissionCode}`}
          tone="danger"
          width={480}
          onClose={() => !cancelling && setCancelOpen(false)}
        >
          <div className={styles.modalStack}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-muted)" }}>
              {tr("Are you sure you want to withdraw this dossier? If an appointment was scheduled, the Manager and Veterinarian schedules will be freed automatically. You can resubmit later.")}
            </p>
            <Field label={tr("Withdrawal reason (optional)")}>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={tr("e.g., Transport schedule changed...")}
                disabled={cancelling}
              />
            </Field>
            {cancelError && <Alert tone="danger">{cancelError}</Alert>}
            <div className={styles.modalActions}>
              <Button tone="secondary" disabled={cancelling} onClick={() => setCancelOpen(false)}>
                {tr("Close")}
              </Button>
              <Button tone="danger" disabled={cancelling} onClick={() => void confirmCancel()}>
                {cancelling ? tr("Processing...") : tr("Confirm withdrawal")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
