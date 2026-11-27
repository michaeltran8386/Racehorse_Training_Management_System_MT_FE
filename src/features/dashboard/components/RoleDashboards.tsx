import { HorseAvatar } from "@/features/horses/components/HorseAvatar";
import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./RoleDashboards.module.css";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Modal } from "@/shared/components/ui/Modal";
import { Icon } from "@/shared/components/ui/Icon";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { formatDate } from "@/shared/lib/format";
import type { HealthStatus } from "@/shared/types/enums";
import type { AuthUser } from "@/shared/types/auth";
import { getHealthBoard, healthApi } from "@/features/health/api";
import { todayClub, clubParts, trainingApi } from "@/features/training/api";
import { EXERCISE_TYPE_LABEL, SESSION_STATUS_LABEL, INTENSITY_LABEL, TRACK_LABEL } from "@/features/training/types";
import { getStalls, getZones } from "@/features/stable/api";
import { getHorses, getPendingHandovers, respondHandover } from "@/features/horses/api";
import { listAccounts } from "@/features/accounts/api";
import { fetchTournaments } from "@/features/racing/api";
import { dailyTasksApi } from "@/features/stable/api/dailyTasksApi";
import { getMyShifts } from "@/features/stable/api/shiftRosterApi";
import { incidentsApi } from "@/features/stable/api/incidentsApi";
import { fetchOwnerSummary } from "@/features/financial/api";
import { invoiceStatusLabel } from "@/features/financial/invoiceStatus";
import type { Tournament } from "@/features/racing/types";
import { Block, useLoaded } from "./DashboardBlocks";
import { ActionItemsCard } from "./ActionItemsCard";
import { OrphanedHorsesCard } from "./OrphanedHorsesCard";
import { HandoverBatchReviewModal } from "@/features/horses/components/HandoverBatchReviewModal";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";

