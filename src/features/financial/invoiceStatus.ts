import { tr } from '@/shared/i18n/tr';
import type { InvoiceStatus } from './types';

const LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Unsent', SENT: 'Sent', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return tr(LABELS[status]);
}
