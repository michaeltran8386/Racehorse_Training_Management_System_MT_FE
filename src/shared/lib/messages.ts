// Mã lỗi từ API → câu thông báo tiếng Anh dễ hiểu. Nêu điều kiện, không trách người dùng.

import { ApiError } from "@/shared/lib/api";
import { isVietnamese, localizeServerText, tr } from "@/shared/i18n/tr";

export type AlertTone = "ok" | "warn" | "danger" | "info";

export interface AlertSpec {
  tone: AlertTone;
  icon: string;
  title: string;
  body: string;
}

const GENERIC: Record<string, string> = {
  INVALID_BILLING_PERIOD: "Use a valid billing month in YYYY-MM format.",
  BILLING_PERIOD_NOT_CLOSED: "Only completed months can be billed.",
  INVALID_STAY_INTERVAL: "The stall stay dates are invalid.",
  BOARDING_FEE_READ_ONLY: "The boarding fee and period are fixed by the stay calculation.",
  INVOICE_NOT_EDITABLE: "Only DRAFT invoices can have service fees edited.",
  DUPLICATE_INVOICE_FOR_PERIOD: "An active statement already exists for this horse in the selected period.",
  INVALID_INVOICE_STATUS_TRANSITION: "Cannot apply this status transition to the invoice.",
  HORSE_HAS_NO_OWNER: "Cannot bill a horse without an assigned owner.",
  NETWORK_ERROR: "The service did not answer. Check the connection and try again.",
  TIMEOUT: "The server took too long to answer. Try again.",
  SERVER_ERROR: "Something went wrong on our side. Try again in a moment.",
  SERVICE_UNAVAILABLE: "The service did not answer. Nothing was changed. Try again in a moment.",
  EMAIL_TAKEN: "This email already has an account in the system.",
  ROLE_NOT_ALLOWED: "Only Horse Owner accounts can be requested here. Staff accounts are created by the Club Manager.",
  WEAK_PASSWORD: "Use at least 8 characters with an uppercase letter, a digit and a special character.",
  CANNOT_LOCK_SELF: "You cannot lock your own account. Ask another Club Manager.",
  CANNOT_CHANGE_SELF: "You cannot do this to your own account. Ask another Club Manager.",
  CANNOT_DELETE_USED: "This account has been used, so it cannot be deleted. Deactivate it instead to keep its history.",
  INVALID_STATE: "The account changed in the meantime. Reload the list and try again.",
  OTP_COOLDOWN: "A new invitation was sent less than a minute ago. Wait a moment before sending another.",
  NOT_FOUND: "The requested resource could not be found.",
  LAST_MANAGER: "The club must keep at least one active Club Manager.",
  RESET_EXPIRED: "This reset session has expired. Request a new code.",
  ATTEMPTS_EXCEEDED: "Too many wrong passwords. Wait until the sign-in unlocks, or use Forgot password to unlock it now.",
  RATE_LIMITED: "Too many requests from this device. Wait a minute and try again.",
  FORBIDDEN: "This action is not part of your permissions.",
  TASK_NOT_ASSIGNED_TO_YOU: "You can only complete care tasks assigned to you or in your rostered barn zone.",
  TASK_UNDO_FORBIDDEN: "You cannot undo a care task completed by another staff member.",
  INSUFFICIENT_STOCK: "Not enough stock in the barn zone inventory to complete this feeding task. Please request a restock.",
  VET_ONLY: "Only a Veterinarian can change medical data. You can still view it.",
  // Flow 1 - hồ sơ ngựa
  HORSE_NOT_FOUND: "This horse profile no longer exists or was deleted. Reload the list.",
  ROLE_RESTRICTION: "Your role cannot make this status change.",
  MEDICAL_LOCK_ACTIVE: "The horse is under a Training Lock: heavy workouts, plan activation and operational status changes are blocked until a Veterinarian lifts it.",
  HORSE_RETIRED: "The horse is no longer managed. A Club Manager must reactivate it first.",
  HORSE_DECEASED: "A deceased horse cannot be reactivated.",
  RETIRE_REASON_REQUIRED: "Please select a reason for stopping management.",
  REASON_REQUIRED: "Reason must be 10 to 500 characters.",
  SAME_STATUS: "The horse is already in this status.",
  CONFIRM_NAME_MISMATCH: "The name does not match.",
  HORSE_LOCKED: "Cannot delete the profile while a Training Lock is in effect.",
  HAS_DEPENDENT_DATA: "The horse already has training, medical, care or racing data, so it cannot be deleted. Use Stop managing instead.",
  UNDO_EXPIRED: "The undo time has passed. Restore the profile from Deleted horses.",
  RESTORE_CONFLICT: "Cannot restore because another horse now uses this name. Rename that horse, then try again.",
  STALL_OCCUPIED: "This stall already has a horse.",
  STALL_MAINTENANCE: "This stall is under maintenance.",
  STALL_UNAVAILABLE: "This stall is under maintenance or no longer in use.",
  STALL_NOT_FOUND: "This stall no longer exists. Reload the map.",
  ALLOCATION_NOT_FOUND: "The horse is no longer in this stall. Reload the map.",
  SAME_STALL: "Choose a stall other than the current one.",
  HORSE_HAS_STALL: "The horse already has a stall. Use Move stall instead.",
  ZONE_NOT_FOUND: "This barn zone no longer exists. Reload the list.",
  ZONE_INACTIVE: "This barn zone is inactive. Reactivate it before adding stalls.",
  ZONE_HAS_HORSES: "The zone still houses horses. Move them out first.",
  DUPLICATE_ZONE_CODE: "This zone code already exists.",
  DUPLICATE_ZONE_NAME: "This zone name already exists.",
  DUPLICATE_STALL_CODE: "This stall code already exists.",
  INVALID_BREED: "This breed does not exist or is no longer in use.",
  INVALID_COLOR: "This coat colour does not exist or is no longer in use.",
  DUPLICATE_CATALOG_CODE: "This code already exists.",
  DUPLICATE_CATALOG_NAME: "This name already exists.",
  CATALOG_ITEM_NOT_FOUND: "This item no longer exists. Reload the list.",
  // Flow 2 - giáo án & buổi tập
  PLAN_NOT_FOUND: "This training plan no longer exists. Reload the list.",
  PLAN_CLOSED: "This plan is completed or cancelled, so it cannot be changed.",
  INVALID_PLAN_TRANSITION: "The plan's current status does not allow this action.",
  HORSE_HAS_ACTIVE_PLAN: "This horse already has an active plan. Complete or cancel it first.",
  HORSE_HAS_OTHER_TRAINER: "This horse is managed by another trainer's draft or active plan.",
  PLAN_HAS_NO_WORKOUTS: "Add at least one workout before activating the plan.",
  PLAN_ENDED: "The plan's end date has passed.",
  PHASES_REQUIRED: "A plan needs at least one phase.",
  PLAN_NOT_DELETABLE: "Only a draft without completed workouts can be deleted. Cancel the plan instead.",
  VET_CONFIRMATION_REQUIRED: "The horse is in a medical status. Confirm that you have discussed this with the Veterinarian.",
  SUMMARY_REQUIRED: "Summary must be 10 to 2000 characters.",
  DATE_IN_PAST: "A workout cannot be scheduled on a past date.",
  OUTSIDE_TRAINING_HOURS: "Start time must be between 04:00 and 20:00.",
  OUTSIDE_PLAN_DATES: "The workout date must be within the plan's dates.",
  TARGET_SPEED_REQUIRED: "Target speed is required for breezes and trial runs.",
  INVALID_GROOM: "Choose an active groom.",
  TRIAL_SLOT_TAKEN: "This track already has a trial run within 15 minutes of that time.",
  MAX_WORKOUTS_PER_DAY: "A horse can have at most 3 workouts per day.",
  WORKOUT_NOT_FOUND: "This workout no longer exists. Reload the schedule.",
  WORKOUT_NOT_EDITABLE: "Only scheduled workouts can be edited.",
  WORKOUT_NOT_STARTED: "Results can be recorded once the workout has started.",
  LATE_RESULT_EXPIRED: "Late results can only be recorded within 7 days of the workout.",
  RESULT_EDIT_EXPIRED: "Results can only be edited within 48 hours of the first save.",
  WORKOUT_NOT_RECORDABLE: "Blocked or cancelled workouts have no result.",
  ABNORMAL_NOTES_REQUIRED: "Describe the abnormal signs.",
  WORKOUT_NOT_CANCELLABLE: "This workout is already completed or cancelled.",
  NOTE_REQUIRED: "Note must be 10 to 500 characters.",
  WORKOUT_NOT_BLOCKED: "Only blocked workouts can be restored.",
  ALERT_NOT_FOUND: "This alert no longer exists. Reload the list.",
  START_DATE_TOO_EARLY: "Plan start date must be from tomorrow onwards.",
  PLAN_TOO_LONG: "A plan can last at most 52 weeks.",
  TOO_MANY_PHASES: "A plan can have at most 12 phases.",
  INVALID_PHASE: "A phase is not valid: check its name, dates, quotas and surface.",
  PHASE_OVERLAP: "Two phases overlap. Adjust their dates.",
  PHASE_HAS_COMPLETED_WORKOUTS: "This phase already has completed workouts, so it cannot be removed and its start date cannot change.",
  PHASE_REQUIRED: "Please choose a phase.",
  OUTSIDE_PHASE_DATES: "The workout date must be within the chosen phase.",
  REPEAT_BEYOND_PHASE: "“Repeat until” cannot be after the end of the phase.",
  NO_REPEAT_DATES: "No day matches the chosen weekdays.",
  TOO_MANY_REPEATS: "At most 60 workouts can be created at once.",
  TIME_REQUIRED: "Running time is required for this workout type.",
  RECOVERY_ABOVE_PEAK: "Heart rate after 10 minutes cannot exceed the peak heart rate.",
  // Flow 4: Ca trực, Tồn kho, Vật tư, Khẩu phần ăn
  GROOM_ALREADY_ASSIGNED_IN_SHIFT: "Each groom can only be assigned to 1 barn zone per shift.",
  SHIFT_NOT_AVAILABLE: "The shift is unavailable or has been deactivated.",
  ZONE_NOT_AVAILABLE: "The barn zone is unavailable or has been deactivated.",
  INVALID_GROOMS_SELECTED: "One or more selected staff are invalid or inactive.",
  COPY_TARGET_WEEK_IN_PAST: "Cannot copy rosters into a past week.",
  ROSTER_NOT_FOUND: "Shift roster entry no longer exists. Reload the page.",
  ROWS_OUT_OF_RANGE: "Rows must be between 1 and 4.",
  COLS_OUT_OF_RANGE: "Columns must be between 1 and 4.",
  SUPPLY_NOT_FOUND: "This supply item no longer exists. Reload the list.",
  SUPPLY_CODE_ALREADY_EXISTS: "This supply code already exists.",
  SUPPLY_NAME_ALREADY_EXISTS: "This supply name already exists.",
  CAPACITY_EXCEEDED: "The quantity exceeds the storage capacity of the barn zone.",
  DUPLICATE_PENDING_REQUEST: "A restock request for this item in this zone is already pending or delivering.",
  REQUEST_NOT_FOUND: "This restock request no longer exists. Reload the list.",
  REQUEST_ALREADY_REVIEWED: "This restock request has already been processed.",
  REJECTION_REASON_REQUIRED: "Please enter a reason for rejection.",
  INVALID_APPROVED_QUANTITY: "Approved quantity must be greater than 0.",
  REQUEST_NOT_DELIVERABLE: "Only approved restock requests can be marked as delivered.",
  DELIVERY_REQUIRES_APPROVER: "The delivery and reviewer details are invalid.",
  NUTRITION_PLAN_NOT_FOUND: "This nutrition plan no longer exists. Reload the page.",
  NUTRITION_PLAN_ALREADY_EXISTS: "This horse already has an active or pending nutrition plan.",
  NUTRITION_PLAN_NOT_EDITABLE: "Only draft or rejected nutrition plans can be edited.",
  NUTRITION_PLAN_NOT_SUBMITTABLE: "Only draft nutrition plans can be submitted for approval.",
  NUTRITION_PLAN_NOT_APPROVABLE: "Only pending nutrition plans can be approved.",
  NUTRITION_PLAN_NOT_REJECTABLE: "Only pending nutrition plans can be rejected.",
  NUTRITION_PLAN_NOT_ARCHIVABLE: "Only approved nutrition plans can be archived.",
};

