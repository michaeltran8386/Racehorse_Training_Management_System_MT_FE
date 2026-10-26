import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Field } from "@/shared/components/form/Field";
import { Alert } from "@/shared/components/ui/Alert";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { useToast } from "@/shared/components/ui/Toast";
import { ApiError } from "@/shared/lib/api";
import { getHorseById, createHorse, updateHorse, getHorseCatalog } from "../api";
import type { Horse, CreateHorsePayload, UpdateHorsePayload, HorseCatalogItem } from "../types";


import { tr } from "@/shared/i18n/tr";
const GENDER_OPTIONS = [
  { value: "Stallion", label: "Stallion (male)" },
  { value: "Mare", label: "Mare (female)" },
  { value: "Gelding", label: "Gelding (castrated male)" },
];

/** Hồ sơ cũ còn giới tính Colt / Filly: quy về 3 giá trị của SC-1.02. */
const LEGACY_GENDER: Record<string, string> = { Colt: "Stallion", Filly: "Mare" };

/** Danh sách chọn từ danh mục SC-1.06; giá trị đang lưu đã ngừng dùng vẫn hiện kèm "(no longer in use)". */
function catalogOptions(items: HorseCatalogItem[], current: string) {
  const options = items.map((i) => ({ value: i.name, label: i.name }));
  if (current && !items.some((i) => i.name.toLowerCase() === current.toLowerCase())) {
    options.unshift({ value: current, label: `${current} (no longer in use)` });
  }
  return [{ value: "", label: "— Select —" }, ...options];
}

function generateMicrochip15(): string {
  const random12 = Math.floor(Math.random() * 1e12)
    .toString()
    .padStart(12, "0");
  return `985${random12}`;
}

