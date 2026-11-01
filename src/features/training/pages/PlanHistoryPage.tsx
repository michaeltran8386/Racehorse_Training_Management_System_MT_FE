import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./TrainingActivity.module.css";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import type { TrainingPlan } from "../types";

import { tr } from "@/shared/i18n/tr";
/** Lịch sử giáo án: các giáo án Hoàn thành / Đã hủy (dữ liệu thật, không còn danh sách viết cứng). */
export default function PlanHistoryPage() {
  useScreenTranslation();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [horseId, setHorseId] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [done, cancelled] = await Promise.all([trainingApi.getPlans({ status: "COMPLETED" }), trainingApi.getPlans({ status: "CANCELLED" })]);
      setPlans([...done, ...cancelled].sort((a, b) => b.endDate.localeCompare(a.endDate)));
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const horses = [...new Map(plans.map((p) => [p.horseId, p.horseName])).entries()];
  const shown = plans.filter((p) => horseId === "ALL" || p.horseId === horseId);

  return (
    <div className={styles.page}>
      <PageHeader title="Plan History" description="Completed and cancelled training plans with the trainer's summary or reason." action={<LinkButton to="/training/plans" tone="secondary" icon="arrowLeft">{tr("Training plans")}</LinkButton>} />

      <Card pad={16}>
        <div className={styles.filter}>
          <span style={{ fontWeight: 600, fontSize: "var(--fs-body)" }}>{tr("Horse:")}</span>
          <div className={styles.selector}>
            <SearchSelect
              aria-label={tr("Horse:")}
              value={horseId}
              onChange={setHorseId}
              options={[{ value: "ALL", label: "All horses" }, ...horses.map(([id, name]) => ({ value: id, label: name }))]}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>{tr("Loading history...")}</div>
      ) : error ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => void load()}>{tr("Try again")}</Button>}>{error}</Alert>
      ) : shown.length === 0 ? (
        <EmptyState title={tr("No finished plans yet")} description={tr("Completed or cancelled plans appear here.")} />
      ) : (
        shown.map((p) => (
          <Card key={p.id} pad={20}>
            <div className={styles.cardHeading}>
              <strong className={styles.cardTitle}>{p.name}</strong>
              <Badge tone="neutral">{p.planCode}</Badge>
              <Badge tone={p.status === "COMPLETED" ? "ok" : "danger"}>{p.status === "COMPLETED" ? tr("Completed") : tr("Cancelled")}</Badge>
            </div>
            <div className={styles.metadata}>
              {tr("Horse:")}{" "}<strong>{p.horseName}</strong> · {p.startDate} → {p.endDate} · {p.workoutCount} {tr("workout(s)")}
            </div>
            {(p.completionSummary || p.cancelledReason) && (
              <div className={styles.note}>
                <strong>{p.status === "COMPLETED" ? tr("Summary:") : tr("Reason:")}</strong> {p.completionSummary || p.cancelledReason}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
