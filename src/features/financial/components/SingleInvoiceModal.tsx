import { useState } from "react";
import type { Horse } from "@/features/horses/types";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { createInvoice } from "../api";
import styles from "../pages/OwnerFinancialReportsPage.module.css";

interface SingleInvoiceModalProps {
  open: boolean;
  defaultPeriod: string;
  horses: Horse[];
  horsesLoading: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

export function SingleInvoiceModal(props: SingleInvoiceModalProps) {
  if (!props.open) return null;
  return <SingleInvoiceModalContent {...props} />;
}

function SingleInvoiceModalContent({
  defaultPeriod,
  horses,
  horsesLoading,
  onClose,
  onCreated,
}: SingleInvoiceModalProps) {
  const ownedHorses = horses.filter((h) => Boolean(h.ownerId || h.owner?.id));
  const [horseId, setHorseId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(defaultPeriod);
  const [status, setStatus] = useState<"DRAFT" | "SENT">("DRAFT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHorseId = ownedHorses.some((h) => h.id === horseId)
    ? horseId
    : (ownedHorses[0]?.id ?? "");

  async function handleSubmit() {
    if (!selectedHorseId) {
      setError(tr("Select a horse"));
      return;
    }
    if (!billingPeriod.match(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/)) {
      setError(tr("Please enter a valid billing period in YYYY-MM format (e.g. 2026-11)"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createInvoice({
        horseId: selectedHorseId,
        billingPeriod,
        status,
      });
      await onCreated();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={tr("Create Single Statement")}
      subtitle={tr("Choose a horse and a completed billing month. All fees are calculated automatically.")}
      width={560}
      onClose={saving ? undefined : onClose}
      foot={
        <>
          <Button tone="secondary" onClick={onClose} disabled={saving}>
            {tr("Cancel")}
          </Button>
          <Button
            tone="primary"
            icon="plus"
            onClick={handleSubmit}
            disabled={saving || horsesLoading || ownedHorses.length === 0}
          >
            {saving ? tr("Creating...") : tr("Create invoice")}
          </Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div className={styles.field}>
          <label htmlFor="single-invoice-horse">{tr("Horse")} *</label>
          {horsesLoading ? (
            <p className={styles.hint}>{tr("Loading...")}</p>
          ) : ownedHorses.length === 0 ? (
            <Alert tone="warn">{tr("No horses with assigned owners available.")}</Alert>
          ) : (
            <select
              id="single-invoice-horse"
              value={selectedHorseId}
              disabled={saving}
              onChange={(e) => setHorseId(e.target.value)}
            >
              {ownedHorses.map((horse) => (
                <option key={horse.id} value={horse.id}>
                  {horse.name} ({horse.horseCode || "—"}) · {horse.owner?.fullName || "—"}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.feeRow}>
          <div className={styles.field}>
            <label htmlFor="single-invoice-period">{tr("Billing Period (YYYY-MM)")} *</label>
            <input
              id="single-invoice-period"
              type="month"
              value={billingPeriod}
              disabled={saving}
              onChange={(e) => setBillingPeriod(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="single-invoice-status">{tr("Initial status")}</label>
            <select
              id="single-invoice-status"
              value={status}
              disabled={saving}
              onChange={(e) => setStatus(e.target.value as "DRAFT" | "SENT")}
            >
              <option value="DRAFT">{tr("Draft — review before sending")}</option>
              <option value="SENT">{tr("Sent — issue immediately to owner")}</option>
            </select>
          </div>
        </div>

        <div className={styles.autoCalcBox}>
          <div className={styles.autoCalcTitle}>
            <Icon name="info" size={15} />
            <span>{tr("Automatic Fee Breakdown")}</span>
          </div>
          <ul className={styles.autoCalcList}>
            <li>
              <strong>{tr("Stall Boarding:")}</strong>{" "}
              {tr("Prorated by actual stay days in the month (6,000,000 VND/month).")}
            </li>
            <li>
              <strong>{tr("Conditioning & Training:")}</strong>{" "}
              {tr("4,000,000 VND/month if the horse stayed or trained during the month.")}
            </li>
            <li>
              <strong>{tr("Medical & Veterinary:")}</strong>{" "}
              {tr("Flat 1,000,000 VND monthly package if the horse used medical or preventive services (0 VND if none).")}
            </li>
            <li>
              <strong>{tr("Tournament Prize Credits:")}</strong>{" "}
              {tr("Auto-deducted from settled tournament owner payouts in the month.")}
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
