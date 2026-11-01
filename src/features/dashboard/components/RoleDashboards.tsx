import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./RoleDashboards.module.css";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/components/ui/Icon";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import type { HealthStatus } from "@/shared/types/enums";
import type { AuthUser } from "@/shared/types/auth";
import { getHealthBoard } from "@/features/health/api";
import { todayClub, trainingApi } from "@/features/training/api";
import { EXERCISE_TYPE_LABEL, SESSION_STATUS_LABEL } from "@/features/training/types";
import { getZones } from "@/features/stable/api";
import { getHorses } from "@/features/horses/api";
import { listAccounts } from "@/features/accounts/api";
import { fetchTournamentDetail, fetchTournaments } from "@/features/racing/api";
import { dailyTasksApi } from "@/features/stable/api/dailyTasksApi";
import { getMyShifts } from "@/features/stable/api/shiftRosterApi";
import { incidentsApi } from "@/features/stable/api/incidentsApi";
import { fetchOwnerSummary } from "@/features/financial/api";
import type { InvoiceStatus } from "@/features/financial/types";
import type { Tournament } from "@/features/racing/types";
import { useLoaded } from "./DashboardBlocks";
import { ActionItemsCard } from "./ActionItemsCard";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";

const INVOICE_STATUS_VI: Record<InvoiceStatus, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  CANCELLED: "Đã hủy",
};
const INVOICE_STATUS_EN: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

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

