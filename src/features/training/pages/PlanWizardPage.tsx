import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { DatePicker } from "@/shared/components/form/DatePicker";
import { Select } from "@/shared/components/form/Select";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Textarea } from "@/shared/components/form/Textarea";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useToast } from "@/shared/components/ui/Toast";
import { messageFor } from "@/shared/lib/messages";
import { getHorses } from "@/features/horses/api";
import type { Horse } from "@/features/horses/types";
import { todayClub, trainingApi } from "../api";
import { PHASE_TYPE_LABEL } from "../types";
import type { PhaseSurface, PhaseType, TrainingPhase, TrainingPlan } from "../types";

import styles from "./PlanWizardPage.module.css";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const SURFACE_LABEL: Record<PhaseSurface, string> = { TURF: "Turf", DIRT: "Dirt", SYNTHETIC: "Mixed / synthetic" };
const MEDICAL = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function newPhase(startDate: string, endDate: string, index: number): TrainingPhase {
  return {
    id: `ph-${Date.now()}-${index}`,
    name: `Phase ${index + 1}`,
    type: "BASE",
    startDate,
    endDate,
    sessionsPerWeek: 5,
    maxWeeklyDistance: 9000,
    surface: "TURF",
  };
}

/** Kiểm form trước khi gửi (BE kiểm lại tất cả). Trả câu lỗi đầu tiên hoặc "". */
function validate(name: string, objective: string, start: string, end: string, phases: TrainingPhase[]): string {
  if (name.trim().length < 3 || name.trim().length > 150) return tr("Plan name must be 3 to 150 characters.");
  if (objective.trim().length < 10 || objective.trim().length > 1000) return tr("Objective must be 10 to 1000 characters.");
  if (end < start) return tr("End date must be on or after the start date.");
  if (phases.length === 0) return tr("A plan needs at least one phase.");
  const sorted = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const [i, p] of sorted.entries()) {
    if (p.name.trim().length < 2) return tr("Each phase needs a name (2-100 characters).");
    if (p.endDate < p.startDate) return tr("Phase {{name}}: end date must be on or after the start date.", { name: p.name });
    if (p.startDate < start || p.endDate > end) return tr("Phase {{name}} must be within the plan dates.", { name: p.name });
    if (i > 0 && p.startDate <= sorted[i - 1].endDate) return tr("Phase {{name}} overlaps phase {{prev}}.", { name: p.name, prev: sorted[i - 1].name });
  }
  return "";
}

