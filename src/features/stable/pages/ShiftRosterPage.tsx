import { useTranslation as useScreenTranslation } from "react-i18next";
import rosterStyles from "./ShiftRosterPage.module.css";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import styles from './StableOperations.module.css';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Alert } from '@/shared/components/ui/Alert';
import { Select } from '@/shared/components/form/Select';
import { useCurrentUser } from '@/shared/components/layout/AuthProvider';
import { useAppLanguage } from '@/shared/lib/language';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { getShifts } from '@/features/master-data/api/suppliesApi';
import type { ShiftCatalogItem } from '@/features/master-data/types/supplies';
import { getZones } from '../api';
import type { Zone } from '../types';
import {
  getActiveGrooms,
  getMyShifts,
  getShiftRosters,
} from '../api/shiftRosterApi';
import type {
  GroomUserSummary,
  MyShiftItem,
  ShiftRosterItem,
} from '../types/shiftRoster';
import { ShiftRosterModal } from '../components/ShiftRosterModal';
import { CopyWeekRosterModal } from '../components/CopyWeekRosterModal';

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sun
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_VI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export default function ShiftRosterPage() {
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const isManager = currentUser.role === 'CLUB_MANAGER';
  const isGroom = currentUser.role === 'GROOM';
  const { isVietnamese: isVi } = useAppLanguage();

  // State tuần
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ALL');
  const [onlyMyShifts, setOnlyMyShifts] = useState<boolean>(isGroom);

  // Dữ liệu
  const [zones, setZones] = useState<Zone[]>([]);
  const [shifts, setShifts] = useState<ShiftCatalogItem[]>([]);
  const [rosters, setRosters] = useState<ShiftRosterItem[]>([]);
  const [myShifts, setMyShifts] = useState<MyShiftItem[]>([]);
  const [allGrooms, setAllGrooms] = useState<GroomUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected slot for modal
  const [selectedSlot, setSelectedSlot] = useState<{
    dateStr: string;
    formattedDate: string;
    shift: ShiftCatalogItem;
    zone: Zone;
    currentRosters: ShiftRosterItem[];
  } | null>(null);

  // Modal sao chép tuần
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Mobile selected day index (0..6)
  const [mobileDayIdx, setMobileDayIdx] = useState(0);

  // Danh sách 7 ngày trong tuần
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + idx);
      return {
        date: d,
        dateStr: formatYMD(d),
        formattedDMY: formatDMY(d),
        dayName: isVi ? DAY_NAMES_VI[idx] : DAY_NAMES_EN[idx],
        isToday: formatYMD(d) === formatYMD(new Date()),
      };
    });
  }, [currentMonday, isVi]);

  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

  const currentWeekMonday = getMonday(new Date());
  const isPastWeek = currentMonday.getTime() < currentWeekMonday.getTime();

  // Nhãn tuần trước và tuần này
  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const sourceWeekLabel = `${tr('Week of')} ${formatDMY(prevMonday)} – ${formatDMY(prevSunday)}`;
  const targetWeekLabel = `${tr('Week of')} ${formatDMY(currentMonday)} – ${formatDMY(weekDays[6].date)}`;

  // Tải dữ liệu
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [zList, sList, rList, gList] = await Promise.all([
        getZones(),
        getShifts({ includeInactive: false }),
        getShiftRosters({
          startDate: startDateStr,
          endDate: endDateStr,
          zoneId: selectedZoneId !== 'ALL' ? selectedZoneId : undefined,
        }),
        isManager ? getActiveGrooms() : Promise.resolve([]),
      ]);

      setZones(zList.filter((z) => z.isActive));
      setShifts(sList.filter((s) => s.isActive));
      setRosters(rList);
      setAllGrooms(gList);

      if (isGroom) {
        const my = await getMyShifts({
          startDate: startDateStr,
          endDate: endDateStr,
          zoneId: selectedZoneId !== 'ALL' ? selectedZoneId : undefined,
        });
        setMyShifts(my);
      }
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, selectedZoneId, isManager, isGroom]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Thống kê số ca trực mỗi groom đã làm trong tuần
  const groomWeeklyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rosters) {
      map[r.groomUserId] = (map[r.groomUserId] || 0) + 1;
    }
    return map;
  }, [rosters]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(d);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  // Lọc khu
  const filteredZones = useMemo(() => {
    if (selectedZoneId === 'ALL') return zones;
    return zones.filter((z) => z.id === selectedZoneId);
  }, [zones, selectedZoneId]);

  // Lọc ca của tôi theo khu chuồng đã chọn
  const filteredMyShifts = useMemo(() => {
    if (selectedZoneId === 'ALL') return myShifts;
    return myShifts.filter((s) => s.zone.id === selectedZoneId);
  }, [myShifts, selectedZoneId]);

  const zoneOptions = [
    { value: 'ALL', label: tr('All Zones') },
    ...zones.map((z) => ({ value: z.id, label: z.name })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader
        title={tr('Weekly Shift Roster')}
        description={tr('Staff allocation matrix by date, shift and stall zone.')}
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/stalls" style={{ textDecoration: 'none' }}>
              <Button tone="ghost">{tr('View Stall Map')}</Button>
            </Link>
            {isManager && (
              <Button
                tone="primary"
                onClick={() => setShowCopyModal(true)}
              >
                {tr('Copy from previous week')}
              </Button>
            )}
          </div>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Toolbar điều khiển */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--surface)',
          padding: '0.875rem 1rem',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Điều hướng tuần */}
        <div className={styles.weekNavigation}>
          <Button tone="ghost" size="sm" onClick={handlePrevWeek}>
            <Icon name="chevronLeft" inline size={14} /> {tr('Previous week')}
          </Button>
          <Button tone="ghost" size="sm" onClick={handleCurrentWeek}>
            {tr('This week')}
          </Button>
          <Button tone="ghost" size="sm" onClick={handleNextWeek}>
            {tr('Next week')} <Icon name="chevronRight" inline size={14} />
          </Button>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem', marginLeft: '0.5rem' }}>
            {targetWeekLabel}
          </span>
        </div>

        {/* Bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 200 }}>
            <Select
              value={selectedZoneId}
              options={zoneOptions}
              onChange={(e) => setSelectedZoneId(e.target.value)}
            />
          </div>

          {isGroom && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              <input
                type="checkbox"
                checked={onlyMyShifts}
                onChange={(e) => setOnlyMyShifts(e.target.checked)}
              />
              <span>{tr('My shifts only')}</span>
            </label>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
          {tr('Loading rosters...')}
        </div>
      ) : isGroom && onlyMyShifts ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
              {tr('Your personal roster for this week ({{count}} shifts)', { count: filteredMyShifts.length })}
            </h3>
          </div>

          {filteredMyShifts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
              {tr('You have no shifts assigned for this week.')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {weekDays.map((day) => {
                const dayShifts = filteredMyShifts.filter((ms) => ms.date.startsWith(day.dateStr));
                return (
                  <div
                    key={day.dateStr}
                    style={{
                      background: 'var(--surface)',
                      border: day.isToday ? '2px solid var(--brand)' : '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Day Header */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: day.isToday ? 'var(--brand-50)' : 'var(--surface-muted)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{day.dayName}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{day.formattedDMY}</span>
                        {day.isToday && <Badge tone="brand">{tr('Today')}</Badge>}
                      </div>
                      <Badge tone={dayShifts.length > 0 ? 'ok' : 'neutral'}>
                        {dayShifts.length > 0
                          ? tr('{{count}} shifts', { count: dayShifts.length })
                          : tr('Rest day')}
                      </Badge>
                    </div>

                    {/* Shifts on this day */}
                    <div style={{ padding: '0.875rem 1rem' }}>
                      {dayShifts.length === 0 ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                          {tr('No duties scheduled for this day.')}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.875rem' }}>
                          {dayShifts.map((ms) => (
                            <div
                              key={ms.id}
                              style={{
                                background: 'var(--surface-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--r-sm)',
                                padding: '0.875rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Badge tone="brand">{ms.shift.name}</Badge>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                  {ms.shift.startTime} – {ms.shift.endTime}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--muted)' }}>{tr('Zone:')}</span> <strong>{ms.zone.name}</strong>
                              </div>

                              {ms.notes && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', background: 'var(--surface)', padding: '0.35rem 0.5rem', borderRadius: 'var(--r-xs)' }}>
                                  <strong>{tr('Notes:')}</strong> {ms.notes}
                                </div>
                              )}

                              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>
                                    {tr('Horses in zone:')}
                                  </span>
                                  <Badge tone="neutral">{tr('{{count}} horses', { count: ms.assignedHorsesCount })}</Badge>
                                </div>
                                {ms.assignedHorses.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    {ms.assignedHorses.slice(0, 6).map((h) => (
                                      <span
                                        key={h.id}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '0.15rem 0.4rem',
                                          background: 'var(--surface)',
                                          borderRadius: 'var(--r-xs)',
                                          border: '1px solid var(--border)',
                                        }}
                                      >
                                        {h.name} {h.isMedicalLocked && `[${tr('Locked')}]`}
                                      </span>
                                    ))}
                                    {ms.assignedHorses.length > 6 && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        +{ms.assignedHorses.length - 6} {tr('others')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Ma trận Matrix Grid 7 ngày x Khu x Ca */
        <div>
          {/* Tabs cho Mobile view */}
          <div className={rosterStyles.daySelector}>
            {weekDays.map((d, i) => (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setMobileDayIdx(i)}
                aria-pressed={mobileDayIdx === i}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--r-sm)',
                  border: mobileDayIdx === i ? '2px solid var(--brand)' : '1px solid var(--border)',
                  background: mobileDayIdx === i ? 'var(--brand-muted)' : 'var(--surface)',
                  fontWeight: mobileDayIdx === i ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.dayName} ({d.formattedDMY.slice(0, 5)})
              </button>
            ))}
          </div>

          {/* Lưới Matrix (Desktop/Tablet) */}
          <div
            style={{
              overflowX: 'auto',
              background: 'var(--surface)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}
          >
            <table
              className={rosterStyles.matrix}
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                textAlign: 'left',
                minWidth: 960,
              }}
            >
              <thead>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th className={rosterStyles.zoneHead}>{tr('Zone')}</th>
                  <th className={rosterStyles.shiftHead}>{tr('Shift')}</th>
                  {weekDays.map((d, i) => (
                    <th
                      key={d.dateStr}
                      className={i === mobileDayIdx ? rosterStyles.selectedDay : rosterStyles.otherDay}
                      style={{
                        padding: '0.75rem 0.5rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        background: d.isToday ? 'var(--brand-50)' : undefined,
                        borderLeft: '1px solid var(--border)',
                      }}
                    >
                      <div>{d.dayName}</div>
                      <div style={{ fontSize: '0.75rem', color: d.isToday ? 'var(--brand-700)' : 'var(--muted)' }}>
                        {d.formattedDMY} {d.isToday && ` • ${tr('Today')}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredZones.length === 0 || shifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                      {tr('No active zones or shifts available.')}
                    </td>
                  </tr>
                ) : (
                  filteredZones.flatMap((zone) =>
                    shifts.map((shift, sIdx) => {
                      const isFirstShiftOfZone = sIdx === 0;
                      return (
                        <tr
                          key={`${zone.id}-${shift.id}`}
                          className={isFirstShiftOfZone ? rosterStyles.zoneStart : undefined}
                        >
                          {/* Tên khu gộp cho mọi ca của khu */}
                          {isFirstShiftOfZone && (
                            <th scope="rowgroup" rowSpan={shifts.length} className={rosterStyles.zoneCell}>
                              {zone.name}
                            </th>
                          )}
                          <td className={rosterStyles.shiftCell}>
                            <div style={{ fontWeight: 600 }}>{shift.name}</div>
                            <div className={rosterStyles.shiftTime}>{shift.startTime}–{shift.endTime}</div>
                          </td>

                          {/* 7 ô cho 7 ngày trong tuần */}
                          {weekDays.map((day, dayIndex) => {
                            const slotRosters = rosters.filter(
                              (r) =>
                                r.date.startsWith(day.dateStr) &&
                                r.shiftId === shift.id &&
                                r.zoneId === zone.id,
                            );

                            const hasGroom = slotRosters.length > 0;

                            return (
                              <td
                                key={day.dateStr}
                                className={[
                                  rosterStyles.cell,
                                  !hasGroom ? rosterStyles.cellEmpty : day.isToday ? rosterStyles.cellToday : '',
                                  dayIndex === mobileDayIdx ? rosterStyles.selectedDay : rosterStyles.otherDay,
                                ].join(' ')}
                                role={isManager ? 'button' : undefined}
                                tabIndex={isManager ? 0 : undefined}
                                aria-label={isManager ? [zone.name, shift.name, day.formattedDMY, hasGroom ? slotRosters.map((r) => r.groom.fullName).join(', ') : tr('No groom assigned')].join(' · ') : undefined}
                                onKeyDown={isManager ? (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    event.currentTarget.click();
                                  }
                                } : undefined}
                                onClick={() => {
                                  if (isManager) {
                                    setSelectedSlot({
                                      dateStr: day.dateStr,
                                      formattedDate: day.formattedDMY,
                                      shift,
                                      zone,
                                      currentRosters: slotRosters,
                                    });
                                  }
                                }}
                              >
                                {hasGroom ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {slotRosters.map((r) => (
                                      <div key={r.id} className={rosterStyles.groomChip}>
                                        {r.groom.fullName}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={rosterStyles.emptyText}>
                                    <Icon name="alert" size={13} />
                                    {tr('No groom assigned')}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }),
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Phân ca một ô DL-4.01 */}
      {selectedSlot && (
        <ShiftRosterModal
          date={selectedSlot.dateStr}
          formattedDate={selectedSlot.formattedDate}
          shift={selectedSlot.shift}
          zone={selectedSlot.zone}
          currentRosters={selectedSlot.currentRosters}
          allGrooms={allGrooms}
          groomWeeklyCounts={groomWeeklyCounts}
          onClose={() => setSelectedSlot(null)}
          onSaved={() => {
            setSelectedSlot(null);
            fetchData();
          }}
        />
      )}

      {/* Modal Sao chép phân ca tuần DL-4.02 */}
      {showCopyModal && (
        <CopyWeekRosterModal
          sourceWeekStart={formatYMD(prevMonday)}
          sourceWeekLabel={sourceWeekLabel}
          targetWeekStart={formatYMD(currentMonday)}
          targetWeekLabel={targetWeekLabel}
          isPastTargetWeek={isPastWeek}
          onClose={() => setShowCopyModal(false)}
          onCopied={() => {
            setShowCopyModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
