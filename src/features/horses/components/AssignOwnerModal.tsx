import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { api } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import type { PublicAccount } from "@/shared/types/auth";
import { transferHorseOwner } from "../api";
import type { Horse } from "../types";

import { localizeServerText, tr } from "@/shared/i18n/tr";
interface AssignOwnerModalProps {
  horse: Horse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OwnerOption {
  id: string;
  fullName: string;
  email: string;
}

export function AssignOwnerModal({ horse, isOpen, onClose, onSuccess }: AssignOwnerModalProps) {
  const toast = useToast();
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    async function loadOwners() {
      setLoading(true);
      setLoadError("");
      try {
        // Danh sách tài khoản (chỉ Club Manager gọi được — cũng là người duy nhất đổi chủ). Không bịa chủ khi lỗi/rỗng.
        const { accounts } = await api<{ accounts: PublicAccount[] }>("GET", "/accounts");
        const filtered: OwnerOption[] = accounts
          .filter((a) => a.role === "HORSE_OWNER" && a.status === "ACTIVE" && a.id !== horse.ownerId)
          .map((a) => ({ id: a.id, fullName: a.fullName, email: a.email }));
        setOwners(filtered);
        setSelectedOwnerId(filtered[0]?.id ?? "");
      } catch (err) {
        setOwners([]);
        setSelectedOwnerId("");
        setLoadError(messageFor(err));
      } finally {
        setLoading(false);
      }
    }
    void loadOwners();
  }, [isOpen, horse.ownerId]);

  if (!isOpen) return null;

  const handleTransfer = async () => {
    if (!selectedOwnerId) {
      toast.show("Please select a new horse owner", "danger");
      return;
    }
    try {
      setSubmitting(true);
      await transferHorseOwner(horse.id, {
        newOwnerId: selectedOwnerId,
        reason: reason.trim() || undefined,
      });
      toast.show(`Ownership of ${horse.name} transferred successfully!`, "ok");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? localizeServerText(err.message) : tr("Failed to transfer ownership");
      toast.show(msg, "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const currentOwnerDisplay = horse.owner?.fullName || horse.ownerName || tr("Unassigned");

  return (
    <Modal onClose={onClose} title={tr("Transfer owner: {{name}}", { name: horse.name })}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ background: "var(--surface-sunken)", padding: "0.875rem", borderRadius: "var(--r)", fontSize: "var(--fs-body)" }}>
          <div>
            <strong>{tr("Current Owner:")}</strong> {currentOwnerDisplay}
          </div>
          <div style={{ color: "var(--ink-muted)", marginTop: 4 }}>
            {tr("Horse Code:")}{" "}<strong>{horse.horseCode || horse.id}</strong> {tr("· Breed:")} {horse.breed}
          </div>
        </div>

        <Field label={tr("Assign New Horse Owner")} required>
          {loading ? (
            <div style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>{tr("Loading active horse owners…")}</div>
          ) : loadError ? (
            <div role="alert" style={{ fontSize: "var(--fs-body)", color: "var(--danger)" }}>
              {tr("Couldn’t load horse owners.")} {loadError}
            </div>
          ) : owners.length === 0 ? (
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-2)" }}>
              {tr("No other active horse owner accounts. Approve an owner sign-up in Accounts first.")}
            </div>
          ) : (
            <Select
              options={owners.map((owner) => ({
                value: owner.id,
                label: `${owner.fullName} (${owner.email})`,
              }))}
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
            />
          )}
        </Field>

        <Field label={tr("Transfer Rationale / Contract Reference")}>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tr("e.g. Sold at auction, contract number")}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
          <Button tone="ghost" onClick={onClose} disabled={submitting}>
            {tr("Cancel")}
          </Button>
          <Button
            tone="primary"
            onClick={() => void handleTransfer()}
            disabled={submitting || !selectedOwnerId || owners.length === 0}
          >
            {submitting ? tr("Processing...") : tr("Confirm Transfer")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
