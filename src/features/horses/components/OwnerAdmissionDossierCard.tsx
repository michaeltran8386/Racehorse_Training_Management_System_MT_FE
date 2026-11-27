import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { getDemoDate } from "@/features/training/api";
import {
  cancelAdmission,
  extractAdmissionDocumentPhotos,
  updateOwnerAdmissionSubmission,
} from "../services/admissionService";
import type {
  AdmissionDocumentPhoto,
  AdmissionStatus,
  HorseAdmissionRecord,
} from "../types/admission.types";
import { LegalDocumentsGallery, LegalDocumentsUploader } from "./LegalDocumentsUploader";
import styles from "./OwnerAdmissionDossierCard.module.css";

const STATUS_META: Record<
  AdmissionStatus,
  { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }
> = {
  PENDING_VERIFICATION: { label: "Chờ CLB xếp lịch", tone: "info" },
  APPOINTED: { label: "Đã có lịch hẹn", tone: "warn" },
  INSPECTION_IN_PROGRESS: { label: "Đang thẩm định tại CLB", tone: "info" },
  APPROVED: { label: "Đã tiếp nhận chính thức", tone: "ok" },
  REJECTED: { label: "Từ chối tiếp nhận", tone: "danger" },
  CANCELLED: { label: "Đã rút / hủy hồ sơ", tone: "neutral" },
};

const STEPS = [
  { key: "SUBMITTED", title: "1. Đã nộp hồ sơ", sub: "Chờ CLB tiếp nhận" },
  { key: "APPOINTED", title: "2. Xếp lịch hẹn", sub: "Có giờ & phụ trách" },
  { key: "INSPECTION", title: "3. Thẩm định trực tiếp", sub: "Chip · Pháp lý · Thú y" },
  { key: "APPROVED", title: "4. Hoàn tất", sub: "Nhập chuồng & hoạt động" },
] as const;

