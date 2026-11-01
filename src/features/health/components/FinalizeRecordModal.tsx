import { useState } from "react";
import type { FormEvent } from "react";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import type { FinalizeRecordInput } from "../types";

import { tr } from "@/shared/i18n/tr";
interface FinalizeRecordModalProps {
  recordNumber: string;
  proposedStatus?: string;
  initialProposeLock?: boolean;
  onClose: () => void;
  onFinalize: (input: FinalizeRecordInput) => Promise<void>;
}

export function FinalizeRecordModal({
  recordNumber,
  proposedStatus,
  initialProposeLock = false,
  onClose,
  onFinalize,
}: FinalizeRecordModalProps) {
  const [applyProposedStatus, setApplyProposedStatus] = useState(true);
  const [proposeMedicalLock, setProposeMedicalLock] = useState(initialProposeLock);
  const [lockExpectedRestDays, setLockExpectedRestDays] = useState(7);
  const [lockReason, setLockReason] = useState("");
  const [lockUnlockConditions, setLockUnlockConditions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (proposeMedicalLock && !lockReason.trim()) {
      setError("Please enter a clinical reason for placing a Training Lock.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onFinalize({
        applyProposedStatus,
        proposeMedicalLock,
        lockExpectedRestDays: proposeMedicalLock ? Number(lockExpectedRestDays) : undefined,
        lockReason: proposeMedicalLock ? lockReason.trim() : undefined,
        lockUnlockConditions: proposeMedicalLock ? lockUnlockConditions.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to finalize medical record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tr(`Finalize Medical Record ${recordNumber}`)}
      subtitle={tr("Transitions medical record to In-Treatment status. Examination and diagnostic sections will be locked against editing.")}
      width={520}
      onClose={busy ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
          <Button tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button tone="primary" type="submit" form="finalize-record-form" disabled={busy}>
            Confirm Finalization
          </Button>
        </div>
      }
    >
      <form id="finalize-record-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-body)", padding: "8px", background: "var(--danger-bg)", borderRadius: "var(--r)" }}>
            {tr(error)}
          </div>
        )}

        {proposedStatus && (
          <Field label={tr("Apply Proposed Status")} hint={tr(`Update horse health status to: ${proposedStatus}`)}>
            <Checkbox
              label={tr("Apply this status to horse profile immediately upon finalization")}
              checked={applyProposedStatus}
              onChange={setApplyProposedStatus}
            />
          </Field>
        )}

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <Checkbox
            label={tr("Activate Training Lock")}
            checked={proposeMedicalLock}
            onChange={setProposeMedicalLock}
          />
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)", display: "block", marginTop: 4 }}>
            {tr("Highest system priority order; automatically blocks heavy exercise and holds race entries.")}
          </span>
        </div>

        {proposeMedicalLock && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 12, borderLeft: "2px solid var(--danger)" }}>
            <Field label={tr("Lock Reason *")} hint={tr("Describe musculoskeletal lesion or clinical rationale for mandatory rest")}>
              <Textarea
                rows={2}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder={tr("e.g., Grade 2 SDFT desmitis requiring strict stall rest...")}
                required
              />
            </Field>

            <Field label={tr("Expected Rest Duration (days)")} hint={tr("System calculates review date = today + specified days")}>
              <Input
                type="number"
                min={1}
                max={180}
                value={lockExpectedRestDays}
                onChange={(e) => setLockExpectedRestDays(Number(e.target.value))}
              />
            </Field>

            <Field label={tr("Unlock Conditions")} hint={tr("Clinical benchmarks required before VET lifts lock")}>
              <Input
                value={lockUnlockConditions}
                onChange={(e) => setLockUnlockConditions(e.target.value)}
                placeholder={tr("e.g., Follow-up ultrasound confirms tendon healing, zero pain on palpation...")}
              />
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}
