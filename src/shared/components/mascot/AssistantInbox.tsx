import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import {
  formatTimeAgo,
  getNotifications,
  localizeNotification,
  markNotificationAsRead,
  subscribeNotifications,
} from "@/shared/lib/notifications";
import { Icon } from "@/shared/components/ui/Icon";
import styles from "./MascotAssistant.module.css";

/** Tab "Việc cần xử lý": thông báo chưa đọc, bấm để mở đúng màn hình. */
export function AssistantInbox({ limit = 6, onNavigate }: { limit?: number; onNavigate?: () => void }) {
  const { isVietnamese } = useAppLanguage();
  const navigate = useNavigate();
  const unread = useSyncExternalStore(subscribeNotifications, getNotifications).filter((n) => !n.read);

  if (unread.length === 0) {
    return (
      <p className={styles.empty}>
        <Icon name="checkCircle" size={18} />
        {tr("Nothing waiting for you right now.")}
      </p>
    );
  }
  return (
    <ul className={styles.inbox}>
      {unread.slice(0, limit).map((n) => {
        const loc = localizeNotification(n, isVietnamese);
        return (
          <li key={n.id}>
            <button
              type="button"
              className={styles.inboxItem}
              onClick={() => {
                void markNotificationAsRead(n.id);
                onNavigate?.();
                if (n.link) navigate(n.link);
              }}
            >
              <span className={styles.inboxTitle}>{loc.title}</span>
              <span className={styles.inboxMeta}>
                {loc.categoryLabel} · {formatTimeAgo(n.createdAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
