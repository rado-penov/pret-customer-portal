import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { getSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/mock";
import { PRETTY_TOOLS, executeTool } from "@/lib/pretty/tools";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (!isDemoMode()) {
    return NextResponse.json({ error: "PRETty is only available in demo mode." }, { status: 403 });
  }

  const { messages }: { messages: MessageParam[] } = await req.json();

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const systemPrompt = `You are PRETty, a friendly and helpful AI assistant inside the Pret A Manger customer portal. You help customers understand their account, invoices, transactions, and outstanding balances.

Current user: ${session.name} from ${session.companyName}
Today's date: ${today}

Guidelines:
- Be concise, warm, and professional. Use British English.
- Format currency as £X,XXX.XX (e.g. £1,234.56).
- Format dates in a human-friendly way (e.g. "5 May 2025").
- When showing lists of invoices or transactions, use a brief table or bullet format.
- If asked about something outside your tools (e.g. placing orders, contacting support), politely explain you can only help with account and billing queries.
- Do not make up data — always use the tools to fetch real account information.`;

  const conversationMessages: MessageParam[] = [...messages];
  const MAX_ROUNDS = 5;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        system: systemPrompt,
        tools: PRETTY_TOOLS,
        messages: conversationMessages,
      });

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        return NextResponse.json({ reply: textBlock?.type === "text" ? textBlock.text : "" });
      }

      if (response.stop_reason === "tool_use") {
        const assistantMessage: MessageParam = { role: "assistant", content: response.content };
        conversationMessages.push(assistantMessage);

        const toolResults = await Promise.all(
          response.content
            .filter((b): b is ToolUseBlock => b.type === "tool_use")
            .map(async (block) => {
              const result = await executeTool(block.name, block.input as Record<string, unknown>);
              return { ...result, tool_use_id: block.id };
            })
        );

        conversationMessages.push({ role: "user", content: toolResults });
        continue;
      }

      break;
    }
  } catch (err) {
    console.error("[PRETty] API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `PRETty error: ${message}` }, { status: 500 });
  }

  return NextResponse.json({ error: "Could not generate a response." }, { status: 500 });
}
