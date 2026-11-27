// Dịch câu giao diện theo chính câu tiếng Anh (yêu cầu song ngữ, bổ sung cho t("key") của i18next).
// - Tiếng Anh: trả nguyên câu.
// - Tiếng Việt: tra VI_TEXT; không có thì thử các mẫu có biến ("Account of {{name}} saved.");
//   vẫn không có thì giữ tiếng Anh (không bao giờ hiện chuỗi rỗng hay mã khóa).
// Các component dùng chung (Button, Field, Modal, Toast…) tự gọi tr() cho chữ truyền vào,
// nên trang chỉ cần bọc tr() ở chữ viết thẳng trong thẻ HTML.
import i18n from "./index";
import { VI_TEXT } from "./vi-text";

type Params = Record<string, string | number>;

interface Pattern {
  re: RegExp;
  names: string[];
  vi: string;
  specificity: number;
}

const VAR = /\{\{(\w+)\}\}/g;
let patterns: Pattern[] | null = null;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[-–—]/g, "[-–—]");
}

function compilePatterns(): Pattern[] {
  const out: Pattern[] = [];
  for (const [en, vi] of Object.entries(VI_TEXT)) {
    if (!en.includes("{{")) continue;
    // Bỏ qua mẫu "{{on}} of {{total}}" vì quá lỏng lẻo, sẽ nuốt nhầm các câu tiếng Anh có " of "
    if (en === "{{on}} of {{total}}") continue;
    const names: string[] = [];
    const source = en
      .split(VAR)
      .map((part, i) => {
        if (i % 2 === 1) {
          names.push(part);
          return "(.+?)";
        }
        return escapeRe(part);
      })
      .join("");
    out.push({ re: new RegExp(`^${source}$`, "s"), names, vi, specificity: en.replace(VAR, "").length });
  }
  // Prefer detailed sentences over broad templates such as "Zone {{zone}}".
  return out.sort((a, b) => b.specificity - a.specificity);
}

function fill(text: string, params: Params): string {
  return text.replace(VAR, (_, name: string) => {
    const val = params[name];
    if (val !== undefined && val !== null && val !== "") return String(val);
    if (name === "reviewer") return isVietnamese() ? "Quản lý CLB" : "Club Manager";
    if (name === "time") return isVietnamese() ? "vừa xong" : "just now";
    return `{{${name}}}`;
  });
}

export function isVietnamese(): boolean {
  return Boolean(i18n.language && i18n.language.toLowerCase().startsWith("vi"));
}

export function tr(text: string, params?: Params): string {
  if (!text || !isVietnamese()) return params ? fill(text, params) : text;
  const exact = VI_TEXT[text];
  if (exact !== undefined) return params ? fill(exact, params) : exact;
  const trimmed = text.trim();
  if (trimmed !== text && VI_TEXT[trimmed] !== undefined) {
    const translated = text.replace(trimmed, () => VI_TEXT[trimmed]);
    return params ? fill(translated, params) : translated;
  }
  // Nếu chuỗi truyền vào đã chứa {{ mà không có trong từ điển, không dùng compilePatterns để tránh khớp bậy mẫu khác
  if (!text.includes("{{")) {
    patterns ??= compilePatterns();
    for (const p of patterns) {
      const m = p.re.exec(text);
      if (m) {
        const values: Params = {};
        p.names.forEach((n, i) => {
          values[n] = tr(m[i + 1]);
        });
        return fill(p.vi, { ...params, ...values });
      }
    }
  }
  return params ? fill(text, params) : text;
}

