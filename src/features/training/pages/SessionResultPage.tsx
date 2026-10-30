import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useBlocker } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { formatDateTime } from "@/shared/lib/format";
import { ApiError } from "@/shared/lib/api";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import {
  ABNORMAL_SIGN_LABEL,
  COMPLETION_LABEL,
  EXERCISE_TYPE_LABEL,
  INTENSITY_LABEL,
  NO_TIME_TYPES,
  SESSION_STATUS_LABEL,
  SESSION_STATUS_TONE,
  TRACK_CONDITION_LABEL,
  TRACK_LABEL,
} from "../types";
import type { AbnormalSign, CompletionLevel, ExerciseSession, TrackCondition, TrackType, WorkoutSimulationResult, WorkoutSimulationResultDraft } from "../types";

import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
/** "mm:ss.s" hoặc số giây thô <-> giây. */
function parseTime(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const m = /^(\d{1,2}):([0-5]\d(?:\.\d)?)$/.exec(trimmed);
  if (m) {
    const seconds = Number(m[1]) * 60 + Number(m[2]);
    return seconds >= 5 && seconds <= 3599.9 ? seconds : null;
  }
  const rawSec = Number(trimmed);
  if (!isNaN(rawSec) && rawSec >= 5 && rawSec <= 3599.9) {
    return rawSec;
  }
  return null;
}
function formatTime(seconds?: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** SC-2.06 Kết quả buổi tập: HT ghi / sửa; CM, VET, OWNER, GROOM (buổi được giao, không thấy điểm) xem. */
export default function SessionResultPage() {
  const { isVietnamese } = useAppLanguage();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useCurrentUser();
  const isTrainer = user.role === "HEAD_TRAINER";

  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [distance, setDistance] = useState("");
  const [time, setTime] = useState("");
  const [surface, setSurface] = useState<TrackType>("TURF");
  const [condition, setCondition] = useState<TrackCondition | "">("");
  const [peakHr, setPeakHr] = useState("");
  const [recoveryHr, setRecoveryHr] = useState("");
  const [topSpeed, setTopSpeed] = useState("");
  const [simulationAborted, setSimulationAborted] = useState(false);
  const [simulationLoadError, setSimulationLoadError] = useState("");
  const [simulationImported, setSimulationImported] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [score, setScore] = useState("");
  const [completion, setCompletion] = useState<CompletionLevel | "">("");
  const [comment, setComment] = useState("");
  const [signs, setSigns] = useState<AbnormalSign[]>([]);
  const [signNotes, setSignNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // Bug #68: đóng tab / tải lại khi có thay đổi chưa lưu -> trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Bug #68: Chuyển trang qua router / Sidebar khi chưa lưu -> hỏi xác nhận
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("You have unsaved changes. Leaving will lose them.")) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  const fill = useCallback((s: ExerciseSession, draft?: WorkoutSimulationResultDraft | null) => {
    const r = s.result;
    setDistance(String(r?.actualDistanceMeters ?? draft?.actualDistanceMeters ?? s.targetDistanceMeters * s.repetitions));
    setTime(formatTime(r?.actualDurationSeconds ?? draft?.actualTimeSeconds));
    setSurface(r?.actualSurface ?? draft?.actualSurface ?? s.trackType);
    setCondition(r?.trackCondition ?? draft?.trackCondition ?? "");
    setPeakHr((r?.maxHeartRate ?? draft?.heartRatePeak)?.toString() ?? "");
    setRecoveryHr((r?.recoveryHeartRate ?? draft?.heartRateRecovery)?.toString() ?? "");
    setTopSpeed((r?.maxSpeedKmh ?? draft?.topSpeedKmh)?.toString() ?? "");
    setScore(r?.performanceScore?.toString() ?? "");
    setCompletion(r?.completionLevel ?? "");
    setComment(r?.headTrainerFeedback ?? "");
    setSigns(r?.abnormalSignTypes ?? []);
    setSignNotes(r?.abnormalSignsDescription ?? "");
    setFieldErrors({});
    setDirty(false);
  }, []);

  const importSimulationResult = useCallback(async (s: ExerciseSession) => {
    setSimulationLoading(true);
    try {
      const simulation: WorkoutSimulationResult = await trainingApi.getLatestSimulationResult(s.id);
      if (!simulation.resultDraft) return;
      fill(s, simulation.resultDraft);
      const plannedDistance = s.targetDistanceMeters;
      setCompletion(
        simulation.status === "COMPLETED" &&
          (simulation.resultDraft.actualDistanceMeters ?? 0) >= plannedDistance
          ? "ACHIEVED"
          : "PARTIAL",
      );
      setSimulationAborted(simulation.status === "ABORTED_INJURY");
      setSimulationImported(true);
      setSimulationLoadError("");
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "SIMULATOR_RESULT_NOT_FOUND")) {
        setSimulationLoadError(messageFor(err));
      }
    } finally {
      setSimulationLoading(false);
    }
  }, [fill]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const s = await trainingApi.getSession(id);
        if (!mounted) return;
        setSession(s);
        setLoadedAt(Date.now());
        fill(s);
        // Chưa có kết quả và HT mở -> vào thẳng chế độ ghi.
        setEditing(s.status !== "COMPLETED" && isTrainer);
        if (!s.result && isTrainer) await importSimulationResult(s);
      } catch (err) {
        if (mounted) setLoadError(messageFor(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, fill, importSimulationResult, isTrainer]);

  useEffect(() => {
    if (!session || session.result || !isTrainer || dirty) return;
    const refresh = () => void importSimulationResult(session);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [dirty, importSimulationResult, isTrainer, session]);

  if (loadError) return <Alert tone="danger" title={tr("Could not load the workout")}>{loadError}</Alert>;
  if (!session) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading workout...")}</div>;

  const r = session.result;
  const needsTime = !NO_TIME_TYPES.includes(session.sessionType);
  const seconds = parseTime(time);
  const avgSpeed = seconds && Number(distance) ? Math.round((Number(distance) / seconds) * 3.6 * 10) / 10 : null;
  const firstSaved = r?.recordedAt ? new Date(r.recordedAt).getTime() : null;
  const canEditResult = isTrainer && session.status === "COMPLETED" && firstSaved != null && loadedAt - firstSaved <= EDIT_WINDOW_MS;

  const d = Number(distance);

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!distance.trim()) {
      errs.distance = tr("Actual distance is required.");
    } else if (!Number.isInteger(d) || d < 50 || d > 10000) {
      errs.distance = tr("Actual distance must be 50 to 10,000 m.");
    }

    if (needsTime && !seconds) {
      errs.time = tr("Running time is required (format mm:ss.s or seconds).");
    } else if (!needsTime && time.trim() && !seconds) {
      errs.time = tr("Running time is not valid (format mm:ss.s or seconds).");
    }

    if (peakHr) {
      const p = Number(peakHr);
      if (isNaN(p) || p < 20 || p > 260) {
        errs.peakHr = tr("Peak heart rate must be 20 to 260 bpm.");
      }
    }

    if (recoveryHr) {
      const rec = Number(recoveryHr);
      if (isNaN(rec) || rec < 20 || rec > 200) {
        errs.recoveryHr = tr("Recovery heart rate must be 20 to 200 bpm.");
      } else if (peakHr && rec > Number(peakHr)) {
        errs.recoveryHr = tr("Recovery heart rate cannot exceed peak heart rate.");
      }
    }

    if (topSpeed && (isNaN(Number(topSpeed)) || Number(topSpeed) < 0 || Number(topSpeed) > 80)) {
      errs.topSpeed = tr("Top speed must be 0 to 80 km/h.");
    }

    if (!score) {
      errs.score = tr("Please select a performance score.");
    }

    if (!completion) {
      errs.completion = tr("Please select a completion level.");
    }

    const trimmedComment = comment.trim();
    if (!trimmedComment || trimmedComment.length < 2) {
      errs.comment = tr("Comment must be at least 2 characters.");
    } else if (trimmedComment.length > 2000) {
      errs.comment = tr("Comment cannot exceed 2000 characters.");
    }

    if (signs.length > 0) {
      const trimmedNotes = signNotes.trim();
      if (!trimmedNotes || trimmedNotes.length < 2) {
        errs.signNotes = tr("Describe the abnormal signs (2-500 characters).");
      } else if (trimmedNotes.length > 500) {
        errs.signNotes = tr("Notes cannot exceed 500 characters.");
      }
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(tr("Please check and correct the highlighted fields below."));
      return false;
    }
    setError("");
    return true;
  }

  const set =
    <T,>(setter: (v: T) => void, fieldName?: string) =>
    (v: T) => {
      setter(v);
      setDirty(true);
      if (fieldName) clearFieldError(fieldName);
    };

  const save = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setError("");
    try {
      await trainingApi.saveSessionResult(session.id, {
        actualDistanceMeters: d,
        actualTimeSeconds: seconds ?? undefined,
        actualSurface: surface,
        trackCondition: condition || undefined,
        heartRatePeak: peakHr ? Number(peakHr) : undefined,
        heartRateRecovery: recoveryHr ? Number(recoveryHr) : undefined,
        topSpeedKmh: topSpeed ? Number(topSpeed) : undefined,
        performanceScore: Number(score),
        completionLevel: completion as CompletionLevel,
        trainerNotes: comment.trim(),
        abnormalSignTypes: signs,
        abnormalNotes: signs.length > 0 ? signNotes.trim() : undefined,
      });
      setDirty(false);
      toast.show(signs.length > 0 ? "Result saved. The Veterinarian has been alerted." : "Workout result saved.", signs.length > 0 ? "warn" : "ok");
      navigate(-1);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leaving will lose them.")) return;
    if (session.status === "COMPLETED") {
      fill(session);
      setEditing(false);
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--fs-kpi)" }}>{tr("Workout result")}</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "var(--fs-body)" }}>
            {tr("Record performance metrics, speed telemetry, and trainer observations.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {user.role !== "GROOM" && (
            <Link to={`/horses/${session.horseId}/fitness`}><Button tone="secondary">{tr("Fitness chart")}</Button></Link>
          )}
          {user.role !== "GROOM" && user.role !== "HORSE_OWNER" && (
            <Link to={`/training/plans/${session.planId}`}><Button tone="ghost">{tr("Open plan")}</Button></Link>
          )}
        </div>
      </div>

      <Card pad={20}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{tr("Workout")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "var(--fs-body)" }}>
          <div>{tr("Horse:")}{" "}<strong>{session.horseName}</strong></div>
          <div>{tr("Date:")}{" "}<strong>{session.sessionDate} {session.startTime}</strong></div>
          <div>{tr("Type:")}{" "}<strong>{EXERCISE_TYPE_LABEL[session.sessionType]}</strong> · {INTENSITY_LABEL[session.intensity]}</div>
          <div>{tr("Planned:")}{" "}<strong>{session.targetDistanceMeters} m × {session.repetitions}</strong></div>
          <div>{tr("Target speed:")}{" "}<strong>{session.targetSpeedKmh ? tr(`${session.targetSpeedKmh} km/h`) : "—"}</strong></div>
          <div>{tr("Surface:")}{" "}<strong>{TRACK_LABEL[session.trackType]}</strong></div>
          <div>{tr("Jockey:")}{" "}<strong>{session.jockeyName || "—"}</strong></div>
          <div>{tr("Groom:")}{" "}<strong>{session.groomName || "—"}</strong></div>
          <div>{tr("Status:")}{" "}<Badge tone={SESSION_STATUS_TONE[session.status]}>{SESSION_STATUS_LABEL[session.status]}</Badge></div>
        </div>
      </Card>

      {!editing && !r && (
        <Alert tone="info" title={tr("No result yet")}>
          {session.status === "BLOCKED" || session.status === "CANCELLED"
            ? tr("This workout was blocked or cancelled, so it has no result.")
            : tr("The Head Trainer has not recorded a result yet.")}
        </Alert>
      )}

      {!editing && r && (
        <Card pad={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "var(--fs-body-lg)" }}>{tr("Result")}</h2>
            {isTrainer && (
              <Button
                tone="secondary"
                size="sm"
                disabled={!canEditResult}
                title={canEditResult ? "" : tr("Results can only be edited within 48 hours of recording.")}
                onClick={() => setEditing(true)}
              >
                {tr("Edit result")}
              </Button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "var(--fs-body)" }}>
            <div>{tr("Actual distance:")}{" "}<strong>{r.actualDistanceMeters ?? "—"} m</strong></div>
            <div>{tr("Time:")}{" "}<strong>{formatTime(r.actualDurationSeconds) || "—"}</strong></div>
            <div>{tr("Average speed:")}{" "}<strong>{r.avgSpeedKmh != null ? `${r.avgSpeedKmh} km/h` : "—"}</strong></div>
            <div>{tr("Top speed:")}{" "}<strong>{r.maxSpeedKmh != null ? `${r.maxSpeedKmh} km/h` : "—"}</strong></div>
            <div>{tr("Surface:")}{" "}<strong>{r.actualSurface ? tr(TRACK_LABEL[r.actualSurface]) : "—"}</strong>{r.trackCondition ? ` (${tr(TRACK_CONDITION_LABEL[r.trackCondition])})` : ""}</div>
            <div>{tr("Peak HR:")}{" "}<strong>{r.maxHeartRate ?? "—"} {tr("bpm")}</strong></div>
            <div>{tr("HR after 10 min:")}{" "}<strong>{r.recoveryHeartRate ?? "—"} {tr("bpm")}</strong></div>
            {user.role !== "GROOM" && <div>{tr("Performance:")}{" "}<strong>{r.performanceScore ?? "—"}/10</strong></div>}
            <div>{tr("Completion:")}{" "}<strong>{r.completionLevel ? tr(COMPLETION_LABEL[r.completionLevel]) : "—"}</strong></div>
          </div>
          <div style={{ marginTop: "0.75rem" }}><strong>{tr("Comment:")}</strong> {r.headTrainerFeedback || "—"}</div>
          {r.hasAbnormalSigns && (
            <Alert tone="danger" title={tr("Abnormal signs")}>
              {r.abnormalSignTypes.map((x) => tr(ABNORMAL_SIGN_LABEL[x])).join(", ")}: {r.abnormalSignsDescription}
            </Alert>
          )}
          <div style={{ marginTop: "0.75rem", fontSize: "var(--fs-body)", color: "var(--text-muted)" }}>
            {tr("Recorded by {{name}}", { name: r.recordedBy ?? "—" })}{r.recordedAt ? tr(" at {{time}}", { time: formatDateTime(r.recordedAt) }) : ""}
            {r.updatedBy ? tr(" · last edited by {{name}}", { name: r.updatedBy }) : ""}{r.updatedAt ? tr(" at {{time}}", { time: formatDateTime(r.updatedAt) }) : ""}
          </div>
        </Card>
      )}

      {editing && (
        <>
          {error && <Alert tone="danger" title={tr("Cannot save")}>{error}</Alert>}
          {simulationLoadError && <Alert tone="warn" title={tr("Could not load simulator measurements")}>{simulationLoadError}</Alert>}
          {simulationImported && (
            <div data-testid="simulation-result-source">
              <Alert
                tone="info"
                title={isVietnamese ? "Đã tải từ Simulator" : "Loaded from Simulator"}
                action={
                  <Button
                    size="sm"
                    tone="secondary"
                    disabled={simulationLoading || dirty}
                    onClick={() => void importSimulationResult(session)}
                  >
                    {simulationLoading ? tr("Loading...") : isVietnamese ? "Tải lại" : "Reload"}
                  </Button>
                }
              >
                {isVietnamese
                  ? "Nhịp tim hồi phục chưa có dữ liệu. Điểm hiệu suất, nhận xét và dấu hiệu bất thường vẫn cần Head Trainer nhập."
                  : "Recovery heart rate is unavailable. Performance score, comments, and abnormal signs still require Head Trainer input."}
              </Alert>
            </div>
          )}
          {!simulationImported && isTrainer && !r && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                data-testid="simulation-result-retry"
                size="sm"
                tone="secondary"
                disabled={simulationLoading || dirty}
                onClick={() => void importSimulationResult(session)}
              >
                {simulationLoading
                  ? tr("Loading...")
                  : isVietnamese
                    ? "Tải chỉ số từ Simulator"
                    : "Load measurements from Simulator"}
              </Button>
            </div>
          )}
          {simulationAborted && <Alert tone="warn" title={tr("Simulation ended due to injury")}>{tr("Review the imported measurements and record any abnormal signs before completing this workout.")}</Alert>}
          <Card pad={20}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{tr("Actual figures")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <Field label={tr("Actual distance (m)")} required error={fieldErrors.distance} hint={tr("50 – 10 000, all reps")}>
                <Input data-testid="result-distance" type="number" inputMode="numeric" value={distance} onChange={(e) => set(setDistance, "distance")(e.target.value)} />
              </Field>
              <Field label={tr("Running time (mm:ss.s)")} required={needsTime} error={fieldErrors.time} hint={tr("e.g. 01:12.5 or seconds")}>
                <Input data-testid="result-duration" value={time} placeholder="01:12.5" onChange={(e) => set(setTime, "time")(e.target.value)} />
              </Field>
              <Field label={tr("Average speed (km/h)")} hint={tr("Calculated")}>
                <Input value={avgSpeed ?? ""} readOnly />
              </Field>
              <Field label={tr("Actual surface")} required>
                <Select
                  value={surface}
                  onChange={(e) => set(setSurface)(e.target.value as TrackType)}
                  options={(Object.keys(TRACK_LABEL) as TrackType[]).map((t) => ({ value: t, label: TRACK_LABEL[t] }))}
                />
              </Field>
              <Field label={tr("Track condition")}>
                <Select
                  value={condition}
                  onChange={(e) => set(setCondition)(e.target.value as TrackCondition)}
                  options={[
                    { value: "", label: "—" },
                    ...(Object.keys(TRACK_CONDITION_LABEL) as TrackCondition[]).map((c) => ({ value: c, label: TRACK_CONDITION_LABEL[c] })),
                  ]}
                />
              </Field>
              <Field label={tr("Peak heart rate (bpm)")} error={fieldErrors.peakHr} hint="20 – 260 bpm">
                <Input data-testid="result-peak-hr" type="number" inputMode="numeric" value={peakHr} onChange={(e) => set(setPeakHr, "peakHr")(e.target.value)} />
              </Field>
              <Field label={tr("Heart rate after 10 min rest (bpm)")} error={fieldErrors.recoveryHr} hint="20 – 200 bpm">
                <Input data-testid="result-recovery-hr" type="number" inputMode="numeric" value={recoveryHr} onChange={(e) => set(setRecoveryHr, "recoveryHr")(e.target.value)} />
              </Field>
              <Field label={tr("Top speed (km/h)")} error={fieldErrors.topSpeed} hint={tr("0 – 80 km/h")}>
                <Input data-testid="result-top-speed" type="number" inputMode="decimal" value={topSpeed} onChange={(e) => set(setTopSpeed, "topSpeed")(e.target.value)} />
              </Field>
            </div>
            {avgSpeed != null && avgSpeed > 75 && (
              <div style={{ marginTop: "0.75rem" }}>
                <Alert tone="warn" title={tr("Unusual speed")}>{tr("The calculated speed looks wrong. Please check the distance and time.")}</Alert>
              </div>
            )}
          </Card>

          <Card pad={20}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "var(--fs-body-lg)" }}>{tr("Evaluation")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <Field label={tr("Performance score")} required error={fieldErrors.score}>
                <Select
                  data-testid="result-performance-score"
                  value={score}
                  onChange={(e) => set(setScore, "score")(e.target.value)}
                  options={[{ value: "", label: "—", disabled: true }, ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))]}
                />
              </Field>
              <Field label={tr("Completion")} required error={fieldErrors.completion}>
                <Select
                  data-testid="result-completion"
                  value={completion}
                  onChange={(e) => set(setCompletion, "completion")(e.target.value as CompletionLevel)}
                  options={[
                    { value: "", label: "—", disabled: true },
                    ...(Object.keys(COMPLETION_LABEL) as CompletionLevel[]).map((c) => ({ value: c, label: COMPLETION_LABEL[c] })),
                  ]}
                />
              </Field>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <Field label={tr(`Professional comment (${comment.trim().length}/2000)`)} required error={fieldErrors.comment} hint={tr("2 – 2000 characters")}>
                <Textarea data-testid="result-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => set(setComment, "comment")(e.target.value)} />
              </Field>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.375rem" }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", alignSelf: "center" }}>{tr("Quick notes:")}</span>
                <button
                  type="button"
                  onClick={() => set(setComment, "comment")(tr("Hoàn thành tốt bài tập, sải bước đều và nhịp thở phục hồi ổn định."))}
                  style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                >
                  {tr("+ Hoàn thành tốt")}
                </button>
                <button
                  type="button"
                  onClick={() => set(setComment, "comment")(tr("Ngựa mệt mỏi nhẹ ở 200m cuối, cần theo dõi giảm tải buổi sau."))}
                  style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                >
                  {tr("+ Mệt mỏi nhẹ")}
                </button>
                <button
                  type="button"
                  onClick={() => set(setComment, "comment")(tr("Có dấu hiệu bất thường về vận động, đề nghị Bác sĩ thú y kiểm tra chuyên sâu."))}
                  style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                >
                  {tr("+ Bất thường cần khám")}
                </button>
              </div>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <strong style={{ fontSize: "var(--fs-body)" }}>{tr("Abnormal signs")}</strong>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {(Object.keys(ABNORMAL_SIGN_LABEL) as AbnormalSign[]).map((sign) => (
                  <Checkbox
                    key={sign}
                    label={ABNORMAL_SIGN_LABEL[sign]}
                    checked={signs.includes(sign)}
                    onChange={(on) => set(setSigns)(on ? [...signs, sign] : signs.filter((x) => x !== sign))}
                  />
                ))}
              </div>
              {signs.length > 0 && (
                <>
                  <Alert tone="warn" title={tr("The Veterinarian and Head Trainer are alerted when you save")}>
                    {tr("Placing a Training Lock is the Veterinarian's decision.")}
                  </Alert>
                  <Field label={tr("Describe the signs")} required error={fieldErrors.signNotes} hint={tr("2 – 500 characters")}>
                    <Textarea rows={2} maxLength={500} value={signNotes} onChange={(e) => set(setSignNotes, "signNotes")(e.target.value)} />
                  </Field>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", alignSelf: "center" }}>{tr("Quick templates:")}</span>
                    <button
                      type="button"
                      onClick={() => set(setSignNotes)(tr("Khập khiễng nhẹ chân sau bên phải sau khi tăng tốc cự ly 800m."))}
                      style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                    >
                      {tr("+ Khập khiễng chân sau")}
                    </button>
                    <button
                      type="button"
                      onClick={() => set(setSignNotes)(tr("Nhịp tim phục hồi chậm, thở dốc bất thường kéo dài hơn 10 phút sau bài tập."))}
                      style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                    >
                      {tr("+ Thở dốc, tim chậm hồi")}
                    </button>
                    <button
                      type="button"
                      onClick={() => set(setSignNotes)(tr("Căng cứng cơ vai và lưng khi sải bước dài, có biểu hiện đau khi chạm vào."))}
                      style={{ fontSize: "var(--fs-xs)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}
                    >
                      {tr("+ Căng cứng cơ vai")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <Button tone="ghost" onClick={cancel}>{tr("Cancel")}</Button>
            <Button tone="primary" onClick={() => void save()} disabled={submitting}>
              {submitting ? tr("Saving...") : tr("Save result")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
