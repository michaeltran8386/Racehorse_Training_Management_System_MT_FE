import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from "@/shared/components/ui/Modal";
import { useToast } from "@/shared/components/ui/Toast";
import { tr } from "@/shared/i18n/tr";
import { formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { getAdmissions, cancelAdmission, getAdmissionCapacity, deferAdmissionForCapacity, getAdmissionRecord, extractAdmissionDocumentPhotos } from "../services/admissionService";
import { getDemoDate } from "@/features/training/api";
import type { HorseAdmissionRecord, AdmissionStatus } from "../types/admission.types";
import { AdmissionInspectionModal } from "../components/AdmissionInspectionModal";
import { AdmissionScheduleModal } from "../components/AdmissionScheduleModal";
import { AdmissionHistoryTimeline } from "../components/AdmissionHistoryTimeline";
import design from "../components/AdmissionDesign.module.css";
import styles from "./HorseAdmissionListPage.module.css";

const STATUSES: Record<AdmissionStatus, { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }> = {
  PENDING_VERIFICATION: { label: "Pending Verification", tone: "info" },
  APPOINTED: { label: "Appointed", tone: "warn" },
  INSPECTION_IN_PROGRESS: { label: "Inspection in Progress", tone: "info" },
  APPROVED: { label: "Approved", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export default function HorseAdmissionListPage() {
  useTranslation();
  const toast = useToast();
  const currentUser = useCurrentUser();
  const isManager = currentUser.role === "CLUB_MANAGER";
  const isVet = currentUser.role === "VETERINARIAN";
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('inspection');
  const [selectionError, setSelectionError] = useState('');
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdmissionStatus | "ALL">("ALL");
  const [recent, setRecent] = useState(false);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<HorseAdmissionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [inspecting, setInspecting] = useState<HorseAdmissionRecord | null>(null);
  const [scheduling, setScheduling] = useState<HorseAdmissionRecord | null>(null);
  const [history, setHistory] = useState<HorseAdmissionRecord | null>(null);
  const [cancellingRecord, setCancellingRecord] = useState<HorseAdmissionRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [capacityError, setCapacityError] = useState('');
  const [deferring, setDeferring] = useState<string | null>(null);
  useEffect(() => {
    if (!isManager && !isVet) return;
    let active = true;
    setCapacity(null); setCapacityError('');
    getAdmissionCapacity().then(r => { if (active) setCapacity(r.available); })
      .catch(err => { if (active) setCapacityError(messageFor(err)); });
    return () => { active = false; };
  }, [isManager, isVet, reloadTrigger]);
  async function defer(record: HorseAdmissionRecord) {
    if (!window.confirm(`Hoãn thẩm định ${record.horse.name} do hết chuồng và gửi email cho chủ ngựa? Hồ sơ sẽ được giữ lại để hẹn mới.`)) return;
    setDeferring(record.id);
    try {
      const result = await deferAdmissionForCapacity(record.id);
      toast.show(result.notified ? 'Đã hoãn hồ sơ và chuyển email thông báo vào luồng gửi thư.' : 'Hồ sơ đã được hoãn trước đó.', 'ok');
      reload();
    } catch (err) { toast.show(messageFor(err), 'danger'); }
    finally { setDeferring(null); }
  }
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);
  const reload = useCallback(() => setReloadTrigger((n) => n + 1), []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setSelectionError('');
    getAdmissionRecord(selectedId).then(record => {
      if (!active) return;
      if (isVet && record.veterinarianUserId !== currentUser.id) {
        setSelectionError('Hồ sơ này không được phân công cho bạn.'); return;
      }
      if (record.status === 'APPOINTED' || record.status === 'INSPECTION_IN_PROGRESS') setInspecting(record);
      else setHistory(record);
    }).catch(err => { if (active) setSelectionError(messageFor(err)); });
    return () => { active = false; };
  }, [selectedId, currentUser.id, isVet]);

  function closeInspection() {
    setInspecting(null);
    if (selectedId) setParams(previous => { const next = new URLSearchParams(previous); next.delete('inspection'); return next; }, { replace: true });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAdmissions({ search, status, recent7Days: recent, page, pageSize: 10 })
      .then((res) => {
        if (!active) return;
        setRecords(res.data);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages || Math.ceil(res.total / 10)));
      })
      .catch((err: unknown) => { if (active) setError(messageFor(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, status, recent, page, reloadTrigger]);

  const changeSearch = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value.trim()); setPage(1); }, 350);
  };
  const confirmCancel = async () => {
    if (!cancellingRecord || cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelAdmission(cancellingRecord.id, { reason: cancelReason.trim() || undefined });
      toast.show(tr("Admission record cancelled successfully"), "ok");
      setCancellingRecord(null);
      setCancelReason("");
      reload();
    } catch (err) { setCancelError(messageFor(err)); }
    finally { setCancelling(false); }
  };

  return (
    <div className={`${design.scope} ${styles.page}`}>
      <div className={styles.heading}>
        <PageHeader title={isVet ? 'Thẩm định được phân công' : tr("Horse Admissions & Verification")}
          description={isVet ? 'Chỉ hiển thị hồ sơ Quản lý giao cho bạn. Khám sức khỏe và gửi kết luận; Quản lý phụ trách pháp lý và quyết định tiếp nhận.' : tr("Review each horse's identity, arrange arrival and complete veterinary screening.")}
          action={<Button tone="secondary" className={design.secondary} disabled={loading} onClick={reload}>
            {tr("Refresh")}<Icon name="refresh" size={16} />
          </Button>} />
      </div>
      {selectionError && <p role="alert" className={design.error}>{selectionError}</p>}

      {(isManager || isVet) && <p role="status" className={design.helper}>
        {capacityError ? `Không kiểm tra được chuồng: ${capacityError}` : capacity === null ? 'Đang kiểm tra chuồng trống…' : capacity === 0
          ? 'CLB đã hết chuồng trống. Chưa thể thẩm định; Quản lý có thể hoãn hồ sơ và thông báo chủ ngựa để hẹn lại.'
          : `Còn ${capacity} ô chuồng có thể tiếp nhận. Ô được kiểm tra lại và gán khi duyệt, không giữ chỗ trước.`}
      </p>}
      <ol className={styles.workflow} aria-label={tr("Admission workflow")}>
        {(isVet ? ['Nhận phân công', 'Khám sức khỏe', 'Gửi kết luận'] : ["Registration request", "Reception appointment", "Verification & decision"]).map((label, i) => (
          <li key={label}><span className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</span><span>{tr(label)}</span></li>
        ))}
      </ol>

      <section className={styles.results} aria-labelledby="admission-records-title">
        <div className={styles.resultsHeading}>
          <div><h2 id="admission-records-title">{tr("Admission records")}</h2><p>{tr("Open a horse's history to follow its admission progress.")}</p></div>
          <div className={styles.recordCount}><strong>{loading ? "—" : total}</strong><span>{tr("Matching records")}</span></div>
        </div>
        <div className={styles.filters}>
          <Field label={tr("Search admissions")}>
            <Input value={searchInput} onChange={(e) => changeSearch(e.target.value)} icon="search"
              placeholder={tr("Search by horse name, microchip, admission code, owner...")} />
          </Field>
          <Field label={tr("Status")}>
            <Select value={status} onChange={(e) => { setStatus(e.target.value as AdmissionStatus | "ALL"); setRecent(false); setPage(1); }}
              options={[{ value: "ALL", label: tr("All statuses") }, ...Object.entries(STATUSES).map(([value, badge]) => ({ value, label: tr(badge.label) }))]} />
          </Field>
          <Button tone="secondary" className={`${design.secondary} ${styles.recent}`} aria-pressed={recent}
            onClick={() => { setRecent((value) => !value); setStatus("ALL"); setPage(1); }}>
            <Icon name={recent ? "check" : "calendar"} size={16} />{tr("Horses admitted in last 7 days")}
          </Button>
        </div>

        {loading ? <div className={styles.empty} role="status"><Icon name="refresh" size={28} /><p>{tr("Loading admission records...")}</p></div>
          : error ? <div className={styles.empty} role="alert"><Icon name="alert" size={28} /><p className={design.error}>{error}</p><Button tone="secondary" className={design.secondary} onClick={reload}>{tr("Try again")}</Button></div>
          : !records.length ? <div className={styles.empty}><Icon name="clipboard" size={32} /><h3>{tr("No admission records found")}</h3>
            <p>{tr(recent || search || status !== "ALL" ? "Try adjusting your search terms or clearing filters." : "No horse registration requests in the system yet.")}</p></div>
          : <div className={styles.tableScroll} role="region" aria-label={tr("Admission records")} tabIndex={0}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>{tr("Admission records")}</caption>
              <thead><tr>
                <th scope="col">{tr("Horse Name")}</th><th scope="col">{tr("Owner")}</th>
                <th scope="col">{tr("Appointment Date")}</th><th scope="col">{tr("Examining Vet")}</th>
                <th scope="col">{tr("Status")}</th><th scope="col" className={styles.actionHeading}>{tr("Actions")}</th>
              </tr></thead>
              <tbody>{records.map((rec) => {
                const badge = STATUSES[rec.status];
                const pending = rec.status === "PENDING_VERIFICATION";
                const appointed = rec.status === "APPOINTED";
                const canInspect = (appointed || rec.status === "INSPECTION_IN_PROGRESS") && (isManager || (isVet && rec.veterinarianUserId === currentUser.id));
                const canSchedule = (pending || appointed) && isManager;
                const demoYmd = getDemoDate();
                const nowMs = demoYmd
                  ? Date.parse(`${demoYmd}T${new Date().toISOString().slice(11, 19)}+07:00`) || Date.now()
                  : Date.now();
                const overdueDays = rec.appointmentDate
                  ? Math.floor((nowMs - Date.parse(rec.appointmentDate)) / 86400000)
                  : 0;
                const overdue = Boolean(appointed && rec.appointmentDate && overdueDays >= 3);
                const pastDue = Boolean(appointed && rec.appointmentDate && nowMs > Date.parse(rec.appointmentDate));
                const docCount = extractAdmissionDocumentPhotos(rec).length;
                const canCancel = isManager ? appointed && overdue : currentUser.id === rec.ownerId && (pending || appointed);
                return <tr key={rec.id}>
                  <td><div className={styles.horse}>
                    <strong>{rec.horse.name}</strong>
                    {rec.horse.breed && <span className={styles.meta}>{tr(rec.horse.breed)}</span>}
                    <button className={styles.historyLink} onClick={() => setHistory(rec)}
                      aria-label={tr("View admission history for {{name}}", { name: rec.horse.name })}>
                      {rec.admissionCode}<Icon name="history" size={14} />
                    </button>
                    <span className={styles.microchip}><span>{tr("Microchip No.")}</span> {rec.scannedMicrochip || rec.declaredMicrochip || rec.horse.microchip || tr("None")}
                      {rec.microchipVerified && <span className={styles.verified} title={tr("Microchip verified")}><Icon name="check" size={14} /><span className={styles.srOnly}>{tr("Microchip verified")}</span></span>}
                    </span>
                    {(docCount > 0 || rec.ownerNotes) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {docCount > 0 && <Badge tone="info">{docCount} ảnh pháp lý</Badge>}
                        {rec.ownerNotes && (
                          <Badge tone="neutral" title={rec.ownerNotes}>
                            Có ghi chú chủ
                          </Badge>
                        )}
                      </div>
                    )}
                  </div></td>
                  <td><div className={styles.person}><span>{rec.owner.fullName}</span><span className={styles.meta}>{rec.owner.email}</span></div></td>
                  <td>
                    {rec.appointmentDate ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <time dateTime={rec.appointmentDate}>
                          {formatDateTime(rec.appointmentDate)}
                          {rec.appointmentEndDate && <> → {formatDateTime(rec.appointmentEndDate)}</>}
                        </time>
                        {overdue && <Badge tone="danger">Quá hạn {overdueDays} ngày (có thể hủy)</Badge>}
                        {!overdue && pastDue && <Badge tone="warn">Đã quá giờ hẹn</Badge>}
                      </div>
                    ) : (
                      <span className={styles.meta}>{rec.capacityDeferredAt ? 'Hoãn do hết chuồng · chờ hẹn lại' : tr("Not scheduled")}</span>
                    )}
                  </td>
                  <td>{rec.veterinarian?.fullName || <span className={styles.meta}>{tr("Unassigned")}</span>}</td>
                  <td><Badge tone={badge?.tone ?? "neutral"}>{tr(badge?.label ?? rec.status)}</Badge></td>
                  <td><div className={styles.rowActions}>
                    {canSchedule && <Button tone="secondary" size="sm" className={design.secondary} onClick={() => setScheduling(rec)}>{tr("Schedule reception")}<Icon name="calendar" size={16} /></Button>}
                    {canInspect && <Button tone="secondary" size="sm" className={design.secondary} disabled={isManager && (capacity === null || capacity === 0)} onClick={() => setInspecting(rec)}>{isVet ? 'Khám thẩm định' : tr("Inspect")}<Icon name="shield" size={16} /></Button>}
                    {isManager && (pending || appointed) && capacity === 0 && !rec.capacityDeferredAt && <Button tone="secondary" size="sm" className={design.secondary} disabled={deferring !== null} onClick={() => void defer(rec)}>{deferring === rec.id ? 'Đang hoãn…' : 'Hoãn & thông báo chủ ngựa'}</Button>}
                    {canCancel && <Button tone="ghost" size="sm" aria-label={`${tr("Cancel admission")} — ${rec.admissionCode}`} onClick={() => { setCancellingRecord(rec); setCancelReason(""); setCancelError(""); }}><Icon name="ban" size={16} /></Button>}
                    {!canSchedule && !canInspect && !canCancel && <span className={styles.meta}>{tr("View only")}</span>}
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>}

        {!loading && !error && total > 0 && <footer className={styles.pagination}>
          <span>{tr("Showing {{count}} of {{total}} admission records", { count: records.length, total })}</span>
          <div><Button tone="secondary" size="sm" className={design.secondary} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{tr("Previous")}</Button>
            <span aria-live="polite">{tr("Admission page {{page}} of {{total}}", { page, total: totalPages })}</span>
            <Button tone="secondary" size="sm" className={design.secondary} disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>{tr("Next")}</Button></div>
        </footer>}
      </section>

      {inspecting && <AdmissionInspectionModal record={inspecting} onClose={closeInspection} onSuccess={reload} />}
      {scheduling && <AdmissionScheduleModal record={scheduling} onClose={() => setScheduling(null)} onSuccess={reload} />}
      {history && <Modal title={tr("Admission Audit Trail — {{code}}", { code: history.admissionCode })}
        subtitle={history.horse.name} dialogClassName={design.dialog} overlayClassName={design.overlay} width={640} onClose={() => setHistory(null)}>
        <AdmissionHistoryTimeline admissionId={history.id} admissionCode={history.admissionCode} horseName={history.horse.name} />
      </Modal>}
      {cancellingRecord && <Modal title={tr("Cancel Admission Record")} subtitle={`${cancellingRecord.horse.name} · ${cancellingRecord.admissionCode}`}
        dialogClassName={design.dialog} overlayClassName={design.overlay} tone="danger" width={480} onClose={() => !cancelling && setCancellingRecord(null)}>
        <div className={design.form}><p>{tr("Are you sure you want to cancel this admission record?")}</p>
          <Field label={tr("Cancellation reason (optional)")}><Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></Field>
          {cancelError && <p role="alert" className={design.error}>{cancelError}</p>}
          <div className={design.actions}><Button tone="secondary" className={design.secondary} onClick={() => setCancellingRecord(null)} disabled={cancelling}>{tr("Close")}</Button>
            <Button tone="danger" onClick={confirmCancel} disabled={cancelling}>{tr(cancelling ? "Cancelling..." : "Confirm Cancel")}</Button></div>
        </div>
      </Modal>}
    </div>
  );
}
