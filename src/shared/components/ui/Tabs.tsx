import { cx } from "@/shared/lib/cx";
import styles from "./Tabs.module.css";
import { tr, trNode } from "@/shared/i18n/tr";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  dot?: boolean; // chấm báo có việc mới (không kèm số)
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label?: string;
}

// Thanh tab: tab đang mở có gạch chân màu brand. Hỗ trợ phím ← → để đổi tab.
export function Tabs<T extends string>({ items, active, onChange, label = "Filter" }: TabsProps<T>) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const index = items.findIndex((t) => t.id === active);
    const nextIndex = (index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
    const next = items[nextIndex];
    onChange(next.id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
    e.preventDefault();
  }

  return (
    <div role="tablist" aria-label={tr(label)} className={styles.tabs} onKeyDown={onKeyDown}>
      {items.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(styles.tab, on && styles.on)}
          >
            {trNode(t.label)}
            {t.count != null && <span className={styles.count}>{t.count}</span>}
            {t.dot && <span className={styles.dot} aria-label={tr("New")} />}
          </button>
        );
      })}
    </div>
  );
}
