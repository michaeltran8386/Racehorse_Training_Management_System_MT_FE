import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Input } from "@/shared/components/form/Input";
import { Alert } from "@/shared/components/ui/Alert";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonCards } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { trainingApi } from "../api";
import type { TrainingOverview } from "../types";
import styles from "./PerformanceReportPage.module.css";

const PAGE_SIZE = 10;
export default function PerformanceReportPage() {
  useTranslation();
  const [data, setData] = useState<TrainingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    trainingApi.getOverview().then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(messageFor(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const query = search.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((row) => row.horse.name.toLowerCase().includes(query) || (row.horse.horseCode ?? "").toLowerCase().includes(query));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const k = data?.kpis;
  return <div className={styles.page}>
    <PageHeader title={tr("Performance")} description={tr("Current training progress and recorded performance for managed horses.")} action={<LinkButton to="/training" tone="secondary">{tr("Training Overview")}</LinkButton>} />
    {loading ? <SkeletonCards count={4} /> : error ? <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{error}</Alert> : k && <>
      <div className={styles.metrics}>
        <KpiTile label={tr("Active plans")} value={`${k.activePlans} / ${k.managedHorses}`} caption={tr("horses managed")} />
        <KpiTile label={tr("Workouts today")} value={`${k.todayCompleted} / ${k.todayTotal}`} caption={tr("completed")} />
        <KpiTile label={tr("Blocked by Training Lock")} value={k.blockedNext7Days} caption={tr("in the next 7 days")} />
        <KpiTile label={tr("Sudden load increase")} value={k.loadSpikeHorses} caption={tr("horses above 130% of their 4-week average")} />
      </div>
      <Card pad={20}>
        <div className={styles.toolbar}><h2>{tr("Horse performance")}</h2><div className={styles.search}><Input icon="search" aria-label={tr("Horse name or code")} placeholder={tr("Horse name or code")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div></div>
        {rows.length === 0 ? <EmptyState title={tr(query ? "No horses match the filter." : "No horses to follow yet.")} /> : <div className={styles.scroll}><table className={styles.table}>
          <caption className="sr-only">{tr("Horse performance")}</caption>
          <thead><tr>{["Horse", "Current plan", "Progress", "Latest score", "7-day load", ""].map((label, index) => <th key={index} scope="col">{tr(label)}</th>)}</tr></thead>
          <tbody>{visible.map((row) => <tr key={row.horse.id}><td><Link to={`/horses/${row.horse.id}`}>{row.horse.name}</Link><br /><span>{row.horse.horseCode || "—"}</span></td><td>{row.plan?.name || "—"}</td><td>{row.progress?.due ? `${row.progress.completed} / ${row.progress.due}` : "—"}</td><td>{row.latestScore != null ? `${row.latestScore} / 10` : "—"}</td><td>{row.load7d}</td><td><Link to={`/horses/${row.horse.id}/fitness`}>{tr("Fitness")}</Link></td></tr>)}</tbody>
        </table></div>}
        {rows.length > PAGE_SIZE && <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} noun="horses" onPage={setPage} />}
      </Card>
    </>}
  </div>;
}
