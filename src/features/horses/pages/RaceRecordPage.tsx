import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Alert } from "@/shared/components/ui/Alert";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { formatDate } from "@/shared/lib/format";
import { messageFor } from "@/shared/lib/messages";
import { useAppLanguage } from "@/shared/lib/language";
import { fetchTournamentDetail, fetchTournaments } from "@/features/racing/api";
import type { Tournament } from "@/features/racing/types";
import styles from "./RaceRecordPage.module.css";

const PAGE_SIZE = 10;
export default function RaceRecordPage() {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const locale = isVietnamese ? "vi-VN" : "en-US";
  const [events, setEvents] = useState<Tournament[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [retry, setRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setSelected(""); setDetail(null);
    fetchTournaments({ status: "COMPLETED", page, limit: PAGE_SIZE }).then((data) => {
      if (active) {
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
        else { setEvents(data.items); setTotal(data.total); }
      }
    }).catch((err) => { if (active) setError(messageFor(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setDetail(null); setDetailLoading(true); setDetailError("");
    fetchTournamentDetail(selected).then((data) => { if (active) setDetail(data); })
      .catch((err) => { if (active) setDetailError(messageFor(err)); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected, detailRetry]);

  const results = (detail?.registrations ?? []).filter((registration) => registration.result);
  return <div className={styles.page}>
    <PageHeader title={tr("Race Record")} description={tr("Select a completed event to view results for your horses.")} action={<LinkButton to="/races" tone="secondary">{tr("Race Entries")}</LinkButton>} />
    {loading ? <SkeletonTable columns={4} rows={5} /> : error ? <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{error}</Alert> : events.length === 0 ? <Card pad={32}><EmptyState title={tr("No Completed Tournaments Yet")} /></Card> :
      <div className={styles.layout}>
        <Card pad={20}><h2 className={styles.heading}>{tr("Completed events")}</h2>
          <div className={styles.events}>{events.map((event) => <button type="button" key={event.id} className={styles.event} aria-pressed={selected === event.id} onClick={() => setSelected(event.id)}><strong>{event.name}</strong><span>{formatDate(event.raceDate)} · {event.location}</span></button>)}</div>
          {total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="events" onPage={setPage} />}
        </Card>
        <Card pad={20}>{!selected ? <EmptyState title={tr("Select a completed event")} description={tr("Choose an event to see results for your horses.")} /> : detailLoading ? <SkeletonTable columns={4} rows={3} /> : detailError ? <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setDetailRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{detailError}</Alert> : detail && <>
          <h2 className={styles.heading}>{detail.name}</h2><p className={styles.meta}>{formatDate(detail.raceDate)} · {detail.location} · {detail.distanceMeters} m</p>
          {results.length === 0 ? <EmptyState title={tr("No results for your horses in this event.")} /> : <div className={styles.scroll}><table className={styles.table}>
            <caption className="sr-only">{tr("Your horses' results")}</caption>
            <thead><tr>{["Horse", "Rank", "Finish time", "Prize money"].map((label) => <th key={label} scope="col">{tr(label)}</th>)}</tr></thead>
            <tbody>{results.map((entry) => <tr key={entry.id}><td><strong>{entry.horse.name}</strong><br /><span>{entry.horse.horseCode || "—"}</span></td><td>{entry.result!.finalRank}</td><td>{entry.result!.finishTimeSeconds} s</td><td>{entry.result!.prizeMoneyWon.toLocaleString(locale)} đ</td></tr>)}</tbody>
          </table></div>}
        </>}</Card>
      </div>}
  </div>;
}
