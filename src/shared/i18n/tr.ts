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
    out.push({ re: new RegExp(`^${source}$`, "s"), names, vi });
  }
  return out;
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

// Dịch nếu là chuỗi, giữ nguyên nếu là phần tử React / số.
export function trNode<T>(node: T): T {
  return (typeof node === "string" ? tr(node) : node) as T;
}
