import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { ImagePicker } from "@/shared/components/form/ImagePicker";
import { Textarea } from "@/shared/components/form/Textarea";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { HORSE_AVATAR_PRESETS } from "../constants/avatars";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./HorseFormPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Field } from "@/shared/components/form/Field";
import { Alert } from "@/shared/components/ui/Alert";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { useToast } from "@/shared/components/ui/Toast";
import { ApiError } from "@/shared/lib/api";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { getHorseById, createHorse, updateHorse, getHorseCatalog } from "../api";
import { extractAdmissionDocumentPhotos } from "../services/admissionService";
import { LegalDocumentsUploader } from "../components/LegalDocumentsUploader";
import type { Horse, CreateHorsePayload, UpdateHorsePayload, HorseCatalogItem } from "../types";
import type { AdmissionDocumentPhoto } from "../types/admission.types";


import { localizeServerText, tr } from "@/shared/i18n/tr";
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

function generateIsoMicrochip(): string {
  const prefix = "985";
  const timePart = String(Date.now()).slice(-8);
  const randPart = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${timePart}${randPart}`;
}

const QUICK_OWNER_WISHES = [
  { label: "+ Hẹn buổi sáng", text: "Prefer a morning inspection slot (08:30 – 11:00)." },
  { label: "+ Gửi nuôi & tập luyện", text: "Looking for long-term boarding combined with a physical conditioning plan." },
  { label: "+ Ngựa nhạy tiếng ồn", text: "Horse is sensitive to loud noises, please handle gently upon arrival." },
];

export default function HorseFormPage() {
  useScreenTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const reapplyId = !id ? searchParams.get("reapply") : null;
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit || Boolean(reapplyId));
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [retiredError, setRetiredError] = useState(false);

  // Form fields
  const [horseCode, setHorseCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [breeds, setBreeds] = useState<HorseCatalogItem[]>([]);
  const [colors, setColors] = useState<HorseCatalogItem[]>([]);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Stallion");
  const [color, setColor] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [microchip, setMicrochip] = useState(() => (!id && !reapplyId ? generateIsoMicrochip() : ""));
  const [documentPhotos, setDocumentPhotos] = useState<AdmissionDocumentPhoto[]>([]);
  const [ownerNotes, setOwnerNotes] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(true);
  const currentUser = useCurrentUser();
  // Chủ ngựa tự đăng ký: ngựa mới luôn thuộc tài khoản đang đăng nhập.
  const [ownerName, setOwnerName] = useState(currentUser.fullName);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const now = effectiveClubNow();
  const todayStr = now.toISOString().split("T")[0];
  const twelveYearsAgo = effectiveClubNow();
  twelveYearsAgo.setFullYear(now.getFullYear() - 12);
  const minDobStr = twelveYearsAgo.toISOString().split("T")[0];

  useEffect(() => {
    const sourceId = id || reapplyId;
    if (!sourceId) return;
    let active = true;
    getHorseById(sourceId)
      .then((horse: Horse) => {
        if (!active) return;
        if (id && horse.status === "RETIRED") {
          setRetiredError(true);
          return;
        }
        setHorseCode(horse.horseCode || "");
        setAvatarUrl(horse.avatarUrl || "");
        setName(horse.name || "");
        setBreed(horse.breed || "");
        setDob(horse.dob ? horse.dob.split("T")[0] : "");
        setGender(LEGACY_GENDER[horse.gender] ?? horse.gender ?? "Stallion");
        setColor(horse.color || "");
        setWeightKg(horse.weightKg != null ? String(horse.weightKg) : "");
        setMicrochip(horse.microchip || horse.microchipRfid || "");
        setOwnerName(horse.owner?.fullName || horse.ownerName || currentUser.fullName);
        if (reapplyId && horse.latestAdmission) {
          setOwnerNotes(horse.latestAdmission.ownerNotes || "");
          setDocumentPhotos(extractAdmissionDocumentPhotos(horse.latestAdmission));
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? localizeServerText(err.message) : tr("Horse profile not found.");
        setGeneralError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reapplyId, currentUser.fullName]);

  // Giống / Màu lông lấy từ danh mục SC-1.06 (chỉ mục đang dùng)
  useEffect(() => {
    Promise.all([getHorseCatalog("BREED", "ACTIVE"), getHorseCatalog("COLOR", "ACTIVE")])
      .then(([b, c]) => {
        setBreeds(b);
        setColors(c);
      })
      .catch(() => setGeneralError(tr("Could not load form lists. Reload the page.")));
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
      const now = effectiveClubNow();
      const twelveYearsAgo = effectiveClubNow();
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

    if (!weightKg.trim() && !isEdit) {
      errs.weightKg = "Weight is required.";
    } else if (weightKg.trim()) {
      const numW = Number(weightKg);
      if (!Number.isFinite(numW) || numW < 0.01) {
        errs.weightKg = "Weight must be greater than 0 kg.";
      }
    }

    // Microchip: như thẻ CCCD của ngựa, bắt buộc nhập, không tự sinh ngẫu nhiên
    if (!microchip.trim()) {
      errs.microchip = "Microchip number is required.";
    } else if (!/^\d{15}$/.test(microchip.trim())) {
      errs.microchip = "Microchip number must consist of exactly 15 digits.";
    }

    if (!isEdit && !declarationAccepted) {
      errs.declaration = "Please confirm the declaration before submitting.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(andAddAnother = false) {
    if (imageBusy || docUploadBusy || submitting || !validate()) return;
    setSubmitting(true);
    setGeneralError("");

    const finalMicrochip = microchip.trim();

    try {
      if (isEdit && id) {
        const payload: UpdateHorsePayload = {
          avatarUrl,
          name: name.trim(),
          breed,
          dob,
          gender,
          color,
          weightKg: weightKg.trim() ? Number(weightKg) : undefined,
          microchip: finalMicrochip,
        };
        const saved = await updateHorse(id, payload);
        toast.show(tr("Horse profile {{name}} updated successfully.", { name: saved.name }), "ok");
        setIsDirty(false);
        navigate(`/horses/${saved.id}`);
      } else {
        const payload: CreateHorsePayload = {
          avatarUrl,
          name: name.trim(),
          breed,
          dob,
          gender,
          color,
          weightKg: Number(weightKg),
          microchip: finalMicrochip,
          ...(documentPhotos.length > 0
            ? {
                documentPhotos,
                documentsUrl: documentPhotos[0].url,
              }
            : {}),
          ...(ownerNotes.trim() ? { ownerNotes: ownerNotes.trim() } : {}),
        };
        const saved = await createHorse(payload);
        toast.show(
          reapplyId
            ? tr("Resubmitted admission dossier for {{name}}!", { name: saved.name })
            : tr("Submitted admission dossier for {{name}} successfully!", { name: saved.name }),
          "ok",
        );

        if (andAddAnother) {
          setAvatarUrl("");
          setName("");
          setDob("");
          setWeightKg("");
          setDocumentPhotos([]);
          setOwnerNotes("");
          setMicrochip(generateIsoMicrochip());
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
          setErrors((prev) => ({ ...prev, name: tr("Horse name already exists in the stable system.") }));
        } else if (err.code === "DUPLICATE_MICROCHIP") {
          setErrors((prev) => ({ ...prev, microchip: tr("Microchip number is already registered to another horse.") }));
        } else if (err.code === "INVALID_DOB") {
          setErrors((prev) => ({ ...prev, dob: localizeServerText(err.message) || tr("Invalid date of birth.") }));
        } else {
          setGeneralError(localizeServerText(err.message) || tr("An error occurred while saving the horse profile."));
        }
      } else {
        setGeneralError(tr("Server connection error. Please try again."));
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
            <LinkButton to={id ? `/horses/${id}` : "/horses"} tone="secondary">{tr("Back to Profile")}</LinkButton>
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
        title={
          isEdit
            ? tr("Edit {{name}}", { name: name || horseCode })
            : reapplyId
              ? tr("Resubmit Admission Dossier — {{name}}", { name: name || tr("Horse") })
              : tr("Horse Admission Registration Form")
        }
        description={
          isEdit
            ? tr("Update identity and profile details.")
            : tr("Provide full horse identity details, legal document photos and preferences for online admission.")
        }
      />

      {reapplyId && (
        <Alert tone="info" title={tr("Resubmitting dossier based on previous record")}>
          {tr("Existing horse details and Microchip code have been prefilled. Please review your legal documents and notes before submitting.")}
        </Alert>
      )}

      {generalError && (
        <Alert tone="danger" title={tr("Error")}>
          {generalError}
        </Alert>
      )}

      <Card pad={24}>
        <ImagePicker label={tr("Horse Avatar")} value={avatarUrl}
          onChange={url => { setAvatarUrl(url); setIsDirty(true); }}
          onBusyChange={setImageBusy} disabled={submitting || imageBusy}
          presets={HORSE_AVATAR_PRESETS.map(p => ({ url: p.url, label: p.name, sub: `${tr(p.breed)} · ${tr(p.color)}` }))} />
        <div className={styles.formGrid}>
          {/* Column 1: Identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 className={styles.sectionTitle}>
              {tr("Identity Details")}
            </h3>

            {/* Mã ngựa chỉ có sau khi đăng ký thành công. */}
            {isEdit && (
              <Field label={tr("Horse Code (ID)")}>
                <Input value={horseCode} disabled readOnly />
              </Field>
            )}

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
              error={errors.microchip ? tr(errors.microchip) : undefined}
              hint={tr("15-digit ISO standard electronic microchip")}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Input
                  placeholder={tr("15-digit microchip number")}
                  value={microchip}
                  readOnly
                  invalid={Boolean(errors.microchip)}
                  style={{ flex: 1, background: "var(--surface-2)", cursor: "default" }}
                />
                {!id && (
                  <Button
                    type="button"
                    tone="secondary"
                    icon="refresh"
                    title={tr("Generate new microchip")}
                    onClick={() => {
                      setMicrochip(generateIsoMicrochip());
                      setIsDirty(true);
                      if (errors.microchip) setErrors((prev) => ({ ...prev, microchip: "" }));
                    }}
                  >
                    {tr("Generate")}
                  </Button>
                )}
              </div>
            </Field>

            <Field
              label={tr("Owner")}
            >
              <Input value={ownerName || tr("Unassigned")} disabled readOnly />
            </Field>
          </div>

          {/* Column 2: Traits & Pedigree */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 className={styles.sectionTitle}>
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
              hint={tr("Max 12 years ({{min}} – {{max}})", { min: minDobStr, max: todayStr })}
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
              label={tr(isEdit ? "Weight (kg)" : "Weight (kg) *")}
              error={errors.weightKg}
              hint={tr("Enter horse body weight in kg (greater than 0)")}
            >
              <Input
                type="number"
                step="any"
                min={0.01}
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

        {!isEdit && (
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
            <div className={styles.formGrid}>
              {/* Cột trái: Giấy tờ pháp lý đính kèm */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 className={styles.sectionTitle}>{tr("Legal Documents")}</h3>
                <LegalDocumentsUploader
                  value={documentPhotos}
                  onChange={(next) => {
                    setDocumentPhotos(next);
                    setIsDirty(true);
                  }}
                  disabled={submitting}
                  onBusyChange={setDocUploadBusy}
                  horseName={name}
                  microchip={microchip}
                  ownerName={ownerName}
                />
              </div>

              {/* Cột phải: Ghi chú & Mong muốn gửi CLB */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 className={styles.sectionTitle}>{tr("Notes for the Club")}</h3>
                <Field
                  label={tr("Owner notes / preferences")}
                  hint={tr("{{count}}/1000 characters", { count: ownerNotes.length })}
                >
                  <Textarea
                    rows={3}
                    maxLength={1000}
                    value={ownerNotes}
                    disabled={submitting}
                    placeholder={tr("e.g. I prefer Saturday morning (09:00) for inspection and long-distance conditioning...")}
                    onChange={(e) => {
                      setOwnerNotes(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </Field>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {QUICK_OWNER_WISHES.map((preset) => {
                    const localizedText = tr(preset.text);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setOwnerNotes((prev) =>
                            prev.includes(localizedText)
                              ? prev
                              : prev.trim()
                                ? `${prev.trim()}\n- ${localizedText}`
                                : `- ${localizedText}`,
                          );
                          setIsDirty(true);
                        }}
                        style={{
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--ink-secondary, #475569)",
                          borderRadius: "999px",
                          padding: "3px 10px",
                          fontSize: "0.76rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <Checkbox
                checked={declarationAccepted}
                onChange={(checked) => {
                  setDeclarationAccepted(checked);
                  if (checked && errors.declaration) {
                    setErrors((prev) => ({ ...prev, declaration: "" }));
                  }
                }}
                label={tr("I declare that all provided details and attached legal document photos are truthful, and I will bring originals for verification upon arrival.")}
              />
              {errors.declaration && (
                <div style={{ color: "var(--danger, #dc2626)", fontSize: "0.82rem", marginTop: 4 }}>
                  {tr(errors.declaration)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button tone="secondary" onClick={handleCancel} disabled={submitting || imageBusy || docUploadBusy}>
            {tr("Cancel")}
          </Button>
          {!isEdit && !reapplyId && (
            <Button
              tone="secondary"
              disabled={submitting || imageBusy || docUploadBusy}
              onClick={() => handleSave(true)}
            >
              {tr("Submit & Register Another Horse")}
            </Button>
          )}
          <Button
            tone="primary"
            disabled={submitting || imageBusy || docUploadBusy}
            onClick={() => handleSave(false)}
          >
            {submitting
              ? tr("Submitting dossier...")
              : isEdit
                ? tr("Save Profile")
                : reapplyId
                  ? tr("Resubmit Admission Dossier")
                  : tr("Submit Admission Dossier")}
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