export default function HorseFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [retiredError, setRetiredError] = useState(false);

  // Form fields (tự sinh mã microchip nếu tạo mới)
  const [horseCode, setHorseCode] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [breeds, setBreeds] = useState<HorseCatalogItem[]>([]);
  const [colors, setColors] = useState<HorseCatalogItem[]>([]);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Stallion");
  const [color, setColor] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [microchip, setMicrochip] = useState(() => (isEdit ? "" : generateMicrochip15()));

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const twelveYearsAgo = new Date();
  twelveYearsAgo.setFullYear(now.getFullYear() - 12);
  const minDobStr = twelveYearsAgo.toISOString().split("T")[0];

  useEffect(() => {
    if (!id) return;
    let active = true;
    getHorseById(id)
      .then((horse: Horse) => {
        if (!active) return;
        if (horse.status === "RETIRED") {
          setRetiredError(true);
          return;
        }
        setHorseCode(horse.horseCode || "");
        setName(horse.name || "");
        setBreed(horse.breed || "");
        setDob(horse.dob ? horse.dob.split("T")[0] : "");
        setGender(LEGACY_GENDER[horse.gender] ?? horse.gender ?? "Stallion");
        setColor(horse.color || "");
        setWeightKg(horse.weightKg != null ? String(horse.weightKg) : "");
        setMicrochip(horse.microchip || horse.microchipRfid || "");
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? err.message : "Horse profile not found.";
        setGeneralError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Giống / Màu lông lấy từ danh mục SC-1.06 (chỉ mục đang dùng).
  useEffect(() => {
    Promise.all([getHorseCatalog("BREED", "ACTIVE"), getHorseCatalog("COLOR", "ACTIVE")])
      .then(([b, c]) => {
        setBreeds(b);
        setColors(c);
      })
      .catch(() => setGeneralError("Could not load the breed and coat colour lists. Reload the page."));
  }, []);

  // Cảnh báo người dùng khi reload hoặc tắt tab mà có thay đổi chưa lưu (FR-1.26)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = "Horse name is required.";
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errs.name = "Horse name must be between 2 and 100 characters.";
    } else if (!/^[\p{L}\p{N}\s'.-]+$/u.test(name.trim())) {
      errs.name = "Horse name can only contain letters (accents allowed), numbers, spaces, and ' - .";
    }

    if (!breed) {
      errs.breed = "Please select a horse breed.";
    }

    if (!dob) {
      errs.dob = "Date of birth is required.";
    } else {
      const birth = new Date(dob);
      const now = new Date();
      const twelveYearsAgo = new Date();
      twelveYearsAgo.setFullYear(now.getFullYear() - 12);

      if (birth > now) {
        errs.dob = "Date of birth cannot be in the future.";
      } else if (birth < twelveYearsAgo) {
        errs.dob = "A horse can be registered up to 12 years old.";
      }
    }

    if (!gender) {
      errs.gender = "Please select a gender.";
    }

    if (!color) {
      errs.color = "Please select a coat color.";
    }

    if (!weightKg.trim()) {
      errs.weightKg = "Cân nặng là bắt buộc.";
    } else {
      const numW = Number(weightKg);
      if (isNaN(numW) || numW <= 0) {
        errs.weightKg = "Cân nặng phải lớn hơn 0 kg.";
      }
    }

    // Microchip: khi tạo, để trống thì hệ thống tự sinh; khi sửa phải giữ số thật (không tự sinh số mới).
    if (isEdit && !microchip.trim()) {
      errs.microchip = "Microchip number is required.";
    } else if (microchip.trim() && !/^\d{15}$/.test(microchip.trim())) {
      errs.microchip = "Microchip number must consist of exactly 15 digits.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(andAddAnother = false) {
    if (!validate()) return;
    setSubmitting(true);
    setGeneralError("");

    // Chỉ tự sinh khi tạo mới. Khi sửa: giữ nguyên số microchip.
    const finalMicrochip = isEdit ? microchip.trim() : microchip.trim() || generateMicrochip15();

    try {
      if (isEdit && id) {
        const payload: UpdateHorsePayload = {
          name: name.trim(),
          breed,
          dob,
          gender,
          color,
          weightKg: weightKg.trim() ? Number(weightKg) : undefined,
          microchip: finalMicrochip,
        };
        const saved = await updateHorse(id, payload);
        toast.show(`Horse profile ${saved.name} updated successfully.`, "ok");
        setIsDirty(false);
        navigate(`/horses/${saved.id}`);
      } else {
        const payload: CreateHorsePayload = {
          name: name.trim(),
          breed,
          dob,
          gender,
          color,
          weightKg: weightKg.trim() ? Number(weightKg) : undefined,
          microchip: finalMicrochip,
        };
        const saved = await createHorse(payload);
        toast.show(`Horse profile ${saved.name} created successfully.`, "ok");

        if (andAddAnother) {
          setName("");
          setDob("");
          setWeightKg("");
          setMicrochip(generateMicrochip15());
          setErrors({});
          setIsDirty(false);
        } else {
          setIsDirty(false);
          navigate(`/horses/${saved.id}`);
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === "DUPLICATE_NAME") {
          setErrors((prev) => ({ ...prev, name: "Horse name already exists in the stable system." }));
        } else if (err.code === "DUPLICATE_MICROCHIP") {
          setErrors((prev) => ({ ...prev, microchip: "Microchip number is already registered to another horse." }));
        } else if (err.code === "INVALID_DOB") {
          setErrors((prev) => ({ ...prev, dob: err.message || "Invalid date of birth." }));
        } else {
          setGeneralError(err.message || "An error occurred while saving the horse profile.");
        }
      } else {
        setGeneralError("Server connection error. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      navigate(-1);
    }
  }

  if (retiredError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader
          title={tr("Retired Horse Record")}
          description={tr("This horse has been retired. Please reactivate prior to performing profile edits.")}
        />
        <Card pad={24}>
          <Alert tone="warn" title={tr("Editing Restricted")}>
            {tr("This horse is marked as Retired. Historical profiles cannot be modified without reactivation.")}
          </Alert>
          <div style={{ marginTop: "1rem" }}>
            <Link to={id ? `/horses/${id}` : "/horses"}>
              <Button tone="secondary">{tr("Back to Profile")}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader title={isEdit ? tr("Edit horse profile") : tr("Register horse")} />
        <Card pad={32}>
          <p style={{ color: "var(--ink-muted)" }}>{tr("Loading horse profile data...")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={isEdit ? tr(`Edit ${name || horseCode}`) : tr("Register horse")}
        description={
          isEdit
            ? tr("Update identity and profile details.")
            : tr("Enter identity details to register a new horse.")
        }
        action={
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button tone="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            {!isEdit && (
              <Button
                tone="secondary"
                disabled={submitting}
                onClick={() => handleSave(true)}
              >
                Save & Add Another
              </Button>
            )}
            <Button
              tone="primary"
              disabled={submitting}
              onClick={() => handleSave(false)}
            >
              {submitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        }
      />

      {generalError && (
        <Alert tone="danger" title={tr("Error")}>
          {generalError}
        </Alert>
      )}

      <Card pad={24}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {/* Column 1: Identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-body-lg)", fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              {tr("Identity Details")}
            </h3>

            <Field label={tr("Horse Code (ID)")} hint={tr("Generated upon save (HR-XXXXXX)")}>
              <Input
                value={isEdit ? horseCode : tr("Auto-generated on save")}
                disabled
                readOnly
              />
            </Field>

            <Field label={tr("Horse Name *")} error={errors.name} hint={tr("2 to 100 characters")}>
              <Input
                placeholder={tr("Enter horse name...")}
                value={name}
                invalid={Boolean(errors.name)}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDirty(true);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
            </Field>

            <Field
              label={tr("Microchip Number *")}
              error={errors.microchip}
              hint={tr("15-digit ISO microchip number")}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  placeholder={tr("15 digits")}
                  value={microchip}
                  invalid={Boolean(errors.microchip)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 15);
                    setMicrochip(val);
                    setIsDirty(true);
                    if (errors.microchip) setErrors((prev) => ({ ...prev, microchip: "" }));
                  }}
                />
                {!isEdit && (
                  <Button
                    type="button"
                    tone="secondary"
                    onClick={() => {
                      setMicrochip(generateMicrochip15());
                      setIsDirty(true);
                      if (errors.microchip) setErrors((prev) => ({ ...prev, microchip: "" }));
                    }}
                    title={tr("Generate a new 15-digit number")}
                  >
                    {tr("Generate")}
                  </Button>
                )}
              </div>
            </Field>
          </div>

          {/* Column 2: Traits & Pedigree */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "var(--fs-body-lg)", fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              {tr("Physical Traits")}
            </h3>

            <Field label={tr("Breed *")} error={errors.breed}>
              <Select
                value={breed}
                options={catalogOptions(breeds, breed)}
                onChange={(e) => {
                  setBreed(e.target.value);
                  setIsDirty(true);
                }}
              />
            </Field>

            <Field
              label={tr("Date of Birth *")}
              error={errors.dob}
              hint={tr(`Max 12 years (${minDobStr} – ${todayStr})`)}
            >
              <Input
                type="date"
                value={dob}
                min={minDobStr}
                max={todayStr}
                invalid={Boolean(errors.dob)}
                onChange={(e) => {
                  setDob(e.target.value);
                  setIsDirty(true);
                  if (errors.dob) setErrors((prev) => ({ ...prev, dob: "" }));
                }}
              />
            </Field>

            <Field label={tr("Gender *")} error={errors.gender}>
              <Select
                value={gender}
                options={GENDER_OPTIONS}
                onChange={(e) => {
                  setGender(e.target.value);
                  setIsDirty(true);
                }}
              />
            </Field>

            <Field label={tr("Coat Color *")} error={errors.color}>
              <Select
                value={color}
                options={catalogOptions(colors, color)}
                onChange={(e) => {
                  setColor(e.target.value);
                  setIsDirty(true);
                }}
              />
            </Field>

            <Field
              label={tr("Weight (kg) *")}
              error={errors.weightKg}
              hint={tr("Enter horse body weight in kg (greater than 0)")}
            >
              <Input
                type="number"
                step="any"
                min={1}
                placeholder={tr("e.g. 480")}
                value={weightKg}
                invalid={Boolean(errors.weightKg)}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  setIsDirty(true);
                  if (errors.weightKg) setErrors((prev) => ({ ...prev, weightKg: "" }));
                }}
              />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button tone="secondary" onClick={handleCancel}>
            {tr("Cancel")}
          </Button>
          {!isEdit && (
            <Button
              tone="secondary"
              disabled={submitting}
              onClick={() => handleSave(true)}
            >
              {tr("Save & Add Another")}
            </Button>
          )}
          <Button
            tone="primary"
            disabled={submitting}
            onClick={() => handleSave(false)}
          >
            {submitting ? tr("Saving...") : tr("Save Profile")}
          </Button>
        </div>
      </Card>

      {/* Discard changes modal */}
      {showCancelConfirm && (
        <ConfirmModal
          title={tr("Discard Unsaved Changes")}
          confirmLabel={tr("Discard & Leave")}
          cancelLabel={tr("Keep Editing")}
          tone="danger"
          onConfirm={() => {
            setShowCancelConfirm(false);
            setIsDirty(false);
            navigate(-1);
          }}
          onCancel={() => setShowCancelConfirm(false)}
        >
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            {tr("You have unsaved changes on this form. If you leave now, all input will be lost. Are you sure you want to discard?")}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
