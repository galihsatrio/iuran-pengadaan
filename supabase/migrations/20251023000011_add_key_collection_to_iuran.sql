-- Migration: 20251023000011_add_key_collection_to_iuran.sql
-- Description:
-- Adds is_key_collected and key_collected_at columns to public.iuran table.
-- Tracks key pickup status for residents who have paid.
-- Defaults to false and null, fully backwards-compatible.

alter table if exists public.iuran
add column if not exists is_key_collected boolean not null default false;

alter table if exists public.iuran
add column if not exists key_collected_at timestamptz;

create index if not exists idx_iuran_key_collected on public.iuran(is_key_collected);
