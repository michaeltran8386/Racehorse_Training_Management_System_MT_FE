import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { useToast } from '@/shared/components/ui/Toast';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { inventoryApi } from '../api/inventoryApi';
import type { RestockRequestItem } from '../types/inventory';
import { formatSupplyUnit, formatSupplyName } from '@/features/master-data/types/supplies';

interface RestockReviewModalProps {
  request: RestockRequestItem;
  onClose: () => void;
  onSaved: () => void;
}

export function RestockReviewModal({ request, onClose, onSaved }: RestockReviewModalProps) {
  const toast = useToast();
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approvedQuantity, setApprovedQuantity] = useState(String(request.requestedQuantity));
  const [rejectionReason, setRejectionReason] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let qty: number | undefined = undefined;
    if (action === 'APPROVE') {
      qty = parseFloat(approvedQuantity);
      if (isNaN(qty) || qty <= 0) {
        setError(tr('Approved quantity must be greater than zero.'));
        return;
      }
    } else {
      if (!rejectionReason.trim()) {
        setError(tr('Please provide a reason for rejecting this restock proposal.'));
        return;
      }
    }

    setBusy(true);
    try {
      await inventoryApi.reviewRequest(request.id, {
        action,
        approvedQuantity: action === 'APPROVE' ? qty : undefined,
        rejectionReason: action === 'REJECT' ? rejectionReason.trim() : undefined,
      });

      toast.show(
        action === 'APPROVE'
          ? tr('Proposal approved successfully. Ready for procurement/delivery.')
          : tr('Proposal rejected.'),
        'ok',
      );
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
      title={tr('Review Restock Proposal')}
      subtitle={`${request.requestNumber} · ${request.supply.name} (${request.zone.name})`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Thông tin phiếu đề xuất */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--surface-sunken)',
            borderRadius: 'var(--r-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Proposal Number')}:</span>
            <strong>{request.requestNumber}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Target Stall Zone')}:</span>
            <strong>{request.zone.name} ({request.zone.code})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Supply Item')}:</span>
            <strong>{formatSupplyName(request.supply.name)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Requested Quantity')}:</span>
            <Badge tone="info">
              {request.requestedQuantity} {formatSupplyUnit(request.supply.unit)}
            </Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Requested By')}:</span>
            <span>{request.requestedBy.fullName} ({request.requestedBy.role})</span>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            <span style={{ color: 'var(--muted)' }}>{tr('Urgency Reason')}:</span>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--ink)' }}>
              "{request.urgencyReason}"
            </p>
          </div>
        </div>

        {/* Quyết định phê duyệt */}
        <Field label={tr('Manager Decision')} required>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <label
              style={{
                flex: 1,
                padding: '0.75rem',
                border: `2px solid ${action === 'APPROVE' ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: action === 'APPROVE' ? 'var(--brand-alpha)' : 'var(--surface)',
                fontWeight: action === 'APPROVE' ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="decision"
                value="APPROVE"
                checked={action === 'APPROVE'}
                onChange={() => setAction('APPROVE')}
                disabled={busy}
              />
              <span style={{ color: 'var(--ink)' }}>{tr('Approve Proposal')}</span>
            </label>

            <label
              style={{
                flex: 1,
                padding: '0.75rem',
                border: `2px solid ${action === 'REJECT' ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: action === 'REJECT' ? 'var(--danger-bg)' : 'var(--surface)',
                fontWeight: action === 'REJECT' ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="decision"
                value="REJECT"
                checked={action === 'REJECT'}
                onChange={() => setAction('REJECT')}
                disabled={busy}
              />
              <span style={{ color: action === 'REJECT' ? 'var(--danger)' : 'var(--ink)' }}>
                {tr('Reject Proposal')}
              </span>
            </label>
          </div>
        </Field>

        {action === 'APPROVE' ? (
          <Field
            label={`${tr('Approved Quantity')} (${formatSupplyUnit(request.supply.unit)})`}
            required
            hint={tr('You can modify the approved quantity based on club budget or warehouse supply.')}
          >
            <Input
              type="number"
              step="any"
              min="0.1"
              value={approvedQuantity}
              onChange={(e) => setApprovedQuantity(e.target.value)}
              placeholder="e.g. 20"
              disabled={busy}
              required
            />
          </Field>
        ) : (
          <Field
            label={tr('Rejection Reason')}
            required
            hint={tr('Provide a reason so staff understand why this proposal was rejected.')}
          >
            <Textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={tr('e.g. Inventory in central warehouse is currently waiting for supplier shipment...')}
              disabled={busy}
              required
            />
          </Field>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" tone="secondary" onClick={onClose} disabled={busy}>
            {tr('Cancel')}
          </Button>
          <Button
            type="submit"
            tone={action === 'APPROVE' ? 'primary' : 'danger'}
            disabled={busy}
          >
            {busy
              ? tr('Processing...')
              : action === 'APPROVE'
              ? tr('Confirm Approval')
              : tr('Confirm Rejection')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
