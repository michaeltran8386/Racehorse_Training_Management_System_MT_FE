import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useBlocker } from "react-router-dom";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Modal } from "@/shared/components/ui/Modal";
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
import type { AssignableHorse, PhaseSurface, PhaseType, TrainingPhase, TrainingPlan } from "../types";

import styles from "./PlanWizardPage.module.css";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
const SURFACE_LABEL: Record<PhaseSurface, string> = { TURF: "Turf", DIRT: "Dirt", SYNTHETIC: "Mixed / synthetic" };
const MEDICAL = ["UNDER_OBSERVATION", "INJURED", "ISOLATED"];

const PHASE_TYPE_COLORS: Record<PhaseType, { bg: string; text: string; bar: string }> = {
  BASE: { bg: "#eff6ff", text: "#1d4ed8", bar: "#3b82f6" },
  BUILD: { bg: "#f5f3ff", text: "#6d28d9", bar: "#8b5cf6" },
  SPEED: { bg: "#fff7ed", text: "#c2410c", bar: "#f97316" },
  PRE_RACE: { bg: "#fff1f2", text: "#be123c", bar: "#f43f5e" },
  RECOVERY: { bg: "#f0fdf4", text: "#15803d", bar: "#10b981" },
};

const PHASE_TYPE_VIETNAMESE: Record<PhaseType, string> = {
  BASE: "Nền tảng thể lực",
  BUILD: "Tăng cường sức bền",
  SPEED: "Tốc độ đỉnh cao",
  PRE_RACE: "Duy trì trước giải",
  RECOVERY: "Phục hồi thể lực",
};

const SURFACE_VIETNAMESE: Record<PhaseSurface, string> = {
  TURF: "Sân cỏ (Turf)",
  DIRT: "Sân cát (Dirt)",
  SYNTHETIC: "Sân nhân tạo / Hỗn hợp",
};

