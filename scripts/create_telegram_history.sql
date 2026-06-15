-- Run this in your Supabase SQL editor
-- Creates a lightweight history table for the Telegram bot

create table if not exists telegram_chat_history (
  id            uuid primary key default gen_random_uuid(),
  telegram_user_id  text not null,
  supabase_user_id  uuid,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  created_at    timestamptz default now()
);

-- Index for fast per-user lookups ordered by time
create index if not exists idx_telegram_history_user_time
  on telegram_chat_history (telegram_user_id, created_at desc);

-- Optional: auto-delete messages older than 30 days to keep the table lean
-- (Supabase doesn't support TTL natively — run this as a scheduled function if needed)
