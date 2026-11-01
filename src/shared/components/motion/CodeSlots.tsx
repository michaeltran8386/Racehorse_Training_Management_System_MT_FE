import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { tr } from "@/shared/i18n/tr";
import styles from "./motion.module.css";

interface CodeSlotsProps {
  value: string; // chỉ gồm chữ số
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  status?: "idle" | "error" | "success";
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
}

// Ô mã OTP dạng "slot": một <input> thật phủ lên các ô (gõ, dán, tự điền one-time-code đều chạy như ô thường),
// các ô chỉ để hiển thị: chữ số nảy lò xo khi gõ, caret nhấp nháy ở ô đang chờ, viền đổi màu theo trạng thái.
export function CodeSlots({ value, onChange, onComplete, length = 6, status = "idle", disabled, autoFocus, describedBy }: CodeSlotsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const active = Math.min(value.length, length - 1);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function commit(raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  return (
    <div className={styles.slots} data-status={status} data-disabled={disabled || undefined}>
      <input
        ref={inputRef}
        className={styles.slotsInput}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        disabled={disabled}
        aria-label={tr("Verification code")}
        aria-invalid={status === "error" || undefined}
        aria-describedby={describedBy}
        onChange={(e) => commit(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Luôn đặt con trỏ ở cuối để gõ/xóa đúng thứ tự ô.
        onSelect={(e) => {
          const el = e.currentTarget;
          if (el.selectionStart !== el.value.length) el.setSelectionRange(el.value.length, el.value.length);
        }}
      />
      {digits.map((d, i) => {
        const isActive = focused && i === active && value.length < length;
        return (
          <div key={i} className={styles.slot} data-active={isActive || undefined} data-filled={d ? "" : undefined} aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              {d ? (
                <motion.span
                  key={`${i}-${d}`}
                  className={styles.slotDigit}
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 520, damping: 26 }}
                >
                  {d}
                </motion.span>
              ) : isActive ? (
                <span key="caret" className={styles.caret} />
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
