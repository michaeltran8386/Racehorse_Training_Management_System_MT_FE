import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Select } from '@/shared/components/form/Select';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { useToast } from '@/shared/components/ui/Toast';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { incidentsApi } from '../api/incidentsApi';
import { COMMON_SYMPTOMS } from './IncidentReportModal';
import type { IncidentReport, IncidentSeverity, IncidentStatus } from '../types/incidents';

interface IncidentDetailModalProps {
  incident: IncidentReport;
  onClose: () => void;
  onUpdated: (updated: IncidentReport) => void;
}

export function IncidentDetailModal({
  incident,
  onClose,
  onUpdated,
}: IncidentDetailModalProps) {
  const toast = useToast();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const canReview = user?.role === 'VETERINARIAN';

  const [status, setStatus] = useState<IncidentStatus>(
    incident.status === 'REPORTED' ? 'UNDER_REVIEW' : incident.status,
  );
  const [vetNotes, setVetNotes] = useState<string>(incident.vetNotes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !canReview) return;

    setBusy(true);
    setError('');

    try {
      const updated = await incidentsApi.review(incident.id, {
        status,
        vetNotes: vetNotes.trim() || undefined,
      });
      toast.show(tr('Incident status updated to {{status}}.', { status }), 'ok');
      onUpdated(updated);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge tone="danger">{tr('Critical')}</Badge>;
      case 'MODERATE':
        return <Badge tone="warn">{tr('Moderate')}</Badge>;
      case 'MILD':
        return <Badge tone="ok">{tr('Mild')}</Badge>;
    }
  };

  const getStatusBadge = (st: IncidentStatus) => {
    switch (st) {
      case 'REPORTED':
        return <Badge tone="warn">{tr('Reported')}</Badge>;
      case 'UNDER_REVIEW':
        return <Badge tone="neutral">{tr('Under Review')}</Badge>;
      case 'RESOLVED':
        return <Badge tone="ok">{tr('Resolved')}</Badge>;
      case 'DISMISSED':
        return <Badge tone="neutral">{tr('Dismissed')}</Badge>;
    }
  };

  const formatSymptom = (symKey: string) => {
    const found = COMMON_SYMPTOMS.find((s) => s.key === symKey);
    return found ? tr(found.label) : tr(symKey);
  };

  return (
    <Modal title={`${tr('Incident Details')} - ${incident.incidentNumber}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Thông tin sự cố cơ bản */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--surface-sunken)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{tr('Target Horse')}</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginTop: '0.25rem' }}>
              {incident.horse?.name || tr('Horse')} ({incident.horse?.horseCode || ''})
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{tr('Severity')}</div>
            <div style={{ marginTop: '0.25rem' }}>{getSeverityBadge(incident.severity)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{tr('Reported By')}</div>
            <div style={{ color: 'var(--ink)', marginTop: '0.25rem' }}>
              {incident.reportedBy?.fullName || tr('Staff')} ({incident.reportedBy?.role || 'GROOM'})
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{tr('Current Status')}</div>
            <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(incident.status)}</div>
          </div>
        </div>

        {/* Triệu chứng đã chọn */}
        {incident.symptomsJson && incident.symptomsJson.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              {tr('Observed Symptoms')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {incident.symptomsJson.map((sym, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '0.25rem 0.625rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    color: 'var(--color-warn)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {formatSymptom(sym)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quan sát của Groom */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            {tr('Observation Description')}
          </div>
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: 'var(--surface-sunken)',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {incident.description}
          </div>
        </div>

        {/* Ghi chú trước đó của Bác sĩ nếu có */}
        {incident.reviewedBy && !canReview && (
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--r-sm)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: 'var(--fs-sm)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ok)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
              {tr('Veterinarian Notes')} ({incident.reviewedBy.fullName})
            </div>
            <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
              {incident.vetNotes || tr('No notes provided.')}
            </div>
          </div>
        )}

        {/* Khung xử lý dành cho Bác sĩ thú y */}
        {canReview && (
          <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tr('Medical Review & Actions (Veterinarian)')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <Button
                  type="button"
                  tone="danger"
                  size="sm"
                  data-testid="incident-action-place-lock"
                  onClick={() => {
                    onClose();
                    navigate(`/locks?horseId=${incident.horseId}&action=place`);
                  }}
                >
                  🔒 {tr('Place Training Lock')}
                </Button>
                <Button
                  type="button"
                  tone="secondary"
                  size="sm"
                  data-testid="incident-action-create-record"
                  onClick={() => {
                    onClose();
                    navigate(`/medical/records/new?horseId=${incident.horseId}`);
                  }}
                >
                  📋 {tr('Create Medical Record')}
                </Button>
              </div>
            </div>

            <Field label={tr('Update Status')} required>
              <Select
                data-testid="incident-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                options={[
                  { value: 'UNDER_REVIEW', label: tr('Under Review') },
                  { value: 'RESOLVED', label: tr('Resolved') },
                  { value: 'DISMISSED', label: tr('Dismissed') },
                ]}
              />
            </Field>

            <Field label={tr('Veterinary Prescription / Medical Notes')}>
              <Textarea
                data-testid="incident-vet-notes"
                rows={3}
                value={vetNotes}
                onChange={(e) => setVetNotes(e.target.value)}
                placeholder={tr('Prescribe rest, ice boots, medications, or post-check instructions...')}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
              <Button tone="secondary" type="button" onClick={onClose} disabled={busy}>
                {tr('Close')}
              </Button>
              <Button tone="primary" type="submit" data-testid="incident-submit-review" disabled={busy}>
                {busy ? tr('Saving…') : tr('Save Review')}
              </Button>
            </div>
          </form>
        )}

        {!canReview && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <Button tone="secondary" type="button" onClick={onClose}>
              {tr('Close')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
