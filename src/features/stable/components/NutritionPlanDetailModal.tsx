import { useState } from 'react';
import { Icon } from "@/shared/components/ui/Icon";
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { Textarea } from '@/shared/components/form/Textarea';
import { Field } from '@/shared/components/form/Field';
import { useToast } from '@/shared/components/ui/Toast';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { nutritionApi } from '../api/nutritionApi';
import type { NutritionPlan } from '../types/nutrition';
import type { Role } from '@/shared/types/auth';
import { formatSupplyName } from '@/features/master-data/types/supplies';

interface NutritionPlanDetailModalProps {
  plan: NutritionPlan;
  currentRole: Role;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: (plan: NutritionPlan) => void;
}

export function NutritionPlanDetailModal({
  plan,
  currentRole,
  onClose,
  onRefresh,
  onEdit,
}: NutritionPlanDetailModalProps) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [vetNotes, setVetNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canReview =
    (currentRole === 'VETERINARIAN' || currentRole === 'CLUB_MANAGER') &&
    plan.status === 'PENDING_APPROVAL';

  const canEdit =
    (currentRole === 'HEAD_TRAINER' || currentRole === 'CLUB_MANAGER') &&
    (plan.status === 'DRAFT' || plan.status === 'REJECTED');

  const handleApprove = async () => {
    setBusy(true);
    setError('');
    try {
      await nutritionApi.review(plan.id, {
        action: 'APPROVE',
        vetNotes: vetNotes.trim() || undefined,
      });
      toast.show(tr('Nutrition plan approved successfully.'), 'ok');
      onRefresh();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError(tr('Please provide a reason for rejection.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await nutritionApi.review(plan.id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
        vetNotes: vetNotes.trim() || undefined,
      });
      toast.show(tr('Nutrition plan rejected with feedback sent to trainer.'), 'info');
      onRefresh();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setBusy(true);
    setError('');
    try {
      await nutritionApi.submitForApproval(plan.id);
      toast.show(tr('Submitted for veterinarian review.'), 'ok');
      onRefresh();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(tr('Are you sure you want to delete this nutrition plan draft?'))) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await nutritionApi.remove(plan.id);
      toast.show(tr('Nutrition plan deleted.'), 'ok');
      onRefresh();
      onClose();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const statusBadgeKind: Record<string, 'neutral' | 'warn' | 'ok' | 'danger'> = {
    DRAFT: 'neutral',
    PENDING_APPROVAL: 'warn',
    APPROVED: 'ok',
    REJECTED: 'danger',
    ARCHIVED: 'neutral',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: tr('Draft'),
    PENDING_APPROVAL: tr('Awaiting Vet Approval'),
    APPROVED: tr('Approved & Active'),
    REJECTED: tr('Rejected'),
    ARCHIVED: tr('Archived'),
  };

  const mealIcons: Record<string, string> = {
    MORNING: 'sun',
    NOON: 'cloudSun',
    EVENING: 'moon',
  };

  const mealNames: Record<string, string> = {
    MORNING: tr('Morning Meal'),
    NOON: tr('Noon Meal'),
    EVENING: tr('Evening Meal'),
  };

  const horse = plan.horse;
  const stallCode =
    plan.currentStallCode ||
    horse?.stallAllocations?.[0]?.stall?.code ||
    tr('Not assigned');

  return (
    <Modal
      title={`${tr('Nutrition Plan Details')} #${plan.planCode || plan.id.slice(0, 8)}`}
      onClose={onClose}
      width={740}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <Alert tone="danger">{error}</Alert>}

        {/* Header Horse & Status Overview */}
        <div
          style={{
            background: 'var(--color-surface-subtle)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}
            >
              {(horse?.name || 'H').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {horse?.name || tr('Unknown horse')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                {horse?.horseCode} • {tr('Stall:')} {stallCode}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Badge tone={statusBadgeKind[plan.status] || 'neutral'}>
              {statusLabels[plan.status] || plan.status}
            </Badge>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {tr('Updated:')} {new Date(plan.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Scientific Ratio Metric Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              {tr('Daily Feed')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
              {plan.dailyFeedWeightKg} kg
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              {tr('Body Weight Ratio')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
              {plan.targetWeightRatioPct}%{' '}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: plan.isWithinSafeRange ? 'var(--ok)' : 'var(--warn)',
                }}
              >
                ({plan.isWithinSafeRange ? tr('Optimal') : tr('Attention')})
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              {tr('Horse Weight Baseline')}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
              {plan.horseWeightSnapshot && plan.horseWeightSnapshot > 0 ? `${plan.horseWeightSnapshot} kg` : tr('Weight not recorded')}
            </div>
          </div>
        </div>

        {/* Cảnh báo lý do từ chối nếu có */}
        {plan.status === 'REJECTED' && plan.rejectionReason && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: '4px' }}>
              {tr('Rejection Reason from Veterinarian:')}
            </div>
            <div style={{ fontSize: '0.9rem' }}>{plan.rejectionReason}</div>
          </div>
        )}

        {/* Ghi chú dinh dưỡng từ Vet nếu có */}
        {plan.vetNotes && (
          <div
            style={{
              background: 'var(--info-bg)',
              border: '1px solid var(--info)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px' }}>
              {tr('Veterinarian Feeding Advice:')}
            </div>
            <div style={{ fontSize: '0.9rem' }}>{plan.vetNotes}</div>
          </div>
        )}

        {/* Chi tiết 3 bữa ăn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {tr('Meal Rations Breakdown')}
          </div>

          {(plan.mealsJson || []).map((meal) => (
            <div
              key={meal.mealType}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: 'var(--color-surface-subtle)',
                  padding: '0.5rem 0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span>
                  {mealIcons[meal.mealType] && <><Icon name={mealIcons[meal.mealType]} inline size={14} />{' '}</>}
                  {mealNames[meal.mealType] || meal.mealType}
                </span>
                {meal.time && (
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                    {meal.time}
                  </span>
                )}
              </div>

              <div style={{ padding: '0.75rem' }}>
                {meal.items.length === 0 ? (
                  <div style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    {tr('No feed items')}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '6px' }}>{tr('Feed / Supplement')}</th>
                        <th style={{ textAlign: 'center', paddingBottom: '6px' }}>{tr('Quantity')}</th>
                        <th style={{ textAlign: 'left', paddingBottom: '6px' }}>{tr('Notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td style={{ padding: '6px 0', fontWeight: 500 }}>
                            {formatSupplyName(it.supplyName)}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 0' }}>
                            <strong style={{ color: 'var(--color-primary)' }}>{it.amount}</strong> {it.unit}
                          </td>
                          <td style={{ padding: '6px 0', color: 'var(--color-text-secondary)' }}>
                            {it.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chỉ dẫn đặc biệt */}
        {plan.specialInstructions && (
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>
              {tr('Special Instructions:')}
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                padding: '0.625rem 0.875rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {plan.specialInstructions}
            </div>
          </div>
        )}

        {/* Khung nhập lý do từ chối khi Bác sĩ thú y bấm từ chối */}
        {canReview && rejecting && (
          <div
            style={{
              padding: '1rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <Field label={tr('Reason for Rejection (Required):')}>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={tr('Specify nutritional imbalances, colic risk, or contradictory medical conditions...')}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button size="sm" tone="ghost" onClick={() => setRejecting(false)}>
                {tr('Cancel')}
              </Button>
              <Button size="sm" tone="danger" onClick={handleReject} disabled={busy}>
                {busy ? tr('Submitting...') : tr('Confirm Rejection')}
              </Button>
            </div>
          </div>
        )}

        {/* Khung nhập ghi chú y khoa khi Bác sĩ thú y duyệt */}
        {canReview && !rejecting && (
          <Field label={tr('Veterinarian Notes (Optional):')}>
            <Textarea
              rows={2}
              value={vetNotes}
              onChange={(e) => setVetNotes(e.target.value)}
              placeholder={tr('Add digestive advice or condition-specific feeding tips...')}
            />
          </Field>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            {canEdit && (
              <Button tone="danger" size="sm" onClick={handleDelete} disabled={busy}>
                {tr('Delete Draft')}
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button tone="ghost" onClick={onClose} disabled={busy}>
              {tr('Close')}
            </Button>

            {/* Quyền HT: Sửa hoặc gửi duyệt lại */}
            {canEdit && (
              <>
                <Button
                  tone="secondary"
                  onClick={() => {
                    onClose();
                    onEdit?.(plan);
                  }}
                  disabled={busy}
                >
                  {tr('Edit Plan')}
                </Button>
                <Button tone="primary" onClick={handleSubmitForApproval} disabled={busy}>
                  {busy ? tr('Submitting...') : tr('Submit for Approval')}
                </Button>
              </>
            )}

            {/* Quyền VET: Duyệt hoặc Từ chối */}
            {canReview && !rejecting && (
              <>
                <Button
                  tone="danger"
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                >
                  {tr('Reject')}
                </Button>
                <Button
                  tone="primary"
                  onClick={handleApprove}
                  disabled={busy}
                >
                  {busy ? tr('Approving...') : tr('Approve Plan')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
