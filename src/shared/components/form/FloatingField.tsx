import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { tr, trNode } from "@/shared/i18n/tr";
import styles from "./FloatingField.module.css";

interface FloatingFieldProps {
  label: string; // đã qua tr()
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  error?: string; // câu tiếng Anh hoặc đã dịch; tự qua tr()
  hint?: string;
  isValid?: boolean;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

// Ô nhập nhãn nổi theo mẫu usefull/01_login (nhãn thu nhỏ lên trên khi focus/có giá trị),
// biểu tượng trạng thái (lỗi / hợp lệ) nảy lò xo, lỗi trượt xuống dưới ô, nút hiện/ẩn mật khẩu.
export function FloatingField({
  label, value, onChange, type = "text", error, hint, isValid, required, disabled, maxLength, autoComplete, autoFocus, inputMode, onBlur, onKeyDown, onKeyUp,
}: FloatingFieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(error);
  const showValid = !hasError && Boolean(isValid) && value.length > 0;
  const isPassword = type === "password";

  return (
    <div className={styles.field}>
      <div
        className={styles.box}
        data-floating={focused || value.length > 0 || undefined}
        data-focused={focused || undefined}
        data-error={hasError || undefined}
        data-valid={(showValid && !focused) || undefined}
        data-disabled={disabled || undefined}
        data-trailing={(isPassword ? 1 : 0) + (hasError || showValid ? 1 : 0)}
      >
        <input
          id={id}
          className={styles.input}
          type={isPassword && visible ? "text" : type}
          value={value}
          placeholder=" "
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>

        <div className={styles.trailing}>
          <AnimatePresence mode="wait" initial={false}>
            {hasError ? (
              <motion.span
                key="error"
                className={styles.statusError}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                aria-hidden="true"
              >
                <AlertCircle size={18} strokeWidth={2.2} />
              </motion.span>
            ) : showValid ? (
              <motion.span
                key="valid"
                className={styles.statusValid}
                initial={{ opacity: 0, scale: 0.5, rotate: 10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                aria-hidden="true"
              >
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </motion.span>
            ) : null}
          </AnimatePresence>

          {isPassword && (
            <button
              type="button"
              className={styles.eye}
              aria-label={visible ? tr("Hide password") : tr("Show password")}
              aria-pressed={visible}
              disabled={disabled}
              // Giữ focus ở ô nhập khi bấm nút mắt.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVisible((v) => !v)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={visible ? "open" : "closed"}
                  initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  style={{ display: "inline-flex" }}
                >
                  {visible ? <Eye size={19} strokeWidth={2} /> : <EyeOff size={19} strokeWidth={2} />}
                </motion.span>
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasError ? (
          <motion.div
            key="error"
            id={messageId}
            className={styles.error}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <AlertCircle size={14} aria-hidden="true" />
            <span>{trNode(error ?? "")}</span>
          </motion.div>
        ) : hint ? (
          <motion.div key="hint" id={messageId} className={styles.hint} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {trNode(hint)}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
