import type { TransactionFilter } from "@/types";
import {
  MOCK_DASHBOARD,
  MOCK_INVOICES,
  MOCK_INVOICE_DETAILS,
  MOCK_CREDIT_MEMO_DETAILS,
  MOCK_TRANSACTIONS,
  MOCK_CONSOLIDATED_INVOICES,
} from "./data";

export const mockQueries = {
  getDashboard: () => Promise.resolve(MOCK_DASHBOARD),

  getOpenInvoices: (filter: { tranStart?: string; tranEnd?: string; endDate?: string } = {}) => {
    let invoices = [...MOCK_INVOICES];
    if (filter.tranStart) invoices = invoices.filter((i) => i.tranDate >= filter.tranStart!);
    if (filter.tranEnd)   invoices = invoices.filter((i) => i.tranDate <= filter.tranEnd!);
    if (filter.endDate)   invoices = invoices.filter((i) => i.dueDate  <= filter.endDate!);
    return Promise.resolve(invoices);
  },

  getInvoiceDetail: (id: string) =>
    Promise.resolve(MOCK_INVOICE_DETAILS[id] ?? null),

  getTransactionDetail: (id: string) => {
    if (MOCK_CREDIT_MEMO_DETAILS[id]) return Promise.resolve(MOCK_CREDIT_MEMO_DETAILS[id]);
    const inv = MOCK_INVOICE_DETAILS[id];
    if (!inv) return Promise.resolve(null);
    return Promise.resolve({ ...inv, type: "CustInvc", typeLabel: "Invoice" });
  },

  getTransactions: (filter: TransactionFilter) => {
    let txns = [...MOCK_TRANSACTIONS];
    if (filter.startDate)   txns = txns.filter((t) => t.tranDate >= filter.startDate!);
    if (filter.endDate)     txns = txns.filter((t) => t.tranDate <= filter.endDate!);
    if (filter.type)        txns = txns.filter((t) => t.type === filter.type);
    if (filter.status)      txns = txns.filter((t) => t.status.toLowerCase().includes(filter.status!.toLowerCase()));
    if (filter.tranId)      txns = txns.filter((t) => t.tranId.toLowerCase().includes(filter.tranId!.toLowerCase()));
    if (filter.otherRefNum) txns = txns.filter((t) => t.otherRefNum.toLowerCase().includes(filter.otherRefNum!.toLowerCase()));
    return Promise.resolve(txns);
  },

  getConsolidatedInvoices: () => Promise.resolve(MOCK_CONSOLIDATED_INVOICES),

  createPayment: (amount: number, invoiceIds: string[]) =>
    Promise.resolve({
      paymentId: `demo-${Date.now()}`,
      tranId: `PMT-DEMO-${Math.floor(Math.random() * 9000) + 1000}`,
      status: "Pending",
      message: `[DEMO] Payment of £${amount.toFixed(2)} submitted for ${invoiceIds.length} invoice(s). No real transaction was created.`,
    }),
};
