import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/shared/components/ui/Icon";
import {
  type AppNotification,
  formatTimeAgo,
  isToday,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  localizeNotification,
} from "@/shared/lib/notifications";

import { tr } from "@/shared/i18n/tr";
import styles from "./NotificationPopover.module.css";
import { useAppLanguage } from "@/shared/lib/language";
interface NotificationPopoverProps {
  notifications: AppNotification[];
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationPopover({
  notifications,
  open,
  onClose,
  triggerRef,
}: NotificationPopoverProps) {
  const { isVietnamese: isVi } = useAppLanguage();
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
      return;
    }
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const todayList = filteredNotifications.filter((n) => isToday(n.createdAt));
  const earlierList = filteredNotifications.filter((n) => !isToday(n.createdAt));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryTheme = (category: AppNotification["category"]) => {
    switch (category) {
      case "LOCK":
        return { icon: "lock", bg: "var(--danger-bg)", text: "var(--danger)" };
      case "MEDICAL":
        return { icon: "stethoscope", bg: "var(--info-bg)", text: "var(--info)" };
      case "TRAINING":
        return { icon: "activity", bg: "var(--warn-bg)", text: "var(--warn)" };
      case "ACCOUNT":
        return { icon: "users", bg: "var(--violet-bg)", text: "var(--violet)" };
      case "HORSE":
        return { icon: "horse", bg: "var(--brand-50)", text: "var(--brand-700)" };
      default:
        return { icon: "bell", bg: "var(--surface-3)", text: "var(--text)" };
    }
  };

  const renderItem = (n: AppNotification) => {
    const theme = getCategoryTheme(n.category);
    const loc = localizeNotification(n, isVi);
    return (
      <button
        type="button"
        className={styles.item}
        key={n.id}
        onClick={() => {
          void markNotificationAsRead(n.id);
          if (n.link) navigate(n.link);
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderRadius: "var(--r)",
          cursor: "pointer",
          background: n.read ? "transparent" : "var(--brand-50)",
          transition: "background 0.15s ease",
          position: "relative",
          margin: "2px 8px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken, rgba(0, 0, 0, 0.05))")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = n.read
            ? "transparent"
            : "var(--brand-50)")
        }
      >
        {/* Category Avatar Badge */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--r-sm)",
            background: theme.bg,
            color: theme.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,

          }}
        >
          <Icon name={theme.icon} size={22} />
        </div>

        {/* Text Details */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
          <div
            style={{
              fontSize: "var(--fs-body)",
              lineHeight: "1.35",
              color: n.read ? "var(--text-muted)" : "var(--text)",
            }}
          >
            <strong style={{ color: "var(--text)", fontWeight: 700 }}>
              {loc.senderName ? `${loc.senderName}: ` : ""}
            </strong>
            <span style={{ fontWeight: n.read ? 400 : 600 }}>{loc.message}</span>
          </div>
          <div
            style={{
              fontSize: "var(--fs-caption)",
              color: n.read ? "var(--text-muted)" : "var(--info)",
              fontWeight: n.read ? 400 : 600,
              marginTop: 3,
            }}
          >
            {formatTimeAgo(n.createdAt)}
          </div>
        </div>

        {/* Facebook-style Blue Unread Dot */}
        {!n.read && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--info)",
              flexShrink: 0,
            }}
            title={tr("Unread")}
          />
        )}
      </button>
    );
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: 380,
        maxWidth: "94vw",
        background: "var(--surface)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header: Title + ... Menu */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px 8px",
          position: "relative",
        }}
      >
        <h3 className={styles.title}>{tr("Notifications")}</h3>

        {/* ... More Action Button */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={tr("More options")}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: menuOpen ? "var(--surface-sunken)" : "transparent",
              color: "var(--text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--fs-section)",
              fontWeight: 700,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
            onMouseLeave={(e) => {
              if (!menuOpen) e.currentTarget.style.background = "transparent";
            }}
          >
            •••
          </button>

          {/* ... Dropdown Menu (Facebook style) */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                width: 250,
                background: "var(--surface)",
                borderRadius: "var(--r)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                zIndex: 1010,
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void markAllNotificationsAsRead();
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="check" size={16} />
                <span>{tr("Mark all as read")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                  navigate("/notifications/settings");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="settings" size={16} />
                <span>{tr("Notification settings")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                  navigate("/notifications");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: "var(--fs-body)",
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="file" size={16} />
                <span>{tr("Open notifications page")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs: All | Unread */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          aria-pressed={activeTab === "all"}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--r-lg)",
            border: "none",
            fontSize: "var(--fs-body)",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "all" ? "var(--nav-item-active-bg)" : "var(--surface-sunken)",
            color: activeTab === "all" ? "var(--nav-item-active-text)" : "var(--text-muted)",
          }}
        >
          {tr("All")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          aria-pressed={activeTab === "unread"}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--r-lg)",
            border: "none",
            fontSize: "var(--fs-body)",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "unread" ? "var(--nav-item-active-bg)" : "var(--surface-sunken)",
            color: activeTab === "unread" ? "var(--nav-item-active-text)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{tr("Unread")}</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: "var(--info-bg)",
                color: "var(--info)",
                fontSize: "var(--fs-caption)",
                borderRadius: 999,
                padding: "1px 6px",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Items List */}
      <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)" }}>
            <Icon name="bell" size={32} style={{ margin: "0 auto 10px", opacity: 0.35 }} />
            <div style={{ fontSize: "var(--fs-body)", fontWeight: 600 }}>{tr("No notifications yet")}</div>
            <div style={{ fontSize: "var(--fs-caption)", marginTop: 4 }}>
              {activeTab === "unread" ? tr("You're all caught up.") : tr("No new notifications.")}
            </div>
          </div>
        ) : (
          <>
            {todayList.length > 0 && (
              <div>
                <div style={{ padding: "8px 16px 4px", fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text)" }}>
                  {tr("Today")}
                </div>
                {todayList.map(renderItem)}
              </div>
            )}

            {earlierList.length > 0 && (
              <div style={{ marginTop: todayList.length > 0 ? 8 : 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px 4px",
                  }}
                >
                  <span style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text)" }}>{tr("Earlier")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/notifications");
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--info)",
                      fontSize: "var(--fs-caption)",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {tr("See all")}
                  </button>
                </div>
                {earlierList.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Footer: Facebook "View earlier notifications" */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface-sunken)",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text)",
            fontSize: "var(--fs-body)",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {tr("View earlier notifications")}
        </button>
      </div>
    </div>
  );
}
