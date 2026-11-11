import { formatCurrency, formatVND } from "@/shared/lib/format";
import { useTranslation as useScreenTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./OwnerFinancialReportsPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { useToast } from "@/shared/components/ui/Toast";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { Tabs, type TabItem } from "@/shared/components/ui/Tabs";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { getHorses } from "@/features/horses/api";
import type { Horse } from "@/features/horses/types";
import { SingleInvoiceModal } from "../components/SingleInvoiceModal";
import { fetchOwnerSummary, changeInvoiceStatus, generateMonthlyInvoices, payInvoice } from "../api";
import type { FinancialInvoice, InvoiceStatus, OwnerSummaryResponse } from "../types";
import { exportStatementXlsx, printStatement } from "../statementExport";
import { invoiceStatusLabel } from "../invoiceStatus";

const PAGE_SIZE = 10;
const STATUS_FILTER_OPTIONS: readonly InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"];

function defaultClosedMonth(): string {
  const now = new Date(Date.now() + 7 * 3600000);
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() - 1);
  return now.toISOString().slice(0, 7);
}

export default function OwnerFinancialReportsPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const locale = isVietnamese ? "vi-VN" : "en-US";
  const user = useCurrentUser();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const isClubManager = user.role === "CLUB_MANAGER";

  const [summary, setSummary] = useState<OwnerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [horseFilter, setHorseFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);

  // Generate monthly invoices modal state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [billingPeriodInput, setBillingPeriodInput] = useState(defaultClosedMonth);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Create single statement modal + confirm status modal
  const [isCreateSingleOpen, setIsCreateSingleOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [horsesLoading, setHorsesLoading] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    invoice: FinancialInvoice;
    targetStatus: "PAID" | "CANCELLED";
  } | null>(null);

  // Statement details modal state
  const [selectedInvoice, setSelectedInvoice] = useState<FinancialInvoice | null>(null);
  const [confirmPayment, setConfirmPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError("");
    setSummary(null);
    try {
      const data = await fetchOwnerSummary();
      setSummary(data);
      setSelectedPeriod((period) => period === "ALL" || data.invoices.some((invoice) => invoice.billingPeriod === period) ? period : "ALL");
    } catch (err) {
      setLoadError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: InvoiceStatus) {
    if (updatingInvoice) return;
    setUpdatingInvoice(id);
    setActionError("");
    setStatusMessage(null);
    try {
      await changeInvoiceStatus(id, newStatus);
      setStatusMessage(tr("Invoice status updated to {{status}}", { status: invoiceStatusLabel(newStatus) }));
      await loadData();
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setUpdatingInvoice(null);
    }
  }

  async function handlePayInvoice() {
    if (!confirmPayment || !selectedInvoice || updatingInvoice || user.role !== "HORSE_OWNER" ||
      selectedInvoice.ownerId !== user.id || selectedInvoice.netAmount <= 0 ||
      (selectedInvoice.status !== "SENT" && selectedInvoice.status !== "OVERDUE")) return;
    const id = selectedInvoice.id;
    setUpdatingInvoice(id);
    setActionError("");
    setStatusMessage(null);
    try {
      const paid = await payInvoice(id, { paymentMethod: "BANK_TRANSFER" });
      setSelectedInvoice((current) => current?.id === id ? { ...current, ...paid } : current);
      setConfirmPayment(false);
      toast.show(tr("Payment recorded successfully."), "ok");
      setStatusMessage(tr("Payment recorded successfully."));
      await loadData();
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setUpdatingInvoice(null);
    }
  }

  function handleOpenGenerate() {
    setGenerateError(null);
    setIsGenerateOpen(true);
  }

  async function handleOpenCreateSingle() {
    setIsCreateSingleOpen(true);
    if (horses.length > 0 || horsesLoading) return;
    setHorsesLoading(true);
    try {
      const all: Horse[] = [];
      for (let nextPage = 1; ; nextPage += 1) {
        const res = await getHorses({ page: nextPage, limit: 100 });
        all.push(...res.items);
        if (nextPage >= res.totalPages) break;
      }
      setHorses(all);
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setHorsesLoading(false);
    }
  }

  async function handleConfirmTransition() {
    if (!pendingTransition || updatingInvoice) return;
    const { invoice, targetStatus } = pendingTransition;
    setUpdatingInvoice(invoice.id);
    setActionError("");
    setStatusMessage(null);
    try {
      await changeInvoiceStatus(invoice.id, targetStatus);
      const msg =
        targetStatus === "PAID" ? tr("Statement marked as paid.") : tr("Statement cancelled.");
      setStatusMessage(msg);
      toast.show(msg, "ok");
      setPendingTransition(null);
      await loadData();
    } catch (err) {
      setActionError(messageFor(err));
      setPendingTransition(null);
    } finally {
      setUpdatingInvoice(null);
    }
  }

  async function handleConfirmGenerate() {
    if (!billingPeriodInput.match(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/)) {
      setGenerateError(tr("Please enter a valid billing period in YYYY-MM format (e.g. 2026-11)"));
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await generateMonthlyInvoices(billingPeriodInput);
      setStatusMessage(
        tr("Generated {{count}} unissued statements for period {{period}}", { count: res.createdCount, period: res.billingPeriod }),
      );
      setIsGenerateOpen(false);
      await loadData();
    } catch (err: any) {
      setGenerateError(messageFor(err));
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenStatement(invoice: FinancialInvoice) {
    setActionError("");
    setConfirmPayment(false);
    setSelectedInvoice(invoice);
  }

  const invoices = summary?.invoices ?? [];
  const periods = Array.from(new Set(invoices.map((i) => i.billingPeriod))).sort().reverse();

  const uniqueHorses = Array.from(new Map(invoices.map((i) => [i.horse.id, i.horse])).values());
  const uniqueOwners = Array.from(new Map(invoices.filter((i) => i.owner).map((i) => [i.owner.id, i.owner])).values());
  const horseOptions = [
    { value: "ALL", label: tr("All Horses") },
    ...uniqueHorses.map((h) => ({ value: h.id, label: `${h.name} (${h.horseCode || "—"})` })),
  ];
  const ownerOptions = [
    { value: "ALL", label: tr("All Owners") },
    ...uniqueOwners.map((o) => ({ value: o.id, label: `${o.fullName} (${o.email || ""})` })),
  ];
  const statusScopedInvoices = invoices.filter(
    (i) =>
      (selectedPeriod === "ALL" || i.billingPeriod === selectedPeriod) &&
      (horseFilter === "ALL" || i.horseId === horseFilter) &&
      (!isClubManager || ownerFilter === "ALL" || i.ownerId === ownerFilter),
  );
  const statusTabItems: TabItem<InvoiceStatus | "ALL">[] = [
    { id: "ALL", label: "All", count: statusScopedInvoices.length },
    ...(["DRAFT", "SENT", "OVERDUE", "PAID", "CANCELLED"] as const).map((st) => ({
      id: st,
      label: invoiceStatusLabel(st),
      count: statusScopedInvoices.filter((i) => i.status === st).length,
    })),
  ];
  const filteredInvoices = invoices.filter((i) =>
    i.id === highlightId || ((selectedPeriod === "ALL" || i.billingPeriod === selectedPeriod) &&
    (statusFilter === "ALL" || i.status === statusFilter) &&
    (horseFilter === "ALL" || i.horseId === horseFilter) &&
    (!isClubManager || ownerFilter === "ALL" || i.ownerId === ownerFilter)),
  );
  const highlightedIndex = highlightId ? filteredInvoices.findIndex((i) => i.id === highlightId) : -1;
  const highlightPage = highlightedIndex < 0 ? null : Math.floor(highlightedIndex / PAGE_SIZE) + 1;

  useEffect(() => {
    if (highlightPage !== null && page !== highlightPage) {
      setPage(highlightPage);
    }
  }, [highlightPage, page]);
  const hasFilters = selectedPeriod !== "ALL" || statusFilter !== "ALL" || horseFilter !== "ALL" || (isClubManager && ownerFilter !== "ALL");

  function resetFilters() {
    setSelectedPeriod("ALL");
    setStatusFilter("ALL");
    setHorseFilter("ALL");
    setOwnerFilter("ALL");
    setPage(1);
  }
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE)));

  const totalExpense = summary?.totalExpense ?? 0;
  const totalPrizeCredit = summary?.totalPrizeCredit ?? 0;
  const totalNet = summary?.totalNet ?? 0;
  const periodLabel = selectedPeriod === "ALL" ? "all-periods" : selectedPeriod;
  const ownerName = isClubManager ? undefined : invoices[0]?.owner.fullName;

  return (
    <div className={styles.report}>
      <PageHeader
        title={tr(isClubManager ? "Financial Reports" : "Owner Financial Reports")}
        description={tr(
          "Monthly statements for boarding, veterinary care, training fees, and prize deductions.",
        )}
        action={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Button tone="secondary" icon="file" disabled={filteredInvoices.length === 0} onClick={() => printStatement(filteredInvoices, periodLabel, ownerName)}>
              {tr("Export PDF")}
            </Button>
            <Button tone="secondary" icon="download" disabled={filteredInvoices.length === 0} onClick={() => exportStatementXlsx(filteredInvoices, periodLabel)}>
              {tr("Export Excel")}
            </Button>
            {isClubManager && (
              <>
                <Button tone="secondary" icon="plus" onClick={handleOpenCreateSingle}>
                  {tr("Create single statement")}
                </Button>
                <Button tone="primary" onClick={handleOpenGenerate}>
                  + {tr("Create monthly statements")}
                </Button>
              </>
            )}
          </div>
        }
      />

      {statusMessage && <Alert tone="ok" onDismiss={() => setStatusMessage(null)}>{statusMessage}</Alert>}
      {actionError && <Alert tone="danger" title={tr("Failed to update invoice status")} onDismiss={() => setActionError("")}>{actionError}</Alert>}

      {summary && <div role="status"><Badge tone={summary.outstandingDebt > 0 ? "danger" : "ok"}>{tr("Outstanding balance")}: {summary.outstandingDebt == null ? "—" : formatCurrency(summary.outstandingDebt) + " VND"}</Badge></div>}

      {/* KPI Tiles */}
      <div className={styles.metrics}>
        <KpiTile
          label={tr("Total Upkeep Expenses")}
          value={summary ? formatCurrency(totalExpense) : "—"}
          unit="VND"
          caption={tr("Boarding, medical & conditioning fees")}
        />
        <KpiTile
          label={tr("Tournament Prize Credits")}
          value={summary ? `+${formatCurrency(totalPrizeCredit)}` : "—"}
          unit="VND"
          caption={tr("Prize credits recorded on statements")}
          accent={totalPrizeCredit > 0}
        />
        <KpiTile
          label={tr("Net total across statements")}
          value={summary ? formatCurrency(totalNet) : "—"}
          unit="VND"
          caption={tr("Includes unissued and paid statements; not an outstanding balance.")}
        />
        <KpiTile
          label={tr("Billing Statements")}
          value={summary ? String(invoices.length) : "—"}
          caption={tr("Archived monthly financial ledgers")}
        />
      </div>

      {/* Ledger Settlement Calculation Guide */}
      <Card pad={16}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--ink)", fontSize: "var(--fs-sm)" }}>
            <Icon name="lightbulb" size={16} />
            <span>{tr("How Monthly Settlement & Prize Credits Work")}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "0.75rem", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            <div style={{ padding: "0.625rem 0.875rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "var(--r-sm, 6px)", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--ink)", display: "block", marginBottom: "0.25rem" }}>
                1. {tr("Total Upkeep Expenses")}
              </strong>
              {tr("Sum of monthly Stall Boarding, Vet & Medical exams, and conditioning services for each horse.")}
            </div>
            <div style={{ padding: "0.625rem 0.875rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "var(--r-sm, 6px)", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--brand-700)", display: "block", marginBottom: "0.25rem" }}>
                2. {tr("Tournament Prize Credits")}
              </strong>
              {tr("Prize credits recorded on statements are deducted from expenses.")}
            </div>
            <div style={{ padding: "0.625rem 0.875rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "var(--r-sm, 6px)", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--ink)", display: "block", marginBottom: "0.25rem" }}>
                3. {tr("Net Settlement Balance")}
              </strong>
              {tr("Expenses minus Prize Credits. If positive, owner pays the balance. If negative, club pays surplus to owner.")}
            </div>
          </div>
        </div>
      </Card>

      {/* Billing period & status workflow filter */}
      <Card pad={0}>
        {isClubManager && (
          <div className={styles.statusTabsWrap}>
            <Tabs
              items={statusTabItems}
              active={statusFilter}
              onChange={(next) => {
                setStatusFilter(next);
                setPage(1);
              }}
              label="Invoice workflow status"
            />
          </div>
        )}
        <div style={{ padding: 16 }}>
          <div className={styles.billingFilter}>
            <div className={styles.searchField}>
              <label htmlFor="invoice-horse" className={styles.filterLabel}>{tr("Horse")}</label>
              <SearchSelect id="invoice-horse" options={horseOptions} value={horseFilter}
                onChange={(value) => { setHorseFilter(value); setPage(1); }} />
            </div>
            {isClubManager && (
              <div className={styles.searchField}>
                <label htmlFor="invoice-owner" className={styles.filterLabel}>{tr("Owner")}</label>
                <SearchSelect id="invoice-owner" options={ownerOptions} value={ownerFilter}
                  onChange={(value) => { setOwnerFilter(value); setPage(1); }} />
              </div>
            )}
            <div className={styles.filterField}>
              <label htmlFor="invoice-status" className={styles.filterLabel}>{tr("Status")}</label>
              <select id="invoice-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | "ALL"); setPage(1); }} className={styles.periodSelect}>
                <option value="ALL">{tr("All statuses")}</option>
                {STATUS_FILTER_OPTIONS.map((status) => <option key={status} value={status}>{invoiceStatusLabel(status)}</option>)}
              </select>
            </div>
            <div className={styles.filterField}>
              <label htmlFor="billing-period" className={styles.filterLabel}>{tr("Billing Period:")}</label>
              <select id="billing-period" value={summary ? selectedPeriod : "ALL"} disabled={!summary} onChange={(e) => { setSelectedPeriod(e.target.value); setPage(1); }} className={styles.periodSelect}>
                <option value="ALL">{tr("All Billing Periods")}</option>
                {periods.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
            </div>
            {hasFilters && <Button tone="secondary" onClick={resetFilters}>{tr("Clear filters")}</Button>}
          </div>
          <p className={styles.filterHelp}>{tr("Filters apply to the table and exports; totals include all statements.")}</p>
        </div>
      </Card>

      {/* Invoices List Table */}
      {loading ? (
        <SkeletonTable columns={6} rows={6} />
      ) : loadError ? (
        <Alert tone="danger" title={tr("Could not load data")} action={<Button tone="secondary" onClick={() => void loadData()}>{tr("Try again")}</Button>}>{loadError}</Alert>
      ) : filteredInvoices.length === 0 ? (
        <Card pad={32}>
          <EmptyState
            title={tr("No Financial Statements Found")}
            description={tr(hasFilters ? "No statements match the current filters." : "Monthly billing statements and tournament earnings credits will appear here.")}
            action={hasFilters ? <Button tone="secondary" onClick={resetFilters}>{tr("Clear filters")}</Button> : undefined}
          />
        </Card>
      ) : (
        <Card pad={20}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className="sr-only">{tr("Billing Statements")}</caption>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Period")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Horse")}</th>
                  {isClubManager && <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Owner")}</th>}
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Stall Boarding")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Medical & Vet")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Conditioning")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Prize Credit")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Net Amount")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Payment deadline")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Status")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((inv) => {
                  const isCredit = inv.netAmount < 0;
                  return (
                    <tr key={inv.id} data-highlight-id={inv.id} className={inv.id === highlightId ? "highlight-target-attention" : undefined} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700, color: "var(--ink)" }}>
                        {inv.billingPeriod}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <strong style={{ color: "var(--ink)" }}>{inv.horse.name}</strong>
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", display: "block" }}>
                          {inv.horse.horseCode || "—"}
                        </span>
                      </td>
                      {isClubManager && <td style={{ padding: "0.75rem 0.5rem" }}>{inv.owner?.fullName || "—"}</td>}
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {formatVND(inv.boardingFee)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {formatVND(inv.medicalFee)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {formatVND(inv.trainingFee)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--brand-700)", fontWeight: 700 }}>
                        {inv.prizeCredit > 0 ? `+${formatVND(inv.prizeCredit)}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          fontWeight: 800,
                          color: isCredit ? "var(--ok)" : "var(--ink)",
                        }}
                      >
                        {isCredit
                          ? `${tr("Payout:")} ${formatVND(Math.abs(inv.netAmount))}`
                          : formatVND(inv.netAmount)}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {inv.dueAt ? new Date(inv.dueAt).toLocaleString(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }) : tr("No payment deadline")}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <Badge
                          tone={
                            inv.status === "PAID"
                              ? "ok"
                              : inv.status === "SENT"
                              ? "warn"
                              : inv.status === "OVERDUE"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {invoiceStatusLabel(inv.status)}
                        </Badge>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div className={styles.rowActions}>
                          {isClubManager && inv.status === "DRAFT" && (
                            <Button
                              tone="secondary"
                              size="sm"
                              icon="send"
                              className={styles.rowActionBtn}
                              title={tr("Send statement to owner")}
                              disabled={updatingInvoice !== null}
                              onClick={() => handleStatusChange(inv.id, "SENT")}
                            >
                              {tr("Send")}
                            </Button>
                          )}
                          {isClubManager && (inv.status === "SENT" || inv.status === "OVERDUE") && (
                            <Button
                              tone="primary"
                              size="sm"
                              icon="check"
                              className={styles.rowActionBtn}
                              title={tr("Mark Paid")}
                              disabled={updatingInvoice !== null}
                              onClick={() => setPendingTransition({ invoice: inv, targetStatus: "PAID" })}
                            >
                              {tr("Mark Paid")}
                            </Button>
                          )}
                          {isClubManager && (inv.status === "DRAFT" || inv.status === "SENT" || inv.status === "OVERDUE") && (
                            <Button
                              tone="danger"
                              size="sm"
                              icon="ban"
                              className={styles.rowActionBtn}
                              title={tr("Cancel statement")}
                              disabled={updatingInvoice !== null}
                              onClick={() => setPendingTransition({ invoice: inv, targetStatus: "CANCELLED" })}
                            >
                              {tr("Cancel")}
                            </Button>
                          )}
                          {inv.status === "PAID" && (
                            <span className={styles.settledTag}>
                              <Icon name="check" inline size={13} /> {tr("Settled")}
                            </span>
                          )}
                          <Button
                            tone="secondary"
                            size="sm"
                            icon="eye"
                            className={styles.rowActionBtn}
                            title={tr("View statement")}
                            onClick={() => handleOpenStatement(inv)}
                          >
                            {tr("Statement")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length > PAGE_SIZE && <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filteredInvoices.length} noun="statements" onPage={setPage} />}
        </Card>
      )}

      {/* Generate Monthly Invoices Modal */}
      {isGenerateOpen && (
        <Modal
          title={tr("Create monthly statements")}
          subtitle={tr("Create unissued statements for a completed billing month")}
          width={540}
          onClose={generating ? undefined : () => setIsGenerateOpen(false)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <Button tone="secondary" onClick={() => setIsGenerateOpen(false)} disabled={generating}>
                {tr("Cancel")}
              </Button>
              <Button tone="primary" onClick={handleConfirmGenerate} disabled={generating}>
                {generating ? tr("Generating...") : tr("Create statements")}
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {generateError && (
              <div
                id="draft-period-error"
                role="alert"
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--danger-bg, #fef2f2)",
                  color: "var(--danger, #dc2626)",
                  borderRadius: "var(--r-sm, 6px)",
                  fontSize: "var(--fs-sm)",
                  border: "1px solid var(--danger-border, #fecaca)",
                }}
              >
                {generateError}
              </div>
            )}

            <div>
              <label htmlFor="draft-period" style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: "0.375rem" }}>
                {tr("Billing Period (YYYY-MM)")} *
              </label>
              <input
                id="draft-period"
                type="month"
                required
                disabled={generating}
                aria-describedby={generateError ? "draft-period-help draft-period-error" : "draft-period-help"}
                value={billingPeriodInput}
                onChange={(e) => setBillingPeriodInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--r-sm, 6px)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  fontSize: "var(--fs-body)",
                }}
              />
              <p id="draft-period-help" style={{ margin: "0.375rem 0 0", fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                {tr("Statements are created for horses with recorded stays in a completed month. Existing statements are kept.")}
              </p>
            </div>

            {/* Parameter & Ledger Explanation */}
            <div
              style={{
                padding: "0.875rem 1rem",
                background: "var(--surface-sunken, #f8fafc)",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                fontSize: "var(--fs-xs)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <strong style={{ color: "var(--ink)", fontSize: "var(--fs-sm)" }}>
                <Icon name="clipboard" inline size={14} /> {tr("Monthly Statement Calculation Rule:")}
              </strong>
              <div>
                • <strong>{tr("Total Upkeep Expenses:")}</strong> {tr("Boarding is 6,000,000 VND per calendar month, prorated by actual stay days. Each month is billed separately.")}
              </div>
              <div>
                • <strong>{tr("Tournament Prize Credits:")}</strong> {tr("Prize credits on new statements start at zero.")}
              </div>
              <div>
                • <strong>{tr("Net Settlement Balance:")}</strong> {tr("Upkeep Expenses minus Prize Credits. Generates a clear payable statement for the horse owner.")}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Statement details */}
      {selectedInvoice && !confirmPayment && (
        <Modal
          title={tr("Statement details")}
          subtitle={tr("Period {{period}} — Horse: {{horse}}", {
            period: selectedInvoice.billingPeriod,
            horse: selectedInvoice.horse.name,
          })}
          width={580}
          onClose={updatingInvoice ? undefined : () => setSelectedInvoice(null)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <Button tone="secondary" icon="file" onClick={() => printStatement([selectedInvoice], selectedInvoice.billingPeriod, selectedInvoice.owner.fullName)}>{tr("Export PDF")}</Button>
              <Button tone="secondary" icon="download" onClick={() => exportStatementXlsx([selectedInvoice], selectedInvoice.billingPeriod)}>{tr("Export Excel")}</Button>
              <Button tone="secondary" disabled={updatingInvoice !== null} onClick={() => setSelectedInvoice(null)}>{tr("Close")}</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {actionError && <Alert tone="danger">{actionError}</Alert>}
            <div><Badge tone={selectedInvoice.status === "PAID" ? "ok" : selectedInvoice.status === "OVERDUE" ? "danger" : selectedInvoice.status === "SENT" ? "warn" : "neutral"}>{invoiceStatusLabel(selectedInvoice.status)}</Badge></div>
            {isClubManager && <div>{tr("Owner")}: {selectedInvoice.owner?.fullName || "—"}</div>}
            <div>{tr("Payment deadline")}: {selectedInvoice.dueAt ? new Date(selectedInvoice.dueAt).toLocaleString(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }) : tr("No payment deadline")}</div>
            {selectedInvoice.boardingDays != null && <div>{tr("Boarding days: {{count}}", { count: selectedInvoice.boardingDays })}</div>}
            {selectedInvoice.boardingMonthlyRate != null && <div>{tr("Monthly boarding rate")}: {formatCurrency(selectedInvoice.boardingMonthlyRate)} VND</div>}
            {/* Bill Summary */}
            <div
              style={{
                padding: "0.875rem 1rem",
                background: "var(--surface-sunken, #f8fafc)",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                fontSize: "var(--fs-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Stall Boarding:")}</span>
                <strong>{formatVND(selectedInvoice.boardingFee)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Medical & Veterinary:")}</span>
                <strong>{formatVND(selectedInvoice.medicalFee)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Conditioning & Training:")}</span>
                <strong>{formatVND(selectedInvoice.trainingFee)}</strong>
              </div>
              {selectedInvoice.prizeCredit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-700)" }}>
                  <span>{tr("Tournament Prize Credits:")}</span>
                  <strong>-{formatVND(selectedInvoice.prizeCredit)}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "0.5rem",
                  marginTop: "0.25rem",
                  borderTop: "1px dashed var(--border)",
                  fontSize: "var(--fs-base, 1rem)",
                  fontWeight: 800,
                  color: "var(--ink)",
                }}
              >
                <span>{tr("Net Amount")}</span>
                <span style={{ color: "var(--brand-700)" }}>
                  {formatVND(selectedInvoice.netAmount)}
                </span>
              </div>
            </div>

            {user.role === "HORSE_OWNER" && selectedInvoice.ownerId === user.id &&
              (selectedInvoice.status === "SENT" || selectedInvoice.status === "OVERDUE") && selectedInvoice.netAmount > 0 && (
              <div>
                <p>{tr("Confirm only after you have transferred the invoice amount to the club. This records your bank transfer confirmation.")}</p>
                <Button tone="primary" disabled={updatingInvoice !== null} onClick={() => { setActionError(""); setConfirmPayment(true); }}>
                  {updatingInvoice === selectedInvoice.id ? tr("Processing...") : tr("Pay Invoice")}
                </Button>
              </div>
            )}

          </div>
        </Modal>
      )}
      {selectedInvoice && confirmPayment && (
        <ConfirmModal title={tr("Confirm bank transfer")} tone="info"
          subtitle={`${selectedInvoice.horse.name} · ${selectedInvoice.billingPeriod}`}
          confirmLabel={tr("Confirm payment made")} cancelLabel={tr("Back")}
          busy={updatingInvoice !== null} onConfirm={handlePayInvoice}
          onCancel={() => { setActionError(""); setConfirmPayment(false); }}>
          {actionError && <Alert tone="danger">{actionError}</Alert>}
          <p><strong>{tr("Net Amount")}: {formatCurrency(selectedInvoice.netAmount)} VND</strong></p>
          <dl className={styles.paymentDetails}>
            <dt>{tr("Bank (sample)")}</dt><dd>DEMO BANK</dd>
            <dt>{tr("Account (sample)")}</dt><dd>DEMO — EQUIFLOW CLUB</dd>
            <dt>{tr("Transfer reference")}</dt><dd>{selectedInvoice.id}</dd>
          </dl>
          <Alert tone="warn">{tr("Sample details only. Do not transfer money using these details. Contact the club for verified bank details.")}</Alert>
          <p>{tr("Confirm only after you have transferred the invoice amount to the club. This records your bank transfer confirmation.")}</p>
        </ConfirmModal>
      )}

      <SingleInvoiceModal
        open={isCreateSingleOpen}
        defaultPeriod={billingPeriodInput}
        horses={horses}
        horsesLoading={horsesLoading}
        onClose={() => setIsCreateSingleOpen(false)}
        onCreated={async () => {
          setIsCreateSingleOpen(false);
          const msg = tr("Statement created.");
          toast.show(msg, "ok");
          setStatusMessage(msg);
          await loadData();
        }}
      />

      {pendingTransition && (
        <ConfirmModal
          title={
            pendingTransition.targetStatus === "PAID"
              ? tr("Confirm payment receipt")
              : tr("Cancel statement?")
          }
          subtitle={`${pendingTransition.invoice.horse.name} · ${pendingTransition.invoice.billingPeriod}`}
          tone={pendingTransition.targetStatus === "CANCELLED" ? "danger" : "info"}
          confirmLabel={
            pendingTransition.targetStatus === "PAID"
              ? tr("Confirm settlement")
              : tr("Confirm cancel")
          }
          cancelLabel={tr("Back")}
          confirmIcon={pendingTransition.targetStatus === "PAID" ? "check" : undefined}
          busy={updatingInvoice !== null}
          onConfirm={() => void handleConfirmTransition()}
          onCancel={() => setPendingTransition(null)}
        >
          <p>
            <strong>
              {tr("Net Amount")}: {formatVND(pendingTransition.invoice.netAmount)}
            </strong>
          </p>
          {pendingTransition.targetStatus === "CANCELLED" ? (
            <p>{tr("This statement will be voided and excluded from collectible club revenue.")}</p>
          ) : null}
          {pendingTransition.invoice.status === "OVERDUE" && (
            <Alert tone={pendingTransition.targetStatus === "CANCELLED" ? "warn" : "info"}>
              {pendingTransition.targetStatus === "CANCELLED"
                ? tr(
                    "Cancelling an OVERDUE statement will automatically re-check and release debt sanctions if no other overdue invoices remain.",
                  )
                : tr(
                    "Marking an OVERDUE statement as PAID will automatically release debt impound locks if all overdue statements are settled.",
                  )}
            </Alert>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

