-- Migration: 20251019000004_add_bendahara_to_payment_settings.sql
-- Description:
-- Non-destructive addition of nama_bendahara and no_wa_bendahara to payment_settings table.

alter table if exists public.payment_settings
    add column if not exists nama_bendahara text,
    add column if not exists no_wa_bendahara text;
