import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { LanguageToggle } from "@/shared/components/ui/LanguageToggle";
import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";
import { useAppLanguage } from "@/shared/lib/language";
import { cx } from "@/shared/lib/cx";
import {
  getNotifications,
  subscribeNotifications,
  getUnreadNotificationsCount,
  type AppNotification,
} from "@/shared/lib/notifications";
import type { HerdHorse } from "@/shared/types/herdHorse";
import { getHealthBoard, type HealthBoardHorse } from "@/features/health/api";
import { HEALTH_STATUS } from "@/shared/lib/status";
import type { HealthStatus } from "@/shared/types/enums";
import type { BreadcrumbSegment } from "@/shared/lib/navigation";
import { useAuth } from "./AuthProvider";
import { NotificationPopover } from "./NotificationPopover";
import { SearchSuggestionsPopover } from "./SearchSuggestionsPopover";
import styles from "./Topbar.module.css";

import { tr } from "@/shared/i18n/tr";
interface TopbarProps {
  breadcrumb: (string | BreadcrumbSegment)[]; // đoạn cuối in đậm, các đoạn trước có link điều hướng
  notifications?: number;
  onMenu: () => void;
  onLogout: () => void;
}

// Topbar phẳng 64px: (menu khi hẹp) · breadcrumb trang con · ô tìm · chuông · đổi theme · đăng xuất.
export function Topbar({ breadcrumb, onMenu, onLogout }: TopbarProps) {
  const { user } = useAuth();
  const { t } = useAppLanguage();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const bellTriggerRef = useRef<HTMLDivElement>(null);
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>(() =>
    getNotifications(),
  );
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    getUnreadNotificationsCount(),
  );

  // Search suggestions state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Ngựa cho ô tìm kiếm: lấy từ GET /medical/health-board (BE đã lọc theo vai trò: OWNER ngựa mình, GROOM ngựa mình chăm).
  // Tải khi mở ô tìm kiếm; tài khoản không có quyền xem y tế thì không tìm (kết quả dẫn tới trang y tế).
  const canSearch = Boolean(user?.permissions.viewMedical);
  const [scopedHorses, setScopedHorses] = useState<HerdHorse[]>([]);

  useEffect(() => {
    if (!searchOpen || !canSearch) return;
    let cancelled = false;
    getHealthBoard()
      .then((res) => {
        if (!cancelled) setScopedHorses(res.data.map(toSearchHorse));
      })
      .catch(() => {
        // Lỗi tải: giữ danh sách cũ, lần mở sau thử lại.
      });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, canSearch]);

  const filteredHorses = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    const normQ = rawQ
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");

    let list = scopedHorses;
    if (normQ) {
      list = list.filter((h) => {
        const normName = (h.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
        const normCode = (h.code || "").toLowerCase();
        const normStall = (h.stall || "").toLowerCase();
        const normStatus = (h.statusText || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
        const normLock = (h.lockReason || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
        return (
          normName.includes(normQ) ||
          normCode.includes(normQ) ||
          normStall.includes(normQ) ||
          normStatus.includes(normQ) ||
          normLock.includes(normQ)
        );
      });
    }
    return [...list].sort((a, b) => {
      if (a.isLocked && !b.isLocked) return -1;
      if (!a.isLocked && b.isLocked) return 1;
      const priority = { INJURED: 1, WATCH: 2, QUARANTINED: 3, FIT: 4 };
      return (priority[a.healthGroup] || 5) - (priority[b.healthGroup] || 5);
    });
  }, [scopedHorses, searchQuery]);

  useEffect(() => {
    const sync = () => {
      setNotificationsList(getNotifications());
      setUnreadCount(getUnreadNotificationsCount());
    };
    sync();
    return subscribeNotifications(sync);
  }, []);

  // Trang cấp 1 đã có tiêu đề H1 nên không cần breadcrumb; chỉ trang con (Accounts › Tên) mới hiện.
  const trail = breadcrumb.slice(1);
  const showTrail = trail.length >= 2;

  return (
    <header className={styles.bar}>
      <div className={styles.leftGroup}>
        <button type="button" aria-label={tr("Open menu")} onClick={onMenu} className={styles.menu}>
          <Icon name="list" size={18} />
        </button>

        {showTrail && (
          <nav aria-label={tr("Breadcrumb")} className={styles.crumbs}>
            <ol>
              {trail.map((part, i) => {
                const last = i === trail.length - 1;
                const label = typeof part === "string" ? part : part.label;
                const href = typeof part === "object" ? part.href : undefined;
                return (
                  <li key={i} aria-current={last ? "page" : undefined}>
                    {i > 0 && (
                      <span className={styles.sep} aria-hidden="true">
                        <Icon name="chevronRight" size={14} />
                      </span>
                    )}
                    {!last && href ? (
                      <Link to={href} className={styles.crumbLink} title={label}>
                        {label}
                      </Link>
                    ) : (
                      <span className={last ? styles.currentLabel : styles.crumbText} title={label}>{label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </div>

      <div className={styles.centerGroup}>
        <div className={styles.search} ref={searchContainerRef}>
          <span className={styles.searchIcon}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            aria-label={t("topbar.searchAria", "Search horses, plans, people")}
            placeholder={t("topbar.searchPlaceholder", "Search horses, plans, people")}
            className={cx(searchQuery && styles.hasValue)}
            onFocus={() => {
              setSearchOpen(true);
            }}
            onClick={() => {
              setSearchOpen(true);
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
              } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                setSearchOpen(true);
              }
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} aria-label={tr("Clear search")} className={styles.clear}>
              <Icon name="x" size={14} />
            </button>
          )}

          <SearchSuggestionsPopover
            horses={filteredHorses}
            user={user}
            query={searchQuery}
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            onSelect={(horse) => {
              navigate(`/medical/horses/${horse.id}`);
              setSearchOpen(false);
              setSearchQuery("");
            }}
            triggerRef={searchContainerRef}
          />
        </div>
      </div>

      <div className={styles.tools}>

        <div className={styles.bellWrap}>
          <div ref={bellTriggerRef} className={styles.bellTrigger}>
            <button
              type="button"
              aria-label={unreadCount > 0 ? tr("Notifications, {{count}} unread", { count: unreadCount }) : tr("Notifications")}
              title={tr("Notifications")}
              onClick={() => setPopoverOpen((prev) => !prev)}
              className={styles.actionBtn}
            >
              <Icon name="bell" size={18} />
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>
          </div>
            <NotificationPopover
              notifications={notificationsList}
              open={popoverOpen}
              onClose={() => setPopoverOpen(false)}
              triggerRef={bellTriggerRef}
            />
          </div>

          {/* Language Switcher */}
          <LanguageToggle />

          {/* Theme Toggle Button */}
          <ThemeToggle className={styles.actionBtn} />

          {/* Logout Button */}
          <button
            type="button"
            aria-label={t("topbar.logout", "Log out")}
            title={t("topbar.logout", "Log out")}
            onClick={onLogout}
            className={styles.actionBtn}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
    </header>
  );
}

const HEALTH_GROUP: Record<HealthBoardHorse["healthGroup"], HerdHorse["healthGroup"]> = {
  QUALIFIED: "FIT",
  OBSERVATION: "WATCH",
  INJURED: "INJURED",
  ISOLATED: "QUARANTINED",
};

function toSearchHorse(h: HealthBoardHorse): HerdHorse {
  return {
    id: h.id,
    name: h.name,
    code: h.horseCode ?? "",
    stall: h.stallCode ?? "—",
    zone: h.zone ?? undefined,
    healthGroup: HEALTH_GROUP[h.healthGroup],
    status: h.status,
    statusText: HEALTH_STATUS[h.status as HealthStatus]?.label ?? h.status,
    isLocked: h.isMedicalLocked,
    primaryDiagnosis: h.latestRecord?.diagnosis,
    lastExamDate: h.latestRecord?.examinationDate,
    unresolvedInjuriesCount: h.openInjuries.length,
    hasOverdueRoutine: h.hasOverduePreventive,
  };
}
