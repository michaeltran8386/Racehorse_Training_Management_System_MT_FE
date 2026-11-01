// Icon riêng cho những tên Lucide không có (Lucide chưa có glyph ngựa). Các icon còn lại lấy từ lucide-react trong Icon.tsx.
// Giá trị là chuỗi SVG cố định do nhóm viết (KHÔNG chứa dữ liệu người dùng) nên an toàn khi render bằng dangerouslySetInnerHTML.
export const iconPaths: Record<string, string> = {
  horse: '<path d="M7.6 21c0-3.6 1.3-5.9 3.5-7.6l-2.7.9c-1.6.5-3-1-2.4-2.6l1.8-4.3C8.9 4.7 10.9 3.3 13.1 3V1.6l3.2 2.2c2.4 1.7 3.7 4.4 3.7 7.4 0 3.8-1.2 6.7-2.1 9.8"/><path d="M6 21h12.5"/><circle cx="12.4" cy="8.6" r=".6" fill="currentColor" stroke="none"/>',
};
