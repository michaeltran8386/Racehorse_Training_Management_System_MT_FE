import formLayout from "@/shared/components/form/FormLayout.module.css";
import { useState } from "react";
import type { FormEvent } from "react";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import type { PrescriptionInput } from "../types";
import { formatDate } from "@/shared/lib/format";

import { localizeServerText, tr } from "@/shared/i18n/tr";
const UNIT_OPTIONS = [
  { value: "g", label: "g" },
  { value: "mg", label: "mg" },
  { value: "ml", label: "ml" },
  { value: "tablets", label: "tablets" },
  { value: "sachets", label: "sachets" },
];

const ROUTE_OPTIONS = [
  { value: "Oral", label: "Oral (PO)" },
  { value: "Intramuscular", label: "Intramuscular (IM)" },
  { value: "Intravenous", label: "Intravenous (IV)" },
  { value: "Subcutaneous", label: "Subcutaneous (SC)" },
  { value: "Topical", label: "Topical" },
  { value: "Ophthalmic", label: "Ophthalmic" },
];

const COMMON_EQUINE_MEDICATIONS = [
  { value: "Phenylbutazone 20% dung dịch tiêm", label: "Phenylbutazone 20% (NSAID giảm đau/kháng viêm)" },
  { value: "Flunixin Meglumine 50mg/ml", label: "Flunixin Meglumine 50mg/ml (Kháng viêm nội tạng/hạ sốt)" },
  { value: "Dexamethasone 2mg/ml", label: "Dexamethasone 2mg/ml (Corticosteroid chống sốc/viêm)" },
  { value: "Thuốc tẩy giun Ivermectin Paste 1.87%", label: "Ivermectin Paste 1.87% (Tẩy giun sán đường ruột)" },
  { value: "Omeprazole GastroGard Paste", label: "Omeprazole GastroGard (Điều trị viêm loét dạ dày)" },
  { value: "Meloxicam Oral Suspension", label: "Meloxicam Oral Suspension (Kháng viêm khớp)" },
  { value: "Gentamicin Sulfate 100mg/ml", label: "Gentamicin Sulfate 100mg/ml (Kháng sinh phổ rộng)" },
  { value: "Cefquinome (Cobactan 2.5%)", label: "Cefquinome 2.5% (Kháng sinh Cephalosporin thế hệ 4)" },
  { value: "Men vi sinh đường ruột EquiFlora dạng ống", label: "Men vi sinh đường ruột EquiFlora dạng ống" },
  { value: "Bột bù điện giải Post-Workout Electrolyte", label: "Bột bù điện giải Post-Workout Electrolyte" },
  { value: "OTHER", label: "Khác / Nhập tên thuốc khác..." },
];

interface AddPrescriptionModalProps {
  onClose: () => void;
  onSubmit: (input: PrescriptionInput) => Promise<void>;
}

