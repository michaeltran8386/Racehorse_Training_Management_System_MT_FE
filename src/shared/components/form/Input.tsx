import { useState } from "react";
import type { InputHTMLAttributes, ChangeEvent, MouseEvent } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { useFieldControl } from "./Field";
import styles from "./Control.module.css";
import { tr } from "@/shared/i18n/tr";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";
import { DateTimePicker } from "./DateTimePicker";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  invalid?: boolean;
  numeric?: boolean;
  nativePicker?: boolean;
  highlightOverdue?: boolean;
}

export function Input({
  icon,
  invalid,
  numeric,
  className,
  id,
  type,
  placeholder,
  onClick,
  nativePicker = false,
  highlightOverdue = true,
  ...rest
}: InputProps) {
  const field = useFieldControl();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  // Helper to build synthetic ChangeEvent for custom pickers
  const createSyntheticChangeEvent = (newVal: string): ChangeEvent<HTMLInputElement> => {
    return {
      target: {
        name: rest.name || "",
        value: newVal,
        id: id ?? field?.id ?? "",
      },
      currentTarget: {
        name: rest.name || "",
        value: newVal,
        id: id ?? field?.id ?? "",
      },
      bubbles: true,
      cancelable: false,
      defaultPrevented: false,
      stopPropagation: () => {},
      preventDefault: () => {},
      persist: () => {},
      nativeEvent: new Event("change"),
      type: "change",
    } as unknown as ChangeEvent<HTMLInputElement>;
  };

  // 1. Custom DatePicker delegation
  if (type === "date" && !nativePicker) {
    const handleDateChange = (dateStr: string) => {
      rest.onChange?.(createSyntheticChangeEvent(dateStr));
    };

    const valStr = typeof rest.value === "string" 
      ? rest.value 
      : rest.value !== undefined && rest.value !== null 
        ? String(rest.value) 
        : rest.defaultValue !== undefined && rest.defaultValue !== null 
          ? String(rest.defaultValue) 
          : "";

    return (
      <DatePicker
        id={id ?? field?.id}
        value={valStr}
        onChange={handleDateChange}
        min={typeof rest.min === "string" ? rest.min : undefined}
        max={typeof rest.max === "string" ? rest.max : undefined}
        disabled={rest.disabled || rest.readOnly}
        required={rest.required}
        placeholder={placeholder === undefined ? undefined : tr(placeholder)}
        className={className}
        style={rest.style}
        invalid={isInvalid}
        highlightOverdue={highlightOverdue}
      />
    );
  }

  // 2. Custom TimePicker delegation
  if (type === "time" && !nativePicker) {
    const handleTimeChange = (timeStr: string) => {
      rest.onChange?.(createSyntheticChangeEvent(timeStr));
    };

    const valStr = typeof rest.value === "string" 
      ? rest.value 
      : rest.value !== undefined && rest.value !== null 
        ? String(rest.value) 
        : rest.defaultValue !== undefined && rest.defaultValue !== null 
          ? String(rest.defaultValue) 
          : "";

    const stepNum = typeof rest.step === "number" 
      ? rest.step 
      : typeof rest.step === "string" 
        ? Number(rest.step) || undefined 
        : undefined;

    return (
      <TimePicker
        id={id ?? field?.id}
        value={valStr}
        onChange={handleTimeChange}
        min={typeof rest.min === "string" ? rest.min : undefined}
        max={typeof rest.max === "string" ? rest.max : undefined}
        step={stepNum}
        disabled={rest.disabled || rest.readOnly}
        required={rest.required}
        placeholder={placeholder === undefined ? undefined : tr(placeholder)}
        className={className}
        style={rest.style}
        invalid={isInvalid}
      />
    );
  }

  // 3. Custom DateTimePicker delegation
  if (type === "datetime-local" && !nativePicker) {
    const handleDateTimeChange = (dtStr: string) => {
      rest.onChange?.(createSyntheticChangeEvent(dtStr));
    };

    const valStr = typeof rest.value === "string" 
      ? rest.value 
      : rest.value !== undefined && rest.value !== null 
        ? String(rest.value) 
        : rest.defaultValue !== undefined && rest.defaultValue !== null 
          ? String(rest.defaultValue) 
          : "";

    return (
      <DateTimePicker
        id={id ?? field?.id}
        value={valStr}
        onChange={handleDateTimeChange}
        min={typeof rest.min === "string" ? rest.min : undefined}
        max={typeof rest.max === "string" ? rest.max : undefined}
        disabled={rest.disabled || rest.readOnly}
        required={rest.required}
        placeholder={placeholder === undefined ? undefined : tr(placeholder)}
        className={className}
        style={rest.style}
        invalid={isInvalid}
        highlightOverdue={highlightOverdue}
      />
    );
  }

  // Fallback for native inputs
  const isPickerType = type === "month";

  const handleClick = (e: MouseEvent<HTMLInputElement>) => {
    if (isPickerType && !rest.disabled && !rest.readOnly) {
      try {
        e.currentTarget.showPicker?.();
      } catch {
        // Safe ignore if unsupported or already visible
      }
    }
    onClick?.(e);
  };

  const input = (
    <input
      id={id ?? field?.id}
      type={isPassword ? (visible ? "text" : "password") : type}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      className={cx(
        styles.control,
        icon && styles.withIcon,
        isPassword && styles.withToggle,
        numeric && styles.numeric,
        isInvalid && styles.invalid,
        isPickerType && styles.pickerInput,
        className,
      )}
      placeholder={placeholder === undefined ? undefined : tr(placeholder)}
      onClick={handleClick}
      {...rest}
    />
  );

  if (!icon && !isPassword) return input;
  return (
    <div className={styles.wrap}>
      {icon && (
        <span className={styles.icon}>
          <Icon name={icon} size={15} />
        </span>
      )}
      {input}
      {isPassword && (
        <button
          type="button"
          className={styles.toggle}
          disabled={rest.disabled}
          onClick={() => setVisible((v) => !v)}
          aria-label={tr(visible ? "Hide password" : "Show password")}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={15} />
        </button>
      )}
    </div>
  );
}
