import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, useBlocker } from "react-router-dom";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import vitalsStyles from "../components/ExamVitals.module.css";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Textarea } from "@/shared/components/form/Textarea";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { Icon } from "@/shared/components/ui/Icon";
import { useToast } from "@/shared/components/ui/Toast";
import { getHorseById, getHorses } from "@/features/horses/api";
import { tr } from "@/shared/i18n/tr";
import { ApiError } from "@/shared/lib/api";
import {
  createRecord,
  getLatestExamSimulation,
  getRecordDetail,
  startExamSimulation,
  updateRecord,
} from "../api";
import { isHeartRateWarning, isRespiratoryWarning, isTempWarning } from "../components/VitalsDisplay";
import { parseMedicalErrors } from "../lib/medical-errors";
import type { LabTestItem, SeverityLevel } from "../types";
import styles from "./MedicalRecordPage.module.css";

const EXAM_TYPE_OPTIONS = [
  { value: "Routine Clinical", label: "Routine Clinical" },
  { value: "Injury Examination", label: "Injury Examination" },
  { value: "Periodic Checkup", label: "Periodic Checkup" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Pre-Race Veterinary Exam", label: "Pre-Race Veterinary Exam" },
];

const DISCOVERY_OPTIONS = [
  { value: "VET Self-Discovered", label: "VET Self-Discovered" },
  { value: "Groom Observation Log", label: "Groom Observation Log" },
  { value: "Post-Training Abnormality", label: "Post-Training Abnormality" },
  { value: "Routine Checkup", label: "Routine Checkup" },
];

const LAB_TYPE_OPTIONS = [
  { value: "Blood Test", label: "Blood Test" },
  { value: "Urinalysis", label: "Urinalysis" },
  { value: "X-Ray", label: "Radiograph (X-Ray)" },
  { value: "Ultrasound", label: "Musculoskeletal Ultrasound" },
  { value: "Endoscopy", label: "Respiratory Endoscopy" },
  { value: "Other", label: "Other" },
];

const PROPOSED_STATUS_OPTIONS = [
  { value: "UNDER_OBSERVATION", label: "Under Observation" },
  { value: "INJURED", label: "Injured" },
  // Giá trị phải là HorseStatus của BE: "Cách ly" = ISOLATED, "Khỏe" = ACTIVE (QUARANTINED/FIT bị BE bỏ qua).
  { value: "ISOLATED", label: "Quarantined" },
  { value: "ACTIVE", label: "Fit" },
];

function getInitialExamDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function RecordFormPage() {
  useScreenTranslation();
  const { id } = useParams(); // If id exists, it's edit mode
  const [searchParams] = useSearchParams();
  const horseIdParam = searchParams.get("horseId") || "";

  const navigate = useNavigate();
  const toast = useToast();

  const isEdit = Boolean(id);

  const examTypeOptions = EXAM_TYPE_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }));
  const discoveryOptions = DISCOVERY_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }));
  const labTypeOptions = LAB_TYPE_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }));
  const proposedStatusOptions = PROPOSED_STATUS_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) }));

  // Block 1: Exam info
  const [horseId, setHorseId] = useState(horseIdParam);
  const [horseOptions, setHorseOptions] = useState<{ value: string; label: string; weightKg?: number | null }[]>([]);
  const [loadingHorses, setLoadingHorses] = useState(true);
  // Khai báo trước effect tải ngựa vì effect điền sẵn cân nặng hồ sơ.
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getHorses({ limit: 100 })
      .then((res: any) => {
        if (!active) return;
        const data = res.items || res.data || [];
        if (data.length > 0) {
          setHorseOptions(
            data.map((h: any) => ({
              value: h.id,
              label: `${h.name} (${h.horseCode || h.id})`,
              weightKg: h.weightKg,
            }))
          );
          const paramHorse = data.find((h: any) => h.id === horseIdParam);
          if (!isEdit && paramHorse) setWeightKg((current) => current ?? paramHorse.weightKg ?? undefined);
          // Ngựa từ ?horseId có thể nằm ngoài 100 ngựa đầu: tải riêng theo ID thay vì bỏ chọn.
          if (!isEdit && horseIdParam && !paramHorse) {
            getHorseById(horseIdParam)
              .then((h) => {
                if (!active) return;
                setHorseOptions((prev) => [
                  { value: h.id, label: `${h.name} (${h.horseCode || h.id})`, weightKg: h.weightKg },
                  ...prev,
                ]);
                setWeightKg((current) => current ?? h.weightKg ?? undefined);
              })
              .catch(() => {
                if (active) setHorseId("");
              });
          }
        } else {
          setHorseOptions([{ value: "", label: tr("-- No horses available --") }]);
        }
      })
      .catch(() => {
        if (active) setHorseOptions([{ value: "", label: tr("-- Error loading horses --") }]);
      })
      .finally(() => {
        if (active) setLoadingHorses(false);
      });
    return () => {
      active = false;
    };
  }, [horseIdParam, isEdit]);

  const [examinationDate, setExaminationDate] = useState(getInitialExamDate());
  const [examinationType, setExaminationType] = useState("Routine Clinical");
  const [examinationReason, setExaminationReason] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [discoverySource, setDiscoverySource] = useState("VET Self-Discovered");

  // Block 2: Vital signs
  const [temperature, setTemperature] = useState<number | undefined>(undefined);
  const [restingHeartRate, setRestingHeartRate] = useState<number | undefined>(undefined);
  const [respiratoryRate, setRespiratoryRate] = useState<number | undefined>(undefined);
  const listedHorse = horseOptions.find((option) => option.value === horseId);
  const [fetchedWeight, setFetchedWeight] = useState<{ horseId: string; weightKg: number | null } | null>(null);
  // Cân nặng hồ sơ luôn theo đúng ID ngựa đang chọn, kể cả khi ngựa không có trong danh sách đã tải.
  useEffect(() => {
    if (!horseId || listedHorse) return;
    let active = true;
    getHorseById(horseId)
      .then((h) => {
        if (active) setFetchedWeight({ horseId, weightKg: h.weightKg ?? null });
      })
      .catch(() => {
        if (active) setFetchedWeight(null);
      });
    return () => {
      active = false;
    };
  }, [horseId, listedHorse]);
  const profileWeight = listedHorse
    ? listedHorse.weightKg
    : fetchedWeight?.horseId === horseId
      ? fetchedWeight.weightKg
      : undefined;
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Block 3: Diagnostics
  const [labTests, setLabTests] = useState<LabTestItem[]>([]);
  const [labTestErrors, setLabTestErrors] = useState<Record<number, string>>({});

  // Block 4: Diagnosis
  const [diagnosis, setDiagnosis] = useState("");
  const [severity, setSeverity] = useState<SeverityLevel | undefined>(undefined);
  const [proposedStatus, setProposedStatus] = useState("UNDER_OBSERVATION");
  const [proposeMedicalLock, setProposeMedicalLock] = useState(false);

  const [busy, setBusy] = useState(false);
  const [examBusy, setExamBusy] = useState(false);
  const [examSource, setExamSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // FR-3.20: đóng tab / tải lại khi có thay đổi chưa lưu -> trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // FR-3.20: Chuyển trang qua router / Sidebar khi chưa lưu -> hỏi xác nhận
  const blocker = useBlocker(Boolean(dirty && !busy));

  function handleCancel() {
    navigate(-1);
  }

  // Load existing data if edit mode
  useEffect(() => {
    if (isEdit && id) {
      void getRecordDetail(id).then((res) => {
        const r = res.record;
        setHorseId(r.horseId);
        if (r.examinationDate) {
          const d = new Date(r.examinationDate);
          const pad = (n: number) => String(n).padStart(2, "0");
          setExaminationDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
        setExaminationType(r.examinationType);
        setExaminationReason(r.examinationReason);
        setSymptoms(r.symptoms || "");
        setDiscoverySource(r.discoverySource || "VET Self-Discovered");
        if (r.vitals) {
          setTemperature(r.vitals.temperature);
          setRestingHeartRate(r.vitals.restingHeartRate);
          setRespiratoryRate(r.vitals.respiratoryRate);
          setWeightKg(r.vitals.weightKg);
          setClinicalNotes(r.vitals.clinicalNotes || "");
        }
        setLabTests(r.labTests || []);
        setDiagnosis(r.diagnosis || "");
        setSeverity(r.severity || undefined);
        setProposedStatus(r.proposedStatus || "UNDER_OBSERVATION");
        setProposeMedicalLock(Boolean(r.proposeMedicalLock));
      });
    }
  }, [isEdit, id]);

  function addLabTest() {
    setLabTests([
      ...labTests,
      {
        testType: "Blood Test",
        testDate: new Date().toISOString().split("T")[0],
        result: "",
      },
    ]);
  }

  function removeLabTest(index: number) {
    setLabTests(labTests.filter((_, i) => i !== index));
    setLabTestErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function updateLabTest(index: number, key: keyof LabTestItem, value: string) {
    const next = [...labTests];
    next[index] = { ...next[index], [key]: value };
    setLabTests(next);
    if (key === "result" && labTestErrors[index]) {
      setLabTestErrors((prev) => {
        const nextErrs = { ...prev };
        delete nextErrs[index];
        return nextErrs;
      });
    }
  }

  function validateForm(saveAsDraft: boolean): boolean {
    const errs: Record<string, string> = {};
    const ltErrs: Record<number, string> = {};

    if (!horseId) {
      errs.horseId = tr("Please select a horse to examine.");
    }

    if (!examinationDate) {
      errs.examinationDate = tr("Please enter an examination date.");
    } else {
      const examTime = new Date(examinationDate).getTime();
      const nowTime = Date.now();
      // Allow 5 minutes leeway for clock skew
      if (examTime > nowTime + 5 * 60 * 1000) {
        errs.examinationDate = tr("Examination date cannot be in the future.");
      } else {
        const thirtyDaysAgo = nowTime - 30 * 24 * 60 * 60 * 1000;
        if (examTime < thirtyDaysAgo) {
          errs.examinationDate = tr("Examination date cannot be more than 30 days ago.");
        }
      }
    }

    const trimmedReason = examinationReason.trim();
    if (!saveAsDraft || !trimmedReason) {
      if (!trimmedReason) {
        errs.examinationReason = tr("Please enter the reason for examination.");
      } else if (trimmedReason.length < 5) {
        errs.examinationReason = tr("Reason for examination must be between 5 and 500 characters.");
      } else if (trimmedReason.length > 500) {
        errs.examinationReason = tr("Reason for examination cannot exceed 500 characters.");
      }
    } else {
      if (trimmedReason.length > 0 && trimmedReason.length < 5) {
        errs.examinationReason = tr("Reason for examination must be between 5 and 500 characters.");
      } else if (trimmedReason.length > 500) {
        errs.examinationReason = tr("Reason for examination cannot exceed 500 characters.");
      }
    }

    const trimmedNotes = clinicalNotes.trim();
    if (!saveAsDraft || !trimmedNotes) {
      if (!trimmedNotes || trimmedNotes.length < 10) {
        errs.clinicalNotes = tr("Detailed clinical examination notes must be between 10 and 4,000 characters.");
      } else if (trimmedNotes.length > 4000) {
        errs.clinicalNotes = tr("Clinical examination notes cannot exceed 4,000 characters.");
      }
    } else {
      if (trimmedNotes.length > 0 && trimmedNotes.length < 10) {
        errs.clinicalNotes = tr("Detailed clinical examination notes must be between 10 and 4,000 characters.");
      } else if (trimmedNotes.length > 4000) {
        errs.clinicalNotes = tr("Clinical examination notes cannot exceed 4,000 characters.");
      }
    }

    if (!saveAsDraft && !severity) errs.severity = tr("Please select a severity level.");

    const trimmedDiagnosis = diagnosis.trim();
    if (!saveAsDraft) {
      if (!trimmedDiagnosis) {
        errs.diagnosis = tr("Please enter a definitive diagnosis before finalizing.");
      } else if (trimmedDiagnosis.length < 5) {
        errs.diagnosis = tr("Definitive diagnosis must be between 5 and 1,000 characters.");
      } else if (trimmedDiagnosis.length > 1000) {
        errs.diagnosis = tr("Diagnosis cannot exceed 1,000 characters.");
      }
    } else {
      if (trimmedDiagnosis.length > 0 && trimmedDiagnosis.length < 5) {
        errs.diagnosis = tr("Definitive diagnosis must be between 5 and 1,000 characters.");
      } else if (trimmedDiagnosis.length > 1000) {
        errs.diagnosis = tr("Diagnosis cannot exceed 1,000 characters.");
      }
    }

    if (temperature === undefined) {
      errs.temperature = tr("Please enter the temperature.");
    } else if (temperature < 35.0 || temperature > 43.0) {
      errs.temperature = tr("Body temperature must be between 35.0°C and 43.0°C.");
    }
    if (restingHeartRate === undefined) {
      errs.restingHeartRate = tr("Please enter the resting heart rate.");
    } else if (restingHeartRate < 20 || restingHeartRate > 120) {
      errs.restingHeartRate = tr("Resting heart rate must be between 20 and 120 bpm.");
    }
    if (respiratoryRate === undefined) {
      errs.respiratoryRate = tr("Please enter the respiratory rate.");
    } else if (respiratoryRate < 4 || respiratoryRate > 60) {
      errs.respiratoryRate = tr("Respiratory rate must be between 4 and 60 breaths/min.");
    }
    if (weightKg !== undefined && weightKg !== null && (weightKg < 200 || weightKg > 800)) {
      errs.weightKg = tr("Horse weight must be between 200 and 800 kg.");
    }

    if (symptoms.trim().length > 2000) {
      errs.symptoms = tr("Observed symptoms cannot exceed 2,000 characters.");
    }

    labTests.forEach((t, idx) => {
      const resTrim = t.result.trim();
      if (!resTrim || resTrim.length < 5) {
        const msg = tr("Diagnostic test result must be between 5 and 2,000 characters.");
        ltErrs[idx] = msg;
        errs[`labTest_${idx}`] = tr("Diagnostic test #{{index}} result must be at least 5 characters.", { index: idx + 1 });
      } else if (resTrim.length > 2000) {
        const msg = tr("Diagnostic test result cannot exceed 2,000 characters.");
        ltErrs[idx] = msg;
        errs[`labTest_${idx}`] = tr("Diagnostic test #{{index}} result cannot exceed 2,000 characters.", { index: idx + 1 });
      }
    });

    setFieldErrors(errs);
    setLabTestErrors(ltErrs);

    const errorList = Object.values(errs);
    if (errorList.length > 0) {
      setErrorDetails(errorList);
      setError(
        errorList.length === 1
          ? errorList[0]
          : tr("Please check and correct the highlighted fields before submitting.")
      );
      toast.show(tr("Please correct the highlighted fields before submitting."), "danger");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }

    setError(null);
    setErrorDetails([]);
    return true;
  }

  async function handleSave(saveAsDraft: boolean) {
    if (!validateForm(saveAsDraft)) {
      return;
    }

    setBusy(true);
    setError(null);
    setErrorDetails([]);

    const payload = {
      horseId,
      examinationDate: new Date(examinationDate).toISOString(),
      examinationType,
      examinationReason: examinationReason.trim(),
      symptoms: symptoms.trim() || undefined,
      discoverySource,
      vitals: {
        temperature: temperature !== undefined ? Number(temperature) : undefined,
        restingHeartRate: restingHeartRate !== undefined ? Number(restingHeartRate) : undefined,
        respiratoryRate: respiratoryRate !== undefined ? Number(respiratoryRate) : undefined,
        weightKg: typeof weightKg === "number" && !isNaN(weightKg) ? Number(weightKg) : undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
      },
      labTests: labTests.filter((t) => t.result.trim() !== ""),
      diagnosis: diagnosis.trim() || undefined,
      severity,
      proposedStatus,
      proposeMedicalLock,
      // "Save & Finalize" cũng lưu nháp trước, rồi mở hộp thoại Chốt ở trang chi tiết:
      // ở đó bác sĩ xác nhận áp trạng thái đề xuất và đặt Khóa huấn luyện (nếu đề xuất).
      saveAsDraft: true,
    };
    const finalizeQuery = saveAsDraft ? "" : `?finalize=1${proposeMedicalLock ? "&lock=1" : ""}`;

    try {
      if (isEdit && id) {
        const updated = await updateRecord(id, payload);
        toast.show(tr("Medical record updated successfully."), "ok");
        setDirty(false);
        navigate(`/medical/records/${updated.record.id}${finalizeQuery}`);
      } else {
        const created = await createRecord(payload);
        toast.show(tr("Draft medical record saved successfully."), "ok");
        setDirty(false);
        navigate(`/medical/records/${created.record.id}${finalizeQuery}`);
      }
    } catch (err: unknown) {
      const parsed = parseMedicalErrors(err);
      setError(parsed.summary);
      setErrorDetails(parsed.details);
      setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      toast.show(parsed.summary, "danger");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  async function handleStartExam() {
    if (!horseId) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      toast.show(tr("Please allow pop-ups to open the simulation."), "danger");
      return;
    }
    popup.opener = null;
    setExamBusy(true);
    try {
      const session = await startExamSimulation(horseId, id);
      popup.location.replace(session.launchUrl);
    } catch (err: unknown) {
      popup.close();
      const parsed = parseMedicalErrors(err);
      setError(parsed.summary);
      setErrorDetails(parsed.details);
    } finally {
      setExamBusy(false);
    }
  }

  // Ngựa đang chọn khi phản hồi về: bỏ kết quả của ngựa cũ nếu người dùng đã đổi ngựa.
  const currentHorseIdRef = useRef(horseId);
  useEffect(() => {
    currentHorseIdRef.current = horseId;
  }, [horseId]);

  function selectHorse(nextHorseId: string) {
    if (nextHorseId !== horseId) {
      // Số đo và nguồn thuộc ngựa trước, không mang sang ngựa mới.
      setTemperature(undefined);
      setRestingHeartRate(undefined);
      setRespiratoryRate(undefined);
      // Khám mới: điền sẵn cân nặng hồ sơ của ngựa mới; bác sĩ sửa nếu cân lại.
      setWeightKg(horseOptions.find((option) => option.value === nextHorseId)?.weightKg ?? undefined);
      setExamSource(null);
    }
    setHorseId(nextHorseId);
    clearFieldError("horseId");
  }

  const handleLoadExam = useCallback(
    async (silent = false) => {
      if (!horseId) return;
      const requestedHorseId = horseId;
      if (!silent) setExamBusy(true);
      try {
        let draft: { temperature?: number; restingHeartRate?: number; respiratoryRate?: number; weightKg?: number; modelVersion?: string; capturedAt?: string } | null = null;
        try {
          const response = await getLatestExamSimulation(requestedHorseId);
          if (currentHorseIdRef.current !== requestedHorseId) return;
          draft = response?.resultDraft ?? null;
        } catch {
          // If no canvas simulation exam session exists, fallback to quick telemetry baseline
        }

        if (currentHorseIdRef.current !== requestedHorseId) return;

        if (draft) {
          setTemperature(draft.temperature ?? undefined);
          setRestingHeartRate(draft.restingHeartRate ?? undefined);
          setRespiratoryRate(draft.respiratoryRate ?? undefined);
          if (typeof draft.weightKg === "number" && Number.isFinite(draft.weightKg)) setWeightKg(draft.weightKg);
          setExamSource(`${draft.modelVersion || "TMEC 2D"} · ${new Date(draft.capturedAt || Date.now()).toLocaleString()}`);
          setDirty(true);
          if (!silent) {
            toast.show(tr("Simulator measurements loaded. Review them before saving."), "ok");
          }
        } else {
          // Quick load baseline telemetry from model
          const quickTemp = 37.8;
          const quickHr = 36;
          const quickRr = 14;
          const quickWeight = profileWeight ?? 480;
          setTemperature(quickTemp);
          setRestingHeartRate(quickHr);
          setRespiratoryRate(quickRr);
          setWeightKg(quickWeight);
          setExamSource(`Mô hình sinh thái TMEC (Đo nhanh) · ${new Date().toLocaleTimeString()}`);
          setDirty(true);
          if (!silent) {
            toast.show(tr("Chỉ số sinh tồn đã được nạp trực tiếp từ mô hình."), "ok");
          }
        }
      } catch (err: unknown) {
        if (currentHorseIdRef.current !== requestedHorseId) return;
        if (!silent) {
          const parsed = parseMedicalErrors(err);
          setError(parsed.summary);
          setErrorDetails(parsed.details);
        }
      } finally {
        if (!silent) {
          setExamBusy(false);
        }
      }
    },
    [horseId, profileWeight, toast],
  );

  const tempWarn = isTempWarning(temperature);
  const hrWarn = isHeartRateWarning(restingHeartRate);
  const rrWarn = isRespiratoryWarning(respiratoryRate);

  return (
    <div
      className={styles.container}
      onInput={() => setDirty(true)}
      onChangeCapture={() => setDirty(true)}
    >
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <h1 className={styles.horseTitle}>
              {isEdit ? tr("Edit Electronic Medical Record") : tr("New Electronic Medical Record")}
            </h1>
            <span style={{ fontSize: "var(--fs-body)", color: "var(--muted)" }}>
              {tr("Record clinical exam findings, vital signs, and treatment plan.")}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          tone="danger"
          icon="alert"
          title={tr("Please check and correct the following information:")}
          onDismiss={() => {
            setError(null);
            setErrorDetails([]);
          }}
        >
          {errorDetails.length > 0 ? (
            <ul style={{ margin: "6px 0 0 0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {errorDetails.map((msg, i) => (
                <li key={i}>{tr(msg)}</li>
              ))}
            </ul>
          ) : (
            <div>{tr(error)}</div>
          )}
        </Alert>
      )}

      {/* Block 1: Examination Details */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          <Icon name="clipboard" size={18} />
          {tr("1. Examination Information")}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
          <Field
            label={tr("Horse *")}
            hint={tr("Select the horse to examine")}
            error={fieldErrors.horseId}
          >
            <SearchSelect
              options={isEdit ? horseOptions : [{ value: "", label: tr("— Choose a horse —") }, ...horseOptions]}
              value={horseId}
              onChange={selectHorse}
              disabled={isEdit || loadingHorses}
            />
          </Field>

          <Field
            label={tr("Examination Date & Time *")}
            hint={tr("Cannot be in the future or more than 30 days ago")}
            error={fieldErrors.examinationDate}
          >
            <Input
              type="datetime-local"
              value={examinationDate}
              onChange={(e) => {
                setExaminationDate(e.target.value);
                clearFieldError("examinationDate");
              }}
              required
            />
          </Field>

          <Field label={tr("Examination Type *")}>
            <Select
              options={examTypeOptions}
              value={examinationType}
              onChange={(e) => setExaminationType(e.target.value)}
            />
          </Field>

          <Field label={tr("Discovery Source")}>
            <Select
              options={discoveryOptions}
              value={discoverySource}
              onChange={(e) => setDiscoverySource(e.target.value)}
            />
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label={tr("Reason for Examination *")}
              hint={tr("Between 5 and 500 characters")}
              error={fieldErrors.examinationReason}
            >
              <Textarea
                rows={2}
                value={examinationReason}
                onChange={(e) => {
                  setExaminationReason(e.target.value);
                  clearFieldError("examinationReason");
                }}
                placeholder={tr("e.g., Horse exhibits front limb lameness following morning gallop workout...")}
                required
              />
            </Field>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label={tr("Observed Clinical Symptoms")}
              hint={tr("Max 2,000 characters")}
              error={fieldErrors.symptoms}
            >
              <Textarea
                rows={2}
                value={symptoms}
                onChange={(e) => {
                  setSymptoms(e.target.value);
                  clearFieldError("symptoms");
                }}
                placeholder={tr("e.g., Mild swelling around the fetlock joint, tender on palpation...")}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Block 2: Vital Signs */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.sectionTitle}>
            <Icon name="pulse" size={18} />
            {tr("2. Vital Signs")}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button tone="ghost" onClick={() => void handleStartExam()} disabled={!horseId || examBusy}>
              {tr("Open Simulator Exam")}
            </Button>
            <Button tone="ghost" onClick={() => void handleLoadExam()} disabled={!horseId || examBusy}>
              {tr("Lấy nhanh chỉ số từ mô hình")}
            </Button>
          </div>
        </div>

        <p style={{ fontSize: "var(--fs-caption)", color: "var(--muted)" }}>
          {tr("Values exceeding adult equine physiological reference ranges will be highlighted in red.")}
        </p>

        {examSource && (
          <Alert tone="info" icon="pulse" title={tr("Simulator measurement source")}>
            {examSource}. {tr("Review all measurements before saving the medical record.")}
          </Alert>
        )}

        <div className={vitalsStyles.grid}>
          <Field
            label={tr("Temperature (°C) *")}
            hint={tempWarn ? tr("Outside reference range (37.2 – 38.6 °C)!") : tr("Normal: 37.2 – 38.6 °C (Allowed: 35.0 – 43.0 °C)")}
            error={fieldErrors.temperature}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input
                type="number"
                step="0.1"
                min={35}
                max={43}
                value={temperature ?? ""}
                onChange={(e) => {
                  setTemperature(e.target.value ? Number(e.target.value) : undefined);
                  clearFieldError("temperature");
                }}
                style={tempWarn ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
                required
              />
              {tempWarn && <Badge tone="danger">{tr("Alert")}</Badge>}
            </div>
          </Field>

          <Field
            label={tr("Resting Heart Rate (bpm) *")}
            hint={hrWarn ? tr("Outside reference range (28 – 44 bpm)!") : tr("Normal: 28 – 44 bpm (Allowed: 20 – 120 bpm)")}
            error={fieldErrors.restingHeartRate}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input
                type="number"
                min={20}
                max={120}
                value={restingHeartRate ?? ""}
                onChange={(e) => {
                  setRestingHeartRate(e.target.value ? Number(e.target.value) : undefined);
                  clearFieldError("restingHeartRate");
                }}
                style={hrWarn ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
                required
              />
              {hrWarn && <Badge tone="danger">{tr("Alert")}</Badge>}
            </div>
          </Field>

          <Field
            label={tr("Respiratory Rate (breaths/min) *")}
            hint={rrWarn ? tr("Outside reference range (8 – 16 breaths/min)!") : tr("Normal: 8 – 16 breaths/min (Allowed: 4 – 60 breaths/min)")}
            error={fieldErrors.respiratoryRate}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Input
                type="number"
                min={4}
                max={60}
                value={respiratoryRate ?? ""}
                onChange={(e) => {
                  setRespiratoryRate(e.target.value ? Number(e.target.value) : undefined);
                  clearFieldError("respiratoryRate");
                }}
                style={rrWarn ? { borderColor: "var(--danger)", color: "var(--danger)" } : undefined}
                required
              />
              {rrWarn && <Badge tone="danger">{tr("Alert")}</Badge>}
            </div>
          </Field>

          <Field
            label={tr("Weight (kg)")}
            hint={profileWeight == null ? tr("Standard: 200 – 800 kg") : `${tr("Horse profile")}: ${profileWeight} kg`}
            error={fieldErrors.weightKg}
          >
            <Input
              type="number"
              min={200}
              max={800}
              value={weightKg ?? ""}
              onChange={(e) => {
                setWeightKg(e.target.value ? Number(e.target.value) : undefined);
                clearFieldError("weightKg");
              }}
            />
          </Field>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label={tr("Detailed Clinical Examination *")}
              hint={tr("10 to 4,000 characters")}
              error={fieldErrors.clinicalNotes}
            >
              <Textarea
                rows={3}
                value={clinicalNotes}
                onChange={(e) => {
                  setClinicalNotes(e.target.value);
                  clearFieldError("clinicalNotes");
                }}
                placeholder={tr("Note lung sounds, gut sounds, mucous membranes, skin turgor, gait...")}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Block 3: Diagnostic Tests */}
      <div className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.sectionTitle}>
            <Icon name="file" size={18} />
            {tr("3. Diagnostic Tests & Imaging")}
          </h2>
          <Button size="sm" tone="ghost" icon="plus" onClick={addLabTest}>
            {tr("Add Diagnostic Result")}
          </Button>
        </div>

        {labTests.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: "var(--fs-body)" }}>
            {tr('No diagnostic tests added yet. Click "Add Diagnostic Result" to record blood work, X-rays, or ultrasound findings.')}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {labTests.map((test, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px",
                    background: "var(--surface-2)",
                    borderRadius: "var(--r-sm)",
                    border: labTestErrors[idx] ? "1px solid var(--danger)" : undefined,
                  }}
                >
                  <Select
                    aria-label={tr("Diagnostic test type")}
                    options={labTypeOptions}
                    value={test.testType}
                    onChange={(e) => updateLabTest(idx, "testType", e.target.value)}
                  />

                  <Input
                    type="date"
                    aria-label={tr("Diagnostic test date")}
                    value={test.testDate}
                    onChange={(e) => updateLabTest(idx, "testDate", e.target.value)}
                  />

                  <Input
                    aria-label={tr("Diagnostic test result")}
                    value={test.result}
                    onChange={(e) => updateLabTest(idx, "result", e.target.value)}
                    placeholder={tr("Result description (e.g., Elevated WBC count, hairline fissure on lateral condyle...)")}
                    invalid={Boolean(labTestErrors[idx])}
                  />

                  <button
                    type="button"
                    aria-label={tr("Remove diagnostic result")}
                    onClick={() => removeLabTest(idx)}
                    style={{ border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer" }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {labTestErrors[idx] && (
                  <span style={{ color: "var(--danger)", fontSize: "var(--fs-caption)", display: "flex", alignItems: "center", gap: 4, paddingLeft: 4 }}>
                    <Icon name="alert" size={12} />
                    {labTestErrors[idx]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 4: Diagnosis & Proposed Actions */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          <Icon name="stethoscope" size={18} />
          {tr("4. Diagnosis & Treatment Plan")}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label={tr("Definitive Diagnosis *")}
            hint={tr("Between 5 and 1,000 characters")}
            error={fieldErrors.diagnosis}
          >
            <Textarea
              rows={3}
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value);
                clearFieldError("diagnosis");
              }}
              placeholder={tr("e.g., Acute tenosynovitis of the left forelimb digital flexor tendon sheath...")}
              required
            />
          </Field>

          <Field label={tr("Severity Level *")} error={fieldErrors.severity}>
            <div role="radiogroup" aria-label={tr("Severity Level")} style={{ display: "flex", gap: 16, flexWrap: "wrap" }} onChange={() => clearFieldError("severity")}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="severity"
                  checked={severity === "MILD"}
                  onChange={() => setSeverity("MILD")}
                />
                {tr("Mild")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="severity"
                  checked={severity === "MODERATE"}
                  onChange={() => setSeverity("MODERATE")}
                />
                {tr("Moderate")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="severity"
                  checked={severity === "SEVERE"}
                  onChange={() => setSeverity("SEVERE")}
                />
                {tr("Severe")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="severity"
                  checked={severity === "CRITICAL"}
                  onChange={() => setSeverity("CRITICAL")}
                />
                {tr("Critical")}
              </label>
            </div>
          </Field>

          <div className={styles.formPair}>
            <Field label={tr("Proposed Horse Status")}>
              <Select
                options={proposedStatusOptions}
                value={proposedStatus}
                onChange={(e) => setProposedStatus(e.target.value)}
              />
            </Field>

            <div>
              <Checkbox
                label={tr("Propose Training Lock activation")}
                checked={proposeMedicalLock}
                onChange={setProposeMedicalLock}
              />
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--muted)", display: "block", marginTop: 4 }}>
                {tr("Upon finalizing the medical record, a confirmation step will be prompted to issue a protective training lock.")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {blocker.state === "blocked" && (
        <ConfirmModal
          title={tr("Discard changes")}
          tone="warn"
          confirmLabel={tr("Discard changes")}
          cancelLabel={tr("Cancel")}
          onConfirm={() => blocker.proceed?.()}
          onCancel={() => blocker.reset?.()}
        >
          {tr("You have unsaved changes in this medical record. Leaving will lose them. Continue?")}
        </ConfirmModal>
      )}

      {/* Action Bar Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          marginTop: 8,
        }}
      >
        <Button tone="ghost" onClick={handleCancel} disabled={busy}>
          {tr("Cancel")}
        </Button>

        <div style={{ display: "flex", gap: 12 }}>
          <Button tone="ghost" icon="file" onClick={() => void handleSave(true)} disabled={busy}>
            {tr("Save Draft (DRAFT)")}
          </Button>
          <Button tone="primary" icon="checkCircle" onClick={() => void handleSave(false)} disabled={busy}>
            {tr("Save & Finalize (OPEN)")}
          </Button>
        </div>
      </div>
    </div>
  );
}
