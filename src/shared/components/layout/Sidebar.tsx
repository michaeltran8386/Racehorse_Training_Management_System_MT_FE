import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { BRAND } from "@/shared/lib/brand";
import { cx } from "@/shared/lib/cx";
import { capitalize, initials } from "@/shared/lib/format";
import { isNavItemActive, sidebarNavFor, ROLE_LABEL } from "@/shared/lib/permissions";
import { useAppLanguage } from "@/shared/lib/language";
import { healthApi } from "@/features/health/api";
import { subscribeNotifications } from "@/shared/lib/notifications";
import type { AuthUser } from "@/shared/types/auth";
import type { SidebarNote } from "./useSidebarInfo";
import styles from "./Sidebar.module.css";

import { tr } from "@/shared/i18n/tr";
interface SidebarProps {
  user: AuthUser;
  pathname: string;
  note: SidebarNote | null;
  accountsAlert: boolean;
  open: boolean; // chỉ có ý nghĩa ở màn hình hẹp (menu trượt ra)
  onNavigate: () => void;
}

// Sidebar xây từ danh sách quyền của tài khoản, không chỉ từ tên vai trò:
// thu hồi quyền => mục tương ứng biến mất ở lần tải trang kế tiếp.
export function Sidebar({ user, pathname, note, accountsAlert, open, onNavigate }: SidebarProps) {
  const { t, isVietnamese } = useAppLanguage();
  const groups = sidebarNavFor(user.role, user.permissions);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [hasActiveLocks, setHasActiveLocks] = useState(false);
  const canViewLocks = Boolean(user.permissions.viewMedical);

  // Chấm đỏ cạnh Training Locks: có ít nhất 1 khóa đang hiệu lực (đọc từ API; lỗi thì không hiện chấm).
  useEffect(() => {
    if (!canViewLocks) return;
    let cancelled = false;
    const updateLocks = () => {
      healthApi.hasActiveLocks()
        .then((hasLocks) => {
          if (!cancelled) setHasActiveLocks(hasLocks);
        })
        .catch(() => {
          // Giữ trạng thái cũ, lần cập nhật sau thử lại.
        });
    };

    updateLocks();
    // Có thông báo mới (VD vừa đặt/gỡ khóa) => đọc lại; dữ liệu mock phát "horsesUpdated".
    const offNotifications = subscribeNotifications(updateLocks);
    window.addEventListener("horsesUpdated", updateLocks);
    return () => {
      cancelled = true;
      offNotifications();
      window.removeEventListener("horsesUpdated", updateLocks);
    };
  }, [canViewLocks]);

  const [clickedId, setClickedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("equiflow_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("equiflow_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleItemClick = (id: string) => {
    setClickedId(id);
    setTimeout(() => {
      setClickedId((prev) => (prev === id ? null : prev));
    }, 550);
    onNavigate();
  };

  return (
    <nav
      aria-label={tr("Main navigation")}
      className={cx(styles.nav, open && styles.open, collapsed && styles.collapsed)}
    >
      <div className={styles.brand}>
        <button
          type="button"
          onClick={toggleCollapse}
          className={styles.collapseBtn}
          aria-label={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
          title={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>

        <div className={styles.brandInfo}>
          <span className={styles.logo}>
            <img src={BRAND.logo} alt="" width={24} height={24} />
          </span>
          <div className={styles.brandText}>
            <strong>{BRAND.name}</strong>
            <span>{BRAND.fullNameShort}</span>
          </div>
        </div>
      </div>

      <div className={styles.groups}>
        {groups.map((g) => {
          const rawKey = g.label.toLowerCase().replace(/\s+/g, "_");
          const isWorkspace = g.label === "WORKSPACE";
          const groupTitle = isWorkspace ? "" : t(`nav.group_${rawKey}`, t(`nav.${rawKey}`, capitalize(g.label)));
          const groupKey = user.role + ":" + rawKey;
          const groupId = "sidebar-group-" + rawKey;
          const expanded = !closedGroups[groupKey];
          return (
            <div key={g.label} className={styles.group}>
              {groupTitle && (
                <button
                  type="button"
                  className={styles.groupToggle}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => setClosedGroups((previous) => ({ ...previous, [groupKey]: !previous[groupKey] }))}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="m6 4 4 4-4 4" />
                  </svg>
                  {groupTitle}
                </button>
              )}
              <div id={groupId} className={cx(groupTitle && styles.groupItems, groupTitle && !expanded && styles.groupClosed)}>
                {g.items.map((it) => {
                  const active = isNavItemActive(it, pathname);
                  const isClicked = clickedId === it.id;
                  const showAlertDot =
                    (it.id === "locks" && hasActiveLocks) || (it.id === "accounts" && accountsAlert) || Boolean(it.alert);
                  const itemKey = it.i18nKey || it.id;
                  const itemLabel = isVietnamese ? t(`nav.${itemKey}`, it.label) : it.label;
                  return (
                    <Link
                      key={it.id}
                      to={it.href}
                      onClick={() => handleItemClick(it.id)}
                      aria-current={active ? "page" : undefined}
                      className={cx(styles.item, active && styles.active, isClicked && styles.itemClicked)}
                      title={itemLabel}
                    >
                      {active && <span className={styles.activePill} aria-hidden="true" />}
                      <span className={cx(styles.iconWrapper, isClicked && styles.iconBounce)}>
                        <Icon name={it.icon} size={18} />
                      </span>
                      <span className={styles.itemLabel}>{itemLabel}</span>
                      {showAlertDot && <span className={cx(styles.dot, styles.alertDot)} aria-label={tr("Action required")} />}
                      {isClicked && <span className={styles.clickRipple} aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {note && (
        <Link to={note.href} onClick={onNavigate} className={styles.note}>
          <strong>{tr(note.title)}</strong>
          <span>{tr(note.body)}</span>
        </Link>
      )}

      <Link to="/profile" onClick={onNavigate} className={styles.user} title={`${user.fullName} · ${t(`nav.role_${user.role}`, ROLE_LABEL[user.role])}`}>
        <span className={styles.userAvatar} aria-hidden="true">
          {initials(user.fullName)}
        </span>
        <div className={styles.userText}>
          <strong>{user.fullName}</strong>
          <span>{t(`nav.role_${user.role}`, ROLE_LABEL[user.role])}</span>
        </div>
      </Link>
    </nav>
  );
}
