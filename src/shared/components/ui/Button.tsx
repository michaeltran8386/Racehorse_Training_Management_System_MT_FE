import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "@/shared/lib/cx";
import { DisabledHint } from "./DisabledHint";
import { Icon } from "./Icon";
import styles from "./Button.module.css";
import { trNode } from "@/shared/i18n/tr";

type Tone = "primary" | "secondary" | "ghost" | "quiet" | "danger" | "accent" | "dark" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  icon?: string;
  iconAfter?: string;
  block?: boolean;
  // Có lý do => nút bị chặn: mờ đi, không bấm được, nhưng vẫn focus được và hiện tooltip giải thích.
  blockedReason?: string;
}

const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 18 };

export function Button({
  tone = "primary",
  size = "md",
  icon,
  iconAfter,
  block,
  blockedReason,
  disabled,
  type = "button",
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const blocked = Boolean(blockedReason);
  const off = Boolean(disabled) || blocked;

  // Nút bị chặn dùng aria-disabled (chứ không dùng thuộc tính disabled) để bàn phím vẫn focus được và đọc được lý do.
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (off) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const button = (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={off || undefined}
      onClick={handleClick}
      className={cx(styles.btn, styles[tone], styles[size], block && styles.block, off && styles.off, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {trNode(children)}
      {iconAfter && <Icon name={iconAfter} size={ICON_SIZE[size]} />}
      {blocked && <span className="sr-only">{`Unavailable: ${trNode(blockedReason)}`}</span>}
    </button>
  );

  return (
    <DisabledHint reason={trNode(blockedReason)} block={block}>
      {button}
    </DisabledHint>
  );
}

interface LinkButtonProps {
  to: string;
  tone?: Tone;
  size?: Size;
  icon?: string;
  children: ReactNode;
}

// Link điều hướng trông như nút (thay cho <Link><Button/></Link> — nút lồng trong link là HTML sai).
export function LinkButton({ to, tone = "secondary", size = "md", icon, children }: LinkButtonProps) {
  return (
    <Link to={to} className={cx(styles.btn, styles[tone], styles[size], styles.link)}>
      {icon && <Icon name={icon} size={ICON_SIZE[size]} />}
      {trNode(children)}
    </Link>
  );
}
