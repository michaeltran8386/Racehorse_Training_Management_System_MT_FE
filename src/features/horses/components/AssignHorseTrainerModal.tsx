import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Field } from "@/shared/components/form/Field";
import { Textarea } from "@/shared/components/form/Textarea";
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
      setError("Vui lòng chọn Huấn luyện viên trưởng tiếp nhận.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await assignHorseTrainer(horseId, {
        trainerUserId: selectedTrainerId,
        notes: notes.trim() || undefined,
      });
      alert(`Phân công HLV cho chiến mã ${horseName} thành công. Yêu cầu bàn giao đã được gửi qua chuông và email tới HLV.`);
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
      title={`Phân công Huấn luyện viên Trưởng: ${horseName}`}
      subtitle={`Mã số: ${horseCode}${stallCode ? ` · Ô chuồng: ${stallCode}` : ""}${zoneName ? ` (${zoneName})` : ""}`}
      width={560}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <Alert tone="info">
          Theo nguyên tắc vận hành, chiến mã chỉ được phân công cho Huấn luyện viên trưởng đang phụ trách cùng Khu chuồng (Barn) và chưa vượt quá định mức 8 chiến mã.
        </Alert>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
            Đang tải danh sách Huấn luyện viên phụ trách khu chuồng...
          </div>
        ) : activeTrainers.length === 0 ? (
          <Alert tone="warn">
            {invitedTrainers.length > 0
              ? `Khu chuồng này hiện chưa có Huấn luyện viên chính thức (ACTIVE) sẵn sàng tiếp nhận (${invitedTrainers.length} nhân sự đang chờ kích hoạt tài khoản qua email). Vui lòng kích hoạt tài khoản HLV trước khi phân công ngựa.`
              : "Khu chuồng này hiện chưa có Huấn luyện viên trưởng nào được phân công. Vui lòng vào trang Quản lý tài khoản để bổ nhiệm HLV cho Khu chuồng trước."}
          </Alert>
        ) : (
          <Field label="Chọn Huấn luyện viên trưởng tiếp nhận (*)" required>
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
                        {isSelected && <Badge tone="ok">Đã chọn</Badge>}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {t.email}
                      </div>
                    </div>

                    <div>
                      {isFull ? (
                        <Badge tone="danger">Tải: {load}/{max} [Đầy tải]</Badge>
                      ) : (
                        <Badge tone="neutral">Tải: {load}/{max} con · Còn {max - load} chỗ</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Ghi chú bàn giao điều hành (Tùy chọn)">
          <Textarea
            placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt khi bàn giao chiến mã..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <Button tone="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            tone="primary"
            onClick={handleSubmit}
            disabled={submitting || !selectedTrainerId || loading}
          >
            {submitting ? "Đang xử lý phân công..." : "Xác nhận phân công HLV"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
