/**
 * Bảng thẩm định 4 tiêu chí Sẵn sàng thi đấu (Pre-Competition Readiness Assessment)
 * Dành cho Huấn luyện viên trưởng thẩm định chiến mã trực quan.
 */

import { tr } from "@/shared/i18n/tr";

export interface ReadinessCriteria {
  healthOk: boolean;
  healthDetails: string;
  planOk: boolean;
  planDetails: string;
  scoreOk: boolean;
  scoreDetails: string;
  loadOk: boolean;
  loadDetails: string;
  isEligible: boolean;
  passedCount: number;
}

export function evaluateReadiness(row: {
  horse: { isMedicalLocked?: boolean; status?: string; isDebtImpounded?: boolean };
  plan?: { status?: string; name?: string } | null;
  progress?: { completed?: number; total?: number; due?: number } | null;
  latestScore?: number | null;
  loadSpike?: boolean;
}): ReadinessCriteria {
  const h = row.horse;
  // 1. Tiêu chí Y tế: Không khóa y tế, không bệnh tật, không nợ phí
  const isMedicalUnfit = Boolean(h.isMedicalLocked) || ["INJURED", "ISOLATED", "UNDER_OBSERVATION"].includes(h.status ?? "");
  const isDebt = Boolean(h.isDebtImpounded);
  const healthOk = !isMedicalUnfit && !isDebt && h.status !== "RETIRED";
  const healthDetails = healthOk
    ? tr("Clear health status, no medical restrictions")
    : h.isMedicalLocked
      ? tr("Active Veterinary Training Lock")
      : isDebt
        ? tr("Impounded for unpaid care fees")
        : tr("Health status is not cleared ({{status}})", { status: tr(h.status ?? "") });

  // 2. Tiêu chí Giáo án: Có giáo án và tiến độ >= 80%
  const total = row.progress?.total || row.progress?.due || 0;
  const completed = row.progress?.completed || 0;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const planOk = Boolean(row.plan) && (pct >= 80 || completed >= 8);
  const planDetails = row.plan
    ? tr("Completed {{completed}}/{{total}} workouts ({{pct}}%)", { completed, total, pct: Math.round(pct) })
    : tr("No training plan yet");

  // 3. Tiêu chí Điểm số phong độ chạy thử: Điểm >= 7.0
  const score = row.latestScore ?? null;
  const scoreOk = score !== null && score >= 7.0;
  const scoreDetails = score !== null
    ? tr("Latest score: {{score}} / 10 {{status}}", {
        score: score.toFixed(1),
        status: score >= 7.0 ? tr("(Pass)") : tr("(Below 7.0)"),
      })
    : tr("No speed evaluation trial run yet");

  // 4. Tiêu chí Tải trọng 7 ngày: Không quá tải
  const loadOk = !row.loadSpike;
  const loadDetails = loadOk
    ? tr("7-day workload is within safe limits")
    : tr("Sudden workload spike exceeding 130% safe ceiling");

  const passedCount = (healthOk ? 1 : 0) + (planOk ? 1 : 0) + (scoreOk ? 1 : 0) + (loadOk ? 1 : 0);
  const isEligible = passedCount === 4;

  return {
    healthOk,
    healthDetails,
    planOk,
    planDetails,
    scoreOk,
    scoreDetails,
    loadOk,
    loadDetails,
    isEligible,
    passedCount,
  };
}
