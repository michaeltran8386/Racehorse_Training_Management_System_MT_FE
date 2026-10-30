import { useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SkeletonTable } from '@/shared/components/ui/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { incidentsApi } from '../api/incidentsApi';
import { IncidentReportModal, COMMON_SYMPTOMS } from '../components/IncidentReportModal';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import type { IncidentReport, IncidentSeverity, IncidentStatus } from '../types/incidents';

export default function IncidentListPage() {
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
        search: search.trim() || undefined,
        limit: 50,
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
  }, [severityFilter, statusFilter, search]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
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
              placeholder={tr('Search code, horse name, notes...')}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ minWidth: '160px' }}>
              <Select
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

            <div style={{ minWidth: '180px' }}>
              <Select
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

      {/* Incidents Table / Cards */}
      {loading ? (
        <SkeletonTable columns={5} rows={5} />
      ) : incidents.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            title={tr('No incidents recorded')}
            description={tr('No health incidents or abnormal observations have been reported matching current filters.')}
            action={
              <Button tone="primary" onClick={() => setCreateModalOpen(true)}>
                + {tr('Report Incident')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              pad={16}
            >
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ink)', padding: '0.125rem 0.5rem', borderRadius: 'var(--r-sm)', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
                      {inc.incidentNumber}
                    </span>
                    {getSeverityBadge(inc.severity)}
                    {getStatusBadge(inc.status)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '0.25rem' }}>
                      {new Date(inc.createdAt).toLocaleString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--ink)' }}>
                    <span>{inc.horse?.name || tr('Horse')}</span>
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 400, color: 'var(--muted)' }}>
                      ({inc.horse?.horseCode || ''})
                    </span>
                    {inc.horse?.isMedicalLocked && (
                      <Badge tone="danger">
                        {tr('Medical Lock')}
                      </Badge>
                    )}
                  </div>

                  {inc.symptomsJson && inc.symptomsJson.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                      {inc.symptomsJson.map((s, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--color-warn)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {formatSymptom(s)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)', margin: '0.25rem 0', lineHeight: 1.5 }}>
                    {inc.description}
                  </p>

                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.25rem' }}>
                    <span>
                      {tr('Reported by')}: <strong style={{ color: 'var(--ink)' }}>{inc.reportedBy?.fullName || tr('Staff')}</strong> ({inc.reportedBy?.role || 'GROOM'})
                    </span>
                    {inc.reviewedBy && (
                      <span style={{ color: 'var(--color-ok)' }}>
                        ✓ {tr('Reviewed by')}: <strong>{inc.reviewedBy.fullName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ alignSelf: 'flex-start' }}>
                  <Button
                    tone="secondary"
                    size="sm"
                    data-testid="incident-card-review-btn"
                    onClick={() => setSelectedIncident(inc)}
                  >
                    {user?.role === 'VETERINARIAN'
                      ? tr('Review & Prescribe')
                      : tr('View Details')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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
