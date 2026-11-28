import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDemoClockState,
  clubParts,
  effectiveClubNow,
  getDemoDate,
  getDemoTime,
  todayClub,
} from "../../src/shared/lib/demo-clock.ts";

test("server clock runs across midnight, restores snapshots and resets to real time", () => {
  const storage = new Map<string, string>();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const realNow = Date.now;
  let wall = Date.parse("2026-11-28T00:00:00Z");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dispatchEvent() {} },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
  });
  Date.now = () => wall;
  try {
    storage.set("equiflow_demo_date", "2020-01-01");
    applyDemoClockState({
      serverNow: "2026-11-29T16:59:59Z",
      realNow: new Date(wall).toISOString(),
      simulated: true,
      revision: "1",
    });
    assert.equal(getDemoTime(), "23:59");
    wall += 2000;
    assert.equal(todayClub(), "2026-11-30");
    assert.equal(getDemoDate(), "2026-11-30");
    assert.equal(effectiveClubNow().toISOString(), "2026-11-29T17:00:01.000Z");
    assert.equal(clubParts(effectiveClubNow().toISOString()).time, "00:00");
    assert.equal(storage.has("equiflow_demo_date"), false);
    applyDemoClockState({
      serverNow: new Date(wall).toISOString(),
      realNow: new Date(wall).toISOString(),
      simulated: false,
      revision: "2",
    });
    wall += 3000;
    assert.equal(+effectiveClubNow(), wall);
    assert.equal(getDemoDate(), null);
    assert.equal(getDemoTime(), null);
    assert.throws(() =>
      applyDemoClockState({
        serverNow: "invalid",
        realNow: "",
        simulated: true,
        revision: "3",
      }),
    );
  } finally {
    Date.now = realNow;
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete (globalThis as any).window;
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else delete (globalThis as any).localStorage;
  }
});
