import type { Invoice, InvoiceDetail, TransactionDetail, Transaction, DashboardData } from "@/types";

export const DEMO_USER = {
  contactId: "demo-001",
  customerId: "cust-001",
  email: "radoslav.penov@outlook.com",
  name: "Rado Penov",
  companyName: "Pret Development",
  currency: "GBP",
};

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "1001",
    tranId: "INV-10042",
    tranDate: daysAgo(60),
    dueDate: daysAgo(32),
    memo: "Catering services – February 2025",
    status: "CustInvc:A",
    total: 12450.00,
    amountPaid: 0,
    amountDue: 12450.00,
    currency: "GBP",
  },
  {
    id: "1002",
    tranId: "INV-10051",
    tranDate: daysAgo(45),
    dueDate: daysAgo(17),
    memo: "Corporate lunch – March batch A",
    status: "CustInvc:A",
    total: 8200.00,
    amountPaid: 4000.00,
    amountDue: 4200.00,
    currency: "GBP",
  },
  {
    id: "1003",
    tranId: "INV-10058",
    tranDate: daysAgo(30),
    dueDate: daysAgo(8),
    memo: "Office breakfast programme – Q1",
    status: "CustInvc:A",
    total: 6750.00,
    amountPaid: 0,
    amountDue: 6750.00,
    currency: "GBP",
  },
  {
    id: "1004",
    tranId: "INV-10067",
    tranDate: daysAgo(14),
    dueDate: daysAgo(3),
    memo: "Event catering – London Bridge",
    status: "CustInvc:A",
    total: 3100.00,
    amountPaid: 0,
    amountDue: 3100.00,
    currency: "GBP",
  },
  {
    id: "1005",
    tranId: "INV-10072",
    tranDate: daysAgo(7),
    dueDate: daysAgo(0),
    memo: "Weekly subscription – April W4",
    status: "CustInvc:A",
    total: 1850.00,
    amountPaid: 0,
    amountDue: 1850.00,
    currency: "GBP",
  },
];

export const MOCK_INVOICE_DETAILS: Record<string, InvoiceDetail> = {
  "1001": {
    ...MOCK_INVOICES[0],
    lines: [
      { id: "l1", item: "Catering – Standard Lunch",  description: "Per-head lunch service, 85 covers",  quantity: 85,  rate: 95.00, amount: 8075.00 },
      { id: "l2", item: "Beverage Package",            description: "Hot & cold drinks, 85 covers",       quantity: 85,  rate: 18.00, amount: 1530.00 },
      { id: "l3", item: "Delivery & Setup",            description: "Transport and setup team",            quantity: 1,   rate: 495.00, amount: 495.00  },
      { id: "l4", item: "Equipment Hire",              description: "Serving equipment daily hire",        quantity: 1,   rate: 350.00, amount: 350.00  },
    ],
  },
  "1002": {
    ...MOCK_INVOICES[1],
    lines: [
      { id: "l1", item: "Corporate Lunch Box",        description: "Artisan sandwich lunch box",          quantity: 120, rate: 48.50, amount: 5820.00 },
      { id: "l2", item: "Snack Selection",            description: "Afternoon snack box per person",      quantity: 60,  rate: 12.00, amount: 720.00  },
      { id: "l3", item: "Branded Packaging",          description: "Custom branded packaging",            quantity: 1,   rate: 450.00, amount: 450.00  },
      { id: "l4", item: "Delivery",                   description: "Same-day delivery, central London",   quantity: 3,   rate: 70.00, amount: 210.00  },
    ],
  },
  "1003": {
    ...MOCK_INVOICES[2],
    lines: [
      { id: "l1", item: "Breakfast Programme – Q1",   description: "Daily breakfast service, 13 weeks",  quantity: 65,  rate: 95.00, amount: 6175.00 },
      { id: "l2", item: "Fruit & Juice Station",      description: "Weekly fresh fruit and juice",        quantity: 13,  rate: 35.00, amount: 455.00  },
      { id: "l3", item: "Programme Management",       description: "Dedicated account manager Q1",        quantity: 1,   rate: 120.00, amount: 120.00 },
    ],
  },
  "1004": {
    ...MOCK_INVOICES[3],
    lines: [
      { id: "l1", item: "Event Catering – Premium",   description: "Canapes & finger food, 50 covers",   quantity: 50,  rate: 45.00, amount: 2250.00 },
      { id: "l2", item: "Drinks Reception",           description: "Prosecco & soft drinks",              quantity: 50,  rate: 17.00, amount: 850.00  },
    ],
  },
  "1005": {
    ...MOCK_INVOICES[4],
    lines: [
      { id: "l1", item: "Weekly Subscription",        description: "Team lunch – week 17 of 52",          quantity: 35,  rate: 52.00, amount: 1820.00 },
      { id: "l2", item: "Delivery",                   description: "Weekly delivery charge",              quantity: 1,   rate: 30.00, amount: 30.00   },
    ],
  },
};

