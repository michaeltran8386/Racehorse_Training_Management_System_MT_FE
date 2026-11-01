import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/shared/components/ui/Icon";
import { useAppLanguage } from "@/shared/lib/language";
import type { HerdHorse } from "@/shared/types/herdHorse";
import type { AuthUser } from "@/shared/types/auth";
import styles from "./SearchSuggestionsPopover.module.css";

export interface ClinicalProtocolSuggestion {
  id: string;
  title: string;
  category: "Vaccine" | "Lock" | "Treatment" | "Preventive";
  targetRoute: string;
  badgeLabel: string;
  badgeTone: "ok" | "warn" | "danger" | "neutral";
  details: string;
  iconName: string;
  iconTheme: "iconMint" | "iconLavender" | "iconCoral" | "iconAmber";
}

// Helper to remove Vietnamese tones for frictionless diacritic-insensitive search
function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// Safely highlight matching query text without dangerouslySetInnerHTML
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  const matchIndex = normText.indexOf(normQuery);

  if (matchIndex === -1) {
    return <>{text}</>;
  }

  const before = text.slice(0, matchIndex);
  const matched = text.slice(matchIndex, matchIndex + normQuery.length);
  const after = text.slice(matchIndex + normQuery.length);

  return (
    <>
      {before}
      <span className={styles.highlight}>{matched}</span>
      <HighlightedText text={after} query={query} />
    </>
  );
}

// Dynamically derive clinical protocols and care schedules strictly from real horses in the database.
function getProtocolsFromHorses(
  horses: HerdHorse[],
  isVi: boolean
): ClinicalProtocolSuggestion[] {
  if (!horses || horses.length === 0) return [];
  const protocols: ClinicalProtocolSuggestion[] = [];

  horses.forEach((h) => {
    const stallInfo = h.stall
      ? isVi
        ? `Ô chuồng ${h.stall}`
        : `Stall: ${h.stall}`
      : isVi
      ? "Chưa xếp chuồng"
      : "Stall unassigned";

    // 1. Training Lock protocol for locked horses
    if (h.isLocked) {
      protocols.push({
        id: `lock-${h.id}`,
        title: isVi
          ? `Quy trình khóa thi đấu: ${h.name}`
          : `Protective Training Lock: ${h.name}`,
        category: "Lock",
        targetRoute: "/medical/locks",
        badgeLabel: isVi ? "Đã khóa" : "Locked",
        badgeTone: "danger",
        details: isVi
          ? `${h.code} · ${stallInfo} · ${h.lockReason || "Đang đình chỉ tập luyện y tế"}`
          : `${h.code} · ${stallInfo} · ${h.lockReason || "Under protective clinical training suspension"}`,
        iconName: "lock",
        iconTheme: "iconCoral",
      });
    }

    // 2. Clinical injury treatment plan for injured horses
    if (h.healthGroup === "INJURED") {
      protocols.push({
        id: `injury-${h.id}`,
        title: isVi
          ? `Kế hoạch điều trị chấn thương: ${h.name}`
          : `Clinical Injury Care: ${h.name}`,
        category: "Treatment",
        targetRoute: `/medical/horses/${h.id}`,
        badgeLabel: isVi ? "Điều trị" : "In Treatment",
        badgeTone: "danger",
        details: isVi
          ? `${h.code} · ${stallInfo} · ${h.statusText || "Phác đồ phục hồi chấn thương cơ xương"}`
          : `${h.code} · ${stallInfo} · ${h.statusText || "Musculoskeletal recovery protocol"}`,
        iconName: "stethoscope",
        iconTheme: "iconCoral",
      });
    }

    // 3. Clinical observation monitoring for watch horses
    if (h.healthGroup === "WATCH") {
      protocols.push({
        id: `watch-${h.id}`,
        title: isVi
          ? `Theo dõi sinh tồn lâm sàng: ${h.name}`
          : `Clinical Observation: ${h.name}`,
        category: "Treatment",
        targetRoute: `/medical/horses/${h.id}`,
        badgeLabel: isVi ? "Theo dõi" : "Monitoring",
        badgeTone: "warn",
        details: isVi
          ? `${h.code} · ${stallInfo} · ${h.statusText || "Giám sát nhịp tim và hô hấp định kỳ"}`
          : `${h.code} · ${stallInfo} · ${h.statusText || "Daily veterinary vital sign monitoring"}`,
        iconName: "pulse",
        iconTheme: "iconAmber",
      });
    }

    // 4. Quarantine protocol for quarantined horses
    if (h.healthGroup === "QUARANTINED") {
      protocols.push({
        id: `quarantine-${h.id}`,
        title: isVi
          ? `Quy trình cách ly dịch tễ: ${h.name}`
          : `Quarantine Protocol: ${h.name}`,
        category: "Treatment",
        targetRoute: `/medical/horses/${h.id}`,
        badgeLabel: isVi ? "Cách ly" : "Quarantine",
        badgeTone: "danger",
        details: isVi
          ? `${h.code} · ${stallInfo} · ${h.statusText || "Cách ly dịch tễ kiểm soát nghiêm ngặt"}`
          : `${h.code} · ${stallInfo} · ${h.statusText || "Strict epidemiological isolation protocol"}`,
        iconName: "shield",
        iconTheme: "iconLavender",
      });
    }

    // 5. Active preventive care / vaccination for the horse
    protocols.push({
      id: `care-${h.id}-vax`,
      title: isVi
        ? `Lịch tiêm phòng & chăm sóc: ${h.name}`
        : `Vaccination & Preventive Care: ${h.name}`,
      category: "Vaccine",
      targetRoute: "/medical/care-schedules",
      badgeLabel: isVi ? "Định kỳ" : "Scheduled",
      badgeTone: "ok",
      details: isVi
        ? `${h.code} · ${stallInfo} · Phác đồ vắc-xin & tẩy ký sinh trùng định kỳ`
        : `${h.code} · ${stallInfo} • Bi-annual booster protocol per veterinary care plan`,
      iconName: "clipboard",
      iconTheme: "iconMint",
    });
  });

  return protocols;
}

