import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./NotificationsPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Icon } from "@/shared/components/ui/Icon";
import {
  type AppNotification,
  formatTimeAgo,
  getNotifications,
  isToday,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeNotifications,
  clearAllNotifications,
  localizeNotification,
  getNotificationTargetUrl,
} from "@/shared/lib/notifications";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
export default function NotificationsPage() {
  useScreenTranslation();
  const { isVietnamese: isVi } = useAppLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getNotifications(),
  );

  useEffect(() => {
    const sync = () => {
      setNotifications(getNotifications());
    };
    sync();
    return subscribeNotifications(sync);
  }, []);

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const todayList = filtered.filter((n) => isToday(n.createdAt));
  const earlierList = filtered.filter((n) => !isToday(n.createdAt));
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
        return { icon: "horse", bg: "var(--brand)", text: "var(--text-on-brand)" };
      default:
        return { icon: "bell", bg: "var(--surface-2)", text: "var(--text)" };
    }
  };

  const renderItem = (n: AppNotification) => {
    const theme = getCategoryTheme(n.category);
    const loc = localizeNotification(n, isVi);
    return (
      <div
        key={n.id}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void markNotificationAsRead(n.id);
            const targetUrl = getNotificationTargetUrl(n);
            if (targetUrl) navigate(targetUrl);
          }
        }}
        onClick={() => {
          void markNotificationAsRead(n.id);
          const targetUrl = getNotificationTargetUrl(n);
          if (targetUrl) navigate(targetUrl);
        }}
        className={`${styles.notification} ${n.read ? "" : styles.unread}`}
      >
        {/* Category icon */}
        <div
          className={styles.categoryIcon}
          style={{ background: theme.bg, color: theme.text }}
          aria-hidden="true"
        >
          <Icon name={theme.icon} size={24} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.meta}>
            <Badge tone={n.category === "LOCK" ? "danger" : n.category === "ACCOUNT" ? "violet" : "info"}>
              {loc.categoryLabel}
            </Badge>
            {loc.senderName && (
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                {tr("From:")}{" "}<strong>{loc.senderName}</strong>
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: "var(--fs-caption)", color: "var(--text-muted)", flexShrink: 0 }}>
              {formatTimeAgo(n.createdAt)}
            </span>
          </div>

          <h4
            style={{
              margin: "0 0 4px",
              fontSize: "var(--fs-body)",
              fontWeight: n.read ? 600 : 750,
              color: n.read ? "var(--text)" : "var(--text-strong)",
            }}
          >
            {loc.title}
          </h4>

          <p
            style={{
              margin: 0,
              fontSize: "var(--fs-body)",
              lineHeight: 1.5,
              color: n.read ? "var(--text-muted)" : "var(--text)",
            }}
          >
            {loc.message}
          </p>

          {/* Action Link Button */}
          {n.link && (
            <div style={{ marginTop: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--fs-caption)",
                  fontWeight: 600,
                  color: "var(--brand-700)",
                }}
              >
                <span>{tr("View details")}</span>
                <Icon name="arrowRight" size={13} />
              </span>
            </div>
          )}
        </div>

        {/* Unread Indicator */}
        {!n.read && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--info)",
                display: "inline-block",
              }}
              title={tr("Unread")}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <PageHeader title="Notifications" action={<>{unreadCount > 0 && <Button tone="secondary" onClick={() => void markAllNotificationsAsRead()} icon="check">{tr("Mark all as read")}</Button>}<LinkButton to="/notifications/settings" tone="ghost" icon="settings">{tr("Notification settings")}</LinkButton></>} />

      {/* Filter Tabs */}
      <Card pad={14}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              aria-pressed={activeTab === "all"}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--r-lg)",
                border: "none",
                fontSize: "var(--fs-body)",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "all" ? "var(--nav-item-active-bg)" : "var(--surface-sunken)",
                color: activeTab === "all" ? "var(--nav-item-active-text)" : "var(--text-muted)",
              }}
            >
              {tr("All ({{count}})", { count: notifications.length })}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              aria-pressed={activeTab === "unread"}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--r-lg)",
                border: "none",
                fontSize: "var(--fs-body)",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === "unread" ? "var(--nav-item-active-bg)" : "var(--surface-sunken)",
                color: activeTab === "unread" ? "var(--nav-item-active-text)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{tr("Unread")}</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "var(--info-bg)",
                    color: "var(--info)",
                    fontSize: "var(--fs-caption)",
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "2px 7px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => void clearAllNotifications()}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "var(--fs-caption)",
                cursor: "pointer",
                padding: "4px 8px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {tr("Clear notification history")}
            </button>
          )}
        </div>
      </Card>

      {/* Notifications Listing */}
      {filtered.length === 0 ? (
        <Card pad={40}>
          <EmptyState
            title={activeTab === "unread" ? tr("You're all caught up!") : tr("No notifications yet")}
            description={
              activeTab === "unread"
                ? tr("All notifications for your role have been read or marked as reviewed.")
                : tr("When training locks, clinical alerts, vaccination schedules, or system updates occur, they will appear here.")
            }
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {todayList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text-strong)", padding: "0 4px" }}>
                {tr("Today")}
              </div>
              {todayList.map(renderItem)}
            </div>
          )}

          {earlierList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: todayList.length > 0 ? "0.5rem" : 0 }}>
              <div style={{ fontSize: "var(--fs-body)", fontWeight: 700, color: "var(--text-strong)", padding: "0 4px" }}>
                {tr("Earlier")}
              </div>
              {earlierList.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
