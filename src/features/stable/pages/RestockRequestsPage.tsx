import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Alert } from '@/shared/components/ui/Alert';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { tr } from '@/shared/i18n/tr';
import styles from './RestockRequestsPage.module.css';
import { messageFor } from '@/shared/lib/messages';
import { getZones } from '../api';
import { getSupplies } from '@/features/master-data/api/suppliesApi';
import { inventoryApi } from '../api/inventoryApi';
import { RestockRequestModal } from '../components/RestockRequestModal';
import { RestockReviewModal } from '../components/RestockReviewModal';
import { RestockDeliverModal } from '../components/RestockDeliverModal';
import type { RestockRequestItem, RestockStatus } from '../types/inventory';
import type { Zone } from '../types';
import { type SupplyCatalogItem, formatSupplyUnit, formatSupplyName, getFriendlyCategoryName } from '@/features/master-data/types/supplies';

export default function RestockRequestsPage() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const targetSearch = searchParams.get('search') ?? '';
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const isManager = currentUser.role === 'CLUB_MANAGER';
  // Chỉ Groom/Vet gửi đề xuất (chờ CM duyệt); CM nhập bổ sung kho trực tiếp
  const canPropose = currentUser.role === 'GROOM' || currentUser.role === 'VETERINARIAN';
  const { isVietnamese } = useAppLanguage();

  const [zones, setZones] = useState<Zone[]>([]);
  const [supplies, setSupplies] = useState<SupplyCatalogItem[]>([]);
  const [items, setItems] = useState<RestockRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [lastFilterTarget, setLastFilterTarget] = useState<string | null>(null);
  const filterTarget = highlightId ? `${highlightId}:${targetSearch}` : null;
  if (lastFilterTarget !== filterTarget) {
    setLastFilterTarget(filterTarget);
    if (highlightId) {
      setStatusFilter('ALL');
      setZoneFilter('ALL');
      setSearch(targetSearch);
    }
  }

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<RestockRequestItem | null>(null);
  const [deliveringItem, setDeliveringItem] = useState<RestockRequestItem | null>(null);

  // Load Zones & Supplies
  useEffect(() => {
    async function loadMaster() {
      try {
        const [zList, sList] = await Promise.all([
          getZones(true),
          getSupplies({ status: 'ACTIVE' }),
        ]);
        setZones(zList);
        setSupplies(sList);
      } catch (err) {
        console.error('Failed to load zones or supplies:', err);
      }
    }
    loadMaster();
  }, []);

  // Fetch restock requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inventoryApi.listRequests({
        status: statusFilter !== 'ALL' ? (statusFilter as RestockStatus) : undefined,
        zoneId: zoneFilter !== 'ALL' ? zoneFilter : undefined,
        search: search.trim() || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, zoneFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Tự động làm mới khi có đơn đang trong trạng thái ĐANG GIAO (DELIVERING)
  const hasActiveDeliveries = useMemo(
    () => items.some((it) => it.status === 'DELIVERING'),
    [items],
  );

  useEffect(() => {
    if (!hasActiveDeliveries) return;
    const interval = setInterval(() => {
      fetchRequests();
    }, 2000);
    return () => clearInterval(interval);
  }, [hasActiveDeliveries, fetchRequests]);

  const statusTabs = useMemo(
    () => [
      { key: 'ALL', label: tr('All Proposals') },
      { key: 'PENDING', label: tr('Pending Review') },
      { key: 'DELIVERING', label: isVietnamese ? 'Đang giao hàng' : 'Delivering' },
      { key: 'APPROVED', label: tr('Approved & In-Transit') },
      { key: 'DELIVERED', label: tr('Delivered / In Stock') },
      { key: 'REJECTED', label: tr('Rejected') },
    ],
    [isVietnamese],
  );

  const zoneOptions = useMemo(() => {
    return [
      { value: 'ALL', label: tr('All Stall Zones') },
      ...zones.map((z) => ({ value: z.id, label: `${z.code} - ${z.name}` })),
    ];
  }, [zones, isVietnamese]);

  const getStatusBadge = (status: RestockStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge tone="warn">{tr('Pending Review')}</Badge>;
      case 'DELIVERING':
        return <Badge tone="warn">{isVietnamese ? 'Đang giao hàng' : 'Delivering'}</Badge>;
      case 'APPROVED':
        return <Badge tone="info">{tr('Approved')}</Badge>;
      case 'DELIVERED':
        return <Badge tone="ok">{tr('Delivered')}</Badge>;
      case 'REJECTED':
        return <Badge tone="danger">{tr('Rejected')}</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const columns: Column<RestockRequestItem>[] = useMemo(
    () => [
      {
        key: 'requestNumber',
        header: tr('Proposal No.'),
        width: '150px',
        render: (row) => (
          <div>
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--brand-700)' }}>{row.requestNumber}</strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {new Date(row.createdAt).toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-GB')}
            </div>
          </div>
        ),
      },
      {
        key: 'supply',
        header: tr('Supply & Stall Zone'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{formatSupplyName(row.supply.name)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {getFriendlyCategoryName(row.supply.category)} · <strong style={{ color: 'var(--ink)' }}>{row.zone.name}</strong> ({row.zone.code})
            </div>
          </div>
        ),
      },
      {
        key: 'quantity',
        header: tr('Quantities'),
        width: '160px',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 600 }}>
              {row.requestedQuantity} {formatSupplyUnit(row.supply.unit)} {tr('requested')}
            </div>
            {row.approvedQuantity !== null && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ok)', fontWeight: 600 }}>
                <Icon name="check" inline size={14} /> {row.approvedQuantity} {formatSupplyUnit(row.supply.unit)} {tr('approved')}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'requester',
        header: tr('Requester & Notes'),
        render: (row) => (
          <div style={{ fontSize: '0.8125rem' }}>
            <div>
              <strong>{row.requestedBy.fullName}</strong>{' '}
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>({row.requestedBy.role})</span>
            </div>
            {row.urgencyReason && (
              <div style={{ color: 'var(--muted)', marginTop: '0.125rem' }}>
                "{row.urgencyReason}"
              </div>
            )}
            {row.requestedBy.role === 'CLUB_MANAGER' && (
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {tr('Created by Club Manager {{name}}, automatically set to Approved', { name: row.requestedBy.fullName })}
              </div>
            )}
            {row.rejectionReason && (
              <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                <strong>{tr('Rejection note')}:</strong> {row.rejectionReason}
              </div>
            )}
            {row.deliveryNotes && (
              <div style={{ color: 'var(--color-ok)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                <strong>{tr('Receipt note')}:</strong> {row.deliveryNotes}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: tr('Status'),
        width: '140px',
        render: (row) => getStatusBadge(row.status),
      },
      {
        key: 'actions',
        header: tr('Actions'),
        width: '210px',
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {row.status === 'PENDING' && isManager && (
              <Button
                size="sm"
                tone="primary"
                onClick={() => setReviewingItem(row)}
              >
                {tr('Review Proposal')}
              </Button>
            )}

            {row.status === 'APPROVED' && isManager && (
              <Button
                size="sm"
                tone="secondary"
                onClick={() => setDeliveringItem(row)}
              >
                <Icon name="check" inline size={14} /> {tr('Confirm Receipt')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isManager, isVietnamese],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title={tr('Restock Requests & Procurement')}
        description={tr('Submit supply replenishment proposals and manage manager approval workflows.')}
        action={
          isManager ? (
            <Button tone="primary" onClick={() => setCreateModalOpen(true)}>
              + {tr('Direct stock replenishment')}
            </Button>
          ) : canPropose ? (
            <Button tone="primary" onClick={() => setCreateModalOpen(true)}>
              + {tr('Propose Supply Restock')}
            </Button>
          ) : undefined
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Filter Tabs & Toolbar */}
      <Card pad={16}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Tabs */}
          <div className={styles.statusFilters}>
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`${styles.statusFilter} ${statusFilter === tab.key ? styles.selected : ""}`}
                aria-pressed={statusFilter === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Zone & Search Filters */}
          <div className={styles.searchFilters}>
            <div className={styles.zone}>
              <Select
                aria-label={tr('Stall zone')}
                options={zoneOptions}
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              />
            </div>

            <div className={styles.search}>
              <Input
                aria-label={tr('Search by proposal number, supply, requester...')}
                placeholder={tr('Search by proposal number, supply, requester...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      <Card pad={0}>
        <DataTable
          pageSize={10}
          noun="requests"
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          caption="Supply Restock Requests Table"
        />
      </Card>

      {/* Create Proposal Modal */}
      {createModalOpen && (
        <RestockRequestModal
          zones={zones}
          supplies={supplies}
          direct={isManager}
          onClose={() => setCreateModalOpen(false)}
          onSaved={fetchRequests}
        />
      )}

      {/* Review Proposal Modal (Club Manager) */}
      {reviewingItem && (
        <RestockReviewModal
          request={reviewingItem}
          onClose={() => setReviewingItem(null)}
          onSaved={fetchRequests}
        />
      )}

      {/* Confirm Delivery Modal */}
      {deliveringItem && (
        <RestockDeliverModal
          request={deliveringItem}
          onClose={() => setDeliveringItem(null)}
          onSaved={fetchRequests}
        />
      )}
    </div>
  );
}
