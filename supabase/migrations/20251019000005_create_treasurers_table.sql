-- Migration: 20251019000005_create_treasurers_table.sql
-- Description:
-- Support multiple treasurers with active status, individual QRIS, WhatsApp, and name.
-- Backfill existing treasurer data from payment_settings non-destructively.

create table if not exists public.treasurers (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 100),
    wa_number text not null check (char_length(trim(wa_number)) > 0 and char_length(wa_number) <= 20),
    qris_image_url text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id),
    updated_by uuid references auth.users(id)
);

-- Index active treasurers for fast public queries
create index if not exists idx_treasurers_is_active on public.treasurers(is_active);

-- Enable RLS
alter table public.treasurers enable row level security;

-- Public (anon & authenticated) can only read active treasurers
drop policy if exists "Public can read active treasurers" on public.treasurers;
create policy "Public can read active treasurers"
on public.treasurers
for select
to anon, authenticated
using (is_active = true);

-- Allowlisted pengurus can view all treasurers (including inactive)
drop policy if exists "Only allowlisted pengurus can select all treasurers" on public.treasurers;
create policy "Only allowlisted pengurus can select all treasurers"
on public.treasurers
for select
to authenticated
using (
    exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);

-- Only allowlisted pengurus can insert treasurers
drop policy if exists "Only allowlisted pengurus can insert treasurers" on public.treasurers;
create policy "Only allowlisted pengurus can insert treasurers"
on public.treasurers
for insert
to authenticated
with check (
    exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);

-- Only allowlisted pengurus can update treasurers
drop policy if exists "Only allowlisted pengurus can update treasurers" on public.treasurers;
create policy "Only allowlisted pengurus can update treasurers"
on public.treasurers
for update
to authenticated
using (
    exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);

-- Non-destructive backfill: if payment_settings has treasurer name/wa or qris, create first active treasurer
insert into public.treasurers (name, wa_number, qris_image_url, is_active)
select
    coalesce(nullif(trim(nama_bendahara), ''), 'Bendahara 1'),
    coalesce(nullif(trim(no_wa_bendahara), ''), '-'),
    qris_image_url,
    true
from public.payment_settings
where id = 'default'
  and (
    (nama_bendahara is not null and trim(nama_bendahara) <> '')
    or (no_wa_bendahara is not null and trim(no_wa_bendahara) <> '')
    or (qris_image_url is not null and trim(qris_image_url) <> '')
  )
  and not exists (select 1 from public.treasurers);
