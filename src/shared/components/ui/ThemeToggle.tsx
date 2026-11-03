import type { ButtonHTMLAttributes } from "react";
import { useTheme } from "@/shared/lib/theme";
import { useAppLanguage } from "@/shared/lib/language";
import { cx } from "@/shared/lib/cx";
import { Icon } from "./Icon";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  className?: string;
}

/**
 * Nút chuyển đổi Theme (Sáng / Tối) với hiệu ứng animation:
 * - Khi chuyển sang Tối: Màn sáng thu trọn về nút nhấn.
 * - Khi chuyển sang Sáng: Màn sáng bung toả từ nút nhấn ra toàn màn hình.
 * - Icon bên trong nút xoay chuyển và co giãn mượt mà.
 */
export function ThemeToggle({ className, ...rest }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const { t } = useAppLanguage();
  const isDark = theme === "dark";

  const label = isDark
    ? t("topbar.themeToggleLight", "Switch to light mode")
    : t("topbar.themeToggleDark", "Switch to dark mode");

  return (
    <button
      type="button"
      data-theme-toggle="true"
      aria-label={label}
      title={label}
      onClick={(e) => toggle(e)}
      className={cx(styles.toggleBtn, className)}
      {...rest}
    >
      <span className={styles.iconContainer} aria-hidden="true">
        <span className={styles.sunIcon}>
          <Icon name="sun" size={20} strokeWidth={2} />
        </span>
        <span className={styles.moonIcon}>
          <Icon name="moon" size={19} strokeWidth={2} />
        </span>
      </span>
      <span className={styles.haloRing} aria-hidden="true" />
    </button>
  );
}
