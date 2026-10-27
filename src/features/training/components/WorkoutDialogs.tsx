import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { messageFor } from "@/shared/lib/messages";
import { clubIso, todayClub, trainingApi } from "../api";
import {
  ALWAYS_HEAVY,
  CANCEL_REASON_LABEL,
  EXERCISE_TYPE_LABEL,
  INTENSITY_LABEL,
  NO_SURFACE,
  TRACK_LABEL,
} from "../types";
import type {
  CancelWorkoutReason,
  ExerciseIntensity,
  ExerciseSession,
  ExerciseType,
  Groom,
  SessionInput,
  TrackType,
  TrainingPlan,
} from "../types";
import { hasCode } from "./PlanDialogs";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const WEEKDAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

interface WorkoutDialogProps {
  /** Danh sách giáo án để chọn (mở từ Lịch tập). Bỏ trống nếu đã cố định `plan`. */
  plans?: TrainingPlan[];
  /** Giáo án cố định (mở từ Chi tiết giáo án). */
  plan?: TrainingPlan;
  /** Có = chế độ sửa (BTN-2.20). */
  session?: ExerciseSession;
  defaultDate?: string;
  defaultType?: ExerciseType;
  onClose: () => void;
  onSaved: (date: string) => void;
}

/**
 * DL-2.01 Thêm / Sửa buổi tập. Luật thật ở BE; hộp thoại chặn sớm cho dễ dùng:
 * - Ngựa đang khóa: tắt Chạy tốc độ, Chạy thử và cường độ Nặng.
 * - BE trả VET_CONFIRMATION_REQUIRED -> hiện ô xác nhận (DL-2.06).
 * - BE trả WARNINGS_NEED_CONFIRMATION -> hiện khung vàng, bấm Lưu lần 2 để xác nhận.
 */
