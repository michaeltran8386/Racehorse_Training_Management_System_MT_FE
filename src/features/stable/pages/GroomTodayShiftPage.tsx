import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { todayClub } from "@/features/training/api";
import { getMyShifts } from "../api/shiftRosterApi";
import { dailyTasksApi } from "../api/dailyTasksApi";
import { GroomHorseCard } from "../components/GroomHorseCard";
import type { MyShiftItem } from "../types/shiftRoster";
import type { DailyCareTask } from "../types/dailyTasks";
import styles from "./GroomTodayShiftPage.module.css";
export default function GroomTodayShiftPage() {
  const user=useCurrentUser();
  return user.role==='GROOM'?<GroomTodayShiftContent/>:<Navigate to="/403" replace/>;
}
function GroomTodayShiftContent() {
  const { isVietnamese: vi } = useAppLanguage();
  const [date, setDate] = useState(todayClub);
  const [shifts, setShifts] = useState<MyShiftItem[]>([]);
  const [tasks, setTasks] = useState<DailyCareTask[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => effectiveClubNow().getTime());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(effectiveClubNow().getTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTasks([]);
    setShifts([]);
    getMyShifts({ startDate: date, endDate: date })
      .then(async (rows) => {
        if (!active) return;
        setShifts(rows);
        setSelected(rows[0]?.id ?? "");
        // Fetch every page; cards must not imply a complete checklist from one page.
        const all: DailyCareTask[] = [];
        for (const zoneId of new Set(rows.map((s) => s.zone.id))) {
          for (let page = 1; ; page++) {
            const res = await dailyTasksApi.list({
              date,
              zoneId,
              onlyMine: true,
              page,
              limit: 100,
            });
            all.push(...res.items);
            if (!res.items.length || page * 100 >= res.total) break;
          }
        }
        if (active) setTasks([...new Map(all.map((t) => [t.id, t])).values()]);
      })
      .catch((e) => {
        if (active) setError(messageFor(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, retry]);
  const shift = shifts.find((s) => s.id === selected);
  const shiftTasks = tasks.filter(
    (t) =>
      t.stallZoneId === shift?.zone.id &&
      (!t.shiftId || t.shiftId === shift?.shift.id),
  );
  const completed = shiftTasks.filter((t) => t.isCompleted).length;
  const start = shift
    ? new Date(`${date}T${shift.shift.startTime}:00+07:00`).getTime()
    : 0;
  const end = shift
    ? new Date(`${date}T${shift.shift.endTime}:00+07:00`).getTime() +
      (shift.shift.isOvernight ? 86400000 : 0)
    : 0;
  const timeLabel =
    now < start
      ? vi
        ? "Chưa bắt đầu"
        : "Upcoming"
      : now >= end
        ? vi
          ? "Đã hết giờ ca"
          : "Shift ended"
        : `${vi ? "Còn" : "Remaining"} ${Math.ceil((end - now) / 60000)} ${vi ? "phút" : "min"}`;
  const horses = [...(shift?.assignedHorses ?? [])].sort((a, b) => {
    const stall = (id: string) =>
      shiftTasks.find((t) => t.horseId === id)?.stall?.code ?? "";
    return (
      stall(a.id).localeCompare(stall(b.id), undefined, { numeric: true }) ||
      a.name.localeCompare(b.name)
    );
  });
  return (
    <div className={styles.page}>
      <PageHeader
        title={vi ? "Ca trực của tôi" : "My shift"}
        description={
          vi
            ? "Lịch được phân công và checklist chăm sóc theo khu chuồng."
            : "Assigned shifts and care checklists by stable zone."
        }
      />
      <Link to="/stable/shifts">{vi?"Xem lịch tuần và đề nghị đổi ca":"Weekly roster and shift change requests"}</Link>
      <div className={styles.row}>
        <label htmlFor="my-shift-date">{vi ? "Ngày trực" : "Shift date"}</label>
        <input
          className={styles.date}
          id="my-shift-date"
          type="date"
          required
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
        <Button tone="secondary" onClick={() => setDate(todayClub())}>
          {vi ? "Hôm nay" : "Today"}
        </Button>
        <Button
          tone="secondary"
          disabled={loading}
          onClick={() => setRetry((n) => n + 1)}
        >
          {vi ? "Tải lại" : "Refresh"}
        </Button>
      </div>
      {loading ? (
        <p role="status">
          {vi ? "Đang tải lịch và công việc…" : "Loading shifts and tasks…"}
        </p>
      ) : error ? (
        <Alert tone="danger">{error}</Alert>
      ) : !shifts.length ? (
        <Card>
          <p>
            {vi
              ? "Bạn chưa được phân ca trong ngày này. Liên hệ quản lý CLB nếu lịch chưa đúng."
              : "No assigned shifts on this date. Contact the club manager if the roster is incorrect."}
          </p>
        </Card>
      ) : (
        <>
          <nav
            className={styles.row}
            aria-label={vi ? "Chọn ca" : "Choose shift"}
          >
            {shifts.map((s) => (
              <button
                type="button"
                className={styles.tab}
                key={s.id}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                {s.shift.name} · {s.zone.code}
              </button>
            ))}
          </nav>
          {shift && (
            <>
              <Card>
                <div className={styles.row}>
                  <h2>
                    {shift.shift.name} · {shift.zone.name}
                  </h2>
                  <Badge tone="info">{timeLabel}</Badge>
                </div>
                <p>
                  {date} · {shift.shift.startTime}–{shift.shift.endTime} ·{" "}
                  {vi ? "Giờ Việt Nam" : "Vietnam time"}
                </p>
                {shift.notes && <p>{shift.notes}</p>}
                <p>
                  {completed}/{shiftTasks.length}{" "}
                  {vi ? "công việc hoàn tất" : "tasks completed"} ·{" "}
                  {horses.length}{" "}
                  {vi ? "ngựa trong khu được giao" : "horses in assigned zone"}
                </p>
                <progress
                  aria-label={vi ? "Tiến độ checklist" : "Checklist progress"}
                  value={completed}
                  max={shiftTasks.length || 1}
                />
                <Link
                  className={styles.touchLink}
                  to={`/tasks?date=${date}&zoneId=${shift.zone.id}`}
                >
                  {vi
                    ? "Bắt đầu / tiếp tục checklist"
                    : "Start / continue checklist"}
                </Link>
              </Card>
              <p className={styles.source}>
                {vi
                  ? "Nguồn: lịch phân ca của tôi và công việc được giao theo ngày/khu. Đồng hồ thể hiện giờ ca, không phải chấm công."
                  : "Source: my roster and assigned daily tasks by zone. The clock shows shift hours, not attendance."}
              </p>
              <div className={styles.horses}>
                {horses.map((horse) => (
                  <GroomHorseCard
                    key={horse.id}
                    horse={horse}
                    tasks={shiftTasks.filter((t) => t.horseId === horse.id)}
                    date={date}
                    zoneId={shift.zone.id}
                  />
                ))}
              </div>

            </>
          )}
        </>
      )}
    </div>
  );
}