// ---- Chiều ngược Việt -> Anh: cho câu tiếng Việt do Backend trả về khi người dùng chọn tiếng Anh.
const VI_CHARS = /[ăâđêôơưàáạảãầấậẩẫằắặẳẵèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
let reverseExact: Map<string, string> | null = null;
let reversePatterns: Pattern[] | null = null;

function buildReverse() {
  reverseExact = new Map();
  reversePatterns = [];
  for (const [en, vi] of Object.entries(VI_TEXT)) {
    if (!reverseExact.has(vi)) reverseExact.set(vi, en);
    if (!vi.includes("{{")) continue;
    const names: string[] = [];
    const source = vi
      .split(VAR)
      .map((part, i) => {
        if (i % 2 === 1) {
          names.push(part);
          return "(.+?)";
        }
        return escapeRe(part);
      })
      .join("");
    reversePatterns.push({ re: new RegExp(`^${source}$`, "s"), names, vi: en, specificity: vi.replace(VAR, "").length });
  }
  reversePatterns.sort((a, b) => b.specificity - a.specificity);
}

/** Câu tiếng Việt -> tiếng Anh theo bảng dịch; không có thì giữ nguyên. */
export function toEnglish(text: string): string {
  if (!text || !VI_CHARS.test(text)) return text;
  if (!reverseExact) buildReverse();
  const exact = reverseExact!.get(text) ?? reverseExact!.get(text.trim());
  if (exact !== undefined) return exact;
  for (const p of reversePatterns!) {
    const m = p.re.exec(text);
    if (m) {
      const values: Params = {};
      // Giá trị ghép vào câu (tên ngựa, mã...) giữ nguyên, trừ khi chính nó là một câu có trong bảng.
      p.names.forEach((n, i) => {
        values[n] = reverseExact!.get(m[i + 1]) ?? m[i + 1];
      });
      return p.vi.replace(VAR, (_, name: string) => String(values[name] ?? ""));
    }
  }
  return text;
}

/**
 * Câu do Backend trả về (lỗi, cảnh báo, lý do, thông báo) có thể là tiếng Anh hoặc tiếng Việt.
 * Hiện theo ngôn ngữ người dùng chọn: tiếng Việt thì dịch câu Anh, tiếng Anh thì dịch câu Việt.
 */
export function localizeServerText(text: string | null | undefined): string {
  if (!text) return "";
  if (isVietnamese()) {
    // 1. Cắt sạch mọi tiền tố mã code thô dạng [MÃ_LỖI]: hoặc CODE_NAME:
    const cleaned = text.replace(/^[A-Z0-9_]{3,}:\s*/g, "");

    // 2. Xử lý các mẫu câu tiếng Anh đặc thù từ Backend nếu chưa có trong từ điển
    const restMatch = cleaned.match(/horse needs (\d+)\s*hours between these sessions/i) || text.match(/horse needs (\d+)\s*hours/i);
    if (restMatch) {
      const hours = restMatch[1];
      if (hours === "48") {
        return "Bắt buộc nghỉ hồi phục: Chiến mã cần tối thiểu 48 giờ giãn cách giữa hai buổi tập nặng để bảo vệ tim mạch và thể lực.";
      }
      return `Bắt buộc nghỉ hồi phục: Chiến mã cần tối thiểu ${hours} giờ giãn cách giữa hai buổi tập để đảm bảo an toàn thể lực.`;
    }
    if (cleaned.includes("overlapping legacy workouts need a verified physical-track mapping")) {
      return "Buổi tập cần được gắn với một đường chạy thực tế cụ thể.";
    }
    if (cleaned.includes("Selected track is inactive or does not match the surface")) {
      return "Đường chạy đã chọn không hoạt động hoặc không khớp với loại mặt sân.";
    }
    if (cleaned.includes("Select a physical training track")) {
      return "Vui lòng chọn một đường chạy thực tế.";
    }
    if (cleaned.includes("This horse already has an overlapping workout")) {
      return "Chiến mã này đã có một buổi tập khác trong cùng khung giờ này.";
    }
    if (cleaned.includes("A horse can have at most 3 workouts per day")) {
      return "Mỗi chiến mã chỉ được tập tối đa 3 buổi mỗi ngày để bảo vệ sức khỏe tim mạch.";
    }

    const translated = tr(cleaned);
    // Nếu tr(cleaned) không dịch được mà chuỗi vẫn là tiếng Anh thuần, thử dịch các từ khóa phổ biến
    if (translated === cleaned && /^[A-Za-z0-9 ,.!?'-]+$/.test(cleaned) && cleaned.length > 5) {
      if (cleaned.toLowerCase().includes("conflict")) return "Đã xảy ra xung đột khung giờ hoặc tài nguyên huấn luyện.";
      if (cleaned.toLowerCase().includes("required")) return "Thiếu thông tin bắt buộc hoặc chưa thỏa mãn điều kiện.";
      if (cleaned.toLowerCase().includes("not allowed") || cleaned.toLowerCase().includes("forbidden")) return "Thao tác không được phép thực hiện.";
    }
    // Tuyệt đối không để lộ mã lỗi thô dạng MÃ_LỖI (VD: WORKOUT_REST_REQUIRED, TRAINER_TIME_CONFLICT) trên giao diện
    if (/^[A-Z0-9_]{3,}$/.test(translated.trim())) {
      return "Thao tác không thể hoàn tất do quy định hệ thống. Vui lòng kiểm tra lại.";
    }
    return translated;
  }
  return toEnglish(text);
}

// Dịch nếu là chuỗi, giữ nguyên nếu là phần tử React / số.
export function trNode<T>(node: T): T {
  return (typeof node === "string" ? tr(node) : node) as T;
}
