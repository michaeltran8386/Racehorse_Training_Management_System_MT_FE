import { useMemo, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { SearchSelect } from '@/shared/components/form/SearchSelect';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { useToast } from '@/shared/components/ui/Toast';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { inventoryApi } from '../api/inventoryApi';
import type { StockItemRow } from '../types/inventory';
import { formatSupplyUnit, formatSupplyName } from '@/features/master-data/types/supplies';

interface StockAdjustModalProps {
  stockItem?: StockItemRow | null;
  zones: Array<{ id: string; name: string; code: string }>;
  supplies: Array<{ id: string; name: string; code: string; unit: string }>;
  defaultZoneId?: string;
  defaultSupplyId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function StockAdjustModal({
  stockItem,
  zones,
  supplies,
  defaultZoneId,
  defaultSupplyId,
  onClose,
  onSaved,
}: StockAdjustModalProps) {
  const toast = useToast();
  const [zoneId, setZoneId] = useState(stockItem?.zoneId || defaultZoneId || (zones[0]?.id ?? ''));
  const [supplyId, setSupplyId] = useState(stockItem?.supplyId || defaultSupplyId || (supplies[0]?.id ?? ''));
  const [actualQuantity, setActualQuantity] = useState(stockItem ? String(stockItem.quantity) : '');
  const [minThreshold, setMinThreshold] = useState(stockItem ? String(stockItem.minThreshold) : '10');
  const [reason, setReason] = useState(stockItem?.notes || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedSupply = useMemo(
    () => supplies.find((s) => s.id === supplyId),
    [supplies, supplyId],
  );

  const zoneOptions = useMemo(
    () => zones.map((z) => ({ value: z.id, label: `${z.code} - ${z.name}` })),
    [zones],
  );

  const supplyOptions = supplies.map((s) => ({ value: s.id, label: `${formatSupplyName(s.name)} (${formatSupplyUnit(s.unit)})` }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseFloat(actualQuantity);
    if (isNaN(qty) || qty < 0) {
      setError(tr('Actual quantity must be a non-negative number.'));
      return;
    }

    const threshold = parseFloat(minThreshold);
    if (isNaN(threshold) || threshold < 0) {
      setError(tr('Minimum threshold must be a non-negative number.'));
      return;
    }

    if (!reason.trim()) {
      setError(tr('Please enter the reason for stock adjustment.'));
      return;
    }

    setBusy(true);
    try {
      await inventoryApi.adjustStock({
        zoneId,
        supplyId,
        actualQuantity: qty,
        minThreshold: threshold,
        reason: reason.trim(),
      });
      toast.show(tr('Stock balance adjusted successfully.'), 'ok');
      onSaved();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={stockItem ? tr('Adjust Physical Inventory Count') : tr('Initialize / Adjust Stock Balance')}
      subtitle={tr('Physical stock count update with audit logging.')}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
          <Field label={tr('Stall Zone')} required>
            {stockItem ? (
              <Input value={`${stockItem.zoneCode} - ${stockItem.zoneName}`} disabled />
            ) : (
              <SearchSelect
                placeholder={tr('Stall Zone')}
                options={zoneOptions}
                value={zoneId}
                onChange={setZoneId}
                disabled={busy}
              />
            )}
          </Field>

          <Field label={tr('Supply Item')} required>
            {stockItem ? (
              <Input value={formatSupplyName(stockItem.supplyName)} disabled />
            ) : (
              <SearchSelect
                placeholder={tr('Supply Item')}
                options={supplyOptions}
                value={supplyId}
                onChange={setSupplyId}
                disabled={busy}
              />
            )}
          </Field>
        </div>

        {stockItem && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--surface-sunken)',
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 'var(--fs-sm)',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{tr('Current Recorded System Stock')}:</span>
            <strong style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)' }}>
              {stockItem.quantity} {formatSupplyUnit(stockItem.unit)}
            </strong>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field
            label={`${tr('Actual Physical Quantity')} (${formatSupplyUnit(selectedSupply?.unit || stockItem?.unit || 'unit')})`}
            required
            hint={tr('Physical count measured on-site.')}
          >
            <Input
              type="number"
              step="any"
              min="0"
              value={actualQuantity}
              onChange={(e) => setActualQuantity(e.target.value)}
              placeholder="e.g. 50"
              disabled={busy}
              required
            />
          </Field>

          <Field
            label={`${tr('Minimum Alert Threshold')} (${formatSupplyUnit(selectedSupply?.unit || stockItem?.unit || 'unit')})`}
            required
            hint={tr('Trigger warning when stock drops below this.')}
          >
            <Input
              type="number"
              step="any"
              min="0"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              placeholder="e.g. 10"
              disabled={busy}
              required
            />
          </Field>
        </div>

        <Field
          label={tr('Adjustment Reason / Audit Notes')}
          required
          hint={tr('Explain why the count changed (e.g. Weekly inventory check, natural shrinkage).')}
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tr('Enter physical count verification details...')}
            disabled={busy}
            required
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" tone="secondary" onClick={onClose} disabled={busy}>
            {tr('Cancel')}
          </Button>
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? tr('Saving...') : tr('Confirm Stock Adjustment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
