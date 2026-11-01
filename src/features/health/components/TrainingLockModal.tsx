import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { messageFor } from "@/shared/lib/messages";
import { formatDate } from "@/shared/lib/format";

import { tr } from "@/shared/i18n/tr";
const APPLIED_STATUS_OPTIONS = [
  { value: "INJURED", label: "Injured" },
  { value: "UNDER_OBSERVATION", label: "Under Observation" },
  { value: "ISOLATED", label: "Isolated (quarantine)" },
];

const RESTORE_STATUS_OPTIONS = [
  { value: "RESTING", label: "Resting - Rest before training resumes" },
  { value: "IN_TRAINING", label: "In Training - Allow training to resume" },
  { value: "UNDER_OBSERVATION", label: "Under Observation - Light exercise only" },
];

interface TrainingLockModalProps {
  mode: "place" | "lift" | "extend";
  horseName: string;
  horseId?: string;
  horseOptions?: { value: string; label: string }[];
  currentReviewDate?: string;
  onClose: () => void;
  onPlaceLock?: (dto: { horseId?: string; reason: string; reviewDate: string; appliedStatus: string; unlockConditions?: string }) => Promise<void>;
  onLiftLock?: (dto: { reason: string; restoreStatus: string }) => Promise<void>;
  onExtendLock?: (dto: { newReviewDate: string; reason: string }) => Promise<void>;
}

