-- Migration: 20251017000001_add_nama_kepala_keluarga_and_update_delete_policies.sql
-- Description:
-- 1. Adds `nama_kepala_keluarga` column with backfill for existing rows and NOT NULL + length constraints.
-- 2. Adds UPDATE policy on public.iuran restricted to allowlisted pengurus.
-- 3. Adds DELETE policy on public.iuran restricted to allowlisted pengurus.

-- Step 1: Add column if it doesn't exist (nullable initially for safe backfill)
alter table public.iuran 
add column if not exists nama_kepala_keluarga text;

-- Step 2: Backfill existing records if any have NULL or blank values
update public.iuran 
set nama_kepala_keluarga = 'Warga' 
where nama_kepala_keluarga is null or trim(nama_kepala_keluarga) = '';

-- Step 3: Enforce NOT NULL and length/trim check constraint matching schema
alter table public.iuran 
alter column nama_kepala_keluarga set not null;

alter table public.iuran 
drop constraint if exists check_nama_kepala_keluarga;

alter table public.iuran 
add constraint check_nama_kepala_keluarga 
check (char_length(trim(nama_kepala_keluarga)) > 0 and char_length(nama_kepala_keluarga) <= 100);

-- Step 4: Add allowlisted pengurus UPDATE policy
drop policy if exists "Only allowlisted pengurus can update iuran" on public.iuran;
create policy "Only allowlisted pengurus can update iuran"
on public.iuran
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

-- Step 5: Add allowlisted pengurus DELETE policy
drop policy if exists "Only allowlisted pengurus can delete iuran" on public.iuran;
create policy "Only allowlisted pengurus can delete iuran"
on public.iuran
for delete
to authenticated
using (
    exists (
        select 1 from public.pengurus_allowlist
        where pengurus_allowlist.user_id = auth.uid()
    )
);
