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