const SURFACE_EN: Record<string, string> = { TURF: "Turf", DIRT: "Dirt", SYNTHETIC: "Synthetic" };

function localizeShift(shift: unknown, isVi: boolean): string {
  const s = String(shift || "").trim();
  if (!s) return isVi ? "ca trực" : "the shift";
  if (!isVi) {
    if (/ca sáng|morning/i.test(s)) return "Morning shift";
    if (/ca chiều|afternoon/i.test(s)) return "Afternoon shift";
    if (/ca đêm|night/i.test(s)) return "Night shift";
    return s;
  }
  if (/morning/i.test(s)) return "Ca sáng";
  if (/afternoon/i.test(s)) return "Ca chiều";
  if (/night/i.test(s)) return "Ca đêm";
  return s;
}

// Câu có chèn dữ liệu BE gửi kèm (data), ví dụ tên ngựa đang ở ô chuồng - Tiếng Anh
const DYNAMIC_EN: Record<string, (d: Record<string, unknown>) => string | undefined> = {
  STALL_OCCUPIED: (d) =>
    d.horseName ? `Stall ${d.stallCode ? `${d.stallCode} ` : ""}already houses ${d.horseName}. Move that horse first.` : undefined,
  HORSE_HAS_STALL: (d) => (d.stallCode ? `The horse is already in stall ${d.stallCode}. Use Move stall instead.` : undefined),
  ZONE_HAS_HORSES: (d) => (d.count ? `The zone still houses ${d.count} horse(s). Move them out first.` : undefined),
  ZONE_ROWS_TOO_SMALL: (d) => `Rows cannot be fewer than ${d.min}: a stall already sits in row ${d.min}.`,
  ZONE_COLS_TOO_SMALL: (d) => `Columns cannot be fewer than ${d.min}: a stall already sits in column ${d.min}.`,
  ROW_OUT_OF_RANGE: (d) => `Row must be between 1 and ${d.max}.`,
  COL_OUT_OF_RANGE: (d) => `Column must be between 1 and ${d.max}.`,
  POSITION_TAKEN: (d) => `This grid position is already used by stall ${d.stallCode}.`,
  TRAINER_TRACK_CONFLICT: (d) =>
    d.horse
      ? `That day you already train ${d.horse} on the ${SURFACE_EN[String(d.surface)] ?? d.surface} track. A trainer works on one track per day.`
      : undefined,
  HORSE_WORKOUT_TIME_CONFLICT: (d) =>
    d.before
      ? `The horse already has another workout at ${d.time} on ${d.date} (trainer ${d.trainer}). Choose a start time at or before ${d.before} or from ${d.after}.`
      : undefined,
  TRIAL_SLOT_TAKEN: (d) =>
    d.before
      ? `The ${SURFACE_EN[String(d.surface)] ?? d.surface} track already has ${d.horse}'s trial run at ${d.time} on ${d.date} (trainer ${d.trainer}). Choose a start time at or before ${d.before} or from ${d.after}.`
      : undefined,
  HORSE_HAS_OTHER_TRAINER: (d) =>
    d.trainer
      ? `${d.horse} is managed by trainer ${d.trainer} (plan ${d.planCode}). Contact that trainer or the Club Manager.`
      : undefined,
  GROOM_ALREADY_ASSIGNED_IN_SHIFT: (d) =>
    d.groomName
      ? `Staff ${d.groomName} is already assigned to ${d.zoneName} for ${localizeShift(d.shiftName, false)} on ${d.date}. Each groom can only be assigned to 1 barn zone per shift.`
      : "This groom is already assigned to another barn zone in this shift.",
  INSUFFICIENT_STOCK: (d) =>
    d.item
      ? `Insufficient stock for "${d.item}": requires ${d.required} ${d.unit || "kg"} (only ${d.available} ${d.unit || "kg"} available).`
      : undefined,
};