function currentEffectiveTimeMs(): number {
  const demoYmd = getDemoDate();
  if (!demoYmd) return Date.now();
  const now = new Date();
  const timePart = now.toISOString().slice(11, 19);
  const parsed = Date.parse(`${demoYmd}T${timePart}+07:00`);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

interface Props {
  record: HorseAdmissionRecord;
  horseLink?: boolean;
  onUpdated?: () => void;
}

export function OwnerAdmissionDossierCard({ record, horseLink = false, onUpdated }: Props) {
  const toast = useToast();
  const [showHistory, setShowHistory] = useState(false);

  // Edit / supplement modal state (only allowed while PENDING_VERIFICATION)
  const [editOpen, setEditOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState(record.ownerNotes || "");
  const [draftPhotos, setDraftPhotos] = useState<AdmissionDocumentPhoto[]>(() =>
    extractAdmissionDocumentPhotos(record),
  );
  const [uploadBusy, setUploadBusy] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const photos = extractAdmissionDocumentPhotos(record);
  const badge = STATUS_META[record.status] ?? { label: record.status, tone: "neutral" as const };
  const canEditSubmission = record.status === "PENDING_VERIFICATION";
  const canCancel =
    record.status === "PENDING_VERIFICATION" || record.status === "APPOINTED";
  const canReapply = record.status === "REJECTED" || record.status === "CANCELLED";

  // Overdue check (aware of DemoMagicToolkit date)
  const nowMs = currentEffectiveTimeMs();
  const apptMs = record.appointmentDate ? Date.parse(record.appointmentDate) : NaN;
  const isPastAppointment =
    record.status === "APPOINTED" && Number.isFinite(apptMs) && nowMs > apptMs;
  const overdueDays = isPastAppointment
    ? Math.floor((nowMs - apptMs) / (24 * 60 * 60 * 1000))
    : 0;

  function stepState(idx: number): "done" | "current" | "error" | "idle" {
    if (record.status === "APPROVED") return "done";
    if (record.status === "PENDING_VERIFICATION") {
      if (idx === 0) return "current";
      return "idle";
    }
    if (record.status === "APPOINTED") {
      if (idx === 0) return "done";
      if (idx === 1) return "current";
      return "idle";
    }
    if (record.status === "INSPECTION_IN_PROGRESS") {
      if (idx < 2) return "done";
      if (idx === 2) return "current";
      return "idle";
    }
    if (record.status === "REJECTED") {
      if (idx < 2) return "done";
      if (idx === 2) return "error";
      return "idle";
    }
    if (record.status === "CANCELLED") {
      if (idx === 0) return "error";
      return "idle";
    }
    return "idle";
  }

  function openEditModal() {
    setDraftNotes(record.ownerNotes || "");
    setDraftPhotos(extractAdmissionDocumentPhotos(record));
    setEditError("");
    setEditOpen(true);
  }

  async function saveSubmissionEdits() {
    if (savingEdit || uploadBusy) return;
    setSavingEdit(true);
    setEditError("");
    try {
      await updateOwnerAdmissionSubmission(record.id, {
        ownerNotes: draftNotes.trim(),
        documentPhotos: draftPhotos,
        documentsUrl: draftPhotos[0]?.url || "",
      });
      toast.show("Đã cập nhật ghi chú và giấy tờ pháp lý cho hồ sơ.", "ok");
      setEditOpen(false);
      onUpdated?.();
    } catch (err) {
      setEditError(messageFor(err));
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmCancel() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelAdmission(record.id, { reason: cancelReason.trim() || undefined });
      toast.show("Đã rút / hủy hồ sơ đăng ký tiếp nhận.", "ok");
      setCancelOpen(false);
      setCancelReason("");
      onUpdated?.();
    } catch (err) {
      setCancelError(messageFor(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className={styles.dossier} aria-label={`Hồ sơ tiếp nhận ${record.admissionCode}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>
            <Icon name="clipboard" size={14} />
            Phiếu theo dõi hồ sơ đăng ký tiếp nhận trực tuyến
          </span>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>
              {horseLink ? (
                <Link to={`/horses/${record.horseId}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {record.horse?.name || "Chiến mã"}
                </Link>
              ) : (
                record.horse?.name || "Chiến mã"
              )}
            </h3>
            <span className={styles.codePill}>{record.admissionCode}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <div className={styles.submittedMeta}>
            <span>Ngày nộp: {formatDateTime(record.createdAt)}</span>
            {(record.declaredMicrochip || record.horse?.microchip) && (
              <span>Microchip: {record.declaredMicrochip || record.horse?.microchip}</span>
            )}
            <span>Giấy tờ đính kèm: {photos.length} ảnh</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {horseLink && (
            <LinkButton to={`/horses/${record.horseId}`} tone="secondary" size="sm" icon="eye">
              Xem hồ sơ ngựa
            </LinkButton>
          )}
          {canEditSubmission && (
            <Button tone="secondary" size="sm" icon="edit" onClick={openEditModal}>
              Bổ sung giấy tờ / Ghi chú
            </Button>
          )}
          {canCancel && (
            <Button
              tone="ghost"
              size="sm"
              icon="ban"
              onClick={() => {
                setCancelReason("");
                setCancelError("");
                setCancelOpen(true);
              }}
            >
              Rút hồ sơ
            </Button>
          )}
          {canReapply && (
            <LinkButton
              to={`/horses/new?reapply=${encodeURIComponent(record.horseId)}`}
              tone="primary"
              size="sm"
              icon="refresh"
            >
              Nộp lại hồ sơ
            </LinkButton>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {/* 4-step progress tracker */}
        <ol className={styles.stepper} aria-label="Tiến độ xử lý hồ sơ">
          {STEPS.map((step, idx) => {
            const st = stepState(idx);
            const cls =
              st === "done"
                ? `${styles.step} ${styles.stepDone}`
                : st === "current"
                  ? `${styles.step} ${styles.stepCurrent}`
                  : st === "error"
                    ? `${styles.step} ${styles.stepError}`
                    : styles.step;
            return (
              <li key={step.key} className={cls}>
                <span className={styles.stepNum}>
                  {st === "done" ? <Icon name="check" size={13} /> : idx + 1}
                </span>
                <div className={styles.stepLabel}>
                  <strong>{step.title}</strong>
                  <span>{step.sub}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Contextual Alerts */}
        {record.capacityDeferredAt && record.status === "PENDING_VERIFICATION" && (
          <Alert tone="warn" title="Tạm hoãn xếp lịch do CLB hết ô chuồng trống">
            Hồ sơ của bạn được bảo lưu thứ tự ưu tiên từ {formatDateTime(record.capacityDeferredAt)}. Ngay khi có ô chuồng trống, Quản lý CLB sẽ liên hệ và xếp lịch hẹn mới cho bạn.
          </Alert>
        )}

        {isPastAppointment && (
          <Alert
            tone={overdueDays >= 3 ? "danger" : "warn"}
            title={
              overdueDays >= 3
                ? `Lịch hẹn đã quá hạn ${overdueDays} ngày`
                : "Đã qua giờ hẹn tiếp nhận tại CLB"
            }
          >
            {overdueDays >= 3
              ? "Lịch hẹn đã quá hạn từ 3 ngày trở lên. Quản lý CLB có quyền hủy hồ sơ quá hạn — vui lòng liên hệ ngay để dời lịch hoặc nộp lại hồ sơ mới."
              : "Bạn đã qua thời điểm hẹn mang ngựa tới CLB. Vui lòng liên hệ Quản lý CLB để dời lịch hẹn mới (hồ sơ có thể bị hủy nếu quá hạn từ 3 ngày trở lên)."}
          </Alert>
        )}

        {record.status === "REJECTED" && (
          <Alert tone="danger" title="Hồ sơ chưa đạt yêu cầu tiếp nhận">
            <strong>Lý do từ CLB:</strong> {record.rejectionReason || "Chưa đạt tiêu chuẩn tiếp nhận."}
            <div style={{ marginTop: "0.45rem" }}>
              Bạn có thể khắc phục giấy tờ/sức khỏe theo phản hồi trên và bấm <strong>Nộp lại hồ sơ</strong> bất cứ lúc nào.
            </div>
          </Alert>
        )}

        {record.status === "APPROVED" && (
          <Alert tone="ok" title="Chiến mã đã chính thức gia nhập CLB Thiên Mã!">
            Hồ sơ được phê duyệt lúc {record.admittedAt ? formatDateTime(record.admittedAt) : formatDateTime(record.updatedAt)}. Chiến mã đã được tiếp nhận và bố trí khu chăm sóc tại CLB.
          </Alert>
        )}

        {/* 2-Column Public Service Details */}
        <div className={styles.panels}>
          {/* Left: Club Response & Appointment */}
          <div
            className={`${styles.panel} ${
              record.appointmentDate && (record.status === "APPOINTED" || record.status === "INSPECTION_IN_PROGRESS")
                ? styles.panelHighlight
                : ""
            }`}
          >
            <h4 className={styles.panelTitle}>
              <Icon name="calendar" size={16} />
              Lịch hẹn &amp; Phản hồi từ CLB
            </h4>

            {record.appointmentDate ? (
              <>
                <div className={styles.kvGrid}>
                  <div>
                    <div className={styles.kvLabel}>Thời gian bắt đầu</div>
                    <div className={styles.kvValue}>{formatDateTime(record.appointmentDate)}</div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>Kết thúc dự kiến</div>
                    <div className={styles.kvValue}>
                      {record.appointmentEndDate ? formatDateTime(record.appointmentEndDate) : "Sau 60 phút"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>Quản lý phụ trách</div>
                    <div className={styles.kvValue}>
                      {record.manager?.fullName || "Quản lý CLB"}
                    </div>
                  </div>
                  <div>
                    <div className={styles.kvLabel}>Bác sĩ thú y tham gia</div>
                    <div className={styles.kvValue}>
                      {record.veterinarian?.fullName || "Đang phân công"}
                    </div>
                  </div>
                </div>
                {record.appointmentNotes && (
                  <div>
                    <div className={styles.kvLabel}>Lời nhắn &amp; Hướng dẫn đón tiếp từ CLB</div>
                    <p className={styles.noteQuote}>{record.appointmentNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.mutedText}>
                {record.status === "PENDING_VERIFICATION"
                  ? "CLB đã nhận tờ khai và giấy tờ đính kèm của bạn. Quản lý CLB sẽ xem ghi chú mong muốn và gửi lịch hẹn kèm hướng dẫn đón tiếp trong thời gian sớm nhất."
                  : "Không có lịch hẹn đang hiệu lực cho hồ sơ này."}
              </p>
            )}
          </div>

          {/* Right: Owner Notes & Submitted Legal Documents */}
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>
              <Icon name="file" size={16} />
              Tờ khai &amp; Mong muốn bạn đã nộp
            </h4>
            <div>
              <div className={styles.kvLabel}>Ghi chú / Mong muốn của chủ ngựa</div>
              {record.ownerNotes ? (
                <p className={styles.noteQuote}>{record.ownerNotes}</p>
              ) : (
                <p className={styles.mutedText}>
                  Không có ghi chú thêm.{" "}
                  {canEditSubmission && "Bạn có thể bấm “Bổ sung giấy tờ / Ghi chú” nếu muốn nhắn thêm lịch rảnh hoặc lưu ý cho CLB."}
                </p>
              )}
            </div>
            <div>
              <div className={styles.kvLabel} style={{ marginBottom: 6 }}>
                Ảnh giấy tờ pháp lý đã đính kèm ({photos.length})
              </div>
              <LegalDocumentsGallery
                photos={photos}
                compact
                emptyText="Chưa đính kèm ảnh giấy tờ pháp lý (bạn vẫn cần mang bản gốc khi đến thẩm định)."
              />
            </div>
          </div>
        </div>

        {/* Inline History Trail */}
        {Array.isArray(record.history) && record.history.length > 0 && (
          <div>
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setShowHistory((v) => !v)}
            >
              <Icon name="history" size={14} />
              {showHistory ? "Ẩn nhật ký xử lý hồ sơ" : `Xem nhật ký xử lý hồ sơ (${record.history.length} mốc)`}
            </button>
            {showHistory && (
              <ol className={styles.historyList}>
                {record.history.map((log) => (
                  <li key={log.id} className={styles.historyItem}>
                    <div>
                      <strong>{STATUS_META[log.toStatus]?.label ?? log.toStatus}</strong>
                      {log.actorName && <span> · {log.actorName}</span>}
                      {log.note && (
                        <div style={{ color: "var(--ink-muted)", marginTop: 2 }}>{log.note}</div>
                      )}
                    </div>
                    <time className={styles.historyTime}>{formatDateTime(log.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Edit / Supplement Modal (PENDING_VERIFICATION only) */}
      {editOpen && (
        <Modal
          title={`Bổ sung hồ sơ — ${record.admissionCode}`}
          subtitle="Cập nhật ghi chú mong muốn và ảnh giấy tờ pháp lý trước khi CLB chốt lịch hẹn"
          width={680}
          onClose={() => !savingEdit && setEditOpen(false)}
        >
          <div className={styles.modalStack}>
            <Field
              label="Ghi chú / Mong muốn gửi CLB"
              hint="Ví dụ: khung giờ thuận tiện mang ngựa đến, tính cách ngựa, lưu ý dinh dưỡng hoặc mục tiêu nuôi/tập."
            >
              <Textarea
                rows={4}
                maxLength={1000}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Nhập ghi chú mong muốn gửi Quản lý CLB..."
                disabled={savingEdit}
              />
            </Field>
            <Field label="Ảnh giấy tờ pháp lý đính kèm (tối đa 3 ảnh)">
              <LegalDocumentsUploader
                value={draftPhotos}
                onChange={setDraftPhotos}
                disabled={savingEdit}
                onBusyChange={setUploadBusy}
                horseName={record.horse?.name}
                microchip={record.declaredMicrochip || record.horse?.microchip || undefined}
                ownerName={record.owner?.fullName}
              />
            </Field>
            {editError && <Alert tone="danger">{editError}</Alert>}
            <div className={styles.modalActions}>
              <Button tone="secondary" disabled={savingEdit} onClick={() => setEditOpen(false)}>
                Hủy
              </Button>
              <Button
                tone="primary"
                disabled={savingEdit || uploadBusy}
                onClick={() => void saveSubmissionEdits()}
              >
                {savingEdit ? "Đang lưu..." : "Lưu cập nhật hồ sơ"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Admission Modal */}
      {cancelOpen && (
        <Modal
          title="Rút / Hủy hồ sơ đăng ký tiếp nhận"
          subtitle={`${record.horse?.name || ""} · ${record.admissionCode}`}
          tone="danger"
          width={480}
          onClose={() => !cancelling && setCancelOpen(false)}
        >
          <div className={styles.modalStack}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-muted)" }}>
              Bạn có chắc chắn muốn rút hồ sơ này? Nếu đã có lịch hẹn, lịch làm việc của Quản lý và Bác sĩ sẽ tự động được giải phóng. Bạn vẫn có thể nộp lại hồ sơ sau này.
            </p>
            <Field label="Lý do rút hồ sơ (tùy chọn)">
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Thay đổi kế hoạch vận chuyển ngựa..."
                disabled={cancelling}
              />
            </Field>
            {cancelError && <Alert tone="danger">{cancelError}</Alert>}
            <div className={styles.modalActions}>
              <Button tone="secondary" disabled={cancelling} onClick={() => setCancelOpen(false)}>
                Đóng
              </Button>
              <Button tone="danger" disabled={cancelling} onClick={() => void confirmCancel()}>
                {cancelling ? "Đang xử lý..." : "Xác nhận rút hồ sơ"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
