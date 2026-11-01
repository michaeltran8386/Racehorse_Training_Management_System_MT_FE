import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { useToast } from '@/shared/components/ui/Toast';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { copyWeekRosters } from '../api/shiftRosterApi';

interface CopyWeekRosterModalProps {
  sourceWeekStart: string; // YYYY-MM-DD
  sourceWeekLabel: string; // e.g. "Week of 12/10/2026 – 18/10/2026"
  targetWeekStart: string; // YYYY-MM-DD
  targetWeekLabel: string; // e.g. "Week of 19/10/2026 – 25/10/2026"
  isPastTargetWeek: boolean;
  onClose: () => void;
  onCopied: () => void;
}

export function CopyWeekRosterModal({
  sourceWeekStart,
  sourceWeekLabel,
  targetWeekStart,
  targetWeekLabel,
  isPastTargetWeek,
  onClose,
  onCopied,
}: CopyWeekRosterModalProps) {
  const toast = useToast();
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || isPastTargetWeek) return;

    setBusy(true);
    setError('');

    try {
      const res = await copyWeekRosters({
        sourceWeekStart,
        targetWeekStart,
        overwrite,
      });

      const skippedText =
        res.skippedInactiveGrooms > 0
          ? ` ${tr('Skipped {{count}} inactive staff.', { count: res.skippedInactiveGrooms })}`
          : '';
      toast.show(
        tr('Copied {{copied}} slots.{{skipped}}', {
          copied: res.copiedCount,
          skipped: skippedText,
        }),
        'ok',
      );
      onCopied();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={tr('Copy Weekly Roster')} onClose={onClose}>
      <form onSubmit={handleCopy} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        {isPastTargetWeek && (
          <Alert tone="warn">
            {tr('Cannot copy to a past week. Please navigate to the current or a future week.')}
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface-muted)', padding: '0.875rem', borderRadius: 'var(--r-sm)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {tr('Copy from week:')}
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{sourceWeekLabel}</div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {tr('To target week:')}
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--brand-700)' }}>
              {targetWeekLabel}
            </div>
          </div>
        </div>

        <Field label={tr('When destination slot already has assignments:')} required>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="overwrite"
                checked={!overwrite}
                onChange={() => setOverwrite(false)}
              />
              <span>{tr('Keep existing assignments (only fill empty slots)')}</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="overwrite"
                checked={overwrite}
                onChange={() => setOverwrite(true)}
              />
              <span>{tr('Overwrite all (clear destination assignments and replace)')}</span>
            </label>
          </div>
        </Field>

        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: '0.5rem 0' }}>
          {tr('* Inactive staff will automatically be skipped.')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Button tone="secondary" type="button" onClick={onClose}>
            {tr('Cancel')}
          </Button>
          <Button tone="primary" type="submit" disabled={busy || isPastTargetWeek}>
            {busy ? tr('Copying...') : tr('Copy')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
