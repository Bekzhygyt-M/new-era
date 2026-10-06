-- ==============================================================================
-- NEW ERA - TELEGRAM CHANNEL ACCESS (additive)
-- File: supabase/migrations/20261002_telegram_invite_link.sql
--
-- Caches the single-member Telegram invite link issued when a payment is
-- approved, so repeated status polls reuse one link instead of minting a new
-- one on every request.
--
-- ADDITIVE ONLY: adds one nullable column. No data is dropped, truncated or
-- rewritten, and existing rows are unaffected (NULL simply means "no link
-- issued yet"). Safe to run more than once.
--
-- The application tolerates this column being absent: the invite is then
-- re-minted on each request instead of being cached.
-- ==============================================================================

alter table public.payments
  add column if not exists telegram_invite_link text;

comment on column public.payments.telegram_invite_link is
  'Cached single-member Telegram invite link issued on payment approval. NULL when not issued or when Telegram is not configured.';