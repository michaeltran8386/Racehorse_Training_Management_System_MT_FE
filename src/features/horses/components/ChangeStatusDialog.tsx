import React, { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { useToast } from "@/shared/components/ui/Toast";
import { changeHorseStatus } from "../api";
import { HEALTH_STATUS } from "@/shared/lib/status";
import { messageFor } from "@/shared/lib/messages";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Badge } from "@/shared/components/ui/Badge";
import type { HealthStatus, HorseStatus } from "@/shared/types/enums";
import type { Horse } from "../types";

import { localizeServerText, tr } from "@/shared/i18n/tr";
interface ChangeStatusDialogProps {
  horse: Horse;
  onSuccess: (updatedHorse: Horse) => void;
}

// Bảng chuyển trạng thái Flow 1 §4.2 (BE kiểm lại ở horse-rules.ts).
const OPERATIONAL: HorseStatus[] = ["RESTING", "IN_TRAINING", "ACTIVE"];
const MEDICAL: HorseStatus[] = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];

/** Các trạng thái vai trò này được chọn từ trạng thái hiện tại. CM không dùng hộp thoại này. */
function allowedTargets(role: string, horse: Horse): HorseStatus[] {
  const from = horse.status;
  if (from === "RETIRED") return [];
  if (role === "HEAD_TRAINER") {
    if (horse.isMedicalLocked || !OPERATIONAL.includes(from)) return [];
    return OPERATIONAL.filter((s) => s !== from);
  }
  if (role === "VETERINARIAN") {
    const targets = MEDICAL.filter((s) => s !== from);
    if (MEDICAL.includes(from) && !horse.isMedicalLocked) targets.push("RESTING", "IN_TRAINING");
    return targets;
  }
  return [];
}

export function ChangeStatusDialog({ horse, onSuccess }: ChangeStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<HorseStatus | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const currentUser = useCurrentUser();
  const toast = useToast();

  const isHeadTrainer = currentUser.role === "HEAD_TRAINER";
  const isVeterinarian = currentUser.role === "VETERINARIAN";
  if (!isHeadTrainer && !isVeterinarian) return null;

  const allowedStatuses = allowedTargets(currentUser.role, horse);
  // VET bắt buộc lý do 10-500 ký tự; HT tùy chọn.
  const reasonRequired = isVeterinarian;
  const reasonError =
    reason.trim().length > 0 && reason.trim().length < 10
      ? "Reason must be 10 to 500 characters."
      : reasonRequired && reason.trim().length === 0
        ? "Please enter a reason."
        : "";

  let disabledHint = "";
  if (allowedStatuses.length === 0) {
    if (horse.status === "RETIRED") disabledHint = "Horse is no longer managed";
    else if (horse.isMedicalLocked) disabledHint = "Blocked by Training Lock";
    else if (isHeadTrainer) disabledHint = "Horse is in a medical status; only a Veterinarian can change it";
  }

  const handleOpen = () => {
    if (allowedStatuses.length === 0) return;
    setStatus("");
    setReason("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status || reasonError) return;

    setLoading(true);
    try {
      const res = await changeHorseStatus(horse.id, {
        status,
        reason: reason.trim() || undefined,
      });
      toast.show(localizeServerText(res.message) || tr("Horse status updated successfully"), "ok");
      setOpen(false);
      onSuccess({ ...horse, status });
    } catch (err: unknown) {
      toast.show(messageFor(err), "danger");
    } finally {
      setLoading(false);
    }
  };

  const currentStatusCfg = HEALTH_STATUS[horse.status as HealthStatus] || { label: horse.status, tone: "neutral" };

  return (
    <>
      <Button
        tone="secondary"
        onClick={handleOpen}
        disabled={allowedStatuses.length === 0}
        title={disabledHint}
      >
        {tr("Change Status")}
      </Button>

      {open && (
        <Modal
          title={tr("Change Horse Status")}
          onClose={() => setOpen(false)}
          foot={
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button tone="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={(e: any) => handleSubmit(e)} disabled={!status || Boolean(reasonError) || loading}>
                Confirm
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                {tr("Current Status")}
              </label>
              <Badge tone={currentStatusCfg.tone as any}>{currentStatusCfg.label}</Badge>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                {tr("New Status")}{" "}<span style={{ color: "red" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {allowedStatuses.map((s) => {
                  const cfg = HEALTH_STATUS[s as HealthStatus] || { label: s };
                  return (
                    <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={status === s}
                        onChange={(e) => setStatus(e.target.value as HorseStatus)}
                      />
                      <span>{cfg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                {tr("Reason")}{" "}{reasonRequired ? <span style={{ color: "red" }}>*</span> : "(Optional)"}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--ink)",
                }}
                placeholder={reasonRequired ? tr("Clinical rationale (10-500 characters)...") : tr("Operational note...")}
              />
              {reasonError && reason.length > 0 && (
                <div style={{ color: "var(--danger)", fontSize: "var(--fs-body)", marginTop: "0.25rem" }}>{reasonError}</div>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
