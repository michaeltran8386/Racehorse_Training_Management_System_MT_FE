import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { getWorkMembers, type WorkMember } from '@/features/staff/workApi';
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from '@/shared/components/form/Select';
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { extractAdmissionDocumentPhotos, scheduleAdmission } from "../services/admissionService";
import type { HorseAdmissionRecord } from "../types/admission.types";
import { LegalDocumentsGallery } from "./LegalDocumentsUploader";
import design from "./AdmissionDesign.module.css";

interface Props { record: HorseAdmissionRecord; onClose: () => void; onSuccess: () => void }

function localInputValue(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16);
}

export function AdmissionScheduleModal({ record, onClose, onSuccess }: Props) {
  useTranslation();
  const toast = useToast();
  const user = useCurrentUser();
  const [members, setMembers] = useState<WorkMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [managerId, setManagerId] = useState(record.managerUserId || user.id);
  const [vetId, setVetId] = useState(record.veterinarianUserId || '');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    if (record.appointmentDate) {
      const value = localInputValue(new Date(record.appointmentDate));
      if (value) return value;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return localInputValue(tomorrow);
  });
  const [notes, setNotes] = useState(record.appointmentNotes || tr("Gate A inspection station. Please bring the horse and original documents."));
  const [endDate, setEndDate] = useState(() => localInputValue(record.appointmentEndDate
    ? new Date(record.appointmentEndDate) : new Date(new Date(`${appointmentDate}:00+07:00`).getTime() + 3600000)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getWorkMembers().then(value => { if (active) setMembers(value); })
      .catch(err => { if (active) setError(messageFor(err)); })
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!appointmentDate) { setError(tr("Select an admission appointment date and time.")); return; }
    if (!managerId || !vetId) { setError(tr("Please select both a Manager and a Veterinarian.")); return; }
    if (!endDate || endDate <= appointmentDate) { setError(tr("End time must be after start time.")); return; }
    setLoading(true);
    setError("");
    try {
      // datetime-local represents the same local time the user sees, not a UTC date fragment.
      await scheduleAdmission(record.id, {
        appointmentDate: new Date(`${appointmentDate}:00+07:00`).toISOString(),
        appointmentEndDate: new Date(`${endDate}:00+07:00`).toISOString(),
        managerUserId: managerId,
        veterinarianUserId: vetId,
        appointmentNotes: notes.trim() || undefined,
      });
      toast.show(tr("Scheduled appointment successfully"), "ok");
      onSuccess();
      onClose();
    } catch (err) { setError(messageFor(err)); }
    finally { setLoading(false); }
  }

  const ownerDocs = extractAdmissionDocumentPhotos(record);

  return <Modal title={tr("Schedule Admission Appointment — {{code}}", { code: record.admissionCode })}
    subtitle={`${record.horse.name} · ${record.owner.fullName}`} width={600} dialogClassName={design.dialog} overlayClassName={design.overlay} onClose={onClose}>
    <form className={design.form} onSubmit={submit}>
      <p className={design.helper}>{tr("Shared appointment: Manager verifies microchip and legal documents; Veterinarian evaluates health. Times shown in club timezone (UTC+7).")}</p>
      {(record.ownerNotes || ownerDocs.length > 0) && (
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "10px",
            background: "rgba(239, 246, 255, 0.7)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e40af" }}>
            {tr("Owner declaration ({{name}})", { name: record.owner.fullName })}
          </div>
          {record.ownerNotes && (
            <div style={{ fontSize: "0.85rem", lineHeight: 1.45, color: "#0f172a", whiteSpace: "pre-wrap" }}>
              <strong>{tr("Notes / Preferences:")}</strong> {record.ownerNotes}
            </div>
          )}
          {ownerDocs.length > 0 && (
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                {tr("Pre-submitted legal document photos ({{count}} photo(s) — click to zoom):", { count: ownerDocs.length })}
              </div>
              <LegalDocumentsGallery photos={ownerDocs} compact />
            </div>
          )}
        </div>
      )}
      <Field label={tr("Assigned Manager *")}><Select value={managerId} onChange={e => setManagerId(e.target.value)} disabled={loading || membersLoading} required
        options={[{ value: '', label: tr("Select Manager") }, ...members.filter(m => m.role === 'CLUB_MANAGER').map(m => ({ value: m.id, label: m.fullName }))]} /></Field>
      <Field label={tr("Participating Veterinarian *")}><Select value={vetId} onChange={e => setVetId(e.target.value)} disabled={loading || membersLoading} required
        options={[{ value: '', label: tr("Select Veterinarian") }, ...members.filter(m => m.role === 'VETERINARIAN').map(m => ({ value: m.id, label: m.fullName }))]} /></Field>
      <Field label={tr("Start time (Club time) *")}>
        <Input nativePicker type="datetime-local" value={appointmentDate} disabled={loading}
          onChange={(e) => setAppointmentDate(e.target.value)} required />
      </Field>
      <Field label={tr("End time (Club time) *")}><Input nativePicker type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={loading} required /></Field>
      <p className={design.helper}>{tr("Defaults to 60 minutes, adjustable. The system checks schedule conflicts for both Manager and Veterinarian upon saving.")}</p>
      <Field label={tr("Reception & Document Guidance")}>
        <Textarea value={notes} disabled={loading} onChange={(e) => setNotes(e.target.value)} rows={4}
          placeholder={tr("e.g. Gate A reception, arrival 15 mins prior, required documents...")} />
      </Field>
      {error && <p role="alert" className={design.error}>{error}</p>}
      <div className={design.actions}>
        <Button tone="secondary" className={design.secondary} onClick={onClose} disabled={loading}>{tr("Cancel")}</Button>
        <Button type="submit" tone="primary" className={design.primary} disabled={loading || membersLoading || !vetId || !managerId}>{tr(loading ? "Scheduling..." : "Confirm Schedule")}</Button>
      </div>
    </form>
  </Modal>;
}
