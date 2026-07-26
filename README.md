# Telegram HR Assistant

A Telegram bot that answers UAE HR/MOHRE policy questions using retrieval-augmented
generation (Gemini + Supabase pgvector), with a GitHub-styled admin dashboard for
managing access, viewing every logged conversation, and uploading/removing the
policy PDFs it's grounded in.

## Architecture

- **Presentation**: Telegram (chat) + Next.js admin dashboard
- **Application**: Next.js API routes on Vercel (serverless) running a small
  multi-agent pipeline — Orchestrator → Retrieval Agent → HR Policy Agent /
  General Agent → Logger
- **Data & LLM**: Supabase Postgres (`pgvector` for policy embeddings, plain
  tables for conversation logs and the allowlist) + Gemini (`gemini-flash-latest`
  for generation, `gemini-embedding-001` for embeddings)

## One-time setup

### 1. Telegram bot
1. Message `@BotFather` on Telegram, run `/newbot`, note the token it gives you.
2. Keep the token secret — it's the entire credential for controlling your bot.

### 2. Gemini API key
Get a free key at https://aistudio.google.com/apikey — no card required.

### 3. Supabase project
1. Create a free project at https://supabase.com.
2. Open the SQL editor and run everything in [`supabase/schema.sql`](supabase/schema.sql).
   This enables `pgvector`, creates all tables, and the similarity-search function.
3. From Project Settings → API, copy the **Project URL** and the **service_role key**
   (not the anon key — the service role key is required server-side and must never
   be exposed to the browser).

### 4. Environment variables
Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

- `TELEGRAM_BOT_TOKEN` — from BotFather
- `TELEGRAM_WEBHOOK_SECRET` — any random string you generate yourself; Telegram
  echoes it back on every webhook call so you can verify requests are genuine
- `GEMINI_API_KEY` — from AI Studio
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project
- `ADMIN_PASSWORD` — the passcode for the admin dashboard login
- `SESSION_SECRET` — any long random string, used to sign the admin session cookie

### 5. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the dashboard. Log in with `ADMIN_PASSWORD`, then:
1. Go to **HR Policies** and upload [`sample-docs/mohre-hr-policy-sample.pdf`](sample-docs/mohre-hr-policy-sample.pdf)
   (a generated sample covering probation, leave, notice period, gratuity, working
   hours, sick leave, and public holidays — replace with a real policy doc anytime).
2. Go to **Allowed Users** and add your own Telegram numeric ID (message
   `@userinfobot` on Telegram to get it instantly).

### 6. Deploy to Vercel (free Hobby tier)

```bash
npx vercel
```

Add every variable from `.env.local` to the Vercel project's Environment Variables
(Project Settings → Environment Variables), then redeploy:

```bash
npx vercel --prod
```

Vercel's free tier gives you a `https://your-project.vercel.app` URL automatically —
HTTPS is required for Telegram webhooks, so this is all you need, no ngrok.

### 7. Register the webhook with Telegram

Run this once (replace the placeholders):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-project.vercel.app/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Verify it registered correctly:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Now message your bot on Telegram — if your ID is on the allowlist, it will answer.

## Production notes

- **Access control**: the bot only replies to Telegram user IDs in the
  `allowed_users` table (manage from the dashboard). Everyone else is declined
  and still logged with `agent_used = 'blocked'` for audit purposes.
- **Webhook security**: every request is checked against `TELEGRAM_WEBHOOK_SECRET`
  via the `X-Telegram-Bot-Api-Secret-Token` header before anything else runs.
- **Idempotency**: Telegram retries webhook delivery if a response is slow; the
  `processed_updates` table makes retries a no-op instead of double-answering.
- **Audit logging**: every question and answer is stored with the sender's
  Telegram user ID, username, and name, visible in the Conversations tab.
- **Dashboard auth**: a single admin passcode signs an HttpOnly session cookie
  (see `lib/auth.ts`); swap for real per-user auth (e.g. Supabase Auth) if this
  ever needs multiple admins.
- **PDF processing time**: large PDFs take longer to embed chunk-by-chunk.
  `maxDuration` is set to 60s in the policy upload route — confirm your Vercel
  plan allows that function duration (Hobby supports it as of Vercel's Fluid
  Compute rollout; verify in your dashboard if uploads time out).

## Project structure

```
app/
  api/telegram/route.ts          Telegram webhook (public, secret-token gated)
  api/admin/...                  Admin-only APIs (auth, conversations, stats,
                                  allowlist, policy upload/delete)
  (dashboard)/login/              Admin login page
  (dashboard)/dashboard/           Sidebar-nav'd dashboard pages
lib/
  agents/orchestrator.ts          Routes a question to the right agent
  agents/retrieval.ts             pgvector similarity search
  agents/hrPolicyAgent.ts         Grounded HR answer generation
  agents/generalAgent.ts          Fallback general Q&A
  gemini.ts, supabase.ts, telegram.ts, auth.ts, pdf.ts, access.ts, logger.ts
supabase/schema.sql               Full DB schema + match_policy_chunks() function
sample-docs/                      Sample MOHRE policy PDF for demo grounding
```