export const MOCK_CREDIT_MEMO_DETAILS: Record<string, TransactionDetail> = {
  "t5": {
    id: "t5",
    tranId: "CM-0042",
    tranDate: daysAgo(25),
    dueDate: daysAgo(25),
    memo: "Credit: damaged equipment",
    status: "Closed",
    total: 350.00,
    amountPaid: 350.00,
    amountDue: 0,
    currency: "GBP",
    type: "CustCred",
    typeLabel: "Credit Memo",
    lines: [
      { id: "l1", item: "Equipment Hire", description: "Credit for damaged serving equipment", quantity: 1, rate: 350.00, amount: 350.00 },
    ],
  },
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", tranId: "INV-10042", tranDate: daysAgo(60), type: "CustInvc", typeLabel: "Invoice",      otherRefNum: "PO-20250101", memo: "Catering services – February 2025",   total: 12450.00, status: "Open",   currency: "GBP" },
  { id: "t2", tranId: "INV-10051", tranDate: daysAgo(45), type: "CustInvc", typeLabel: "Invoice",      otherRefNum: "PO-20250112", memo: "Corporate lunch – March batch A",     total: 8200.00,  status: "Open",   currency: "GBP" },
  { id: "t3", tranId: "PMT-4120",  tranDate: daysAgo(40), type: "CustPymt", typeLabel: "Payment",      otherRefNum: "",             memo: "Partial payment INV-10051",          total: 4000.00,  status: "Closed", currency: "GBP" },
  { id: "t4", tranId: "INV-10058", tranDate: daysAgo(30), type: "CustInvc", typeLabel: "Invoice",      otherRefNum: "PO-20250203", memo: "Office breakfast programme – Q1",    total: 6750.00,  status: "Open",   currency: "GBP" },
  { id: "t5", tranId: "CM-0042",   tranDate: daysAgo(25), type: "CustCred", typeLabel: "Credit Memo",  otherRefNum: "",             memo: "Credit: damaged equipment",          total: 350.00,   status: "Closed", currency: "GBP" },
  { id: "t6", tranId: "INV-10067", tranDate: daysAgo(14), type: "CustInvc", typeLabel: "Invoice",      otherRefNum: "PO-20250318", memo: "Event catering – London Bridge",     total: 3100.00,  status: "Open",   currency: "GBP" },
  { id: "t7", tranId: "INV-10072", tranDate: daysAgo(7),  type: "CustInvc", typeLabel: "Invoice",      otherRefNum: "PO-20250401", memo: "Weekly subscription – April W4",     total: 1850.00,  status: "Open",   currency: "GBP" },
];

export const MOCK_DASHBOARD: DashboardData = {
  totalOverdueAmount: 28350.00,
  totalOverdueCount: 5,
  currency: "GBP",
  aging: {
    lastWeek:           4950.00,
    twoWeeksAgo:        3100.00,
    lastMonth:         6750.00 + 4200.00,
    olderThanMonth:    12450.00 - 350.00,
    lastWeekCount:      2,
    twoWeeksAgoCount:   1,
    lastMonthCount:     2,
    olderThanMonthCount: 1,
  },
};
