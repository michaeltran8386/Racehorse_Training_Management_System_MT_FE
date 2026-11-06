// Mã lỗi từ API → câu thông báo tiếng Anh dễ hiểu. Nêu điều kiện, không trách người dùng.

import { ApiError } from "@/shared/lib/api";

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
  PLAN_HAS_NO_WORKOUTS: "Add at least one workout before activating the plan.",
  PLAN_ENDED: "The plan's end date has passed.",
  PHASES_REQUIRED: "A plan needs at least one phase.",
  PLAN_NOT_DELETABLE: "Only a draft without completed workouts can be deleted. Cancel the plan instead.",
  VET_CONFIRMATION_REQUIRED: "The horse is in a medical status. Confirm that you have discussed this with the Veterinarian.",
  SUMMARY_REQUIRED: "Summary must be 10 to 2000 characters.",
  START_DATE_IN_PAST: "The start date cannot be before today.",
  DATE_IN_PAST: "A workout cannot be scheduled on a past date.",
  OUTSIDE_TRAINING_HOURS: "Start time must be between 04:00 and 20:00.",
  OUTSIDE_PLAN_DATES: "The workout date must be within the plan's dates.",
  TARGET_SPEED_REQUIRED: "Target speed is required for breezes and trial runs.",
  JOCKEY_REQUIRED: "Enter the jockey's name for breezes and trial runs.",
  INVALID_GROOM: "Choose an active groom.",
  TRIAL_SLOT_TAKEN: "This track already has a trial run within 15 minutes of that time.",
  MAX_WORKOUTS_PER_DAY: "A horse can have at most 3 workouts per day.",
  GROOM_TIME_CONFLICT: "This groom already has another workout within 30 minutes. Choose another groom or change the time.",
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
  START_DATE_TOO_EARLY: "The start date cannot be more than 7 days ago.",
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
};

// Câu có chèn dữ liệu BE gửi kèm (data), ví dụ tên ngựa đang ở ô chuồng.
const DYNAMIC: Record<string, (d: Record<string, unknown>) => string | undefined> = {
  STALL_OCCUPIED: (d) =>
    d.horseName ? `Stall ${d.stallCode ?? ""} already houses ${d.horseName}. Move that horse first.`.replace("  ", " ") : undefined,
  HORSE_HAS_STALL: (d) => (d.stallCode ? `The horse is already in stall ${d.stallCode}. Use Move stall instead.` : undefined),
  ZONE_HAS_HORSES: (d) => (d.count ? `The zone still houses ${d.count} horse(s). Move them out first.` : undefined),
  ZONE_ROWS_TOO_SMALL: (d) => `Rows cannot be fewer than ${d.min}: a stall already sits in row ${d.min}.`,
  ZONE_COLS_TOO_SMALL: (d) => `Columns cannot be fewer than ${d.min}: a stall already sits in column ${d.min}.`,
  ROW_OUT_OF_RANGE: (d) => `Row must be between 1 and ${d.max}.`,
  COL_OUT_OF_RANGE: (d) => `Column must be between 1 and ${d.max}.`,
  POSITION_TAKEN: (d) => `This grid position is already used by stall ${d.stallCode}.`,
  GROOM_TIME_CONFLICT: (d) =>
    d.groom
      ? `Groom ${d.groom} is already assigned to ${d.horse}'s workout at ${d.time} on ${d.date}. Choose another groom or move the time by at least 30 minutes.`
      : undefined,
};

import { isVietnamese, localizeServerText, tr } from "@/shared/i18n/tr";

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
  "Chưa chọn người chăm sóc.": "Please select an assigned groom.",
  "Chưa chọn giai đoạn giáo án.": "Please select a training phase.",
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
    if (err.status >= 500) return isVietnamese() ? tr(GENERIC.SERVER_ERROR) : GENERIC.SERVER_ERROR;
    const dynamicMsg = DYNAMIC[err.code]?.(err.data as Record<string, unknown>);
    if (dynamicMsg) return isVietnamese() ? tr(dynamicMsg) : dynamicMsg;
    const enGeneric = GENERIC[err.code];
    if (isVietnamese()) {
      if (
        err.message &&
        err.message !== err.code &&
        err.message !== "Not Found" &&
        err.message !== "Bad Request" &&
        err.message !== "Forbidden resource"
      ) {
        return localizeLines(err.message);
      }
      return enGeneric ? tr(enGeneric) : tr("Something went wrong. Try again.");
    } else {
      // English mode: prefer English generic by error code if available
      if (enGeneric) return enGeneric;
      if (
        err.message &&
        err.message !== err.code &&
        err.message !== "Not Found" &&
        err.message !== "Bad Request" &&
        err.message !== "Forbidden resource"
      ) {
        return VI_TO_EN[err.message] ?? localizeLines(err.message);
      }
      return "Something went wrong. Try again.";
    }
  }
  return isVietnamese() ? tr("Something went wrong. Try again.") : "Something went wrong. Try again.";
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