/** Khung trần sinh lý tối đa theo loại giai đoạn huấn luyện ngựa (Equine Exercise Physiology) */
export function getMaxDaysForPhase(phType: PhaseType): number {
  switch (phType) {
    case "BASE":
      return 56; // 8 tuần - Đạt đỉnh mao mạch hóa và dung tích phổi
    case "BUILD":
      return 42; // 6 tuần - Tái cấu trúc cơ bắp, chống viêm khớp
    case "SPEED":
      return 28; // 4 tuần - Bảo vệ gân chân trước SDFT và xương mè
    case "PRE_RACE":
      return 14; // 2 tuần - Điểm rơi phong độ tối ưu
    case "RECOVERY":
      return 21; // 3 tuần - Tái tạo thể trạng, chống teo cơ
    default:
      return 56;
  }
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function newPhase(startDate: string, endDate: string, index: number, isVi = false): TrainingPhase {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ph-${Date.now()}-${index}`,
    name: isVi ? `Giai đoạn ${index + 1}` : `Phase ${index + 1}`,
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
  originalStart: string | null,
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
  } else if (start !== originalStart && start < tomorrow) {
    // Giáo án chỉ bắt đầu từ ngày mai. Khi sửa mà giữ nguyên ngày bắt đầu cũ thì không kiểm lại.
    errors.startDate = isVietnamese ? "Ngày bắt đầu giáo án phải từ ngày mai trở đi." : tr("Plan start date must be from tomorrow onwards.");
  }

  if (!end) {
    errors.endDate = isVietnamese ? "Vui lòng chọn ngày kết thúc." : tr("Please select an end date.");
  } else if (end < start) {
    errors.endDate = isVietnamese ? "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." : tr("End date must be on or after the start date.");
  } else {
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const e = new Date(`${end}T00:00:00Z`).getTime();
    const totalDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays < 7) {
      errors.endDate = isVietnamese
        ? "Giáo án phải kéo dài ít nhất 1 tuần (7 ngày) giữa ngày bắt đầu và ngày kết thúc."
        : tr("Training plan must last at least 1 week (7 days) between start date and end date.");
    } else if (totalDays > 365) {
      errors.endDate = isVietnamese ? "Giáo án tối đa 52 tuần (365 ngày)." : tr("Plan duration cannot exceed 52 weeks.");
    } else if (phases.length > 0 && totalDays < phases.length) {
      errors.endDate = isVietnamese
        ? `Thời gian giáo án (${totalDays} ngày) không đủ cho ${phases.length} giai đoạn (mỗi giai đoạn tối thiểu từ 1 ngày).`
        : tr("Plan duration is too short for {{count}} phases (min 1 day/phase).", { count: phases.length });
    } else if (phases.length > 0) {
      const totalMaxDays = phases.reduce((sum, ph) => sum + getMaxDaysForPhase(ph.type), 0);
      if (totalDays > totalMaxDays) {
        const minPhasesNeeded = Math.ceil(totalDays / 40);
        errors.endDate = isVietnamese
          ? `Thời lượng giáo án (${totalDays} ngày) vượt quá trần sinh lý an toàn của ${phases.length} giai đoạn hiện tại (${totalMaxDays} ngày). Vui lòng tăng thêm giai đoạn (tối thiểu ${minPhasesNeeded} giai đoạn) để bảo vệ sức khỏe chiến mã.`
          : tr("Plan duration ({{days}}d) exceeds safe physiological ceiling of {{count}} phases ({{max}}d). Please add more phases.", {
              days: totalDays,
              count: phases.length,
              max: totalMaxDays,
            });
      }
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
      } else {
        const totalPlanDays = Math.round((new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const isMicro = totalPlanDays < 14;
        const pDays = Math.round((new Date(`${p.endDate}T00:00:00Z`).getTime() - new Date(`${p.startDate}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const isSpecial = p.type === "PRE_RACE" || p.type === "RECOVERY";
        const minDays = isMicro ? 3 : (isSpecial ? 3 : 7);
        const maxDays = getMaxDaysForPhase(p.type);
        if (pDays < minDays) {
          pErr.endDate = isVietnamese
            ? (isMicro
                ? `Giai đoạn "${p.name}" trong giáo án ngắn (< 14 ngày) tối thiểu 3 ngày.`
                : isSpecial
                  ? `Giai đoạn nước rút / phục hồi tối thiểu 3 ngày.`
                  : `Giai đoạn rèn luyện tiêu chuẩn tối thiểu 7 ngày.`)
            : tr("Phase must be at least {{min}} days.", { min: minDays });
        } else if (maxDays && pDays > maxDays) {
          pErr.endDate = isVietnamese
            ? `Giai đoạn "${p.name}" (${PHASE_TYPE_VIETNAMESE[p.type] || p.type}) tối đa ${maxDays} ngày theo giới hạn an toàn sinh lý.`
            : tr("Phase cannot exceed {{max}} days.", { max: maxDays });
        }
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

function getFirstErrorMessage(errors: FormErrors, phases: TrainingPhase[]): string | null {
  if (errors.horseId) return errors.horseId;
  if (errors.name) return errors.name;
  if (errors.startDate) return errors.startDate;
  if (errors.endDate) return errors.endDate;
  if (errors.objective) return errors.objective;
  if (errors.notes) return errors.notes;
  if (errors.general) return errors.general;

  if (errors.phases) {
    for (let idx = 0; idx < phases.length; idx++) {
      const ph = phases[idx];
      const pErr = errors.phases[ph.id];
      if (pErr) {
        const firstProp = Object.values(pErr)[0];
        if (firstProp) {
          return `${ph.name || `Giai đoạn ${idx + 1}`}: ${firstProp}`;
        }
      }
    }
  }

  return null;
}

function findFirstErrorElementId(errors: FormErrors, phases: TrainingPhase[]): string | null {
  if (errors.horseId) return "field-horseId";
  if (errors.name) return "field-name";
  if (errors.startDate) return "field-startDate";
  if (errors.endDate) return "field-endDate";
  if (errors.objective) return "field-objective";
  if (errors.notes) return "field-notes";

  if (errors.phases) {
    for (const ph of phases) {
      const pErr = errors.phases[ph.id];
      if (pErr) {
        if (pErr.name) return `field-phase-${ph.id}-name`;
        if (pErr.startDate) return `field-phase-${ph.id}-startDate`;
        if (pErr.endDate) return `field-phase-${ph.id}-endDate`;
        if (pErr.sessionsPerWeek) return `field-phase-${ph.id}-sessionsPerWeek`;
        if (pErr.maxWeeklyDistance) return `field-phase-${ph.id}-maxWeeklyDistance`;
        if (pErr.targetSpeedKmh) return `field-phase-${ph.id}-targetSpeedKmh`;
        if (pErr.goal) return `field-phase-${ph.id}-goal`;
      }
    }
  }

  return null;
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
  const [assignableHorses, setAssignableHorses] = useState<AssignableHorse[]>([]);
  const [horseFilter, setHorseFilter] = useState<"ALL" | "READY" | "MINE" | "OTHER">("ALL");
  const [existing, setExisting] = useState<TrainingPlan | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"tabs" | "all">("tabs");
  const [horseId, setHorseId] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const tomorrow = addDays(todayClub(), 1);
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(() => addDays(tomorrow, 27));
  const [phases, setPhases] = useState<TrainingPhase[]>(() => {
    const list: TrainingPhase[] = [];
    let cur = tomorrow;
    for (let i = 0; i < 4; i++) {
      const end = addDays(cur, 6);
      list.push({
        id: `ph-init-${i}`,
        name: `${tr("Phase")} ${i + 1}`,
        type: "BASE",
        startDate: cur,
        endDate: end,
        sessionsPerWeek: 5,
        maxWeeklyDistance: 9000,
        surface: "TURF",
      });
      cur = addDays(end, 1);
    }
    return list;
  });
  const [phaseCountInput, setPhaseCountInput] = useState<string>("4");
  const [isHorsePickerOpen, setIsHorsePickerOpen] = useState(false);
  const [horsePickerSearch, setHorsePickerSearch] = useState("");
  const [horsePickerFilter, setHorsePickerFilter] = useState<"READY" | "ALL">("READY");
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
        editing ? (existing?.startDate ?? null) : null,
      ),
    [horseId, name, objective, notes, startDate, endDate, phases, isVietnamese, editing, existing],
  );

  useEffect(() => {
    if (error && !hasErrors(formErrors)) {
      setError("");
    }
  }, [error, formErrors]);

  useEffect(() => {
    trainingApi
      .getAssignableHorses()
      .then((res) => {
        setAssignableHorses(res.items);
        setHorses(res.items as unknown as Horse[]);
        if (!editing) {
          const preselected = searchParams.get("horseId");
          if (preselected && res.items.some((h) => h.id === preselected)) {
            setHorseId(preselected);
          } else {
            // Tự động ưu tiên chọn chiến mã SẴN SÀNG đầu tiên; không chọn nhầm ngựa đang khóa/chưa tiếp nhận
            const firstReady = res.items.find((h) => h.canAssign);
            setHorseId((cur) => cur || firstReady?.id || "");
          }
        }
      })
      .catch(() => {
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
      });
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
        setPhaseCountInput(String(p.phases.length || 4));
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
  const selectedAssignableHorse = useMemo(
    () => assignableHorses.find((h) => h.id === horseId) || null,
    [assignableHorses, horseId],
  );

  const formatHorseGender = (gender?: string | null) => {
    if (!gender) return "—";
    const g = gender.toUpperCase();
    if (g.includes("STALLION") || g === "MALE" || g === "ĐỰC") return isVietnamese ? "Ngựa đực (Stallion)" : "Stallion";
    if (g.includes("MARE") || g === "FEMALE" || g === "CÁI") return isVietnamese ? "Ngựa cái (Mare)" : "Mare";
    if (g.includes("GELDING") || g === "THIẾN") return isVietnamese ? "Ngựa thiến (Gelding)" : "Gelding";
    if (g.includes("COLT")) return isVietnamese ? "Ngựa đực trẻ (Colt)" : "Colt";
    if (g.includes("FILLY")) return isVietnamese ? "Ngựa cái trẻ (Filly)" : "Filly";
    return gender;
  };

  const formatHealthStatus = (status?: string | null, isMedicalLocked?: boolean) => {
    if (isMedicalLocked) return { label: isVietnamese ? "Khóa y tế" : "Medical Locked", tone: "danger" as const, icon: "" };
    switch (status) {
      case "ACTIVE":
        return { label: isVietnamese ? "Thể lực tốt / Sẵn sàng" : "Fit / Ready", tone: "ok" as const, icon: "" };
      case "IN_TRAINING":
        return { label: isVietnamese ? "Đang rèn luyện" : "In Training", tone: "info" as const, icon: "" };
      case "RESTING":
        return { label: isVietnamese ? "Nghỉ dưỡng phục hồi" : "Resting", tone: "info" as const, icon: "" };
      case "UNDER_OBSERVATION":
        return { label: isVietnamese ? "Theo dõi sức khỏe" : "Under Observation", tone: "warn" as const, icon: "" };
      case "INJURED":
        return { label: isVietnamese ? "Điều trị chấn thương" : "Injured", tone: "danger" as const, icon: "" };
      case "ISOLATED":
        return { label: isVietnamese ? "Cách ly kiểm dịch" : "Isolated", tone: "danger" as const, icon: "" };
      case "RETIRED":
        return { label: isVietnamese ? "Đã giải nghệ" : "Retired", tone: "neutral" as const, icon: "" };
      default:
        return { label: status || (isVietnamese ? "Bình thường" : "Normal"), tone: "ok" as const, icon: "" };
    }
  };

  const getHorseAge = (dob?: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const now = effectiveClubNow();
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      years--;
    }
    return Math.max(0, years);
  };

  const selectedHorseInfo = useMemo(() => {
    if (selectedAssignableHorse) {
      return {
        id: selectedAssignableHorse.id,
        name: selectedAssignableHorse.name,
        horseCode: selectedAssignableHorse.horseCode,
        avatarUrl: selectedAssignableHorse.avatarUrl,
        breed: selectedAssignableHorse.breed,
        stallName: selectedAssignableHorse.stallName,
        age: getHorseAge(selectedAssignableHorse.dob),
        gender: selectedAssignableHorse.gender,
        color: selectedAssignableHorse.color,
        ownerName: selectedAssignableHorse.ownerName,
        status: selectedAssignableHorse.status,
        isMedicalLocked: selectedAssignableHorse.isMedicalLocked,
        canAssign: selectedAssignableHorse.canAssign,
      };
    }
    if (horse) {
      return {
        id: horse.id,
        name: horse.name,
        horseCode: horse.horseCode,
        avatarUrl: horse.avatarUrl,
        breed: horse.breed,
        stallName: horse.stallCode,
        age: getHorseAge(horse.dob),
        gender: horse.gender,
        color: horse.color,
        ownerName: horse.ownerName || horse.owner?.fullName,
        status: horse.status,
        isMedicalLocked: horse.isMedicalLocked,
        canAssign: !horse.isMedicalLocked,
      };
    }
    return null;
  }, [selectedAssignableHorse, horse]);

  const modalCounts = useMemo(() => {
    const list = assignableHorses.length > 0 ? assignableHorses : (horses as unknown as AssignableHorse[]);
    const ready = list.filter((h) => h.canAssign && !h.isMedicalLocked).length;
    return {
      ready,
      total: list.length,
    };
  }, [assignableHorses, horses]);

  const trainerSelfCount = useMemo(() => {
    return assignableHorses.filter((h) => h.planState === "ACTIVE_SELF" || h.planState === "DRAFT_SELF").length;
  }, [assignableHorses]);

  const availableHorsesForModal = useMemo(() => {
    let baseList = assignableHorses;
    if (baseList.length === 0 && horses.length > 0) {
      baseList = horses.map(
        (h) =>
          ({
            id: h.id,
            name: h.name,
            horseCode: h.horseCode,
            status: h.status,
            isMedicalLocked: h.isMedicalLocked,
            canAssign: !h.isMedicalLocked,
            planState: h.isMedicalLocked ? "MEDICAL_LOCKED" : "READY",
            badge: h.isMedicalLocked ? "Khóa y tế" : "Sẵn sàng",
            breed: h.breed,
            dob: h.dob,
            gender: h.gender,
            color: h.color,
            stallName: h.stallCode,
            ownerName: h.ownerName || h.owner?.fullName,
            explanation: "",
          }) as AssignableHorse,
      );
    }

    if (horsePickerFilter === "READY") {
      baseList = baseList.filter((h) => h.canAssign && !h.isMedicalLocked);
    }

    const q = horsePickerSearch.trim().toLowerCase();
    if (!q) return baseList;

    return baseList.filter((h) => {
      const matchName = h.name.toLowerCase().includes(q);
      const matchCode = (h.horseCode || "").toLowerCase().includes(q);
      const matchBreed = (h.breed || "").toLowerCase().includes(q);
      const matchStall = (h.stallName || "").toLowerCase().includes(q);
      const matchOwner = (h.ownerName || "").toLowerCase().includes(q);
      const matchColor = (h.color || "").toLowerCase().includes(q);
      return matchName || matchCode || matchBreed || matchStall || matchOwner || matchColor;
    });
  }, [assignableHorses, horses, horsePickerFilter, horsePickerSearch]);

  const handleSelectHorse = (id: string) => {
    setHorseId(id);
    markTouched("horseId");
    setIsHorsePickerOpen(false);
  };

  const filteredHorses = useMemo(() => {
    let list: AssignableHorse[] = [];
    if (assignableHorses.length === 0) {
      list = horses.map(
        (h) =>
          ({
            id: h.id,
            name: h.name,
            horseCode: h.horseCode,
            status: h.status,
            isMedicalLocked: h.isMedicalLocked,
            canAssign: !h.isMedicalLocked,
            planState: h.isMedicalLocked ? "MEDICAL_LOCKED" : "READY",
            badge: h.isMedicalLocked ? "Khóa y tế" : "Sẵn sàng",
            explanation: "",
          }) as AssignableHorse,
      );
    } else if (horseFilter === "READY") {
      list = assignableHorses.filter((h) => h.canAssign);
    } else if (horseFilter === "MINE") {
      list = assignableHorses.filter((h) => h.planState === "ACTIVE_SELF" || h.planState === "DRAFT_SELF");
    } else if (horseFilter === "OTHER") {
      list = assignableHorses.filter((h) => !h.canAssign);
    } else {
      list = assignableHorses;
    }

    // Bậc thang 6 cấp độ ưu tiên sẵn sàng thi đấu
    const rankOf = (h: { status?: string; isMedicalLocked?: boolean; isDebtImpounded?: boolean; planState?: string }) => {
      if (h.isDebtImpounded || h.status === "RETIRED") return 6;
      if (h.isMedicalLocked || h.status === "INJURED" || h.status === "ISOLATED" || h.planState === "MEDICAL_LOCKED") return 5;
      if (h.status === "UNDER_OBSERVATION") return 4;
      if (h.status === "ACTIVE") return 1;
      if (h.status === "IN_TRAINING" || h.planState === "ACTIVE_SELF" || h.planState === "ACTIVE_OTHER") return 2;
      if (h.status === "RESTING" || h.planState === "READY") return 3;
      return 3;
    };

    return [...list].sort((a, b) => rankOf(a) - rankOf(b) || a.name.localeCompare(b.name, "vi"));
  }, [assignableHorses, horseFilter, horses]);

  const horseOptions = useMemo(() => {
    return filteredHorses.map((h) => {
      let icon = "";
      let tag = isVietnamese ? "[Sẵn sàng]" : "[Ready]";
      if (h.planState === "READY") {
        icon = "";
        tag = isVietnamese ? "[Sẵn sàng]" : "[Ready]";
      } else if (h.planState === "ACTIVE_SELF") {
        icon = "";
        tag = isVietnamese ? `[Đang tập · Của bạn]` : `[Active · Yours]`;
      } else if (h.planState === "ACTIVE_OTHER") {
        icon = "";
        tag = isVietnamese ? `[Đang tập · HLV ${h.activePlan?.trainerName || "khác"}]` : `[Active · Other]`;
      } else if (h.planState === "DRAFT_SELF") {
        icon = "";
        tag = isVietnamese ? "[Bản nháp của bạn]" : "[Your Draft]";
      } else if (h.planState === "DRAFT_OTHER") {
        icon = "";
        tag = isVietnamese ? "[Bản nháp HLV khác]" : "[Other Draft]";
      } else if (h.planState === "MEDICAL_LOCKED") {
        icon = "";
        tag = isVietnamese ? "[Khóa y tế]" : "[Med Lock]";
      }

      return {
        value: h.id,
        label: `${icon} ${tag} ${h.name} (${h.horseCode || "—"})${h.ownerName ? ` · Chủ: ${h.ownerName}` : ""}`,
        disabled: !editing && !h.canAssign,
      };
    });
  }, [filteredHorses, isVietnamese, editing]);

  const planDuration = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    const s = new Date(`${startDate}T00:00:00Z`).getTime();
    const e = new Date(`${endDate}T00:00:00Z`).getTime();
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.floor(diffDays / 7);
    const extraDays = diffDays % 7;
    return { diffDays, weeks, extraDays };
  }, [startDate, endDate]);

  const totalDistance = useMemo(() => {
    return phases.reduce((sum, p) => sum + (p.maxWeeklyDistance || 0), 0);
  }, [phases]);

  const totalSessions = useMemo(() => {
    return phases.reduce((sum, p) => sum + (p.sessionsPerWeek || 0), 0);
  }, [phases]);

  const maxPhaseDist = useMemo(() => {
    return Math.max(...phases.map((p) => p.maxWeeklyDistance || 0), 1000);
  }, [phases]);

  const hasSpikeWarning = useMemo(() => {
    return phases.some((ph, idx) => {
      if (idx === 0) return false;
      const prev = phases[idx - 1];
      return (prev.maxWeeklyDistance || 0) > 0 && ((ph.maxWeeklyDistance || 0) / prev.maxWeeklyDistance) > 1.3;
    });
  }, [phases]);

  const handleNextToStep2 = () => {
    setSubmitted(true);
    markTouched("horseId");
    markTouched("name");
    markTouched("startDate");
    markTouched("endDate");
    markTouched("objective");
    markTouched("notes");

    if (!horseId) {
      const msg = isVietnamese ? "Vui lòng chọn chiến mã áp dụng giáo án trước khi tiếp tục." : tr("Please select a horse before proceeding.");
      setError(msg);
      toast.show(msg, "danger");
      const el = document.getElementById("field-horseId");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!editing && selectedAssignableHorse && !selectedAssignableHorse.canAssign) {
      const msg = isVietnamese
        ? `Chiến mã "${selectedAssignableHorse.name}" hiện không thể lập giáo án (${selectedAssignableHorse.explanation || "đang bị khóa"}).`
        : tr("Selected horse is not eligible for training plan.");
      setError(msg);
      toast.show(msg, "danger");
      const el = document.getElementById("field-horseId");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const hasStep1Err = Boolean(
      formErrors.horseId ||
      formErrors.name ||
      formErrors.startDate ||
      formErrors.endDate ||
      formErrors.objective ||
      formErrors.notes
    );

    if (hasStep1Err) {
      const firstErrMsg =
        getFirstErrorMessage(formErrors, phases) ||
        (isVietnamese ? "Vui lòng hoàn thành các trường bắt buộc của Bước 1." : "Please complete required fields in Step 1.");
      setError(firstErrMsg);
      toast.show(firstErrMsg, "danger");
      const firstField = ["horseId", "name", "startDate", "endDate", "objective", "notes"].find(
        (f) => formErrors[f as keyof FormErrors],
      );
      if (firstField) {
        const el = document.getElementById(`field-${firstField}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = el.querySelector<HTMLElement>("input, textarea, select, button");
          input?.focus({ preventScroll: true });
        }
      }
      return;
    }

    setError("");
    const count = parseInt(phaseCountInput, 10) || phases.length || 4;
    const boundedCount = Math.max(1, Math.min(12, count));
    // Tự động phân bổ ngầm đều khoảng [startDate, endDate] cho đúng boundedCount giai đoạn!
    const updated = distributePhasesEqually(startDate, endDate, boundedCount, phases, isVietnamese);
    setPhases(updated);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
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

  const planTotalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.round((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);
  const isMicrocycle = planTotalDays < 14;

  const getMinDaysForPhase = (phType: PhaseType) => {
    if (isMicrocycle) return 3;
    return phType === "PRE_RACE" || phType === "RECOVERY" ? 3 : 7;
  };
  function distributePhasesEqually(
    start: string,
    end: string,
    count: number,
    existingPhases: TrainingPhase[],
    isVi: boolean,
  ): TrainingPhase[] {
    const boundedCount = Math.max(1, Math.min(12, count));
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const e = new Date(`${end}T00:00:00Z`).getTime();
    const totalDays = Math.max(boundedCount, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);

    // Xác định type và default name theo từng vị trí chu kỳ
    const types: PhaseType[] = [];
    const names: string[] = [];
    for (let i = 0; i < boundedCount; i++) {
      const existing = existingPhases[i];
      let pType: PhaseType = "BASE";
      let defaultName = isVi ? `Giai đoạn ${i + 1}` : `Phase ${i + 1}`;

      if (existing?.type) {
        pType = existing.type;
        defaultName = existing.name || defaultName;
      } else if (boundedCount === 1) {
        pType = "BASE";
        defaultName = isVi ? "Giai đoạn 1: Nền tảng toàn diện" : "Phase 1: Comprehensive Base";
      } else if (boundedCount === 2) {
        pType = i === 0 ? "BASE" : "PRE_RACE";
        defaultName = i === 0
          ? (isVi ? "Giai đoạn 1: Nền tảng thể lực" : "Phase 1: Base")
          : (isVi ? "Giai đoạn 2: Chuẩn bị thi đấu" : "Phase 2: Pre-race");
      } else if (boundedCount === 3) {
        pType = i === 0 ? "BASE" : i === 1 ? "BUILD" : "PRE_RACE";
        defaultName = i === 0
          ? (isVi ? "Giai đoạn 1: Nền tảng thể lực" : "Phase 1: Base")
          : i === 1
          ? (isVi ? "Giai đoạn 2: Tăng cường sức bền" : "Phase 2: Build")
          : (isVi ? "Giai đoạn 3: Chuẩn bị thi đấu" : "Phase 3: Pre-race");
      } else {
        if (i === 0) {
          pType = "BASE";
          defaultName = isVi ? "Giai đoạn 1: Nền tảng thể lực (Base)" : "Phase 1: Aerobic Base";
        } else if (i === boundedCount - 1) {
          pType = "PRE_RACE";
          defaultName = isVi ? `Giai đoạn ${i + 1}: Chuẩn bị thi đấu (Tapering)` : `Phase ${i + 1}: Peaking & Tapering`;
        } else if (i === boundedCount - 2) {
          pType = "SPEED";
          defaultName = isVi ? `Giai đoạn ${i + 1}: Tốc độ đỉnh cao (Speed)` : `Phase ${i + 1}: Speed & Power`;
        } else {
          pType = "BUILD";
          defaultName = isVi ? `Giai đoạn ${i + 1}: Tăng cường sức bền (Build)` : `Phase ${i + 1}: Strength & Endurance`;
        }
      }
      types.push(pType);
      names.push(defaultName);
    }

    // Phân bổ thời lượng thỏa mãn cả [minDays, maxDays] sinh lý
    const mins = types.map((t) => getMinDaysForPhase(t));
    const maxs = types.map((t) => getMaxDaysForPhase(t));
    const durations = [...mins];
    let remaining = Math.max(0, totalDays - mins.reduce((a, b) => a + b, 0));

    while (remaining > 0) {
      let added = false;
      for (let i = 0; i < boundedCount; i++) {
        if (remaining <= 0) break;
        if (durations[i] < maxs[i]) {
          durations[i]++;
          remaining--;
          added = true;
        }
      }
      if (!added) {
        durations[0] += remaining;
        remaining = 0;
        break;
      }
    }

    const generated: TrainingPhase[] = [];
    let curStart = start;

    for (let i = 0; i < boundedCount; i++) {
      const isLast = i === boundedCount - 1;
      const phaseDays = durations[i];
      const curEnd = isLast ? end : addDays(curStart, Math.max(0, phaseDays - 1));
      const existing = existingPhases[i];
      const pType = types[i];
      const defaultName = names[i];

      generated.push({
        id: existing?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ph-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`),
        name: existing?.name || defaultName,
        type: pType,
        startDate: curStart,
        endDate: curEnd,
        sessionsPerWeek: existing?.sessionsPerWeek ?? (pType === "PRE_RACE" ? 4 : pType === "SPEED" ? 5 : 6),
        maxWeeklyDistance: existing?.maxWeeklyDistance ?? (pType === "BASE" ? 8000 : pType === "BUILD" ? 12000 : pType === "SPEED" ? 10000 : 7000),
        surface: existing?.surface ?? "TURF",
        goal: existing?.goal,
        targetSpeedKmh: existing?.targetSpeedKmh,
      });

      curStart = addDays(curEnd, 1);
    }

    return generated;
  }

  const handleStartDateChange = (newStart: string) => {
    if (!newStart) return;
    setStartDate(newStart);
    setDirty(true);
    markTouched("startDate");

    // Ngày kết thúc tối thiểu phải đủ 7 ngày kể từ ngày bắt đầu
    const minRequiredEnd = addDays(newStart, 6);
    let targetEnd = endDate;
    if (!targetEnd || targetEnd < minRequiredEnd) {
      targetEnd = addDays(newStart, Math.max(6, (phases.length || 4) * 7 - 1));
      setEndDate(targetEnd);
      markTouched("endDate");
    }

    // Chia đều khoảng thời gian [newStart, targetEnd] cho số giai đoạn hiện tại
    const count = phases.length || 4;
    const updated = distributePhasesEqually(newStart, targetEnd, count, phases, isVietnamese);
    setPhases(updated);
  };

  const handleEndDateChange = (newEnd: string) => {
    if (!newEnd) return;
    if (!startDate) {
      setEndDate(newEnd);
      return;
    }
    const minRequiredEnd = addDays(startDate, 6);
    let finalEnd = newEnd;
    if (finalEnd < minRequiredEnd) {
      finalEnd = minRequiredEnd;
      toast.show(
        isVietnamese
          ? "Thời lượng giáo án bắt buộc tối thiểu 7 ngày."
          : "Plan duration must be at least 7 days.",
        "warn"
      );
    }
    setEndDate(finalEnd);
    setDirty(true);
    markTouched("endDate");

    // Giữ nguyên số giai đoạn đang chọn, chia đều khoảng thời gian [startDate, finalEnd]
    const count = phases.length || 4;
    const updated = distributePhasesEqually(startDate, finalEnd, count, phases, isVietnamese);
    setPhases(updated);
  };

  const handlePhaseCountSelect = (count: number) => {
    if (!startDate || isNaN(count)) return;
    const boundedCount = Math.max(1, Math.min(12, count));
    
    // Đảm bảo targetEnd hợp lệ (nếu chưa có hoặc nhỏ hơn startDate thì mặc định count * 7 ngày)
    let targetEnd = endDate;
    if (!targetEnd || targetEnd < startDate) {
      targetEnd = addDays(startDate, boundedCount * 7 - 1);
      setEndDate(targetEnd);
      markTouched("endDate");
    }

    // GIỮ NGUYÊN targetEnd mà người dùng đã chọn (ví dụ đến 30/12),
    // chia đều khoảng [startDate, targetEnd] cho đúng boundedCount giai đoạn!
    const updated = distributePhasesEqually(startDate, targetEnd, boundedCount, phases, isVietnamese);
    setPhases(updated);
    setPhaseCountInput(String(boundedCount));
    setActivePhaseIndex(0);
    setDirty(true);
  };

  const handlePhaseEndDateChange = (index: number, newEnd: string) => {
    if (!newEnd) return;
    setPhases((cur) => {
      const updated = [...cur];
      const target = updated[index];
      if (!target) return cur;

      // Nếu là giai đoạn cuối cùng, ngày kết thúc luôn luôn bằng endDate của giáo án (Hard Ceiling)
      if (index === updated.length - 1) {
        updated[index] = { ...target, endDate };
        return updated;
      }

      const minDays = getMinDaysForPhase(target.type);
      const minValidEnd = addDays(target.startDate, minDays - 1);
      const maxDays = getMaxDaysForPhase(target.type);
      const maxPhysioEnd = addDays(target.startDate, maxDays - 1);

      // Cận trên: Các giai đoạn sau index cần ít nhất tổng số ngày tối thiểu
      let subsequentMinDays = 0;
      for (let j = index + 1; j < updated.length; j++) {
        subsequentMinDays += getMinDaysForPhase(updated[j].type);
      }
      const maxValidEnd = addDays(endDate, -subsequentMinDays);

      let clampedEnd = newEnd;
      if (clampedEnd < minValidEnd) clampedEnd = minValidEnd;
      if (clampedEnd > maxValidEnd) clampedEnd = maxValidEnd;
      if (clampedEnd > maxPhysioEnd) clampedEnd = maxPhysioEnd;

      updated[index] = { ...target, endDate: clampedEnd };

      // Tự động phân bổ lại các giai đoạn sau index sao cho vừa khít [addDays(clampedEnd, 1), endDate]
      let currentStart = addDays(clampedEnd, 1);
      const remainingCount = updated.length - 1 - index;
      const remainingStartMs = new Date(`${currentStart}T00:00:00Z`).getTime();
      const planEndMs = new Date(`${endDate}T00:00:00Z`).getTime();
      const remainingTotalDays = Math.max(
        remainingCount,
        Math.round((planEndMs - remainingStartMs) / (1000 * 60 * 60 * 24)) + 1
      );

      const baseDays = Math.floor(remainingTotalDays / remainingCount);
      const remainder = remainingTotalDays % remainingCount;

      for (let j = index + 1; j < updated.length; j++) {
        const offset = j - (index + 1);
        const isLastPhase = j === updated.length - 1;
        const dur = baseDays + (offset < remainder ? 1 : 0);
        const phaseEnd = isLastPhase ? endDate : addDays(currentStart, Math.max(0, dur - 1));

        updated[j] = {
          ...updated[j],
          startDate: currentStart,
          endDate: phaseEnd,
        };
        currentStart = addDays(phaseEnd, 1);
      }

      // TUYỆT ĐỐI KHÔNG gọi setEndDate(finalEnd) để bảo toàn Hard Ceiling đã chốt ở Bước 1!
      return updated;
    });
    setDirty(true);
  };

  const handlePhaseStartDateChange = (index: number, newStart: string) => {
    if (!newStart) return;
    if (index === 0) {
      // Giai đoạn đầu tiên luôn bắt đầu từ startDate của giáo án
      return;
    }
    // Giai đoạn index đổi ngày bắt đầu -> Giai đoạn index - 1 kết thúc ngay trước đó 1 ngày!
    handlePhaseEndDateChange(index - 1, addDays(newStart, -1));
  };

  const addPhase = () => {
    if (phases.length >= 12) {
      toast.show(isVietnamese ? "Đã đạt tối đa 12 giai đoạn." : "Maximum 12 phases allowed.", "warn");
      return;
    }
    const nextCount = phases.length + 1;
    const minNeededDays = nextCount * (isMicrocycle ? 3 : 7);
    if (planTotalDays < minNeededDays) {
      toast.show(
        isVietnamese
          ? `Thời lượng giáo án (${planTotalDays} ngày) không đủ cho ${nextCount} giai đoạn (yêu cầu tối thiểu ${minNeededDays} ngày).`
          : `Plan duration (${planTotalDays} days) insufficient for ${nextCount} phases (requires min ${minNeededDays} days).`,
        "warn"
      );
      return;
    }
    const updated = distributePhasesEqually(startDate, endDate, nextCount, phases, isVietnamese);
    setPhases(updated);
    setPhaseCountInput(String(nextCount));
    setActivePhaseIndex(updated.length - 1);
    setDirty(true);
  };

  const removePhase = (index: number) => {
    if (phases.length <= 1) {
      toast.show(isVietnamese ? "Giáo án phải có ít nhất 1 giai đoạn." : "Plan must have at least 1 phase.", "warn");
      return;
    }
    const ph = phases[index];
    if (editing && !window.confirm(isVietnamese ? `Xóa giai đoạn "${ph.name}" sẽ xóa các bài tập chưa diễn ra trong giai đoạn này. Tiếp tục?` : `Removing phase ${ph.name} deletes its workouts that have not happened yet. Continue?`)) return;

    const nextCount = phases.length - 1;
    const remainingExisting = phases.filter((_, i) => i !== index);
    const updated = distributePhasesEqually(startDate, endDate, nextCount, remainingExisting, isVietnamese);
    setPhases(updated);
    setPhaseCountInput(String(nextCount));
    setActivePhaseIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    setDirty(true);
  };

  const cancel = () => {
    if (dirty && !window.confirm("You have unsaved changes. Leaving will lose them.")) return;
    navigate(editing && id ? `/training/plans/${id}` : "/training/plans");
  };

  const save = async (activate: boolean) => {
    setSubmitted(true);

    if (!horseId) {
      setStep(1);
      markTouched("horseId");
      const msg = isVietnamese ? "Vui lòng chọn chiến mã áp dụng giáo án trước khi lưu." : tr("Please select a horse before saving.");
      setError(msg);
      toast.show(msg, "danger");
      setTimeout(() => {
        const el = document.getElementById("field-horseId");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    if (!editing && selectedAssignableHorse && !selectedAssignableHorse.canAssign) {
      setStep(1);
      const msg = isVietnamese
        ? `Chiến mã "${selectedAssignableHorse.name}" hiện không thể lập giáo án (${selectedAssignableHorse.explanation || "đang bị khóa"}).`
        : tr("Selected horse is not eligible for training plan.");
      setError(msg);
      toast.show(msg, "danger");
      setTimeout(() => {
        const el = document.getElementById("field-horseId");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    if (hasErrors(formErrors)) {
      const firstErrMsg =
        getFirstErrorMessage(formErrors, phases) ||
        (isVietnamese ? "Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ hiển thị bên dưới." : tr("Please check and correct the invalid fields below."));

      setError(firstErrMsg);
      toast.show(firstErrMsg, "danger");

      const hasStep1Err = Boolean(
        formErrors.horseId ||
        formErrors.name ||
        formErrors.startDate ||
        formErrors.endDate ||
        formErrors.objective ||
        formErrors.notes
      );

      if (hasStep1Err) {
        setStep(1);
      } else {
        setStep(2);
        const errPhaseId = Object.keys(formErrors.phases || {})[0];
        if (errPhaseId) {
          const idx = phases.findIndex((p) => p.id === errPhaseId);
          if (idx >= 0) setActivePhaseIndex(idx);
        }
      }

      // Tự động cuộn màn hình đến ô lỗi đầu tiên
      const targetId = findFirstErrorElementId(formErrors, phases);
      setTimeout(() => {
        let el = targetId ? document.getElementById(targetId) : null;
        if (!el) {
          el = document.querySelector<HTMLElement>(
            '[aria-invalid="true"], [class*="_error_"], [class*="error"]'
          );
        }
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = el.querySelector<HTMLElement>("input, textarea, select, button") || el;
          input.focus({ preventScroll: true });
        }
      }, 100);

      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = { horseId, phaseName: name.trim(), objective: objective.trim(), notes: notes.trim(), startDate, endDate, phases };
      const saved = editing && id ? await trainingApi.updatePlan(id, payload) : await trainingApi.createPlan(payload);
      setDirty(false);
      toast.show(
        isVietnamese ? "Lưu giáo án thành công! Bạn có thể bắt đầu xếp lịch các buổi tập." : tr("Training plan saved! You can now add workouts to each phase."),
        "ok"
      );
      navigate(`/training/plans/${saved.id}${activate ? "?activate=1" : ""}`);
    } catch (err) {
      const errMsg = messageFor(err);
      setError(errMsg);
      toast.show(errMsg, "danger");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhaseEditor = (ph: TrainingPhase, i: number, canRemove: boolean) => {
    const typeMeta = PHASE_TYPE_COLORS[ph.type] || { bg: "#eff6ff", text: "#1d4ed8", bar: "#3b82f6" };
    return (
      <Card key={ph.id} pad={20}>
        <div className={styles.phaseHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: typeMeta.bar,
              }}
            />
            <strong>
              {tr("Phase #{{number}}", { number: i + 1 })}: {ph.name || (isVietnamese ? "Chưa đặt tên" : "Unnamed")}
            </strong>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: typeMeta.bg,
                color: typeMeta.text,
              }}
            >
              {isVietnamese ? PHASE_TYPE_VIETNAMESE[ph.type] : tr(PHASE_TYPE_LABEL[ph.type])}
            </span>
          </div>
          {canRemove && (
            <Button tone="ghost" size="sm" onClick={() => removePhase(i)} style={{ color: "var(--danger)" }}>
              {isVietnamese ? "Xóa giai đoạn" : tr("Remove phase")}
            </Button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "1rem" }}>
          <div id={`field-phase-${ph.id}-name`}>
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
          </div>
          <Field label={tr("Phase type")} required>
            <Select
              value={ph.type}
              onChange={(e) => updatePhase(i, { type: e.target.value as PhaseType })}
              options={(Object.keys(PHASE_TYPE_LABEL) as PhaseType[]).map((t) => ({
                value: t,
                label: isVietnamese ? PHASE_TYPE_VIETNAMESE[t] : tr(PHASE_TYPE_LABEL[t]),
              }))}
            />
          </Field>
          <div id={`field-phase-${ph.id}-startDate`}>
            <Field
              label={tr("From")}
              required
              hint={i === 0 ? (isVietnamese ? "Bắt đầu giáo án" : "Plan start") : undefined}
              error={isPhaseFieldVisible(ph.id, "startDate") ? formErrors.phases?.[ph.id]?.startDate : undefined}
            >
              <DatePicker
                disabled={i === 0}
                min={startDate}
                max={endDate}
                value={ph.startDate}
                onChange={(val) => {
                  handlePhaseStartDateChange(i, val);
                  markPhaseTouched(ph.id, "startDate");
                }}
              />
            </Field>
          </div>
          <div id={`field-phase-${ph.id}-endDate`}>
            {(() => {
              const phaseMinDays = getMinDaysForPhase(ph.type);
              const phaseMaxDays = getMaxDaysForPhase(ph.type);
              let subsequentMinDays = 0;
              for (let j = i + 1; j < phases.length; j++) {
                subsequentMinDays += getMinDaysForPhase(phases[j].type);
              }
              const maxEndBySubsequent = addDays(endDate, -subsequentMinDays);
              const maxEndByPhysio = addDays(ph.startDate, phaseMaxDays - 1);
              const maxEndForPhase = maxEndBySubsequent < maxEndByPhysio ? maxEndBySubsequent : maxEndByPhysio;
              const curPhaseDays = Math.round((new Date(`${ph.endDate}T00:00:00Z`).getTime() - new Date(`${ph.startDate}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return (
                <Field
                  label={tr("To")}
                  required
                  hint={i === phases.length - 1
                    ? (isVietnamese
                        ? `${curPhaseDays} ngày (Kết thúc giáo án · Trần sinh lý: tối đa ${phaseMaxDays} ngày)`
                        : `${curPhaseDays} days (Plan end · Max ceiling: ${phaseMaxDays}d)`)
                    : `${curPhaseDays} ${isVietnamese ? `ngày (Khung sinh lý: ${phaseMinDays} – ${phaseMaxDays} ngày)` : `days (Physio window: ${phaseMinDays}–${phaseMaxDays}d)`}`
                  }
                  error={isPhaseFieldVisible(ph.id, "endDate") ? formErrors.phases?.[ph.id]?.endDate : undefined}
                >
                  <DatePicker
                    disabled={i === phases.length - 1}
                    min={addDays(ph.startDate, phaseMinDays - 1)}
                    max={maxEndForPhase}
                    value={ph.endDate}
                    onChange={(val) => {
                      handlePhaseEndDateChange(i, val);
                      markPhaseTouched(ph.id, "endDate");
                    }}
                  />
                </Field>
              );
            })()}
          </div>
          <div id={`field-phase-${ph.id}-sessionsPerWeek`}>
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
          </div>
          <div id={`field-phase-${ph.id}-maxWeeklyDistance`}>
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
          </div>
          <Field label={tr("Main surface")} required>
            <Select
              value={ph.surface}
              onChange={(e) => updatePhase(i, { surface: e.target.value as PhaseSurface })}
              options={(Object.keys(SURFACE_LABEL) as PhaseSurface[]).map((s) => ({
                value: s,
                label: isVietnamese ? SURFACE_VIETNAMESE[s] : tr(SURFACE_LABEL[s]),
              }))}
            />
          </Field>
          <div id={`field-phase-${ph.id}-targetSpeedKmh`}>
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
        </div>
        <div style={{ marginTop: "1rem" }}>
          <div id={`field-phase-${ph.id}-goal`}>
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
        </div>
      </Card>
    );
  };

  if (user.role !== "HEAD_TRAINER" && user.role !== "CLUB_MANAGER") {
    return <Alert tone="danger" title={tr("Not allowed")}>{isVietnamese ? "Chỉ Huấn luyện viên trưởng hoặc Quản lý CLB mới có quyền lập hoặc chỉnh sửa giáo án." : tr("Only the Head Trainer can create or edit training plans.")}</Alert>;
  }
  const canActivateAfterSave = !editing || existing?.status === "DRAFT";

  return (
    <div className={styles.page}>
      <PageHeader
        title={editing ? tr("Edit plan") : (selectedHorseInfo ? (isVietnamese ? `Lập giáo án: ${selectedHorseInfo.name}` : `Create Plan: ${selectedHorseInfo.name}`) : "Create Training Plan")}
        description={selectedHorseInfo ? (isVietnamese ? `Lập lộ trình và phân kỳ huấn luyện cho ${selectedHorseInfo.name}.` : "Set training goals and periodization phases.") : "Set training goals and periodization phases."}
      />

      {/* Modern 2-Step Segmented Stepper */}
      <div className={styles.stepperGrid}>
        <button
          type="button"
          className={`${styles.stepCard} ${step === 1 ? styles.stepCardActive : styles.stepCardDone}`}
          onClick={() => setStep(1)}
        >
          <div className={styles.stepBadge}>
            {step === 2 ? <Icon name="check" size={18} /> : "1"}
          </div>
          <div className={styles.stepContent}>
            <span className={styles.stepTag}>
              {step === 2 ? (isVietnamese ? "ĐÃ HOÀN THÀNH" : "COMPLETED") : (isVietnamese ? "ĐANG THIẾT LẬP" : "CURRENT STEP")}
            </span>
            <div className={styles.stepTitle}>
              {isVietnamese ? "1. Chiến mã & Mục tiêu" : "1. Horse & Objectives"}
            </div>
            <div className={styles.stepDesc}>
              {isVietnamese ? "Thông tin chung & mục tiêu giáo án" : "Target horse & plan scope"}
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`${styles.stepCard} ${step === 2 ? styles.stepCardActive : styles.stepCardInactive}`}
          onClick={() => {
            if (step === 1) handleNextToStep2();
          }}
        >
          <div className={styles.stepBadge}>2</div>
          <div className={styles.stepContent}>
            <span className={styles.stepTag}>
              {step === 2 ? (isVietnamese ? "ĐANG THIẾT LẬP" : "CURRENT STEP") : (isVietnamese ? "BƯỚC TIẾP THEO" : "NEXT STEP")}
            </span>
            <div className={styles.stepTitle}>
              {isVietnamese ? "2. Chu kỳ giai đoạn & Khối lượng" : "2. Periodization & Volume"}
            </div>
            <div className={styles.stepDesc}>
              {isVietnamese ? "Phân kỳ giai đoạn & khối lượng" : "Phases & training volume"}
            </div>
          </div>
        </button>
      </div>

      {error && <Alert tone="danger" title={isVietnamese ? "Lỗi không thể lưu giáo án" : tr("Cannot save")}>{error}</Alert>}

      {/* BƯỚC 1: CHIẾN MÃ & MỤC TIÊU */}
      {step === 1 && (
        <>
          {/* 1. Dedicated Horse Hero Card */}
          <div id="field-horseId">
            {selectedHorseInfo ? (
              <div className={styles.horseHeroCard}>
                <div className={styles.horseHeroLeft}>
                  <div className={styles.horseHeroAvatar}>
                    <img
                      src={selectedHorseInfo.avatarUrl || "/images/horses/horse-01.jpg"}
                      alt={selectedHorseInfo.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/horses/horse-01.jpg";
                      }}
                    />
                  </div>
                  <div className={styles.horseHeroInfo}>
                    <div className={styles.horseHeroTitleRow}>
                      <span className={styles.horseHeroName}>{selectedHorseInfo.name}</span>
                      <span className={styles.horseHeroCode}>({selectedHorseInfo.horseCode || "—"})</span>
                      <Badge tone={selectedAssignableHorse?.canAssign ? "ok" : "info"}>
                        {editing
                          ? (isVietnamese ? "Đang chỉnh sửa" : "Editing Plan")
                          : (isVietnamese ? "Sẵn sàng lập giáo án" : "Ready for Plan")}
                      </Badge>
                    </div>
                    <div className={styles.horseHeroMetaRow}>
                      <span className={styles.horseHeroMetaChip}>
                        {isVietnamese ? "Giống:" : "Breed:"} <strong>{selectedHorseInfo.breed || "Thoroughbred"}</strong>
                      </span>
                      <span className={styles.horseHeroMetaChip}>
                        {isVietnamese ? "Tuổi & Giới tính:" : "Age & Sex:"}{" "}
                        <strong>
                          {selectedHorseInfo.age != null ? `${selectedHorseInfo.age} ${isVietnamese ? "tuổi" : "yo"}` : "—"} · {formatHorseGender(selectedHorseInfo.gender)}
                        </strong>
                      </span>
                      <span className={styles.horseHeroMetaChip}>
                        {isVietnamese ? "Ô chuồng:" : "Stall:"} <strong>{selectedHorseInfo.stallName || "Barn A"}</strong>
                      </span>
                      <span className={styles.horseHeroMetaChip}>
                        {isVietnamese ? "Thể trạng:" : "Health:"}{" "}
                        <strong>{formatHealthStatus(selectedHorseInfo.status, selectedHorseInfo.isMedicalLocked).label}</strong>
                      </span>
                      <span className={styles.horseHeroMetaChip}>
                        {isVietnamese ? "Định mức HLV:" : "Trainer Quota:"}{" "}
                        <strong style={{ color: trainerSelfCount >= 8 ? "var(--danger, #ef4444)" : "var(--brand, #2563eb)" }}>
                          {trainerSelfCount}/8 {isVietnamese ? "chiến mã" : "horses"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setHorsePickerSearch("");
                      setIsHorsePickerOpen(true);
                    }}
                    className={styles.horseHeroChangeBtn}
                    title={isVietnamese ? "Đổi sang chiến mã khác để lập giáo án" : "Change selected horse"}
                  >
                    <Icon name="refresh" size={14} />
                    {isVietnamese ? "Đổi chiến mã khác" : "Change horse"}
                  </button>
                )}
              </div>
            ) : (
              <div
                className={styles.horseHeroCard}
                style={
                  submitted && formErrors.horseId
                    ? { borderColor: "var(--danger, #ef4444)", borderWidth: "2px", boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.15)" }
                    : undefined
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className={styles.horseHeroAvatar} style={{ opacity: 0.5 }}></div>
                  <div>
                    <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: "15px" }}>
                      {isVietnamese ? "Chưa có chiến mã nào được chọn" : "No horse selected"}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
                      {isVietnamese ? "Vui lòng chọn một chiến mã chưa có giáo án để bắt đầu lập kế hoạch." : "Please select an available horse without a plan."}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHorsePickerSearch("");
                    setIsHorsePickerOpen(true);
                  }}
                  className={styles.horseHeroChangeBtn}
                  style={{ background: "var(--brand, #2563eb)", color: "#fff", borderColor: "var(--brand, #2563eb)" }}
                >
                  <Icon name="plus" size={14} />
                  {isVietnamese ? "Chọn chiến mã lập giáo án" : "Select horse"}
                </button>
              </div>
            )}

            {isFieldVisible("horseId") && formErrors.horseId && (
              <div style={{ color: "var(--danger, #ef4444)", fontSize: "13px", marginTop: "0.4rem", fontWeight: 600 }}>
                {formErrors.horseId}
              </div>
            )}
          </div>

          {/* Horse assignment alerts if any */}
          {selectedAssignableHorse && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {selectedAssignableHorse.planState === "READY" && selectedAssignableHorse.canAssign && (
                <Alert tone="ok" title={isVietnamese ? "Chiến mã sẵn sàng" : "Ready for Training Plan"}>
                  {isVietnamese
                    ? `Chiến mã ${selectedAssignableHorse.name} hiện chưa có giáo án nào, sẵn sàng lập giáo án mới.`
                    : `Horse is ready with no active plans.`}
                </Alert>
              )}
              {(selectedAssignableHorse.planState === "PENDING_ACCEPTANCE" ||
                selectedAssignableHorse.planState === "UNASSIGNED_TRAINER") && (
                <Alert tone="warn" title={selectedAssignableHorse.badge}>
                  <div>{selectedAssignableHorse.explanation}</div>
                </Alert>
              )}
              {selectedAssignableHorse.planState === "ACTIVE_OTHER" && (
                <Alert tone="warn" title={isVietnamese ? "Ngựa do HLV khác phụ trách" : "Managed by Another Trainer"}>
                  <div>
                    {isVietnamese
                      ? `${selectedAssignableHorse.name} đang do HLV ${selectedAssignableHorse.activePlan?.trainerName} phụ trách (${selectedAssignableHorse.activePlan?.planCode}). Bạn không thể can thiệp giáo án của HLV khác.`
                      : selectedAssignableHorse.explanation}
                  </div>
                </Alert>
              )}
              {selectedAssignableHorse.planState === "ACTIVE_SELF" && (
                <Alert tone="info" title={isVietnamese ? "Bạn đã có giáo án đang áp dụng cho ngựa này" : "Active Plan Already Exists"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span>
                      {isVietnamese
                        ? `Bạn đã có giáo án ${selectedAssignableHorse.activePlan?.planCode} ("${selectedAssignableHorse.activePlan?.name}") đang áp dụng cho chiến mã này.`
                        : selectedAssignableHorse.explanation}
                    </span>
                    {selectedAssignableHorse.existingPlanId && (
                      <Button size="sm" tone="secondary" onClick={() => navigate(`/training/plans/${selectedAssignableHorse.existingPlanId}`)}>
                        {isVietnamese ? "Mở xem giáo án hiện tại →" : "View current plan →"}
                      </Button>
                    )}
                  </div>
                </Alert>
              )}
              {selectedAssignableHorse.planState === "DRAFT_SELF" && (
                <Alert tone="info" title={isVietnamese ? "Bạn đang có một bản nháp cho ngựa này" : "Draft Plan Exists"}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span>{selectedAssignableHorse.explanation}</span>
                    {selectedAssignableHorse.existingPlanId && (
                      <Button size="sm" tone="secondary" onClick={() => navigate(`/training/plans/${selectedAssignableHorse.existingPlanId}/edit`)}>
                        {isVietnamese ? "Tiếp tục chỉnh sửa bản nháp này →" : "Continue editing draft →"}
                      </Button>
                    )}
                  </div>
                </Alert>
              )}
              {selectedAssignableHorse.planState === "COOLDOWN_SELF" && (
                <Alert tone="warn" title={isVietnamese ? "Đang trong thời gian chờ (Cooldown)" : "Cooldown Active"}>
                  <div>{selectedAssignableHorse.explanation}</div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <Button size="sm" tone="secondary" onClick={() => setIsHorsePickerOpen(true)}>
                      {isVietnamese ? "Đổi sang chiến mã khác" : "Select another horse"}
                    </Button>
                  </div>
                </Alert>
              )}
              {selectedAssignableHorse.planState === "MEDICAL_LOCKED" && (
                <Alert tone="danger" title={isVietnamese ? "Không thể lập giáo án: Ngựa bị Khóa y tế" : tr("Training Lock")}>
                  <div>
                    {isVietnamese
                      ? "Ngựa đang chịu lệnh Khóa huấn luyện y tế từ Bác sĩ thú y. Vui lòng chờ bác sĩ thú y gỡ khóa trên Hồ sơ bệnh án."
                      : tr("The horse is under a Training Lock. Plans cannot be created until cleared by a veterinarian.")}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <Link to="/training?plan=NONE" style={{ color: "var(--danger)", fontWeight: 600, textDecoration: "underline" }}>
                      {isVietnamese ? "← Quay lại Tổng quan huấn luyện" : "← Back to Overview"}
                    </Link>
                  </div>
                </Alert>
              )}
            </div>
          )}
          {!selectedAssignableHorse && horse?.isMedicalLocked && (
            <div>
              <Alert tone="danger" title={isVietnamese ? "Không thể lập giáo án: Ngựa bị Khóa y tế" : tr("Training Lock")}>
                {isVietnamese
                  ? "Ngựa đang chịu lệnh Khóa huấn luyện y tế từ Bác sĩ thú y. Vui lòng chờ bác sĩ thú y gỡ khóa trên Hồ sơ bệnh án."
                  : tr("The horse is under a Training Lock. Plans cannot be created until cleared by a veterinarian.")}
              </Alert>
            </div>
          )}
          {horse && !horse.isMedicalLocked && MEDICAL.includes(horse.status) && (
            <div>
              <Alert tone="warn" title={tr("Medical status")}>{tr("The horse is in status {{status}}.", { status: horse.status })}</Alert>
            </div>
          )}

          {/* 2. Main Form Card */}
          <Card pad={24}>
            <div className={styles.sectionHeaderWrap}>
              <div>
                <h2 className={styles.sectionTitle}>{isVietnamese ? "Thông tin giáo án" : tr("General information")}</h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  {isVietnamese
                    ? "Tên giáo án, thời gian áp dụng và mục tiêu đào tạo"
                    : "Define plan identification, schedule boundaries, and key objectives"}
                </p>
              </div>
              {planDuration && (
                <span className={styles.durationBadge}>
                  <Icon name="calendar" size={14} />
                  {isVietnamese
                    ? `${phases.length} giai đoạn (${planDuration.diffDays} ngày)`
                    : `${phases.length} phases (${planDuration.diffDays} days)`}
                </span>
              )}
            </div>

            <div className={styles.formContainer}>
              {/* Row 1: Tên giáo án (Full width, prominent) */}
              <div id="field-name">
                <Field
                  label={isVietnamese ? "Tên giáo án" : tr("Plan name")}
                  required
                  hint={isVietnamese ? "Từ 3–150 ký tự" : tr("3-150 characters")}
                  error={isFieldVisible("name") ? formErrors.name : undefined}
                >
                  <Input
                    value={name}
                    maxLength={150}
                    placeholder={isVietnamese ? "VD: Nền tảng thể lực & sức bền 1800m" : "e.g., Aerobic Base & Endurance 1800m"}
                    onChange={(e) => change(setName)(e.target.value)}
                    onBlur={() => markTouched("name")}
                  />
                </Field>
              </div>

              {/* Row 2: Khung thời gian (Start Date, End Date, Duration summary) */}
              <div className={styles.scheduleGrid}>
                <div id="field-startDate">
                  <Field
                    label={tr("Start date")}
                    required
                    hint={editing ? undefined : isVietnamese ? "Từ ngày mai" : tr("From tomorrow")}
                    error={isFieldVisible("startDate") ? formErrors.startDate : undefined}
                  >
                    <DatePicker min={editing ? undefined : tomorrow} value={startDate} onChange={handleStartDateChange} />
                  </Field>
                </div>
                <div id="field-endDate">
                  <Field
                    label={tr("End date")}
                    required
                    hint={isVietnamese ? "Tối thiểu 7 ngày" : tr("Minimum 7 days")}
                    error={isFieldVisible("endDate") ? formErrors.endDate : undefined}
                  >
                    <DatePicker
                      min={addDays(startDate, 6)}
                      max={addDays(startDate, 365)}
                      value={endDate}
                      onChange={handleEndDateChange}
                    />
                  </Field>
                </div>
                <div id="field-duration">
                  <Field
                    label={isVietnamese ? "Số giai đoạn (1–12)" : "Number of Phases (1–12)"}
                    required
                    hint={isVietnamese ? "Mặc định: 4 giai đoạn" : "Default: 4 phases"}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={phaseCountInput}
                      placeholder="4"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPhaseCountInput(val);
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num >= 1 && num <= 12) {
                          handlePhaseCountSelect(num);
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(phaseCountInput, 10);
                        if (isNaN(num) || num < 1) {
                          setPhaseCountInput("1");
                          handlePhaseCountSelect(1);
                        } else if (num > 12) {
                          setPhaseCountInput("12");
                          handlePhaseCountSelect(12);
                        } else {
                          setPhaseCountInput(String(num));
                          handlePhaseCountSelect(num);
                        }
                      }}
                    />
                  </Field>
                </div>
              </div>

              {/* Thông tin thời lượng giáo án dạng 1 dòng tối giản (Plain text + Lucide Icon) */}
              <div
                style={{
                  marginTop: "0.6rem",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  lineHeight: 1.4,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--text, #334155)", fontWeight: 500 }}>
                  <Icon name="clock" size={14} inline style={{ color: "var(--text-muted, #64748b)" }} />
                  <span>
                    <strong>{planDuration?.diffDays || phases.length * 7}</strong> {isVietnamese ? "ngày" : "days"} ({phases.length} {isVietnamese ? "giai đoạn" : "phases"})
                  </span>
                </span>
              </div>

              <div className={styles.sectionDivider} />

              {/* Row 3: Mục tiêu & Ghi chú (Perfect 2-column symmetry) */}
              <div className={styles.twoCol}>
                <div id="field-objective">
                  <Field
                    label={isVietnamese ? "Mục tiêu huấn luyện" : tr("Objective")}
                    required
                    hint={isVietnamese ? "10–1000 ký tự" : tr("10-1000 characters")}
                    error={isFieldVisible("objective") ? formErrors.objective : undefined}
                  >
                    <Textarea
                      rows={4}
                      maxLength={1000}
                      placeholder={isVietnamese ? "VD: Nâng cao thể lực nền tảng, tăng dần cự ly lên 1.800m, rèn tốc độ bứt phá..." : "Key fitness and tactical goals..."}
                      value={objective}
                      onChange={(e) => change(setObjective)(e.target.value)}
                      onBlur={() => markTouched("objective")}
                    />
                  </Field>
                </div>
                <div id="field-notes">
                  <Field
                    label={isVietnamese ? "Ghi chú buổi tập" : tr("Workout Notes")}
                    hint={isVietnamese ? "Tùy chọn, tối đa 1000 ký tự" : tr("Up to 1000 characters")}
                    error={isFieldVisible("notes") ? formErrors.notes : undefined}
                  >
                    <Textarea
                      rows={4}
                      maxLength={1000}
                      placeholder={isVietnamese ? "VD: Lưu ý quấn băng bảo vệ cổ chân, đi bộ thả lỏng 15 phút sau buổi tập..." : "Workout instructions..."}
                      value={notes}
                      onChange={(e) => change(setNotes)(e.target.value)}
                      onBlur={() => markTouched("notes")}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </Card>

          {/* Step 1 Actions */}
          {error && (
            <div style={{ marginTop: "1rem" }}>
              <Alert tone="danger" title={isVietnamese ? "Thông tin chưa hợp lệ" : tr("Invalid information")}>
                {error}
              </Alert>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <Button tone="ghost" onClick={cancel}>{tr("Cancel")}</Button>
            <Button
              tone="primary"
              onClick={handleNextToStep2}
              disabled={submitting}
            >
              {submitting ? (
                isVietnamese ? "Đang xử lý..." : "Processing..."
              ) : (
                <>
                  {isVietnamese ? "Tiếp tục: Cấu hình giai đoạn & Khối lượng" : "Next: Periodization & Volume"}{" "}
                  <Icon name="arrowRight" inline size={14} />
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* BƯỚC 2: CHU KỲ GIAI ĐOẠN & KHỐI LƯỢNG HUẤN LUYỆN */}
      {step === 2 && (
        <>
          {/* Plan Meta Banner */}
          <div className={styles.planMetaBanner}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
                  {selectedHorseInfo?.name} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({selectedHorseInfo?.horseCode})</span>
                  {" · "}
                  <span style={{ color: "var(--brand, #2563eb)" }}>{name || (isVietnamese ? "Giáo án chưa đặt tên" : "Unnamed Plan")}</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span>{startDate} → {endDate}</span>
                  <span>• {phases.length} giai đoạn ({planTotalDays || phases.length * 7} ngày)</span>
                </div>
              </div>
            </div>
            <Button size="sm" tone="secondary" onClick={() => setStep(1)}>
              {isVietnamese ? "← Chỉnh sửa thông tin Bước 1" : "← Edit Step 1 info"}
            </Button>
          </div>

          {error && (
            <div style={{ marginBottom: "1rem" }}>
              <Alert tone="danger" title={isVietnamese ? "Chưa thể lưu giáo án" : tr("Cannot save")}>
                {error}
              </Alert>
            </div>
          )}

          {/* Biểu đồ Cột Mini (Volume & Intensity Sparkline) */}
          <div className={styles.sparklineCard}>
            <div className={styles.sparklineHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{isVietnamese ? "Phân bổ khối lượng theo giai đoạn" : "Phase Volume & Intensity"}</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                    ({phases.length} {isVietnamese ? "giai đoạn" : "phases"})
                  </span>
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  {isVietnamese
                    ? "Cự ly tối đa (km) và số buổi tập mỗi tuần theo từng giai đoạn."
                    : "Track maximum distance and sessions per week across training phases."}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Button
                  size="sm"
                  tone={viewMode === "tabs" ? "primary" : "secondary"}
                  onClick={() => setViewMode(viewMode === "tabs" ? "all" : "tabs")}
                >
                  {viewMode === "tabs"
                    ? (isVietnamese ? "Xem tất cả giai đoạn" : "View all phases")
                    : (isVietnamese ? "Chế độ từng giai đoạn (Tabs)" : "Tabbed phase view")}
                </Button>
                <Button tone="secondary" size="sm" onClick={addPhase} disabled={phases.length >= 12}>
                  {tr("+ Add phase")}
                </Button>
              </div>
            </div>

            {/* Cảnh báo Spike quá tải nếu có */}
            {hasSpikeWarning && (
              <div style={{ marginBottom: "1rem" }}>
                <Alert tone="warn" title={isVietnamese ? "Cảnh báo tăng cự ly (>30%)" : "Volume Spike Warning (>30%)"}>
                  {isVietnamese
                    ? "Giai đoạn này tăng hơn 30% cự ly so với giai đoạn liền trước. Nên tăng đều 10–20%/tuần để tránh quá tải."
                    : "A phase increases distance by more than 30% compared to previous phase. Consider progressive gradual loading to avoid injury."}
                </Alert>
              </div>
            )}

            {/* Cột Sparkline đồ thị */}
            <div className={styles.sparklineBarsWrap}>
              {phases.map((p, idx) => {
                const heightPercent = maxPhaseDist > 0 ? Math.max(14, Math.round(((p.maxWeeklyDistance || 0) / maxPhaseDist) * 100)) : 14;
                const typeMeta = PHASE_TYPE_COLORS[p.type] || { bg: "#eff6ff", text: "#1d4ed8", bar: "#3b82f6" };
                const isSelected = idx === activePhaseIndex;
                const isSpike = idx > 0 && (phases[idx - 1].maxWeeklyDistance || 0) > 0 && (p.maxWeeklyDistance / phases[idx - 1].maxWeeklyDistance) > 1.3;

                return (
                  <div
                    key={p.id}
                    className={styles.sparklineCol}
                    onClick={() => {
                      setActivePhaseIndex(idx);
                      if (viewMode === "tabs") {
                        const el = document.getElementById("active-phase-editor");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }
                    }}
                    title={`${p.name}: ${p.maxWeeklyDistance}m (${p.sessionsPerWeek} buổi/tuần)`}
                  >
                    <div
                      className={styles.sparklineValue}
                      style={{ color: isSpike ? "var(--warn, #d97706)" : "var(--text-muted)" }}
                    >
                      {isSpike && ""}
                      {((p.maxWeeklyDistance || 0) / 1000).toFixed(1)}k
                    </div>
                    <div
                      className={`${styles.sparklineBar} ${isSelected ? styles.sparklineBarSelected : ""}`}
                      style={{
                        height: `${heightPercent}%`,
                        background: typeMeta.bar,
                        opacity: isSelected ? 1 : 0.78,
                      }}
                    />
                    <div
                      className={styles.sparklineLabel}
                      style={{ color: isSelected ? "var(--brand, #2563eb)" : "var(--text-muted)" }}
                    >
                      GĐ{idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chú thích màu sắc chu kỳ */}
            <div className={styles.sparklineLegend}>
              <span>
                <strong style={{ color: "var(--ink)" }}>{isVietnamese ? "Chu kỳ giai đoạn:" : "Phases:"}</strong>
              </span>
              {(["BASE", "BUILD", "SPEED", "PRE_RACE", "RECOVERY"] as PhaseType[]).map((t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center" }}>
                  <span className={styles.legendDot} style={{ background: PHASE_TYPE_COLORS[t]?.bar }} />
                  {isVietnamese ? PHASE_TYPE_VIETNAMESE[t] : tr(PHASE_TYPE_LABEL[t])}
                </span>
              ))}
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                {isVietnamese ? "* Bấm vào cột hoặc thẻ giai đoạn bên dưới để cấu hình chi tiết" : "* Click bar or tab to configure"}
              </span>
            </div>
          </div>

          {/* Dòng thời gian chu kỳ (Timeline Tabs Ribbon) */}
          <div className={styles.timelineTabsWrap}>
            {phases.map((p, idx) => {
              const isSelected = idx === activePhaseIndex;
              const typeMeta = PHASE_TYPE_COLORS[p.type] || { bg: "#eff6ff", text: "#1d4ed8", bar: "#3b82f6" };
              const isSpike = idx > 0 && (phases[idx - 1].maxWeeklyDistance || 0) > 0 && (p.maxWeeklyDistance / phases[idx - 1].maxWeeklyDistance) > 1.3;
              const hasErr = formErrors.phases?.[p.id] && Object.values(formErrors.phases[p.id]).some(Boolean);
              const pDays = Math.round((new Date(`${p.endDate}T00:00:00Z`).getTime() - new Date(`${p.startDate}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) + 1;

              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.timelineTab} ${isSelected ? styles.timelineTabActive : ""}`}
                  onClick={() => setActivePhaseIndex(idx)}
                  style={{
                    borderLeft: `4px solid ${hasErr ? "var(--danger, #ef4444)" : typeMeta.bar}`,
                  }}
                >
                  <div className={styles.timelineTabHeader}>
                    <span className={styles.timelineTabNumber}>
                      {isVietnamese ? `GIAI ĐOẠN ${idx + 1}` : `PHASE ${idx + 1}`}
                      {isSpike && <span title={isVietnamese ? "Tăng cự ly >30%" : "Spike >30%"}> [!]</span>}
                      {hasErr && <span style={{ color: "var(--danger)" }}> [!]</span>}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "10px",
                        backgroundColor: typeMeta.bg,
                        color: typeMeta.text,
                      }}
                    >
                      {isVietnamese ? PHASE_TYPE_VIETNAMESE[p.type] : tr(PHASE_TYPE_LABEL[p.type])}
                    </span>
                  </div>
                  <div className={styles.timelineTabName}>{p.name || `Giai đoạn ${idx + 1}`}</div>
                  <div className={styles.timelineTabMeta}>
                    <span>{pDays} ngày</span>
                    <span>{((p.maxWeeklyDistance || 0) / 1000).toFixed(1)} km/tuần</span>
                  </div>
                </button>
              );
            })}
            {phases.length < 12 && (
              <button
                type="button"
                onClick={addPhase}
                title={isVietnamese ? "Thêm 1 giai đoạn tiếp theo" : "Add next phase"}
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "var(--brand, #2563eb)",
                  cursor: "pointer",
                  padding: "0.5rem 1rem",
                  fontWeight: 600,
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  alignSelf: "stretch",
                  whiteSpace: "nowrap",
                }}
              >
                + {isVietnamese ? "Thêm giai đoạn" : "Add phase"}
              </button>
            )}
          </div>

          {/* Vùng Cấu hình chi tiết giai đoạn */}
          {viewMode === "tabs" ? (
            <div id="active-phase-editor">
              {phases[activePhaseIndex] && renderPhaseEditor(phases[activePhaseIndex], activePhaseIndex, phases.length > 1)}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <Button
                  tone="secondary"
                  size="sm"
                  disabled={activePhaseIndex === 0}
                  onClick={() => setActivePhaseIndex((prev) => Math.max(0, prev - 1))}
                >
                  ← {isVietnamese ? "Giai đoạn trước" : "Previous phase"}
                </Button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                    {isVietnamese
                      ? `Đang xem: Giai đoạn ${activePhaseIndex + 1} / ${phases.length}`
                      : `Viewing: Phase ${activePhaseIndex + 1} of ${phases.length}`}
                  </span>
                  {phases.length < 12 && (
                    <Button tone="secondary" size="sm" onClick={addPhase}>
                      + {isVietnamese ? "Thêm 1 giai đoạn" : "Add phase"}
                    </Button>
                  )}
                  {phases.length > 1 && (
                    <Button tone="ghost" size="sm" onClick={() => removePhase(activePhaseIndex)} style={{ color: "var(--danger)" }}>
                      {isVietnamese ? "Xóa giai đoạn này" : "Remove this phase"}
                    </Button>
                  )}
                </div>
                <Button
                  tone="secondary"
                  size="sm"
                  disabled={activePhaseIndex === phases.length - 1}
                  onClick={() => setActivePhaseIndex((prev) => Math.min(phases.length - 1, prev + 1))}
                >
                  {isVietnamese ? "Giai đoạn tiếp theo" : "Next phase"} →
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {phases.map((ph, i) => renderPhaseEditor(ph, i, phases.length > 1))}
            </div>
          )}

          {/* Sticky Actions Bar */}
          <div className={styles.stickyActionsBar}>
            {error && (
              <div style={{ width: "100%", marginBottom: "0.5rem" }}>
                <Alert tone="danger" title={isVietnamese ? "Lỗi không thể lưu giáo án" : tr("Cannot save")}>
                  {error}
                </Alert>
              </div>
            )}
            <div className={styles.summaryStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{isVietnamese ? "Tổng số giai đoạn" : "Total phases"}</span>
                <span className={styles.statValue}>{phases.length} {isVietnamese ? "giai đoạn" : "phases"} ({planDuration?.diffDays || phases.length * 7} {isVietnamese ? "ngày" : "days"})</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{isVietnamese ? "Tổng cự ly giáo án" : "Total distance"}</span>
                <span className={styles.statValue}>{(totalDistance / 1000).toFixed(1)} km</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>{isVietnamese ? "Tổng số buổi tập" : "Total workouts"}</span>
                <span className={styles.statValue}>{totalSessions} {isVietnamese ? "buổi" : "sessions"}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button tone="ghost" onClick={() => setStep(1)}>
                {isVietnamese ? "← Quay lại Bước 1" : "← Back to Step 1"}
              </Button>
              <Button tone="ghost" onClick={cancel}>
                {tr("Cancel")}
              </Button>
              <Button
                tone="secondary"
                onClick={() => void save(false)}
                disabled={submitting}
              >
                {submitting
                  ? (isVietnamese ? "Đang lưu..." : "Saving...")
                  : editing
                  ? (isVietnamese ? "Lưu thay đổi" : tr("Save draft changes"))
                  : isVietnamese
                  ? "Lưu chờ kích hoạt"
                  : tr("Save Draft")}
              </Button>
              {canActivateAfterSave && (
                <Button
                  tone="primary"
                  onClick={() => void save(true)}
                  disabled={submitting}
                >
                  {submitting ? (
                    isVietnamese ? "Đang lưu..." : "Saving..."
                  ) : editing ? (
                    isVietnamese ? "Lưu & kích hoạt" : tr("Save and activate")
                  ) : (
                    <>
                      {isVietnamese ? "Lưu giáo án & Tiếp theo: Xếp lịch tập" : tr("Save Plan & Next: Add Workouts")}{" "}
                      <Icon name="arrowRight" inline size={14} />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Chọn chiến mã lập giáo án */}
      {isHorsePickerOpen && (
        <Modal
          title={isVietnamese ? "Chọn chiến mã lập giáo án" : "Select Horse for Training Plan"}
          subtitle={
            isVietnamese
              ? `Danh sách chiến mã chưa có giáo án (Định mức HLV: ${trainerSelfCount}/8 chiến mã)`
              : `Eligible horses without an active training plan (Trainer capacity: ${trainerSelfCount}/8)`
          }
          width={740}
          onClose={() => setIsHorsePickerOpen(false)}
          foot={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span className={styles.horsePickerCount}>
                {isVietnamese
                  ? `Hiển thị ${availableHorsesForModal.length} chiến mã phù hợp`
                  : `Showing ${availableHorsesForModal.length} eligible horses`}
              </span>
              <Button tone="ghost" size="sm" onClick={() => setIsHorsePickerOpen(false)}>
                {isVietnamese ? "Đóng" : "Close"}
              </Button>
            </div>
          }
        >
          <div className={styles.horsePickerContainer}>
            {/* Toolbar: Search input & Tabs */}
            <div className={styles.horsePickerToolbar}>
              <div className={styles.horsePickerSearchWrap}>
                <span className={styles.horsePickerSearchIcon}></span>
                <input
                  type="text"
                  className={styles.horsePickerSearchInput}
                  placeholder={
                    isVietnamese
                      ? "Tìm theo tên chiến mã, mã số (HR-...), giống, ô chuồng, chủ sở hữu..."
                      : "Search by horse name, code, breed, stall, owner..."
                  }
                  value={horsePickerSearch}
                  onChange={(e) => setHorsePickerSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.horsePickerFilters}>
                <div className={styles.horsePickerTabs}>
                  <button
                    type="button"
                    className={`${styles.horsePickerTabBtn} ${
                      horsePickerFilter === "READY" ? styles.horsePickerTabBtnActive : ""
                    }`}
                    onClick={() => setHorsePickerFilter("READY")}
                  >
                    {isVietnamese ? `Chưa có giáo án (${modalCounts.ready})` : `No Plan (${modalCounts.ready})`}
                  </button>
                  <button
                    type="button"
                    className={`${styles.horsePickerTabBtn} ${
                      horsePickerFilter === "ALL" ? styles.horsePickerTabBtnActive : ""
                    }`}
                    onClick={() => setHorsePickerFilter("ALL")}
                  >
                    {isVietnamese ? `Tất cả chiến mã (${modalCounts.total})` : `All Horses (${modalCounts.total})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách chiến mã */}
            <div className={styles.horsePickerList}>
              {availableHorsesForModal.length === 0 ? (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></div>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>
                    {isVietnamese ? "Không tìm thấy chiến mã phù hợp" : "No horses found"}
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    {isVietnamese
                      ? "Thử tìm kiếm với từ khóa khác hoặc chuyển sang tab 'Tất cả chiến mã'."
                      : "Try different search terms or switch to 'All Horses' tab."}
                  </div>
                </div>
              ) : (
                availableHorsesForModal.map((h) => {
                  const isSelected = h.id === horseId;
                  const isReady = h.canAssign && !h.isMedicalLocked;
                  const age = getHorseAge(h.dob);
                  const health = formatHealthStatus(h.status, h.isMedicalLocked);

                  return (
                    <div
                      key={h.id}
                      className={`${styles.horsePickerItem} ${
                        isSelected ? styles.horsePickerItemSelected : ""
                      } ${!h.canAssign && !isSelected ? styles.horsePickerItemDisabled : ""}`}
                      onClick={() => {
                        if (h.canAssign || isSelected) {
                          handleSelectHorse(h.id);
                        }
                      }}
                    >
                      <div className={styles.horsePickerItemLeft}>
                        <div className={styles.horsePickerItemAvatar}>
                          <img
                            src={h.avatarUrl || "/images/horses/horse-01.jpg"}
                            alt={h.name}
                            style={{ width: "100%", height: "100%", borderRadius: 6, objectFit: "cover" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/horses/horse-01.jpg";
                            }}
                          />
                        </div>
                        <div className={styles.horsePickerItemContent}>
                          <div className={styles.horsePickerItemHeader}>
                            <span className={styles.horsePickerItemName}>{h.name}</span>
                            <span className={styles.horsePickerItemCode}>({h.horseCode || "—"})</span>
                            {isReady ? (
                              <Badge tone="ok">
                                {isVietnamese ? "Chưa có giáo án (Sẵn sàng)" : "No Plan (Ready)"}
                              </Badge>
                            ) : h.planState === "MEDICAL_LOCKED" ? (
                              <Badge tone="danger">
                                {isVietnamese ? "Khóa y tế" : "Medical Locked"}
                              </Badge>
                            ) : h.planState === "DEBT_IMPOUNDED" ? (
                              <Badge tone="danger">
                                {isVietnamese ? "Lưu giữ do nợ phí (Khóa lập giáo án)" : "Debt Impounded"}
                              </Badge>
                            ) : h.planState === "ACTIVE_OTHER" ? (
                              <Badge tone="warn">
                                {isVietnamese ? `Đang có giáo án (HLV ${h.activePlan?.trainerName || "khác"})` : "Has Plan"}
                              </Badge>
                            ) : h.planState === "ACTIVE_SELF" ? (
                              <Badge tone="info">
                                {isVietnamese ? `Đang có giáo án (${h.activePlan?.name || h.activePlan?.planCode || "Của bạn"})` : `Has plan (${h.activePlan?.name || "Yours"})`}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">{h.badge || h.status}</Badge>
                            )}
                          </div>

                          <div className={styles.horsePickerItemTraits}>
                            {h.breed && (
                              <span className={styles.horsePickerItemChip}>
                                Giống: <strong>{h.breed}</strong>
                              </span>
                            )}
                            {age != null && (
                              <span className={styles.horsePickerItemChip}>
                                Tuổi: <strong>{age} tuổi</strong>
                              </span>
                            )}
                            {h.gender && (
                              <span className={styles.horsePickerItemChip}>
                                Giới tính: <strong>{formatHorseGender(h.gender)}</strong>
                              </span>
                            )}
                            {h.color && (
                              <span className={styles.horsePickerItemChip}>
                                Lông: <strong>{h.color}</strong>
                              </span>
                            )}
                            {h.stallName && (
                              <span className={styles.horsePickerItemChip}>
                                Chuồng: <strong>{h.stallName}</strong>
                              </span>
                            )}
                            {h.ownerName && (
                              <span className={styles.horsePickerItemChip}>
                                Chủ: <strong>{h.ownerName}</strong>
                              </span>
                            )}
                            <span className={styles.horsePickerItemChip}>
                              Thể trạng: <strong>{health.icon} {health.label}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.horsePickerItemRight}>
                        {isSelected ? (
                          <Badge tone="ok">{isVietnamese ? "Đang chọn" : "Selected"}</Badge>
                        ) : user.role === "CLUB_MANAGER" && h.activeCooldown ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <Button
                              size="sm"
                              tone="secondary"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const reason = window.prompt(
                                  isVietnamese
                                    ? `[QUẢN LÝ CLB] Nhập lý do mở khóa sớm thời gian chờ cho HLV ${h.activeCooldown?.trainerName} (tối thiểu 5 ký tự):`
                                    : `Enter reason to unlock cooldown for trainer ${h.activeCooldown?.trainerName}:`,
                                );
                                if (reason && reason.trim().length >= 5) {
                                  try {
                                    await trainingApi.unlockCooldown(h.id, h.activeCooldown!.trainerUserId, reason.trim());
                                    toast.show(isVietnamese ? "Đã mở khóa thời gian chờ thành công!" : "Cooldown unlocked!", "ok");
                                    const res = await trainingApi.getAssignableHorses();
                                    setAssignableHorses(res.items);
                                  } catch (err) {
                                    toast.show(messageFor(err), "danger");
                                  }
                                } else if (reason !== null) {
                                  toast.show(isVietnamese ? "Lý do phải từ 5 ký tự trở lên." : "Reason must be at least 5 characters.", "warn");
                                }
                              }}
                            >
                              {isVietnamese ? "Mở khóa chờ" : "Unlock"}
                            </Button>
                            <Button size="sm" tone="ghost" disabled>
                              {isVietnamese ? "Đang chờ" : "Cooldown"}
                            </Button>
                          </div>
                        ) : !h.canAssign ? (
                          <Button size="sm" tone="ghost" disabled>
                            {h.planState === "COOLDOWN_SELF"
                              ? (isVietnamese ? `Chờ ${h.activeCooldown?.remainingHours || 48}h` : "Cooldown")
                              : (isVietnamese ? "Không khả dụng" : "Unavailable")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            tone="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectHorse(h.id);
                            }}
                          >
                            {isVietnamese ? "Chọn chiến mã" : "Select"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
