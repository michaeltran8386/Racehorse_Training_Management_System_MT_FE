import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, useBlocker } from "react-router-dom";
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
interface PhaseFieldErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  sessionsPerWeek?: string;
  maxWeeklyDistance?: string;
  targetSpeedKmh?: string;
  goal?: string;
}

interface FormErrors {
  horseId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  objective?: string;
  notes?: string;
  phases?: Record<string, PhaseFieldErrors>;
  general?: string;
}

/** Kiểm tra toàn bộ form, trả về chi tiết lỗi theo từng trường. */
function validatePlanForm(
  horseId: string,
  name: string,
  objective: string,
  notes: string,
  start: string,
  end: string,
  phases: TrainingPhase[],
  isVietnamese: boolean,
  editing: boolean,
): FormErrors {
  const errors: FormErrors = {};

  if (!horseId) {
    errors.horseId = isVietnamese ? "Vui lòng chọn ngựa áp dụng." : tr("Please select a horse.");
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    errors.name = isVietnamese ? "Vui lòng nhập tên giáo án." : tr("Please enter a plan name.");
  } else if (trimmedName.length < 3 || trimmedName.length > 150) {
    errors.name = isVietnamese ? "Tên giáo án phải từ 3 đến 150 ký tự." : tr("Plan name must be 3 to 150 characters.");
  } else if (/^\d+$/.test(trimmedName)) {
    errors.name = isVietnamese ? "Tên giáo án không được đặt hoàn toàn bằng số." : tr("Plan name cannot be only numbers.");
  } else if (!/[\p{L}]/u.test(trimmedName)) {
    errors.name = isVietnamese ? "Tên giáo án phải chứa chữ cái." : tr("Plan name must contain letters.");
  }

  const tomorrow = addDays(todayClub(), 1);
  if (!start) {
    errors.startDate = isVietnamese ? "Vui lòng chọn ngày bắt đầu." : tr("Please select a start date.");
  } else if (!editing && start < tomorrow) {
    errors.startDate = isVietnamese ? "Ngày bắt đầu giáo án phải từ ngày mai trở đi." : tr("Plan start date must be from tomorrow onwards.");
  } else if (start < addDays(todayClub(), -7)) {
    errors.startDate = isVietnamese ? "Ngày bắt đầu không được sớm hơn 7 ngày trước." : tr("Start date cannot be earlier than 7 days ago.");
  }

  if (!end) {
    errors.endDate = isVietnamese ? "Vui lòng chọn ngày kết thúc." : tr("Please select an end date.");
  } else if (end < start) {
    errors.endDate = isVietnamese ? "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." : tr("End date must be on or after the start date.");
  } else {
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const e = new Date(`${end}T00:00:00Z`).getTime();
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      errors.endDate = isVietnamese
        ? "Giáo án phải kéo dài ít nhất 1 tuần (7 ngày) giữa ngày bắt đầu và ngày kết thúc."
        : tr("Training plan must last at least 1 week (7 days) between start date and end date.");
    } else if (diffDays > 365) {
      errors.endDate = isVietnamese ? "Giáo án tối đa 52 tuần (365 ngày)." : tr("Plan duration cannot exceed 52 weeks.");
    }
  }

  const trimmedObj = objective.trim();
  if (trimmedObj.length === 0) {
    errors.objective = isVietnamese ? "Vui lòng nhập mục tiêu giáo án." : tr("Please enter training objectives.");
  } else if (trimmedObj.length < 10 || trimmedObj.length > 1000) {
    errors.objective = isVietnamese ? "Mục tiêu phải từ 10 đến 1000 ký tự." : tr("Objective must be 10 to 1000 characters.");
  } else if (!/^[\p{L}]/u.test(trimmedObj)) {
    errors.objective = isVietnamese
      ? "Mục tiêu phải bắt đầu bằng chữ cái, không được bắt đầu bằng số hay ký tự đặc biệt."
      : tr("Objective must start with a letter, not a number or symbol.");
  }

  if (notes.length > 1000) {
    errors.notes = isVietnamese ? "Ghi chú tối đa 1000 ký tự." : tr("Notes cannot exceed 1000 characters.");
  }

  if (phases.length === 0) {
    errors.general = isVietnamese ? "Giáo án cần ít nhất một giai đoạn." : tr("A plan needs at least one phase.");
  } else {
    const phaseErrors: Record<string, PhaseFieldErrors> = {};
    const sorted = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate));

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const pErr: PhaseFieldErrors = {};

      if (p.name.trim().length < 2 || p.name.trim().length > 100) {
        pErr.name = isVietnamese ? "Tên giai đoạn phải từ 2 đến 100 ký tự." : tr("Each phase needs a name (2-100 characters).");
      }

      if (p.startDate < start || p.startDate > end) {
        pErr.startDate = isVietnamese ? "Ngày bắt đầu phải nằm trong thời gian của giáo án." : tr("Phase start must be within plan dates.");
      }
      if (i > 0 && p.startDate <= sorted[i - 1].endDate) {
        pErr.startDate = isVietnamese
          ? `Trùng ngày với giai đoạn "${sorted[i - 1].name}".`
          : tr("Phase overlaps with previous phase.");
      }

      if (p.endDate < p.startDate) {
        pErr.endDate = isVietnamese ? "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." : tr("End date must be on or after start date.");
      } else if (p.endDate > end) {
        pErr.endDate = isVietnamese ? "Ngày kết thúc không được vượt quá ngày kết thúc của giáo án." : tr("Phase end date cannot exceed plan end date.");
      }

      if (!p.sessionsPerWeek || p.sessionsPerWeek < 1 || p.sessionsPerWeek > 14) {
        pErr.sessionsPerWeek = isVietnamese ? "Số buổi một tuần phải từ 1 đến 14." : tr("Sessions per week must be 1 to 14.");
      }

      if (!p.maxWeeklyDistance || p.maxWeeklyDistance < 500 || p.maxWeeklyDistance > 60000) {
        pErr.maxWeeklyDistance = isVietnamese ? "Cự ly tối đa mỗi tuần phải từ 500 đến 60.000 m." : tr("Max distance per week must be 500 to 60,000 m.");
      }

      if (p.targetSpeedKmh !== undefined && (p.targetSpeedKmh < 10 || p.targetSpeedKmh > 70)) {
        pErr.targetSpeedKmh = isVietnamese ? "Tốc độ mục tiêu từ 10 đến 70 km/h." : tr("Target speed must be 10 to 70 km/h.");
      }

      if (p.goal && p.goal.length > 500) {
        pErr.goal = isVietnamese ? "Mục tiêu giai đoạn tối đa 500 ký tự." : tr("Phase goal cannot exceed 500 characters.");
      }

      if (Object.keys(pErr).length > 0) {
        phaseErrors[p.id] = pErr;
      }
    }

    if (Object.keys(phaseErrors).length > 0) {
      errors.phases = phaseErrors;
    }
  }

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  if (errors.horseId || errors.name || errors.startDate || errors.endDate || errors.objective || errors.notes || errors.general) {
    return true;
  }
  if (errors.phases && Object.keys(errors.phases).length > 0) {
    return true;
  }
  return false;
}

