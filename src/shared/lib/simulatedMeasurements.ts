// Số liệu giả lập khi chưa chạy Simulator: Web vẫn đi hết quy trình, người dùng sửa được trước khi lưu.
type Intensity = "LIGHT" | "MEDIUM" | "HEAVY";

const between = (min: number, max: number, rand: () => number) => min + (max - min) * rand();
const round1 = (n: number) => Math.round(n * 10) / 10;

const PEAK_HR: Record<Intensity, [number, number]> = { LIGHT: [115, 128], MEDIUM: [138, 152], HEAVY: [162, 174] };
// Tốc độ dùng khi bài tập không ghi tốc độ mục tiêu (km/h).
const DEFAULT_SPEED: Record<Intensity, number> = { LIGHT: 30, MEDIUM: 42, HEAVY: 54 };

export function simulatedWorkoutDraft(
  s: { targetDistanceMeters: number; repetitions: number; targetSpeedKmh?: number | null; intensity: Intensity },
  rand: () => number = Math.random,
) {
  const distance = s.targetDistanceMeters * Math.max(1, s.repetitions);
  const speed = s.targetSpeedKmh && s.targetSpeedKmh > 0 ? s.targetSpeedKmh : DEFAULT_SPEED[s.intensity];
  const jitter = between(1, 2, rand) * (rand() < 0.5 ? -1 : 1);
  const seconds = Math.max(5, round1(distance / (speed / 3.6) + jitter));
  const [lo, hi] = PEAK_HR[s.intensity];
  return {
    actualDistanceMeters: distance,
    actualTimeSeconds: seconds,
    heartRatePeak: Math.round(between(lo, hi, rand)),
    topSpeedKmh: round1(((distance / seconds) * 3.6) * between(1.05, 1.12, rand)),
  };
}

/** Sinh hiệu bình thường của ngựa trưởng thành (trong ngưỡng tham chiếu của form y tế). */
export function simulatedExamVitals(rand: () => number = Math.random) {
  return {
    temperature: round1(between(37.4, 38.3, rand)),
    restingHeartRate: Math.round(between(30, 40, rand)),
    respiratoryRate: Math.round(between(10, 16, rand)),
  };
}
