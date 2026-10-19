-- Migration: 20251019000009_add_show_donations_on_home_to_payment_settings.sql
-- Description:
-- Non-destructive addition of show_donations_on_home column to payment_settings table.
-- Defaults to true to preserve existing public home page behavior.

alter table if exists public.payment_settings
add column if not exists show_donations_on_home boolean not null default true;
