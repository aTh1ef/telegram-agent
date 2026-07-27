import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram";
import { sendTelegramMessage, sendChatAction } from "@/lib/telegram";
import { isUserAllowed, markUpdateProcessed, syncChatMemberUpdate } from "@/lib/access";
import { orchestrate, type OrchestrationResult } from "@/lib/agents/orchestrator";
import { getRecentHistory } from "@/lib/history";
import { logConversation } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const AGENT_LABELS: Record<OrchestrationResult["agentUsed"], string> = {
  hr_policy: "📋 HR Policy Agent",
  general: "💬 General Assistant",
};

function agentFooter(agentUsed: OrchestrationResult["agentUsed"]) {
  return `via ${AGENT_LABELS[agentUsed]}`;
}

// Telegram's "typing" indicator only lasts ~5s, so it's kept alive by
// resending on an interval for as long as the LLM call is in flight.
function startTypingIndicator(chatId: number) {
  sendChatAction(chatId, "typing");
  const interval = setInterval(() => sendChatAction(chatId, "typing"), 4000);
  return () => clearInterval(interval);
}

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

  // Someone joined or left the access channel. Mirror it and stop; these
  // updates carry no message. Repeat delivery is harmless here, since the
  // sync is an upsert or a delete either way.
  if (update.chat_member) {
    await syncChatMemberUpdate(update.chat_member);
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
      "You don't have access to this bot yet. Please request to join the employee " +
        "channel, and try again once an administrator approves you."
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
  const stopTyping = startTypingIndicator(chatId);

  try {
    const history = await getRecentHistory(telegramUserId);
    const { answer, agentUsed, matchedChunkIds } = await orchestrate(question, history);
    const responseTimeMs = Date.now() - start;

    stopTyping();
    const delivered = await sendTelegramMessage(chatId, answer, agentFooter(agentUsed));
    if (!delivered) {
      // The answer was generated but never reached the user. Without this the
      // exchange still lands in the log looking like a success.
      console.error("answer_not_delivered", { telegramUserId, question });
    }

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
    stopTyping();
    console.error("webhook_processing_failed", error);
    await sendTelegramMessage(
      chatId,
      "Sorry, something went wrong processing your question. Please try again."
    );
  }

  return NextResponse.json({ ok: true });
}
