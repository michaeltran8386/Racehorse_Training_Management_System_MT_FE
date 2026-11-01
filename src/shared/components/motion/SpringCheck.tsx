import { motion } from "motion/react";
import { useId } from "react";
import styles from "./motion.module.css";

interface SpringCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Gạch ngang nhãn khi chọn (dùng cho checklist); trang xác thực để "none". */
  strike?: "none" | "line";
  boxSize?: number;
}

// Ô chọn có dấu tích vẽ nét + nảy lò xo. Dùng <input type="checkbox"> thật để giữ bàn phím và trình đọc màn hình.
// prefers-reduced-motion: MotionConfig reducedMotion="user" (AuthLayout) tắt nảy/scale, chỉ còn mờ dần.
export function SpringCheck({ checked, onChange, label, disabled, strike = "none", boxSize = 20 }: SpringCheckProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={styles.check} data-disabled={disabled || undefined}>
      <input id={id} type="checkbox" className={styles.checkInput} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <motion.span
        className={styles.checkBox}
        data-checked={checked || undefined}
        style={{ width: boxSize, height: boxSize }}
        animate={{ scale: checked ? [1, 0.86, 1.08, 1] : 1 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width={boxSize - 6} height={boxSize - 6} fill="none">
          <motion.path
            d="M5 12.5l4.2 4.2L19 7"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          />
        </svg>
      </motion.span>
      <span className={styles.checkLabel} data-strike={strike === "line" && checked ? "" : undefined}>
        {label}
      </span>
    </label>
  );
}
