// Luật chung cho Họ tên (giống BE common/utils/name.ts): chỉ chữ cái (kể cả có dấu tiếng Việt) và khoảng trắng.
// Trả về câu lỗi theo ngôn ngữ đang chọn, hoặc "" nếu hợp lệ.
import i18n from "@/shared/i18n";

const NAME_RE = /^[\p{L}\p{M} ]+$/u;

export function fullNameError(name: string): string {
  const v = name.trim();
  if (!v) return i18n.t("nameValidation.required");
  if (v.length < 2 || v.length > 100) return i18n.t("nameValidation.length");
  if (!NAME_RE.test(v)) return i18n.t("nameValidation.lettersOnly");
  return "";
}
