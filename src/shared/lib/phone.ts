// Số di động Việt Nam lưu dạng nội địa 10 chữ số (03/05/07/08/09), khớp kiểm tra ở BE.
export const VN_PHONE_RE = /^0[35789]\d{8}$/;

// BUG-MAN-02: người dùng hay dán "+84 983 989 059" hoặc "84983989059"; đổi về "0983989059" thay vì báo lỗi.
export function normalizeVnPhone(raw: string): string {
  const compact = raw.replace(/[\s.\-()]/g, "");
  const intl = compact.match(/^(?:\+|00)?84(\d{9})$/);
  return intl ? `0${intl[1]}` : compact;
}