export function WorkoutDialog({ plans, plan: fixedPlan, session, defaultDate, defaultType, onClose, onSaved }: WorkoutDialogProps) {
  useAppLanguage();
  const toast = useToast();
  const editing = Boolean(session);
  const [grooms, setGrooms] = useState<Groom[]>([]);
  const [planId, setPlanId] = useState(session?.planId ?? fixedPlan?.id ?? plans?.[0]?.id ?? "");
  const [phaseId, setPhaseId] = useState(session?.phaseId ?? "");
  const [date, setDate] = useState(session?.sessionDate ?? defaultDate ?? todayClub());
  const [time, setTime] = useState(session?.startTime ?? "06:30");
  const [type, setType] = useState<ExerciseType>(session?.sessionType ?? defaultType ?? "CANTER");
  const [intensity, setIntensity] = useState<ExerciseIntensity>(session?.intensity ?? "MEDIUM");
  const [distance, setDistance] = useState(session?.targetDistanceMeters ?? 1200);
  const [reps, setReps] = useState(session?.repetitions ?? 1);
  const [speed, setSpeed] = useState(session?.targetSpeedKmh?.toString() ?? "");
  const [surface, setSurface] = useState<TrackType>(session?.trackType ?? "TURF");
  const [jockey, setJockey] = useState(session?.jockeyName ?? "");
  const [groomId, setGroomId] = useState(session?.groomId ?? "");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [needVet, setNeedVet] = useState(false);
  const [vetConsulted, setVetConsulted] = useState(Boolean(session?.medicalOverride));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trainingApi
      .getGrooms()
      .then((g) => {
        setGrooms(g);
        setGroomId((current) => current || g[0]?.id || "");
      })
      .catch((err) => setError(messageFor(err)));
  }, []);

  const plan = fixedPlan ?? plans?.find((p) => p.id === planId);
  const phases = useMemo(() => plan?.phases ?? [], [plan]);
  // Giai đoạn mặc định: giai đoạn chứa ngày đã chọn, nếu không thì giai đoạn đầu.
  useEffect(() => {
    if (phases.length === 0 || phases.some((p) => p.id === phaseId)) return;
    setPhaseId((phases.find((p) => p.startDate <= date && date <= p.endDate) ?? phases[0]).id);
  }, [phases, phaseId, date]);
  const phase = phases.find((p) => p.id === phaseId);
  useEffect(() => {
    if (phase && !until) setUntil(phase.endDate);
  }, [phase, until]);

  // Sửa thông tin thì bỏ các cảnh báo / xác nhận cũ.
  useEffect(() => {
    setWarnings([]);
  }, [planId, phaseId, date, time, type, intensity, distance, reps, groomId]);

  const locked = Boolean(plan?.isLockedByMedical);
  const forcedHeavy = ALWAYS_HEAVY.includes(type);
  const noSurface = NO_SURFACE.includes(type);
  const effIntensity: ExerciseIntensity = forcedHeavy ? "HEAVY" : intensity;
  const effSurface: TrackType = noSurface ? "NONE" : surface;

  const input = (): SessionInput => ({
    scheduledDate: clubIso(date, time),
    phaseId,
    workoutType: type,
    intensity: effIntensity,
    distanceMeters: distance,
    repetitions: reps,
    targetSpeedKmh: speed ? Number(speed) : undefined,
    trackSurface: effSurface,
    jockeyName: jockey.trim() || undefined,
    assignedStaffUserId: groomId,
    trainerNotes: notes.trim() || undefined,
    vetConsulted: vetConsulted || undefined,
    acknowledgeWarnings: warnings.length > 0 || undefined,
  });

  const submit = async () => {
    if (!planId) {
      setError(tr("Please select a horse and plan."));
      return;
    }
    if (phases.length > 0 && !phaseId) {
      setError(tr("Please select a phase."));
      return;
    }
    if (!groomId) {
      setError(tr("Please select an assigned groom."));
      return;
    }
    if (forcedHeavy && (!speed || Number(speed) < 10 || Number(speed) > 70)) {
      setError(tr("Target speed (10-70 km/h) is required for breeze and trial runs."));
      return;
    }
    if (forcedHeavy && !jockey.trim()) {
      setError(tr("Jockey name is required for breeze and trial runs."));
      return;
    }
    if (!distance || distance < 100 || distance > 5000) {
      setError(tr("Distance must be 100 to 5000 m."));
      return;
    }
    if (!reps || reps < 1 || reps > 10) {
      setError(tr("Reps must be 1 to 10."));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (session) {
        await trainingApi.updateSession(session.id, input());
        toast.show(tr("Workout updated."), "ok");
      } else if (repeat) {
        const res = await trainingApi.createRepeatSessions(planId, { ...input(), weekdays, until });
        const skipped = res.skipped.map((s) => `${s.date}: ${s.reason}`).join("; ");
        toast.show(
          tr(`Created ${res.created} workout(s).${res.skipped.length ? ` Skipped ${res.skipped.length} day(s): ${skipped}` : ""}`),
          res.skipped.length ? "warn" : "ok",
        );
      } else {
        await trainingApi.createSession(planId, input());
        toast.show(tr("Workout added."), "ok");
      }
      onSaved(date);
    } catch (err) {
      if (hasCode(err, "VET_CONFIRMATION_REQUIRED")) setNeedVet(true);
      if (hasCode(err, "WARNINGS_NEED_CONFIRMATION")) {
        setWarnings(((err.data as { warnings?: string[] }).warnings) ?? [err.message]);
      } else {
        setError(messageFor(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const repeatInvalid = repeat && (weekdays.length === 0 || !until || (phase && until > phase.endDate));

  return (
    <Modal
      title={editing ? tr("Edit Workout") : tr("Schedule Workout")}
      onClose={onClose}
      width={640}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button tone="ghost" onClick={onClose}>{tr("Cancel")}</Button>
          <Button
            tone="primary"
            onClick={() => void submit()}
            disabled={submitting || !planId || !groomId || (phases.length > 0 && !phaseId) || (needVet && !vetConsulted) || Boolean(repeatInvalid)}
          >
            {warnings.length > 0 ? tr("Save anyway") : tr("Save workout")}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <Alert tone="danger" title={tr("Cannot save")}>{error}</Alert>}
        {warnings.length > 0 && (
          <Alert tone="warn" title={tr("Please check before saving")}>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}
        {!fixedPlan && !editing && (
          <Field label={tr("Horse / plan")} required>
            <Select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              options={(plans ?? []).map((p) => ({
                value: p.id,
                label: `${p.horseName} – ${p.name} (${p.status === "ACTIVE" ? "Active" : "Draft"})${p.isLockedByMedical ? " · Training Lock" : ""}`,
              }))}
            />
          </Field>
        )}
        {locked && (
          <Alert tone="danger" title={tr("Training Lock")}>
            {tr("Only light or medium workouts can be scheduled. Breeze, trial run and heavy intensity are disabled.")}
          </Alert>
        )}
        {phases.length > 0 && (
          <Field label={tr("Phase")} required hint={phase ? `${phase.startDate} → ${phase.endDate}` : undefined}>
            <Select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} options={phases.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={tr("Date")} required>
            <Input type="date" min={todayClub()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={tr("Start time")} required hint="04:00 – 20:00">
            <Input type="time" min="04:00" max="20:00" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={tr("Workout type")} required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as ExerciseType)}
              options={(Object.keys(EXERCISE_TYPE_LABEL) as ExerciseType[]).map((t) => ({
                value: t,
                label: EXERCISE_TYPE_LABEL[t],
                disabled: locked && ALWAYS_HEAVY.includes(t),
              }))}
            />
          </Field>
          <Field label={tr("Intensity")} required hint={forcedHeavy ? tr("Breeze and trial runs are always heavy") : undefined}>
            <Select
              value={effIntensity}
              disabled={forcedHeavy}
              onChange={(e) => setIntensity(e.target.value as ExerciseIntensity)}
              options={(Object.keys(INTENSITY_LABEL) as ExerciseIntensity[]).map((i) => ({
                value: i,
                label: INTENSITY_LABEL[i],
                disabled: locked && i === "HEAVY",
              }))}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <Field label={tr("Distance per rep (m)")} required hint="100 – 5000">
            <Input type="number" min={100} max={5000} value={distance} onChange={(e) => setDistance(Number(e.target.value))} />
          </Field>
          <Field label={tr("Reps")} required hint="1 – 10">
            <Input type="number" min={1} max={10} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </Field>
          <Field label={tr("Target speed (km/h)")} required={forcedHeavy} hint="10 – 70">
            <Input type="number" min={10} max={70} step={0.1} value={speed} onChange={(e) => setSpeed(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={tr("Track surface")} required>
            <Select
              value={effSurface}
              disabled={noSurface}
              onChange={(e) => setSurface(e.target.value as TrackType)}
              options={(Object.keys(TRACK_LABEL) as TrackType[])
                .filter((t) => noSurface || t !== "NONE")
                .map((t) => ({ value: t, label: TRACK_LABEL[t] }))}
            />
          </Field>
          <Field label={tr("Jockey")} required={forcedHeavy}>
            <Input value={jockey} maxLength={100} onChange={(e) => setJockey(e.target.value)} />
          </Field>
        </div>
        <Field label={tr("Groom")} required>
          <Select value={groomId} onChange={(e) => setGroomId(e.target.value)} options={grooms.map((g) => ({ value: g.id, label: g.fullName }))} />
        </Field>
        <Field label={tr("Instructions")} hint={tr("Up to 500 characters")}>
          <Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {!editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Checkbox label={tr("Repeat weekly")} checked={repeat} onChange={setRepeat} />
            {repeat && (
              <>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {WEEKDAYS.map((d) => (
                    <Checkbox
                      key={d.n}
                      label={tr(d.label)}
                      checked={weekdays.includes(d.n)}
                      onChange={(on) => setWeekdays((cur) => (on ? [...cur, d.n] : cur.filter((x) => x !== d.n)))}
                    />
                  ))}
                </div>
                <Field label={tr("Repeat until")} required hint={tr("Up to the end of the phase; at most 60 workouts at once")}>
                  <Input type="date" min={date} max={phase?.endDate} value={until} onChange={(e) => setUntil(e.target.value)} />
                </Field>
              </>
            )}
          </div>
        )}
        {needVet && (
          <Checkbox
            label={tr("I have discussed this with the Veterinarian and take responsibility for this workout")}
            checked={vetConsulted}
            onChange={setVetConsulted}
          />
        )}
      </div>
    </Modal>
  );
}

/** DL-2.05 Hủy buổi tập. */
export function CancelWorkoutDialog({ session, onClose, onDone }: { session: ExerciseSession; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState<CancelWorkoutReason | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const noteOk = reason !== "OTHER" || (note.trim().length >= 10 && note.trim().length <= 500);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await trainingApi.cancelSession(session.id, reason, note.trim());
      toast.show("Workout cancelled.", "ok");
      onDone();
      onClose();
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setSubmitting(false);
    }
  };

  useAppLanguage();
  return (
    <Modal
      title={tr(`Cancel ${EXERCISE_TYPE_LABEL[session.sessionType]} at ${session.sessionDate} ${session.startTime} – ${session.horseName}?`)}
      tone="warn"
      onClose={onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button tone="ghost" onClick={onClose}>{tr("Close")}</Button>
          <Button tone="danger" onClick={() => void submit()} disabled={submitting || !reason || !noteOk}>{tr("Cancel workout")}</Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Field label={tr("Reason")} required>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as CancelWorkoutReason)}
            options={[
              { value: "", label: tr("Select a reason"), disabled: true },
              ...(Object.keys(CANCEL_REASON_LABEL) as CancelWorkoutReason[]).map((r) => ({ value: r, label: CANCEL_REASON_LABEL[r] })),
            ]}
          />
        </Field>
        <Field label={tr("Note")} required={reason === "OTHER"} hint={tr("10-500 characters")}>
          <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** DL-2.07 Khôi phục buổi tập bị chặn (sau khi gỡ khóa), có thể dời ngày giờ. */
export function RestoreWorkoutDialog({ session, onClose, onDone }: { session: ExerciseSession; onClose: () => void; onDone: () => void }) {
  useAppLanguage();
  const toast = useToast();
  const today = todayClub();
  const [date, setDate] = useState(session.sessionDate >= today ? session.sessionDate : today);
  const [time, setTime] = useState(session.startTime);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await trainingApi.restoreBlockedSession(session.id, clubIso(date, time));
      toast.show(tr("Workout restored."), "ok");
      onDone();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={tr(`Restore workout – ${session.horseName}`)}
      onClose={onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button tone="ghost" onClick={onClose}>{tr("Cancel")}</Button>
          <Button tone="primary" onClick={() => void submit()} disabled={submitting}>{tr("Restore")}</Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <Alert tone="danger" title={tr("Cannot restore")}>{error}</Alert>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label={tr("Date")} required>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={tr("Start time")} required hint="04:00 – 20:00">
            <Input type="time" min="04:00" max="20:00" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