// Câu có chèn dữ liệu BE gửi kèm (data) - Tiếng Việt
const DYNAMIC_VI: Record<string, (d: Record<string, unknown>) => string | undefined> = {
  WORKOUT_REST_REQUIRED: (d) => {
    const raw = String(d?.rawMessage || "");
    if (d?.restHours === 48 || raw.includes("48")) {
      return "Bắt buộc nghỉ hồi phục: Chiến mã cần tối thiểu 48 giờ giãn cách giữa hai buổi tập nặng để đảm bảo an toàn tim mạch và thể lực.";
    }
    return "Bắt buộc nghỉ hồi phục: Chiến mã cần tối thiểu 24 giờ giãn cách giữa hai buổi tập để đảm bảo an toàn thể lực.";
  },
  MAX_WORKOUTS_PER_DAY: () => "Mỗi chiến mã chỉ được tập tối đa 3 buổi mỗi ngày để bảo vệ sức khỏe tim mạch.",
  TRAINER_TIME_CONFLICT: (d) => {
    const horse = d?.horse ? ` của ngựa ${d.horse}` : "";
    const time = d?.time ? ` lúc ${d.time}` : "";
    const trainer = d?.trainer ? `HLV ${d.trainer}` : "Huấn luyện viên";
    return `${trainer} đã có buổi tập${horse}${time}. HLV chỉ có thể điều hành 1 buổi tập tại một thời điểm.`;
  },
  HORSE_WORKOUT_TIME_CONFLICT: (d) => {
    const time = d?.time ? ` lúc ${d.time}` : "";
    return `Chiến mã đã có một buổi tập khác${time}. Vui lòng chọn khung giờ khác (cần cách nhau ít nhất 30 phút).`;
  },
  TRACK_HEAVY_COLLISION: (d) => {
    const horse = d?.horse ? ` của ngựa ${d.horse}` : "";
    const surface = d?.surface ? `Mặt sân ${d.surface}` : "Mặt sân";
    return `${surface} đang có buổi tập${horse}. Bài tập tốc độ cao yêu cầu độc quyền đường chạy để tránh va chạm.`;
  },
  TRACK_HEAVY_OCCUPIED: (d) => {
    const horse = d?.horse ? ` của ngựa ${d.horse}` : "";
    const surface = d?.surface ? `Mặt sân ${d.surface}` : "Mặt sân";
    return `${surface} đang có lượt chạy tốc độ cao${horse}. Không thể cho ngựa khác vào sân trong khung giờ này.`;
  },
  TRACK_CAPACITY_EXCEEDED: () => "Sân tập đã đạt sức chứa tối đa trong khung giờ này. Vui lòng chọn khung giờ hoặc đường chạy khác.",
  STALL_OCCUPIED: (d) =>
    d.horseName ? `Ô chuồng ${d.stallCode ? `${d.stallCode} ` : ""}đang có ngựa ${d.horseName}. Vui lòng chuyển ngựa trước.` : undefined,
  HORSE_HAS_STALL: (d) => (d.stallCode ? `Ngựa đã ở trong ô chuồng ${d.stallCode}. Vui lòng dùng chức năng Chuyển ô chuồng.` : undefined),
  ZONE_HAS_HORSES: (d) => (d.count ? `Khu chuồng vẫn còn ${d.count} ngựa. Vui lòng chuyển ngựa ra ngoài trước.` : undefined),
  ZONE_ROWS_TOO_SMALL: (d) => `Số hàng không thể ít hơn ${d.min}: đã có ô chuồng ở hàng ${d.min}.`,
  ZONE_COLS_TOO_SMALL: (d) => `Số cột không thể ít hơn ${d.min}: đã có ô chuồng ở cột ${d.min}.`,
  ROW_OUT_OF_RANGE: (d) => `Hàng phải từ 1 đến ${d.max}.`,
  COL_OUT_OF_RANGE: (d) => `Cột phải từ 1 đến ${d.max}.`,
  POSITION_TAKEN: (d) => `Vị trí này trên sơ đồ đã được sử dụng bởi ô chuồng ${d.stallCode ?? ""}.`,
  GROOM_ALREADY_ASSIGNED_IN_SHIFT: (d) =>
    d.groomName
      ? `Nhân viên ${d.groomName} đã được phân công trực tại ${d.zoneName} trong ${localizeShift(d.shiftName, true)} ngày ${d.date}. Trong một ca trực, mỗi nhân viên chăm sóc chỉ được phân công trực tại 1 khu chuồng.`
      : "Nhân viên này đã được phân công trực tại một khu chuồng khác trong ca này.",
  INSUFFICIENT_STOCK: (d) =>
    d.item
      ? `Kho không đủ ${d.item}: Cần ${d.required} ${d.unit || "kg"} (hiện còn ${d.available} ${d.unit || "kg"}).`
      : undefined,
};

