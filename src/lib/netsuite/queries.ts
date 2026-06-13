import { suiteQL, callRestlet, callRestletGet, nsPatch } from "./client";
import type {
  Invoice,
  InvoiceDetail,
  InvoiceLine,
  JournalLine,
  TransactionDetail,
  Transaction,
  ConsolidatedInvoice,
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
  const entityIds = await getEntityIds(customerId);
  const entityClause = entityIds.length === 1
    ? `t.entity = ${entityIds[0]}`
    : `t.entity IN (${entityIds.join(",")})`;

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
      AND ${entityClause}
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
  cinumber: string;
  trandate: string;
  duedate: string;
  memo: string;
  status: string;
  foreigntotal: string;
  foreignamountpaid: string;
  foreignamountunpaid: string;
  currency: string;
  entityname?: string;
}

async function getEntityIds(customerId: string): Promise<string[]> {
  try {
    const rows = await suiteQL<{ id: string }>(`
      SELECT id FROM customer
      WHERE parent = ${customerId}
        AND isinactive = 'F'
    `);
    return [customerId, ...rows.map((r) => r.id)];
  } catch {
    return [customerId];
  }
}

interface InvoiceFilter {
  tranStart?: string;
  tranEnd?:   string;
  endDate?:   string;
}

export async function getOpenInvoices(customerId: string, filter: InvoiceFilter = {}): Promise<Invoice[]> {
  const entityIds = await getEntityIds(customerId);
  const entityClause = entityIds.length === 1
    ? `t.entity = ${entityIds[0]}`
    : `t.entity IN (${entityIds.join(",")})`;

  const clauses: string[] = [
    `t.type = 'CustInvc'`,
    entityClause,
    `t.foreignamountunpaid > 0`,
  ];
  if (filter.tranStart) clauses.push(`t.trandate >= TO_DATE('${filter.tranStart}', 'YYYY-MM-DD')`);
  if (filter.tranEnd)   clauses.push(`t.trandate <= TO_DATE('${filter.tranEnd}',   'YYYY-MM-DD')`);
  if (filter.endDate)   clauses.push(`t.duedate  <= TO_DATE('${filter.endDate}',   'YYYY-MM-DD')`);

  const baseSelect = `
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.memo, t.status, t.foreigntotal, t.foreignamountpaid, t.foreignamountunpaid,
           cur.symbol AS currency, cust.companyname AS entityname`;
  const from = `
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    LEFT JOIN customer cust ON cust.id = t.entity
    WHERE ${clauses.join(" AND ")}
    ORDER BY t.duedate ASC`;

  let rows: RawInvoice[];
  try {
    rows = await suiteQL<RawInvoice>(`${baseSelect}, t.custbody_pret_ci_nmber_display AS cinumber${from}`);
  } catch {
    // Field may not be accessible in this account — fall back without CI number
    rows = await suiteQL<RawInvoice>(`${baseSelect}, '' AS cinumber${from}`);
  }

  return rows.map(mapInvoice);
}

// ─── All Transactions ─────────────────────────────────────────────────────────

interface RawTransaction {
  id: string;
  tranid: string;
  trandate: string;
  duedate: string;
  cinumber?: string;
  type: string;
  otherrefnum: string;
  memo: string;
  foreigntotal: string;
  status: string;
  currency: string;
  entityname?: string;
}

