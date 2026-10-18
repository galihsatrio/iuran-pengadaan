-- Migration: 20251018000003_add_payment_assets_storage.sql
-- Description:
-- Non-destructive setup of Supabase Storage bucket 'payment-assets' for QRIS image uploads.
-- Public read access for warga and authenticated users.
-- Write (insert, update, delete) restricted to allowlisted pengurus.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'payment-assets',
    'payment-assets',
    true,
    2097152, -- 2MB in bytes
    array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- 1. Public can read objects in payment-assets bucket
drop policy if exists "Public can view payment assets" on storage.objects;
create policy "Public can view payment assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'payment-assets');

-- 2. Only allowlisted pengurus can upload (insert) objects
drop policy if exists "Only allowlisted pengurus can upload payment assets" on storage.objects;
create policy "Only allowlisted pengurus can upload payment assets"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'payment-assets'
    and exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);

-- 3. Only allowlisted pengurus can update objects
drop policy if exists "Only allowlisted pengurus can update payment assets" on storage.objects;
create policy "Only allowlisted pengurus can update payment assets"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'payment-assets'
    and exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
)
with check (
    bucket_id = 'payment-assets'
    and exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);

-- 4. Only allowlisted pengurus can delete objects
drop policy if exists "Only allowlisted pengurus can delete payment assets" on storage.objects;
create policy "Only allowlisted pengurus can delete payment assets"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'payment-assets'
    and exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);