const GENERIC_VI: Record<string, string> = {
  // Huấn luyện & Buổi tập
  WORKOUT_REST_REQUIRED: "Bắt buộc nghỉ hồi phục: Chiến mã cần tối thiểu 24 giờ (hoặc 48 giờ đối với bài tập nặng) giãn cách giữa hai buổi tập để đảm bảo an toàn thể lực.",
  HORSE_WORKOUT_TIME_CONFLICT: "Chiến mã đã có một buổi tập khác trong cùng khung giờ này.",
  TRAINER_BUSY_SLOT: "Huấn luyện viên đã có lịch huấn luyện chiến mã khác trong khung giờ này.",
  TRAINER_TIME_CONFLICT: "Huấn luyện viên đã có lịch huấn luyện chiến mã khác trong khung giờ này.",
  TRAINING_TRACK_REQUIRED: "Vui lòng chọn đường chạy thực tế.",
  TRAINING_TRACK_UNAVAILABLE: "Đường chạy đã chọn không khả dụng hoặc không khớp với loại mặt sân.",
  TRACK_MAPPING_REQUIRED: "Buổi tập cần được gắn với một đường chạy thực tế cụ thể.",
  TRACK_CAPACITY_EXCEEDED: "Sân tập đã đạt sức chứa tối đa trong khung giờ này. Vui lòng chọn khung giờ hoặc đường chạy khác.",
  TRACK_HEAVY_COLLISION: "Mặt sân đang có buổi tập của ngựa khác. Bài tập tốc độ cao yêu cầu độc quyền đường chạy để tránh va chạm.",
  TRACK_HEAVY_OCCUPIED: "Mặt sân đang có lượt chạy tốc độ cao của chiến mã khác. Không thể cho ngựa khác vào sân trong thời gian này.",
  MAX_WORKOUTS_PER_DAY: "Mỗi chiến mã chỉ được tập tối đa 3 buổi mỗi ngày để bảo vệ sức khỏe tim mạch.",
  TRIAL_SLOT_TAKEN: "Mặt sân đã có lượt chạy thử của chiến mã khác trong khung giờ này.",
  TARGET_SPEED_REQUIRED: "Tốc độ mục tiêu là bắt buộc đối với bài chạy tốc độ và chạy thử.",
  SESSION_DISTANCE_TOO_LONG: "Tổng cự ly buổi tập (cự ly × số hiệp) không được vượt quá 10.000 mét.",
  INVALID_TRAINER: "Huấn luyện viên phụ trách giáo án không còn hoạt động.",
  VET_CONFIRMATION_REQUIRED: "Chiến mã đang ở trạng thái theo dõi y tế. Bắt buộc phải xác nhận tham vấn ý kiến Bác sĩ thú y trước khi lên lịch bài tập nặng.",
  PRIME_TIME_QUOTA_EXCEEDED: "HLV đã đạt hạn ngạch tối đa 2 bài tập nặng trong khung giờ vàng buổi sáng (06:15 - 08:00). Vui lòng chọn khung giờ khác.",
  OUTSIDE_TRAINING_HOURS: "Giờ bắt đầu buổi tập phải trong khoảng từ 04:00 đến 20:00.",
  EXCEEDS_AFTERNOON_LIMIT: "Buổi tập phải kết thúc trước hoặc đúng 17:00 chiều để đảm bảo giờ nghỉ ngơi và ăn tối của ngựa.",
  TIME_TOO_SOON: "Giờ bắt đầu buổi tập phải cách thời điểm hiện tại ít nhất 30 phút.",
  DATE_IN_PAST: "Không thể xếp buổi tập vào ngày đã qua.",
  OUTSIDE_PHASE_DATES: "Ngày tập phải nằm trong khoảng thời gian của giai đoạn giáo án.",
  OUTSIDE_PLAN_DATES: "Ngày tập phải nằm trong khoảng thời gian của giáo án.",
  MEDICAL_LOCK_ACTIVE: "Chiến mã đang bị Khóa huấn luyện y tế. Không thể lên lịch hoặc thực hiện bài tập.",
  DEBT_IMPOUNDED: "Chiến mã đang bị lưu giữ do nợ phí. Không thể xếp lịch huấn luyện.",
  NO_REPEAT_DATES: "Không có ngày nào khớp với các thứ đã chọn.",
  TOO_MANY_REPEATS: "Mỗi lần chỉ được tạo tối đa 60 buổi tập.",
  PLAN_HAS_NO_WORKOUTS: "Giáo án cần có ít nhất một buổi tập trước khi kích hoạt.",
  HORSE_HAS_ACTIVE_PLAN: "Chiến mã này đã có một giáo án đang áp dụng. Vui lòng hoàn thành hoặc hủy giáo án cũ trước.",
  WORKOUT_NOT_STARTED: "Chỉ có thể ghi kết quả sau khi buổi tập đã bắt đầu.",
  LATE_RESULT_EXPIRED: "Đã quá 7 ngày, không thể ghi kết quả cho buổi tập đã bỏ lỡ.",
  WORKOUT_NOT_EDITABLE: "Chỉ có thể chỉnh sửa buổi tập đang ở trạng thái Đã lên lịch.",
  WORKOUT_NOT_FOUND: "Buổi tập này không còn tồn tại.",
  PLAN_NOT_FOUND: "Giáo án huấn luyện này không còn tồn tại.",
  PLAN_CLOSED: "Giáo án đã hoàn tất hoặc đã bị hủy, không thể chỉnh sửa.",
  PHASES_REQUIRED: "Giáo án cần có ít nhất một giai đoạn huấn luyện.",
  SUMMARY_REQUIRED: "Mô tả tổng kết phải từ 10 đến 2000 ký tự.",
  INVALID_GROOM: "Vui lòng chọn nhân viên chăm sóc đang hoạt động.",
  HORSE_HAS_OTHER_TRAINER: "Chiến mã này đang được phụ trách bởi một giáo án của huấn luyện viên khác.",
  PLAN_ENDED: "Giáo án này đã quá ngày kết thúc.",
  PLAN_NOT_DELETABLE: "Chỉ có thể xóa giáo án nháp chưa có buổi tập nào hoàn thành. Vui lòng chọn Hủy giáo án thay thế.",

  // Hệ thống chung & Tài khoản
  NETWORK_ERROR: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.",
  TIMEOUT: "Máy chủ phản hồi quá lâu. Vui lòng thử lại sau giây lát.",
  SERVER_ERROR: "Đã có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau giây lát.",
  SERVICE_UNAVAILABLE: "Dịch vụ tạm thời không khả dụng. Dữ liệu chưa thay đổi. Vui lòng thử lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  RATE_LIMITED: "Quá nhiều yêu cầu từ thiết bị này. Vui lòng chờ 1 phút và thử lại.",
  EMAIL_TAKEN: "Địa chỉ email này đã được sử dụng trong hệ thống.",
  WEAK_PASSWORD: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.",
  ATTEMPTS_EXCEEDED: "Đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau hoặc dùng Quên mật khẩu.",
  CANNOT_LOCK_SELF: "Bạn không thể tự khóa tài khoản của chính mình.",
  CANNOT_CHANGE_SELF: "Bạn không thể tự thay đổi vai trò tài khoản của chính mình.",
  CANNOT_DELETE_USED: "Tài khoản đã có dữ liệu hoạt động, không thể xóa vĩnh viễn. Vui lòng chuyển sang Vô hiệu hóa.",
  INVALID_STATE: "Dữ liệu vừa được cập nhật bởi thao tác khác. Vui lòng tải lại trang.",
  LAST_MANAGER: "Câu lạc bộ phải duy trì ít nhất một Quản lý đang hoạt động.",
  RESET_EXPIRED: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng gửi lại yêu cầu.",

  // Hồ sơ ngựa & Chuồng trại
  HORSE_NOT_FOUND: "Hồ sơ chiến mã này không còn tồn tại hoặc đã bị xóa.",
  ROLE_RESTRICTION: "Vai trò của bạn không được phép thay đổi trạng thái này.",
  HORSE_RETIRED: "Chiến mã đã ngừng quản lý. Cần có Quản lý CLB kích hoạt lại trước khi thao tác.",
  HORSE_DECEASED: "Chiến mã đã qua đời, không thể kích hoạt lại.",
  RETIRE_REASON_REQUIRED: "Vui lòng chọn lý do ngừng quản lý chiến mã.",
  REASON_REQUIRED: "Lý do phải từ 10 đến 500 ký tự.",
  SAME_STATUS: "Chiến mã đã ở sẵn trạng thái này.",
  CONFIRM_NAME_MISMATCH: "Tên chiến mã nhập vào để xác nhận không trùng khớp.",
  HORSE_LOCKED: "Không thể xóa hồ sơ chiến mã khi đang có Khóa huấn luyện y tế hiệu lực.",
  HAS_DEPENDENT_DATA: "Chiến mã đã có dữ liệu huấn luyện, y tế hoặc thi đấu. Vui lòng dùng tính năng Ngừng quản lý thay vì Xóa.",
  UNDO_EXPIRED: "Đã hết thời hạn hoàn tác xóa. Bạn có thể khôi phục từ danh sách Ngựa đã xóa.",
  STALL_OCCUPIED: "Ô chuồng này hiện đã có chiến mã khác.",
  STALL_MAINTENANCE: "Ô chuồng này đang trong quá trình bảo trì.",
  STALL_UNAVAILABLE: "Ô chuồng này đang bảo trì hoặc ngừng sử dụng.",
  STALL_NOT_FOUND: "Ô chuồng này không còn tồn tại.",
  ALLOCATION_NOT_FOUND: "Chiến mã không còn ở trong ô chuồng này.",
  SAME_STALL: "Vui lòng chọn ô chuồng khác với ô chuồng hiện tại.",
  HORSE_HAS_STALL: "Chiến mã đã có ô chuồng. Vui lòng dùng chức năng Chuyển ô chuồng.",
  ZONE_NOT_FOUND: "Khu chuồng này không còn tồn tại.",
  ZONE_INACTIVE: "Khu chuồng này đang ngừng hoạt động. Cần kích hoạt lại trước khi thêm ô chuồng.",
  ZONE_HAS_HORSES: "Khu chuồng vẫn còn chiến mã. Vui lòng chuyển ngựa ra ngoài trước.",
  DUPLICATE_ZONE_CODE: "Mã khu chuồng này đã tồn tại.",
  DUPLICATE_ZONE_NAME: "Tên khu chuồng này đã tồn tại.",
  DUPLICATE_STALL_CODE: "Mã ô chuồng này đã tồn tại.",
  INVALID_BREED: "Giống ngựa này không tồn tại hoặc đã ngừng sử dụng.",
  INVALID_COLOR: "Màu lông này không tồn tại hoặc đã ngừng sử dụng.",
  DUPLICATE_CATALOG_CODE: "Mã danh mục này đã tồn tại.",
  DUPLICATE_CATALOG_NAME: "Tên danh mục này đã tồn tại.",
  CATALOG_ITEM_NOT_FOUND: "Mục danh mục này không còn tồn tại.",
};

