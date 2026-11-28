import { effectiveClubNow } from "@/shared/lib/demo-clock";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { formatDate } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { tr } from "@/shared/i18n/tr";
import { trainingApi } from "../api";
import { Stars } from "../components/TrainerReviewCard";
import type { TrainerReviewItem, TrainerReviewSummary } from "../types";
import { PLAN_STATUS_LABEL, PLAN_STATUS_TONE } from "../types";
import { Badge } from "@/shared/components/ui/Badge";
import styles from "./TrainerReviewsPage.module.css";

const DAY = 86_400_000;

/** Đánh giá HLV từ chủ ngựa: CM xem mọi HLV, HLV xem của mình. */
export default function TrainerReviewsPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const isManager = user.role === "CLUB_MANAGER";
  const [data, setData] = useState<{ trainers: TrainerReviewSummary[]; items: TrainerReviewItem[] } | null>(null);
  const [error, setError] = useState("");
  const [trainerFilter, setTrainerFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [lowOnly, setLowOnly] = useState(false);

  async function load() {
    setError("");
    try {
      setData(await trainingApi.getTrainerReviews());
    } catch (err) {
      setError(messageFor(err));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const trainers = data?.trainers ?? [];
  const items = data?.items ?? [];
  const [horseFilter, setHorseFilter] = useState("ALL");
  const shown = items.filter(
    (r) =>
      (trainerFilter === "ALL" || r.trainer.id === trainerFilter) &&
      (horseFilter === "ALL" || r.trainingPlan.horse.id === horseFilter) &&
      (!ratingFilter || r.rating === ratingFilter) && (!lowOnly || r.rating <= 2),
  );
  const byTrainer = trainerFilter === "ALL" ? items : items.filter((r) => r.trainer.id === trainerFilter);
  const scope = horseFilter === "ALL" ? byTrainer : byTrainer.filter((r) => r.trainingPlan.horse.id === horseFilter);
  // HLV: BE trả đúng 1 dòng tổng hợp là chính mình.
  const me = isManager ? undefined : trainers[0];
  const reviewedPlans = new Set(byTrainer.map((r) => r.trainingPlan.id)).size;
  const reviewablePlans = me ? me.activePlans + me.completedPlans : 0;
  const now = effectiveClubNow().getTime();
  const recent = scope.filter((r) => {
    const age = now - Date.parse(r.updatedAt);
    return age >= 0 && age <= 30 * DAY;
  });
  const recentAvg = recent.length ? recent.reduce((t, r) => t + r.rating, 0) / recent.length : null;
  // Theo ngựa: số giáo án được chấm, số đánh giá, điểm TB, lần chấm gần nhất.
  const horses = Array.from(
    byTrainer.reduce((m, r) => {
      const h = r.trainingPlan.horse;
      const row = m.get(h.id) ?? { horse: h, plans: new Set<string>(), sum: 0, count: 0, low: 0, last: "" };
      row.plans.add(r.trainingPlan.id);
      row.sum += r.rating;
      row.count += 1;
      if (r.rating <= 2) row.low += 1;
      if (r.updatedAt > row.last) row.last = r.updatedAt;
      return m.set(h.id, row);
    }, new Map<string, { horse: TrainerReviewItem["trainingPlan"]["horse"]; plans: Set<string>; sum: number; count: number; low: number; last: string }>()).values(),
  ).sort((a, b) => a.sum / a.count - b.sum / b.count);
  const avg = scope.length ? Math.round((10 * scope.reduce((t, r) => t + r.rating, 0)) / scope.length) / 10 : null;
  const low = scope.filter((r) => r.rating <= 2).length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: scope.filter((r) => r.rating === n).length }));
  const limited = trainers.reduce((sum, t) => sum + t.reviewCount, 0) > items.length;

  return (
    <div className={styles.page}>
      <PageHeader
        title={isManager ? tr("Trainer reviews") : tr("My reviews")}
        description={isManager
          ? tr("Ratings and comments from horse owners, per training plan.")
          : tr("What horse owners say about your training plans.")}
      />

      {error && (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>}>
          {error}
        </Alert>
      )}

      {limited && <Alert tone="info">{tr("Review statistics cover the latest loaded reviews. Plan totals cover all your plans.")}</Alert>}

      <div className={styles.metrics}>
        <KpiTile label={tr("Average rating")} value={avg == null ? "—" : avg.toFixed(1)} unit="/ 5" caption={avg == null ? tr("No reviews yet") : undefined} />
        <KpiTile label={tr("Reviews")} value={String(scope.length)} caption={tr("From horse owners")} />
        <KpiTile
          label={tr("Low ratings (1–2★)")}
          value={String(low)}
          accent={low > 0}
          caption={low > 0 ? tr("Click to read them") : tr("None")}
          onClick={low > 0 ? () => { setLowOnly((value) => !value); setRatingFilter(0); } : undefined}
          active={lowOnly}
        />
        <KpiTile
          label={tr("Last 30 days")}
          value={recentAvg == null ? "—" : recentAvg.toFixed(1)}
          unit={recentAvg == null ? undefined : "/ 5"}
          caption={tr("{{count}} review(s) in the last 30 days", { count: recent.length })}
        />
      </div>

      <div className={styles.summary}>
        {me && <div className={styles.planStats} aria-label={tr("All your training plans")}>
          <KpiTile label={tr("Active plans")} value={String(me.activePlans)} caption={tr("Owners can review these now")} />
          <KpiTile label={tr("Completed plans")} value={String(me.completedPlans)} />
          <KpiTile
            label={tr("Plans reviewed")}
            value={`${reviewedPlans} / ${reviewablePlans}`}
            caption={limited ? tr("Based on loaded reviews") : reviewablePlans ? tr("{{pct}}% of your plans have a review", { pct: Math.round((100 * reviewedPlans) / reviewablePlans) }) : tr("No plans yet")}
          />
        </div>}
        <Card title={tr("Rating spread")} pad={16}>
          <ul className={styles.dist}>
            {dist.map(({ n, count }) => (
              <li key={n}>
                <button type="button" className={ratingFilter === n ? styles.distActive : styles.distBtn} onClick={() => { setLowOnly(false); setRatingFilter((f) => (f === n ? 0 : n)); }} aria-pressed={ratingFilter === n}>
                  <span>{n}★</span>
                  <span className={styles.bar}><i style={{ width: scope.length ? `${(100 * count) / scope.length}%` : 0 }} /></span>
                  <span>{count}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {isManager && (
        <Card title={tr("Trainers")} subtitle={tr("Click a trainer to see only their reviews.")} pad={0}>
          {!data ? (
            <SkeletonTable columns={5} rows={4} />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{tr("Trainer")}</th>
                    <th className={styles.num}>{tr("Active plans")}</th>
                    <th className={styles.num}>{tr("Completed plans")}</th>
                    <th>{tr("Rating")}</th>
                    <th className={styles.num}>{tr("Reviews")}</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((t) => (
                    <tr
                      key={t.id}
                      className={trainerFilter === t.id ? styles.selected : styles.clickRow}
                      onClick={() => setTrainerFilter((f) => (f === t.id ? "ALL" : t.id))}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTrainerFilter((f) => (f === t.id ? "ALL" : t.id)); } }}
                      aria-selected={trainerFilter === t.id}
                    >
                      <td>
                        <strong>{t.fullName}</strong>
                        <span className={styles.sub}>{t.email}</span>
                      </td>
                      <td className={styles.num}>{t.activePlans}</td>
                      <td className={styles.num}>{t.completedPlans}</td>
                      <td>{t.avgRating == null ? <span className={styles.sub}>{tr("No reviews yet")}</span> : <span className={styles.rating}><Stars value={t.avgRating} size="sm" /> {t.avgRating.toFixed(1)}</span>}</td>
                      <td className={styles.num}>{t.reviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {horses.length > 0 && (
        <Card title={tr("Reviews by horse")} subtitle={tr("Lowest average first. Click a horse to see only its reviews.")} pad={0}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{tr("Horse")}</th>
                  <th className={styles.num}>{tr("Plans reviewed")}</th>
                  <th className={styles.num}>{tr("Reviews")}</th>
                  <th>{tr("Average rating")}</th>
                  <th className={styles.num}>{tr("Low ratings (1–2★)")}</th>
                  <th>{tr("Latest review")}</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((h) => {
                  const toggle = () => setHorseFilter((f) => (f === h.horse.id ? "ALL" : h.horse.id));
                  const avgH = h.sum / h.count;
                  return (
                    <tr
                      key={h.horse.id}
                      className={horseFilter === h.horse.id ? styles.selected : styles.clickRow}
                      onClick={toggle}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
                      aria-selected={horseFilter === h.horse.id}
                    >
                      <td style={{ whiteSpace: "nowrap" }}><strong>{h.horse.name}</strong></td>
                      <td className={styles.num}>{h.plans.size}</td>
                      <td className={styles.num}>{h.count}</td>
                      <td><span className={styles.rating}><Stars value={avgH} size="sm" /> {avgH.toFixed(1)}</span></td>
                      <td className={styles.num}>{h.low}</td>
                      <td>{formatDate(h.last)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card
        title={tr("Latest reviews")}
        subtitle={trainerFilter !== "ALL" || horseFilter !== "ALL" || ratingFilter || lowOnly ? tr("{{count}} review(s) match the filter", { count: shown.length }) : undefined}
        action={trainerFilter !== "ALL" || horseFilter !== "ALL" || ratingFilter || lowOnly ? <Button size="sm" tone="secondary" onClick={() => { setTrainerFilter("ALL"); setHorseFilter("ALL"); setRatingFilter(0); setLowOnly(false); }}>{tr("Clear filters")}</Button> : undefined}
      >
        {!data ? (
          <SkeletonTable columns={3} rows={3} />
        ) : shown.length === 0 ? (
          <EmptyState
            title={tr("No reviews yet")}
            description={tr("Horse owners can rate the trainer on any active or completed training plan.")}
          />
        ) : (
          <ul className={styles.list}>
            {shown.map((r) => (
              <li key={r.id} className={r.rating <= 2 ? styles.itemLow : styles.item}>
                <div className={styles.itemHead}>
                  <Stars value={r.rating} size="sm" />
                  <span className={styles.sub}>
                    {r.owner.fullName} · <Link to={`/training/plans/${r.trainingPlan.id}`}>{r.trainingPlan.planCode ?? r.trainingPlan.phaseName}</Link> · {r.trainingPlan.horse.name}
                    {isManager && <> · {tr("Trainer")}: {r.trainer.fullName}</>}
                  </span>
                  <span className={styles.date}>
                    {formatDate(r.updatedAt)}
                    {Date.parse(r.updatedAt) - Date.parse(r.createdAt) > 60_000 && <> · {tr("Edited")}</>}
                  </span>
                </div>
                <div className={styles.planLine}>
                  <Badge tone={PLAN_STATUS_TONE[r.trainingPlan.status]}>{tr(PLAN_STATUS_LABEL[r.trainingPlan.status] ?? r.trainingPlan.status)}</Badge>
                  <span className={styles.sub}>
                    {r.trainingPlan.phaseName}
                    {r.trainingPlan.startDate && r.trainingPlan.endDate && <> · {formatDate(r.trainingPlan.startDate)} – {formatDate(r.trainingPlan.endDate)}</>}
                  </span>
                </div>
                {r.comment ? <p className={styles.comment}>{r.comment}</p> : <p className={styles.sub}>{tr("No comment.")}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
