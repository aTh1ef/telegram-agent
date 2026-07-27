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

export type ChatMemberStatus =
  | "creator"
  | "administrator"
  | "member"
  | "restricted"
  | "left"
  | "kicked";

export interface ChatMember {
  user: TelegramUser;
  status: ChatMemberStatus;
  is_member?: boolean;
}

export interface ChatMemberUpdated {
  chat: { id: number; title?: string; username?: string };
  from: TelegramUser;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  chat_member?: ChatMemberUpdated;
}

// "restricted" covers both muted members and users who were restricted on the
// way out, so it only counts as access when is_member is explicitly true.
export function isActiveMember(member: ChatMember | null): boolean {
  if (!member) return false;
  if (member.status === "restricted") return member.is_member === true;
  return (
    member.status === "creator" ||
    member.status === "administrator" ||
    member.status === "member"
  );
}

export async function getChatMember(
  chatId: string,
  userId: number
): Promise<ChatMember | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
    });

    const body = await res.json();
    if (!body.ok) {
      // A user who never joined returns an error rather than a "left" status,
      // so this is an expected path, not necessarily a misconfiguration.
      console.warn("get_chat_member_failed", { userId, description: body.description });
      return null;
    }

    return body.result as ChatMember;
  } catch (error) {
    console.error("get_chat_member_error", error);
    return null;
  }
}

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// HTML rather than Telegram's Markdown. Models emit **bold** plus "* " bullet
// markers, and in Markdown mode both are asterisks, so a bulleted line carries
// an odd number of delimiters and Telegram rejects the whole message. In HTML
// mode the asterisk has no meaning, so the two can't collide.
function toTelegramHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>")
    .replace(/^[ \t]*[*-][ \t]+/gm, "• ");
}

// Used when Telegram rejects the markup anyway: strip the syntax instead of
// showing the reader raw ** and * characters.
function toPlainText(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/^[ \t]*[*-][ \t]+/gm, "• ");
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
  parseMode?: "HTML"
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
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  footer?: string
): Promise<boolean> {
  const parts = splitForTelegram(text);
  let delivered = true;

  for (let i = 0; i < parts.length; i++) {
    // The footer belongs on the final part only, and is kept out of the body
    // conversion so its markup survives escaping.
    const tail = i === parts.length - 1 && footer ? footer : "";
    const html = toTelegramHtml(parts[i]) + (tail ? `\n\n<i>${escapeHtml(tail)}</i>` : "");
    const plain = toPlainText(parts[i]) + (tail ? `\n\n${tail}` : "");

    const sent =
      (await postMessage(chatId, html, "HTML")) || (await postMessage(chatId, plain));
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
