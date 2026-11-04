import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { cx } from "@/shared/lib/cx";
import { useAppLanguage } from "@/shared/lib/language";
import styles from "./DateTimePicker.module.css";

export interface DateTimePickerProps {
  value?: string; // Format: "YYYY-MM-DDTHH:mm"
  onChange?: (datetimeStr: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  highlightOverdue?: boolean;
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

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export function DateTimePicker({
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
}: DateTimePickerProps) {
  const { isVietnamese } = useAppLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"date" | "time">("date");
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

  // Split value into date and time
  const [datePart, timePart] = useMemo(() => {
    if (!value || !value.includes("T")) {
      const now = new Date();
      const dStr = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
      return [value || dStr, "08:00"];
    }
    const [d, t] = value.split("T");
    return [d, (t || "08:00").slice(0, 5)];
  }, [value]);

  const [selectedHour, selectedMinute] = useMemo(() => {
    const parts = (timePart || "08:00").split(":");
    return [padZero(Number(parts[0]) || 0), padZero(Number(parts[1]) || 0)];
  }, [timePart]);

  const parsedDate = useMemo(() => {
    if (!datePart) return null;
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    return null;
  }, [datePart]);

  const [viewYear, setViewYear] = useState(() => parsedDate?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedDate?.month ?? new Date().getMonth());
  const [prevValue, setPrevValue] = useState(value);

  // Keep view aligned when value changes externally
  if (value !== prevValue) {
    setPrevValue(value);
    if (parsedDate) {
      setViewYear(parsedDate.year);
      setViewMonth(parsedDate.month);
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

  const todayIso = useMemo(() => {
    const d = new Date();
    return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrent = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isOverdue: boolean;
      isDisabled: boolean;
    }> = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = daysInPrev - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = toIsoDate(prevYear, prevMonth, prevDay);
      days.push({
        dateStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        isSelected: dateStr === datePart,
        isOverdue: highlightOverdue && dateStr < todayIso,
        isDisabled: Boolean((min && dateStr < min.slice(0, 10)) || (max && dateStr > max.slice(0, 10))),
      });
    }

    for (let d = 1; d <= daysInCurrent; d++) {
      const dateStr = toIsoDate(viewYear, viewMonth, d);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayIso,
        isSelected: dateStr === datePart,
        isOverdue: highlightOverdue && dateStr < todayIso,
        isDisabled: Boolean((min && dateStr < min.slice(0, 10)) || (max && dateStr > max.slice(0, 10))),
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = toIsoDate(nextYear, nextMonth, i);
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        isSelected: dateStr === datePart,
        isOverdue: highlightOverdue && dateStr < todayIso,
        isDisabled: Boolean((min && dateStr < min.slice(0, 10)) || (max && dateStr > max.slice(0, 10))),
      });
    }

    return days;
  }, [viewYear, viewMonth, todayIso, datePart, min, max, highlightOverdue]);

  const handleSelectDay = (dateStr: string) => {
    const fullValue = `${dateStr}T${selectedHour}:${selectedMinute}`;
    onChange?.(fullValue);
    setActiveTab("time");
  };

  const handleSelectHour = (h: string) => {
    const fullValue = `${datePart || todayIso}T${h}:${selectedMinute}`;
    onChange?.(fullValue);
  };

  const handleSelectMinute = (m: string) => {
    const fullValue = `${datePart || todayIso}T${selectedHour}:${m}`;
    onChange?.(fullValue);
  };

  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
  };

  const handleSelectNow = () => {
    const d = new Date();
    const dateStr = toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    const timeStr = `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
    onChange?.(`${dateStr}T${timeStr}`);
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!value || !parsedDate) return "";
    return `${padZero(parsedDate.day)}/${padZero(parsedDate.month + 1)}/${parsedDate.year}, ${selectedHour}:${selectedMinute}`;
  }, [value, parsedDate, selectedHour, selectedMinute]);

  const monthLabel = isVietnamese
    ? `${MONTH_NAMES_VI[viewMonth]}, ${viewYear}`
    : `${MONTH_NAMES_EN[viewMonth]} ${viewYear}`;

  const popoverHeight = 380;
  const popoverWidth = 320;
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
          <span className={styles.displayValue}>{formattedDisplay}</span>
        ) : (
          <span className={styles.placeholder}>
            {placeholder || (isVietnamese ? "Chọn ngày & giờ" : "Select date & time")}
          </span>
        )}
        <span className={styles.iconCalendarClock}>
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
          {/* Tab Switcher */}
          <div className={styles.tabSwitch}>
            <button
              type="button"
              className={cx(styles.tabBtn, activeTab === "date" && styles.tabBtnActive)}
              onClick={() => setActiveTab("date")}
            >
              <Icon name="calendar" size={14} />
              <span>{isVietnamese ? "1. Ngày" : "1. Date"}</span>
            </button>
            <button
              type="button"
              className={cx(styles.tabBtn, activeTab === "time" && styles.tabBtnActive)}
              onClick={() => setActiveTab("time")}
            >
              <Icon name="clock" size={14} />
              <span>{isVietnamese ? "2. Giờ" : "2. Time"} ({selectedHour}:{selectedMinute})</span>
            </button>
          </div>

          {activeTab === "date" ? (
            <div>
              {/* Header */}
              <div className={styles.popoverHeader}>
                <span className={styles.monthLabel}>{monthLabel}</span>
                <div className={styles.navBtnGroup}>
                  <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
              </div>

              {/* Week header */}
              <div className={styles.weekHeader}>
                {(isVietnamese ? WEEK_DAYS_VI : WEEK_DAYS_EN).map((wd) => (
                  <span key={wd} className={styles.weekDay}>{wd}</span>
                ))}
              </div>

              {/* Days grid */}
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
                  >
                    {d.dayNum}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.timeSection}>
              <div>
                <div className={styles.timeColHeader}>{isVietnamese ? "Giờ" : "Hour"}</div>
                <div className={styles.timeList}>
                  {Array.from({ length: 24 }, (_, i) => padZero(i)).map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={cx(styles.timeItem, h === selectedHour && styles.timeItemSelected)}
                      onClick={() => handleSelectHour(h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={styles.timeColHeader}>{isVietnamese ? "Phút" : "Minute"}</div>
                <div className={styles.timeList}>
                  {Array.from({ length: 12 }, (_, i) => padZero(i * 5)).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cx(styles.timeItem, m === selectedMinute && styles.timeItemSelected)}
                      onClick={() => handleSelectMinute(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={styles.popoverFooter}>
            <button type="button" className={cx(styles.footerBtn, styles.btnClear)} onClick={handleClear}>
              {isVietnamese ? "Xóa" : "Clear"}
            </button>
            <div className={styles.footerRight}>
              <button type="button" className={cx(styles.footerBtn, styles.btnToday)} onClick={handleSelectNow}>
                {isVietnamese ? "Hiện tại" : "Now"}
              </button>
              <button type="button" className={cx(styles.footerBtn, styles.btnClose)} onClick={() => setIsOpen(false)}>
                {isVietnamese ? "Xong" : "Done"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