const VI_TO_EN: Record<string, string> = {
  "Ngày tập là bắt buộc.": "Scheduled date is required.",
  "Ngày tập không hợp lệ.": "Scheduled date is invalid.",
  "Vui lòng chọn giai đoạn.": "Please select a phase.",
  "Vui lòng chọn loại bài tập.": "Please select a workout type.",
  "Vui lòng chọn cường độ.": "Please select intensity.",
  "Cự ly phải là số nguyên.": "Distance must be an integer.",
  "Cự ly phải từ 100 đến 5000 m.": "Distance must be 100 to 5000 m.",
  "Số hiệp phải từ 1 đến 10.": "Repetitions must be 1 to 10.",
  "Tốc độ mục tiêu phải từ 10 đến 70 km/h.": "Target speed must be 10 to 70 km/h.",
  "Mặt đường chạy không hợp lệ.": "Track surface is invalid.",
  "Vui lòng chọn nhân viên phụ trách.": "Please select an assigned staff member.",
  "Ghi chú hướng dẫn tối đa 500 ký tự.": "Instructions can be at most 500 characters.",
  "Nhận xét phải từ 10 đến 2000 ký tự.": "Comment must be 10 to 2000 characters.",
  "Nhận xét phải từ 2 đến 2000 ký tự.": "Comment must be 2 to 2000 characters.",
  "Vui lòng nhập nhận xét.": "Please enter a comment.",
  "Vui lòng mô tả dấu hiệu bất thường (10-500 ký tự).": "Please describe abnormal signs (10-500 characters).",
  "Vui lòng mô tả dấu hiệu bất thường (2-500 ký tự).": "Please describe abnormal signs (2-500 characters).",
  "Điểm phong độ phải từ 1 đến 10.": "Performance score must be 1 to 10.",
  "Vui lòng chọn mức hoàn thành.": "Please select completion level.",
  "Ngày bắt đầu không được trong quá khứ.": "Start date cannot be in the past.",
  "Giáo án cần ít nhất 1 giai đoạn.": "A plan needs at least one phase.",
  "Không thể xếp lịch buổi tập trong quá khứ.": "A workout cannot be scheduled in the past.",
  "Giờ bắt đầu phải trong khoảng 04:00 - 20:00.": "Start time must be between 04:00 and 20:00.",
  "Ngày tập phải nằm trong khoảng thời gian của giai đoạn.": "Workout date must be within the phase dates.",
  "Cần nhập tốc độ mục tiêu cho bài tập nước rút hoặc chạy thử.": "Target speed is required for breeze and trial runs.",
  "Cần nhập tên nài ngựa cho bài tập nước rút hoặc chạy thử.": "Jockey name is required for breeze and trial runs.",
  "Một ngựa chỉ được tập tối đa 3 buổi mỗi ngày.": "A horse can have at most 3 workouts per day.",
  "Khung giờ chạy thử bị trùng trên đường chạy này.": "Trial run slot is already taken on this track.",
  "Chỉ được sửa buổi tập ở trạng thái Đã lên lịch.": "Only scheduled workouts can be edited.",
  "Đã có lượt chạy thử khác trên mặt sân này trong khung 15 phút.": "Another trial run is already scheduled on this track within 15 minutes.",
  "Ngựa đang bị Khóa huấn luyện y tế.": "The horse is currently under a Medical Training Lock.",
  "Chưa chọn nhân viên chăm sóc.": "Please select an assigned groom.",
  "Chưa chọn giai đoạn giáo án.": "Please select a training phase.",
  // Flow 4: Ca trực, khu chuồng, vật tư, tồn kho, khẩu phần ăn
  "Ca trực không tồn tại hoặc đã ngừng dùng.": "The shift is unavailable or has been deactivated.",
  "Khu chuồng không tồn tại hoặc đã ngừng dùng.": "The barn zone is unavailable or has been deactivated.",
  "Một hoặc nhiều nhân viên không hợp lệ hoặc không ở trạng thái hoạt động.": "One or more selected staff are invalid or inactive.",
  "Không thể sao chép vào tuần đã qua.": "Cannot copy rosters into a past week.",
  "Bản ghi phân ca không tồn tại.": "Shift roster entry no longer exists. Reload the page.",
  "Số hàng phải từ 1 đến 4.": "Rows must be between 1 and 4.",
  "Số cột phải từ 1 đến 4.": "Columns must be between 1 and 4.",
  "Hàng phải từ 1 đến 4.": "Row must be between 1 and 4.",
  "Cột phải từ 1 đến 4.": "Column must be between 1 and 4.",
  "Vật tư không tồn tại.": "This supply item no longer exists. Reload the list.",
  "Mã vật tư đã tồn tại.": "This supply code already exists.",
  "Tên vật tư đã tồn tại.": "This supply name already exists.",
  "Số lượng vượt quá sức chứa của khu chuồng.": "The quantity exceeds the storage capacity of the barn zone.",
  "Khu chuồng này đã có một yêu cầu bổ sung vật tư đang chờ duyệt hoặc đang giao.": "A restock request for this item in this zone is already pending or delivering.",
  "Phiếu đề xuất không tồn tại.": "This restock request no longer exists. Reload the list.",
  "Phiếu đề xuất đã được xử lý trước đó.": "This restock request has already been processed.",
  "Vui lòng nhập lý do từ chối.": "Please enter a reason for rejection.",
  "Số lượng duyệt phải lớn hơn 0.": "Approved quantity must be greater than 0.",
  "Chỉ phiếu đã duyệt mới có thể hoàn tất nhập kho.": "Only approved restock requests can be marked as delivered.",
  "Người duyệt và người giao không hợp lệ.": "The delivery and reviewer details are invalid.",
  "Không tìm thấy khẩu phần ăn.": "This nutrition plan no longer exists. Reload the page.",
  "Ngựa này đã có khẩu phần ăn đang hoạt động hoặc đang chờ duyệt.": "This horse already has an active or pending nutrition plan.",
  "Chỉ có thể chỉnh sửa khẩu phần ăn ở trạng thái bản nháp hoặc bị từ chối.": "Only draft or rejected nutrition plans can be edited.",
  "Chỉ có thể gửi duyệt khẩu phần ăn ở trạng thái bản nháp.": "Only draft nutrition plans can be submitted for approval.",
  "Chỉ có thể duyệt khẩu phần ăn đang chờ duyệt.": "Only pending nutrition plans can be approved.",
  "Chỉ có thể từ chối khẩu phần ăn đang chờ duyệt.": "Only pending nutrition plans can be rejected.",
  "Chỉ có thể lưu trữ khẩu phần ăn đã được duyệt.": "Only approved nutrition plans can be archived.",
  "Trong một ca trực, mỗi nhân viên chăm sóc chỉ được phân công trực tại 1 khu chuồng.": "Each groom can only be assigned to 1 barn zone per shift.",
};

