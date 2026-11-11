import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Alert } from "@/shared/components/ui/Alert";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, LinkButton } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { Paged } from "@/shared/components/ui/Pagination";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Tabs, type TabItem } from "@/shared/components/ui/Tabs";
import { tr } from "@/shared/i18n/tr";
import { formatCurrency, formatDate, formatVND, vndUnit } from "@/shared/lib/format";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import type { BadgeTone } from "@/shared/lib/status";
import { fetchClubCashflow } from "../api";
import { invoiceStatusLabel } from "../invoiceStatus";
import type { ClubCashflowResponse, InvoiceStatus } from "../types";
import styles from "./ClubCashflowReportView.module.css";

type LedgerTab = "supplies" | "invoices";

function invoiceStatusTone(status: InvoiceStatus): BadgeTone {
  if (status === "PAID") return "ok";
  if (status === "OVERDUE") return "danger";
  if (status === "SENT") return "warn";
  return "neutral";
}

export function ClubCashflowReportView() {
  useTranslation();
  const { isVietnamese } = useAppLanguage();
  const locale = isVietnamese ? "vi-VN" : "en-US";
  const [period, setPeriod] = useState("ALL");
  const [data, setData] = useState<ClubCashflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<LedgerTab>("supplies");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchClubCashflow(period)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(messageFor(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, retry]);

  const summary = data?.summary;
  const tabItems: TabItem<LedgerTab>[] = [
    {
      id: "supplies",
      label: "Supply Import Expenses",
      count: data?.supplyExpenses.length ?? 0,
    },
    {
      id: "invoices",
      label: "Owner Invoice List",
      count: data?.revenueItems.length ?? 0,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={tr("Club Revenue & Operating Costs")}
        description={tr(
          "Club cashflow combining owner invoice collections, supply restock deliveries, and owner prize payouts.",
        )}
        action={
          <div className={styles.headerActions}>
            <LinkButton to="/supplies/requests" tone="secondary" icon="package">
              {tr("View restock requests")}
            </LinkButton>
            <LinkButton to="/financial-reports" tone="secondary" icon="file">
              {tr("Financial Reports")}
            </LinkButton>
          </div>
        }
      />

      <Card pad={16}>
        <div className={styles.filterCard}>
          <div className={styles.filterGroup}>
            <label htmlFor="club-cashflow-period">{tr("Billing month")}</label>
            <select
              id="club-cashflow-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="ALL">{tr("All months")}</option>
              {(data?.periods ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {summary && (
              <span className={styles.filterMeta}>
                {tr("{{count}} deliveries", { count: summary.deliveredRestockCount })} ·{" "}
                {tr("{{count}} paid", { count: summary.paidInvoiceCount })} ·{" "}
                {tr("{{count}} pending", { count: summary.pendingInvoiceCount })}
              </span>
            )}
          </div>
          {period !== "ALL" && (
            <Button tone="secondary" size="sm" onClick={() => setPeriod("ALL")}>
              {tr("Clear filters")}
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <SkeletonTable columns={6} rows={6} />
      ) : error ? (
        <Alert
          tone="danger"
          title={tr("Could not load data")}
          action={
            <Button tone="secondary" onClick={() => setRetry((n) => n + 1)}>
              {tr("Try again")}
            </Button>
          }
        >
          {error}
        </Alert>
      ) : !data || !summary ? null : (
        <>
          <div className={styles.metrics}>
            <KpiTile
              label="Collected Revenue"
              value={formatCurrency(summary.actualRevenuePaid)}
              unit={vndUnit()}
              icon="dollar"
              caption={`${tr("Paid invoices")}: ${summary.paidInvoiceCount}`}
            />
            <KpiTile
              label="Total Expenses"
              value={formatCurrency(summary.totalActualExpense)}
              unit={vndUnit()}
              icon="package"
              caption={`${tr("Delivered supply imports")}: ${formatVND(summary.supplyImportExpense)}`}
            />
            <KpiTile
              label="Net Cashflow"
              value={formatCurrency(summary.netCashflow)}
              unit={vndUnit()}
              accent
              trend={{
                dir: summary.netCashflow >= 0 ? "up" : "down",
                value: tr(summary.netCashflow >= 0 ? "In Surplus" : "In Deficit"),
              }}
              caption={tr("Collected revenue minus actual club expenses")}
            />
            <KpiTile
              label="Pending Payments"
              value={formatCurrency(summary.pendingReceivable)}
              unit={vndUnit()}
              icon="alert"
              caption={`${tr("Overdue")}: ${summary.overdueInvoiceCount} · ${tr("Pending & overdue")}: ${summary.pendingInvoiceCount}`}
            />
          </div>

          <div className={styles.breakdownGrid}>
            <Card
              title="Cash Inflows"
              subtitle={tr("Revenue collected and pending from horse owners")}
            >
              <dl className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <dt>{tr("Paid invoices")}</dt>
                  <dd className={styles.positive}>{formatVND(summary.actualRevenuePaid)}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>{tr("Pending & overdue")}</dt>
                  <dd>{formatVND(summary.pendingReceivable)}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>{tr("Draft billing")}</dt>
                  <dd>{formatVND(summary.draftBillingTotal)}</dd>
                </div>
              </dl>
            </Card>

            <Card
              title="Cash Outflows"
              subtitle={tr("Supply deliveries and prize payouts to horse owners")}
            >
              <dl className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <dt>
                    {tr("Delivered supply imports")} ({summary.deliveredRestockCount})
                  </dt>
                  <dd className={styles.negative}>{formatVND(summary.supplyImportExpense)}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>
                    {tr("Owner prize payouts")} ({summary.surplusPayoutCount})
                  </dt>
                  <dd className={styles.negative}>{formatVND(summary.ownerSurplusPayoutExpense)}</dd>
                </div>
                <div className={styles.summaryRow}>
                  <dt>{tr("Cancelled invoices")}</dt>
                  <dd>{summary.cancelledInvoiceCount}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card pad={0}>
            <div className={styles.tabsBar}>
              <Tabs
                items={tabItems}
                active={tab}
                onChange={setTab}
                label="Club cashflow breakdown"
              />
            </div>

            {tab === "supplies" ? (
              data.supplyExpenses.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <EmptyState
                    icon="package"
                    title="No delivered supply restock expenses for this period."
                    description="Only delivered restock requests count toward actual supply import spending."
                  />
                </div>
              ) : (
                <Paged items={data.supplyExpenses} pageSize={10} noun="requests">
                  {(pageItems) => (
                    <div className={styles.scroll}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>{tr("Period")}</th>
                            <th>{tr("Request #")}</th>
                            <th>{tr("Supply")}</th>
                            <th>{tr("Zone")}</th>
                            <th className={styles.num}>{tr("Qty")}</th>
                            <th className={styles.num}>{tr("Unit price")}</th>
                            <th className={styles.num}>{tr("Total cost")}</th>
                            <th>{tr("Delivered at")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map((item) => (
                            <tr key={item.id}>
                              <td>{item.billingPeriod}</td>
                              <td>{item.requestNumber}</td>
                              <td>
                                <strong>{item.supplyName}</strong>
                                <span className={styles.sub}>
                                  {item.supplyCode}
                                  {item.requestedByName ? ` · ${item.requestedByName}` : ""}
                                </span>
                              </td>
                              <td>{item.zoneName}</td>
                              <td className={styles.num}>
                                {item.quantity.toLocaleString(locale)} {tr(item.unit)}
                              </td>
                              <td className={styles.num}>{formatVND(item.unitPrice)}</td>
                              <td className={styles.num}>
                                <strong>{formatVND(item.totalCost)}</strong>
                              </td>
                              <td>{item.deliveredAt ? formatDate(item.deliveredAt) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={6}>{tr("Total supply expenses")}</td>
                            <td className={styles.num}>{formatVND(summary.supplyImportExpense)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Paged>
              )
            ) : data.revenueItems.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState
                  icon="file"
                  title="No invoice records for this period."
                  description="Statements generated or created for horse owners will appear here."
                />
              </div>
            ) : (
              <Paged items={data.revenueItems} pageSize={10} noun="statements">
                {(pageItems) => (
                  <div className={styles.scroll}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>{tr("Period")}</th>
                          <th>{tr("Horse")}</th>
                          <th>{tr("Owner")}</th>
                          <th>{tr("Status")}</th>
                          <th>{tr("Cashflow Type")}</th>
                          <th className={styles.num}>{tr("Net Amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((inv) => {
                          const isPayout = inv.netAmount < 0 && inv.status !== "CANCELLED";
                          return (
                            <tr key={inv.id}>
                              <td>{inv.billingPeriod}</td>
                              <td>
                                <strong>{inv.horse.name}</strong>
                                <span className={styles.sub}>{inv.horse.horseCode}</span>
                              </td>
                              <td>
                                {inv.owner.fullName}
                                <span className={styles.sub}>{inv.owner.email}</span>
                              </td>
                              <td>
                                <Badge tone={invoiceStatusTone(inv.status)}>
                                  {invoiceStatusLabel(inv.status)}
                                </Badge>
                              </td>
                              <td>
                                {inv.status === "CANCELLED" ? (
                                  <Badge tone="neutral">{tr("Cancelled")}</Badge>
                                ) : isPayout ? (
                                  <Badge tone="warn">{tr("Surplus payout")}</Badge>
                                ) : (
                                  <Badge tone="ok">{tr("Revenue")}</Badge>
                                )}
                              </td>
                              <td className={styles.num}>
                                <strong
                                  className={
                                    inv.status === "CANCELLED"
                                      ? undefined
                                      : isPayout
                                        ? styles.negative
                                        : styles.positive
                                  }
                                >
                                  {formatVND(inv.netAmount)}
                                </strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5}>{tr("Collected Revenue")}</td>
                          <td className={styles.num}>{formatVND(summary.actualRevenuePaid)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Paged>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
