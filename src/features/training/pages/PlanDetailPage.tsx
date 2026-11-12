import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import styles from "./TrainingMetrics.module.css";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Select } from "@/shared/components/form/Select";
import { Tabs } from "@/shared/components/ui/Tabs";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { formatDateTime, formatScore, formatNumber } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { todayClub, trainingApi } from "../api";
import { ActivatePlanDialog, ClonePlanDialog, ClosePlanDialog } from "../components/PlanDialogs";
import { ProgressBar } from "../components/ProgressBar";
import { useAllowEarlyStart } from "../components/useAllowEarlyStart";
import { sessionButtons, sessionStatusLabel, sessionStatusTone } from "../components/sessionRules";
import {
  CancelWorkoutDialog,
  GeneratePhaseScheduleDialog,
  RestoreWorkoutDialog,
  WorkoutDialog,
} from "../components/WorkoutDialogs";
import {
  ABNORMAL_SIGN_LABEL,
  EXERCISE_TYPE_LABEL,
  INTENSITY_LABEL,
  isHeavy,
  PHASE_TYPE_LABEL,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
  SESSION_STATUS_LABEL,
  TRACK_LABEL,
} from "../types";
import type { ExerciseSession, SessionStatus, TrainingPhase, TrainingPlan } from "../types";

import { localizeServerText, tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
type PlanWithSessions = TrainingPlan & { sessions: ExerciseSession[] };
type Dialog =
  | { kind: "activate" | "complete" | "cancel" | "clone" }
  | { kind: "add" }
  | { kind: "generateSchedule"; phase: TrainingPhase }
  | { kind: "edit" | "cancelWorkout" | "restore"; session: ExerciseSession }
  | null;

const MEDICAL = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];

/** Thứ Hai (YYYY-MM-DD) của tuần chứa ngày d (YYYY-MM-DD). */
function mondayOf(d: string): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

function distanceOf(s: ExerciseSession): number {
  return s.result?.actualDistanceMeters ?? s.targetDistanceMeters * s.repetitions;
}

/** Trễ ghi kết quả: đã Bỏ lỡ, hoặc Đã lên lịch mà đã qua giờ (khớp con số "Trễ ghi kết quả" của BE). */
function isOverdue(s: ExerciseSession): boolean {
  return s.status === "MISSED" || (s.status === "SCHEDULED" && Date.parse(s.scheduledAt) <= Date.now());
}