// Lỗi kiểm tra dữ liệu có thể gồm nhiều dòng: dịch từng dòng theo ngôn ngữ đang chọn.
function localizeLines(text: string): string {
  return text
    .split("\n")
    .map((line) => localizeServerText(line))
    .join("\n");
}

export function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return isVietnamese() ? (GENERIC_VI.SERVER_ERROR || tr(GENERIC.SERVER_ERROR)) : GENERIC.SERVER_ERROR;

    if (isVietnamese()) {
      // 1. Ánh xạ động theo mã lỗi có dữ liệu bổ trợ
      const dynamicVi = DYNAMIC_VI[err.code]?.({ ...(err.data as Record<string, unknown>), rawMessage: err.message });
      if (dynamicVi) return dynamicVi;

      // 2. Tra bảng mã lỗi Tiếng Việt trực tiếp
      if (GENERIC_VI[err.code]) {
        return GENERIC_VI[err.code];
      }

      // 3. Nếu có thông điệp cụ thể từ server, làm sạch tiền tố mã lỗi và dịch sang Tiếng Việt
      if (
        err.message &&
        err.message !== err.code &&
        err.message !== "Not Found" &&
        err.message !== "Bad Request" &&
        err.message !== "Forbidden resource" &&
        err.message !== "Internal Server Error"
      ) {
        return localizeLines(err.message);
      }

      const enGeneric = GENERIC[err.code];
      return enGeneric ? tr(enGeneric) : "Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại sau.";
    } else {
      // English mode
      const dynamicEn = DYNAMIC_EN[err.code]?.(err.data as Record<string, unknown>);
      if (dynamicEn) return dynamicEn;

      const enGeneric = GENERIC[err.code];
      if (enGeneric) return enGeneric;

      if (
        err.message &&
        err.message !== err.code &&
        err.message !== "Not Found" &&
        err.message !== "Bad Request" &&
        err.message !== "Forbidden resource" &&
        err.message !== "Internal Server Error"
      ) {
        return VI_TO_EN[err.message] ?? localizeLines(err.message);
      }

      return "Something went wrong. Try again.";
    }
  }
  return isVietnamese() ? "Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại sau." : "Something went wrong. Try again.";
}

