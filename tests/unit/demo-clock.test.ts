import test from "node:test";
import assert from "node:assert/strict";
import {
  clubParts,
  effectiveClubNow,
  getDemoDate,
  getDemoTime,
  setDemoDate,
  todayClub,
} from "../../src/shared/lib/demo-clock.ts";

test("demo date and time use one club clock and reset together", () => {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent() {} },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  try {
    setDemoDate("2026-11-29", "15:30");
    assert.equal(todayClub(), "2026-11-29");
    assert.equal(getDemoTime(), "15:30");
    assert.equal(effectiveClubNow().toISOString(), "2026-11-29T08:30:00.000Z");
    setDemoDate("2026-11-30");
    assert.equal(getDemoTime(), null);
    assert.equal(
      clubParts(effectiveClubNow().toISOString()).date,
      "2026-11-30",
    );
    setDemoDate("2026-11-29", "24:00");
    assert.equal(getDemoTime(), null);
    setDemoDate(null);
    assert.equal(getDemoDate(), null);
    assert.equal(getDemoTime(), null);
    assert.ok(Math.abs(+effectiveClubNow() - Date.now()) < 1000);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete (globalThis as any).window;
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else delete (globalThis as any).localStorage;
  }
});
