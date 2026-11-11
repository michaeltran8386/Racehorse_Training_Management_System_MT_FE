import { api } from "@/shared/lib/api";
import type { FinancialInvoice, InvoiceStatus, OwnerSummaryResponse } from "./types";

export interface QueryInvoiceParams {
  page?: number;
  limit?: number;
  ownerId?: string;
  horseId?: string;
  billingPeriod?: string;
  status?: string;
}

export interface InvoiceListResponse {
  items: FinancialInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchInvoices(params: QueryInvoiceParams = {}): Promise<InvoiceListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.ownerId) query.set("ownerId", params.ownerId);
  if (params.horseId) query.set("horseId", params.horseId);
  if (params.billingPeriod && params.billingPeriod !== "ALL") {
    query.set("billingPeriod", params.billingPeriod);
  }
  if (params.status && params.status !== "ALL") query.set("status", params.status);

  const qs = query.toString();
  return api<InvoiceListResponse>("GET", `/invoices${qs ? `?${qs}` : ""}`);
}

export async function fetchOwnerSummary(ownerId?: string): Promise<OwnerSummaryResponse> {
  const query = ownerId ? `?ownerId=${ownerId}` : "";
  return api<OwnerSummaryResponse>("GET", `/invoices/owner-summary${query}`);
}

export async function fetchInvoiceDetail(id: string): Promise<FinancialInvoice> {
  return api<FinancialInvoice>("GET", `/invoices/${id}`);
}

export async function createInvoice(data: Partial<FinancialInvoice>): Promise<FinancialInvoice> {
  return api<FinancialInvoice>("POST", "/invoices", data);
}

export async function updateInvoice(
  id: string,
  data: Partial<FinancialInvoice>,
): Promise<FinancialInvoice> {
  return api<FinancialInvoice>("PATCH", `/invoices/${id}`, data);
}

export async function changeInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<FinancialInvoice> {
  return api<FinancialInvoice>("PATCH", `/invoices/${id}/status`, { status });
}

export async function generateMonthlyInvoices(
  billingPeriod: string,
): Promise<{ success: boolean; createdCount: number; billingPeriod: string }> {
  return api("POST", "/invoices/generate-monthly", { billingPeriod });
}

export async function payInvoice(
  id: string,
  paymentData?: { paymentMethod?: string; transactionRef?: string },
): Promise<FinancialInvoice> {
  return api<FinancialInvoice>("POST", `/invoices/${id}/pay`, paymentData || {});
}


export interface OwnerStatementBreakdown {
  summary: {
    billingPeriod: string;
    totalBoarding: number;
    totalMedical: number;
    totalTraining: number;
    totalExpense: number;
    totalRaceNet: number;
    finalBalanceDue: number;
    isSurplus: boolean;
    surplusAmount: number;
    invoiceCount: number;
  };
  drilldown: {
    invoices: {
      id: string;
      billingPeriod: string;
      horseName: string;
      boardingFee: number;
      boardingDays: number;
      medicalFee: number;
      trainingFee: number;
      prizeCredit: number;
      netAmount: number;
      status: string;
      dueAt: string;
    }[];
    raceSettlements: {
      tournamentId: string;
      tournamentName: string;
      raceDate: string | null;
      horseName: string;
      finalRank: number;
      grossPrize: number;
      trainerCut: number;
      jockeyCut: number;
      entryFeeDeducted: number;
      netOwnerPayout: number;
      settledAt: string | null;
    }[];
  };
}

export async function fetchStatementBreakdown(
  ownerId?: string,
  billingPeriod?: string,
): Promise<OwnerStatementBreakdown> {
  const query = new URLSearchParams();
  if (ownerId && ownerId !== "ALL") query.set("ownerId", ownerId);
  if (billingPeriod && billingPeriod !== "ALL") query.set("billingPeriod", billingPeriod);
  const qs = query.toString();
  return api<OwnerStatementBreakdown>("GET", `/invoices/statement-breakdown${qs ? `?${qs}` : ""}`);
}
