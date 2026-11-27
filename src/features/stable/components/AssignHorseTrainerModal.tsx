import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { tr } from "@/shared/i18n/tr";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import type { Horse } from "@/features/horses/types";
import { assignHorseTrainer } from "@/features/horses/api";
import { getBarnStaffing } from "@/features/accounts/api";
import type { BarnStaffingItem } from "@/features/accounts/api";

interface AssignHorseTrainerModalProps {
  horse: Horse;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignHorseTrainerModal({
  horse,
  onClose,
  onAssigned,
}: AssignHorseTrainerModalProps) {
  useTranslation();
  const [barns, setBarns] = useState<BarnStaffingItem[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(horse.assignedTrainerId || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const staffingRes = await getBarnStaffing();
        if (!cancelled) {
          setBarns(staffingRes.barns);
        }
      } catch (err) {
        if (!cancelled) setError(messageFor(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Xác định Barn của con ngựa
  // horse.zone hoặc trong chuồng
  const horseBarn = barns.find(
    (b) =>
      b.name === horse.zone ||
      b.code === horse.zone ||
      (horse.zone && (b.name.includes(horse.zone) || horse.zone.includes(b.name))) ||
      (horse.stallCode && (horse.stallCode.startsWith(b.code) || horse.stallCode.startsWith(b.name.charAt(b.name.length - 1)))),
  ) || (horse.stallCode && barns.length > 0 ? barns[0] : undefined);

  // Danh sách HLV thuộc Barn này và ĐANG HOẠT ĐỘNG CHÍNH THỨC (ACTIVE)
  const allBarnTrainers = horseBarn ? horseBarn.trainers : [];
  const eligibleTrainers = allBarnTrainers.filter((t) => t.status === "ACTIVE");
  const invitedTrainersCount = allBarnTrainers.filter((t) => t.status && t.status !== "ACTIVE").length;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !selectedTrainerId) return;

    setBusy(true);
    setError(null);
    try {
      await assignHorseTrainer(horse.id, {
        trainerUserId: selectedTrainerId,
        notes: notes.trim() || undefined,
      });
      onAssigned();
    } catch (err) {
      if (err instanceof ApiError) setError(messageFor(err));
      else setError(tr("Could not assign trainer. Please check again."));
    } finally {
      setBusy(false);
    }
  }

  const trainerOptions = eligibleTrainers.map((t) => {
    const load = t.currentLoad ?? 0;
    const max = t.maxCapacity ?? 8;
    const isFull = load >= max;
    const remaining = Math.max(0, max - load);
    return {
      value: t.id,
      label: tr("{{name}} — Load: {{load}}/{{max}} {{suffix}}", {
        name: t.fullName,
        load,
        max,
        suffix: isFull ? tr("[Full]") : tr("[{{count}} open]", { count: remaining }),
      }),
      disabled: isFull,
    };
  });

  return (
    <Modal
      title={tr("Assign Head Trainer to Horse")}
      subtitle={`${tr("Horse:")} ${horse.name} (${horse.horseCode || "—"})`}
      width={480}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-sunken)",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border-soft)",
            display: "grid",
            gap: 6,
          }}
        >
          <div>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>{tr("Stall:")} </span>
            <strong>{horse.stallCode || tr("Unassigned stall")}</strong>
            {horse.zone && <span style={{ marginLeft: 6, color: "var(--text-2)" }}>({horse.zone})</span>}
          </div>
          <div>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>{tr("Barn Zone:")} </span>
            {horseBarn ? (
              <Badge tone="info">{horseBarn.name}</Badge>
            ) : (
              <Badge tone="warn">{tr("Barn unassigned")}</Badge>
            )}
          </div>
          <div>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>{tr("Assignment status:")} </span>
            {horse.trainerAssignmentStatus === "ASSIGNED" ? (
              <Badge tone="ok">{tr("Accepted ({{name}})", { name: horse.assignedTrainer?.fullName ?? "" })}</Badge>
            ) : horse.trainerAssignmentStatus === "PENDING_ACCEPTANCE" ? (
              <Badge tone="warn">{tr("Awaiting acceptance (48h)")}</Badge>
            ) : horse.trainerAssignmentStatus === "DECLINED" ? (
              <Badge tone="danger">{tr("Declined: {{reason}}", { reason: horse.trainerDeclineReason || "—" })}</Badge>
            ) : (
              <Badge tone="neutral">{tr("Unassigned")}</Badge>
            )}
          </div>
        </div>

        {!horse.stallCode ? (
          <Alert tone="warn">
            {tr("This horse has not been assigned to a Barn stall yet. Please assign a stall before assigning a trainer.")}
          </Alert>
        ) : eligibleTrainers.length === 0 ? (
          <Alert tone="warn">
            {invitedTrainersCount > 0
              ? tr("This Barn has {{count}} invited trainer(s) pending activation. Please activate an account first.", { count: invitedTrainersCount })
              : tr("This Barn currently has no Head Trainer assigned. Please assign a trainer in Accounts first.")}
          </Alert>
        ) : (
          <>
            <Field label={tr("Select Head Trainer (Same Barn)")} required>
              <Select
                value={selectedTrainerId}
                disabled={loading || busy}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                options={[
                  { value: "", label: tr("-- Select Head Trainer --"), disabled: true },
                  ...trainerOptions,
                ]}
              />
            </Field>

            <Field label={tr("Assignment notes (included in email)")}>
              <Textarea
                rows={3}
                placeholder={tr("e.g. Horse recovering fitness, prioritize light workouts...")}
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-2)",
                lineHeight: 1.5,
                background: "var(--surface-sunken)",
                padding: "8px 12px",
                borderRadius: "var(--r-sm)",
              }}
            >
              {tr("An email notification with a confirmation link will be sent to the trainer. The trainer has")} <strong>{tr("48 hours")}</strong> {tr("to accept custody (SLA-HANDOVER-48H).")}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 6 }}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading || busy || !selectedTrainerId || !horse.stallCode || eligibleTrainers.length === 0}
          >
            {busy ? tr("Sending…") : tr("Assign & Send Email (48h SLA)")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
