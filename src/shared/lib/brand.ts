// ============================================================================
// TÊN VÀ THÔNG TIN THƯƠNG HIỆU — SỬA Ở ĐÂY LÀ ĐỔI TOÀN BỘ ỨNG DỤNG
// ============================================================================
// Mọi nơi hiện tên câu lạc bộ (logo góc trái, trang đăng nhập, hộp thoại đăng xuất)
// đều đọc từ file này. Không gõ tên thẳng vào màn hình.

export const BRAND = {
  /** Tên ngắn, hiện cạnh logo ở thanh menu bên trái. */
  name: "TMEC",

  /** Tên viết tắt, hiện to ở trang đăng nhập / đăng ký. */
  shortName: "TMEC",

  /** Tên đầy đủ, hiện nhỏ bên dưới tên viết tắt. */
  fullName: "THIEN MA EQUESTRIAN CLUB",

  /** Bản rút gọn của tên đầy đủ, dùng ở thanh menu cho vừa chỗ. */
  fullNameShort: "THIEN MA",

  /** Câu giới thiệu ở cột ảnh bên phải trang đăng nhập (bản màn hình hẹp). */
  tagline: "Every horse. One journey forward.",

  /** Đường dẫn file logo trong thư mục public/images/. */
  logo: "/images/logo-fivegates.svg",

  /** Tên miền email duy nhất hệ thống chấp nhận (bắt buộc, không chỉ là gợi ý). */
  emailDomain: "gmail.com",

  /** Thông tin hỗ trợ ở chân trang đăng nhập. */
  supportEmail: "support@tmec.site",
  supportPhone: "024 3771 2088",
} as const;

/** Gợi ý mẫu trong ô nhập email, ví dụ "name@gmail.com". */
export const EMAIL_PLACEHOLDER = `name@${BRAND.emailDomain}`;
