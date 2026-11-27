import { GroomPlacementFields } from './GroomPlacementFields';
import type { AdmissionPlacement } from '../types/admission.types';
import { useState, useId, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Textarea } from "@/shared/components/form/Textarea";
import { Icon } from "@/shared/components/ui/Icon";
import { useToast } from "@/shared/components/ui/Toast";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { tr } from "@/shared/i18n/tr";
import {
  extractAdmissionDocumentPhotos,
  inspectAdmission,
  approveAdmission,
  rejectAdmission,
  getAdmissionCapacity,
  reviewAdmissionHealth,
} from "../services/admissionService";
import { LegalDocumentsGallery } from "./LegalDocumentsUploader";
import type {
  HorseAdmissionRecord,
  InspectAdmissionDto,
} from "../types/admission.types";
import styles from "./AdmissionInspectionModal.module.css";
import design from "./AdmissionDesign.module.css";
import { formatDateTime } from "@/shared/lib/format";

interface AdmissionInspectionModalProps {
  record: HorseAdmissionRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdmissionInspectionModal({
  record,
  onClose,
  onSuccess,
}: AdmissionInspectionModalProps) {
  useTranslation();
  const toast = useToast();
  const currentUser = useCurrentUser();
  const isManager = currentUser?.role === "CLUB_MANAGER";
  const isVet = currentUser?.role === "VETERINARIAN";
  const [capacity, setCapacity] = useState<number | null>(null);
  const [capacityError, setCapacityError] = useState('');
  useEffect(() => {
    let active = true;
    getAdmissionCapacity().then(r => { if (active) setCapacity(r.available); })
      .catch(err => { if (active) setCapacityError(err instanceof Error ? err.message : tr("Unable to check available stalls.")); });
    return () => { active = false; };
  }, []);

  // Stored record state updated whenever inspection is saved
  const [currentRecord, setCurrentRecord] = useState<HorseAdmissionRecord>(record);

  // Form states - Block 1: Microchip & Legal (Club Manager)
  const declaredMicrochip =
    currentRecord.declaredMicrochip || currentRecord.horse?.microchip || "";
  const [scannedMicrochip, setScannedMicrochip] = useState(
    currentRecord.scannedMicrochip || "",
  );
  const [legalVerified, setLegalVerified] = useState(
    Boolean(currentRecord.legalVerified),
  );
  const [legalDocumentsNote, setLegalDocumentsNote] = useState(
    currentRecord.legalDocumentsNote || "",
  );
  const submittedDocPhotos = extractAdmissionDocumentPhotos(currentRecord);

  // Form states - Block 2: Veterinary Screen (Veterinarian)
  const [isHealthEligible, setIsHealthEligible] = useState<boolean | null>(
    currentRecord.isHealthEligible ?? null,
  );
  const [healthCheckNotes, setHealthCheckNotes] = useState(
    currentRecord.healthCheckNotes || "",
  );
  const [placement, setPlacement] = useState<AdmissionPlacement>({ stallId: '', assignedGroomUserId: '', receivingGroomUserId: '' });
  const [reviewing, setReviewing] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [confirmHealth, setConfirmHealth] = useState(false);
  const healthReadOnly = !isVet || (!!currentRecord.healthFinalizedAt && !reviewing);

  // Rejection sub-dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Loading states
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // For CLUB_MANAGER: vet conclusion is strictly read-only and displays the stored values
  const displayedHealthEligible = isManager
    ? (currentRecord.isHealthEligible ?? null)
    : isHealthEligible;
  const displayedHealthNotes = isManager
    ? (currentRecord.healthCheckNotes || "")
    : healthCheckNotes;

  // Microchip comparison logic
  const trimmedScanned = scannedMicrochip.trim().toUpperCase();
  const trimmedDeclared = declaredMicrochip.trim().toUpperCase();
  const isChipEmpty = trimmedScanned === "";
  const isChipMatched =
    !isChipEmpty && trimmedDeclared !== "" && trimmedScanned === trimmedDeclared;
  const isChipMismatch =
    !isChipEmpty && (!trimmedDeclared || trimmedScanned !== trimmedDeclared);

  // Eligible to approve only when 3 criteria are met from STORED record values (never local radio state of an out-of-scope field)
  const canApprove =
    Boolean(
      currentRecord.microchipVerified &&
      currentRecord.legalVerified &&
      currentRecord.isHealthEligible && currentRecord.healthFinalizedAt
    ) && isManager && capacity !== null && capacity > 0 && !!placement.stallId && !!placement.assignedGroomUserId;

  const handleSaveInspection = async () => {
    if (capacity === null || capacity === 0) { toast.show(tr("Cannot perform inspection when no stalls are available. Please reload the list."), 'danger'); return; }
    try {
      setSaving(true);
      // Role-scoped payload: CLUB_MANAGER sends microchip & legal; VETERINARIAN sends health
      let payload: InspectAdmissionDto;
      if (isManager) {
        // Gửi chuỗi rỗng (không phải undefined) để BE XÓA giá trị cũ khi người dùng xóa ô
        // (BE: scannedMicrochip rỗng -> microchipVerified = false; note/url rỗng -> null).
        payload = {
          scannedMicrochip: trimmedScanned,
          legalVerified,
          legalDocumentsNote: legalDocumentsNote.trim(),
        };
      } else if (isVet) {
        payload = {
          isHealthEligible: isHealthEligible ?? undefined,
          healthCheckNotes: healthCheckNotes.trim(),
          finalizeHealth: true,
        };
      } else {
        payload = {};
      }

      const updated = isVet && reviewing
        ? await reviewAdmissionHealth(currentRecord.id, { isHealthEligible: isHealthEligible!, healthCheckNotes: healthCheckNotes.trim(), reason: reviewReason.trim() })
        : await inspectAdmission(currentRecord.id, payload);
      setConfirmHealth(false); setReviewing(false);
      setCurrentRecord(updated);
      toast.show(tr("Saved inspection results successfully"), "ok");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr("Failed to save inspection results");
      toast.show(msg, "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    try {
      setApproving(true);
      await approveAdmission(currentRecord.id, placement);
      toast.show(
        tr("Congratulations: Horse {{name}} has officially joined the club!", {
          name: currentRecord.horse?.name || "",
        }),
        "ok",
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : tr("Failed to approve admission");
      toast.show(msg, "danger");
    } finally {
      setApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 10) {
      setRejectError(tr("Rejection reason must be at least 10 characters."));
      return;
    }
    if (trimmed.length > 500) {
      setRejectError(tr("Rejection reason cannot exceed 500 characters."));
      return;
    }
    try {
      setRejecting(true);
      setRejectError("");
      await rejectAdmission(currentRecord.id, {
        rejectionReason: trimmed,
      });
      toast.show(tr("Admission request rejected"), "warn");
      setShowRejectDialog(false);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : tr("Failed to reject admission request");
      setRejectError(msg);
      toast.show(msg, "danger");
    } finally {
      setRejecting(false);
    }
  };

  const scannedChipId = useId();
  const legalNotesId = useId();
  const healthNotesId = useId();

  return (
    <>
      <Modal
        title={isVet ? tr("Clinical Health Inspection — {{code}}", { code: record.admissionCode }) : tr("Horse Admission Inspection — {{code}}", { code: record.admissionCode })}
        subtitle={tr("Shared appointment: Manager verifies microchip and legal documents; Veterinarian concludes health status. Admission is approved only when both pass.")}
        width={680}
        dialogClassName={design.dialog}
        overlayClassName={design.overlay}
        onClose={onClose}
      >
        <p role="status" className={design.helper}>{capacityError || (capacity === null ? tr("Checking stall availability…") : capacity === 0 ? tr("No stalls are available. Cannot save inspection or approve admission; return to the list to defer and reschedule.") : tr("{{count}} stall(s) available for admission. Rechecked upon saving and reserved upon approval.", { count: capacity }))}</p>
        <div className={styles.container}>
          {/* Thông tin tóm tắt hồ sơ */}
          <div className={styles.summaryHeader}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Horse Name")}</span>
              <span className={styles.summaryValue}>
                {record.horse?.name || tr("Unnamed")}
                {record.horse?.breed ? ` (${tr(record.horse.breed)})` : ""}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Owner")}</span>
              <span className={styles.summaryValue}>
                {record.owner?.fullName || tr("Unknown")}
                {record.owner?.email ? ` (${record.owner.email})` : ""}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Declared Microchip")}</span>
              <span className={styles.summaryValue}>
                {declaredMicrochip || tr("None")}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Appointment Date")}</span>
              <span className={styles.summaryValue}>
                {record.appointmentDate
                  ? formatDateTime(record.appointmentDate)
                  : tr("Not scheduled")}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Gender")}</span>
              <span className={styles.summaryValue}>
                {record.horse?.gender ? tr(record.horse.gender) : "—"}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Date of Birth")}</span>
              <span className={styles.summaryValue}>
                {record.horse?.dob ? formatDateTime(record.horse.dob).split(",")[0] : "—"}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Coat Color")}</span>
              <span className={styles.summaryValue}>
                {record.horse?.color ? tr(record.horse.color) : "—"}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>{tr("Weight")}</span>
              <span className={styles.summaryValue}>
                {(() => {
                  const h = record.horse as { weightKg?: number | null; weight?: number | null } | undefined;
                  const w = h?.weightKg ?? h?.weight;
                  return w != null ? `${w} kg` : "—";
                })()}
              </span>
            </div>
          </div>

          {/* Ghi chú mong muốn & Giấy tờ pháp lý chủ ngựa đã nộp */}
          {(currentRecord.ownerNotes || submittedDocPhotos.length > 0) && (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>
                <Icon name="file" size={18} />
                {tr("Owner Declaration & Online Legal Documents")}
              </h3>
              <div className={styles.fieldGroup}>
                {currentRecord.ownerNotes && (
                  <div
                    style={{
                      padding: "0.7rem 0.85rem",
                      borderRadius: "8px",
                      background: "var(--surface-subtle, #f8fafc)",
                      borderLeft: "3px solid var(--brand-600, #2563eb)",
                      fontSize: "0.86rem",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <strong>{tr("Owner notes / preferences:")}</strong>
                    <div>{currentRecord.ownerNotes}</div>
                  </div>
                )}
                <div>
                  <span className={styles.label}>
                    {tr("Attached legal document photos ({{count}} photo(s) — verify against originals)", { count: submittedDocPhotos.length })}
                  </span>
                  <LegalDocumentsGallery
                    photos={submittedDocPhotos}
                    compact
                    emptyText={tr("Owner has not uploaded legal document photos online — please verify the originals in person.")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* KHỐI 1: Vi mạch & Pháp lý */}
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>
              <Icon name="shield" size={18} />
              {tr("Section 1: Microchip & Legal Verification")}
            </h3>
            {!isManager && (
              <div className={styles.roleHint}>
                {tr("Microchip & legal verification is managed by Club Manager. View only for Vet.")}
              </div>
            )}
            <div className={styles.fieldGroup}>
              <div>
                <label htmlFor={scannedChipId} className={styles.label}>
                  {tr("Scanned Microchip Code (Scanner Input)")}
                </label>
                <Input
                  id={scannedChipId}
                  value={scannedMicrochip}
                  onChange={(e) => setScannedMicrochip(e.target.value)}
                  placeholder={tr("Scan or enter 15-digit ISO 11784/11785 code...")}
                  autoComplete="off"
                  disabled={!isManager}
                  readOnly={!isManager}
                />
                {/* Live MATCH / MISMATCH banner */}
                {isChipEmpty && (
                  <div
                    className={`${styles.chipMatchBanner} ${styles.chipMatchNeutral}`}
                  >
                    <Icon name="info" size={16} />
                    <span>
                      {tr("Please scan or enter the actual microchip code to verify.")}
                    </span>
                  </div>
                )}
                {isChipMatched && (
                  <div
                    className={`${styles.chipMatchBanner} ${styles.chipMatchSuccess}`}
                  >
                    <Icon name="checkCircle" size={16} />
                    <span>{tr("✓ Microchip 100% matched ({{chip}})", { chip: trimmedScanned })}</span>
                  </div>
                )}
                {isChipMismatch && (
                  <div
                    className={`${styles.chipMatchBanner} ${styles.chipMatchError}`}
                  >
                    <Icon name="alert" size={16} />
                    <span>
                      {tr("✕ Scanned microchip ({{scanned}}) does not match declared microchip ({{declared}})! ", {
                        scanned: trimmedScanned,
                        declared: trimmedDeclared || tr("None"),
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Checkbox
                  checked={legalVerified}
                  onChange={(checked) => isManager && setLegalVerified(checked)}
                  label={tr("Original legal documents verified (Birth cert, pedigree, transfer contract)")}
                  disabled={!isManager}
                />
              </div>

              <div>
                <label htmlFor={legalNotesId} className={styles.label}>
                  {tr("Legal documents note")}
                </label>
                <Textarea
                  id={legalNotesId}
                  value={legalDocumentsNote}
                  onChange={(e) => isManager && setLegalDocumentsNote(e.target.value)}
                  placeholder={tr("Note on origin, registration certificates, vaccination book...")}
                  rows={2}
                  disabled={!isManager}
                  readOnly={!isManager}
                />
              </div>
            </div>
          </div>

          {/* KHỐI 2: Sức khỏe thú y ban đầu */}
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>
              <Icon name="stethoscope" size={18} />
              {tr("Section 2: Quarantine Health Screening")}
            </h3>
            {isManager && (
              <div className={styles.roleHint}>
                {tr("Health evaluation is conducted by Veterinarian. View only for Club Manager.")}
              </div>
            )}
            <div className={styles.fieldGroup}>
              <div>
                <span className={styles.label}>{tr("Clinical Screening Conclusion")}</span>
                <div className={styles.radioGroup}>
                  <label
                    className={`${styles.radioLabel} ${
                      displayedHealthEligible === true ? styles.radioActive : ""
                    } ${isManager ? styles.disabled : ""}`}
                  >
                    <input
                      type="radio"
                      name="healthEligibility"
                      checked={displayedHealthEligible === true}
                      onChange={() => !healthReadOnly && setIsHealthEligible(true)}
                      disabled={healthReadOnly}
                    />
                    <span>
                      <strong>{tr("Health eligible & fit")}</strong>{" "}
                      {tr("(No infectious symptoms, cleared for stable housing)")}
                    </span>
                  </label>
                  <label
                    className={`${styles.radioLabel} ${
                      displayedHealthEligible === false ? styles.radioActive : ""
                    } ${isManager ? styles.disabled : ""}`}
                  >
                    <input
                      type="radio"
                      name="healthEligibility"
                      checked={displayedHealthEligible === false}
                      onChange={() => !healthReadOnly && setIsHealthEligible(false)}
                      disabled={healthReadOnly}
                    />
                    <span>
                      <strong>{tr("Symptomatic / Quarantine required")}</strong>{" "}
                      {tr("(Fails quarantine standards, admission deferred)")}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={healthNotesId} className={styles.label}>
                  {tr("Veterinarian Clinical Notes")}
                </label>
                <Textarea
                  id={healthNotesId}
                  value={displayedHealthNotes}
                  onChange={(e) => !healthReadOnly && setHealthCheckNotes(e.target.value)}
                  placeholder={
                    isManager
                      ? tr("(Veterinarian has not entered clinical notes yet)")
                      : tr("Note physical condition, musculature, eyes, lungs, skin, epidemiological signs...")
                  }
                  rows={3}
                  disabled={healthReadOnly}
                  readOnly={healthReadOnly}
                />
              </div>
            </div>
          </div>

          {currentRecord.healthFinalizedAt && <div className={styles.block}>
            <p role="status">{tr("Conclusion finalized at {{time}}. Finalized records remain preserved in history.", { time: formatDateTime(currentRecord.healthFinalizedAt) })}</p>
            {currentRecord.healthReviews?.map(r => <p key={r.id}>{formatDateTime(r.createdAt)} — {r.veterinarianName}: {r.isHealthEligible ? tr("Eligible") : tr("Ineligible")} — {r.notes}{r.reason ? ` — ${tr("Supplementary review reason")}: ${r.reason}` : ''}</p>)}
            {isVet && !reviewing && <Button tone="secondary" onClick={() => { setReviewing(true); setReviewReason(''); }}>{tr("Supplementary Review")}</Button>}
          </div>}
          {reviewing && <label>{tr("Supplementary review reason (10–500 characters)")}<Textarea aria-label={tr("Supplementary review reason")} value={reviewReason} maxLength={500} onChange={e => setReviewReason(e.target.value)} />
            <Button tone="secondary" onClick={() => { setReviewing(false); setIsHealthEligible(currentRecord.isHealthEligible ?? null); setHealthCheckNotes(currentRecord.healthCheckNotes || ''); }}>{tr("Cancel supplementary review")}</Button>
          </label>}
          {isManager && <GroomPlacementFields value={placement} onChange={setPlacement} disabled={approving} />}
          {/* Action buttons bar */}
          <div className={styles.actions}>
            <div>
              {isManager && (
                <Button
                  tone="danger"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={saving || approving}
                >
                  <Icon name="ban" size={16} />
                  {tr("Reject Admission")}
                </Button>
              )}
            </div>

            <div className={styles.rightActions}>
              <Button
                tone={isVet ? "primary" : "secondary"}
                className={isVet ? design.primary : design.secondary}
                onClick={() => isVet ? setConfirmHealth(true) : void handleSaveInspection()}
                disabled={saving || approving || capacity === null || capacity === 0 || (isVet && (healthReadOnly || isHealthEligible === null || healthCheckNotes.trim().length < 2 || (reviewing && reviewReason.trim().length < 10)))}
              >
                {saving ? tr("Saving...") : isVet ? tr("Finalize Health Conclusion") : tr("Save inspection results")}
              </Button>

              {isManager && (
                <Button
                  tone="primary"
                  className={design.primary}
                  onClick={handleApprove}
                  disabled={!canApprove || saving || approving}
                >
                  <Icon name="check" size={16} />
                  {approving ? tr("Approving...") : tr("Approve Club Admission")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {confirmHealth && <Modal title={tr("Confirm Finalizing Health Conclusion")} onClose={() => !saving && setConfirmHealth(false)} dialogClassName={design.dialog} overlayClassName={design.overlay} width={480}>
        <p>{tr("Conclusion:")} <strong>{isHealthEligible ? tr("Eligible") : tr("Ineligible")}</strong>. {tr("Once finalized, the Veterinarian cannot edit the conclusion or notes of this examination.")}</p>
        <div className={design.actions}><Button tone="secondary" disabled={saving} onClick={() => setConfirmHealth(false)}>{tr("Review again")}</Button><Button disabled={saving} onClick={handleSaveInspection}>{tr("Confirm Finalize")}</Button></div>
      </Modal>}
      {/* Mandatory reason rejection popup */}
      {showRejectDialog && (
        <Modal
          title={tr("Reject Admission Request")}
          subtitle={`${tr("Horse Name")}: ${record.horse?.name || ""} — ${record.admissionCode}`}
          tone="danger"
          width={480}
          dialogClassName={design.dialog}
          overlayClassName={design.overlay}
          onClose={() => !rejecting && setShowRejectDialog(false)}
        >
          <div className={design.form}>
            <p>
              {tr("Explain why admission was denied (e.g. microchip mismatch, illness symptoms)...")}
            </p>

            <div>
              <Textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                placeholder={tr("Explain why admission was denied (e.g. microchip mismatch, illness symptoms)...")}
                rows={4}
                maxLength={500}
                aria-label={tr("Rejection reason")}
                autoFocus
              />
              <div className={styles.reasonHint}>
                <span>{rejectionReason.trim().length}/500 {tr("characters")}</span>
                {rejectError && <span role="alert" className={design.error}>{rejectError}</span>}
              </div>
            </div>

            <div className={design.actions}>
              <Button
                tone="secondary"
                className={design.secondary}
                onClick={() => setShowRejectDialog(false)}
                disabled={rejecting}
              >
                {tr("Cancel")}
              </Button>
              <Button
                tone="danger"
                onClick={handleConfirmReject}
                disabled={rejecting || rejectionReason.trim().length < 10}
              >
                {rejecting ? tr("Rejecting...") : tr("Confirm Rejection")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
