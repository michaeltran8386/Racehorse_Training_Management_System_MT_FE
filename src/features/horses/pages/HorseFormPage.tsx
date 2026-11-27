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
  "Mong muốn xếp lịch thẩm định vào buổi sáng (08:30 – 11:00).",
  "Mong muốn gửi nuôi dài hạn kết hợp giáo án huấn luyện thể lực.",
  "Ngựa hơi nhạy cảm với tiếng động lớn, mong được tiếp đón nhẹ nhàng.",
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

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const twelveYearsAgo = new Date();
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
      errs.declaration = "Vui lòng xác nhận cam kết thông tin hồ sơ trước khi nộp.";
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
        toast.show(`Horse profile ${saved.name} updated successfully.`, "ok");
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
            ? `Đã nộp lại hồ sơ đăng ký cho chiến mã ${saved.name}!`
            : `Đã nộp hồ sơ đăng ký chiến mã ${saved.name} thành công!`,
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
          setErrors((prev) => ({ ...prev, name: "Horse name already exists in the stable system." }));
        } else if (err.code === "DUPLICATE_MICROCHIP") {
          setErrors((prev) => ({ ...prev, microchip: "Microchip number is already registered to another horse." }));
        } else if (err.code === "INVALID_DOB") {
          setErrors((prev) => ({ ...prev, dob: localizeServerText(err.message) || tr("Invalid date of birth.") }));
        } else {
          setGeneralError(localizeServerText(err.message) || tr("An error occurred while saving the horse profile."));
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
            ? tr(`Edit ${name || horseCode}`)
            : reapplyId
              ? `Nộp lại hồ sơ tiếp nhận — ${name || "Chiến mã"}`
              : "Tờ khai đăng ký tiếp nhận chiến mã"
        }
        description={
          isEdit
            ? tr("Update identity and profile details.")
            : "Cung cấp đầy đủ thông tin chiến mã, ảnh giấy tờ pháp lý và ghi chú mong muốn (theo mẫu nộp hồ sơ trực tuyến)."
        }
      />

      {reapplyId && (
        <Alert tone="info" title="Đang nộp lại hồ sơ dựa trên dữ liệu cũ">
          Hệ thống đã điền sẵn thông tin chiến mã và mã Microchip cũ. Hãy kiểm tra lại giấy tờ pháp lý / ghi chú mong muốn trước khi bấm nộp hồ sơ.
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
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border-subtle, #e2e8f0)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Phần II: Thành phần hồ sơ pháp lý đính kèm */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <h3 className={styles.sectionTitle} style={{ marginBottom: 4 }}>
                  Phần II · Thành phần hồ sơ pháp lý đính kèm (Ảnh)
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                  Đính kèm ảnh chụp Giấy chứng nhận sở hữu / Hộ chiếu ngựa, Phả hệ hoặc Sổ tiêm phòng (tối đa 3 ảnh) để Quản lý CLB kiểm tra trước khi xếp lịch hẹn.
                </p>
              </div>
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

            {/* Phần III: Ghi chú & Mong muốn của Chủ ngựa */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div>
                <h3 className={styles.sectionTitle} style={{ marginBottom: 4 }}>
                  Phần III · Ghi chú &amp; Mong muốn gửi CLB (Tùy chọn)
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                  Nhắn cho Quản lý CLB khung giờ thuận tiện mang ngựa tới, mục tiêu huấn luyện/nuôi dưỡng hoặc đặc điểm cần lưu ý của ngựa.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {QUICK_OWNER_WISHES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setOwnerNotes((prev) =>
                        prev.includes(preset)
                          ? prev
                          : prev.trim()
                            ? `${prev.trim()}\n- ${preset}`
                            : `- ${preset}`,
                      );
                      setIsDirty(true);
                    }}
                    style={{
                      border: "1px solid var(--border, #cbd5e1)",
                      background: "var(--surface-subtle, #f8fafc)",
                      color: "var(--text, #0f172a)",
                      borderRadius: "999px",
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <Field
                label="Nội dung ghi chú / Mong muốn của chủ ngựa"
                hint={`${ownerNotes.length}/1000 ký tự — Quản lý CLB sẽ đọc ngay trước khi xếp lịch hẹn.`}
              >
                <Textarea
                  rows={4}
                  maxLength={1000}
                  value={ownerNotes}
                  disabled={submitting}
                  placeholder="Ví dụ: Mình muốn đưa ngựa tới kiểm tra vào sáng thứ 7 (9h00), mong muốn đăng ký gói chăm sóc & luyện sức bền đường trường..."
                  onChange={(e) => {
                    setOwnerNotes(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </Field>

              <div
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "10px",
                  background: "var(--surface-subtle, #f8fafc)",
                  border: "1px solid var(--border-subtle, #e2e8f0)",
                }}
              >
                <Checkbox
                  checked={declarationAccepted}
                  onChange={(checked) => {
                    setDeclarationAccepted(checked);
                    if (checked && errors.declaration) {
                      setErrors((prev) => ({ ...prev, declaration: "" }));
                    }
                  }}
                  label="Tôi cam kết thông tin kê khai và hình ảnh giấy tờ pháp lý đính kèm là trung thực, và sẽ mang theo bản gốc để đối chiếu khi đến thẩm định tại CLB."
                />
                {errors.declaration && (
                  <div style={{ color: "var(--danger, #dc2626)", fontSize: "0.82rem", marginTop: 6 }}>
                    {errors.declaration}
                  </div>
                )}
              </div>
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
              Nộp &amp; Đăng ký thêm ngựa khác
            </Button>
          )}
          <Button
            tone="primary"
            disabled={submitting || imageBusy || docUploadBusy}
            onClick={() => handleSave(false)}
          >
            {submitting
              ? "Đang gửi hồ sơ..."
              : isEdit
                ? tr("Save Profile")
                : reapplyId
                  ? "Nộp lại hồ sơ đăng ký"
                  : "Nộp hồ sơ đăng ký"}
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
