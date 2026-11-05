import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { useAppLanguage } from "@/shared/lib/language";
import { fetchOwnerSummary } from "../api";
import { invoiceStatusLabel } from "../invoiceStatus";
import type { OwnerSummaryResponse } from "../types";
import styles from "./CostReportPage.module.css";

const PAGE_SIZE = 10;
export default function CostReportPage() {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const locale = isVietnamese ? "vi-VN" : "en-US";
  const user = useCurrentUser();
  const [summary, setSummary] = useState<OwnerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("ALL");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchOwnerSummary().then((data) => {
      if (active) {
        setSummary(data);
        setPeriod((current) => current === "ALL" || data.invoices.some((invoice) => invoice.billingPeriod === current) ? current : "ALL");
      }
    }).catch((err) => {
      if (active) setError(messageFor(err));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  const invoices = summary?.invoices ?? [];
  const periods = [...new Set(invoices.map((invoice) => invoice.billingPeriod))].sort().reverse();
  const rows = period === "ALL" ? invoices : invoices.filter((invoice) => invoice.billingPeriod === period);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const boarding = rows.reduce((sum, row) => sum + row.boardingFee, 0);
  const medical = rows.reduce((sum, row) => sum + row.medicalFee, 0);
  const training = rows.reduce((sum, row) => sum + row.trainingFee, 0);

  return (
    <div className={styles.page}>
      <PageHeader title={tr(user.role === "CLUB_MANAGER" ? "Operating Costs" : "Cost Report")} description={tr("Expenses recorded on billing statements for the selected period.")} action={<LinkButton to="/financial-reports" tone="secondary">{tr("Financial Reports")}</LinkButton>} />
      {loading ? <SkeletonTable columns={5} rows={5} /> : error ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => setRetry((value) => value + 1)}>{tr("Try again")}</Button>}>{error}</Alert>
      ) : (
        <>
          <Card pad={16}>
            <div className={styles.filter}>
              <label htmlFor="cost-period">{tr("Billing Period:")}</label>
              <select id="cost-period" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>
                <option value="ALL">{tr("All Billing Periods")}</option>
                {periods.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <span>{tr("Totals include all statement statuses and exclude prize credits.")}</span>
            </div>
          </Card>
          <div className={styles.metrics}>
            <KpiTile label={tr("Stall Boarding")} value={boarding.toLocaleString(locale)} unit="VND" />
            <KpiTile label={tr("Medical & Vet")} value={medical.toLocaleString(locale)} unit="VND" />
            <KpiTile label={tr("Conditioning")} value={training.toLocaleString(locale)} unit="VND" />
            <KpiTile label={tr("Total Upkeep Expenses")} value={(boarding + medical + training).toLocaleString(locale)} unit="VND" />
          </div>
          <Card pad={20}>
            {rows.length === 0 ? <EmptyState title={tr("No Financial Statements Found")} description={tr(period === "ALL" ? "Monthly billing statements and tournament earnings credits will appear here." : "No statements match the selected billing period.")} /> : (
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <caption className="sr-only">{tr(user.role === "CLUB_MANAGER" ? "Operating Costs" : "Cost Report")}</caption>
                  <thead><tr>{["Period", "Horse", ...(user.role === "CLUB_MANAGER" ? ["Owner"] : []), "Stall Boarding", "Medical & Vet", "Conditioning", "Total Upkeep Expenses", "Status"].map((label) => <th key={label} scope="col">{tr(label)}</th>)}</tr></thead>
                  <tbody>{visible.map((row) => <tr key={row.id}>
                    <td>{row.billingPeriod}</td><td><strong>{row.horse.name}</strong><br /><span>{row.horse.horseCode || "—"}</span></td>
                    {user.role === "CLUB_MANAGER" && <td>{row.owner?.fullName || "—"}</td>}
                    <td>{row.boardingFee.toLocaleString(locale)} đ</td><td>{row.medicalFee.toLocaleString(locale)} đ</td><td>{row.trainingFee.toLocaleString(locale)} đ</td>
                    <td><strong>{(row.boardingFee + row.medicalFee + row.trainingFee).toLocaleString(locale)} đ</strong></td><td><Badge tone={row.status === "PAID" ? "ok" : row.status === "SENT" ? "warn" : row.status === "OVERDUE" ? "danger" : "neutral"}>{invoiceStatusLabel(row.status)}</Badge></td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
            {rows.length > PAGE_SIZE && <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} noun="statements" onPage={setPage} />}
          </Card>
        </>
      )}
    </div>
  );
}
