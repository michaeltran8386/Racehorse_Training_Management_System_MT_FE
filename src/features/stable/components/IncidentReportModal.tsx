import { useEffect, useId, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { SearchSelect } from '@/shared/components/form/SearchSelect';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { useToast } from '@/shared/components/ui/Toast';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { getHorses } from '@/features/horses/api';
import { incidentsApi } from '../api/incidentsApi';
import type { Horse } from '@/features/horses/types';
import type { IncidentReport, IncidentSeverity } from '../types/incidents';

interface IncidentReportModalProps {
  initialHorseId?: string;
  initialZoneId?: string;
  onClose: () => void;
  onSuccess: (incident: IncidentReport) => void;
}

export const COMMON_SYMPTOMS: Array<{ key: string; label: string }> = [
  { key: 'COLIC', label: 'Colic / Abdominal Pain' },
  { key: 'LOSS_OF_APPETITE', label: 'Loss of Appetite' },
  { key: 'FEVER', label: 'Fever / High Temperature' },
  { key: 'HOOF_INJURY', label: 'Hoof Injury' },
  { key: 'LAMENESS', label: 'Lameness / Limping' },
  { key: 'COUGHING', label: 'Coughing / Respiratory Distress' },
  { key: 'WOUND', label: 'Wound / External Bleeding' },
  { key: 'OTHER', label: 'Other Abnormal Signs' },
];

export function IncidentReportModal({
  initialHorseId,
  initialZoneId,
  onClose,
  onSuccess,
}: IncidentReportModalProps) {
  const toast = useToast();
  const formId = useId();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loadingHorses, setLoadingHorses] = useState(true);

  const [horseId, setHorseId] = useState<string>(initialHorseId || '');
  const [stallZoneId] = useState<string>(initialZoneId || '');
  const [severity, setSeverity] = useState<IncidentSeverity>('MODERATE');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadHorses() {
      try {
        const res = await getHorses({ limit: 100 });
        if (!active) return;
        const list = Array.isArray(res) ? res : res.items || [];
        setHorses(list);
        if (!horseId && list.length > 0) {
          setHorseId(list[0].id);
        }
      } catch (err) {
        if (active) setError(messageFor(err));
      } finally {
        if (active) setLoadingHorses(false);
      }
    }
    loadHorses();
    return () => {
      active = false;
    };
  }, []);

  const toggleSymptom = (key: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !horseId) return;

    if (!description.trim()) {
      setError(tr('Please enter observation details or symptoms description.'));
      return;
    }

    setBusy(true);
    setError('');

    const symptomsToSubmit =
      selectedSymptoms.length > 0 ? selectedSymptoms : ['OTHER'];

    try {
      const created = await incidentsApi.create({
        horseId,
        stallZoneId: stallZoneId || undefined,
        severity,
        symptoms: symptomsToSubmit,
        symptomsJson: symptomsToSubmit,
        description: description.trim(),
      });

      if (severity === 'CRITICAL') {
        toast.show(
          tr('CRITICAL incident reported! Emergency alert broadcasted to Vet, Trainer & Manager.'),
          'warn',
        );
      } else {
        toast.show(tr('Incident report submitted successfully.'), 'ok');
      }

      onSuccess(created);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedHorse = horses.find((h) => h.id === horseId);

  return (
    <Modal title={tr('Report Health Observation / Incident')} onClose={onClose} foot={
      <>
        <Button tone="secondary" type="button" onClick={onClose} disabled={busy}>{tr('Cancel')}</Button>
        <Button tone={severity === 'CRITICAL' ? 'danger' : 'primary'} type="submit" form={formId} disabled={busy || !horseId || !description.trim()}>
          {busy ? tr('Submitting…') : tr('Submit Report')}
        </Button>
      </>
    }>
      <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Ngựa liên quan */}
        <Field label={tr('Target Horse')} required>
          <SearchSelect
            value={horseId}
            onChange={setHorseId}
            disabled={loadingHorses || busy}
            options={horses.map((h) => ({
              value: h.id,
              label: `${h.name} (${h.horseCode || h.microchipRfid || ''})${h.isMedicalLocked ? ` [${tr('Medical Lock')}]` : ''}`,
            }))}
          />
        </Field>

        {selectedHorse?.isMedicalLocked && (
          <Alert tone="warn">
            {tr('This horse currently has an active Medical Lock. Exercise extra caution.')}
          </Alert>
        )}

        {/* Mức độ nghiêm trọng - 3 selectable cards using design tokens */}
        <Field label={tr('Severity Level')} required>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {(['MILD', 'MODERATE', 'CRITICAL'] as IncidentSeverity[]).map((sev) => {
              const isSelected = severity === sev;
              const toneColor =
                sev === 'MILD'
                  ? 'var(--color-ok)'
                  : sev === 'MODERATE'
                  ? 'var(--color-warn)'
                  : 'var(--color-danger)';
              const label = sev === 'MILD' ? tr('Mild') : sev === 'MODERATE' ? tr('Moderate') : tr('Critical');
              const hint =
                sev === 'MILD'
                  ? tr('Watch / Minor')
                  : sev === 'MODERATE'
                  ? tr('Vet Check Required')
                  : tr('Emergency Alert');

              return (
                <button
                  key={sev}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSeverity(sev)}
                  style={{
                    padding: '0.875rem 0.5rem',
                    borderRadius: 'var(--r-md)',
                    border: isSelected ? `2px solid ${toneColor}` : '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--surface-sunken)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 0 1px ${toneColor}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: toneColor,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 'var(--fs-body)' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--muted)', marginTop: '0.25rem' }}>{hint}</div>
                </button>
              );
            })}
          </div>
        </Field>

        {severity === 'CRITICAL' && (
          <Alert tone="danger">
            {tr(
              'CRITICAL: Immediate emergency notifications will be dispatched to Veterinarians, Head Trainers, and Club Managers.',
            )}
          </Alert>
        )}

        {/* Chip chọn nhanh triệu chứng */}
        <Field label={tr('Observed Symptoms')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {COMMON_SYMPTOMS.map((sym) => {
              const selected = selectedSymptoms.includes(sym.key);
              return (
                <button
                  key={sym.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSymptom(sym.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--r)',
                    fontSize: 'var(--fs-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: selected ? '1px solid var(--brand)' : '1px solid var(--border)',
                    backgroundColor: selected ? 'var(--brand-50)' : 'var(--surface-sunken)',
                    color: selected ? 'var(--brand-700)' : 'var(--ink)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span>{tr(sym.label)}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* Mô tả chi tiết quan sát */}
        <Field label={tr('Observation Details')} required hint={tr('Detailed description of behavior, temperature, physical signs.')}>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr('Describe horse behavior, physical signs, temperature, actions taken...')}
            disabled={busy}
          />
        </Field>

      </form>
    </Modal>
  );
}
