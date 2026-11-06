import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { useToast } from '@/shared/components/ui/Toast';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { createShift, updateShift } from '../api/suppliesApi';
import type { ShiftCatalogItem } from '../types/supplies';

interface ShiftModalProps {
  item?: ShiftCatalogItem;
  onClose: () => void;
  onSaved: () => void;
}

function parseTimeToMinutes(t: string): number {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function ShiftModal({ item, onClose, onSaved }: ShiftModalProps) {
  const toast = useToast();
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [startTime, setStartTime] = useState(item?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(item?.endTime ?? '16:00');
  const [sortOrder, setSortOrder] = useState<string>(String(item?.sortOrder ?? 0));
  const [description, setDescription] = useState(item?.description ?? '');

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Tính thời lượng và kiểm tra qua đêm
  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  const isOvernight = endM < startM;
  const durationMinutes = isOvernight ? 24 * 60 - startM + endM : endM - startM;
  const durationHours = (durationMinutes / 60).toFixed(1);

  const errors = {
    code: item || /^[A-Z0-9_-]{2,20}$/.test(code)
      ? ''
      : tr('Shift code must be 2-20 uppercase letters, numbers, hyphens or underscores.'),
    name:
      name.trim().length >= 2 && name.trim().length <= 50
        ? ''
        : tr('Shift name must be between 2 and 50 characters.'),
    time:
      startM === endM
        ? tr('End time must be different from start time.')
        : durationMinutes < 120 || durationMinutes > 720
          ? tr('Shift must be between 2 and 12 hours long.')
          : '',
    sortOrder:
      Number.isInteger(Number(sortOrder)) && Number(sortOrder) >= 0 && Number(sortOrder) <= 99
        ? ''
        : tr('Sort order must be an integer between 0 and 99.'),
  };

  const isValid = Object.values(errors).every((e) => !e);

  const handleClose = () => {
    if (!dirty || window.confirm(tr('Discard unsaved changes?'))) {
      onClose();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || busy) return;

    setBusy(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        sortOrder: Number(sortOrder) || 0,
        description: description.trim() || undefined,
      };

      if (item) {
        await updateShift(item.id, payload);
        toast.show(tr('Shift details updated.'), 'ok');
      } else {
        await createShift({
          code: code.trim().toUpperCase(),
          ...payload,
        });
        toast.show(tr('New shift created successfully.'), 'ok');
      }
      onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={item ? tr('Edit shift: {{code}}', { code: item.code }) : tr('Add New Shift')}
      onClose={handleClose}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        {!item ? (
          <Field label={tr('Shift Code')} required error={dirty ? errors.code : ''}>
            <Input
              value={code}
              placeholder={tr('e.g. SHIFT_MORNING')}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setDirty(true);
              }}
            />
          </Field>
        ) : (
          <Field label={tr('Shift Code')}>
            <Input value={item.code} disabled />
          </Field>
        )}

        <Field label={tr('Shift Name')} required error={dirty ? errors.name : ''}>
          <Input
            value={name}
            placeholder={tr('e.g. Morning Shift (05:00 - 13:00)')}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label={tr('Start Time (HH:mm)')} required>
            <Input
              type="time"
              step={900}
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setDirty(true);
              }}
            />
          </Field>

          <Field label={tr('End Time (HH:mm)')} required>
            <Input
              type="time"
              step={900}
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>

        {errors.time && dirty && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: '-0.25rem 0 0.5rem 0' }}>
            {errors.time}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--surface-muted)', borderRadius: 'var(--r-sm)' }}>
          <span style={{ fontSize: '0.875rem' }}>
            {tr('Shift duration: {{hours}} hours', { hours: durationHours })}
          </span>
          {isOvernight && <Badge tone="warn">{tr('Overnight Shift')}</Badge>}
        </div>

        <Field label={tr('Display order (0-99)')} error={dirty ? errors.sortOrder : ''}>
          <Input
            type="number"
            min={0}
            max={99}
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <Field label={tr('Shift Description')}>
          <Textarea
            rows={2}
            value={description}
            placeholder={tr('Main tasks during this shift...')}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Button tone="secondary" type="button" onClick={handleClose}>
            {tr('Cancel')}
          </Button>
          <Button tone="primary" type="submit" disabled={!isValid || busy}>
            {busy ? tr('Saving...') : item ? tr('Save Changes') : tr('Save Shift')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
