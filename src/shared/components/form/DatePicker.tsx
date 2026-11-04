import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { useAppLanguage } from "@/shared/lib/language";
import styles from "./DatePicker.module.css";

export interface DatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (dateStr: string) => void;
  min?: string; // Format: "YYYY-MM-DD"
  max?: string; // Format: "YYYY-MM-DD"
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  highlightOverdue?: boolean; // Highlight past dates in red
  invalid?: boolean;
}

const MONTH_NAMES_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEK_DAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIsoString(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export function DatePicker({
  value = "",
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  placeholder,
  className,
  id,
  style,
  highlightOverdue = true,
  invalid = false,
}: DatePickerProps) {
  const { isVietnamese } = useAppLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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

  // Today ISO
  const today = useMemo(() => {
    const d = new Date();
    return toIsoString(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Selected date components
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const cleanVal = value.includes("T") ? value.split("T")[0] : value;
    const parts = cleanVal.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    return null;
  }, [value]);

  // Current view month & year in popover
  const [viewYear, setViewYear] = useState(() => parsedValue?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValue?.month ?? new Date().getMonth());
  const [prevValue, setPrevValue] = useState(value);

  // Keep view aligned when value changes externally
  if (value !== prevValue) {
    setPrevValue(value);
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }

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

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar matrix (Monday start: 0 = Mon, 6 = Sun)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isOverdue: boolean;
      isDisabled: boolean;
    }> = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = toIsoString(prevYear, prevMonth, prevDay);
      days.push({
        dateStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        isToday: dateStr === today,
        isSelected: dateStr === value,
        isOverdue: highlightOverdue && dateStr < today,
        isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = toIsoString(viewYear, viewMonth, day);
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === today,
        isSelected: dateStr === value,
        isOverdue: highlightOverdue && dateStr < today,
        isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
      });
    }

    // Next month padding to fill grid to 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = toIsoString(nextYear, nextMonth, i);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === today,
        isSelected: dateStr === value,
        isOverdue: highlightOverdue && dateStr < today,
        isDisabled: Boolean((min && dateStr < min) || (max && dateStr > max)),
      });
    }

    return days;
  }, [viewYear, viewMonth, today, value, min, max, highlightOverdue]);

  // Select day
  const handleSelectDay = (dateStr: string) => {
    onChange?.(dateStr);
    setIsOpen(false);
  };

  // Clear action
  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
  };

  // Quick action Today
  const handleSelectToday = () => {
    const [y, m] = today.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    if (!min || today >= min) {
      if (!max || today <= max) {
        onChange?.(today);
        setIsOpen(false);
      }
    }
  };

  // Formatted display in input: "DD/MM/YYYY"
  const formattedDisplay = useMemo(() => {
    if (!parsedValue) return "";
    return `${padZero(parsedValue.day)}/${padZero(parsedValue.month + 1)}/${parsedValue.year}`;
  }, [parsedValue]);

  const monthLabel = isVietnamese
    ? `${MONTH_NAMES_VI[viewMonth]}, ${viewYear}`
    : `${MONTH_NAMES_EN[viewMonth]} ${viewYear}`;

  const popoverHeight = 340;
  const popoverWidth = 310;
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
        {formattedDisplay ? (
          <span className={styles.dateDisplay}>{formattedDisplay}</span>
        ) : (
          <span className={styles.placeholder}>
            {placeholder || (isVietnamese ? "Chọn ngày (DD/MM/YYYY)" : "Select date (DD/MM/YYYY)")}
          </span>
        )}
        <span className={styles.iconCalendar}>
          <Icon name="calendar" size={17} />
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
            <span className={styles.monthLabel}>{monthLabel}</span>
            <div className={styles.navBtnGroup}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={handlePrevMonth}
                aria-label={isVietnamese ? "Tháng trước" : "Previous month"}
              >
                <Icon name="chevronLeft" size={14} />
              </button>
              <button
                type="button"
                className={styles.navBtn}
                onClick={handleNextMonth}
                aria-label={isVietnamese ? "Tháng sau" : "Next month"}
              >
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
          </div>

          {/* Week Days Header */}
          <div className={styles.weekHeader}>
            {(isVietnamese ? WEEK_DAYS_VI : WEEK_DAYS_EN).map((wd) => (
              <span key={wd} className={styles.weekDay}>
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className={styles.daysGrid}>
            {calendarDays.map((d) => (
              <button
                key={d.dateStr}
                type="button"
                disabled={d.isDisabled}
                onClick={() => handleSelectDay(d.dateStr)}
                className={cx(
                  styles.dayCell,
                  !d.isCurrentMonth && styles.otherMonth,
                  d.isToday && styles.today,
                  d.isSelected && styles.selected,
                  d.isOverdue && styles.overdue,
                  d.isDisabled && styles.disabled,
                )}
                title={
                  d.isOverdue
                    ? isVietnamese
                      ? `${d.dateStr} (Đã qua)`
                      : `${d.dateStr} (Past date)`
                    : d.dateStr
                }
              >
                {d.dayNum}
              </button>
            ))}
          </div>

          {/* Footer Actions */}
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
                className={cx(styles.footerBtn, styles.btnToday)}
                onClick={handleSelectToday}
              >
                {isVietnamese ? "Hôm nay" : "Today"}
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
