import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { api } from "@/shared/lib/api";
import { ShiftSwapRequestModal } from "../components/ShiftSwapRequestModal";
import { useTranslation as useScreenTranslation } from "react-i18next";
import rosterStyles from "./ShiftRosterPage.module.css";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./StableOperations.module.css";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Icon } from "@/shared/components/ui/Icon";
import { Alert } from "@/shared/components/ui/Alert";
import { Select } from "@/shared/components/form/Select";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { tr } from "@/shared/i18n/tr";
import { getShifts } from "@/features/master-data/api/suppliesApi";
import type { ShiftCatalogItem } from "@/features/master-data/types/supplies";
import { getZones } from "../api";
import type { Zone } from "../types";
import {
  getActiveGrooms,
  getMyShifts,
  getShiftRosters,
} from "../api/shiftRosterApi";
import type {
  GroomUserSummary,
  MyShiftItem,
  ShiftRosterItem,
} from "../types/shiftRoster";
import { ShiftRosterModal } from "../components/ShiftRosterModal";
import { CopyWeekRosterModal } from "../components/CopyWeekRosterModal";
import { Modal } from "@/shared/components/ui/Modal";
import {
  getLocalizedShiftName,
  getLocalizedZoneName,
  parseGroomInfo,
} from "../utils/shiftLocalization";
import { trainingApi } from "@/features/training/api";
import type { ExerciseSession } from "@/features/training/types";
import {
  getWorkOverview,
  type WorkEvent,
  type WorkMember,
} from "@/features/staff/workApi";

const VET_KIND_META: Record<string, { labelKey: string; shortVi: string; shortEn: string }> = {
  ADMISSION: { labelKey: "Admissions & Inspection", shortVi: "Thẩm định", shortEn: "Admission" },
  MEDICAL: { labelKey: "Medical / Records", shortVi: "Bệnh án", shortEn: "Medical" },
  PREVENTIVE: { labelKey: "Preventive care", shortVi: "Phòng ngừa", shortEn: "Preventive" },
  OTHER: { labelKey: "Other tasks", shortVi: "Việc khác", shortEn: "Other" },
};

function clubDayYmd(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}

function clubClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nameInitials(name: string, fallback: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || fallback).toUpperCase();
}

function clubTodayDate() {
  return new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(effectiveClubNow()) + 'T12:00:00');
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
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

const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_VI = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

export default function ShiftRosterPage() {
  return <WeeklyShiftRosterPage />;
}

