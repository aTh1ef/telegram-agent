const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number };
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

// Models emit standard Markdown, but Telegram's legacy Markdown uses a single
// asterisk for bold. Left as-is, every ** arrives as an unbalanced entity and
// Telegram rejects the entire message with a 400.
function toTelegramMarkdown(text: string): string {
  return text.replace(/\*\*/g, "*");
}

function splitForTelegram(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_MESSAGE_LENGTH) {
    const window = remaining.slice(0, MAX_MESSAGE_LENGTH);
    const breakAt = window.lastIndexOf("\n");
    const cut = breakAt > MAX_MESSAGE_LENGTH * 0.5 ? breakAt : MAX_MESSAGE_LENGTH;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

async function postMessage(
  chatId: number,
  text: string,
  parseMode?: "Markdown"
): Promise<boolean> {
  const res = await fetch(`${TELEGRAM_API}/bot${getToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
    }),
  });

  if (!res.ok) {
    console.error("telegram_send_failed", {
      status: res.status,
      parseMode: parseMode ?? "none",
      body: await res.text(),
    });
    return false;
  }

  return true;
}

// Returns false only if the message could not be delivered at all. Formatting
// is best-effort: if Telegram rejects the markup, the same text is resent
// unformatted rather than silently dropped.
export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  let delivered = true;

  for (const part of splitForTelegram(text)) {
    const sent =
      (await postMessage(chatId, toTelegramMarkdown(part), "Markdown")) ||
      (await postMessage(chatId, part));
    if (!sent) delivered = false;
  }

  return delivered;
}

export async function sendChatAction(chatId: number, action: "typing") {
  try {
    await fetch(`${TELEGRAM_API}/bot${getToken()}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch (error) {
    console.error("telegram_chat_action_failed", error);
  }
}