/** SC-2.03 Tạo / Sửa giáo án (HT). Sửa được khi Nháp hoặc Đang áp dụng. */
export default function PlanWizardPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const { id } = useParams<{ id?: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const user = useCurrentUser();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [existing, setExisting] = useState<TrainingPlan | null>(null);
  const [horseId, setHorseId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(todayClub());
  const [endDate, setEndDate] = useState(addDays(todayClub(), 41));
  const [phases, setPhases] = useState<TrainingPhase[]>(() => [newPhase(todayClub(), addDays(todayClub(), 41), 0)]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getHorses({ limit: 100 })
      .then((res) => {
        const usable = res.items.filter((h) => h.status !== "RETIRED");
        setHorses(usable);
        if (!editing) setHorseId((cur) => cur || usable[0]?.id || "");
      })
      .catch((err) => toast.show(messageFor(err), "danger"));
  }, [editing, toast]);

  useEffect(() => {
    if (!id) return;
    trainingApi
      .getPlanById(id)
      .then((p) => {
        setExisting(p);
        setHorseId(p.horseId);
        setName(p.name);
        setObjective(p.objective ?? "");
        setNotes(p.notes ?? "");
        setStartDate(p.startDate);
        setEndDate(p.endDate);
        setPhases(p.phases);
      })
      .catch((err) => setError(messageFor(err)));
  }, [id]);

  // DL-2.09 / Bug #68: đóng tab / tải lại khi có thay đổi chưa lưu -> trình duyệt hỏi lại.
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

  const horse = useMemo(() => horses.find((h) => h.id === horseId), [horses, horseId]);

  const planDuration = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    const s = new Date(`${startDate}T00:00:00Z`).getTime();
    const e = new Date(`${endDate}T00:00:00Z`).getTime();
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.floor(diffDays / 7);
    const extraDays = diffDays % 7;
    return { diffDays, weeks, extraDays };
  }, [startDate, endDate]);
  const change =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setDirty(true);
    };
  const updatePhase = (index: number, patch: Partial<TrainingPhase>) => {
    setPhases((cur) => cur.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setDirty(true);
  };
  const addPhase = () => {
    const last = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1);
    const from = last ? addDays(last.endDate, 1) : startDate;
    setPhases((cur) => [...cur, newPhase(from > endDate ? endDate : from, endDate, cur.length)]);
    setDirty(true);
  };
  const removePhase = (index: number) => {
    const ph = phases[index];
    // BTN-2.10: khi sửa, xóa giai đoạn sẽ xóa các buổi tập chưa diễn ra trong giai đoạn đó.
    if (editing && !window.confirm(`Removing phase ${ph.name} deletes its workouts that have not happened yet. Continue?`)) return;
    setPhases((cur) => cur.filter((_, i) => i !== index));
    setDirty(true);
  };

  const cancel = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leaving will lose them.")) return;
    navigate(editing && id ? `/training/plans/${id}` : "/training/plans");
  };

  const save = async (activate: boolean) => {
    const problem = validate(name, objective, startDate, endDate, phases);
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = { horseId, phaseName: name.trim(), objective: objective.trim(), notes: notes.trim(), startDate, endDate, phases };
      const saved = editing && id ? await trainingApi.updatePlan(id, payload) : await trainingApi.createPlan(payload);
      setDirty(false);
      toast.show(tr("Training plan saved! You can now add workouts to each phase."), "ok");
      navigate(`/training/plans/${saved.id}${activate ? "?activate=1" : ""}`);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (user.role !== "HEAD_TRAINER") {
    return <Alert tone="danger" title={tr("Not allowed")}>{tr("Only the Head Trainer can create or edit training plans.")}</Alert>;
  }
  const canActivateAfterSave = !editing || existing?.status === "DRAFT";

  return (
    <div className={styles.page}>
      <PageHeader
        title={editing ? tr("Edit plan") : "Create Training Plan"}
        description="Set goals, dates, and periodization phases for the training plan."
      />

      <Card pad={20}>
        <div className={styles.roadmap}>
          <ol className={styles.steps}>
            <li className={styles.currentStep} aria-current="step"><span>01</span>{tr("Step 1: Goals, Duration & Phases")}</li>
            <li className={styles.nextStep}><span>02</span>{tr("Step 2: Add Workouts & Calendar")}</li>
          </ol>
          <p className={styles.hint}>{tr("Workouts are scheduled within phase date boundaries.")}</p>
        </div>
      </Card>

      {error && <Alert tone="danger" title={tr("Cannot save")}>{error}</Alert>}

      <Card pad={24}>
        <div className={styles.sectionHeaderWrap}>
          <h2 className={styles.sectionTitle}>{tr("General information")}</h2>
          {planDuration && (
            <span className={styles.durationBadge}>
              <Icon name="calendar" size={14} />
              {isVietnamese
                ? `Thời lượng: ${planDuration.weeks > 0 ? `${planDuration.weeks} tuần ` : ""}${planDuration.extraDays > 0 ? `${planDuration.extraDays} ngày` : ""}`
                : `Duration: ${planDuration.weeks > 0 ? `${planDuration.weeks}w ` : ""}${planDuration.extraDays > 0 ? `${planDuration.extraDays}d` : ""}`}
              {` (${planDuration.diffDays} ${isVietnamese ? "ngày" : "days"})`}
            </span>
          )}
        </div>

        <div className={styles.formContainer}>
          {/* Nhóm 1: Đối tượng & Tên giáo án */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <span className={styles.sectionNumber}>01</span>
              <div>
                <h3 className={styles.sectionSubtitle}>{isVietnamese ? "Đối tượng & Tên giáo án" : "Horse & Plan Identification"}</h3>
                <p className={styles.sectionDesc}>{isVietnamese ? "Chọn ngựa áp dụng và đặt tên giáo án huấn luyện" : "Select target horse and name the training plan"}</p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <Field label={tr("Horse")} required>
                <SearchSelect
                  value={horseId}
                  disabled={editing}
                  onChange={change(setHorseId)}
                  options={horses.map((h) => ({ value: h.id, label: `${h.name} (${h.horseCode ?? ""})${h.isMedicalLocked ? " · Training Lock" : ""}` }))}
                />
              </Field>
              <Field label={tr("Plan name")} required hint={tr("3-150 characters")}>
                <Input value={name} maxLength={150} onChange={(e) => change(setName)(e.target.value)} />
              </Field>
            </div>
            {horse?.isMedicalLocked && (
              <div style={{ marginTop: "0.75rem" }}>
                <Alert tone="danger" title={tr("Training Lock")}>
                  {tr("The horse is under a Training Lock. You can prepare a draft, but it cannot be activated yet.")}
                </Alert>
              </div>
            )}
            {horse && !horse.isMedicalLocked && MEDICAL.includes(horse.status) && (
              <div style={{ marginTop: "0.75rem" }}>
                <Alert tone="warn" title={tr("Medical status")}>{tr("The horse is in status {{status}}.", { status: horse.status })}</Alert>
              </div>
            )}
          </div>

          <div className={styles.sectionDivider} />

          {/* Nhóm 2: Khung thời gian thực hiện */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <span className={styles.sectionNumber}>02</span>
              <div>
                <h3 className={styles.sectionSubtitle}>{isVietnamese ? "Thời gian áp dụng" : "Training Schedule & Duration"}</h3>
                <p className={styles.sectionDesc}>{isVietnamese ? "Xác định ngày bắt đầu và kết thúc (tối đa 52 tuần)" : "Define plan duration boundaries (up to 52 weeks)"}</p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <Field label={tr("Start date")} required hint={editing ? undefined : tr("No earlier than 7 days ago")}>
                <DatePicker value={startDate} onChange={change(setStartDate)} />
              </Field>
              <Field label={tr("End date")} required hint={tr("At most 52 weeks")}>
                <DatePicker min={startDate} value={endDate} onChange={change(setEndDate)} />
              </Field>
            </div>
          </div>

          <div className={styles.sectionDivider} />

          {/* Nhóm 3: Mục tiêu & Ghi chú */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <span className={styles.sectionNumber}>03</span>
              <div>
                <h3 className={styles.sectionSubtitle}>{isVietnamese ? "Mục tiêu & Hướng dẫn huấn luyện" : "Objectives & Instructions"}</h3>
                <p className={styles.sectionDesc}>{isVietnamese ? "Mục tiêu thể lực/kỹ thuật và ghi chú cụ thể cho nhân viên" : "Fitness targets, tactical goals, and groom instructions"}</p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <Field label={tr("Objective")} required hint={tr("10-1000 characters")}>
                <Textarea rows={3} maxLength={1000} value={objective} onChange={(e) => change(setObjective)(e.target.value)} />
              </Field>
              <Field label={tr("Notes")} hint={tr("Up to 1000 characters")}>
                <Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => change(setNotes)(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.sectionHeader}>
        <h2 className={styles.phaseTitle}>{tr("Phases ({{count}}/12)", { count: phases.length })}</h2>
        <Button tone="secondary" onClick={addPhase} disabled={phases.length >= 12}>{tr("+ Add phase")}</Button>
      </div>

      {phases.map((ph, i) => (
        <Card key={ph.id} pad={20}>
          <div className={styles.phaseHeader}>
            <strong>{tr("Phase #{{number}}", { number: i + 1 })}</strong>
            {phases.length > 1 && (
              <Button tone="ghost" size="sm" onClick={() => removePhase(i)}>{tr("Remove phase")}</Button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "1rem" }}>
            <Field label={tr("Phase name")} required>
              <Input value={ph.name} maxLength={100} onChange={(e) => updatePhase(i, { name: e.target.value })} />
            </Field>
            <Field label={tr("Phase type")} required>
              <Select
                value={ph.type}
                onChange={(e) => updatePhase(i, { type: e.target.value as PhaseType })}
                options={(Object.keys(PHASE_TYPE_LABEL) as PhaseType[]).map((t) => ({ value: t, label: tr(PHASE_TYPE_LABEL[t]) }))}
              />
            </Field>
            <Field label={tr("From")} required>
              <DatePicker min={startDate} max={endDate} value={ph.startDate} onChange={(val) => updatePhase(i, { startDate: val })} />
            </Field>
            <Field label={tr("To")} required>
              <DatePicker min={ph.startDate} max={endDate} value={ph.endDate} onChange={(val) => updatePhase(i, { endDate: val })} />
            </Field>
            <Field label={tr("Sessions per week")} required hint={tr("1 – 14")}>
              <Input type="number" min={1} max={14} value={ph.sessionsPerWeek} onChange={(e) => updatePhase(i, { sessionsPerWeek: Number(e.target.value) })} />
            </Field>
            <Field label={tr("Max distance per week (m)")} required hint={tr("500 – 60 000")}>
              <Input
                type="number"
                min={500}
                max={60000}
                step={100}
                value={ph.maxWeeklyDistance}
                onChange={(e) => updatePhase(i, { maxWeeklyDistance: Number(e.target.value) })}
              />
            </Field>
            <Field label={tr("Main surface")} required>
              <Select
                value={ph.surface}
                onChange={(e) => updatePhase(i, { surface: e.target.value as PhaseSurface })}
                options={(Object.keys(SURFACE_LABEL) as PhaseSurface[]).map((s) => ({ value: s, label: tr(SURFACE_LABEL[s]) }))}
              />
            </Field>
            <Field label={tr("Target speed (km/h)")} hint={tr("10 – 70, optional")}>
              <Input
                type="number"
                min={10}
                max={70}
                step={0.1}
                value={ph.targetSpeedKmh ?? ""}
                onChange={(e) => updatePhase(i, { targetSpeedKmh: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </Field>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Field label={tr("Phase goal")} hint={tr("Up to 500 characters")}>
              <Textarea rows={2} maxLength={500} value={ph.goal ?? ""} onChange={(e) => updatePhase(i, { goal: e.target.value })} />
            </Field>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "0.75rem 0" }}>
        <Button tone="ghost" onClick={cancel}>{tr("Cancel")}</Button>
        <Button tone="secondary" onClick={() => void save(false)} disabled={submitting || !horseId}>
          {editing ? tr("Save draft changes") : tr("Save Draft")}
        </Button>
        {canActivateAfterSave && (
          <Button tone="primary" onClick={() => void save(true)} disabled={submitting || !horseId}>
            {editing ? tr("Save and activate") : <>{tr("Save Plan & Next: Add Workouts")} <Icon name="arrowRight" inline size={14} /></>}
          </Button>
        )}
      </div>
    </div>
  );
}
