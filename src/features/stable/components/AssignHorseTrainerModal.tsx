import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
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
      else setError("Không thể phân công HLV. Vui lòng kiểm tra lại.");
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
      label: `${t.fullName} — Tải: ${load}/${max} con ${isFull ? "[Đầy tải]" : `[Còn ${remaining} chỗ]`}`,
      disabled: isFull,
    };
  });

  return (
    <Modal
      title="Phân công Huấn luyện viên phụ trách chiến mã"
      subtitle={`Chiến mã: ${horse.name} (${horse.horseCode || "—"})`}
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
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>Ô chuồng: </span>
            <strong>{horse.stallCode || "Chưa xếp chuồng"}</strong>
            {horse.zone && <span style={{ marginLeft: 6, color: "var(--text-2)" }}>({horse.zone})</span>}
          </div>
          <div>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>Khu chuồng (Barn): </span>
            {horseBarn ? (
              <Badge tone="info">{horseBarn.name}</Badge>
            ) : (
              <Badge tone="warn">Chưa xác định Khu chuồng</Badge>
            )}
          </div>
          <div>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-2)" }}>Trạng thái phân công: </span>
            {horse.trainerAssignmentStatus === "ASSIGNED" ? (
              <Badge tone="ok">Đã tiếp nhận ({horse.assignedTrainer?.fullName})</Badge>
            ) : horse.trainerAssignmentStatus === "PENDING_ACCEPTANCE" ? (
              <Badge tone="warn">Chờ HLV tiếp nhận (48h)</Badge>
            ) : horse.trainerAssignmentStatus === "DECLINED" ? (
              <Badge tone="danger">HLV đã từ chối: {horse.trainerDeclineReason || "—"}</Badge>
            ) : (
              <Badge tone="neutral">Chưa phân công</Badge>
            )}
          </div>
        </div>

        {!horse.stallCode ? (
          <Alert tone="warn">
            Chiến mã chưa được xếp vào ô chuồng thuộc Khu chuồng (Barn). Vui lòng xếp ô chuồng trước khi phân công HLV.
          </Alert>
        ) : eligibleTrainers.length === 0 ? (
          <Alert tone="warn">
            Khu chuồng này hiện chưa có Huấn luyện viên nào phụ trách. Vui lòng vào trang Quản lý tài khoản để gán HLV vào Khu chuồng này trước.
          </Alert>
        ) : (
          <>
            <Field label="Chọn Huấn luyện viên phụ trách (Cùng Khu chuồng)" required>
              <Select
                value={selectedTrainerId}
                disabled={loading || busy}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                options={[
                  { value: "", label: "-- Chọn Huấn luyện viên --", disabled: true },
                  ...trainerOptions,
                ]}
              />
            </Field>

            <Field label="Ghi chú phân công (gửi kèm email)">
              <Textarea
                rows={3}
                placeholder="Ví dụ: Chiến mã đang hồi phục thể lực, ưu tiên bài tập nhẹ..."
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
              Hệ thống sẽ gửi email thông báo kèm liên kết xác nhận đến HLV. HLV có <strong>48 giờ</strong> để xác nhận tiếp nhận chiến mã (SLA-HANDOVER-48H).
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 6 }}>
          <Button tone="secondary" size="sm" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading || busy || !selectedTrainerId || !horse.stallCode || eligibleTrainers.length === 0}
          >
            {busy ? "Đang gửi…" : "Phân công & Gửi email (SLA 48h)"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
