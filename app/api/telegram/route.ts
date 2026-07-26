import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram";
import { sendTelegramMessage } from "@/lib/telegram";
import { isUserAllowed, markUpdateProcessed } from "@/lib/access";
import { orchestrate } from "@/lib/agents/orchestrator";
import { logConversation } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text || !message.from) {
    return NextResponse.json({ ok: true });
  }

  const alreadyProcessed = await markUpdateProcessed(update.update_id);
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true });
  }

  const { id: telegramUserId, username, first_name, last_name } = message.from;
  const chatId = message.chat.id;
  const question = message.text;

  const allowed = await isUserAllowed(telegramUserId);
  if (!allowed) {
    await sendTelegramMessage(
      chatId,
      "You're not authorized to use this bot. Contact the administrator for access."
    );
    await logConversation({
      telegramUserId,
      telegramUsername: username,
      firstName: first_name,
      lastName: last_name,
      question,
      answer: "(blocked — not on allowlist)",
      agentUsed: "blocked",
    });
    return NextResponse.json({ ok: true });
  }

  const start = Date.now();

  try {
    const { answer, agentUsed, matchedChunkIds } = await orchestrate(question);
    const responseTimeMs = Date.now() - start;

    await sendTelegramMessage(chatId, answer);
    await logConversation({
      telegramUserId,
      telegramUsername: username,
      firstName: first_name,
      lastName: last_name,
      question,
      answer,
      agentUsed,
      matchedChunkIds,
      responseTimeMs,
    });
  } catch (error) {
    console.error("webhook_processing_failed", error);
    await sendTelegramMessage(
      chatId,
      "Sorry, something went wrong processing your question. Please try again."
    );
  }

  return NextResponse.json({ ok: true });
}
