-- Migration: 20251018000002_add_payment_settings.sql
-- Description:
-- Non-destructive addition of payment_settings table for storing QRIS image URL and payment account metadata.

create table if not exists public.payment_settings (
    id text primary key default 'default',
    qris_image_url text,
    qris_name text not null default 'QRIS Pembayaran Iuran Warga',
    bank_name text,
    account_number text,
    account_name text,
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id)
);

alter table public.payment_settings enable row level security;

-- Public can read payment settings (QRIS and account info)
drop policy if exists "Public can read payment settings" on public.payment_settings;
create policy "Public can read payment settings"
on public.payment_settings
for select
to anon, authenticated
using (true);

-- Only allowlisted pengurus can insert or update payment settings
drop policy if exists "Only allowlisted pengurus can manage payment settings" on public.payment_settings;
create policy "Only allowlisted pengurus can manage payment settings"
on public.payment_settings
for all
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
