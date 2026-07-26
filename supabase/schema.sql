-- Run this once in the Supabase SQL editor for your project.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- One row per uploaded HR policy PDF.
create table if not exists policy_documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  chunk_count int not null default 0,
  uploaded_at timestamptz not null default now()
);

-- Embedded chunks of policy text used for retrieval.
create table if not exists policy_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references policy_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

-- HNSW rather than IVFFlat: IVFFlat partitions rows into `lists` clusters and
-- probes only one per query by default, so on a small table most clusters are
-- empty and searches silently miss rows that do exist. HNSW keeps high recall
-- at every corpus size.
create index if not exists policy_chunks_embedding_idx
  on policy_chunks using hnsw (embedding vector_cosine_ops);

-- Telegram user IDs allowed to talk to the bot.
create table if not exists allowed_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  label text,
  added_at timestamptz not null default now()
);

-- Every question/answer exchange, for audit + the dashboard.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  telegram_username text,
  first_name text,
  last_name text,
  question text not null,
  answer text not null,
  agent_used text not null check (agent_used in ('hr_policy', 'general', 'blocked')),
  matched_chunk_ids uuid[],
  response_time_ms int,
  created_at timestamptz not null default now()
);

create index if not exists conversations_created_at_idx on conversations (created_at desc);
create index if not exists conversations_user_idx on conversations (telegram_user_id);

-- Guards against Telegram's at-least-once webhook delivery retries.
create table if not exists processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

-- Cosine-similarity search over policy chunks, called by the retrieval agent.
create or replace function match_policy_chunks(
  query_embedding vector(768),
  match_count int default 4,
  match_threshold float default 0.55
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    policy_chunks.id,
    policy_chunks.document_id,
    policy_chunks.content,
    1 - (policy_chunks.embedding <=> query_embedding) as similarity
  from policy_chunks
  where 1 - (policy_chunks.embedding <=> query_embedding) > match_threshold
  order by policy_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- The backend only ever talks to Postgres as `service_role` (never anon/authenticated).
-- These grants are required regardless of the "automatically expose new tables"
-- project setting, which governs anon/authenticated exposure, not service_role.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
