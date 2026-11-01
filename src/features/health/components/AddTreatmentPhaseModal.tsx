import formLayout from "@/shared/components/form/FormLayout.module.css";
import { useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import type { CareInstructionItem, TreatmentPhaseInput } from "../types";

import { tr } from "@/shared/i18n/tr";
const ACTIVITY_OPTIONS = [
  { value: "Strict stall rest", label: "Strict stall rest" },
  { value: "Hand walk 10-15 mins", label: "Hand walk 10-15 mins" },
  { value: "Light exercise", label: "Light exercise (Trotting / lunging)" },
  { value: "Full training", label: "Full training" },
];

interface AddTreatmentPhaseModalProps {
  onClose: () => void;
  onSubmit: (input: TreatmentPhaseInput) => Promise<void>;
}

export function AddTreatmentPhaseModal({ onClose, onSubmit }: AddTreatmentPhaseModalProps) {
  const [phaseName, setPhaseName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const [target, setTarget] = useState("");
  const [allowedActivity, setAllowedActivity] = useState("");
  const [instructions, setInstructions] = useState<CareInstructionItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addInstruction() {
    setInstructions([...instructions, { activity: "", frequency: "" }]);
  }

  function removeInstruction(index: number) {
    setInstructions(instructions.filter((_, i) => i !== index));
  }

  function updateInstruction(index: number, key: keyof CareInstructionItem, value: string) {
    const next = [...instructions];
    next[index] = { ...next[index], [key]: value };
    setInstructions(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phaseName.trim()) {
      setError(tr("Please enter treatment phase name."));
      return;
    }
    if (!target.trim()) {
      setError(tr("Please enter phase objective."));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        phaseName: phaseName.trim(),
        startDate,
        endDate,
        target: target.trim(),
        allowedActivity,
        careInstructions: instructions
          .filter((i) => i.activity.trim() !== "")
          .map((i) => (i.frequency && i.frequency.trim() ? `${i.activity.trim()} (${i.frequency.trim()})` : i.activity.trim())) as any,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tr("Failed to save treatment phase."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tr("Add Treatment Phase")}
      subtitle={tr("Define phase objectives, allowed activity level, and care instructions for Grooms.")}
      width={560}
      onClose={busy ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
          <Button tone="ghost" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button tone="primary" type="submit" form="treatment-phase-form" disabled={busy}>
            {tr("Save Phase")}
          </Button>
        </div>
      }
    >
      <form id="treatment-phase-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-body)", padding: "8px", background: "var(--danger-bg)", borderRadius: "var(--r)" }}>
            {error}
          </div>
        )}

        <Field label={tr("Phase Name *")} hint={tr("e.g., Phase 1: Acute inflammation reduction")}>
          <Input
            value={phaseName}
            onChange={(e) => setPhaseName(e.target.value)}
            placeholder={tr("Phase 1: Swelling reduction & anti-inflammatory...")}
            required
          />
        </Field>

        <div className={formLayout.columns}>
          <Field label={tr("Start Date *")}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Field>
          <Field label={tr("End Date *")}>
            <Input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </Field>
        </div>

        <Field label={tr("Allowed Activity Level *")}>
          <Select
            required
            options={[{ value: "", label: tr("Select activity level"), disabled: true }, ...ACTIVITY_OPTIONS.map((opt) => ({ value: opt.value, label: tr(opt.label) }))]}
            value={allowedActivity}
            onChange={(e) => setAllowedActivity(e.target.value)}
          />
        </Field>

        <Field label={tr("Phase Objective *")} hint={tr("Clinical criteria required to progress to next phase")}>
          <Textarea
            rows={2}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={tr("Reduce fetlock heat, zero lameness upon walking, normal flexion...")}
            required
          />
        </Field>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "var(--fs-body)", fontWeight: 600 }}>{tr("Daily Care Instructions (for Groom)")}</span>
            <Button size="sm" tone="ghost" icon="plus" onClick={addInstruction}>
              {tr("Add Task")}
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {instructions.map((item, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr auto", gap: 8, alignItems: "center" }}>
                <Input
                  value={item.activity}
                  onChange={(e) => updateInstruction(idx, "activity", e.target.value)}
                  placeholder={tr("Care activity (e.g., Ice boot therapy)")}
                />
                <Input
                  value={item.frequency}
                  onChange={(e) => updateInstruction(idx, "frequency", e.target.value)}
                  placeholder={tr("Frequency (e.g., 2 times/day)")}
                />
                {instructions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(idx)}
                    style={{ border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                    title={tr("Delete row")}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
