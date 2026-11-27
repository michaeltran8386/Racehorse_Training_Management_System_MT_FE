import { useId, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Select } from "@/shared/components/form/Select";
import { compressImageFile } from "@/shared/utils/imageCompressor";
import type { AdmissionDocumentPhoto } from "../types/admission.types";
import styles from "./LegalDocumentsUploader.module.css";

export const LEGAL_DOC_TYPE_OPTIONS = [
  { value: "Giấy chứng nhận sở hữu / Hộ chiếu ngựa", label: "Giấy chứng nhận sở hữu / Hộ chiếu ngựa" },
  { value: "Giấy chứng nhận phả hệ (Pedigree)", label: "Giấy chứng nhận phả hệ (Pedigree)" },
  { value: "Sổ tiêm phòng & Kiểm dịch thú y", label: "Sổ tiêm phòng & Kiểm dịch thú y" },
  { value: "Hợp đồng mua bán / Chuyển nhượng", label: "Hợp đồng mua bán / Chuyển nhượng" },
];

const MAX_LEGAL_DOCS = 3;

function buildSampleCertificateSvg(
  kind: "passport" | "vaccine",
  horseName?: string,
  microchip?: string,
  ownerName?: string,
): string {
  const safeHorse = (horseName?.trim() || "CHIEN MA TMEC").slice(0, 28).replace(/[<>&"]/g, "");
  const safeChip = (microchip?.trim() || "985141002341001").slice(0, 20).replace(/[<>&"]/g, "");
  const safeOwner = (ownerName?.trim() || "CHU SO HUU").slice(0, 28).replace(/[<>&"]/g, "");
  const title =
    kind === "passport"
      ? "GIAY CHUNG NHAN SO HUU & HO CHIEU NGUA"
      : "SO TIEM PHONG & KIEM DICH THU Y";
  const subtitle =
    kind === "passport"
      ? "EQUINE OWNERSHIP & PEDIGREE CERTIFICATE"
      : "VETERINARY VACCINATION & QUARANTINE RECORD";
  const accent = kind === "passport" ? "#1d4ed8" : "#0f766e";
  const line3 =
    kind === "passport"
      ? "Tinh trang phap ly: Hop le - Khong tranh chap"
      : "Tiem phong: Cum ngua, Uon van, Tay giun day du";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="560" viewBox="0 0 840 560">
    <rect width="840" height="560" fill="#fffdf7"/>
    <rect x="20" y="20" width="800" height="520" rx="14" fill="none" stroke="${accent}" stroke-width="4"/>
    <rect x="32" y="32" width="776" height="496" rx="10" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="6 4"/>
    <text x="420" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#475569">CONG HOA XA HOI CHU NGHIA VIET NAM — HO SO PHAP LY NGUA DUA</text>
    <text x="420" y="122" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="800" fill="${accent}">${title}</text>
    <text x="420" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#64748b">${subtitle}</text>
    <line x1="80" y1="170" x2="760" y2="170" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="86" y="218" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0f172a">Ten chien ma: ${safeHorse}</text>
    <text x="86" y="256" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">Ma Microchip ISO 11784: ${safeChip}</text>
    <text x="86" y="294" font-family="Arial, sans-serif" font-size="17" fill="#1e293b">Chu so huu khai bao: ${safeOwner}</text>
    <text x="86" y="332" font-family="Arial, sans-serif" font-size="16" fill="#334155">${line3}</text>
    <text x="86" y="370" font-family="Arial, sans-serif" font-size="15" fill="#475569">Ban chup nop truc tuyen tren Cong dich vu TMEC (doi chieu ban goc khi tham dinh)</text>
    <circle cx="660" cy="435" r="56" fill="none" stroke="#dc2626" stroke-width="3.5" opacity="0.82"/>
    <circle cx="660" cy="435" r="46" fill="none" stroke="#dc2626" stroke-width="1.2" opacity="0.82"/>
    <text x="660" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#dc2626">DA XAC THUC</text>
    <text x="660" y="448" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#dc2626">HO SO MAU</text>
    <text x="86" y="458" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Ma chung tu: DOC-${kind === "passport" ? "OWN" : "VAC"}-2026</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface GalleryProps {
  photos: AdmissionDocumentPhoto[];
  emptyText?: string;
  compact?: boolean;
}

export function LegalDocumentsGallery({
  photos,
  emptyText = "Chủ ngựa chưa đính kèm ảnh giấy tờ pháp lý.",
  compact = false,
}: GalleryProps) {
  const [preview, setPreview] = useState<AdmissionDocumentPhoto | null>(null);

  if (!photos.length) {
    return (
      <div className={styles.emptyBox}>
        <Icon name="file" size={16} />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.grid}
        style={compact ? { gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))" } : undefined}
      >
        {photos.map((doc, idx) => (
          <div key={`${doc.label}-${idx}`} className={styles.card}>
            <button
              type="button"
              className={styles.thumbBtn}
              style={compact ? { height: 100 } : undefined}
              onClick={() => setPreview(doc)}
              title={`Xem rõ: ${doc.label}`}
            >
              <img src={doc.url} alt={doc.label} />
              <span className={styles.zoomChip}>
                <Icon name="eye" size={12} />
                Phóng to
              </span>
            </button>
            <div className={styles.cardMeta}>
              <span className={styles.docLabel}>{doc.label}</span>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <Modal
          title={preview.label}
          subtitle="Ảnh giấy tờ pháp lý chủ ngựa đã đính kèm trực tuyến"
          width={760}
          onClose={() => setPreview(null)}
        >
          <div className={styles.lightboxBody}>
            <img src={preview.url} alt={preview.label} className={styles.lightboxImg} />
            <Button tone="secondary" onClick={() => setPreview(null)}>
              Đóng xem ảnh
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

interface UploaderProps {
  value: AdmissionDocumentPhoto[];
  onChange: (next: AdmissionDocumentPhoto[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  horseName?: string;
  microchip?: string;
  ownerName?: string;
}

export function LegalDocumentsUploader({
  value,
  onChange,
  disabled,
  onBusyChange,
  horseName,
  microchip,
  ownerName,
}: UploaderProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState(LEGAL_DOC_TYPE_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<AdmissionDocumentPhoto | null>(null);

  const reachedLimit = value.length >= MAX_LEGAL_DOCS;
  const locked = Boolean(disabled) || busy || reachedLimit;

  async function handleFileSelect(file?: File) {
    if (!file) return;
    if (value.length >= MAX_LEGAL_DOCS) {
      setError(`Chỉ đính kèm tối đa ${MAX_LEGAL_DOCS} ảnh giấy tờ pháp lý.`);
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 1600,
        quality: 0.85,
        maxBytes: 220 * 1024,
      });
      onChange([...value, { label: selectedType, url: compressed }]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể đọc tệp ảnh này. Vui lòng chọn ảnh JPG/PNG rõ nét khác.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  function addSample(kind: "passport" | "vaccine") {
    if (value.length >= MAX_LEGAL_DOCS) return;
    const label =
      kind === "passport"
        ? "Giấy chứng nhận sở hữu / Hộ chiếu ngựa"
        : "Sổ tiêm phòng & Kiểm dịch thú y";
    const url = buildSampleCertificateSvg(kind, horseName, microchip, ownerName);
    setError("");
    onChange([...value, { label, url }]);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setError("");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.typeSelect}>
          <Select
            aria-label="Loại giấy tờ pháp lý"
            value={selectedType}
            options={LEGAL_DOC_TYPE_OPTIONS}
            disabled={Boolean(disabled) || busy}
            onChange={(e) => setSelectedType(e.target.value)}
          />
        </div>
        <div className={styles.actionRow}>
          <Button
            type="button"
            tone="secondary"
            icon="upload"
            disabled={locked}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Đang xử lý ảnh..." : `Tải ảnh từ máy (${value.length}/${MAX_LEGAL_DOCS})`}
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        disabled={locked}
        onChange={(e) => {
          void handleFileSelect(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!reachedLimit && !disabled && (
        <div className={styles.sampleBar}>
          <span>Dùng nhanh ảnh giấy tờ mẫu để thử nghiệm:</span>
          <button
            type="button"
            className={styles.sampleBtn}
            disabled={locked}
            onClick={() => addSample("passport")}
          >
            <Icon name="file" size={13} />+ Ảnh mẫu Hộ chiếu & Sở hữu
          </button>
          <button
            type="button"
            className={styles.sampleBtn}
            disabled={locked}
            onClick={() => addSample("vaccine")}
          >
            <Icon name="shield" size={13} />+ Ảnh mẫu Sổ tiêm phòng
          </button>
        </div>
      )}

      {busy && <p className={styles.statusText} role="status">Đang nén ảnh chất lượng cao (rõ chữ)...</p>}
      {error && <p className={styles.errorText} role="alert">{error}</p>}

      {value.length > 0 ? (
        <div className={styles.grid}>
          {value.map((doc, idx) => (
            <div key={`${doc.label}-${idx}`} className={styles.card}>
              <button
                type="button"
                className={styles.thumbBtn}
                onClick={() => setPreview(doc)}
                title={`Phóng to: ${doc.label}`}
              >
                <img src={doc.url} alt={doc.label} />
                <span className={styles.zoomChip}>
                  <Icon name="eye" size={12} />
                  Xem rõ
                </span>
              </button>
              <div className={styles.cardMeta}>
                <span className={styles.docLabel}>{doc.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    title="Gỡ ảnh này"
                    aria-label={`Gỡ ${doc.label}`}
                    onClick={() => removeAt(idx)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyBox}>
          <Icon name="image" size={16} />
          <span>
            Chưa đính kèm ảnh giấy tờ. Tải lên ảnh chụp rõ nét Giấy sở hữu / Phả hệ / Sổ tiêm để Quản lý CLB kiểm tra trước khi xếp lịch (mang theo bản gốc khi đến thẩm định).
          </span>
        </div>
      )}

      {preview && (
        <Modal
          title={preview.label}
          subtitle="Xem trước ảnh giấy tờ pháp lý sẽ nộp cho CLB"
          width={760}
          onClose={() => setPreview(null)}
        >
          <div className={styles.lightboxBody}>
            <img src={preview.url} alt={preview.label} className={styles.lightboxImg} />
            <Button tone="secondary" onClick={() => setPreview(null)}>
              Đóng xem trước
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
