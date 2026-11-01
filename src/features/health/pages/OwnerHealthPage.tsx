import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { HealthBadge } from "@/shared/components/ui/HealthBadge";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonCards } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { getHorses } from "@/features/horses/api";
import type { Horse } from "@/features/horses/types";
import styles from "./OwnerHealthPage.module.css";

const PAGE_SIZE = 10;

export default function OwnerHealthPage() {
  useTranslation();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getHorses({ page, limit: PAGE_SIZE }).then((data) => {
      if (active) {
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
        else { setHorses(data.items); setTotal(data.total); }
      }
    }).catch((err) => {
      if (active) setError(messageFor(err));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, retry]);

  return (
    <div className={styles.page}>
      <PageHeader title={tr("Health Status")} description={tr("Review the recorded status and medical profile of your horses.")} action={<LinkButton to="/my-horses" tone="secondary">{tr("My Horses")}</LinkButton>} />
      {loading ? <SkeletonCards count={4} /> : error ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{error}</Alert>
      ) : horses.length === 0 ? (
        <Card pad={32}><EmptyState title={tr("No horses yet.")} description={tr("Your horses will appear here when they are assigned to you.")} /></Card>
      ) : (
        <>
          <div className={styles.grid}>
            {horses.map((horse) => <article className={styles.horse} key={horse.id}>
              <div className={styles.head}><div><span className={styles.code}>{horse.horseCode || "—"}</span><h2>{horse.name}</h2></div><HealthBadge status={horse.status} /></div>
              <div className={styles.details}><span>{tr("Breed:")} <strong>{horse.breed || "—"}</strong></span><span>{tr("Training Lock")} <Badge tone={horse.isMedicalLocked ? "danger" : "neutral"}>{tr(horse.isMedicalLocked ? "Active" : "Not locked")}</Badge></span></div>
              <LinkButton to={`/medical/horses/${horse.id}`} tone="secondary">{tr("Open medical profile")}</LinkButton>
            </article>)}
          </div>
          {total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="horses" onPage={setPage} />}
        </>
      )}
    </div>
  );
}
