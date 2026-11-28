import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { Card } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { formatCurrency } from "@/shared/lib/format";
import { tr } from "@/shared/i18n/tr";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { INTENSITY_LABEL, isHeavy } from "../types";
import type { ExerciseIntensity, ExerciseSession, PlanCost, TrainingPlan } from "../types";
import styles from "./PlanSummaryCard.module.css";

interface Props {
  plan: TrainingPlan & { cost?: PlanCost; horseDob?: string | null };
  sessions: ExerciseSession[];
}

const DAY = 86_400_000;

/** Tuổi (năm) và lời khuyên theo tuổi / tỉ lệ buổi nặng / tình trạng y tế. */
export function planAdvice(ageYears: number | null, heavyShare: number, horseStatus?: string, forOwner = true): string[] {
  const out: string[] = [];
  if (ageYears != null && ageYears < 3 && heavyShare > 0.25) {
    out.push("Young horse (under 3): keep heavy workouts to about 1 in 4 to protect growing joints.");
  }
  if (ageYears != null && ageYears >= 12 && heavyShare > 0.3) {
    out.push("Older horse (12+): more recovery and lighter work is usually safer.");
  }
  if (heavyShare > 0.5) {
    out.push(
      forOwner
        ? "More than half of the workouts are heavy. Ask the trainer how rest days are planned."
        : "More than half of the workouts are heavy. Check that there are enough rest or light days between them.",
    );
  }
  if (horseStatus && ["UNDER_OBSERVATION", "INJURED", "ISOLATED"].includes(horseStatus)) {
    out.push("The horse is under medical care. Heavy work waits for the veterinarian's clearance.");
  }
  return out;
}

/** needFix #8: chủ ngựa thấy giáo án gồm gì, có hợp với ngựa không, tốn bao nhiêu. */
export function PlanSummaryCard({ plan, sessions }: Props) {
  const live = sessions.filter((s) => s.status !== "CANCELLED");
  const weeks = Math.max(1, Math.round((Date.parse(plan.endDate) - Date.parse(plan.startDate) + DAY) / (7 * DAY)));
  const heavy = live.filter((s) => isHeavy(s.sessionType, s.intensity)).length;
  const heavyShare = live.length ? heavy / live.length : 0;
  const byIntensity = (["LIGHT", "MEDIUM", "HEAVY"] as ExerciseIntensity[]).map((k) => ({
    k,
    count: live.filter((s) => s.intensity === k).length,
  }));
  const ageYears = plan.horseDob ? Math.floor((effectiveClubNow().getTime() - Date.parse(plan.horseDob)) / (365.25 * DAY)) : null;
  // Chủ ngựa: "nên trao đổi với HLV"; HLV (người soạn) / staff: tự kiểm tra khối lượng.
  const forOwner = useCurrentUser().role === "HORSE_OWNER";
  const advice = planAdvice(ageYears, heavyShare, plan.horseStatus, forOwner);

  return (
    <Card title={tr("Plan at a glance")} subtitle={tr("What the plan includes, whether it suits the horse, and what it costs.")}>
      <dl className={styles.grid}>
        <div>
          <dt>{tr("Length")}</dt>
          <dd>{tr("{{weeks}} weeks · {{phases}} phases", { weeks: String(weeks), phases: String(plan.phases.length) })}</dd>
        </div>
        <div>
          <dt>{tr("Workouts")}</dt>
          <dd>{tr("{{count}} planned · about {{perWeek}} a week", { count: String(live.length), perWeek: (live.length / weeks).toFixed(1) })}</dd>
        </div>
        <div>
          <dt>{tr("Intensity")}</dt>
          <dd className={styles.mix}>
            {byIntensity.map(({ k, count }) => (
              <span key={k} className={styles[k.toLowerCase()]}>{tr(INTENSITY_LABEL[k])} {count}</span>
            ))}
          </dd>
        </div>
        <div>
          <dt>{tr("Estimated training fee")}</dt>
          <dd>
            {plan.cost ? (
              <>
                <strong>{formatCurrency(plan.cost.estimatedTrainingFee)} VND</strong>
                <span className={styles.note}>
                  {tr("{{months}} month(s) × {{rate}} VND, billed on the monthly statement", {
                    months: String(plan.cost.billedMonths),
                    rate: formatCurrency(plan.cost.monthlyTrainingRate),
                  })}
                </span>
              </>
            ) : "—"}
          </dd>
        </div>
        <div>
          <dt>{tr("Horse")}</dt>
          <dd>{ageYears == null ? plan.horseName : tr("{{name}}, {{age}} years old", { name: plan.horseName, age: String(ageYears) })}</dd>
        </div>
      </dl>
      {advice.length > 0 ? (
        <Alert tone="warn" title={tr(forOwner ? "Points to discuss with the trainer" : "Workload check")}>
          <ul className={styles.advice}>{advice.map((a) => <li key={a}>{tr(a)}</li>)}</ul>
        </Alert>
      ) : (
        live.length > 0 && <p className={styles.ok}>{tr("The workload looks suitable for the horse's age and health.")}</p>
      )}
    </Card>
  );
}
