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
import { formatSupplyUnit, formatSupplyName } from '@/features/master-data/types/supplies';

interface RestockRequestModalProps {
  zones: Array<{ id: string; name: string; code: string }>;
  supplies: Array<{ id: string; name: string; code: string; unit: string; category?: string }>;
  defaultZoneId?: string;
  defaultSupplyId?: string;
  /** Quản lý CLB nhập bổ sung kho trực tiếp: phiếu tự động Đã duyệt, không cần tự duyệt */
  direct?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function RestockRequestModal({
  zones,
  supplies,
  defaultZoneId,
  defaultSupplyId,
  direct = false,
  onClose,
  onSaved,
}: RestockRequestModalProps) {
  const toast = useToast();
  const [zoneId, setZoneId] = useState(defaultZoneId || (zones[0]?.id ?? ''));
  const [supplyId, setSupplyId] = useState(defaultSupplyId || (supplies[0]?.id ?? ''));
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [urgencyReason, setUrgencyReason] = useState('');

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

    const qty = parseFloat(requestedQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError(tr('Requested quantity must be greater than zero.'));
      return;
    }

    if (!direct && !urgencyReason.trim()) {
      setError(tr('Please enter the urgency reason for this restock proposal.'));
      return;
    }

    setBusy(true);
    try {
      const payload = {
        zoneId,
        supplyId,
        requestedQuantity: qty,
        urgencyReason: urgencyReason.trim() || undefined,
      };
      if (direct) {
        await inventoryApi.createDirectRestock(payload);
        toast.show(tr('Direct restock created and approved. Confirm receipt when the goods arrive.'), 'ok');
      } else {
        await inventoryApi.createRequest(payload);
        toast.show(
          tr('Restock proposal submitted successfully. Notification sent to Club Manager.'),
          'ok',
        );
      }
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
      title={direct ? tr('Direct stock replenishment') : tr('Propose Supply Restock')}
      subtitle={
        direct
          ? tr('Created by the Club Manager and approved automatically. Only the receipt confirmation remains.')
          : tr('Submit replenishment proposal for stable staff and veterinarians.')
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
          <Field label={tr('Target Stall Zone')} required>
            <SearchSelect
              placeholder={tr('Target Stall Zone')}
              options={zoneOptions}
              value={zoneId}
              onChange={setZoneId}
              disabled={busy}
            />
          </Field>

          <Field label={tr('Supply Item')} required>
            <SearchSelect
              placeholder={tr('Supply Item')}
              options={supplyOptions}
              value={supplyId}
              onChange={setSupplyId}
              disabled={busy}
            />
          </Field>
        </div>

        <Field
          label={`${tr('Requested Quantity')} (${formatSupplyUnit(selectedSupply?.unit || 'unit')})`}
          required
          hint={tr('Number of units required for this stall zone.')}
        >
          <Input
            type="number"
            step="any"
            min="0.1"
            value={requestedQuantity}
            onChange={(e) => setRequestedQuantity(e.target.value)}
            placeholder="e.g. 25"
            disabled={busy}
            required
          />
        </Field>

        <Field
          label={direct ? tr('Note (optional)') : tr('Urgency Reason & Operational Justification')}
          required={!direct}
          hint={tr('Detail why this restock is urgent (e.g. Running out of feed before tomorrow morning, critical medication).')}
        >
          <Textarea
            rows={3}
            value={urgencyReason}
            onChange={(e) => setUrgencyReason(e.target.value)}
            placeholder={tr('Describe urgency, anticipated shortage, or immediate needs...')}
            disabled={busy}
            required={!direct}
          />
        </Field>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" tone="secondary" onClick={onClose} disabled={busy}>
            {tr('Cancel')}
          </Button>
          <Button type="submit" tone="primary" disabled={busy}>
            {busy ? tr('Submitting...') : direct ? tr('Create approved restock') : tr('Submit Restock Proposal')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
