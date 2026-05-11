export interface SessionUser {
  contactId: string;
  customerId: string;
  email: string;
  name: string;
  companyName: string;
  currency: string;
}

export interface Invoice {
  id: string;
  tranId: string;
  tranDate: string;
  dueDate: string;
  memo: string;
  status: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
}

export interface InvoiceLine {
  id: string;
  item: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceDetail extends Invoice {
  lines: InvoiceLine[];
}

export interface TransactionDetail extends InvoiceDetail {
  type: string;
  typeLabel: string;
}

export interface Transaction {
  id: string;
  tranId: string;
  tranDate: string;
  type: string;
  typeLabel: string;
  otherRefNum: string;
  memo: string;
  total: number;
  status: string;
  currency: string;
}

export interface DashboardData {
  totalOverdueAmount: number;
  totalOverdueCount: number;
  currency: string;
  aging: {
    lastWeek: number;
    twoWeeksAgo: number;
    lastMonth: number;
    olderThanMonth: number;
    lastWeekCount: number;
    twoWeeksAgoCount: number;
    lastMonthCount: number;
    olderThanMonthCount: number;
  };
}

export interface PaymentRequest {
  amount: number;
  invoiceIds: string[];
  memo?: string;
}

export interface PaymentResult {
  paymentId: string;
  tranId: string;
  status: string;
  message: string;
}

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: string;
  tranId?: string;
  otherRefNum?: string;
}

export type TransactionType =
  | "CustInvc"
  | "CustPymt"
  | "CustCred"
  | "CustRfnd"
  | "CustDep";

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  CustInvc: "Invoice",
  CustPymt: "Payment",
  CustCred: "Credit Memo",
  CustRfnd: "Customer Refund",
  CustDep: "Customer Deposit",
};
