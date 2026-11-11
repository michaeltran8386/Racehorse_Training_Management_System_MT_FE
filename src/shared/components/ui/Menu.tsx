import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { cx } from "@/shared/lib/cx";
import { Icon } from "./Icon";
import styles from "./Menu.module.css";
import { trNode } from "@/shared/i18n/tr";

export interface MenuItem {
  label: string;
  icon?: string;
  to?: string; // có `to` => mục là link điều hướng
  onSelect?: () => void;
  danger?: boolean; // hành động phá hủy: chữ màu critical, nên đặt cuối danh sách
  divider?: boolean; // kẻ ngang phía trên mục này
  hidden?: boolean;
  disabledReason?: string; // có lý do => mục hiện mờ, không chọn được, lý do đọc được bằng trình đọc màn hình
}

interface MenuProps {
  label: string; // tên cho trình đọc màn hình, vd "Actions for Thunderbolt Swift"
  items: MenuItem[];
  trigger?: "dots" | "button";
  buttonText?: string; // khi trigger = "button"
  align?: "left" | "right";
}

// Menu thao tác: một nút mở danh sách hành động (thay cho hàng nút dàn ngang).
// Dùng createPortal để không bao giờ bị tràn bảng cắt mất (overflow clipping)
// hoặc bị hàng sau đè lên (stacking context).
// Đóng khi bấm ra ngoài, Esc hoặc chọn một mục; phím ↑ ↓ di chuyển giữa các mục.
export function Menu({ label, items, trigger = "dots", buttonText = "More", align = "right" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const menuId = useId();
  const visible = items.filter((i) => !i.hidden);

  const updatePosition = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setOpen(false);
      } else {
        setRect(r);
      }
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[role=menuitem]");
    first?.focus();

    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onScroll(e: Event) {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      updatePosition();
    }

    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    if (nodes.length === 0) return;
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    const next = nodes[(i + (e.key === "ArrowDown" ? 1 : nodes.length - 1)) % nodes.length];
    next?.focus();
    e.preventDefault();
  }

  if (visible.length === 0) return null;

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const up = rect != null && spaceBelow < 220 && rect.top > spaceBelow;

  const posStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
  };
  if (rect) {
    if (up) {
      posStyle.bottom = `${Math.max(8, window.innerHeight - rect.top + 4)}px`;
      posStyle.top = "auto";
    } else {
      posStyle.top = `${Math.max(8, rect.bottom + 4)}px`;
      posStyle.bottom = "auto";
    }
    if (align === "left") {
      posStyle.left = `${Math.max(8, rect.left)}px`;
      posStyle.right = "auto";
    } else {
      posStyle.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      posStyle.left = "auto";
    }
  }

  return (
    <div ref={wrapRef} className={styles.wrap} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={trigger === "dots" ? trNode(label) : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((v) => {
            if (!v && buttonRef.current) {
              setRect(buttonRef.current.getBoundingClientRect());
            }
            return !v;
          });
        }}
        className={cx(trigger === "dots" ? styles.dots : styles.button, open && styles.on)}
      >
        {trigger === "dots" ? (
          <Icon name="more" size={18} />
        ) : (
          <>
            {trNode(buttonText)}
            <Icon name="chevronDown" size={16} />
          </>
        )}
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={trNode(label)}
            className={cx(styles.menu, align === "left" && styles.left)}
            style={posStyle}
            onKeyDown={onKeyDown}
          >
            {visible.map((it) => (
              <div key={trNode(it.label)}>
                {it.divider && <div className={styles.divider} role="separator" />}
                {it.to ? (
                  <Link
                    role="menuitem"
                    to={it.to}
                    className={cx(styles.item, it.danger && styles.danger)}
                    onClick={() => setOpen(false)}
                  >
                    {it.icon && <Icon name={it.icon} size={16} />}
                    {trNode(it.label)}
                  </Link>
                ) : (
                  <button
                    role="menuitem"
                    type="button"
                    aria-disabled={it.disabledReason ? true : undefined}
                    title={trNode(it.disabledReason)}
                    className={cx(styles.item, it.danger && styles.danger, it.disabledReason && styles.off)}
                    onClick={() => {
                      if (it.disabledReason) return;
                      setOpen(false);
                      it.onSelect?.();
                    }}
                  >
                    {it.icon && <Icon name={it.icon} size={16} />}
                    <span className={styles.itemText}>
                      {trNode(it.label)}
                      {it.disabledReason && <span className={styles.reason}>{trNode(it.disabledReason)}</span>}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
