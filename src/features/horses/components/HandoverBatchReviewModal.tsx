import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Icon } from "@/shared/components/ui/Icon";
import { useToast } from "@/shared/components/ui/Toast";
import { tr } from "@/shared/i18n/tr";
import { HorseAvatar } from "@/features/horses/components/HorseAvatar";
import { respondHandover } from "@/features/horses/api";
import { formatDate } from "@/shared/lib/format";

interface HandoverBatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  handovers: Array<{
    id: string;
    token: string;
    notes?: string;
    horse: {
      id: string;
      name: string;
      horseCode: string;
      avatarUrl?: string;
      breed: string;
      gender: string;
      stallAllocations?: Array<{
        stall?: { code: string; zone?: string };
      }>;
      trainingPlans?: Array<{
        id: string;
        planCode: string;
        phaseName?: string | null;
        objective?: string | null;
        targetDistance?: number | null;
        status?: string;
        workoutSessions?: Array<{
          id: string;
          scheduledDate: string;
          workoutType?: string | null;
          distanceMeters?: number | null;
          status: string;
        }>;
      }>;
    };
    fromManager?: { id: string; fullName: string; email: string };
  }>;
  onSuccess: () => void;
}

export function HandoverBatchReviewModal({
  isOpen,
  onClose,
  handovers,
  onSuccess,
}: HandoverBatchReviewModalProps) {
  useTranslation();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || handovers.length === 0) return null;

  async function handleAcceptAll() {
    setSubmitting(true);
    setError("");
    try {
      // Xác nhận tiếp nhận toàn bộ các chiến mã được bàn giao
      await Promise.all(
        handovers.map((item) =>
          respondHandover({
            token: item.token,
            action: "ACCEPT",
          })
        )
      );

      toast.show(
        tr("Accepted handover for {{count}} horse(s) successfully! All training plans and schedules transfer at 00:00 tomorrow.", { count: handovers.length }),
        "ok",
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || tr("Unable to complete handover confirmation."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={tr("Confirm Horse Handover ({{count}})", { count: handovers.length })}
      subtitle={tr("Review and confirm takeover of training plans from the previous Head Trainer")}
      width={740}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <Alert tone="warn" title={tr("Handover & Operational Safety Principle")}>
          {tr("Today's workouts remain the responsibility of the previous Head Trainer. Your control of the training plans and schedules officially takes effect at")}{" "}
          <strong>{tr("00:00 tomorrow")}</strong>.
        </Alert>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "460px", overflowY: "auto", paddingRight: "4px" }}>
          {handovers.map((req, idx) => {
            const h = req.horse;
            const stall = h.stallAllocations?.[0]?.stall;
            const plan = h.trainingPlans?.[0];
            const workouts = plan?.workoutSessions || [];

            return (
              <div
                key={req.id}
                style={{
                  border: "1px solid var(--border, #cbd5e1)",
                  borderRadius: "10px",
                  padding: "16px",
                  background: "var(--surface, #ffffff)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Header Thẻ Ngựa */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <HorseAvatar url={h.avatarUrl} name={h.name} size={46} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>#{idx + 1}</span>
                        <strong style={{ fontSize: "16px", color: "var(--ink)" }}>{h.name}</strong>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>({h.horseCode})</span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "var(--brand, #2563eb)", marginTop: "2px" }}>
                        {tr("Stall:")} <strong>{stall?.code || tr("Unassigned")}</strong> {stall?.zone ? `· ${stall.zone}` : ""}
                        {req.fromManager && (
                          <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                            · {tr("Assigned by Manager:")} {req.fromManager.fullName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge tone="ok">{tr("Pending acceptance")}</Badge>
                </div>

                {/* Khối Đọc Tóm Tắt Giáo Án (Plan Preview Box) */}
                <div
                  style={{
                    background: "var(--surface-sunken, #f8fafc)",
                    border: "1px solid var(--border-subtle, #e2e8f0)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icon name="file-text" size={16} />
                      <strong style={{ fontSize: "13.5px", color: "var(--ink)" }}>
                        {plan ? `${plan.planCode}: ${plan.objective || plan.phaseName}` : tr("No active training plan yet")}
                      </strong>
                    </div>
                    {plan?.phaseName && (
                      <Badge tone="info">{tr("Phase:")} {plan.phaseName}</Badge>
                    )}
                  </div>

                  {plan && (
                    <div style={{ display: "flex", gap: "16px", fontSize: "12.5px", color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span>{tr("Target distance:")} <strong>{plan.targetDistance ? tr("{{dist}} m/week", { dist: plan.targetDistance.toLocaleString() }) : tr("By workout")}</strong></span>
                      <span>{tr("Expected frequency:")} <strong>{workouts.length > 0 ? tr("{{count}} upcoming session(s)", { count: workouts.length }) : tr("3 sessions/week")}</strong></span>
                    </div>
                  )}

                  {/* Lịch tập dự kiến từ ngày mai */}
                  {workouts.length > 0 ? (
                    <div style={{ marginTop: "4px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-2)", marginBottom: "4px" }}>
                        {tr("Upcoming sessions starting tomorrow:")}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {workouts.map((w) => (
                          <span
                            key={w.id}
                            style={{
                              fontSize: "11.5px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background: "rgba(37, 99, 235, 0.08)",
                              color: "var(--brand, #2563eb)",
                              border: "1px solid rgba(37, 99, 235, 0.2)",
                            }}
                          >
                            📅 {formatDate(w.scheduledDate)}: {w.workoutType ? tr(w.workoutType) : tr("Workout")} {w.distanceMeters ? `(${w.distanceMeters}m)` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      {tr("No upcoming workouts scheduled yet. You can schedule new sessions after accepting.")}
                    </div>
                  )}
                </div>

                {req.notes && (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    💬 {tr("Handover notes:")} "{req.notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button - Duy nhất 1 nút xác nhận, không có nút từ chối theo quy định */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          <Button
            tone="primary"
            size="lg"
            block
            onClick={handleAcceptAll}
            disabled={submitting}
          >
            <Icon name="check-circle" size={18} />
            {submitting
              ? tr("Completing takeover...")
              : tr("✓ I have reviewed the plan(s) & Confirm handover of {{count}} horse(s)", { count: handovers.length })}
          </Button>
          <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
            {tr("This administrative handover acknowledgment is mandatory for Head Trainers in the Barn.")}
          </div>
        </div>
      </div>
    </Modal>
  );
}