export async function getTransactions(
  customerId: string,
  filter: TransactionFilter
): Promise<Transaction[]> {
  const entityIds = await getEntityIds(customerId);
  const entityIn  = entityIds.length === 1 ? `= ${entityIds[0]}` : `IN (${entityIds.join(",")})`;

  // Common date / ref filters shared by both queries
  const commonClauses: string[] = [];
  if (filter.startDate)   commonClauses.push(`t.trandate >= TO_DATE('${filter.startDate}', 'YYYY-MM-DD')`);
  if (filter.endDate)     commonClauses.push(`t.trandate <= TO_DATE('${filter.endDate}',   'YYYY-MM-DD')`);
  if (filter.tranId)      commonClauses.push(`LOWER(t.tranid) LIKE LOWER('%${filter.tranId.replace(/'/g, "''")}%')`);
  if (filter.otherRefNum) commonClauses.push(`LOWER(t.otherrefnum) LIKE LOWER('%${filter.otherRefNum.replace(/'/g, "''")}%')`);

  const regularSelect = `
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.type, t.otherrefnum, t.memo, t.foreigntotal,
           BUILTIN.DF(t.status) AS status,
           cur.symbol AS currency,
           cust.companyname AS entityname`;

  // ── Query 1: non-journal transactions (entity on header) ─────────────────────
  let regularRows: RawTransaction[] = [];
  if (!filter.type || filter.type !== "Journal") {
    const clauses = [
      `t.entity ${entityIn}`,
      `t.type <> 'Journal'`,
      ...commonClauses,
    ];
    if (filter.type)   clauses.push(`t.type = '${filter.type}'`);
    if (filter.status) clauses.push(`LOWER(BUILTIN.DF(t.status)) LIKE LOWER('%${filter.status.replace(/'/g, "''")}%')`);

    const from = `
      FROM transaction t
      LEFT JOIN currency cur ON cur.id = t.currency
      LEFT JOIN customer cust ON cust.id = t.entity
      WHERE ${clauses.join(" AND ")}
      ORDER BY t.trandate DESC
      FETCH FIRST 500 ROWS ONLY`;
    try {
      regularRows = await suiteQL<RawTransaction>(`${regularSelect}, t.custbody_pret_ci_nmber_display AS cinumber${from}`);
    } catch {
      regularRows = await suiteQL<RawTransaction>(`${regularSelect}, '' AS cinumber${from}`);
    }
  }

  // ── Query 2: journal transactions (entity on line level) ─────────────────────
  let journalRows: RawTransaction[] = [];
  if (!filter.type || filter.type === "Journal") {
    const clauses = [
      `t.type = 'Journal'`,
      ...commonClauses,
    ];
    // Status filter is not applied to journals — they have no meaningful status

    try {
      journalRows = await suiteQL<RawTransaction>(`
        SELECT DISTINCT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
               TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
               t.type, t.otherrefnum, t.memo, t.foreigntotal,
               BUILTIN.DF(t.status) AS status,
               cur.symbol AS currency, '' AS entityname, '' AS cinumber
        FROM transaction t
        JOIN transactionline tl ON tl.transaction = t.id AND tl.entity ${entityIn}
        LEFT JOIN currency cur ON cur.id = t.currency
        WHERE ${clauses.join(" AND ")}
        ORDER BY t.trandate DESC
        FETCH FIRST 500 ROWS ONLY
      `);
    } catch {
      journalRows = [];
    }
  }

  // Merge, sort by date desc, cap at 500
  const rows = [...regularRows, ...journalRows]
    .sort((a, b) => (b.trandate ?? "").localeCompare(a.trandate ?? ""))
    .slice(0, 500);

  return rows.map((r) => ({
    id: r.id,
    tranId: r.tranid,
    tranDate: r.trandate,
    dueDate: r.duedate ?? "",
    ciNumber: r.cinumber ?? "",
    type: r.type,
    typeLabel: TRANSACTION_TYPE_LABELS[r.type] ?? r.type,
    otherRefNum: r.otherrefnum ?? "",
    memo: r.memo ?? "",
    total: parseFloat(r.foreigntotal ?? "0"),
    status: r.status?.includes(" : ") ? r.status.split(" : ").slice(1).join(" : ") : (r.status ?? ""),
    currency: r.currency,
    entityName: r.entityname ?? "",
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

interface RawJournalLine {
  id: string;
  entity: string;
  notes: string;
  amount: string;
}

export async function getTransactionDetail(
  transactionId: string,
  customerId: string
): Promise<TransactionDetail | null> {
  const entityIds = await getEntityIds(customerId);
  const entityIn  = entityIds.length === 1 ? `= ${entityIds[0]}` : `IN (${entityIds.join(",")})`;

  const rows = await suiteQL<RawTransactionRow>(`
    SELECT t.id, t.tranid, TO_CHAR(t.trandate, 'YYYY-MM-DD') AS trandate,
           TO_CHAR(t.duedate, 'YYYY-MM-DD') AS duedate,
           t.type, t.memo, t.status, t.foreigntotal, t.foreignamountpaid, t.foreignamountunpaid,
           cur.symbol AS currency
    FROM transaction t
    LEFT JOIN currency cur ON cur.id = t.currency
    WHERE t.id = ${transactionId}
      AND (t.type = 'Journal' OR t.entity ${entityIn})
    FETCH FIRST 1 ROWS ONLY
  `);

  if (!rows[0]) return null;
  const r = rows[0];

  // ── Journal: return only the customer's lines ─────────────────────────────────
  if (r.type === "Journal") {
    const jlRows = await suiteQL<RawJournalLine>(`
      SELECT tl.id,
             BUILTIN.DF(tl.entity)    AS entity,
             tl.memo                  AS notes,
             tl.creditForeignAmount   AS amount
      FROM transactionline tl
      WHERE tl.transaction = ${transactionId}
        AND tl.entity ${entityIn}
        AND NVL(tl.creditForeignAmount, 0) > 0
      ORDER BY tl.linesequencenumber ASC
    `);

    if (jlRows.length === 0) return null;

    const journalLines: JournalLine[] = jlRows.map((jl) => ({
      id: jl.id,
      entity: jl.entity ?? "",
      notes: jl.notes ?? "",
      amount: parseFloat(jl.amount ?? "0"),
    }));

    return {
      ...mapInvoice(r),
      type: r.type,
      typeLabel: TRANSACTION_TYPE_LABELS[r.type] ?? r.type,
      lines: [],
      journalLines,
    };
  }

  // ── Non-journal: existing line items ──────────────────────────────────────────
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

// ─── Consolidated Invoices ────────────────────────────────────────────────────

interface RawCI {
  id: string;
  name: string;
  cidate: string;
  duedate: string;
  totaldue: string;
  invoicecount: string;
  amounttotal: string;
  amountpaid: string;
  fileid: string;
}

export async function getConsolidatedInvoices(customerId: string): Promise<ConsolidatedInvoice[]> {
  const rows = await suiteQL<RawCI>(`
    SELECT id,
           name,
           custrecord_nsts_ci_date              AS cidate,
           custrecord_nsts_ci_tran_duedate      AS duedate,
           custrecord_nsts_ci_pdf_total_due     AS totaldue,
           custrecord_nsts_ci_count_invoices    AS invoicecount,
           custrecord_nsts_ci_pdf_itemtotal     AS amounttotal,
           custrecord_nsts_ci_pdf_amountpaid    AS amountpaid,
           custrecord_nsts_ci_pdffile           AS fileid
    FROM customrecord_nsts_ci_consolidate_invoice
    WHERE custrecord_nsts_ci_customer = ${customerId}
    ORDER BY custrecord_nsts_ci_date DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? "",
    ciDate: normaliseDate(r.cidate),
    dueDate: normaliseDate(r.duedate),
    totalDue: parseFloat(r.totaldue ?? "0"),
    invoiceCount: parseInt(r.invoicecount ?? "0", 10),
    amountTotal: parseFloat(r.amounttotal ?? "0"),
    amountPaid: parseFloat(r.amountpaid ?? "0"),
    fileId: r.fileid ?? null,
  }));
}

function normaliseDate(raw: string | null | undefined): string {
  if (!raw) return "";
  // SuiteQL custom record dates come back as DD/MM/YYYY (UK locale)
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Already YYYY-MM-DD or similar — return as-is
  return raw.slice(0, 10);
}

interface FileRestletResult {
  content?: string;   // base64-encoded file content
  mimeType?: string;
  name?: string;
  error?: string;
}

// ─── Invoice PDF (via N/render RESTlet) ──────────────────────────────────────

export async function getInvoicePdfFromNetsuite(invoiceId: string): Promise<Buffer | null> {
  const scriptId = process.env.NS_FILE_RESTLET_SCRIPT_ID!;
  const deployId = process.env.NS_FILE_RESTLET_DEPLOY_ID!;
  if (!scriptId || !deployId) throw new Error("NS_FILE_RESTLET_SCRIPT_ID / NS_FILE_RESTLET_DEPLOY_ID not configured");

  interface Result { content?: string; mimeType?: string; name?: string; error?: string; }
  const result = await callRestletGet<Result>(scriptId, deployId, { transactionId: invoiceId });

  if (result.error) throw new Error(`Transaction PDF RESTlet error: ${result.error}`);
  if (!result.content) return null;

  return Buffer.from(result.content, "base64");
}

// ─── Consolidated Invoice PDF ─────────────────────────────────────────────────

export async function getConsolidatedInvoicePdf(
  ciId: string,
  customerId: string
): Promise<Buffer | null> {
  const rows = await suiteQL<{ id: string; fileid: string }>(`
    SELECT id, custrecord_nsts_ci_pdffile AS fileid
    FROM customrecord_nsts_ci_consolidate_invoice
    WHERE id = ${ciId}
      AND custrecord_nsts_ci_customer = ${customerId}
    FETCH FIRST 1 ROWS ONLY
  `);

  const fileId = rows[0]?.fileid;
  if (!fileId) return null;

  const scriptId = process.env.NS_FILE_RESTLET_SCRIPT_ID;
  const deployId = process.env.NS_FILE_RESTLET_DEPLOY_ID;
  if (!scriptId || !deployId) {
    throw new Error("NS_FILE_RESTLET_SCRIPT_ID / NS_FILE_RESTLET_DEPLOY_ID not configured");
  }

  const result = await callRestletGet<FileRestletResult>(scriptId, deployId, { fileId });

  if (result.error) throw new Error(`File server RESTlet error: ${result.error}`);
  if (!result.content) return null;

  return Buffer.from(result.content, "base64");
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapInvoice(r: RawInvoice): Invoice {
  return {
    id: r.id,
    tranId: r.tranid,
    ciNumber: r.cinumber ?? "",
    tranDate: r.trandate,
    dueDate: r.duedate,
    memo: r.memo ?? "",
    status: r.status,
    total: parseFloat(r.foreigntotal ?? "0"),
    amountPaid: parseFloat(r.foreignamountpaid ?? "0"),
    amountDue: parseFloat(r.foreignamountunpaid ?? "0"),
    currency: r.currency,
    entityName: r.entityname ?? "",
  };
}
