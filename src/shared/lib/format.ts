import { isVietnamese } from "@/shared/i18n/tr";

// Một kiểu ngày giờ cho toàn app: "13 Oct 2026", "16:02", "13 Oct 2026, 16:02".

const pad = (n: number) => String(n).padStart(2, "0");

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_SHORT_VI = ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6", "Thg 7", "Thg 8", "Thg 9", "Thg 10", "Thg 11", "Thg 12"];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: string | number | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  if (isVietnamese()) {
    return `${d.getDate()} ${MONTHS_SHORT_VI[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${d.getDate()} ${MONTHS_SHORT_EN[d.getMonth()]} ${d.getFullYear()}`;
}

// "13 Oct" — ngày trong năm hiện tại, dùng ở chỗ hẹp.
export function formatShortDate(value: string | number | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  if (isVietnamese()) {
    return `${d.getDate()} ${MONTHS_SHORT_VI[d.getMonth()]}`;
  }
  return `${d.getDate()} ${MONTHS_SHORT_EN[d.getMonth()]}`;
}

export function formatTime(value: string | number | Date): string {
  const d = toDate(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value: string | number | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

// "Saturday, 19 September 2026" / "Thứ Bảy, 19 Tháng 9, 2026"
export function formatLongDate(value: string | number | Date): string {
  const d = toDate(value);
  if (isVietnamese()) {
    return `${DAYS_VI[d.getDay()]}, ${d.getDate()} ${MONTHS_VI[d.getMonth()]}, ${d.getFullYear()}`;
  }
  return `${DAYS_EN[d.getDay()]}, ${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
}

// 47000 => "00:47"
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Số đếm dưới 10 đệm số 0: 3 => "03"
export function padCount(n: number): string {
  return pad(n);
}

// "Trần Văn Nam" => "TVN"? Design dùng 2 chữ cuối: "Văn Nam" => "VN".
// Bỏ phần trong ngoặc và ký tự không phải chữ: "Michael Tran (Club Manager)" => "MT".
export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Tên gọi trong tiếng Việt là chữ cuối: "Trần Văn Nam" => "Nam".
export function givenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Đơn vị tiền theo ngôn ngữ: "đ" (tiếng Việt) hoặc "VND" (tiếng Anh). */
export function vndUnit(): string {
  return isVietnamese() ? "đ" : "VND";
}

/**
 * Định dạng số tiền đồng nhất dùng dấu chấm (.) phân cách hàng nghìn cho cả tiếng Anh và tiếng Việt.
 * Ví dụ: 774194 -> "774.194"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "0";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "0";
  return Math.round(num).toLocaleString("vi-VN");
}

/**
 * Định dạng số tiền kèm đơn vị tiền tệ đồng nhất: "774.194 đ" (vi) hoặc "774.194 VND" (en).
 */
export function formatVND(amount: number | string | null | undefined): string {
  return `${formatCurrency(amount)} ${vndUnit()}`;
}

/**
 * Định dạng điểm đánh giá cố định số chữ số thập phân (tránh lỗi số thực JS như 8.799999999999999).
 */
export function formatScore(score: number | null | undefined, digits = 2): string {
  if (score == null) return "—";
  const num = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(digits);
}

