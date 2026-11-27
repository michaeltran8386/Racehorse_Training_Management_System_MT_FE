import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
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
      setError("Vui lòng chọn HLV đồng nghiệp trong cùng khu chuồng để bàn giao chiến mã.");
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
      else setError("Không thể chuyển Khu chuồng. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const barnOptions = barns.map((b) => {
    const isCurrent = b.id === account.assignedBarnId;
    let label = `${b.name} (${b.trainersCount}/${b.maxTrainers} HLV)`;
    if (isCurrent) label += " [Hiện tại]";
    else if (b.isFull) label += " [Đầy]";
    return {
      value: b.id,
      label,
      disabled: isCurrent || b.isFull,
    };
  });

  return (
    <Modal
      title="Điều chuyển Khu chuồng (Barn)"
      subtitle={`Huấn luyện viên: ${account.fullName} · Định mức tối đa 2 HLV / Barn`}
      width={520}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)", display: "block", marginBottom: 4 }}>
            Khu chuồng hiện tại:
          </span>
          <div style={{ fontWeight: 600 }}>
            {account.assignedBarn?.name ? (
              <Badge tone="info">{account.assignedBarn.name}</Badge>
            ) : (
              <Badge tone="warn">Chưa phân công Khu chuồng</Badge>
            )}
          </div>
        </div>

        <Field label="Chọn Khu chuồng đích" required>
          <Select
            value={targetBarnId}
            disabled={loading || busy}
            onChange={(e) => setTargetBarnId(e.target.value)}
            options={[
              { value: "", label: "-- Chọn Khu chuồng --", disabled: true },
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
              Bàn giao chiến mã ({activeHorsesCount} con đang phụ trách)
            </div>
            <p style={{ margin: 0, fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>
              HLV hiện đang phụ trách {activeHorsesCount} chiến mã. Khi chuyển sang Khu chuồng mới,
              hệ thống sẽ áp dụng cơ chế bàn giao kế thừa sang HLV đồng nghiệp cùng Barn.
            </p>

            {colleagueTrainers.length === 0 ? (
              <Alert tone="warn">
                Khu chuồng hiện tại không có HLV đồng nghiệp nào khác để bàn giao. Vui lòng phân công thêm HLV vào Khu chuồng trước hoặc chuyển trạng thái các giáo án sang Hoàn thành / Hủy.
              </Alert>
            ) : (
              <>
                <Field label="HLV đồng nghiệp tiếp nhận bàn giao" required>
                  <Select
                    value={handoverTrainerId}
                    disabled={busy}
                    onChange={(e) => setHandoverTrainerId(e.target.value)}
                    options={[
                      { value: "", label: "-- Chọn HLV tiếp nhận --", disabled: true },
                      ...colleagueTrainers.map((t) => ({
                        value: t.id,
                        label: `${t.fullName} (Đang phụ trách ${t.currentLoad ?? 0}/8 con · Còn trống ${Math.max(0, 8 - (t.currentLoad ?? 0))} chỗ)`,
                      })),
                    ]}
                  />
                </Field>

                {selectedColleague && (
                  willSplit ? (
                    <Alert tone="warn" title="Cơ chế Bàn giao Chia tách Tự động">
                      HLV {selectedColleague.fullName} hiện chỉ còn trống {availableSlots} chỗ (đang có {colleagueLoad}/8 con).
                      Hệ thống sẽ tự động bàn giao <strong>{toHandover} chiến mã</strong> cho HLV này (đạt đủ trần 8/8), và <strong>{excess} chiến mã dôi dư</strong> sẽ tự động chuyển về trạng thái <em>Chờ phân công HLV mới</em> để bảo đảm an toàn vận hành.
                    </Alert>
                  ) : (
                    <Alert tone="ok">
                      HLV {selectedColleague.fullName} còn trống {availableSlots} chỗ (đang có {colleagueLoad}/8 con). Toàn bộ <strong>{activeHorsesCount} chiến mã</strong> sẽ được bàn giao trọn vẹn.
                    </Alert>
                  )
                )}
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 8 }}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            Hủy
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
              ? "Đang xử lý…"
              : willSplit
                ? "Xác nhận chuyển Barn & Bàn giao chia tách"
                : "Xác nhận chuyển Khu chuồng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
