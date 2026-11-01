import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Alert } from '@/shared/components/ui/Alert';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { tr } from '@/shared/i18n/tr';
import styles from './IncidentListPage.module.css';
import { messageFor } from '@/shared/lib/messages';
import { incidentsApi } from '../api/incidentsApi';
import { IncidentReportModal, COMMON_SYMPTOMS } from '../components/IncidentReportModal';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import type { IncidentReport, IncidentSeverity, IncidentStatus } from '../types/incidents';

export default function IncidentListPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  useAppLanguage();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);

  async function loadIncidents() {
    setLoading(true);
    setError('');
    try {
      const res = await incidentsApi.list({
        severity: severityFilter !== 'ALL' ? (severityFilter as IncidentSeverity) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as IncidentStatus) : undefined,
        limit: 100,
      });
      setIncidents(res.items || []);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, [severityFilter, statusFilter]);

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge tone="danger">{tr('Critical')}</Badge>;
      case 'MODERATE':
        return <Badge tone="warn">{tr('Moderate')}</Badge>;
      case 'MILD':
        return <Badge tone="ok">{tr('Mild')}</Badge>;
    }
  };

  const getStatusBadge = (st: IncidentStatus) => {
    switch (st) {
      case 'REPORTED':
        return <Badge tone="warn">{tr('Reported')}</Badge>;
      case 'UNDER_REVIEW':
        return <Badge tone="neutral">{tr('Under Review')}</Badge>;
      case 'RESOLVED':
        return <Badge tone="ok">{tr('Resolved')}</Badge>;
      case 'DISMISSED':
        return <Badge tone="neutral">{tr('Dismissed')}</Badge>;
    }
  };

  const formatSymptom = (symKey: string) => {
    const found = COMMON_SYMPTOMS.find((s) => s.key === symKey);
    return found ? tr(found.label) : tr(symKey);
  };

  // Tìm kiếm lọc phía client (API sự cố chưa nhận tham số search).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter((inc) =>
      [inc.incidentNumber, inc.horse?.name, inc.horse?.horseCode, inc.description, inc.reportedBy?.fullName]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [incidents, search]);

  const columns: Column<IncidentReport>[] = [
    {
      key: 'code',
      header: tr('Code'),
      width: 120,
      render: (inc) => (
        <span className={styles.code}>
          {inc.incidentNumber}
          <small>{new Date(inc.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>
        </span>
      ),
    },
    {
      key: 'horse',
      header: tr('Horse'),
      render: (inc) => (
        <span className={styles.horseCell}>
          <strong>{inc.horse?.name || tr('Horse')}</strong>
          <small>{inc.horse?.horseCode}</small>
          {inc.horse?.isMedicalLocked && <Badge tone="danger">{tr('Medical Lock')}</Badge>}
        </span>
      ),
    },
    { key: 'severity', header: tr('Severity'), width: 110, render: (inc) => getSeverityBadge(inc.severity) },
    { key: 'status', header: tr('Status'), width: 120, render: (inc) => getStatusBadge(inc.status) },
    {
      key: 'symptoms',
      header: tr('Symptoms'),
      hideOnNarrow: true,
      render: (inc) => (
        <span className={styles.symptoms} title={inc.description}>
          {(inc.symptomsJson ?? []).slice(0, 2).map((sym, idx) => (
            <span key={idx} className={styles.symptom}>{formatSymptom(sym)}</span>
          ))}
          {(inc.symptomsJson?.length ?? 0) > 2 && <small>+{(inc.symptomsJson?.length ?? 0) - 2}</small>}
        </span>
      ),
    },
    {
      key: 'reporter',
      header: tr('Reported by'),
      hideOnNarrow: true,
      render: (inc) => (
        <span className={styles.horseCell}>
          <span>{inc.reportedBy?.fullName || tr('Staff')}</span>
          {inc.reviewedBy && <small>{tr('Reviewed by')}: {inc.reviewedBy.fullName}</small>}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      width: 150,
      render: (inc) => (
        <Button
          tone="secondary"
          size="sm"
          data-testid="incident-card-review-btn"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIncident(inc);
          }}
        >
          {user?.role === 'VETERINARIAN' ? tr('Review & Prescribe') : tr('View Details')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title={tr('Health Incidents & Observations')}
        description={tr(
          'Centralized monitoring for medical alerts, groom shift observations, and veterinarian actions.',
        )}
        action={
          <Button
            tone="primary"
            onClick={() => setCreateModalOpen(true)}
          >
            + {tr('Report Incident')}
          </Button>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Filters Bar */}
      <Card pad={16}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 260px', maxWidth: '380px' }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={tr('Search code, horse name, notes...')}
              placeholder={tr('Search code, horse name, notes...')}
            />
          </div>

          <div className={styles.selectors}>
            <div>
              <Select
                aria-label={tr('Severity')}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: tr('All Severities') },
                  { value: 'CRITICAL', label: tr('Critical') },
                  { value: 'MODERATE', label: tr('Moderate') },
                  { value: 'MILD', label: tr('Mild') },
                ]}
              />
            </div>

            <div>
              <Select
                aria-label={tr('Status')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: tr('All Statuses') },
                  { value: 'REPORTED', label: tr('Reported') },
                  { value: 'UNDER_REVIEW', label: tr('Under Review') },
                  { value: 'RESOLVED', label: tr('Resolved') },
                  { value: 'DISMISSED', label: tr('Dismissed') },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Bảng sự cố: 10 dòng/trang, bấm dòng để xem chi tiết (không còn danh sách thẻ cuộn dài) */}
      <DataTable
        caption={tr('Health Incidents & Observations')}
        columns={columns}
        rows={visible}
        rowKey={(inc) => inc.id}
        loading={loading}
        noun="incidents"
        onRowClick={(inc) => setSelectedIncident(inc)}
        empty={
          <EmptyState
            title={tr('No incidents recorded')}
            description={tr('No health incidents or abnormal observations have been reported matching current filters.')}
            action={
              <Button tone="primary" onClick={() => setCreateModalOpen(true)}>
                + {tr('Report Incident')}
              </Button>
            }
          />
        }
      />

      {/* Modal tạo sự cố */}
      {createModalOpen && (
        <IncidentReportModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            loadIncidents();
          }}
        />
      )}

      {/* Modal xem / duyệt sự cố */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdated={() => {
            setSelectedIncident(null);
            loadIncidents();
          }}
        />
      )}
    </div>
  );
}
