const CLUB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** ISO -> ngày + giờ theo giờ câu lạc bộ. */
export function clubParts(iso: string): { date: string; time: string } {
  const local = new Date(
    new Date(iso).getTime() + CLUB_OFFSET_MS,
  ).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Ngày (YYYY-MM-DD) + giờ (HH:mm) theo giờ câu lạc bộ -> ISO gửi BE. */
export function clubIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

export interface DemoClockState {
  serverNow: string;
  realNow: string;
  simulated: boolean;
  revision: string;
}
interface ClockCache {
  state: DemoClockState;
  receivedAt: number;
}
const KEY = "equiflow_business_clock";
let cache: ClockCache | null | undefined;
function currentClock(): ClockCache | null {
  if (import.meta.env?.PROD) return null;
  if (cache !== undefined) return cache;
  try {
    const raw =
      typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache =
      parsed &&
      Number.isFinite(Date.parse(parsed.state?.serverNow)) &&
      typeof parsed.receivedAt === "number"
        ? parsed
        : null;
  } catch {
    cache = null;
  }
  return cache ?? null;
}
export function applyDemoClockState(state: DemoClockState) {
  if (
    !Number.isFinite(Date.parse(state.serverNow)) ||
    typeof state.simulated !== "boolean" ||
    typeof state.revision !== "string"
  )
    throw new Error("Invalid server clock");
  const changed = currentClock()?.state.revision !== state.revision;
  cache = { state, receivedAt: Date.now() };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(cache));
    localStorage.removeItem("equiflow_demo_date");
    localStorage.removeItem("equiflow_demo_time");
  }
  if (changed && typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("equiflow_date_changed"));
}
export function effectiveClubNow(): Date {
  const clock = currentClock();
  return clock
    ? new Date(
        Date.parse(clock.state.serverNow) + Date.now() - clock.receivedAt,
      )
    : new Date();
}
export function getDemoDate(): string | null {
  return currentClock()?.state.simulated
    ? clubParts(effectiveClubNow().toISOString()).date
    : null;
}
export function getDemoTime(): string | null {
  return currentClock()?.state.simulated
    ? clubParts(effectiveClubNow().toISOString()).time
    : null;
}
export function getDemoClockRevision(): string | null {
  return currentClock()?.state.revision ?? null;
}
export function todayClub(): string {
  return clubParts(effectiveClubNow().toISOString()).date;
}

/** Ngày mai theo giờ câu lạc bộ: giáo án chỉ được bắt đầu từ ngày này. */
export function tomorrowClub(): string {
  const d = new Date(`${todayClub()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
