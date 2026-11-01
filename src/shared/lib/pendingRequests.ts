// Chấm báo "có yêu cầu đăng ký mới" cho Club Manager: dùng chung cho tab Pending (trang Accounts)
// và chấm đỏ cạnh mục Accounts trên sidebar.
// Có chấm khi: có tài khoản PENDING_APPROVAL chưa xem, HOẶC còn thông báo đăng ký chưa đọc.
// Mở tab Pending => lưu các yêu cầu đó là đã xem và đánh dấu luôn thông báo đăng ký là đã đọc.

import type { PublicAccount } from "@/shared/types/auth";
import { getNotifications, markNotificationsRead, refreshNotifications, subscribeNotifications } from "./notifications";
import type { AppNotification } from "./notifications";

const SEEN_KEY = "equiflow.accounts.pendingSeen.v1";
const SEEN_EVENT = "equiflow:pending_seen";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Thông báo "có người đăng ký mới" (khác với thông báo xin cấp quyền).
function isSignUpNotification(n: AppNotification): boolean {
  return n.type === "ACCOUNT_SIGNUP_REQUEST";
}

export function hasNewPendingRequests(accounts: PublicAccount[]): boolean {
  const seen = new Set(readSeen());
  const unseen = accounts.some((a) => a.status === "PENDING_APPROVAL" && !seen.has(a.id));
  const unread = getNotifications().some((n) => !n.read && isSignUpNotification(n));
  return unseen || unread;
}

export function markPendingRequestsSeen(accounts?: PublicAccount[] | null): void {
  if (accounts) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(accounts.filter((a) => a.status === "PENDING_APPROVAL").map((a) => a.id)));
    } catch {
      // trình duyệt chặn localStorage: bỏ qua, chấm vẫn hiện
    }
  }
  const notifs = getNotifications();
  const toMark = notifs.filter((n) => !n.read && isSignUpNotification(n)).map((n) => n.id);
  if (toMark.length > 0) {
    void markNotificationsRead(toMark);
  } else if (notifs.length === 0) {
    void refreshNotifications().then((loaded) => {
      if (!loaded) return;
      const fresh = getNotifications().filter((n) => !n.read && isSignUpNotification(n)).map((n) => n.id);
      if (fresh.length > 0) {
        void markNotificationsRead(fresh);
      }
    });
  }
  window.dispatchEvent(new CustomEvent(SEEN_EVENT));
}

export function subscribePendingSeen(onChange: () => void): () => void {
  const off = subscribeNotifications(onChange);
  window.addEventListener(SEEN_EVENT, onChange);
  return () => {
    off();
    window.removeEventListener(SEEN_EVENT, onChange);
  };
}