/** Hạn ghi bù buổi Bỏ lỡ: hết ngày tập + 7 ngày (LATE_RESULT_DAYS ở BE), dạng dd/mm. */
function lateResultDeadline(sessionDate: string): string {
  const d = new Date(`${sessionDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** SC-2.04 Chi tiết giáo án. HT thao tác; CM, VET, OWNER chỉ xem. */
export default function PlanDetailPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const allowEarly = useAllowEarlyStart(user.role === "HEAD_TRAINER");
  const isTrainer = user.role === "HEAD_TRAINER";

  const [plan, setPlan] = useState<PlanWithSessions | null>(null);
  const [error, setError] = useState("");
  // ?status=OVERDUE (bấm "Trễ ghi kết quả" hoặc thông báo Bỏ lỡ) -> mở thẳng tab Buổi tập, lọc sẵn.
  const [tab, setTab] = useState(() => (params.get("status") ? "workouts" : "phases"));
  const [dialog, setDialog] = useState<Dialog>(null);
  const [phaseFilter, setPhaseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState(() => params.get("status") ?? "ALL");
  const [commentLimit, setCommentLimit] = useState(20);

  const load = useCallback(async () => {
    setError("");
    try {
      setPlan(await trainingApi.getPlanById(id));
    } catch (err) {
      setError(messageFor(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // "Lưu và kích hoạt" ở SC-2.03 chuyển sang đây với ?activate=1 -> mở DL-2.02 ngay.
  useEffect(() => {
    if (plan && params.get("activate") === "1" && plan.status === "DRAFT" && isTrainer) {
      setDialog({ kind: "activate" });
      setParams({}, { replace: true });
    }
  }, [plan, params, setParams, isTrainer]);

  const today = todayClub();
  const sessions = useMemo(() => plan?.sessions ?? [], [plan]);
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const missingResults = sessions.filter((s) =>
    s.status !== "CANCELLED" && (s.status !== "COMPLETED" || !s.result?.recordedAt),
  );

  if (error) {
    return (
      <Alert tone="danger" title={tr("Could not load the plan")}>
        {error} <Button size="sm" tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>
      </Alert>
    );
  }
  if (!plan) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading plan...")}</div>;

  const open = plan.status === "DRAFT" || plan.status === "ACTIVE";
  const shownSessions = sessions.filter(
    (s) =>
      (phaseFilter === "ALL" || s.phaseId === phaseFilter) &&
      (statusFilter === "ALL" ||
        (statusFilter === "OVERDUE" ? isOverdue(s) : s.status === statusFilter)),
  );
  const comments = [...completed].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <Card pad={20}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <h1 className={styles.planTitle}>{plan.name}</h1>
              <Badge tone="neutral">{plan.planCode}</Badge>
              <Badge tone={PLAN_STATUS_TONE[plan.status]}>{tr(PLAN_STATUS_LABEL[plan.status])}</Badge>
            </div>
            <div style={{ fontSize: "var(--fs-body)", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {tr("Horse:")}{" "}<Link to={`/horses/${plan.horseId}`}>{plan.horseName}</Link> · {plan.startDate} → {plan.endDate} {tr("· Trainer:")}{" "}
              {plan.headTrainerName}
            </div>
            {plan.objective && <div style={{ fontSize: "var(--fs-body)", marginTop: "0.25rem" }}>{tr("Objective:")} {plan.objective}</div>}
            <div style={{ maxWidth: 320, marginTop: "0.5rem" }}>
              <ProgressBar
                done={plan.progress.completed}
                total={plan.progress.total ?? plan.progress.due}
                due={plan.progress.due}
                overdue={plan.progress.overdue}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
            {isTrainer && open && (
              <Button tone="secondary" onClick={() => navigate(`/training/plans/${plan.id}/edit`)}>{tr("Edit plan")}</Button>
            )}
            {isTrainer && plan.status === "DRAFT" && (
              <Button
                tone="primary"
                onClick={() => setDialog({ kind: "activate" })}
                disabled={plan.isLockedByMedical || sessions.every((s) => s.status === "CANCELLED")}
                title={
                  plan.isLockedByMedical
                    ? tr("The horse is under a Training Lock.")
                    : sessions.every((s) => s.status === "CANCELLED")
                      ? tr("The plan has no workouts yet.")
                      : ""
                }
              >
                {tr("Activate")}
              </Button>
            )}
            {isTrainer && plan.status === "ACTIVE" && (
              <Button
                tone="accent"
                disabled={missingResults.length > 0}
                title={missingResults.length ? missingResults.map((s) => `${s.sessionDate} ${s.startTime}`).join(", ") : undefined}
                onClick={() => setDialog({ kind: "complete" })}
              >
                {tr("Complete")}
              </Button>
            )}
            {isTrainer && open && (
              <Button tone="danger" onClick={() => setDialog({ kind: "cancel" })}>{tr("Cancel plan")}</Button>
            )}
            {isTrainer && plan.status === "DRAFT" && (
              <Button
                tone="danger"
                onClick={async () => {
                  const confirmMsg = isVietnamese ? `Xóa giáo án "${plan.name}"? Thao tác này không thể hoàn tác.` : `Delete plan "${plan.name}"? This action cannot be undone.`;
                  if (window.confirm(confirmMsg)) {
                    try {
                      await trainingApi.deletePlan(plan.id);
                      navigate("/training/plans");
                    } catch (err) {
                      setError(messageFor(err));
                    }
                  }
                }}
              >
                {isVietnamese ? "Xóa giáo án" : tr("Delete plan")}
              </Button>
            )}
            {isTrainer && <Button tone="ghost" onClick={() => setDialog({ kind: "clone" })}>{tr("Clone")}</Button>}
            <LinkButton to={`/horses/${plan.horseId}/fitness`} tone="secondary">{tr("Fitness chart")}</LinkButton>
          </div>
        </div>
      </Card>

      {plan.isLockedByMedical && (
        <Alert tone="danger" title={tr("Training Lock")}>
          {tr("The horse has been under a veterinary Training Lock")}
          {plan.lockedSince ? ` ${tr("since")} ${formatDateTime(plan.lockedSince)}` : ""}. {tr("Heavy workouts are blocked and cannot be added until the Veterinarian lifts the lock.")}
        </Alert>
      )}
      {!plan.isLockedByMedical && MEDICAL.includes(plan.horseStatus ?? "") && (
        <Alert tone="warn" title={tr("Medical status")}>
          {tr("The horse is in status")} {plan.horseStatus}. {tr("Think carefully before scheduling heavy workouts.")}
        </Alert>
      )}
      {plan.status === "CANCELLED" && plan.cancelledReason && (
        <Alert tone="info" title={tr("Cancelled")}>{plan.cancelledReason}</Alert>
      )}

      <Card pad={16}>
        <Tabs
          items={[
            { id: "phases", label: `${tr("Phases")} (${plan.phases.length})` },
            { id: "workouts", label: `${tr("Workouts")} (${sessions.length})` },
            { id: "comments", label: `${tr("Comments")} (${completed.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
      </Card>

      {tab === "phases" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem" }}>
          {plan.phases.length === 0 && <EmptyState title={tr("No phases")} />}
          {plan.phases.map((ph) => (
            <PhaseCard
              key={ph.id}
              phase={ph}
              sessions={sessions.filter((s) => s.phaseId === ph.id)}
              current={ph.startDate <= today && today <= ph.endDate}
              canEdit={isTrainer && open}
              onGenerateSchedule={() => setDialog({ kind: "generateSchedule", phase: ph })}
            />
          ))}
        </div>
      )}

      {tab === "workouts" && (
        <Card pad={16}>
          <div className={styles.planFilters}>
            <div className={styles.planFilter}>
              <Select
                aria-label={tr("Phase")}
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                options={[{ value: "ALL", label: tr("All phases") }, ...plan.phases.map((p) => ({ value: p.id, label: p.name }))]}
              />
            </div>
            <div className={styles.planFilter}>
              <Select
                aria-label={tr("Status")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "ALL", label: tr("All statuses") },
                  { value: "OVERDUE", label: tr("Overdue results") },
                  ...(Object.keys(SESSION_STATUS_LABEL) as SessionStatus[]).map((s) => ({ value: s, label: tr(SESSION_STATUS_LABEL[s]) })),
                ]}
              />
            </div>
            <div style={{ flex: 1 }} />
            {isTrainer && open && <Button tone="primary" onClick={() => setDialog({ kind: "add" })}>{tr("+ Add workout")}</Button>}
          </div>
          {shownSessions.length === 0 ? (
            <EmptyState title={tr("No workouts yet.")} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={styles.table}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-sunken)" }}>
                    {["Date", "Phase", "Type", "Intensity", "Distance × reps", "Target speed", "Surface", "Jockey", "Groom", "Status", "Result", ""].map((h) => (
                      <th key={h} style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>{h ? tr(h) : ""}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownSessions.map((s) => {
                    const b = sessionButtons(s, user.role, allowEarly);
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>{s.sessionDate} {s.startTime}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{s.phaseName ?? "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>
                          {EXERCISE_TYPE_LABEL[s.sessionType] ? tr(EXERCISE_TYPE_LABEL[s.sessionType]) : s.sessionType} {isHeavy(s.sessionType, s.intensity) && <Badge tone="danger">{tr("Heavy")}</Badge>}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{INTENSITY_LABEL[s.intensity] ? tr(INTENSITY_LABEL[s.intensity]) : s.intensity}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{s.targetDistanceMeters} m × {s.repetitions}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{s.targetSpeedKmh ? tr(`${s.targetSpeedKmh} km/h`) : "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{TRACK_LABEL[s.trackType] ? tr(TRACK_LABEL[s.trackType]) : s.trackType}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{s.jockeyName || "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>{s.groomName || "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>
                          <Badge tone={sessionStatusTone(s)}>{tr(sessionStatusLabel(s))}</Badge>
                          {s.status === "MISSED" && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap" }}>
                              {tr("Late results by {{date}}", { date: lateResultDeadline(s.sessionDate) })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>
                          {s.result ? tr(`${formatScore(s.result.performanceScore, 1)}/10 · ${formatNumber(s.result.avgSpeedKmh, 1)} km/h`) : s.status === "CANCELLED" ? "—" : (isVietnamese ? "Chưa ghi kết quả" : "Result not recorded")}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end" }}>
                            {b.edit && <Button size="sm" tone="ghost" onClick={() => setDialog({ kind: "edit", session: s })}>{tr("Edit")}</Button>}
                            {b.record && (
                              <LinkButton to={`/training/sessions/${s.id}/result`} size="sm" tone="secondary">{isVietnamese ? "Ghi kết quả" : tr("Record result")}</LinkButton>
                            )}
                            {!b.record && b.recordDisabledReason && (
                              <Button
                                size="sm"
                                tone="secondary"
                                disabled
                                title={isVietnamese ? `Chưa đến giờ bắt đầu (${s.startTime} ngày ${s.sessionDate})` : tr("Workout has not started yet")}
                              >
                                {isVietnamese ? "Ghi kết quả" : tr("Record result")}
                              </Button>
                            )}
                            {b.viewResult && (
                              <LinkButton to={`/training/sessions/${s.id}/result`} size="sm" tone="secondary">{tr("View result")}</LinkButton>
                            )}
                            {b.restore && (
                              <Button
                                size="sm"
                                tone="primary"
                                disabled={Boolean(b.restoreBlockedReason)}
                                title={b.restoreBlockedReason ? tr(b.restoreBlockedReason) : undefined}
                                onClick={() => setDialog({ kind: "restore", session: s })}
                              >
                                {tr("Restore")}
                              </Button>
                            )}
                            {b.cancel && (
                              <Button size="sm" tone="danger" onClick={() => setDialog({ kind: "cancelWorkout", session: s })}>{tr("Cancel")}</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "comments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {plan.completionSummary && (
            <Card pad={16}>
              <strong>{tr("Plan summary:")}</strong> {localizeServerText(plan.completionSummary)}
            </Card>
          )}
          {comments.length === 0 ? (
            <EmptyState title={tr("No comments yet.")} />
          ) : (
            comments.slice(0, commentLimit).map((s) => (
              <Card key={s.id} pad={16}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{s.sessionDate} {s.startTime}</strong>
                  <span>{tr(EXERCISE_TYPE_LABEL[s.sessionType])}</span>
                  {s.result?.performanceScore != null && <Badge tone="info">{formatScore(s.result.performanceScore, 1)}/10</Badge>}
                  {s.result?.hasAbnormalSigns && <Badge tone="danger">{tr("Abnormal signs")}</Badge>}
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-body)" }}>by {s.result?.recordedBy ?? "—"}</span>
                </div>
                <div style={{ marginTop: "0.35rem" }}>{s.result?.headTrainerFeedback || "—"}</div>
                {s.result?.hasAbnormalSigns && (
                  <div style={{ marginTop: "0.35rem", color: "var(--danger)", fontSize: "var(--fs-body)" }}>
                    {s.result.abnormalSignTypes.map((x) => tr(ABNORMAL_SIGN_LABEL[x])).join(", ")}: {s.result.abnormalSignsDescription}
                  </div>
                )}
              </Card>
            ))
          )}
          {comments.length > commentLimit && (
            <Button tone="secondary" onClick={() => setCommentLimit((n) => n + 20)}>{tr("Load more")}</Button>
          )}
        </div>
      )}

      {(dialog?.kind === "activate") && <ActivatePlanDialog plan={plan} onClose={() => setDialog(null)} onDone={() => void load()} />}
      {(dialog?.kind === "complete" || dialog?.kind === "cancel") && (
        <ClosePlanDialog kind={dialog.kind} plan={plan} onClose={() => setDialog(null)} onDone={() => void load()} />
      )}
      {dialog?.kind === "clone" && (
        <ClonePlanDialog plan={plan} onClose={() => setDialog(null)} onDone={(created) => created && navigate(`/training/plans/${created.id}`)} />
      )}
      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <WorkoutDialog
          plan={plan}
          session={dialog.kind === "edit" ? dialog.session : undefined}
          defaultDate={plan.startDate > today ? plan.startDate : today}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load();
          }}
        />
      )}
      {dialog?.kind === "generateSchedule" && (
        <GeneratePhaseScheduleDialog
          plan={plan}
          phase={dialog.phase}
          onClose={() => setDialog(null)}
          onGenerated={() => void load()}
        />
      )}
      {dialog?.kind === "cancelWorkout" && (
        <CancelWorkoutDialog session={dialog.session} onClose={() => setDialog(null)} onDone={() => void load()} />
      )}
      {dialog?.kind === "restore" && (
        <RestoreWorkoutDialog session={dialog.session} onClose={() => setDialog(null)} onDone={() => void load()} />
      )}
    </div>
  );
}

/** "2026-11-09" (thứ Hai) -> "09/11 – 15/11". */
function weekRange(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const fmt = (x: Date) => `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

/** Một giai đoạn: định mức vs thực tế; tuần vượt cự ly định mức hoặc số buổi có cảnh báo. */
function PhaseCard({
  phase,
  sessions,
  current,
  canEdit,
  onGenerateSchedule,
}: {
  phase: TrainingPhase;
  sessions: ExerciseSession[];
  current: boolean;
  canEdit?: boolean;
  onGenerateSchedule?: () => void;
}) {
  const { isVietnamese } = useAppLanguage();
  const num = (x: number) => x.toLocaleString(isVietnamese ? "vi-VN" : "en-US");
  const done = sessions.filter((s) => s.status === "COMPLETED");
  const run = done.reduce((sum, s) => sum + distanceOf(s), 0);
  const weekly = new Map<string, number>();
  const weeklyCounts = new Map<string, number>();
  for (const s of sessions.filter((x) => x.status !== "CANCELLED")) {
    const key = mondayOf(s.sessionDate);
    weekly.set(key, (weekly.get(key) ?? 0) + distanceOf(s));
    weeklyCounts.set(key, (weeklyCounts.get(key) ?? 0) + 1);
  }
  // Tuần (T2–CN) vượt định mức số buổi hoặc cự ly: gom thành một dòng dễ đọc cho mỗi tuần.
  const overLimitWeeks = [...weeklyCounts.keys()]
    .sort()
    .map((week) => ({ week, count: weeklyCounts.get(week) ?? 0, meters: weekly.get(week) ?? 0 }))
    .filter((w) => w.count > phase.sessionsPerWeek || w.meters > phase.maxWeeklyDistance);

  const scheduled = sessions.filter((x) => x.status !== "CANCELLED").length;
  const ended = phase.endDate < todayClub();
  const pct = scheduled > 0 ? Math.round((done.length / scheduled) * 100) : 0;
  const surface = TRACK_LABEL[phase.surface] ? tr(TRACK_LABEL[phase.surface]) : phase.surface;

  return (
    <Card pad={0}>
      <div className={`${styles.phaseCard} ${current ? styles.currentPhase : ""}`}>
        <div className={styles.phaseHead}>
          <strong className={styles.phaseName}>{phase.name}</strong>
          <Badge tone="neutral">{PHASE_TYPE_LABEL[phase.type] ?? phase.type}</Badge>
          {current && <Badge tone="info">{tr("Current")}</Badge>}
        </div>
        <div className={styles.phaseDates}>
          {phase.startDate} → {phase.endDate}
        </div>
        {phase.goal && <div className={styles.phaseGoal}>{phase.goal}</div>}

        <dl className={styles.phaseStats}>
          <dt>{tr("Quota")}</dt>
          <dd>
            {tr("{{count}} sessions/week", { count: phase.sessionsPerWeek })} · {num(phase.maxWeeklyDistance)} {tr("m/week")} · {surface}
            {phase.targetSpeedKmh ? ` · ${phase.targetSpeedKmh} km/h` : ""}
          </dd>
          <dt>{tr("Scheduled")}</dt>
          <dd>{tr("{{count}} session(s)", { count: scheduled })}</dd>
          <dt>{tr("Completed")}</dt>
          <dd>
            {tr("{{count}} session(s)", { count: done.length })} · {num(run)} m
          </dd>
        </dl>
        <div className={styles.phaseBar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr("Completed")}>
          <span style={{ width: `${pct}%` }} />
        </div>

        {overLimitWeeks.length > 0 && (
          <div className={styles.phaseWarn} role="note">
            <strong>{tr("Schedule exceeds this phase's weekly limit")}</strong>
            <span>
              {tr("Limit: {{count}} sessions and {{meters}} m per week (Mon–Sun).", {
                count: phase.sessionsPerWeek,
                meters: num(phase.maxWeeklyDistance),
              })}
            </span>
            <ul>
              {overLimitWeeks.map((w) => (
                <li key={w.week}>
                  <b>{weekRange(w.week)}</b>
                  {": "}
                  {w.count > phase.sessionsPerWeek
                    ? tr("{{count}} sessions ({{extra}} too many)", { count: w.count, extra: w.count - phase.sessionsPerWeek })
                    : tr("{{count}} session(s)", { count: w.count })}
                  {" · "}
                  {w.meters > phase.maxWeeklyDistance
                    ? tr("{{meters}} m ({{extra}} m over)", {
                        meters: num(w.meters),
                        extra: num(w.meters - phase.maxWeeklyDistance),
                      })
                    : `${num(w.meters)} m`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canEdit && onGenerateSchedule && !ended && (
          <div className={styles.phaseFoot}>
            <Button size="sm" tone="secondary" icon="calendar" onClick={onGenerateSchedule}>
              {isVietnamese ? "Sinh lịch buổi tập" : tr("Generate workouts")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
