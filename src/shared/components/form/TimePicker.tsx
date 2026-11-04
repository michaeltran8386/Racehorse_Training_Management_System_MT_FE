import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { useAppLanguage } from "@/shared/lib/language";
import styles from "./TimePicker.module.css";

export interface TimePickerProps {
  value?: string; // Format: "HH:mm" (24h)
  onChange?: (timeStr: string) => void;
  min?: string; // Format: "HH:mm"
  max?: string; // Format: "HH:mm"
  step?: number; // In seconds, e.g. 900 = 15 mins, default 5 mins (300) or 1 min (60)
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  invalid?: boolean;
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const COMMON_PRESETS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

export function TimePicker({
  value = "",
  onChange,
  min,
  max,
  step = 300,
  disabled = false,
  required = false,
  placeholder,
  className,
  id,
  style,
  invalid = false,
}: TimePickerProps) {
  const { isVietnamese } = useAppLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Position portal popover relative to button
  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (containerRef.current) {
        setRect(containerRef.current.getBoundingClientRect());
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // Parse current value
  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value || !value.includes(":")) return ["08", "00"];
    const clean = value.includes("T") ? value.split("T")[1] : value;
    const [h, m] = clean.split(":");
    return [padZero(Number(h) || 0), padZero(Number(m) || 0)];
  }, [value]);

  // Hours: 00 to 23
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => padZero(i));
  }, []);

  // Minutes step (default 5 min intervals if not specified, or 15 mins if step is 900)
  const minuteInterval = step >= 900 ? 15 : step >= 300 ? 5 : 1;
  const minutes = useMemo(() => {
    const list: string[] = [];
    for (let m = 0; m < 60; m += minuteInterval) {
      list.push(padZero(m));
    }
    // ensure selectedMinute is in the list if not divisible by interval
    if (value && !list.includes(selectedMinute)) {
      list.push(selectedMinute);
      list.sort((a, b) => Number(a) - Number(b));
    }
    return list;
  }, [minuteInterval, selectedMinute, value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Scroll to selected on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const hourEl = hourListRef.current?.querySelector(`[data-hour="${selectedHour}"]`) as HTMLElement;
        const minEl = minuteListRef.current?.querySelector(`[data-minute="${selectedMinute}"]`) as HTMLElement;
        hourEl?.scrollIntoView({ block: "center", behavior: "smooth" });
        minEl?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHour, selectedMinute]);

  const isTimeDisabled = (h: string, m: string) => {
    const timeStr = `${h}:${m}`;
    if (min && timeStr < min) return true;
    if (max && timeStr > max) return true;
    return false;
  };

  const handleSelectHour = (h: string) => {
    const newTime = `${h}:${selectedMinute}`;
    onChange?.(newTime);
  };

  const handleSelectMinute = (m: string) => {
    const newTime = `${selectedHour}:${m}`;
    onChange?.(newTime);
  };

  const handleSelectNow = () => {
    const d = new Date();
    const h = padZero(d.getHours());
    const m = padZero(Math.floor(d.getMinutes() / minuteInterval) * minuteInterval);
    const nowTime = `${h}:${m}`;
    onChange?.(nowTime);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
  };

  const handleSelectPreset = (preset: string) => {
    onChange?.(preset);
    setIsOpen(false);
  };

  const popoverHeight = 320;
  const popoverWidth = 280;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const up = rect != null && spaceBelow < popoverHeight && rect.top > spaceBelow;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8)) : 0;

  return (
    <div className={cx(styles.wrap, className)} style={style} ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-required={required}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cx(styles.inputBtn, invalid && styles.invalid)}
      >
        {value ? (
          <span className={styles.timeDisplay}>{value}</span>
        ) : (
          <span className={styles.placeholder}>
            {placeholder || (isVietnamese ? "Chọn giờ (HH:mm)" : "Select time (HH:mm)")}
          </span>
        )}
        <span className={styles.iconClock}>
          <Icon name="clock" size={17} />
        </span>
      </button>

      {isOpen && rect && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            zIndex: 9999,
            left: `${left}px`,
            ...(up
              ? { bottom: `${window.innerHeight - rect.top + 4}px` }
              : { top: `${rect.bottom + 4}px` }
            ),
          }}
        >
          {/* Header */}
          <div className={styles.popoverHeader}>
            <span className={styles.headerTitle}>{isVietnamese ? "Chọn giờ" : "Select Time"}</span>
            <span className={styles.currentTimePreview}>{value || `${selectedHour}:${selectedMinute}`}</span>
          </div>

          {/* Dual Columns: Hour & Minute */}
          <div className={styles.timeColumns}>
            <div className={styles.columnBlock}>
              <span className={styles.columnLabel}>{isVietnamese ? "Giờ" : "Hour"}</span>
              <div className={styles.columnList} ref={hourListRef}>
                {hours.map((h) => {
                  const isSel = h === selectedHour;
                  const isDis = min && max ? isTimeDisabled(h, "00") && isTimeDisabled(h, "59") : false;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      disabled={isDis}
                      onClick={() => handleSelectHour(h)}
                      className={cx(styles.timeItem, isSel && styles.timeItemSelected, isDis && styles.timeItemDisabled)}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.columnBlock}>
              <span className={styles.columnLabel}>{isVietnamese ? "Phút" : "Minute"}</span>
              <div className={styles.columnList} ref={minuteListRef}>
                {minutes.map((m) => {
                  const isSel = m === selectedMinute;
                  const isDis = isTimeDisabled(selectedHour, m);
                  return (
                    <button
                      key={m}
                      type="button"
                      data-minute={m}
                      disabled={isDis}
                      onClick={() => handleSelectMinute(m)}
                      className={cx(styles.timeItem, isSel && styles.timeItemSelected, isDis && styles.timeItemDisabled)}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className={styles.presetsRow}>
            {COMMON_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={styles.presetBtn}
                onClick={() => handleSelectPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.popoverFooter}>
            <button
              type="button"
              className={cx(styles.footerBtn, styles.btnClear)}
              onClick={handleClear}
            >
              {isVietnamese ? "Xóa" : "Clear"}
            </button>
            <div className={styles.footerRight}>
              <button
                type="button"
                className={cx(styles.footerBtn, styles.btnNow)}
                onClick={handleSelectNow}
              >
                {isVietnamese ? "Bây giờ" : "Now"}
              </button>
              <button
                type="button"
                className={cx(styles.footerBtn, styles.btnClose)}
                onClick={() => setIsOpen(false)}
              >
                {isVietnamese ? "Đóng" : "Close"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
