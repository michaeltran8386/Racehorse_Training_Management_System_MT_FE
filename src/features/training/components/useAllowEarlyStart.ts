import { useEffect, useState } from "react";
import { trainingApi } from "../api";

let cached: Promise<boolean> | null = null;

/**
 * Cờ dev SIMULATOR_ALLOW_EARLY của BE (BE là nguồn duy nhất).
 * Mặc định false = nghiệp vụ chặt: chưa tới giờ thì không mô phỏng, không ghi kết quả.
 */
export function useAllowEarlyStart(enabled: boolean): boolean {
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    cached ??= trainingApi
      .getSimulatorConfig()
      .then((c) => c.allowEarlyStart === true)
      .catch(() => {
        cached = null;
        return false;
      });
    let alive = true;
    void cached.then((v) => {
      if (alive) setAllow(v);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return enabled && allow;
}
