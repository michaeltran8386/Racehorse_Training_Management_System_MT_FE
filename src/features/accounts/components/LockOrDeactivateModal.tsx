import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Icon } from "@/shared/components/ui/Icon";
import { Field } from "@/shared/components/form/Field";
import { Textarea } from "@/shared/components/form/Textarea";
import { ROLE_LABEL } from "@/shared/lib/permissions";
import { useAppLanguage } from "@/shared/lib/language";
import { tr } from "@/shared/i18n/tr";
import type { PublicAccount } from "@/shared/types/auth";
import { getActiveAssignments } from "../api";
import type { ActiveAssignmentsResponse } from "../api";
import styles from "./LockOrDeactivateModal.module.css";

interface LockOrDeactivateModalProps {
  action: "lock" | "deactivate";
  target: PublicAccount;
  busy?: boolean;
  onConfirm: (reason: string, confirmedActiveAssignments?: boolean) => void;
  onCancel: () => void;
}

export function LockOrDeactivateModal({
  action,
  target,
  busy,
  onConfirm,
  onCancel,
}: LockOrDeactivateModalProps) {
  const { isVietnamese } = useAppLanguage();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [assignments, setAssignments] = useState<ActiveAssignmentsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setAssignments(null);
    getActiveAssignments(target.id)
      .then((data) => {
        if (!cancelled) {
          setAssignments(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [target.id, retryCount]);

  const handleConfirm = () => {
    if (busy || loading || !assignments) return;
    const text = reason.trim();
    if (text.length < 10) {
      setError(tr("Reason must be 10 to 300 characters."));
      return;
    }
    const hasActive = Boolean(assignments?.hasAssignments);
    onConfirm(text, hasActive ? true : undefined);
  };

  const isLock = action === "lock";
  const title = isLock
    ? tr("Lock the account of {{fullName}}?", { fullName: target.fullName })
    : tr("Deactivate the account of {{fullName}}?", { fullName: target.fullName });
  const subtitle = `${tr(ROLE_LABEL[target.role])} · ${target.email}`;

  const reasonHint = isLock
    ? tr("Shown in the Locked tab and on the sign-in page of this account.")
    : tr("For example: contract ended. Shown on the sign-in page of this account.");

  const hasAssignments = Boolean(assignments?.hasAssignments);
  const totalAssignments =
    (assignments?.plans.length ?? 0) +
    (assignments?.workouts.length ?? 0) +
    (assignments?.stalls.length ?? 0) +
    (assignments?.shifts.length ?? 0);

  const confirmLabel = hasAssignments
    ? isLock
      ? (isVietnamese ? "Vẫn đồng ý khóa" : "Lock anyway")
      : (isVietnamese ? "Vẫn đồng ý vô hiệu hóa" : "Deactivate anyway")
    : isLock
    ? tr("Lock account")
    : tr("Deactivate account");

  const cancelLabel = isLock ? tr("Keep active") : tr("Keep the account");

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      tone="danger"
      width={560}
      onClose={busy ? undefined : onCancel}
      foot={
        <>
          <Button tone="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            tone="danger"
            disabled={busy || loading || !assignments}
            onClick={handleConfirm}
          >
            {busy ? tr("Processing...") : confirmLabel}
          </Button>
        </>
      }
    >
      <div className={styles.container}>
        {loadFailed && (
          <Alert tone="danger" action={
            <Button tone="secondary" disabled={busy || loading} onClick={() => setRetryCount((n) => n + 1)}>
              {tr("Try again")}
            </Button>
          }>
            {isVietnamese
              ? "Không kiểm tra được công việc đang phụ trách. Hãy thử lại trước khi thay đổi trạng thái tài khoản."
              : "Could not check active assignments. Try again before changing this account."}
          </Alert>
        )}
        {isLock && (
          <p className={styles.consequenceText}>
            {tr(
              "Sign-in is refused from the next attempt and every open session ends at once. Records already entered by this account stay in place. Unlocking is possible at any time from this list."
            )}
          </p>
        )}

        {loading ? (
          <div className={styles.loadingBox}>
            <Icon name="spinner" className={styles.spinIcon} inline size={16} />
            <span>
              {isVietnamese
                ? "Đang kiểm tra các công việc phụ trách..."
                : "Checking active assignments..."}
            </span>
          </div>
        ) : hasAssignments ? (
          <div className={styles.warningBox}>
            <div className={styles.warningHeader}>
              <span className={styles.warningIcon}>
                <Icon name="alert" size={18} />
              </span>
              <span>
                {isVietnamese
                  ? `Nhân viên đang có ${totalAssignments} công việc phụ trách dở dang:`
                  : `Staff member currently has ${totalAssignments} active assignments:`}
              </span>
            </div>

            <div className={styles.assignmentsList}>
              {/* 1. Giáo án đang kích hoạt */}
              {assignments && assignments.plans.length > 0 && (
                <div className={styles.categoryGroup}>
                  <h4 className={styles.categoryTitle}>
                    {isVietnamese
                      ? `📋 Giáo án đang kích hoạt (${assignments.plans.length})`
                      : `📋 Active Training Plans (${assignments.plans.length})`}
                  </h4>
                  {assignments.plans.map((p) => (
                    <div key={p.id} className={styles.itemCard}>
                      <span className={styles.itemMain}>
                        {p.planCode ? `[${p.planCode}] ` : ""}{p.phaseName} · {isVietnamese ? "Ngựa:" : "Horse:"} {p.horse.name}
                      </span>
                      <span className={styles.itemSub}>
                        {isVietnamese ? "Thời gian:" : "Duration:"} {p.startDate} → {p.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Buổi tập sắp tới */}
              {assignments && assignments.workouts.length > 0 && (
                <div className={styles.categoryGroup}>
                  <h4 className={styles.categoryTitle}>
                    {isVietnamese
                      ? `🏇 Buổi tập sắp tới (${assignments.workouts.length})`
                      : `🏇 Upcoming Workout Sessions (${assignments.workouts.length})`}
                  </h4>
                  {assignments.workouts.map((w) => {
                    const dateStr = new Date(w.scheduledDate).toLocaleString(
                      isVietnamese ? "vi-VN" : "en-US",
                      {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );
                    return (
                      <div key={w.id} className={styles.itemCard}>
                        <span className={styles.itemMain}>
                          {dateStr} · {w.workoutType} · {isVietnamese ? "Ngựa:" : "Horse:"} {w.horse.name}
                        </span>
                        <span className={styles.itemSub}>
                          {isVietnamese ? "Cường độ:" : "Intensity:"} {w.intensity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. Ô chuồng đang phụ trách */}
              {assignments && assignments.stalls.length > 0 && (
                <div className={styles.categoryGroup}>
                  <h4 className={styles.categoryTitle}>
                    {isVietnamese
                      ? `🏠 Ô chuồng đang phụ trách (${assignments.stalls.length})`
                      : `🏠 Stall Allocations (${assignments.stalls.length})`}
                  </h4>
                  {assignments.stalls.map((s) => (
                    <div key={s.id} className={styles.itemCard}>
                      <span className={styles.itemMain}>
                        {isVietnamese ? "Chuồng:" : "Stall:"} {s.stall.code} ({s.stall.zone}) · {isVietnamese ? "Ngựa:" : "Horse:"} {s.horse.name}
                      </span>
                      {s.horse.horseCode && (
                        <span className={styles.itemSub}>
                          {isVietnamese ? "Mã ngựa:" : "Horse code:"} {s.horse.horseCode}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Ca trực sắp tới */}
              {assignments && assignments.shifts.length > 0 && (
                <div className={styles.categoryGroup}>
                  <h4 className={styles.categoryTitle}>
                    {isVietnamese
                      ? `⏱️ Ca trực sắp tới (${assignments.shifts.length})`
                      : `⏱️ Upcoming Shift Rosters (${assignments.shifts.length})`}
                  </h4>
                  {assignments.shifts.map((sh) => (
                    <div key={sh.id} className={styles.itemCard}>
                      <span className={styles.itemMain}>
                        {isVietnamese ? "Ngày:" : "Date:"} {sh.date} · {sh.shift.name} ({sh.zone.name})
                      </span>
                      {sh.shift.startTime && (
                        <span className={styles.itemSub}>
                          {sh.shift.startTime} - {sh.shift.endTime}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className={styles.reassuranceText}>
              {isVietnamese
                ? "💡 Lưu ý: Các công việc trên vẫn sẽ được lưu và gắn thẻ cảnh báo [Đã khóa] trên lịch/hệ thống để Quản lý dễ dàng phân công lại sau."
                : "💡 Note: These assignments will remain assigned and tagged as [Locked] across schedules for reassignment later."}
            </p>
          </div>
        ) : null}

        <Field label={tr("Reason")} required hint={reasonHint} error={error || undefined}>
          <Textarea
            rows={3}
            maxLength={300}
            value={reason}
            placeholder={
              isVietnamese
                ? "Nhập lý do cụ thể (tối thiểu 10 ký tự)..."
                : "Enter detailed reason (at least 10 characters)..."
            }
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
          />
        </Field>
      </div>
    </Modal>
  );
}
