import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonCards } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { getHealthBoard } from "../api";
import type { HealthBoardHorse, HealthBoardResponse } from "../api";
import styles from "./HealthReportPage.module.css";

const GROUP_LABEL: Record<HealthBoardHorse["healthGroup"], string> = {
  QUALIFIED: "Fit to work", OBSERVATION: "Under observation", INJURED: "Injured", ISOLATED: "Isolated",
};
const PAGE_SIZE = 10;

export default function HealthReportPage() {
  useTranslation();
  const [board, setBoard] = useState<HealthBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getHealthBoard().then((data) => { if (active) setBoard(data); })
      .catch((err) => { if (active) setError(messageFor(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const rows = (board?.data ?? []).filter((horse) => filter === "ALL" || horse.healthGroup === filter);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const s = board?.summary;
  return (
    <div className={styles.page}>
      <PageHeader title={tr("Health Reports")} description={tr("Current herd health snapshot, based on the latest recorded information.")} action={<LinkButton to="/herd" tone="secondary">{tr("Herd health")}</LinkButton>} />
      {loading ? <SkeletonCards count={4} /> : error ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{error}</Alert>
      ) : s && (
        <>
          {board.generatedAt && <p className={styles.timestamp}>{tr("Recorded at:")} {formatDateTime(board.generatedAt)}</p>}
          <div className={styles.metrics}>
            <KpiTile label={tr("Fit to work")} value={s.qualifiedCount} />
            <KpiTile label={tr("Under observation")} value={s.observationCount} />
            <KpiTile label={tr("Injured")} value={s.injuredCount} />
            <KpiTile label={tr("Isolated")} value={s.isolatedCount} />
            <KpiTile label={tr("Training Lock")} value={s.lockedCount} />
            <KpiTile label={tr("Preventive care overdue")} value={s.overdueCount} />
          </div>
          <Card pad={20}>
            <div className={styles.toolbar}>
              <h2>{tr("Herd health")}</h2>
              <label htmlFor="health-report-group">{tr("Status")}</label>
              <select id="health-report-group" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>
                <option value="ALL">{tr("All")}</option>
                {Object.entries(GROUP_LABEL).map(([value, label]) => <option key={value} value={value}>{tr(label)}</option>)}
              </select>
            </div>
            {rows.length === 0 ? <EmptyState title={tr(filter === "ALL" ? "No horses yet." : "No horse matches the filters.")} action={filter !== "ALL" ? <Button tone="secondary" onClick={() => { setFilter("ALL"); setPage(1); }}>{tr("Clear filters")}</Button> : undefined} /> : (
              <div className={styles.scroll}><table className={styles.table}>
                <caption className="sr-only">{tr("Health Reports")}</caption>
                <thead><tr>{["Horse", "Status", "Training Lock", "Open injuries", "Last exam", "Preventive care overdue"].map((label) => <th key={label} scope="col">{tr(label)}</th>)}</tr></thead>
                <tbody>{visible.map((horse) => <tr key={horse.id}>
                  <td><Link to={`/medical/horses/${horse.id}`}>{horse.name}</Link><br /><span className={styles.code}>{horse.horseCode || "—"}</span></td>
                  <td>{tr(GROUP_LABEL[horse.healthGroup])}</td>
                  <td><Badge tone={horse.isMedicalLocked ? "danger" : "neutral"}>{tr(horse.isMedicalLocked ? "Active" : "Not locked")}</Badge></td>
                  <td>{horse.openInjuries.length}</td><td>{horse.latestRecord ? formatDate(horse.latestRecord.examinationDate) : "—"}</td>
                  <td>{tr(horse.hasOverduePreventive ? "Yes" : "No")}</td>
                </tr>)}</tbody>
              </table></div>
            )}
            {rows.length > PAGE_SIZE && <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} noun="horses" onPage={setPage} />}
          </Card>
        </>
      )}
    </div>
  );
}
