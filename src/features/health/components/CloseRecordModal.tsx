import { useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ApiError } from "@/shared/lib/api";
import { tr } from "@/shared/i18n/tr";

const TREATMENT_RESULT_OPTIONS = [
  { value: "Fully recovered", label: "Fully recovered" },
  { value: "Significantly improved", label: "Significantly improved" },
  { value: "Unimproved / Referral required", label: "Unimproved / Referral required" },
];

interface CloseRecordModalProps {
  recordNumber: string;
  isClosed?: boolean;
  onClose: () => void;
  onConfirmClose: (conclusion: string, result: string) => Promise<void>;
  onConfirmReopen: (reason: string) => Promise<void>;
}

export function CloseRecordModal({
  recordNumber,
  isClosed = false,
  onClose,
  onConfirmClose,
  onConfirmReopen,
}: CloseRecordModalProps) {
  const [conclusion, setConclusion] = useState("");
  const [treatmentResult, setTreatmentResult] = useState("Fully recovered");
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReopenValid = reopenReason.trim().length >= 10 && reopenReason.trim().length <= 500;
  const isCloseValid = conclusion.trim().length >= 10 && conclusion.trim().length <= 2000;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isClosed) {
      const trimmed = reopenReason.trim();
      if (!trimmed) {
        setError(tr("Please enter a reason for reopening the medical record."));
        return;
      }
      if (trimmed.length < 10) {
        setError(tr("Reason for reopening must be between 10 and 500 characters."));
        return;
      }
      if (trimmed.length > 500) {
        setError(tr("Reason for reopening cannot exceed 500 characters."));
        return;
      }
      setBusy(true);
      try {
        await onConfirmReopen(trimmed);
        onClose();
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === "REOPEN_EXPIRED") {
          setError(tr("A medical record can be reopened only within 7 days after it was closed."));
        } else if (err instanceof ApiError && err.code === "RECORD_NOT_CLOSED") {
          setError(tr("Only a closed medical record can be reopened."));
        } else {
          setError(err instanceof Error ? tr(err.message) : tr("An error occurred."));
        }
      } finally {
        setBusy(false);
      }
    } else {
      const trimmed = conclusion.trim();
      if (trimmed.length < 10) {
        setError(tr("Treatment conclusion must be at least 10 characters."));
        return;
      }
      if (trimmed.length > 2000) {
        setError(tr("Treatment conclusion cannot exceed 2000 characters."));
        return;
      }
      setBusy(true);
      try {
        await onConfirmClose(trimmed, treatmentResult);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? tr(err.message) : tr("An error occurred."));
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <Modal
      title={isClosed ? tr(`Reopen Medical Record ${recordNumber}`) : tr(`Close Treatment Record ${recordNumber}`)}
      subtitle={
        isClosed
          ? tr("May only be reopened within 7 days of closure for supplemental treatment.")
          : tr("Concludes medical record. All active medications will automatically be marked as stopped.")
      }
      width={500}
      onClose={busy ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
          <Button tone="ghost" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button
            tone="primary"
            type="submit"
            form="close-record-form"
            disabled={busy || (isClosed ? !isReopenValid : !isCloseValid)}
          >
            {isClosed ? tr("Confirm Reopen") : tr("Save Conclusion & Close Record")}
          </Button>
        </div>
      }
    >
      <form id="close-record-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-body)", padding: "10px 12px", background: "var(--danger-bg)", borderRadius: "var(--r)", border: "1px solid var(--danger)" }}>
            {error}
          </div>
        )}

        {isClosed ? (
          <Field
            label={tr("Reopen Reason *")}
            hint={tr("Between 10 and 500 characters (currently: {{n}})", { n: reopenReason.trim().length })}
          >
            <Textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => {
                setReopenReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={tr("e.g., Horse showed mild recurrence of swelling 2 days after stopping medication...")}
              required
            />
          </Field>
        ) : (
          <>
            <Field label={tr("Treatment Outcome Evaluation *")}>
              <Select
                options={TREATMENT_RESULT_OPTIONS}
                value={treatmentResult}
                onChange={(e) => setTreatmentResult(e.target.value)}
              />
            </Field>

            <Field
              label={tr("Treatment Conclusion *")}
              hint={tr("Between 10 and 2,000 characters (currently: {{n}})", { n: conclusion.trim().length })}
            >
              <Textarea
                rows={4}
                value={conclusion}
                onChange={(e) => {
                  setConclusion(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={tr("Overall evaluation of protocol efficacy, current physical status, and post-recovery care instructions...")}
                required
              />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