// ------------------------------------------------------------------
// Interactive KPI Tile (Matches Image 2 Top Row)
// ------------------------------------------------------------------
const KPI_CUSTOM_ICONS: Record<string, string> = {
  horse: "/images/icons/kpi-horse.png",
  activity: "/images/icons/kpi-activity.png",
  pulse: "/images/icons/kpi-activity.png",
  heart: "/images/icons/kpi-medical.png",
  medical: "/images/icons/kpi-medical.png",
  home: "/images/icons/kpi-barn.png",
  barn: "/images/icons/kpi-barn.png",
};

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
  const customImg = iconImg || (icon ? KPI_CUSTOM_ICONS[icon] : undefined);

  return (
    <Link to={to} className={styles.kpi}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "var(--r)",
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
            padding: customImg ? "6px" : undefined,
          }}
        >
          {customImg ? (
            <img
              src={customImg}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <Icon name={icon || "info"} size={26} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.label}>
            {label}
          </div>
          <div className={styles.value}>
            {value}
          </div>
          {progress !== undefined ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ flex: 1, height: 6, borderRadius: 0, background: "var(--surface-sunken, #e5e7eb)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: "var(--brand)", borderRadius: 0 }} />
              </div>
              <span style={{ fontSize: "var(--fs-xs, 0.75rem)", fontWeight: 700, color: "var(--muted)" }}>{progress}%</span>
            </div>
          ) : trend ? (
            <div style={{ fontSize: "var(--fs-xs, 0.75rem)", color: "var(--muted)", marginTop: "2px" }}>
              {trend}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ color: "var(--muted)", paddingLeft: "12px", display: "flex", alignItems: "center" }}>
        <Icon name="chevronRight" size={18} />
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
          <span style={{ fontSize: "1.125rem" }}>🏆</span>
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
                      📍 {t.location}
                    </div>
                  </div>
                </div>

                <Badge tone={isOpen ? "ok" : isCompleted ? "neutral" : "info"}>
                  {isVi ? (TOURNAMENT_STATUS_LABEL[t.status] || t.status) : tr(t.status)}
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

  // Attention Horses for Right Column
  const attentionHorses = (board.data?.data ?? [])
    .filter((h) => h.isMedicalLocked || h.healthGroup !== "QUALIFIED")
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Top 4 Stat Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
        <InteractiveKpiCard
          icon="horse"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Ngựa đang quản lý" : "Horses under management"}
          value={s?.total ?? "—"}
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
              {s?.lockedCount ?? "—"} {isVi ? "khóa huấn luyện" : "locked"} · {s?.observationCount ?? "—"} {isVi ? "cần theo dõi" : "watch"}
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
                        🐎
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                          {h.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({h.stallCode || "STALL"})</span>
                        </div>
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: "2px" }}>
                          📍 {h.isMedicalLocked ? (isVi ? "Khóa huấn luyện · Theo dõi" : "Medical Lock") : (h.latestRecord?.diagnosis || (isVi ? "Theo dõi sức khỏe" : "Under review"))}
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
              <span style={{ fontSize: "1.125rem" }}>📅</span>
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
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>🗓️</div>
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
              <span style={{ fontSize: "1.125rem" }}>🏠</span>
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
  const k = overview.data?.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
        <InteractiveKpiCard
          icon="activity"
          iconBg="var(--ok-bg)"
          iconColor="var(--ok)"
          label={isVi ? "Giáo án đang hoạt động" : "Active training plans"}
          value={k?.activePlans ?? "—"}
          trend={<span>{isVi ? "Đang huấn luyện tích cực" : "Active coaching"}</span>}
          to="/training/plans"
        />
        <InteractiveKpiCard
          icon="calendar"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Buổi tập hôm nay" : tr("Today's workouts")}
          value={k ? `${k.todayCompleted}/${k.todayTotal}` : "—"}
          trend={<span>{isVi ? "Hoàn thành / Kế hoạch" : "Done / Planned"}</span>}
          to="/training"
        />
        <InteractiveKpiCard
          icon="lock"
          iconBg="var(--danger-bg)"
          iconColor="var(--danger)"
          label={isVi ? "Bị khóa y tế (7 ngày tới)" : tr("Blocked (7 days)")}
          value={k?.blockedNext7Days ?? "—"}
          trend={<span style={{ color: "var(--danger)" }}>{isVi ? "Cấm bài tập nặng" : "Heavy blocked"}</span>}
          to="/locks"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Tải trọng tăng đột ngột" : tr("Load spike")}
          value={k?.loadSpikeHorses ?? "—"}
          trend={<span style={{ color: "var(--warn)" }}>ACWR {">"} 1.3</span>}
          to="/training"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "20px" }}>
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className={styles.widgetTitle}>
              {isVi ? "Ngựa cần theo dõi phong độ" : tr("Horses to watch")}
            </h3>
            <Link to="/training" style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)" }}>
              {isVi ? "Xem tổng quan →" : tr("Overview →")}
            </Link>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
            {k ? (isVi ? `${k.loadSpikeHorses} ngựa có tải trọng tăng đột ngột.` : `${k.loadSpikeHorses} ${k.loadSpikeHorses === 1 ? "horse" : "horses"} with a load spike.`) : (isVi ? "Chưa có dữ liệu tải trọng." : "Training load data is unavailable.")}
          </p>
        </Card>

        <UpcomingTournamentsWidget />
      </div>
    </div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
        <InteractiveKpiCard
          icon="lock"
          iconBg="var(--danger-bg)"
          iconColor="var(--danger)"
          label={isVi ? "Lệnh khóa y tế hiệu lực" : "Training Locks in force"}
          value={s?.lockedCount ?? "—"}
          to="/locks"
        />
        <InteractiveKpiCard
          icon="heart"
          iconBg="var(--warn-bg)"
          iconColor="var(--warn)"
          label={isVi ? "Đang theo dõi đặc biệt" : tr("Under observation")}
          value={s?.observationCount ?? "—"}
          to="/herd"
        />
        <InteractiveKpiCard
          icon="alert"
          iconBg="var(--violet-bg)"
          iconColor="var(--violet)"
          label={isVi ? "Chấn thương / Cách ly" : tr("Injured / Isolated")}
          value={s?.injuredCount != null && s.isolatedCount != null ? s.injuredCount + s.isolatedCount : "—"}
          to="/herd"
        />
        <InteractiveKpiCard
          icon="calendar"
          iconBg="var(--info-bg)"
          iconColor="var(--info)"
          label={isVi ? "Chăm sóc quá hạn" : tr("Care overdue")}
          value={s?.overdueCount ?? "—"}
          trend={<span>{isVi ? "Tiêm phòng / Đóng móng" : "Farrier / Vaccines"}</span>}
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

        <UpcomingTournamentsWidget />
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
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
      ? (isVi ? INVOICE_STATUS_VI : INVOICE_STATUS_EN)[latestInvoice.status]
      : isVi
        ? "Chưa có"
        : "None";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
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
