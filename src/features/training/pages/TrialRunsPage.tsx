import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { ApiError } from "@/shared/lib/api";
import { todayClub, trainingApi } from "../api";
import { TRACK_LABEL } from "../types";
import type { ExerciseSession, TrainingPlan } from "../types";
import { WorkoutDialog } from "../components/WorkoutDialogs";
import { useAllowEarlyStart } from "../components/useAllowEarlyStart";
import { sessionButtons, sessionStatusLabel, sessionStatusTone } from "../components/sessionRules";

import { tr } from "@/shared/i18n/tr";
import styles from "./TrialRunsPage.module.css";
import { Icon } from "@/shared/components/ui/Icon";
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
  useScreenTranslation();
  const user = useCurrentUser();
  const allowEarly = useAllowEarlyStart(user.role === "HEAD_TRAINER");
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

  // Quay lại từ tab Simulator: tải lại lặng lẽ (không hiện khung chờ) để trạng thái mô phỏng cập nhật ngay.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      trainingApi.getTrialRuns({ from, to }).then(setTrials).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [from, to]);

  useEffect(() => {
    void load();
    trainingApi
      .getPlans()
      .then((data) => {
        setPlans(data.filter((p) => p.status === "DRAFT" || p.status === "ACTIVE"));
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
      const notStarted = err instanceof ApiError && err.code === "WORKOUT_NOT_STARTED";
      toast.show(notStarted ? tr("The workout has not reached its scheduled start time.") : messageFor(err), "danger");
    } finally {
      setLaunchingId(null);
    }
  };

  // Nhóm theo ngày + mặt sân để điều phối.
  const groups = new Map<string, ExerciseSession[]>();
  for (const trSession of trials) {
    const key = `${trSession.sessionDate} · ${tr(TRACK_LABEL[trSession.trackType])}`;
    groups.set(key, [...(groups.get(key) ?? []), trSession]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader title={t("trialRuns.title")} description={t("trialRuns.subtitle")} action={<>{canManage && <Button tone="primary" onClick={handleOpenSchedule}>{isVietnamese ? "Lên lịch chạy thử" : tr("Schedule Trial Run")}</Button>}<LinkButton to="/training/calendar" tone="secondary">{isVietnamese ? "Xem lịch tuần" : tr("Weekly Calendar")}</LinkButton></>} />

      <div className={styles.notice}>
        {isVietnamese ? (
          <>
            <Icon name="clock" inline size={14} /> Giám sát các phiên chạy thử tốc độ cao. Đảm bảo giãn cách an toàn tối thiểu 15 phút giữa các lượt chạy cùng mặt sân.
          </>
        ) : (
          <>
            <Icon name="clock" inline size={14} /> Monitor high-speed trial runs. A 15-minute safety interval is enforced between runs on the same track.
          </>
        )}
      </div>

      <Card pad={16}>
        <div className={styles.filters}>
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
            <h2 className={styles.groupTitle}>{key}</h2>
            <div style={{ overflowX: "auto" }}>
              <table className={styles.table}>
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
                  {rows.map((row) => {
                    const upcoming = row.status === "SCHEDULED" && Date.parse(row.scheduledAt) > Date.now();
                    const actions = sessionButtons(row, user.role, allowEarly);
                    return (
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
                          <Badge tone={sessionStatusTone(row)}>
                            {upcoming && !row.simulationStatus ? tr("Upcoming") : tr(sessionStatusLabel(row))}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: "0.5rem" }}>
                            {user.role === "HEAD_TRAINER" &&
                              row.status === "SCHEDULED" &&
                              // Đã mô phỏng xong / dừng vì chấn thương thì không chạy lại được (BE trả SIMULATOR_SESSION_FINISHED).
                              row.simulationStatus !== "COMPLETED" &&
                              row.simulationStatus !== "ABORTED_INJURY" &&
                              plans.some((p) => p.id === row.planId) && (
                                <div>
                                  <Button
                                    size="sm"
                                    tone="primary"
                                    // Chưa tới giờ thì khóa, trừ khi BE bật cờ dev SIMULATOR_ALLOW_EARLY.
                                    disabled={launchingId === row.id || row.isHorseLocked || (upcoming && !allowEarly)}
                                    title={
                                      row.isHorseLocked
                                        ? tr("The horse is still under a Training Lock.")
                                        : upcoming && !allowEarly
                                          ? tr("The workout has not reached its scheduled start time.")
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
                                </div>
                              )}
                            {(actions.record || actions.viewResult) && (
                              <LinkButton to={`/training/sessions/${row.id}/result`} size="sm" tone={row.status === "COMPLETED" ? "secondary" : "primary"}>
                                {row.status === "COMPLETED"
                                  ? (isVietnamese ? "Xem kết quả" : tr("View result"))
                                  : (isVietnamese ? "Ghi kết quả" : tr("Record result"))}
                              </LinkButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      {isScheduleOpen && (
        <WorkoutDialog
          plans={plans}
          defaultDate={from < todayClub() ? todayClub() : from}
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

