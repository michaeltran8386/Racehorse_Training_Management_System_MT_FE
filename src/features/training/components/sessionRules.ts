import type { ExerciseSession } from "../types";

/** Các nút được hiện cho một buổi tập (bảng nút SC-2.04, dùng chung cho SC-2.05). */
export interface SessionButtons {
  edit: boolean; // BTN-2.20: Đã lên lịch và chưa tới giờ
  cancel: boolean; // BTN-2.21: Đã lên lịch, Bị chặn, Bỏ lỡ
  record: boolean; // BTN-2.22: Đã lên lịch đã tới giờ; Bỏ lỡ trong 7 ngày
  recordDisabledReason?: string; // lý do chưa thể ghi kết quả (chưa tới giờ tập)
  viewResult: boolean; // BTN-2.23: Hoàn thành
  restore: boolean; // BTN-2.24: Bị chặn
  restoreBlockedReason?: string; // vô hiệu hóa khi ngựa vẫn đang khóa
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function sessionButtons(s: ExerciseSession, role: string): SessionButtons {
  const ht = role === "HEAD_TRAINER";
  const planOpen = s.planStatus === undefined || s.planStatus === "DRAFT" || s.planStatus === "ACTIVE";
  const scheduledTime = new Date(s.scheduledAt).getTime();
  const started = scheduledTime <= Date.now();
  // Bug #62: BE tính hạn ghi muộn đến 00:00 ngày thứ 8 sau ngày tập (startOfClubDay + 8 ngày).
  const deadline = startOfDay(new Date(s.scheduledAt)).getTime() + 8 * DAY;
  const missedInTime = s.status === "MISSED" && Date.now() < deadline;
  return {
    edit: ht && planOpen && s.status === "SCHEDULED" && !started,
    cancel: ht && (s.status === "SCHEDULED" || s.status === "BLOCKED" || s.status === "MISSED"),
    record: ht && ((s.status === "SCHEDULED" && started) || missedInTime),
    recordDisabledReason:
      ht && s.status === "SCHEDULED" && !started
        ? "Chưa đến giờ bắt đầu buổi tập."
        : undefined,
    viewResult: s.status === "COMPLETED",
    restore: ht && s.status === "BLOCKED",
    restoreBlockedReason: s.isHorseLocked ? "The horse is still under a Training Lock." : undefined,
  };
}