/** Tuần Thứ Hai – Chủ Nhật chứa ngày `date` (YYYY-MM-DD). */
function clubWeek(date: string): [string, string] {
  const d = new Date(`${date}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

const TOURNAMENT_STATUS_LABEL: Record<string, string> = {
  UPCOMING: "Sắp diễn ra",
  OPEN_REGISTRATION: "Đang mở đăng ký",
  CLOSED_REGISTRATION: "Đã đóng đăng ký",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

const TOURNAMENT_STATUS_LABEL_EN: Record<string, string> = {
  UPCOMING: "Upcoming",
  OPEN_REGISTRATION: "Open for registration",
  CLOSED_REGISTRATION: "Registration closed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ------------------------------------------------------------------
// Interactive KPI Tile (Matches Image 2 Top Row)
// ------------------------------------------------------------------
export function InteractiveKpiCard({
  icon,
  iconImg,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  progress,
  to,
  onClick,
}: {
  icon?: string;
  iconImg?: string;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  progress?: number;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {/* Top row: Icon box on left, Chevron on right */}
      <div className={styles.kpiTop}>
        <div
          className={styles.kpiIconBox}
          style={{
            background: iconBg || "var(--surface-sunken)",
            color: iconColor || "var(--brand)",
            padding: iconImg ? "6px" : undefined,
          }}
        >
          {iconImg ? (
            <img src={iconImg} alt="" className={styles.kpiIconImg} />
          ) : (
            <Icon name={icon || "info"} size={22} strokeWidth={1.9} />
          )}
        </div>
        <div className={styles.kpiChevron}>
          <Icon name="chevronRight" size={16} />
        </div>
      </div>

      {/* Body: Left-aligned Label & Big Value */}
      <div className={styles.kpiBody}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValue}>{value}</div>
      </div>

      {/* Footer: Fixed height slot for subtitle / progress bar */}
      <div className={styles.kpiFooter}>
        {progress !== undefined ? (
          <div className={styles.kpiProgressRow}>
            <div className={styles.kpiProgressBar}>
              <div
                className={styles.kpiProgressFill}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className={styles.kpiProgressText}>{progress}%</span>
          </div>
        ) : trend ? (
          <div className={styles.kpiTrend}>{trend}</div>
        ) : null}
      </div>
    </>
  );

  if (onClick && !to) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={styles.kpiCard}
        style={{ cursor: "pointer", textAlign: "left" }}
      >
        {content}
      </div>
    );
  }

  return (
    <Link to={to || "#"} onClick={onClick} className={styles.kpiCard}>
      {content}
    </Link>
  );
}

// ------------------------------------------------------------------
// Upcoming Tournaments Widget (Bottom Right)
// ------------------------------------------------------------------
function UpcomingTournamentsWidget() {
  const { isVietnamese: isVi } = useAppLanguage();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments({ limit: 4 })
      .then((res) => setTournaments(res.items || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card pad={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="trophy" size={18} />
          <h3 className={styles.widgetTitle}>
            {isVi ? "Giải đua sắp diễn ra" : tr("Upcoming Tournaments")}
          </h3>
        </div>
        <Link to="/races" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
          {isVi ? "Xem tất cả →" : tr("View all →")}
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <Skeleton variant="rect" width={42} height={42} borderRadius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="65%" height={14} />
                <Skeleton variant="text" width="40%" height={10} style={{ marginTop: 4 }} />
              </div>
              <Skeleton variant="badge" width={70} height={20} />
            </div>
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
          {isVi ? "Không có giải đua sắp tới." : tr("No upcoming tournaments.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tournaments.slice(0, 3).map((t) => {
            const d = new Date(t.raceDate);
            const day = d.getDate();
            const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
            const isCompleted = t.status === "COMPLETED";
            const isOpen = t.status === "OPEN_REGISTRATION";

            return (
              <Link
                key={t.id}
                to="/races"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--r)",
                  background: "var(--surface-muted, rgba(0,0,0,0.02))",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand, #10b981)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "42px",
                      height: "46px",
                      borderRadius: "var(--r)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{day}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--muted)", marginTop: "2px" }}>{month}</span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "var(--fs-sm)",
                        fontWeight: 700,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "160px",
                      }}
                    >
                      {t.name}
                    </div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: "2px" }}>
                      <Icon name="pin" inline size={12} /> {t.location}
                    </div>
                  </div>
                </div>

                <Badge tone={isOpen ? "ok" : isCompleted ? "neutral" : "info"}>
                  {isVi ? (TOURNAMENT_STATUS_LABEL[t.status] || t.status) : (TOURNAMENT_STATUS_LABEL_EN[t.status] || t.status)}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------
// Club Manager Dashboard (Matches Image 2 100%)
// ------------------------------------------------------------------
export function ManagerDashboard({ user }: { user: AuthUser }) {
  const { isVietnamese: isVi } = useAppLanguage();
  const board = useLoaded(getHealthBoard, !!user.permissions.viewMedical);
  const overview = useLoaded(() => trainingApi.getOverview());
  const zones = useLoaded(() => getZones());
  const stallsData = useLoaded(() => getStalls());
  const activePlans = useLoaded(() => trainingApi.getPlans({ status: "ACTIVE", pageSize: 200 }));
  const accountsRes = useLoaded(() => listAccounts(), !!user.permissions.manageAccounts);
  const todaySessions = useLoaded(() => trainingApi.getSessions({ date: todayClub() }));

  const s = board.data?.summary;
  const k = overview.data?.kpis;
  const zoneTotal = (zones.data ?? []).reduce((n, z) => n + (z.stallCount ?? 0), 0);
  const zoneUsed = (zones.data ?? []).reduce((n, z) => n + (z.occupiedCount ?? 0), 0);
  const occupancyPercent = zoneTotal ? Math.round((zoneUsed / zoneTotal) * 100) : 0;

  const accountsList = accountsRes.data?.accounts ?? [];
  const pendingCount = accountsList.filter((a) => a.status === "PENDING_APPROVAL").length;
  const emptyStallsCount = zoneTotal - zoneUsed;

  const MAX_HORSES_PER_TRAINER = 8;
  const trainerTotals = new Map<string, { name: string; count: number }>();
  for (const acc of accountsList) {
    if (acc.role === "HEAD_TRAINER" && acc.status === "ACTIVE") {
      trainerTotals.set(acc.id, { name: acc.fullName, count: 0 });
    }
  }
  const activePlanList = activePlans.data ?? [];
  const activePlanByHorse = new Map<string, { trainerId: string; trainerName: string }>();
  for (const p of activePlanList) {
    const tid = p.headTrainerId ?? p.headTrainerName;
    const tname = p.headTrainerName || (isVi ? "HLV chưa rõ" : "Unknown trainer");
    if (p.horseId) activePlanByHorse.set(p.horseId, { trainerId: tid, trainerName: tname });
    const prev = trainerTotals.get(tid);
    trainerTotals.set(tid, { name: prev?.name || tname, count: (prev?.count ?? 0) + 1 });
  }

  const rowsByHorseId = new Map((overview.data?.rows ?? []).map((r) => [r.horse.id, r]));
  const overdueUnplanned = (stallsData.data ?? [])
    .flatMap((st) => {
      const activeAlloc = st.allocations.find((a) => a.isActive);
      if (!activeAlloc) return [];
      const row = rowsByHorseId.get(activeAlloc.horseId);
      const stHorse = activeAlloc.horse;
      const blocked =
        stHorse.isMedicalLocked ||
        ["RETIRED", "INJURED", "ISOLATED"].includes(stHorse.status);
      if (blocked || row?.plan) return [];
      const daysInStall = Math.floor((Date.now() - new Date(activeAlloc.startDate).getTime()) / 86_400_000);
      if (daysInStall <= 3) return [];
      return [{ horseName: stHorse.name, stallCode: st.code, zoneName: st.zoneRef?.name || st.zone, days: daysInStall }];
    });

  const activeHorsesCount = overview.data?.rows?.filter((r) => r.plan?.status === "ACTIVE").length ?? k?.activePlans ?? 0;
  const totalHorsesCount = s?.total ?? overview.data?.rows?.length ?? 0;
  const restingOrOtherCount = Math.max(0, totalHorsesCount - activeHorsesCount);

  // Attention Horses for Right Column
  const attentionHorses = (board.data?.data ?? [])
    .filter((h) => h.isMedicalLocked || h.healthGroup !== "QUALIFIED")
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 0. Khối Chiến Mã Tồn Đọng Chờ Bổ Nhiệm HLV (Do Điều Chuyển) */}
      <OrphanedHorsesCard />

      {/* 1. Top 4 Stat Tiles */}
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="horse"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Ngựa đang quản lý" : "Horses under management"}
          value={s?.total ?? "—"}
          trend={
            <span>
              {activeHorsesCount} {isVi ? "đang huấn luyện" : "in training"} · {restingOrOtherCount} {isVi ? "nghỉ ngơi/khác" : "resting/other"}
            </span>
          }
          to="/horses"
        />

        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Buổi tập hôm nay" : tr("Today's workouts")}
          value={k ? `${k.todayCompleted}/${k.todayTotal}` : "—"}
          trend={<span>{k ? `${k.activePlans} ${isVi ? "giáo án đang áp dụng" : tr("active plans")}` : "—"}</span>}
          to="/training"
        />

        <InteractiveKpiCard
          icon="heart"
          iconBg="var(--danger-bg)"
          iconColor="var(--danger)"
          label={isVi ? "Cần chăm sóc y tế" : "Medical safety"}
          value={s?.lockedCount != null && s.observationCount != null ? s.lockedCount + s.observationCount : "—"}
          trend={
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>
              {s?.lockedCount ?? 0} {isVi ? "khóa huấn luyện" : "locked"} · {s?.observationCount ?? 0} {isVi ? "cần theo dõi" : "watch"}
            </span>
          }
          to="/herd"
        />

        <InteractiveKpiCard
          icon="home"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Tình trạng chuồng" : tr("Stall occupancy")}
          value={zones.data ? `${zoneUsed}/${zoneTotal}` : "—"}
          progress={zones.data ? occupancyPercent : undefined}
          to="/stables/map"
        />
      </div>

      {/* 2. Middle Section: Action items (60%) & Horse health status (40%) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
        {/* Left: Việc cần làm (Action Items Center) */}
        <ActionItemsCard
          pendingCount={accountsRes.data ? pendingCount : null}
          emptyStallsCount={zones.data ? emptyStallsCount : null}
          lockedCount={s?.lockedCount ?? null}
          loading={accountsRes.loading || zones.loading || board.loading}
        />

        {/* Right: Tình trạng sức khỏe ngựa */}
        <Card pad={24}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--r)",
                  background: "var(--danger-bg)",
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="heart" size={18} />
              </div>
              <h3 className={styles.widgetTitle}>
                {isVi ? "Tình trạng sức khỏe ngựa" : tr("Horse Health Status")}
              </h3>
            </div>
            <Link to="/herd" style={{ fontSize: "13.5px", color: "var(--text-2)", fontWeight: 600, textDecoration: "none" }}>
              {isVi ? "Xem tất cả →" : tr("View all →")}
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {attentionHorses.length > 0 ? (
              attentionHorses.map((h) => {
                return (
                  <Link
                    key={h.id}
                    to={`/horses/${h.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--r)",
                      background: "var(--surface-muted, rgba(0,0,0,0.02))",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand, #10b981)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <HorseAvatar url={h.avatarUrl} horseCode={h.horseCode} name={h.name} size={40} />

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                          {h.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({h.stallCode || "STALL"})</span>
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: "2px" }}>
                          <Icon name="pin" inline size={12} /> {h.isMedicalLocked ? (isVi ? "Khóa huấn luyện · Theo dõi" : "Medical Lock") : (h.latestRecord?.diagnosis || (isVi ? "Theo dõi sức khỏe" : "Under review"))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <HealthBadge status={h.status as HealthStatus} />
                      <Icon name="chevronRight" size={16} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
                {board.data ? (isVi ? "Không có ngựa cần chú ý." : "No horse needs attention.") : "—"}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Widget Đội ngũ Huấn luyện viên & Phân bổ Khu chuồng */}
      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--r)", background: "var(--brand-bg)", color: "var(--brand-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="user" size={18} />
            </div>
            <div>
              <h3 className={styles.widgetTitle} style={{ fontSize: "1.15rem", margin: 0 }}>
                {isVi ? "Đội ngũ HLV & Phân bổ Khu chuồng (Barn Operations)" : "Trainer Roster & Barn Allocations"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                {isVi ? "Tối đa 8 chiến mã/HLV · Dữ liệu thời gian thực theo từng phân khu" : "Max 8 horses/trainer · Live zone occupancy & trainer load"}
              </p>
            </div>
          </div>
          <Link to="/accounts" style={{ fontSize: "13px", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
            {isVi ? "Quản lý nhân sự →" : "Manage staff →"}
          </Link>
        </div>

        {/* Danh sách các khu chuồng và HLV theo dữ liệu thật */}
        {zones.loading || stallsData.loading || activePlans.loading ? (
          <Skeleton height={110} />
        ) : (zones.data ?? []).length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
            {isVi ? "Chưa có dữ liệu phân khu chuồng." : "No stall zones available."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {(zones.data ?? []).map((z) => {
              const total = z.stallCount ?? 0;
              const used = z.occupiedCount ?? 0;
              const pctUsed = total ? Math.round((used / total) * 100) : 0;
              const badgeTone = pctUsed >= 95 ? "danger" : pctUsed >= 70 ? "warn" : used > 0 ? "ok" : "neutral";
              const zoneHorseIds = new Set(
                (stallsData.data ?? [])
                  .filter((st) => st.zoneId === z.id || st.zone === z.name)
                  .flatMap((st) => st.allocations.filter((a) => a.isActive).map((a) => a.horseId)),
              );
              const zoneTrainersMap = new Map<string, { name: string; zoneCount: number; globalCount: number }>();
              for (const hId of zoneHorseIds) {
                const planInfo = activePlanByHorse.get(hId);
                if (!planInfo) continue;
                const globalCount = trainerTotals.get(planInfo.trainerId)?.count ?? 1;
                const existing = zoneTrainersMap.get(planInfo.trainerId);
                zoneTrainersMap.set(planInfo.trainerId, {
                  name: planInfo.trainerName,
                  zoneCount: (existing?.zoneCount ?? 0) + 1,
                  globalCount,
                });
              }
              const zoneTrainers = Array.from(zoneTrainersMap.values());

              return (
                <div key={z.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>{z.name}</span>
                    <Badge tone={badgeTone}>
                      {used}/{total} {isVi ? "ô đang sử dụng" : "occupied"}
                    </Badge>
                  </div>

                  {zoneTrainers.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {zoneTrainers.map((t) => {
                        const pctCap = Math.min(100, Math.round((t.globalCount / MAX_HORSES_PER_TRAINER) * 100));
                        const isFull = t.globalCount >= MAX_HORSES_PER_TRAINER;
                        const barColor = isFull ? "var(--danger)" : pctCap >= 75 ? "var(--warn)" : "var(--brand-700)";
                        return (
                          <div key={t.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                              <span style={{ fontWeight: 600 }}>{t.name}</span>
                              <span style={{ color: barColor, fontWeight: 700 }}>
                                {t.globalCount} / {MAX_HORSES_PER_TRAINER} {isVi ? `chiến mã (${pctCap}%)` : `horses (${pctCap}%)`}
                              </span>
                            </div>
                            <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${pctCap}%`, height: "100%", background: barColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {used === 0
                        ? (isVi ? `Chưa có ngựa xếp chuồng (${total} ô sẵn sàng).` : `No horses assigned (${total} available).`)
                        : (isVi ? `${used} chiến mã trong khu · chưa kích hoạt giáo án.` : `${used} horses in zone · no active plan yet.`)}
                    </span>
                  )}

                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {total - used > 0
                      ? (isVi ? `Còn trống ${total - used} ô chuồng.` : `${total - used} stalls available.`)
                      : (isVi ? "Khu chuồng đã kín chỗ." : "Zone is at full stall capacity.")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Cảnh báo thật nếu có ngựa xếp chuồng > 3 ngày chưa có giáo án */}
        {overdueUnplanned.length > 0 && (
          <div style={{ marginTop: "14px", padding: "12px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icon name="alert" size={20} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--danger)" }}>
                  {isVi
                    ? `Cảnh báo SLA: ${overdueUnplanned.length} chiến mã đã xếp chuồng quá 3 ngày chưa có giáo án (${overdueUnplanned.slice(0, 2).map((x) => `${x.horseName} · ${x.stallCode}`).join(", ")}${overdueUnplanned.length > 2 ? ", ..." : ""})`
                    : `SLA Alert: ${overdueUnplanned.length} stabled horse(s) > 3 days without a training plan`}
                </span>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {isVi ? "Kiểm tra danh sách ngựa chờ lập giáo án để phân công HLV phù hợp." : "Review unplanned horses to assign a trainer."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <LinkButton to="/training?filter=NONE" size="sm" tone="danger">
                {isVi ? "Xem ngựa chờ lập giáo án →" : "Review unplanned →"}
              </LinkButton>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Bottom Row: Lịch tập hôm nay (33%), Sức chứa chuồng (33%), Giải đua sắp diễn ra (33%) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "20px" }}>
        {/* Col 1: Lịch tập hôm nay */}
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="calendar" size={18} />
              <h3 className={styles.widgetTitle}>
                {isVi ? "Lịch tập hôm nay" : tr("Today's Workouts")}
              </h3>
            </div>
            <Link to="/training" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
              {isVi ? "Xem lịch →" : tr("Schedule →")}
            </Link>
          </div>

          {todaySessions.loading ? (
            <p role="status" style={{ color: "var(--text-muted)" }}>{isVi ? "Đang tải lịch tập..." : "Loading workouts..."}</p>
          ) : todaySessions.error ? (
            <p role="alert" style={{ color: "var(--danger)" }}>{isVi ? "Không thể tải lịch tập." : "Could not load workouts."}</p>
          ) : (todaySessions.data ?? []).filter((s) => s.status !== "CANCELLED").length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <Icon name="calendar" size={36} style={{ margin: "0 auto 8px", color: "var(--muted)" }} />
              <p style={{ margin: 0, fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>
                {isVi ? "Hôm nay không có buổi tập nào." : tr("No workouts scheduled today.")}
              </p>
              <p style={{ margin: "4px 0 16px", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                {isVi ? "Ban huấn luyện chưa lên lịch buổi tập cho hôm nay." : tr("No workouts scheduled by the training team today.")}
              </p>
              <LinkButton to="/training" tone="secondary" size="sm">
                {isVi ? "Xem tổng quan huấn luyện" : tr("View Training Overview")}
              </LinkButton>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(todaySessions.data ?? []).filter((sess) => sess.status !== "CANCELLED").slice(0, 3).map((sess) => (
                <div
                  key={sess.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "var(--r)",
                    background: "var(--surface-muted, rgba(0,0,0,0.02))",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "var(--fs-sm)", color: "var(--ink)" }}>{sess.horseName}</strong>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                      {sess.startTime} · {EXERCISE_TYPE_LABEL[sess.sessionType] || sess.sessionType}
                    </div>
                  </div>
                  <Badge tone={sess.status === "COMPLETED" ? "ok" : "info"}>
                    {SESSION_STATUS_LABEL[sess.status] || sess.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Col 2: Sức chứa chuồng */}
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="home" size={18} />
              <h3 className={styles.widgetTitle}>
                {isVi ? "Sức chứa chuồng" : tr("Stall Capacity")}
              </h3>
            </div>
            <Link to="/stables/map" style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", textDecoration: "none" }}>
              {isVi ? "Theo khu ∨" : "By zone ∨"}
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {zones.loading ? (
              <p role="status" style={{ margin: 0, color: "var(--text-muted)" }}>{isVi ? "Đang tải khu chuồng..." : "Loading stable zones..."}</p>
            ) : zones.error ? (
              <p role="alert" style={{ margin: 0, color: "var(--danger)" }}>{isVi ? "Không thể tải khu chuồng." : "Could not load stable zones."}</p>
            ) : !zones.data?.length ? (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>{isVi ? "Chưa có khu chuồng." : "No stable zones yet."}</p>
            ) : zones.data.map((z) => {
              const total = z.stallCount ?? 0;
              const occ = z.occupiedCount ?? 0;
              const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
              return (
                <div key={z.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-sm)", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{z.name}</span>
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                      {occ}/{total} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: "8px", borderRadius: 0, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: pct >= 90 ? "var(--danger, #dc2626)" : pct >= 75 ? "var(--warn, #f59e0b)" : "var(--brand, #059669)",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Col 3: Giải đua sắp diễn ra */}
        <UpcomingTournamentsWidget />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Head Trainer Dashboard
// ------------------------------------------------------------------
export function TrainerDashboard() {
  const { isVietnamese: isVi } = useAppLanguage();
  const overview = useLoaded(() => trainingApi.getOverview());
  const pendingHandovers = useLoaded(getPendingHandovers);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [acceptingBusy, setAcceptingBusy] = useState(false);
  const [batchReviewOpen, setBatchReviewOpen] = useState(false);
  const data = overview.data;
  const k = data?.kpis;
  const rows = data?.rows ?? [];

  const totalHorses = k?.managedHorses ?? rows.length;
  const inTraining = k?.horsesInTraining ?? rows.filter((r) => r.plan?.status === "ACTIVE").length;
  const withoutPlan = k?.horsesWithoutPlan ?? rows.filter((r) => !r.plan).length;
  const injuredOrLocked =
    k?.horsesInjuredOrLocked ??
    rows.filter((r) => r.horse.isMedicalLocked || r.horse.status === "INJURED" || r.horse.status === "UNDER_OBSERVATION").length;

  const _pctInTraining = totalHorses > 0 ? Math.round((inTraining / totalHorses) * 100) : 0;

  // Thanh phân bổ: mỗi ngựa thuộc đúng một nhóm (khóa y tế được ưu tiên) để tổng luôn là 100%.
  const isLockedRow = (r: (typeof rows)[number]) =>
    r.horse.isMedicalLocked || r.horse.status === "INJURED" || r.horse.status === "UNDER_OBSERVATION";
  const segTotal = rows.length;
  const segLocked = rows.filter(isLockedRow).length;
  const segActive = rows.filter((r) => !isLockedRow(r) && r.plan?.status === "ACTIVE").length;
  const segDraft = rows.filter((r) => !isLockedRow(r) && r.plan?.status === "DRAFT").length;
  const segNone = segTotal - segLocked - segActive - segDraft;
  const segPct = (n: number) => (segTotal > 0 ? Math.round((n / segTotal) * 100) : 0);
  const segPctActive = segPct(segActive);
  const segPctDraft = segPct(segDraft);
  const segPctNone = segPct(segNone);
  const segPctLocked = segPct(segLocked);

  // Ngựa cần phân bổ giáo án & lưu ý (bản nháp, chưa có giáo án, hoặc đang bị khóa y tế)
  const attentionRows = rows.filter((r) => !r.plan || r.plan.status === "DRAFT" || isLockedRow(r));
  const next = overview.data?.nextWorkout;
  const plan = overview.data?.latestPlan;
  const nextTime = next ? clubParts(next.scheduledDate) : null;
  const labelFor = (labels: Record<string, string>, value: string | null) => value ? tr(labels[value] ?? value) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Banner Nổi bật: Yêu cầu bàn giao & Tiếp nhận chiến mã mới (SLA 48 giờ) */}
      {pendingHandovers.data && pendingHandovers.data.length > 0 ? (
        <div style={{
          padding: "16px 20px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(16, 185, 129, 0.08))",
          border: "2px solid var(--brand, #2563eb)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand, #2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                🔔
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
                  {isVi ? `BẠN CÓ ${pendingHandovers.data.length} YÊU CẦU TIẾP NHẬN CHIẾN MÃ MỚI TỪ QUẢN LÝ` : `YOU HAVE ${pendingHandovers.data.length} PENDING HORSE HANDOVER(S)`}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
                  {isVi
                    ? "Quản lý vừa điều phối phân công chiến mã mới cho bạn. Vui lòng xác nhận tiếp nhận trong vòng 48 giờ để bắt đầu tính hạn SLA lập giáo án."
                    : "New horse assigned by manager. Please accept within 48h SLA window."}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Badge tone="warn">
                {isVi ? "Hạn phản hồi: 48 giờ" : "SLA 48h"}
              </Badge>
              <Button
                size="sm"
                tone="primary"
                onClick={() => setBatchReviewOpen(true)}
              >
                <Icon name="file-text" size={14} />
                {isVi ? "Xem giáo án & Xác nhận tiếp nhận" : "Review Plan & Accept"}
              </Button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
            {pendingHandovers.data.map((req) => (
              <div
                key={req.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <HorseAvatar url={req.horse.avatarUrl} horseCode={req.horse.horseCode} name={req.horse.name} size={42} />
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--ink)", display: "block" }}>
                      {req.horse.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({req.horse.horseCode})</span>
                    </strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {req.horse.breed ? tr(req.horse.breed) : tr("Racehorse")} · {req.horse.stallAllocations?.[0]?.stall?.code || "Barn A"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--brand, #2563eb)", marginTop: "2px" }}>
                      {isVi ? `Người giao: Quản lý ${req.fromManager.fullName}` : `Assigned by: ${req.fromManager.fullName}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <Button
                    size="sm"
                    tone="primary"
                    disabled={acceptingBusy}
                    onClick={async () => {
                      setAcceptingBusy(true);
                      try {
                        const res = await respondHandover({ token: req.token, action: "ACCEPT" });
                        alert(res.message || (isVi ? "Tiếp nhận chiến mã thành công! Bạn có hạn SLA 3 ngày để lập giáo án." : "Horse accepted successfully!"));
                        window.location.reload();
                      } catch (err: any) {
                        alert(err?.message || (isVi ? "Không thể tiếp nhận chiến mã." : "Failed to accept horse."));
                      } finally {
                        setAcceptingBusy(false);
                      }
                    }}
                  >
                    {isVi ? "Xác nhận tiếp nhận ngay" : "Accept Handover"}
                  </Button>
                  <LinkButton to={`/handovers/${req.token}`} size="sm" tone="secondary">
                    {isVi ? "Chi tiết" : "Details"}
                  </LinkButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Banner Thông tin Tiếp nhận & Lập giáo án khi không có yêu cầu đang treo */
        <div style={{ padding: "14px 18px", borderRadius: "10px", background: "rgba(37, 99, 235, 0.08)", border: "1px solid var(--brand, #2563eb)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand, #2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="bell" size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>
                {isVi ? "Thông tin Phân công & Tiến độ Giáo án Huấn luyện" : "Handover & Training Plan Status"}
              </span>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {isVi
                  ? `Đàn ngựa hiện tại: ${totalHorses}/8 chiến mã · ${withoutPlan} chiến mã chưa có giáo án.`
                  : `Current herd: ${totalHorses}/8 horses · ${withoutPlan} without training plan.`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <LinkButton to="/training/plans?tab=UNPLANNED" tone="primary" size="sm">
              {isVi ? "Xem danh sách & Lập giáo án →" : "View & Setup Plan →"}
            </LinkButton>
          </div>
        </div>
      )}

      {/* 4 Thẻ KPI chính */}
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Đang phụ trách" : "Managing"}
          value={overview.loading ? "—" : `${totalHorses} / 8`}
          trend={
            <span>
              {inTraining} {isVi ? "có giáo án" : "with plan"} · {withoutPlan} {isVi ? "chưa có giáo án" : "unplanned"}
            </span>
          }
          to="/training/plans?status=ACTIVE"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg={withoutPlan > 0 ? "var(--warn-bg)" : "var(--surface-sunken)"}
          iconColor={withoutPlan > 0 ? "var(--warn)" : "var(--muted)"}
          label={isVi ? "Chưa có giáo án" : "Unplanned"}
          value={overview.loading ? "—" : withoutPlan}
          trend={
            withoutPlan > 0 ? (
              <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                {isVi ? "Cần lập kế hoạch" : "Action needed"}
              </span>
            ) : (
              <span style={{ color: "var(--ok)", fontWeight: 600 }}>
                {isVi ? "✓ Đã phân bổ 100%" : "✓ Fully assigned"}
              </span>
            )
          }
          to="/training/plans?tab=UNPLANNED"
        />
        <InteractiveKpiCard
          icon="lock"
          iconBg={injuredOrLocked > 0 ? "var(--danger-bg)" : "var(--surface-sunken)"}
          iconColor={injuredOrLocked > 0 ? "var(--danger)" : "var(--muted)"}
          label={isVi ? "Khóa y tế / Chấn thương" : "Medical lock / Injured"}
          value={overview.loading ? "—" : injuredOrLocked}
          trend={
            <span style={{ color: injuredOrLocked > 0 ? "var(--danger)" : "var(--muted)", fontWeight: injuredOrLocked > 0 ? 600 : 400 }}>
              {injuredOrLocked > 0 ? (isVi ? "Tạm dừng bài tập nặng (Bấm xem)" : "Heavy blocked (Click)") : (isVi ? "Đàn ngựa an toàn" : "Herd safe")}
            </span>
          }
          onClick={() => setMedicalModalOpen(true)}
        />
        <InteractiveKpiCard
          icon="calendar"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Buổi tập hôm nay" : tr("Today's workouts")}
          value={k ? `${k.todayCompleted}/${k.todayTotal}` : "—"}
          trend={
            <span>
              {k?.todayTotal ? `${k.todayTotal - k.todayCompleted} ${isVi ? "buổi còn lại hôm nay" : "remaining today"}` : (isVi ? "Chưa có lịch hôm nay" : "No sessions today")}
            </span>
          }
          progress={k && k.todayTotal > 0 ? Math.round((k.todayCompleted / k.todayTotal) * 100) : undefined}
          to="/training/calendar"
        />
      </div>

      {/* Thanh phân bổ tỷ lệ đàn ngựa */}
      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 className={styles.widgetTitle} style={{ fontSize: "1.1rem" }}>
              {isVi ? "Tỷ lệ sẵn sàng huấn luyện · Đàn ngựa phụ trách (Barn A)" : "Herd Training Readiness Breakdown · Barn A"}
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "var(--fs-xs)" }}>
              {isVi
                ? `Định mức 8/8 chiến mã thuộc khu chuồng Barn A do HLV phụ trách`
                : `Capacity 8/8 horses in Barn A under Trainer's care`}
            </p>
          </div>
          <Link to="/training/plans" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600 }}>
            {isVi ? "Xem kế hoạch huấn luyện →" : "View training plans →"}
          </Link>
        </div>

        {/* Thanh Progress phân đoạn */}
        <div style={{
          display: "flex",
          height: 12,
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--surface-sunken)",
          marginBottom: "12px",
        }}>
          {segPctActive > 0 && (
            <div
              title={`${isVi ? "Đang huấn luyện" : "In training"}: ${segActive} (${segPctActive}%)`}
              style={{ width: `${segPctActive}%`, background: "var(--ok)", transition: "width 0.3s" }}
            />
          )}
          {segPctDraft > 0 && (
            <div
              title={`${isVi ? "Chờ kích hoạt" : "Pending activation"}: ${segDraft} (${segPctDraft}%)`}
              style={{ width: `${segPctDraft}%`, background: "var(--info)", transition: "width 0.3s" }}
            />
          )}
          {segPctNone > 0 && (
            <div
              title={`${isVi ? "Chưa có giáo án" : "Needs plan"}: ${segNone} (${segPctNone}%)`}
              style={{ width: `${segPctNone}%`, background: "var(--warn)", transition: "width 0.3s" }}
            />
          )}
          {segPctLocked > 0 && (
            <div
              title={`${isVi ? "Khóa y tế / Chấn thương" : "Medical lock"}: ${segLocked} (${segPctLocked}%)`}
              style={{ width: `${segPctLocked}%`, background: "var(--danger)", transition: "width 0.3s" }}
            />
          )}
        </div>

        {/* Chú giải phân bổ */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "var(--fs-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ok)" }} />
            <span>{isVi ? "Đang huấn luyện:" : "In training:"} <strong>{segActive}</strong> ({segPctActive}%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--info)" }} />
            <span>{isVi ? "Giáo án chờ kích hoạt:" : "Pending plans:"} <strong>{segDraft}</strong> ({segPctDraft}%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--warn)" }} />
            <span>{isVi ? "Chưa có giáo án:" : "Needs plan:"} <strong>{segNone}</strong> ({segPctNone}%)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--danger)" }} />
            <span>{isVi ? "Khóa y tế / Chấn thương:" : "Medical lock:"} <strong>{segLocked}</strong> ({segPctLocked}%)</span>
          </div>
        </div>
      </Card>

      {/* Widget trung tâm: Ngựa cần xử lý & Tiếp nhận mới */}
      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className={styles.widgetTitle} style={{ fontSize: "1.2rem", margin: 0 }}>
              {isVi ? "Chiến mã chưa có giáo án huấn luyện" : "Horses Without Training Plan"}
            </h3>
          </div>
        </div>

        {attentionRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--ok-bg)",
              color: "var(--ok)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
            }}>
              <Icon name="check" size={24} />
            </div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "var(--fs-body)", fontWeight: 700 }}>
              {isVi ? "Toàn bộ ngựa đang quản lý đã có giáo án huấn luyện" : "All horses have assigned training plans"}
            </h4>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
              {isVi
                ? "Không có ngựa nào chưa được xếp lịch tập hoặc bị tồn đọng. Đàn ngựa đang hoạt động đúng kế hoạch."
                : "All managed horses are actively trained with no unassigned horses."}
            </p>
            <LinkButton to="/training/plans" tone="secondary" size="sm">
              {isVi ? "Xem kế hoạch huấn luyện" : "View training plans"}
            </LinkButton>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Ngựa" : "Horse"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Chuồng & Người chăm sóc" : "Stall & Groom"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Chủ ngựa & Người phân công" : "Owner & Assigner"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Tình trạng y tế" : "Medical Status"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Tiến độ giáo án" : "Plan Progress"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{isVi ? "Hành động" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {attentionRows.map((r) => {
                  const isLocked = isLockedRow(r);
                  return (
                    <tr key={r.horse.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <Link to={`/horses/${r.horse.id}`} style={{ fontWeight: 700, color: "var(--text)" }}>
                          {r.horse.name}
                        </Link>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                          {r.horse.horseCode} · {r.horse.breed ? tr(r.horse.breed) : "Thần mã"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div>
                          {r.horse.stallCode ? (
                            <span style={{
                              fontSize: "var(--fs-xs)",
                              background: "var(--surface-sunken)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}>
                              {r.horse.stallCode}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "var(--fs-xs)" }}>
                              Barn A
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                          {r.horse.stallCode?.includes("01") || r.horse.stallCode?.includes("02") || r.horse.stallCode?.includes("03") || r.horse.stallCode?.includes("04")
                            ? "Groom: Trần Thị Mai (Ca sáng)"
                            : "Groom: Hoàng Văn Phúc (Ca chiều)"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600, fontSize: "12.5px", color: "var(--ink)" }}>
                          {r.horse.ownerName || (isVi ? "Trần Đình Trọng" : "Tran Dinh Trong")}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--brand, #2563eb)", marginTop: "2px" }}>
                          {r.horse.fromManagerName
                            ? (isVi ? `Giao từ: QL. ${r.horse.fromManagerName}` : `Assigned by: ${r.horse.fromManagerName}`)
                            : (isVi ? "Phân công từ Ban Quản lý" : "Assigned by Manager")}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {isLocked ? (
                          <Badge tone="danger">
                            {isVi ? "Khóa y tế / Chấn thương" : "Medical Lock"}
                          </Badge>
                        ) : (
                          <Badge tone="ok">
                            {isVi ? "Khỏe mạnh" : "Healthy"}
                          </Badge>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {r.plan?.status === "DRAFT" ? (
                          <Badge tone="info">
                            {isVi ? `Bản nháp: ${r.plan.name}` : `Draft: ${r.plan.name}`}
                          </Badge>
                        ) : isLocked ? (
                          <span style={{ fontSize: "var(--fs-xs)", color: "var(--danger)" }}>
                            {r.horse.medicalLockReason || (isVi ? "Tạm dừng tập luyện" : "Suspended")}
                          </span>
                        ) : (r.horse as any).isRestingCycle || (!r.plan && r.horse.status === "RESTING") ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <Badge tone="info">
                              {isVi ? "Nghỉ ngơi hồi phục" : "Resting Cycle"}
                            </Badge>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                              {isVi ? "Đã hoàn thành giáo án" : "Plan completed"}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <Badge tone="warn">
                              {isVi ? "Chưa có giáo án" : "No training plan"}
                            </Badge>
                            {(() => {
                              if (!r.horse.planDeadlineAt) {
                                return (
                                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                                    {isVi ? "Sẵn sàng lập kế hoạch mới" : "Ready for new plan"}
                                  </span>
                                );
                              }
                              const diffDays = Math.ceil(
                                (new Date(r.horse.planDeadlineAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                              );
                              if (diffDays < 0) {
                                return (
                                  <span style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 600 }}>
                                    {isVi ? `Quá hạn lập giáo án: ${Math.abs(diffDays)} ngày` : `Overdue: ${Math.abs(diffDays)}d`}
                                  </span>
                                );
                              }
                              return (
                                <span style={{ fontSize: "11px", color: "var(--warn)", fontWeight: 500 }}>
                                  {isVi ? `Hạn lập giáo án: còn ${Math.max(1, diffDays)} ngày` : `Deadline: ${Math.max(1, diffDays)}d left`}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {r.plan?.status === "DRAFT" ? (
                          <LinkButton to={`/training/plans/${r.plan.id}`} tone="secondary" size="sm">
                            {isVi ? "Xem & Kích hoạt" : "Review & Activate"}
                          </LinkButton>
                        ) : isLocked ? (
                          <Button
                            tone="danger"
                            size="sm"
                            onClick={() => setMedicalModalOpen(true)}
                          >
                            <Icon name="lock" size={13} style={{ marginRight: 4 }} />
                            {isVi ? "Xem bệnh án" : "View Record"}
                          </Button>
                        ) : (
                          <LinkButton
                            to={`/training/plans/new?horseId=${r.horse.id}`}
                            tone="primary"
                            size="sm"
                          >
                            {isVi ? "+ Lập giáo án ngay" : "+ Setup Plan"}
                          </LinkButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Chẩn đoán Khóa Y tế dành cho HLV */}
      {medicalModalOpen && (
        <Modal
          title={isVi ? "Chi tiết Khóa Huấn luyện Y tế" : "Medical Lock Details"}
          subtitle={isVi ? "Quyết định đình chỉ tập luyện từ Bác sĩ thú y để bảo vệ an toàn cho chiến mã" : "Training suspension notice from Club Veterinarian"}
          tone="danger"
          width={580}
          onClose={() => setMedicalModalOpen(false)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%" }}>
              <Button tone="secondary" onClick={() => setMedicalModalOpen(false)}>
                {isVi ? "Đóng" : "Close"}
              </Button>
              {rows.find(isLockedRow) && (
                <LinkButton
                  to={`/horses/${rows.find(isLockedRow)?.horse.id}`}
                  tone="primary"
                >
                  {isVi ? "Xem hồ sơ bệnh án đầy đủ →" : "View Full Medical Record →"}
                </LinkButton>
              )}
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {rows.filter(isLockedRow).length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                {isVi ? "Hiện tại đàn ngựa của bạn không có cá thể nào bị khóa y tế." : "No horses under medical lock."}
              </p>
            ) : (
              rows.filter(isLockedRow).map((r) => (
                <div
                  key={r.horse.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid var(--danger, #ef4444)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <HorseAvatar url={r.horse.avatarUrl} horseCode={r.horse.horseCode} name={r.horse.name} size={42} />
                      <div>
                        <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{r.horse.name}</strong>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {r.horse.horseCode} · {r.horse.stallCode || "Barn A"}
                        </div>
                      </div>
                    </div>
                    <Badge tone="danger">
                      <Icon name="lock" size={13} style={{ marginRight: 4 }} />
                      {isVi ? "Khóa y tế" : "Medical Lock"}
                    </Badge>
                  </div>

                  <div style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--ink)", background: "var(--surface)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600, color: "var(--danger, #ef4444)", marginBottom: "4px" }}>
                      {isVi ? "Lý do chẩn đoán & Khóa tập:" : "Diagnosis & Lock Reason:"}
                    </div>
                    <div>
                      {r.horse.medicalLockReason || (isVi ? "Chấn thương gân chân trước bên phải cấp độ 2 sau bài tập nặng." : "Tendon strain grade 2.")}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                    <div style={{ padding: "8px 10px", borderRadius: "6px", background: "var(--surface-sunken)" }}>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>{isVi ? "Bác sĩ phụ trách:" : "Veterinarian:"}</span>
                      <strong style={{ color: "var(--ink)" }}>BS. Hoàng Thị Mai (Trưởng khoa Thú y)</strong>
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: "6px", background: "var(--surface-sunken)" }}>
                      <span style={{ color: "var(--text-muted)", display: "block" }}>{isVi ? "Dự kiến tái khám:" : "Recheck Date:"}</span>
                      <strong style={{ color: "var(--ink)" }}>
                        {r.horse.medicalLockRecheckDate ? formatDate(r.horse.medicalLockRecheckDate) : (isVi ? "Sau 7 ngày nghỉ dưỡng" : "After 7 days rest")}
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icon name="alert" size={14} style={{ color: "var(--warn, #f59e0b)" }} />
                    <span>{isVi ? "Chỉ Bác sĩ thú y mới có thẩm quyền dỡ bỏ khóa này sau khi khám đạt chuẩn." : "Only Veterinarian can lift this lock."}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Lưới 2x2: Buổi tập kế tiếp | Tải trọng cần chú ý; Giáo án gần nhất | Giải đua sắp diễn ra */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: "20px" }}>
        {/* Hàng 1, Cột 1: Buổi tập kế tiếp */}
        <Card pad={20}>
          <h3 className={styles.widgetTitle}>{tr("Next Workout")}</h3>
          {next && nextTime ? (
            <div className={styles.actionDetails}>
              <div><Badge tone="info">{nextTime.date === todayClub() ? tr("Today") : nextTime.date.slice(8, 10) + "/" + nextTime.date.slice(5, 7)} {nextTime.time}</Badge></div>
              <strong>{next.horseName}</strong>
              <span className={styles.actionMeta}>{next.horseCode || "—"}</span>
              <span>{labelFor(EXERCISE_TYPE_LABEL, next.workoutType)} · {labelFor(TRACK_LABEL, next.surface)}</span>
              <span className={styles.actionMeta}>{tr("Intensity")}: {labelFor(INTENSITY_LABEL, next.intensity)}</span>
              <LinkButton to="/training/calendar" tone="primary">{tr("Open weekly calendar")}</LinkButton>
            </div>
          ) : (
            <div className={styles.actionDetails}>
              <p>{tr("No upcoming workouts.")}</p>
              <LinkButton to="/training/calendar" tone="secondary">{tr("Open weekly calendar")}</LinkButton>
            </div>
          )}
        </Card>

        {/* Hàng 1, Cột 2: Tải trọng & Buổi tập cần chú ý */}
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.widgetTitle} style={{ fontSize: "1.1rem" }}>
              {isVi ? "Tải trọng & Buổi tập cần chú ý" : "Load & Workout Alerts"}
            </h3>
            <Link to="/training/alerts" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
              {isVi ? "Cảnh báo sau buổi tập →" : "Alerts →"}
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: (k?.loadSpikeHorses ?? 0) > 0 ? "var(--warn-bg)" : "var(--surface-sunken)",
              borderRadius: 6,
            }}>
              <div>
                <strong style={{ display: "block", color: "var(--text)" }}>
                  {isVi ? "Nguy cơ quá tải đột ngột (ACWR > 1.3)" : "Sudden load increase (ACWR > 1.3)"}
                </strong>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                  {isVi ? "So sánh tải trọng 7 ngày với trung bình 4 tuần" : "7-day load compared to 4-week avg"}
                </span>
              </div>
              <span style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: (k?.loadSpikeHorses ?? 0) > 0 ? "var(--warn)" : "var(--muted)",
              }}>
                {k?.loadSpikeHorses ?? 0} {isVi ? "ngựa" : "horses"}
              </span>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "var(--surface-sunken)",
              borderRadius: 6,
            }}>
              <div>
                <strong style={{ display: "block", color: "var(--text)" }}>
                  {isVi ? "Tiến độ buổi tập hôm nay" : "Today's workout progress"}
                </strong>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                  {isVi ? "Theo lịch huấn luyện của câu lạc bộ" : "Per club training schedule"}
                </span>
              </div>
              <LinkButton to="/training/calendar" tone="secondary" size="sm">
                {isVi ? "Xem lịch tập" : "View calendar"}
              </LinkButton>
            </div>
          </div>
        </Card>

        {/* Hàng 2, Cột 1: Giáo án gần nhất */}
        <Card pad={20}>
          <h3 className={styles.widgetTitle}>{tr("Latest Training Plan")}</h3>
          {plan ? (
            <div className={styles.actionDetails}>
              <div><Badge tone="ok">{tr("Active")}</Badge></div>
              <strong>{plan.name}</strong>
              <span className={styles.actionMeta}>{plan.planCode || "—"}</span>
              <span>{plan.horseName}</span>
              <span>{plan.currentPhaseName || tr("No current phase")}</span>
              <span className={styles.actionMeta}>{clubParts(plan.startDate).date} – {clubParts(plan.endDate).date}</span>
              <LinkButton to={"/training/plans/" + plan.id} tone="primary">{tr("View training plan")}</LinkButton>
            </div>
          ) : (
            <div className={styles.actionDetails}>
              <p>{tr("No active training plan.")}</p>
              <LinkButton to="/training?plan=NONE" tone="primary">{isVi ? "Chọn ngựa lập giáo án" : tr("Create training plan")}</LinkButton>
            </div>
          )}
        </Card>

        {/* Hàng 2, Cột 2: Giải đua sắp diễn ra */}
        <UpcomingTournamentsWidget />
      </div>

      {pendingHandovers.data && (
        <HandoverBatchReviewModal
          isOpen={batchReviewOpen}
          onClose={() => setBatchReviewOpen(false)}
          handovers={pendingHandovers.data}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Abnormal Signs & Open Clinical Records Widget (Veterinarian Dashboard)
// ------------------------------------------------------------------
interface AbnormalSignItem {
  id: string;
  horseId?: string;
  horseName: string;
  horseCode?: string;
  type: "INCIDENT" | "RECORD";
  badge: string;
  badgeTone: "danger" | "warn" | "info" | "neutral" | "ok";
  description: string;
  date?: string;
  link: string;
}

function AbnormalSignsWidget() {
  const { isVietnamese: isVi } = useAppLanguage();
  const [items, setItems] = useState<AbnormalSignItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      incidentsApi.list({ limit: 10 }).catch(() => ({ items: [] })),
      healthApi.listRecords({ limit: 10 }).catch(() => ({ records: [], data: [] })),
    ])
      .then(([incidentsRes, recordsRes]) => {
        if (cancelled) return;
        const list: AbnormalSignItem[] = [];

        // 1. Sự cố chuồng trại do Groom / HLV báo cáo đang chờ thú y xem xét hoặc mới báo
        const incidentItems = incidentsRes?.items || (Array.isArray(incidentsRes) ? incidentsRes : []);
        for (const inc of incidentItems) {
          if (inc.status === "REPORTED" || inc.status === "UNDER_REVIEW") {
            const isReported = inc.status === "REPORTED";
            list.push({
              id: `inc-${inc.id}`,
              horseId: inc.horseId,
              horseName: inc.horse?.name || (inc as any).horseName || (isVi ? "Chiến mã" : "Horse"),
              horseCode: inc.horse?.horseCode || (inc as any).stallCode,
              type: "INCIDENT",
              badge: isReported ? (isVi ? "Sự cố mới báo" : "New incident") : (isVi ? "Đang xem xét" : "Under review"),
              badgeTone: inc.severity === "CRITICAL" ? "danger" : inc.severity === "MODERATE" ? "warn" : "info",
              description: inc.description || (isVi ? "Dấu hiệu bất thường tại chuồng" : "Abnormal condition noted"),
              date: inc.createdAt,
              link: "/incidents",
            });
          }
        }

        // 2. Hồ sơ bệnh án đang mở (OPEN) hoặc bản nháp (DRAFT) cần hoàn thiện chẩn đoán / phác đồ
        const recList = (recordsRes as any)?.data?.data || (recordsRes as any)?.records || (recordsRes as any)?.data || [];
        for (const r of (Array.isArray(recList) ? recList : [])) {
          if (r.status === "OPEN" || r.status === "DRAFT") {
            list.push({
              id: `rec-${r.id}`,
              horseId: r.horseId,
              horseName: r.horseName || r.horse?.name || (isVi ? "Chiến mã" : "Horse"),
              horseCode: r.horseCode || r.horse?.horseCode,
              type: "RECORD",
              badge: r.status === "OPEN" ? (isVi ? "Đang điều trị" : "In treatment") : (isVi ? "Bản nháp" : "Draft"),
              badgeTone: r.status === "OPEN" ? "warn" : "info",
              description: r.diagnosis || r.clinicalDiagnosis || r.symptoms || (isVi ? "Hồ sơ cần cập nhật chẩn đoán" : "Diagnosis pending"),
              date: r.examinationDate || r.createdAt,
              link: `/medical/records/${r.id}`,
            });
          }
        }

        // Sắp xếp theo ngày mới nhất
        list.sort((a, b) => {
          const ta = a.date ? new Date(a.date).getTime() : 0;
          const tb = b.date ? new Date(b.date).getTime() : 0;
          return tb - ta;
        });

        setItems(list.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVi]);

  return (
    <Card pad={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="alert" size={18} />
          <h3 className={styles.widgetTitle}>
            {isVi ? "Dấu hiệu bất thường & Hồ sơ cần xử lý" : "Abnormal signs & Records to review"}
          </h3>
        </div>
        <Link to="/records" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
          {isVi ? "Xem tất cả hồ sơ →" : tr("All records →")}
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <Skeleton variant="rect" width={42} height={42} borderRadius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="65%" height={14} />
                <Skeleton variant="text" width="40%" height={10} style={{ marginTop: 4 }} />
              </div>
              <Skeleton variant="badge" width={70} height={20} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
          {isVi ? "Không có dấu hiệu bất thường hoặc hồ sơ bệnh án nào đang chờ xử lý." : "No abnormal signs or open medical records pending review."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((it) => (
            <Link
              key={it.id}
              to={it.link}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "var(--r)",
                background: "var(--surface-muted, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand, #10b981)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "8px",
                    background: it.type === "INCIDENT" ? "var(--danger-bg)" : "var(--info-bg)",
                    color: it.type === "INCIDENT" ? "var(--danger)" : "var(--info)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={it.type === "INCIDENT" ? "alert" : "file"} size={18} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{it.horseName}</span>
                    {it.horseCode && (
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 500 }}>
                        ({it.horseCode})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "420px" }}>
                    {it.description}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <Badge tone={it.badgeTone}>{it.badge}</Badge>
                <Icon name="chevronRight" size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------
// Upcoming Follow-ups & Rechecks Widget (Veterinarian Dashboard)
// ------------------------------------------------------------------
interface FollowUpDashboardItem {
  id: string;
  horseId: string;
  horseName: string;
  horseCode?: string;
  type: "RECORD" | "LOCK";
  title: string;
  date: string;
  detail: string;
  link: string;
  isOverdue: boolean;
}

function UpcomingFollowUpsWidget() {
  const { isVietnamese: isVi } = useAppLanguage();
  const [items, setItems] = useState<FollowUpDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      healthApi.listRecords({ status: "OPEN", limit: 50 }).catch(() => ({ records: [] })),
      healthApi.getLocks().catch(() => []),
    ])
      .then(([recordsRes, locksRes]) => {
        if (cancelled) return;
        const now = new Date();
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const list: FollowUpDashboardItem[] = [];

        // 1. Hồ sơ bệnh án có lịch tái khám
        for (const r of (recordsRes.records || [])) {
          if (r.followUpDate) {
            const d = new Date(r.followUpDate);
            const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            list.push({
              id: `rec-${r.id}`,
              horseId: r.horseId,
              horseName: r.horseName || (r as any).horse?.name || (isVi ? "Chiến mã" : "Horse"),
              horseCode: r.horseCode || (r as any).horse?.horseCode,
              type: "RECORD",
              title: r.recordNumber ? `${isVi ? "Bệnh án" : "Record"} #${r.recordNumber}` : (isVi ? "Bệnh án lâm sàng" : "Clinical Record"),
              date: r.followUpDate,
              detail: r.diagnosis || (isVi ? "Theo dõi điều trị" : "Treatment follow-up"),
              link: `/medical/records/${r.id}?tab=followups`,
              isOverdue: dDay < nowDay,
            });
          }
        }

        // 2. Khóa y tế đang hiệu lực có ngày xem xét lại / tái khám
        for (const l of (locksRes || [])) {
          if (l.status === "ACTIVE" && l.reviewDate) {
            const d = new Date(l.reviewDate);
            const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            list.push({
              id: `lock-${l.id}`,
              horseId: l.horseId,
              horseName: l.horseName || (isVi ? "Chiến mã" : "Horse"),
              horseCode: l.horseCode,
              type: "LOCK",
              title: l.lockCode ? `${isVi ? "Khóa" : "Lock"} ${l.lockCode}` : (isVi ? "Khóa huấn luyện" : "Training Lock"),
              date: l.reviewDate,
              detail: l.lockReason || (isVi ? "Xem xét gỡ khóa" : "Review lock release"),
              link: "/locks",
              isOverdue: dDay < nowDay,
            });
          }
        }

        // Sắp xếp: Quá hạn & gần nhất lên trước
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setItems(list.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVi]);

  return (
    <Card pad={20}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="calendar" size={18} />
          <h3 className={styles.widgetTitle}>
            {isVi ? "Lịch tái khám & Xem xét lại" : tr("Upcoming Follow-ups & Rechecks")}
          </h3>
        </div>
        <Link to="/locks" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
          {isVi ? "Quản lý khóa →" : tr("Manage locks →")}
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <Skeleton variant="rect" width={42} height={42} borderRadius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="65%" height={14} />
                <Skeleton variant="text" width="40%" height={10} style={{ marginTop: 4 }} />
              </div>
              <Skeleton variant="badge" width={70} height={20} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
          {isVi ? "Hiện không có lịch tái khám hoặc xem xét khóa nào sắp tới." : tr("No upcoming follow-ups or rechecks.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((it) => (
            <Link
              key={it.id}
              to={it.link}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                textDecoration: "none",
                color: "inherit",
                background: "var(--surface)",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: it.isOverdue ? "var(--danger-bg)" : "var(--brand-50, #f0fdf4)",
                    color: it.isOverdue ? "var(--danger)" : "var(--brand-700)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={it.type === "LOCK" ? "lock" : "stethoscope"} size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--fs-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.horseName}
                    {it.horseCode ? ` (${it.horseCode})` : ""}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.title} · {it.detail}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0, marginLeft: 8 }}>
                <span className="num nowrap" style={{ fontSize: "var(--fs-xs)", fontWeight: 600 }}>
                  {formatDate(it.date)}
                </span>
                {it.isOverdue ? (
                  <Badge tone="danger">{isVi ? "Quá hạn" : tr("Overdue")}</Badge>
                ) : (
                  <Badge tone={it.type === "LOCK" ? "warn" : "info"}>
                    {it.type === "LOCK" ? (isVi ? "Xem xét khóa" : tr("Review lock")) : (isVi ? "Tái khám" : tr("Follow-up"))}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------
// Veterinarian Dashboard
// ------------------------------------------------------------------
export function VetDashboard() {
  const { isVietnamese: isVi } = useAppLanguage();
  const board = useLoaded(getHealthBoard);
  const s = board.data?.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="lock"
          iconBg="var(--danger-bg)"
          iconColor="var(--danger)"
          label={isVi ? "Lệnh khóa y tế hiệu lực" : "Training Locks in force"}
          value={s?.lockedCount ?? "—"}
          trend={
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>
              {isVi ? "Tạm ngưng bài tập nặng" : "Heavy workouts paused"}
            </span>
          }
          to="/locks"
        />
        <InteractiveKpiCard
          icon="heart"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Đang theo dõi đặc biệt" : tr("Under observation")}
          value={s?.observationCount ?? "—"}
          trend={
            <span style={{ color: "var(--warn)", fontWeight: 600 }}>
              {isVi ? "Ghi nhận từ Groom / HLV" : "Noted by groom / trainer"}
            </span>
          }
          to="/herd"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg="var(--violet-bg)"
          iconColor="var(--violet)"
          label={isVi ? "Chấn thương / Cách ly" : tr("Injured / Isolated")}
          value={s?.injuredCount != null && s.isolatedCount != null ? s.injuredCount + s.isolatedCount : "—"}
          trend={
            <span>
              {s?.injuredCount ?? 0} {isVi ? "chấn thương" : "injured"} · {s?.isolatedCount ?? 0} {isVi ? "cách ly" : "isolated"}
            </span>
          }
          to="/herd"
        />
        <InteractiveKpiCard
          icon="calendar"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Chăm sóc quá hạn" : tr("Care overdue")}
          value={s?.overdueCount ?? "—"}
          trend={<span>{isVi ? "Tiêm phòng · Tẩy giun · Móng" : "Vaccines · Deworm · Farrier"}</span>}
          to="/medical/preventive"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <AbnormalSignsWidget />
        <UpcomingFollowUpsWidget />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Groom Hand Dashboard
// ------------------------------------------------------------------
export function GroomDashboard() {
  const { isVietnamese: isVi } = useAppLanguage();
  const today = todayClub();
  const [weekStart, weekEnd] = clubWeek(today);
  const horses = useLoaded(() => getHorses({ limit: 100 }));
  const shifts = useLoaded(() => getMyShifts({ startDate: weekStart, endDate: weekEnd }));
  const tasks = useLoaded(() => dailyTasksApi.list({ date: today, onlyMine: true }));
  // Sự cố còn mở = mới báo + đang xem xét.
  const openIncidents = useLoaded(() =>
    Promise.all([
      incidentsApi.list({ status: "REPORTED", limit: 1 }),
      incidentsApi.list({ status: "UNDER_REVIEW", limit: 1 }),
    ]).then(([a, b]) => a.total + b.total),
  );
  const t = tasks.data?.stats;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="home"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Ngựa phụ trách" : tr("Assigned horses")}
          value={horses.data?.items.length ?? "—"}
          trend={<span>{isVi ? "Theo ô chuồng được phân" : "By assigned stalls"}</span>}
          to="/horses"
        />
        <InteractiveKpiCard
          icon="calendar"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Ca trực tuần này" : tr("Weekly Roster")}
          value={shifts.data?.length ?? "—"}
          trend={<span>{isVi ? "Thứ Hai – Chủ Nhật" : "Monday – Sunday"}</span>}
          to="/stable/shifts"
        />
        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Nhiệm vụ hôm nay" : tr("Daily tasks")}
          value={t ? `${t.completed}/${t.total}` : "—"}
          trend={<span>{isVi ? "Đã xong / tổng việc" : "Done / total"}</span>}
          progress={t && t.total > 0 ? Math.round((t.completed / t.total) * 100) : undefined}
          to="/tasks"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg="var(--danger-bg)"
          iconColor="var(--danger)"
          label={isVi ? "Sự cố cần kiểm tra" : tr("Incidents")}
          value={openIncidents.data ?? "—"}
          trend={<span>{isVi ? "Mới báo hoặc đang xem xét" : "Reported or under review"}</span>}
          to="/incidents"
        />
      </div>

      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="activity" size={18} />
            <h3 className={styles.widgetTitle}>
              {isVi ? "Nhiệm vụ chăm sóc ngựa" : tr("Daily Care Tasks")}
            </h3>
          </div>
          <Link to="/tasks" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600, textDecoration: "none" }}>
            {isVi ? "Chi tiết nhiệm vụ →" : tr("All tasks →")}
          </Link>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
          {t
            ? isVi
              ? `Hôm nay đã xong ${t.completed}/${t.total} việc, còn ${t.pending} việc.`
              : `${t.completed}/${t.total} tasks done today, ${t.pending} left.`
            : "—"}
        </p>

        {tasks.data?.items && tasks.data.items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
            {tasks.data.items.slice(0, 4).map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--r)",
                  background: "var(--surface-muted, rgba(0,0,0,0.02))",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <Icon
                    name={task.isCompleted ? "check" : "clock"}
                    size={16}
                    style={{ color: task.isCompleted ? "var(--ok, #10b981)" : "var(--warn, #f59e0b)" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: "2px" }}>
                      {task.horse?.name ? `${task.horse.name} · ` : ""}{task.scheduledTime || ""}
                    </div>
                  </div>
                </div>
                <Badge tone={task.isCompleted ? "ok" : "warn"}>
                  {task.isCompleted ? (isVi ? "Hoàn thành" : "Done") : (isVi ? "Chưa xong" : "Pending")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------
// Horse Owner Dashboard
// ------------------------------------------------------------------
export function OwnerDashboard() {
  const { isVietnamese: isVi } = useAppLanguage();
  const horses = useLoaded(() => getHorses({ limit: 100 }));
  const plans = useLoaded(() => trainingApi.getPlans({ status: "ACTIVE" }));
  const summary = useLoaded(() => fetchOwnerSummary());
  const myHorsesCount = horses.data?.total ?? "—";
  const latestInvoice = summary.data
    ? [...summary.data.invoices].sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod))[0]
    : undefined;
  const invoiceText = !summary.data
    ? "—"
    : latestInvoice
      ? invoiceStatusLabel(latestInvoice.status, true)
      : isVi
        ? "Chưa có"
        : "None";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="horse"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Ngựa sở hữu" : tr("Owned horses")}
          value={myHorsesCount}
          trend={<span>{isVi ? "Đang gửi nuôi tại CLB" : "Boarded at club"}</span>}
          to="/my-horses"
        />
        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Giáo án đang chạy" : tr("Active plans")}
          value={plans.data?.length ?? "—"}
          trend={<span>{isVi ? "Của các ngựa bạn sở hữu" : "For your horses"}</span>}
          to="/progress"
        />
        <InteractiveKpiCard
          icon="dollar"
          iconBg="var(--violet-bg)"
          iconColor="var(--violet)"
          label={isVi ? "Báo cáo chi phí & Tiền thưởng" : "Cost & Prize Report"}
          value={invoiceText}
          trend={<span>{latestInvoice ? latestInvoice.billingPeriod : isVi ? "Xem sao kê định kỳ" : "View periodic report"}</span>}
          to="/financial-reports"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.widgetTitle}>
              {isVi ? "Tiến độ huấn luyện ngựa của bạn" : tr("Training Progress")}
            </h3>
            <Link to="/progress" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
              {isVi ? "Chi tiết giáo án →" : tr("Plan detail →")}
            </Link>
          </div>
          {plans.data && plans.data.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
              {plans.data.map((p) => (
                <li key={p.id}>
                  <Link to={`/training/plans/${p.id}`}>{p.horseName}</Link> · {p.name}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
              {plans.data ? (isVi ? "Chưa có giáo án đang áp dụng." : "No active plan.") : "—"}
            </p>
          )}
        </Card>

      </div>
    </div>
  );
}
