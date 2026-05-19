import type { Tool, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getDashboardData, getOpenInvoices, getTransactions, getInvoiceDetail } from "@/lib/netsuite/queries";

export const PRETTY_TOOLS: Tool[] = [
  {
    name: "get_dashboard",
    description: "Get the customer's overdue invoice summary: total overdue amount, count, and aging breakdown (last 7 days, 7-14 days, 14-30 days, 30+ days).",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_open_invoices",
    description: "Get all open (unpaid or partially paid) invoices. Optionally filter by a due date cutoff to find invoices due by a certain date.",
    input_schema: {
      type: "object" as const,
      properties: {
        due_by: {
          type: "string",
          description: "ISO date string (YYYY-MM-DD). Only return invoices with dueDate on or before this date. Omit to get all open invoices.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_transactions",
    description: "Search the full transaction history. Supports filtering by date range, transaction type, reference number, or PO number.",
    input_schema: {
      type: "object" as const,
      properties: {
        start_date: { type: "string", description: "ISO date string (YYYY-MM-DD). Start of date range." },
        end_date:   { type: "string", description: "ISO date string (YYYY-MM-DD). End of date range." },
        type: {
          type: "string",
          description: "Transaction type code. One of: CustInvc (Invoice), CustPymt (Payment), CustCred (Credit Memo), CustRfnd (Refund), CustDep (Deposit).",
          enum: ["CustInvc", "CustPymt", "CustCred", "CustRfnd", "CustDep"],
        },
        tran_id:       { type: "string", description: "Partial or full transaction reference number (e.g. INV-10042)." },
        other_ref_num: { type: "string", description: "Partial or full customer PO number (e.g. PO-2025)." },
      },
      required: [],
    },
  },
  {
    name: "get_invoice_detail",
    description: "Get full details of a specific invoice including all line items. Use the invoice's internal ID (number) as found in get_open_invoices or get_transactions.",
    input_schema: {
      type: "object" as const,
      properties: {
        invoice_id: { type: "string", description: "The internal ID of the invoice (e.g. '1001')." },
      },
      required: ["invoice_id"],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, input: Record<string, any>, customerId: string): Promise<ToolResultBlockParam> {
  try {
    let result: unknown;

    if (name === "get_dashboard") {
      result = await getDashboardData(customerId);
    } else if (name === "get_open_invoices") {
      result = await getOpenInvoices(customerId, input.due_by);
    } else if (name === "get_transactions") {
      result = await getTransactions(customerId, {
        startDate:   input.start_date,
        endDate:     input.end_date,
        type:        input.type,
        tranId:      input.tran_id,
        otherRefNum: input.other_ref_num,
      });
    } else if (name === "get_invoice_detail") {
      result = await getInvoiceDetail(input.invoice_id, customerId);
    } else {
      result = { error: `Unknown tool: ${name}` };
    }

    return {
      type: "tool_result",
      tool_use_id: "",
      content: JSON.stringify(result),
    };
  } catch (err) {
    return {
      type: "tool_result",
      tool_use_id: "",
      content: JSON.stringify({ error: String(err) }),
      is_error: true,
    };
  }
}
