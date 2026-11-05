import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Modal } from "@/shared/components/ui/Modal";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SkeletonCards } from "@/shared/components/ui/Skeleton";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { ROLES } from "@/shared/types/auth";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { formatDate } from "@/shared/lib/format";
import { todayClub, trainingApi } from "../api";
import { sessionButtons } from "../components/sessionRules";
import { CancelWorkoutDialog, RestoreWorkoutDialog, WorkoutDialog } from "../components/WorkoutDialogs";
import {
  EXERCISE_TYPE_LABEL,
  INTENSITY_LABEL,
  isHeavy,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_TONE,
  TRACK_LABEL,
} from "../types";
import type { ExerciseSession, ExerciseType, SessionStatus, TrackType, TrainingPlan } from "../types";

import styles from "./WeeklyCalendarPage.module.css";


import { tr } from "@/shared/i18n/tr";
function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return shiftDay(date, -((d.getUTCDay() + 6) % 7));
}
function minutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const WEEKDAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAYS_SHORT_VI = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatCalendarDay(dateStr: string, isVi: boolean) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dayIdx = d.getUTCDay();
  const dayNum = d.getUTCDate();
  const monthNum = d.getUTCMonth() + 1;
  return {
    weekdayFull: isVi ? WEEKDAYS_VI[dayIdx] : WEEKDAYS_EN[dayIdx],
    weekdayShort: isVi ? WEEKDAYS_SHORT_VI[dayIdx] : WEEKDAYS_SHORT_EN[dayIdx],
    dayNum,
    monthNum,
    dateLabel: `${dayNum}/${monthNum}`,
  };
}

type Dialog =
  | { kind: "add" }
  | { kind: "edit" | "cancel" | "restore"; session: ExerciseSession }
  | null;

