import { api } from "./api";
import {
  applyDemoClockState,
  clubIso,
  clubParts,
  effectiveClubNow,
  type DemoClockState,
} from "./demo-clock";
export async function syncDemoClock() {
  const state = await api<DemoClockState>("GET", "/demo-clock", undefined, {
    silent: true,
  });
  applyDemoClockState(state);
  return state;
}
export async function setDemoDate(date: string | null, time?: string | null) {
  const at = date
    ? clubIso(date, time || clubParts(effectiveClubNow().toISOString()).time)
    : null;
  const state = await api<DemoClockState>("POST", "/demo-clock", { at });
  applyDemoClockState(state);
  return state;
}