// Câu lỗi cho ô nhập mã OTP.
export function otpMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return messageFor(err);
  const left = Number(err.data.attemptsLeft ?? 0);
  switch (err.code) {
    case "OTP_INVALID":
      return left > 0
        ? `The code is not correct. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
        : "The code is not correct.";
    case "OTP_EXPIRED":
      return "This code has expired. Request a new one.";
    case "OTP_ATTEMPTS_EXCEEDED":
      return "Too many wrong codes. Request a new code to continue.";
    case "OTP_NOT_FOUND":
      return "No code is waiting for this address. Request a new one.";
    default:
      return messageFor(err);
  }
}

export interface LoginFailure {
  // null = lỗi đã hiện ngay tại ô nhập, không cần Alert.
  alert: AlertSpec | null;
  emailError?: string;
  passwordError?: string;
  // Khóa tạm sau nhiều lần sai: mốc (ms) server cho phép thử lại — trang đăng nhập đếm ngược tới đây.
  retryAt?: number;
  // Nút đi tiếp trong Alert: nhập OTP xác minh email / nhận lời mời / đăng ký lại.
  next?: "verifyEmail" | "acceptInvite" | "signUp" | "createAccount";
}

// Lỗi riêng của đăng nhập/đăng ký bằng Google; trạng thái tài khoản (chờ duyệt, bị khóa...) dùng chung loginFailure.
export function googleFailure(err: unknown): LoginFailure {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "GOOGLE_ACCOUNT_NOT_FOUND":
        return {
          alert: {
            tone: "warn",
            icon: "mail",
            title: "This Gmail has no TMEC account yet",
            body: "Create an account with Google to send a Horse Owner request, or ask the Club Manager to invite you as staff.",
          },
          next: "createAccount",
        };
      case "GOOGLE_EMAIL_NOT_ALLOWED":
        return { alert: { tone: "danger", icon: "mail", title: "Only Gmail accounts are accepted", body: "Choose a Google account that ends in @gmail.com." } };
      case "GOOGLE_ACCOUNT_MISMATCH":
        return {
          alert: {
            tone: "danger",
            icon: "ban",
            title: "Google account does not match",
            body: "This email is linked to a different Google account. Sign in with email and password, or contact the Club Manager.",
          },
        };
      case "GOOGLE_LOGIN_UNAVAILABLE":
        return { alert: { tone: "danger", icon: "alert", title: "Google sign-in is not available", body: "The server has no Google setup yet. Use email and password for now." } };
      case "GOOGLE_LOGIN_FAILED":
        return { alert: { tone: "danger", icon: "xCircle", title: "Google could not confirm this sign-in", body: "Try again, or use email and password." } };
      case "EMAIL_TAKEN":
        return { alert: { tone: "info", icon: "mail", title: "This email already has an account", body: "Sign in with Google on the sign-in page instead." } };
    }
  }
  return loginFailure(err);
}

// "Contact the Club Manager." + lý do CM ghi khi khóa / vô hiệu hóa (nếu có).
function contactManager(reason: unknown): string {
  return reason ? `Contact the Club Manager. Reason: ${String(reason)}` : "Contact the Club Manager.";
}

// Kết quả đăng nhập thất bại → Alert ngắn (1 tiêu đề + tối đa 1 câu) hoặc lỗi tại ô nhập.
// Không báo riêng "sai email" hay "sai mật khẩu" để không lộ email nào có tài khoản.
export function loginFailure(err: unknown): LoginFailure {
  if (!(err instanceof ApiError)) {
    return { alert: { tone: "danger", icon: "xCircle", title: "Sign-in failed", body: "Try again in a moment." } };
  }
  const d = err.data;

  if (err.status >= 500) {
    return { alert: { tone: "danger", icon: "xCircle", title: "Something went wrong", body: "Try again in a moment." } };
  }

  switch (err.code) {
    case "VALIDATION": {
      // BE từ chối dữ liệu (thường FE đã chặn trước): đưa lỗi về đúng ô nhập.
      const text = err.details.join(" ").toLowerCase();
      return {
        alert: null,
        emailError: text.includes("email") ? "Enter a valid @gmail.com address." : undefined,
        passwordError: text.includes("password") ? "Password must be 8–128 characters." : undefined,
      };
    }
    case "INVALID_CREDENTIALS": {
      const left = Number(d.attemptsLeft ?? 0);
      return {
        alert: {
          tone: "danger",
          icon: "alert",
          title: "Email or password is incorrect",
          body: left === 1 ? "1 attempt left before sign-in is paused." : "",
        },
      };
    }
    case "ATTEMPTS_EXCEEDED": {
      // Nội dung đếm ngược do trang đăng nhập dựng từ retryAt (thời gian lấy từ server).
      const retryAt = d.retryAt ? Date.parse(String(d.retryAt)) : undefined;
      return { alert: null, retryAt };
    }
    case "ACCOUNT_LOCKED":
      return { alert: { tone: "danger", icon: "ban", title: "This account is locked", body: contactManager(d.reason) } };
    case "ACCOUNT_PENDING":
      return {
        alert: {
          tone: "warn",
          icon: "clock",
          title: "Account pending approval",
          body: d.requestCode
            ? `Request ${String(d.requestCode)}. You will get an email once it is approved.`
            : "You will get an email once it is approved.",
        },
      };
    case "EMAIL_NOT_VERIFIED":
      return { alert: { tone: "warn", icon: "mail", title: "Email not verified", body: "" }, next: "verifyEmail" };
    case "ACCOUNT_INVITED":
      return { alert: { tone: "info", icon: "mail", title: "Invitation not accepted yet", body: "" }, next: "acceptInvite" };
    case "ACCOUNT_INACTIVE":
      return { alert: { tone: "danger", icon: "ban", title: "This account is deactivated", body: contactManager(d.reason) } };
    case "ACCOUNT_REJECTED":
      return {
        alert: {
          tone: "danger",
          icon: "xCircle",
          title: "Sign-up request declined",
          body: d.reason ? `Reason: ${String(d.reason)}` : "",
        },
        next: "signUp",
      };
    case "RATE_LIMITED":
      return { alert: { tone: "danger", icon: "clock", title: "Too many requests", body: "Wait a minute and try again." } };
    case "NETWORK_ERROR":
    case "TIMEOUT":
      return { alert: { tone: "danger", icon: "alert", title: "Cannot reach the server", body: "Check your connection and try again." } };
    default:
      return { alert: { tone: "danger", icon: "xCircle", title: "Sign-in failed", body: GENERIC[err.code] ?? "Try again in a moment." } };
  }
}
