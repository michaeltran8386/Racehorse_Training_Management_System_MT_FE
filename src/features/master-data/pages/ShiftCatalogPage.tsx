import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from "@/shared/components/ui/Card";
import styles from './ShiftCatalogPage.module.css';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { DataTable } from '@/shared/components/ui/DataTable';
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal';
import { useToast } from '@/shared/components/ui/Toast';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { getShifts, setShiftActive } from '../api/suppliesApi';
import { ShiftModal } from '../components/ShiftModal';
import type { ShiftCatalogItem } from '../types/supplies';
import { useAppLanguage } from '@/shared/lib/language';
import { getLocalizedShiftName } from '@/features/stable/utils/shiftLocalization';

export default function ShiftCatalogPage() {
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const { isVietnamese: isVi } = useAppLanguage();
  const toast = useToast();
  const isManager = currentUser.role === 'CLUB_MANAGER';

  const [shifts, setShifts] = useState<ShiftCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [editingShift, setEditingShift] = useState<ShiftCatalogItem | null | undefined>(undefined);
  const [statusToggleShift, setStatusToggleShift] = useState<ShiftCatalogItem | null>(null);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getShifts({ includeInactive: true });
      setShifts(data);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleToggleStatus = async () => {
    if (!statusToggleShift) return;
    try {
      await setShiftActive(statusToggleShift.id, !statusToggleShift.isActive);
      toast.show(
        statusToggleShift.isActive
          ? tr('Deactivated shift {{name}}.', { name: statusToggleShift.name })
          : tr('Reactivated shift {{name}}.', { name: statusToggleShift.name }),
        'ok',
      );
      setStatusToggleShift(null);
      fetchShifts();
    } catch (err) {
      toast.show(messageFor(err), 'danger');
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={tr('Shift Catalog')}
        description={tr('Define standard shift hours for stable and horse care staff.')}
        action={
          isManager ? (
            <Button tone="primary" onClick={() => setEditingShift(null)}>
              + {tr('Add Shift')}
            </Button>
          ) : undefined
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {!loading && !error && (
        <div className={styles.summary}>
          <div><span>{tr('All')}</span><strong>{shifts.length}</strong></div>
          <div><span>{tr('Active')}</span><strong>{shifts.filter((shift) => shift.isActive).length}</strong></div>
          <div><span>{tr('Overnight')}</span><strong>{shifts.filter((shift) => shift.isOvernight).length}</strong></div>
        </div>
      )}

      <Card pad={0}>
        <DataTable<ShiftCatalogItem>
        pageSize={10}
        noun="shifts"
        loading={loading}
        rows={shifts}
        rowKey={(s) => s.id}
        caption={tr('Stable shifts catalog')}
        columns={[
          {
            key: 'code',
            header: tr('Code'),
            render: (s) => <strong className={styles.code}>{s.code}</strong>,
          },
          {
            key: 'name',
            header: tr('Shift Name'),
            render: (s) => (
              <div>
                <div className={styles.shiftName}>{getLocalizedShiftName(s, isVi)}</div>
                {s.name && s.name !== getLocalizedShiftName(s, isVi) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.name}</div>
                )}
                {s.description && (
                  <div className={styles.description}>{s.description}</div>
                )}
              </div>
            ),
          },
          {
            key: 'hours',
            header: tr('Hours'),
            render: (s) => (
              <span className={styles.hours}>
                {s.startTime} – {s.endTime}
              </span>
            ),
          },
          {
            key: 'isOvernight',
            header: tr('Overnight'),
            render: (s) =>
              s.isOvernight ? (
                <Badge tone="warn">{tr('Overnight')}</Badge>
              ) : (
                <span style={{ color: 'var(--muted)' }}>{tr('Daytime')}</span>
              ),
          },
          {
            key: 'sortOrder',
            header: tr('Sort Order'),
            render: (s) => s.sortOrder,
          },
          {
            key: 'status',
            header: tr('Status'),
            render: (s) => (
              <Badge tone={s.isActive ? 'ok' : 'neutral'}>
                {s.isActive ? tr('Active') : tr('Inactive')}
              </Badge>
            ),
          },
          ...(isManager
            ? [
                {
                  key: 'actions',
                  header: tr('Actions'),
                  align: 'right' as const,
                  render: (s: ShiftCatalogItem) => (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button tone="ghost" size="sm" onClick={() => setEditingShift(s)}>
                        {tr('Edit')}
                      </Button>
                      <Button
                        tone={s.isActive ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => setStatusToggleShift(s)}
                      >
                        {s.isActive ? tr('Stop using') : tr('Use again')}
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      </Card>

      {/* Dialog Thêm/Sửa */}
      {editingShift !== undefined && (
        <ShiftModal
          item={editingShift ?? undefined}
          onClose={() => setEditingShift(undefined)}
          onSaved={() => {
            setEditingShift(undefined);
            fetchShifts();
          }}
        />
      )}

      {/* Modal xác nhận Đổi trạng thái */}
      {statusToggleShift && (
        <ConfirmModal
          title={
            statusToggleShift.isActive
              ? tr('Deactivate shift: {{name}}', { name: statusToggleShift.name })
              : tr('Reactivate shift: {{name}}', { name: statusToggleShift.name })
          }
          subtitle={
            statusToggleShift.isActive
              ? tr('Note: If this shift currently has staff assigned from today onwards, deactivation will be blocked.')
              : tr('This shift will be selectable again in the weekly shift roster.')
          }
          confirmLabel={statusToggleShift.isActive ? tr('Stop using') : tr('Use again')}
          cancelLabel={tr('Keep')}
          tone={statusToggleShift.isActive ? 'danger' : 'warn'}
          onCancel={() => setStatusToggleShift(null)}
          onConfirm={handleToggleStatus}
        >
          {statusToggleShift.isActive
            ? tr('Are you sure you want to deactivate this shift?')
            : tr('Are you sure you want to reactivate this shift?')}
        </ConfirmModal>
      )}
    </div>
  );
}
