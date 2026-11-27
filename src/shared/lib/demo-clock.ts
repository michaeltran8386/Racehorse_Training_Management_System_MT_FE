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

export function getDemoDate(): string | null {
  if (typeof window === "undefined" || import.meta.env?.PROD) return null;
  const val = localStorage.getItem("equiflow_demo_date");
  return val && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null;
}

export function getDemoTime(): string | null {
  if (typeof window === "undefined" || import.meta.env?.PROD) return null;
  const time = localStorage.getItem("equiflow_demo_time");
  return time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

export function effectiveClubNow(): Date {
  const now = new Date();
  const date = getDemoDate();
  if (!date) return now;
  const time = getDemoTime();
  const clock = time
    ? `${time}:00.000`
    : new Date(+now + CLUB_OFFSET_MS).toISOString().slice(11, 23);
  return new Date(`${date}T${clock}+07:00`);
}

export function setDemoDate(date: string | null, time?: string | null) {
  if (typeof window === "undefined") return;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    localStorage.setItem("equiflow_demo_date", date);
  } else {
    localStorage.removeItem("equiflow_demo_date");
  }
  if (
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    time &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    localStorage.setItem("equiflow_demo_time", time);
  } else localStorage.removeItem("equiflow_demo_time");
  window.dispatchEvent(
    new CustomEvent("equiflow_date_changed", { detail: { date } }),
  );
}

export function todayClub(): string {
  const demo = getDemoDate();
  if (demo) return demo;
  return clubParts(new Date().toISOString()).date;
}

/** Ngày mai theo giờ câu lạc bộ: giáo án chỉ được bắt đầu từ ngày này. */
export function tomorrowClub(): string {
  const d = new Date(`${todayClub()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
