import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Field } from "@/shared/components/form/Field";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { tr } from "@/shared/i18n/tr";
import { getBarnStaffing, type BarnStaffingItem } from "@/features/accounts/api";
import { assignHorseTrainer } from "@/features/horses/api";
import { messageFor } from "@/shared/lib/messages";

interface AssignHorseTrainerModalProps {
  horseId: string;
  horseName: string;
  horseCode: string;
  stallCode?: string;
  zoneId?: string | null;
  zoneName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignHorseTrainerModal({
  horseId,
  horseName,
  horseCode,
  stallCode,
  zoneId,
  zoneName,
  isOpen,
  onClose,
  onSuccess,
}: AssignHorseTrainerModalProps) {
  useTranslation();
  const toast = useToast();
  const [barns, setBarns] = useState<BarnStaffingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    setSelectedTrainerId("");
    setNotes("");

    getBarnStaffing()
      .then((data) => {
        setBarns(data.barns || []);
      })
      .catch((err) => {
        setError(messageFor(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Tìm khu chuồng của ngựa
  const currentBarn = barns.find((b) => b.id === zoneId || b.name === zoneName || (stallCode && b.code && stallCode.startsWith(b.code)));
  const allBarnTrainers = currentBarn ? currentBarn.trainers : barns.flatMap((b) => b.trainers);
  // Chỉ lọc các Huấn luyện viên ĐANG HOẠT ĐỘNG CHÍNH THỨC (ACTIVE)
  const activeTrainers = allBarnTrainers.filter((t) => t.status === "ACTIVE");
  const invitedTrainers = allBarnTrainers.filter((t) => t.status && t.status !== "ACTIVE");

  async function handleSubmit() {
    if (!selectedTrainerId) {
      setError(tr("Please select a receiving Head Trainer."));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await assignHorseTrainer(horseId, {
        trainerUserId: selectedTrainerId,
        notes: notes.trim() || undefined,
      });
      toast.show(tr("Assigned trainer for {{name}} successfully. Handover request sent via notifications and email.", { name: horseName }), "ok");
      onSuccess();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={tr("Assign Head Trainer: {{name}}", { name: horseName })}
      subtitle={`${tr("Code:")} ${horseCode}${stallCode ? ` · ${tr("Stall:")} ${stallCode}` : ""}${zoneName ? ` (${zoneName})` : ""}`}
      width={560}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <Alert tone="info">
          {tr("By operating policy, a horse may only be assigned to an active Head Trainer in the same Barn who has not exceeded the 8-horse limit.")}
        </Alert>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
            {tr("Loading barn Head Trainers...")}
          </div>
        ) : activeTrainers.length === 0 ? (
          <Alert tone="warn">
            {invitedTrainers.length > 0
              ? tr("This Barn has no active Head Trainer ready yet ({{count}} invited pending email activation). Please activate the trainer account before assigning horses.", { count: invitedTrainers.length })
              : tr("This Barn currently has no Head Trainer assigned. Please go to Accounts to assign a Head Trainer to this Barn first.")}
          </Alert>
        ) : (
          <Field label={tr("Select receiving Head Trainer (*)")} required>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
              {activeTrainers.map((t) => {
                const load = t.currentLoad ?? 0;
                const max = t.maxCapacity ?? 8;
                const isFull = load >= max;
                const isSelected = selectedTrainerId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (!isFull) {
                        setSelectedTrainerId(t.id);
                        setError("");
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--brand, #2563eb)"
                        : isFull
                        ? "1px solid var(--border-subtle, #e2e8f0)"
                        : "1px solid var(--border, #cbd5e1)",
                      background: isSelected
                        ? "rgba(37, 99, 235, 0.06)"
                        : isFull
                        ? "var(--surface-sunken, #f8fafc)"
                        : "var(--surface, #ffffff)",
                      opacity: isFull ? 0.6 : 1,
                      cursor: isFull ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{t.fullName}</strong>
                        {isSelected && <Badge tone="ok">{tr("Selected")}</Badge>}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {t.email}
                      </div>
                    </div>

                    <div>
                      {isFull ? (
                        <Badge tone="danger">{tr("Load: {{load}}/{{max}} [Full]", { load, max })}</Badge>
                      ) : (
                        <Badge tone="neutral">{tr("Load: {{load}}/{{max}} · {{left}} slot(s) left", { load, max, left: max - load })}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        <Field label={tr("Handover notes (Optional)")}>
          <Textarea
            placeholder={tr("Enter handover notes or special instructions...")}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <Button tone="secondary" onClick={onClose} disabled={submitting}>
            {tr("Cancel")}
          </Button>
          <Button
            tone="primary"
            onClick={handleSubmit}
            disabled={submitting || !selectedTrainerId || loading}
          >
            {submitting ? tr("Assigning trainer...") : tr("Confirm Trainer Assignment")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
