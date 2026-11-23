-- Migration: 20251025000013_create_public_shopping_notes_view.sql
-- Description:
-- 1. Add show_nota_belanja_on_public column to payment_settings
-- 2. Create public view for shopping notes and items without photo_path for public warga access

alter table if exists public.payment_settings
add column if not exists show_nota_belanja_on_public boolean not null default true;

-- Public view: expose shopping notes without photo_path for public warga access
create or replace view public.public_shopping_notes as
select
  sn.id,
  sn.title,
  sn.date,
  sn.total_amount,
  sn.created_at
from public.shopping_notes sn
order by sn.date desc, sn.id desc;

grant select on public.public_shopping_notes to anon, authenticated;

-- Public view: expose shopping note items
create or replace view public.public_shopping_note_items as
select
  sni.id,
  sni.note_id,
  sni.item_name,
  sni.item_price,
  sni.sort_order
from public.shopping_note_items sni;

grant select on public.public_shopping_note_items to anon, authenticated;
