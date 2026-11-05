import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Paged } from "@/shared/components/ui/Pagination";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { HEALTH_STATUS } from "@/shared/lib/status";
import { messageFor } from "@/shared/lib/messages";
import type { HealthStatus } from "@/shared/types/enums";
import { clubParts, trainingApi } from "../api";
import { ProgressBar } from "../components/ProgressBar";
import { EXERCISE_TYPE_LABEL } from "../types";
import type { OverviewRow, TrainingOverview } from "../types";
import { Icon } from "@/shared/components/ui/Icon";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./TrainingOverviewPage.module.css";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
type SortKey = "name" | "progress" | "score" | "load" | "next";

/** SC-2.01 Tổng quan huấn luyện (CM, HT, VET). */
export default function TrainingOverviewPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useCurrentUser();
  const [data, setData] = useState<TrainingOverview | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [spikeOnly, setSpikeOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");

  useEffect(() => {
    const f = searchParams.get("filter") ?? searchParams.get("plan");
    if (f === "ACTIVE" || f === "DRAFT" || f === "NONE" || f === "LOCKED") {
      setPlanFilter(f);
    }
    if (f === "SPIKE") {
      setSpikeOnly(true);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await trainingApi.getOverview());
    } catch (err) {
      setError(messageFor(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Alert tone="danger" title={tr("Could not load data")}>
        {error} <Button size="sm" tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>
      </Alert>
    );
  }
  if (!data) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading overview...")}</div>;

  const q = search.toLowerCase();
  const pct = (r: OverviewRow) =>
    r.progress && (r.progress.total || r.progress.due)
      ? r.progress.completed / (r.progress.total || r.progress.due)
      : -1;
  const rows = data.rows
    .filter(
      (r) =>
        (r.horse.name.toLowerCase().includes(q) || (r.horse.horseCode ?? "").toLowerCase().includes(q)) &&
        (planFilter === "ALL" ||
          (planFilter === "ACTIVE" && r.plan?.status === "ACTIVE") ||
          (planFilter === "DRAFT" && r.plan?.status === "DRAFT") ||
          (planFilter === "NONE" && !r.plan) ||
          (planFilter === "LOCKED" && (r.horse.isMedicalLocked || r.horse.status === "INJURED" || r.horse.status === "UNDER_OBSERVATION"))) &&
        (!spikeOnly || r.loadSpike),
    )
    .sort((a, b) => {
      if (sort === "progress") return pct(b) - pct(a);
      if (sort === "score") return (b.latestScore ?? -1) - (a.latestScore ?? -1);
      if (sort === "load") return b.load7d - a.load7d;
      if (sort === "next") return (a.nextWorkout?.date ?? "9").localeCompare(b.nextWorkout?.date ?? "9");
      const rank = (r: OverviewRow) => {
        if (r.plan?.status === "ACTIVE") return 1;
        if (r.plan?.status === "DRAFT") return 2;
        return 3;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.horse.name.localeCompare(b.horse.name);
    });
  const k = data.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title="Training Overview"
        description="Progress and fitness of every managed horse."
        action={<>
          <Link className={styles.secondaryAction} to="/training/calendar">{tr("Today's schedule")}</Link>
          {user.role === "HEAD_TRAINER" && <Button tone="primary" onClick={() => navigate("/training/plans/new")}>{tr("+ Create plan")}</Button>}
        </>}
      />

      <div className={styles.metrics}>
        <button
          type="button"
          onClick={() => { setPlanFilter(planFilter === "ACTIVE" ? "ALL" : "ACTIVE"); setSpikeOnly(false); }}
          className={styles.metricButton}
          title={isVietnamese ? "Lọc ngựa đang huấn luyện" : "Filter active plans"}
        >
          <Card pad={16} className={planFilter === "ACTIVE" ? styles.activeMetricCard : undefined}>
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("Active plans")}</div>
            <div style={{ fontSize: "var(--fs-h1)", fontWeight: 700, color: planFilter === "ACTIVE" ? "var(--brand)" : undefined }}>
              {k.activePlans} / {k.managedHorses}
            </div>
            <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{isVietnamese ? "ngựa đang huấn luyện" : tr("horses managed")}</div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => { setPlanFilter(planFilter === "NONE" ? "ALL" : "NONE"); setSpikeOnly(false); }}
          className={styles.metricButton}
          title={isVietnamese ? "Lọc ngựa chưa có giáo án" : "Filter horses without plan"}
        >
          <Card pad={16} className={planFilter === "NONE" ? styles.activeMetricCard : undefined}>
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>
              {isVietnamese ? "Chưa có giáo án" : tr("Without plan")}
            </div>
            <div style={{
              fontSize: "var(--fs-h1)",
              fontWeight: 700,
              color: (k.horsesWithoutPlan ?? 0) > 0 ? "#d97706" : undefined,
            }}>
              {k.horsesWithoutPlan ?? 0}
            </div>
            <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              {isVietnamese ? "ngựa cần lập kế hoạch" : tr("needs planning")}
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => { setPlanFilter(planFilter === "LOCKED" ? "ALL" : "LOCKED"); setSpikeOnly(false); }}
          className={styles.metricButton}
          title={isVietnamese ? "Lọc ngựa bị khóa y tế / chấn thương" : "Filter locked horses"}
        >
          <Card pad={16} className={planFilter === "LOCKED" ? styles.activeMetricCard : undefined}>
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("Blocked by Training Lock")}</div>
            <div style={{
              fontSize: "var(--fs-h1)",
              fontWeight: 700,
              color: (k.horsesInjuredOrLocked ?? k.blockedNext7Days) ? "var(--danger)" : undefined,
            }}>
              {k.horsesInjuredOrLocked ?? k.blockedNext7Days}
            </div>
            <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              {isVietnamese ? "ngựa hạn chế bài tập" : tr("in the next 7 days")}
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => { setSpikeOnly(!spikeOnly); setPlanFilter("ALL"); }}
          className={styles.metricButton}
          title={isVietnamese ? "Lọc tải trọng tăng đột ngột" : "Filter load spike"}
        >
          <Card pad={16} className={spikeOnly ? styles.activeMetricCard : undefined}>
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>{tr("Sudden load increase")}</div>
            <div style={{ fontSize: "var(--fs-h1)", fontWeight: 700, color: k.loadSpikeHorses ? "var(--warn)" : undefined }}>{k.loadSpikeHorses}</div>
            <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{tr("horses above 130% of their 4-week average")}</div>
          </Card>
        </button>
      </div>

      <Card pad={16}>
        <div className={styles.filters}>
          <Input aria-label={tr("Horse name or code")} placeholder={tr("Horse name or code")} value={search} onChange={(e) => setSearch(e.target.value)} className={styles.search} />
          <div className={styles.filter}>
            <Select
              aria-label={tr("Filter by plan")}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              options={[
                { value: "ALL", label: tr("All horses") },
                { value: "ACTIVE", label: isVietnamese ? "Đang huấn luyện (Có giáo án)" : tr("With an active plan") },
                { value: "NONE", label: isVietnamese ? "Chưa có giáo án (Cần xếp lịch)" : tr("Without training plan") },
                { value: "DRAFT", label: isVietnamese ? "Có giáo án nháp" : tr("With a draft plan") },
                { value: "LOCKED", label: isVietnamese ? "Khóa y tế / Chấn thương" : tr("Medically locked / Injured") },
              ]}
            />
          </div>
          <div className={styles.filter}>
            <Select
              aria-label={tr("Sort")}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              options={[
                { value: "name", label: tr("Sort: horse") },
                { value: "progress", label: tr("Sort: progress") },
                { value: "score", label: tr("Sort: latest score") },
                { value: "load", label: tr("Sort: 7-day load") },
                { value: "next", label: tr("Sort: next workout") },
              ]}
            />
          </div>
          <Checkbox label={tr("Only sudden load increase")} checked={spikeOnly} onChange={setSpikeOnly} />
        </div>
      </Card>

      <Card>
        {data.rows.length === 0 ? (
          <EmptyState title={tr("No horses to follow yet.")} />
        ) : rows.length === 0 ? (
          <EmptyState title={tr("No horses match the filter.")} />
        ) : (
          <Paged items={rows} noun="horses">{(pageRows) => (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                  {["Horse", "Current plan", "Current phase", "Progress", "Latest score", "7-day load", "Next workout", ""].map((h) => (
                    <th key={h} style={{ padding: "0.6rem 0.75rem" }}>{h ? tr(h) : ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const st = HEALTH_STATUS[r.horse.status as HealthStatus] ?? { label: r.horse.status, tone: "neutral" };
                  const trend =
                    r.latestScore != null && r.previousAvgScore != null
                      ? r.latestScore > r.previousAvgScore
                        ? "up"
                        : r.latestScore < r.previousAvgScore
                          ? "down"
                          : ""
                      : "";
                  return (
                    <tr key={r.horse.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <Link to={`/horses/${r.horse.id}`}><strong>{r.horse.name}</strong></Link> {r.horse.isMedicalLocked && (
                      <span title={tr("Training Lock")} style={{ color: "var(--danger)", display: "inline-flex", verticalAlign: "-2px" }}>
                        <Icon name="lock" size={14} />
                        <span className="sr-only">{tr("Training Lock")}</span>
                      </span>
                    )}
                        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ color: "var(--text-muted)" }}>{r.horse.horseCode}</span>
                          {r.horse.stallCode && (
                            <span style={{
                              fontSize: "10px",
                              color: "var(--text)",
                              background: "var(--surface-sunken)",
                              padding: "1px 5px",
                              borderRadius: "3px",
                              fontWeight: 600,
                            }}>
                              {r.horse.stallCode}
                            </span>
                          )}
                          <Badge tone={st.tone as never}>{st.label}</Badge>
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.plan ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>
                              {r.plan.planCode ? <strong>{r.plan.planCode} </strong> : null}
                              {r.plan.name}
                            </span>
                            {r.plan.status === "DRAFT" && (
                              <div>
                                <Badge tone="neutral">
                                  {isVietnamese ? "Nháp – chưa kích hoạt" : tr("Draft – not activated")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>
                            {isVietnamese ? "Chưa có giáo án" : tr("None")}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.currentPhase ? tr(`${r.currentPhase.name} · week ${r.currentPhase.week}/${r.currentPhase.weeks}`) : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", minWidth: 140 }}>
                        {r.progress ? (
                          <ProgressBar
                            done={r.progress.completed}
                            total={r.progress.total ?? r.progress.due}
                            due={r.progress.due}
                            overdue={r.progress.overdue}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.latestScore != null ? (
                          <span
                            title={
                              isVietnamese
                                ? "So với trung bình 3 buổi trước"
                                : tr("Compared to 3-session prior average")
                            }
                            style={{ cursor: "help" }}
                          >
                            {r.latestScore}/10{" "}
                            {trend && (
                              <Icon name={trend === "up" ? "trend" : "trendDown"} inline size={14} style={{ color: trend === "up" ? "var(--ok)" : "var(--danger)" }} />
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          color: r.loadSpike ? "var(--danger)" : undefined,
                          fontWeight: r.loadSpike ? 600 : undefined,
                        }}
                        title={
                          isVietnamese
                            ? "Điểm tải = Cự ly (km) × Số hiệp × Hệ số cường độ (Nhẹ: 1, Vừa: 2, Nặng: 3)"
                            : tr("Load score = Distance (km) × Repetitions × Intensity factor")
                        }
                      >
                        <span style={{ cursor: "help" }}>
                          {r.load7d} {isVietnamese ? "điểm" : tr("pts")}{" "}
                          {r.loadSpike && (
                            <Badge tone="danger">
                              {isVietnamese ? "Tăng đột ngột (>130% TB 4 tuần)" : tr("Sudden increase")}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.nextWorkout
                          ? `${clubParts(r.nextWorkout.date).date.slice(5)} ${clubParts(r.nextWorkout.date).time} – ${EXERCISE_TYPE_LABEL[r.nextWorkout.workoutType] ? tr(EXERCISE_TYPE_LABEL[r.nextWorkout.workoutType]) : r.nextWorkout.workoutType}`
                          : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {r.plan ? (
                            <Button size="sm" tone="secondary" onClick={() => r.plan && navigate(`/training/plans/${r.plan.id}`)}>
                              {tr("View plan")}
                            </Button>
                          ) : (
                            user.role === "HEAD_TRAINER" && (
                              <Button
                                size="sm"
                                tone="primary"
                                onClick={() => navigate(`/training/plans/new?horseId=${r.horse.id}`)}
                              >
                                {isVietnamese ? "+ Tạo giáo án" : tr("+ Create plan")}
                              </Button>
                            )
                          )}
                          <LinkButton to={`/horses/${r.horse.id}/fitness`} size="sm" tone="ghost">{tr("Chart")}</LinkButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}</Paged>
        )}
      </Card>
    </div>
  );
}
