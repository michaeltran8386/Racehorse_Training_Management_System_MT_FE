import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
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
import { formatScore, formatNumber } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import { evaluateReadiness } from "../lib/readiness";

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
  const [lockedHorseModal, setLockedHorseModal] = useState<{
    id: string;
    name: string;
    horseCode?: string | null;
    status: string;
  } | null>(null);

  useEffect(() => {
    const f = searchParams.get("filter") ?? searchParams.get("plan");
    if (f === "ACTIVE" || f === "DRAFT" || f === "NONE" || f === "LOCKED") {
      setPlanFilter(f);
    }
    if (f === "SPIKE") {
      setSpikeOnly(true);
    }
    const h = searchParams.get("horse");
    if (h) {
      setSearch(h);
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

  const rows = data.rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.horse.name.toLowerCase().includes(q) ||
        (r.horse.horseCode && r.horse.horseCode.toLowerCase().includes(q)) ||
        r.horse.id.toLowerCase().includes(q);

      const matchesPlan =
        planFilter === "ALL" ||
        (planFilter === "ACTIVE" && r.plan?.status === "ACTIVE") ||
        (planFilter === "DRAFT" && r.plan?.status === "DRAFT") ||
        (planFilter === "NONE" && !r.plan) ||
        (planFilter === "LOCKED" &&
          (r.horse.isMedicalLocked ||
            r.horse.status === "INJURED" ||
            r.horse.status === "UNDER_OBSERVATION"));

      const matchesSpike = !spikeOnly || r.loadSpike;

      return matchesSearch && matchesPlan && matchesSpike;
    })
    .sort((a, b) => {
      // Bậc thang 6 cấp độ ưu tiên sẵn sàng thi đấu
      const rank = (r: OverviewRow) => {
        const h = r.horse;
        if (h.isDebtImpounded || h.status === "RETIRED") return 6;
        if (h.isMedicalLocked || h.status === "INJURED" || h.status === "ISOLATED") return 5;
        if (h.status === "UNDER_OBSERVATION") return 4;
        if (h.status === "ACTIVE") return 1;
        if (h.status === "IN_TRAINING" || r.plan?.status === "ACTIVE") return 2;
        if (h.status === "RESTING" || !r.plan) return 3;
        return 3;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.horse.name.localeCompare(b.horse.name, "vi");
    });
  const k = data.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title="Training Overview"
        description="Progress and fitness of every managed horse."
        action={<>
          <Link className={styles.secondaryAction} to="/training/calendar">{tr("Today's schedule")}</Link>
          {user.role === "HEAD_TRAINER" && (
            <Link className={styles.secondaryAction} to="/training/plans">
              {isVietnamese ? "Danh sách giáo án & Ngựa chờ →" : tr("Training Plans & Awaiting →")}
            </Link>
          )}
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
              color: (k.horsesWithoutPlan ?? 0) > 0 ? "var(--warn)" : undefined,
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
          <div className={styles.search}>
            <Input
              icon="search"
              aria-label={isVietnamese ? "Tìm kiếm chiến mã..." : tr("Search horse...")}
              placeholder={isVietnamese ? "Tìm theo tên hoặc mã ngựa..." : tr("Search horse name or code...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filter}>
            <Select
              aria-label={tr("Filter by plan")}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              options={[
                { value: "ALL", label: isVietnamese ? "Tất cả giáo án" : tr("All plans") },
                { value: "ACTIVE", label: isVietnamese ? "Đang huấn luyện (Có giáo án)" : tr("With an active plan") },
                { value: "NONE", label: isVietnamese ? "Chưa có giáo án (Cần xếp lịch)" : tr("Without training plan") },
                { value: "DRAFT", label: isVietnamese ? "Giáo án chờ kích hoạt" : tr("With draft plan") },
                { value: "LOCKED", label: isVietnamese ? "Khóa y tế / Chấn thương" : tr("Medically locked / Injured") },
              ]}
            />
          </div>
          <Checkbox label={tr("Only sudden load increase")} checked={spikeOnly} onChange={setSpikeOnly} />
        </div>
      </Card>

      {planFilter === "NONE" && (
        <Alert
          tone="info"
          title={isVietnamese ? "Đang lọc: Danh sách chiến mã chưa có giáo án" : "Filtered: Horses without training plan"}
        >
          {isVietnamese
            ? "Hệ thống đang hiển thị các chiến mã chưa có kế hoạch huấn luyện. Hãy bấm nút \"+ Tạo giáo án\" tại dòng chiến mã bạn muốn thiết lập lộ trình."
            : "Showing horses without an active training plan. Click \"+ Create plan\" on any horse to begin."}
        </Alert>
      )}

      <div id="training-overview-table">
        <Card>
        {data.rows.length === 0 ? (
          <EmptyState title={tr("No horses to follow yet.")} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              planFilter === "NONE"
                ? (isVietnamese ? "Tuyệt vời! Tất cả các chiến mã đều đã có giáo án hoặc đang được chăm sóc y tế." : tr("All horses currently have training plans."))
                : tr("No horses match the filter.")
            }
          />
        ) : (
          <Paged items={rows} noun="horses">{(pageRows) => (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                  {["Horse", "Current plan", "Trainer", "Current phase", "Progress", "Latest score", "7-day load", "Next workout", ""].map((h) => (
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
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", marginTop: "4px" }}>
                          {r.horse.stallCode && (
                            <span style={{
                              fontSize: "11px",
                              color: "var(--text)", whiteSpace: "nowrap",
                              background: "var(--surface-sunken)",
                              border: "1px solid var(--border)",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: 600,
                            }}>
                              {r.horse.stallCode}
                            </span>
                          )}
                          {evaluateReadiness(r).isEligible ? (
                            <span title={isVietnamese ? "Chiến mã hội đủ 4 tiêu chuẩn thi đấu (Sức khỏe, Giáo án, Điểm chạy thử, Tải trọng)" : "Meets all 4 competition readiness standards"}>
                              <Badge tone="ok">{isVietnamese ? "Sẵn sàng thi đấu" : "Ready to Race"}</Badge>
                            </span>
                          ) : (
                            <span title={tr("Horse status")}>
                              <Badge tone={st.tone as never}>{st.label}</Badge>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.plan ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                              {r.plan.name}
                            </span>
                            {r.plan.status === "DRAFT" && (
                              <div>
                                <Badge tone="info">
                                  {isVietnamese ? "Chờ kích hoạt" : tr("Pending Activation")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 600, color: r.horse.status === "RESTING" ? "var(--ink)" : "var(--text-muted)" }}>
                              {r.horse.status === "RESTING"
                                ? (isVietnamese ? "Nghỉ ngơi hồi phục" : "Resting & Recovery")
                                : (isVietnamese ? "Chưa có giáo án" : tr("No plan"))}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {isVietnamese ? "Sẵn sàng lập kế hoạch mới" : "Ready for new plan"}
                            </span>
                            {/* Trạng thái ngựa do quản lý / thú y đặt, không tự đổi theo giáo án -> nói rõ khi lệch nhau */}
                            {r.horse.status === "IN_TRAINING" && (
                              <span title={tr("Marked “In training” but no plan yet – create one or update the horse status.")}>
                                <Badge tone="warn">{tr("Status mismatch")}</Badge>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                        {r.horse.assignedTrainer?.fullName ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{r.horse.assignedTrainer.fullName}</span>
                            {user?.id === r.horse.assignedTrainer.id && (
                              <Badge tone="info">{isVietnamese ? "Của bạn" : "Yours"}</Badge>
                            )}
                          </div>
                        ) : (
                          r.plan?.trainerName ? (
                            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{r.plan.trainerName}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>{isVietnamese ? "Chưa phân công" : "—"}</span>
                          )
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
                            overdueHref={r.plan ? `/training/plans/${r.plan.id}?status=OVERDUE` : undefined}
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
                            {formatScore(r.latestScore)}/10{" "}
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
                        }}
                        title={
                          isVietnamese
                            ? "Điểm tải = Cự ly (km) × Số hiệp × Hệ số cường độ (Nhẹ: 1, Vừa: 2, Nặng: 3)"
                            : tr("Load score = Distance (km) × Repetitions × Intensity factor")
                        }
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                          <span style={{ cursor: "help", whiteSpace: "nowrap", fontWeight: r.loadSpike ? 700 : 500 }}>
                            {formatNumber(r.load7d, 2)} {isVietnamese ? "điểm" : tr("pts")}
                          </span>
                          {r.loadSpike && (
                            <Badge tone="danger">
                              {isVietnamese ? "Tăng đột ngột (>130% TB 4 tuần)" : tr("Sudden increase")}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {r.nextWorkout
                          ? `${clubParts(r.nextWorkout.date).date.slice(5)} ${clubParts(r.nextWorkout.date).time} – ${EXERCISE_TYPE_LABEL[r.nextWorkout.workoutType] ? tr(EXERCISE_TYPE_LABEL[r.nextWorkout.workoutType]) : r.nextWorkout.workoutType}`
                          : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "0.35rem" }}>
                          {r.plan ? (
                            <LinkButton to={`/training/plans/${r.plan.id}`} size="sm" tone="secondary">
                              {tr("View plan")}
                            </LinkButton>
                          ) : (
                            user.role === "HEAD_TRAINER" && (
                              <Button
                                size="sm"
                                tone="primary"
                                onClick={() => {
                                  if (r.horse.isMedicalLocked) {
                                    setLockedHorseModal({
                                      id: r.horse.id,
                                      name: r.horse.name,
                                      horseCode: r.horse.horseCode,
                                      status: r.horse.status,
                                    });
                                    return;
                                  }
                                  navigate(`/training/plans/new?horseId=${r.horse.id}`);
                                }}
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
    
      {lockedHorseModal && (
        <Modal
          title={isVietnamese ? "Không thể tạo giáo án huấn luyện" : "Cannot Create Training Plan"}
          tone="danger"
          width={500}
          onClose={() => setLockedHorseModal(null)}
          foot={
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button tone="secondary" onClick={() => setLockedHorseModal(null)}>
                {isVietnamese ? "Đóng" : tr("Close")}
              </Button>
              <LinkButton
                to={`/records/horse/${lockedHorseModal.id}`}
                tone="primary"
              >
                {isVietnamese ? "Xem hồ sơ bệnh án" : tr("View medical records")}
              </LinkButton>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Badge tone="danger">
                <Icon name="lock" inline size={12} /> {isVietnamese ? "Khóa huấn luyện y tế" : "Medical Lock Active"}
              </Badge>
              <span style={{ fontWeight: 600 }}>{lockedHorseModal.name} {lockedHorseModal.horseCode ? `(${lockedHorseModal.horseCode})` : ""}</span>
            </div>
            <p style={{ margin: 0, fontSize: "var(--fs-body)", lineHeight: 1.5, color: "var(--text)" }}>
              {isVietnamese
                ? "Ngựa hiện đang bị Khóa y tế bởi Bác sĩ thú y. Mọi kế hoạch tập luyện và tạo giáo án tạm thời bị khóa."
                : "This horse is currently under a Medical Lock. Training plans cannot be created until the lock is lifted."}
            </p>
            <div style={{ background: "var(--surface-sunken)", padding: "0.75rem", borderRadius: "6px", fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
              {isVietnamese
                ? "Vui lòng liên hệ Bác sĩ thú y để kiểm tra và gỡ khóa trên Hồ sơ bệnh án."
                : "Please contact the Veterinarian to assess and lift the lock in the Medical Record before planning workouts."}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}