/** SC-2.05 Lịch tập. HT thêm / sửa / hủy / khôi phục; CM, VET xem; GROOM dùng "Lịch tập của tôi". */
export default function WeeklyCalendarPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const { isVietnamese, t } = useAppLanguage();
  const [params] = useSearchParams();
  const isTrainer = user.role === "HEAD_TRAINER";

  const [mode, setMode] = useState<"day" | "week">("day");
  const [date, setDate] = useState(todayClub());
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [horse, setHorse] = useState("ALL");
  const [groom, setGroom] = useState("ALL");
  const [surface, setSurface] = useState("ALL");
  const [type, setType] = useState(params.get("type") ?? "ALL");
  const [status, setStatus] = useState(params.get("status") ?? "ALL");
  const [selected, setSelected] = useState<ExerciseSession | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const latest = useRef(0);

  const from = mode === "day" ? date : mondayOf(date);
  const to = mode === "day" ? date : shiftDay(mondayOf(date), 6);

  // Đổi ngày nhanh: chỉ nhận kết quả của lần tải mới nhất.
  const load = useCallback(async () => {
    const requestId = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const rows = await trainingApi.getSessions({ from, to });
      if (requestId === latest.current) {
        setSessions(rows);
        setSelected((current) => current ? rows.find((row) => row.id === current.id) ?? null : null);
      }
    } catch (err) {
      if (requestId === latest.current) setError(messageFor(err));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isTrainer) return;
    trainingApi
      .getPlans()
      .then((all) => setPlans(all.filter((p) => p.status === "DRAFT" || p.status === "ACTIVE")))
      .catch(() => setPlans([]));
  }, [isTrainer]);

  const shown = sessions.filter(
    (s) =>
      (horse === "ALL" || s.horseId === horse) &&
      (groom === "ALL" || s.groomId === groom) &&
      (surface === "ALL" || s.trackType === surface) &&
      (type === "ALL" || s.sessionType === type) &&
      (status === "ALL" || s.status === status),
  );

  // Nhân viên chăm sóc có 2 buổi trùng giờ (cách nhau < 30 phút cùng ngày) -> viền cam.
  const overlapping = useMemo(() => {
    const live = sessions.filter((s) => s.status !== "CANCELLED" && s.groomId);
    const ids = new Set<string>();
    for (const a of live) {
      for (const b of live) {
        if (a.id !== b.id && a.groomId === b.groomId && a.sessionDate === b.sessionDate && Math.abs(minutes(a.startTime) - minutes(b.startTime)) < 30) {
          ids.add(a.id);
        }
      }
    }
    return ids;
  }, [sessions]);

  const uniq = <T,>(rows: T[], key: (r: T) => string, label: (r: T) => string) =>
    [...new Map(rows.map((r) => [key(r), label(r)])).entries()].map(([value, l]) => ({ value, label: l }));

  const SessionBlock = ({ s }: { s: ExerciseSession }) => {
    const isSelected = selected?.id === s.id;
    const isBlocked = s.status === "BLOCKED";
    const isCompleted = s.status === "COMPLETED";
    const isCancelled = s.status === "CANCELLED";
    const isTrial = s.sessionType === "TRIAL";
    const isHeavySession = isHeavy(s.sessionType, s.intensity);

    let cardClass = styles.sessionCard;
    if (isSelected) cardClass += ` ${styles.selectedCard}`;
    if (isCancelled) cardClass += ` ${styles.cancelledCard}`;
    else if (isBlocked) cardClass += ` ${styles.blockedCard}`;
    else if (isCompleted) cardClass += ` ${styles.completedCard}`;
    else if (isTrial) cardClass += ` ${styles.trialRunCard}`;
    else if (isHeavySession) cardClass += ` ${styles.heavyCard}`;

    return (
      <button
        type="button"
        onClick={() => setSelected(s)}
        aria-pressed={isSelected}
        className={cardClass}
        title={overlapping.has(s.id) ? (isVietnamese ? tr(`Nhân viên ${s.groomName} có 2 bài tập cùng giờ.`) : tr(`Groom ${s.groomName} has two workouts at the same time.`)) : ""}
      >
        <div className={styles.cardTop}>
          <span className={styles.timeTag}>{s.startTime}</span>
          <Badge tone={SESSION_STATUS_TONE[s.status]}>{SESSION_STATUS_LABEL[s.status]}</Badge>
        </div>
        <div className={styles.horseName} title={s.horseName}>
          {s.horseName}
        </div>
        <div className={styles.cardMeta}>
          <div>
            <strong>{tr(EXERCISE_TYPE_LABEL[s.sessionType])}</strong>
            {isHeavySession && (isVietnamese ? " · Nặng" : tr(" · Heavy"))}
            {isTrial && (isVietnamese ? " · Chạy thử" : tr(" · Trial Run"))}
          </div>
          <div>{s.targetDistanceMeters}m × {s.repetitions} · {tr(TRACK_LABEL[s.trackType])}</div>
          <div><Icon name="user" inline size={12} /> {s.groomName ?? (isVietnamese ? "Chưa giao" : "—")}</div>
          {overlapping.has(s.id) && <div className={styles.overlapAlert}><Icon name="alert" inline size={12} /> {isVietnamese ? "Trùng giờ chăm sóc" : tr("Groom overlap")}</div>}
        </div>
      </button>
    );
  };

  const days = mode === "week" ? Array.from({ length: 7 }, (_, i) => shiftDay(from, i)) : [date];
  const b = selected ? sessionButtons(selected, user.role) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <PageHeader
        title={t("calendar.title")}
        description={t("calendar.subtitle")}
        action={
          <>
            <Button
              tone={type === "TRIAL" ? "primary" : "secondary"}
              onClick={() => setType(type === "TRIAL" ? "ALL" : "TRIAL")}
            >
              {type === "TRIAL"
                ? (isVietnamese ? "✓ Đang xem chạy thử" : "✓ Showing Trial Runs")
                : (isVietnamese ? "Lượt chạy thử" : t("calendar.trialRuns"))}
            </Button>
            {isTrainer && (
              <Button tone="primary" onClick={() => setDialog({ kind: "add" })}>
                {t("calendar.scheduleWorkout")}
              </Button>
            )}
          </>
        }
      />

      <Card pad={16}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <Button tone="ghost" size="sm" onClick={() => setDate(shiftDay(date, mode === "day" ? -1 : -7))} aria-label={isVietnamese ? "Trước" : tr("Previous")}>‹</Button>
          <Input type="date" aria-label={tr("Date")} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 170 }} />
          <Button tone="ghost" size="sm" onClick={() => setDate(shiftDay(date, mode === "day" ? 1 : 7))} aria-label={isVietnamese ? "Sau" : tr("Next")}>›</Button>
          <Button tone="secondary" size="sm" onClick={() => setDate(todayClub())}>{t("calendar.today")}</Button>
          <Button tone={mode === "day" ? "primary" : "secondary"} aria-pressed={mode === "day"} size="sm" onClick={() => setMode("day")}>{t("calendar.day")}</Button>
          <Button tone={mode === "week" ? "primary" : "secondary"} aria-pressed={mode === "week"} size="sm" onClick={() => setMode("week")}>{t("calendar.week")}</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
          <SearchSelect aria-label={tr("Horse")} value={horse} onChange={setHorse} options={[{ value: "ALL", label: t("calendar.allHorses") }, ...uniq(sessions, (s) => s.horseId, (s) => s.horseName)]} />
          <Select
            aria-label={tr("Groom")}
            value={groom}
            onChange={(e) => setGroom(e.target.value)}
            options={[{ value: "ALL", label: t("calendar.allGrooms") }, ...uniq(sessions.filter((s) => s.groomId), (s) => s.groomId as string, (s) => s.groomName ?? (isVietnamese ? "Chưa giao" : "—"))]}
          />
          <Select
            aria-label={tr("Surface")}
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            options={[{ value: "ALL", label: t("calendar.allSurfaces") }, ...(Object.keys(TRACK_LABEL) as TrackType[]).map((tr) => ({ value: tr, label: TRACK_LABEL[tr] }))]}
          />
          <Select
            aria-label={tr("Type")}
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[{ value: "ALL", label: t("calendar.allTypes") }, ...(Object.keys(EXERCISE_TYPE_LABEL) as ExerciseType[]).map((ty) => ({ value: ty, label: EXERCISE_TYPE_LABEL[ty] }))]}
          />
          <Select
            aria-label={tr("Status")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ value: "ALL", label: t("calendar.allStatuses") }, ...(Object.keys(SESSION_STATUS_LABEL) as SessionStatus[]).map((st) => ({ value: st, label: SESSION_STATUS_LABEL[st] }))]}
          />
        </div>
      </Card>

      {error && (
        <Alert tone="danger" title={isVietnamese ? "Không thể tải dữ liệu" : tr("Could not load data")}>
          {error} <Button size="sm" tone="secondary" onClick={() => void load()}>{isVietnamese ? "Thử lại" : tr("Try again")}</Button>
        </Alert>
      )}

      {!error && <div className={styles.calendarLayout}>
        <div>
          {loading ? (
            <SkeletonCards count={3} />
          ) : mode === "day" ? (
            shown.length === 0 ? (
              <EmptyState title={tr("No workouts on {{date}}.", { date: formatDate(`${date}T00:00`) })} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--fs-body-lg)", marginBottom: "0.25rem" }}>
                  {formatCalendarDay(date, isVietnamese).weekdayFull}, {formatDate(`${date}T00:00`)} ({shown.length} {isVietnamese ? "bài tập" : shown.length === 1 ? "workout" : "workouts"})
                </div>
                {shown.map((s) => (
                  <SessionBlock key={s.id} s={s} />
                ))}
              </div>
            )
          ) : (
            <div className={styles.calendarCard}>
              <div className={styles.calendarGrid}>
                {days.map((d) => {
                  const dayInfo = formatCalendarDay(d, isVietnamese);
                  const daySessions = shown.filter((s) => s.sessionDate === d);
                  const isToday = d === todayClub();
                  return (
                    <div key={d} className={`${styles.dayColumn} ${isToday ? styles.todayColumn : ""}`}>
                      <div className={styles.dayHeader}>
                        <span className={styles.weekdayLabel}>{dayInfo.weekdayFull}</span>
                        <div className={`${styles.dateCircle} ${isToday ? styles.todayCircle : ""}`} title={d}>
                          {dayInfo.dayNum}
                        </div>
                        <span className={`${styles.workoutCountPill} ${daySessions.length > 0 ? styles.hasWorkoutsPill : ""}`}>
                          {daySessions.length > 0
                            ? `${daySessions.length} ${isVietnamese ? "bài tập" : daySessions.length === 1 ? "workout" : "workouts"}`
                            : (isVietnamese ? "0 bài" : tr("0 workouts"))}
                        </span>
                      </div>
                      <div className={styles.columnBody}>
                        {daySessions.length === 0 ? (
                          <div className={styles.emptySlot}>{t("calendar.emptyDay")}</div>
                        ) : (
                          daySessions.map((s) => (
                            <SessionBlock key={s.id} s={s} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!loading && selected && b && (
          <Modal
            title={selected.horseName}
            width={520}
            onClose={() => setSelected(null)}
            foot={
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {b.edit && <Button size="sm" tone="ghost" onClick={() => setDialog({ kind: "edit", session: selected })}>{isVietnamese ? "Sửa" : tr("Edit")}</Button>}
              {b.record && <LinkButton to={`/training/sessions/${selected.id}/result`} size="sm" tone="secondary">{isVietnamese ? "Ghi kết quả" : tr("Record result")}</LinkButton>}
              {b.viewResult && <LinkButton to={`/training/sessions/${selected.id}/result`} size="sm" tone="secondary">{isVietnamese ? "Xem kết quả" : tr("View result")}</LinkButton>}
              {b.restore && (
                <Button size="sm" tone="primary" disabled={Boolean(b.restoreBlockedReason)} title={b.restoreBlockedReason ? tr(b.restoreBlockedReason) : undefined} onClick={() => setDialog({ kind: "restore", session: selected })}>
                  {isVietnamese ? "Khôi phục" : tr("Restore")}
                </Button>
              )}
              {b.cancel && <Button size="sm" tone="danger" onClick={() => setDialog({ kind: "cancel", session: selected })}>{isVietnamese ? "Hủy bài tập" : tr("Cancel workout")}</Button>}
              {user.role !== ROLES.GROOM && <LinkButton to={`/training/plans/${selected.planId}`} size="sm" tone="ghost">{isVietnamese ? "Mở giáo án" : tr("Open plan")}</LinkButton>}
            </div>
            }
          >
            <div style={{ fontSize: "var(--fs-body)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div>{formatDate(`${selected.sessionDate}T00:00`)} {selected.startTime} · {tr(EXERCISE_TYPE_LABEL[selected.sessionType])} · {tr(INTENSITY_LABEL[selected.intensity])}</div>
              <div>{selected.targetDistanceMeters} m × {selected.repetitions}{selected.targetSpeedKmh ? tr(` · ${selected.targetSpeedKmh} km/h`) : ""}</div>
              <div>{tr(TRACK_LABEL[selected.trackType])} · {isVietnamese ? "Nài ngựa" : tr("Jockey")}: {selected.jockeyName || "—"} · {isVietnamese ? "Chăm sóc" : tr("Groom")}: {selected.groomName || (isVietnamese ? "Chưa giao" : "—")}</div>
              <div>{isVietnamese ? "Giáo án" : tr("Plan")}: {selected.planName} {selected.phaseName ? `· ${selected.phaseName}` : ""}</div>
              {selected.notes && <div>{isVietnamese ? "Chỉ dẫn" : tr("Instructions")}: {selected.notes}</div>}
              {selected.statusReason && <div style={{ color: "var(--danger)" }}>{selected.statusReason}</div>}
              {selected.medicalOverride && <Badge tone="warn">{isVietnamese ? "Xếp lịch trong trạng thái y tế" : tr("Scheduled in a medical status")}</Badge>}
            </div>
          </Modal>
        )}
      </div>}

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <WorkoutDialog
          plans={plans}
          plan={dialog.kind === "edit" ? plans.find((p) => p.id === dialog.session.planId) : undefined}
          session={dialog.kind === "edit" ? dialog.session : undefined}
          defaultDate={date < todayClub() ? todayClub() : date}
          onClose={() => setDialog(null)}
          onSaved={(d) => {
            setDialog(null);
            setSelected(null);
            if (d >= from && d <= to) void load();
            else setDate(d);
          }}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelWorkoutDialog session={dialog.session} onClose={() => setDialog(null)} onDone={() => { setSelected(null); void load(); }} />
      )}
      {dialog?.kind === "restore" && (
        <RestoreWorkoutDialog session={dialog.session} onClose={() => setDialog(null)} onDone={() => { setSelected(null); void load(); }} />
      )}
    </div>
  );
}
