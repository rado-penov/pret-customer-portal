import { suiteQL, callRestlet, nsPatch } from "./client";
import type {
  Invoice,
  InvoiceDetail,
  InvoiceLine,
  TransactionDetail,
  Transaction,
  DashboardData,
  PaymentRequest,
  PaymentResult,
  TransactionFilter,
} from "@/types";
import { TRANSACTION_TYPE_LABELS } from "@/types";

// ─── Auth ─────────────────────────────────────────────────────────────────────

interface RawContact {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  company: string;        // internal ID of linked Customer
  companyname: string;
  portalenabled: string;  // 'T' or 'F'
  [key: string]: string;  // for dynamic pwd field name
}

export async function findContactByEmail(email: string): Promise<RawContact | null> {
  const pwdField = process.env.NS_CONTACT_PWD_FIELD!;
  const enableField = process.env.NS_CONTACT_ENABLE_FIELD!;
  const rows = await suiteQL<RawContact>(`
    SELECT c.id, c.email, c.firstname, c.lastname, c.company,
           cust.companyname,
           c.${enableField} AS portalenabled,
           c.${pwdField}
    FROM contact c
    LEFT JOIN customer cust ON cust.id = c.company
    WHERE LOWER(c.email) = LOWER('${email.replace(/'/g, "''")}')
      AND c.isinactive = 'F'
    FETCH FIRST 1 ROWS ONLY
  `);
  return rows[0] ?? null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface RawAging {
  totalamount: string;
  totalcount: string;
  week1amount: string;
  week1count: string;
  week2amount: string;
  week2count: string;
  month1amount: string;
  month1count: string;
  olderamount: string;
  oldercount: string;
  currency: string;
}

export async function getDashboardData(customerId: string): Promise<DashboardData> {
  const rows = await suiteQL<RawAging>(`
    SELECT
      SUM(t.foreignamountunpaid) AS totalamount,
      COUNT(*) AS totalcount,
      SUM(CASE WHEN t.duedate >= (SYSDATE - 7)  AND t.duedate < SYSDATE THEN t.foreignamountunpaid ELSE 0 END) AS week1amount,
      COUNT(CASE WHEN t.duedate >= (SYSDATE - 7)  AND t.duedate < SYSDATE THEN 1 END) AS week1count,
      SUM(CASE WHEN t.duedate >= (SYSDATE - 14) AND t.duedate < (SYSDATE - 7)  THEN t.foreignamountunpaid ELSE 0 END) AS week2amount,
      COUNT(CASE WHEN t.duedate >= (SYSDATE - 14) AND t.duedate < (SYSDATE - 7)  THEN 1 END) AS week2count,
      SUM(CASE WHEN t.duedate >= (SYSDATE - 30) AND t.duedate < (SYSDATE - 14) THEN t.foreignamountunpaid ELSE 0 END) AS month1amount,
      COUNT(CASE WHEN t.duedate >= (SYSDATE - 30) AND t.duedate < (SYSDATE - 14) THEN 1 END) AS month1count,
      SUM(CASE WHEN t.duedate < (SYSDATE - 30) THEN t.foreignamountunpaid ELSE 0 END) AS olderamount,
      COUNT(CASE WHEN t.duedate < (SYSDATE - 30) THEN 1 END) AS oldercount,
      cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE t.type = 'CustInvc'
      AND t.entity = ${customerId}
      AND t.duedate < SYSDATE
      AND t.foreignamountunpaid > 0
    GROUP BY cur.symbol
    FETCH FIRST 1 ROWS ONLY
  `);

  const r = rows[0];
  return {
    totalOverdueAmount: parseFloat(r?.totalamount ?? "0"),
    totalOverdueCount: parseInt(r?.totalcount ?? "0", 10),
    currency: r?.currency ?? "GBP",
    aging: {
      lastWeek: parseFloat(r?.week1amount ?? "0"),
      twoWeeksAgo: parseFloat(r?.week2amount ?? "0"),
      lastMonth: parseFloat(r?.month1amount ?? "0"),
      olderThanMonth: parseFloat(r?.olderamount ?? "0"),
      lastWeekCount: parseInt(r?.week1count ?? "0", 10),
      twoWeeksAgoCount: parseInt(r?.week2count ?? "0", 10),
      lastMonthCount: parseInt(r?.month1count ?? "0", 10),
      olderThanMonthCount: parseInt(r?.oldercount ?? "0", 10),
    },
  };
}

// ─── Open Invoices ────────────────────────────────────────────────────────────

interface RawInvoice {
  id: string;
  tranid: string;
  trandate: string;
  duedate: string;
  memo: string;
  status: string;
  foreigntotal: string;
  foreignamountpaid: string;
  foreignamountunpaid: string;
  currency: string;
}

export async function getOpenInvoices(customerId: string, endDate?: string): Promise<Invoice[]> {
  const dateClause = endDate ? `AND t.duedate <= TO_DATE('${endDate}', 'YYYY-MM-DD')` : "";
  const rows = await suiteQL<RawInvoice>(`
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.memo, t.status, t.foreigntotal, t.foreignamountpaid, t.foreignamountunpaid,
           cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE t.type = 'CustInvc'
      AND t.entity = ${customerId}
      AND t.foreignamountunpaid > 0
      ${dateClause}
    ORDER BY t.duedate ASC
  `);

  return rows.map(mapInvoice);
}

// ─── All Transactions ─────────────────────────────────────────────────────────

interface RawTransaction {
  id: string;
  tranid: string;
  trandate: string;
  type: string;
  otherrefnum: string;
  memo: string;
  foreigntotal: string;
  status: string;
  currency: string;
}

export async function getTransactions(
  customerId: string,
  filter: TransactionFilter
): Promise<Transaction[]> {
  const clauses: string[] = [`t.entity = ${customerId}`];

  if (filter.startDate) clauses.push(`t.trandate >= TO_DATE('${filter.startDate}', 'YYYY-MM-DD')`);
  if (filter.endDate)   clauses.push(`t.trandate <= TO_DATE('${filter.endDate}',   'YYYY-MM-DD')`);
  if (filter.type)      clauses.push(`t.type = '${filter.type}'`);
  if (filter.tranId)    clauses.push(`LOWER(t.tranid) LIKE LOWER('%${filter.tranId.replace(/'/g, "''")}%')`);
  if (filter.otherRefNum) clauses.push(`LOWER(t.otherrefnum) LIKE LOWER('%${filter.otherRefNum.replace(/'/g, "''")}%')`);

  const rows = await suiteQL<RawTransaction>(`
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           t.type, t.otherrefnum, t.memo, t.foreigntotal, t.status,
           cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE ${clauses.join(" AND ")}
    ORDER BY t.trandate DESC
    FETCH FIRST 500 ROWS ONLY
  `);

  return rows.map((r) => ({
    id: r.id,
    tranId: r.tranid,
    tranDate: r.trandate,
    type: r.type,
    typeLabel: TRANSACTION_TYPE_LABELS[r.type] ?? r.type,
    otherRefNum: r.otherrefnum ?? "",
    memo: r.memo ?? "",
    total: parseFloat(r.foreigntotal ?? "0"),
    status: r.status,
    currency: r.currency,
  }));
}

// ─── Invoice Detail ───────────────────────────────────────────────────────────

interface RawLine {
  id: string;
  item: string;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
}

export async function getInvoiceDetail(
  invoiceId: string,
  customerId: string
): Promise<InvoiceDetail | null> {
  const rows = await suiteQL<RawInvoice>(`
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.memo, t.status, t.foreigntotal, t.foreignamountpaid, t.foreignamountunpaid,
           cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE t.id = ${invoiceId}
      AND t.entity = ${customerId}
      AND t.type = 'CustInvc'
    FETCH FIRST 1 ROWS ONLY
  `);

  if (!rows[0]) return null;

  let lines: InvoiceLine[] = [];
  try {
    const lineRows = await suiteQL<RawLine>(`
      SELECT tl.id, i.itemid AS item, tl.memo AS description, tl.quantity, tl.rate,
             NVL(tl.foreignamount, tl.amount) AS amount
      FROM transactionline tl
      LEFT JOIN item i ON i.id = tl.item
      WHERE tl.transaction = ${invoiceId}
        AND tl.mainline = 'F'
        AND tl.taxline  = 'F'
      ORDER BY tl.id ASC
    `);
    lines = lineRows.map((l) => ({
      id: l.id,
      item: l.item ?? "",
      description: l.description ?? "",
      quantity: Math.abs(parseFloat(l.quantity ?? "0")),
      rate: parseFloat(l.rate ?? "0"),
      amount: parseFloat(l.amount ?? "0"),
    }));
  } catch (lineErr) {
    const msg = lineErr instanceof Error ? lineErr.message : String(lineErr);
    console.error(`\n[LINE ITEMS ERROR] Invoice ${invoiceId}: ${msg}\n`);
  }

  return { ...mapInvoice(rows[0]), lines };
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export async function createPayment(
  customerId: string,
  req: PaymentRequest
): Promise<PaymentResult> {
  return callRestlet<object, PaymentResult>(
    process.env.NS_PAYMENT_RESTLET_SCRIPT_ID!,
    process.env.NS_PAYMENT_RESTLET_DEPLOY_ID!,
    {
      customerId,
      amount: req.amount,
      invoiceIds: req.invoiceIds,
      memo: req.memo ?? "Portal payment",
    }
  );
}

// ─── Transaction Detail (any type) ───────────────────────────────────────────

interface RawTransactionRow extends RawInvoice {
  type: string;
}

export async function getTransactionDetail(
  transactionId: string,
  customerId: string
): Promise<TransactionDetail | null> {
  const rows = await suiteQL<RawTransactionRow>(`
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.type, t.memo, t.status, t.foreigntotal, t.foreignamountpaid, t.foreignamountunpaid,
           cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE t.id = ${transactionId}
      AND t.entity = ${customerId}
    FETCH FIRST 1 ROWS ONLY
  `);

  if (!rows[0]) return null;

  let lines: InvoiceLine[] = [];
  try {
    const lineRows = await suiteQL<RawLine>(`
      SELECT tl.id, i.itemid AS item, tl.memo AS description, tl.quantity, tl.rate,
             NVL(tl.foreignamount, tl.amount) AS amount
      FROM transactionline tl
      LEFT JOIN item i ON i.id = tl.item
      WHERE tl.transaction = ${transactionId}
        AND tl.mainline = 'F'
        AND tl.taxline  = 'F'
      ORDER BY tl.id ASC
    `);
    lines = lineRows.map((l) => ({
      id: l.id,
      item: l.item ?? "",
      description: l.description ?? "",
      quantity: Math.abs(parseFloat(l.quantity ?? "0")),
      rate: parseFloat(l.rate ?? "0"),
      amount: parseFloat(l.amount ?? "0"),
    }));
  } catch (lineErr) {
    const msg = lineErr instanceof Error ? lineErr.message : String(lineErr);
    console.error(`\n[LINE ITEMS ERROR] Transaction ${transactionId}: ${msg}\n`);
  }

  const r = rows[0];
  return {
    ...mapInvoice(r),
    type: r.type,
    typeLabel: TRANSACTION_TYPE_LABELS[r.type] ?? r.type,
    lines,
  };
}

// ─── Password Update ──────────────────────────────────────────────────────────

export async function updateContactPassword(
  contactId: string,
  hashedPassword: string
): Promise<void> {
  const pwdField = process.env.NS_CONTACT_PWD_FIELD!;
  await nsPatch(`/contact/${contactId}`, { [pwdField]: hashedPassword });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapInvoice(r: RawInvoice): Invoice {
  return {
    id: r.id,
    tranId: r.tranid,
    tranDate: r.trandate,
    dueDate: r.duedate,
    memo: r.memo ?? "",
    status: r.status,
    total: parseFloat(r.foreigntotal ?? "0"),
    amountPaid: parseFloat(r.foreignamountpaid ?? "0"),
    amountDue: parseFloat(r.foreignamountunpaid ?? "0"),
    currency: r.currency,
  };
}
