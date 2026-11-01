import { tr } from "@/shared/i18n/tr";
import { downloadXlsx, type Cell } from "@/shared/lib/xlsx";
import type { FinancialInvoice } from "./types";

// Xuất hóa đơn + bảng kê chi phí cho chủ ngựa: Excel (.xlsx tự sinh) và PDF (trang in + window.print()).

const STATUS_LABEL: Record<FinancialInvoice["status"], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const expense = (i: FinancialInvoice) => i.boardingFee + i.medicalFee + i.trainingFee;

function totals(invoices: FinancialInvoice[]) {
  const sum = (f: (i: FinancialInvoice) => number) => invoices.reduce((n, i) => n + f(i), 0);
  return {
    boarding: sum((i) => i.boardingFee),
    medical: sum((i) => i.medicalFee),
    training: sum((i) => i.trainingFee),
    expense: sum(expense),
    prize: sum((i) => i.prizeCredit),
    net: sum((i) => i.netAmount),
  };
}

function invoiceHeader(): string[] {
  return [tr("Billing Period"), tr("Horse"), tr("Horse code"), tr("Boarding"), tr("Medical"), tr("Training"), tr("Prize credit"), tr("Net amount"), tr("Status")];
}

function invoiceRow(i: FinancialInvoice): Cell[] {
  return [i.billingPeriod, i.horse.name, i.horse.horseCode ?? "", i.boardingFee, i.medicalFee, i.trainingFee, i.prizeCredit, i.netAmount, tr(STATUS_LABEL[i.status])];
}

export function exportStatementXlsx(invoices: FinancialInvoice[], periodLabel: string) {
  const t = totals(invoices);
  downloadXlsx(`tmec-bang-ke-${periodLabel}`, [
    { name: tr("Invoices"), rows: [invoiceHeader(), ...invoices.map(invoiceRow)] },
    {
      name: tr("Cost statement"),
      rows: [
        [tr("Cost statement"), periodLabel],
        [],
        [tr("Item"), tr("Amount (VND)")],
        [tr("Boarding"), t.boarding],
        [tr("Medical"), t.medical],
        [tr("Training"), t.training],
        [tr("Total expenses"), t.expense],
        [tr("Prize credit"), -t.prize],
        [tr("Net amount"), t.net],
        [],
        [tr("Exported at"), new Date().toLocaleString("vi-VN")],
      ],
    },
  ]);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function printStatement(invoices: FinancialInvoice[], periodLabel: string, ownerName?: string) {
  const t = totals(invoices);
  const money = (n: number) => n.toLocaleString("vi-VN");
  const rows = invoices
    .map((i) => `<tr>${invoiceRow(i).map((v) => `<td${typeof v === "number" ? ' class="num"' : ""}>${esc(typeof v === "number" ? money(v) : String(v ?? ""))}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(tr("Cost statement"))} ${esc(periodLabel)}</title>
<style>
  body { font: 13px/1.45 system-ui, "Segoe UI", sans-serif; color: black; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.meta { margin: 0 0 16px; color: dimgray; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid silver; padding: 6px 8px; text-align: left; }
  th { background: whitesmoke; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .summary { width: 360px; margin-left: auto; }
  .summary tr:last-child td { font-weight: 700; }
  @page { margin: 14mm; }
</style></head><body>
<h1>${esc(tr("Cost statement"))} — ${esc(periodLabel)}</h1>
<p class="meta">${ownerName ? `${esc(tr("Owner"))}: ${esc(ownerName)} · ` : ""}${esc(tr("Exported at"))}: ${esc(new Date().toLocaleString("vi-VN"))}</p>
<table><thead><tr>${invoiceHeader().map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
<table class="summary"><tbody>
<tr><td>${esc(tr("Boarding"))}</td><td class="num">${money(t.boarding)}</td></tr>
<tr><td>${esc(tr("Medical"))}</td><td class="num">${money(t.medical)}</td></tr>
<tr><td>${esc(tr("Training"))}</td><td class="num">${money(t.training)}</td></tr>
<tr><td>${esc(tr("Total expenses"))}</td><td class="num">${money(t.expense)}</td></tr>
<tr><td>${esc(tr("Prize credit"))}</td><td class="num">-${money(t.prize)}</td></tr>
<tr><td>${esc(tr("Net amount"))} (VND)</td><td class="num">${money(t.net)}</td></tr>
</tbody></table>
</body></html>`;
  // In qua iframe ẩn: không bị chặn popup, người dùng chọn "Lưu thành PDF" trong hộp thoại in.
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 1000);
}
