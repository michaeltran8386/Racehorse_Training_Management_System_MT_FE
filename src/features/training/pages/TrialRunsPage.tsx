import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { formatDateTime } from "@/shared/lib/format";
import { todayClub, trainingApi } from "../api";
import { SESSION_STATUS_LABEL, TRACK_LABEL } from "../types";
import type { ExerciseSession, TrainingPlan } from "../types";
import { WorkoutDialog } from "../components/WorkoutDialogs";

import { tr } from "@/shared/i18n/tr";
function plusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Lượt chạy thử (tab của SC-2.05): mỗi lượt là một buổi tập loại "Trial run".
 * Lên lịch trực tiếp hoặc ở Lịch tập; hệ thống chặn 2 lượt trên cùng mặt sân trong khung 15 phút.
 */
export default function TrialRunsPage() {
  const user = useCurrentUser();
  const toast = useToast();
  const { isVietnamese, t } = useAppLanguage();
  const [from, setFrom] = useState(todayClub());
  const [to, setTo] = useState(plusDays(todayClub(), 14));
  const [trials, setTrials] = useState<ExerciseSession[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const canManage = user.role === "HEAD_TRAINER" || user.role === "CLUB_MANAGER";

  const latestRequest = useRef(0);
  const load = useCallback(
    async (customFrom?: string, customTo?: string) => {
      const requestId = ++latestRequest.current;
      const queryFrom = customFrom ?? from;
      const queryTo = customTo ?? to;
      setLoading(true);
      try {
        const data = await trainingApi.getTrialRuns({ from: queryFrom, to: queryTo });
        if (requestId === latestRequest.current) setTrials(data);
      } catch (err) {
        if (requestId === latestRequest.current) toast.show(messageFor(err), "danger");
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    },
    [from, to, toast],
  );

  useEffect(() => {
    void load();
    trainingApi
      .getPlans()
      .then((data) => {
        setPlans(data);
        setPlansLoaded(true);
      })
      .catch(() => {
        setPlansLoaded(true);
      });
  }, [load]);

  const handleOpenSchedule = () => {
    setIsScheduleOpen(true);
  };

  const launchSimulation = async (workoutId: string) => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      toast.show(tr("Please allow pop-ups to open the simulation."), "danger");
      return;
    }
    popup.opener = null;
    setLaunchingId(workoutId);
    try {
      const { launchUrl } = await trainingApi.startSimulation(workoutId);
      popup.location.replace(launchUrl);
    } catch (err) {
      popup.close();
      toast.show(messageFor(err), "danger");
    } finally {
      setLaunchingId(null);
    }
  };

  // Nhóm theo ngày + mặt sân để điều phối.
  const groups = new Map<string, ExerciseSession[]>();
  for (const trSession of trials) {
    const key = `${trSession.sessionDate} · ${TRACK_LABEL[trSession.trackType]}`;
    groups.set(key, [...(groups.get(key) ?? []), trSession]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--fs-h1)", fontWeight: 700 }}>{t("trialRuns.title")}</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body)" }}>
            {t("trialRuns.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {canManage && (
            <Button tone="primary" onClick={handleOpenSchedule}>
              + {isVietnamese ? "Lên lịch chạy thử" : tr("Schedule Trial Run")}
            </Button>
          )}
          <Link to="/training/calendar">
            <Button tone="secondary">
              {isVietnamese ? "📅 Xem trên lịch tuần" : tr("📅 Weekly Calendar")}
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ padding: "0.625rem 0.875rem", borderRadius: "8px", background: "color-mix(in srgb, var(--brand) 6%, var(--surface))", border: "1px solid color-mix(in srgb, var(--brand) 20%, var(--border))", fontSize: "var(--fs-sm)", lineHeight: 1.5 }}>
        {isVietnamese ? (
          <>
            ⏱️ Giám sát các phiên chạy thử tốc độ cao. Đảm bảo giãn cách an toàn tối thiểu 15 phút giữa các lượt chạy cùng mặt sân.
          </>
        ) : (
          <>
            ⏱️ Monitor high-speed trial runs. A 15-minute safety interval is enforced between runs on the same track.
          </>
        )}
      </div>

      <Card pad={16}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label={isVietnamese ? "Từ ngày" : tr("From")}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={isVietnamese ? "Đến ngày" : tr("To")}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button tone="secondary" onClick={() => void load()}>
            {isVietnamese ? "Lọc" : tr("Filter")}
          </Button>
        </div>
      </Card>

      {loading || !plansLoaded ? (
        <SkeletonTable columns={5} rows={5} />
      ) : trials.length === 0 ? (
        <EmptyState
          title={isVietnamese ? "Chưa có lượt chạy thử nào trong khoảng thời gian này" : tr("No trial runs in this period")}
          description={isVietnamese ? "Các lượt chạy thử sẽ xuất hiện tại đây ngay khi được xếp lịch hoặc bạn có thể tạo phiên chạy thử mới." : tr("Trial runs appear here once they are scheduled.")}
          action={
            canManage ? (
              <Button tone="primary" onClick={handleOpenSchedule}>
                + {isVietnamese ? "Lên lịch chạy thử ngay" : tr("Schedule Trial Run Now")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        [...groups.entries()].map(([key, rows]) => (
          <Card key={key} pad={20}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{key}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "var(--fs-body)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                    <th style={{ padding: "0.5rem 0.75rem" }}>{isVietnamese ? "Giờ chạy" : tr("Time")}</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>{isVietnamese ? "Chiến mã" : tr("Horse")}</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>{isVietnamese ? "Nài ngựa" : tr("Jockey")}</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>{isVietnamese ? "Cự ly / Mục tiêu" : tr("Distance / target")}</th>
                    <th style={{ padding: "0.5rem 0.75rem" }}>{isVietnamese ? "Trạng thái" : tr("Status")}</th>
                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>{isVietnamese ? "Thao tác" : tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>{row.startTime}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <Link to={`/horses/${row.horseId}`}>{row.horseName}</Link>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{row.jockeyName || (isVietnamese ? "Chưa giao" : "—")}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {row.targetDistanceMeters}m{row.targetSpeedKmh ? tr(` · ${row.targetSpeedKmh} km/h`) : ""}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <Badge tone={row.status === "BLOCKED" ? "danger" : row.status === "COMPLETED" ? "ok" : "info"}>
                          {SESSION_STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: "0.5rem" }}>
                          {user.role === "HEAD_TRAINER" &&
                            row.status === "SCHEDULED" &&
                            plans.some((p) => p.id === row.planId) && (
                              <div>
                                <Button
                                  size="sm"
                                  tone="primary"
                                  disabled={
                                    launchingId === row.id ||
                                    row.isHorseLocked ||
                                    new Date(row.scheduledAt) > new Date()
                                  }
                                  title={
                                    row.isHorseLocked
                                      ? tr("The horse is still under a Training Lock.")
                                      : new Date(row.scheduledAt) > new Date()
                                        ? tr("The trial has not reached its scheduled start time.")
                                        : undefined
                                  }
                                  onClick={() => void launchSimulation(row.id)}
                                >
                                  {launchingId === row.id
                                    ? tr("Opening…")
                                    : isVietnamese
                                      ? "Chạy mô phỏng"
                                      : tr("Run simulation")}
                                </Button>
                                {new Date(row.scheduledAt) > new Date() && (
                                  <div
                                    data-testid="trial-launch-timing"
                                    style={{ marginTop: "0.25rem", fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}
                                  >
                                    {isVietnamese ? "Có thể chạy từ" : "Available from"} {formatDateTime(row.scheduledAt)}
                                  </div>
                                )}
                              </div>
                            )}
                          <Link to={`/training/sessions/${row.id}/result`}>
                            <Button size="sm" tone={row.status === "COMPLETED" ? "secondary" : "primary"}>
                              {row.status === "COMPLETED"
                                ? (isVietnamese ? "Xem kết quả" : tr("View result"))
                                : (isVietnamese ? "Ghi kết quả" : tr("Record result"))}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      {isScheduleOpen && (
        <WorkoutDialog
          plans={plans}
          defaultDate={from}
          defaultType="TRIAL"
          onClose={() => setIsScheduleOpen(false)}
          onSaved={(savedDate?: string) => {
            setIsScheduleOpen(false);
            let nextFrom = from;
            let nextTo = to;
            if (savedDate) {
              if (savedDate < nextFrom) {
                nextFrom = savedDate;
                setFrom(savedDate);
              }
              if (savedDate > nextTo) {
                nextTo = savedDate;
                setTo(savedDate);
              }
            }
            void load(nextFrom, nextTo);
          }}
        />
      )}
    </div>
  );
}

