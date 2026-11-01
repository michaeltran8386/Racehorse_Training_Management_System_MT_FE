import { useTranslation as useScreenTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import styles from "./OwnerFinancialReportsPage.module.css";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { KpiTile } from "@/shared/components/ui/KpiTile";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SkeletonTable } from "@/shared/components/ui/Skeleton";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import { messageFor } from "@/shared/lib/messages";
import { fetchOwnerSummary, changeInvoiceStatus, generateMonthlyInvoices } from "../api";
import type { FinancialInvoice, InvoiceStatus, OwnerSummaryResponse } from "../types";
import { exportStatementXlsx, printStatement } from "../statementExport";

const PAGE_SIZE = 10;

export default function OwnerFinancialReportsPage() {
  useScreenTranslation();
  const { isVietnamese } = useAppLanguage();
  const locale = isVietnamese ? "vi-VN" : "en-US";
  const user = useCurrentUser();
  const isClubManager = user.role === "CLUB_MANAGER";

  const [summary, setSummary] = useState<OwnerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);

  // Generate monthly invoices modal state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [billingPeriodInput, setBillingPeriodInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Statement details modal state
  const [selectedInvoice, setSelectedInvoice] = useState<FinancialInvoice | null>(null);

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
      setStatusMessage(tr("Invoice status updated to {{status}}", { status: tr(newStatus) }));
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

  async function handleConfirmGenerate() {
    if (!billingPeriodInput.match(/^\d{4}-\d{2}$/)) {
      setGenerateError(tr("Please enter a valid billing period in YYYY-MM format (e.g. 2026-11)"));
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await generateMonthlyInvoices(billingPeriodInput);
      setStatusMessage(
        tr(`Generated ${res.createdCount} draft statements for period ${res.billingPeriod}`),
      );
      setIsGenerateOpen(false);
      await loadData();
    } catch (err: any) {
      setGenerateError(err?.message || tr("Failed to generate monthly invoices"));
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenStatement(invoice: FinancialInvoice) {
    setSelectedInvoice(invoice);
  }

  const invoices = summary?.invoices ?? [];
  const periods = Array.from(new Set(invoices.map((i) => i.billingPeriod))).sort().reverse();

  const filteredInvoices = invoices.filter((i) => {
    if (selectedPeriod === "ALL") return true;
    return i.billingPeriod === selectedPeriod;
  });
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
            {isClubManager && <Button tone="primary" onClick={handleOpenGenerate}>+ {tr("Create monthly drafts")}</Button>}
          </div>
        }
      />

      {statusMessage && <Alert tone="ok" onDismiss={() => setStatusMessage(null)}>{statusMessage}</Alert>}
      {actionError && <Alert tone="danger" title={tr("Failed to update invoice status")} onDismiss={() => setActionError("")}>{actionError}</Alert>}

      {/* KPI Tiles */}
      <div className={styles.metrics}>
        <KpiTile
          label={tr("Total Upkeep Expenses")}
          value={summary ? totalExpense.toLocaleString(locale) : "—"}
          unit="VND"
          caption={tr("Boarding, medical & conditioning fees")}
        />
        <KpiTile
          label={tr("Tournament Prize Credits")}
          value={summary ? `+${totalPrizeCredit.toLocaleString(locale)}` : "—"}
          unit="VND"
          caption={tr("Prize credits recorded on statements")}
          accent={totalPrizeCredit > 0}
        />
        <KpiTile
          label={tr("Net total across statements")}
          value={summary ? totalNet.toLocaleString(locale) : "—"}
          unit="VND"
          caption={tr("Includes draft and paid statements; not an outstanding balance.")}
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
            <span>💡</span>
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

      {/* Billing period filter */}
      <Card pad={16}>
        <div className={styles.billingFilter}>
          <label htmlFor="billing-period" className={styles.filterLabel}>{tr("Billing Period:")}</label>
          <select id="billing-period" value={summary ? selectedPeriod : "ALL"} disabled={!summary} onChange={(e) => { setSelectedPeriod(e.target.value); setPage(1); }} className={styles.periodSelect}>
            <option value="ALL">{tr("All Billing Periods")}</option>
            {periods.map((period) => <option key={period} value={period}>{period}</option>)}
          </select>
          <span>{tr("The filter applies to the table; totals include all periods.")}</span>
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
            description={tr(selectedPeriod === "ALL" ? "Monthly billing statements and tournament earnings credits will appear here." : "No statements match the selected billing period.")}
            action={selectedPeriod !== "ALL" ? <Button tone="secondary" onClick={() => { setSelectedPeriod("ALL"); setPage(1); }}>{tr("All Billing Periods")}</Button> : undefined}
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
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Status")}</th>
                  <th style={{ padding: "0.75rem 0.5rem" }}>{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((inv) => {
                  const isCredit = inv.netAmount < 0;
                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }}>
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
                        {inv.boardingFee.toLocaleString(locale)} đ
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {inv.medicalFee.toLocaleString(locale)} đ
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {inv.trainingFee.toLocaleString(locale)} đ
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--brand-700)", fontWeight: 700 }}>
                        {inv.prizeCredit > 0 ? `+${inv.prizeCredit.toLocaleString(locale)} đ` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem 0.5rem",
                          fontWeight: 800,
                          color: isCredit ? "var(--ok)" : "var(--ink)",
                        }}
                      >
                        {isCredit
                          ? `${tr("Payout:")} ${Math.abs(inv.netAmount).toLocaleString(locale)} đ`
                          : `${inv.netAmount.toLocaleString(locale)} đ`}
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
                          {tr(inv.status)}
                        </Badge>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", flexWrap: "wrap" }}>
                          {isClubManager && inv.status === "DRAFT" && (
                            <Button
                              tone="secondary"
                              size="sm"
                              disabled={updatingInvoice !== null}
                              onClick={() => handleStatusChange(inv.id, "SENT")}
                            >
                              {tr("Send")}
                            </Button>
                          )}
                          {isClubManager && inv.status === "SENT" && (
                            <Button
                              tone="secondary"
                              size="sm"
                              disabled={updatingInvoice !== null}
                              onClick={() => handleStatusChange(inv.id, "PAID")}
                            >
                              {tr("Mark Paid")}
                            </Button>
                          )}
                          <Button tone="secondary" size="sm" onClick={() => handleOpenStatement(inv)}>
                            {tr("View statement")}
                          </Button>
                          {(inv.status === "SENT" || inv.status === "OVERDUE") && inv.netAmount <= 0 && (
                            <span style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600 }}>
                              {inv.netAmount < 0 ? tr("Payout Pending") : tr("No balance on this statement")}
                            </span>
                          )}
                          {inv.status === "PAID" && (
                            <span style={{ fontSize: "var(--fs-xs)", color: "var(--brand-700)", fontWeight: 600 }}>
                              ✓ {tr("Settled")}
                            </span>
                          )}
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
          title={tr("Create monthly draft statements")}
          subtitle={tr("Create draft statements for the selected billing period")}
          width={540}
          onClose={generating ? undefined : () => setIsGenerateOpen(false)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <Button tone="secondary" onClick={() => setIsGenerateOpen(false)} disabled={generating}>
                {tr("Cancel")}
              </Button>
              <Button tone="primary" onClick={handleConfirmGenerate} disabled={generating}>
                {generating ? tr("Generating...") : tr("Create drafts")}
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
                {tr("Drafts are created for owned horses without a statement for this period.")}
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
                📋 {tr("Monthly Statement Calculation Rule:")}
              </strong>
              <div>
                • <strong>{tr("Total Upkeep Expenses:")}</strong> {tr("Drafts start with boarding and training fees; medical fees start at zero.")}
              </div>
              <div>
                • <strong>{tr("Tournament Prize Credits:")}</strong> {tr("Draft prize credits start at zero.")}
              </div>
              <div>
                • <strong>{tr("Net Settlement Balance:")}</strong> {tr("Upkeep Expenses minus Prize Credits. Generates a clear payable statement for the horse owner.")}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Statement details */}
      {selectedInvoice && (
        <Modal
          title={tr("Statement details")}
          subtitle={tr("Period {{period}} — Horse: {{horse}}", {
            period: selectedInvoice.billingPeriod,
            horse: selectedInvoice.horse.name,
          })}
          width={580}
          onClose={() => setSelectedInvoice(null)}
          foot={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <Button tone="secondary" icon="file" onClick={() => printStatement([selectedInvoice], selectedInvoice.billingPeriod, selectedInvoice.owner.fullName)}>{tr("Export PDF")}</Button>
              <Button tone="secondary" onClick={() => setSelectedInvoice(null)}>{tr("Close")}</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div><Badge tone={selectedInvoice.status === "PAID" ? "ok" : selectedInvoice.status === "OVERDUE" ? "danger" : selectedInvoice.status === "SENT" ? "warn" : "neutral"}>{tr(selectedInvoice.status)}</Badge></div>
            {isClubManager && <div>{tr("Owner")}: {selectedInvoice.owner?.fullName || "—"}</div>}
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
                <strong>{selectedInvoice.boardingFee.toLocaleString(locale)} đ</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Medical & Veterinary:")}</span>
                <strong>{selectedInvoice.medicalFee.toLocaleString(locale)} đ</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>{tr("Conditioning & Training:")}</span>
                <strong>{selectedInvoice.trainingFee.toLocaleString(locale)} đ</strong>
              </div>
              {selectedInvoice.prizeCredit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-700)" }}>
                  <span>{tr("Tournament Prize Credits:")}</span>
                  <strong>-{selectedInvoice.prizeCredit.toLocaleString(locale)} đ</strong>
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
                  {selectedInvoice.netAmount.toLocaleString(locale)} đ
                </span>
              </div>
            </div>

            {(selectedInvoice.status === "SENT" || selectedInvoice.status === "OVERDUE") && selectedInvoice.netAmount > 0 && (
              <p className={styles.paymentUnavailable} role="status">
                {tr("Online payment information is not available yet.")}
              </p>
            )}

          </div>
        </Modal>
      )}
    </div>
  );
}

