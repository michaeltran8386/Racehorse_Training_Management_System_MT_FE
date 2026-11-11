export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface FinancialInvoice {
  id: string;
  horseId: string;
  horse: {
    id: string;
    name: string;
    horseCode?: string | null;
    breed: string;
    avatarUrl?: string | null;
  };
  ownerId: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  };
  billingPeriod: string;
  boardingFee: number;
  boardingDays?: number | null;
  boardingMonthlyRate?: number | null;
  dueAt?: string | null;
  medicalFee: number;
  trainingFee: number;
  prizeCredit: number;
  netAmount: number;
  status: InvoiceStatus;
  invoiceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerSummaryResponse {
  outstandingDebt: number;
  totalBoarding: number;
  totalMedical: number;
  totalTraining: number;
  totalExpense: number;
  totalPrizeCredit: number;
  totalNet: number;
  invoiceCount: number;
  invoices: FinancialInvoice[];
}

export interface ClubSupplyExpenseItem {
  id: string;
  requestNumber: string;
  billingPeriod: string;
  deliveredAt: string | null;
  zoneName: string;
  zoneCode: string | null;
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  supplyCategory: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  requestedByName: string | null;
}

export interface ClubCashflowSummary {
  actualRevenuePaid: number;
  pendingReceivable: number;
  draftBillingTotal: number;
  supplyImportExpense: number;
  ownerSurplusPayoutExpense: number;
  totalActualExpense: number;
  netCashflow: number;
  deliveredRestockCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
  overdueInvoiceCount: number;
  draftInvoiceCount: number;
  cancelledInvoiceCount: number;
  surplusPayoutCount: number;
}

export interface ClubCashflowResponse {
  billingPeriod: string;
  periods: string[];
  summary: ClubCashflowSummary;
  revenueItems: FinancialInvoice[];
  supplyExpenses: ClubSupplyExpenseItem[];
}