interface SearchSuggestionsPopoverProps {
  horses: HerdHorse[];
  user: AuthUser | null;
  query: string;
  open: boolean;
  onClose: () => void;
  onSelect: (horse: HerdHorse) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

type TabType = "ALL" | "HORSES" | "PROTOCOLS";

type ListItem =
  | { kind: "horse"; data: HerdHorse }
  | { kind: "protocol"; data: ClinicalProtocolSuggestion };

export function SearchSuggestionsPopover({
  horses,
  user: _user,
  query,
  open,
  onClose,
  onSelect,
  triggerRef,
}: SearchSuggestionsPopoverProps) {
  const navigate = useNavigate();
  const { isVietnamese: isVi } = useAppLanguage();
  const popoverRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, triggerRef]);

  // Dynamically derive protocols from real horses only
  const allProtocols = useMemo(() => {
    return getProtocolsFromHorses(horses, isVi);
  }, [horses, isVi]);

  // Filter protocols matching search query (matches title, details, category, or horse stall)
  const filteredProtocols = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return allProtocols;
    return allProtocols.filter((p) => {
      const titleNorm = normalizeText(p.title);
      const detailsNorm = normalizeText(p.details);
      const catNorm = normalizeText(p.category);
      return titleNorm.includes(q) || detailsNorm.includes(q) || catNorm.includes(q);
    });
  }, [allProtocols, query]);

  // Visible subsets based on activeTab
  const visibleHorses = useMemo(() => {
    if (activeTab === "PROTOCOLS") return [];
    return horses;
  }, [activeTab, horses]);

  const visibleProtocols = useMemo(() => {
    if (activeTab === "HORSES") return [];
    return filteredProtocols;
  }, [activeTab, filteredProtocols]);

  // Flattened items for unified keyboard navigation
  const flatItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    visibleHorses.forEach((h) => items.push({ kind: "horse", data: h }));
    visibleProtocols.forEach((p) => items.push({ kind: "protocol", data: p }));
    return items;
  }, [visibleHorses, visibleProtocols]);

  // Reset selectedIndex when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Clamp selectedIndex within valid range
  useEffect(() => {
    if (selectedIndex >= flatItems.length && flatItems.length > 0) {
      setSelectedIndex(flatItems.length - 1);
    }
  }, [flatItems.length, selectedIndex]);

  // Auto-scroll the highlighted item into view
  useEffect(() => {
    if (!open || flatItems.length === 0) return;
    const selectedEl = listContainerRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex, open, flatItems.length]);

  // Action execution for an item
  const handleItemClick = useCallback(
    (item: ListItem) => {
      if (item.kind === "horse") {
        onSelect(item.data);
      } else {
        navigate(item.data.targetRoute);
        onClose();
      }
    },
    [onSelect, navigate, onClose]
  );

  // Keyboard navigation listener (ArrowUp, ArrowDown, Enter, Esc)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0
        );
      } else if (e.key === "Enter") {
        if (flatItems.length > 0 && selectedIndex >= 0 && selectedIndex < flatItems.length) {
          e.preventDefault();
          handleItemClick(flatItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, flatItems, selectedIndex, handleItemClick, onClose]);

  if (!open) return null;

  const totalResults = horses.length + filteredProtocols.length;

  // Context-aware footer link destination & label
  let footerLinkLabel = isVi ? "Xem tất cả kết quả →" : "View all results →";
  let footerLinkTarget = "/herd";

  if (activeTab === "HORSES") {
    footerLinkLabel = isVi ? "Xem tất cả ngựa →" : "View all horses →";
    footerLinkTarget = "/herd";
  } else if (activeTab === "PROTOCOLS") {
    footerLinkLabel = isVi ? "Xem tất cả quy trình →" : "View all protocols →";
    footerLinkTarget = "/medical/care-schedules";
  }

  // Get status badge info for horse
  const getHorseStatusBadge = (horse: HerdHorse) => {
    if (horse.isLocked) {
      return {
        label: isVi ? "Đã khóa" : "Locked",
        toneClass: styles.badgeDanger,
      };
    }
    if (horse.healthGroup === "INJURED") {
      return {
        label: isVi ? "Chấn thương" : "Injured",
        toneClass: styles.badgeDanger,
      };
    }
    if (horse.healthGroup === "WATCH") {
      return {
        label: isVi ? "Theo dõi" : "Watch",
        toneClass: styles.badgeWarn,
      };
    }
    if (horse.healthGroup === "QUARANTINED") {
      return {
        label: isVi ? "Cách ly" : "Quarantine",
        toneClass: styles.badgeDanger,
      };
    }
    return {
      label: isVi ? "Khỏe mạnh" : "Fit",
      toneClass: styles.badgeOk,
    };
  };

  // Get icon theme & icon name for horse
  const getHorseIcon = (horse: HerdHorse) => {
    if (horse.isLocked) {
      return { name: "lock", themeClass: styles.iconCoral };
    }
    if (horse.healthGroup === "INJURED") {
      return { name: "pulse", themeClass: styles.iconCoral };
    }
    if (horse.healthGroup === "WATCH") {
      return { name: "heart", themeClass: styles.iconAmber };
    }
    if (horse.healthGroup === "QUARANTINED") {
      return { name: "shield", themeClass: styles.iconLavender };
    }
    return { name: "horse", themeClass: styles.iconMint };
  };

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      role="dialog"
      aria-modal="false"
      aria-label={isVi ? "Gợi ý tìm kiếm toàn CLB" : "Global Search Suggestions"}
    >
      {/* 1. Header: Icon, Title, Subtitle with count, ESC badge */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox} aria-hidden="true">
            <Icon name="search" size={18} />
          </div>
          <div className={styles.headerTitleGroup}>
            <span className={styles.headerTitle}>
              {isVi ? "Gợi ý tìm kiếm" : "Search Suggestions"}
            </span>
            <span className={styles.headerSubtitle}>
              {isVi
                ? `${totalResults} kết quả trong toàn bộ CLB`
                : `${totalResults} results across club fleet`}
            </span>
          </div>
        </div>

        <span className={styles.escBadge} title="Press ESC to close">
          ESC
        </span>
      </div>

      {/* 2. Segmented Filter Tabs */}
      <div className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ALL"}
          onClick={() => setActiveTab("ALL")}
          className={`${styles.tabBtn} ${activeTab === "ALL" ? styles.tabBtnActive : ""}`}
        >
          <span>{isVi ? "Tất cả" : "All"}</span>
          <span>{totalResults}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "HORSES"}
          onClick={() => setActiveTab("HORSES")}
          className={`${styles.tabBtn} ${activeTab === "HORSES" ? styles.tabBtnActive : ""}`}
        >
          <span>{isVi ? "Ngựa" : "Horses"}</span>
          <span>{horses.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "PROTOCOLS"}
          onClick={() => setActiveTab("PROTOCOLS")}
          className={`${styles.tabBtn} ${activeTab === "PROTOCOLS" ? styles.tabBtnActive : ""}`}
        >
          <span>{isVi ? "Chăm sóc" : "Care & Protocols"}</span>
          <span>{filteredProtocols.length}</span>
        </button>
      </div>

      <hr className={styles.divider} />

      {/* 3. Result List Area */}
      <div ref={listContainerRef} className={styles.listContainer}>
        {totalResults === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              {query.trim()
                ? isVi
                  ? `Không tìm thấy kết quả phù hợp cho "${query}"`
                  : `No matching records found for "${query}"`
                : isVi
                ? "Chưa có dữ liệu tìm kiếm"
                : "No search data available"}
            </div>
            <div className={styles.emptySubtitle}>
              {isVi
                ? "Thử tìm kiếm theo tên ngựa, mã hồ sơ (HR-), mã chip, số ô chuồng hoặc tình trạng sức khỏe..."
                : "Try searching by horse name, microchip ID, record code, stall number, or health status..."}
            </div>
          </div>
        ) : (
          <>
            {/* Section A: HORSES */}
            {visibleHorses.length > 0 && (
              <div>
                <div className={styles.sectionHeader}>
                  {isVi
                    ? `NGỰA · ${visibleHorses.length} KẾT QUẢ`
                    : `HORSES · ${visibleHorses.length} RESULTS`}
                </div>

                {visibleHorses.map((horse) => {
                  const globalIdx = flatItems.findIndex(
                    (it) => it.kind === "horse" && it.data.id === horse.id
                  );
                  const isSelected = globalIdx === selectedIndex;
                  const badge = getHorseStatusBadge(horse);
                  const iconInfo = getHorseIcon(horse);
                  const stallStr = horse.stall
                    ? isVi
                      ? `Ô chuồng ${horse.stall}`
                      : `Stall: ${horse.stall}`
                    : isVi
                    ? "Chưa xếp chuồng"
                    : "Stall unassigned";

                  return (
                    <div
                      key={`h-${horse.id}`}
                      data-index={globalIdx}
                      className={`${styles.resultRow} ${
                        isSelected ? styles.resultRowSelected : ""
                      }`}
                      onClick={() => handleItemClick({ kind: "horse", data: horse })}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <div className={styles.itemLeft}>
                        <div
                          className={`${styles.itemIconBox} ${iconInfo.themeClass}`}
                          aria-hidden="true"
                        >
                          <Icon name={iconInfo.name} size={18} />
                        </div>

                        <div className={styles.itemTextGroup}>
                          <span className={styles.itemName}>
                            <HighlightedText text={horse.name} query={query} />
                          </span>
                          <span className={styles.itemSubtitle}>
                            <HighlightedText text={horse.code} query={query} />
                            {" · "}
                            <HighlightedText text={stallStr} query={query} />
                            {horse.restingHeartRate
                              ? ` · HR: ${horse.restingHeartRate} bpm`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <span className={`${styles.statusBadge} ${badge.toneClass}`}>
                          {badge.label}
                        </span>
                        <div className={styles.itemChevron} aria-hidden="true">
                          <Icon name="chevronRight" size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section B: CARE & CLINICAL PROTOCOLS */}
            {visibleProtocols.length > 0 && (
              <div style={{ marginTop: visibleHorses.length > 0 ? "8px" : 0 }}>
                <div className={styles.sectionHeader}>
                  {isVi
                    ? `CHĂM SÓC & QUY TRÌNH · ${visibleProtocols.length} KẾT QUẢ`
                    : `CARE & PROTOCOLS · ${visibleProtocols.length} RESULTS`}
                </div>

                {visibleProtocols.map((proto) => {
                  const globalIdx = flatItems.findIndex(
                    (it) => it.kind === "protocol" && it.data.id === proto.id
                  );
                  const isSelected = globalIdx === selectedIndex;
                  const badgeToneClass =
                    proto.badgeTone === "danger"
                      ? styles.badgeDanger
                      : proto.badgeTone === "warn"
                      ? styles.badgeWarn
                      : styles.badgeOk;

                  return (
                    <div
                      key={`p-${proto.id}`}
                      data-index={globalIdx}
                      className={`${styles.resultRow} ${
                        isSelected ? styles.resultRowSelected : ""
                      }`}
                      onClick={() => handleItemClick({ kind: "protocol", data: proto })}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <div className={styles.itemLeft}>
                        <div
                          className={`${styles.itemIconBox} ${styles[proto.iconTheme]}`}
                          aria-hidden="true"
                        >
                          <Icon name={proto.iconName} size={18} />
                        </div>

                        <div className={styles.itemTextGroup}>
                          <span className={styles.itemName}>
                            <HighlightedText text={proto.title} query={query} />
                          </span>
                          <span className={styles.itemSubtitle}>
                            <HighlightedText text={proto.details} query={query} />
                          </span>
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <span className={`${styles.statusBadge} ${badgeToneClass}`}>
                          {proto.badgeLabel}
                        </span>
                        <div className={styles.itemChevron} aria-hidden="true">
                          <Icon name="chevronRight" size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Footer: Keyboard Navigation Hints & Context-Aware Link */}
      <div className={styles.footer}>
        <div className={styles.footerShortcuts}>
          <span className={styles.footerKey}>↑ ↓</span>
          <span>{isVi ? "Di chuyển" : "Navigate"}</span>
          <span>·</span>
          <span className={styles.footerKey}>↵</span>
          <span>{isVi ? "Mở" : "Open"}</span>
          <span>·</span>
          <span className={styles.footerKey}>Esc</span>
          <span>{isVi ? "Đóng" : "Close"}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate(footerLinkTarget);
          }}
          className={styles.footerLink}
        >
          <span>{footerLinkLabel}</span>
        </button>
      </div>
    </div>
  );
}
