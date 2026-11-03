import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from "@/shared/components/ui/Card";
import styles from './CatalogPages.module.css';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { DataTable } from '@/shared/components/ui/DataTable';
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { useToast } from '@/shared/components/ui/Toast';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { getSupplies, setSupplyActive } from '../api/suppliesApi';
import { SupplyModal } from '../components/SupplyModal';
import {
  SUPPLY_UNIT_LABELS,
  formatSupplyName,
  getFriendlyCategoryName,
  type SupplyCatalogItem,
  type SupplyCategory,
} from '../types/supplies';

// Chỉ thuốc, vắc-xin, thuốc tẩy giun có thời gian ngưng thuốc; thức ăn/dụng cụ thì cột này vô nghĩa.
const WITHDRAWAL_CATEGORIES = new Set<string>(['MEDICINE', 'VACCINE', 'DEWORMER']);

export default function SuppliesCatalogPage() {
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const isManager = currentUser.role === 'CLUB_MANAGER';

  const [items, setItems] = useState<SupplyCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [search, setSearch] = useState('');

  // Modals
  const [editingItem, setEditingItem] = useState<SupplyCatalogItem | null | undefined>(undefined);
  const [statusToggleItem, setStatusToggleItem] = useState<SupplyCatalogItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSupplies({
        category: categoryFilter !== 'ALL' ? (categoryFilter as SupplyCategory) : undefined,
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, search]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const handleToggleStatus = async () => {
    if (!statusToggleItem) return;
    try {
      await setSupplyActive(statusToggleItem.id, !statusToggleItem.isActive);
      toast.show(
        statusToggleItem.isActive
          ? tr('Deactivated supply {{name}}.', { name: statusToggleItem.name })
          : tr('Reactivated supply {{name}}.', { name: statusToggleItem.name }),
        'ok',
      );
      setStatusToggleItem(null);
      fetchSupplies();
    } catch (err) {
      toast.show(messageFor(err), 'danger');
    }
  };

  const categoryOptions = [
    { value: 'ALL', label: tr('All Categories') },
    // Cùng bộ nhóm với Tồn kho khu chuồng (BE gom nhóm theo FEED/MEDICINE/CARE/EQUIPMENT).
    { value: 'FEED', label: tr('Feed & Forage') },
    { value: 'MEDICINE', label: tr('Medications & Vaccines') },
    { value: 'CARE', label: tr('Daily Care & Supplements') },
    { value: 'EQUIPMENT', label: tr('Equipment & Tools') },
  ];
  const showWithdrawal = items.some((it) => WITHDRAWAL_CATEGORIES.has(it.category));

  const statusOptions = [
    { value: 'ACTIVE', label: tr('Active') },
    { value: 'INACTIVE', label: tr('Inactive') },
    { value: 'ALL', label: tr('All Statuses') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader
        title={tr('Supplies Catalog')}
        description={tr(isManager ? 'Manage supply details, prices and availability in the catalog.' : currentUser.role === 'VETERINARIAN' ? 'Look up medicines, units and withdrawal periods before treatment.' : 'Look up available feed, medicines and equipment.')}
        action={
          isManager ? (
            <Button tone="primary" icon="plus" onClick={() => setEditingItem(null)}>
              {tr('Add Supply')}
            </Button>
          ) : undefined
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Bộ lọc */}
      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            aria-label={tr('Search by supply name...')}
            placeholder={tr('Search by supply name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.category}>
          <Select
            aria-label={tr('Category')}
            value={categoryFilter}
            options={categoryOptions}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>

        <div className={styles.status}>
          <Select
            aria-label={tr('Status')}
            value={statusFilter}
            options={statusOptions}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        {(categoryFilter !== 'ALL' || statusFilter !== 'ACTIVE' || search) && (
          <Button
            tone="ghost"
            onClick={() => {
              setCategoryFilter('ALL');
              setStatusFilter('ACTIVE');
              setSearch('');
            }}
          >
            {tr('Clear filter')}
          </Button>
        )}
      </div>

      {/* Bảng dữ liệu */}
      <Card pad={0}>
        <DataTable<SupplyCatalogItem>
        pageSize={10}
        noun="supplies"
        loading={loading}
        rows={items}
        rowKey={(it) => it.id}
        selectedKey={selectedId}
        onRowClick={(it) => setSelectedId((prev) => (prev === it.id ? null : it.id))}
        caption={tr('Supplies and materials catalog')}
        columns={[
          {
            key: 'name',
            header: tr('Supply Name'),
            render: (it) => (
              <div>
                <div className={styles.supplyName}>{formatSupplyName(it.name)}</div>
                {it.description && (
                  <div className={styles.supplyDescription}>{it.description}</div>
                )}
              </div>
            ),
          },
          {
            key: 'category',
            header: tr('Category'),
            render: (it) => getFriendlyCategoryName(it.category),
          },
          {
            key: 'unit',
            header: tr('Unit'),
            render: (it) => tr(SUPPLY_UNIT_LABELS[it.unit] || it.unit),
          },
          ...(isManager
            ? [
                {
                  key: 'unitPrice',
                  header: tr('Unit Price (VND)'),
                  render: (it: SupplyCatalogItem) =>
                    it.unitPrice !== null ? it.unitPrice.toLocaleString('vi-VN') + ' đ' : '—',
                },
              ]
            : []),
          ...(showWithdrawal
            ? [
                {
                  key: 'withdrawalDays',
                  header: tr('Withdrawal'),
                  render: (it: SupplyCatalogItem) =>
                    !WITHDRAWAL_CATEGORIES.has(it.category) ? (
                      <span className={styles.supplyDescription}>{tr('Not applicable')}</span>
                    ) : it.withdrawalDays !== null && it.withdrawalDays !== undefined ? (
                      `${it.withdrawalDays} ${tr('days')}`
                    ) : (
                      '—'
                    ),
                },
              ]
            : []),
          {
            key: 'status',
            header: tr('Status'),
            render: (it) => (
              <Badge tone={it.isActive ? 'ok' : 'neutral'}>
                {it.isActive ? tr('Active') : tr('Inactive')}
              </Badge>
            ),
          },
          ...(isManager
            ? [
                {
                  key: 'actions',
                  header: tr('Actions'),
                  align: 'right' as const,
                  render: (it: SupplyCatalogItem) => (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button tone="ghost" size="sm" onClick={() => setEditingItem(it)}>
                        {tr('Edit')}
                      </Button>
                      <Button
                        tone={it.isActive ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={() => setStatusToggleItem(it)}
                      >
                        {it.isActive ? tr('Stop using') : tr('Use again')}
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
      {isManager && editingItem !== undefined && (
        <SupplyModal
          item={editingItem ?? undefined}
          onClose={() => setEditingItem(undefined)}
          onSaved={() => {
            setEditingItem(undefined);
            fetchSupplies();
          }}
        />
      )}

      {/* Modal xác nhận Đổi trạng thái */}
      {isManager && statusToggleItem && (
        <ConfirmModal
          title={
            statusToggleItem.isActive
              ? tr('Deactivate supply: {{name}}', { name: statusToggleItem.name })
              : tr('Reactivate supply: {{name}}', { name: statusToggleItem.name })
          }
          subtitle={
            statusToggleItem.isActive
              ? tr('This supply will no longer be selectable for feed rations or supply requests.')
              : tr('This supply will be selectable again for feed rations and supply requests.')
          }
          confirmLabel={statusToggleItem.isActive ? tr('Stop using') : tr('Use again')}
          cancelLabel={tr('Keep')}
          tone={statusToggleItem.isActive ? 'danger' : 'warn'}
          onCancel={() => setStatusToggleItem(null)}
          onConfirm={handleToggleStatus}
        >
          {statusToggleItem.isActive
            ? tr('Are you sure you want to deactivate this supply?')
            : tr('Are you sure you want to reactivate this supply?')}
        </ConfirmModal>
      )}
    </div>
  );
}
