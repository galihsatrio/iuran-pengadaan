-- Migration: 20251022000010_add_procurement_group_to_expenses.sql
-- Description:
-- Non-destructive addition of procurement_group to expenses base table and public_expenses secure view.
-- Allows grouping expenses by procurement project (e.g. "Portal Utama", "CCTV").
-- Existing and unassigned expenses default gracefully to NULL ("Belum dikelompokkan").

-- 1. Add procurement_group column to public.expenses (nullable, max 100 chars)
alter table if exists public.expenses
add column if not exists procurement_group text check (procurement_group is null or (char_length(trim(procurement_group)) > 0 and char_length(procurement_group) <= 100));

create index if not exists idx_expenses_procurement_group on public.expenses(procurement_group);

-- 2. Update secure view public.public_expenses to expose procurement_group
create or replace view public.public_expenses
with (security_invoker = false)
as select
    id,
    date,
    description,
    amount,
    procurement_group
from public.expenses;

grant select on public.public_expenses to anon, authenticated;