/** SC-2.03 Tạo / Sửa giáo án (HT). Sửa được khi Nháp hoặc Đang áp dụng. */
export default function PlanWizardPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
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
  const tomorrow = addDays(todayClub(), 1);
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(addDays(tomorrow, 41));
  const [phases, setPhases] = useState<TrainingPhase[]>(() => [newPhase(tomorrow, addDays(tomorrow, 41), 0)]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [phaseTouched, setPhaseTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const markTouched = (field: string) => {
    setTouched((cur) => (cur[field] ? cur : { ...cur, [field]: true }));
  };

  const markPhaseTouched = (phaseId: string, field: string) => {
    const key = `${phaseId}_${field}`;
    setPhaseTouched((cur) => (cur[key] ? cur : { ...cur, [key]: true }));
  };

  const isFieldVisible = (field: string) => submitted || Boolean(touched[field]);
  const isPhaseFieldVisible = (phaseId: string, field: string) =>
    submitted || Boolean(phaseTouched[`${phaseId}_${field}`]);

  const formErrors = useMemo(
    () =>
      validatePlanForm(
        horseId,
        name,
        objective,
        notes,
        startDate,
        endDate,
        phases,
        isVietnamese,
        editing,
      ),
    [horseId, name, objective, notes, startDate, endDate, phases, isVietnamese, editing],
  );

  useEffect(() => {
    if (error && !hasErrors(formErrors)) {
      setError("");
    }
  }, [error, formErrors]);

  useEffect(() => {
    getHorses({ limit: 100 })
      .then((res) => {
        const usable = res.items.filter((h) => h.status !== "RETIRED");
        setHorses(usable);
        if (!editing) {
          const preselected = searchParams.get("horseId");
          if (preselected && usable.some((h) => h.id === preselected)) {
            setHorseId(preselected);
          } else {
            setHorseId((cur) => cur || usable[0]?.id || "");
          }
        }
      })
      .catch((err) => toast.show(messageFor(err), "danger"));
  }, [editing, toast, searchParams]);

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
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    setDirty(true);
    markTouched("startDate");
    // Giáo án phải ít nhất 1 tuần (7 ngày)
    const minEnd = addDays(newStart, 7);
    let targetEnd = endDate;
    if (endDate < minEnd) {
      targetEnd = minEnd;
      setEndDate(minEnd);
      markTouched("endDate");
    }
    // Giai đoạn chỉ được nằm trong tổng thời gian của giáo án [newStart, targetEnd]
    setPhases((cur) =>
      cur.map((p) => {
        let pStart = p.startDate < newStart ? newStart : p.startDate;
        if (pStart > targetEnd) pStart = targetEnd;
        let pEnd = p.endDate < pStart ? pStart : p.endDate;
        if (pEnd > targetEnd) pEnd = targetEnd;
        return { ...p, startDate: pStart, endDate: pEnd };
      }),
    );
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    setDirty(true);
    markTouched("endDate");
    // Giai đoạn chỉ được nằm trong tổng thời gian của giáo án, không vượt quá newEnd
    setPhases((cur) =>
      cur.map((p) => {
        let pEnd = p.endDate > newEnd ? newEnd : p.endDate;
        let pStart = p.startDate > pEnd ? pEnd : p.startDate;
        return { ...p, startDate: pStart, endDate: pEnd };
      }),
    );
  };

  const lastPhase = useMemo(
    () => (phases.length > 0 ? [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1) : null),
    [phases],
  );
  const nextPhaseFrom = lastPhase ? addDays(lastPhase.endDate, 1) : startDate;
  const isPlanFullyAllocated = Boolean(lastPhase && nextPhaseFrom > endDate);

  const addPhase = () => {
    if (isPlanFullyAllocated) {
      toast.show(
        tr("Cannot add more phases: the entire plan period has already been allocated."),
        "warn",
      );
      return;
    }
    setPhases((cur) => [...cur, newPhase(nextPhaseFrom, endDate, cur.length)]);
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
    setSubmitted(true);
    if (hasErrors(formErrors)) {
      setError(
        isVietnamese
          ? "Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ hiển thị bên dưới."
          : tr("Please check and correct the invalid fields below."),
      );
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
          <p className={styles.hint}>{tr("Phases must stay within the plan dates. Workouts are scheduled within phase date boundaries.")}</p>
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
              <Field
                label={tr("Horse")}
                required
                error={isFieldVisible("horseId") ? formErrors.horseId : undefined}
              >
                <SearchSelect
                  value={horseId}
                  disabled={editing}
                  onChange={(val) => {
                    change(setHorseId)(val);
                    markTouched("horseId");
                  }}
                  options={horses.map((h) => ({
                    value: h.id,
                    label: `${h.name} (${h.horseCode ?? ""})${h.isMedicalLocked ? " · Training Lock" : ""}`,
                  }))}
                />
              </Field>
              <Field
                label={tr("Plan name")}
                required
                hint={tr("3-150 characters")}
                error={isFieldVisible("name") ? formErrors.name : undefined}
              >
                <Input
                  value={name}
                  maxLength={150}
                  onChange={(e) => change(setName)(e.target.value)}
                  onBlur={() => markTouched("name")}
                />
              </Field>
            </div>
            {horse?.isMedicalLocked && (
              <div style={{ marginTop: "0.75rem" }}>
                <Alert tone="danger" title={isVietnamese ? "Không thể tạo giáo án: Ngựa đang bị Khóa huấn luyện y tế" : tr("Training Lock")}>
                  {isVietnamese
                    ? "Ngựa đang chịu lệnh Khóa huấn luyện y tế do Bác sĩ thú y chỉ định. Theo quy chuẩn an toàn và phúc lợi ngựa, không thể tạo hoặc lưu giáo án cho ngựa này cho đến khi Bác sĩ thú y gỡ khóa trên Hồ sơ bệnh án."
                    : tr("The horse is under a Training Lock. Plans cannot be created until cleared by a veterinarian.")}
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
                <p className={styles.sectionDesc}>
                  {isVietnamese
                    ? "Xác định ngày bắt đầu và kết thúc (tối thiểu 1 tuần, tối đa 52 tuần)"
                    : "Define plan duration boundaries (at least 1 week, up to 52 weeks)"}
                </p>
              </div>
            </div>
            <div className={styles.twoCol}>
              <Field
                label={tr("Start date")}
                required
                hint={editing ? undefined : isVietnamese ? "Từ ngày mai trở đi" : tr("From tomorrow onwards")}
                error={isFieldVisible("startDate") ? formErrors.startDate : undefined}
              >
                <DatePicker min={editing ? undefined : tomorrow} value={startDate} onChange={handleStartDateChange} />
              </Field>
              <Field
                label={tr("End date")}
                required
                hint={tr("At least 1 week, at most 52 weeks")}
                error={isFieldVisible("endDate") ? formErrors.endDate : undefined}
              >
                <DatePicker min={addDays(startDate, 7)} value={endDate} onChange={handleEndDateChange} />
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
              <Field
                label={tr("Objective")}
                required
                hint={tr("10-1000 characters")}
                error={isFieldVisible("objective") ? formErrors.objective : undefined}
              >
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={objective}
                  onChange={(e) => change(setObjective)(e.target.value)}
                  onBlur={() => markTouched("objective")}
                />
              </Field>
              <Field
                label={tr("Notes")}
                hint={tr("Up to 1000 characters")}
                error={isFieldVisible("notes") ? formErrors.notes : undefined}
              >
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => change(setNotes)(e.target.value)}
                  onBlur={() => markTouched("notes")}
                />
              </Field>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.sectionHeader}>
        <h2 className={styles.phaseTitle}>{tr("Phases ({{count}}/12)", { count: phases.length })}</h2>
        <Button tone="secondary" onClick={addPhase} disabled={phases.length >= 12 || isPlanFullyAllocated}>
          {tr("+ Add phase")}
        </Button>
      </div>
      {isPlanFullyAllocated && (
        <p className={styles.hint} style={{ color: "var(--color-warn-text, #b45309)", margin: "0 0 1rem" }}>
          {isVietnamese
            ? "Toàn bộ thời gian của giáo án đã được phân bổ cho các giai đoạn."
            : tr("The entire plan duration has already been allocated to phases.")}
        </p>
      )}

      {phases.map((ph, i) => (
        <Card key={ph.id} pad={20}>
          <div className={styles.phaseHeader}>
            <strong>{tr("Phase #{{number}}", { number: i + 1 })}</strong>
            {phases.length > 1 && (
              <Button tone="ghost" size="sm" onClick={() => removePhase(i)}>{tr("Remove phase")}</Button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "1rem" }}>
            <Field
              label={tr("Phase name")}
              required
              error={isPhaseFieldVisible(ph.id, "name") ? formErrors.phases?.[ph.id]?.name : undefined}
            >
              <Input
                value={ph.name}
                maxLength={100}
                onChange={(e) => updatePhase(i, { name: e.target.value })}
                onBlur={() => markPhaseTouched(ph.id, "name")}
              />
            </Field>
            <Field label={tr("Phase type")} required>
              <Select
                value={ph.type}
                onChange={(e) => updatePhase(i, { type: e.target.value as PhaseType })}
                options={(Object.keys(PHASE_TYPE_LABEL) as PhaseType[]).map((t) => ({ value: t, label: tr(PHASE_TYPE_LABEL[t]) }))}
              />
            </Field>
            <Field
              label={tr("From")}
              required
              error={isPhaseFieldVisible(ph.id, "startDate") ? formErrors.phases?.[ph.id]?.startDate : undefined}
            >
              <DatePicker
                min={startDate}
                max={endDate}
                value={ph.startDate}
                onChange={(val) => {
                  updatePhase(i, { startDate: val });
                  markPhaseTouched(ph.id, "startDate");
                }}
              />
            </Field>
            <Field
              label={tr("To")}
              required
              error={isPhaseFieldVisible(ph.id, "endDate") ? formErrors.phases?.[ph.id]?.endDate : undefined}
            >
              <DatePicker
                min={ph.startDate}
                max={endDate}
                value={ph.endDate}
                onChange={(val) => {
                  updatePhase(i, { endDate: val });
                  markPhaseTouched(ph.id, "endDate");
                }}
              />
            </Field>
            <Field
              label={tr("Sessions per week")}
              required
              hint={tr("1 – 14")}
              error={isPhaseFieldVisible(ph.id, "sessionsPerWeek") ? formErrors.phases?.[ph.id]?.sessionsPerWeek : undefined}
            >
              <Input
                type="number"
                min={1}
                max={14}
                value={ph.sessionsPerWeek === 0 ? "" : ph.sessionsPerWeek}
                onChange={(e) =>
                  updatePhase(i, {
                    sessionsPerWeek: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                onBlur={() => markPhaseTouched(ph.id, "sessionsPerWeek")}
              />
            </Field>
            <Field
              label={tr("Max distance per week (m)")}
              required
              hint={tr("500 – 60 000")}
              error={isPhaseFieldVisible(ph.id, "maxWeeklyDistance") ? formErrors.phases?.[ph.id]?.maxWeeklyDistance : undefined}
            >
              <Input
                type="number"
                min={500}
                max={60000}
                step={100}
                value={ph.maxWeeklyDistance === 0 ? "" : ph.maxWeeklyDistance}
                onChange={(e) =>
                  updatePhase(i, {
                    maxWeeklyDistance: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                onBlur={() => markPhaseTouched(ph.id, "maxWeeklyDistance")}
              />
            </Field>
            <Field label={tr("Main surface")} required>
              <Select
                value={ph.surface}
                onChange={(e) => updatePhase(i, { surface: e.target.value as PhaseSurface })}
                options={(Object.keys(SURFACE_LABEL) as PhaseSurface[]).map((s) => ({ value: s, label: tr(SURFACE_LABEL[s]) }))}
              />
            </Field>
            <Field
              label={tr("Target speed (km/h)")}
              hint={tr("10 – 70, optional")}
              error={isPhaseFieldVisible(ph.id, "targetSpeedKmh") ? formErrors.phases?.[ph.id]?.targetSpeedKmh : undefined}
            >
              <Input
                type="number"
                min={10}
                max={70}
                step={0.1}
                value={ph.targetSpeedKmh ?? ""}
                onChange={(e) =>
                  updatePhase(i, {
                    targetSpeedKmh: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                onBlur={() => markPhaseTouched(ph.id, "targetSpeedKmh")}
              />
            </Field>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Field
              label={tr("Phase goal")}
              hint={tr("Up to 500 characters")}
              error={isPhaseFieldVisible(ph.id, "goal") ? formErrors.phases?.[ph.id]?.goal : undefined}
            >
              <Textarea
                rows={2}
                maxLength={500}
                value={ph.goal ?? ""}
                onChange={(e) => updatePhase(i, { goal: e.target.value })}
                onBlur={() => markPhaseTouched(ph.id, "goal")}
              />
            </Field>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "0.75rem 0" }}>
        <Button tone="ghost" onClick={cancel}>{tr("Cancel")}</Button>
        <Button tone="secondary" onClick={() => void save(false)} disabled={submitting || !horseId || Boolean(horse?.isMedicalLocked)}>
          {editing ? (isVietnamese ? "Lưu thay đổi" : tr("Save draft changes")) : isVietnamese ? "Lưu chờ kích hoạt" : tr("Save Draft")}
        </Button>
        {canActivateAfterSave && (
          <Button tone="primary" onClick={() => void save(true)} disabled={submitting || !horseId || Boolean(horse?.isMedicalLocked)}>
            {editing
              ? isVietnamese ? "Lưu & kích hoạt" : tr("Save and activate")
              : <>{isVietnamese ? "Lưu giáo án & Tiếp theo: Xếp lịch tập" : tr("Save Plan & Next: Add Workouts")} <Icon name="arrowRight" inline size={14} /></>}
          </Button>
        )}
      </div>
    </div>
  );
}