export function AddPrescriptionModal({ onClose, onSubmit }: AddPrescriptionModalProps) {
  const [selectedMed, setSelectedMed] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("");
  const [route, setRoute] = useState("");
  const [frequencyPerDay, setFrequencyPerDay] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [daysCount, setDaysCount] = useState("");
  const [withdrawalDays, setWithdrawalDays] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMedChange = (val: string) => {
    setSelectedMed(val);
    setDosage("");
    setFrequencyPerDay("");
    setDaysCount("");
    setUnit("");
    setRoute("");
    setWithdrawalDays("");
    const found = COMMON_EQUINE_MEDICATIONS.find((m) => m.value === val);
    if (found && val !== "OTHER") {
      setMedicationName(found.value);
    } else {
      setMedicationName("");
    }
  };

  const totalAmount = Number(dosage) * Number(frequencyPerDay) * Number(daysCount);

  // Calculate withdrawal clearance date
  const startD = new Date(startDate);
  const endD = new Date(startD.getTime() + (Number(daysCount) - 1) * 86400000);
  const withdrawalEndD = new Date(endD.getTime() + Number(withdrawalDays) * 86400000);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!medicationName.trim()) {
      setError("Please enter medication name.");
      return;
    }
    if (Number(dosage) <= 0 || Number(frequencyPerDay) <= 0 || Number(daysCount) <= 0) {
      setError("Dose, frequency, and treatment days must be greater than 0.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const calculatedEndDate = !isNaN(endD.getTime())
        ? endD.toISOString().split("T")[0]
        : startDate;
      await onSubmit({
        medicationName: medicationName.trim(),
        dosage: Number(dosage),
        unit,
        route,
        frequencyPerDay: Number(frequencyPerDay),
        startDate,
        endDate: calculatedEndDate,
        daysCount: Number(daysCount),
        withdrawalDays: Number(withdrawalDays),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? localizeServerText(err.message) : tr("Failed to record prescription."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={tr("Prescribe Medication")}

      subtitle={tr("Manage dosage, administration route, and automated pre-race withdrawal clearance calculation.")}
      width={540}
      onClose={busy ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
          <Button tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button tone="primary" type="submit" form="prescription-form" disabled={busy}>
            Save Prescription
          </Button>
        </div>
      }
    >
      <form id="prescription-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-body)", padding: "8px", background: "var(--danger-bg)", borderRadius: "var(--r)" }}>
            {tr(error)}
          </div>
        )}

        <Field label={tr("Medication Name *")} hint={tr("Select from standard pharmacy catalog or enter custom drug name")}>
          <SearchSelect
            value={selectedMed}
            onChange={handleMedChange}
            options={[{ value: "", label: tr("Select medication"), disabled: true }, ...COMMON_EQUINE_MEDICATIONS.map((m) => ({ value: m.value, label: m.label }))]}
          />
        </Field>
        {selectedMed === "OTHER" && (
          <Field label={tr("Other medication name")} required>
            <Input
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder={tr("Enter medication name or active ingredient...")}
              required
              autoFocus
            />
          </Field>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr", gap: 10 }}>
          <Field label={tr("Dose per Intake *")}>
            <Input
              type="number"
              step="any"
              min={0.1}
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </Field>
          <Field label={tr("Unit *")}>
            <Select required options={[{ value: "", label: tr("Select unit"), disabled: true }, ...UNIT_OPTIONS]} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Field label={tr("Route *")}>
            <Select required options={[{ value: "", label: tr("Select route"), disabled: true }, ...ROUTE_OPTIONS]} value={route} onChange={(e) => setRoute(e.target.value)} />
          </Field>
        </div>

        <div className={formLayout.columns}>
          <Field label={tr("Frequency (times/day) *")}>
            <Input
              type="number"
              min={1}
              max={6}
              value={frequencyPerDay}
              onChange={(e) => setFrequencyPerDay(e.target.value)}
              required
            />
          </Field>
          <Field label={tr("Start Date *")}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Field>
          <Field label={tr("Duration (days) *")}>
            <Input
              type="number"
              min={1}
              max={90}
              value={daysCount}
              onChange={(e) => setDaysCount(e.target.value)}
              required
            />
          </Field>
        </div>

        <div
          style={{
            background: "var(--surface-2)",
            padding: "10px 14px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
            fontSize: "var(--fs-body)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            {tr("Total medication required:")}{" "}<strong>{dosage && frequencyPerDay && daysCount ? `${totalAmount} ${tr(unit)}` : "—"}</strong>
          </span>
          <span>
            {tr("Through:")}{" "}<strong>{Number(daysCount) > 0 ? formatDate(endD) : "—"}</strong>
          </span>
        </div>

        <Field
          label={tr("Pre-Race Withdrawal Period (days)") + " *"}
          hint={tr("Anti-doping clearance protocol; triggers alerts upon race registration if violated.")}
        >
          <div className={formLayout.columns}>
            <Input
              type="number"
              min={0}
              max={90}
              required
              value={withdrawalDays}
              onChange={(e) => setWithdrawalDays(e.target.value)}
            />
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
              {tr("Clearance date:")}{" "}<strong>{Number(daysCount) > 0 && withdrawalDays !== "" ? formatDate(withdrawalEndD) : "—"}</strong>
            </span>
          </div>
        </Field>

        <Field label={tr("Administration Instructions")} hint={tr("Notes for Groom or stable care technicians")}>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tr("e.g., Mix into morning and evening grain rations after feeding...")}
          />
        </Field>
      </form>
    </Modal>
  );
}
