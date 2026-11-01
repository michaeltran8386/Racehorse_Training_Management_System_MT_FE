import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import type { HealthStatus } from "@/shared/types/enums";
import { Icon } from "./Icon";
import styles from "./StallGrid.module.css";
import { tr } from "@/shared/i18n/tr";

// Một ô chuồng có màu theo tình trạng sức khỏe của con ngựa bên trong, hoặc EMPTY khi chuồng trống.
export type StallStatus = HealthStatus | "EMPTY";

const STATE: Record<StallStatus, { cls: string; label: string }> = {
  ACTIVE: { cls: styles.fit, label: "Ready to Race" },
  FIT: { cls: styles.fit, label: "Fit" },
  IN_TRAINING: { cls: styles.fit, label: "In Training" },
  UNDER_OBSERVATION: { cls: styles.watch, label: "Under Observation" },
  INJURED: { cls: styles.injured, label: "Injured" },
  ISOLATED: { cls: styles.quarantine, label: "Isolated" },
  QUARANTINED: { cls: styles.quarantine, label: "Quarantined" },
  RESTING: { cls: styles.watch, label: "Resting" },
  RETIRED: { cls: styles.empty, label: "Retired" },
  EMPTY: { cls: styles.empty, label: "Empty stall" },
};

interface StallCellProps {
  code: string; // ví dụ A-02
  horse?: string;
  status?: StallStatus;
  task?: string; // việc đang chờ ở chuồng này
  selected?: boolean;
  onClick?: () => void;
}

export function StallCell({ code, horse, status = "EMPTY", task, selected, onClick }: StallCellProps) {
  const s = STATE[status];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${code} · ${s.label}`}
      className={cx(styles.cell, s.cls, selected && styles.selected, !onClick && styles.static)}
    >
      <span className={styles.top}>
        <span className={styles.code}>{code}</span>
        {status !== "EMPTY" && <span className={styles.dot} />}
      </span>
      <strong className={cx(styles.horse, status === "EMPTY" && styles.horseEmpty)}>{horse ?? tr("Empty")}</strong>
      {task && (
        <span className={styles.task}>
          <Icon name="broom" size={11} />
          {task}
        </span>
      )}
    </button>
  );
}

// Lưới các ô chuồng của một dãy chuồng (Barn A, Barn B).
export function StallGrid({ children, columns = 6 }: { children: ReactNode; columns?: number }) {
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

// Chú giải màu của sơ đồ chuồng.
export function StallLegend() {
  return (
    <div className={styles.legend}>
      {(Object.keys(STATE) as StallStatus[]).map((k) => (
        <span key={k} className={cx(styles.legendItem, STATE[k].cls)}>
          <span className={styles.swatch} />
          {STATE[k].label}
        </span>
      ))}
    </div>
  );
}
