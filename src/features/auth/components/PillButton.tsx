import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/shared/lib/cx";
import styles from "./PillButton.module.css";

interface PillButtonProps {
  children: ReactNode;
  tone?: "primary" | "secondary" | "outline";
  type?: "button" | "submit";
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  /** Lý do nút đang khóa: hiện dưới nút cho người dùng biết phải làm gì. */
  blockedReason?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

// Nút dạng viên thuốc của các trang xác thực (usefull/01_login): phóng nhẹ khi rê, nhún khi bấm, spinner khi chờ.
export function PillButton({ children, tone = "primary", type = "button", loading, loadingLabel, disabled, blockedReason, icon, onClick }: PillButtonProps) {
  const off = Boolean(disabled || loading || blockedReason);
  return (
    <div className={styles.wrap}>
      <motion.button
        type={type}
        className={cx(styles.pill, styles[tone])}
        disabled={off}
        aria-busy={loading || undefined}
        whileHover={off ? undefined : { scale: 1.012 }}
        whileTap={off ? undefined : { scale: 0.988 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        onClick={onClick}
      >
        {loading ? (
          <>
            <Loader2 size={18} className={styles.spin} aria-hidden="true" />
            <span>{loadingLabel ?? children}</span>
          </>
        ) : (
          <>
            {icon}
            <span>{children}</span>
          </>
        )}
      </motion.button>
      {blockedReason && !loading && <p className={styles.reason}>{blockedReason}</p>}
    </div>
  );
}
