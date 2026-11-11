import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./RoleDashboards.module.css";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/components/ui/Icon";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { formatDate } from "@/shared/lib/format";
import type { HealthStatus } from "@/shared/types/enums";
import type { AuthUser } from "@/shared/types/auth";
import { getHealthBoard, healthApi } from "@/features/health/api";
import { todayClub, clubParts, trainingApi } from "@/features/training/api";
import { EXERCISE_TYPE_LABEL, SESSION_STATUS_LABEL, INTENSITY_LABEL, TRACK_LABEL } from "@/features/training/types";
import { getZones } from "@/features/stable/api";
import { getHorses } from "@/features/horses/api";
import { listAccounts } from "@/features/accounts/api";
import { fetchTournamentDetail, fetchTournaments } from "@/features/racing/api";
import { dailyTasksApi } from "@/features/stable/api/dailyTasksApi";
import { getMyShifts } from "@/features/stable/api/shiftRosterApi";
import { incidentsApi } from "@/features/stable/api/incidentsApi";
import { fetchOwnerSummary } from "@/features/financial/api";
import { invoiceStatusLabel } from "@/features/financial/invoiceStatus";
import type { Tournament } from "@/features/racing/types";
import { Block, useLoaded } from "./DashboardBlocks";
import { ActionItemsCard } from "./ActionItemsCard";
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
}: {
  icon?: string;
  iconImg?: string;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  progress?: number;
  to: string;
}) {
  return (
    <Link to={to} className={styles.kpiCard}>
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
  const pending = useLoaded(
    () => listAccounts().then((r) => r.accounts.filter((a) => a.status === "PENDING_APPROVAL")),
    !!user.permissions.manageAccounts,
  );
  const todaySessions = useLoaded(() => trainingApi.getSessions({ date: todayClub() }));

  const s = board.data?.summary;
  const k = overview.data?.kpis;
  const zoneTotal = (zones.data ?? []).reduce((n, z) => n + (z.stallCount ?? 0), 0);
  const zoneUsed = (zones.data ?? []).reduce((n, z) => n + (z.occupiedCount ?? 0), 0);
  const occupancyPercent = zoneTotal ? Math.round((zoneUsed / zoneTotal) * 100) : 0;

  const pendingCount = pending.data?.length ?? 0;
  const emptyStallsCount = zoneTotal - zoneUsed;

  const activeHorsesCount = overview.data?.rows?.filter((r) => r.plan?.status === "ACTIVE").length ?? k?.activePlans ?? 0;
  const totalHorsesCount = s?.total ?? overview.data?.rows?.length ?? 0;
  const restingOrOtherCount = Math.max(0, totalHorsesCount - activeHorsesCount);

  // Attention Horses for Right Column
  const attentionHorses = (board.data?.data ?? [])
    .filter((h) => h.isMedicalLocked || h.healthGroup !== "QUALIFIED")
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          pendingCount={pending.data ? pendingCount : null}
          emptyStallsCount={zones.data ? emptyStallsCount : null}
          lockedCount={s?.lockedCount ?? null}
          loading={pending.loading || zones.loading || board.loading}
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
                const isIsolated = h.status === "ISOLATED";
                const isInjured = h.status === "INJURED";
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
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: isIsolated ? "var(--violet-bg)" : isInjured ? "var(--danger-bg)" : "var(--warn-bg)",
                          color: isIsolated ? "var(--violet)" : isInjured ? "var(--danger)" : "var(--warn)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "14px",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="horse" size={20} />
                      </div>

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

  // Ngựa cần phân bổ giáo án (chưa có giáo án hoặc đang ở bản nháp)
  const unassignedHorses = rows.filter((r) => !r.plan || r.plan.status === "DRAFT");
  const next = overview.data?.nextWorkout;
  const plan = overview.data?.latestPlan;
  const nextTime = next ? clubParts(next.scheduledDate) : null;
  const labelFor = (labels: Record<string, string>, value: string | null) => value ? tr(labels[value] ?? value) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 4 Thẻ KPI chính */}
      <div className={styles.kpiGrid}>
        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Đang huấn luyện" : "In training"}
          value={overview.loading ? "—" : `${inTraining} / ${totalHorses}`}
          trend={
            <span>
              {inTraining} {isVi ? "có giáo án" : "with plan"} · {withoutPlan} {isVi ? "chờ xếp lịch" : "unplanned"}
            </span>
          }
          to="/training?filter=ACTIVE"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg={withoutPlan > 0 ? "var(--warn-bg)" : "var(--surface-sunken)"}
          iconColor={withoutPlan > 0 ? "var(--warn)" : "var(--muted)"}
          label={isVi ? "Chưa có giáo án" : "Needs training plan"}
          value={overview.loading ? "—" : withoutPlan}
          trend={
            withoutPlan > 0 ? (
              <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                {isVi ? "⚠️ Cần lập kế hoạch" : "Action needed"}
              </span>
            ) : (
              <span style={{ color: "var(--ok)", fontWeight: 600 }}>
                {isVi ? "✓ Đã phân bổ 100%" : "✓ Fully assigned"}
              </span>
            )
          }
          to="/training?filter=NONE"
        />
        <InteractiveKpiCard
          icon="lock"
          iconBg={injuredOrLocked > 0 ? "var(--danger-bg)" : "var(--surface-sunken)"}
          iconColor={injuredOrLocked > 0 ? "var(--danger)" : "var(--muted)"}
          label={isVi ? "Khóa y tế / Chấn thương" : "Medical lock / Injured"}
          value={overview.loading ? "—" : injuredOrLocked}
          trend={
            <span style={{ color: injuredOrLocked > 0 ? "var(--danger)" : "var(--muted)", fontWeight: injuredOrLocked > 0 ? 600 : 400 }}>
              {injuredOrLocked > 0 ? (isVi ? "Tạm dừng bài tập nặng" : "Heavy blocked") : (isVi ? "Đàn ngựa an toàn" : "Herd safe")}
            </span>
          }
          to="/locks"
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
              {isVi ? "Tỷ lệ sẵn sàng huấn luyện của đàn ngựa" : "Herd Training Readiness Breakdown"}
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "var(--fs-xs)" }}>
              {isVi
                ? `Tổng số ${totalHorses} ngựa đang quản lý tại câu lạc bộ TMEC`
                : `Total ${totalHorses} managed horses in TMEC club`}
            </p>
          </div>
          <Link to="/training" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600 }}>
            {isVi ? "Xem bảng tổng quan chi tiết →" : "View training overview →"}
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

      {/* Widget trung tâm: Ngựa cần phân bổ giáo án & Lên lịch */}
      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className={styles.widgetTitle} style={{ fontSize: "1.2rem" }}>
              {isVi ? "Ngựa cần phân bổ giáo án & lên lịch" : "Horses Needing Training Plans"}
            </h3>
            {unassignedHorses.length > 0 && (
              <Badge tone="warn">
                {isVi ? `${unassignedHorses.length} ngựa cần xếp lịch` : `${unassignedHorses.length} pending`}
              </Badge>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <LinkButton to="/training/plans/new" tone="primary" size="sm">
              {isVi ? "+ Tạo giáo án mới" : "+ New Plan"}
            </LinkButton>
            <Link to="/training?filter=NONE" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
              {isVi ? "Xem tất cả →" : "View all →"}
            </Link>
          </div>
        </div>

        {unassignedHorses.length === 0 ? (
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
            <LinkButton to="/training" tone="secondary" size="sm">
              {isVi ? "Xem tổng quan huấn luyện" : "View Training Overview"}
            </LinkButton>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Ngựa" : "Horse"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Chuồng nuôi" : "Stall"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Tình trạng y tế" : "Medical Status"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>{isVi ? "Tình trạng giáo án" : "Plan Status"}</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{isVi ? "Hành động" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {unassignedHorses.map((r) => {
                  const isLocked = r.horse.isMedicalLocked || r.horse.status === "INJURED";
                  return (
                    <tr key={r.horse.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <Link to={`/horses/${r.horse.id}`} style={{ fontWeight: 700, color: "var(--text)" }}>
                          {r.horse.name}
                        </Link>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                          {r.horse.horseCode ?? "—"} {r.horse.breed ? `· ${r.horse.breed}` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
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
                            {isVi ? "Chưa xếp chuồng" : "No stall"}
                          </span>
                        )}
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
                            {isVi ? `Chờ kích hoạt: ${r.plan.name}` : `Pending: ${r.plan.name}`}
                          </Badge>
                        ) : (
                          <Badge tone="warn">
                            {isVi ? "Chưa có giáo án" : "No training plan"}
                          </Badge>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {r.plan?.status === "DRAFT" ? (
                          <LinkButton to={`/training/plans/${r.plan.id}`} tone="secondary" size="sm">
                            {isVi ? "Xem & Kích hoạt" : "Review & Activate"}
                          </LinkButton>
                        ) : r.horse.isMedicalLocked ? (
                          // Ngựa đang bị Khóa huấn luyện: BE không cho tạo giáo án, nên chặn sẵn và nói rõ lý do.
                          <Button
                            tone="secondary"
                            size="sm"
                            blockedReason={isVi ? "Ngựa đang bị Khóa huấn luyện. Chờ Bác sĩ thú y gỡ khóa." : "The horse is under a Training Lock. Wait for the Veterinarian to lift it."}
                          >
                            {isVi ? "+ Lập giáo án" : "+ Setup Plan"}
                          </Button>
                        ) : (
                          <LinkButton
                            to={`/training/plans/new?horseId=${r.horse.id}`}
                            tone="primary"
                            size="sm"
                          >
                            {isVi ? "+ Lập giáo án" : "+ Setup Plan"}
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

      {/* Grid phụ bên dưới: Cảnh báo tải trọng & Lịch tập, Giải đấu sắp tới */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
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

        <UpcomingTournamentsWidget />
      </div>

      <Block title={tr("Your next actions")} state={overview}>
        {() => (
          <div className={styles.trainerActions}>
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
                  <LinkButton to="/training/plans/new" tone="primary">{tr("Create training plan")}</LinkButton>
                </div>
              )}
            </Card>
          </div>
        )}
      </Block>
    </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.widgetTitle}>
              {isVi ? "Dấu hiệu bất thường & Hồ sơ cần xử lý" : "Abnormal signs to review"}
            </h3>
            <Link to="/records" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
              {isVi ? "Hồ sơ bệnh án →" : tr("All records →")}
            </Link>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
            {isVi ? "Mở hồ sơ bệnh án để xem thông tin cần xử lý." : "Open medical records to review clinical information."}
          </p>
        </Card>

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.widgetTitle}>
              {isVi ? "Nhiệm vụ chăm sóc ngựa" : tr("Daily Care Tasks")}
            </h3>
            <Link to="/tasks" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
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
        </Card>

        <UpcomingTournamentsWidget />
      </div>
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
  const mine = horses.data ? new Set(horses.data.items.map((h) => h.id)) : null;
  // shortcut: 1 lượt gọi chi tiết cho mỗi giải có người đăng ký; thêm endpoint đếm theo chủ ngựa khi số giải lớn.
  const entries = useLoaded(
    () =>
      fetchTournaments({ limit: 100 }).then(async (res) => {
        const withEntries = res.items.filter((t) => (t.registeredCount ?? 0) > 0);
        const details = await Promise.all(withEntries.map((t) => fetchTournamentDetail(t.id)));
        return details.flatMap((d) => d.registrations ?? []);
      }),
  );
  const myHorsesCount = horses.data?.total ?? "—";
  const raceEntries = entries.data && mine ? entries.data.filter((r) => mine.has(r.horseId)).length : "—";
  const latestInvoice = summary.data
    ? [...summary.data.invoices].sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod))[0]
    : undefined;
  const invoiceText = !summary.data
    ? "—"
    : latestInvoice
      ? invoiceStatusLabel(latestInvoice.status)
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
          icon="calendar"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Giải đua đã tham gia" : tr("Races entered")}
          value={raceEntries}
          trend={<span>{isVi ? "Lượt đăng ký thi đấu" : "Race registrations"}</span>}
          to="/races"
        />
        <InteractiveKpiCard
          icon="dollar"
          iconBg="var(--violet-bg)"
          iconColor="var(--violet)"
          label={isVi ? "Bảng kê gần nhất" : "Latest statement"}
          value={invoiceText}
          trend={<span>{latestInvoice ? latestInvoice.billingPeriod : isVi ? "Xem sao kê minh bạch" : "View statement"}</span>}
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

        <UpcomingTournamentsWidget />
      </div>
    </div>
  );
}
