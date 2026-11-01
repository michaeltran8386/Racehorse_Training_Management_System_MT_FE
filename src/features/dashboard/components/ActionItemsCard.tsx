import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { useAppLanguage } from "@/shared/lib/language";
import styles from "./ActionItemsCard.module.css";

interface ActionItem {
  id: string;
  category: "ACCOUNT" | "STABLE";
  icon: string;
  iconTheme: "iconAccount" | "iconStable" | "iconHealth";
  title: string;
  subtitle: string;
  cta: string;
  to: string;
}

interface ActionItemsCardProps {
  pendingCount: number | null;
  emptyStallsCount: number | null;
  lockedCount: number | null;
  loading: boolean;
}

export function ActionItemsCard({ pendingCount, emptyStallsCount, lockedCount, loading }: ActionItemsCardProps) {
  const { isVietnamese: isVi } = useAppLanguage();
  const [activeTab, setActiveTab] = useState<"ALL" | "ACCOUNT" | "STABLE">("ALL");
  const items: ActionItem[] = [];
  if (pendingCount != null && pendingCount > 0) items.push({
    id: "accounts", category: "ACCOUNT", icon: "users", iconTheme: "iconAccount",
    title: isVi ? `${pendingCount} tài khoản đang chờ duyệt` : `${pendingCount} ${pendingCount === 1 ? "account" : "accounts"} pending approval`,
    subtitle: isVi ? "Xem xét yêu cầu tài khoản" : "Review account requests",
    cta: isVi ? "Xem xét" : "Review", to: "/accounts",
  });
  if (emptyStallsCount != null && emptyStallsCount > 0) items.push({
    id: "stalls", category: "STABLE", icon: "home", iconTheme: "iconStable",
    title: isVi ? `${emptyStallsCount} ô chuồng còn trống` : `${emptyStallsCount} empty ${emptyStallsCount === 1 ? "stall" : "stalls"}`,
    subtitle: isVi ? "Xem tình trạng khu chuồng" : "View stable availability",
    cta: isVi ? "Sơ đồ chuồng" : "Stall map", to: "/stables/map",
  });
  if (lockedCount != null && lockedCount > 0) items.push({
    id: "health", category: "STABLE", icon: "alert", iconTheme: "iconHealth",
    title: isVi ? `${lockedCount} ngựa đang bị khóa huấn luyện` : `${lockedCount} ${lockedCount === 1 ? "horse" : "horses"} under training lock`,
    subtitle: isVi ? "Theo dõi trạng thái sức khỏe" : "Review health status",
    cta: isVi ? "Xem chi tiết" : "Details", to: "/herd",
  });
  const filtered = activeTab === "ALL" ? items : items.filter((item) => item.category === activeTab);
  const unavailable = pendingCount == null || emptyStallsCount == null || lockedCount == null;
  const tabs = [
    { id: "ALL" as const, label: isVi ? "Tất cả" : "All", count: items.length },
    { id: "ACCOUNT" as const, label: isVi ? "Tài khoản" : "Accounts", count: items.filter((item) => item.category === "ACCOUNT").length },
    { id: "STABLE" as const, label: isVi ? "Chuồng trại" : "Stable", count: items.filter((item) => item.category === "STABLE").length },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox} aria-hidden="true"><Icon name="clipboard" size={18} /></div>
          <h3 className={styles.title}>{isVi ? "Việc cần theo dõi" : "Items to review"}</h3>
          {!loading && <span className={styles.badge}>{items.length}</span>}
        </div>
      </div>
      <div className={styles.tabsBar}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}>
            {tab.label} ({loading ? "—" : tab.count})
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {loading ? <div className={styles.emptyState} role="status">{isVi ? "Đang tải dữ liệu..." : "Loading..."}</div> : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>{unavailable ? (isVi ? "Một số thông tin chưa khả dụng" : "Some information is unavailable") : (isVi ? "Không có mục nào cần theo dõi" : "There are no items to review")}</div>
            {unavailable && <div className={styles.emptySubtitle}>{isVi ? "Một số dữ liệu không thể hiển thị lúc này." : "Some data cannot be displayed right now."}</div>}
          </div>
        ) : filtered.map((item) => (
          <div key={item.id} className={styles.taskCard}>
            <div className={styles.cardLeft}>
              <div className={`${styles.iconCircle} ${styles[item.iconTheme]}`} aria-hidden="true"><Icon name={item.icon} size={20} strokeWidth={1.8} /></div>
              <div className={styles.textGroup}><span className={styles.taskTitle}>{item.title}</span><span className={styles.taskSubtitle}>{item.subtitle}</span></div>
            </div>
            <div className={styles.cardRight}><Link to={item.to} className={styles.actionBtn}>{item.cta}</Link></div>
          </div>
        ))}
      </div>
      {!loading && unavailable && filtered.length > 0 && (
        <p className={styles.partialNotice}>{isVi ? "Một số thông tin chưa khả dụng." : "Some information is unavailable."}</p>
      )}
    </div>
  );
}
