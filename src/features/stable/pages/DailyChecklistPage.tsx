import { useTranslation as useScreenTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import styles from './StableOperations.module.css';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/form/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SkeletonTable } from '@/shared/components/ui/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Paged } from '@/shared/components/ui/Pagination';
import { useToast } from '@/shared/components/ui/Toast';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { tr } from '@/shared/i18n/tr';
import { messageFor } from '@/shared/lib/messages';
import { dailyTasksApi } from '../api/dailyTasksApi';
import { getZones } from '../api';
import { getMyShifts } from '../api/shiftRosterApi';
import { todayClub } from '@/features/training/api';
import { IncidentReportModal } from '../components/IncidentReportModal';
import type { DailyCareTask, DailyTaskSummary, DailyTaskType } from '../types/dailyTasks';
import type { Zone } from '../types';
import type { IncidentReport } from '../types/incidents';

export default function DailyChecklistPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const toast = useToast();
  useAppLanguage();
  const isGroom = user?.role === 'GROOM';

  const todayStr = useMemo(() => todayClub(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [onlyMyTasks, setOnlyMyTasks] = useState<boolean>(isGroom);

  const [tasks, setTasks] = useState<DailyCareTask[]>([]);
  const [summary, setSummary] = useState<DailyTaskSummary | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Clock tick to update the 15-minute undo timers every second
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Incident Modal
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentTargetHorseId, setIncidentTargetHorseId] = useState<string | undefined>(undefined);
  const [shiftsLoaded, setShiftsLoaded] = useState(!isGroom);
  const [shiftTab, setShiftTab] = useState<string>('');

  // Auto-detect and preselect Groom's assigned Zone from shift roster
  useEffect(() => {
    if (isGroom) {
      getMyShifts({ startDate: selectedDate, endDate: selectedDate })
        .then((shifts) => {
          if (shifts && shifts.length > 0 && shifts[0].zone?.id) {
            setSelectedZoneId(shifts[0].zone.id);
          }
        })
        .catch(() => {})
        .finally(() => {
          setShiftsLoaded(true);
        });
    } else {
      setShiftsLoaded(true);
    }
  }, [isGroom, selectedDate]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [tasksRes, zonesRes] = await Promise.all([
        dailyTasksApi.list({
          date: selectedDate,
          zoneId: selectedZoneId !== 'ALL' ? selectedZoneId : undefined,
          isCompleted:
            statusFilter === 'ALL'
              ? undefined
              : statusFilter === 'COMPLETED'
              ? true
              : false,
          onlyMyTasks: onlyMyTasks ? true : false,
          onlyMine: onlyMyTasks ? true : false,
        }),
        getZones().catch(() => []),
      ]);
      setTasks(tasksRes.items || []);
      setSummary(tasksRes.summary || tasksRes.stats || null);
      setZones(zonesRes || []);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!shiftsLoaded) return;
    loadData();
  }, [selectedDate, selectedZoneId, statusFilter, onlyMyTasks, shiftsLoaded]);

  const handleComplete = async (taskId: string) => {
    if (actionBusyId) return;
    setActionBusyId(taskId);
    try {
      const updated = await dailyTasksApi.complete(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      toast.show(tr('Task marked as completed. 15-min undo window started.'), 'ok');
      if (summary) {
        setSummary({
          ...summary,
          completed: summary.completed + 1,
          pending: Math.max(0, summary.pending - 1),
        });
      }
    } catch (err) {
      toast.show(messageFor(err), 'danger');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleUncomplete = async (taskId: string) => {
    if (actionBusyId) return;
    setActionBusyId(taskId);
    try {
      const updated = await dailyTasksApi.uncomplete(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      toast.show(tr('Task uncompleted.'), 'info');
      if (summary) {
        setSummary({
          ...summary,
          completed: Math.max(0, summary.completed - 1),
          pending: summary.pending + 1,
        });
      }
    } catch (err) {
      toast.show(messageFor(err), 'danger');
    } finally {
      setActionBusyId(null);
    }
  };

  const changeDateBy = (days: number) => {
    const d = new Date(`${selectedDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Tách việc theo ca trực: mỗi ca một tab, giờ trong một ca của một giám mã không chồng nhau (BE xếp tuần tự).
  const shiftOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; start: string; end: string; order: number; count: number }>();
    for (const t of tasks) {
      const id = t.shift?.id ?? 'NONE';
      const cur = map.get(id);
      if (cur) cur.count += 1;
      else
        map.set(id, {
          id,
          label: t.shift
            ? t.shift.name.includes(t.shift.startTime) ? t.shift.name : `${t.shift.name} (${t.shift.startTime}–${t.shift.endTime})`
            : tr('Unassigned shift'),
          start: t.shift?.startTime ?? '99:99',
          end: t.shift?.endTime ?? '99:99',
          order: t.shift?.sortOrder ?? 999,
          count: 1,
        });
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.start.localeCompare(b.start));
  }, [tasks]);

  // Tab đang chọn không còn trong ngày này thì mặc định mở ca đang diễn ra (nếu xem hôm nay), không thì ca đầu tiên.
  const activeShift = useMemo(() => {
    if (shiftOptions.some((o) => o.id === shiftTab)) return shiftTab;
    const now = new Date(nowMs).toTimeString().slice(0, 5);
    const current =
      selectedDate === todayStr
        ? shiftOptions.find((o) => (o.start <= o.end ? now >= o.start && now < o.end : now >= o.start || now < o.end))
        : undefined;
    return (current ?? shiftOptions[0])?.id ?? '';
  }, [shiftOptions, shiftTab, selectedDate, todayStr, nowMs]);

  const shiftTasks = useMemo(
    () => (activeShift ? tasks.filter((t) => (t.shift?.id ?? 'NONE') === activeShift) : tasks),
    [tasks, activeShift],
  );

  // Group tasks by Horse for clean stable management
  const horseGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        horse: NonNullable<DailyCareTask['horse']>;
        stallZone?: DailyCareTask['stallZone'];
        tasks: DailyCareTask[];
        hasMedicalLock: boolean;
      }
    >();

    for (const task of shiftTasks) {
      if (!task.horse) continue;
      // If Groom viewing my tasks only, filter out any tasks from another zone or not assigned
      if (onlyMyTasks && isGroom) {
        if (selectedZoneId !== 'ALL' && task.stallZoneId && task.stallZoneId !== selectedZoneId) {
          continue;
        }
      }
      const existing = map.get(task.horseId);
      if (existing) {
        existing.tasks.push(task);
        if (task.isMedicalLocked) existing.hasMedicalLock = true;
      } else {
        map.set(task.horseId, {
          horse: task.horse,
          stallZone: task.stallZone,
          tasks: [task],
          hasMedicalLock: task.isMedicalLocked,
        });
      }
    }

    // Sort tasks in each group chronologically
    for (const group of map.values()) {
      group.tasks.sort((a, b) =>
        (a.scheduledTime || '').localeCompare(b.scheduledTime || ''),
      );
    }

    return Array.from(map.values());
  }, [shiftTasks, onlyMyTasks, isGroom, selectedZoneId]);

  const getTaskTypeBadge = (type: DailyTaskType) => {
    switch (type) {
      case 'FEEDING':
        return <Badge tone="neutral">{tr('Feeding')}</Badge>;
      case 'CLEANING':
        return <Badge tone="ok">{tr('Cleaning')}</Badge>;
      case 'GROOMING':
        return <Badge tone="neutral">{tr('Grooming')}</Badge>;
      case 'ICE_BOOT_REST':
        return <Badge tone="danger">{tr('Ice Boot / Rest')}</Badge>;
      case 'WALKING':
        return <Badge tone="ok">{tr('Walking')}</Badge>;
      case 'MEDICATION':
        return <Badge tone="warn">{tr('Medication')}</Badge>;
      default:
        return <Badge tone="neutral">{type}</Badge>;
    }
  };

  // Helper calculating remaining undo time
  const getUndoRemaining = (undoUntil?: string | null) => {
    if (!undoUntil) return null;
    const diffMs = new Date(undoUntil).getTime() - nowMs;
    if (diffMs <= 0) return null;
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    summary && summary.total > 0
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <PageHeader
        title={tr("Today's Tasks")}
        description={tr(
          'Manage daily care tasks, report incidents, and undo completed tasks within 15 minutes.',
        )}
        action={
          <Button
            tone="primary"
            onClick={() => {
              setIncidentTargetHorseId(undefined);
              setIncidentModalOpen(true);
            }}
          >
            + {tr('Report Incident')}
          </Button>
        }
      />

      {error && <Alert tone="danger" action={<Button tone="secondary" onClick={() => void loadData()}>{tr('Try again')}</Button>}>{error}</Alert>}

      {/* KPI Summary Cards */}
      <div className={styles.taskMetrics}>
        <Card pad={16}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{tr('Total Tasks')}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--ink)' }}>
            {!loading && !error && summary ? summary.total : '—'}
          </div>
        </Card>
        <Card pad={16}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{tr('Completed Tasks')}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--color-ok)' }}>
            {!loading && !error && summary ? `${summary.completed} (${progressPercent}%)` : '—'}
          </div>
        </Card>
        <Card pad={16}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{tr('Pending Tasks')}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--color-warn)' }}>
            {!loading && !error && summary ? summary.pending : '—'}
          </div>
        </Card>
        <Card pad={16}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{tr('Medical Locked Horses')}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: summary?.medicalLockedCount ? 'var(--color-danger)' : 'var(--muted)' }}>
            {!loading && !error && summary ? summary.medicalLockedCount : '—'}
          </div>
        </Card>
      </div>

      {/* Progress Bar line */}
      {!loading && !error && summary && <div role="progressbar" aria-label={tr('Completed Tasks')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} style={{ height: '6px', width: '100%', backgroundColor: 'var(--surface-sunken)', borderRadius: '999px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: 'var(--color-ok)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>}

      {/* Date Navigation & Filters Toolbar */}
      <Card pad={16}>
        <div className={styles.taskToolbar}>
          {/* Date Selector */}
          <div className={styles.weekNavigation}>
            <Button tone="secondary" size="sm" onClick={() => changeDateBy(-1)} aria-label={tr('Previous Day')}>
              ◀
            </Button>
            <input
              type="date"
              aria-label={tr('Task date')}
              value={selectedDate}
              onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
              style={{
                padding: '0.375rem 0.625rem',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 'var(--fs-sm)',
              }}
            />
            <Button tone="secondary" size="sm" onClick={() => changeDateBy(1)} aria-label={tr('Next Day')}>
              ▶
            </Button>
            <Button
              tone="secondary"
              size="sm"
              onClick={() => setSelectedDate(todayStr)}
            >
              {tr('Today')}
            </Button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ minWidth: '180px' }}>
              <Select
                aria-label={tr('Stall zone')}
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                options={[
                  { value: 'ALL', label: tr('All Stall Zones') },
                  ...zones.map((z) => ({ value: z.id, label: `${z.code} - ${z.name}` })),
                ]}
              />
            </div>

            <div style={{ minWidth: '160px' }}>
              <Select
                aria-label={tr('Task status')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                options={[
                  { value: 'ALL', label: tr('All Tasks') },
                  { value: 'PENDING', label: tr('Pending Only') },
                  { value: 'COMPLETED', label: tr('Completed Only') },
                ]}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: 'var(--fs-sm)',
                color: 'var(--ink)',
                cursor: 'pointer',
                userSelect: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <input
                type="checkbox"
                checked={onlyMyTasks}
                onChange={(e) => setOnlyMyTasks(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>{tr('My Tasks Only (Groom)')}</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Task List grouped by Horse */}
      {loading ? (
        <SkeletonTable columns={4} rows={5} />
      ) : error ? null : horseGroups.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            title={tr('No tasks found for this date')}
            description={tr('There are no tasks matching your filters.')}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {shiftOptions.length > 1 && (
            <Tabs
              label="Shift"
              active={activeShift}
              onChange={setShiftTab}
              items={shiftOptions.map((o) => ({ id: o.id, label: o.label, count: o.count }))}
            />
          )}
          <Paged items={horseGroups} noun="horses">{(pageGroups) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pageGroups.map((group) => {
            const horse = group.horse;
            const completedCount = group.tasks.filter((t) => t.isCompleted).length;
            const totalCount = group.tasks.length;
            const isAllDone = completedCount === totalCount;

            return (
              <Card key={horse.id} pad={0}>
                {/* Horse Card Header */}
                <div className={styles.taskHorseHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--brand-700)',
                      }}
                    >
                      {(horse.name || 'H').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={styles.taskHorseName}>
                          {horse.name}
                        </span>
                        <Badge tone="neutral">{horse.horseCode}</Badge>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
                        {group.stallZone?.name || tr('Stall Zone')}
                        {horse.stallAllocations?.[0]?.stall && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--color-warn)', fontWeight: 600 }}>
                            [{tr('Stall')}: {horse.stallAllocations[0].stall.code}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Badge tone={isAllDone ? 'ok' : 'neutral'}>
                      {completedCount}/{totalCount} {tr('done')}
                    </Badge>
                    <Button
                      size="sm"
                      tone="secondary"
                      onClick={() => {
                        setIncidentTargetHorseId(horse.id);
                        setIncidentModalOpen(true);
                      }}
                    >
                      + {tr('Report Incident')}
                    </Button>
                  </div>
                </div>

                {/* Medical Lock Alert Banner on Horse Card */}
                {group.hasMedicalLock && (
                  <div className={styles.taskMedicalNotice}>
                    <strong>{tr('Medical Lock Active')}</strong>: {tr('Follow the veterinary instructions before working with this horse.')}
                  </div>
                )}

                {/* Tasks Checklist */}
                <div>
                  {group.tasks.map((task, idx) => {
                    const undoRemaining = getUndoRemaining(task.undoUntil);
                    const canUndo = Boolean(undoRemaining) || user?.role === 'CLUB_MANAGER';
                    const isBusy = actionBusyId === task.id;
                    const isLast = idx === group.tasks.length - 1;

                    return (
                      <div
                        key={task.id}
                        style={{
                          padding: '0.875rem 1.25rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          borderBottom: isLast ? 'none' : '1px solid var(--border)',
                          backgroundColor: task.isCompleted ? 'var(--surface-sunken)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* 1-TOUCH Ergonomic Completion Button */}
                        <button
                          type="button"
                          disabled={task.isCompleted || isBusy}
                          onClick={() => handleComplete(task.id)}
                          aria-label={tr(task.isCompleted ? 'Completed' : 'Complete task')}
                          title={tr(task.isCompleted ? 'Completed' : 'Complete task')}
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            minWidth: '2.5rem',
                            borderRadius: 'var(--r-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: task.isCompleted ? 'none' : '2px solid var(--border)',
                            backgroundColor: task.isCompleted ? 'var(--ok-bg)' : 'var(--surface)',
                            color: task.isCompleted ? 'var(--ok)' : 'var(--muted)',
                            cursor: task.isCompleted ? 'default' : 'pointer',
                            fontWeight: 700,
                            fontSize: task.isCompleted ? '1.125rem' : '0.75rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {task.isCompleted ? '✓' : null}
                        </button>

                        {/* Task Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                            <Badge tone="neutral">{task.scheduledTime}</Badge>
                            {getTaskTypeBadge(task.taskType)}
                            {task.assignedGroom && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{task.assignedGroom.fullName}</span>
                            )}
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: 'var(--fs-body)',
                                color: task.isCompleted ? 'var(--muted)' : 'var(--ink)',
                                textDecoration: task.isCompleted ? 'line-through' : 'none',
                              }}
                            >
                              {task.title.replace(/^[\p{Extended_Pictographic}\p{Emoji}\s]+/u, '').trim()}
                            </span>
                          </div>

                          {task.description && (
                            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                              {task.description}
                            </div>
                          )}

                          {task.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-warn)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                              {task.notes}
                            </div>
                          )}

                          {/* Completed metadata & Undo Button */}
                          {task.isCompleted && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--color-ok)', fontWeight: 500 }}>
                                ✓ {tr('Completed')} {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                {task.completedBy ? ` ${tr('by')} ${task.completedBy.fullName}` : ''}
                              </span>

                              {canUndo ? (
                                <Button
                                  size="sm"
                                  tone="secondary"
                                  disabled={isBusy}
                                  onClick={() => handleUncomplete(task.id)}
                                >
                                  {tr('Undo')} {undoRemaining ? `(${undoRemaining})` : `(${tr('Manager')})`}
                                </Button>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                  {tr('Locked (>15 mins)')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
          </div>
          )}</Paged>
        </div>
      )}

      {/* Incident Report Modal */}
      {incidentModalOpen && (
        <IncidentReportModal
          initialHorseId={incidentTargetHorseId}
          initialZoneId={selectedZoneId !== 'ALL' ? selectedZoneId : undefined}
          onClose={() => setIncidentModalOpen(false)}
          onSuccess={(_incident: IncidentReport) => {
            setIncidentModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