export function TrainingLockModal({
  mode,
  horseName,
  horseId,
  horseOptions,
  currentReviewDate,
  onClose,
  onPlaceLock,
  onLiftLock,
  onExtendLock,
}: TrainingLockModalProps) {
  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0];

  const [selectedHorseId, setSelectedHorseId] = useState(horseId || "");
  const [reason, setReason] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [newReviewDate, setNewReviewDate] = useState("");
  const [restoreStatus, setRestoreStatus] = useState("");
  const [unlockConditions, setUnlockConditions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const initial = useRef({ selectedHorseId, appliedStatus, reviewDate, newReviewDate, restoreStatus });

  const activeHorseLabel =
    horseOptions?.find((h) => h.value === selectedHorseId)?.label || horseName;

  const titles = {
    place: `Place Training Lock: ${activeHorseLabel}`,
    lift: `Lift Training Lock: ${horseName}`,
    extend: `Extend Lock Review Date: ${horseName}`,
  };

  const subtitles = {
    place: "Highest system priority order; immediately blocks heavy training assignments and race entries.",
    lift: "Lift lock following clinical recovery. Blocked sessions transition to pending trainer reactivation.",
    extend: "Extend recovery period if the horse has not yet met unlocking criteria.",
  };

  const isReasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;
  const isDateValid =
    mode === "place"
      ? reviewDate >= minDate && reviewDate <= maxDate
      : mode === "extend"
      ? newReviewDate >= minDate && newReviewDate <= maxDate
      : true;

  const isFormValid = isReasonValid && isDateValid && (mode !== "place" || Boolean(selectedHorseId && appliedStatus)) && (mode !== "lift" || Boolean(restoreStatus));

  function handleCancel() {
    if (busy) return;
    const changed = reason.trim() || unlockConditions.trim() || selectedHorseId !== initial.current.selectedHorseId ||
      appliedStatus !== initial.current.appliedStatus || reviewDate !== initial.current.reviewDate ||
      newReviewDate !== initial.current.newReviewDate || restoreStatus !== initial.current.restoreStatus;
    if (changed) { setConfirmDiscard(true); return; }
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || (mode === "place" && (!selectedHorseId || !appliedStatus)) || (mode === "lift" && !restoreStatus)) return;
    if (!reason.trim()) {
      setError("Please enter a clinical reason (10 to 500 characters).");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Clinical reason must be at least 10 characters long.");
      return;
    }
    if (reason.trim().length > 500) {
      setError("Clinical reason cannot exceed 500 characters.");
      return;
    }

    if (mode === "place" && (reviewDate < minDate || reviewDate > maxDate)) {
      setError("Review date must be between tomorrow and 180 days from now.");
      return;
    }

    if (mode === "extend" && (newReviewDate < minDate || newReviewDate > maxDate)) {
      setError("New review date must be between tomorrow and 180 days from now.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "place" && onPlaceLock) {
        await onPlaceLock({
          horseId: selectedHorseId || horseId,
          reason: reason.trim(),
          reviewDate,
          appliedStatus,
          unlockConditions: unlockConditions.trim() || undefined,
        });
      } else if (mode === "lift" && onLiftLock) {
        await onLiftLock({
          reason: reason.trim(),
          restoreStatus,
        });
      } else if (mode === "extend" && onExtendLock) {
        await onExtendLock({
          newReviewDate,
          reason: reason.trim(),
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  if (confirmDiscard) {
    return <ConfirmModal
      title={tr("Discard changes")}
      tone="warn"
      confirmLabel={tr("Discard changes")}
      cancelLabel={tr("Cancel")}
      onConfirm={onClose}
      onCancel={() => setConfirmDiscard(false)}
    >
      {tr("You have unsaved changes. Are you sure you want to discard them?")}
    </ConfirmModal>;
  }

  return (
    <Modal
      title={titles[mode]}
      subtitle={subtitles[mode]}
      tone={mode === "place" ? "danger" : "warn"}
      width={520}
      onClose={handleCancel}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
          <Button tone="ghost" onClick={handleCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            tone={mode === "lift" ? "primary" : mode === "place" ? "danger" : "primary"}
            type="submit"
            form="training-lock-form"
            disabled={busy || !isFormValid}
          >
            {mode === "place" ? "Confirm Training Lock" : mode === "lift" ? "Confirm Lift Lock" : "Save Extension"}
          </Button>
        </div>
      }
    >
      <form id="training-lock-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: "13px", padding: "8px 12px", background: "var(--danger-bg)", borderRadius: "var(--r)" }}>
            {tr(error)}
          </div>
        )}

        {mode === "place" && (
          <>
            <div
              style={{
                padding: "12px 14px",
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--r)",
                fontSize: "13px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{tr("⚠️ Clinical Order Impact Assessment")}</span>
              </div>
              <div style={{ color: "var(--text)", lineHeight: 1.5 }}>
                • <strong>{tr("Health Status:")}</strong> {appliedStatus ? <>{tr("Transitions horse to")} <strong>{tr(APPLIED_STATUS_OPTIONS.find((option) => option.value === appliedStatus)?.label || appliedStatus)}</strong> {tr("immediately.")}</> : tr("Select a health status.")}<br/>
                • <strong>{tr("Training Impact:")}</strong> {tr("Automatically")}{" "}<strong>{tr("BLOCKS")}</strong> {tr("all upcoming high-intensity workouts.")}<br/>
                • <strong>{tr("Racing:")}</strong> {tr("Suspends pending race nominations during the medical hold.")}<br/>
                • <strong>{tr("Notifications:")}</strong> {tr("Urgent alerts dispatched to Head Trainer, Club Manager, Groom & Owner.")}
              </div>
            </div>

            {horseOptions && horseOptions.length > 0 && (
              <Field label={tr("Target Horse *")}>
                <SearchSelect
                  options={[{ value: "", label: tr("— Select a horse —") }, ...horseOptions]}
                  value={selectedHorseId}
                  onChange={setSelectedHorseId}
                />
              </Field>
            )}

            <Field label={tr("Applied Health Status *")}>
              <Select
                options={[{ value: "", label: tr("— Select —") }, ...APPLIED_STATUS_OPTIONS]}
                value={appliedStatus}
                onChange={(e) => setAppliedStatus(e.target.value)}
              />
            </Field>

            <Field label={tr("Review Date *")} hint={tr("Review date must be between tomorrow and 180 days")}>
              <Input
                type="date"
                value={reviewDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setReviewDate(e.target.value)}
                required
              />
            </Field>

            <Field
              label={tr("Lock Reason * ({{count}}/500)", { count: reason.trim().length })}
              hint={reason.trim().length > 0 && reason.trim().length < 10 ? tr("Min 10 characters required (currently {{count}})", { count: reason.trim().length }) : tr("Min 10, max 500 characters")}
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr("e.g., Superficial digital flexor tendon strain post-exercise, suspected micro-tear...")}
                required
              />
            </Field>

            <Field label={tr("Unlock Conditions")} hint={tr("Clinical criteria required before lifting lock")}>
              <Input
                value={unlockConditions}
                onChange={(e) => setUnlockConditions(e.target.value)}
                placeholder={tr("e.g., Zero lameness upon palpation and flexion, ultrasound clearance...")}
              />
            </Field>
          </>
        )}

        {mode === "lift" && (
          <>
            <Field label={tr("Post-Lift Health Status *")}>
              <Select
                options={[{ value: "", label: tr("— Select —") }, ...RESTORE_STATUS_OPTIONS]}
                value={restoreStatus}
                onChange={(e) => setRestoreStatus(e.target.value)}
              />
            </Field>

            <Field
              label={tr("Reason for Lifting Lock * ({{count}}/500)", { count: reason.trim().length })}
              hint={reason.trim().length > 0 && reason.trim().length < 10 ? tr("Min 10 characters required") : tr("Veterinary evaluation notes prior to releasing horse")}
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr("e.g., Re-examination today confirms joint stability, full range of motion, normal gait...")}
                required
              />
            </Field>
          </>
        )}

        {mode === "extend" && (
          <>
            {currentReviewDate && (
              <div style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>
                {tr("Current review date:")}{" "}<strong>{formatDate(currentReviewDate)}</strong>
              </div>
            )}

            <Field label={tr("New Review Date *")} hint={tr("Must be between tomorrow and 180 days")}>
              <Input
                type="date"
                value={newReviewDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setNewReviewDate(e.target.value)}
                required
              />
            </Field>

            <Field
              label={tr("Reason for Extension * ({{count}}/500)", { count: reason.trim().length })}
              hint={reason.trim().length > 0 && reason.trim().length < 10 ? tr("Min 10 characters required") : tr("State clinical reasons for extending rehabilitation")}
            >
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={tr("e.g., Lesion not fully resolved, requires 7 more days of physical therapy...")}
                required
              />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
