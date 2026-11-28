import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { tr } from "@/shared/i18n/tr";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import type { PublicAccount } from "@/shared/types/auth";
import { getBarnStaffing, assignTrainerBarn, getActiveAssignments } from "../api";
import type { BarnStaffingItem } from "../api";

interface AssignTrainerBarnModalProps {
  account: PublicAccount;
  onClose: () => void;
  onSaved: (updatedAccount: PublicAccount) => void;
}

export function AssignTrainerBarnModal({ account, onClose, onSaved }: AssignTrainerBarnModalProps) {
  useTranslation();
  const [barns, setBarns] = useState<BarnStaffingItem[]>([]);
  const [targetBarnId, setTargetBarnId] = useState("");
  const [handoverTrainerId, setHandoverTrainerId] = useState("");
  const [activeHorsesCount, setActiveHorsesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [staffingRes, assignRes] = await Promise.all([
          getBarnStaffing(),
          getActiveAssignments(account.id),
        ]);
        if (cancelled) return;
        setBarns(staffingRes.barns);

        // Đếm số chiến mã HLV đang phụ trách (giáo án đang chạy)
        const horseCount = assignRes.plans?.length || 0;
        setActiveHorsesCount(horseCount);

        // Chọn mặc định barn đầu tiên còn chỗ và khác barn hiện tại
        const availableBarn = staffingRes.barns.find(
          (b) => b.id !== account.assignedBarnId && !b.isFull,
        );
        if (availableBarn) {
          setTargetBarnId(availableBarn.id);
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
  }, [account.id, account.assignedBarnId]);

  // Tìm các HLV đồng nghiệp trong cùng Khu chuồng hiện tại đang hoạt động chính thức (ACTIVE)
  const currentBarn = barns.find((b) => b.id === account.assignedBarnId);
  const colleagueTrainers = currentBarn
    ? currentBarn.trainers.filter((t) => t.id !== account.id && t.status === "ACTIVE")
    : [];

  const selectedColleague = colleagueTrainers.find((t) => t.id === handoverTrainerId);
  const colleagueLoad = selectedColleague?.currentLoad ?? 0;
  const availableSlots = Math.max(0, 8 - colleagueLoad);
  const willSplit = activeHorsesCount > availableSlots;
  const toHandover = Math.min(activeHorsesCount, availableSlots);
  const excess = Math.max(0, activeHorsesCount - availableSlots);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !targetBarnId) return;

    if (activeHorsesCount > 0 && !handoverTrainerId) {
      setError(tr("Please select a colleague trainer in the same Barn to hand over the horses."));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await assignTrainerBarn(account.id, {
        targetBarnId,
        handoverTrainerId: activeHorsesCount > 0 ? handoverTrainerId : undefined,
      });
      onSaved(res.account);
    } catch (err) {
      if (err instanceof ApiError) setError(messageFor(err));
      else setError(tr("Could not transfer Barn. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const barnOptions = barns.map((b) => {
    const isCurrent = b.id === account.assignedBarnId;
    let label = tr("{{name}} ({{count}}/{{max}} trainers)", { name: b.name, count: b.trainersCount, max: b.maxTrainers });
    if (isCurrent) label += ` [${tr("Current")}]`;
    else if (b.isFull) label += ` [${tr("Full")}]`;
    return {
      value: b.id,
      label,
      disabled: isCurrent || b.isFull,
    };
  });

  return (
    <Modal
      title={tr("Transfer Barn Assignment")}
      subtitle={tr("Head Trainer: {{name}} · Max 2 trainers / Barn", { name: account.fullName })}
      width={520}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)", display: "block", marginBottom: 4 }}>
            {tr("Current Barn:")}
          </span>
          <div style={{ fontWeight: 600 }}>
            {account.assignedBarn?.name ? (
              <Badge tone="info">{account.assignedBarn.name}</Badge>
            ) : (
              <Badge tone="warn">{tr("No Barn Assigned")}</Badge>
            )}
          </div>
        </div>

        <Field label={tr("Select Target Barn")} required>
          <Select
            value={targetBarnId}
            disabled={loading || busy}
            onChange={(e) => setTargetBarnId(e.target.value)}
            options={[
              { value: "", label: tr("-- Select Barn --"), disabled: true },
              ...barnOptions,
            ]}
          />
        </Field>

        {activeHorsesCount > 0 && (
          <div
            style={{
              padding: "12px 14px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--warning)" }}>
              {tr("Horse handover ({{count}} assigned)", { count: activeHorsesCount })}
            </div>
            <p style={{ margin: 0, fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>
              {tr("This trainer currently manages {{count}} horse(s). Moving to a new Barn will hand over custody to a colleague in the same Barn.", { count: activeHorsesCount })}
            </p>

            {colleagueTrainers.length === 0 ? (
              <Alert tone="warn">
                {tr("No other colleague trainer is available in this Barn for handover. Please assign another trainer first or complete/cancel active plans.")}
              </Alert>
            ) : (
              <>
                <Field label={tr("Receiving colleague trainer")} required>
                  <Select
                    value={handoverTrainerId}
                    disabled={busy}
                    onChange={(e) => setHandoverTrainerId(e.target.value)}
                    options={[
                      { value: "", label: tr("-- Select receiving trainer --"), disabled: true },
                      ...colleagueTrainers.map((t) => ({
                        value: t.id,
                        label: tr("{{name}} ({{load}}/8 horses · {{left}} slot(s) free)", {
                          name: t.fullName,
                          load: t.currentLoad ?? 0,
                          left: Math.max(0, 8 - (t.currentLoad ?? 0)),
                        }),
                      })),
                    ]}
                  />
                </Field>

                {selectedColleague && (
                  willSplit ? (
                    <Alert tone="warn" title={tr("Automatic Split Handover")}>
                      {tr("Trainer {{name}} only has {{slots}} free slot(s) ({{load}}/8 horses). {{handover}} horse(s) will transfer up to the 8/8 cap, and {{excess}} remaining horse(s) will move to Awaiting New Trainer for operational safety.", {
                        name: selectedColleague.fullName,
                        slots: availableSlots,
                        load: colleagueLoad,
                        handover: toHandover,
                        excess,
                      })}
                    </Alert>
                  ) : (
                    <Alert tone="ok">
                      {tr("Trainer {{name}} has {{slots}} free slot(s) ({{load}}/8 horses). All {{count}} horse(s) will be handed over cleanly.", {
                        name: selectedColleague.fullName,
                        slots: availableSlots,
                        load: colleagueLoad,
                        count: activeHorsesCount,
                      })}
                    </Alert>
                  )
                )}
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 8 }}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            {tr("Cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={
              loading ||
              busy ||
              !targetBarnId ||
              (activeHorsesCount > 0 && (!handoverTrainerId || colleagueTrainers.length === 0))
            }
          >
            {busy
              ? tr("Processing…")
              : willSplit
                ? tr("Confirm Barn Transfer & Split Handover")
                : tr("Confirm Barn Transfer")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
