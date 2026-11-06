import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import type { BadgeTone } from "@/shared/lib/status";
import { Icon } from "./Icon";
import styles from "./Badge.module.css";
import { trNode } from "@/shared/i18n/tr";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: string;
  title?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, icon, title, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone])} title={title}>
      {icon ? <Icon name={icon} size={12} /> : dot && <span className={styles.dot} />}
      {trNode(children)}
    </span>
  );
}