function WeeklyShiftRosterPage() {
  useScreenTranslation();
  const currentUser = useCurrentUser();
  const isManager = currentUser.role === "CLUB_MANAGER";
  const isGroom = currentUser.role === "GROOM";
  const isTrainer = currentUser.role === 'HEAD_TRAINER';
  const isVet = currentUser.role === "VETERINARIAN";
  const showStaffTabs = isManager || isTrainer || isVet;
  const [scheduleTab, setScheduleTab] = useState<
    "all" | "groom" | "trainer" | "vet"
  >("all");
  const [teamScope, setTeamScope] = useState<'mine' | 'club'>('mine');
  const [responsibleVets, setResponsibleVets] = useState<Array<{ id: string; fullName: string; horses: Array<{ id: string; name: string }> }>>([]);
  const { isVietnamese: isVi } = useAppLanguage();

  // State tuần
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMonday(clubTodayDate()),
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
  // Lọc theo người + popup thông tin khi bấm vào tên nhân viên chăm sóc.
  const [personId, setPersonId] = useState<string>("");
  const [personInfo, setPersonInfo] = useState<GroomUserSummary | null>(null);
  const [workModal, setWorkModal] = useState<{
    role: "trainer" | "vet";
    personId: string;
    personName: string;
    dayLabel: string;
    sessions?: ExerciseSession[];
    events?: WorkEvent[];
  } | null>(null);
  const [onlyMyShifts, setOnlyMyShifts] = useState<boolean>(false);

  // Dữ liệu
  const [zones, setZones] = useState<Zone[]>([]);
  const [shifts, setShifts] = useState<ShiftCatalogItem[]>([]);
  const [rosters, setRosters] = useState<ShiftRosterItem[]>([]);
  const [myShifts, setMyShifts] = useState<MyShiftItem[]>([]);
  const [allGrooms, setAllGrooms] = useState<GroomUserSummary[]>([]);
  const [trainerSessions, setTrainerSessions] = useState<ExerciseSession[]>([]);
  const [vetMembers, setVetMembers] = useState<WorkMember[]>([]);
  const [vetEvents, setVetEvents] = useState<WorkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [swapRoster, setSwapRoster] = useState<ShiftRosterItem | null>(null);

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
  const [showAllAttention, setShowAllAttention] = useState(false);

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
        isToday: formatYMD(d) === formatYMD(clubTodayDate()),
      };
    });
  }, [currentMonday, isVi]);

  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

  const currentWeekMonday = getMonday(clubTodayDate());
  const isPastWeek = currentMonday.getTime() < currentWeekMonday.getTime();

  // Nhãn tuần trước và tuần này
  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const sourceWeekLabel = `${tr("Week of")} ${formatDMY(prevMonday)} – ${formatDMY(prevSunday)}`;
  const targetWeekLabel = `${tr("Week of")} ${formatDMY(currentMonday)} – ${formatDMY(weekDays[6].date)}`;

  const fetchVersion = useRef(0);
  // Tải dữ liệu
  const fetchData = useCallback(async () => {
    const version = ++fetchVersion.current;
    setLoading(true);
    setError("");
    setRosters([]);
    setResponsibleVets([]);
    setMyShifts([]);
    setTrainerSessions([]);
    setVetMembers([]);
    setVetEvents([]);
    try {
      const [zList, sList, rList, gList, tSessions, workData] = await Promise.all([
        getZones(),
        getShifts({ includeInactive: false }),
        isTrainer
          ? api<{
              groomRosters: ShiftRosterItem[];
              responsibleVeterinarians: Array<{
                id: string;
                fullName: string;
                horses: Array<{ id: string; name: string }>;
              }>;
            }>(
              "GET",
              `/shift-rosters/care-team?startDate=${startDateStr}&endDate=${endDateStr}&scope=${teamScope}`,
            )
          : getShiftRosters({
              startDate: startDateStr,
              endDate: endDateStr,
              zoneId: selectedZoneId !== "ALL" ? selectedZoneId : undefined,
            }),
        isManager ? getActiveGrooms() : Promise.resolve([]),
        isManager || isTrainer || isVet
          ? trainingApi
              .getSessions({
                from: startDateStr,
                to: endDateStr,
                scope: "club",
              })
              .catch(() => [])
          : Promise.resolve([]),
        isManager || isVet
          ? getWorkOverview(startDateStr, endDateStr).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (version !== fetchVersion.current) return;
      setZones(zList.filter((z) => z.isActive));
      setShifts(sList.filter((s) => s.isActive));
      if (Array.isArray(rList)) {
        setRosters(rList);
        setResponsibleVets([]);
      } else {
        setRosters(rList.groomRosters);
        setResponsibleVets(rList.responsibleVeterinarians);
      }
      setAllGrooms(gList);
      setTrainerSessions(tSessions);
      if (workData) {
        const vets = workData.members.filter((m) => m.role === "VETERINARIAN");
        const vetIdSet = new Set(vets.map((v) => v.id));
        setVetMembers(vets);
        setVetEvents(
          workData.events.filter(
            (e) =>
              e.kind !== "SHIFT" &&
              e.kind !== "CARE" &&
              (e.userIds.some((id) => vetIdSet.has(id)) ||
                (e.kind === "ADMISSION" && !e.userIds.length)),
          ),
        );
      }

      if (isGroom) {
        const my = await getMyShifts({
          startDate: startDateStr,
          endDate: endDateStr,
          zoneId: selectedZoneId !== "ALL" ? selectedZoneId : undefined,
        });
        if (version === fetchVersion.current) setMyShifts(my);
      }
    } catch (err) {
      if (version === fetchVersion.current) setError(messageFor(err));
    } finally {
      if (version === fetchVersion.current) setLoading(false);
    }
  }, [startDateStr, endDateStr, selectedZoneId, isManager, isGroom, isTrainer, isVet, teamScope]);

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
    setCurrentMonday(getMonday(clubTodayDate()));
  };

  // Lọc khu
  const filteredZones = useMemo(() => {
    const byZone =
      selectedZoneId === "ALL"
        ? zones
        : zones.filter((z) => z.id === selectedZoneId);
    const scoped = (isTrainer && teamScope === 'mine') ? byZone.filter(zone => rosters.some(row => row.zoneId === zone.id)) : byZone;
    if (!personId) return scoped;
    return scoped.filter((z) =>
      rosters.some((r) => r.zoneId === z.id && r.groomUserId === personId),
    );
  }, [zones, selectedZoneId, personId, rosters, isTrainer, teamScope]);

  const trainerGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; sessions: ExerciseSession[] }
    >();
    for (const s of trainerSessions) {
      if (s.status === "CANCELLED") continue;
      const key = s.trainerId || s.trainerName || "UNASSIGNED";
      const name = s.trainerName || tr("Head Trainer");
      const entry = map.get(key) ?? { id: key, name, sessions: [] };
      entry.sessions.push(s);
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [trainerSessions]);

  const vetGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      name: string;
      events: WorkEvent[];
    }> = vetMembers.map((vet) => ({
      id: vet.id,
      name: vet.fullName,
      events: vetEvents.filter((e) => e.userIds.includes(vet.id)),
    }));
    const unassigned = vetEvents.filter((e) => !e.userIds.length);
    if (unassigned.length > 0) {
      groups.push({
        id: "UNASSIGNED",
        name: tr("Unassigned"),
        events: unassigned,
      });
    }
    return groups;
  }, [vetMembers, vetEvents]);

  // Ai có lịch trong tuần đang xem (đồng bộ theo tab vai trò đang chọn).
  const personOptions = useMemo(() => {
    const groomsMap = new Map<string, string>();
    for (const r of rosters) {
      groomsMap.set(
        r.groomUserId,
        parseGroomInfo(r.groom.fullName, isVi).cleanName,
      );
    }
    const entries: Array<{ value: string; label: string; role: "groom" | "trainer" | "vet" }> = [];
    if (!showStaffTabs || scheduleTab === "all" || scheduleTab === "groom") {
      for (const [id, name] of [...groomsMap].sort((a, b) => a[1].localeCompare(b[1]))) {
        entries.push({
          value: id,
          label: showStaffTabs && scheduleTab === "all" ? `Groom · ${name}` : name,
          role: "groom",
        });
      }
    }
    if (showStaffTabs && (scheduleTab === "all" || scheduleTab === "trainer")) {
      for (const t of trainerGroups) {
        entries.push({
          value: t.id,
          label: scheduleTab === "all" ? `HLV · ${t.name}` : t.name,
          role: "trainer",
        });
      }
    }
    if ((isManager || isVet) && (scheduleTab === "all" || scheduleTab === "vet")) {
      for (const v of vetGroups) {
        entries.push({
          value: v.id,
          label: scheduleTab === "all" ? `BS · ${v.name}` : v.name,
          role: "vet",
        });
      }
    }
    return [
      { value: "", label: tr("Everyone ({{count}})", { count: entries.length }) },
      ...entries.map(({ value, label }) => ({ value, label })),
    ];
  }, [rosters, trainerGroups, vetGroups, showStaffTabs, scheduleTab, isManager, isVet, isVi]);

  const selectedPersonRole = useMemo(() => {
    if (!personId) return null;
    if (rosters.some((r) => r.groomUserId === personId)) return "groom" as const;
    if (trainerGroups.some((t) => t.id === personId)) return "trainer" as const;
    if (vetGroups.some((v) => v.id === personId)) return "vet" as const;
    return null;
  }, [personId, rosters, trainerGroups, vetGroups]);

  const filteredTrainerGroups = useMemo(
    () => (personId ? trainerGroups.filter((t) => t.id === personId) : trainerGroups),
    [trainerGroups, personId],
  );
  const filteredVetGroups = useMemo(
    () => (personId ? vetGroups.filter((v) => v.id === personId) : vetGroups),
    [vetGroups, personId],
  );

  const personShifts = personInfo
    ? rosters
      .filter((r) => r.groomUserId === personInfo.id)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.shift.startTime.localeCompare(b.shift.startTime),
      )
    : [];

  // Lọc ca của tôi theo khu chuồng đã chọn
  const filteredMyShifts = useMemo(() => {
    if (selectedZoneId === "ALL") return myShifts;
    return myShifts.filter((s) => s.zone.id === selectedZoneId);
  }, [myShifts, selectedZoneId]);

  const zoneOptions = useMemo(
    () => [
      { value: "ALL", label: tr("All Zones") },
      ...zones.map((z) => ({
        value: z.id,
        label: getLocalizedZoneName(z, isVi),
      })),
    ],
    [zones, isVi],
  );

  const attentionItems = useMemo(() => {
    if (!isManager) return [];
    const items: Array<{
      key: string;
      kind: "inactive" | "unassigned";
      zone: Zone;
      shift: ShiftCatalogItem;
      day: (typeof weekDays)[number];
      slotRosters: ShiftRosterItem[];
      inactiveNames: string[];
    }> = [];

    for (const zone of filteredZones) {
      for (const shift of shifts) {
        for (const day of weekDays) {
          const slotRosters = rosters.filter(
            (r) =>
              r.date.startsWith(day.dateStr) &&
              r.shiftId === shift.id &&
              r.zoneId === zone.id,
          );
          if (slotRosters.length === 0) {
            items.push({
              key: `unassigned-${zone.id}-${shift.id}-${day.dateStr}`,
              kind: "unassigned",
              zone,
              shift,
              day,
              slotRosters,
              inactiveNames: [],
            });
            continue;
          }
          const inactiveRosters = slotRosters.filter(
            (r) => r.groom.status === "LOCKED" || r.groom.status === "INACTIVE",
          );
          if (inactiveRosters.length > 0) {
            items.push({
              key: `inactive-${zone.id}-${shift.id}-${day.dateStr}`,
              kind: "inactive",
              zone,
              shift,
              day,
              slotRosters,
              inactiveNames: inactiveRosters.map(
                (r) => parseGroomInfo(r.groom.fullName, isVi).cleanName,
              ),
            });
          }
        }
      }
    }

    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "inactive" ? -1 : 1;
      return (
        a.day.dateStr.localeCompare(b.day.dateStr) ||
        a.shift.startTime.localeCompare(b.shift.startTime)
      );
    });
    return items;
  }, [isManager, filteredZones, shifts, weekDays, rosters, isVi]);

  const inactiveAttentionCount = attentionItems.filter(
    (item) => item.kind === "inactive",
  ).length;
  const unassignedAttentionCount = attentionItems.length - inactiveAttentionCount;
  const visibleAttentionItems = showAllAttention
    ? attentionItems
    : attentionItems.slice(0, 6);

  const showGroomMatrix =
    (!showStaffTabs || scheduleTab === "all" || scheduleTab === "groom") &&
    (!selectedPersonRole || selectedPersonRole === "groom");
  const showTrainerMatrix =
    showStaffTabs &&
    (scheduleTab === "all" || scheduleTab === "trainer") &&
    (!selectedPersonRole || selectedPersonRole === "trainer");
  const showVetMatrix =
    (isManager || isVet) &&
    (scheduleTab === "all" || scheduleTab === "vet") &&
    (!selectedPersonRole || selectedPersonRole === "vet");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {isTrainer && <section aria-label={tr('My horses’ care team')}>
        <label><input type="checkbox" checked={teamScope === 'mine'} onChange={e => setTeamScope(e.target.checked ? 'mine' : 'club')} /> {tr('My horses’ care team')}</label>
        <p>{teamScope === 'mine' ? tr('Showing Groom shifts in the current zones of your active training horses.') : tr('Showing club Groom shifts. Veterinary responsibilities below remain scoped to your horses.')}</p>
        <h2>{tr('Veterinarians responsible for open medical records')}</h2>
        <p>{tr('Veterinary duty schedules are not recorded in this system.')}</p>
        {responsibleVets.length ? responsibleVets.map(vet => <p key={vet.id}><strong>{vet.fullName}</strong> · {vet.horses.map(h => h.name).join(', ')}</p>) : <p>{tr('No veterinarian is assigned to an open record for your horses.')}</p>}
      </section>}
      {isGroom && <Alert tone="info" title={tr('Your weekly roster')}>
        {myShifts.filter(row => row.date.slice(0, 10) === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(effectiveClubNow())).map(row => <p key={row.id}>{row.shift.name} · {row.zone.name}</p>)}
        <Link to="/stable/my-shift">{tr('Open today’s checklist')}</Link>
      </Alert>}
      <PageHeader
        title={tr("Schedule & Assignments")}
        description={tr(
          "View the club roster and assign Groom staff to shifts and stall zones.",
        )}
        action={
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to="/stalls" style={{ textDecoration: "none" }}>
              <Button tone="ghost">{tr("View Stall Map")}</Button>
            </Link>
            {isManager && (
              <Button tone="primary" onClick={() => setShowCopyModal(true)}>
                {tr("Copy from previous week")}
              </Button>
            )}
          </div>
        }
      />

      {isManager && (
        <div id="club-schedule" className={rosterStyles.compactMetaStrip}>
          <span className={rosterStyles.summaryPill}>
            <strong>{rosters.length}</strong> {tr("Groom assignments")}
          </span>
          <span className={rosterStyles.summaryPill}>
            <strong>{allGrooms.length}</strong> {tr("active Grooms")}
          </span>
          <span className={rosterStyles.summaryPill}>
            <strong>{trainerSessions.length}</strong> {tr("Trainer workouts")}
          </span>
          <span className={rosterStyles.summaryPill}>
            <strong>{vetEvents.length}</strong> {tr("Vet schedules")}
          </span>
          {attentionItems.length > 0 && (
            <a
              href="#attention-items"
              className={rosterStyles.summaryPill}
              style={{ textDecoration: "none", fontWeight: 600 }}
            >
              <strong>{attentionItems.length}</strong> {tr("Needs attention")}
            </a>
          )}
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Toolbar điều khiển gọn thống nhất */}
      <div className={rosterStyles.toolbarCard}>
        <div className={rosterStyles.toolbarRow}>
          {/* Điều hướng tuần */}
          <div className={styles.weekNavigation}>
            <Button tone="ghost" size="sm" onClick={handlePrevWeek}>
              <Icon name="chevronLeft" inline size={14} /> {tr("Previous week")}
            </Button>
            <Button tone="ghost" size="sm" onClick={handleCurrentWeek}>
              {tr("This week")}
            </Button>
            <Button tone="ghost" size="sm" onClick={handleNextWeek}>
              {tr("Next week")} <Icon name="chevronRight" inline size={14} />
            </Button>
            <span
              style={{
                fontWeight: 600,
                fontSize: "0.9375rem",
                marginLeft: "0.5rem",
              }}
            >
              {targetWeekLabel}
            </span>
          </div>

          {/* Bộ lọc */}
          <div className={rosterStyles.toolbarFilters}>
            {showGroomMatrix && (
              <div style={{ width: 195, maxWidth: "100%" }}>
                <Select
                  value={selectedZoneId}
                  options={zoneOptions}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                />
              </div>
            )}
            <div style={{ width: 230, maxWidth: "100%" }}>
              <Select
                aria-label={tr("Filter by person")}
                value={personId}
                options={personOptions}
                onChange={(e) => setPersonId(e.target.value)}
              />
            </div>

            {isGroom && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyMyShifts}
                  onChange={(e) => setOnlyMyShifts(e.target.checked)}
                />
                <span>{tr("My shifts only")}</span>
              </label>
            )}
          </div>
        </div>

        {showStaffTabs && (
          <div
            className={rosterStyles.roleTabs}
            style={{ marginBottom: 0 }}
            role="tablist"
            aria-label={tr("Schedule & Assignments")}
          >
            {(
              [
                { id: "all", label: tr("All staff") },
                { id: "groom", label: tr("Groom roster") },
                { id: "trainer", label: tr("Trainer schedule") },
                ...(isManager || isVet
                  ? [{ id: "vet", label: tr("Veterinary schedule") }]
                  : []),
              ] as Array<{
                id: "all" | "groom" | "trainer" | "vet";
                label: string;
              }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={scheduleTab === tab.id}
                data-active={scheduleTab === tab.id ? "true" : "false"}
                className={rosterStyles.roleTab}
                onClick={() => {
                  setScheduleTab(tab.id);
                  setPersonId("");
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--muted)",
            background: "var(--surface)",
            borderRadius: "var(--r-md)",
          }}
        >
          {tr("Loading rosters...")}
        </div>
      ) : isGroom && onlyMyShifts ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div id="club-schedule"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.125rem" }}>
              {tr("Your personal roster for this week ({{count}} shifts)", {
                count: filteredMyShifts.length,
              })}
            </h3>
          </div>

          {filteredMyShifts.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--muted)",
                background: "var(--surface)",
                borderRadius: "var(--r-md)",
              }}
            >
              {tr("You have no shifts assigned for this week.")}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {weekDays.map((day) => {
                const dayShifts = filteredMyShifts.filter((ms) =>
                  ms.date.startsWith(day.dateStr),
                );
                return (
                  <div
                    key={day.dateStr}
                    style={{
                      background: "var(--surface)",
                      border: day.isToday
                        ? "2px solid var(--brand)"
                        : "1px solid var(--border)",
                      borderRadius: "var(--r-md)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Day Header */}
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        background: day.isToday
                          ? "var(--brand-50)"
                          : "var(--surface-muted)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                          {day.dayName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--muted)",
                          }}
                        >
                          {day.formattedDMY}
                        </span>
                        {day.isToday && (
                          <Badge tone="brand">{tr("Today")}</Badge>
                        )}
                      </div>
                      <Badge tone={dayShifts.length > 0 ? "ok" : "neutral"}>
                        {dayShifts.length > 0
                          ? tr("{{count}} shifts", { count: dayShifts.length })
                          : tr("Not assigned")}
                      </Badge>
                    </div>

                    {/* Shifts on this day */}
                    <div style={{ padding: "0.875rem 1rem" }}>
                      {dayShifts.length === 0 ? (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--muted)",
                            fontStyle: "italic",
                            padding: "0.25rem 0",
                          }}
                        >
                          {tr("No duties scheduled for this day.")}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                            gap: "0.875rem",
                          }}
                        >
                          {dayShifts.map((ms) => (
                            <div
                              key={ms.id}
                              style={{
                                background: "var(--surface-muted)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--r-sm)",
                                padding: "0.875rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Badge tone="brand">
                                  {getLocalizedShiftName(ms.shift, isVi)}
                                </Badge>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {ms.shift.startTime} – {ms.shift.endTime}
                                </span>
                              </div>

                              <div style={{ fontSize: "0.875rem" }}>
                                <span style={{ color: "var(--muted)" }}>
                                  {tr("Zone:")}
                                </span>{" "}
                                <strong>
                                  {getLocalizedZoneName(ms.zone, isVi)}
                                </strong>
                              </div>

                              {ms.notes && (
                                <div
                                  style={{
                                    fontSize: "0.8125rem",
                                    color: "var(--muted)",
                                    background: "var(--surface)",
                                    padding: "0.35rem 0.5rem",
                                    borderRadius: "var(--r-xs)",
                                  }}
                                >
                                  <strong>{tr("Notes:")}</strong> {ms.notes}
                                </div>
                              )}

                              <div
                                style={{
                                  borderTop: "1px solid var(--border)",
                                  paddingTop: "0.5rem",
                                  marginTop: "0.25rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "0.375rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--muted)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {tr("Horses in zone:")}
                                  </span>
                                  <Badge tone="neutral">
                                    {tr("{{count}} horses", {
                                      count: ms.assignedHorsesCount,
                                    })}
                                  </Badge>
                                </div>
                                {ms.assignedHorses.length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "0.3rem",
                                    }}
                                  >
                                    {ms.assignedHorses.slice(0, 6).map((h) => (
                                      <span
                                        key={h.id}
                                        style={{
                                          fontSize: "0.75rem",
                                          padding: "0.15rem 0.4rem",
                                          background: "var(--surface)",
                                          borderRadius: "var(--r-xs)",
                                          border: "1px solid var(--border)",
                                        }}
                                      >
                                        {h.name}{" "}
                                        {h.isMedicalLocked &&
                                          `[${tr("Locked")}]`}
                                      </span>
                                    ))}
                                    {ms.assignedHorses.length > 6 && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "var(--muted)",
                                        }}
                                      >
                                        +{ms.assignedHorses.length - 6}{" "}
                                        {tr("others")}
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
        <div
          id="groom-assignments"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Tabs cho Mobile view */}
          <div className={rosterStyles.daySelector}>
            {weekDays.map((d, i) => (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setMobileDayIdx(i)}
                aria-pressed={mobileDayIdx === i}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--r-sm)",
                  border:
                    mobileDayIdx === i
                      ? "2px solid var(--brand)"
                      : "1px solid var(--border)",
                  background:
                    mobileDayIdx === i
                      ? "var(--brand-muted)"
                      : "var(--surface)",
                  fontWeight: mobileDayIdx === i ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {d.dayName} ({d.formattedDMY.slice(0, 5)})
              </button>
            ))}
          </div>

          {showGroomMatrix && (
          <div className={rosterStyles.scheduleSection}>
            {showStaffTabs && (
              <div className={rosterStyles.scheduleSectionHead}>
                <h3>{tr("Groom roster")}</h3>
                <span className={rosterStyles.scheduleSectionCount}>
                  {rosters.length} {tr("Groom assignments")}
                </span>
              </div>
            )}
          {/* Lưới Matrix (Desktop/Tablet) */}
          <div
            style={{
              overflowX: "auto",
              background: "var(--surface)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
            }}
          >
            <table
              className={rosterStyles.matrix}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                textAlign: "left",
                minWidth: 960,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-muted)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th className={rosterStyles.zoneHead}>{tr("Zone")}</th>
                  <th className={rosterStyles.shiftHead}>{tr("Shift")}</th>
                  {weekDays.map((d, i) => (
                    <th
                      key={d.dateStr}
                      className={`${rosterStyles.dayHead} ${i === mobileDayIdx ? rosterStyles.selectedDay : rosterStyles.otherDay}`}
                      style={{
                        background: d.isToday ? "var(--brand-50)" : undefined,
                      }}
                    >
                      <div>{d.dayName}</div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: d.isToday
                            ? "var(--brand-700)"
                            : "var(--muted)",
                        }}
                      >
                        {d.formattedDMY} {d.isToday && ` • ${tr("Today")}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredZones.length === 0 || shifts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      {tr("No active zones or shifts available.")}
                    </td>
                  </tr>
                ) : (
                  filteredZones.flatMap((zone) =>
                    shifts.map((shift, sIdx) => {
                      const isFirstShiftOfZone = sIdx === 0;
                      return (
                        <tr
                          key={`${zone.id}-${shift.id}`}
                          className={
                            isFirstShiftOfZone
                              ? rosterStyles.zoneStart
                              : undefined
                          }
                        >
                          {/* Tên khu gộp cho mọi ca của khu */}
                          {isFirstShiftOfZone && (
                            <th
                              scope="rowgroup"
                              rowSpan={shifts.length}
                              className={rosterStyles.zoneCell}
                            >
                              {getLocalizedZoneName(zone, isVi)}
                            </th>
                          )}
                          <td className={rosterStyles.shiftCell}>
                            <div className={rosterStyles.shiftName}>
                              {getLocalizedShiftName(shift, isVi)}
                            </div>
                            <div className={rosterStyles.shiftTime}>
                              {shift.startTime}–{shift.endTime}
                            </div>
                            {shift.isOvernight && (
                              <div style={{ marginTop: "0.25rem" }}>
                                <Badge tone="warn">{tr("Overnight")}</Badge>
                              </div>
                            )}
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
                            const localizedZone = getLocalizedZoneName(
                              zone,
                              isVi,
                            );
                            const localizedShift = getLocalizedShiftName(
                              shift,
                              isVi,
                            );

                            return (
                              <td
                                key={day.dateStr}
                                className={[
                                  rosterStyles.cell,
                                  day.isToday ? rosterStyles.cellToday : "",
                                  dayIndex === mobileDayIdx
                                    ? rosterStyles.selectedDay
                                    : rosterStyles.otherDay,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                role={(isManager || isGroom) ? "button" : undefined}
                                tabIndex={(isManager || isGroom) ? 0 : undefined}
                                aria-label={
                                  (isManager || isGroom)
                                    ? [
                                      localizedZone,
                                      localizedShift,
                                      day.formattedDMY,
                                      hasGroom
                                        ? slotRosters
                                          .map(
                                            (r) =>
                                              parseGroomInfo(
                                                r.groom.fullName,
                                                isVi,
                                              ).cleanName,
                                          )
                                          .join(", ")
                                        : tr("No groom assigned"),
                                    ].join(" · ")
                                    : undefined
                                }
                                onKeyDown={
                                  (isManager || isGroom)
                                    ? (event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        event.currentTarget.click();
                                      }
                                    }
                                    : undefined
                                }
                                onClick={() => {
                                  if ((isManager || isGroom)) {
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
                                  <div className={rosterStyles.groomList}>
                                    {slotRosters.map((r) => {
                                      const groomInfo = parseGroomInfo(
                                        r.groom.fullName,
                                        isVi,
                                      );
                                      const isGroomInactive =
                                        r.groom.status === "LOCKED" ||
                                        r.groom.status === "INACTIVE";
                                      return (
                                        <div
                                          key={r.id}
                                          data-own-shift={r.groomUserId === currentUser.id ? "true" : undefined}
                                          className={rosterStyles.groomCard}
                                          role="button"
                                          tabIndex={0}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (isGroom) setSwapRoster(r); else setPersonInfo(r.groom);
                                          }}
                                          onKeyDown={(event) => {
                                            if (
                                              event.key === "Enter" ||
                                              event.key === " "
                                            ) {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              if (isGroom) setSwapRoster(r); else setPersonInfo(r.groom);
                                            }
                                          }}
                                          style={{
                                            cursor: "pointer",
                                            opacity:
                                              personId &&
                                                r.groomUserId !== personId
                                                ? 0.35
                                                : 1,
                                            ...(isGroomInactive
                                              ? {
                                                border: "1px solid #f87171",
                                                backgroundColor: "#fef2f2",
                                              }
                                              : {}),
                                          }}
                                          title={
                                            r.notes
                                              ? `${groomInfo.cleanName} · ${groomInfo.roleLabel} (${r.notes})`
                                              : `${groomInfo.cleanName} · ${groomInfo.roleLabel}`
                                          }
                                        >
                                          <div
                                            className={rosterStyles.groomAvatar}
                                            aria-hidden="true"
                                          >
                                            {groomInfo.initialsText}
                                          </div>
                                          <div
                                            className={rosterStyles.groomMeta}
                                          >
                                            <span
                                              className={rosterStyles.groomName}
                                              style={
                                                isGroomInactive
                                                  ? { color: "#b91c1c" }
                                                  : undefined
                                              }
                                            >
                                              {groomInfo.cleanName}{r.groomUserId === currentUser.id && <Badge tone="ok">{tr("Your shift")}</Badge>}
                                              {isGroomInactive && (
                                                <span
                                                  style={{
                                                    marginLeft: 4,
                                                    fontSize: 9,
                                                    fontWeight: 700,
                                                    color: "#dc2626",
                                                    backgroundColor:
                                                      "rgba(239, 68, 68, 0.15)",
                                                    padding: "1px 4px",
                                                    borderRadius: 3,
                                                  }}
                                                >
                                                  {isVi ? "Đã khóa" : "Locked"}
                                                </span>
                                              )}
                                            </span>
                                            {groomInfo.roleLabel && (
                                              <span
                                                className={
                                                  rosterStyles.groomRole
                                                }
                                              >
                                                {groomInfo.roleLabel}
                                              </span>
                                            )}
                                          </div>
                                          {r.notes && (
                                            <span
                                              className={
                                                rosterStyles.groomNoteBadge
                                              }
                                              title={r.notes}
                                            >
                                              <Icon
                                                name="clipboard"
                                                size={11}
                                              />
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : isManager ? (
                                  <div className={rosterStyles.emptySlotAction}>
                                    <div
                                      className={rosterStyles.emptySlotIcon}
                                      aria-hidden="true"
                                    >
                                      <Icon name="plus" size={12} />
                                    </div>
                                    <span
                                      className={rosterStyles.emptySlotTitle}
                                    >
                                      {tr("+ Assign")}
                                    </span>
                                    <span
                                      className={rosterStyles.emptySlotSubtext}
                                    >
                                      {tr("No groom assigned")}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={rosterStyles.emptySlotReadOnly}
                                  >
                                    <span className={rosterStyles.emptyDot} />
                                    <span>{tr("No groom assigned")}</span>
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

          {showTrainerMatrix && (
            <section
              id="trainer-schedule"
              className={rosterStyles.scheduleSection}
              aria-label={tr("Trainer schedule")}
            >
              <div className={rosterStyles.scheduleSectionHead}>
                <h3>{tr("Trainer schedule")}</h3>
                <span className={rosterStyles.scheduleSectionCount}>
                  {filteredTrainerGroups.length} {tr("Head Trainer")} · {trainerSessions.length} {tr("sessions on day")}
                </span>
              </div>
              <div
                style={{
                  overflowX: "auto",
                  background: "var(--surface)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <table
                  className={rosterStyles.matrix}
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                    textAlign: "left",
                    minWidth: 960,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface-muted)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <th className={rosterStyles.zoneHead}>
                        {tr("Head Trainer")}
                      </th>
                      {weekDays.map((d, i) => (
                        <th
                          key={d.dateStr}
                          className={`${rosterStyles.dayHead} ${i === mobileDayIdx ? rosterStyles.selectedDay : rosterStyles.otherDay}`}
                          style={{
                            background: d.isToday
                              ? "var(--brand-50)"
                              : undefined,
                          }}
                        >
                          <div>{d.dayName}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: d.isToday
                                ? "var(--brand-700)"
                                : "var(--muted)",
                            }}
                          >
                            {d.formattedDMY} {d.isToday && ` • ${tr("Today")}`}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainerGroups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: "1.5rem",
                            textAlign: "center",
                            color: "var(--muted)",
                          }}
                        >
                          {tr("No workouts scheduled this week.")}
                        </td>
                      </tr>
                    ) : (
                      filteredTrainerGroups.map((trainer) => (
                        <tr key={trainer.id} className={rosterStyles.zoneStart}>
                          <th scope="row" className={rosterStyles.zoneCell}>
                            {trainer.name}
                          </th>
                          {weekDays.map((day, dayIndex) => {
                            const daySessions = trainer.sessions
                              .filter((s) => s.sessionDate === day.dateStr)
                              .sort((a, b) =>
                                (a.startTime || "").localeCompare(b.startTime || ""),
                              );
                            return (
                              <td
                                key={day.dateStr}
                                className={[
                                  rosterStyles.cell,
                                  day.isToday ? rosterStyles.cellToday : "",
                                  dayIndex === mobileDayIdx
                                    ? rosterStyles.selectedDay
                                    : rosterStyles.otherDay,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {daySessions.length > 0 ? (
                                  <button
                                    type="button"
                                    data-own-shift={trainer.id === currentUser.id ? "true" : undefined}
                                    className={`${rosterStyles.groomCard} ${rosterStyles.summaryCardBtn}`}
                                    onClick={() =>
                                      setWorkModal({
                                        role: "trainer",
                                        personId: trainer.id,
                                        personName: trainer.name,
                                        dayLabel: `${day.dayName} ${day.formattedDMY}`,
                                        sessions: daySessions,
                                      })
                                    }
                                  >
                                    <span className={rosterStyles.groomAvatar}>
                                      {nameInitials(trainer.name, "HLV")}
                                    </span>
                                    <div className={rosterStyles.groomMeta}>
                                      <span className={rosterStyles.groomName}>
                                        {trainer.name}
                                        {trainer.id === currentUser.id && (
                                          <Badge tone="ok">{tr("Your shift")}</Badge>
                                        )}
                                      </span>
                                      <span className={rosterStyles.groomRole}>
                                        {tr("Head Trainer")}
                                      </span>
                                    </div>
                                  </button>
                                ) : (
                                  <div className={rosterStyles.emptySlotReadOnly}>
                                    <span className={rosterStyles.emptyDot} />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {showVetMatrix && (
            <section
              id="vet-schedule"
              className={rosterStyles.scheduleSection}
              aria-label={tr("Veterinary schedule")}
            >
              <div className={rosterStyles.scheduleSectionHead}>
                <h3>{tr("Veterinary schedule")}</h3>
                <span className={rosterStyles.scheduleSectionCount}>
                  {filteredVetGroups.length} {tr("Veterinarian")} · {vetEvents.length} {tr("tasks on day")}
                </span>
              </div>
              <div
                style={{
                  overflowX: "auto",
                  background: "var(--surface)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <table
                  className={rosterStyles.matrix}
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                    textAlign: "left",
                    minWidth: 960,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface-muted)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <th className={rosterStyles.zoneHead}>
                        {tr("Veterinarian")}
                      </th>
                      {weekDays.map((d, i) => (
                        <th
                          key={d.dateStr}
                          className={`${rosterStyles.dayHead} ${i === mobileDayIdx ? rosterStyles.selectedDay : rosterStyles.otherDay}`}
                          style={{
                            background: d.isToday
                              ? "var(--brand-50)"
                              : undefined,
                          }}
                        >
                          <div>{d.dayName}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: d.isToday
                                ? "var(--brand-700)"
                                : "var(--muted)",
                            }}
                          >
                            {d.formattedDMY} {d.isToday && ` • ${tr("Today")}`}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVetGroups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: "1.5rem",
                            textAlign: "center",
                            color: "var(--muted)",
                          }}
                        >
                          {tr("No veterinary work scheduled this week.")}
                        </td>
                      </tr>
                    ) : (
                      filteredVetGroups.map((vetGroup) => (
                        <tr key={vetGroup.id} className={rosterStyles.zoneStart}>
                          <th scope="row" className={rosterStyles.zoneCell}>
                            {vetGroup.name}
                          </th>
                          {weekDays.map((day, dayIndex) => {
                            const dayEvents = vetGroup.events.filter(
                              (e) =>
                                clubDayYmd(e.startsAt) <= day.dateStr &&
                                clubDayYmd(
                                  new Date(Date.parse(e.endsAt) - 1).toISOString(),
                                ) >= day.dateStr,
                            );
                            return (
                              <td
                                key={day.dateStr}
                                className={[
                                  rosterStyles.cell,
                                  day.isToday ? rosterStyles.cellToday : "",
                                  dayIndex === mobileDayIdx
                                    ? rosterStyles.selectedDay
                                    : rosterStyles.otherDay,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {dayEvents.length > 0 ? (
                                  <button
                                    type="button"
                                    data-own-shift={vetGroup.id === currentUser.id ? "true" : undefined}
                                    className={`${rosterStyles.groomCard} ${rosterStyles.summaryCardBtn}`}
                                    onClick={() =>
                                      setWorkModal({
                                        role: "vet",
                                        personId: vetGroup.id,
                                        personName: vetGroup.name,
                                        dayLabel: `${day.dayName} ${day.formattedDMY}`,
                                        events: dayEvents,
                                      })
                                    }
                                  >
                                    <span className={rosterStyles.groomAvatar}>
                                      {vetGroup.id === "UNASSIGNED"
                                        ? "?"
                                        : nameInitials(vetGroup.name, "BS")}
                                    </span>
                                    <div className={rosterStyles.groomMeta}>
                                      <span className={rosterStyles.groomName}>
                                        {vetGroup.name}
                                        {vetGroup.id === currentUser.id && (
                                          <Badge tone="ok">{tr("Your shift")}</Badge>
                                        )}
                                      </span>
                                      <span className={rosterStyles.groomRole}>
                                        {vetGroup.id === "UNASSIGNED"
                                          ? tr("Unassigned")
                                          : tr("Veterinarian")}
                                      </span>
                                    </div>
                                  </button>
                                ) : (
                                  <div className={rosterStyles.emptySlotReadOnly}>
                                    <span className={rosterStyles.emptyDot} />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {isManager && !loading && (
        <section
          id="attention-items"
          className={rosterStyles.attentionSection}
          aria-label={tr("Needs attention")}
        >
          <div className={rosterStyles.attentionHeader}>
            <h2>{tr("Needs attention")}</h2>
            <div className={rosterStyles.attentionCounts}>
              {inactiveAttentionCount > 0 && (
                <Badge tone="danger">
                  {inactiveAttentionCount} {tr("Inactive or locked Groom assigned")}
                </Badge>
              )}
              {unassignedAttentionCount > 0 && (
                <Badge tone="warn">
                  {unassignedAttentionCount} {tr("Unassigned shift slots")}
                </Badge>
              )}
              {attentionItems.length > 6 && (
                <Button
                  type="button"
                  size="sm"
                  tone="ghost"
                  onClick={() => setShowAllAttention((prev) => !prev)}
                >
                  {showAllAttention
                    ? tr("Show fewer")
                    : `${tr("Show all")} (${attentionItems.length})`}
                </Button>
              )}
            </div>
          </div>

          {attentionItems.length === 0 ? (
            <div className={rosterStyles.attentionEmpty}>
              {tr("All shift slots in this week have active Groom coverage.")}
            </div>
          ) : (
            <div className={rosterStyles.attentionGrid}>
              {visibleAttentionItems.map((item) => {
                const zoneName = getLocalizedZoneName(item.zone, isVi);
                const shiftName = getLocalizedShiftName(item.shift, isVi);
                const isInactive = item.kind === "inactive";
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={rosterStyles.attentionRow}
                    data-severity={isInactive ? "danger" : "warn"}
                    onClick={() =>
                      setSelectedSlot({
                        dateStr: item.day.dateStr,
                        formattedDate: item.day.formattedDMY,
                        shift: item.shift,
                        zone: item.zone,
                        currentRosters: item.slotRosters,
                      })
                    }
                  >
                    <div className={rosterStyles.attentionInfo}>
                      <span className={rosterStyles.attentionTitle}>
                        {zoneName} · {shiftName}
                      </span>
                      <span className={rosterStyles.attentionMeta}>
                        {item.day.dayName} {item.day.formattedDMY} ·{" "}
                        {isInactive
                          ? `${tr("Inactive or locked Groom assigned")}: ${item.inactiveNames.join(", ")}`
                          : tr("Unassigned shift slots")}
                      </span>
                    </div>
                    <span className={rosterStyles.attentionAction}>
                      {isInactive ? tr("Replace groom") : tr("Assign now")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Popup thông tin nhân viên chăm sóc */}
      {personInfo && (
        <Modal
          title={parseGroomInfo(personInfo.fullName, isVi).cleanName}
          subtitle={tr("Groom")}
          width={420}
          onClose={() => setPersonInfo(null)}
          foot={
            <Button
              tone="secondary"
              size="sm"
              onClick={() => {
                setPersonId(personId === personInfo.id ? "" : personInfo.id);
                setPersonInfo(null);
              }}
            >
              {personId === personInfo.id
                ? tr("Show everyone")
                : tr("Show only this person")}
            </Button>
          }
        >
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div>
              {tr("Email")}:{" "}
              <a href={`mailto:${personInfo.email}`}>{personInfo.email}</a>
            </div>
            <div>
              {tr("Phone")}:{" "}
              {personInfo.phoneNumber ? (
                <a href={`tel:${personInfo.phoneNumber}`}>
                  {personInfo.phoneNumber}
                </a>
              ) : (
                "—"
              )}
            </div>
            {(personInfo.status === "LOCKED" ||
              personInfo.status === "INACTIVE") && (
                <Badge tone="danger">{isVi ? "Đã khóa" : "Locked"}</Badge>
              )}
            <strong style={{ marginTop: 8 }}>
              {tr("Shifts this week ({{count}})", {
                count: personShifts.length,
              })}
            </strong>
            {personShifts.map((r) => (
              <div key={r.id}>
                {formatDMY(new Date(r.date)).slice(0, 5)} ·{" "}
                {getLocalizedZoneName(r.zone, isVi)} ·{" "}
                {getLocalizedShiftName(r.shift, isVi)} ({r.shift.startTime}–
                {r.shift.endTime})
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Popup thông tin khái quát công việc HLV / Bác sĩ thú y */}
      {workModal && (
        <Modal
          title={workModal.personName}
          subtitle={`${workModal.role === "trainer" ? tr("Head Trainer") : tr("Veterinarian")} · ${workModal.dayLabel}`}
          width={500}
          onClose={() => setWorkModal(null)}
          foot={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, flexWrap: "wrap" }}>
              <Button
                tone="secondary"
                size="sm"
                onClick={() => {
                  setPersonId(personId === workModal.personId ? "" : workModal.personId);
                  setWorkModal(null);
                }}
              >
                {personId === workModal.personId
                  ? tr("Show everyone")
                  : tr("Show only this person")}
              </Button>
              <Link
                to={workModal.role === "trainer" ? "/calendar" : "/records"}
                className={rosterStyles.workModalLink}
                style={{ alignSelf: "center" }}
              >
                {workModal.role === "trainer"
                  ? tr("Open weekly calendar")
                  : tr("Open medical records")}
              </Link>
            </div>
          }
        >
          <div className={rosterStyles.workModalList}>
            {workModal.role === "trainer" &&
              (workModal.sessions ?? []).map((s) => (
                <div key={s.id} className={rosterStyles.workModalItem}>
                  <div className={rosterStyles.workModalMeta}>
                    <span className={rosterStyles.workModalTitle}>
                      {s.startTime} · {s.sessionType} ({s.horseName})
                    </span>
                    <span className={rosterStyles.workModalSub}>
                      {s.trackType}
                      {s.targetDistanceMeters ? ` · ${s.targetDistanceMeters}m` : ""}
                      {s.status ? ` · ${s.status}` : ""}
                    </span>
                  </div>
                  <Link
                    to={`/training/plans/${encodeURIComponent(s.planId)}`}
                    className={rosterStyles.workModalLink}
                  >
                    {tr("View details")}
                  </Link>
                </div>
              ))}
            {workModal.role === "vet" &&
              (workModal.events ?? []).map((e) => (
                <div key={e.id} className={rosterStyles.workModalItem}>
                  <div className={rosterStyles.workModalMeta}>
                    <span className={rosterStyles.workModalTitle}>{e.title}</span>
                    <span className={rosterStyles.workModalSub}>
                      {tr(VET_KIND_META[e.kind]?.labelKey ?? "Other tasks")} ·{" "}
                      {e.allDay
                        ? tr("All day")
                        : `${clubClock(e.startsAt)}–${clubClock(e.endsAt)}`}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </div>
                  <Link to={e.link} className={rosterStyles.workModalLink}>
                    {tr("View details")}
                  </Link>
                </div>
              ))}
          </div>
        </Modal>
      )}

      {selectedSlot && isGroom && <Modal title={`${selectedSlot.formattedDate} · ${selectedSlot.shift.name} · ${selectedSlot.zone.name}`} onClose={() => setSelectedSlot(null)}>
        {selectedSlot.currentRosters.length ? selectedSlot.currentRosters.map(row => <Button key={row.id} tone="secondary" onClick={() => { setSwapRoster(row); setSelectedSlot(null); }}>{row.groomUserId === currentUser.id ? tr('Your shift') : row.groom.fullName}</Button>) : <p>{tr('No duties scheduled for this day.')}</p>}
      </Modal>}
      {swapRoster && isGroom && <ShiftSwapRequestModal selected={swapRoster} rosters={rosters} onClose={() => setSwapRoster(null)} />}
      {/* Modal Phân ca một ô DL-4.01 */}
      {selectedSlot && isManager && (
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
