# Architecture

Architecture overview for the Telegram HR Assistant.

---


## Architecture Overview

Retrieval-augmented policy bot on Next.js, Vercel, Supabase pgvector and Gemini



## What This Project Is

A Telegram bot that answers UAE HR and MOHRE policy questions.
Answers are grounded in a policy PDF you upload, not the model's own knowledge.
Every question and answer is logged with the sender's Telegram name and ID.
An admin dashboard manages access, policy documents, and the conversation log.

## Architecture Type

Three-tier, serverless.
Tier 1 (Presentation): Telegram chat plus a Next.js admin dashboard.
Tier 2 (Application): Next.js API routes running as Vercel serverless functions.
Tier 3 (Data and LLM): Supabase Postgres with pgvector, plus the Gemini API.
Stateless: each message is one short-lived function call, with no always-on server.

## How a Message Flows

Telegram posts the message to the webhook endpoint.
Guards run first: secret token check, duplicate check, then allowlist check.
Recent history is loaded: the last 5 turns within a 30-minute window.
The question is embedded and searched against the policy chunks in pgvector.
If a chunk matches, the HR Policy Agent answers using only that policy text.
If nothing matches, the General Agent answers and makes no policy claim.
Gemini generates the reply, switching model if the first one is rate limited.
The reply is rendered as HTML, split if over 4096 characters, and sent back.
Question, answer, agent used, and response time are written to the database.

## Key Design Decisions

Routing is decided by retrieval confidence, not by an LLM classifier.
This means the HR agent structurally cannot answer without grounding.
One generation call per message instead of two: cheaper and fewer failure points.
Follow-ups search standalone first, and only borrow the previous question when the message is incomplete, such as "How is it calculated?".
Chunking splits on numbered section headings and keeps whole sentences intact.
A database error during retrieval raises an error instead of returning empty, so a failure is never mistaken for "no policy exists".

## Security and Reliability

The webhook verifies Telegram's secret token header before doing any work.
Only allowlisted Telegram user IDs get answers; others are declined and logged.
Repeat webhook deliveries are ignored using a processed_updates table.
The dashboard sits behind a passcode and a signed HttpOnly cookie, enforced in middleware.
The Supabase service role key is used server-side only and never reaches the browser.

## Database Tables

policy_documents: uploaded PDFs, status, and chunk count.
policy_chunks: embedded policy text as 768-dimension vectors.
conversations: the full audit log of questions and answers.
allowed_users: the Telegram IDs permitted to use the bot.
processed_updates: guards against duplicate webhook deliveries.

## Problems Found and Fixed

The vector index used ivfflat with 100 lists over a handful of rows, so searches silently missed chunks that existed. Each chunk matched itself at 1.0, yet a request for all rows returned only one or two. Replaced with HNSW.
The LLM router failed open: on a rate limit it returned "general", sending policy questions to the ungrounded agent. That produced confident answers with no source. The classifier was removed entirely.
Chunks were being cut mid-word, because PDF extraction returns one long run-on with no paragraph breaks.
Long replies were silently dropped: Telegram rejects unbalanced markdown and messages over 4096 characters. Replies are now sent as HTML and split when needed.