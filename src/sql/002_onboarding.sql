-- Reserved for onboarding-specific schema.
-- Current onboarding fields are stored directly on public.profiles.
-- This migration is intentionally idempotent so existing NESBA databases can run it safely.
alter table public.profiles add column if not exists goals text[] not null default '{}';
alter table public.profiles add column if not exists onboarded boolean not null default false;
