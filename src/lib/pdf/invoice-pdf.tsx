import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import path from "path";
import type { InvoiceDetail } from "@/types";

const LOGO_PATH = path.join(process.cwd(), "public", "pret-logo.png");

const FOOTER =
  "PRET A MANGER (EUROPE) LTD. 75B Verde, 10 Bressenden Place, London SW1E 5DH   " +
  "Account queries 020 7827 8812   " +
  "For any other queries please send an email to credit.control@pret.com   " +
  "PRET A MANGER (EUROPE) LTD. REGISTERED IN ENGLAND. Company Reg No: 01854213.   VAT REG NO: 927 1374 20";

const BACS_NOTE =
  "For BACS Payments, please quote your account code as the reference when making payments " +
  "and send remittances to credit.control@pret.com";

const RED = "#711323";
const DARK = "#372F31";
const MUTED = "#575354";
const BORDER = "#D9D4D5";
const BG = "#FAF9FA";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logo: { width: 100, height: 36, objectFit: "contain" },
  invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: RED, letterSpacing: 2 },

  // Parties row
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  billToBox: { width: "45%" },
  detailsBox: { width: "45%", alignItems: "flex-end" },
  sectionLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  memoText: { fontSize: 9, color: MUTED, lineHeight: 1.5 },

  // Details table (right side)
  detailRow: { flexDirection: "row", marginBottom: 3 },
  detailLabel: { fontSize: 8, color: MUTED, width: 70, textAlign: "right", marginRight: 8 },
  detailValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK },

  // Line items table
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: RED, paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 6, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: BG },
  colItem: { width: "20%", fontFamily: "Helvetica-Bold", fontSize: 8 },
  colDesc: { width: "38%", fontSize: 8 },
  colQty: { width: "10%", textAlign: "right", fontSize: 8 },
  colRate: { width: "16%", textAlign: "right", fontSize: 8 },
  colAmount: { width: "16%", textAlign: "right", fontSize: 8 },
  headerText: { color: "white", fontFamily: "Helvetica-Bold", fontSize: 8 },

  // Totals
  totalsContainer: { alignItems: "flex-end", marginBottom: 20 },
  totalRow: { flexDirection: "row", marginBottom: 4, width: 220 },
  totalLabel: { flex: 1, fontSize: 9, color: MUTED, textAlign: "right", paddingRight: 12 },
  totalValue: { width: 80, fontSize: 9, textAlign: "right", color: DARK },
  totalRowBold: { flexDirection: "row", marginBottom: 4, width: 220, borderTopWidth: 1.5, borderTopColor: RED, paddingTop: 5, marginTop: 2 },
  totalLabelBold: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right", paddingRight: 12 },
  totalValueBold: { width: 80, fontSize: 10, fontFamily: "Helvetica-Bold", color: RED, textAlign: "right" },

  // BACS box
  bacsBox: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, padding: 12, marginBottom: 20, borderRadius: 2 },
  bacsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: RED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  bacsNote: { fontSize: 8, color: MUTED, marginBottom: 8, lineHeight: 1.5 },
  bacsDetails: { flexDirection: "row", gap: 24 },
  bacsItem: { marginRight: 24 },
  bacsItemLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  bacsItemValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  footerText: { fontSize: 6.5, color: MUTED, textAlign: "center", lineHeight: 1.6 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },
});

function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

function fmtDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoicePDF({ invoice, companyName, typeLabel = "INVOICE" }: { invoice: InvoiceDetail; companyName: string; typeLabel?: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Image src={LOGO_PATH} style={s.logo} />
          <Text style={s.invoiceTitle}>{typeLabel.toUpperCase()}</Text>
        </View>

        <View style={s.divider} />

        {/* Bill To + Invoice Details */}
        <View style={s.parties}>
          <View style={s.billToBox}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={s.companyName}>{companyName}</Text>
            {invoice.memo ? <Text style={s.memoText}>{invoice.memo}</Text> : null}
          </View>
          <View style={s.detailsBox}>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Invoice No.</Text>
              <Text style={s.detailValue}>{invoice.tranId}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Date</Text>
              <Text style={s.detailValue}>{fmtDate(invoice.tranDate)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Due Date</Text>
              <Text style={s.detailValue}>{fmtDate(invoice.dueDate)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Currency</Text>
              <Text style={s.detailValue}>{invoice.currency}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.colItem, s.headerText]}>Item</Text>
            <Text style={[s.colDesc, s.headerText]}>Description</Text>
            <Text style={[s.colQty, s.headerText]}>Qty</Text>
            <Text style={[s.colRate, s.headerText]}>Unit Price</Text>
            <Text style={[s.colAmount, s.headerText]}>Net Amount</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View key={line.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={s.colItem}>{line.item || "—"}</Text>
              <Text style={s.colDesc}>{line.description || "—"}</Text>
              <Text style={s.colQty}>{Math.abs(line.quantity)}</Text>
              <Text style={s.colRate}>{fmtCurrency(Math.abs(line.rate), invoice.currency)}</Text>
              <Text style={s.colAmount}>{fmtCurrency(Math.abs(line.amount), invoice.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Net Total</Text>
            <Text style={s.totalValue}>{fmtCurrency(Math.abs(invoice.total), invoice.currency)}</Text>
          </View>
          {invoice.amountPaid > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Amount Paid</Text>
              <Text style={s.totalValue}>{fmtCurrency(Math.abs(invoice.amountPaid), invoice.currency)}</Text>
            </View>
          )}
          <View style={s.totalRowBold}>
            <Text style={s.totalLabelBold}>Balance Due</Text>
            <Text style={s.totalValueBold}>{fmtCurrency(Math.abs(invoice.amountDue), invoice.currency)}</Text>
          </View>
        </View>

        {/* BACS */}
        <View style={s.bacsBox}>
          <Text style={s.bacsTitle}>BACS Payment Details</Text>
          <Text style={s.bacsNote}>{BACS_NOTE}</Text>
          <View style={s.bacsDetails}>
            <View style={s.bacsItem}>
              <Text style={s.bacsItemLabel}>Bank</Text>
              <Text style={s.bacsItemValue}>HSBC</Text>
            </View>
            <View style={s.bacsItem}>
              <Text style={s.bacsItemLabel}>Sort Code</Text>
              <Text style={s.bacsItemValue}>40-40-09</Text>
            </View>
            <View style={s.bacsItem}>
              <Text style={s.bacsItemLabel}>Account Number</Text>
              <Text style={s.bacsItemValue}>81334638</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{FOOTER}</Text>
        </View>

      </Page>
    </Document>
  );
}
